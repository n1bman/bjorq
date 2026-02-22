import { useAppStore } from '@/store/useAppStore';
import { detectRooms } from '@/lib/roomDetection';
import type { BuildTool } from '@/store/types';
import {
  Minus, Square, DoorOpen, SquareStack, Paintbrush,
  Ruler, Upload, Layers, Move, Package, Plus, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TemplatesPicker from './structure/TemplatesPicker';
import PaintTool from './structure/PaintTool';
import ImportTools from './import/ImportTools';
import FurnishTools from './furnish/FurnishTools';
import DevicePlacementTools from './devices/DevicePlacementTools';

interface ToolItem {
  key: BuildTool;
  label: string;
  icon: typeof Minus;
}

const structureTools: ToolItem[] = [
  { key: 'wall', label: 'Vägg', icon: Minus },
  { key: 'room', label: 'Rum', icon: Square },
  { key: 'door', label: 'Dörr', icon: DoorOpen },
  { key: 'window', label: 'Fönster', icon: SquareStack },
  { key: 'stairs', label: 'Trappor', icon: Layers },
  { key: 'template', label: 'Mallar', icon: Package },
  { key: 'paint', label: 'Måla', icon: Paintbrush },
  { key: 'measure', label: 'Mät', icon: Ruler },
  { key: 'calibrate', label: 'Skala', icon: Ruler },
];

export default function BuildLeftPanel() {
  const tab = useAppStore((s) => s.build.tab);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const homeGeometrySource = useAppStore((s) => s.homeGeometry.source);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRooms = useAppStore((s) => s.setRooms);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);

  const isStructureReadOnly = tab === 'structure' && homeGeometrySource === 'imported';

  // Show expanded sub-panel for template/paint tools
  const showSubPanel = tab === 'structure' && (activeTool === 'template' || activeTool === 'paint');

  return (
    <div className={cn(
      'border-r border-border bg-card/50 backdrop-blur-sm flex flex-col overflow-y-auto transition-all',
      showSubPanel ? 'w-56 lg:w-64' : 'w-14 lg:w-48'
    )}>
      {/* Structure tab */}
      {tab === 'structure' && (
        <>
          <div className="px-2 py-2 hidden lg:block">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Verktyg
            </h3>
          </div>

          {isStructureReadOnly && (
            <div className="px-2 mb-2 hidden lg:block">
              <p className="text-[10px] text-muted-foreground italic">
                Importerad modell aktiv — strukturredigering inaktiverad
              </p>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {structureTools.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => !isStructureReadOnly && setBuildTool(key)}
                title={label}
                disabled={isStructureReadOnly}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg text-xs font-medium transition-all min-h-[44px]',
                  'lg:justify-start justify-center',
                  isStructureReadOnly && 'opacity-40 cursor-not-allowed',
                  activeTool === key
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                )}
              >
                <Icon size={18} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Room detection button */}
          {!isStructureReadOnly && floor && floor.walls.length >= 3 && (
            <div className="mx-1 mt-1">
              <button
                onClick={() => {
                  if (!activeFloorId || !floor) return;
                  pushUndo();
                  const detected = detectRooms(floor.walls);
                  setRooms(activeFloorId, detected);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all min-h-[44px] lg:justify-start justify-center"
              >
                <RefreshCw size={16} />
                <span className="hidden lg:inline">Detektera rum</span>
              </button>
            </div>
          )}

          {/* Sub-panels for template/paint */}
          {activeTool === 'template' && !isStructureReadOnly && (
            <div className="border-t border-border mt-2 pt-2 px-2">
              <TemplatesPicker />
            </div>
          )}
          {activeTool === 'paint' && !isStructureReadOnly && (
            <div className="border-t border-border mt-2 pt-2 px-2 overflow-y-auto max-h-[50vh]">
              <PaintTool />
            </div>
          )}
        </>
      )}

      {/* Import tab */}
      {tab === 'import' && (
        <div className="py-2">
          <div className="px-2 mb-2 hidden lg:block">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Importera hem
            </h3>
          </div>
          <ImportTools />
        </div>
      )}

      {/* Furnish tab */}
      {tab === 'furnish' && (
        <div className="py-2">
          <div className="px-2 mb-2 hidden lg:block">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Möblera
            </h3>
          </div>
          <FurnishTools />
        </div>
      )}

      {/* Devices tab */}
      {tab === 'devices' && (
        <div className="py-2">
          <DevicePlacementTools />
        </div>
      )}
    </div>
  );
}
