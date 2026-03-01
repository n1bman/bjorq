import { useAppStore } from '../../../store/useAppStore';
import { presetMaterials } from '../../../lib/materials';
import { cn } from '../../../lib/utils';

export default function PaintTool() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRoomMaterial = useAppStore((s) => s.setRoomMaterial);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);
  const allRooms = floor?.rooms ?? [];
  const rooms = allRooms.filter((r) => r.polygon && r.polygon.length >= 3);

  if (rooms.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Material
        </h4>
        <p className="text-[10px] text-muted-foreground italic px-1">
          Skapa rum först för att kunna måla.
        </p>
      </div>
    );
  }

  const materialsByType = {
    paint: presetMaterials.filter((m) => m.type === 'paint'),
    wood: presetMaterials.filter((m) => m.type === 'wood'),
    concrete: presetMaterials.filter((m) => m.type === 'concrete'),
    tile: presetMaterials.filter((m) => m.type === 'tile'),
    metal: presetMaterials.filter((m) => m.type === 'metal'),
  };

  const typeLabels: Record<string, string> = {
    paint: 'Färg',
    wood: 'Trä',
    concrete: 'Betong',
    tile: 'Kakel',
    metal: 'Metall',
  };

  const handleSetMaterial = (roomId: string, target: 'floor' | 'wall', materialId: string) => {
    if (!activeFloorId) return;
    pushUndo();
    setRoomMaterial(activeFloorId, roomId, target, materialId);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Material
      </h4>

      {rooms.map((room) => (
        <div key={room.id} className="space-y-2 px-1">
          <span className="text-xs text-foreground font-medium">{room.name}</span>

          {(['floor', 'wall'] as const).map((target) => {
            const currentId = target === 'floor' ? room.floorMaterialId : room.wallMaterialId;
            return (
              <div key={target} className="space-y-1">
                <span className="text-[10px] text-muted-foreground">
                  {target === 'floor' ? 'Golv' : 'Vägg'}
                </span>
                {Object.entries(materialsByType).map(([type, mats]) => (
                  <div key={type} className="space-y-0.5">
                    <span className="text-[9px] text-muted-foreground/70">{typeLabels[type]}</span>
                    <div className="flex flex-wrap gap-1">
                      {mats.map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => handleSetMaterial(room.id, target, mat.id)}
                          title={mat.name}
                          className={cn(
                            'w-6 h-6 rounded-sm border transition-all min-w-[24px] min-h-[24px]',
                            currentId === mat.id
                              ? 'border-primary ring-1 ring-primary scale-110'
                              : 'border-border hover:border-muted-foreground'
                          )}
                          style={{ backgroundColor: mat.color }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="border-b border-border" />
        </div>
      ))}
    </div>
  );
}
