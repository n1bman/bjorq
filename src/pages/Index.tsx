import BuildModeV2 from '@/components/build/BuildModeV2';
import HomeView from '@/components/home/HomeView';
import DashboardView from '@/components/home/DashboardView';
import ModeHeader from '@/components/ModeHeader';
import { useAppStore } from '@/store/useAppStore';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import { useHABridge } from '@/hooks/useHABridge';

const Index = () => {
  const appMode = useAppStore((s) => s.appMode);
  useHomeAssistant();
  useHABridge();

  if (appMode === 'home') {
    return <HomeView />;
  }

  if (appMode === 'dashboard') {
    return <DashboardView />;
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <ModeHeader />
      <div className="absolute inset-0 pt-14">
        <BuildModeV2 />
      </div>
    </div>
  );
};

export default Index;
