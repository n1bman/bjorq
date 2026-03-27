import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DATA_DIR = path.join(ROOT, 'data', 'mock-hosted');

const mockConfig = {
  ha: { baseUrl: '', token: '' },
  ui: { defaultProjectId: 'home', defaultProfile: 'balanced' },
  network: { port: 3100 },
  security: { pinHash: '', pinSalt: '', sessionSecret: 'mock-session-secret' },
};

const mockProfiles = {
  profile: { name: 'Mock Hosted', theme: 'nordic', accentColor: '#d7a35d', dashboardBg: 'scene3d' },
  performance: { quality: 'high', shadows: true, postprocessing: false, tabletMode: false, showHUD: false },
  standby: { enabled: false, idleMinutes: 2, cameraView: 'standard' },
  homeView: {
    cameraPreset: 'angle',
    visibleWidgets: {
      clock: true,
      weather: true,
      temperature: true,
      energy: true,
      calendar: false,
      scenes: false,
      devices: true,
    },
    homeScreenDevices: ['vac-s8', 'vac-qrevo'],
    showDeviceMarkers: true,
    hiddenMarkerIds: [],
    markerSize: 'medium',
    widgetLayout: {
      devices: { position: 'bottom-left', size: 'normal' },
      nav: { position: 'top-left', size: 'normal' },
      camera: { position: 'top-right', size: 'normal' },
      rooms: { position: 'top-right', size: 'normal' },
    },
  },
  dashboard: { activeCategory: 'robot', categoryLayouts: {}, density: 'balance', editMode: false },
};

const mockProject = {
  layout: {
    activeFloorId: 'floor-1',
    scaleCalibrated: true,
    floors: [
      {
        id: 'floor-1',
        name: 'Entréplan',
        elevation: 0,
        heightMeters: 2.5,
        gridSize: 0.5,
        walls: [],
        stairs: [],
        kitchenFixtures: [],
        rooms: [
          { id: 'room-kok', name: 'Kok', wallIds: [], polygon: [[0, 0], [3, 0], [3, 3], [0, 3]] },
          { id: 'room-hall', name: 'Hall', wallIds: [], polygon: [[3, 0], [6, 0], [6, 3], [3, 3]] },
          { id: 'room-vardagsrum', name: 'Vardagsrum', wallIds: [], polygon: [[0, 3], [3, 3], [3, 6], [0, 6]] },
          { id: 'room-kontor', name: 'Kontor', wallIds: [], polygon: [[3, 3], [6, 3], [6, 6], [3, 6]] }
        ],
        vacuumMapping: {
          dockPosition: [0.8, 0.8],
          zones: [
            { roomId: 'room-kok', polygon: [[0, 0], [3, 0], [3, 3], [0, 3]], segmentId: 16 },
            { roomId: 'room-hall', polygon: [[3, 0], [6, 0], [6, 3], [3, 3]], segmentId: 17 },
            { roomId: 'room-vardagsrum', polygon: [[0, 3], [3, 3], [3, 6], [0, 6]], segmentId: 21 },
            { roomId: 'room-kontor', polygon: [[3, 3], [6, 3], [6, 6], [3, 6]], segmentId: 22 }
          ]
        }
      }
    ]
  },
  devices: {
    markers: [
      {
        id: 'vac-s8',
        kind: 'vacuum',
        name: 'Roborock S8',
        floorId: 'floor-1',
        roomId: 'room-kok',
        surface: 'floor',
        position: [1.2, 0, 1.2],
        rotation: [0, 0, 0],
        ha: { entityId: 'vacuum.roborock_s8' },
        notifyOnHomeScreen: true
      },
      {
        id: 'vac-qrevo',
        kind: 'vacuum',
        name: 'Roborock Q Revo',
        floorId: 'floor-1',
        roomId: 'room-kontor',
        surface: 'floor',
        position: [4.8, 0, 4.8],
        rotation: [0, 0, 0],
        ha: { entityId: 'vacuum.roborock_qrevo' },
        notifyOnHomeScreen: true
      }
    ],
    deviceStates: {
      "vac-s8": { "kind": "vacuum", "data": { "on": false, "status": "docked", "battery": 87, "currentRoom": "Kok" } },
      "vac-qrevo": { "kind": "vacuum", "data": { "on": false, "status": "docked", "battery": 79, "currentRoom": "Kontor" } }
    },
    vacuumDebug: {}
  },
  homeGeometry: {
    source: 'procedural',
    imported: {
      url: null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      groundLevelY: 0,
      northAngle: 0,
      floorBands: []
    }
  },
  props: { catalog: [], items: [] },
  terrain: { enabled: false, grassColor: '#4a7c3f', grassRadius: 30, trees: [] },
  activityLog: []
};

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function ensureHostedMockData(dataDir = DEFAULT_DATA_DIR) {
  await writeJson(path.join(dataDir, 'config.json'), mockConfig);
  await writeJson(path.join(dataDir, 'profiles.json'), mockProfiles);
  await writeJson(path.join(dataDir, 'projects', 'home', 'project.json'), mockProject);
  return dataDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dataDir = process.env.BJORQ_DATA_DIR || DEFAULT_DATA_DIR;
  ensureHostedMockData(dataDir)
    .then((finalDir) => {
      console.log(`[HostedMock] Seeded data in ${finalDir}`);
    })
    .catch((err) => {
      console.error('[HostedMock] Failed to seed mock data:', err);
      process.exitCode = 1;
    });
}
