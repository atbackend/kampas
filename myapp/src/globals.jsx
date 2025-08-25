// src/globals.js
import proj4 from "proj4";
import * as THREE from "three";

// Attach to window BEFORE Potree loads
window.proj4 = proj4;
window.THREE = THREE;
