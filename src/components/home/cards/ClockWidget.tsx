import { useState, useEffect } from 'react';

interface Props {
  /** When true, renders as full panel (dashboard). Default: minimal overlay (Hem). */
  panel?: boolean;
}

export default function ClockWidget({ panel }: Props = {}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });

  if (panel) {
    const seconds = now.toLocaleTimeString('sv-SE', { second: '2-digit' }).split(':').pop();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (
      <div className="glass-panel rounded-2xl p-5">
        <p className="text-4xl font-bold font-display text-foreground tracking-tight">{time}</p>
        <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
          <p className="text-xs text-foreground capitalize">{date}</p>
          <p className="text-[11px] text-muted-foreground">Sekunder: :{seconds}</p>
          <p className="text-[11px] text-muted-foreground">Tidszon: {timezone}</p>
          <p className="text-[11px] text-muted-foreground">Vecka {getWeekNumber(now)}</p>
        </div>
      </div>
    );
  }

  // Overlay mode — pure typography, minimal chrome
  return (
    <div className="overlay-widget">
      <p className="text-3xl font-bold font-display text-foreground tracking-tight leading-none">{time}</p>
      <p className="text-[10px] text-muted-foreground/70 capitalize mt-1 tracking-wide">{date}</p>
    </div>
  );
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
