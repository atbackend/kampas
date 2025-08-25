// ShapefileConverter.js - Comprehensive SHP to GeoJSON conversion
import JSZip from 'jszip';

/**
 * Simple shapefile parser (basic implementation)
 * For production, consider using the 'shapefile' npm package
 */
class ShapefileParser {
  constructor() {
    this.buffer = null;
    this.offset = 0;
  }

  setBuffer(buffer) {
    this.buffer = new DataView(buffer);
    this.offset = 0;
  }

  readInt32BE() {
    const value = this.buffer.getInt32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readInt32LE() {
    const value = this.buffer.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat64LE() {
    const value = this.buffer.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  skip(bytes) {
    this.offset += bytes;
  }

  // Basic shapefile header parsing
  parseHeader() {
    const fileCode = this.readInt32BE(); // Should be 9994
    this.skip(20); // Skip unused bytes
    const fileLength = this.readInt32BE();
    const version = this.readInt32LE(); // Should be 1000
    const shapeType = this.readInt32LE();
    
    // Bounding box
    const xmin = this.readFloat64LE();
    const ymin = this.readFloat64LE();
    const xmax = this.readFloat64LE();
    const ymax = this.readFloat64LE();
    const zmin = this.readFloat64LE();
    const zmax = this.readFloat64LE();
    const mmin = this.readFloat64LE();
    const mmax = this.readFloat64LE();

    return {
      fileCode,
      fileLength,
      version,
      shapeType,
      bbox: { xmin, ymin, xmax, ymax, zmin, zmax, mmin, mmax }
    };
  }

  // Parse point geometry (shape type 1)
  parsePoint() {
    const x = this.readFloat64LE();
    const y = this.readFloat64LE();
    return {
      type: "Point",
      coordinates: [x, y]
    };
  }

  // Parse polygon geometry (shape type 5) - simplified
  parsePolygon() {
    const box = {
      xmin: this.readFloat64LE(),
      ymin: this.readFloat64LE(),
      xmax: this.readFloat64LE(),
      ymax: this.readFloat64LE()
    };

    const numParts = this.readInt32LE();
    const numPoints = this.readInt32LE();

    // Read part indices
    const parts = [];
    for (let i = 0; i < numParts; i++) {
      parts.push(this.readInt32LE());
    }

    // Read points
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const x = this.readFloat64LE();
      const y = this.readFloat64LE();
      points.push([x, y]);
    }

    // Convert to GeoJSON polygon structure
    const coordinates = [];
    for (let i = 0; i < numParts; i++) {
      const start = parts[i];
      const end = i < numParts - 1 ? parts[i + 1] : numPoints;
      const ring = points.slice(start, end);
      coordinates.push(ring);
    }

    return {
      type: "Polygon",
      coordinates: coordinates
    };
  }
}

/**
 * Convert SHP file to GeoJSON with proper file handling
 * @param {File} file - The uploaded SHP file
 * @returns {Promise<File>} - GeoJSON file
 */
export const convertShpToGeojson = async (file) => {
  try {
    console.log('Starting SHP to GeoJSON conversion for:', file.name);

    // Check if it's a zip file containing shapefile components
    const isZip = file.name.toLowerCase().endsWith('.zip');
    let shpBuffer, dbfBuffer, shxBuffer;

    if (isZip) {
      // Handle ZIP file containing shapefile components
      const zipBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipBuffer);

      // Find required files
      const shpFile = Object.keys(zipContents.files).find(name => name.toLowerCase().endsWith('.shp'));
      const dbfFile = Object.keys(zipContents.files).find(name => name.toLowerCase().endsWith('.dbf'));
      const shxFile = Object.keys(zipContents.files).find(name => name.toLowerCase().endsWith('.shx'));

      if (!shpFile) {
        throw new Error('No .shp file found in ZIP archive');
      }

      shpBuffer = await zipContents.files[shpFile].async('arraybuffer');
      if (dbfFile) {
        dbfBuffer = await zipContents.files[dbfFile].async('arraybuffer');
      }
      if (shxFile) {
        shxBuffer = await zipContents.files[shxFile].async('arraybuffer');
      }

    } else if (file.name.toLowerCase().endsWith('.shp')) {
      // Handle single SHP file
      shpBuffer = await file.arrayBuffer();
    } else {
      throw new Error('File must be a .shp file or .zip containing shapefile components');
    }

    // Parse the shapefile
    const parser = new ShapefileParser();
    parser.setBuffer(shpBuffer);
    
    const header = parser.parseHeader();
    console.log('Shapefile header:', header);

    const features = [];
    
    // Parse records (simplified - real implementation would need more robust parsing)
    try {
      while (parser.offset < shpBuffer.byteLength - 8) {
        // Record header
        const recordNumber = parser.readInt32BE();
        const contentLength = parser.readInt32BE();
        const shapeType = parser.readInt32LE();

        let geometry = null;

        switch (shapeType) {
          case 0: // Null shape
            break;
          case 1: // Point
            geometry = parser.parsePoint();
            break;
          case 5: // Polygon
            geometry = parser.parsePolygon();
            break;
          // Add more shape types as needed
          default:
            console.warn(`Unsupported shape type: ${shapeType}`);
            parser.skip((contentLength * 2) - 4); // Skip shape data
            break;
        }

        if (geometry) {
          features.push({
            type: "Feature",
            id: recordNumber,
            properties: {}, // Would need DBF parsing for attributes
            geometry: geometry
          });
        }
      }
    } catch (parseError) {
      console.warn('Parsing ended due to:', parseError.message);
    }

    // Create GeoJSON structure
    const geojson = {
      type: "FeatureCollection",
      features: features,
      crs: {
        type: "name",
        properties: {
          name: "EPSG:4326" // Assume WGS84, would need .prj file for actual CRS
        }
      }
    };

    console.log(`Converted ${features.length} features to GeoJSON`);

    // Create new file with GeoJSON content
    const geojsonContent = JSON.stringify(geojson, null, 2);
    const geojsonBlob = new Blob([geojsonContent], { 
      type: 'application/geo+json' 
    });

    const originalName = file.name.replace(/\.(shp|zip)$/i, '');
    const geojsonFile = new File(
      [geojsonBlob], 
      `${originalName}.geojson`,
      { type: 'application/geo+json' }
    );

    return geojsonFile;

  } catch (error) {
    console.error('SHP to GeoJSON conversion failed:', error);
    throw new Error(`Failed to convert ${file.name} to GeoJSON: ${error.message}`);
  }
};

/**
 * Alternative: Using the shapefile library (recommended for production)
 * First install: npm install shapefile
 */
export const convertShpToGeojsonWithLibrary = async (file) => {
  try {
    // Import shapefile library dynamically
    const shapefile = await import('shapefile');
    
    const isZip = file.name.toLowerCase().endsWith('.zip');
    let shpBuffer, dbfBuffer;

    if (isZip) {
      const zipBuffer = await file.arrayBuffer();
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipBuffer);

      const shpFile = Object.keys(zipContents.files).find(name => name.toLowerCase().endsWith('.shp'));
      const dbfFile = Object.keys(zipContents.files).find(name => name.toLowerCase().endsWith('.dbf'));

      if (!shpFile) {
        throw new Error('No .shp file found in ZIP archive');
      }

      shpBuffer = await zipContents.files[shpFile].async('arraybuffer');
      if (dbfFile) {
        dbfBuffer = await zipContents.files[dbfFile].async('arraybuffer');
      }
    } else {
      shpBuffer = await file.arrayBuffer();
    }

    // Use shapefile library to convert
    const geojson = await shapefile.read(shpBuffer, dbfBuffer);

    // Create new file
    const geojsonContent = JSON.stringify(geojson, null, 2);
    const geojsonBlob = new Blob([geojsonContent], { 
      type: 'application/geo+json' 
    });

    const originalName = file.name.replace(/\.(shp|zip)$/i, '');
    const geojsonFile = new File(
      [geojsonBlob], 
      `${originalName}.geojson`,
      { type: 'application/geo+json' }
    );

    return geojsonFile;

  } catch (error) {
    console.error('SHP conversion with library failed:', error);
    throw new Error(`Failed to convert ${file.name}: ${error.message}`);
  }
};

