import { useAppStore } from '../../../store/useAppStore';
import { wallSurfaceCategories, floorSurfaceCategories, surfaceCategoryLabels, floorCategoryLabels, getMaterialsByCategory, sizeModelLabels } from '../../../lib/materials';
import { cn } from '../../../lib/utils';
import { useState } from 'react';
import type { SurfaceSizeMode } from '../../../store/types';

/** Category icon SVGs for floor material badges */
const categoryIcons: Record<string, string> = {
  wood: '🪵',
  tile: '🔲',
  stone: '🪨',
  texture: '✦',
  carpet: '🧶',
};

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

  const isFloor = target === 'floor';
  const categories = isFloor ? floorSurfaceCategories : wallSurfaceCategories;
  const mats = getMaterialsByCategory(surfaceCat).filter((m) =>
    isFloor ? true : !m.floorOnly
  );

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
            {isFloor ? (floorCategoryLabels[cat] ?? surfaceCategoryLabels[cat]) : surfaceCategoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Per-room material application */}
      {rooms.map((room) => {
        const currentId = isFloor ? room.floorMaterialId : room.wallMaterialId;
        const currentSizeMode = room.floorSizeMode ?? 'auto';
        return (
          <div key={room.id} className="space-y-1.5 px-1">
            <span className="text-xs text-foreground font-medium">{room.name}</span>

            {/* Floor: larger material cards with ambientCG thumbnails */}
            {isFloor ? (
              <div className="grid grid-cols-3 gap-1.5">
                {mats.map((mat) => {
                  const thumbSrc = mat.thumbnailUrl || mat.mapPath;
                  const catIcon = categoryIcons[mat.surfaceCategory ?? ''] ?? '';
                  return (
                    <button
                      key={mat.id}
                      onClick={() => handleSetMaterial(room.id, mat.id)}
                      className={cn(
                        'rounded-md border-2 transition-all overflow-hidden flex flex-col items-center relative',
                        currentId === mat.id
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-transparent hover:border-muted-foreground/30'
                      )}
                    >
                      {/* Texture thumbnail or color swatch */}
                      <div
                        className="w-full aspect-square relative"
                        style={{ backgroundColor: mat.color }}
                      >
                        {thumbSrc && (
                          <img
                            src={thumbSrc}
                            alt={mat.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            crossOrigin="anonymous"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        {/* Category badge */}
                        {catIcon && (
                          <span className="absolute top-0.5 right-0.5 text-[8px] bg-background/70 rounded px-0.5 leading-tight backdrop-blur-sm">
                            {catIcon}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] text-muted-foreground leading-tight py-0.5 px-0.5 truncate w-full text-center">
                        {mat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Wall: keep existing small swatch grid */
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
                    {mat.hasTexture && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent border border-background" />
                    )}
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-popover text-popover-foreground text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-sm border border-border z-20">
                      {mat.name}{mat.hasTexture ? ' ✦' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Floor size mode selector */}
            {isFloor && currentId && (
              <div className="flex gap-0.5 mt-1">
                {(['auto', 'small', 'standard', 'large'] as SurfaceSizeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (!activeFloorId) return;
                      pushUndo();
                      const store = useAppStore.getState();
                      const updatedFloors = store.layout.floors.map((fl) => {
                        if (fl.id !== activeFloorId) return fl;
                        return {
                          ...fl,
                          rooms: fl.rooms.map((r) =>
                            r.id === room.id ? { ...r, floorSizeMode: mode } : r
                          ),
                        };
                      });
                      useAppStore.setState((s) => ({
                        layout: { ...s.layout, floors: updatedFloors },
                      }));
                    }}
                    className={cn(
                      'flex-1 py-0.5 rounded text-[8px] font-medium transition-colors',
                      currentSizeMode === mode
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary/20 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {sizeModelLabels[mode]}
                  </button>
                ))}
              </div>
            )}

            <div className="border-b border-border" />
          </div>
        );
      })}
    </div>
  );
}
