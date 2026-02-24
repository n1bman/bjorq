import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, BuildState, LayoutState, WallSegment, Room, DeviceState, DeviceKind, ActivityEvent } from './types';

export function getDefaultState(kind: DeviceKind): DeviceState {
  switch (kind) {
    case 'light':
      return { kind: 'light', data: { on: true, brightness: 200, colorTemp: 300, colorMode: 'temp' } };
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      appMode: 'home',
      setAppMode: (mode) => set({ appMode: mode }),

      homeView: {
        cameraPreset: 'angle',
        visibleWidgets: { clock: true, weather: true, temperature: true, energy: true },
      },
      setCameraPreset: (preset) => set((s) => ({ homeView: { ...s.homeView, cameraPreset: preset } })),
      toggleHomeWidget: (widget) => set((s) => ({
        homeView: {
          ...s.homeView,
          visibleWidgets: { ...s.homeView.visibleWidgets, [widget]: !s.homeView.visibleWidgets[widget] },
        },
      })),

      // Device actions
      addDevice: (marker) => set((s) => ({
        devices: {
          ...s.devices,
          markers: [...s.devices.markers, marker],
          deviceStates: { ...s.devices.deviceStates, [marker.id]: getDefaultState(marker.kind) },
        },
      })),
      removeDevice: (id) => set((s) => {
        const { [id]: _, ...rest } = s.devices.deviceStates;
        return { devices: { markers: s.devices.markers.filter((m) => m.id !== id), deviceStates: rest } };
      }),
      updateDevice: (id, changes) => set((s) => ({
        devices: { ...s.devices, markers: s.devices.markers.map((m) => m.id === id ? { ...m, ...changes } : m) },
      })),
      toggleDeviceState: (id) => set((s) => {
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
      setDeviceState: (id, state) => set((s) => ({
        devices: { ...s.devices, deviceStates: { ...s.devices.deviceStates, [id]: state } },
      })),
      updateDeviceState: (id, partialData) => set((s) => {
        const current = s.devices.deviceStates[id];
        if (!current) return s;
        const marker = s.devices.markers.find((m) => m.id === id);
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
      profile: { name: '', theme: 'dark', accentColor: '#f59e0b', dashboardBg: 'scene3d' },
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
        source: 'manual',
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
      },

      // Layout actions
      addFloor: (name) =>
        set((s) => ({
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
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.filter((f) => f.id !== id),
            activeFloorId:
              s.layout.activeFloorId === id
                ? (s.layout.floors.find((f) => f.id !== id)?.id ?? null)
                : s.layout.activeFloorId,
          },
        })),

      renameFloor: (id, name) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) => (f.id === id ? { ...f, name } : f)),
          },
        })),

      setActiveFloor: (id) =>
        set((s) => ({ layout: { ...s.layout, activeFloorId: id } })),

      setFloorplanImage: (floorId, image) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, floorplanImage: image } : f
            ),
          },
        })),

      setPixelsPerMeter: (floorId, ppm) =>
        set((s) => ({
          layout: {
            ...s.layout,
            scaleCalibrated: true,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, pixelsPerMeter: ppm } : f
            ),
          },
        })),

      setGridSize: (floorId, size) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, gridSize: size } : f
            ),
          },
        })),

      // Wall actions
      addWall: (floorId, wall) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, walls: [...f.walls, wall] } : f
            ),
          },
        })),

      updateWallNode: (floorId, wallId, endpoint, pos) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? {
                    ...f,
                    walls: f.walls.map((w) =>
                      w.id === wallId ? { ...w, [endpoint]: pos } : w
                    ),
                  }
                : f
            ),
          },
        })),

      deleteWall: (floorId, wallId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? { ...f, walls: f.walls.filter((w) => w.id !== wallId) }
                : f
            ),
          },
        })),

      splitWall: (floorId, wallId, point) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) => {
              if (f.id !== floorId) return f;
              const wall = f.walls.find((w) => w.id === wallId);
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
                walls: [...f.walls.filter((w) => w.id !== wallId), wall1, wall2],
              };
            }),
          },
        })),

      // Opening actions
      addOpening: (floorId, wallId, opening) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? {
                    ...f,
                    walls: f.walls.map((w) =>
                      w.id === wallId ? { ...w, openings: [...w.openings, opening] } : w
                    ),
                  }
                : f
            ),
          },
        })),

      removeOpening: (floorId, wallId, openingId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? {
                    ...f,
                    walls: f.walls.map((w) =>
                      w.id === wallId
                        ? { ...w, openings: w.openings.filter((o) => o.id !== openingId) }
                        : w
                    ),
                  }
                : f
            ),
          },
        })),

      // Room actions
      setRooms: (floorId, rooms) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, rooms } : f
            ),
          },
        })),

      removeRoom: (floorId, roomId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) } : f
            ),
          },
        })),

      renameRoom: (floorId, roomId, name) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? { ...f, rooms: f.rooms.map((r) => (r.id === roomId ? { ...r, name } : r)) }
                : f
            ),
          },
        })),

      setRoomMaterial: (floorId, roomId, target, materialId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? {
                    ...f,
                    rooms: f.rooms.map((r) =>
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
        const floor = s.layout.floors.find((f) => f.id === floorId);
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

        set((s2) => ({
          layout: {
            ...s2.layout,
            floors: s2.layout.floors.map((f) =>
              f.id === floorId
                ? { ...f, walls: [...f.walls, ...newWalls], rooms: [...f.rooms, room] }
                : f
            ),
          },
        }));
      },

      // Stair actions
      addStair: (floorId, stair) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, stairs: [...f.stairs, stair] } : f
            ),
          },
        })),

      removeStair: (floorId, stairId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, stairs: f.stairs.filter((st) => st.id !== stairId) } : f
            ),
          },
        })),

      // Props actions
      addToCatalog: (item) =>
        set((s) => ({ props: { ...s.props, catalog: [...s.props.catalog, item] } })),

      removeFromCatalog: (id) =>
        set((s) => ({
          props: {
            ...s.props,
            catalog: s.props.catalog.filter((c) => c.id !== id),
            items: s.props.items.filter((p) => p.catalogId !== id),
          },
        })),

      addProp: (prop) =>
        set((s) => ({ props: { ...s.props, items: [...s.props.items, prop] } })),

      removeProp: (id) =>
        set((s) => ({ props: { ...s.props, items: s.props.items.filter((p) => p.id !== id) } })),

      updateProp: (id, changes) =>
        set((s) => ({
          props: { ...s.props, items: s.props.items.map((p) => (p.id === id ? { ...p, ...changes } : p)) },
        })),

      // Build actions
      setBuildTab: (tab) =>
        set((s) => ({
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
        set((s) => ({
          build: {
            ...s.build,
            activeTool: tool,
            wallDrawing: { isDrawing: false, nodes: [] },
            roomDrawing: { isDrawing: false, startPoint: null, endPoint: null },
            selection: { type: null, id: null },
          },
        })),

      setGrid: (grid) =>
        set((s) => ({ build: { ...s.build, grid: { ...s.build.grid, ...grid } } })),

      toggleGrid: () =>
        set((s) => ({ build: { ...s.build, grid: { ...s.build.grid, enabled: !s.build.grid.enabled } } })),

      setSelection: (sel) =>
        set((s) => ({ build: { ...s.build, selection: sel } })),

      setCameraMode: (mode) =>
        set((s) => ({ build: { ...s.build, view: { ...s.build.view, cameraMode: mode } } })),

      setView: (view) =>
        set((s) => ({ build: { ...s.build, view: { ...s.build.view, ...view } } })),

      setWallDrawing: (drawing) =>
        set((s) => ({
          build: { ...s.build, wallDrawing: { ...s.build.wallDrawing, ...drawing } },
        })),

      setRoomDrawing: (drawing) =>
        set((s) => ({
          build: { ...s.build, roomDrawing: { ...s.build.roomDrawing, ...drawing } },
        })),

      setCalibration: (cal) =>
        set((s) => ({
          build: { ...s.build, calibration: { ...s.build.calibration, ...cal } },
        })),

      pushUndo: () =>
        set((s) => ({
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
        set((s) => ({ homeGeometry: { ...s.homeGeometry, source } })),

      setImportedModel: (settings) =>
        set((s) => ({
          homeGeometry: {
            ...s.homeGeometry,
            imported: { ...s.homeGeometry.imported, ...settings },
          },
        })),

      addFloorBand: (band) =>
        set((s) => ({
          homeGeometry: {
            ...s.homeGeometry,
            imported: {
              ...s.homeGeometry.imported,
              floorBands: [...s.homeGeometry.imported.floorBands, band],
            },
          },
        })),

      removeFloorBand: (id) =>
        set((s) => ({
          homeGeometry: {
            ...s.homeGeometry,
            imported: {
              ...s.homeGeometry.imported,
              floorBands: s.homeGeometry.imported.floorBands.filter((b) => b.id !== id),
            },
          },
        })),

      updateFloorBand: (id, changes) =>
        set((s) => ({
          homeGeometry: {
            ...s.homeGeometry,
            imported: {
              ...s.homeGeometry.imported,
              floorBands: s.homeGeometry.imported.floorBands.map((b) =>
                b.id === id ? { ...b, ...changes } : b
              ),
            },
          },
        })),

      setNorthAngle: (angle) =>
        set((s) => ({
          homeGeometry: {
            ...s.homeGeometry,
            imported: { ...s.homeGeometry.imported, northAngle: angle },
          },
        })),

      // Environment actions
      setTimeMode: (mode) =>
        set((s) => ({ environment: { ...s.environment, timeMode: mode } })),

      setPreviewDateTime: (dt) =>
        set((s) => ({ environment: { ...s.environment, previewDateTime: dt } })),

      setSunPosition: (azimuth, elevation) =>
        set((s) => ({ environment: { ...s.environment, sunAzimuth: azimuth, sunElevation: elevation } })),

      setWeather: (condition) =>
        set((s) => ({ environment: { ...s.environment, weather: { ...s.environment.weather, condition } } })),

      setWeatherData: (data) =>
        set((s) => ({ environment: { ...s.environment, weather: { ...s.environment.weather, ...data } } })),

      setWeatherSource: (source) =>
        set((s) => ({ environment: { ...s.environment, source } })),

      setLocation: (lat, lon) =>
        set((s) => ({ environment: { ...s.environment, location: { ...s.environment.location, lat, lon } } })),

      // Opening update
      updateOpening: (floorId, wallId, openingId, changes) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? {
                    ...f,
                    walls: f.walls.map((w) =>
                      w.id === wallId
                        ? { ...w, openings: w.openings.map((o) => (o.id === openingId ? { ...o, ...changes } : o)) }
                        : w
                    ),
                  }
                : f
            ),
          },
        })),

      // Stair update
      updateStair: (floorId, stairId, changes) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? { ...f, stairs: f.stairs.map((st) => (st.id === stairId ? { ...st, ...changes } : st)) }
                : f
            ),
          },
        })),

      // Clear actions
      clearFloor: (floorId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId ? { ...f, walls: [], rooms: [], stairs: [] } : f
            ),
          },
        })),

      clearAllFloors: () =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) => ({ ...f, walls: [], rooms: [], stairs: [] })),
          },
          props: { ...s.props, items: [] },
        })),

      // Opening offset update
      updateOpeningOffset: (floorId, wallId, openingId, offset) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) =>
              f.id === floorId
                ? {
                    ...f,
                    walls: f.walls.map((w) =>
                      w.id === wallId
                        ? { ...w, openings: w.openings.map((o) => (o.id === openingId ? { ...o, offset } : o)) }
                        : w
                    ),
                  }
                : f
            ),
          },
        })),

      // Room polygon recalculation from current wall positions
      updateRoomPolygons: (floorId) =>
        set((s) => ({
          layout: {
            ...s.layout,
            floors: s.layout.floors.map((f) => {
              if (f.id !== floorId) return f;
              const updatedRooms = f.rooms.map((room) => {
                if (!room.wallIds || room.wallIds.length === 0) return room;
                // Rebuild polygon from wall endpoints
                const roomWalls = room.wallIds
                  .map((wid) => f.walls.find((w) => w.id === wid))
                  .filter(Boolean) as WallSegment[];
                if (roomWalls.length < 2) return room;

                // Chain walls: start from first wall's 'from', follow connections
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

                  // Find next wall sharing otherEnd
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

                // Remove duplicate last point if it matches first
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
      pushActivity: (event) => set((s) => ({
        activityLog: [
          { ...event, id: Math.random().toString(36).slice(2, 10), timestamp: new Date().toISOString(), read: false },
          ...s.activityLog,
        ].slice(0, 100),
      })),
      clearActivity: () => set({ activityLog: [] }),
      markActivityRead: (id) => set((s) => ({
        activityLog: s.activityLog.map((e) => e.id === id ? { ...e, read: true } : e),
      })),
      // Profile actions
      setProfile: (changes) => set((s) => ({
        profile: { ...s.profile, ...changes },
      })),
    }),
    {
      name: 'hometwin-store',
      version: 14,
      migrate: (persisted: any) => {
        // V13: Migrate boolean deviceStates to rich DeviceState objects
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
          // Also ensure all markers have a state
          for (const m of markers) {
            if (!newStates[m.id]) {
              newStates[m.id] = getDefaultState(m.kind);
            }
          }
        }
        return persisted as any;
      },
      partialize: (state) => ({
        appMode: state.appMode,
        layout: state.layout,
        homeGeometry: state.homeGeometry,
        homeView: state.homeView,
        devices: state.devices,
        props: state.props,
        environment: state.environment,
        activityLog: state.activityLog,
        profile: state.profile,
        homeAssistant: {
          wsUrl: state.homeAssistant.wsUrl,
          token: state.homeAssistant.token,
          status: 'disconnected' as const,
          entities: [],
          liveStates: {},
        },
      }),
    }
  )
);
