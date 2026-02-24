import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceMarker, DeviceState, DeviceKind } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChevronDown, Wifi, GripVertical } from 'lucide-react';
import DeviceControlCard from './DeviceControlCard';

const kindEmoji: Record<DeviceKind, string> = {
  light: '💡', switch: '🔌', sensor: '🌡️', climate: '❄️',
  vacuum: '🤖', camera: '📷', fridge: '🧊', oven: '🍳',
  washer: '🫧', 'garage-door': '🚗', 'door-lock': '🔒',
  'power-outlet': '🔌', media_screen: '📺',
  fan: '🌀', cover: '🪟', scene: '🎬',
};

function isOn(state?: DeviceState): boolean {
  if (!state) return false;
  if ('on' in state.data) return (state.data as any).on;
  if (state.kind === 'door-lock') return !state.data.locked;
  return false;
}

interface Props {
  category: string;
  categoryId?: string;
  devices: DeviceMarker[];
  span?: boolean;
  editMode?: boolean;
  onDropDevice?: (deviceId: string) => void;
  onDragCategoryStart?: () => void;
  onDropCategory?: () => void;
  categoryIndex?: number;
}

export default function CategoryCard({
  category, categoryId, devices, span, editMode,
  onDropDevice, onDragCategoryStart, onDropCategory,
}: Props) {
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragOverActive, setDragOverActive] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);

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

  const handleDeviceDragStart = useCallback((e: React.DragEvent, deviceId: string) => {
    e.dataTransfer.setData('device-id', deviceId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingDeviceId(deviceId);
  }, []);

  const handleCategoryDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('category-drag', 'true');
    e.dataTransfer.effectAllowed = 'move';
    onDragCategoryStart?.();
  }, [onDragCategoryStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('device-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverActive(true);
    } else if (e.dataTransfer.types.includes('category-drag')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverActive(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => setDragOverActive(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverActive(false);
    const deviceId = e.dataTransfer.getData('device-id');
    if (deviceId && onDropDevice) {
      onDropDevice(deviceId);
    }
    if (e.dataTransfer.getData('category-drag') && onDropCategory) {
      onDropCategory();
    }
  }, [onDropDevice, onDropCategory]);

  const handleDeviceTouchStart = useCallback((deviceId: string) => {
    if (!editMode) return;
    longPressTimer.current = setTimeout(() => {
      setDraggingDeviceId(deviceId);
    }, 600);
  }, [editMode]);

  const handleDeviceTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-3 transition-all',
        span && 'col-span-2',
        dragOverActive && 'ring-2 ring-primary/50 bg-primary/5',
        editMode && 'ring-1 ring-dashed ring-muted-foreground/30'
      )}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragLeave={editMode ? handleDragLeave : undefined}
      onDrop={editMode ? handleDrop : undefined}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer mb-1"
        draggable={editMode}
        onDragStart={editMode ? handleCategoryDragStart : undefined}
        onClick={() => !editMode && setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {editMode && <GripVertical size={12} className="text-muted-foreground shrink-0 cursor-grab" />}
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
            const isDragging = draggingDeviceId === d.id;

            return (
              <div
                key={d.id}
                draggable={editMode}
                onDragStart={editMode ? (e) => handleDeviceDragStart(e, d.id) : undefined}
                onDragEnd={() => setDraggingDeviceId(null)}
                onTouchStart={editMode ? () => handleDeviceTouchStart(d.id) : undefined}
                onTouchEnd={editMode ? handleDeviceTouchEnd : undefined}
                className={cn(
                  'rounded-lg transition-all',
                  expanded && 'bg-secondary/30 ring-1 ring-primary/20',
                  isDragging && 'opacity-50 scale-95',
                  editMode && 'cursor-grab hover:bg-secondary/20'
                )}
              >
                <div
                  className="flex items-center gap-2 py-1.5 px-2 cursor-pointer"
                  onClick={() => !editMode && setExpandedId(expanded ? null : d.id)}
                >
                  {editMode && <GripVertical size={10} className="text-muted-foreground/50 shrink-0" />}
                  <span className="text-sm">{emoji}</span>
                  <span className="text-xs text-foreground truncate flex-1">{d.name || d.kind}</span>

                  {!editMode && state?.kind === 'light' && state.data.on && !expanded && (
                    <div className="w-12" onClick={(e) => e.stopPropagation()}>
                      <Slider
                        value={[state.data.brightness]}
                        max={255} step={1}
                        onValueChange={([v]) => updateDeviceState(d.id, { brightness: v })}
                      />
                    </div>
                  )}

                  {!editMode && state && 'on' in state.data && state.kind !== 'sensor' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={on} onCheckedChange={(v) => updateDeviceState(d.id, { on: v })} className="scale-75" />
                    </div>
                  )}

                  {d.ha?.entityId && <Wifi size={8} className="text-primary/50 shrink-0" />}
                </div>

                {expanded && !editMode && (
                  <div className="px-2 pb-2 border-t border-border/20">
                    <DeviceControlCard marker={d} />
                  </div>
                )}
              </div>
            );
          })}
          {editMode && devices.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">Släpp enheter här</p>
          )}
        </div>
      )}
    </div>
  );
}
