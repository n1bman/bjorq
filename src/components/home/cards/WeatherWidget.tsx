import { useAppStore } from '../../../store/useAppStore';
import { Thermometer, Wind, Droplets } from 'lucide-react';
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

interface Props {
  /** Force expanded panel mode (dashboard/weather tab) */
  expanded?: boolean;
}

export default function WeatherWidget({ expanded: forceExpanded }: Props = {}) {
  const condition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);
  const windSpeed = useAppStore((s) => s.environment.weather.windSpeed);
  const humidity = useAppStore((s) => s.environment.weather.humidity);
  const forecast = useAppStore((s) => s.environment.forecast);

  const isExpanded = forceExpanded ?? false;

  // Expanded panel mode — full detail
  if (isExpanded) {
    return (
      <div className="glass-panel rounded-2xl p-5 w-full">
        <div className="flex items-center gap-5">
          <span className="text-5xl">{weatherIcons[condition] ?? '☀️'}</span>
          <div>
            <div className="flex items-center gap-1">
              <Thermometer size={20} className="text-primary" />
              <span className="text-4xl font-bold font-display text-foreground">{temperature}°C</span>
            </div>
            <p className="text-sm text-muted-foreground">{conditionLabels[condition] ?? condition} · Utomhus</p>
          </div>
          <div className="ml-auto flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Wind size={16} className="text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground">{windSpeed ?? 3.2} m/s</span>
                <p className="text-[10px] text-muted-foreground">Vind</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets size={16} className="text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground">{humidity ?? 62}%</span>
                <p className="text-[10px] text-muted-foreground">Fukt</p>
              </div>
            </div>
          </div>
        </div>

        {forecast && forecast.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground font-medium mb-2">Prognos</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {forecast.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-lg',
                    i === 0 && 'bg-primary/10'
                  )}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {i === 0 ? 'Idag' : day.day}
                  </span>
                  <span className="text-lg">{weatherIcons[day.condition] ?? '☁️'}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px] font-semibold text-foreground">{day.maxTemp}°</span>
                    <span className="text-[10px] text-muted-foreground">{day.minTemp}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Overlay mode — compact, typographic
  return (
    <div className="overlay-widget">
      <div className="flex items-center gap-2">
        <span className="text-lg">{weatherIcons[condition] ?? '☀️'}</span>
        <span className="text-xl font-bold font-display text-foreground">{temperature}°</span>
        <span className="text-[10px] text-muted-foreground/70">{conditionLabels[condition] ?? condition}</span>
      </div>
    </div>
  );
}
