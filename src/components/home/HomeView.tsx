import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Scene3D from '../Scene3D';
import HomeNav from './HomeNav';
import CameraFab from './CameraFab';
import RoomNavigator from './RoomNavigator';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import TemperatureWidget from './cards/TemperatureWidget';
import DeviceControlCard from './cards/DeviceControlCard';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { Eye, EyeOff, Lightbulb, Thermometer, Wind, Camera, Power, Tv, Fan, Shield, Droplets, X, Wifi, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import type { DeviceKind } from '../../store/types';
import { cameraRef } from '../../lib/cameraRef';

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

export default function HomeView() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices ?? []);
  const markers = useAppStore((s) => s.devices.markers);
  const hiddenMarkerIds = useAppStore((s) => s.homeView.hiddenMarkerIds ?? []);
  const toggleMarkerVisibility = useAppStore((s) => s.toggleMarkerVisibility);
  const setAllMarkersVisible = useAppStore((s) => s.setAllMarkersVisible);
  const hideAllMarkers = useAppStore((s) => s.hideAllMarkers);
  const toggleDeviceState = useAppStore((s) => s.toggleDeviceState);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const saveHomeStartCamera = useAppStore((s) => s.saveHomeStartCamera);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSaveView, setShowSaveView] = useState(false);
  const sceneLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useWeatherSync();

  const selectedMarkers = markers.filter((m) => homeScreenDevices.includes(m.id));

  const getDeviceIsOn = (id: string) => {
    const state = deviceStates[id];
    if (!state) return false;
    if ('on' in state.data) return (state.data as any).on;
    if (state.kind === 'door-lock') return !(state.data as any).locked;
    return true;
  };

  const getDeviceBrightness = (id: string) => {
    const state = deviceStates[id];
    if (state?.kind === 'light') return (state.data as any).brightness ?? 200;
    return 200;
  };

  const hiddenCount = hiddenMarkerIds.length;
  const allHidden = markers.length > 0 && hiddenCount === markers.length;

  const handlePointerDown = useCallback((id: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressId(id);
    }, 500);
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

  const longPressMarker = longPressId ? markers.find((m) => m.id === longPressId) : null;

  return (
    <div className="fixed inset-0 bg-background">
      <div
        className="absolute inset-0"
        onPointerDown={() => {
          sceneLongPressRef.current = setTimeout(() => setShowSaveView(true), 800);
        }}
        onPointerUp={() => { if (sceneLongPressRef.current) { clearTimeout(sceneLongPressRef.current); sceneLongPressRef.current = null; } }}
        onPointerCancel={() => { if (sceneLongPressRef.current) { clearTimeout(sceneLongPressRef.current); sceneLongPressRef.current = null; } }}
        onPointerLeave={() => { if (sceneLongPressRef.current) { clearTimeout(sceneLongPressRef.current); sceneLongPressRef.current = null; } }}
      >
        <Scene3D />
      </div>

      {/* Floating widgets based on config */}
      <div className="absolute top-5 left-5 right-5 z-10 flex items-start gap-4 flex-wrap pointer-events-auto">
        {visibleWidgets.clock && <ClockWidget />}
        {visibleWidgets.weather && <WeatherWidget />}
        {visibleWidgets.temperature && <TemperatureWidget />}
        {visibleWidgets.energy && <EnergyWidget />}
      </div>

      {/* Save View popup */}
      {showSaveView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto" onClick={() => setShowSaveView(false)}>
          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
          <div className="relative glass-panel rounded-2xl p-5 w-64 shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-foreground">Spara som startvy?</p>
            <p className="text-xs text-muted-foreground">Den aktuella kameravinkeln sparas som din hemvy.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowSaveView(false)}>Avbryt</Button>
              <Button size="sm" className="flex-1 gap-1" onClick={() => {
                saveHomeStartCamera(
                  [cameraRef.position.x, cameraRef.position.y, cameraRef.position.z],
                  [cameraRef.target.x, cameraRef.target.y, cameraRef.target.z],
                );
                setShowSaveView(false);
              }}>
                <Save size={12} /> Spara
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Long-press popup for device control */}
      {longPressId && longPressMarker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          onClick={() => setLongPressId(null)}>
          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
          <div className="relative glass-panel rounded-2xl p-5 w-72 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const Icon = KIND_ICONS[longPressMarker.kind] || Power; return <Icon size={18} className="text-primary" />; })()}
                <span className="text-sm font-semibold text-foreground">{longPressMarker.name || longPressMarker.kind}</span>
                {longPressMarker.ha?.entityId && (
                  <Wifi size={10} className="text-green-400 shrink-0" />
                )}
              </div>
              <button onClick={() => setLongPressId(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <DeviceControlCard marker={longPressMarker} />
          </div>
        </div>
      )}

      {/* Selected device widgets at bottom - one-click toggle + long-press for details */}
      {selectedMarkers.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-10 pointer-events-auto">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {selectedMarkers.map((m) => {
              const isOn = getDeviceIsOn(m.id);
              const canToggle = TOGGLEABLE_KINDS.has(m.kind);
              const isMediaOn = m.kind === 'media_screen' && isOn;
              return (
                <div
                  key={m.id}
                  className={cn(
                    'glass-panel rounded-xl p-4 min-w-[200px] max-w-[240px] shrink-0 transition-all select-none',
                    canToggle && !isMediaOn && 'cursor-pointer active:scale-95',
                    !isOn && 'opacity-50 grayscale'
                  )}
                  onClick={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (!longPressId && canToggle && !isMediaOn) toggleDeviceState(m.id);
                  }}
                  onPointerDown={() => handlePointerDown(m.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerCancel}
                >
                  <p className="text-xs font-medium text-foreground mb-1 truncate">{m.name || m.kind}</p>
                  <DeviceControlCard marker={m} compact />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Device visibility picker - top right */}
      {markers.length > 0 && (
        <div className="fixed top-5 right-5 z-50 pointer-events-auto">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className={cn(
              'glass-panel rounded-full w-10 h-10 flex items-center justify-center transition-colors relative',
              allHidden ? 'text-muted-foreground' : 'text-foreground'
            )}
            title={pickerOpen ? 'Stäng' : 'Visa/dölj enheter'}
          >
            {allHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            {hiddenCount > 0 && !allHidden && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {hiddenCount}
              </span>
            )}
          </button>

          {/* Picker popup - opens downward */}
          {pickerOpen && (
            <div className="absolute top-12 right-0 glass-panel rounded-2xl p-3 w-72 max-h-80 overflow-y-auto space-y-2 shadow-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">Enhetsmarkörer</span>
                <button onClick={() => setPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>

              {/* Bulk actions */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={setAllMarkersVisible}
                  className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-secondary/40 text-foreground hover:bg-secondary/60 transition-colors"
                >
                  Visa alla
                </button>
                <button
                  onClick={hideAllMarkers}
                  className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-secondary/40 text-muted-foreground hover:bg-secondary/60 transition-colors"
                >
                  Dölj alla
                </button>
              </div>

              {/* Device list */}
              {markers.map((m) => {
                const isHidden = hiddenMarkerIds.includes(m.id);
                const Icon = KIND_ICONS[m.kind] || Power;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-secondary/20 transition-colors"
                  >
                    <Icon size={14} className={cn('shrink-0', isHidden ? 'text-muted-foreground/50' : 'text-primary')} />
                    <span className={cn('text-xs flex-1 truncate', isHidden && 'text-muted-foreground/50')}>
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
      )}

      <CameraFab />
      <RoomNavigator />
      <HomeNav />
    </div>
  );
}
