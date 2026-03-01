import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, AppMode, BuildState, LayoutState, WallSegment, Room, DeviceState, DeviceKind, ActivityEvent } from './types';
import { mapHAEntityToDeviceState } from '@/lib/haMapping';
import { setFromHA } from '@/hooks/useHABridge';
import { isHostedSync, debouncedSync, debouncedProjectSync, saveProfiles, saveProject, fetchBootstrap } from '@/lib/apiClient';

export function getDefaultState(kind: DeviceKind): DeviceState {
  switch (kind) {
    case 'light':
      return { kind: 'light', data: { on: true, brightness: 200, colorTemp: 300, colorMode: 'temp' } };
    case 'camera':
      return { kind: 'camera', data: { on: true, streaming: false } };
    case 'climate':
      return { kind: 'climate', data: { on: false, mode: 'auto', targetTemp: 22, currentTemp: 20 } };
    case 'media_screen':
      return { kind: 'media_screen', data: { on: false, state: 'idle', volume: 0.5 } };
    case 'vacuum':
      return { kind: 'vacuum', data: { on: false, status: 'docked', battery: 100 } };
    case 'door-lock':
      return { kind: 'door-lock', data: { locked: true } };
    case 'sensor':
      return { kind: 'sensor', data: { value: 0, unit: '°C' } };
    case 'fan':
      return { kind: 'fan', data: { on: false, speed: 0 } };
    case 'cover':
      return { kind: 'cover', data: { position: 100, state: 'open' } };
    case 'scene':
      return { kind: 'scene', data: {} };
    default:
      return { kind: 'generic', data: { on: false } };
  }
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const initialBuild: BuildState = {
  tab: 'structure',
  activeTool: 'select',
  grid: { enabled: true, sizeMeters: 0.5, snapMode: 'strict' },
  selection: { type: null, id: null },
  view: { cameraMode: 'topdown', showOtherFloorsGhost: false, floorFilter: 'all' },
  wallDrawing: { isDrawing: false, nodes: [] },
  roomDrawing: { isDrawing: false, startPoint: null, endPoint: null },
  calibration: { isCalibrating: false, point1: null, point2: null, realMeters: null },
  importOverlaySync: { zoom: 40, offsetX: 0, offsetY: 0 },
  undoStack: [],
  redoStack: [],
};

const initialLayout: LayoutState = {
  floors: [
    {
      id: 'floor-1',
      name: 'Våning 1',
      elevation: 0,
      heightMeters: 2.5,
      gridSize: 0.5,
      walls: [],
      rooms: [],
      stairs: [],
    },
  ],
  activeFloorId: 'floor-1',
  scaleCalibrated: false,
};

// ── Hosted mode sync ──
let _activeProjectId = 'home';

function syncProfileToServer() {
  if (!isHostedSync()) return;
  const s = useAppStore.getState();
  debouncedSync(() => {
    saveProfiles({
      profile: s.profile,
      performance: s.performance,
      standby: s.standby,
      homeView: s.homeView,
      environment: s.environment,
      customCategories: s.customCategories,
    }).catch((err) => console.warn('[Sync] Failed to save profiles:', err));
  });
}

function syncProjectToServer() {
  if (!isHostedSync()) return;
  const s = useAppStore.getState();
  debouncedProjectSync(() => {
    const homeGeo = { ...s.homeGeometry };
    // Strip large fileData from sync payload
    if (homeGeo.imported?.fileData) {
      homeGeo.imported = { ...homeGeo.imported, fileData: undefined };
    }
    saveProject(_activeProjectId, {
      layout: s.layout,
      devices: s.devices,
      homeGeometry: homeGeo,
      props: s.props,
      activityLog: s.activityLog,
    }).catch((err) => console.warn('[Sync] Failed to save project:', err));
  });
}

// ── Store creator (shared between hosted and non-hosted) ──
const storeCreator = (set: any, get: any): AppState => ({
  _hostedMode: false,
  appMode: 'home',
  setAppMode: (mode) => set({ appMode: mode }),

  homeView: {
    cameraPreset: 'angle',
    visibleWidgets: { clock: true, weather: true, temperature: true, energy: true, calendar: true },
    homeScreenDevices: [],
    showDeviceMarkers: true,
  },
  setCameraPreset: (preset) => { set((s: any) => ({ homeView: { ...s.homeView, cameraPreset: preset } })); syncProfileToServer(); },
  toggleHomeWidget: (widget) => { set((s: any) => ({
    homeView: {
      ...s.homeView,
      visibleWidgets: { ...s.homeView.visibleWidgets, [widget]: !s.homeView.visibleWidgets[widget] },
    },
  })); syncProfileToServer(); },
  toggleShowDeviceMarkers: () => { set((s: any) => ({
    homeView: { ...s.homeView, showDeviceMarkers: !s.homeView.showDeviceMarkers },
  })); syncProfileToServer(); },
  saveHomeStartCamera: (pos, target) => set((s: any) => ({
    homeView: {
      ...s.homeView,
      customStartPos: pos,
      customStartTarget: target,
    },
  })),
  clearHomeStartCamera: () => set((s: any) => ({
    homeView: {
      ...s.homeView,
      customStartPos: undefined,
      customStartTarget: undefined,
    },
  })),

  // Device actions
  addDevice: (marker) => set((s: any) => ({
    devices: {
      ...s.devices,
      markers: [...s.devices.markers, marker],
      deviceStates: { ...s.devices.deviceStates, [marker.id]: getDefaultState(marker.kind) },
    },
  })),
  removeDevice: (id) => set((s: any) => {
    const { [id]: _, ...rest } = s.devices.deviceStates;
    return { devices: { markers: s.devices.markers.filter((m: any) => m.id !== id), deviceStates: rest } };
  }),
  updateDevice: (id, changes) => set((s: any) => {
    const newMarkers = s.devices.markers.map((m: any) => m.id === id ? { ...m, ...changes } : m);
    let newDeviceStates = s.devices.deviceStates;

    if (changes.ha?.entityId) {
      const entityId = changes.ha.entityId;
      const live = s.homeAssistant.liveStates[entityId];
      if (live) {
        const domain = entityId.split('.')[0];
        const mapped = mapHAEntityToDeviceState(domain, live.state, live.attributes);
        if (mapped) {
          newDeviceStates = { ...newDeviceStates, [id]: mapped };
        }
      }
    }

    return { devices: { ...s.devices, markers: newMarkers, deviceStates: newDeviceStates } };
  }),
  toggleDeviceState: (id) => set((s: any) => {
    const current = s.devices.deviceStates[id];
    if (!current) return s;
    if ('on' in current.data) {
      return {
        devices: {
          ...s.devices,
          deviceStates: { ...s.devices.deviceStates, [id]: { ...current, data: { ...current.data, on: !(current.data as any).on } } as DeviceState },
        },
      };
    }
    if (current.kind === 'door-lock') {
      return {
        devices: {
          ...s.devices,
          deviceStates: { ...s.devices.deviceStates, [id]: { kind: 'door-lock', data: { locked: !current.data.locked } } },
        },
      };
    }
    return s;
  }),
  setDeviceState: (id, state) => set((s: any) => ({
    devices: { ...s.devices, deviceStates: { ...s.devices.deviceStates, [id]: state } },
  })),
  updateDeviceState: (id, partialData) => set((s: any) => {
    const current = s.devices.deviceStates[id];
    if (!current) return s;
    const marker = s.devices.markers.find((m: any) => m.id === id);
    const newEvent: ActivityEvent = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      deviceId: id,
      kind: 'state_change',
      title: `${marker?.name || 'Enhet'} ändrades`,
      detail: Object.entries(partialData).map(([k, v]) => `${k}: ${v}`).join(', '),
      severity: 'info',
      read: false,
    };
    return {
      devices: {
        ...s.devices,
        deviceStates: { ...s.devices.deviceStates, [id]: { ...current, data: { ...current.data, ...partialData } } as DeviceState },
      },
      activityLog: [newEvent, ...s.activityLog].slice(0, 100),
    };
  }),

  layout: initialLayout,
  build: initialBuild,
  devices: { markers: [], deviceStates: {} },
  activityLog: [],
  customCategories: [],
  standby: { enabled: false, idleMinutes: 2, cameraView: 'standard' as const },
  _preStandbyMode: 'home' as AppMode,
  profile: { name: '', theme: 'dark', accentColor: '#f59e0b', dashboardBg: 'scene3d' },
  performance: { quality: 'high', shadows: true, postprocessing: false, tabletMode: false },
  setPerformance: (changes) => { set((s: any) => ({ performance: { ...s.performance, ...changes } })); syncProfileToServer(); },

  // Standby actions
  setStandbySettings: (settings) => { set((s: any) => ({ standby: { ...s.standby, ...settings } })); syncProfileToServer(); },
  enterStandby: () => set((s: any) => ({
    _preStandbyMode: s.appMode === 'standby' ? s._preStandbyMode : s.appMode,
    appMode: 'standby' as AppMode,
  })),
  exitStandby: () => set((s: any) => ({
    appMode: s._preStandbyMode || 'home',
  })),
  props: { catalog: [], items: [] },

  homeGeometry: {
    source: 'procedural',
    imported: {
      url: null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      groundLevelY: 0,
      northAngle: 0,
      floorBands: [],
    },
  },

  environment: {
    source: 'auto',
    location: { lat: 59.33, lon: 18.07, timezone: 'Europe/Stockholm' },
    timeMode: 'live',
    previewDateTime: new Date().toISOString(),
    weather: { condition: 'clear', temperature: 18, intensity: 0 },
    sunAzimuth: 135,
    sunElevation: 45,
  },

  homeAssistant: {
    status: 'disconnected',
    wsUrl: '',
    token: '',
    entities: [],
    liveStates: {},
    vacuumSegmentMap: {},
  },

  // Layout actions
  addFloor: (name) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: [
          ...s.layout.floors,
          {
            id: generateId(),
            name,
            elevation: s.layout.floors.length * 3,
            heightMeters: 2.5,
            gridSize: 0.5,
            walls: [],
            rooms: [],
            stairs: [],
          },
        ],
      },
    })),

  removeFloor: (id) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.filter((f: any) => f.id !== id),
        activeFloorId:
          s.layout.activeFloorId === id
            ? (s.layout.floors.find((f: any) => f.id !== id)?.id ?? null)
            : s.layout.activeFloorId,
      },
    })),

  renameFloor: (id, name) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) => (f.id === id ? { ...f, name } : f)),
      },
    })),

  setActiveFloor: (id) =>
    set((s: any) => ({ layout: { ...s.layout, activeFloorId: id } })),

  setFloorplanImage: (floorId, image) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, floorplanImage: image } : f
        ),
      },
    })),

  setPixelsPerMeter: (floorId, ppm) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        scaleCalibrated: true,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, pixelsPerMeter: ppm } : f
        ),
      },
    })),

  setGridSize: (floorId, size) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, gridSize: size } : f
        ),
      },
    })),

  // Wall actions
  addWall: (floorId, wall) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, walls: [...f.walls, wall] } : f
        ),
      },
    })),

  updateWallNode: (floorId, wallId, endpoint, pos) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                walls: f.walls.map((w: any) =>
                  w.id === wallId ? { ...w, [endpoint]: pos } : w
                ),
              }
            : f
        ),
      },
    })),

  deleteWall: (floorId, wallId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? { ...f, walls: f.walls.filter((w: any) => w.id !== wallId) }
            : f
        ),
      },
    })),

  splitWall: (floorId, wallId, point) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) => {
          if (f.id !== floorId) return f;
          const wall = f.walls.find((w: any) => w.id === wallId);
          if (!wall) return f;
          const wall1: WallSegment = {
            ...wall,
            id: generateId(),
            to: point,
            openings: [],
          };
          const wall2: WallSegment = {
            ...wall,
            id: generateId(),
            from: point,
            openings: [],
          };
          return {
            ...f,
            walls: [...f.walls.filter((w: any) => w.id !== wallId), wall1, wall2],
          };
        }),
      },
    })),

  // Opening actions
  addOpening: (floorId, wallId, opening) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                walls: f.walls.map((w: any) =>
                  w.id === wallId ? { ...w, openings: [...w.openings, opening] } : w
                ),
              }
            : f
        ),
      },
    })),

  removeOpening: (floorId, wallId, openingId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                walls: f.walls.map((w: any) =>
                  w.id === wallId
                    ? { ...w, openings: w.openings.filter((o: any) => o.id !== openingId) }
                    : w
                ),
              }
            : f
        ),
      },
    })),

  // Room actions
  setRooms: (floorId, rooms) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, rooms } : f
        ),
      },
    })),

  removeRoom: (floorId, roomId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, rooms: f.rooms.filter((r: any) => r.id !== roomId) } : f
        ),
      },
    })),

  renameRoom: (floorId, roomId, name) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? { ...f, rooms: f.rooms.map((r: any) => (r.id === roomId ? { ...r, name } : r)) }
            : f
        ),
      },
    })),

  setRoomMaterial: (floorId, roomId, target, materialId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                rooms: f.rooms.map((r: any) =>
                  r.id === roomId
                    ? { ...r, [target === 'floor' ? 'floorMaterialId' : 'wallMaterialId']: materialId }
                    : r
                ),
              }
            : f
        ),
      },
    })),

  addRoomFromRect: (floorId, x, z, w, d, name) => {
    const s = get();
    const floor = s.layout.floors.find((f: any) => f.id === floorId);
    if (!floor) return;

    s.pushUndo();

    const corners: [number, number][] = [
      [x, z], [x + w, z], [x + w, z + d], [x, z + d],
    ];

    const wallIds: string[] = [];
    const newWalls: WallSegment[] = [];

    for (let i = 0; i < 4; i++) {
      const wall: WallSegment = {
        id: generateId(),
        from: corners[i],
        to: corners[(i + 1) % 4],
        height: floor.heightMeters,
        thickness: 0.15,
        openings: [],
      };
      wallIds.push(wall.id);
      newWalls.push(wall);
    }

    const room: Room = {
      id: generateId(),
      name,
      wallIds,
      polygon: corners,
    };

    set((s2: any) => ({
      layout: {
        ...s2.layout,
        floors: s2.layout.floors.map((f: any) =>
          f.id === floorId
            ? { ...f, walls: [...f.walls, ...newWalls], rooms: [...f.rooms, room] }
            : f
        ),
      },
    }));
  },

  // Stair actions
  addStair: (floorId, stair) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, stairs: [...f.stairs, stair] } : f
        ),
      },
    })),

  removeStair: (floorId, stairId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, stairs: f.stairs.filter((st: any) => st.id !== stairId) } : f
        ),
      },
    })),

  // Props actions
  addToCatalog: (item) =>
    set((s: any) => ({ props: { ...s.props, catalog: [...s.props.catalog, item] } })),

  removeFromCatalog: (id) =>
    set((s: any) => ({
      props: {
        ...s.props,
        catalog: s.props.catalog.filter((c: any) => c.id !== id),
        items: s.props.items.filter((p: any) => p.catalogId !== id),
      },
    })),

  addProp: (prop) =>
    set((s: any) => ({ props: { ...s.props, items: [...s.props.items, prop] } })),

  removeProp: (id) =>
    set((s: any) => ({ props: { ...s.props, items: s.props.items.filter((p: any) => p.id !== id) } })),

  updateProp: (id, changes) =>
    set((s: any) => ({
      props: { ...s.props, items: s.props.items.map((p: any) => (p.id === id ? { ...p, ...changes } : p)) },
    })),

  // Build actions
  setBuildTab: (tab) =>
    set((s: any) => ({
      build: {
        ...s.build,
        tab,
        activeTool: 'select',
        wallDrawing: { isDrawing: false, nodes: [] },
        roomDrawing: { isDrawing: false, startPoint: null, endPoint: null },
        selection: { type: null, id: null },
      },
    })),

  setBuildTool: (tool) =>
    set((s: any) => ({
      build: {
        ...s.build,
        activeTool: tool,
        wallDrawing: { isDrawing: false, nodes: [] },
        roomDrawing: { isDrawing: false, startPoint: null, endPoint: null },
        selection: { type: null, id: null },
      },
    })),

  setGrid: (grid) =>
    set((s: any) => ({ build: { ...s.build, grid: { ...s.build.grid, ...grid } } })),

  toggleGrid: () =>
    set((s: any) => ({ build: { ...s.build, grid: { ...s.build.grid, enabled: !s.build.grid.enabled } } })),

  setSelection: (sel) =>
    set((s: any) => ({ build: { ...s.build, selection: sel } })),

  setCameraMode: (mode) =>
    set((s: any) => ({ build: { ...s.build, view: { ...s.build.view, cameraMode: mode } } })),

  setView: (view) =>
    set((s: any) => ({ build: { ...s.build, view: { ...s.build.view, ...view } } })),

  setWallDrawing: (drawing) =>
    set((s: any) => ({
      build: { ...s.build, wallDrawing: { ...s.build.wallDrawing, ...drawing } },
    })),

  setRoomDrawing: (drawing) =>
    set((s: any) => ({
      build: { ...s.build, roomDrawing: { ...s.build.roomDrawing, ...drawing } },
    })),

  setCalibration: (cal) =>
    set((s: any) => ({
      build: { ...s.build, calibration: { ...s.build.calibration, ...cal } },
    })),

  setImportOverlaySync: (sync) =>
    set((s: any) => ({
      build: { ...s.build, importOverlaySync: { ...s.build.importOverlaySync, ...sync } },
    })),

  pushUndo: () =>
    set((s: any) => ({
      build: {
        ...s.build,
        undoStack: [...s.build.undoStack.slice(-19), { ...s.layout }],
        redoStack: [],
      },
    })),

  undo: () => {
    const s = get();
    if (s.build.undoStack.length === 0) return;
    const prev = s.build.undoStack[s.build.undoStack.length - 1];
    set({
      layout: prev,
      build: {
        ...s.build,
        undoStack: s.build.undoStack.slice(0, -1),
        redoStack: [...s.build.redoStack, { ...s.layout }],
      },
    });
  },

  redo: () => {
    const s = get();
    if (s.build.redoStack.length === 0) return;
    const next = s.build.redoStack[s.build.redoStack.length - 1];
    set({
      layout: next,
      build: {
        ...s.build,
        redoStack: s.build.redoStack.slice(0, -1),
        undoStack: [...s.build.undoStack, { ...s.layout }],
      },
    });
  },

  // Home Geometry actions
  setHomeGeometrySource: (source) =>
    set((s: any) => ({ homeGeometry: { ...s.homeGeometry, source } })),

  setImportedModel: (settings) =>
    set((s: any) => ({
      homeGeometry: {
        ...s.homeGeometry,
        imported: { ...s.homeGeometry.imported, ...settings },
      },
    })),

  addFloorBand: (band) =>
    set((s: any) => ({
      homeGeometry: {
        ...s.homeGeometry,
        imported: {
          ...s.homeGeometry.imported,
          floorBands: [...s.homeGeometry.imported.floorBands, band],
        },
      },
    })),

  removeFloorBand: (id) =>
    set((s: any) => ({
      homeGeometry: {
        ...s.homeGeometry,
        imported: {
          ...s.homeGeometry.imported,
          floorBands: s.homeGeometry.imported.floorBands.filter((b: any) => b.id !== id),
        },
      },
    })),

  updateFloorBand: (id, changes) =>
    set((s: any) => ({
      homeGeometry: {
        ...s.homeGeometry,
        imported: {
          ...s.homeGeometry.imported,
          floorBands: s.homeGeometry.imported.floorBands.map((b: any) =>
            b.id === id ? { ...b, ...changes } : b
          ),
        },
      },
    })),

  setNorthAngle: (angle) =>
    set((s: any) => ({
      homeGeometry: {
        ...s.homeGeometry,
        imported: { ...s.homeGeometry.imported, northAngle: angle },
      },
    })),

  // Environment actions
  setTimeMode: (mode) =>
    set((s: any) => ({ environment: { ...s.environment, timeMode: mode } })),

  setPreviewDateTime: (dt) =>
    set((s: any) => ({ environment: { ...s.environment, previewDateTime: dt } })),

  setSunPosition: (azimuth, elevation) =>
    set((s: any) => ({ environment: { ...s.environment, sunAzimuth: azimuth, sunElevation: elevation } })),

  setWeather: (condition) =>
    set((s: any) => ({ environment: { ...s.environment, weather: { ...s.environment.weather, condition } } })),

  setWeatherData: (data) =>
    set((s: any) => ({
      environment: {
        ...s.environment,
        weather: { ...s.environment.weather, condition: data.condition, temperature: data.temperature, windSpeed: data.windSpeed, humidity: data.humidity, intensity: data.intensity ?? s.environment.weather.intensity },
        ...(data.forecast ? { forecast: data.forecast } : {}),
      },
    })),

  setWeatherSource: (source) =>
    set((s: any) => ({ environment: { ...s.environment, source } })),

  setLocation: (lat, lon) =>
    set((s: any) => ({ environment: { ...s.environment, location: { ...s.environment.location, lat, lon } } })),

  // Opening update
  updateOpening: (floorId, wallId, openingId, changes) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                walls: f.walls.map((w: any) =>
                  w.id === wallId
                    ? { ...w, openings: w.openings.map((o: any) => (o.id === openingId ? { ...o, ...changes } : o)) }
                    : w
                ),
              }
            : f
        ),
      },
    })),

  // Stair update
  updateStair: (floorId, stairId, changes) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? { ...f, stairs: f.stairs.map((st: any) => (st.id === stairId ? { ...st, ...changes } : st)) }
            : f
        ),
      },
    })),

  // Clear actions
  clearFloor: (floorId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, walls: [], rooms: [], stairs: [] } : f
        ),
      },
    })),

  clearAllFloors: () =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) => ({ ...f, walls: [], rooms: [], stairs: [] })),
      },
      props: { ...s.props, items: [] },
      homeGeometry: {
        source: 'procedural' as const,
        imported: {
          url: null,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          groundLevelY: 0,
          northAngle: 0,
          floorBands: [],
        },
      },
    })),

  clearImportedModel: () =>
    set(() => ({
      homeGeometry: {
        source: 'procedural' as const,
        imported: {
          url: null,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          groundLevelY: 0,
          northAngle: 0,
          floorBands: [],
        },
      },
    })),

  // Opening offset update
  updateOpeningOffset: (floorId, wallId, openingId, offset) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                walls: f.walls.map((w: any) =>
                  w.id === wallId
                    ? { ...w, openings: w.openings.map((o: any) => (o.id === openingId ? { ...o, offset } : o)) }
                    : w
                ),
              }
            : f
        ),
      },
    })),

  // Room polygon recalculation from current wall positions
  updateRoomPolygons: (floorId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) => {
          if (f.id !== floorId) return f;
          const updatedRooms = f.rooms.map((room: any) => {
            if (!room.wallIds || room.wallIds.length === 0) return room;
            const roomWalls = room.wallIds
              .map((wid: string) => f.walls.find((w: any) => w.id === wid))
              .filter(Boolean) as WallSegment[];
            if (roomWalls.length < 2) return room;

            const polygon: [number, number][] = [];
            const used = new Set<string>();
            let current = roomWalls[0];
            let currentEnd = current.from;
            polygon.push([...currentEnd] as [number, number]);
            used.add(current.id);

            for (let iter = 0; iter < roomWalls.length; iter++) {
              const otherEnd: [number, number] =
                currentEnd === current.from ? [...current.to] as [number, number] : [...current.from] as [number, number];
              polygon.push(otherEnd);

              const next = roomWalls.find((w) => {
                if (used.has(w.id)) return false;
                const eps = 0.05;
                return (
                  (Math.abs(w.from[0] - otherEnd[0]) < eps && Math.abs(w.from[1] - otherEnd[1]) < eps) ||
                  (Math.abs(w.to[0] - otherEnd[0]) < eps && Math.abs(w.to[1] - otherEnd[1]) < eps)
                );
              });
              if (!next) break;
              used.add(next.id);
              const eps = 0.05;
              currentEnd =
                Math.abs(next.from[0] - otherEnd[0]) < eps && Math.abs(next.from[1] - otherEnd[1]) < eps
                  ? next.from
                  : next.to;
              current = next;
            }

            if (polygon.length > 1) {
              const first = polygon[0];
              const last = polygon[polygon.length - 1];
              if (Math.abs(first[0] - last[0]) < 0.05 && Math.abs(first[1] - last[1]) < 0.05) {
                polygon.pop();
              }
            }

            return { ...room, polygon };
          });
          return { ...f, rooms: updatedRooms };
        }),
      },
    })),

  // Activity log actions
  pushActivity: (event) => set((s: any) => ({
    activityLog: [
      { ...event, id: Math.random().toString(36).slice(2, 10), timestamp: new Date().toISOString(), read: false },
      ...s.activityLog,
    ].slice(0, 100),
  })),
  clearActivity: () => set({ activityLog: [] }),
  markActivityRead: (id) => set((s: any) => ({
    activityLog: s.activityLog.map((e: any) => e.id === id ? { ...e, read: true } : e),
  })),

  // Profile actions
  setProfile: (changes) => { set((s: any) => ({ profile: { ...s.profile, ...changes } })); syncProfileToServer(); },

  // Category actions
  addCategory: (name, icon) => set((s: any) => ({
    customCategories: [...s.customCategories, { id: generateId(), name, icon, deviceIds: [] }],
  })),
  removeCategory: (id) => set((s: any) => ({
    customCategories: s.customCategories.filter((c: any) => c.id !== id),
  })),
  renameCategory: (id, name) => set((s: any) => ({
    customCategories: s.customCategories.map((c: any) => c.id === id ? { ...c, name } : c),
  })),
  setCategoryIcon: (id, icon) => set((s: any) => ({
    customCategories: s.customCategories.map((c: any) => c.id === id ? { ...c, icon } : c),
  })),
  moveDeviceToCategory: (deviceId, categoryId) => set((s: any) => ({
    customCategories: s.customCategories.map((c: any) => ({
      ...c,
      deviceIds: c.id === categoryId
        ? (c.deviceIds.includes(deviceId) ? c.deviceIds : [...c.deviceIds, deviceId])
        : c.deviceIds.filter((d: string) => d !== deviceId),
    })),
  })),
  reorderDeviceInCategory: (categoryId, deviceId, newIndex) => set((s: any) => ({
    customCategories: s.customCategories.map((c: any) => {
      if (c.id !== categoryId) return c;
      const ids = c.deviceIds.filter((d: string) => d !== deviceId);
      ids.splice(newIndex, 0, deviceId);
      return { ...c, deviceIds: ids };
    }),
  })),
  toggleHomeScreenDevice: (deviceId) => set((s: any) => ({
    homeView: {
      ...s.homeView,
      homeScreenDevices: (s.homeView.homeScreenDevices ?? []).includes(deviceId)
        ? (s.homeView.homeScreenDevices ?? []).filter((d: string) => d !== deviceId)
        : [...(s.homeView.homeScreenDevices ?? []), deviceId],
    },
  })),
  reorderCategories: (fromIndex, toIndex) => set((s: any) => {
    const cats = [...s.customCategories];
    const [moved] = cats.splice(fromIndex, 1);
    cats.splice(toIndex, 0, moved);
    return { customCategories: cats };
  }),

  // Vacuum mapping actions
  setVacuumMapping: (floorId, mapping) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId ? { ...f, vacuumMapping: mapping } : f
        ),
      },
    })),

  setVacuumDock: (floorId, pos) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? { ...f, vacuumMapping: { ...(f.vacuumMapping ?? { dockPosition: null, zones: [] }), dockPosition: pos } }
            : f
        ),
      },
    })),

  addVacuumZone: (floorId, zone) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                vacuumMapping: {
                  ...(f.vacuumMapping ?? { dockPosition: null, zones: [] }),
                  zones: [...(f.vacuumMapping?.zones ?? []).filter((z: any) => z.roomId !== zone.roomId), zone],
                },
              }
            : f
        ),
      },
    })),

  removeVacuumZone: (floorId, roomId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                vacuumMapping: {
                  ...(f.vacuumMapping ?? { dockPosition: null, zones: [] }),
                  zones: (f.vacuumMapping?.zones ?? []).filter((z: any) => z.roomId !== roomId),
                },
              }
            : f
        ),
      },
    })),

  renameVacuumZone: (floorId, oldRoomId, newRoomId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                vacuumMapping: {
                  ...(f.vacuumMapping ?? { dockPosition: null, zones: [] }),
                  zones: (f.vacuumMapping?.zones ?? []).map((z: any) =>
                    z.roomId === oldRoomId ? { ...z, roomId: newRoomId } : z
                  ),
                },
              }
            : f
        ),
      },
    })),

  updateVacuumZoneSegmentId: (floorId, roomId, segmentId) =>
    set((s: any) => ({
      layout: {
        ...s.layout,
        floors: s.layout.floors.map((f: any) =>
          f.id === floorId
            ? {
                ...f,
                vacuumMapping: {
                  ...(f.vacuumMapping ?? { dockPosition: null, zones: [] }),
                  zones: (f.vacuumMapping?.zones ?? []).map((z: any) =>
                    z.roomId === roomId ? { ...z, segmentId } : z
                  ),
                },
              }
            : f
        ),
      },
    })),

  setHAEntities: (entities) => set((s: any) => ({
    homeAssistant: { ...s.homeAssistant, entities },
  })),

  updateHALiveState: (entityId, state, attributes) => {
    setFromHA(true);
    set((s: any) => {
      const domain = entityId.split('.')[0];
      const newLiveStates = { ...s.homeAssistant.liveStates, [entityId]: { state, attributes } };

      const marker = s.devices.markers.find((m: any) => m.ha?.entityId === entityId);
      let newDeviceStates = s.devices.deviceStates;
      if (marker) {
        const mapped = mapHAEntityToDeviceState(domain, state, attributes);
        if (mapped) {
          const existing = newDeviceStates[marker.id];
          if (existing && JSON.stringify(existing.data) === JSON.stringify(mapped.data)) {
            // No change
          } else {
            newDeviceStates = { ...newDeviceStates, [marker.id]: mapped };
          }
        }
      }

      return {
        homeAssistant: { ...s.homeAssistant, liveStates: newLiveStates },
        devices: { ...s.devices, deviceStates: newDeviceStates },
      };
    });
    queueMicrotask(() => setFromHA(false));
  },

  setHAStatus: (status) => set((s: any) => ({
    homeAssistant: { ...s.homeAssistant, status },
  })),

  setHAConnection: (wsUrl, token) => set((s: any) => ({
    homeAssistant: { ...s.homeAssistant, wsUrl, token },
  })),

  setVacuumSegmentMap: (map) => set((s: any) => ({
    homeAssistant: { ...s.homeAssistant, vacuumSegmentMap: map },
  })),
});

