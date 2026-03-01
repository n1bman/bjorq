import { useEffect, useState } from 'react';
import BuildModeV2 from '@/components/build/BuildModeV2';
import HomeView from '@/components/home/HomeView';
import DashboardView from '@/components/home/DashboardView';
import StandbyMode from '@/components/standby/StandbyMode';
import ModeHeader from '@/components/ModeHeader';
import { useAppStore, initHostedMode } from '@/store/useAppStore';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import { useHABridge, useVacuumRoomSync } from '@/hooks/useHABridge';
import { useIdleTimer } from '@/components/standby/useIdleTimer';
import { isHostedSync } from '@/lib/apiClient';
import { AlertTriangle } from 'lucide-react';

const Index = () => {
  const appMode = useAppStore((s) => s.appMode);
  const [initDone, setInitDone] = useState(false);
  
  useHomeAssistant();
  useHABridge();
  useVacuumRoomSync();
  useIdleTimer();

  useEffect(() => {
    initHostedMode().then((hosted) => {
      if (hosted) {
        // Set global HA service caller to REST proxy
        import('@/hooks/useHomeAssistant').then(({ haServiceCaller }) => {
          import('@/lib/apiClient').then(({ callHAService }) => {
            haServiceCaller.current = (domain, service, data) =>
              callHAService(domain, service, data).catch(console.warn);
          });
        });
      }
    }).finally(() => setInitDone(true));
  }, []);

  if (appMode === 'standby') {
    return <StandbyMode />;
  }

  if (appMode === 'home') {
    return (
      <>
        {initDone && !isHostedSync() && <NotHostedBanner />}
        <HomeView />
      </>
    );
  }

  if (appMode === 'dashboard') {
    return (
      <>
        {initDone && !isHostedSync() && <NotHostedBanner />}
        <DashboardView />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {initDone && !isHostedSync() && <NotHostedBanner />}
      <ModeHeader />
      <div className="absolute inset-0 pt-14">
        <BuildModeV2 />
      </div>
    </div>
  );
};

function NotHostedBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-accent/90 text-accent-foreground text-xs text-center py-1 px-4 flex items-center justify-center gap-1.5 backdrop-blur-sm">
      <AlertTriangle size={12} />
      <span>Inte värdläge — data sparas i webbläsaren</span>
    </div>
  );
}

export default Index;
