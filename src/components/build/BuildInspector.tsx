import { useAppStore } from '@/store/useAppStore';
import { X, Plus, DoorOpen, RotateCcw, Move, Trash2, Layers, Home } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { presetMaterials } from '@/lib/materials';
import { useState } from 'react';

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function BuildInspector() {
  const selection = useAppStore((s) => s.build.selection);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const floor = floors.find((f) => f.id === activeFloorId);

  const closeBtn = (
    <button onClick={() => useAppStore.getState().setSelection({ type: null, id: null })}
      className="p-1 rounded hover:bg-secondary/30 text-muted-foreground">
      <X size={14} />
    </button>
  );

  if (!selection.id || !selection.type || !floor) return null;

  if (selection.type === 'wall') return <WallInspector floorId={activeFloorId!} wallId={selection.id} floor={floor} close={closeBtn} />;
  if (selection.type === 'prop') return <PropInspector propId={selection.id} close={closeBtn} />;
  if (selection.type === 'stair') return <StairInspector floorId={activeFloorId!} stairId={selection.id} floor={floor} close={closeBtn} />;
  if (selection.type === 'room') return <RoomInspector floorId={activeFloorId!} roomId={selection.id} floor={floor} close={closeBtn} />;
  if (selection.type === 'opening') return <OpeningInspector floorId={activeFloorId!} openingId={selection.id} floor={floor} close={closeBtn} />;

  return null;
}

