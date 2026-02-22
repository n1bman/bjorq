import { useAppStore } from '@/store/useAppStore';
import Scene3D from '@/components/Scene3D';
import DashboardGrid from './DashboardGrid';
import { Home, PenTool, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomeView() {
  const viewMode = useAppStore((s) => s.homeView.viewMode);
  const setHomeViewMode = useAppStore((s) => s.setHomeViewMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  return (
    <div className="fixed inset-0 bg-background">
      {/* 3D Scene background */}
      <div className={cn(
        'absolute inset-0 transition-opacity duration-500',
        viewMode === 'dashboard' ? 'opacity-30' : 'opacity-100'
      )}>
        <Scene3D />
      </div>

      {/* Dashboard overlay */}
      {viewMode === 'dashboard' && <DashboardGrid />}

      {/* Bottom floating pill nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <nav className="glass-panel rounded-2xl px-2 py-1.5 flex items-center gap-1">
          <button
            onClick={() => setHomeViewMode(viewMode === '3d' ? 'dashboard' : '3d')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              viewMode === '3d'
                ? 'text-primary amber-glow'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Box size={16} />
            <span>3D</span>
          </button>

          <div className="w-px h-6 bg-border" />

          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-primary amber-glow"
          >
            <Home size={16} />
            <span>Hem</span>
          </button>

          <div className="w-px h-6 bg-border" />

          <button
            onClick={() => setAppMode('build')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <PenTool size={16} />
            <span>Bygge</span>
          </button>
        </nav>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