export const useAppStore = create<AppState>()(
  persist(
    storeCreator,
    {
      name: 'hometwin-store',
      version: 15,
      migrate: (persisted: any) => {
        if (persisted && persisted.devices?.deviceStates) {
          const oldStates = persisted.devices.deviceStates;
          const newStates: Record<string, DeviceState> = {};
          const markers = persisted.devices?.markers ?? [];
          for (const [id, val] of Object.entries(oldStates)) {
            if (typeof val === 'boolean') {
              const marker = markers.find((m: any) => m.id === id);
              const kind = marker?.kind ?? 'switch';
              const def = getDefaultState(kind);
              if ('on' in def.data) (def.data as any).on = val;
              newStates[id] = def;
            } else {
              newStates[id] = val as DeviceState;
            }
          }
          persisted.devices.deviceStates = newStates;
          for (const m of markers) {
            if (!newStates[m.id]) {
              newStates[m.id] = getDefaultState(m.kind);
            }
          }
        }
        return persisted as any;
      },
      partialize: (state) => {
        // In hosted mode, skip localStorage persistence entirely
        if (isHostedSync()) return {} as any;
        
        const homeGeometry = { ...state.homeGeometry };
        if (homeGeometry.imported?.fileData) {
          const sizeBytes = homeGeometry.imported.fileData.length * 0.75;
          if (sizeBytes > 4 * 1024 * 1024) {
            homeGeometry.imported = { ...homeGeometry.imported, fileData: undefined };
          }
        }
        return {
          appMode: state.appMode === 'standby' ? state._preStandbyMode : state.appMode,
          layout: state.layout,
          homeGeometry,
          homeView: state.homeView,
          devices: state.devices,
          props: state.props,
          environment: state.environment,
          activityLog: state.activityLog,
          profile: state.profile,
          customCategories: state.customCategories,
          standby: state.standby,
          homeAssistant: {
            wsUrl: state.homeAssistant.wsUrl,
            token: state.homeAssistant.token,
            status: 'disconnected' as const,
            entities: [],
            liveStates: {},
            vacuumSegmentMap: {},
          },
        };
      },
    }
  )
);

