import { Settings2, X, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import type { HomeWidgetKey, WidgetOverlayPosition, WidgetOverlaySize } from '../../store/types';

const POSITIONS: { key: WidgetOverlayPosition; label: string }[] = [
  { key: 'top-left', label: 'Uppe vänster' },
  { key: 'top-right', label: 'Uppe höger' },
  { key: 'center-top', label: 'Uppe mitten' },
  { key: 'bottom-left', label: 'Nere vänster' },
  { key: 'bottom-right', label: 'Nere höger' },
];

const SIZES: { key: WidgetOverlaySize; label: string }[] = [
  { key: 'compact', label: 'Kompakt' },
  { key: 'normal', label: 'Normal' },
  { key: 'expanded', label: 'Utökad' },
];

const WIDGETS: { key: HomeWidgetKey; label: string }[] = [
  { key: 'clock', label: 'Klocka' },
  { key: 'weather', label: 'Väder' },
  { key: 'temperature', label: 'Temperatur' },
  { key: 'energy', label: 'Energi' },
];

export default function HomeLayoutEditor() {
  const widgetLayout = useAppStore((s) => s.homeView.widgetLayout) ?? {};
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets) ?? {};
  const setWidgetLayout = useAppStore((s) => s.setWidgetLayout);
  const toggleHomeLayoutEditMode = useAppStore((s) => s.toggleHomeLayoutEditMode);
  const toggleHomeWidget = useAppStore((s) => s.toggleHomeWidget);

  return (
    <div className="absolute inset-0 z-40 pointer-events-auto">
      {/* Semi-transparent backdrop with grid guides */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm">
        {/* Grid guides */}
        <div className="absolute inset-4 border border-dashed border-primary/20 rounded-2xl" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bottom-4 border-l border-dashed border-primary/10" />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 right-4 border-t border-dashed border-primary/10" />

        {/* Position zone indicators */}
        {POSITIONS.map(({ key, label }) => {
          const posClasses: Record<WidgetOverlayPosition, string> = {
            'top-left': 'top-6 left-6',
            'top-right': 'top-6 right-6',
            'center-top': 'top-6 left-1/2 -translate-x-1/2',
            'bottom-left': 'bottom-28 left-6',
            'bottom-right': 'bottom-28 right-6',
          };
          const widgetsHere = WIDGETS.filter(
            (w) => visibleWidgets[w.key] && widgetLayout[w.key]?.position === key
          );
          return (
            <div key={key} className={cn('absolute', posClasses[key])}>
              <div className={cn(
                'rounded-xl border-2 border-dashed px-4 py-3 min-w-[120px] min-h-[60px] transition-all',
                widgetsHere.length > 0 ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/20'
              )}>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">{label}</p>
                {widgetsHere.map((w) => (
                  <div key={w.key} className="text-[10px] text-primary font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {w.label}
                    <span className="text-[8px] text-muted-foreground ml-auto">
                      {widgetLayout[w.key]?.size ?? 'normal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Config panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 nn-widget p-5 w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Layoutläge</h3>
          </div>
          <button
            onClick={toggleHomeLayoutEditMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Check size={12} /> Klar
          </button>
        </div>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {WIDGETS.map(({ key, label }) => {
            const config = widgetLayout[key] ?? { position: 'top-left', size: 'normal' };
            const visible = visibleWidgets[key];
            return (
              <div key={key} className={cn(
                'rounded-xl p-3 space-y-2 border border-border/20 transition-opacity',
                !visible && 'opacity-40'
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <button
                    onClick={() => toggleHomeWidget(key)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[9px] font-medium transition-colors',
                      visible ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {visible ? 'Synlig' : 'Dold'}
                  </button>
                </div>
                {visible && (
                  <>
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-muted-foreground/40 mb-1">Position</p>
                      <div className="flex gap-1">
                        {POSITIONS.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => setWidgetLayout(key, { position: p.key })}
                            className={cn(
                              'flex-1 px-1 py-1 rounded text-[8px] transition-colors',
                              config.position === p.key
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-surface-elevated/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-muted-foreground/40 mb-1">Storlek</p>
                      <div className="flex gap-1">
                        {SIZES.map((s) => (
                          <button
                            key={s.key}
                            onClick={() => setWidgetLayout(key, { size: s.key })}
                            className={cn(
                              'flex-1 px-2 py-1.5 rounded text-[9px] font-medium transition-all',
                              config.size === s.key
                                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                                : 'bg-surface-elevated/50 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
