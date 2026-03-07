import { useAppStore } from '../../../store/useAppStore';
import { Sun, Compass, ArrowUp, Lightbulb } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import { Button } from '../../ui/button';

export default function SunCalibrationPanel() {
  const source = useAppStore((s) => s.environment.source);
  const raw = useAppStore((s) => s.environment.sunCalibration);
  const cal = {
    northOffset: raw?.northOffset ?? 0,
    azimuthCorrection: raw?.azimuthCorrection ?? 0,
    elevationCorrection: raw?.elevationCorrection ?? 0,
    intensityMultiplier: raw?.intensityMultiplier ?? 1,
    indoorBounce: raw?.indoorBounce ?? 0,
  };
  const sunAz = useAppStore((s) => s.environment.sunAzimuth) ?? 0;
  const sunEl = useAppStore((s) => s.environment.sunElevation) ?? 0;
  const setCal = useAppStore((s) => s.setSunCalibration);
  const setWeatherSource = useAppStore((s) => s.setWeatherSource);

  const isLive = source === 'auto' || source === 'ha';

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <Sun size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Sol & Dagsljus</h3>
      </div>

      {/* Source toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-foreground">Live-synk</span>
          <p className="text-[10px] text-muted-foreground">Sol beräknas från plats och tid</p>
        </div>
        <Switch
          checked={isLive}
          onCheckedChange={(v) => setWeatherSource(v ? 'auto' : 'manual')}
        />
      </div>

      {/* Manual time override */}
      {!isLive && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground">Manuellt läge aktivt</p>
          <p className="text-[10px] text-muted-foreground">
            Solposition styrs av manuella väderdata. Aktivera live-synk för automatisk beräkning.
          </p>
        </div>
      )}

      {/* Current sun readout */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
        <div>
          <span className="text-[10px] text-muted-foreground">Azimut (beräknad)</span>
          <p className="text-sm font-mono text-foreground">{Math.round(sunAz)}°</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Elevation (beräknad)</span>
          <p className="text-sm font-mono text-foreground">{Math.round(sunEl)}°</p>
        </div>
      </div>

      {/* North Offset */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-muted-foreground" />
            <span className="text-sm text-foreground">Husets nordriktning</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{Math.round(cal.northOffset)}°</span>
        </div>
        <Slider
          value={[cal.northOffset]}
          min={0}
          max={360}
          step={5}
          onValueChange={([v]) => setCal({ northOffset: v })}
        />
        <p className="text-[9px] text-muted-foreground">Rotera solbanan så den matchar hur huset är orienterat.</p>
      </div>

      {/* Azimuth correction */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Azimut-korrigering</span>
          <span className="text-xs font-mono text-muted-foreground">{cal.azimuthCorrection > 0 ? '+' : ''}{cal.azimuthCorrection}°</span>
        </div>
        <Slider
          value={[cal.azimuthCorrection]}
          min={-30}
          max={30}
          step={1}
          onValueChange={([v]) => setCal({ azimuthCorrection: v })}
        />
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
        <Slider
          value={[cal.elevationCorrection]}
          min={-15}
          max={15}
          step={1}
          onValueChange={([v]) => setCal({ elevationCorrection: v })}
        />
      </div>

      {/* Intensity multiplier */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Solljusstyrka</span>
          <span className="text-xs font-mono text-muted-foreground">{cal.intensityMultiplier.toFixed(1)}×</span>
        </div>
        <Slider
          value={[cal.intensityMultiplier]}
          min={0}
          max={2}
          step={0.1}
          onValueChange={([v]) => setCal({ intensityMultiplier: v })}
        />
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
        <Slider
          value={[cal.indoorBounce]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={([v]) => setCal({ indoorBounce: v })}
        />
      </div>

      {/* Reset */}
      <Button
        size="sm"
        variant="outline"
        className="w-full h-8 text-xs"
        onClick={() => setCal({ northOffset: 0, azimuthCorrection: 0, elevationCorrection: 0, intensityMultiplier: 1.0, indoorBounce: 0 })}
      >
        Återställ kalibrering
      </Button>
    </div>
  );
}
