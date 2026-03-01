import Scene3D from '../Scene3D';
import DashboardGrid from './DashboardGrid';
import HomeNav from './HomeNav';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { useAppStore } from '../../store/useAppStore';

export default function DashboardView() {
  useWeatherSync();
  const dashboardBg = useAppStore((s) => s.profile.dashboardBg);

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Bounded 3D scene at top */}
      {dashboardBg === 'scene3d' && (
        <div className="relative w-full shrink-0 overflow-hidden" style={{ height: '35vh' }}>
          <div className="absolute inset-0 opacity-70">
            <Scene3D />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {dashboardBg === 'gradient' && (
        <div className="relative w-full shrink-0 overflow-hidden" style={{ height: '20vh' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
        </div>
      )}

      {/* Dashboard overlay - fills remaining space */}
      <div className="relative flex-1 min-h-0">
        <DashboardGrid />
      </div>

      {/* Bottom floating pill nav */}
      <HomeNav />
    </div>
  );
}
