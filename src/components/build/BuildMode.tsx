import FloorManager from './FloorManager';
import BuildToolbar from './BuildToolbar';
import Canvas2D from './Canvas2D';
import ScaleCalibration from './ScaleCalibration';
import WallProperties from './WallProperties';
import RoomList from './RoomList';
import MaterialsPanel from './MaterialsPanel';
import PropsPanel from './PropsPanel';
import BuildPreview3D from './BuildPreview3D';
import { useAppStore } from '@/store/useAppStore';

export default function BuildMode() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const selectedWallId = useAppStore((s) => s.build.selectedWallId);
  const show3D = useAppStore((s) => s.build.show3DPreview);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-start gap-2 p-2 flex-shrink-0 overflow-x-auto">
        <FloorManager />
        <BuildToolbar />
      </div>

      <div className="flex-1 relative min-h-0">
        {show3D ? <BuildPreview3D /> : <Canvas2D />}

        {/* Right side panels */}
        <div className="absolute top-2 right-2 w-56 space-y-2 max-h-[calc(100%-1rem)] overflow-y-auto">
          {activeTool === 'calibrate' && <ScaleCalibration />}
          {selectedWallId && <WallProperties />}
          <RoomList />
          <MaterialsPanel />
          <PropsPanel />
        </div>
      </div>
    </div>
  );
}
