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
      {/* Fullscreen 3D scene */}
      <div className="absolute inset-0">
        <Scene3D />
      </div>

      {/* Floating overlay panel — right side */}
      <div className="absolute right-0 top-0 bottom-0 w-[30%] min-w-[280px] flex flex-col justify-center items-center gap-10 px-6 bg-gradient-to-l from-background/80 via-background/50 to-transparent backdrop-blur-md">
        <StandbyClock />
        <StandbyWeather />
        <StandbyWidgets />
      </div>
    </div>
  );
}
