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
  expanded?: boolean; // force expanded (used in Weather tab)
}

export default function WeatherWidget({ expanded: forceExpanded }: Props = {}) {
  const condition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);
  const windSpeed = useAppStore((s) => s.environment.weather.windSpeed);
  const humidity = useAppStore((s) => s.environment.weather.humidity);
  const forecast = useAppStore((s) => s.environment.forecast);

  const isExpanded = forceExpanded ?? false;

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-5 transition-all duration-300',
        isExpanded ? 'w-full' : 'min-w-[160px] max-w-[180px] cursor-pointer'
      )}
    >
      {/* Primary: temperature + condition */}
      <div className={cn('flex items-center', isExpanded ? 'gap-5' : 'gap-3')}>
        <span className={cn(isExpanded ? 'text-5xl' : 'text-2xl')}>{weatherIcons[condition] ?? '☀️'}</span>
        <div>
          <div className="flex items-center gap-1">
            <Thermometer size={isExpanded ? 20 : 16} className="text-primary" />
            <span className={cn('font-bold font-display text-foreground', isExpanded ? 'text-4xl' : 'text-2xl')}>
              {temperature}°C
            </span>
          </div>
          <p className={cn('text-muted-foreground', isExpanded ? 'text-sm' : 'text-xs')}>
            {conditionLabels[condition] ?? condition} · Utomhus
          </p>
        </div>

        {/* Wind + humidity inline when expanded */}
        {isExpanded && (
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
        )}
      </div>

      {/* Forecast row — always shown when expanded */}
      {isExpanded && forecast && forecast.length > 0 && (
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
