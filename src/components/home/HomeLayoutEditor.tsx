import { useState, useRef, useCallback } from 'react';
import { Settings2, Check, GripHorizontal, Minus, Plus } from 'lucide-react';
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

const WIDGETS: { key: HomeWidgetKey; label: string }[] = [
  { key: 'clock', label: 'Klocka' },
  { key: 'weather', label: 'Väder' },
  { key: 'temperature', label: 'Temperatur' },
  { key: 'energy', label: 'Energi' },
];

const DEFAULT_POSITIONS: Record<HomeWidgetKey, { x: number; y: number }> = {
  clock: { x: 3, y: 4 },
  weather: { x: 3, y: 14 },
  temperature: { x: 78, y: 4 },
  energy: { x: 78, y: 14 },
};

const widgetRenderers: Record<HomeWidgetKey, (size: WidgetOverlaySize) => React.ReactNode> = {
  clock: (size) => <ClockWidget size={size} />,
  weather: (size) => <WeatherWidget size={size} />,
  temperature: (size) => <TemperatureWidget size={size} />,
  energy: (size) => <EnergyWidget size={size} />,
};

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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [widgetLayout]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(90, dragStartRef.current.origX + dx));
    const newY = Math.max(0, Math.min(85, dragStartRef.current.origY + dy));
    setWidgetLayout(dragging, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  }, [dragging, setWidgetLayout]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

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

      {/* Draggable widgets */}
      {WIDGETS.map(({ key, label }) => {
        if (!visibleWidgets[key]) return null;
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
          >
            {/* Drag handle */}
            <div
              className={cn(
                'absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-lg transition-all',
                'bg-primary/90 text-primary-foreground text-[9px] font-semibold uppercase tracking-wider',
                isDragging ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100',
              )}
              onPointerDown={(e) => handlePointerDown(key, e)}
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
              {widgetRenderers[key](size)}
            </div>
          </div>
        );
      })}

      {/* Config panel — bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[480px] max-w-[calc(100vw-2rem)] z-50">
        <div className="nn-widget p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 size={16} className="text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground font-display">Layoutläge</h3>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Dra widgetarna fritt · Välj storlek nedan</p>
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
            {WIDGETS.map(({ key, label }) => {
              const config = widgetLayout[key] ?? { position: 'top-left' as const, size: 'normal' as const };
              const visible = visibleWidgets[key];
              return (
                <div key={key} className={cn(
                  'rounded-xl p-4 space-y-3 transition-all',
                  visible
                    ? 'bg-[hsl(var(--surface-elevated)/0.5)] border border-[hsl(var(--glass-border)/0.2)]'
                    : 'opacity-30',
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground">{label}</span>
                    <button
                      onClick={() => toggleHomeWidget(key)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors tracking-wide',
                        visible ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {visible ? 'Synlig' : 'Dold'}
                    </button>
                  </div>
                  {visible && (
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
