import { useAppStore } from '@/store/useAppStore';
import type { BuildTool, SnapMode } from '@/store/types';
import {
  MousePointer2, Minus, Square, DoorOpen, SquareStack,
  Undo2, Redo2, Grid3X3, Ruler, Trash2, Copy, Paintbrush,
  Eye, Box, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FloorPicker from './FloorPicker';

const viewModes = [
  { key: 'topdown' as const, label: 'Plan', icon: Eye },
  { key: '3d' as const, label: '3D', icon: Box },
  { key: 'floor-isolate' as const, label: 'Isolera', icon: Layers },
];

const gridSizes = [0.1, 0.25, 0.5, 1.0];
const snapModes: { key: SnapMode; label: string }[] = [
  { key: 'strict', label: 'Strikt' },
  { key: 'soft', label: 'Mjuk' },
  { key: 'off', label: 'Av' },
];

export default function BuildTopToolbar() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoLen = useAppStore((s) => s.build.undoStack.length);
  const redoLen = useAppStore((s) => s.build.redoStack.length);
  const grid = useAppStore((s) => s.build.grid);
  const setGrid = useAppStore((s) => s.setGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);
  const cameraMode = useAppStore((s) => s.build.view.cameraMode);
  const setCameraMode = useAppStore((s) => s.setCameraMode);

  const ToolBtn = ({ tool, icon: Icon, label }: { tool: BuildTool; icon: typeof MousePointer2; label: string }) => (
    <button
      onClick={() => setBuildTool(tool)}
      title={label}
      className={cn(
        'flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all min-w-[44px] min-h-[44px] justify-center',
        activeTool === tool
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
      )}
    >
      <Icon size={18} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/80 backdrop-blur-sm flex-wrap">
      {/* Primary tools */}
      <ToolBtn tool="select" icon={MousePointer2} label="Markera" />
      <ToolBtn tool="copy" icon={Copy} label="Kopiera" />
      <ToolBtn tool="erase" icon={Trash2} label="Radera" />

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo/Redo */}
      <button onClick={undo} disabled={undoLen === 0} title="Ångra"
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-30 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Undo2 size={18} />
      </button>
      <button onClick={redo} disabled={redoLen === 0} title="Gör om"
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-30 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Redo2 size={18} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Grid controls */}
      <button onClick={toggleGrid} title="Rutnät"
        className={cn(
          'p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          grid.enabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
        )}>
        <Grid3X3 size={18} />
      </button>

      {/* Grid size */}
      <select
        value={grid.sizeMeters}
        onChange={(e) => setGrid({ sizeMeters: parseFloat(e.target.value) })}
        className="h-8 px-1.5 rounded-md bg-secondary/50 text-xs text-foreground border-none outline-none cursor-pointer"
        title="Rutnätsstorlek"
      >
        {gridSizes.map((s) => (
          <option key={s} value={s}>{s} m</option>
        ))}
      </select>

      {/* Snap mode */}
      <select
        value={grid.snapMode}
        onChange={(e) => setGrid({ snapMode: e.target.value as SnapMode })}
        className="h-8 px-1.5 rounded-md bg-secondary/50 text-xs text-foreground border-none outline-none cursor-pointer"
        title="Snap-läge"
      >
        {snapModes.map((sm) => (
          <option key={sm.key} value={sm.key}>{sm.label}</option>
        ))}
      </select>

      <div className="w-px h-6 bg-border mx-1" />

      {/* View toggle */}
      <div className="flex items-center gap-0.5 bg-secondary/30 rounded-lg p-0.5">
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCameraMode(key)}
            title={label}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all min-h-[36px]',
              cameraMode === key
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Floor picker */}
      <FloorPicker />
    </div>
  );
}
