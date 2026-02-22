import { useAppStore } from '@/store/useAppStore';
import { X, Plus, DoorOpen, RotateCcw, Move, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function BuildInspector() {
  const selection = useAppStore((s) => s.build.selection);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setSelection = useAppStore((s) => s.setSelection);
  const addOpening = useAppStore((s) => s.addOpening);
  const removeOpening = useAppStore((s) => s.removeOpening);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const deleteWall = useAppStore((s) => s.deleteWall);
  const items = useAppStore((s) => s.props.items);
  const updateProp = useAppStore((s) => s.updateProp);
  const removeProp = useAppStore((s) => s.removeProp);

  const floor = floors.find((f) => f.id === activeFloorId);

  if (!selection.id || !selection.type || !floor) return null;

  // ─── Wall Inspector ───
  if (selection.type === 'wall') {
    const wall = floor.walls.find((w) => w.id === selection.id);
    if (!wall) return null;

    const dx = wall.to[0] - wall.from[0];
    const dz = wall.to[1] - wall.from[1];
    const length = Math.sqrt(dx * dx + dz * dz);

    const handleAddOpening = (type: 'door' | 'window') => {
      if (!activeFloorId) return;
      pushUndo();
      addOpening(activeFloorId, wall.id, {
        id: generateId(),
        type,
        offset: 0.5,
        width: type === 'door' ? 0.9 : 1.2,
        height: type === 'door' ? 2.1 : 1.2,
        sillHeight: type === 'window' ? 0.9 : 0,
      });
    };

    const handleDelete = () => {
      if (!activeFloorId) return;
      pushUndo();
      deleteWall(activeFloorId, wall.id);
      setSelection({ type: null, id: null });
    };

    return (
      <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground font-display">Vägg</h3>
          <button onClick={() => setSelection({ type: null, id: null })}
            className="p-1 rounded hover:bg-secondary/30 text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>Längd:</span><span className="text-foreground">{length.toFixed(2)} m</span>
          <span>Höjd:</span><span className="text-foreground">{wall.height} m</span>
          <span>Tjocklek:</span><span className="text-foreground">{wall.thickness} m</span>
        </div>

        <div className="border-t border-border pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Öppningar</span>
            <div className="flex gap-1">
              <button onClick={() => handleAddOpening('door')}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-foreground transition-colors min-h-[32px]">
                <Plus size={12} /> Dörr
              </button>
              <button onClick={() => handleAddOpening('window')}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-foreground transition-colors min-h-[32px]">
                <Plus size={12} /> Fönster
              </button>
            </div>
          </div>

          {wall.openings.map((op) => (
            <div key={op.id} className="bg-secondary/30 rounded-lg p-2 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-foreground">
                <DoorOpen size={12} />
                {op.type === 'door' ? 'Dörr' : 'Fönster'}
              </span>
              <button
                onClick={() => { pushUndo(); removeOpening(activeFloorId!, wall.id, op.id); }}
                className="p-0.5 rounded hover:bg-destructive/20 text-destructive">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={handleDelete}
          className="w-full py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors min-h-[44px]">
          Ta bort vägg
        </button>
      </div>
    );
  }

  // ─── Prop Inspector ───
  if (selection.type === 'prop') {
    const prop = items.find((p) => p.id === selection.id);
    if (!prop) return null;

    const handleDelete = () => {
      removeProp(prop.id);
      setSelection({ type: null, id: null });
    };

    return (
      <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground font-display">Möbel</h3>
          <button onClick={() => setSelection({ type: null, id: null })}
            className="p-1 rounded hover:bg-secondary/30 text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="text-muted-foreground truncate">
          {prop.url.split('/').pop()}
        </div>

        {/* Position */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Move size={12} /> Position
          </div>
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <div key={axis} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-3">{axis}</span>
              <Slider
                min={-20} max={20} step={0.1}
                value={[prop.position[i]]}
                onValueChange={([v]) => {
                  const pos = [...prop.position] as [number, number, number];
                  pos[i] = v;
                  updateProp(prop.id, { position: pos });
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-foreground w-8 text-right">{prop.position[i].toFixed(1)}</span>
            </div>
          ))}
        </div>

        {/* Rotation Y */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-muted-foreground">
            <RotateCcw size={12} /> Rotation
          </div>
          <div className="flex items-center gap-2">
            <Slider
              min={0} max={360} step={1}
              value={[prop.rotation[1] * (180 / Math.PI)]}
              onValueChange={([v]) => updateProp(prop.id, { rotation: [0, v * (Math.PI / 180), 0] })}
              className="flex-1"
            />
            <span className="text-[10px] text-foreground w-8 text-right">
              {Math.round(prop.rotation[1] * (180 / Math.PI))}°
            </span>
          </div>
        </div>

        {/* Scale */}
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-[10px]">Skala</span>
          <div className="flex items-center gap-2">
            <Slider
              min={0.1} max={5} step={0.05}
              value={[prop.scale[0]]}
              onValueChange={([v]) => updateProp(prop.id, { scale: [v, v, v] })}
              className="flex-1"
            />
            <span className="text-[10px] text-foreground w-8 text-right">{prop.scale[0].toFixed(2)}x</span>
          </div>
        </div>

        <button onClick={handleDelete}
          className="w-full py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors min-h-[44px] flex items-center justify-center gap-1">
          <Trash2 size={14} /> Ta bort
        </button>
      </div>
    );
  }

  return null;
}
