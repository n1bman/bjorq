import DashboardGrid from './DashboardGrid';
import HomeNav from './HomeNav';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { useAppStore } from '../../store/useAppStore';

export default function DashboardView() {
  useWeatherSync();
  const dashboardBg = useAppStore((s) => s.profile.dashboardBg) ?? 'scene3d';

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* 3D background is handled by PersistentScene3D behind this overlay */}
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
