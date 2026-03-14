// ─── Materials ───
export type MaterialType = 'paint' | 'concrete' | 'wood' | 'tile' | 'metal' | 'wallpaper' | 'texture' | 'custom';

/** Size mode for user-facing scale override */
export type SurfaceSizeMode = 'auto' | 'small' | 'standard' | 'large';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  color: string; // hex fallback color
  roughness: number;
  metalness?: number; // 0-1, default 0
  textureUrl?: string; // user-uploaded texture image
  textureScale?: number; // UV repeat factor (default 1)
  /** Visual category for UI grouping */
  surfaceCategory?: 'paint' | 'wallpaper' | 'tile' | 'stone' | 'wood' | 'metal' | 'texture' | 'carpet';
  /** F3: If true, this material only appears in floor material browser */
  floorOnly?: boolean;
  // ─── B4: Texture-ready fields ───
  /** Path to albedo/color map (local asset path or URL) */
  mapPath?: string;
  /** Path to normal map */
  normalMapPath?: string;
  /** Path to roughness map */
  roughnessMapPath?: string;
  /** Path to ambient occlusion map */
  aoMapPath?: string;
  /** Texture repeat [x, y] — how many times the pattern tiles per meter */
  repeat?: [number, number];
  /** Whether this material has a real texture (vs flat color only) */
  hasTexture?: boolean;
  /** CC0 source attribution (e.g. 'ambientCG', 'Poly Haven') */
  source?: string;
  /** ambientCG asset ID for download reference */
  ambientCGId?: string;
  /** CDN thumbnail URL for material browser preview */
  thumbnailUrl?: string;
  /**
   * B5: Real-world size of one texture repeat unit in meters [width, height].
   * Used to calculate sensible repeat values automatically based on surface dimensions.
   * E.g. a subway tile might be [0.3, 0.15], wallpaper roll [0.53, 0.53].
   */
  realWorldSize?: [number, number];
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
  type: 'door' | 'window' | 'garage-door' | 'passage';
  offset: number; // 0-1 along wall
  width: number;
  height: number;
  sillHeight: number; // meters from floor (for windows)
  style?: string; // e.g. 'single','double','sliding','casement','fixed','french','sectional','roller'
  materialId?: string;
  haEntityId?: string; // HA entity for garage-doors
  flipped?: boolean; // flip inside/outside orientation
  openAmount?: number; // 0-1, how open the door/garage is (0=closed, 1=fully open)
}

export interface WallSegment {
  id: string;
  from: [number, number]; // [x, z] in meters
  to: [number, number];
  height: number;
  thickness: number;
  materialId?: string;
  interiorMaterialId?: string; // separate interior face material
  leftMaterialId?: string;  // material on left side (relative to from→to direction)
  rightMaterialId?: string; // material on right side
  openings: WallOpening[];
}

