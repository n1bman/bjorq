import { useAppStore } from '../../../store/useAppStore';
import { Sun, Compass, ArrowUp, Lightbulb, CloudRain, Cloud, Droplets, Wind } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ChevronRight } from 'lucide-react';
import React from 'react';
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

const CollapsibleSection = React.forwardRef<HTMLDivElement, { title: string; icon: typeof Sun; children: React.ReactNode }>(
  ({ title, icon: Icon, children }, ref) => (
    <Collapsible ref={ref}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        <ChevronRight size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-1 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
);
CollapsibleSection.displayName = 'CollapsibleSection';

export default function SunWeatherPanel() {
  const source = useAppStore((s) => s.environment.source);
  const haConnected = useAppStore((s) => s.homeAssistant.status === 'connected');
  const weather = useAppStore((s) => s.environment.weather);
  const precipOverride = useAppStore((s) => s.environment.precipitationOverride);
  const sunAz = useAppStore((s) => s.environment.sunAzimuth) ?? 0;
  const sunEl = useAppStore((s) => s.environment.sunElevation) ?? 0;

  const raw = useAppStore((s) => s.environment.sunCalibration);
  const cal = {
    northOffset: raw?.northOffset ?? 0,
    azimuthCorrection: raw?.azimuthCorrection ?? 0,
    elevationCorrection: raw?.elevationCorrection ?? 0,
    intensityMultiplier: raw?.intensityMultiplier ?? 1,
    indoorBounce: raw?.indoorBounce ?? 0,
  };

  const rawAtm = useAppStore((s) => s.environment.atmosphere);
  const atm = {
    fogEnabled: rawAtm?.fogEnabled ?? false,
    fogDensity: rawAtm?.fogDensity ?? 0.3,
    cloudinessAffectsLight: rawAtm?.cloudinessAffectsLight ?? true,
    dayNightTransition: rawAtm?.dayNightTransition ?? ('smooth' as const),
    atmosphereIntensity: rawAtm?.atmosphereIntensity ?? 1.0,
  };

  const setCal = useAppStore((s) => s.setSunCalibration);
  const setWeatherSource = useAppStore((s) => s.setWeatherSource);
  const setWeather = useAppStore((s) => s.setWeather);
  const setPrecipitationOverride = useAppStore((s) => s.setPrecipitationOverride);
  const setAtmosphere = useAppStore((s) => s.setAtmosphere);

  const isLive = source === 'auto' || source === 'ha';

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <Sun size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Sol & Väder</h3>
      </div>

      {/* Live sync toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-foreground">Live-synk</span>
            <p className="text-[10px] text-muted-foreground">Sol & väder beräknas från plats och tid</p>
          </div>
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
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Azimut</span>
            <p className="text-xs font-mono text-foreground">{Math.round(sunAz)}°</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Elevation</span>
            <p className="text-xs font-mono text-foreground">{Math.round(sunEl)}°</p>
          </div>
        </div>
      </div>

      {/* Manual weather picker */}
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

      {/* Calibration collapsible */}
      <CollapsibleSection title="Kalibrering" icon={Compass}>
        {/* North Offset */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Husets nordriktning</span>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(cal.northOffset)}°</span>
          </div>
          <Slider value={[cal.northOffset]} min={0} max={360} step={5}
            onValueChange={([v]) => setCal({ northOffset: v })} />
          <p className="text-[9px] text-muted-foreground">Rotera solbanan så den matchar hur huset är orienterat.</p>
        </div>

        {/* Azimuth correction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Azimut-korrigering</span>
            <span className="text-xs font-mono text-muted-foreground">{cal.azimuthCorrection > 0 ? '+' : ''}{cal.azimuthCorrection}°</span>
          </div>
          <Slider value={[cal.azimuthCorrection]} min={-30} max={30} step={1}
            onValueChange={([v]) => setCal({ azimuthCorrection: v })} />
        </div>

        {/* Elevation correction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUp size={14} className="text-muted-foreground" />
              <span className="text-sm text-foreground">Elevations-korrigering</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{cal.elevationCorrection > 0 ? '+' : ''}{cal.elevationCorrection}°</span>
          </div>
          <Slider value={[cal.elevationCorrection]} min={-15} max={15} step={1}
            onValueChange={([v]) => setCal({ elevationCorrection: v })} />
        </div>

        {/* Intensity multiplier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Solljusstyrka</span>
            <span className="text-xs font-mono text-muted-foreground">{cal.intensityMultiplier.toFixed(1)}×</span>
          </div>
          <Slider value={[cal.intensityMultiplier]} min={0} max={2} step={0.1}
            onValueChange={([v]) => setCal({ intensityMultiplier: v })} />
        </div>

        {/* Indoor bounce */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-muted-foreground" />
              <div>
                <span className="text-sm text-foreground">Inomhus fyllnadsljus</span>
                <p className="text-[10px] text-muted-foreground">Simulerar ljusstudsar inomhus</p>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{(cal.indoorBounce * 100).toFixed(0)}%</span>
          </div>
          <Slider value={[cal.indoorBounce]} min={0} max={1} step={0.05}
            onValueChange={([v]) => setCal({ indoorBounce: v })} />
        </div>

        {/* Reset calibration */}
        <Button size="sm" variant="outline" className="w-full h-8 text-xs"
          onClick={() => setCal({ northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1.0, indoorBounce: 0 })}>
          Återställ kalibrering
        </Button>
      </CollapsibleSection>

      {/* Atmosphere collapsible */}
      <CollapsibleSection title="Atmosfär" icon={CloudRain}>
        {/* Cloudiness affects light */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={14} className="text-muted-foreground" />
            <div>
              <span className="text-sm text-foreground">Moln påverkar ljus</span>
              <p className="text-[10px] text-muted-foreground">Dämpar solljus vid mulet väder</p>
            </div>
          </div>
          <Switch checked={atm.cloudinessAffectsLight}
            onCheckedChange={(v) => setAtmosphere({ cloudinessAffectsLight: v })} />
        </div>

        {/* Fog */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind size={14} className="text-muted-foreground" />
              <span className="text-sm text-foreground">Dimma / dis</span>
            </div>
            <Switch checked={atm.fogEnabled}
              onCheckedChange={(v) => setAtmosphere({ fogEnabled: v })} />
          </div>
          {atm.fogEnabled && (
            <div className="pl-6 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Densitet</span>
                <span className="text-xs font-mono text-muted-foreground">{(atm.fogDensity * 100).toFixed(0)}%</span>
              </div>
              <Slider value={[atm.fogDensity]} min={0} max={1} step={0.05}
                onValueChange={([v]) => setAtmosphere({ fogDensity: v })} />
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
          <Slider value={[atm.atmosphereIntensity]} min={0} max={2} step={0.1}
            onValueChange={([v]) => setAtmosphere({ atmosphereIntensity: v })} />
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
      </CollapsibleSection>
    </div>
  );
}
