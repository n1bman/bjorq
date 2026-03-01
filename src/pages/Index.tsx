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
import { callHAService } from '../lib/apiClient';
import { haServiceCaller } from '../hooks/useHomeAssistant';

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
