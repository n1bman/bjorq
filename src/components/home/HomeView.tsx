import { useAppStore } from '@/store/useAppStore';
import Scene3D from '@/components/Scene3D';
import HomeNav from './HomeNav';
import CameraFab from './CameraFab';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import { useWeatherSync } from '@/hooks/useWeatherSync';

export default function HomeView() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  useWeatherSync();

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0">
        <Scene3D />
      </div>

      {/* Floating widgets based on config */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-3 flex-wrap pointer-events-auto">
        {visibleWidgets.clock && <ClockWidget />}
        {visibleWidgets.weather && <WeatherWidget />}
        {visibleWidgets.energy && <EnergyWidget />}
      </div>

      {/* Camera controls FAB - bottom right */}
      <CameraFab />

      {/* Bottom floating pill nav */}
      <HomeNav />
    </div>
  );
}