export interface RoomCameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export interface Room {
  id: string;
  name: string;
  wallIds: string[];
  floorMaterialId?: string;
  wallMaterialId?: string;
  /** C2: User-selected floor texture size mode */
  floorSizeMode?: SurfaceSizeMode;
  /** F6: Manual floor texture scale multiplier (0.2–4.0, default 1) */
  floorTextureScale?: number;
  /** F6: Manual floor texture rotation in degrees (0–360, default 0) */
  floorTextureRotation?: number;
  /** Manual wall texture scale multiplier (0.2–10, default 1) */
  wallTextureScale?: number;
  /** Manual wall texture rotation in degrees (0–360, default 0) */
  wallTextureRotation?: number;
  polygon?: [number, number][]; // cached polygon for rendering
  cameraPreset?: RoomCameraPreset;
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

export interface KitchenFixture {
  id: string;
  floorId: string;
  position: [number, number]; // x, z (bottom-center)
  rotation: number; // radians
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
  kitchenFixtures: KitchenFixture[];
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
  | 'garage-door'
  | 'passage'
  | 'stairs'
  | 'paint'
  | 'template'
  | 'erase'
  | 'copy'
  | 'measure'
  | 'calibrate'
  | 'devices'
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
  | 'place-light-fixture'
  | 'place-smart-outlet'
  | 'place-vacuum-dock'
  | 'vacuum-zone'
  | 'furnish'
  | 'import';

export type BuildTab = 'planritning' | 'inredning' | 'bibliotek';
export type SnapMode = 'strict' | 'soft' | 'off';
export type CameraMode = 'topdown' | '3d' | 'floor-isolate';


export interface BuildSelection {
  type: 'wall' | 'opening' | 'room' | 'prop' | 'stair' | 'device' | 'kitchen-fixture' | null;
  id: string | null;
  /** Which wall face was clicked (paint mode). Added Phase B2. */
  faceSide?: 'left' | 'right' | null;
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
  /** Phase C1: pending wall-mount placement (catalog item waiting for wall click) */
  pendingWallMount: { catalogId: string; url: string } | null;
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
  antialiasing: boolean;
  toneMapping: boolean;
  exposure: number; // 0.5–2.0
  environmentLight: boolean;
  _autoDetectedPerformance?: boolean; // prevents re-applying auto-detection
}

// ─── Sun Calibration ───
export interface SunCalibration {
  northOffset: number;       // degrees — rotates sun path to match house orientation
  azimuthCorrection: number; // degrees — fine-tune azimuth
  elevationCorrection: number; // degrees — fine-tune elevation
  intensityMultiplier: number; // 0.0–2.0 (default 1.0)
  indoorBounce: number;      // 0.0–1.0 — fill light intensity inside rooms
}

// ─── Atmosphere Settings ───
export interface AtmosphereSettings {
  fogEnabled: boolean;
  fogDensity: number;       // 0.0–1.0
  cloudinessAffectsLight: boolean;
  dayNightTransition: 'smooth' | 'instant';
  atmosphereIntensity: number; // 0.0–2.0
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
  entityId?: string;      // HA entity_id for camera_proxy fetching
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

// ─── Asset Catalog ───
export type AssetCategory =
  | 'sofas' | 'chairs' | 'tables' | 'beds' | 'storage'
  | 'lighting' | 'decor' | 'plants' | 'kitchen' | 'bathroom'
  | 'devices' | 'outdoor' | 'electronics' | 'smart-devices' | 'imported';

export type AssetPlacement = 'floor' | 'wall' | 'ceiling' | 'table' | 'free';

export interface AssetDimensions {
  width: number;   // meters
  depth: number;
  height: number;
}

export interface AssetHAMapping {
  mappable: boolean;
  defaultDomain?: string;    // e.g. "light", "media_player"
  defaultKind?: DeviceKind;
}

export interface AssetPerformanceStats {
  triangles: number;
  materials: number;
  fileSizeKB: number;
  maxTextureRes?: number;
}

/** Metadata for curated catalog assets (read from public/catalog/index.json) */
export interface CatalogAssetMeta {
  id: string;
  name: string;
  category: AssetCategory;
  subcategory?: string;
  style?: string;
  tags?: string[];
  model: string;         // relative path to GLB from catalog root
  thumbnail?: string;    // relative path to thumb image
  dimensions?: AssetDimensions;
  placement: AssetPlacement;
  defaultRotation?: [number, number, number];
  shadow?: { cast: boolean; receive: boolean };
  ha?: AssetHAMapping;
  performance?: AssetPerformanceStats;
  source: 'curated';
}

// ─── Props Layer ───
export type AssetVisibility = 'visible' | 'favorite' | 'hidden';

export interface PropCatalogItem {
  id: string;
  name: string;
  url: string;
  source: 'builtin' | 'user' | 'curated';
  thumbnail?: string;
  category?: string;
  // Extended metadata
  subcategory?: string;
  style?: string;
  tags?: string[];
  dimensions?: AssetDimensions;
  placement?: AssetPlacement;      // placementHint: floor/wall/ceiling/table (stored, not enforced)
  visibility?: AssetVisibility;    // core visibility status for library management
  defaultRotation?: [number, number, number];
  haMapping?: AssetHAMapping;
  fileData?: string;           // base64 for user imports
  performance?: AssetPerformanceStats;
  // Wizard dual-mode tracking
  wizardAssetId?: string;      // original Wizard asset ID
  wizardBaseUrl?: string;      // Wizard URL at time of import/sync
  wizardMode?: 'synced' | 'imported'; // 'synced' is deprecated — treated as needing re-import
  wizardMeta?: {
    boundingBox?: { min: [number, number, number]; max: [number, number, number] };
    center?: { x: number; y: number; z: number };
    estimatedScale?: number;
    triangleCount?: number;
    fileSize?: number;
    category?: string;
    subcategory?: string;
  };
}

export interface PropModelStats {
  triangles: number;
  meshCount: number;
  materialCount: number;
  rating: string; // 'OK' | 'Tung' | 'För tung'
}

/** Wall-mount attachment info (Phase C1) */
export interface WallMountInfo {
  wallId: string;
  faceSide: 'left' | 'right';
  offsetAlongWall: number;  // 0-1 fraction along wall length
  heightOnWall: number;     // meters from floor elevation
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
  linkedDeviceId?: string;       // auto-created DeviceMarker id for HA-mappable props
  colorOverride?: string;
  textureOverride?: string;    // base64 data URL
  textureScale?: number;       // UV repeat (default 1)
  metalness?: number;           // 0-1
  roughness?: number;           // 0-1
  /** Phase C1: wall-mount attachment data (if mounted on wall) */
  wallMountInfo?: WallMountInfo;
  /** C4: User override to ignore wall collision barriers */
  freePlacement?: boolean;
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
  cloudCoverage: number; // 0-1, from HA or estimated from condition
  precipitationOverride: PrecipitationOverride;
  sunCalibration: SunCalibration;
  atmosphere: AtmosphereSettings;
  skyStyle: 'auto' | 'gradient' | 'solid';
  profile: import('../lib/environmentEngine').EnvironmentProfile;
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
  linkedRoomIds?: string[];
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
  linkedRoomIds?: string[];
  scope?: 'global' | 'room' | 'custom';
  cameraMode?: 'none' | 'first-linked-room' | 'custom';
  customCameraPreset?: RoomCameraPreset;
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

// ─── Build Project (portable envelope) ───
export const BUILD_PROJECT_SCHEMA_VERSION = 1;

export interface BuildProjectMeta {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
}

export interface BuildProject {
  meta: BuildProjectMeta;
  layout: LayoutState;
  devices: Omit<DevicesState, 'vacuumDebug'>;
  homeGeometry: HomeGeometryState;
  props: PropsState;
  terrain: TerrainSettings;
  activityLog: ActivityEvent[];
}

// ─── App State ───
export type AppMode = 'home' | 'dashboard' | 'build' | 'standby';

// ─── Dashboard Categories & Widget Layouts ───
export type DashCategory = 'home' | 'weather' | 'calendar' | 'devices' | 'energy' | 'climate' | 'automations' | 'scenes' | 'surveillance' | 'robot' | 'activity' | 'widgets' | 'graphics' | 'settings';

export interface WidgetPlacement {
  widgetId: string;
  order: number;
  colSpan?: 1 | 2;
}

export interface DashboardSettings {
  activeCategory: DashCategory;
  categoryLayouts: Partial<Record<DashCategory, WidgetPlacement[]>>;
}

// ─── Wizard Connection ───
export interface WizardConnection {
  url: string;
  status: 'disconnected' | 'connected' | 'error';
  version?: string;
  lastChecked?: string;
}

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
  wizard: WizardConnection;
  dashboard: DashboardSettings;

