import { useState, useEffect } from 'react';

export default function StandbyClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const week = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7
  );

  return (
    <div className="text-center">
      <p className="text-7xl font-bold text-foreground tracking-tight" style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.3)' }}>
        {time}
      </p>
      <p className="text-xl text-muted-foreground mt-2 capitalize">{date}</p>
      <p className="text-sm text-muted-foreground/60 mt-1">Vecka {week}</p>
    </div>
  );
}
