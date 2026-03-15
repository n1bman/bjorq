import { useEffect, useState } from 'react';
import bjorqLogo from '../assets/bjorq-logo.png';

interface LoadingScreenProps {
  onComplete?: () => void;
}

/** Phase 4 — Branded loading screen with BjorQ logo */
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
      {/* Logo + brand */}
      <div className="flex flex-col items-center gap-4">
        <img
          src={bjorqLogo}
          alt="BjorQ"
          className="w-20 h-20 object-contain"
        />
        <h1 className="text-xl font-bold tracking-widest text-primary uppercase">
          BjorQ Dashboard
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
