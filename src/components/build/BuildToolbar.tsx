import { useAppStore } from '@/store/useAppStore';
import type { BuildTool } from '@/store/types';
import { MousePointer2, Minus, Ruler, Undo2, Redo2, Image, Trash2, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

const tools: { key: BuildTool; label: string; icon: typeof MousePointer2 }[] = [
  { key: 'select', label: 'Markera', icon: MousePointer2 },
  { key: 'wall', label: 'Vägg', icon: Minus },
  { key: 'opening', label: 'Öppning', icon: DoorOpen },
  { key: 'calibrate', label: 'Skala', icon: Ruler },
];

export default function BuildToolbar() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoLen = useAppStore((s) => s.build.undoStack.length);
  const redoLen = useAppStore((s) => s.build.redoStack.length);
  const setFloorplanImage = useAppStore((s) => s.setFloorplanImage);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const selectedWallId = useAppStore((s) => s.build.selectedWallId);
  const deleteWall = useAppStore((s) => s.deleteWall);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFloorplanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFloorId) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFloorplanImage(activeFloorId, reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteWall = () => {
    if (selectedWallId && activeFloorId) {
      pushUndo();
      deleteWall(activeFloorId, selectedWallId);
    }
  };

  return (
    <div className="flex items-center gap-1 glass-panel rounded-xl px-2 py-1.5">
      {tools.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setBuildTool(key)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            activeTool === key
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      <button onClick={undo} disabled={undoLen === 0} title="Ångra"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-30 transition-all">
        <Undo2 size={16} />
      </button>
      <button onClick={redo} disabled={redoLen === 0} title="Gör om"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-30 transition-all">
        <Redo2 size={16} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      <button onClick={() => fileInputRef.current?.click()} title="Importera planlösning"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all">
        <Image size={16} />
      </button>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFloorplanUpload} />

      {selectedWallId && (
        <button onClick={handleDeleteWall} title="Ta bort vägg"
          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/20 transition-all">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
