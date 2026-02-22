import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

const kindInfo: Record<DeviceKind, { emoji: string; label: string }> = {
  light: { emoji: '💡', label: 'Ljus' },
  switch: { emoji: '🔌', label: 'Knapp' },
  sensor: { emoji: '🌡️', label: 'Sensor' },
  climate: { emoji: '❄️', label: 'Klimat' },
  vacuum: { emoji: '🤖', label: 'Dammsugare' },
};

export default function DevicesSection() {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const [toggledOn, setToggledOn] = useState<Record<string, boolean>>({});

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
              const isOn = toggledOn[d.id] ?? (d.kind === 'light');
              return (
                <div key={d.id} className="glass-panel rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{info.label}</p>
                      {d.ha?.entityId && (
                        <p className="text-[10px] text-muted-foreground">{d.ha.entityId}</p>
                      )}
                    </div>
                  </div>
                  {(d.kind === 'light' || d.kind === 'switch') && (
                    <Switch
                      checked={isOn}
                      onCheckedChange={(v) => setToggledOn((prev) => ({ ...prev, [d.id]: v }))}
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
