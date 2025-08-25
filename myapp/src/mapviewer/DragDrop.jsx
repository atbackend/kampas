import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Loader, CheckCircle, X, ImageIcon, FileText } from 'lucide-react';

const CompactImageUpload = ({ 
  onFilesReady, 
  isUploading = false, 
  uploadProgress = 0, 
  uploadError = null,
  localFiles = [],
  onRemoveFile,
  className = "",
  showFileList = false,
  showProgress = true,
  showError = true,
  acceptedFormats = null, // Override default formats if needed
  maxFileSize = null, // Optional file size limit
  multiple = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Define supported file extensions and MIME types
  const SUPPORTED_EXTENSIONS = acceptedFormats?.extensions || [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.geojson', '.shp', '.kml', '.gpx', '.zip', '.jp2', '.geotiff',
    '.las', '.laz', '.ply', '.pcd', '.xyz', '.pts', '.e57',
    '.dem', '.dtm', '.dsm', '.asc'
  ];

  const SUPPORTED_MIME_TYPES = acceptedFormats?.mimeTypes || [
    'image/*', 'application/json', 'application/geo+json',
    'application/zip', 'application/x-zip-compressed',
    'text/plain', 'application/octet-stream',
    'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz'
  ];

  const isValidFile = (file) => {
    // Check file size if limit is set
    if (maxFileSize && file.size > maxFileSize) {
      return false;
    }

    const extension = '.' + file.name.toLowerCase().split('.').pop();
    if (SUPPORTED_EXTENSIONS.includes(extension)) return true;

    if (file.type) {
      if (SUPPORTED_MIME_TYPES.includes(file.type)) return true;
      if (file.type.startsWith('image/')) return true;
    }

    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.shp') || fileName.endsWith('.geojson') || 
           fileName.endsWith('.kml') || fileName.endsWith('.gpx') ||
           fileName.endsWith('.zip');
  };

  const getAcceptAttribute = () => {
    return [...SUPPORTED_EXTENSIONS, ...SUPPORTED_MIME_TYPES].join(',');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const readFiles = (files) => {
    return Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          if (!file.type.startsWith('image/')) {
            resolve({
              id: Date.now() + Math.random(),
              name: file.name,
              size: file.size,
              url: null,
              type: file.type,
              file: file,
              status: 'pending',
              isImage: false
            });
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              id: Date.now() + Math.random(),
              name: file.name,
              size: file.size,
              url: event.target.result,
              type: file.type,
              file: file,
              status: 'pending',
              isImage: true
            });
          };
          reader.onerror = () => {
            resolve({
              id: Date.now() + Math.random(),
              name: file.name,
              size: file.size,
              url: null,
              type: file.type,
              file: file,
              status: 'pending',
              isImage: false
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => isValidFile(file));
    
    if (files.length === 0) {
      console.warn('No valid files found in drop');
      return;
    }
    
    const processedFiles = await readFiles(files);
    onFilesReady?.(processedFiles);
  };

  const handleFileInput = async (e) => {
    const files = Array.from(e.target.files).filter(file => isValidFile(file));
    
    if (files.length === 0) {
      console.warn('No valid files selected');
      return;
    }
    
    const processedFiles = await readFiles(files);
    onFilesReady?.(processedFiles);
  };

  return (
    <div className={`w-full   ${className}`}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 bg-gray-800 ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <Upload
          size={32}
          className={`mx-auto mb-3 ${
            isDragOver ? 'text-blue-500' : 'text-gray-400'
          }`}
        />
        <div className="space-y-2">
          <h3 className={`text-sm font-medium  ${
            isDragOver ? 'text-blue-700' : 'text-gray-200'
          }`}>
            {isDragOver ? 'Drop files here' : 'Upload Project Files'}
          </h3>
          <p className="text-xs text-gray-300">
            Drag and drop files or click to browse
          </p>
          <div className="text-xs text-gray-400">
            Supports: Images, SHP, GeoJSON, KML, ZIP, and more
          </div>
        </div>

        <label className="block mt-4">
          <span className={`inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
            isUploading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            <Upload size={16} />
            <span>{isUploading ? 'Uploading...' : 'Choose Files'}</span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptAttribute()}
            multiple={multiple}
            onChange={handleFileInput}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Progress Bar */}
      {showProgress && isUploading && (
        <div className="p-3 bg-blue-900 bg-opacity-20 border-b border-gray-600">
          <div className="flex items-center justify-between text-sm text-blue-300 mb-2">
            <span className="font-medium">Uploading...</span>
            <span className="font-semibold">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {showError && uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-red-700">
            <AlertCircle size={16} />
            <span>Upload failed: {typeof uploadError === 'string' ? uploadError : uploadError.error || 'Unknown error'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactImageUpload;