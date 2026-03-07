// ─── Materials ───
export interface Material {
  id: string;
  name: string;
  type: 'paint' | 'concrete' | 'wood' | 'tile' | 'metal' | 'custom';
  color: string; // hex
  roughness: number;
  textureUrl?: string; // user-uploaded texture image
  textureScale?: number; // UV repeat factor (default 1)
}

// ─── Reference Drawing ───
export interface ReferenceDrawing {
  url: string; // data URL or blob URL
  opacity: number; // 0-1
  scale: number; // pixels per meter
  offsetX: number; // meters
  offsetY: number; // meters
  rotation: number; // degrees
  locked: boolean;
}

// ─── Terrain / Ground Environment ───
export interface TerrainSettings {
  enabled: boolean;
  grassColor: string; // hex
  grassRadius: number; // meters
  trees: TreeInstance[];
}

export interface TreeInstance {
  id: string;
  position: [number, number]; // x, z
  type: 'deciduous' | 'conifer' | 'palm';
  scale: number;
}

// ─── Layout Layer ───
export interface WallOpening {
  id: string;
  type: 'door' | 'window' | 'garage-door';
  offset: number; // 0-1 along wall
  width: number;
  height: number;
  sillHeight: number; // meters from floor (for windows)
  style?: string; // e.g. 'single','double','sliding','casement','fixed','french','sectional','roller'
  materialId?: string;
  haEntityId?: string; // HA entity for garage-doors
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

// ─── Vacuum Mapping ───
export interface VacuumZone {
  roomId: string;
  polygon: [number, number][]; // x,z coordinates in meters
  segmentId?: number; // Roborock segment ID for app_segment_clean
}

export interface VacuumMapping {
  dockPosition: [number, number] | null; // x,z in meters
  zones: VacuumZone[];
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
  vacuumMapping?: VacuumMapping;
  referenceDrawing?: ReferenceDrawing;
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
  | 'place-scene'
  | 'place-alarm'
  | 'place-water-heater'
  | 'place-humidifier'
  | 'place-siren'
  | 'place-valve'
  | 'place-remote'
  | 'place-lawn-mower'
  | 'place-speaker'
  | 'place-soundbar'
  | 'place-vacuum-dock'
  | 'vacuum-zone';

export type BuildTab = 'structure' | 'import' | 'furnish' | 'devices';
export type SnapMode = 'strict' | 'soft' | 'off';
export type CameraMode = 'topdown' | '3d' | 'floor-isolate';
export type WallViewMode = 'up' | 'cutaway' | 'down' | 'room-focus';

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
  wallViewMode: WallViewMode;
}

export interface ImportOverlaySync {
  zoom: number;
  offsetX: number;
  offsetY: number;
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
  importOverlaySync: ImportOverlaySync;
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];
}

// ─── Undo Snapshot (covers layout + devices + props) ───
export interface UndoSnapshot {
  layout: LayoutState;
  devices: { markers: DeviceMarker[]; deviceStates: Record<string, DeviceState> };
  props: { catalog: PropCatalogItem[]; items: PropItem[] };
}

// ─── Home Geometry Layer ───
export interface FloorBand {
  id: string;
  name: string;
  minY: number;
  maxY: number;
}

export type PerformanceRating = 'ok' | 'heavy' | 'too-heavy';
export type QualityLevel = 'low' | 'medium' | 'high';

export interface ModelStats {
  triangles: number;
  materials: number;
  textures: number;
  maxTextureRes: number;
  rating: PerformanceRating;
}

export interface PerformanceSettings {
  quality: QualityLevel;
  shadows: boolean;
  postprocessing: boolean;
  tabletMode: boolean;
  showHUD: boolean;
  maxLights: number; // 0 = unlimited
  _autoDetectedPerformance?: boolean; // prevents re-applying auto-detection
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
  modelStats?: ModelStats;
  originalSize?: number; // bytes — size of original upload (ZIP/folder)
  optimizedSize?: number; // bytes — size of optimized GLB
  importedOpacity?: number; // 0.0–1.0, default 1.0. When < 1, model becomes transparent for sunlight
}

export interface HomeGeometryState {
  source: 'procedural' | 'imported';
  imported: ImportedHomeSettings;
}

// ─── Devices Layer ───
export type DeviceKind = 'light' | 'switch' | 'sensor' | 'climate' | 'vacuum' | 'camera' | 'fridge' | 'oven' | 'washer' | 'garage-door' | 'door-lock' | 'power-outlet' | 'media_screen' | 'fan' | 'cover' | 'scene' | 'alarm' | 'water-heater' | 'humidifier' | 'siren' | 'valve' | 'remote' | 'lawn-mower' | 'speaker' | 'soundbar';
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
  powerEntityId?: string;   // sensor.*_power for live watts
  energyEntityId?: string;  // sensor.*_energy for cumulative kWh
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
  lightType?: LightType;
  estimatedWatts?: number;
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
  mode: 'heat' | 'cool' | 'auto' | 'off' | 'dry' | 'fan_only' | 'heat_cool';
  targetTemp: number;
  currentTemp: number;
  hvacModes?: string[];
  fanMode?: string;
  fanModes?: string[];
  swingMode?: string;
  swingModes?: string[];
  presetMode?: string;
  presetModes?: string[];
  targetTempLow?: number;
  targetTempHigh?: number;
  currentHumidity?: number;
  minTemp?: number;
  maxTemp?: number;
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

export interface CleaningLogEntry {
  room: string;
  startedAt: string;
  duration?: number;       // minutes
  fanPreset?: string;
}

export interface VacuumState {
  on: boolean;
  status: 'cleaning' | 'docked' | 'returning' | 'paused' | 'idle' | 'error';
  battery: number;          // 0-100
  fanSpeed?: number;        // 0-100%
  fanSpeedPreset?: string;  // e.g. "gentle", "balanced", "turbo"
  fanSpeedList?: string[];  // e.g. ['Silent','Standard','Medium','Turbo','Max']
  cleaningArea?: number;    // m²
  cleaningTime?: number;    // minutes
  position?: [number, number]; // [x, z] in meters (Valetudo XY)
  dockPosition?: [number, number];
  errorMessage?: string;
  _action?: 'locate' | 'spot_clean';
  currentRoom?: string;     // Room name from HA sensor
  targetRoom?: string;      // Room to clean (for room-specific cleaning)
  cleaningLog?: CleaningLogEntry[];
  showDustEffect?: boolean;  // Show dust particles in 3D (default true)
  vacuumSpeed?: number;      // 3D movement speed m/s (default 0.07, range 0.02–0.15)
  showDebugOverlay?: boolean; // Toggle debug overlay in vacuum control card
}

/** Real-time telemetry from the 3D vacuum marker, written by useFrame */
export interface VacuumDebugInfo {
  pos3D: [number, number, number];
  targetPos: [number, number] | null;
  stripeIdx: number;
  pointIdx: number;
  stripesTotal: number;
  status: string;
  activeZone: string | null;
  fps: number;
  timestamp: number;
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
  oscillating?: boolean;
  direction?: 'forward' | 'reverse';
  presetMode?: string;
  availablePresetModes?: string[];
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

export interface AlarmState {
  state: 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered';
  code?: string;
}

export interface WaterHeaterState {
  on: boolean;
  temperature: number;
  mode: 'eco' | 'electric' | 'performance' | 'off';
}

export interface HumidifierState {
  on: boolean;
  humidity: number;
  mode?: string;
  availableModes?: string[];
}

export interface SirenState {
  on: boolean;
  tone?: string;
  volume?: number;
  availableTones?: string[];
}

export interface ValveState {
  position: number; // 0=closed, 100=open
  state: 'open' | 'closed' | 'opening' | 'closing';
}

export interface LawnMowerState {
  on: boolean;
  status: 'mowing' | 'docked' | 'returning' | 'paused' | 'idle' | 'error';
  battery: number;
  errorMessage?: string;
}

export interface SpeakerState {
  on: boolean;
  state: 'playing' | 'paused' | 'idle';
  volume: number;
  source?: string;
  mediaTitle?: string;
  isSpeaking?: boolean;
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
  | { kind: 'alarm'; data: AlarmState }
  | { kind: 'water-heater'; data: WaterHeaterState }
  | { kind: 'humidifier'; data: HumidifierState }
  | { kind: 'siren'; data: SirenState }
  | { kind: 'valve'; data: ValveState }
  | { kind: 'lawn-mower'; data: LawnMowerState }
  | { kind: 'speaker'; data: SpeakerState }
  | { kind: 'soundbar'; data: SpeakerState }
  | { kind: 'generic'; data: GenericDeviceState };

export interface DevicesState {
  markers: DeviceMarker[];
  deviceStates: Record<string, DeviceState>;
  vacuumDebug: Record<string, VacuumDebugInfo>;
}

// ─── Props Layer ───
export interface PropCatalogItem {
  id: string;
  name: string;
  url: string;
  source: 'builtin' | 'user';
  thumbnail?: string;
  category?: string;
}

export interface PropModelStats {
  triangles: number;
  meshCount: number;
  materialCount: number;
  rating: string; // 'OK' | 'Tung' | 'För tung'
}

export interface PropItem {
  id: string;
  catalogId: string;
  floorId: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  name?: string;
  modelStats?: PropModelStats;
  haEntityId?: string;
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

export type PrecipitationOverride = 'auto' | 'rain' | 'snow' | 'off';

export interface EnvironmentState {
  source: 'ha' | 'manual' | 'auto';
  location: { lat: number; lon: number; timezone: string };
  timeMode: 'live' | 'preview';
  previewDateTime: string;
  weather: { condition: WeatherCondition; temperature: number; windSpeed?: number; humidity?: number; intensity: number };
  forecast?: ForecastDay[];
  sunAzimuth: number;
  sunElevation: number;
  precipitationOverride: PrecipitationOverride;
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
  vacuumSegmentMap: Record<string, number>;
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

export type MarkerSize = 'small' | 'medium' | 'large';

export interface HomeViewState {
  cameraPreset: CameraPreset;
  visibleWidgets: VisibleWidgets;
  homeScreenDevices: string[];
  showDeviceMarkers: boolean;
  hiddenMarkerIds: string[];
  markerSize: MarkerSize;
  customStartPos?: [number, number, number];
  customStartTarget?: [number, number, number];
}

// ─── Activity Log ───
export type ActivityCategory = 'system' | 'device';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  deviceId?: string;
  kind: 'state_change' | 'alert' | 'connection' | 'notification';
  category: ActivityCategory;
  title: string;
  detail?: string;
  severity: 'info' | 'warning' | 'error';
  read: boolean;
}

// ─── User Profile ───
export type LightType = 'ceiling' | 'strip' | 'wall' | 'spot';

export interface WifiSettings {
  ssid: string;
  password: string;
  visible: boolean;
}

export interface EnergyConfig {
  pricePerKwh: number;
  currency: string;
}

export interface CalendarSource {
  id: string;
  type: 'manual' | 'google' | 'outlook';
  name: string;
  connected: boolean;
}

export interface CalendarEvent {
  id: string;
  sourceId: string;
  title: string;
  date: string; // ISO
  endDate?: string;
  color: string;
  reminder?: number; // minutes before
}

export interface CalendarState {
  sources: CalendarSource[];
  events: CalendarEvent[];
}

// ─── Automations ───
export interface AutomationTrigger {
  type: 'time' | 'device_state' | 'event';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'device_toggle' | 'scene_activate' | 'notification';
  config: Record<string, unknown>;
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  lastTriggered?: string;
}

// ─── Comfort Rules ───
export type ComfortCondition = 'above' | 'below';
export type ComfortSchedule = 'always' | 'day' | 'night';

export interface ComfortRule {
  id: string;
  enabled: boolean;
  name: string;
  sensorEntityId: string;    // temperature/humidity source entity
  condition: ComfortCondition;
  threshold: number;         // e.g. 24°C
  hysteresis: number;        // default 0.5
  targetDeviceId: string;    // fan/climate device marker id
  targetAction: string;      // e.g. 'on', 'off', or percentage like '50'
  schedule: ComfortSchedule;
  dayStart: string;          // "07:00"
  dayEnd: string;            // "22:00"
  lastTriggered?: string;
  lastState?: 'active' | 'inactive';
}

export interface ComfortOverride {
  active: boolean;
  until?: string;  // ISO timestamp
}

export interface ComfortState {
  rules: ComfortRule[];
  override: ComfortOverride;
}

// ─── Scenes ───
export interface SceneSnapshot {
  deviceId: string;
  state: Record<string, unknown>;
}

export interface SavedScene {
  id: string;
  name: string;
  icon: string;
  snapshots: SceneSnapshot[];
  createdAt: string;
}

export interface UserProfile {
  name: string;
  theme: 'dark' | 'midnight' | 'light';
  accentColor: string;
  dashboardBg: 'scene3d' | 'gradient' | 'solid';
}

// ─── Standby Settings ───
export type StandbyCameraView = 'standard' | 'topdown' | 'angled-left' | 'angled-right' | 'close' | 'custom';
export type StandbyPhase = 'standby' | 'vio'; // standby = dim overlay; vio = near-black, GPU paused

export interface StandbySettings {
  enabled: boolean;
  idleMinutes: number; // 0.5, 1, 2, 5
  vioMinutes: number; // minutes after standby → vio (0 = disabled)
  motionEntityId?: string; // binary_sensor.* for motion wake
  cameraView: StandbyCameraView;
  customPos?: [number, number, number];
  customTarget?: [number, number, number];
  phase: StandbyPhase;
}

// ─── App State ───
export type AppMode = 'home' | 'dashboard' | 'build' | 'standby';

export interface AppState {
  _hostedMode: boolean;
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
  standby: StandbySettings;
  _preStandbyMode: AppMode;
  performance: PerformanceSettings;
  wifi: WifiSettings;
  energyConfig: EnergyConfig;
  calendar: CalendarState;
  automations: Automation[];
  savedScenes: SavedScene[];
  comfort: ComfortState;
  terrain: TerrainSettings;

