import { useAppStore } from '../../../store/useAppStore';
import { Thermometer } from 'lucide-react';

export default function TemperatureWidget() {
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

  // Overlay mode — compact typographic
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
