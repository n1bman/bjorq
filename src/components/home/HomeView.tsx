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

export default function HomeView() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices);
  const markers = useAppStore((s) => s.devices.markers);
  useWeatherSync();

  const selectedMarkers = markers.filter((m) => homeScreenDevices.includes(m.id));

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

      {/* Selected device widgets at bottom */}
      {selectedMarkers.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-10 pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedMarkers.map((m) => (
              <div key={m.id} className="glass-panel rounded-xl p-3 min-w-[180px] max-w-[220px] shrink-0">
                <p className="text-xs font-medium text-foreground mb-1 truncate">{m.name || m.kind}</p>
                <DeviceControlCard marker={m} />
              </div>
            ))}
          </div>
        </div>
      )}

      <CameraFab />
      <HomeNav />
    </div>
  );
}
