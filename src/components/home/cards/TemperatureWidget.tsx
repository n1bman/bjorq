import { useAppStore } from '../../../store/useAppStore';
import { Thermometer } from 'lucide-react';
import type { WidgetOverlaySize } from '../../../store/types';

interface Props {
  size?: WidgetOverlaySize;
}

export default function TemperatureWidget({ size = 'normal' }: Props) {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);

  const climateDevices = markers.filter((m) => m.kind === 'climate');
  const deviceTemps = climateDevices.map((m) => {
    const s = deviceStates[m.id];
    if (s?.kind === 'climate') return { name: m.name || 'Klimat', temp: s.data.currentTemp, target: s.data.targetTemp, on: s.data.on };
    return null;
  }).filter(Boolean) as { name: string; temp: number; target: number; on: boolean }[];

  const temps = deviceTemps.map((d) => d.temp);
  const avgTemp = temps.length > 0 ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null;

  // Compact
  if (size === 'compact') {
    return (
      <div className="overlay-widget">
        <span className="text-lg font-bold font-display text-foreground">
          {avgTemp !== null ? `${avgTemp}°` : '--°'}
        </span>
      </div>
    );
  }

  // Expanded
  if (size === 'expanded') {
    return (
      <div className="overlay-widget">
        <div className="flex items-center gap-2">
          <Thermometer size={14} className="text-primary shrink-0" />
          <span className="text-xl font-bold font-display text-foreground">
            {avgTemp !== null ? `${avgTemp}°` : '--°'}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {avgTemp !== null ? 'Inomhus' : 'Ej konfigurerad'}
          </span>
        </div>
        {deviceTemps.length > 1 && (
          <div className="mt-1.5 space-y-0.5">
            {deviceTemps.slice(0, 4).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground/60">{d.name}</span>
                <span className="text-foreground/80">{d.temp}° → {d.target}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Normal overlay — compact typographic
  return (
    <div className="overlay-widget">
      <div className="flex items-center gap-2">
        <Thermometer size={14} className="text-primary shrink-0" />
        <span className="text-xl font-bold font-display text-foreground">
          {avgTemp !== null ? `${avgTemp}°` : '--°'}
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          {avgTemp !== null ? 'Inomhus' : 'Ej konfigurerad'}
        </span>
      </div>
    </div>
  );
}
