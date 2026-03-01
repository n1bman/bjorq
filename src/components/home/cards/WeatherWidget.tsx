import { useAppStore } from '../../../store/useAppStore';
import { Thermometer, Wind, Droplets } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';

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
  const forecast = useAppStore((s) => s.environment.forecast);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-300',
        expanded ? 'min-w-[280px]' : 'min-w-[160px] max-w-[180px]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{weatherIcons[condition] ?? '☀️'}</span>
        <div>
          <div className="flex items-center gap-1">
            <Thermometer size={16} className="text-primary" />
            <span className="text-2xl font-bold font-display text-foreground">{temperature}°C</span>
          </div>
          <p className="text-xs text-muted-foreground">{conditionLabels[condition] ?? condition} · Utomhus</p>
        </div>
      </div>

      {expanded && (
        <>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1">
              <Wind size={12} className="text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{windSpeed ?? 3.2} m/s</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets size={14} className="text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{humidity ?? 62}%</span>
            </div>
          </div>

          {forecast && forecast.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {forecast.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col items-center gap-0.5 min-w-[40px] px-1.5 py-1 rounded-lg',
                      i === 0 && 'bg-primary/10'
                    )}
                  >
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {i === 0 ? 'Idag' : day.day}
                    </span>
                    <span className="text-sm">{weatherIcons[day.condition] ?? '☁️'}</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] font-semibold text-foreground">{day.maxTemp}°</span>
                      <span className="text-[9px] text-muted-foreground">{day.minTemp}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
