import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind } from '@/store/types';
import { Switch } from '@/components/ui/switch';

const kindInfo: Record<DeviceKind, { emoji: string; label: string }> = {
  light: { emoji: '💡', label: 'Ljus' },
  switch: { emoji: '🔌', label: 'Knapp' },
  sensor: { emoji: '🌡️', label: 'Sensor' },
  climate: { emoji: '❄️', label: 'Klimat' },
  vacuum: { emoji: '🤖', label: 'Dammsugare' },
  camera: { emoji: '📷', label: 'Kamera' },
  fridge: { emoji: '🧊', label: 'Kylskåp' },
  oven: { emoji: '🍳', label: 'Ugn' },
  washer: { emoji: '🫧', label: 'Tvättmaskin' },
  'garage-door': { emoji: '🚗', label: 'Garageport' },
  'door-lock': { emoji: '🔒', label: 'Dörrlås' },
  'power-outlet': { emoji: '🔌', label: 'Eluttag' },
  media_screen: { emoji: '📺', label: 'Skärm' },
};

export default function DevicesSection() {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const setDeviceState = useAppStore((s) => s.setDeviceState);

  if (markers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Inga enheter placerade ännu</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Gå till Bygge → Enheter för att placera</p>
      </div>
    );
  }

  // Group by floor
  const grouped = markers.reduce((acc, m) => {
    const floor = floors.find((f) => f.id === m.floorId);
    const key = floor?.name ?? 'Okänd våning';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, typeof markers>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([floorName, devices]) => (
        <div key={floorName}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{floorName}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {devices.map((d) => {
              const info = kindInfo[d.kind];
              if (!info) return null;
              const isOn = deviceStates[d.id] ?? (d.kind === 'light');
              const isScreen = d.kind === 'media_screen';
              return (
                <div key={d.id} className="glass-panel rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name || info.label}</p>
                      {d.ha?.entityId && (
                        <p className="text-[10px] text-muted-foreground">{d.ha.entityId}</p>
                      )}
                      {isScreen && d.ha?.entityId && (
                        <p className="text-[10px] text-muted-foreground/80">📺 Media-skärm bunden</p>
                      )}
                    </div>
                  </div>
                  {(d.kind === 'light' || d.kind === 'switch' || d.kind === 'power-outlet') && (
                    <Switch
                      checked={isOn}
                      onCheckedChange={(v) => setDeviceState(d.id, v)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
