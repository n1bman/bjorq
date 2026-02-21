import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './types';

const generateId = () => Math.random().toString(36).slice(2, 10);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      appMode: 'dashboard',
      setAppMode: (mode) => set({ appMode: mode }),

      layout: {
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
      },

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
                ? s.layout.floors[0]?.id ?? null
                : s.layout.activeFloorId,
          },
        })),

      setActiveFloor: (id) =>
        set((s) => ({
          layout: { ...s.layout, activeFloorId: id },
        })),

      // Environment actions
      setTimeMode: (mode) =>
        set((s) => ({
          environment: { ...s.environment, timeMode: mode },
        })),

      setPreviewDateTime: (dt) =>
        set((s) => ({
          environment: { ...s.environment, previewDateTime: dt },
        })),
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
