import { useEffect, useState, useCallback } from 'react';
import BuildModeV2 from '../components/build/BuildModeV2';
import HomeView from '../components/home/HomeView';
import DashboardShell from '../components/home/DashboardShell';
import StandbyMode from '../components/standby/StandbyMode';
import PerformanceHUD from '../components/home/PerformanceHUD';
import LoadingScreen from '../components/LoadingScreen';
import PersistentScene3D from '../components/PersistentScene3D';
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
  const [longPressDeviceId, setLongPressDeviceId] = useState<string | null>(null);

  useHomeAssistant();
  useHABridge();
  useVacuumRoomSync();
  useIdleTimer();
  useVioTimer();
  useComfortEngine();

  const handleDeviceLongPress = useCallback((id: string) => {
    setLongPressDeviceId(id);
  }, []);

  const handleDismissLongPress = useCallback(() => {
    setLongPressDeviceId(null);
  }, []);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Persistent 3D scene — always mounted, adapts to appMode */}
      <PersistentScene3D onDeviceLongPress={handleDeviceLongPress} />

      {/* Mode-specific UI overlays */}
      {appMode === 'standby' && <StandbyMode />}
      {appMode === 'home' && (
        <HomeView
          longPressDeviceId={longPressDeviceId}
          onDismissLongPress={handleDismissLongPress}
        />
      )}
      {appMode === 'dashboard' && <DashboardShell />}
      {appMode === 'build' && <BuildModeV2 />}

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
