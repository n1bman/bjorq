import { useCallback, useState, useEffect } from 'react';
import { PenTool, Home, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useWeatherSync } from '../../hooks/useWeatherSync';
import { categories, categoryContent } from './DashboardGrid';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import ScenesWidget from './cards/ScenesWidget';
import type { DashCategory } from '../../store/types';

// Group categories for nav
const NAV_GROUPS = [
  {
    label: 'Huvudmenyer',
    keys: ['home', 'devices', 'energy', 'climate', 'weather'] as DashCategory[],
  },
  {
    label: 'Automation',
    keys: ['automations', 'scenes', 'surveillance', 'robot'] as DashCategory[],
  },
  {
    label: 'System',
    keys: ['activity', 'widgets', 'settings', 'profile'] as DashCategory[],
  },
];

// Mobile bottom tabs — max 5 + "Mer"
const MOBILE_TABS: DashCategory[] = ['home', 'devices', 'energy', 'climate', 'settings'];

function useBreakpoint() {
  const [bp, setBp] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? 'mobile' : w < 1280 ? 'tablet' : 'desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

export default function DashboardShell() {
  useWeatherSync();
  const activeCategory = useAppStore((s) => s.dashboard.activeCategory) ?? 'home';
  const setDashCategory = useAppStore((s) => s.setDashCategory);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const unreadCount = useAppStore((s) => s.activityLog.filter((e) => !e.read).length);
  const bp = useBreakpoint();
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const Content = categoryContent[activeCategory] ?? categoryContent.settings;

  const handleCategoryClick = useCallback((key: DashCategory) => {
    setDashCategory(key);
    setMoreOpen(false);
  }, [setDashCategory]);

  const catMap = Object.fromEntries(categories.map((c) => [c.key, c]));

  // ─── Mobile layout ───
  if (bp === 'mobile') {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 pb-24">
            <Content />
          </div>
        </div>

        {/* Bottom tab bar */}
        <nav className="shrink-0 border-t border-border/30 bg-surface-sunken/80 backdrop-blur-xl safe-area-bottom">
          <div className="flex items-center justify-around h-14 px-1">
            {MOBILE_TABS.map((key) => {
              const cat = catMap[key];
              if (!cat) return null;
              const active = activeCategory === key;
              const Icon = cat.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(key)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                  <span className="text-[9px] font-medium">{cat.label}</span>
                </button>
              );
            })}
            {/* "Mer" button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                moreOpen || !MOBILE_TABS.includes(activeCategory)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal size={20} />
              <span className="text-[9px] font-medium">Mer</span>
            </button>
          </div>

          {/* More sheet */}
          {moreOpen && (
            <div className="absolute bottom-16 left-2 right-2 nn-widget p-4 max-h-[60vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-200 z-50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alla menyer</p>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(({ key, label, icon: Icon }) => {
                  const active = activeCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleCategoryClick(key)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
                        active
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50'
                      )}
                    >
                      <Icon size={20} />
                      <span className="text-[10px] font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                <button
                  onClick={() => { setAppMode('home'); setMoreOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50 transition-all"
                >
                  <Home size={16} /> Hemvy
                </button>
                <button
                  onClick={() => { setAppMode('build'); setMoreOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50 transition-all"
                >
                  <PenTool size={16} /> Design
                </button>
              </div>
            </div>
          )}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      </div>
    );
  }

  // ─── Desktop / Tablet layout ───
  const isTablet = bp === 'tablet';
  const collapsed = isTablet || railCollapsed;

  return (
    <div className="fixed inset-0 flex">
      {/* ── Nav Rail ── */}
      <nav className={cn(
        'shrink-0 flex flex-col nav-rail-bg bg-background overflow-y-auto overflow-x-hidden transition-all duration-300',
        collapsed ? 'w-[64px]' : 'w-[160px]'
      )}>
        {/* Logo */}
        <div className={cn(
          'flex items-center py-4',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          <span className={cn(
            'font-bold tracking-widest text-primary font-display',
            collapsed ? 'text-xs' : 'text-sm'
          )}>
            {collapsed ? 'B' : 'BJORQ'}
          </span>
          {!isTablet && (
            <button
              onClick={() => setRailCollapsed(!railCollapsed)}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* Nav groups */}
        <div className="flex-1 flex flex-col gap-1 px-1.5 py-1">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && (
                <div className={cn(
                  'my-2',
                  collapsed ? 'mx-2 border-t border-border/20' : 'mx-3 border-t border-border/20'
                )} />
              )}
              {!collapsed && (
                <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                  {group.label}
                </p>
              )}
              {group.keys.map((key) => {
                const cat = catMap[key];
                if (!cat) return null;
                const active = activeCategory === key;
                const Icon = cat.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleCategoryClick(key)}
                    className={cn(
                      'relative flex items-center w-full rounded-xl text-[11px] font-medium transition-all select-none',
                      collapsed
                        ? 'justify-center px-2 py-2.5'
                        : 'gap-2.5 px-3 py-2.5 text-left',
                      active
                        ? 'nav-item-active text-primary'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 border-l-[3px] border-transparent'
                    )}
                    title={collapsed ? cat.label : undefined}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.5} className="shrink-0" />
                    {!collapsed && <span className="leading-tight truncate">{cat.label}</span>}
                    {key === 'activity' && unreadCount > 0 && (
                      <span className={cn(
                        'absolute bg-destructive text-destructive-foreground text-[7px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5',
                        collapsed ? 'top-1 right-1' : 'top-1.5 left-[26px]'
                      )}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom: Home + Design shortcuts */}
        <div className={cn(
          'flex flex-col gap-1 pb-4 pt-2 border-t border-sidebar-border/30',
          collapsed ? 'px-1.5' : 'px-2'
        )}>
          <button
            onClick={() => setAppMode('home')}
            className={cn(
              'flex items-center w-full rounded-xl text-[11px] font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-all border-l-[3px] border-transparent',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5'
            )}
            title={collapsed ? 'Hemvy' : undefined}
          >
            <Home size={18} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && <span>Hemvy</span>}
          </button>
          <button
            onClick={() => setAppMode('build')}
            className={cn(
              'flex items-center w-full rounded-xl text-[11px] font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-all border-l-[3px] border-transparent',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5'
            )}
            title={collapsed ? 'Design' : undefined}
          >
            <PenTool size={18} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && <span>Design</span>}
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
        {/* Summary strip — smalare, gradient-fade */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-2 bg-gradient-to-b from-surface-sunken/60 to-background/0 border-b border-border/10">
          <ClockWidget panel />
          <WeatherWidget />
          <EnergyWidget />
          <ScenesWidget />
        </div>

        {/* Content body with vignette */}
        <div className="flex-1 min-h-0 overflow-y-auto dashboard-vignette">
          <div className="p-5 pb-8">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
