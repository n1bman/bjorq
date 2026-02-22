import { useAppStore } from '@/store/useAppStore';
import { Thermometer } from 'lucide-react';

export default function TemperatureWidget() {
  const temperature = useAppStore((s) => s.environment.weather.temperature);

  return (
    <div className="glass-panel rounded-2xl px-4 py-3 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Thermometer size={16} className="text-primary" />
        <div>
          <p className="text-lg font-bold text-foreground">{temperature}°C</p>
          <p className="text-[10px] text-muted-foreground">Utomhus</p>
        </div>
      </div>
    </div>
  );
}
