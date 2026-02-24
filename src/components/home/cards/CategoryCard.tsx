import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceMarker, DeviceState, DeviceKind } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChevronDown, Wifi } from 'lucide-react';
import DeviceControlCard from './DeviceControlCard';

const kindEmoji: Record<DeviceKind, string> = {
  light: '💡', switch: '🔌', sensor: '🌡️', climate: '❄️',
  vacuum: '🤖', camera: '📷', fridge: '🧊', oven: '🍳',
  washer: '🫧', 'garage-door': '🚗', 'door-lock': '🔒',
  'power-outlet': '🔌', media_screen: '📺',
};

function isOn(state?: DeviceState): boolean {
  if (!state) return false;
  if ('on' in state.data) return (state.data as any).on;
  if (state.kind === 'door-lock') return !state.data.locked;
  return false;
}

interface Props {
  category: string;
  devices: DeviceMarker[];
  span?: boolean;
}

export default function CategoryCard({ category, devices, span }: Props) {
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const onCount = devices.filter((d) => isOn(deviceStates[d.id])).length;
  const allOn = onCount === devices.length && devices.length > 0;

  const toggleAll = (on: boolean) => {
    for (const d of devices) {
      const state = deviceStates[d.id];
      if (!state) continue;
      if ('on' in state.data) updateDeviceState(d.id, { on });
      else if (state.kind === 'door-lock') updateDeviceState(d.id, { locked: !on });
    }
  };

  return (
    <div className={cn(
      'glass-panel rounded-2xl p-3 transition-all',
      span && 'col-span-2'
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer mb-1"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown size={12} className={cn(
            'text-muted-foreground transition-transform shrink-0',
            collapsed && '-rotate-90'
          )} />
          <span className="text-sm font-semibold text-foreground truncate">{category}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{onCount}/{devices.length}</span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch checked={allOn} onCheckedChange={toggleAll} className="scale-75" />
        </div>
      </div>

      {/* Compact device list */}
      {!collapsed && (
        <div className="space-y-1 mt-2">
          {devices.map((d) => {
            const state = deviceStates[d.id];
            const on = isOn(state);
            const expanded = expandedId === d.id;
            const emoji = kindEmoji[d.kind] || '⚙️';

            return (
              <div key={d.id} className={cn(
                'rounded-lg transition-all',
                expanded && 'bg-secondary/30 ring-1 ring-primary/20'
              )}>
                <div
                  className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : d.id)}
                >
                  <span className="text-sm">{emoji}</span>
                  <span className="text-xs text-foreground truncate flex-1">{d.name || d.kind}</span>

                  {state?.kind === 'light' && state.data.on && !expanded && (
                    <div className="w-12" onClick={(e) => e.stopPropagation()}>
                      <Slider
                        value={[state.data.brightness]}
                        max={255} step={1}
                        onValueChange={([v]) => updateDeviceState(d.id, { brightness: v })}
                      />
                    </div>
                  )}

                  {state && 'on' in state.data && state.kind !== 'sensor' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={on} onCheckedChange={(v) => updateDeviceState(d.id, { on: v })} className="scale-75" />
                    </div>
                  )}

                  {d.ha?.entityId && <Wifi size={8} className="text-primary/50 shrink-0" />}
                </div>

                {expanded && (
                  <div className="px-2 pb-2 border-t border-border/20">
                    <DeviceControlCard marker={d} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
