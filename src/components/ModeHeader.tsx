import { useAppStore } from '../store/useAppStore';

export default function ModeHeader() {
  const appMode = useAppStore((s) => s.appMode);

  // Only show in build mode
  if (appMode !== 'build') return null;

  return (
    <header className="fixed top-0 inset-x-0 z-40 glass-panel border-b border-[hsl(var(--glass-border))]">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm font-display">HT</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight font-display text-foreground">Design</h1>
            <p className="text-[11px] text-muted-foreground">Designläge</p>
          </div>
        </div>
      </div>
    </header>
  );
}
