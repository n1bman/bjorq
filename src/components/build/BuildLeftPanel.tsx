import { useAppStore } from '../../store/useAppStore';
import { detectRooms } from '../../lib/roomDetection';
import type { BuildTool, BuildTab } from '../../store/types';
import {
  Minus, Square, DoorOpen, SquareStack, Paintbrush,
  Ruler, Layers, RefreshCw, Hammer, Upload, Sofa, Lightbulb,
  Package, MousePointer2, Trash2, Copy,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToolDef {
  key: BuildTool;
  label: string;
  icon: typeof Minus;
}

const categoryTabs: { key: BuildTab; label: string; icon: typeof Hammer }[] = [
  { key: 'structure', label: 'Struktur', icon: Hammer },
  { key: 'import', label: 'Importera', icon: Upload },
  { key: 'furnish', label: 'Möblera', icon: Sofa },
  { key: 'devices', label: 'Enheter', icon: Lightbulb },
];

const structureTools: ToolDef[] = [
  { key: 'select', label: 'Markera', icon: MousePointer2 },
  { key: 'wall', label: 'Vägg', icon: Minus },
  { key: 'room', label: 'Rum', icon: Square },
  { key: 'door', label: 'Dörr', icon: DoorOpen },
  { key: 'window', label: 'Fönster', icon: SquareStack },
  { key: 'stairs', label: 'Trappor', icon: Layers },
  { key: 'template', label: 'Mallar', icon: Package },
  { key: 'paint', label: 'Måla', icon: Paintbrush },
  { key: 'measure', label: 'Mät', icon: Ruler },
  { key: 'calibrate', label: 'Skala', icon: Ruler },
  { key: 'copy', label: 'Kopiera', icon: Copy },
  { key: 'erase', label: 'Radera', icon: Trash2 },
];

export default function BuildLeftPanel() {
  const tab = useAppStore((s) => s.build.tab);
  const setBuildTab = useAppStore((s) => s.setBuildTab);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const homeGeometrySource = useAppStore((s) => s.homeGeometry.source);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRooms = useAppStore((s) => s.setRooms);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);
  const isStructureReadOnly = tab === 'structure' && homeGeometrySource === 'imported';

  return (
    <div className="w-14 border-r border-border bg-card/60 backdrop-blur-sm flex flex-col items-center py-1 gap-0.5 overflow-y-auto shrink-0">
      {/* Category tabs */}
      {categoryTabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setBuildTab(key)}
          title={label}
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
            tab === key
              ? 'bg-primary/20 text-primary shadow-[0_0_12px_hsl(var(--amber-glow))]'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <Icon size={18} />
        </button>
      ))}

      {/* Divider */}
      <div className="w-7 h-px bg-border my-1" />

      {/* Sub-tools for structure tab */}
      {tab === 'structure' && (
        <>
          {structureTools.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => !isStructureReadOnly && setBuildTool(key)}
              title={label}
              disabled={isStructureReadOnly}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
                isStructureReadOnly && 'opacity-30 cursor-not-allowed',
                activeTool === key
                  ? 'bg-primary/20 text-primary shadow-[0_0_12px_hsl(var(--amber-glow))]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Icon size={16} />
            </button>
          ))}

          {/* Room detection */}
          {!isStructureReadOnly && floor && floor.walls.length >= 3 && (
            <button
              onClick={() => {
                if (!activeFloorId || !floor) return;
                pushUndo();
                const detected = detectRooms(floor.walls);
                setRooms(activeFloorId, detected);
              }}
              title="Detektera rum"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/20 transition-all"
            >
              <RefreshCw size={16} />
            </button>
          )}
          {/* Room manager */}
          <div className="w-7 h-px bg-border my-1" />
          <div className="w-full px-0.5">
            <RoomManager />
          </div>
        </>
      )}
    </div>
  );
}
