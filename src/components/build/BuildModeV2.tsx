import { useAppStore } from '@/store/useAppStore';
import BuildTopToolbar from './BuildTopToolbar';
import BuildTabBar from './BuildTabBar';
import BuildLeftPanel from './BuildLeftPanel';
import BuildInspector from './BuildInspector';
import BuildCanvas2D from './BuildCanvas2D';

export default function BuildModeV2() {
  const cameraMode = useAppStore((s) => s.build.view.cameraMode);

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Top toolbar - always visible */}
      <BuildTopToolbar />

      {/* Main area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Left panel */}
        <BuildLeftPanel />

        {/* Canvas area */}
        <div className="flex-1 relative">
          {cameraMode === 'topdown' ? (
            <BuildCanvas2D />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-sm">3D-förhandsvisning (kommer snart)</span>
            </div>
          )}

          {/* Inspector overlay - floating right */}
          <BuildInspector />
        </div>
      </div>

      {/* Tab bar - bottom */}
      <BuildTabBar />
    </div>
  );
}
