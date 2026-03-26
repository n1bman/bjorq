import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import HomeNav from './HomeNav';
import CameraFab from './CameraFab';
import RoomNavigator from './RoomNavigator';
import HomeLayoutEditor from './HomeLayoutEditor';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import TemperatureWidget from './cards/TemperatureWidget';
import DeviceControlCard from './cards/DeviceControlCard';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { Eye, EyeOff, Lightbulb, Thermometer, Wind, Camera, Power, Tv, Fan, Shield, Droplets, X, Wifi, Settings2, ChevronDown, Play, Pause, Home as HomeIcon, Square, Plus, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import type { DeviceKind, HomeWidgetKey } from '../../store/types';

const TOGGLEABLE_KINDS = new Set(['light', 'switch', 'climate', 'vacuum', 'media_screen', 'power-outlet', 'camera', 'fridge', 'oven', 'washer', 'light-fixture', 'smart-outlet']);

const KIND_ICONS: Partial<Record<DeviceKind, typeof Lightbulb>> = {
  light: Lightbulb,
  sensor: Thermometer,
  climate: Wind,
  camera: Camera,
  switch: Power,
  'power-outlet': Power,
  'media_screen': Tv,
  fan: Fan,
  alarm: Shield,
  humidifier: Droplets,
};

/** Default free positions for widgets (percentage of viewport) */
const DEFAULT_POSITIONS: Record<HomeWidgetKey, { x: number; y: number }> = {
  clock: { x: 3, y: 4 },
  weather: { x: 3, y: 14 },
  temperature: { x: 78, y: 4 },
  energy: { x: 78, y: 14 },
  nav: { x: 46, y: 90 },
  camera: { x: 90, y: 78 },
  rooms: { x: 82, y: 78 },
};

interface HomeViewProps {
  longPressDeviceId?: string | null;
  onDismissLongPress?: () => void;
  fpsActive?: boolean;
}

export default function HomeView({ longPressDeviceId, onDismissLongPress, fpsActive }: HomeViewProps) {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const widgetLayout = useAppStore((s) => s.homeView.widgetLayout) ?? {};
  const homeLayoutEditMode = useAppStore((s) => s.homeView.homeLayoutEditMode);
  const toggleHomeLayoutEditMode = useAppStore((s) => s.toggleHomeLayoutEditMode);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices ?? []);
  const markers = useAppStore((s) => s.devices.markers);
  const hiddenMarkerIds = useAppStore((s) => s.homeView.hiddenMarkerIds ?? []);
  const toggleMarkerVisibility = useAppStore((s) => s.toggleMarkerVisibility);
  const setAllMarkersVisible = useAppStore((s) => s.setAllMarkersVisible);
  const hideAllMarkers = useAppStore((s) => s.hideAllMarkers);
  const toggleDeviceState = useAppStore((s) => s.toggleDeviceState);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedPillId, setExpandedPillId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useWeatherSync();

  const selectedMarkers = markers.filter((m) => homeScreenDevices.includes(m.id));

  const getDeviceIsOn = (id: string) => {
    const state = deviceStates[id];
    if (!state) return false;
    if ('on' in state.data) return (state.data as any).on;
    if (state.kind === 'door-lock') return !(state.data as any).locked;
    return true;
  };

  const handlePointerDown = useCallback((_id: string) => {
    longPressTimerRef.current = setTimeout(() => {}, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const longPressMarker = longPressDeviceId ? markers.find((m) => m.id === longPressDeviceId) : null;

  if (fpsActive) return null;

  const widgetKeys: HomeWidgetKey[] = ['clock', 'weather', 'temperature', 'energy'];

  const widgetComponents: Record<string, (size: string) => React.ReactNode> = {
    clock: (size) => <ClockWidget size={size as any} />,
    weather: (size) => <WeatherWidget size={size as any} />,
    temperature: (size) => <TemperatureWidget size={size as any} />,
    energy: (size) => <EnergyWidget size={size as any} />,
  };

  const getPos = (key: HomeWidgetKey) => {
    const config = widgetLayout[key];
    return {
      x: config?.x ?? DEFAULT_POSITIONS[key].x,
      y: config?.y ?? DEFAULT_POSITIONS[key].y,
    };
  };

  const navPos = getPos('nav');
  const cameraPos = getPos('camera');
  const roomsPos = getPos('rooms');

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Layout editor overlay */}
      {homeLayoutEditMode && <HomeLayoutEditor />}

      {/* ── Free-positioned overlay widgets ── */}
      {!homeLayoutEditMode && widgetKeys.map((key) => {
        if (!visibleWidgets?.[key]) return null;
        const config = widgetLayout?.[key];
        const size = config?.size ?? 'normal';
        const pos = {
          x: config?.x ?? DEFAULT_POSITIONS[key].x,
          y: config?.y ?? DEFAULT_POSITIONS[key].y,
        };

        return (
          <div
            key={key}
            className="absolute z-10 pointer-events-auto"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
          >
            {widgetComponents[key](size)}
          </div>
        );
      })}

      {/* ── Layout edit button — top left corner ── */}
      {!homeLayoutEditMode && (
        <button
          onClick={toggleHomeLayoutEditMode}
          className="fixed top-4 left-4 z-20 pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-all
            bg-[hsl(var(--surface)/0.5)] backdrop-blur-xl border border-[hsl(var(--glass-border)/0.2)]
            hover:border-[hsl(var(--primary)/0.3)] hover:shadow-[0_0_24px_hsl(var(--amber-glow))]
            text-muted-foreground hover:text-primary"
          title="Anpassa hemvy"
        >
          <Settings2 size={16} />
        </button>
      )}

      {/* ── Long-press popup for device control ── */}
      {longPressDeviceId && longPressMarker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          onClick={onDismissLongPress}>
          <div className="absolute inset-0 bg-background/50 backdrop-blur-md" />
          <div className="relative nn-widget p-6 w-80 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => { const Icon = KIND_ICONS[longPressMarker.kind] || Power; return <Icon size={18} className="text-primary" />; })()}
                <span className="text-sm font-semibold text-foreground">{longPressMarker.name || longPressMarker.kind}</span>
                {longPressMarker.ha?.entityId && (
                  <Wifi size={10} className="text-green-400 shrink-0" />
                )}
              </div>
              <button onClick={onDismissLongPress} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <DeviceControlCard marker={longPressMarker} />
          </div>
        </div>
      )}

      {/* ── Device pills at bottom ── */}
      {selectedMarkers.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-10 pointer-events-auto">
          {/* Expanded pill panel */}
          {expandedPillId && (() => {
            const em = selectedMarkers.find((m) => m.id === expandedPillId);
            if (!em) return null;
            const emIsOn = getDeviceIsOn(em.id);
            const callService = useAppStore.getState().callDeviceService;

            if (em.kind === 'vacuum') {
              return (
                <div className="nn-widget p-3 mb-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button onClick={() => callService?.(em.id, 'start')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                    <Play size={12} /> Städa
                  </button>
                  <button onClick={() => callService?.(em.id, 'pause')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary/70 transition-colors">
                    <Pause size={12} /> Paus
                  </button>
                  <button onClick={() => callService?.(em.id, 'stop')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary/70 transition-colors">
                    <Square size={12} /> Stopp
                  </button>
                  <button onClick={() => callService?.(em.id, 'return_to_base')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary/70 transition-colors">
                    <HomeIcon size={12} /> Docka
                  </button>
                </div>
              );
            }

            if (em.kind === 'climate') {
              const climateData = deviceStates[em.id]?.data as any;
              const temp = climateData?.temperature ?? 22;
              return (
                <div className="nn-widget p-3 mb-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <span className="text-xs text-muted-foreground">Temp</span>
                  <button onClick={() => callService?.(em.id, 'set_temperature', { temperature: temp - 0.5 })} className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold text-foreground min-w-[3ch] text-center">{temp}°</span>
                  <button onClick={() => callService?.(em.id, 'set_temperature', { temperature: temp + 0.5 })} className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              );
            }

            if (em.kind === 'media_screen') {
              return (
                <div className="nn-widget p-3 mb-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button onClick={() => callService?.(em.id, emIsOn ? 'media_pause' : 'media_play')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                    {emIsOn ? <Pause size={12} /> : <Play size={12} />}
                    {emIsOn ? 'Paus' : 'Spela'}
                  </button>
                </div>
              );
            }

            return null;
          })()}

          <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 max-md:grid max-md:grid-cols-2 max-md:gap-2">
            {selectedMarkers.map((m) => {
              const isOn = getDeviceIsOn(m.id);
              const canToggle = TOGGLEABLE_KINDS.has(m.kind);
              const isMediaOn = m.kind === 'media_screen' && isOn;
              const hasExpand = m.kind === 'vacuum' || m.kind === 'climate' || m.kind === 'media_screen';
              const Icon = KIND_ICONS[m.kind] || Power;
              const isExpanded = expandedPillId === m.id;
              return (
                <button
                  key={m.id}
                  data-active={isOn ? 'true' : 'false'}
                  className={cn(
                    'device-pill shrink-0 min-h-[48px]',
                    canToggle && !isMediaOn && !hasExpand && 'cursor-pointer active:scale-95',
                    isExpanded && 'ring-1 ring-primary/40',
                  )}
                  onClick={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (hasExpand) {
                      setExpandedPillId(isExpanded ? null : m.id);
                    } else if (!longPressDeviceId && canToggle && !isMediaOn) {
                      toggleDeviceState(m.id);
                    }
                  }}
                  onPointerDown={() => handlePointerDown(m.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerCancel}
                >
                  <Icon size={15} className={cn(isOn ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-[13px] font-medium text-foreground truncate max-w-[120px]">{m.name || m.kind}</span>
                  {hasExpand && (
                    <ChevronDown size={12} className={cn('text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                  )}
                  {canToggle && !hasExpand && (
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full shrink-0 transition-colors',
                      isOn ? 'bg-primary shadow-[0_0_8px_hsl(var(--amber-glow))]' : 'bg-muted-foreground/30'
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Device visibility picker — top right ── */}
      {markers.length > 0 && (() => {
        const KINDS_WITH_3D_MODELS = new Set<DeviceKind>([
          'light-fixture', 'speaker', 'soundbar', 'smart-outlet', 'vacuum',
          'light', 'switch', 'sensor', 'climate',
        ]);
        const toggleableMarkers = markers.filter((m) => !KINDS_WITH_3D_MODELS.has(m.kind));
        const toggleableHiddenCount = toggleableMarkers.filter((m) => hiddenMarkerIds.includes(m.id)).length;
        const allToggleableHidden = toggleableMarkers.length > 0 && toggleableHiddenCount === toggleableMarkers.length;

        if (toggleableMarkers.length === 0) return null;

        return (
          <div className="fixed top-5 right-5 z-50 pointer-events-auto">
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className={cn(
                'w-11 h-11 flex items-center justify-center rounded-full transition-all',
                'bg-[hsl(var(--surface)/0.5)] backdrop-blur-xl border border-[hsl(var(--glass-border)/0.2)]',
                'hover:border-[hsl(var(--primary)/0.3)]',
                allToggleableHidden ? 'text-muted-foreground' : 'text-foreground'
              )}
              title={pickerOpen ? 'Stäng' : 'Visa/dölj enheter'}
            >
              {allToggleableHidden ? <EyeOff size={18} /> : <Eye size={18} />}
              {toggleableHiddenCount > 0 && !allToggleableHidden && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {toggleableHiddenCount}
                </span>
              )}
            </button>

            {pickerOpen && (
              <div className="absolute top-14 right-0 nn-widget p-4 w-72 max-h-80 overflow-y-auto space-y-3 shadow-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">Enhetsmarkörer</span>
                  <button onClick={() => setPickerOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={setAllMarkersVisible}
                    className="flex-1 text-[12px] px-3 py-2 rounded-xl bg-surface-elevated text-foreground hover:bg-surface-elevated/80 transition-colors"
                  >
                    Visa alla
                  </button>
                  <button
                    onClick={hideAllMarkers}
                    className="flex-1 text-[12px] px-3 py-2 rounded-xl bg-surface-elevated text-muted-foreground hover:bg-surface-elevated/80 transition-colors"
                  >
                    Dölj alla
                  </button>
                </div>

                {toggleableMarkers.map((m) => {
                  const isHidden = hiddenMarkerIds.includes(m.id);
                  const Icon = KIND_ICONS[m.kind] || Power;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-elevated/50 transition-colors"
                    >
                      <Icon size={15} className={cn('shrink-0', isHidden ? 'text-muted-foreground/40' : 'text-primary')} />
                      <span className={cn('text-[13px] flex-1 truncate', isHidden && 'text-muted-foreground/40')}>
                        {m.name || m.kind}
                      </span>
                      <Switch
                        checked={!isHidden}
                        onCheckedChange={() => toggleMarkerVisibility(m.id)}
                        className="scale-80"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <CameraFab style={{ position: 'absolute', left: `${cameraPos.x}%`, top: `${cameraPos.y}%` }} />
      <RoomNavigator style={{ position: 'absolute', left: `${roomsPos.x}%`, top: `${roomsPos.y}%` }} />
      <HomeNav style={{ position: 'absolute', left: `${navPos.x}%`, top: `${navPos.y}%` }} />
    </div>
  );
}
