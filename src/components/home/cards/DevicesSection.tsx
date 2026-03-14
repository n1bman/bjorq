import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { DeviceKind, DeviceState, DeviceMarker } from '../../../store/types';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { cn } from '../../../lib/utils';
import { ChevronDown, Wifi, Link2, Unlink } from 'lucide-react';
import DeviceControlCard from './DeviceControlCard';
import HAEntityPicker from '../../build/devices/HAEntityPicker';

const kindInfo: Record<DeviceKind, { emoji: string; label: string; category: string }> = {
  light: { emoji: '💡', label: 'Ljus', category: 'Ljus' },
  switch: { emoji: '🔌', label: 'Knapp', category: 'Ljus' },
  sensor: { emoji: '🌡️', label: 'Sensor', category: 'Sensorer' },
  climate: { emoji: '❄️', label: 'Klimat', category: 'Klimat' },
  vacuum: { emoji: '🤖', label: 'Dammsugare', category: 'Hem' },
  camera: { emoji: '📷', label: 'Kamera', category: 'Säkerhet' },
  fridge: { emoji: '🧊', label: 'Kylskåp', category: 'Vitvaror' },
  oven: { emoji: '🍳', label: 'Ugn', category: 'Vitvaror' },
  washer: { emoji: '🫧', label: 'Tvättmaskin', category: 'Vitvaror' },
  'garage-door': { emoji: '🚗', label: 'Garageport', category: 'Säkerhet' },
  'door-lock': { emoji: '🔒', label: 'Dörrlås', category: 'Säkerhet' },
  'power-outlet': { emoji: '🔌', label: 'Eluttag', category: 'Ljus' },
  media_screen: { emoji: '📺', label: 'Skärm', category: 'Media' },
  fan: { emoji: '🌀', label: 'Fläkt', category: 'Klimat' },
  cover: { emoji: '🪟', label: 'Persienn', category: 'Hem' },
  scene: { emoji: '🎬', label: 'Scen', category: 'Automation' },
  alarm: { emoji: '🚨', label: 'Larm', category: 'Säkerhet' },
  'water-heater': { emoji: '🔥', label: 'Varmvatten', category: 'Klimat' },
  humidifier: { emoji: '💧', label: 'Luftfuktare', category: 'Klimat' },
  siren: { emoji: '🔔', label: 'Siren', category: 'Säkerhet' },
  valve: { emoji: '🔧', label: 'Ventil', category: 'Hem' },
  remote: { emoji: '📡', label: 'Fjärr', category: 'Media' },
  'lawn-mower': { emoji: '🌿', label: 'Gräsklippare', category: 'Hem' },
  speaker: { emoji: '🔊', label: 'Högtalare', category: 'Media' },
  soundbar: { emoji: '🎵', label: 'Soundbar', category: 'Media' },
  'light-fixture': { emoji: '💡', label: 'Ljusarmatur', category: 'Ljus' },
  'smart-outlet': { emoji: '🔌', label: 'Vägguttag', category: 'Ljus' },
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

function getDeviceCategory(d: DeviceMarker): string {
  return d.userCategory || kindInfo[d.kind]?.category || 'Övrigt';
}

interface DevicesSectionProps {
  filter?: DeviceKind | null;
  groupBy?: 'room' | 'category';
}

export default function DevicesSection({ filter, groupBy = 'room' }: DevicesSectionProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = filter ? markers.filter((m) => m.kind === filter) : markers;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Inga enheter placerade ännu</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Gå till Design → Inredning → Enheter för att placera</p>
      </div>
    );
  }

  // Group devices
  const grouped: Record<string, typeof filtered> = {};
  for (const m of filtered) {
    let key: string;
    if (groupBy === 'category') {
      key = getDeviceCategory(m);
    } else {
      const floor = floors.find((f) => f.id === m.floorId);
      const room = floor?.rooms.find((r) => r.id === m.roomId);
      key = room ? room.name : (floor?.name ?? 'Okänd');
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAllInGroup = (devices: typeof filtered, on: boolean) => {
    for (const d of devices) {
      const state = deviceStates[d.id];
      if (!state) continue;
      if ('on' in state.data) {
        updateDeviceState(d.id, { on });
      } else if (state.kind === 'door-lock') {
        updateDeviceState(d.id, { locked: !on });
      }
    }
  };

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([groupName, devices]) => {
        const collapsed = collapsedGroups.has(groupName);
        const onCount = devices.filter((d) => isDeviceOn(deviceStates[d.id])).length;
        const allOn = onCount === devices.length;

        return (
          <div key={groupName}>
            {/* Group header */}
            <div
              className="flex items-center justify-between mb-2 cursor-pointer"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center gap-2">
                <ChevronDown size={12} className={cn(
                  'text-muted-foreground transition-transform',
                  collapsed && '-rotate-90'
                )} />
                <p className="text-xs font-medium text-muted-foreground">{groupName}</p>
                <span className="text-[10px] text-muted-foreground/60">{onCount}/{devices.length} på</span>
              </div>
              {groupBy === 'category' && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={allOn}
                    onCheckedChange={(v) => toggleAllInGroup(devices, v)}
                    className="scale-90"
                  />
                </div>
              )}
            </div>

            {/* Device cards */}
            {!collapsed && (
              <div className="space-y-2.5">
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
                          {state?.kind === 'light' && state.data.on && !expanded && (
                            <div className="w-20" onClick={(e) => e.stopPropagation()}>
                              <Slider
                                value={[state.data.brightness]}
                                max={255}
                                step={1}
                                onValueChange={([v]) => updateDeviceState(d.id, { brightness: v })}
                                className="w-full"
                              />
                            </div>
                          )}

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

                      {expanded && (
                        <div className="px-3 pb-3 border-t border-border/30 space-y-2">
                          <DeviceControlCard marker={d} />
                          
                          {/* C1: Edit HA entity mapping */}
                          <div className="border-t border-border/30 pt-2">
                            {mappingId === d.id ? (
                              <div className="space-y-1.5">
                                <HAEntityPicker
                                  deviceId={d.id}
                                  kind={d.kind}
                                  currentEntityId={d.ha?.entityId}
                                  onSelect={(entityId) => {
                                    updateDevice(d.id, { ha: { entityId } });
                                    setMappingId(null);
                                  }}
                                  onClear={() => {
                                    updateDevice(d.id, { ha: undefined } as any);
                                    setMappingId(null);
                                  }}
                                />
                                <button
                                  className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => setMappingId(null)}
                                >
                                  Stäng
                                </button>
                              </div>
                            ) : (
                              <button
                                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setMappingId(d.id)}
                              >
                                {d.ha?.entityId ? (
                                  <>
                                    <Link2 size={10} className="text-primary/60" />
                                    <span className="truncate max-w-[150px]">{d.ha.entityId}</span>
                                    <span className="text-muted-foreground/50">· Ändra</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlink size={10} />
                                    Koppla HA-entitet
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
