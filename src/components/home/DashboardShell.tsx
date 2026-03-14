import { useCallback } from 'react';
import { PenTool, Home } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { categories, categoryContent } from './DashboardGrid';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import ScenesWidget from './cards/ScenesWidget';
import type { DashCategory } from '../../store/types';

export default function DashboardShell() {
  useWeatherSync();
  const activeCategory = useAppStore((s) => s.dashboard.activeCategory) ?? 'home';
  const setDashCategory = useAppStore((s) => s.setDashCategory);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const unreadCount = useAppStore((s) => s.activityLog.filter((e) => !e.read).length);

  const Content = categoryContent[activeCategory];

  const handleCategoryClick = useCallback((key: DashCategory) => {
    setDashCategory(key);
  }, [setDashCategory]);

  return (
    <div className="fixed inset-0 bg-background flex">
      {/* ── Left Nav Rail ── */}
      <nav className="w-[120px] shrink-0 flex flex-col nav-rail-bg overflow-y-auto overflow-x-hidden">
        {/* Logo area */}
        <div className="flex items-center justify-center py-4 px-3">
          <span className="text-sm font-bold tracking-widest text-primary" style={{ fontFamily: 'Space Grotesk, system-ui' }}>
            BJORQ
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-0.5 px-2 py-1">
          {categories.map(({ key, label, icon: Icon }) => {
            const active = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => handleCategoryClick(key)}
                className={cn(
                  'relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all select-none text-left',
                  active
                    ? 'nav-item-active text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 border-l-[3px] border-transparent'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.5} className="shrink-0" />
                <span className="leading-tight truncate">{label}</span>
                {key === 'activity' && unreadCount > 0 && (
                  <span className="absolute top-1.5 left-[26px] bg-destructive text-destructive-foreground text-[7px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom: Home + Design shortcuts */}
        <div className="flex flex-col gap-1 px-2 pb-4 pt-2 border-t border-sidebar-border/40">
          <button
            onClick={() => {
              setDashCategory('home');
            }}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all border-l-[3px] border-transparent',
              activeCategory === 'home'
                ? 'text-primary'
                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
            )}
          >
            <Home size={18} strokeWidth={1.5} className="shrink-0" />
            <span>Hem</span>
          </button>
          <button
            onClick={() => setAppMode('build')}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[11px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all border-l-[3px] border-transparent"
          >
            <PenTool size={18} strokeWidth={1.5} className="shrink-0" />
            <span>Design</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top summary cards */}
        <div className="shrink-0 flex items-start gap-3 px-5 py-3 summary-bar overflow-x-auto">
          <ClockWidget />
          <WeatherWidget />
          <EnergyWidget />
          <ScenesWidget />
        </div>

        {/* Content body — always full width, 3D is a widget inside HomeCategory */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 pb-8">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
