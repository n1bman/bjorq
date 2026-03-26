import { useAppStore } from '../../store/useAppStore';
import { Home, LayoutGrid, PenTool } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useRef, useCallback } from 'react';
import type { AppMode } from '../../store/types';

const modes: { key: AppMode; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'dashboard', label: 'Kontrollpanel', icon: LayoutGrid },
  { key: 'build', label: 'Design', icon: PenTool },
];

interface HomeNavProps {
  style?: React.CSSProperties;
}

export default function HomeNav({ style }: HomeNavProps) {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const [expanded, setExpanded] = useState(false);
  const [showAdminTips, setShowAdminTips] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleToggle = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setExpanded((v) => !v);
  }, []);

  const handleSelect = useCallback((key: AppMode) => {
    setAppMode(key);
    collapseTimer.current = setTimeout(() => setExpanded(false), 300);
  }, [setAppMode]);

  const currentMode = modes.find((m) => m.key === appMode) || modes[0];
  const CurrentIcon = currentMode.icon;

  return (
    <div className="z-50 pointer-events-auto" style={style}>
      {showAdminTips && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 glass-panel rounded-xl p-3 space-y-1 text-[10px] text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xs font-semibold text-foreground">Admin / Exit-tips</p>
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

      {expanded && (
        <div
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex gap-2 animate-in fade-in zoom-in-90 duration-200"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {modes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3 rounded-2xl glass-panel text-[11px] font-medium transition-all min-w-[72px]',
                appMode === key
                  ? 'text-primary bg-primary/15 amber-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleToggle}
        className={cn(
          'w-14 h-14 rounded-full glass-panel flex items-center justify-center transition-all',
          expanded ? 'text-primary amber-glow rotate-45' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <CurrentIcon size={22} />
      </button>

      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
