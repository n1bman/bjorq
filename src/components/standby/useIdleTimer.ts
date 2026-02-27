import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useIdleTimer() {
  const enabled = useAppStore((s) => s.standby.enabled);
  const idleMinutes = useAppStore((s) => s.standby.idleMinutes);
  const appMode = useAppStore((s) => s.appMode);
  const enterStandby = useAppStore((s) => s.enterStandby);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || appMode === 'build' || appMode === 'standby') return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        enterStandby();
      }, idleMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, idleMinutes, appMode, enterStandby]);
}
