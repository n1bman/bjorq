import { useAppStore } from '../store/useAppStore';
import { Home, PenTool } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppMode } from '../store/types';

const modes: { key: AppMode; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'build', label: 'Bygge', icon: PenTool },
];

export default function BottomNav() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 glass-panel border-t border-[hsl(var(--glass-border))]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {modes.map(({ key, label, icon: Icon }) => {
          const active = appMode === key;
          return (
            <button
              key={key}
              onClick={() => setAppMode(key)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[80px]',
                active
                  ? 'text-primary amber-glow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
