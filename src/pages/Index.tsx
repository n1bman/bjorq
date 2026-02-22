import Scene3D from '@/components/Scene3D';
import BottomNav from '@/components/BottomNav';
import ModeHeader from '@/components/ModeHeader';
import BuildModeV2 from '@/components/build/BuildModeV2';
import DashboardOverlay from '@/components/dashboard/DashboardOverlay';
import DevicesOverlay from '@/components/devices/DevicesOverlay';
import { useAppStore } from '@/store/useAppStore';

const Index = () => {
  const appMode = useAppStore((s) => s.appMode);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <ModeHeader />
      <div className="absolute inset-0 pt-14 pb-16">
        {appMode === 'build' ? (
          <BuildModeV2 />
        ) : (
          <div className="relative w-full h-full">
            <Scene3D />
            {appMode === 'dashboard' && <DashboardOverlay />}
            {appMode === 'devices' && <DevicesOverlay />}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