  // Performance actions
  setPerformance: (changes: Partial<PerformanceSettings>) => void;

  // WiFi actions
  setWifi: (changes: Partial<WifiSettings>) => void;

  // Energy config actions
  setEnergyConfig: (changes: Partial<EnergyConfig>) => void;

  // Calendar actions
  addCalendarEvent: (event: CalendarEvent) => void;
  removeCalendarEvent: (id: string) => void;
  updateCalendarEvent: (id: string, changes: Partial<CalendarEvent>) => void;
  addCalendarSource: (source: CalendarSource) => void;
  removeCalendarSource: (id: string) => void;

  // Automation actions
  addAutomation: (automation: Automation) => void;
  removeAutomation: (id: string) => void;
  updateAutomation: (id: string, changes: Partial<Automation>) => void;
  toggleAutomation: (id: string) => void;

  // Comfort actions
  addComfortRule: (rule: ComfortRule) => void;
  removeComfortRule: (id: string) => void;
  updateComfortRule: (id: string, changes: Partial<ComfortRule>) => void;
  toggleComfortRule: (id: string) => void;
  setComfortOverride: (override: Partial<ComfortOverride>) => void;

  // Scene actions
  addScene: (scene: SavedScene) => void;
  removeScene: (id: string) => void;
  activateScene: (id: string) => void;

  // Standby actions
  setStandbySettings: (s: Partial<StandbySettings>) => void;
  enterStandby: () => void;
  exitStandby: () => void;

  // Home View actions
  setCameraPreset: (preset: CameraPreset) => void;
  toggleHomeWidget: (widget: keyof VisibleWidgets) => void;
  toggleShowDeviceMarkers: () => void;
  toggleMarkerVisibility: (id: string) => void;
  setAllMarkersVisible: () => void;
  hideAllMarkers: () => void;
  saveHomeStartCamera: (pos: [number, number, number], target: [number, number, number]) => void;
  clearHomeStartCamera: () => void;

  // Device actions
  addDevice: (marker: DeviceMarker) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, changes: Partial<DeviceMarker>) => void;
  toggleDeviceState: (id: string) => void;
  setDeviceState: (id: string, state: DeviceState) => void;
  updateDeviceState: (id: string, partialData: Record<string, unknown>) => void;
  setVacuumDebug: (id: string, info: VacuumDebugInfo) => void;

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
  updateCatalogItem: (id: string, changes: Partial<PropCatalogItem>) => void;
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
  setImportOverlaySync: (sync: Partial<ImportOverlaySync>) => void;
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
  setPrecipitationOverride: (override: PrecipitationOverride) => void;
  setLocation: (lat: number, lon: number) => void;

  // Opening/Stair update actions
  updateOpening: (floorId: string, wallId: string, openingId: string, changes: Partial<WallOpening>) => void;
  updateStair: (floorId: string, stairId: string, changes: Partial<StairItem>) => void;

  // Clear actions
  clearFloor: (floorId: string) => void;
  clearAllFloors: () => void;
  clearImportedModel: () => void;

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

  // Vacuum mapping actions
  setVacuumMapping: (floorId: string, mapping: VacuumMapping) => void;
  setVacuumDock: (floorId: string, pos: [number, number]) => void;
  addVacuumZone: (floorId: string, zone: VacuumZone) => void;
  removeVacuumZone: (floorId: string, roomId: string) => void;
  renameVacuumZone: (floorId: string, oldRoomId: string, newRoomId: string) => void;
  updateVacuumZoneSegmentId: (floorId: string, roomId: string, segmentId: number | undefined) => void;

  // Home Assistant actions
  setHAEntities: (entities: HAEntity[]) => void;
  updateHALiveState: (entityId: string, state: string, attributes: Record<string, unknown>) => void;
  setHAStatus: (status: HAConnectionStatus) => void;
  setHAConnection: (wsUrl: string, token: string) => void;
  setVacuumSegmentMap: (map: Record<string, number>) => void;

  // Reference drawing actions
  setReferenceDrawing: (floorId: string, drawing: ReferenceDrawing | undefined) => void;
  updateReferenceDrawing: (floorId: string, changes: Partial<ReferenceDrawing>) => void;

  // Terrain actions
  setTerrain: (changes: Partial<TerrainSettings>) => void;
  addTree: (tree: TreeInstance) => void;
  removeTree: (id: string) => void;
  updateTree: (id: string, changes: Partial<TreeInstance>) => void;

  // Custom material actions
  addCustomMaterial: (material: Material) => void;
}
