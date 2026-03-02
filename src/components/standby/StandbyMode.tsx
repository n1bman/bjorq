import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Scene3D from '../Scene3D';
import StandbyClock from './StandbyClock';
import StandbyWeather from './StandbyWeather';
import StandbyWidgets from './StandbyWidgets';

export default function StandbyMode() {
  const exitStandby = useAppStore((s) => s.exitStandby);
  const phase = useAppStore((s) => s.standby.phase);

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

  // Vio mode: near-black screen with minimal clock, no 3D rendering
  if (phase === 'vio') {
    return (
      <div
        className="fixed inset-0 bg-black flex items-center justify-center cursor-none animate-fade-in"
        onClick={handleExit}
        onTouchStart={handleExit}
      >
        <div className="text-center opacity-30">
          <p className="text-4xl font-light text-white font-display tabular-nums tracking-wider">
            {new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden animate-fade-in">
      {/* Fullscreen 3D scene */}
      <div className="absolute inset-0">
        <Scene3D />
      </div>

      {/* Floating overlay panel — right side */}
      <div className="absolute right-0 top-0 bottom-0 w-[30%] min-w-[280px] flex flex-col justify-center items-center gap-10 px-6 bg-gradient-to-l from-background/80 via-background/50 to-transparent backdrop-blur-md animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <StandbyClock />
        <StandbyWeather />
        <StandbyWidgets />
      </div>
    </div>
  );
}
