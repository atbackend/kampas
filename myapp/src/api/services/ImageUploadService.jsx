import axiosInstance from "../axiosInstance";
import { IMAGE_UPLOAD } from "../constants/endpoints";
import JSZip from 'jszip';

// File type mapping for folder detection
const FOLDER_MAPPING = {
  'vector_layers': ['.geojson', '.shp', '.zip', '.kml', '.gpx'],
  'raster_layers': ['.tif', '.tiff', '.geotiff', '.jp2', '.png', '.jpg', '.jpeg'],
  'terrain_models': ['.dem', '.dtm', '.dsm', '.asc', '.xyz'],
  'street_imagery': ['.jpg', '.jpeg', '.png', '.tiff', '.raw', '.cr2', '.nef'],
  'point_clouds': ['.las', '.laz', '.ply', '.pcd', '.xyz', '.pts', '.e57']
};

// ============================================================================
// SHAPEFILE PARSER CLASS
// ============================================================================

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

  // Parse polyline geometry (shape type 3)
  parsePolyline() {
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

    // Convert to GeoJSON linestring structure
    const coordinates = [];
    for (let i = 0; i < numParts; i++) {
      const start = parts[i];
      const end = i < numParts - 1 ? parts[i + 1] : numPoints;
      const line = points.slice(start, end);
      coordinates.push(line);
    }

    if (coordinates.length === 1) {
      return {
        type: "LineString",
        coordinates: coordinates[0]
      };
    } else {
      return {
        type: "MultiLineString",
        coordinates: coordinates
      };
    }
  }
}

// ============================================================================
// SHP TO GEOJSON CONVERSION
// ============================================================================

/**
 * Convert SHP file to GeoJSON with proper file handling
 * @param {File} file - The uploaded SHP file or ZIP containing shapefile
 * @returns {Promise<File>} - GeoJSON file
 */
const convertShpToGeojson = async (file) => {
  try {
    console.log('Starting SHP to GeoJSON conversion for:', file.name);

    // Check if it's a zip file containing shapefile components
    const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
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
    
    // Parse records
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
          case 3: // Polyline
            geometry = parser.parsePolyline();
            break;
          case 5: // Polygon
            geometry = parser.parsePolygon();
            break;
          case 8: // MultiPoint
            // Skip for now - would need implementation
            parser.skip((contentLength * 2) - 4);
            console.warn(`MultiPoint shape type not implemented`);
            break;
          default:
            console.warn(`Unsupported shape type: ${shapeType}`);
            parser.skip((contentLength * 2) - 4); // Skip shape data
            break;
        }

        if (geometry) {
          features.push({
            type: "Feature",
            id: recordNumber,
            properties: {
              RECORD_ID: recordNumber,
              SHAPE_TYPE: shapeType
            }, // Would need DBF parsing for attributes
            geometry: geometry
          });
        }
      }
    } catch (parseError) {
      console.warn('Parsing ended due to:', parseError.message);
      // Continue with whatever features we managed to parse
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Utility function to detect file type and folder
const detectFileTypeAndFolder = (filename) => {
  const extension = '.' + filename.toLowerCase().split('.').pop();
  
  for (const [folder, extensions] of Object.entries(FOLDER_MAPPING)) {
    if (extensions.includes(extension)) {
      return { folder, extension };
    }
  }
  
  // Default to raster_layers for unknown image types
  if (['.png', '.jpg', '.jpeg'].includes(extension)) {
    return { folder: 'raster_layers', extension };
  }
  
  return { folder: 'raster_layers', extension };
};

// ============================================================================
// MAIN UPLOAD FUNCTIONS
// ============================================================================

// Step 1: Get presigned URLs from your API
const getPresignedUrls = async (projectId, files) => {
  const url = IMAGE_UPLOAD.replace('<project_id>', projectId);
  
  const processedFiles = await Promise.all(files.map(async (file) => {
    const { folder, extension } = detectFileTypeAndFolder(file.name);
    
    // Handle SHP conversion if needed
    let processedFile = file;
    if (extension === '.shp' || (extension === '.zip' && file.type === 'application/zip')) {
      try {
        console.log(`Converting ${file.name} from SHP to GeoJSON...`);
        processedFile = await convertShpToGeojson(file);
        console.log(`Conversion successful: ${processedFile.name}`);
      } catch (conversionError) {
        console.warn(`SHP conversion failed for ${file.name}:`, conversionError);
        // Continue with original file if conversion fails
        processedFile = file;
      }
    }
    
    return {
      filename: processedFile.name,
      size: processedFile.size,
      content_type: processedFile.type,
      folder: folder === 'vector_layers' ? 'vector_layers' : folder // Ensure converted files go to vector_layers
    };
  }));

  const requestData = { files: processedFiles };

  try {
    const response = await axiosInstance.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting presigned URLs:', error);
    
    // Better error handling
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. Check your permissions.');
    } else {
      throw new Error('Failed to get upload URLs from server');
    }
  }
};

