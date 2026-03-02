import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

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

/**
 * Vio timer: transitions standby → vio after vioMinutes.
 * Also listens to HA motion sensor for wake.
 */
export function useVioTimer() {
  const appMode = useAppStore((s) => s.appMode);
  const phase = useAppStore((s) => s.standby.phase);
  const vioMinutes = useAppStore((s) => s.standby.vioMinutes);
  const motionEntityId = useAppStore((s) => s.standby.motionEntityId);
  const exitStandby = useAppStore((s) => s.exitStandby);
  const vioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMotionRef = useRef<string | null>(null);

  // Standby → Vio timer
  useEffect(() => {
    if (appMode !== 'standby' || phase !== 'standby' || vioMinutes <= 0) return;

    vioTimerRef.current = setTimeout(() => {
      useAppStore.setState((s) => ({
        standby: { ...s.standby, phase: 'vio' },
      }));
    }, vioMinutes * 60 * 1000);

    return () => {
      if (vioTimerRef.current) clearTimeout(vioTimerRef.current);
    };
  }, [appMode, phase, vioMinutes]);

  // Motion sensor wake
  useEffect(() => {
    if (!motionEntityId || appMode !== 'standby') return;

    const unsub = useAppStore.subscribe((state) => {
      const live = state.homeAssistant.liveStates[motionEntityId];
      if (!live) return;
      const motionState = live.state;
      if (motionState === 'on' && prevMotionRef.current !== 'on') {
        exitStandby();
      }
      prevMotionRef.current = motionState;
    });

    return unsub;
  }, [motionEntityId, appMode, exitStandby]);
}
