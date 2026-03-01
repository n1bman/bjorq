import { useAppStore } from '../../store/useAppStore';

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

export default function StandbyWeather() {
  const weather = useAppStore((s) => s.environment.weather);

  return (
    <div className="text-center">
      <p className="text-5xl font-bold text-foreground" style={{ textShadow: '0 0 30px hsl(var(--primary) / 0.2)' }}>
        <span className="mr-3">{weatherIcons[weather.condition] || '🌤️'}</span>
        {Math.round(weather.temperature)}°C
      </p>
      <p className="text-lg text-muted-foreground mt-2">
        {conditionLabels[weather.condition] || weather.condition}
      </p>
      {weather.humidity !== undefined && (
        <p className="text-sm text-muted-foreground/60 mt-1">
          💧 {weather.humidity}%
          {weather.windSpeed !== undefined && ` · 💨 ${weather.windSpeed} m/s`}
        </p>
      )}
    </div>
  );
}
