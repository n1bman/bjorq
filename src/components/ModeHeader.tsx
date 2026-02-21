import { useAppStore } from '@/store/useAppStore';

const modeLabels = {
  dashboard: 'Kontrollpanel',
  devices: 'Enheter',
  build: 'Bygge',
} as const;

const modeDescriptions = {
  dashboard: 'Visa och styr ditt hem',
  devices: 'Placera och bind enheter',
  build: 'Redigera planlösning',
} as const;

export default function ModeHeader() {
  const appMode = useAppStore((s) => s.appMode);

  return (
    <header className="fixed top-0 inset-x-0 z-40 glass-panel border-b border-[hsl(var(--glass-border))]">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm font-display">HT</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight font-display">
              {modeLabels[appMode]}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {modeDescriptions[appMode]}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
