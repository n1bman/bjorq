import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Scene3D from '@/components/Scene3D';
import StandbyClock from './StandbyClock';
import StandbyWeather from './StandbyWeather';
import StandbyWidgets from './StandbyWidgets';

export default function StandbyMode() {
  const exitStandby = useAppStore((s) => s.exitStandby);

  const handleExit = useCallback(() => {
    exitStandby();
  }, [exitStandby]);

  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown'] as const;
    // Delay listener attachment to avoid immediate exit from the click that entered standby
    const timeout = setTimeout(() => {
      events.forEach((e) => window.addEventListener(e, handleExit, { once: true, passive: true }));
    }, 500);

    return () => {
      clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, handleExit));
    };
  }, [handleExit]);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="standby-layout p-4 h-full" style={{ gridTemplateColumns: '70% 30%' }}>
        {/* Left: 3D Scene */}
        <div className="rounded-2xl overflow-hidden h-full">
          <Scene3D />
        </div>

        {/* Right: Info Panel */}
        <div className="flex flex-col justify-center items-center gap-10 px-4">
          <StandbyClock />
          <StandbyWeather />
          <StandbyWidgets />
        </div>
      </div>
    </div>
  );
}
