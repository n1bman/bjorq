import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const seconds = now.toLocaleTimeString('sv-SE', { second: '2-digit' }).split(':').pop();
  const date = now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-300',
        expanded ? 'min-w-[200px]' : 'min-w-[140px] max-w-[160px]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-primary shrink-0" />
        <p className="text-3xl font-bold font-display text-foreground tracking-tight">{time}</p>
      </div>
      {expanded ? (
        <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
          <p className="text-xs text-foreground capitalize">{date}</p>
          <p className="text-[11px] text-muted-foreground">Sekunder: :{seconds}</p>
          <p className="text-[11px] text-muted-foreground">Tidszon: {timezone}</p>
          <p className="text-[11px] text-muted-foreground">Vecka {getWeekNumber(now)}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground capitalize mt-0.5 truncate">{date}</p>
      )}
    </div>
  );
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
