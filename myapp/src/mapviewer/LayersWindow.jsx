import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Eye, EyeOff, Settings, X, Layers, Upload, Database, Image, 
  FileText, MapPin, AlertCircle, CheckCircle, Loader 
} from 'lucide-react';
import { 
  fetchAllLayers, 
  toggleLayerVisibility, 
  setActiveProject,
  setLayerVisibility
} from '../mapviewer/MapSlice';
import { 
  setUploadProgress, 
  clearProjectError, 
  uploadProjectImages 
} from './ImageUploadSlice';
import CompactImageUpload from './DragDrop';
import ProjectSelector from './ProjectSelector';
import {LayerToolbar} from './LayerToolbar';
import { fetchProjects } from '../redux+page/Project/ProjectSlice';


const LayersWindow = ({ onClose, width, onWidthChange, map }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [activeTab, setActiveTab] = useState('data');
  const [isDragOver, setIsDragOver] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);
  
  // Separate progress tracking for different upload types
  const [uploadProgress, setUploadProgress] = useState({
    data: 0,
    images: 0
  });
  
  const [isUploading, setIsUploading] = useState({
    data: false,
    images: false
  });
  
  // Redux selectors
  const { user } = useSelector((state) => state.auth);
  const uploadData = useSelector((state) => state.imageUpload?.uploads?.[selectedProjectId]);
  const mapState = useSelector((state) => state.map);
  
  // Get layer data for current project
  const projectLayers = mapState.projectLayers[selectedProjectId] || {
    vectorLayers: [],
    streetImages: [],
    rasterLayers: []
  };
  
  const { vectorLayers, streetImages, rasterLayers } = projectLayers;
  const { layerVisibility, loading, error } = mapState;
  
  const uploadedFiles = uploadData?.files || [];
  const uploadError = uploadData?.error;

  // File validation logic
  const SUPPORTED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.geojson', '.shp', '.kml', '.gpx', '.zip', '.jp2', '.geotiff',
    '.las', '.laz', '.ply', '.pcd', '.xyz', '.pts', '.e57',
    '.dem', '.dtm', '.dsm', '.asc'
  ];

  const SUPPORTED_MIME_TYPES = [
    'image/*', 'application/json', 'application/geo+json',
    'application/zip', 'application/x-zip-compressed',
    'text/plain', 'application/octet-stream',
    'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz'
  ];

  const isValidFile = (file) => {
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

  // Enhanced layer visibility toggle with default settings
  const handleLayerToggle = (layerId, layerType) => {
    const currentVisibility = layerVisibility[layerId];
    const newVisibility = currentVisibility !== false ? false : true;
    
    dispatch(setLayerVisibility({ layerId, visibility: newVisibility }));
  };

  // Set default layer visibility when project loads
  const setDefaultLayerVisibility = () => {
    if (!selectedProjectId || selectedProjectId === 'default') return;
    
    const updates = {};
    
    // Vector layers: visible by default
    vectorLayers.forEach(layer => {
      if (layerVisibility[layer.id] === undefined) {
        updates[layer.id] = true;
      }
    });
    
    // Raster layers: hidden by default
    rasterLayers.forEach(layer => {
      if (layerVisibility[layer.id] === undefined) {
        updates[layer.id] = false;
      }
    });
    
    // Street images: hidden by default
    if (streetImages.length > 0) {
      const streetImagesId = `street_images_${selectedProjectId}`;
      const streetImagesWMSId = `street_images_wms_${selectedProjectId}`;
      
      if (layerVisibility[streetImagesId] === undefined) {
        updates[streetImagesId] = false;
      }
      if (layerVisibility[streetImagesWMSId] === undefined) {
        updates[streetImagesWMSId] = false;
      }
    }
    
    // Apply all updates
    Object.entries(updates).forEach(([layerId, visibility]) => {
      dispatch(setLayerVisibility({ layerId, visibility }));
    });
  };

  // API Integration - Handle file uploads with tab-specific progress
  const handleUpload = async (files, uploadType = 'data') => {
    if (!selectedProjectId) {
      console.error('Project ID is required for upload');
      return;
    }

    if (uploadError) {
      dispatch(clearProjectError(selectedProjectId));
    }

    // Set uploading state for specific tab
    setIsUploading(prev => ({ ...prev, [uploadType]: true }));
    setUploadProgress(prev => ({ ...prev, [uploadType]: 0 }));

    const onProgress = (progress) => {
      setUploadProgress(prev => ({ ...prev, [uploadType]: progress }));
    };

    try {
      const originalFiles = files.map(img => img.file);
      await dispatch(uploadProjectImages({ 
        projectId: selectedProjectId, 
        files: originalFiles, 
        onProgress 
      })).unwrap();
      
      setLocalFiles(prev => prev.filter(f => !files.some(uploaded => uploaded.id === f.id)));
      
      // Refresh layers after upload and set default visibility
      await dispatch(fetchAllLayers(selectedProjectId));
      
      // Refresh projects list to show new project immediately
      await dispatch(fetchProjects());
      
      setTimeout(() => {
        setDefaultLayerVisibility();
      }, 500);
      
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 
                          error?.error || 
                          error?.message || 
                          'Upload failed';
      console.error('Upload failed:', errorMessage);
    } finally {
      // Reset uploading state for specific tab
      setIsUploading(prev => ({ ...prev, [uploadType]: false }));
      setUploadProgress(prev => ({ ...prev, [uploadType]: 0 }));
    }
  };

  // Handle files ready from CompactImageUpload
  const handleFilesReady = (processedFiles, uploadType = 'data') => {
    setLocalFiles(prev => [...prev, ...processedFiles]);
    handleUpload(processedFiles, uploadType);
  };

  // Remove local file
  const removeLocalFile = (id) => {
    setLocalFiles(prev => prev.filter(img => img.id !== id));
  };

  // Effects
  useEffect(() => {
    if (projectId && projectId !== 'default') {
      setSelectedProjectId(projectId);
      dispatch(setActiveProject(projectId));
      // Fetch layers for the project
      dispatch(fetchAllLayers(projectId)).then(() => {
        // Set default visibility after layers are fetched
        setTimeout(() => {
          setDefaultLayerVisibility();
        }, 500);
      });
    }
  }, [projectId, dispatch]);

  // Set default visibility when layers change
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'default' && 
        (vectorLayers.length > 0 || rasterLayers.length > 0 || streetImages.length > 0)) {
      setDefaultLayerVisibility();
    }
  }, [vectorLayers, rasterLayers, streetImages, selectedProjectId]);

  // Update selected project when URL changes
  useEffect(() => {
    if (projectId && projectId !== 'default') {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  // Handle project change with project list refresh
  const handleProjectChange = async (newProjectId) => {
    setSelectedProjectId(newProjectId);
    dispatch(setActiveProject(newProjectId));
    navigate(`/map/${newProjectId}`, { replace: true });
    
    // Refresh projects list to ensure new projects appear
    await dispatch(fetchProjects());
    
    // Fetch layers for the new project
    if (newProjectId !== 'default') {
      dispatch(fetchAllLayers(newProjectId)).then(() => {
        // Set default visibility after layers are fetched
        setTimeout(() => {
          setDefaultLayerVisibility();
        }, 500);
      });
    }
  };

  // Enhanced drag and drop handlers
  const handleDataDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDataDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDataDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => isValidFile(file));
    
    if (files.length === 0) {
      console.warn('No valid files found in drop');
      return;
    }
    
    const processedFiles = await readFiles(files);
    handleFilesReady(processedFiles, 'data');
  };

  const allFiles = [...localFiles, ...uploadedFiles];
  const totalLayerCount = vectorLayers.length + streetImages.length + rasterLayers.length;

  // Enhanced Layer rendering component with better responsive design
  const LayerItem = ({ layer, layerType, icon }) => {
    const isVisible = layerVisibility[layer.id] !== false;
    const displayName = layer.display_name || layer.name || layer.original_filename || 'Unnamed Layer';
    
    // Dynamic styling based on layer type and visibility
    const getLayerItemStyle = () => {
      const baseStyle = "flex items-center space-x-2 p-2 rounded-lg border transition-all duration-200";
      const visibilityStyle = isVisible 
        ? "bg-gray-800 border-gray-600 shadow-md" 
        : "bg-gray-850 border-gray-700 opacity-75";
      
      return `${baseStyle} ${visibilityStyle}`;
    };
    
    const getStatusColor = (status) => {
      switch(status) {
        case 'completed': return 'text-green-400';
        case 'processing': return 'text-yellow-400';
        case 'failed': return 'text-red-400';
        default: return 'text-gray-400';
      }
    };
    
    return (
      <div className={getLayerItemStyle()}>
        <button 
          onClick={() => handleLayerToggle(layer.id, layerType)}
          className="flex-shrink-0 transition-colors duration-200"
          title={isVisible ? 'Hide layer' : 'Show layer'}
        >
          {isVisible ? 
            <Eye size={14} className="text-blue-400 hover:text-blue-300" /> : 
            <EyeOff size={14} className="text-gray-500 hover:text-gray-400" />
          }
        </button>
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className={`text-xs font-medium truncate ${isVisible ? 'text-gray-200' : 'text-gray-400'}`}>
            {displayName}
          </p>
          <div className="flex items-center space-x-1 text-xs text-gray-400 overflow-hidden">
            <span className="capitalize truncate">{layerType}</span>
            {layer.geometry_type && <span className="hidden sm:inline">• {layer.geometry_type}</span>}
            {layer.feature_count && (
              <span className="hidden md:inline">• {layer.feature_count} features</span>
            )}
            {layer.band_count && (
              <span className="hidden md:inline">• {layer.band_count} bands</span>
            )}
            {layer.processing_status && (
              <span className={`${getStatusColor(layer.processing_status)} hidden lg:inline`}>
                • {layer.processing_status}
              </span>
            )}
            {isVisible && <span className="text-green-400 font-medium">• Visible</span>}
          </div>
        </div>
        <div className="flex-shrink-0">
          <button 
            className="p-1 text-gray-500 hover:text-blue-400 rounded transition-colors duration-200"
            onClick={() => {
              // TODO: Open layer properties dialog
              console.log('Layer properties:', layer);
            }}
            title="Layer properties"
          >
            <Settings size={10} />
          </button>
        </div>
      </div>
    );
  };

  // Street images layer item with better responsive design
  const StreetImagesLayerItem = () => {
    if (streetImages.length === 0) return null;
    
    const streetImagesId = `street_images_${selectedProjectId}`;
    const streetImagesWMSId = `street_images_wms_${selectedProjectId}`;
    const isVisible = layerVisibility[streetImagesId] !== false || layerVisibility[streetImagesWMSId] !== false;
    
    const getLayerItemStyle = () => {
      const baseStyle = "flex items-center space-x-2 p-2 rounded-lg border transition-all duration-200";
      const visibilityStyle = isVisible 
        ? "bg-gray-800 border-gray-600 shadow-md" 
        : "bg-gray-850 border-gray-700 opacity-75";
      
      return `${baseStyle} ${visibilityStyle}`;
    };
    
    return (
      <div className={getLayerItemStyle()}>
        <button 
          onClick={() => {
            const newVisibility = !isVisible;
            dispatch(setLayerVisibility({ layerId: streetImagesId, visibility: newVisibility }));
            dispatch(setLayerVisibility({ layerId: streetImagesWMSId, visibility: newVisibility }));
          }}
          className="flex-shrink-0 transition-colors duration-200"
          title={isVisible ? 'Hide street images' : 'Show street images'}
        >
          {isVisible ? 
            <Eye size={14} className="text-blue-400 hover:text-blue-300" /> : 
            <EyeOff size={14} className="text-gray-500 hover:text-gray-400" />
          }
        </button>
        <div className="flex-shrink-0">
          <Image size={14} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className={`text-xs font-medium truncate ${isVisible ? 'text-gray-200' : 'text-gray-400'}`}>
            Street Images
          </p>
          <div className="flex items-center space-x-1 text-xs text-gray-400 overflow-hidden">
            <span>street_images</span>
            <span>• {streetImages.length} images</span>
            {isVisible && <span className="text-green-400 font-medium">• Visible</span>}
          </div>
        </div>
        <div className="flex-shrink-0">
          <button 
            className="p-1 text-gray-500 hover:text-blue-400 rounded transition-colors duration-200"
            onClick={() => {
              console.log('Street images data:', streetImages);
            }}
            title="Street images properties"
          >
            <Settings size={10} />
          </button>
        </div>
      </div>
    );
  };

  // Progress Bar Component
  const ProgressBar = ({ isVisible, progress, label }) => {
    if (!isVisible) return null;
    
    return (
      <div className="p-3 bg-blue-900 bg-opacity-20 border-b border-gray-600">
        <div className="flex items-center justify-between text-sm text-blue-300 mb-2">
          <span className="font-medium">{label}</span>
          <span className="font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  // Show loading state when there's no user
  if (!user) {
    return (
      <div style={{ width }} className="h-full border-l bg-gray-700 shadow-md flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 border-b border-gray-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Layers size={18} />
              <div>
                <h3 className="text-sm font-semibold">Layers Panel</h3>
                <p className="text-xs text-blue-100">Loading...</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-red-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <span className="text-gray-300">Loading user information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width }} className="h-full border-l bg-gray-700 shadow-md flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 border-b border-gray-600">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Layers size={18} />
            <div>
              <h3 className="text-sm font-semibold">Layers Panel</h3>
              <p className="text-xs text-blue-100">Manage your map layers</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-red-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Embedded Project Selector */}
      <ProjectSelector 
        selectedProjectId={selectedProjectId}
        onProjectSelect={handleProjectChange}
      />

      {/* Layer Toolbar */}
      {selectedProjectId && selectedProjectId !== 'default' && <LayerToolbar />}
      
      {/* Main Content Area */}
      {selectedProjectId && selectedProjectId !== 'default' ? (
        <div className="flex-grow flex flex-col min-h-0">
          {/* Content based on active tab with scrollable container */}
          <div className="flex-grow overflow-hidden flex flex-col min-h-0">

            {activeTab === 'data' && (
              <div 
                className={`flex-grow flex flex-col transition-all duration-200 relative overflow-hidden min-h-0 ${
                  isDragOver 
                    ? 'bg-blue-900 bg-opacity-30' 
                    : 'bg-gray-700'
                }`}
                onDragOver={handleDataDragOver}
                onDragLeave={handleDataDragLeave}
                onDrop={handleDataDrop}
              >
                {/* Drag overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-900 bg-opacity-40 border-2 border-dashed border-blue-400 pointer-events-none">
                    <div className="text-center text-blue-300">
                      <Upload size={48} className="mx-auto mb-3" />
                      <p className="text-lg font-medium">Drop files here</p>
                      <p className="text-sm opacity-75">Supports: Images, SHP, GeoJSON, KML, ZIP, and more</p>
                    </div>
                  </div>
                )}

                {/* Upload Progress for Data tab only */}
                <ProgressBar 
                  isVisible={isUploading.data}
                  progress={uploadProgress.data}
                  label="Uploading data files..."
                />

                {/* Error Display */}
                {(uploadError || error.general) && (
                  <div className="p-3 bg-red-900 bg-opacity-20 border-b border-gray-600">
                    <div className="flex items-center space-x-2 text-sm text-red-300">
                      <AlertCircle size={16} />
                      <span>
                        {uploadError && `Upload failed: ${typeof uploadError === 'string' ? uploadError : uploadError.error || 'Unknown error'}`}
                        {error.general && `Layer error: ${error.general}`}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex-grow overflow-auto p-3 space-y-4 min-h-0">
                  {/* Loading State */}
                  {loading.fetchingAll && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <span className="text-gray-300">Loading layers...</span>
                    </div>
                  )}

                  {/* Vector Layers Section */}
                  {vectorLayers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">
                          Vector Layers ({vectorLayers.length}) - Default: Visible
                        </h4>
                        {loading.fetchingVector && <Loader size={14} className="animate-spin text-blue-400" />}
                      </div>
                      <div className="space-y-2">
                        {vectorLayers.map((layer) => (
                          <LayerItem
                            key={layer.id}
                            layer={layer}
                            layerType="vector"
                            icon={<FileText size={14} className="text-green-400" />}
                          />
                        ))}
                      </div>
                      {error.vector && (
                        <div className="text-xs text-red-400 p-2 bg-red-900 bg-opacity-20 rounded">
                          Error loading vector layers: {error.vector}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raster Layers Section */}
                  {rasterLayers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">
                          Raster Layers ({rasterLayers.length}) - Default: Hidden
                        </h4>
                        {loading.fetchingRaster && <Loader size={14} className="animate-spin text-blue-400" />}
                      </div>
                      <div className="space-y-2">
                        {rasterLayers.map((layer) => (
                          <LayerItem
                            key={layer.id}
                            layer={layer}
                            layerType="raster"
                            icon={<FileText size={14} className="text-orange-400" />}
                          />
                        ))}
                      </div>
                      {error.raster && (
                        <div className="text-xs text-red-400 p-2 bg-red-900 bg-opacity-20 rounded">
                          Error loading raster layers: {error.raster}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Street Images Section */}
                  {streetImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">
                          Street Images ({streetImages.length}) - Default: Hidden
                        </h4>
                      </div>
                      <div className="space-y-2">
                        <StreetImagesLayerItem />
                      </div>
                    </div>
                  )}

                  {/* No Layers Message */}
                  {!loading.fetchingAll && totalLayerCount === 0 && (
                    <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-600">
                      <Layers size={32} className="mx-auto mb-3 text-gray-500" />
                      <p className="text-sm text-gray-400 mb-1">No layers found</p>
                      <p className="text-xs text-gray-500">Upload files to create map layers</p>
                    </div>
                  )}

                  {/* Drop zone hint when no files and not dragging */}
                  {allFiles.length === 0 && !isDragOver && !loading.fetchingAll && (
                    <div className="text-center py-8">
                      <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                      <p className="text-sm text-gray-400 mb-1">Drag and drop files anywhere in this tab</p>
                      <p className="text-xs text-gray-500">Supports: Images, SHP, GeoJSON, KML, ZIP, and more</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
                {/* Upload Progress for Images tab only */}
                <ProgressBar 
                  isVisible={isUploading.images}
                  progress={uploadProgress.images}
                  label="Uploading images..."
                />

                <div className="flex-grow overflow-auto p-3 space-y-4 min-h-0">
                  {/* Upload section using CompactImageUpload */}
                  <CompactImageUpload 
                    onFilesReady={(files) => handleFilesReady(files, 'images')}
                    isUploading={isUploading.images}
                    uploadProgress={uploadProgress.images}
                    uploadError={uploadError}
                    localFiles={localFiles.filter(file => file.isImage)}
                    onRemoveFile={removeLocalFile}
                    acceptedFormats={{
                      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'],
                      mimeTypes: ['image/*']
                    }}
                    showFileList={true}
                  />
                  
                  {/* Uploaded images status */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white">Uploaded Images ({uploadedFiles.length})</h4>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg border border-gray-600">
                            <Image size={16} className="text-blue-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200 truncate">{file.name}</p>
                              {file.uploadedAt && (
                                <p className="text-xs text-gray-400">
                                  {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <CheckCircle size={16} className="text-green-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}    
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-gray-600 bg-gray-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab('data')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'data'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Database size={16} />
                <span>Data</span>
                {totalLayerCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {totalLayerCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'images'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Image size={16} />
                <span>Images</span>
                {uploadedFiles.filter(f => f.isImage).length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {uploadedFiles.filter(f => f.isImage).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center">
            <MapPin size={48} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Project Selected</h3>
            <p className="text-gray-400 mb-4">
              Please select a project to view its layers
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayersWindow;