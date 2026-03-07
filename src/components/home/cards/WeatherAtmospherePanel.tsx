import { useAppStore } from '../../../store/useAppStore';
import { CloudRain, Cloud, Droplets, Wind } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import type { PrecipitationOverride, WeatherCondition } from '../../../store/types';

const weatherOptions: { key: WeatherCondition; label: string; emoji: string }[] = [
  { key: 'clear', label: 'Klart', emoji: '☀️' },
  { key: 'cloudy', label: 'Mulet', emoji: '☁️' },
  { key: 'rain', label: 'Regn', emoji: '🌧️' },
  { key: 'snow', label: 'Snö', emoji: '❄️' },
];

const precipOptions: { key: PrecipitationOverride; label: string; emoji: string }[] = [
  { key: 'auto', label: 'Auto', emoji: '🌤️' },
  { key: 'rain', label: 'Regn', emoji: '🌧️' },
  { key: 'snow', label: 'Snö', emoji: '❄️' },
  { key: 'off', label: 'Av', emoji: '🚫' },
];

export default function WeatherAtmospherePanel() {
  const source = useAppStore((s) => s.environment.source);
  const haConnected = useAppStore((s) => s.homeAssistant.status === 'connected');
  const weather = useAppStore((s) => s.environment.weather);
  const precipOverride = useAppStore((s) => s.environment.precipitationOverride);
  const atm = useAppStore((s) => s.environment.atmosphere) ?? { fogEnabled: false, fogDensity: 0.3, cloudinessAffectsLight: true, dayNightTransition: 'smooth' as const, atmosphereIntensity: 1.0 };
  const setWeatherSource = useAppStore((s) => s.setWeatherSource);
  const setWeather = useAppStore((s) => s.setWeather);
  const setPrecipitationOverride = useAppStore((s) => s.setPrecipitationOverride);
  const setAtmosphere = useAppStore((s) => s.setAtmosphere);

  const isLive = source === 'auto' || source === 'ha';

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <CloudRain size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Väder & Atmosfär</h3>
      </div>

      {/* Weather source */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Live väder</span>
          <Switch
            checked={isLive}
            onCheckedChange={(v) => setWeatherSource(v ? 'auto' : 'manual')}
          />
        </div>
        {isLive && haConnected && (
          <div className="flex items-center justify-between pl-2">
            <span className="text-[10px] text-muted-foreground">Använd HA-väder</span>
            <Switch
              checked={source === 'ha'}
              onCheckedChange={(v) => setWeatherSource(v ? 'ha' : 'auto')}
            />
          </div>
        )}
      </div>

      {/* Current weather readout */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Aktuellt</span>
          <span className="text-xs font-medium text-foreground">
            {weather.condition === 'clear' ? '☀️ Klart' : weather.condition === 'cloudy' ? '☁️ Mulet' : weather.condition === 'rain' ? '🌧️ Regn' : '❄️ Snö'}
            {weather.temperature !== undefined && ` · ${weather.temperature}°C`}
          </span>
        </div>
      </div>

      {/* Manual weather picker (when not live) */}
      {!isLive && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Manuellt väder</span>
          <div className="flex gap-1">
            {weatherOptions.map(({ key, label, emoji }) => (
              <Button key={key} size="sm"
                variant={weather.condition === key ? 'default' : 'outline'}
                className="flex-1 h-8 text-[10px] gap-1"
                onClick={() => setWeather(key)}>
                <span>{emoji}</span>{label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Precipitation override */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Nederbördseffekt i 3D</span>
        <div className="flex gap-1">
          {precipOptions.map(({ key, label, emoji }) => (
            <Button key={key} size="sm"
              variant={precipOverride === key ? 'default' : 'outline'}
              className="flex-1 h-8 text-[10px] gap-1"
              onClick={() => setPrecipitationOverride(key)}>
              <span>{emoji}</span>{label}
            </Button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground">Auto följer väderdata. Välj Regn/Snö för att tvinga effekt.</p>
      </div>

      {/* Cloudiness affects light */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-muted-foreground" />
          <div>
            <span className="text-sm text-foreground">Moln påverkar ljus</span>
            <p className="text-[10px] text-muted-foreground">Dämpar solljus vid mulet väder</p>
          </div>
        </div>
        <Switch
          checked={atm.cloudinessAffectsLight}
          onCheckedChange={(v) => setAtmosphere({ cloudinessAffectsLight: v })}
        />
      </div>

      {/* Fog */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind size={14} className="text-muted-foreground" />
            <span className="text-sm text-foreground">Dimma / dis</span>
          </div>
          <Switch
            checked={atm.fogEnabled}
            onCheckedChange={(v) => setAtmosphere({ fogEnabled: v })}
          />
        </div>
        {atm.fogEnabled && (
          <div className="pl-6 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Densitet</span>
              <span className="text-xs font-mono text-muted-foreground">{(atm.fogDensity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[atm.fogDensity]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => setAtmosphere({ fogDensity: v })}
            />
          </div>
        )}
      </div>

      {/* Atmosphere intensity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={14} className="text-muted-foreground" />
            <span className="text-sm text-foreground">Atmosfärsintensitet</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{atm.atmosphereIntensity.toFixed(1)}×</span>
        </div>
        <Slider
          value={[atm.atmosphereIntensity]}
          min={0}
          max={2}
          step={0.1}
          onValueChange={([v]) => setAtmosphere({ atmosphereIntensity: v })}
        />
      </div>

      {/* Day/Night transition */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Dag/natt-övergång</span>
        <div className="flex gap-1">
          <Button size="sm" variant={atm.dayNightTransition === 'smooth' ? 'default' : 'outline'}
            className="h-7 text-[10px]"
            onClick={() => setAtmosphere({ dayNightTransition: 'smooth' })}>
            Mjuk
          </Button>
          <Button size="sm" variant={atm.dayNightTransition === 'instant' ? 'default' : 'outline'}
            className="h-7 text-[10px]"
            onClick={() => setAtmosphere({ dayNightTransition: 'instant' })}>
            Direkt
          </Button>
        </div>
      </div>
    </div>
  );
}
