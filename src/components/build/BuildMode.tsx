import FloorManager from './FloorManager';
import BuildToolbar from './BuildToolbar';
import Canvas2D from './Canvas2D';
import ScaleCalibration from './ScaleCalibration';
import { useAppStore } from '@/store/useAppStore';

export default function BuildMode() {
  const activeTool = useAppStore((s) => s.build.activeTool);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Top toolbar area */}
      <div className="flex items-start gap-2 p-2 flex-shrink-0 overflow-x-auto">
        <FloorManager />
        <BuildToolbar />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0">
        <Canvas2D />

        {/* Side panels */}
        {activeTool === 'calibrate' && (
          <div className="absolute top-2 right-2 w-56">
            <ScaleCalibration />
          </div>
        )}
      </div>
    </div>
  );
}
