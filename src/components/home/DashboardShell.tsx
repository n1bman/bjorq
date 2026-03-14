import { useCallback } from 'react';
import { PenTool } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { categories, categoryContent } from './DashboardGrid';
import Scene3D from '../Scene3D';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import ScenesWidget from './cards/ScenesWidget';
import type { DashCategory } from '../../store/types';

/** Categories where the 3D preview is shown */
const SHOW_3D: Set<DashCategory> = new Set(['home', 'devices', 'surveillance', 'robot']);

export default function DashboardShell() {
  useWeatherSync();
  const activeCategory = useAppStore((s) => s.dashboard.activeCategory) ?? 'home';
  const setDashCategory = useAppStore((s) => s.setDashCategory);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const unreadCount = useAppStore((s) => s.activityLog.filter((e) => !e.read).length);

  const Content = categoryContent[activeCategory];
  const show3D = SHOW_3D.has(activeCategory);

  const handleCategoryClick = useCallback((key: DashCategory) => {
    setDashCategory(key);
  }, [setDashCategory]);

  return (
    <div className="fixed inset-0 bg-background flex">
      {/* ── Left Nav Rail ── */}
      <nav className="w-[72px] shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-y-auto overflow-x-hidden">
        <div className="flex-1 flex flex-col items-center gap-0.5 py-3">
          {categories.map(({ key, label, icon: Icon }) => {
            const active = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => handleCategoryClick(key)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 w-[60px] h-[56px] rounded-xl text-[9px] font-medium transition-all select-none',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                <span className="leading-tight truncate w-full text-center px-0.5">{label}</span>
                {key === 'activity' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1.5 bg-destructive text-destructive-foreground text-[7px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Build mode shortcut at bottom */}
        <div className="flex flex-col items-center pb-4 pt-2 border-t border-sidebar-border">
          <button
            onClick={() => setAppMode('build')}
            className="flex flex-col items-center justify-center gap-0.5 w-[60px] h-[56px] rounded-xl text-[9px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
          >
            <PenTool size={20} strokeWidth={1.6} />
            <span>Design</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top summary cards */}
        <div className="shrink-0 flex items-start gap-3 px-5 py-3 border-b border-border overflow-x-auto">
          <ClockWidget />
          <WeatherWidget />
          <EnergyWidget />
          <ScenesWidget />
        </div>

        {/* Content body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className={cn(
            'p-5 pb-8',
            show3D && 'grid gap-5',
            show3D && 'grid-cols-1 lg:grid-cols-[minmax(300px,2fr)_3fr]'
          )}>
            {/* 3D Preview card */}
            {show3D && (
              <div className="glass-panel rounded-2xl overflow-hidden h-[280px] lg:h-full lg:min-h-[320px] lg:max-h-[480px]">
                <Scene3D />
              </div>
            )}

            {/* Category content */}
            <div className={cn(show3D ? 'min-w-0' : 'max-w-[1200px] mx-auto w-full')}>
              <Content />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