// ── Hosted mode initializer ──
// Called once on app boot to load state from server
export async function initHostedMode() {
  const { isHosted } = await import('@/lib/apiClient');
  const hosted = await isHosted();
  if (!hosted) return false;

  try {
    const { config, profiles, projects, activeProjectId } = await fetchBootstrap();
    _activeProjectId = activeProjectId;

    // Find the active project
    const project = projects.find((p: any) => p.id === activeProjectId) || projects[0];

    const stateUpdate: Record<string, unknown> = {
      _hostedMode: true,
    };

    // Apply profiles
    if (profiles) {
      const p = profiles as any;
      if (p.profile) stateUpdate.profile = p.profile;
      if (p.performance) stateUpdate.performance = p.performance;
      if (p.standby) stateUpdate.standby = p.standby;
      if (p.homeView) stateUpdate.homeView = { ...useAppStore.getState().homeView, ...p.homeView };
      if (p.environment) stateUpdate.environment = { ...useAppStore.getState().environment, ...p.environment };
      if (p.customCategories) stateUpdate.customCategories = p.customCategories;
    }

    // Apply project data
    if (project) {
      if (project.layout) stateUpdate.layout = project.layout;
      if (project.devices) stateUpdate.devices = project.devices;
      if (project.homeGeometry) stateUpdate.homeGeometry = project.homeGeometry;
      if (project.props) stateUpdate.props = project.props;
      if (project.activityLog) stateUpdate.activityLog = project.activityLog;
    }

    // Apply config (HA baseUrl for display, token is masked)
    const cfg = config as any;
    if (cfg?.ha?.baseUrl) {
      stateUpdate.homeAssistant = {
        ...useAppStore.getState().homeAssistant,
        wsUrl: cfg.ha.baseUrl,
        // Token stays empty — all HA calls go through /api/ha/* proxy
      };
    }

    useAppStore.setState(stateUpdate as any);
    console.log('[Hosted] Loaded bootstrap data (config + profiles + project:', _activeProjectId, ')');
    return true;
  } catch (err) {
    console.warn('[Hosted] Failed to load from server:', err);
    return false;
  }
}

// ── Auto-sync project data to server on changes ──
// Subscribe to layout/devices/homeGeometry/props changes
let _initDone = false;
useAppStore.subscribe((state, prev) => {
  if (!_initDone) return; // Skip initial hydration
  if (!isHostedSync()) return;
  if (
    state.layout !== prev.layout ||
    state.devices !== prev.devices ||
    state.homeGeometry !== prev.homeGeometry ||
    state.props !== prev.props
  ) {
    syncProjectToServer();
  }
});
// Mark init done after first bootstrap
setTimeout(() => { _initDone = true; }, 3000);
