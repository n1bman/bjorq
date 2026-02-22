import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { DoorOpen, X, Plus } from 'lucide-react';

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function WallProperties() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const selectedWallId = useAppStore((s) => s.build.selectedWallId);
  const addOpening = useAppStore((s) => s.addOpening);
  const removeOpening = useAppStore((s) => s.removeOpening);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);
  const wall = floor?.walls.find((w) => w.id === selectedWallId);

  if (!wall || !activeFloorId) return null;

  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.sqrt(dx * dx + dz * dz);

  const handleAddOpening = (type: 'door' | 'window') => {
    pushUndo();
    addOpening(activeFloorId, wall.id, {
      id: generateId(),
      type,
      offset: 0.5,
      width: type === 'door' ? 0.9 : 1.2,
      height: type === 'door' ? 2.1 : 1.2,
    });
  };

  const handleRemoveOpening = (openingId: string) => {
    pushUndo();
    removeOpening(activeFloorId, wall.id, openingId);
  };

  return (
    <div className="glass-panel rounded-xl p-3 space-y-3 text-xs">
      <h3 className="text-sm font-semibold text-foreground font-display">Vägegenskaper</h3>
      
      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <span>Längd:</span><span className="text-foreground">{length.toFixed(2)} m</span>
        <span>Höjd:</span><span className="text-foreground">{wall.height} m</span>
        <span>Tjocklek:</span><span className="text-foreground">{wall.thickness} m</span>
      </div>

      <div className="border-t border-border pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">Öppningar</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleAddOpening('door')}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
              title="Lägg till dörr"
            >
              <Plus size={12} />
              <span>Dörr</span>
            </button>
            <button
              onClick={() => handleAddOpening('window')}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
              title="Lägg till fönster"
            >
              <Plus size={12} />
              <span>Fönster</span>
            </button>
          </div>
        </div>

        {wall.openings.length === 0 && (
          <p className="text-muted-foreground italic">Inga öppningar</p>
        )}

        {wall.openings.map((op) => (
          <div key={op.id} className="bg-secondary/30 rounded-lg p-2 mb-1.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-foreground">
                <DoorOpen size={12} />
                {op.type === 'door' ? 'Dörr' : 'Fönster'}
              </span>
              <button
                onClick={() => handleRemoveOpening(op.id)}
                className="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-12">Pos:</span>
                <span className="text-foreground">{(op.offset * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-12">B×H:</span>
                <span className="text-foreground">{op.width}×{op.height} m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
