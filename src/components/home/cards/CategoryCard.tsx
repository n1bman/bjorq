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
        className="flex items-center justify-between cursor-pointer mb-3 py-1"
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
        <div className="space-y-1 mt-1 overflow-y-auto flex-1 min-h-0">
          {devices.map((d) => {
            const state = deviceStates[d.id];
            const on = isOn(state);
            const expanded = expandedId === d.id;
            const isDragging = draggingDeviceId === d.id;
            const isLight = state?.kind === 'light';
            const brightness = isLight && on ? (state.data as any).brightness ?? 200 : 0;
            const pct = Math.round((brightness / 255) * 100);

            // Determine light color for the bar
            let barColor = '36 75% 50%'; // warm amber default
            let toneLabel = '';
            if (isLight && on) {
              const ct = (state.data as any).colorTemp;
              const cm = (state.data as any).colorMode;
              const rgb = (state.data as any).rgbColor;
              if (cm === 'rgb' && rgb) {
                // Use actual RGB color, muted
                barColor = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
                toneLabel = 'RGB';
              } else if (ct) {
                if (ct < 250) { barColor = '210 30% 70%'; toneLabel = 'kall vit'; }
                else if (ct < 350) { barColor = '40 20% 65%'; toneLabel = 'neutral vit'; }
                else { barColor = '30 80% 52%'; toneLabel = 'varm ton'; }
              } else {
                toneLabel = 'kvällsläge';
              }
            }

            const isRgbMode = (state?.data as any)?.colorMode === 'rgb';
            const barBg = isRgbMode && (state?.data as any)?.rgbColor
              ? `linear-gradient(90deg, rgba(${barColor}, 0.25) 0%, rgba(${barColor}, 0.15) ${pct}%, transparent ${Math.min(pct + 5, 100)}%)`
              : `linear-gradient(90deg, hsl(${barColor} / 0.25) 0%, hsl(${barColor} / 0.15) ${pct}%, transparent ${Math.min(pct + 5, 100)}%)`;

            return (
              <div
                key={d.id}
                draggable={editMode}
                onDragStart={editMode ? (e) => handleDeviceDragStart(e, d.id) : undefined}
                onDragEnd={() => setDraggingDeviceId(null)}
                onTouchStart={editMode ? () => handleDeviceTouchStart(d.id) : undefined}
                onTouchEnd={editMode ? handleDeviceTouchEnd : undefined}
                className={cn(
                  'rounded-xl transition-all relative overflow-hidden border border-[hsl(var(--border)/0.15)]',
                  expanded && 'ring-1 ring-primary/10',
                  isDragging && 'opacity-50 scale-95',
                  editMode && 'cursor-grab'
                )}
              >
                {/* Soft fade brightness bar — covers full header row */}
                {isLight && on && (
                  <div
                    className="absolute inset-x-0 top-0 bottom-0 rounded-xl pointer-events-none transition-all duration-500"
                    style={{
                      background: barBg,
                      maxHeight: expanded ? '56px' : undefined,
                    }}
                  />
                )}
                <div
                  className={cn(
                    'flex items-center gap-3 py-3.5 px-4 md:py-4 md:px-5 cursor-pointer relative z-10',
                    !on && 'opacity-40'
                  )}
                  onClick={() => !editMode && setExpandedId(expanded ? null : d.id)}
                >
                  {editMode && <GripVertical size={10} className="text-muted-foreground/30 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-foreground block truncate">{d.name || d.kind}</span>
                    {/* tone label removed — info shown in expanded DeviceControlCard */}
                    {!isLight && !on && (
                      <span className="text-[10px] text-muted-foreground/30">
                        {state?.kind === 'vacuum' ? (state.data as any).status === 'docked' ? 'Dockad' : (state.data as any).status : ''}
                      </span>
                    )}
                  </div>

                  {/* Inline brightness slider for lights (visible when on, not expanded) */}
                  {isLight && on && !expanded && !editMode && (
                    <div className="w-20 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Slider
                        value={[brightness]}
                        min={1}
                        max={255}
                        step={1}
                        onValueChange={([v]) => updateDeviceState(d.id, { brightness: v })}
                        className="h-5"
                      />
                    </div>
                  )}

                  {!editMode && (
                    <ChevronDown size={12} className={cn(
                      'text-muted-foreground/20 transition-transform shrink-0',
                      expanded && 'rotate-180'
                    )} />
                  )}

                  {!editMode && state && 'on' in state.data && state.kind !== 'sensor' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={on} onCheckedChange={(v) => updateDeviceState(d.id, { on: v })} />
                    </div>
                  )}

                  {d.ha?.entityId && <Wifi size={8} className="text-primary/20 shrink-0" />}
                </div>

                {expanded && !editMode && (
                  <div className="px-4 pb-4 border-t border-[hsl(var(--border)/0.08)]">
                    <DeviceControlCard marker={d} />
                  </div>
                )}
              </div>
            );
          })}
          {editMode && devices.length === 0 && (
            <p className="text-[10px] text-muted-foreground/30 text-center py-3">Släpp enheter här</p>
          )}
        </div>
      )}
    </div>
  );
}
