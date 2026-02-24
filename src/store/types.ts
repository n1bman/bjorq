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
  offset: number; // 0-1 along wall
  width: number;
  height: number;
  sillHeight: number; // meters from floor (for windows)
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

export interface StairItem {
  id: string;
  floorId: string;
  position: [number, number];
  rotation: number;
  width: number;
  length: number;
  fromFloorId: string;
  toFloorId: string;
}

export interface Floor {
  id: string;
  name: string;
  elevation: number;
  heightMeters: number; // default wall height for this floor
  gridSize: number;
  walls: WallSegment[];
  rooms: Room[];
  stairs: StairItem[];
  floorplanImage?: string;
  pixelsPerMeter?: number;
}

export interface LayoutState {
  floors: Floor[];
  activeFloorId: string | null;
  scaleCalibrated: boolean;
}

// ─── Build Mode State ───
export type BuildTool =
  | 'select'
  | 'wall'
  | 'room'
  | 'door'
  | 'window'
  | 'stairs'
  | 'paint'
  | 'template'
  | 'erase'
  | 'copy'
  | 'measure'
  | 'calibrate'
  | 'place-light'
  | 'place-switch'
  | 'place-sensor'
  | 'place-climate'
  | 'place-vacuum'
  | 'place-camera'
  | 'place-fridge'
  | 'place-oven'
  | 'place-washer'
  | 'place-garage-door'
  | 'place-door-lock'
  | 'place-power-outlet'
  | 'place-media-screen'
  | 'place-fan'
  | 'place-cover'
  | 'place-scene';

export type BuildTab = 'structure' | 'import' | 'furnish' | 'devices';
export type SnapMode = 'strict' | 'soft' | 'off';
export type CameraMode = 'topdown' | '3d' | 'floor-isolate';

export interface BuildSelection {
  type: 'wall' | 'opening' | 'room' | 'prop' | 'stair' | 'device' | null;
  id: string | null;
}

export interface BuildGrid {
  enabled: boolean;
  sizeMeters: number;
  snapMode: SnapMode;
}

export interface BuildView {
  cameraMode: CameraMode;
  showOtherFloorsGhost: boolean;
  floorFilter: string | 'all';
}

export interface BuildState {
  tab: BuildTab;
  activeTool: BuildTool;
  grid: BuildGrid;
  selection: BuildSelection;
  view: BuildView;
  wallDrawing: {
    isDrawing: boolean;
    nodes: [number, number][];
  };
  roomDrawing: {
    isDrawing: boolean;
    startPoint: [number, number] | null;
    endPoint: [number, number] | null;
  };
  calibration: {
    isCalibrating: boolean;
    point1: [number, number] | null;
    point2: [number, number] | null;
    realMeters: number | null;
  };
  undoStack: LayoutState[];
  redoStack: LayoutState[];
}

// ─── Home Geometry Layer ───
export interface FloorBand {
  id: string;
  name: string;
  minY: number;
  maxY: number;
}

export interface ImportedHomeSettings {
  url: string | null;
  fileData?: string; // base64-encoded GLB/GLTF for persistence
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  groundLevelY: number;
  northAngle: number;
  floorBands: FloorBand[];
}

export interface HomeGeometryState {
  source: 'procedural' | 'imported';
  imported: ImportedHomeSettings;
}

// ─── Devices Layer ───
export type DeviceKind = 'light' | 'switch' | 'sensor' | 'climate' | 'vacuum' | 'camera' | 'fridge' | 'oven' | 'washer' | 'garage-door' | 'door-lock' | 'power-outlet' | 'media_screen' | 'fan' | 'cover' | 'scene';
export type DeviceSurface = 'floor' | 'wall' | 'ceiling' | 'free';

export interface ScreenConfig {
  aspectRatio: number;
  uiStyle: 'minimal' | 'poster';
  showProgress: boolean;
}

export interface WidgetConfig {
  showImage?: boolean;
  showToggle?: boolean;
  showValue?: boolean;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  customLabel?: string;
}

export interface EnergyTracking {
  enabled: boolean;
  currentWatts?: number;
  dailyKwh?: number;
  weeklyKwh?: number;
  monthlyKwh?: number;
}

export interface DeviceMarker {
  id: string;
  kind: DeviceKind;
  name: string;
  floorId: string;
  roomId?: string;
  surface: DeviceSurface;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
  ha?: { entityId: string };
  screenConfig?: ScreenConfig;
  userCategory?: string;
  notifyOnHomeScreen?: boolean;
  widgetConfig?: WidgetConfig;
  energyTracking?: EnergyTracking;
}

// ─── Rich Device States (HA-ready) ───
export interface LightState {
  on: boolean;
  brightness: number;       // 0-255
  colorTemp?: number;       // mireds (153=cool, 500=warm)
  rgbColor?: [number, number, number];
  colorMode: 'temp' | 'rgb' | 'off';
}

export interface ClimateState {
  on: boolean;
  mode: 'heat' | 'cool' | 'auto' | 'off';
  targetTemp: number;
  currentTemp: number;
}

