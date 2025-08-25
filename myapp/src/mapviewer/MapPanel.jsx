import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";

const MapPanel = ({ onFeatureSelect, onOpen3D, onOpenImage, onOpenLayers, onOpenToolbox }) => {
  const mapRef = useRef();

  useEffect(() => {
    const map = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({
        center: fromLonLat([77.5946, 12.9716]),
        zoom: 12,
      }),
    });

    map.on("singleclick", () => {
      onFeatureSelect({ id: Date.now(), name: "Clicked Feature" });
    });

    return () => map.setTarget(null);
  }, []);

  return (
    <div ref={mapRef} className="absolute top-0 left-0 w-full h-full z-0">

      {/* Map Control Buttons */}
      <div className="absolute bottom-4 left-4 space-x-2 z-20">
        <button className="bg-white px-3 py-1 rounded shadow" onClick={onOpen3D}>3D</button>
        <button className="bg-white px-3 py-1 rounded shadow" onClick={onOpenImage}>Street</button>
        <button className="bg-white px-3 py-1 rounded shadow" onClick={onOpenLayers}>Layers</button>
      </div>

      {/* Gear for Toolbox */}
      <div className="absolute top-4 right-4 z-20">
        <button
          className="bg-gray-800 text-white p-2 rounded-full shadow"
          onClick={onOpenToolbox}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default MapPanel;
