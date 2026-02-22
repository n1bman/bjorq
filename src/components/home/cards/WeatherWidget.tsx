import { useAppStore } from '@/store/useAppStore';
import { Thermometer } from 'lucide-react';

const weatherIcons: Record<string, string> = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  snow: '❄️',
};

export default function WeatherWidget() {
  const condition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);

  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[140px]">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{weatherIcons[condition] ?? '☀️'}</span>
        <div>
          <div className="flex items-center gap-1">
            <Thermometer size={14} className="text-primary" />
            <span className="text-lg font-semibold font-display text-foreground">{temperature}°C</span>
          </div>
          <p className="text-[10px] text-muted-foreground capitalize">
            {condition === 'clear' ? 'Klart' : condition === 'cloudy' ? 'Molnigt' : condition === 'rain' ? 'Regn' : 'Snö'}
          </p>
        </div>
      </div>
    </div>
  );
}
