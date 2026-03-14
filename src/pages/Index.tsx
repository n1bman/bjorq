import { useEffect, useState } from 'react';
import BuildModeV2 from '../components/build/BuildModeV2';
import DashboardShell from '../components/home/DashboardShell';
import StandbyMode from '../components/standby/StandbyMode';
import PerformanceHUD from '../components/home/PerformanceHUD';
import { useAppStore, initHostedMode, autoDetectPerformance } from '../store/useAppStore';
import { useHomeAssistant } from '../hooks/useHomeAssistant';
import { useHABridge, useVacuumRoomSync } from '../hooks/useHABridge';
import { useIdleTimer, useVioTimer } from '../components/standby/useIdleTimer';
import { callHAService } from '../lib/apiClient';
import { haServiceCaller } from '../hooks/useHomeAssistant';
import { createThrottledCaller } from '../lib/serviceThrottle';
import { useComfortEngine } from '../hooks/useComfortEngine';

/** Inner component — only mounts after initHostedMode resolves so hooks see correct mode */
const IndexInner = () => {
  const appMode = useAppStore((s) => s.appMode);

  useHomeAssistant();
  useHABridge();
  useVacuumRoomSync();
  useIdleTimer();
  useVioTimer();
  useComfortEngine();

  if (appMode === 'standby') return <StandbyMode />;
  if (appMode === 'home') return <><HomeView /><PerformanceHUD /></>;
  if (appMode === 'dashboard') return <><DashboardView /><PerformanceHUD /></>;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="absolute inset-0">
        <BuildModeV2 />
      </div>
      <PerformanceHUD />
    </div>
  );
};

const Index = () => {
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    initHostedMode().then((hosted) => {
      if (hosted) {
        // Wrap hosted caller with throttle + circuit breaker
        const rawCaller = (domain: string, service: string, data: Record<string, unknown>) =>
          callHAService(domain, service, data).catch(console.warn);
        haServiceCaller.current = createThrottledCaller(rawCaller);
      }
    }).finally(() => {
      autoDetectPerformance();
      // Auto-verify Wizard connection if URL is configured
      const { wizard, setWizard } = useAppStore.getState();
      if (wizard.url) {
        import('../lib/wizardClient').then(({ testWizardConnection, fetchWizardCatalog }) => {
          testWizardConnection().then(result => {
            if (result.ok) {
              setWizard({ status: 'connected', version: result.version, lastChecked: new Date().toISOString() });
              fetchWizardCatalog(true).catch(() => {});
            } else {
              setWizard({ status: 'error' });
            }
          });
        });
      }
      setInitDone(true);
    });
  }, []);

  if (!initDone) return null;

  return <IndexInner />;
};

export default Index;
