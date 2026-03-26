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
import ScenesWidget from './cards/ScenesWidget';
import DeviceControlCard from './cards/DeviceControlCard';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { Eye, EyeOff, Lightbulb, Thermometer, Wind, Camera, Power, Tv, Fan, Shield, Droplets, X, Wifi, Settings2, ChevronDown, Play, Pause, Home as HomeIcon, Square, Plus, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import { callHAService, isHostedSync } from '../../lib/apiClient';
import { haServiceCaller } from '../../hooks/useHomeAssistant';
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
  scenes: { x: 3, y: 78 },
  devices: { x: 3, y: 85 },
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
  // expandedPillId removed — all controls are always visible in unified cards
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

  const widgetKeys: HomeWidgetKey[] = ['clock', 'weather', 'temperature', 'energy', 'scenes'];

  const widgetComponents: Record<string, (size: string) => React.ReactNode> = {
    clock: (size) => <ClockWidget size={size as any} />,
    weather: (size) => <WeatherWidget size={size as any} />,
    temperature: (size) => <TemperatureWidget size={size as any} />,
    energy: (size) => <EnergyWidget size={size as any} />,
    scenes: () => <ScenesWidget />,
  };

  const getPos = (key: HomeWidgetKey) => {
    const config = widgetLayout[key];
    return {
      x: Math.max(1, Math.min(92, config?.x ?? DEFAULT_POSITIONS[key].x)),
      y: Math.max(1, Math.min(92, config?.y ?? DEFAULT_POSITIONS[key].y)),
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

      {/* ── Layout edit button — top left corner (hidden in edit mode) ── */}
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

      {/* ── Individual device widgets ── */}
      {!homeLayoutEditMode && selectedMarkers.length > 0 && (visibleWidgets?.devices !== false) && selectedMarkers.map((m, idx) => {
        const devicePos = widgetLayout[m.id]
          ? { x: Math.max(1, Math.min(92, widgetLayout[m.id].x ?? 3)), y: Math.max(1, Math.min(92, widgetLayout[m.id].y ?? (70 + idx * 6))) }
          : { x: 3 + idx * 12, y: 82 };
        const isOn = getDeviceIsOn(m.id);
        const canToggle = TOGGLEABLE_KINDS.has(m.kind);
        const isExpanded = expandedPillId === m.id;
        const hasExpand = m.kind === 'vacuum' || m.kind === 'climate' || m.kind === 'media_screen' || m.kind === 'light' || m.kind === 'fan' || m.kind === 'speaker' || m.kind === 'soundbar';
        const Icon = KIND_ICONS[m.kind] || Power;
        const entityId = m.ha?.entityId;

        const callSvc = (domain: string, service: string, data: Record<string, unknown> = {}) => {
          if (entityId) {
            const payload = { entity_id: entityId, ...data };
            if (isHostedSync()) {
              callHAService(domain, service, payload).catch(console.warn);
            } else {
              haServiceCaller.current?.(domain, service, payload);
            }
          }
        };

        return (
          <div
            key={m.id}
            className="absolute z-10 pointer-events-auto"
            style={{ left: `${devicePos.x}%`, top: `${devicePos.y}%` }}
          >
            <button
              className={cn(
                'glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-xl transition-all min-w-[120px]',
                'border border-[hsl(var(--glass-border)/0.15)] shadow-lg',
                isOn && 'border-[hsl(var(--primary)/0.25)]',
                isExpanded && 'ring-1 ring-primary/30',
                canToggle && !hasExpand && 'active:scale-95 cursor-pointer',
              )}
              onClick={() => {
                if (hasExpand) {
                  setExpandedPillId(isExpanded ? null : m.id);
                } else if (canToggle) {
                  toggleDeviceState(m.id);
                }
              }}
              onPointerDown={() => handlePointerDown(m.id)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerCancel}
            >
              <Icon size={16} className={cn(isOn ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-[13px] font-medium text-foreground truncate max-w-[100px]">{m.name || m.kind}</span>
              {hasExpand && (
                <ChevronDown size={12} className={cn('text-muted-foreground transition-transform ml-auto', isExpanded && 'rotate-180')} />
              )}
              {canToggle && !hasExpand && (
                <span className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0 ml-auto transition-colors',
                  isOn ? 'bg-primary shadow-[0_0_8px_hsl(var(--amber-glow))]' : 'bg-muted-foreground/30'
                )} />
              )}
            </button>

            {/* Inline expand panel */}
            {isExpanded && m.kind === 'vacuum' && (
              <div className="glass-panel rounded-2xl p-3 mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)] min-w-[200px]">
                <button onClick={() => callSvc('vacuum', 'start')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  <Play size={12} /> Städa
                </button>
                <button onClick={() => callSvc('vacuum', 'pause')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] text-foreground text-xs font-medium hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                  <Pause size={12} /> Paus
                </button>
                <button onClick={() => callSvc('vacuum', 'stop')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] text-foreground text-xs font-medium hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                  <Square size={12} /> Stopp
                </button>
                <button onClick={() => callSvc('vacuum', 'return_to_base')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] text-foreground text-xs font-medium hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                  <HomeIcon size={12} /> Docka
                </button>
              </div>
            )}

            {isExpanded && m.kind === 'climate' && (() => {
              const climateData = deviceStates[m.id]?.data as any;
              const temp = climateData?.temperature ?? 22;
              return (
                <div className="glass-panel rounded-2xl p-3 mt-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]">
                  <span className="text-xs text-muted-foreground">Temp</span>
                  <button onClick={() => callSvc('climate', 'set_temperature', { temperature: temp - 0.5 })} className="w-8 h-8 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] flex items-center justify-center text-foreground hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold text-foreground min-w-[3ch] text-center">{temp}°</span>
                  <button onClick={() => callSvc('climate', 'set_temperature', { temperature: temp + 0.5 })} className="w-8 h-8 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] flex items-center justify-center text-foreground hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              );
            })()}

            {isExpanded && m.kind === 'media_screen' && (
              <div className="glass-panel rounded-2xl p-3 mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]">
                <button onClick={() => callSvc('media_player', isOn ? 'media_pause' : 'media_play')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  {isOn ? <Pause size={12} /> : <Play size={12} />}
                  {isOn ? 'Paus' : 'Spela'}
                </button>
              </div>
            )}

            {/* Light — brightness slider + on/off */}
            {isExpanded && m.kind === 'light' && (() => {
              const lightData = deviceStates[m.id]?.data as any;
              const brightness = lightData?.brightness ?? 255;
              return (
                <div className="glass-panel rounded-2xl p-3 mt-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]">
                  <span className="text-xs text-muted-foreground shrink-0">Ljus</span>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={brightness}
                    onChange={(e) => callSvc('light', 'turn_on', { brightness: +e.target.value })}
                    className="flex-1 accent-[hsl(var(--primary))] h-1.5"
                  />
                  <button
                    onClick={() => {
                      if (isOn) callSvc('light', 'turn_off');
                      else callSvc('light', 'turn_on');
                      toggleDeviceState(m.id);
                    }}
                    className="px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                  >
                    {isOn ? 'Av' : 'På'}
                  </button>
                </div>
              );
            })()}

            {/* Fan — speed presets + on/off */}
            {isExpanded && m.kind === 'fan' && (
              <div className="glass-panel rounded-2xl p-3 mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]">
                <button onClick={() => callSvc('fan', 'set_percentage', { percentage: 33 })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] text-foreground text-xs font-medium hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                  Låg
                </button>
                <button onClick={() => callSvc('fan', 'set_percentage', { percentage: 66 })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] text-foreground text-xs font-medium hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                  Medium
                </button>
                <button onClick={() => callSvc('fan', 'set_percentage', { percentage: 100 })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated)/0.5)] text-foreground text-xs font-medium hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                  Hög
                </button>
                <button
                  onClick={() => {
                    if (isOn) callSvc('fan', 'turn_off');
                    else callSvc('fan', 'turn_on');
                    toggleDeviceState(m.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                >
                  {isOn ? 'Av' : 'På'}
                </button>
              </div>
            )}

            {/* Speaker / Soundbar — volume + play/pause */}
            {isExpanded && (m.kind === 'speaker' || m.kind === 'soundbar') && (() => {
              const mediaData = deviceStates[m.id]?.data as any;
              const volume = mediaData?.volume ?? 50;
              return (
                <div className="glass-panel rounded-2xl p-3 mt-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]">
                  <button
                    onClick={() => callSvc('media_player', isOn ? 'media_pause' : 'media_play')}
                    className="px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                  >
                    {isOn ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <span className="text-xs text-muted-foreground">Vol</span>
                  <button onClick={() => callSvc('media_player', 'volume_set', { volume_level: Math.max(0, (volume - 10) / 100) })} className="w-7 h-7 rounded-lg bg-[hsl(var(--surface-elevated)/0.5)] flex items-center justify-center text-foreground hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold text-foreground min-w-[3ch] text-center">{volume}%</span>
                  <button onClick={() => callSvc('media_player', 'volume_set', { volume_level: Math.min(1, (volume + 10) / 100) })} className="w-7 h-7 rounded-lg bg-[hsl(var(--surface-elevated)/0.5)] flex items-center justify-center text-foreground hover:bg-[hsl(var(--surface-elevated)/0.7)] transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* ── Device visibility picker — top right ── */}
      {!homeLayoutEditMode && markers.length > 0 && (() => {
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

      {!homeLayoutEditMode && (
        <>
          <CameraFab style={{ position: 'absolute', left: `${cameraPos.x}%`, top: `${cameraPos.y}%` }} />
          <RoomNavigator style={{ position: 'absolute', left: `${roomsPos.x}%`, top: `${roomsPos.y}%` }} />
          <HomeNav style={{ position: 'absolute', left: `${navPos.x}%`, top: `${navPos.y}%` }} />
        </>
      )}
    </div>
  );
}