// ============================================================================
// FRONTEND CORS SOLUTIONS
// ============================================================================

/**
 * Solution 1: Development Proxy Configuration
 * Create a vite.config.js (for Vite) or modify your dev server config
 */
export const viteProxyConfig = {
  // vite.config.js
  server: {
    proxy: {
      // Proxy S3 requests through your dev server
      '/api/s3-proxy': {
        target: 'https://kampas.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/s3-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add necessary headers
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
          });
        }
      }
    }
  }
};

/**
 * Solution 2: Custom Upload Service with Proxy
 */
class CORSProxyUploadService {
  constructor(proxyEndpoint = '/api/s3-proxy') {
    this.proxyEndpoint = proxyEndpoint;
  }

  async uploadToS3WithProxy(file, uploadData, onFileProgress) {
    const { presigned_url, form_fields } = uploadData;
    
    // Use your backend as a proxy
    const proxyUrl = `${this.proxyEndpoint}/${encodeURIComponent(presigned_url)}`;
    
    const formData = new FormData();
    
    // Add form fields
    Object.keys(form_fields).forEach(key => {
      formData.append(key, form_fields[key]);
    });
    formData.append('file', file);

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - let browser handle it for FormData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        s3_key: uploadData.s3_key,
        unique_filename: uploadData.unique_filename,
        original_filename: uploadData.original_filename,
        s3_folder: uploadData.s3_folder
      };

    } catch (error) {
      throw new Error(`Proxy upload failed: ${error.message}`);
    }
  }
}