// ─── Opening Inspector ───
function OpeningInspector({ floorId, openingId, floor, close }: { floorId: string; openingId: string; floor: any; close: React.ReactNode }) {
  const updateOpening = useAppStore((s) => s.updateOpening);
  const removeOpening = useAppStore((s) => s.removeOpening);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const setSelection = useAppStore((s) => s.setSelection);

  // Find the opening across all walls
  let foundWall: any = null;
  let foundOpening: any = null;
  for (const wall of floor.walls) {
    const op = wall.openings.find((o: any) => o.id === openingId);
    if (op) { foundWall = wall; foundOpening = op; break; }
  }

  if (!foundWall || !foundOpening) return null;

  const handleChange = (changes: Record<string, number>) => {
    pushUndo();
    updateOpening(floorId, foundWall.id, openingId, changes);
  };

  const handleDelete = () => {
    pushUndo();
    removeOpening(floorId, foundWall.id, openingId);
    setSelection({ type: null, id: null });
  };

  const isWindow = foundOpening.type === 'window';

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-1">
          <DoorOpen size={14} /> {isWindow ? 'Fönster' : 'Dörr'}
        </h3>
        {close}
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-[10px]">Bredd (m)</label>
        <div className="flex items-center gap-2">
          <Slider min={0.3} max={3} step={0.05} value={[foundOpening.width]}
            onValueChange={([v]) => handleChange({ width: v })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{foundOpening.width.toFixed(2)}</span>
        </div>

        <label className="text-muted-foreground text-[10px]">Höjd (m)</label>
        <div className="flex items-center gap-2">
          <Slider min={0.3} max={3} step={0.05} value={[foundOpening.height]}
            onValueChange={([v]) => handleChange({ height: v })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{foundOpening.height.toFixed(2)}</span>
        </div>

        {isWindow && (
          <>
            <label className="text-muted-foreground text-[10px]">Bröstningshöjd (m)</label>
            <div className="flex items-center gap-2">
              <Slider min={0} max={2} step={0.05} value={[foundOpening.sillHeight]}
                onValueChange={([v]) => handleChange({ sillHeight: v })} className="flex-1" />
              <span className="text-[10px] text-foreground w-8 text-right">{foundOpening.sillHeight.toFixed(2)}</span>
            </div>
          </>
        )}

        <label className="text-muted-foreground text-[10px]">Position längs vägg</label>
        <div className="flex items-center gap-2">
          <Slider min={0.05} max={0.95} step={0.01} value={[foundOpening.offset]}
            onValueChange={([v]) => handleChange({ offset: v })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{(foundOpening.offset * 100).toFixed(0)}%</span>
        </div>
      </div>

      <button onClick={handleDelete}
        className="w-full py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors min-h-[44px] flex items-center justify-center gap-1">
        <Trash2 size={14} /> Ta bort
      </button>
    </div>
  );
}

// ─── Wall Inspector Component ───
function WallInspector({ floorId, wallId, floor, close }: { floorId: string; wallId: string; floor: any; close: React.ReactNode }) {
  const addOpening = useAppStore((s) => s.addOpening);
  const removeOpening = useAppStore((s) => s.removeOpening);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const deleteWall = useAppStore((s) => s.deleteWall);
  const setSelection = useAppStore((s) => s.setSelection);

  const wall = floor.walls.find((w: any) => w.id === wallId);
  if (!wall) return null;

  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.sqrt(dx * dx + dz * dz);

  const handleAddOpening = (type: 'door' | 'window') => {
    pushUndo();
    addOpening(floorId, wall.id, {
      id: Math.random().toString(36).slice(2, 10),
      type,
      offset: 0.5,
      width: type === 'door' ? 0.9 : 1.2,
      height: type === 'door' ? 2.1 : 1.2,
      sillHeight: type === 'window' ? 0.9 : 0,
    });
  };

  const handleDelete = () => {
    pushUndo();
    deleteWall(floorId, wall.id);
    setSelection({ type: null, id: null });
  };

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display">Vägg</h3>
        {close}
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

        {wall.openings.map((op: any) => (
          <div key={op.id} className="bg-secondary/30 rounded-lg p-2 mb-1.5 flex items-center justify-between">
            <button
              onClick={() => setSelection({ type: 'opening', id: op.id })}
              className="flex items-center gap-1 text-foreground hover:text-primary transition-colors"
            >
              <DoorOpen size={12} />
              {op.type === 'door' ? 'Dörr' : 'Fönster'}
            </button>
            <button
              onClick={() => { pushUndo(); removeOpening(floorId, wall.id, op.id); }}
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

// ─── Prop Inspector Component ───
function PropInspector({ propId, close }: { propId: string; close: React.ReactNode }) {
  const items = useAppStore((s) => s.props.items);
  const updateProp = useAppStore((s) => s.updateProp);
  const removeProp = useAppStore((s) => s.removeProp);
  const setSelection = useAppStore((s) => s.setSelection);

  const prop = items.find((p) => p.id === propId);
  if (!prop) return null;

  const handleDelete = () => {
    removeProp(prop.id);
    setSelection({ type: null, id: null });
  };

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display">Möbel</h3>
        {close}
      </div>

      <div className="text-muted-foreground truncate">{prop.url.split('/').pop()}</div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-muted-foreground"><Move size={12} /> Position</div>
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-3">{axis}</span>
            <Slider min={-20} max={20} step={0.1} value={[prop.position[i]]}
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

      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-muted-foreground"><RotateCcw size={12} /> Rotation</div>
        <div className="flex items-center gap-2">
          <Slider min={0} max={360} step={1}
            value={[prop.rotation[1] * (180 / Math.PI)]}
            onValueChange={([v]) => updateProp(prop.id, { rotation: [0, v * (Math.PI / 180), 0] })}
            className="flex-1"
          />
          <span className="text-[10px] text-foreground w-8 text-right">{Math.round(prop.rotation[1] * (180 / Math.PI))}°</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-muted-foreground text-[10px]">Skala</span>
        <div className="flex items-center gap-2">
          <Slider min={0.1} max={5} step={0.05} value={[prop.scale[0]]}
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

// ─── Stair Inspector Component ───
function StairInspector({ floorId, stairId, floor, close }: { floorId: string; stairId: string; floor: any; close: React.ReactNode }) {
  const removeStair = useAppStore((s) => s.removeStair);
  const updateStair = useAppStore((s) => s.updateStair);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const setSelection = useAppStore((s) => s.setSelection);

  const stair = floor.stairs.find((s: any) => s.id === stairId);
  if (!stair) return null;

  const handleDelete = () => {
    pushUndo();
    removeStair(floorId, stair.id);
    setSelection({ type: null, id: null });
  };

  const handleChange = (changes: Record<string, any>) => {
    pushUndo();
    updateStair(floorId, stair.id, changes);
  };

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-1">
          <Layers size={14} /> Trappa
        </h3>
        {close}
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-[10px]">Bredd (m)</label>
        <div className="flex items-center gap-2">
          <Slider min={0.5} max={3} step={0.1} value={[stair.width]}
            onValueChange={([v]) => handleChange({ width: v })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{stair.width.toFixed(1)}</span>
        </div>

        <label className="text-muted-foreground text-[10px]">Längd (m)</label>
        <div className="flex items-center gap-2">
          <Slider min={1} max={5} step={0.1} value={[stair.length]}
            onValueChange={([v]) => handleChange({ length: v })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{stair.length.toFixed(1)}</span>
        </div>

        <label className="text-muted-foreground text-[10px]">Rotation</label>
        <div className="flex items-center gap-2">
          <Slider min={0} max={360} step={1} value={[stair.rotation * (180 / Math.PI)]}
            onValueChange={([v]) => handleChange({ rotation: v * (Math.PI / 180) })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{Math.round(stair.rotation * (180 / Math.PI))}°</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <span>X:</span><span className="text-foreground">{stair.position[0].toFixed(1)} m</span>
        <span>Z:</span><span className="text-foreground">{stair.position[1].toFixed(1)} m</span>
      </div>

      <button onClick={handleDelete}
        className="w-full py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors min-h-[44px] flex items-center justify-center gap-1">
        <Trash2 size={14} /> Ta bort trappa
      </button>
    </div>
  );
}

// ─── Room Inspector Component ───
function RoomInspector({ floorId, roomId, floor, close }: { floorId: string; roomId: string; floor: any; close: React.ReactNode }) {
  const removeRoom = useAppStore((s) => s.removeRoom);
  const renameRoom = useAppStore((s) => s.renameRoom);
  const setRoomMaterial = useAppStore((s) => s.setRoomMaterial);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const setSelection = useAppStore((s) => s.setSelection);

  const room = floor.rooms.find((r: any) => r.id === roomId);
  if (!room) return null;

  let area = 0;
  if (room.polygon && room.polygon.length >= 3) {
    for (let i = 0; i < room.polygon.length; i++) {
      const j = (i + 1) % room.polygon.length;
      area += room.polygon[i][0] * room.polygon[j][1];
      area -= room.polygon[j][0] * room.polygon[i][1];
    }
    area = Math.abs(area) / 2;
  }

  const handleDelete = () => {
    pushUndo();
    removeRoom(floorId, room.id);
    setSelection({ type: null, id: null });
  };

  const floorMats = presetMaterials.filter((m) => m.type === 'wood' || m.type === 'tile' || m.type === 'concrete');
  const wallMats = presetMaterials.filter((m) => m.type === 'paint' || m.type === 'concrete' || m.type === 'tile');

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-1">
          <Home size={14} /> Rum
        </h3>
        {close}
      </div>

      <input
        type="text"
        value={room.name}
        onChange={(e) => renameRoom(floorId, room.id, e.target.value)}
        className="w-full px-2 py-1.5 rounded-md bg-secondary/50 text-foreground text-xs border-none outline-none"
        placeholder="Rumsnamn"
      />

      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <span>Area:</span><span className="text-foreground">{area.toFixed(1)} m²</span>
        <span>Väggar:</span><span className="text-foreground">{room.wallIds.length}</span>
      </div>

      <div className="space-y-1">
        <span className="text-muted-foreground text-[10px]">Golvmaterial</span>
        <div className="flex flex-wrap gap-1">
          {floorMats.map((m) => (
            <button
              key={m.id}
              onClick={() => setRoomMaterial(floorId, room.id, 'floor', m.id)}
              title={m.name}
              className={`w-6 h-6 rounded border-2 transition-all ${room.floorMaterialId === m.id ? 'border-primary scale-110' : 'border-transparent hover:border-muted-foreground/30'}`}
              style={{ backgroundColor: m.color }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-muted-foreground text-[10px]">Väggfärg</span>
        <div className="flex flex-wrap gap-1">
          {wallMats.map((m) => (
            <button
              key={m.id}
              onClick={() => setRoomMaterial(floorId, room.id, 'wall', m.id)}
              title={m.name}
              className={`w-6 h-6 rounded border-2 transition-all ${room.wallMaterialId === m.id ? 'border-primary scale-110' : 'border-transparent hover:border-muted-foreground/30'}`}
              style={{ backgroundColor: m.color }}
            />
          ))}
        </div>
      </div>

      <button onClick={handleDelete}
        className="w-full py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors min-h-[44px] flex items-center justify-center gap-1">
        <Trash2 size={14} /> Ta bort rum
      </button>
    </div>
  );
}
