import { useAppStore } from '@/store/useAppStore';
import { Thermometer } from 'lucide-react';

export default function TemperatureWidget() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);

  // Calculate average indoor temperature from climate devices
  const climateDevices = markers.filter((m) => m.kind === 'climate');
  const temps = climateDevices
    .map((m) => {
      const s = deviceStates[m.id];
      if (s?.kind === 'climate') return s.data.currentTemp;
      return null;
    })
    .filter((t): t is number => t !== null);

  const avgTemp = temps.length > 0 ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null;

  return (
    <div className="glass-panel rounded-2xl px-4 py-3 min-w-[120px]">
      <div className="flex items-center gap-2">
        <Thermometer size={16} className="text-primary" />
        <div>
          <p className="text-lg font-bold text-foreground">
            {avgTemp !== null ? `${avgTemp}°C` : '--°C'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {avgTemp !== null ? 'Inomhus' : 'Lägg till klimatenhet'}
          </p>
        </div>
      </div>
    </div>
  );
}
