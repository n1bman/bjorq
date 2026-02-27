import { useAppStore } from '@/store/useAppStore';

export default function StandbyWidgets() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);

  const climateDevices = markers.filter((m) => m.kind === 'climate');
  const temps = climateDevices.map((m) => {
    const s = deviceStates[m.id];
    if (s?.kind === 'climate') return { name: m.name || 'Klimat', temp: s.data.currentTemp, on: s.data.on };
    return null;
  }).filter(Boolean) as { name: string; temp: number; on: boolean }[];

  const lightsOn = markers.filter((m) => {
    const s = deviceStates[m.id];
    return m.kind === 'light' && s?.kind === 'light' && s.data.on;
  }).length;

  const totalLights = markers.filter((m) => m.kind === 'light').length;

  return (
    <div className="space-y-4">
      {totalLights > 0 && (
        <div className="glass-panel-soft rounded-2xl px-5 py-4">
          <p className="text-sm text-muted-foreground mb-1">💡 Belysning</p>
          <p className="text-2xl font-bold text-foreground">
            {lightsOn} / {totalLights} <span className="text-sm font-normal text-muted-foreground">tända</span>
          </p>
        </div>
      )}
      {temps.length > 0 && (
        <div className="glass-panel-soft rounded-2xl px-5 py-4">
          <p className="text-sm text-muted-foreground mb-2">🌡️ Temperatur</p>
          <div className="space-y-1.5">
            {temps.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{d.name}</span>
                <span className="text-lg font-semibold text-foreground">{d.temp}°C</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
