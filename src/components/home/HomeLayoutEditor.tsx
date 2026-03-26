import { useState, useRef, useCallback } from 'react';
import { Settings2, Check, GripHorizontal, Home, Camera as CameraIcon, DoorOpen } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import type { HomeWidgetKey, WidgetOverlaySize } from '../../store/types';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import TemperatureWidget from './cards/TemperatureWidget';

const SIZES: { key: WidgetOverlaySize; label: string }[] = [
  { key: 'compact', label: 'Minimal' },
  { key: 'normal', label: 'Normal' },
  { key: 'expanded', label: 'Detaljerad' },
];

const WIDGET_WIDGETS: { key: HomeWidgetKey; label: string; hasSize: boolean }[] = [
  { key: 'clock', label: 'Klocka', hasSize: true },
  { key: 'weather', label: 'Väder', hasSize: true },
  { key: 'temperature', label: 'Temperatur', hasSize: true },
  { key: 'energy', label: 'Energi', hasSize: true },
  { key: 'nav', label: 'Navigering', hasSize: false },
  { key: 'camera', label: 'Kamera', hasSize: false },
  { key: 'rooms', label: 'Rum', hasSize: false },
];

const DEFAULT_POSITIONS: Record<HomeWidgetKey, { x: number; y: number }> = {
  clock: { x: 3, y: 4 },
  weather: { x: 3, y: 14 },
  temperature: { x: 78, y: 4 },
  energy: { x: 78, y: 14 },
  nav: { x: 46, y: 90 },
  camera: { x: 90, y: 78 },
  rooms: { x: 82, y: 78 },
};

const widgetRenderers: Partial<Record<HomeWidgetKey, (size: WidgetOverlaySize) => React.ReactNode>> = {
  clock: (size) => <ClockWidget size={size} />,
  weather: (size) => <WeatherWidget size={size} />,
  temperature: (size) => <TemperatureWidget size={size} />,
  energy: (size) => <EnergyWidget size={size} />,
};

/** Simple placeholder icons for non-widget draggable elements */
const controlRenderers: Partial<Record<HomeWidgetKey, () => React.ReactNode>> = {
  nav: () => (
    <div className="w-14 h-14 rounded-full glass-panel flex items-center justify-center text-muted-foreground">
      <Home size={22} />
    </div>
  ),
  camera: () => (
    <div className="w-14 h-14 rounded-full glass-panel flex items-center justify-center text-muted-foreground">
      <CameraIcon size={20} />
    </div>
  ),
  rooms: () => (
    <div className="w-14 h-14 rounded-full glass-panel flex items-center justify-center text-muted-foreground">
      <DoorOpen size={20} />
    </div>
  ),
};

/** Keys that should always be visible (no hide toggle) */
const ALWAYS_VISIBLE: Set<HomeWidgetKey> = new Set(['nav']);

export default function HomeLayoutEditor() {
  const widgetLayout = useAppStore((s) => s.homeView.widgetLayout) ?? {};
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets) ?? {};
  const setWidgetLayout = useAppStore((s) => s.setWidgetLayout);
  const toggleHomeLayoutEditMode = useAppStore((s) => s.toggleHomeLayoutEditMode);
  const toggleHomeWidget = useAppStore((s) => s.toggleHomeWidget);

  const [dragging, setDragging] = useState<HomeWidgetKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0, startY: 0, origX: 0, origY: 0,
  });

  const handlePointerDown = useCallback((key: HomeWidgetKey, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(key);
    const config = widgetLayout[key];
    const pos = { x: config?.x ?? DEFAULT_POSITIONS[key].x, y: config?.y ?? DEFAULT_POSITIONS[key].y };
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [widgetLayout]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(95, dragStartRef.current.origX + dx));
    const newY = Math.max(0, Math.min(92, dragStartRef.current.origY + dy));
    setWidgetLayout(dragging, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  }, [dragging, setWidgetLayout]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const isVisible = (key: HomeWidgetKey) => ALWAYS_VISIBLE.has(key) || visibleWidgets[key];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 pointer-events-auto"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-[hsl(222_18%_6%/0.5)] backdrop-blur-sm" />

      {/* Subtle grid guides */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '10% 10%',
      }} />

      {/* Draggable elements */}
      {WIDGET_WIDGETS.map(({ key, label, hasSize }) => {
        if (!isVisible(key)) return null;
        const config = widgetLayout[key];
        const size = config?.size ?? 'normal';
        const pos = {
          x: config?.x ?? DEFAULT_POSITIONS[key].x,
          y: config?.y ?? DEFAULT_POSITIONS[key].y,
        };
        const isDragging = dragging === key;

        return (
          <div
            key={key}
            className={cn(
              'absolute z-10 group transition-shadow',
              isDragging ? 'cursor-grabbing z-50' : 'cursor-grab',
            )}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onPointerDown={(e) => handlePointerDown(key, e)}
          >
            {/* Drag label */}
            <div
              className={cn(
                'absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-lg transition-all pointer-events-none',
                'bg-primary/90 text-primary-foreground text-[9px] font-semibold uppercase tracking-wider',
                isDragging ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100',
              )}
            >
              <GripHorizontal size={10} />
              {label}
            </div>

            {/* Ring indicator */}
            <div className={cn(
              'rounded-2xl ring-2 transition-all',
              isDragging
                ? 'ring-primary shadow-[0_0_32px_hsl(var(--amber-glow))]'
                : 'ring-primary/30 group-hover:ring-primary/60',
            )}>
              {hasSize && widgetRenderers[key]
                ? widgetRenderers[key]!(size as WidgetOverlaySize)
                : controlRenderers[key]?.()
              }
            </div>
          </div>
        );
      })}

      {/* Config panel — bottom center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[calc(100vw-2rem)] z-50">
        <div className="nn-widget p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 size={16} className="text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground font-display">Layoutläge</h3>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Dra elementen fritt · Välj storlek nedan</p>
              </div>
            </div>
            <button
              onClick={toggleHomeLayoutEditMode}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors tracking-wide"
            >
              <Check size={13} /> Klar
            </button>
          </div>

          <div className="space-y-3 max-h-[35vh] overflow-y-auto">
            {WIDGET_WIDGETS.map(({ key, label, hasSize }) => {
              const config = widgetLayout[key] ?? { position: 'top-left' as const, size: 'normal' as const };
              const visible = isVisible(key);
              const canHide = !ALWAYS_VISIBLE.has(key);
              return (
                <div key={key} className={cn(
                  'rounded-xl p-4 space-y-3 transition-all',
                  visible
                    ? 'bg-[hsl(var(--surface-elevated)/0.5)] border border-[hsl(var(--glass-border)/0.2)]'
                    : 'opacity-30',
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground">{label}</span>
                    {canHide ? (
                      <button
                        onClick={() => toggleHomeWidget(key)}
                        className={cn(
                          'px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors tracking-wide',
                          visible ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {visible ? 'Synlig' : 'Dold'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 tracking-wide">Alltid synlig</span>
                    )}
                  </div>
                  {visible && hasSize && (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-2">Storlek</p>
                      <div className="flex gap-1.5">
                        {SIZES.map((s) => (
                          <button
                            key={s.key}
                            onClick={() => setWidgetLayout(key, { size: s.key })}
                            className={cn(
                              'flex-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-all',
                              config.size === s.key
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-[hsl(var(--surface)/0.5)] text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
