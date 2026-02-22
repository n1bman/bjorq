import FloorManager from './FloorManager';
import BuildToolbar from './BuildToolbar';
import ScaleCalibration from './ScaleCalibration';
import WallProperties from './WallProperties';
import RoomList from './RoomList';
import MaterialsPanel from './MaterialsPanel';
import PropsPanel from './PropsPanel';
import BuildScene3D from './BuildScene3D';
import { useAppStore } from '@/store/useAppStore';

export default function BuildMode() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const selectedWallId = useAppStore((s) => s.build.selectedWallId);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);

  return (
    <div className="w-full h-full relative">
      {/* 3D Scene - full background */}
      <BuildScene3D />

      {/* Top center: Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
        <BuildToolbar />
      </div>

      {/* Top left: Floor manager */}
      <div className="absolute top-3 left-3 z-10 w-48">
        <FloorManager />
      </div>

      {/* Right side panels */}
      <div className="absolute top-3 right-3 z-10 w-56 space-y-2 max-h-[calc(100%-1.5rem)] overflow-y-auto">
        {activeTool === 'calibrate' && <ScaleCalibration />}
        {selectedWallId && <WallProperties />}
        <RoomList />
        <MaterialsPanel />
        <PropsPanel />
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-3 left-3 z-10 glass-panel rounded-lg px-3 py-1.5 text-[10px] text-muted-foreground flex gap-3">
        <span>Högerklick: rotera</span>
        <span>Mittenklick: panorera</span>
        <span>Scroll: zooma</span>
        {activeTool === 'wall' && wallDrawing.isDrawing && (
          <span className="text-primary font-medium">Dubbelklicka för att avsluta vägg</span>
        )}
        {activeTool === 'wall' && !wallDrawing.isDrawing && (
          <span className="text-primary font-medium">Klicka på marken för att börja rita vägg</span>
        )}
      </div>
    </div>
  );
}
