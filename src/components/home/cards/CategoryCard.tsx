import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { DeviceMarker, DeviceState, DeviceKind } from '../../../store/types';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { cn } from '../../../lib/utils';
import { ChevronDown, Wifi, GripVertical, Lightbulb, Thermometer, Wind, Camera, Power, Tv, Fan, Shield, Droplets, Lock, Car, Zap } from 'lucide-react';
import DeviceControlCard from './DeviceControlCard';

const KIND_ICONS: Partial<Record<DeviceKind, typeof Lightbulb>> = {
  light: Lightbulb, switch: Power, sensor: Thermometer, climate: Wind,
  vacuum: Zap, camera: Camera, 'power-outlet': Power, media_screen: Tv,
  fan: Fan, alarm: Shield, humidifier: Droplets, 'door-lock': Lock,
  'garage-door': Car, 'light-fixture': Lightbulb, 'smart-outlet': Power,
  speaker: Tv, soundbar: Tv,
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

  const LIGHT_DEVICE_KINDS = new Set(['light', 'light-fixture']);
  const lightDevices = devices.filter((d) => LIGHT_DEVICE_KINDS.has(d.kind));
  const hasLights = lightDevices.length > 0;
  const avgBrightness = hasLights
    ? Math.round(lightDevices.reduce((sum, d) => {
        const st = deviceStates[d.id];
        return sum + (st?.kind === 'light' ? (st.data.brightness ?? 200) : 200);
      }, 0) / lightDevices.length)
    : 0;

  const toggleAll = (on: boolean) => {
    for (const d of devices) {
      const state = deviceStates[d.id];
      if (!state) continue;
      if ('on' in state.data) updateDeviceState(d.id, { on });
      else if (state.kind === 'door-lock') updateDeviceState(d.id, { locked: !on });
    }
  };

  // Extract category display name (remove emoji prefix if present)
  const displayName = category.replace(/^[\p{Emoji}\s]+/u, '').trim() || category;

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
    if (e.dataTransfer.types.includes('device-id') || e.dataTransfer.types.includes('category-drag')) {
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
    if (deviceId && onDropDevice) onDropDevice(deviceId);
    if (e.dataTransfer.getData('category-drag') && onDropCategory) onDropCategory();
  }, [onDropDevice, onDropCategory]);

  const handleDeviceTouchStart = useCallback((deviceId: string) => {
    if (!editMode) return;
    longPressTimer.current = setTimeout(() => setDraggingDeviceId(deviceId), 600);
  }, [editMode]);

  const handleDeviceTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Determine primary icon for category
  const primaryKind = devices[0]?.kind;
  const CategoryIcon = (primaryKind && KIND_ICONS[primaryKind]) || Lightbulb;

  return (
    <div
      className={cn(
        'nn-widget nn-widget-hover p-4 transition-all',
        span && 'col-span-2',
        dragOverActive && 'ring-2 ring-primary/40',
        editMode && 'ring-1 ring-dashed ring-muted-foreground/20'
      )}
      style={{ maxHeight: '320px', display: 'flex', flexDirection: 'column' }}
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
        <div className="flex items-center gap-2.5 min-w-0">
          {editMode && <GripVertical size={12} className="text-muted-foreground/40 shrink-0 cursor-grab" />}
          <CategoryIcon size={16} className={cn('shrink-0', onCount > 0 ? 'text-primary' : 'text-muted-foreground/50')} />
          <ChevronDown size={10} className={cn(
            'text-muted-foreground/40 transition-transform shrink-0',
            collapsed && '-rotate-90'
          )} />
          <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
          <span className="text-[10px] text-muted-foreground/50 shrink-0">{onCount}/{devices.length}</span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {hasLights && allOn && (
            <div className="w-16 shrink-0">
              <Slider
                value={[avgBrightness]}
                max={255}
                step={1}
                onValueChange={([v]) => {
                  for (const d of lightDevices) {
                    const st = deviceStates[d.id];
                    if (st?.kind === 'light' && st.data.on) {
                      updateDeviceState(d.id, { brightness: v });
                    }
                  }
                }}
              />
            </div>
          )}
          <Switch checked={allOn} onCheckedChange={toggleAll} className="scale-90" />
        </div>
      </div>

      {/* Device list */}
      {!collapsed && (
        <div className="space-y-0.5 mt-2 overflow-y-auto flex-1 min-h-0">
          {devices.map((d) => {
            const state = deviceStates[d.id];
            const on = isOn(state);
            const expanded = expandedId === d.id;
            const isDragging = draggingDeviceId === d.id;
            const DevIcon = KIND_ICONS[d.kind] || Power;

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
                  expanded && 'bg-surface-elevated/50 ring-1 ring-primary/15',
                  isDragging && 'opacity-50 scale-95',
                  editMode && 'cursor-grab hover:bg-surface-elevated/30'
                )}
              >
                <div
                  className="flex items-center gap-2.5 py-2 px-3 cursor-pointer"
                  onClick={() => !editMode && setExpandedId(expanded ? null : d.id)}
                >
                  {editMode && <GripVertical size={10} className="text-muted-foreground/30 shrink-0" />}
                  <DevIcon size={13} className={cn('shrink-0', on ? 'text-primary' : 'text-muted-foreground/40')} />
                  <span className="text-[13px] text-foreground flex-1 min-w-[60px] truncate">{d.name || d.kind}</span>

                  {!editMode && state?.kind === 'light' && state.data.on && !expanded && (
                    <div className="w-14 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Slider
                        value={[state.data.brightness]}
                        max={255} step={1}
                        onValueChange={([v]) => updateDeviceState(d.id, { brightness: v })}
                      />
                    </div>
                  )}

                  {!editMode && state && 'on' in state.data && state.kind !== 'sensor' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={on} onCheckedChange={(v) => updateDeviceState(d.id, { on: v })} className="scale-90" />
                    </div>
                  )}

                  {d.ha?.entityId && <Wifi size={8} className="text-primary/40 shrink-0" />}
                </div>

                {expanded && !editMode && (
                  <div className="px-2 pb-2 border-t border-border/15">
                    <DeviceControlCard marker={d} />
                  </div>
                )}
              </div>
            );
          })}
          {editMode && devices.length === 0 && (
            <p className="text-[10px] text-muted-foreground/50 text-center py-2">Släpp enheter här</p>
          )}
        </div>
      )}
    </div>
  );
}
