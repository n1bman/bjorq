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

/** Inner component — only mounts after initHostedMode resolves so hooks see correct mode */
const IndexInner = () => {
  const appMode = useAppStore((s) => s.appMode);

  useHomeAssistant();
  useHABridge();
  useVacuumRoomSync();
  useIdleTimer();

  if (appMode === 'standby') return <StandbyMode />;
  if (appMode === 'home') return <HomeView />;
  if (appMode === 'dashboard') return <DashboardView />;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <ModeHeader />
      <div className="absolute inset-0 pt-14">
        <BuildModeV2 />
      </div>
    </div>
  );
};

const Index = () => {
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    initHostedMode().then((hosted) => {
      if (hosted) {
        haServiceCaller.current = (domain, service, data) =>
          callHAService(domain, service, data).catch(console.warn);
      }
    }).finally(() => setInitDone(true));
  }, []);

  if (!initDone) return null;

  return <IndexInner />;
};

export default Index;
