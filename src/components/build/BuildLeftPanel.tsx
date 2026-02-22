import { useAppStore } from '@/store/useAppStore';
import type { BuildTool } from '@/store/types';
import {
  Minus, Square, DoorOpen, SquareStack, Paintbrush,
  Ruler, Upload, Compass, Layers, Move, RotateCcw,
  Package, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const importTools: ToolItem[] = [
  { key: 'select', label: 'Placera', icon: Move },
  { key: 'calibrate', label: 'Skala', icon: Ruler },
];

const furnishTools: ToolItem[] = [
  { key: 'select', label: 'Placera', icon: Move },
];

export default function BuildLeftPanel() {
  const tab = useAppStore((s) => s.build.tab);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const homeGeometrySource = useAppStore((s) => s.homeGeometry.source);

  const isStructureReadOnly = tab === 'structure' && homeGeometrySource === 'imported';

  const tools = tab === 'structure'
    ? structureTools
    : tab === 'import'
    ? importTools
    : furnishTools;

  return (
    <div className="w-14 lg:w-48 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col py-2 gap-0.5 overflow-y-auto">
      {/* Tab-specific header */}
      <div className="px-2 mb-2 hidden lg:block">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {tab === 'structure' ? 'Verktyg' : tab === 'import' ? 'Importera hem' : 'Möbler'}
        </h3>
      </div>

      {isStructureReadOnly && (
        <div className="px-2 mb-2 hidden lg:block">
          <p className="text-[10px] text-muted-foreground italic">
            Importerad modell aktiv — strukturredigering inaktiverad
          </p>
        </div>
      )}

      {tools.map(({ key, label, icon: Icon }) => (
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

      {/* Import-specific: Upload button */}
      {tab === 'import' && (
        <div className="mt-2 px-2">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all min-h-[44px]">
            <Upload size={18} />
            <span className="hidden lg:inline">Ladda upp GLB</span>
          </button>
        </div>
      )}

      {/* Furnish-specific: Import button */}
      {tab === 'furnish' && (
        <div className="mt-2 px-2">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all min-h-[44px]">
            <Plus size={18} />
            <span className="hidden lg:inline">Importera modell</span>
          </button>
        </div>
      )}
    </div>
  );
}
