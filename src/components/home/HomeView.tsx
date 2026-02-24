import { useAppStore } from '@/store/useAppStore';
import Scene3D from '@/components/Scene3D';
import HomeNav from './HomeNav';
import CameraFab from './CameraFab';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import TemperatureWidget from './cards/TemperatureWidget';
import DeviceControlCard from './cards/DeviceControlCard';
import { useWeatherSync } from '@/hooks/useWeatherSync';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOGGLEABLE_KINDS = new Set(['light', 'switch', 'climate', 'vacuum', 'media_screen', 'power-outlet', 'camera', 'fridge', 'oven', 'washer']);

export default function HomeView() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices ?? []);
  const markers = useAppStore((s) => s.devices.markers);
  const showDeviceMarkers = useAppStore((s) => s.homeView.showDeviceMarkers ?? true);
  const toggleShowDeviceMarkers = useAppStore((s) => s.toggleShowDeviceMarkers);
  const toggleDeviceState = useAppStore((s) => s.toggleDeviceState);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  useWeatherSync();

  const selectedMarkers = markers.filter((m) => homeScreenDevices.includes(m.id));

  const getDeviceIsOn = (id: string) => {
    const state = deviceStates[id];
    if (!state) return false;
    if ('on' in state.data) return (state.data as any).on;
    if (state.kind === 'door-lock') return !(state.data as any).locked;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0">
        <Scene3D />
      </div>

      {/* Floating widgets based on config */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-3 flex-wrap pointer-events-auto">
        {visibleWidgets.clock && <ClockWidget />}
        {visibleWidgets.weather && <WeatherWidget />}
        {visibleWidgets.temperature && <TemperatureWidget />}
        {visibleWidgets.energy && <EnergyWidget />}
      </div>

      {/* Selected device widgets at bottom - one-click toggle */}
      {selectedMarkers.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-10 pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedMarkers.map((m) => {
              const isOn = getDeviceIsOn(m.id);
              const canToggle = TOGGLEABLE_KINDS.has(m.kind);
              return (
                <div
                  key={m.id}
                  className={cn(
                    'glass-panel rounded-xl p-3 min-w-[180px] max-w-[220px] shrink-0 transition-all',
                    canToggle && 'cursor-pointer active:scale-95',
                    !isOn && 'opacity-50 grayscale'
                  )}
                  onClick={() => canToggle && toggleDeviceState(m.id)}
                >
                  <p className="text-xs font-medium text-foreground mb-1 truncate">{m.name || m.kind}</p>
                  <DeviceControlCard marker={m} compact />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle device markers visibility - positioned above camera FAB */}
      <button
        onClick={toggleShowDeviceMarkers}
        className="fixed bottom-36 right-4 z-50 pointer-events-auto glass-panel rounded-full w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title={showDeviceMarkers ? 'Dölj enheter' : 'Visa enheter'}
      >
        {showDeviceMarkers ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>

      <CameraFab />
      <HomeNav />
    </div>
  );
}
