import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, DeviceState } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChevronDown, Wifi } from 'lucide-react';
import DeviceControlCard from './DeviceControlCard';

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

function isDeviceOn(state?: DeviceState): boolean {
  if (!state) return false;
  if ('on' in state.data) return (state.data as any).on;
  if (state.kind === 'door-lock') return !state.data.locked;
  return false;
}

function getQuickInfo(state?: DeviceState): string | null {
  if (!state) return null;
  switch (state.kind) {
    case 'light': return state.data.on ? `${Math.round((state.data.brightness / 255) * 100)}%` : 'Av';
    case 'climate': return state.data.on ? `${state.data.targetTemp}°C` : 'Av';
    case 'media_screen': return state.data.state !== 'off' && state.data.state !== 'idle' ? state.data.title ?? state.data.state : null;
    case 'vacuum': return state.data.status === 'cleaning' ? 'Städar' : state.data.status === 'docked' ? 'Dockad' : state.data.status;
    case 'door-lock': return state.data.locked ? 'Låst' : 'Olåst';
    case 'sensor': return `${state.data.value} ${state.data.unit}`;
    default: return null;
  }
}

export default function DevicesSection({ filter }: { filter?: DeviceKind | null }) {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter ? markers.filter((m) => m.kind === filter) : markers;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Inga enheter placerade ännu</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Gå till Bygge → Enheter för att placera</p>
      </div>
    );
  }

  // Group by room first, then floor
  const grouped: Record<string, typeof filtered> = {};
  for (const m of filtered) {
    const floor = floors.find((f) => f.id === m.floorId);
    const room = floor?.rooms.find((r) => r.id === m.roomId);
    const key = room ? `${room.name}` : (floor?.name ?? 'Okänd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([groupName, devices]) => (
        <div key={groupName}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{groupName}</p>
          <div className="space-y-2">
            {devices.map((d) => {
              const info = kindInfo[d.kind];
              if (!info) return null;
              const state = deviceStates[d.id];
              const on = isDeviceOn(state);
              const quickInfo = getQuickInfo(state);
              const expanded = expandedId === d.id;

              return (
                <div
                  key={d.id}
                  className={cn(
                    'rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm transition-all',
                    expanded && 'ring-1 ring-primary/30'
                  )}
                >
                  {/* Collapsed row */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-lg">{info.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">{d.name || info.label}</p>
                          {d.ha?.entityId && (
                            <Wifi size={10} className="text-primary/60 shrink-0" />
                          )}
                        </div>
                        {quickInfo && (
                          <p className="text-[10px] text-muted-foreground">{quickInfo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick brightness slider for lights */}
                      {state?.kind === 'light' && state.data.on && !expanded && (
                        <div className="w-16" onClick={(e) => e.stopPropagation()}>
                          <Slider
                            value={[state.data.brightness]}
                            max={255}
                            step={1}
                            onValueChange={([v]) => updateDeviceState(d.id, { brightness: v })}
                            className="w-full"
                          />
                        </div>
                      )}

                      {/* Quick toggle for toggleable devices */}
                      {state && 'on' in state.data && state.kind !== 'sensor' && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={on}
                            onCheckedChange={(v) => updateDeviceState(d.id, { on: v })}
                          />
                        </div>
                      )}

                      <ChevronDown size={14} className={cn(
                        'text-muted-foreground transition-transform',
                        expanded && 'rotate-180'
                      )} />
                    </div>
                  </div>

                  {/* Expanded controls */}
                  {expanded && (
                    <div className="px-3 pb-3 border-t border-border/30">
                      <DeviceControlCard marker={d} />
                    </div>
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
