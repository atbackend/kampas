// StreetImageLayerManager.js - Enhanced implementation for dynamic street image layers
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource, TileWMS } from 'ol/source';
import { Style, Icon, Stroke, Text, Fill, Circle } from 'ol/style';
import { fromLonLat } from 'ol/proj';

export class StreetImageLayerManager {
  constructor(dispatch, getLayerVisibility, layerSettings, activeProjectId) {
    this.dispatch = dispatch;
    this.getLayerVisibility = getLayerVisibility;
    this.layerSettings = layerSettings;
    this.activeProjectId = activeProjectId;
    this.imageCache = new Map(); // Cache for loaded thumbnail images
    this.loadingPromises = new Map(); // Track loading promises
    this.failedUrls = new Set(); // Track failed URLs to avoid retry loops
  }

  // Enhanced URL processing for S3 with proper query parameter handling
  getProxyImageUrl(originalUrl) {
    if (!originalUrl) return '';
    
    try {
      // Handle AWS S3 URLs with query parameters
      if (originalUrl.includes('kampas.s3.') || originalUrl.includes('amazonaws.com')) {
        const url = new URL(originalUrl);
        
        // Extract the path after the bucket name
        const pathParts = url.pathname.split('/');
        if (pathParts.length > 1) {
          // Remove the leading slash and join the path
          const s3Path = pathParts.slice(1).join('/');
          
          // Preserve query parameters for AWS signature
          const queryString = url.search;
          
          const proxyUrl = `/s3-proxy/${s3Path}${queryString}`;
          // console.log('Proxy URL created:', originalUrl, '->', proxyUrl);
          return proxyUrl;
        }
      }
    } catch (error) {
      console.warn('Error processing URL for proxy:', originalUrl, error);
    }
    
    return originalUrl;
  }

  // Convert GeoServer URL to proxy URL
  getProxyGeoServerUrl(originalUrl) {
    if (!originalUrl) return originalUrl;
    
    if (originalUrl.includes('192.168.29.246:8080/geoserver')) {
      return originalUrl.replace('http://192.168.29.246:8080/geoserver', '/geoserver');
    }
    
    return originalUrl;
  }

