import Scene3D from '@/components/Scene3D';
import DashboardGrid from './DashboardGrid';
import HomeNav from './HomeNav';
import { useWeatherSync } from '@/hooks/useWeatherSync';

export default function DashboardView() {
  useWeatherSync();
  return (
    <div className="fixed inset-0 bg-background">
      {/* Dimmed 3D background */}
      <div className="absolute inset-0 opacity-30">
        <Scene3D />
      </div>

      {/* Dashboard overlay */}
      <DashboardGrid />

      {/* Bottom floating pill nav */}
      <HomeNav />
    </div>
  );
}
