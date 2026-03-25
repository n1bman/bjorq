import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import HomeNav from './HomeNav';
import CameraFab from './CameraFab';
import RoomNavigator from './RoomNavigator';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import TemperatureWidget from './cards/TemperatureWidget';
import DeviceControlCard from './cards/DeviceControlCard';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { Eye, EyeOff, Lightbulb, Thermometer, Wind, Camera, Power, Tv, Fan, Shield, Droplets, X, Wifi } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import type { DeviceKind } from '../../store/types';

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

interface HomeViewProps {
  longPressDeviceId?: string | null;
  onDismissLongPress?: () => void;
  fpsActive?: boolean;
}

export default function HomeView({ longPressDeviceId, onDismissLongPress, fpsActive }: HomeViewProps) {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices ?? []);
  const markers = useAppStore((s) => s.devices.markers);
  const hiddenMarkerIds = useAppStore((s) => s.homeView.hiddenMarkerIds ?? []);
  const toggleMarkerVisibility = useAppStore((s) => s.toggleMarkerVisibility);
  const setAllMarkersVisible = useAppStore((s) => s.setAllMarkersVisible);
  const hideAllMarkers = useAppStore((s) => s.hideAllMarkers);
  const toggleDeviceState = useAppStore((s) => s.toggleDeviceState);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const handlePointerDown = useCallback((id: string) => {
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

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* ── Top overlay widgets — minimal, typographic ── */}
      <div className="absolute top-5 left-5 z-10 flex items-start gap-3 pointer-events-auto">
        {visibleWidgets.clock && <ClockWidget />}
        {visibleWidgets.weather && <WeatherWidget />}
      </div>

      <div className="absolute top-5 right-20 z-10 flex items-start gap-3 pointer-events-auto">
        {visibleWidgets.temperature && <TemperatureWidget />}
        {visibleWidgets.energy && <EnergyWidget />}
      </div>

      {/* ── Long-press popup for device control ── */}
      {longPressDeviceId && longPressMarker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          onClick={onDismissLongPress}>
          <div className="absolute inset-0 bg-background/50 backdrop-blur-md" />
          <div className="relative nn-widget p-5 w-72 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const Icon = KIND_ICONS[longPressMarker.kind] || Power; return <Icon size={16} className="text-primary" />; })()}
                <span className="text-sm font-semibold text-foreground">{longPressMarker.name || longPressMarker.kind}</span>
                {longPressMarker.ha?.entityId && (
                  <Wifi size={10} className="text-green-400 shrink-0" />
                )}
              </div>
              <button onClick={onDismissLongPress} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <DeviceControlCard marker={longPressMarker} />
          </div>
        </div>
      )}

      {/* ── Device pills at bottom — pill-shaped, compact ── */}
      {selectedMarkers.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-10 pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {selectedMarkers.map((m) => {
              const isOn = getDeviceIsOn(m.id);
              const canToggle = TOGGLEABLE_KINDS.has(m.kind);
              const isMediaOn = m.kind === 'media_screen' && isOn;
              const Icon = KIND_ICONS[m.kind] || Power;
              return (
                <button
                  key={m.id}
                  data-active={isOn ? 'true' : 'false'}
                  className={cn(
                    'device-pill shrink-0',
                    canToggle && !isMediaOn && 'cursor-pointer active:scale-95',
                  )}
                  onClick={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (!longPressDeviceId && canToggle && !isMediaOn) toggleDeviceState(m.id);
                  }}
                  onPointerDown={() => handlePointerDown(m.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerCancel}
                >
                  <Icon size={14} className={cn(isOn ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-xs font-medium text-foreground truncate max-w-[100px]">{m.name || m.kind}</span>
                  {canToggle && (
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isOn ? 'bg-primary' : 'bg-muted-foreground/30'
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
                'overlay-widget w-10 h-10 flex items-center justify-center rounded-full p-0 transition-colors',
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
              <div className="absolute top-12 right-0 nn-widget p-3 w-72 max-h-80 overflow-y-auto space-y-2 shadow-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enhetsmarkörer</span>
                  <button onClick={() => setPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={setAllMarkersVisible}
                    className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-surface-elevated text-foreground hover:bg-surface-elevated/80 transition-colors"
                  >
                    Visa alla
                  </button>
                  <button
                    onClick={hideAllMarkers}
                    className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-surface-elevated text-muted-foreground hover:bg-surface-elevated/80 transition-colors"
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
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-elevated/50 transition-colors"
                    >
                      <Icon size={14} className={cn('shrink-0', isHidden ? 'text-muted-foreground/40' : 'text-primary')} />
                      <span className={cn('text-xs flex-1 truncate', isHidden && 'text-muted-foreground/40')}>
                        {m.name || m.kind}
                      </span>
                      <Switch
                        checked={!isHidden}
                        onCheckedChange={() => toggleMarkerVisibility(m.id)}
                        className="scale-75"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div className="pointer-events-auto">
        <CameraFab />
        <RoomNavigator />
        <HomeNav />
      </div>
    </div>
  );
}
