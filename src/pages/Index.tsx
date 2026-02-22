import BuildModeV2 from '@/components/build/BuildModeV2';
import HomeView from '@/components/home/HomeView';
import ModeHeader from '@/components/ModeHeader';
import { useAppStore } from '@/store/useAppStore';

const Index = () => {
  const appMode = useAppStore((s) => s.appMode);

  if (appMode === 'home') {
    return <HomeView />;
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
