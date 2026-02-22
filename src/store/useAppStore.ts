import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, BuildState, LayoutState } from './types';

const generateId = () => Math.random().toString(36).slice(2, 10);

const initialBuild: BuildState = {
  activeTool: 'select',
  openingType: 'door',
  wallDrawing: { isDrawing: false, nodes: [] },
  calibration: { isCalibrating: false, point1: null, point2: null, realMeters: null },
  selectedWallId: null,
  selectedNodeIndex: null,
  undoStack: [],
  redoStack: [],
  canvasOffset: [0, 0],
  canvasZoom: 1,
  show3DPreview: false,
};

const initialLayout: LayoutState = {
  floors: [
    {
      id: 'floor-1',
      name: 'Våning 1',
      elevation: 0,
      gridSize: 0.5,
      walls: [],
      rooms: [],
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
      props: { items: [] },

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
                gridSize: 0.5,
                walls: [],
                rooms: [],
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

      // Props actions
      addProp: (prop) =>
        set((s) => ({ props: { ...s.props, items: [...s.props.items, prop] } })),

      removeProp: (id) =>
        set((s) => ({ props: { ...s.props, items: s.props.items.filter((p) => p.id !== id) } })),

      updateProp: (id, changes) =>
        set((s) => ({
          props: { ...s.props, items: s.props.items.map((p) => (p.id === id ? { ...p, ...changes } : p)) },
        })),

      // Build actions
      setBuildTool: (tool) =>
        set((s) => ({
          build: {
            ...s.build,
            activeTool: tool,
            wallDrawing: { isDrawing: false, nodes: [] },
            selectedWallId: null,
          },
        })),

      setWallDrawing: (drawing) =>
        set((s) => ({
          build: { ...s.build, wallDrawing: { ...s.build.wallDrawing, ...drawing } },
        })),

      setCalibration: (cal) =>
        set((s) => ({
          build: { ...s.build, calibration: { ...s.build.calibration, ...cal } },
        })),

      setSelectedWall: (wallId) =>
        set((s) => ({ build: { ...s.build, selectedWallId: wallId } })),

      setCanvasOffset: (offset) =>
        set((s) => ({ build: { ...s.build, canvasOffset: offset } })),

      setCanvasZoom: (zoom) =>
        set((s) => ({ build: { ...s.build, canvasZoom: Math.max(0.1, Math.min(5, zoom)) } })),

      setShow3DPreview: (show) =>
        set((s) => ({ build: { ...s.build, show3DPreview: show } })),

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

      // Environment actions
      setTimeMode: (mode) =>
        set((s) => ({ environment: { ...s.environment, timeMode: mode } })),

      setPreviewDateTime: (dt) =>
        set((s) => ({ environment: { ...s.environment, previewDateTime: dt } })),
    }),
    {
      name: 'hometwin-store',
      partialize: (state) => ({
        appMode: state.appMode,
        layout: state.layout,
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
