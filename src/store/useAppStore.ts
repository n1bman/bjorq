import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, BuildState, LayoutState, WallSegment, Room } from './types';

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
      appMode: 'dashboard',
      setAppMode: (mode) => set({ appMode: mode }),

      layout: initialLayout,
      build: initialBuild,
      devices: { markers: [] },
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
        weather: { condition: 'clear', temperature: 18 },
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
    }),
    {
      name: 'hometwin-store',
      version: 2,
      migrate: () => {
        // V2: Complete state shape change — discard old data
        return undefined as any;
      },
      partialize: (state) => ({
        appMode: state.appMode,
        layout: state.layout,
        homeGeometry: state.homeGeometry,
        devices: state.devices,
        props: state.props,
        environment: state.environment,
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