  // Create enhanced fallback camera icon SVG with better visibility
  createFallbackIcon(size = 40, color = '#007bff', status = 'default') {
    let bgColor = '#ffffff';
    let borderColor = color;
    let iconColor = color;
    
    if (status === 'loading') {
      bgColor = '#f8f9fa';
      borderColor = '#6c757d';
      iconColor = '#6c757d';
    } else if (status === 'error') {
      bgColor = '#fff5f5';
      borderColor = '#dc3545';
      iconColor = '#dc3545';
    }

    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='${encodeURIComponent(bgColor)}' stroke='${encodeURIComponent(borderColor)}' stroke-width='2'/%3E%3Cpath d='M9 3l1.5 2h3L15 3h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2zM7 5v10h10V5h-1.5l-1.5 2h-3L9 5H7zm5 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z' fill='${encodeURIComponent(iconColor)}' transform='translate(1,1) scale(0.85)'/%3E%3C/svg%3E`;
  }

  // Enhanced thumbnail loading with better error handling and retries
  async loadThumbnailImage(imageUrl, imageId, retryCount = 0) {
    // Return cached image if available
    if (this.imageCache.has(imageId)) {
      return this.imageCache.get(imageId);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(imageId)) {
      return this.loadingPromises.get(imageId);
    }

    // Don't retry failed URLs immediately
    if (this.failedUrls.has(imageUrl) && retryCount === 0) {
      const fallbackIcon = this.createFallbackIcon(50, '#dc3545', 'error');
      this.imageCache.set(imageId, fallbackIcon);
      return fallbackIcon;
    }

    const loadPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const timeout = setTimeout(() => {
        // console.warn(`Timeout loading thumbnail for image ${imageId} (attempt ${retryCount + 1})`);
        this.failedUrls.add(imageUrl);
        const fallbackIcon = this.createFallbackIcon(50, '#ffc107', 'error');
        this.imageCache.set(imageId, fallbackIcon);
        resolve(fallbackIcon);
      }, 10000); // 10 second timeout

      img.onload = () => {
        clearTimeout(timeout);
        
        try {
          // Create enhanced thumbnail canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const size = 60; // Slightly larger thumbnail
          canvas.width = size;
          canvas.height = size;
          
          // Calculate aspect ratio and positioning
          const aspectRatio = img.width / img.height;
          let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
          
          if (aspectRatio > 1) {
            drawHeight = size;
            drawWidth = size * aspectRatio;
            offsetX = -(drawWidth - size) / 2;
          } else {
            drawWidth = size;
            drawHeight = size / aspectRatio;
            offsetY = -(drawHeight - size) / 2;
          }
          
          // Draw background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          
          // Draw with rounded corners
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(2, 2, size - 4, size - 4, 8);
          ctx.clip();
          
          ctx.drawImage(img, offsetX + 2, offsetY + 2, drawWidth - 4, drawHeight - 4);
          ctx.restore();
          
          // Add border
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(1.5, 1.5, size - 3, size - 3, 7);
          ctx.stroke();
          
          // Add success indicator (small green dot)
          ctx.fillStyle = '#28a745';
          ctx.beginPath();
          ctx.arc(size - 8, 8, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          this.imageCache.set(imageId, thumbnailDataUrl);
          // console.log(`Thumbnail loaded successfully for image ${imageId}`);
          resolve(thumbnailDataUrl);
        } catch (error) {
          // console.error('Error creating thumbnail canvas:', error);
          const fallbackIcon = this.createFallbackIcon(50, '#dc3545', 'error');
          this.imageCache.set(imageId, fallbackIcon);
          resolve(fallbackIcon);
        }
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.error(`Failed to load thumbnail for image ${imageId} (attempt ${retryCount + 1}):`, error);
        this.failedUrls.add(imageUrl);
        
        // Retry once with original URL if proxy failed
        if (retryCount === 0 && imageUrl.startsWith('/s3-proxy/')) {
          // console.log(`Retrying with original URL for image ${imageId}`);
          // This would need the original URL to be passed or stored
          const fallbackIcon = this.createFallbackIcon(50, '#ffc107', 'error');
          this.imageCache.set(imageId, fallbackIcon);
          resolve(fallbackIcon);
        } else {
          const fallbackIcon = this.createFallbackIcon(50, '#dc3545', 'error');
          this.imageCache.set(imageId, fallbackIcon);
          resolve(fallbackIcon);
        }
      };
      
      // console.log(`Loading thumbnail for image ${imageId}:`, imageUrl);
      img.src = imageUrl;
    });

    this.loadingPromises.set(imageId, loadPromise);
    
    // Clean up promise after completion
    loadPromise.finally(() => {
      this.loadingPromises.delete(imageId);
    });

    return loadPromise;
  }

  // Main method to create street image layer with enhanced thumbnails
  createStreetImageLayer(streetImages) {
    console.log('Creating street image layer with', streetImages.length, 'images');
    
    // Filter valid images with coordinates
    const validImages = streetImages.filter(image => {
      const hasValidCoords = image.longitude && image.latitude && 
                            !isNaN(image.longitude) && !isNaN(image.latitude) &&
                            (Math.abs(image.longitude) > 0.001 || Math.abs(image.latitude) > 0.001);
      
      if (!hasValidCoords) {
        // console.warn('Skipping image with invalid coordinates:', {
        //   id: image.id,
        //   lat: image.latitude,
        //   lon: image.longitude,
        //   filename: image.original_filename
        // });
      }
      
      return hasValidCoords;
    });

    console.log('Valid images with coordinates:', validImages.length);

    if (validImages.length === 0) {
      console.warn('No valid street images to display');
      return null;
    }

    // Create features for each valid image
    const features = validImages.map(image => {
      // Prepare proxy URLs with better error handling
      const originalS3Url = image.s3_url || image.file_path;
      const thumbnailUrl = this.getProxyImageUrl(originalS3Url);
      
      // console.log('Processing image:', {
      //   id: image.id,
      //   filename: image.original_filename,
      //   originalUrl: originalS3Url,
      //   proxyUrl: thumbnailUrl,
      //   coordinates: [image.longitude, image.latitude]
      // });
      
      const proxiedImage = {
        ...image,
        file_path: this.getProxyImageUrl(image.file_path),
        s3_url: this.getProxyImageUrl(image.s3_url),
        original_file_path: image.file_path,
        original_s3_url: image.s3_url,
        thumbnailUrl: thumbnailUrl
      };

      const feature = new Feature({
        geometry: new Point(fromLonLat([parseFloat(image.longitude), parseFloat(image.latitude)])),
        id: image.id,
        // name: image.original_filename,
        imageData: proxiedImage,
        thumbnailUrl: thumbnailUrl,
        processing_status: image.processing_status,
        captured_at: image.captured_at,
        image_type: image.image_type || 'front_view'
      });

      return feature;
    });

    // Create vector source
    const vectorSource = new VectorSource({
      features: features
    });

    // Create layer with enhanced dynamic styling
    const streetImagesId = `street_images_${this.activeProjectId}`;
    const layer = new VectorLayer({
      source: vectorSource,
      style: this.createEnhancedStyleFunction(),
      visible: this.getLayerVisibility(streetImagesId),
      properties: { 
        id: streetImagesId, 
        name: 'Street Images',
        type: 'street_images',
        layerData: { 
          streetImages: validImages.map(img => ({
            ...img,
            file_path: this.getProxyImageUrl(img.file_path),
            s3_url: this.getProxyImageUrl(img.s3_url),
            original_file_path: img.file_path,
            original_s3_url: img.s3_url
          }))
        }
      }
    });

    // Start preloading thumbnails
    this.preloadThumbnails(validImages);

    // console.log('Street images layer created successfully with', features.length, 'features');
    return layer;
  }

  // Enhanced dynamic style function with better visual feedback
  createEnhancedStyleFunction() {
    return (feature, resolution) => {
      const imageType = feature.get('image_type') || 'front_view';
      const processingStatus = feature.get('processing_status');
      const imageId = feature.get('id');
      const thumbnailUrl = feature.get('thumbnailUrl');
      
      // Enhanced color scheme
      const colorMap = {
        'front_view': '#007bff',
        'side_view': '#28a745',
        'back_view': '#ffc107',
        'rear_view': '#fd7e14',
        'aerial_view': '#dc3545',
        'panoramic': '#6f42c1'
      };
      
      let iconColor = colorMap[imageType] || '#007bff';
      if (processingStatus === 'processing') iconColor = '#6c757d';
      if (processingStatus === 'failed') iconColor = '#dc3545';
      
      // Scale based on zoom level for better visibility
      const baseScale = resolution > 200 ? 0.7 : resolution > 50 ? 1.0 : resolution > 10 ? 1.2 : 1.4;
      
      // Check if thumbnail is cached and ready
      if (this.imageCache.has(imageId)) {
        const cachedThumbnail = this.imageCache.get(imageId);
        return this.createThumbnailStyle(feature, cachedThumbnail, iconColor, resolution, baseScale);
      }
      
      // Check if thumbnail is currently loading
      if (this.loadingPromises.has(imageId)) {
        return this.createLoadingStyle(feature, iconColor, baseScale);
      }
      
      // Start loading thumbnail if we have a URL and haven't failed before
      if (thumbnailUrl && !this.failedUrls.has(thumbnailUrl)) {
        this.loadThumbnailImage(thumbnailUrl, imageId).then(() => {
          // Trigger feature re-render after thumbnail loads
          feature.changed();
        });
        
        return this.createLoadingStyle(feature, iconColor, baseScale);
      }
      
      // Fallback style for failed or unavailable thumbnails
      return this.createFallbackStyle(feature, iconColor, baseScale);
    };
  }

  // Enhanced thumbnail style with better visibility
  createThumbnailStyle(feature, thumbnailDataUrl, borderColor, resolution, scale) {
    return new Style({
      image: new Icon({
        src: thumbnailDataUrl,
        scale: scale,
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
      }),
      text: resolution < 30 ? new Text({
        text: this.truncateText(feature.get('name') || '', 20),
        offsetY: (35 * scale),
        fill: new Fill({ color: '#333333' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
        font: `bold ${Math.round(11 * scale)}px Arial, sans-serif`,
        textAlign: 'center',
        textBaseline: 'top'
      }) : undefined
    });
  }

  // Enhanced loading style with animated indicator
  createLoadingStyle(feature, color, scale) {
    return new Style({
      image: new Circle({
        radius: 20 * scale,
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.9)' }),
        stroke: new Stroke({ 
          color: color, 
          width: 3,
          lineDash: [4, 4] // Animated dash effect
        })
      }),
      text: new Text({
        text: '↻',
        fill: new Fill({ color: color }),
        font: `bold ${Math.round(18 * scale)}px Arial, sans-serif`,
        textAlign: 'center'
      })
    });
  }

  // Enhanced fallback style with better visibility
  createFallbackStyle(feature, color, scale) {
    const imageType = feature.get('image_type') || 'front_view';
    const iconText = {
      'front_view': '📷',
      'side_view': '📸',
      'back_view': '📹',
      'aerial_view': '🚁',
      'panoramic': '🌐'
    };

    return new Style({
      image: new Circle({
        radius: 25 * scale,
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
        stroke: new Stroke({ color: color, width: 3 })
      }),
      text: new Text({
        text: iconText[imageType] || '📷',
        font: `${Math.round(20 * scale)}px Arial, sans-serif`,
        fill: new Fill({ color: color }),
        textAlign: 'center'
      })
    });
  }

  // Create WMS layer for street images (unchanged but with better error handling)
  createStreetImageWMSLayer(streetImages) {
    const imageWithWMS = streetImages.find(img => img.geoserver_layer_url);
    
    if (!imageWithWMS) {
      // console.log('No WMS layer URL found in street images');
      return null;
    }

    try {
      // Parse and proxy the URL
      let url = imageWithWMS.geoserver_layer_url.split('?')[0];
      url = this.getProxyGeoServerUrl(url);

      const urlParams = new URLSearchParams(imageWithWMS.geoserver_layer_url.split('?')[1]);
      const layerName = urlParams.get('layers');

      if (!layerName) {
        // console.warn('No layer name found in WMS URL');
        return null;
      }

      const streetImagesWMSId = `street_images_wms_${this.activeProjectId}`;
      
      const layer = new TileLayer({
        source: new TileWMS({
          url: url,
          params: {
            'LAYERS': layerName,
            'TILED': true,
            'FORMAT': 'image/png',
            'TRANSPARENT': true,
            'VERSION': '1.1.0',
            'SRS': 'EPSG:3857'
          },
          serverType: 'geoserver',
          crossOrigin: 'anonymous'
        }),
        visible: this.getLayerVisibility(streetImagesWMSId),
        opacity: this.layerSettings[streetImagesWMSId]?.opacity || 0.7,
        properties: { 
          id: streetImagesWMSId, 
          name: 'Street Images Layer (WMS)',
          type: 'street_images_wms',
          layerData: { streetImages }
        }
      });

      // console.log('Street images WMS layer created:', layerName);
      return layer;
    } catch (error) {
      // console.error('Error creating street images WMS layer:', error);
      return null;
    }
  }

  // Enhanced click handler with better error handling
  handleStreetImageClick(imageData, dispatch, activeProjectId, allStreetImages = [], onOpenStreetView) {
    // console.log('Street image clicked:', {
    //   id: imageData.id,
    //   filename: imageData.original_filename,
    //   hasS3Url: !!imageData.s3_url,
    //   coordinates: [imageData.longitude, imageData.latitude]
    // });
    
    try {
      // Convert all images to use proxy URLs
      const proxiedAllImages = allStreetImages.map(img => ({
        ...img,
        file_path: this.getProxyImageUrl(img.file_path),
        s3_url: this.getProxyImageUrl(img.s3_url),
        original_file_path: img.file_path,
        original_s3_url: img.s3_url
      }));

      // Convert current image to use proxy URL
      const proxiedImageData = {
        ...imageData,
        file_path: this.getProxyImageUrl(imageData.file_path),
        s3_url: this.getProxyImageUrl(imageData.s3_url),
        original_file_path: imageData.file_path,
        original_s3_url: imageData.s3_url
      };
      
      // Update Redux state
      dispatch({
        type: 'SET_STREET_VIEW_MODE',
        payload: { 
          active: true, 
          imageData: proxiedImageData,
          allImages: proxiedAllImages 
        }
      });
      
      // Open street view viewer
      if (onOpenStreetView && typeof onOpenStreetView === 'function') {
        onOpenStreetView(proxiedImageData, proxiedAllImages);
      } else {
        // console.warn('onOpenStreetView callback not provided or not a function');
      }
    } catch (error) {
      // console.error('Error handling street image click:', error);
    }
  }

  // Enhanced connection lines with better distance calculation
  createStreetImageConnections(streetImages) {
    if (!streetImages || streetImages.length < 2) return null;

    const connections = [];
    const threshold = 0.001; // ~100 meters (adjusted for better connections)

    // Find nearby image pairs with proper distance calculation
    for (let i = 0; i < streetImages.length; i++) {
      for (let j = i + 1; j < streetImages.length; j++) {
        const img1 = streetImages[i];
        const img2 = streetImages[j];
        
        if (!img1.latitude || !img2.latitude || !img1.longitude || !img2.longitude) continue;

        // Calculate proper distance using Haversine formula approximation
        const latDiff = (img1.latitude - img2.latitude) * Math.PI / 180;
        const lonDiff = (img1.longitude - img2.longitude) * Math.PI / 180;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);

        if (distance < threshold) {
          connections.push({
            from: [parseFloat(img1.longitude), parseFloat(img1.latitude)],
            to: [parseFloat(img2.longitude), parseFloat(img2.latitude)],
            distance: distance,
            fromImage: img1,
            toImage: img2
          });
        }
      }
    }

    if (connections.length === 0) {
      // console.log('No connections found between street images');
      return null;
    }

    // Create line features
    const features = connections.map((conn, index) => new Feature({
      geometry: new LineString([
        fromLonLat(conn.from),
        fromLonLat(conn.to)
      ]),
      connectionData: conn,
      id: `connection_${index}`
    }));

    const streetConnectionsId = `street_connections_${this.activeProjectId}`;
    
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(0, 123, 255, 0.5)',
          width: 2,
          lineDash: [8, 4]
        })
      }),
      visible: this.getLayerVisibility(streetConnectionsId),
      properties: {
        id: streetConnectionsId,
        name: 'Street Image Connections',
        type: 'street_connections'
      }
    });

    // console.log(`Created ${connections.length} street image connections`);
    return layer;
  }

  // Enhanced preloading with better concurrency control
  async preloadThumbnails(streetImages) {
    const validImages = streetImages.filter(img => 
      (img.s3_url || img.file_path) && 
      img.id && 
      !this.imageCache.has(img.id)
    );
    
    if (validImages.length === 0) {
      // console.log('No new thumbnails to preload');/
      return;
    }
    
    // console.log(`Starting to preload ${validImages.length} thumbnails...`);
    
    // Process in smaller batches to avoid overwhelming the server
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < validImages.length; i += batchSize) {
      batches.push(validImages.slice(i, i + batchSize));
    }

    let totalSuccessful = 0;
    
    for (const batch of batches) {
      const batchPromises = batch.map(img => {
        const thumbnailUrl = this.getProxyImageUrl(img.s3_url || img.file_path);
        return this.loadThumbnailImage(thumbnailUrl, img.id);
      });

      try {
        const results = await Promise.allSettled(batchPromises);
        const batchSuccessful = results.filter(r => r.status === 'fulfilled').length;
        totalSuccessful += batchSuccessful;
        
        // console.log(`Batch completed: ${batchSuccessful}/${batch.length} successful`);
        
        // Small delay between batches to avoid overwhelming the server
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        // console.warn('Error during batch thumbnail preloading:', error);
      }
    }

    // console.log(`Thumbnail preloading completed: ${totalSuccessful}/${validImages.length} successful`);
  }

  // Utility methods
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  clearImageCache() {
    this.imageCache.clear();
    this.loadingPromises.clear();
    this.failedUrls.clear();
    // console.log('Street image cache cleared');
  }

  // Method to get statistics about loaded images
  getLoadingStats() {
    return {
      cachedImages: this.imageCache.size,
      loadingImages: this.loadingPromises.size,
      failedUrlCount: this.failedUrls.size,
      cacheKeys: Array.from(this.imageCache.keys()),
      failedUrls: Array.from(this.failedUrls)
    };
  }

  // Method to retry failed images
  retryFailedImages() {
    // console.log(`Retrying ${this.failedUrls.size} failed images`);
    this.failedUrls.clear();
    // This would trigger re-rendering of features, causing them to retry loading
  }
}
