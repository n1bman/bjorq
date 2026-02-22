import { useState, useEffect } from 'react';

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[140px]">
      <p className="text-3xl font-bold font-display text-foreground tracking-tight">{time}</p>
      <p className="text-xs text-muted-foreground capitalize mt-0.5">{date}</p>
    </div>
  );
}
