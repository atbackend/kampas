import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getStreetImageById } from './streetSlice';

const StreetViewViewer = ({ 
  streetImageData, 
  onClose, 
  onNavigateToImage, 
  allStreetImages = [] 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const imageRef = useRef(null);
  const dispatch = useDispatch();

  const { activeProjectId } = useSelector(state => state.map);
  const { currentImageLoading } = useSelector(state => state.street);

  // Find current image index in the array
  useEffect(() => {
    if (streetImageData && allStreetImages.length > 0) {
      const index = allStreetImages.findIndex(img => img.id === streetImageData.id);
      setCurrentImageIndex(index >= 0 ? index : 0);
    }
  }, [streetImageData, allStreetImages]);

  // Reset image states when image changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [streetImageData]);

  // Navigation functions
  const navigateToPrevious = async () => {
    if (currentImageIndex > 0) {
      const prevImage = allStreetImages[currentImageIndex - 1];
      await loadAndNavigateToImage(prevImage);
    }
  };

  const navigateToNext = async () => {
    if (currentImageIndex < allStreetImages.length - 1) {
      const nextImage = allStreetImages[currentImageIndex + 1];
      await loadAndNavigateToImage(nextImage);
    }
  };

  // Load full image data and navigate
  const loadAndNavigateToImage = async (imageData) => {
    try {
      // If we already have s3_url, use it directly
      if (imageData.s3_url) {
        onNavigateToImage(imageData);
        return;
      }

      // Otherwise fetch full data
      const result = await dispatch(getStreetImageById({
        projectId: activeProjectId,
        imageId: imageData.id
      }));

      if (result.type.endsWith('fulfilled')) {
        onNavigateToImage(result.payload);
      } else {
        console.error('Failed to load image data:', result.payload);
      }
    } catch (error) {
      console.error('Error loading image:', error);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateToNext();
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          setIsFullscreen(!isFullscreen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, allStreetImages.length, isFullscreen]);

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Get image URL
  const getImageUrl = () => {
    return streetImageData?.s3_url || '';
  };

  // Get nearby images for thumbnail strip
  const getNearbyImages = () => {
    const range = 5;
    const start = Math.max(0, currentImageIndex - range);
    const end = Math.min(allStreetImages.length, currentImageIndex + range + 1);
    return allStreetImages.slice(start, end);
  };

  if (!streetImageData) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black z-50 flex flex-col ${isFullscreen ? 'z-[60]' : ''}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold truncate max-w-md">
            {streetImageData.original_filename || 'Street Image'}
          </h2>
          <div className="text-sm text-gray-300">
            {currentImageIndex + 1} of {allStreetImages.length}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Thumbnail toggle */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className="p-2 hover:bg-gray-700 rounded"
            title="Toggle thumbnails"
          >
            🖼️
          </button>
          
          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-700 rounded"
            title="Toggle fullscreen (F)"
          >
            {isFullscreen ? '🗗' : '⛶'}
          </button>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded text-red-400 hover:text-red-300"
            title="Close (Escape)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {/* Navigation arrows */}
        {allStreetImages.length > 1 && (
          <>
            <button
              onClick={navigateToPrevious}
              disabled={currentImageIndex === 0 || currentImageLoading}
              className="absolute left-4 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              title="Previous image (←)"
            >
              ←
            </button>
            
            <button
              onClick={navigateToNext}
              disabled={currentImageIndex >= allStreetImages.length - 1 || currentImageLoading}
              className="absolute right-4 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              title="Next image (→)"
            >
              →
            </button>
          </>
        )}

        {/* Loading spinner */}
        {(!imageLoaded || currentImageLoading) && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Error message */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <div className="text-xl mb-2">Failed to load image</div>
              <div className="text-gray-400 text-sm">{streetImageData.original_filename}</div>
              <button
                onClick={() => {
                  setImageError(false);
                  setImageLoaded(false);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main image */}
        {getImageUrl() && (
          <img
            ref={imageRef}
            src={getImageUrl()}
            alt={streetImageData.original_filename}
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* Image info overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded text-sm">
          <div><strong>File:</strong> {streetImageData.original_filename}</div>
          {streetImageData.captured_at && (
            <div><strong>Captured:</strong> {new Date(streetImageData.captured_at).toLocaleString()}</div>
          )}
          {streetImageData.latitude && streetImageData.longitude && (
            <div><strong>Location:</strong> {streetImageData.latitude.toFixed(6)}, {streetImageData.longitude.toFixed(6)}</div>
          )}
          {streetImageData.image_type && (
            <div><strong>Type:</strong> {streetImageData.image_type}</div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {showThumbnails && allStreetImages.length > 1 && (
        <div className="flex-shrink-0 bg-gray-800 p-3 overflow-x-auto">
          <div className="flex space-x-2">
            {getNearbyImages().map((image, index) => {
              const globalIndex = allStreetImages.findIndex(img => img.id === image.id);
              const isActive = globalIndex === currentImageIndex;
              
              return (
                <button
                  key={image.id}
                  onClick={() => loadAndNavigateToImage(image)}
                  className={`flex-shrink-0 relative group ${
                    isActive ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-gray-400'
                  }`}
                  title={image.original_filename}
                >
                  <div className={`w-20 h-16 bg-gray-600 rounded overflow-hidden ${
                    isActive ? 'opacity-100' : 'opacity-70 hover:opacity-90'
                  }`}>
                    {image.s3_url ? (
                      <img
                        src={image.s3_url}
                        alt={image.original_filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">
                        📷
                      </div>
                    )}
                    <div className="hidden w-full h-full bg-gray-600 items-center justify-center text-white text-xs">
                      📷
                    </div>
                  </div>
                  
                  {/* Thumbnail index */}
                  <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded-tl">
                    {globalIndex + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="flex-shrink-0 bg-gray-900 text-gray-400 text-xs p-2 text-center">
        Use ← → arrow keys to navigate • F for fullscreen • Escape to close
      </div>
    </div>
  );
};

export default StreetViewViewer;