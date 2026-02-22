// ─── Materials ───
export interface Material {
  id: string;
  name: string;
  type: 'paint' | 'concrete' | 'wood' | 'tile' | 'metal';
  color: string; // hex
  roughness: number;
}

// ─── Layout Layer ───
export interface WallOpening {
  id: string;
  type: 'door' | 'window';
  offset: number;
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
  polygon?: [number, number][]; // cached polygon for rendering
}

export interface Floor {
  id: string;
  name: string;
  elevation: number;
  gridSize: number;
  walls: WallSegment[];
  rooms: Room[];
  floorplanImage?: string;
  pixelsPerMeter?: number;
}

export interface LayoutState {
  floors: Floor[];
  activeFloorId: string | null;
  scaleCalibrated: boolean;
}

// ─── Build Mode State ───
export type BuildTool = 'select' | 'wall' | 'calibrate' | 'pan' | 'opening';

export interface BuildState {
  activeTool: BuildTool;
  openingType: 'door' | 'window';
  wallDrawing: {
    isDrawing: boolean;
    nodes: [number, number][];
  };
  calibration: {
    isCalibrating: boolean;
    point1: [number, number] | null;
    point2: [number, number] | null;
    realMeters: number | null;
  };
  selectedWallId: string | null;
  selectedNodeIndex: number | null;
  undoStack: LayoutState[];
  redoStack: LayoutState[];
  canvasOffset: [number, number];
  canvasZoom: number;
  show3DPreview: boolean;
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
  url: string;
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
  previewDateTime: string;
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
  build: BuildState;
  devices: DevicesState;
  props: PropsState;
  environment: EnvironmentState;
  homeAssistant: HomeAssistantState;

  // Layout actions
  addFloor: (name: string) => void;
  removeFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;
  setActiveFloor: (id: string) => void;
  setFloorplanImage: (floorId: string, image: string) => void;
  setPixelsPerMeter: (floorId: string, ppm: number) => void;
  setGridSize: (floorId: string, size: number) => void;

  // Wall actions
  addWall: (floorId: string, wall: WallSegment) => void;
  updateWallNode: (floorId: string, wallId: string, endpoint: 'from' | 'to', pos: [number, number]) => void;
  deleteWall: (floorId: string, wallId: string) => void;

  // Opening actions
  addOpening: (floorId: string, wallId: string, opening: WallOpening) => void;
  removeOpening: (floorId: string, wallId: string, openingId: string) => void;

  // Room actions
  setRooms: (floorId: string, rooms: Room[]) => void;
  removeRoom: (floorId: string, roomId: string) => void;
  renameRoom: (floorId: string, roomId: string, name: string) => void;
  setRoomMaterial: (floorId: string, roomId: string, target: 'floor' | 'wall', materialId: string) => void;

  // Props actions
  addProp: (prop: PropItem) => void;
  removeProp: (id: string) => void;
  updateProp: (id: string, changes: Partial<PropItem>) => void;

  // Build actions
  setBuildTool: (tool: BuildTool) => void;
  setWallDrawing: (drawing: Partial<BuildState['wallDrawing']>) => void;
  setCalibration: (cal: Partial<BuildState['calibration']>) => void;
  setSelectedWall: (wallId: string | null) => void;
  setCanvasOffset: (offset: [number, number]) => void;
  setCanvasZoom: (zoom: number) => void;
  setShow3DPreview: (show: boolean) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Environment actions
  setTimeMode: (mode: 'live' | 'preview') => void;
  setPreviewDateTime: (dt: string) => void;
}