export interface MediaState {
  on: boolean;
  state: 'playing' | 'paused' | 'idle' | 'off';
  title?: string;
  artist?: string;
  source?: string;
  volume: number;           // 0-1
  progress?: number;        // 0-1
  _action?: 'next' | 'previous' | 'stop';
}

export interface VacuumState {
  on: boolean;
  status: 'cleaning' | 'docked' | 'returning' | 'paused' | 'idle' | 'error';
  battery: number;          // 0-100
  fanSpeed?: number;        // 0-100%
  fanSpeedList?: string[];  // e.g. ['Silent','Standard','Medium','Turbo','Max']
  cleaningArea?: number;    // m²
  cleaningTime?: number;    // minutes
  position?: [number, number]; // [x, z] in meters
  dockPosition?: [number, number];
  errorMessage?: string;
  _action?: 'locate' | 'spot_clean';
}

export interface LockState {
  locked: boolean;
}

export interface SensorState {
  value: number;
  unit: string;
  sensorType?: 'temperature' | 'motion' | 'contact' | 'generic';
  lastMotion?: string; // ISO timestamp
}

export interface FanState {
  on: boolean;
  speed: number; // 0-100 percentage
  preset?: 'low' | 'medium' | 'high';
}

export interface CoverState {
  position: number; // 0=closed, 100=open
  state: 'open' | 'closed' | 'opening' | 'closing' | 'stopped';
}

export interface SceneState {
  lastTriggered?: string; // ISO timestamp
}

export interface GenericDeviceState {
  on: boolean;
}

export interface CameraState {
  on: boolean;
  streaming: boolean;
  lastSnapshot?: string;
}

export type DeviceState =
  | { kind: 'light'; data: LightState }
  | { kind: 'climate'; data: ClimateState }
  | { kind: 'media_screen'; data: MediaState }
  | { kind: 'vacuum'; data: VacuumState }
  | { kind: 'door-lock'; data: LockState }
  | { kind: 'sensor'; data: SensorState }
  | { kind: 'camera'; data: CameraState }
  | { kind: 'fan'; data: FanState }
  | { kind: 'cover'; data: CoverState }
  | { kind: 'scene'; data: SceneState }
  | { kind: 'generic'; data: GenericDeviceState };

export interface DevicesState {
  markers: DeviceMarker[];
  deviceStates: Record<string, DeviceState>;
}

// ─── Props Layer ───
export interface PropCatalogItem {
  id: string;
  name: string;
  url: string;
  source: 'builtin' | 'user';
  thumbnail?: string;
}

export interface PropItem {
  id: string;
  catalogId: string;
  floorId: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface PropsState {
  catalog: PropCatalogItem[];
  items: PropItem[];
}

// ─── Environment Layer ───
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface ForecastDay {
  day: string;
  condition: WeatherCondition;
  maxTemp: number;
  minTemp: number;
}

export interface EnvironmentState {
  source: 'ha' | 'manual' | 'auto';
  location: { lat: number; lon: number; timezone: string };
  timeMode: 'live' | 'preview';
  previewDateTime: string;
  weather: { condition: WeatherCondition; temperature: number; windSpeed?: number; humidity?: number; intensity: number };
  forecast?: ForecastDay[];
  sunAzimuth: number;
  sunElevation: number;
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

// ─── Room Templates ───
export type RoomTemplateCategory = 'bedroom' | 'kitchen' | 'livingroom' | 'bathroom';

export interface RoomTemplate {
  id: string;
  name: string;
  width: number;
  depth: number;
  category: RoomTemplateCategory;
}

// ─── Device Categories ───
export interface DeviceCategory {
  id: string;
  name: string;
  icon: string; // emoji
  deviceIds: string[];
  color?: string;
}

// ─── Home View ───
export type CameraPreset = 'free' | 'topdown' | 'angle' | 'front';

export interface VisibleWidgets {
  clock: boolean;
  weather: boolean;
  temperature: boolean;
  energy: boolean;
  calendar: boolean;
}

export interface HomeViewState {
  cameraPreset: CameraPreset;
  visibleWidgets: VisibleWidgets;
  homeScreenDevices: string[];
  showDeviceMarkers: boolean;
}

// ─── Activity Log ───
export interface ActivityEvent {
  id: string;
  timestamp: string;
  deviceId?: string;
  kind: 'state_change' | 'alert' | 'connection' | 'notification';
  title: string;
  detail?: string;
  severity: 'info' | 'warning' | 'error';
  read: boolean;
}

// ─── User Profile ───
export interface UserProfile {
  name: string;
  theme: 'dark' | 'midnight' | 'light';
  accentColor: string;
  dashboardBg: 'scene3d' | 'gradient' | 'solid';
}

// ─── App State ───
export type AppMode = 'home' | 'dashboard' | 'build';

export interface AppState {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  layout: LayoutState;
  build: BuildState;
  homeGeometry: HomeGeometryState;
  devices: DevicesState;
  props: PropsState;
  environment: EnvironmentState;
  homeAssistant: HomeAssistantState;
  homeView: HomeViewState;
  activityLog: ActivityEvent[];
  profile: UserProfile;
  customCategories: DeviceCategory[];

