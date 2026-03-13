import { useAppStore } from '../../../store/useAppStore';
import { wallSurfaceCategories, floorSurfaceCategories, surfaceCategoryLabels, getMaterialsByCategory } from '../../../lib/materials';
import { cn } from '../../../lib/utils';
import { useState } from 'react';

export default function PaintTool() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRoomMaterial = useAppStore((s) => s.setRoomMaterial);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const [surfaceCat, setSurfaceCat] = useState<string>('paint');
  const [target, setTarget] = useState<'floor' | 'wall'>('wall');

  const floor = floors.find((f) => f.id === activeFloorId);
  const allRooms = floor?.rooms ?? [];
  const rooms = allRooms.filter((r) => r.polygon && r.polygon.length >= 3);

  if (rooms.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Ytmaterial
        </h4>
        <p className="text-[10px] text-muted-foreground italic px-1">
          Skapa rum först för att kunna måla.
        </p>
      </div>
    );
  }

  const categories = target === 'wall' ? wallSurfaceCategories : floorSurfaceCategories;
  const mats = getMaterialsByCategory(surfaceCat);

  const handleSetMaterial = (roomId: string, materialId: string) => {
    if (!activeFloorId) return;
    pushUndo();
    setRoomMaterial(activeFloorId, roomId, target, materialId);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Ytmaterial
      </h4>

      {/* Target toggle */}
      <div className="flex gap-1 px-1">
        <button onClick={() => { setTarget('wall'); setSurfaceCat('paint'); }}
          className={cn('flex-1 py-1 rounded-md text-[10px] font-medium transition-colors',
            target === 'wall' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground')}>
          Vägg
        </button>
        <button onClick={() => { setTarget('floor'); setSurfaceCat('wood'); }}
          className={cn('flex-1 py-1 rounded-md text-[10px] font-medium transition-colors',
            target === 'floor' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground')}>
          Golv
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-0.5 px-1">
        {categories.map((cat) => (
          <button key={cat}
            onClick={() => setSurfaceCat(cat)}
            className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
              surfaceCat === cat
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary/20 text-muted-foreground hover:text-foreground hover:bg-secondary/40')}>
            {surfaceCategoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Per-room material application */}
      {rooms.map((room) => {
        const currentId = target === 'floor' ? room.floorMaterialId : room.wallMaterialId;
        return (
          <div key={room.id} className="space-y-1.5 px-1">
            <span className="text-xs text-foreground font-medium">{room.name}</span>
            <div className="flex flex-wrap gap-1">
              {mats.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => handleSetMaterial(room.id, mat.id)}
                  title={mat.name}
                  className={cn(
                    'w-6 h-6 rounded-sm border-2 transition-all min-w-[24px] min-h-[24px] relative group',
                    currentId === mat.id
                      ? 'border-primary ring-1 ring-primary scale-110'
                      : 'border-transparent hover:border-muted-foreground/30'
                  )}
                  style={{ backgroundColor: mat.color }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-popover text-popover-foreground text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-sm border border-border z-20">
                    {mat.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-b border-border" />
          </div>
        );
      })}
    </div>
  );
}
