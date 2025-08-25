// src/projections.js
import proj4 from "proj4";
import { register } from "ol/proj/proj4";

// Register proj4 with OpenLayers
register(proj4);

// ✅ Make proj4 global so Potree can use it
window.proj4 = proj4;

// Define custom projections here if needed
// Example: proj4.defs("EPSG:XXXX", "+proj=... +datum=...");

export default proj4;
