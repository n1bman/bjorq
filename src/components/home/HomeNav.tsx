import { useAppStore } from '@/store/useAppStore';
import { Home, LayoutGrid, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppMode } from '@/store/types';

const modes: { key: AppMode; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'dashboard', label: 'Kontrollpanel', icon: LayoutGrid },
  { key: 'build', label: 'Bygge', icon: PenTool },
];

export default function HomeNav() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="glass-panel rounded-2xl px-2 py-1.5 flex items-center gap-1">
        {modes.map(({ key, label, icon: Icon }, i) => (
          <div key={key} className="flex items-center">
            {i > 0 && <div className="w-px h-6 bg-border mx-0.5" />}
            <button
              onClick={() => setAppMode(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                appMode === key
                  ? 'text-primary amber-glow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
