import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Plus, Lightbulb, ToggleLeft, Thermometer, Wind, Bot, Trash2 } from 'lucide-react';
import type { DeviceKind } from '@/store/types';

const deviceKinds: { kind: DeviceKind; label: string; icon: typeof Lightbulb }[] = [
  { kind: 'light', label: 'Lampa', icon: Lightbulb },
  { kind: 'switch', label: 'Strömbrytare', icon: ToggleLeft },
  { kind: 'sensor', label: 'Sensor', icon: Thermometer },
  { kind: 'climate', label: 'Klimat', icon: Wind },
  { kind: 'vacuum', label: 'Robotdammsugare', icon: Bot },
];

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function DevicesOverlay() {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addDevice = (kind: DeviceKind) => {
    const newMarker = {
      id: generateId(),
      kind,
      floorId: activeFloorId || 'floor-1',
      surface: 'floor' as const,
      position: [0, 0.5, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    };
    useAppStore.getState().devices.markers.push(newMarker);
    useAppStore.setState((s) => ({
      devices: { markers: [...s.devices.markers] },
    }));
    setShowAddMenu(false);
  };

  const removeDevice = (id: string) => {
    useAppStore.setState((s) => ({
      devices: { markers: s.devices.markers.filter((m) => m.id !== id) },
    }));
  };

  const getKindInfo = (kind: DeviceKind) => deviceKinds.find((d) => d.kind === kind);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Right panel */}
      <div className="absolute top-3 right-3 pointer-events-auto">
        <div className="glass-panel rounded-xl p-3 w-60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Enheter</span>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showAddMenu ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add device menu */}
          {showAddMenu && (
            <div className="space-y-1 p-2 rounded-lg bg-secondary/30">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Lägg till enhet</span>
              {deviceKinds.map(({ kind, label, icon: Icon }) => (
                <button
                  key={kind}
                  onClick={() => addDevice(kind)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Icon size={14} className="text-muted-foreground" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Device list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {markers.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Inga enheter placerade ännu
              </p>
            )}
            {markers.map((marker) => {
              const info = getKindInfo(marker.kind);
              const Icon = info?.icon || Lightbulb;
              const floor = floors.find((f) => f.id === marker.floorId);
              return (
                <div
                  key={marker.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <Icon size={14} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{info?.label}</p>
                    <p className="text-[10px] text-muted-foreground">{floor?.name ?? 'Okänd våning'}</p>
                  </div>
                  {marker.ha?.entityId && (
                    <span className="text-[9px] text-accent bg-accent/10 px-1 py-0.5 rounded">HA</span>
                  )}
                  <button
                    onClick={() => removeDevice(marker.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground text-sm">Inga enheter placerade</p>
            <p className="text-muted-foreground/60 text-xs">Lägg till enheter via panelen till höger</p>
          </div>
        </div>
      )}
    </div>
  );
}
