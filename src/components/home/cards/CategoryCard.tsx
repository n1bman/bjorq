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
        'nn-widget nn-widget-hover p-5 transition-all',
        span && 'col-span-2',
        dragOverActive && 'ring-2 ring-primary/40',
        editMode && 'ring-1 ring-dashed ring-muted-foreground/20'
      )}
      style={{ maxHeight: '360px', display: 'flex', flexDirection: 'column' }}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragLeave={editMode ? handleDragLeave : undefined}
      onDrop={editMode ? handleDrop : undefined}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer mb-2"
        draggable={editMode}
        onDragStart={editMode ? handleCategoryDragStart : undefined}
        onClick={() => !editMode && setCollapsed(!collapsed)}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {editMode && <GripVertical size={12} className="text-muted-foreground/40 shrink-0 cursor-grab" />}
            <span className="text-[15px] font-semibold text-foreground truncate">{displayName}</span>
          </div>
          <span className="text-[11px] text-muted-foreground/40 mt-0.5">
            {onCount}/{devices.length} på
          </span>
        </div>
        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          <Switch checked={allOn} onCheckedChange={toggleAll} />
        </div>
      </div>

      {/* Device list */}
      {!collapsed && (
        <div className="space-y-1.5 mt-1 overflow-y-auto flex-1 min-h-0">
          {devices.map((d) => {
            const state = deviceStates[d.id];
            const on = isOn(state);
            const expanded = expandedId === d.id;
            const isDragging = draggingDeviceId === d.id;
            const isLight = state?.kind === 'light';
            const brightness = isLight && on ? (state.data as any).brightness : 0;
            const pct = Math.round((brightness / 255) * 100);

            // Color tone label
            let toneLabel = '';
            if (isLight && on) {
              const ct = (state.data as any).colorTemp;
              const cm = (state.data as any).colorMode;
              if (cm === 'rgb') {
                toneLabel = 'RGB';
              } else if (ct) {
                toneLabel = ct < 250 ? 'kall vit' : ct < 350 ? 'neutral vit' : 'varm ton';
              } else {
                toneLabel = 'kvällsläge';
              }
            }

            return (
              <div
                key={d.id}
                draggable={editMode}
                onDragStart={editMode ? (e) => handleDeviceDragStart(e, d.id) : undefined}
                onDragEnd={() => setDraggingDeviceId(null)}
                onTouchStart={editMode ? () => handleDeviceTouchStart(d.id) : undefined}
                onTouchEnd={editMode ? handleDeviceTouchEnd : undefined}
                className={cn(
                  'rounded-xl transition-all relative overflow-hidden',
                  expanded && 'ring-1 ring-primary/15',
                  isDragging && 'opacity-50 scale-95',
                  editMode && 'cursor-grab'
                )}
              >
                {/* Amber brightness bar background for active lights */}
                {isLight && on && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, hsl(34 80% 52% / 0.15) 0%, hsl(34 80% 52% / 0.08) ${pct}%, transparent ${pct}%)`,
                    }}
                  />
                )}
                <div
                  className={cn(
                    'flex items-center gap-3 py-3 px-3.5 cursor-pointer relative z-10',
                    !on && 'opacity-50'
                  )}
                  onClick={() => !editMode && setExpandedId(expanded ? null : d.id)}
                >
                  {editMode && <GripVertical size={10} className="text-muted-foreground/30 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-foreground block truncate">{d.name || d.kind}</span>
                    {isLight && on && toneLabel && (
                      <span className="text-[10px] text-muted-foreground/50">{pct}% · {toneLabel}</span>
                    )}
                    {!isLight && !on && (
                      <span className="text-[10px] text-muted-foreground/40">
                        {state?.kind === 'vacuum' ? (state.data as any).status === 'docked' ? 'Dockad' : (state.data as any).status : ''}
                      </span>
                    )}
                  </div>

                  {/* Brightness badge for lights */}
                  {isLight && on && (
                    <span className="text-[11px] font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      {pct}%
                    </span>
                  )}

                  {/* Chevron for expandable */}
                  {!editMode && (
                    <ChevronDown size={12} className={cn(
                      'text-muted-foreground/30 transition-transform shrink-0',
                      expanded && 'rotate-180'
                    )} />
                  )}

                  {!editMode && state && 'on' in state.data && state.kind !== 'sensor' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={on} onCheckedChange={(v) => updateDeviceState(d.id, { on: v })} />
                    </div>
                  )}

                  {d.ha?.entityId && <Wifi size={8} className="text-primary/30 shrink-0" />}
                </div>

                {expanded && !editMode && (
                  <div className="px-3 pb-3 border-t border-[hsl(var(--border)/0.1)]">
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