// Step 2: Upload file to S3 using proxy URL and form fields (CORS solution)
const uploadToS3 = async (file, uploadData, onFileProgress) => {
  const { form_fields } = uploadData;

  // ✅ CORS SOLUTION: Use proxy instead of direct S3 URL
  const proxyUrl = uploadData.presigned_url.replace(
    'https://kampas.s3.amazonaws.com',
    '/s3-proxy'
  );

  const formData = new FormData();

  // Order of form fields (important for S3)
  const fieldOrder = [
    'Content-Type',
    'key',
    'policy',
    'x-amz-algorithm',
    'x-amz-credential',
    'x-amz-date',
    'x-amz-signature'
  ];

  // Add fields in preferred order
  fieldOrder.forEach(key => {
    if (form_fields[key]) {
      formData.append(key, form_fields[key]);
    }
  });

  // Add remaining fields
  Object.keys(form_fields).forEach(key => {
    if (!fieldOrder.includes(key)) {
      formData.append(key, form_fields[key]);
    }
  });

  // File last
  formData.append('file', file);

  try {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onFileProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onFileProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            s3_key: uploadData.s3_key,
            unique_filename: uploadData.unique_filename,
            original_filename: uploadData.original_filename,
            s3_folder: uploadData.s3_folder,
            status: xhr.status,
            response: xhr.responseText
          });
        } else {
          console.error('S3 upload failed:', xhr.status, xhr.statusText, xhr.responseText);
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('S3 upload failed: Network error'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('S3 upload failed: Request timeout'));
      });

      xhr.timeout = 300000; // 5 min timeout

      // ✅ Use proxy URL instead of direct S3 URL
      xhr.open('POST', proxyUrl);
      xhr.send(formData);
    });

  } catch (error) {
    console.error('Error in uploadToS3:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

// Main upload function
export const uploadImages = async (projectId, files, onProgress) => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  
  if (!files || files.length === 0) {
    throw new Error('No files selected for upload');
  }

  try {
    // Process files first (including SHP conversion)
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const { extension } = detectFileTypeAndFolder(file.name);
        
        if (extension === '.shp' || 
            (extension === '.zip' && file.type === 'application/zip')) {
          try {
            console.log(`Converting ${file.name}...`);
            const convertedFile = await convertShpToGeojson(file);
            console.log(`Successfully converted to ${convertedFile.name}`);
            return convertedFile;
          } catch (conversionError) {
            console.warn(`SHP conversion failed for ${file.name}:`, conversionError);
            // Continue with original file if conversion fails
            return file;
          }
        }
        return file;
      })
    );

    // Step 1: Get presigned URLs
    console.log('Getting presigned URLs for', processedFiles.length, 'files...');
    const urlResponse = await getPresignedUrls(projectId, processedFiles);
    
    if (!urlResponse.upload_urls || urlResponse.upload_urls.length === 0) {
      throw new Error('No upload URLs received from server');
    }

    if (urlResponse.upload_urls.length !== processedFiles.length) {
      throw new Error(`Mismatch: ${processedFiles.length} files but ${urlResponse.upload_urls.length} upload URLs`);
    }

    const uploadResults = [];
    const totalFiles = processedFiles.length;
    let completedFiles = 0;

    console.log('Starting uploads for', totalFiles, 'files...');

    // Step 2: Upload each file to S3
    for (let i = 0; i < processedFiles.length; i++) {
      const file = processedFiles[i];
      const uploadData = urlResponse.upload_urls[i];

      console.log(`Uploading file ${i + 1}/${processedFiles.length}: ${file.name}`);

      if (!uploadData) {
        const error = `No upload URL for file: ${file.name}`;
        console.error(error);
        uploadResults.push({
          error,
          originalFile: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          status: 'failed'
        });
        continue;
      }

      try {
        const result = await uploadToS3(file, uploadData, (fileProgress) => {
          // Update overall progress based on completed files + current file progress
          const overallProgress = Math.round(((completedFiles + (fileProgress / 100)) / totalFiles) * 100);
          if (onProgress) {
            onProgress(overallProgress);
          }
        });

        console.log(`Successfully uploaded: ${file.name}`);
        uploadResults.push({
          ...result,
          originalFile: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          status: 'completed'
        });

        completedFiles++;

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        uploadResults.push({
          error: error.message,
          originalFile: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          status: 'failed'
        });
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress(100);
    }

    const successCount = uploadResults.filter(r => r.status === 'completed').length;
    const failCount = uploadResults.filter(r => r.status === 'failed').length;
    
    console.log(`Upload completed: ${successCount} successful, ${failCount} failed`);

    return {
      task_id: urlResponse.task_id,
      status_check_url: urlResponse.status_check_url,
      uploadResults,
      message: urlResponse.message,
      expires_in: urlResponse.expires_in,
      summary: {
        total: totalFiles,
        successful: successCount,
        failed: failCount
      }
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    // Format error response properly
    const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.message || 
                         'Upload failed';
    throw new Error(errorMessage);
  }
};

export const uploadSingleImage = async (projectId, file, onProgress) => {
  return uploadImages(projectId, [file], onProgress);
};