import { useAppStore } from '@/store/useAppStore';
import { Thermometer, Wind, Droplets } from 'lucide-react';

const weatherIcons: Record<string, string> = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  snow: '❄️',
};

const conditionLabels: Record<string, string> = {
  clear: 'Klart',
  cloudy: 'Molnigt',
  rain: 'Regn',
  snow: 'Snö',
};

export default function WeatherWidget() {
  const condition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);
  const windSpeed = useAppStore((s) => s.environment.weather.windSpeed);
  const humidity = useAppStore((s) => s.environment.weather.humidity);

  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[160px]">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{weatherIcons[condition] ?? '☀️'}</span>
        <div>
          <div className="flex items-center gap-1">
            <Thermometer size={14} className="text-primary" />
            <span className="text-lg font-semibold font-display text-foreground">{temperature}°C</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{conditionLabels[condition] ?? condition}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1">
          <Wind size={12} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{windSpeed ?? 3.2} m/s</span>
        </div>
        <div className="flex items-center gap-1">
          <Droplets size={12} className="text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{humidity ?? 62}%</span>
        </div>
      </div>
    </div>
  );
}
