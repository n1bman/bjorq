import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../lib/utils';

/** Side-by-side room temperature comparison with deviation indicators */
export default function ClimateRoomComparison() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const floors = useAppStore((s) => s.layout.floors);

  const roomNameMap: Record<string, string> = {};
  for (const floor of floors) {
    for (const room of floor.rooms) {
      roomNameMap[room.id] = room.name || 'Rum';
    }
  }

  const climateDevices = markers
    .filter((m) => m.kind === 'climate')
    .map((m) => {
      const s = deviceStates[m.id];
      if (s?.kind !== 'climate') return null;
      const roomName = m.roomId ? (roomNameMap[m.roomId] || m.name || 'Rum') : (m.name || 'Klimat');
      return {
        id: m.id,
        name: roomName,
        current: s.data.currentTemp,
        target: s.data.targetTemp,
        diff: s.data.currentTemp - s.data.targetTemp,
        on: s.data.on,
      };
    })
    .filter(Boolean) as { id: string; name: string; current: number; target: number; diff: number; on: boolean }[];

  if (climateDevices.length === 0) {
    return (
      <div className="nn-widget p-4">
        <p className="text-[10px] text-muted-foreground/50">Inga klimatenheter placerade. Placera climate-enheter i Design-läget.</p>
      </div>
    );
  }

  const minTemp = Math.min(...climateDevices.map((d) => Math.min(d.current, d.target))) - 1;
  const maxTemp = Math.max(...climateDevices.map((d) => Math.max(d.current, d.target))) + 1;
  const range = maxTemp - minTemp || 1;

  return (
    <div className="nn-widget p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">Rumsjämförelse</h4>
        <span className="text-[9px] text-muted-foreground/50">{climateDevices.length} rum</span>
      </div>

      <div className="space-y-2.5">
        {climateDevices.map((d) => {
          const currentPct = ((d.current - minTemp) / range) * 100;
          const targetPct = ((d.target - minTemp) / range) * 100;
          const isWarm = d.diff > 2;
          const isCold = d.diff < -2;

          return (
            <div key={d.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">{d.name}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-bold font-display',
                    isWarm ? 'text-orange-400' : isCold ? 'text-blue-400' : 'text-foreground'
                  )}>
                    {d.current.toFixed(1)}°
                  </span>
                  <span className="text-[9px] text-muted-foreground/50">→ {d.target}°</span>
                </div>
              </div>
              {/* Bar visualization */}
              <div className="relative h-2 rounded-full bg-surface-elevated overflow-hidden">
                {/* Target marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40 z-10"
                  style={{ left: `${targetPct}%` }}
                />
                {/* Current value bar */}
                <div
                  className={cn(
                    'absolute top-0 bottom-0 left-0 rounded-full transition-all duration-700',
                    isWarm ? 'bg-orange-400/70' : isCold ? 'bg-blue-400/70' : 'bg-primary/60'
                  )}
                  style={{ width: `${currentPct}%` }}
                />
              </div>
              {/* Deviation label */}
              {(isWarm || isCold) && (
                <p className={cn(
                  'text-[9px] font-medium',
                  isWarm ? 'text-orange-400/80' : 'text-blue-400/80'
                )}>
                  {isWarm ? `+${d.diff.toFixed(1)}° över mål` : `${d.diff.toFixed(1)}° under mål`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
