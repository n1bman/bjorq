/**
 * Demo project data — procedural house layout with walls, rooms, and device markers.
 * Used to give new users something to explore immediately.
 */

import type { LayoutState, DeviceMarker } from '../store/types';

const generateId = () => Math.random().toString(36).slice(2, 10);

export function createDemoLayout(): LayoutState {
  const wallIds = {
    n: generateId(), s: generateId(), e: generateId(), w: generateId(),
    inner1: generateId(), inner2: generateId(),
  };

  return {
    floors: [
      {
        id: 'floor-1',
        name: 'Våning 1',
        elevation: 0,
        heightMeters: 2.5,
        gridSize: 0.5,
        walls: [
          // Outer walls (10×8m house)
          { id: wallIds.n, from: [0, 0], to: [10, 0], height: 2.5, thickness: 0.2, openings: [
            { id: generateId(), type: 'window', offset: 0.25, width: 1.2, height: 1.4, sillHeight: 0.9 },
            { id: generateId(), type: 'door', offset: 0.7, width: 1.0, height: 2.1, sillHeight: 0 },
          ] },
          { id: wallIds.s, from: [0, 8], to: [10, 8], height: 2.5, thickness: 0.2, openings: [
            { id: generateId(), type: 'window', offset: 0.5, width: 2.0, height: 1.4, sillHeight: 0.9 },
          ] },
          { id: wallIds.w, from: [0, 0], to: [0, 8], height: 2.5, thickness: 0.2, openings: [] },
          { id: wallIds.e, from: [10, 0], to: [10, 8], height: 2.5, thickness: 0.2, openings: [
            { id: generateId(), type: 'window', offset: 0.5, width: 1.0, height: 1.4, sillHeight: 0.9 },
          ] },
          // Inner walls
          { id: wallIds.inner1, from: [5, 0], to: [5, 5], height: 2.5, thickness: 0.15, openings: [
            { id: generateId(), type: 'door', offset: 0.5, width: 0.9, height: 2.1, sillHeight: 0 },
          ] },
          { id: wallIds.inner2, from: [0, 5], to: [10, 5], height: 2.5, thickness: 0.15, openings: [
            { id: generateId(), type: 'door', offset: 0.3, width: 0.9, height: 2.1, sillHeight: 0 },
          ] },
        ],
        rooms: [
          { id: generateId(), name: 'Vardagsrum', wallIds: [wallIds.n, wallIds.w, wallIds.inner1, wallIds.inner2], polygon: [[0,0],[5,0],[5,5],[0,5]] },
          { id: generateId(), name: 'Kök', wallIds: [wallIds.n, wallIds.e, wallIds.inner1, wallIds.inner2], polygon: [[5,0],[10,0],[10,5],[5,5]] },
          { id: generateId(), name: 'Sovrum', wallIds: [wallIds.s, wallIds.w, wallIds.e, wallIds.inner2], polygon: [[0,5],[10,5],[10,8],[0,8]] },
        ],
        stairs: [],
        kitchenFixtures: [],
      },
    ],
    activeFloorId: 'floor-1',
    scaleCalibrated: true,
  };
}

export function createDemoDevices(): { markers: DeviceMarker[] } {
  return {
    markers: [
      {
        id: generateId(),
        kind: 'light',
        name: 'Taklampa vardagsrum',
        floorId: 'floor-1',
        surface: 'ceiling',
        position: [2.5, 2.4, 2.5],
        rotation: [0, 0, 0],
      },
      {
        id: generateId(),
        kind: 'light',
        name: 'Kökslampa',
        floorId: 'floor-1',
        surface: 'ceiling',
        position: [7.5, 2.4, 2.5],
        rotation: [0, 0, 0],
      },
      {
        id: generateId(),
        kind: 'sensor',
        name: 'Temperatursensor',
        floorId: 'floor-1',
        surface: 'wall',
        position: [1, 1.5, 0.1],
        rotation: [0, 0, 0],
      },
      {
        id: generateId(),
        kind: 'switch',
        name: 'Strömbrytare hall',
        floorId: 'floor-1',
        surface: 'wall',
        position: [4.8, 1.2, 0.1],
        rotation: [0, 0, 0],
      },
    ],
  };
}
