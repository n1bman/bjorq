import { useAppStore } from '../../../store/useAppStore';
import { Wind, Droplets, Clock, Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { WidgetOverlaySize } from '../../../store/types';

const weatherIcons: Record<string, typeof Sun> = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: Snowflake,
};

const conditionLabels: Record<string, string> = {
  clear: 'Klart',
  cloudy: 'Molnigt',
  rain: 'Regn',
  snow: 'Snö',
};

const conditionFeeling: Record<string, string> = {
  clear: 'Klart och fint',
  cloudy: 'Grått och lugnt',
  rain: 'Regnigt och fuktigt',
  snow: 'Snöigt och kallt',
};

interface Props {
  expanded?: boolean;
  size?: WidgetOverlaySize;
}

/** Generate demo hourly forecast data */
function generateHourlyForecast(temp: number, condition: string) {
  const hour = new Date().getHours();
  const conditions = ['clear', 'cloudy', 'rain', 'snow'];
  return Array.from({ length: 24 }, (_, i) => {
    const h = (hour + i) % 24;
    const variation = Math.sin(h * 0.3) * 3 + Math.sin(h * 0.7) * 1.5;
    return {
      hour: h,
      temp: Math.round(temp + variation),
      condition: i < 6 ? condition : conditions[Math.floor(Math.sin(i * 0.8) * 1.5 + 1.5) % 4],
    };
  });
}

function WeatherIcon({ condition, size = 24, className }: { condition: string; size?: number; className?: string }) {
  const Icon = weatherIcons[condition] ?? Sun;
  return <Icon size={size} strokeWidth={1.5} className={className} />;
}

export default function WeatherWidget({ expanded: forceExpanded, size = 'normal' }: Props) {
  const condition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);
  const windSpeed = useAppStore((s) => s.environment.weather.windSpeed);
  const humidity = useAppStore((s) => s.environment.weather.humidity);
  const forecast = useAppStore((s) => s.environment.forecast);

  const isExpanded = forceExpanded ?? false;

  // Time-of-day gradient
  const hour = new Date().getHours();
  const isDark = hour < 6 || hour > 20;
  const isSunset = hour >= 17 && hour <= 20;
  const timeGradient = isDark
    ? 'from-[#0a0a14] to-[#12121a]'
    : isSunset
    ? 'from-[#1a1520] to-[#12121a]'
    : 'from-[#141822] to-[#12121a]';

  // Expanded panel mode — full detail with 24h strip
  if (isExpanded) {
    const hourly = generateHourlyForecast(temperature, condition);

    return (
      <div className={cn('nn-widget p-5 w-full bg-gradient-to-br', timeGradient)}>
        {/* Hero: Nu-panel */}
        <div className="flex items-center gap-5 mb-4">
          <WeatherIcon condition={condition} size={48} className="text-[hsl(var(--section-weather))]" />
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold font-display text-foreground tracking-tight">{temperature}°</span>
              <span className="text-lg text-muted-foreground">C</span>
            </div>
            <p className="text-sm text-muted-foreground/80 mt-0.5">{conditionFeeling[condition] ?? condition}</p>
          </div>
          <div className="ml-auto flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Wind size={14} className="text-muted-foreground/60" />
              <span className="text-sm font-medium text-foreground">{windSpeed ?? 3.2} m/s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets size={14} className="text-muted-foreground/60" />
              <span className="text-sm font-medium text-foreground">{humidity ?? 62}%</span>
            </div>
          </div>
        </div>

        {/* 24h prognos-strip */}
        <div className="border-t border-border/20 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-muted-foreground/50" />
            <p className="label-micro">24-timmarsprognos</p>
          </div>
          <div className="flex gap-0 overflow-x-auto pb-1 -mx-1">
            {hourly.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center gap-0.5 min-w-[36px] md:min-w-[40px] px-1 py-1.5 rounded-lg transition-colors',
                    i === 0 && 'bg-[hsl(var(--section-weather))]/10'
                  )}
                >
                <span className="text-[9px] md:text-[10px] text-muted-foreground/50">
                  {i === 0 ? 'Nu' : `${String(h.hour).padStart(2, '0')}`}
                </span>
                <WeatherIcon condition={h.condition} size={16} className="text-muted-foreground/70" />
                <span className="text-[10px] md:text-xs font-semibold text-foreground">{h.temp}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day forecast */}
        {forecast && forecast.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/20">
            <p className="label-micro mb-2">Dagsprognos</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {forecast.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center gap-0.5 min-w-[52px] md:min-w-[60px] px-2 py-1.5 rounded-lg',
                    i === 0 && 'bg-[hsl(var(--section-weather))]/10'
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {i === 0 ? 'Idag' : day.day}
                  </span>
                  <WeatherIcon condition={day.condition} size={20} className="text-muted-foreground/70" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs font-semibold text-foreground">{day.maxTemp}°</span>
                    <span className="text-xs text-muted-foreground">{day.minTemp}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact overlay
  if (size === 'compact') {
    return (
      <div className="overlay-widget">
        <div className="flex items-center gap-1.5">
          <WeatherIcon condition={condition} size={16} className="text-[hsl(var(--section-weather))]" />
          <span className="text-lg font-bold font-display text-foreground">{temperature}°</span>
        </div>
      </div>
    );
  }

  // Expanded overlay
  if (size === 'expanded') {
    return (
      <div className="overlay-widget">
        <div className="flex items-center gap-2">
          <WeatherIcon condition={condition} size={20} className="text-[hsl(var(--section-weather))]" />
          <span className="text-xl font-bold font-display text-foreground">{temperature}°</span>
          <span className="text-xs text-muted-foreground/70">{conditionFeeling[condition] ?? condition}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1"><Wind size={10} /> {windSpeed ?? 3.2} m/s</span>
          <span className="flex items-center gap-1"><Droplets size={10} /> {humidity ?? 62}%</span>
        </div>
      </div>
    );
  }

  // Normal overlay — compact, typographic
  return (
    <div className="overlay-widget">
      <div className="flex items-center gap-2">
        <WeatherIcon condition={condition} size={20} className="text-[hsl(var(--section-weather))]" />
        <span className="text-xl font-bold font-display text-foreground">{temperature}°</span>
        <span className="text-xs text-muted-foreground/70">{conditionLabels[condition] ?? condition}</span>
      </div>
    </div>
  );
}
