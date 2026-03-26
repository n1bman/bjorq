import { useAppStore } from '../../store/useAppStore';
import { Sun, Cloud, CloudRain, Snowflake, CloudSun } from 'lucide-react';

const weatherIcons: Record<string, React.ReactNode> = {
  clear: <Sun size={36} className="text-yellow-400" />,
  cloudy: <Cloud size={36} className="text-gray-400" />,
  rain: <CloudRain size={36} className="text-blue-400" />,
  snow: <Snowflake size={36} className="text-sky-300" />,
};

const conditionLabels: Record<string, string> = {
  clear: 'Klart',
  cloudy: 'Molnigt',
  rain: 'Regn',
  snow: 'Snö',
};

export default function StandbyWeather() {
  const weather = useAppStore((s) => s.environment.weather);

  return (
    <div className="text-center">
      <p className="text-5xl font-bold text-foreground flex items-center justify-center gap-3" style={{ textShadow: '0 0 30px hsl(var(--primary) / 0.2)' }}>
        <span>{weatherIcons[weather.condition] || <CloudSun size={36} className="text-amber-300" />}</span>
        {Math.round(weather.temperature)}°C
      </p>
      <p className="text-lg text-muted-foreground mt-2">
        {conditionLabels[weather.condition] || weather.condition}
      </p>
      {weather.humidity !== undefined && (
        <p className="text-sm text-muted-foreground/60 mt-1">
          {weather.humidity}%
          {weather.windSpeed !== undefined && ` · ${weather.windSpeed} m/s`}
        </p>
      )}
    </div>
  );
}
