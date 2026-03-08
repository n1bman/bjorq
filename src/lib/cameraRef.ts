import * as THREE from 'three';

// Global refs to capture current camera state from Three.js scene
export const cameraRef = {
  position: new THREE.Vector3(12, 12, 12),
  target: new THREE.Vector3(0, 0, 0),
};

// Global fly-to request — CameraController reads and clears this each frame
export let pendingFlyTo: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;

/**
 * Request the camera to smoothly fly to a position/target.
 * Works from anywhere — the CameraController in Scene3D picks it up.
 */
export function flyTo(position: [number, number, number], target: [number, number, number]) {
  pendingFlyTo = {
    position: new THREE.Vector3(...position),
    target: new THREE.Vector3(...target),
  };
}

/** Compute a reasonable camera position looking down at a room polygon centroid */
export function cameraForPolygon(polygon: [number, number][]): { position: [number, number, number]; target: [number, number, number] } {
  let cx = 0, cz = 0;
  for (const [x, z] of polygon) { cx += x; cz += z; }
  cx /= polygon.length;
  cz /= polygon.length;
  // Compute bounding size to determine height
  let maxD = 0;
  for (const [x, z] of polygon) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > maxD) maxD = d;
  }
  const height = Math.max(4, maxD * 2);
  return {
    position: [cx + height * 0.3, height, cz + height * 0.3],
    target: [cx, 0, cz],
  };
}
