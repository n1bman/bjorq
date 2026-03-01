import { useAppStore } from '../../../store/useAppStore';
import { Thermometer } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';

export default function TemperatureWidget() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const [expanded, setExpanded] = useState(false);

  const climateDevices = markers.filter((m) => m.kind === 'climate');
  const deviceTemps = climateDevices.map((m) => {
    const s = deviceStates[m.id];
    if (s?.kind === 'climate') return { name: m.name || 'Klimat', temp: s.data.currentTemp, target: s.data.targetTemp, on: s.data.on };
    return null;
  }).filter(Boolean) as { name: string; temp: number; target: number; on: boolean }[];

  const temps = deviceTemps.map((d) => d.temp);
  const avgTemp = temps.length > 0 ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null;

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl px-5 py-4 cursor-pointer transition-all duration-300',
        expanded ? 'min-w-[200px]' : 'min-w-[120px] max-w-[160px]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <Thermometer size={18} className="text-primary shrink-0" />
        <div>
          <p className="text-2xl font-bold text-foreground">
            {avgTemp !== null ? `${avgTemp}°C` : '--°C'}
          </p>
          <p className="text-xs text-muted-foreground">
            {avgTemp !== null ? 'Inomhus' : 'Lägg till klimatenhet'}
          </p>
        </div>
      </div>
      {expanded && deviceTemps.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30 space-y-1.5">
          {deviceTemps.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[11px] text-foreground truncate">{d.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {d.temp}° → {d.target}° {d.on ? '🔥' : '⏸'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
