import React from 'react';

const MapButtons = ({ on3DClick, onStreetClick, onLayersClick, onGearClick }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '100px',
        zIndex: 10,
        display: 'flex',
        gap: '10px',
      }}
    >
      <button onClick={on3DClick}>3D</button>
      <button onClick={onStreetClick}>Street View</button>
      <button onClick={onLayersClick}>Layers</button>
      <button onClick={onGearClick}>⚙️</button>
    </div>
  );
};

export default MapButtons;
