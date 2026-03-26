import { Home, Sun, CloudRain, Wind, Thermometer } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';

/** Analyzes weather impact on the home based on sun angle, windows and rooms */
export default function WeatherHomeImpact() {
  const condition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const windSpeed = useAppStore((s) => s.environment.weather.windSpeed);
  const floors = useAppStore((s) => s.layout.floors);

  const directions = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV'];
  const dirIdx = Math.round(((sunAzimuth % 360) + 360) % 360 / 45) % 8;
  const sunDirection = directions[dirIdx];

  const totalWindows = floors.reduce((sum, f) =>
    sum + f.walls.reduce((ws, w) => ws + w.openings.filter((o) => o.type === 'window').length, 0), 0
  );

  const impacts: { icon: typeof Sun; text: string; severity: 'info' | 'warn' | 'good' }[] = [];

  if (sunElevation > 10) {
    impacts.push({
      icon: Sun,
      text: `Sol från ${sunDirection} (${Math.round(sunElevation)}° elevation)`,
      severity: sunElevation > 40 ? 'warn' : 'info',
    });
    if (totalWindows > 0 && sunElevation > 20) {
      impacts.push({
        icon: Thermometer,
        text: `${totalWindows} fönster kan ge solinstrålning — rum mot ${sunDirection} värms`,
        severity: temperature > 25 ? 'warn' : 'good',
      });
    }
  } else {
    impacts.push({
      icon: Sun,
      text: 'Solen är under horisonten — ingen solinstrålning',
      severity: 'info',
    });
  }

  if (condition === 'rain') {
    impacts.push({ icon: CloudRain, text: 'Regn pågår — överväg att stänga fönster', severity: 'warn' });
  } else if (condition === 'snow') {
    impacts.push({ icon: CloudRain, text: 'Snöfall — kontrollera uppvärmning', severity: 'warn' });
  }

  if (windSpeed && windSpeed > 8) {
    impacts.push({ icon: Wind, text: `Kraftig vind (${windSpeed} m/s) — drag vid fönster möjligt`, severity: 'warn' });
  }

  if (temperature < 5) {
    impacts.push({ icon: Thermometer, text: `Kallt ute (${temperature}°C) — öka uppvärmning rekommenderas`, severity: 'warn' });
  } else if (temperature > 28) {
    impacts.push({ icon: Thermometer, text: `Varmt ute (${temperature}°C) — ventilation rekommenderas`, severity: 'warn' });
  }

  return (
    <div className="nn-widget p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Home size={14} className="text-[hsl(var(--section-weather))]" />
        <h4 className="text-xs font-semibold text-foreground">Påverkan på hemmet</h4>
      </div>
      <div className="space-y-2">
        {impacts.map((impact, i) => {
          const Icon = impact.icon;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <Icon size={13} className={
                impact.severity === 'warn' ? 'text-orange-400 mt-0.5 shrink-0'
                  : impact.severity === 'good' ? 'text-green-400 mt-0.5 shrink-0'
                  : 'text-muted-foreground mt-0.5 shrink-0'
              } />
              <p className="text-[11px] text-foreground/80 leading-relaxed">{impact.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
