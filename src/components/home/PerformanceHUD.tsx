import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** Lightweight FPS / tri-count / draw-call overlay */
export default function PerformanceHUD() {
  const show = useAppStore((s) => s.performance.showHUD);
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const tick = () => {
      frames.current++;
      const now = performance.now();
      if (now - last.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        last.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;

  const quality = useAppStore.getState().performance.quality;
  const tabletMode = useAppStore.getState().performance.tabletMode;

  return (
    <div className="fixed top-16 right-3 z-50 bg-black/70 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2 font-mono text-[11px] text-green-400 space-y-0.5 pointer-events-none select-none">
      <div className="flex items-center gap-2">
        <span className={fps < 20 ? 'text-red-400' : fps < 45 ? 'text-yellow-400' : 'text-green-400'}>
          {fps} FPS
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground/60">{quality.toUpperCase()}</span>
        {tabletMode && <span className="text-orange-400">TABLET</span>}
      </div>
      <div className="text-[9px] text-muted-foreground">
        DPR {window.devicePixelRatio.toFixed(1)} · {navigator.hardwareConcurrency || '?'} cores
      </div>
    </div>
  );
}
