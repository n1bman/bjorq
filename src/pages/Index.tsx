import { useEffect, useState } from 'react';
import BuildModeV2 from '../components/build/BuildModeV2';
import HomeView from '../components/home/HomeView';
import DashboardView from '../components/home/DashboardView';
import StandbyMode from '../components/standby/StandbyMode';
import ModeHeader from '../components/ModeHeader';
import { useAppStore, initHostedMode } from '../store/useAppStore';
import { useHomeAssistant } from '../hooks/useHomeAssistant';
import { useHABridge, useVacuumRoomSync } from '../hooks/useHABridge';
import { useIdleTimer } from '../components/standby/useIdleTimer';
import { isHostedSync, getMode, callHAService } from '../lib/apiClient';
import { haServiceCaller } from '../hooks/useHomeAssistant';
import { AlertTriangle, Server, Monitor } from 'lucide-react';

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
        // In hosted mode, route HA service calls through REST proxy
        haServiceCaller.current = (domain, service, data) =>
          callHAService(domain, service, data).catch(console.warn);
      }
    }).finally(() => setInitDone(true));
  }, []);

  if (appMode === 'standby') {
    return <StandbyMode />;
  }

  const banner = initDone ? <ModeBanner /> : null;

  if (appMode === 'home') {
    return (
      <>
        {banner}
        <HomeView />
      </>
    );
  }

  if (appMode === 'dashboard') {
    return (
      <>
        {banner}
        <DashboardView />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {banner}
      <ModeHeader />
      <div className="absolute inset-0 pt-14">
        <BuildModeV2 />
      </div>
    </div>
  );
};

function ModeBanner() {
  const mode = getMode();

  if (mode === 'HOSTED') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary/90 text-primary-foreground text-xs text-center py-1 px-4 flex items-center justify-center gap-1.5 backdrop-blur-sm">
        <Server size={12} />
        <span>HOSTED — Diskpersistens aktiv</span>
      </div>
    );
  }

  // DEV mode
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-accent/90 text-accent-foreground text-xs text-center py-1 px-4 flex items-center justify-center gap-1.5 backdrop-blur-sm">
      <Monitor size={12} />
      <span>DEV — HA-token lagras lokalt (ej rekommenderat för produktion)</span>
    </div>
  );
}

export default Index;
