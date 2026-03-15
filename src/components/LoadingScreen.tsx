import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

/** Phase 4 — Branded loading screen with progress indication */
export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Startar…');

  useEffect(() => {
    const steps = [
      { at: 15, label: 'Laddar konfiguration…' },
      { at: 40, label: 'Förbereder 3D-motor…' },
      { at: 65, label: 'Ansluter enheter…' },
      { at: 85, label: 'Förbereder hemmet…' },
      { at: 100, label: 'Klart!' },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].at);
        setPhase(steps[i].label);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => onComplete?.(), 300);
      }
    }, 350);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-8 animate-fade-in">
      {/* Logo / brand */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold tracking-wide text-foreground">
          HomeTwin
        </h1>
      </div>

      {/* Progress */}
      <div className="w-64 space-y-3">
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center tabular-nums">
          {phase}
        </p>
      </div>
    </div>
  );
}
