import * as THREE from 'three';

// Global refs to capture current camera state from Three.js scene
export const cameraRef = {
  position: new THREE.Vector3(12, 12, 12),
  target: new THREE.Vector3(0, 0, 0),
};
