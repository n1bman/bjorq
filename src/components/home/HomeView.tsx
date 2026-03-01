import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Scene3D from '../Scene3D';
import HomeNav from './HomeNav';
import CameraFab from './CameraFab';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import TemperatureWidget from './cards/TemperatureWidget';
import DeviceControlCard from './cards/DeviceControlCard';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { Eye, EyeOff, EyeClosed, Lightbulb, Thermometer, Wind, Camera, Power, Tv, Fan, Shield, Droplets, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import type { DeviceKind } from '../../store/types';

const TOGGLEABLE_KINDS = new Set(['light', 'switch', 'climate', 'vacuum', 'media_screen', 'power-outlet', 'camera', 'fridge', 'oven', 'washer']);

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
  const [pickerOpen, setPickerOpen] = useState(false);
  useWeatherSync();

  const selectedMarkers = markers.filter((m) => homeScreenDevices.includes(m.id));

  const getDeviceIsOn = (id: string) => {
    const state = deviceStates[id];
    if (!state) return false;
    if ('on' in state.data) return (state.data as any).on;
    if (state.kind === 'door-lock') return !(state.data as any).locked;
    return true;
  };

  const hiddenCount = hiddenMarkerIds.length;
  const allHidden = markers.length > 0 && hiddenCount === markers.length;

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0">
        <Scene3D />
      </div>

      {/* Floating widgets based on config */}
      <div className="absolute top-5 left-5 right-5 z-10 flex items-start gap-4 flex-wrap pointer-events-auto">
        {visibleWidgets.clock && <ClockWidget />}
        {visibleWidgets.weather && <WeatherWidget />}
        {visibleWidgets.temperature && <TemperatureWidget />}
        {visibleWidgets.energy && <EnergyWidget />}
      </div>

      {/* Selected device widgets at bottom - one-click toggle */}
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
                    'glass-panel rounded-xl p-4 min-w-[200px] max-w-[240px] shrink-0 transition-all',
                    canToggle && !isMediaOn && 'cursor-pointer active:scale-95',
                    !isOn && 'opacity-50 grayscale'
                  )}
                  onClick={() => canToggle && !isMediaOn && toggleDeviceState(m.id)}
                >
                  <p className="text-xs font-medium text-foreground mb-1 truncate">{m.name || m.kind}</p>
                  <DeviceControlCard marker={m} compact />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Device visibility picker - bottom left to avoid camera FAB overlap */}
      {markers.length > 0 && (
        <div className="fixed bottom-36 left-4 z-50 pointer-events-auto">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className={cn(
              'glass-panel rounded-full w-12 h-12 flex items-center justify-center transition-colors relative',
              allHidden ? 'text-muted-foreground' : 'text-foreground'
            )}
            title={pickerOpen ? 'Stäng' : 'Visa/dölj enheter'}
          >
            {allHidden ? <EyeOff size={18} /> : <Eye size={18} />}
            {hiddenCount > 0 && !allHidden && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {hiddenCount}
              </span>
            )}
          </button>

          {/* Picker popup */}
          {pickerOpen && (
            <div className="absolute bottom-14 left-0 glass-panel rounded-2xl p-3 w-72 max-h-80 overflow-y-auto space-y-2 shadow-xl">
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
      <HomeNav />
    </div>
  );
}
