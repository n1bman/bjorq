import { useAppStore } from '@/store/useAppStore';
import { presetMaterials } from '@/lib/materials';
import { cn } from '@/lib/utils';

export default function MaterialsPanel() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRoomMaterial = useAppStore((s) => s.setRoomMaterial);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);
  const rooms = floor?.rooms ?? [];

  if (rooms.length === 0) return null;

  const handleSetMaterial = (roomId: string, target: 'floor' | 'wall', materialId: string) => {
    if (!activeFloorId) return;
    pushUndo();
    setRoomMaterial(activeFloorId, roomId, target, materialId);
  };

  const materialsByType = {
    paint: presetMaterials.filter((m) => m.type === 'paint'),
    wood: presetMaterials.filter((m) => m.type === 'wood'),
    concrete: presetMaterials.filter((m) => m.type === 'concrete'),
    tile: presetMaterials.filter((m) => m.type === 'tile'),
    metal: presetMaterials.filter((m) => m.type === 'metal'),
  };

  return (
    <div className="glass-panel rounded-xl p-3 space-y-3 text-xs max-h-80 overflow-y-auto">
      <h3 className="text-sm font-semibold text-foreground font-display">Material</h3>

      {rooms.map((room) => (
        <div key={room.id} className="space-y-2 border-b border-border pb-2 last:border-0">
          <span className="text-foreground font-medium">{room.name}</span>
          
          {(['floor', 'wall'] as const).map((target) => {
            const currentId = target === 'floor' ? room.floorMaterialId : room.wallMaterialId;
            return (
              <div key={target} className="space-y-1">
                <span className="text-muted-foreground">{target === 'floor' ? 'Golv' : 'Vägg'}:</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(materialsByType).map(([type, mats]) =>
                    mats.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => handleSetMaterial(room.id, target, mat.id)}
                        title={mat.name}
                        className={cn(
                          'w-5 h-5 rounded-sm border transition-all',
                          currentId === mat.id
                            ? 'border-primary ring-1 ring-primary scale-110'
                            : 'border-border hover:border-muted-foreground'
                        )}
                        style={{ backgroundColor: mat.color }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