/**
 * Solution 3: Backend Upload Endpoint (Recommended)
 * Instead of direct S3 upload, upload through your backend
 */
export const uploadThroughBackend = async (projectId, files, onProgress) => {
  const formData = new FormData();
  
  formData.append('project_id', projectId);
  files.forEach((file, index) => {
    formData.append(`files[${index}]`, file);
  });

  try {
    const response = await fetch(`/api/projects/${projectId}/upload/`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        // Don't set Content-Type for FormData
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    throw new Error(`Backend upload failed: ${error.message}`);
  }
};

/**
 * Solution 4: Service Worker for CORS Bypass (Advanced)
 */
export const registerCORSServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/cors-proxy-sw.js');
      console.log('CORS Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// cors-proxy-sw.js (separate file in public folder)
const serviceWorkerCode = `
self.addEventListener('fetch', event => {
  if (event.request.url.includes('kampas.s3.amazonaws.com')) {
    event.respondWith(
      fetch(event.request, {
        mode: 'cors',
        credentials: 'omit'
      }).then(response => {
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });
      })
    );
  }
});
`;

/**
 * Solution 5: Chrome Extension for Development (Last Resort)
 */
export const chromeExtensionInstructions = {
  name: "CORS Unblock Extension",
  steps: [
    "Install 'CORS Unblock' or similar extension from Chrome Web Store",
    "Enable the extension only during development",
    "Remember to disable it after testing",
    "This is NOT a production solution"
  ],
  warning: "Only use for development. Never ask users to disable CORS protection."
};

/**
 * Updated ImageUploadService with CORS handling
 */
export class CORSAwareImageUploadService {
  constructor(options = {}) {
    this.useProxy = options.useProxy || false;
    this.proxyEndpoint = options.proxyEndpoint || '/api/s3-proxy';
    this.useBackendUpload = options.useBackendUpload || false;
  }

  async uploadImages(projectId, files, onProgress) {
    if (this.useBackendUpload) {
      return await uploadThroughBackend(projectId, files, onProgress);
    }

    // Process files (including SHP conversion)
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        if (file.name.toLowerCase().endsWith('.shp') || 
            (file.name.toLowerCase().endsWith('.zip') && file.type === 'application/zip')) {
          try {
            return await convertShpToGeojson(file);
          } catch (error) {
            console.warn(`SHP conversion failed for ${file.name}:`, error);
            return file; // Fallback to original file
          }
        }
        return file;
      })
    );

    // Continue with regular upload logic...
    // (rest of your upload implementation)
  }
}

// Usage examples:
export const corsUsageExamples = {
  // Development with proxy
  withProxy: `
    const uploadService = new CORSAwareImageUploadService({
      useProxy: true,
      proxyEndpoint: '/api/s3-proxy'
    });
  `,
  
  // Production with backend upload
  withBackend: `
    const uploadService = new CORSAwareImageUploadService({
      useBackendUpload: true
    });
  `,
  
  // With service worker
  withServiceWorker: `
    await registerCORSServiceWorker();
    const uploadService = new CORSAwareImageUploadService();
  `
};