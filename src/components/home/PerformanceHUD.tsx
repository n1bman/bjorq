import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getStats as getCacheStats, type CacheStats } from '../../lib/modelCache';

/** Lightweight FPS / tri-count / draw-call overlay + environment debug + cache stats */
export default function PerformanceHUD() {
  const show = useAppStore((s) => s.performance.showHUD);
  const [fps, setFps] = useState(0);
  const [cache, setCache] = useState<CacheStats>({ modelCount: 0, totalTriangles: 0, textureCount: 0 });
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
        setCache(getCacheStats());
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
  const env = useAppStore.getState().environment;
  const profile = env.profile;
  const appMode = useAppStore.getState().appMode;
  const standbyPhase = useAppStore.getState().standby.phase;

  // Render mode label
  const renderLabel =
    appMode === 'standby' && standbyPhase === 'vio' ? 'PAUSED' :
    appMode === 'standby' ? '~10FPS' :
    appMode === 'dashboard' ? 'HIDDEN' : 'FULL';

  return (
    <div className="fixed top-16 right-3 z-50 bg-black/70 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2 font-mono text-[11px] text-green-400 space-y-0.5 pointer-events-none select-none">
      <div className="flex items-center gap-2">
        <span className={fps < 20 ? 'text-red-400' : fps < 45 ? 'text-yellow-400' : 'text-green-400'}>
          {fps} FPS
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground/60">{quality.toUpperCase()}</span>
        {tabletMode && <span className="text-orange-400">TABLET</span>}
        <span className="text-muted-foreground">|</span>
        <span className={renderLabel === 'FULL' ? 'text-green-400' : renderLabel === 'PAUSED' ? 'text-red-400' : 'text-yellow-400'}>
          {renderLabel}
        </span>
      </div>
      <div className="text-[9px] text-muted-foreground">
        DPR {window.devicePixelRatio.toFixed(1)} · {navigator.hardwareConcurrency || '?'} cores
      </div>

      {/* Cache stats */}
      <div className="border-t border-border/30 mt-1 pt-1 space-y-0.5">
        <div className="text-[9px] text-purple-400">
          cache: {cache.modelCount} models · {(cache.totalTriangles / 1000).toFixed(0)}k △ · {cache.textureCount} tex
        </div>
      </div>

      {/* Environment debug */}
      <div className="border-t border-border/30 mt-1 pt-1 space-y-0.5">
        <div className="text-[9px] text-cyan-400">
          {env.weather.condition.toUpperCase()} · cloud {(env.cloudCoverage * 100).toFixed(0)}% · {profile.phase}
        </div>
        <div className="text-[9px] text-foreground/50">
          sun ↑{env.sunElevation.toFixed(1)}° az {env.sunAzimuth.toFixed(0)}°
        </div>
        <div className="text-[9px] text-foreground/50">
          sun⚡{profile.sunIntensity.toFixed(2)} amb⚡{profile.ambientIntensity.toFixed(2)} hemi⚡{profile.hemisphereIntensity.toFixed(2)} fill⚡{profile.indoorFillIntensity.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
