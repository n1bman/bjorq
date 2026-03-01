import { useAppStore } from '../../store/useAppStore';
import { Home, LayoutGrid, PenTool } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useRef, useCallback } from 'react';
import type { AppMode } from '../../store/types';

const modes: { key: AppMode; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'dashboard', label: 'Kontrollpanel', icon: LayoutGrid },
  { key: 'build', label: 'Bygge', icon: PenTool },
];

export default function HomeNav() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const [showAdminTips, setShowAdminTips] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowAdminTips(true);
    }, 5000);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {showAdminTips && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 glass-panel rounded-xl p-3 space-y-1 text-[10px] text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xs font-semibold text-foreground">🔓 Admin / Exit-tips</p>
          <p><kbd className="bg-secondary px-1 rounded text-foreground">ESC</kbd> — Lämna browser fullscreen</p>
          <p><kbd className="bg-secondary px-1 rounded text-foreground">Alt+F4</kbd> — Stäng kiosk (Linux)</p>
          <p><kbd className="bg-secondary px-1 rounded text-foreground">Ctrl+Alt+Del</kbd> — Windows kiosk</p>
          <button
            className="text-primary text-[10px] mt-1 hover:underline"
            onClick={() => setShowAdminTips(false)}
          >
            Stäng
          </button>
        </div>
      )}
      <nav
        className="glass-panel rounded-2xl px-3 py-2 flex items-center gap-1"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {modes.map(({ key, label, icon: Icon }, i) => (
          <div key={key} className="flex items-center">
            {i > 0 && <div className="w-px h-6 bg-border mx-0.5" />}
            <button
              onClick={() => setAppMode(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                appMode === key
                  ? 'text-primary bg-primary/10 amber-glow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