  // Dashboard actions
  setDashCategory: (cat: DashCategory) => void;
  setCategoryLayout: (cat: DashCategory, widgets: WidgetPlacement[]) => void;

  // Wizard actions
  setWizard: (changes: Partial<WizardConnection>) => void;

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
  assignDeviceRoom: (deviceId: string, roomId: string | null) => void;
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
  updateWall: (floorId: string, wallId: string, changes: Partial<WallSegment>) => void;

  // Opening actions
  addOpening: (floorId: string, wallId: string, opening: WallOpening) => void;
  removeOpening: (floorId: string, wallId: string, openingId: string) => void;

  // Room actions
  setRooms: (floorId: string, rooms: Room[]) => void;
  removeRoom: (floorId: string, roomId: string) => void;
  renameRoom: (floorId: string, roomId: string, name: string) => void;
  setRoomMaterial: (floorId: string, roomId: string, target: 'floor' | 'wall', materialId: string) => void;
  setRoomCameraPreset: (floorId: string, roomId: string, preset: RoomCameraPreset | undefined) => void;
  addRoomFromRect: (floorId: string, x: number, z: number, w: number, d: number, name: string) => void;

  // Stair actions
  addStair: (floorId: string, stair: StairItem) => void;
  removeStair: (floorId: string, stairId: string) => void;

  // Kitchen fixture actions
  addKitchenFixture: (floorId: string, fixture: KitchenFixture) => void;
  updateKitchenFixture: (floorId: string, fixtureId: string, updates: Partial<KitchenFixture>) => void;
  removeKitchenFixture: (floorId: string, fixtureId: string) => void;

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
  /** Phase C1: set/clear pending wall-mount placement */
  setPendingWallMount: (pending: { catalogId: string; url: string } | null) => void;

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
  setSunCalibration: (changes: Partial<SunCalibration>) => void;
  setAtmosphere: (changes: Partial<AtmosphereSettings>) => void;
  setSkyStyle: (style: 'auto' | 'gradient' | 'solid') => void;
  setCloudCoverage: (coverage: number) => void;
  setEnvironmentProfile: (profile: import('../lib/environmentEngine').EnvironmentProfile) => void;

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
