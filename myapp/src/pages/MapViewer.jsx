import React, { useState, useRef, useEffect } from 'react';

import MapWindow from '../mapviewer/MapWindow';
import LayersWindow from "../mapviewer/LayersWindow";
import ThreeDWindow from "../mapviewer/ThreeDWindow";
import ImageWindow from "../mapviewer/ImageWindow";
import ProcessingToolbox from "../mapviewer/ProcessingToolbox";
import { useParams } from 'react-router-dom';

const MapViewer = () => {
  const [showThreeD, setShowThreeD] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showToolbox, setShowToolbox] = useState(false);
  const [mapClickData, setMapClickData] = useState(null);
  const [threeDWidth, setThreeDWidth] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const [layersWidth, setLayersWidth] = useState(0);
  const { projectId } = useParams();
  const [olMap, setOlMap] = useState(null);

  useEffect(() => {
  console.log("Project ID from URL:", projectId);
}, [projectId]);

  const dragRefs = {
    threeD: useRef(null),
    image: useRef(null),
    layers: useRef(null),
  };

  const totalExtraWidth = (showThreeD ? threeDWidth : 0) + (showImage ? imageWidth : 0) + (showLayers ? layersWidth : 0);
  const mapWidth = `calc(100% - ${totalExtraWidth}px)`;

  const initDrag = (e, windowType) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = { threeD: threeDWidth, image: imageWidth, layers: layersWidth }[windowType];

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, startWidth - deltaX);
      if (windowType === "threeD") setThreeDWidth(newWidth);
      if (windowType === "image") setImageWidth(newWidth);
      if (windowType === "layers") setLayersWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    if (showThreeD && threeDWidth === 0) setThreeDWidth(window.innerWidth * 0.25);
    if (showImage && imageWidth === 0) setImageWidth(window.innerWidth * 0.25);
    if (showLayers && layersWidth === 0) setLayersWidth(window.innerWidth * 0.25);
  }, [showThreeD, showImage, showLayers]);

  return (
    <div className="flex w-full h-screen relative overflow-hidden bg-gray-100">
      <div className="flex-shrink-0" style={{ width: mapWidth }}>
        <MapWindow
          onMapClick={setMapClickData}
          showToolbox={showToolbox}
          toggleToolbox={() => setShowToolbox(!showToolbox)}
          onOpen3D={() => setShowThreeD(true)}
          onOpenImage={() => setShowImage(true)}
          onOpenLayers={() => setShowLayers(true)}
          mapClickData={mapClickData}
          setMapInstance={setOlMap}
        />
      </div>

      {showThreeD && (
        <>
          <div className="w-1 cursor-ew-resize" onMouseDown={(e) => initDrag(e, "threeD")} />
          <ThreeDWindow onClose={() => setShowThreeD(false)} width={threeDWidth} />
        </>
      )}
      {showImage && (
        <>
          <div className="w-1 cursor-ew-resize" onMouseDown={(e) => initDrag(e, "image")} />
          <ImageWindow onClose={() => setShowImage(false)} width={imageWidth} />
        </>
      )}
      {showLayers && (
        <>
          <div className="w-1 cursor-ew-resize" onMouseDown={(e) => initDrag(e, "layers")} />
          <LayersWindow onClose={() => setShowLayers(false)} width={layersWidth} projectId={projectId} map={olMap}/>
        </>
      )}

      {showToolbox && <ProcessingToolbox onClose={() => setShowToolbox(false)} />}
    </div>
  );
};

export default MapViewer;