  // Home View actions
  setCameraPreset: (preset: CameraPreset) => void;
  toggleHomeWidget: (widget: keyof VisibleWidgets) => void;
  toggleShowDeviceMarkers: () => void;

  // Device actions
  addDevice: (marker: DeviceMarker) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, changes: Partial<DeviceMarker>) => void;
  toggleDeviceState: (id: string) => void;
  setDeviceState: (id: string, state: DeviceState) => void;
  updateDeviceState: (id: string, partialData: Record<string, unknown>) => void;

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
  splitWall: (floorId: string, wallId: string, point: [number, number]) => void;

  // Opening actions
  addOpening: (floorId: string, wallId: string, opening: WallOpening) => void;
  removeOpening: (floorId: string, wallId: string, openingId: string) => void;

  // Room actions
  setRooms: (floorId: string, rooms: Room[]) => void;
  removeRoom: (floorId: string, roomId: string) => void;
  renameRoom: (floorId: string, roomId: string, name: string) => void;
  setRoomMaterial: (floorId: string, roomId: string, target: 'floor' | 'wall', materialId: string) => void;
  addRoomFromRect: (floorId: string, x: number, z: number, w: number, d: number, name: string) => void;

  // Stair actions
  addStair: (floorId: string, stair: StairItem) => void;
  removeStair: (floorId: string, stairId: string) => void;

  // Props actions
  addToCatalog: (item: PropCatalogItem) => void;
  removeFromCatalog: (id: string) => void;
  addProp: (prop: PropItem) => void;
  removeProp: (id: string) => void;
  updateProp: (id: string, changes: Partial<PropItem>) => void;

  // Build actions
  setBuildTab: (tab: BuildTab) => void;
  setBuildTool: (tool: BuildTool) => void;
  setGrid: (grid: Partial<BuildGrid>) => void;
  toggleGrid: () => void;
  setSelection: (sel: BuildSelection) => void;
  setCameraMode: (mode: CameraMode) => void;
  setView: (view: Partial<BuildView>) => void;
  setWallDrawing: (drawing: Partial<BuildState['wallDrawing']>) => void;
  setRoomDrawing: (drawing: Partial<BuildState['roomDrawing']>) => void;
  setCalibration: (cal: Partial<BuildState['calibration']>) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Home Geometry actions
  setHomeGeometrySource: (source: 'procedural' | 'imported') => void;
  setImportedModel: (settings: Partial<ImportedHomeSettings>) => void;
  addFloorBand: (band: FloorBand) => void;
  removeFloorBand: (id: string) => void;
  updateFloorBand: (id: string, changes: Partial<FloorBand>) => void;
  setNorthAngle: (angle: number) => void;

  // Environment actions
  setTimeMode: (mode: 'live' | 'preview') => void;
  setPreviewDateTime: (dt: string) => void;
  setSunPosition: (azimuth: number, elevation: number) => void;
  setWeather: (condition: WeatherCondition) => void;
  setWeatherData: (data: { condition: WeatherCondition; temperature: number; windSpeed?: number; humidity?: number; intensity?: number; forecast?: ForecastDay[] }) => void;
  setWeatherSource: (source: 'manual' | 'auto' | 'ha') => void;
  setLocation: (lat: number, lon: number) => void;

  // Opening/Stair update actions
  updateOpening: (floorId: string, wallId: string, openingId: string, changes: Partial<WallOpening>) => void;
  updateStair: (floorId: string, stairId: string, changes: Partial<StairItem>) => void;

  // Clear actions
  clearFloor: (floorId: string) => void;
  clearAllFloors: () => void;

  // Opening offset update
  updateOpeningOffset: (floorId: string, wallId: string, openingId: string, offset: number) => void;

  // Room polygon recalculation
  updateRoomPolygons: (floorId: string) => void;

  // Activity log actions
  pushActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'read'>) => void;
  clearActivity: () => void;
  markActivityRead: (id: string) => void;

  // Profile actions
  setProfile: (changes: Partial<UserProfile>) => void;

  // Category actions
  addCategory: (name: string, icon: string) => void;
  removeCategory: (id: string) => void;
  renameCategory: (id: string, name: string) => void;
  setCategoryIcon: (id: string, icon: string) => void;
  moveDeviceToCategory: (deviceId: string, categoryId: string) => void;
  reorderDeviceInCategory: (categoryId: string, deviceId: string, newIndex: number) => void;

  // Home screen device widgets
  toggleHomeScreenDevice: (deviceId: string) => void;

  // Category reorder
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  // Home Assistant actions
  setHAEntities: (entities: HAEntity[]) => void;
  updateHALiveState: (entityId: string, state: string, attributes: Record<string, unknown>) => void;
  setHAStatus: (status: HAConnectionStatus) => void;
  setHAConnection: (wsUrl: string, token: string) => void;
}
