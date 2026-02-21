// ─── Layout Layer ───
export interface WallOpening {
  id: string;
  type: 'door' | 'window';
  offset: number; // distance along wall segment
  width: number;
  height: number;
  materialId?: string;
}

export interface WallSegment {
  id: string;
  from: [number, number]; // [x, z] in meters
  to: [number, number];
  height: number;
  thickness: number;
  materialId?: string;
  openings: WallOpening[];
}

export interface Room {
  id: string;
  name: string;
  wallIds: string[];
  floorMaterialId?: string;
  wallMaterialId?: string;
}

export interface Floor {
  id: string;
  name: string;
  elevation: number;
  gridSize: number;
  walls: WallSegment[];
  rooms: Room[];
  floorplanImage?: string; // data URL or blob URL
  pixelsPerMeter?: number;
}

export interface LayoutState {
  floors: Floor[];
  activeFloorId: string | null;
  scaleCalibrated: boolean;
}

// ─── Devices Layer ───
export type DeviceKind = 'light' | 'switch' | 'sensor' | 'climate' | 'vacuum';
export type DeviceSurface = 'floor' | 'wall' | 'ceiling';

export interface DeviceMarker {
  id: string;
  kind: DeviceKind;
  floorId: string;
  roomId?: string;
  surface: DeviceSurface;
  position: [number, number, number];
  rotation: [number, number, number];
  ha?: { entityId: string };
}

export interface DevicesState {
  markers: DeviceMarker[];
}

// ─── Props Layer ───
export interface PropItem {
  id: string;
  floorId: string;
  url: string; // GLB/GLTF URL
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface PropsState {
  items: PropItem[];
}

// ─── Environment Layer ───
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface EnvironmentState {
  source: 'ha' | 'manual';
  location: { lat: number; lon: number; timezone: string };
  timeMode: 'live' | 'preview';
  previewDateTime: string; // ISO string
  weather: { condition: WeatherCondition; temperature: number };
}

// ─── Home Assistant Layer ───
export type HAConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HAEntity {
  entityId: string;
  domain: string;
  friendlyName: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistantState {
  status: HAConnectionStatus;
  wsUrl: string;
  token: string;
  entities: HAEntity[];
  liveStates: Record<string, { state: string; attributes: Record<string, unknown> }>;
}

// ─── App State ───
export type AppMode = 'dashboard' | 'devices' | 'build';

export interface AppState {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  layout: LayoutState;
  devices: DevicesState;
  props: PropsState;
  environment: EnvironmentState;
  homeAssistant: HomeAssistantState;

  // Layout actions
  addFloor: (name: string) => void;
  removeFloor: (id: string) => void;
  setActiveFloor: (id: string) => void;

  // Environment actions
  setTimeMode: (mode: 'live' | 'preview') => void;
  setPreviewDateTime: (dt: string) => void;
}
