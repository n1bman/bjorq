import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { X, Plus, DoorOpen, RotateCcw, Move, Trash2, Layers, Home, Lightbulb, ArrowRightLeft, Monitor, RectangleHorizontal, Warehouse, Upload } from 'lucide-react';
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { presetMaterials, addCustomMaterial } from '../../lib/materials';
import { openingPresets, getPresetsByType } from '../../lib/openingPresets';
import { useState, useRef } from 'react';
import type { DeviceKind, DeviceSurface, ScreenConfig, LightType, WallOpening } from '../../store/types';
import HAEntityPicker from './devices/HAEntityPicker';

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
  if (selection.type === 'device') return <DeviceInspector deviceId={selection.id} close={closeBtn} />;

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

  const handleChange = (changes: Record<string, any>) => {
    pushUndo();
    updateOpening(floorId, foundWall.id, openingId, changes);
  };

  const handleDelete = () => {
    pushUndo();
    removeOpening(floorId, foundWall.id, openingId);
    setSelection({ type: null, id: null });
  };

  const isWindow = foundOpening.type === 'window';
  const isGarage = foundOpening.type === 'garage-door';
  const typeLabel = isGarage ? 'Garageport' : isWindow ? 'Fönster' : 'Dörr';
  const presets = getPresetsByType(foundOpening.type);

  const handlePreset = (presetId: string) => {
    const preset = openingPresets.find((p) => p.id === presetId);
    if (!preset) return;
    pushUndo();
    updateOpening(floorId, foundWall.id, openingId, {
      width: preset.width,
      height: preset.height,
      sillHeight: preset.sillHeight,
      style: preset.style,
    });
  };

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-1">
          {isGarage ? <Warehouse size={14} /> : <DoorOpen size={14} />} {typeLabel}
        </h3>
        {close}
      </div>

      {/* Preset picker */}
      {presets.length > 0 && (
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px]">Förinställning</label>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button key={p.id} onClick={() => handlePreset(p.id)}
                className="px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-foreground text-[10px] transition-colors"
                title={p.description}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-muted-foreground text-[10px]">Bredd (m)</label>
        <div className="flex items-center gap-2">
          <Slider min={0.3} max={isGarage ? 6 : 3} step={0.05} value={[foundOpening.width]}
            onValueChange={([v]) => handleChange({ width: v })} className="flex-1" />
          <span className="text-[10px] text-foreground w-8 text-right">{foundOpening.width.toFixed(2)}</span>
        </div>

        <label className="text-muted-foreground text-[10px]">Höjd (m)</label>
        <div className="flex items-center gap-2">
          <Slider min={0.3} max={isGarage ? 4 : 3} step={0.05} value={[foundOpening.height]}
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

        {/* Style selector */}
        {foundOpening.type === 'door' && (
          <>
            <label className="text-muted-foreground text-[10px]">Stil</label>
            <div className="flex gap-1">
              {['single', 'double', 'sliding'].map((s) => (
                <button key={s} onClick={() => handleChange({ style: s })}
                  className={`px-2 py-1 rounded-md text-[10px] transition-colors ${foundOpening.style === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary text-foreground'}`}>
                  {s === 'single' ? 'Enkel' : s === 'double' ? 'Par' : 'Skjut'}
                </button>
              ))}
            </div>
          </>
        )}

        {foundOpening.type === 'window' && (
          <>
            <label className="text-muted-foreground text-[10px]">Stil</label>
            <div className="flex gap-1">
              {['casement', 'fixed', 'french'].map((s) => (
                <button key={s} onClick={() => handleChange({ style: s })}
                  className={`px-2 py-1 rounded-md text-[10px] transition-colors ${foundOpening.style === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary text-foreground'}`}>
                  {s === 'casement' ? 'Sido' : s === 'fixed' ? 'Fast' : 'Altan'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Material / color picker for opening */}
      <div className="border-t border-border pt-2 space-y-1">
        <label className="text-muted-foreground text-[10px]">Material / Färg</label>
        <div className="flex flex-wrap gap-1">
          {presetMaterials.filter((m) => m.type === 'paint' || m.type === 'wood' || m.type === 'metal').slice(0, 8).map((m) => (
            <button
              key={m.id}
              onClick={() => handleChange({ materialId: m.id })}
              className={cn(
                'w-7 h-7 rounded-md border-2 transition-all',
                foundOpening.materialId === m.id ? 'border-primary scale-110' : 'border-border hover:border-primary/50'
              )}
              style={{ backgroundColor: m.color }}
              title={m.name}
            />
          ))}
          {foundOpening.materialId && (
            <button
              onClick={() => handleChange({ materialId: undefined })}
              className="px-1.5 py-0.5 rounded-md bg-secondary/50 hover:bg-secondary text-foreground text-[9px]"
            >
              Återställ
            </button>
          )}
        </div>
      </div>

      {/* HA Entity linking for garage doors */}
      {isGarage && (
        <div className="border-t border-border pt-2 space-y-1">
          <label className="text-muted-foreground text-[10px]">Home Assistant-entitet (cover)</label>
          <Input
            value={foundOpening.haEntityId || ''}
            onChange={(e) => handleChange({ haEntityId: e.target.value })}
            placeholder="cover.garage_door"
            className="h-7 text-[10px]"
          />
        </div>
      )}

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
  const updateWall = useAppStore((s) => s.updateWall);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const [materialTarget, setMaterialTarget] = useState<'exterior' | 'interior'>('exterior');

  const wall = floor.walls.find((w: any) => w.id === wallId);
  if (!wall) return null;

  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.sqrt(dx * dx + dz * dz);

  const handleAddOpening = (type: 'door' | 'window' | 'garage-door') => {
    pushUndo();
    const newId = generateId();
    const defaults = type === 'garage-door'
      ? { width: 2.5, height: 2.2, sillHeight: 0, style: 'sectional' }
      : type === 'door'
        ? { width: 0.9, height: 2.1, sillHeight: 0, style: 'single' }
        : { width: 1.2, height: 1.2, sillHeight: 0.9, style: 'casement' };
    addOpening(floorId, wall.id, {
      id: newId,
      type,
      offset: 0.5,
      ...defaults,
    });
    // Auto-select the new opening to prevent spam
    setSelection({ type: 'opening', id: newId });
  };

  const handleDelete = () => {
    pushUndo();
    deleteWall(floorId, wall.id);
    setSelection({ type: null, id: null });
  };

  const handleSetMaterial = (matId: string) => {
    pushUndo();
    if (materialTarget === 'exterior') {
      updateWall(floorId, wall.id, { materialId: matId });
    } else {
      updateWall(floorId, wall.id, { interiorMaterialId: matId });
    }
  };

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const customId = `custom-${generateId()}`;
    addCustomMaterial({
      id: customId,
      name: file.name.replace(/\.[^.]+$/, ''),
      type: 'custom',
      color: '#ffffff',
      roughness: 0.7,
      textureUrl: url,
    });
    pushUndo();
    if (materialTarget === 'exterior') {
      updateWall(floorId, wall.id, { materialId: customId });
    } else {
      updateWall(floorId, wall.id, { interiorMaterialId: customId });
    }
    e.target.value = '';
  };

  const wallMats = presetMaterials.filter((m) => m.type === 'paint' || m.type === 'wood' || m.type === 'tile' || m.type === 'concrete');
  const currentMatId = materialTarget === 'exterior' ? wall.materialId : wall.interiorMaterialId;

  return (
    <div className="absolute top-3 right-3 w-60 glass-panel rounded-xl p-3 space-y-3 text-xs z-10 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display">Vägg</h3>
        {close}
      </div>

      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <span>Längd:</span><span className="text-foreground">{length.toFixed(2)} m</span>
        <span>Höjd:</span><span className="text-foreground">{wall.height} m</span>
        <span>Tjocklek:</span><span className="text-foreground">{wall.thickness} m</span>
      </div>

      {/* Interior/Exterior material */}
      <div className="border-t border-border pt-2 space-y-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setMaterialTarget('exterior')}
            className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-colors ${materialTarget === 'exterior' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'}`}>
            Utsida
          </button>
          <button onClick={() => setMaterialTarget('interior')}
            className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-colors ${materialTarget === 'interior' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'}`}>
            Insida
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {wallMats.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSetMaterial(m.id)}
              title={m.name}
              className={`w-6 h-6 rounded border-2 transition-all ${currentMatId === m.id ? 'border-primary scale-110' : 'border-transparent hover:border-muted-foreground/30'}`}
              style={{ backgroundColor: m.color }}
            />
          ))}
        </div>
        <input ref={textureInputRef} type="file" accept="image/*" className="hidden" onChange={handleTextureUpload} />
        <button onClick={() => textureInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground text-[10px] transition-colors">
          <Upload size={12} /> Importera textur
        </button>
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
              {op.type === 'door' ? 'Dörr' : op.type === 'garage-door' ? 'Garageport' : 'Fönster'}
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
  const catalog = useAppStore((s) => s.props.catalog);
  const updateProp = useAppStore((s) => s.updateProp);
  const updateCatalogItem = useAppStore((s) => s.updateCatalogItem);
  const removeProp = useAppStore((s) => s.removeProp);
  const setSelection = useAppStore((s) => s.setSelection);

  const prop = items.find((p) => p.id === propId);
  if (!prop) return null;

  const catItem = catalog.find((c) => c.id === prop.catalogId);
  const displayName = prop.name || catItem?.name || 'Modell';
  const stats = prop.modelStats;

  const handleDelete = () => {
    removeProp(prop.id);
    setSelection({ type: null, id: null });
  };

  const handleRename = (newName: string) => {
    updateProp(prop.id, { name: newName });
    if (catItem) updateCatalogItem(catItem.id, { name: newName });
  };

  return (
    <div className="absolute top-3 right-3 w-56 glass-panel rounded-xl p-3 space-y-3 text-xs z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display">Möbel</h3>
        {close}
      </div>

      {/* Editable name */}
      <div className="space-y-1">
        <label className="text-muted-foreground text-[10px]">Namn</label>
        <Input
          value={displayName}
          onChange={(e) => handleRename(e.target.value)}
          className="h-7 text-xs bg-secondary/50 border-none"
          placeholder="Modellnamn"
        />
      </div>

      {/* Model performance stats */}
      {stats && (
        <div className="rounded-lg bg-secondary/30 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px]">Prestanda</span>
            <span className={`text-[10px] font-semibold ${
              stats.rating === 'OK' ? 'text-green-400' : stats.rating === 'Tung' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {stats.rating === 'OK' ? '✓ OK' : stats.rating === 'Tung' ? '⚠ Tung' : '⛔ För tung'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground text-center">
            <div>
              <div className="text-foreground font-medium">{stats.triangles.toLocaleString('sv-SE')}</div>
              <div>Trianglar</div>
            </div>
            <div>
              <div className="text-foreground font-medium">{stats.meshCount}</div>
              <div>Meshes</div>
            </div>
            <div>
              <div className="text-foreground font-medium">{stats.materialCount}</div>
              <div>Material</div>
            </div>
          </div>
        </div>
      )}

      {!stats && (
        <div className="rounded-lg bg-secondary/30 p-2 text-[10px] text-muted-foreground text-center">
          Laddar prestandainfo…
        </div>
      )}

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

      {/* HA Entity placeholder */}
      <div className="space-y-1 opacity-50">
        <label className="text-muted-foreground text-[10px]">HA Entity (kommande)</label>
        <Input
          disabled
          value={prop.haEntityId || ''}
          className="h-7 text-xs bg-secondary/30 border-none"
          placeholder="entity_id"
        />
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

// ─── Device Inspector Component ───
const kindLabels: Record<DeviceKind, string> = {
  light: 'Ljus',
  switch: 'Knapp',
  sensor: 'Sensor',
  climate: 'Klimat',
  vacuum: 'Dammsugare',
  camera: 'Kamera',
  fridge: 'Kylskåp',
  oven: 'Ugn',
  washer: 'Tvättmaskin',
  'garage-door': 'Garageport',
  'door-lock': 'Dörrlås',
  'power-outlet': 'Eluttag',
  media_screen: 'Skärm',
  fan: 'Fläkt',
  cover: 'Persienn/Port',
  scene: 'Scen',
  alarm: 'Larm',
  'water-heater': 'Varmvatten',
  humidifier: 'Luftfuktare',
  siren: 'Siren',
  valve: 'Ventil',
  remote: 'Fjärr',
  'lawn-mower': 'Gräsklippare',
  speaker: 'Högtalare',
  soundbar: 'Soundbar',
};

function DeviceInspector({ deviceId, close }: { deviceId: string; close: React.ReactNode }) {
  const markers = useAppStore((s) => s.devices.markers);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const removeDevice = useAppStore((s) => s.removeDevice);
  const setSelection = useAppStore((s) => s.setSelection);

  const device = markers.find((m) => m.id === deviceId);
  if (!device) return null;

  const isScreen = device.kind === 'media_screen';
  const isLight = device.kind === 'light';
  const screenConfig = device.screenConfig ?? { aspectRatio: 16 / 9, uiStyle: 'minimal' as const, showProgress: true };
  const scale = device.scale ?? [1.2, 0.675, 1];

  const lightTypeOptions: { value: LightType; label: string; emoji: string }[] = [
    { value: 'ceiling', label: 'Tak', emoji: '🔵' },
    { value: 'strip', label: 'Strip', emoji: '🟢' },
    { value: 'wall', label: 'Vägg', emoji: '🟡' },
    { value: 'spot', label: 'Spot', emoji: '⚪' },
  ];

  const handleDelete = () => {
    removeDevice(device.id);
    setSelection({ type: null, id: null });
  };

  const handleWidthChange = (w: number) => {
    const h = w / screenConfig.aspectRatio;
    updateDevice(device.id, { scale: [w, h, 1] });
  };

  const handleAspectChange = (ratio: number) => {
    const h = scale[0] / ratio;
    updateDevice(device.id, {
      scale: [scale[0], h, 1],
      screenConfig: { ...screenConfig, aspectRatio: ratio },
    });
  };

  const handleFit169 = () => {
    const h = scale[0] / (16 / 9);
    updateDevice(device.id, {
      scale: [scale[0], h, 1],
      screenConfig: { ...screenConfig, aspectRatio: 16 / 9 },
    });
  };

  const handleResetRotation = () => {
    updateDevice(device.id, { rotation: [0, 0, 0] });
  };

  return (
    <div className="absolute top-3 right-3 w-60 glass-panel rounded-xl p-3 space-y-3 text-xs z-10 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-1">
          {isScreen ? <Monitor size={14} /> : <Lightbulb size={14} />} {kindLabels[device.kind]}
        </h3>
        {close}
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-[10px]">Namn</label>
        <Input
          value={device.name}
          onChange={(e) => updateDevice(device.id, { name: e.target.value })}
          placeholder={isScreen ? 'T.ex. TV Vardagsrum' : 'T.ex. Taklampa kök'}
          className="h-8 text-xs bg-secondary/30"
        />
      </div>

      {/* Light type selector */}
      {isLight && (
        <div className="space-y-2">
          <label className="text-muted-foreground text-[10px]">Ljustyp</label>
          <div className="flex gap-1 flex-wrap">
            {lightTypeOptions.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => updateDevice(device.id, { lightType: value })}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                  (device.lightType ?? 'ceiling') === value
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <span>{emoji}</span>{label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screen-specific controls */}
      {isScreen && (
        <>
          <div className="space-y-2">
            <label className="text-muted-foreground text-[10px]">Bredd (m) — {scale[0].toFixed(2)}</label>
            <div className="flex items-center gap-2">
              <Slider min={0.3} max={3} step={0.01} value={[scale[0]]}
                onValueChange={([v]) => handleWidthChange(v)}
                className="flex-1"
              />
              <span className="text-[10px] text-foreground w-10 text-right">{scale[0].toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground text-[10px]">Bildformat</label>
            <select
              value={screenConfig.aspectRatio.toFixed(4)}
              onChange={(e) => handleAspectChange(parseFloat(e.target.value))}
              className="w-full h-8 rounded-md bg-secondary/30 text-foreground text-xs px-2 border-none outline-none"
            >
              <option value={(16 / 9).toFixed(4)}>16:9</option>
              <option value={(21 / 9).toFixed(4)}>21:9</option>
              <option value={(4 / 3).toFixed(4)}>4:3</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground text-[10px]">UI-stil</label>
            <select
              value={screenConfig.uiStyle}
              onChange={(e) => updateDevice(device.id, { screenConfig: { ...screenConfig, uiStyle: e.target.value as 'minimal' | 'poster' } })}
              className="w-full h-8 rounded-md bg-secondary/30 text-foreground text-xs px-2 border-none outline-none"
            >
              <option value="minimal">Minimal</option>
              <option value="poster">Poster</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-muted-foreground text-[10px]">Visa progress</label>
            <Switch
              checked={screenConfig.showProgress}
              onCheckedChange={(v) => updateDevice(device.id, { screenConfig: { ...screenConfig, showProgress: v } })}
            />
          </div>

          <div className="flex gap-1">
            <button onClick={handleFit169}
              className="flex-1 py-2 rounded-lg bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary transition-colors min-h-[36px] flex items-center justify-center gap-1">
              <RectangleHorizontal size={12} /> Fit 16:9
            </button>
            <button onClick={handleResetRotation}
              className="flex-1 py-2 rounded-lg bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary transition-colors min-h-[36px] flex items-center justify-center gap-1">
              <RotateCcw size={12} /> Nollställ
            </button>
          </div>
        </>
      )}

      {!isScreen && (
        <div className="space-y-2">
          <label className="text-muted-foreground text-[10px]">Höjd (Y) — {device.position[1].toFixed(1)} m</label>
          <div className="flex items-center gap-2">
            <Slider min={0} max={10} step={0.1} value={[device.position[1]]}
              onValueChange={([v]) => {
                const pos = [...device.position] as [number, number, number];
                pos[1] = v;
                updateDevice(device.id, { position: pos });
              }}
              className="flex-1"
            />
            <span className="text-[10px] text-foreground w-8 text-right">{device.position[1].toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-muted-foreground text-[10px]">Yta</label>
        <select
          value={device.surface}
          onChange={(e) => updateDevice(device.id, { surface: e.target.value as DeviceSurface })}
          className="w-full h-8 rounded-md bg-secondary/30 text-foreground text-xs px-2 border-none outline-none"
        >
          <option value="floor">Golv</option>
          <option value="wall">Vägg</option>
          <option value="ceiling">Tak</option>
          <option value="free">Fri</option>
        </select>
      </div>

      {/* Category override */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-[10px]">Kategori</label>
        <Input
          value={device.userCategory ?? ''}
          onChange={(e) => updateDevice(device.id, { userCategory: e.target.value || undefined })}
          placeholder="Auto (baserad på typ)"
          className="h-8 text-xs bg-secondary/30"
        />
      </div>

      {/* Notify on home screen */}
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground text-[10px]">Visa notiser på Hem</label>
        <Switch
          checked={device.notifyOnHomeScreen ?? false}
          onCheckedChange={(v) => updateDevice(device.id, { notifyOnHomeScreen: v })}
        />
      </div>

      <HAEntityPicker
        deviceId={device.id}
        kind={device.kind}
        currentEntityId={device.ha?.entityId}
        onSelect={(entityId) => updateDevice(device.id, { ha: { entityId } })}
        onClear={() => updateDevice(device.id, { ha: undefined })}
      />

      {/* Position sliders */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-muted-foreground"><ArrowRightLeft size={12} /> Position</div>
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-3">{axis}</span>
            <Slider min={-20} max={20} step={0.5} value={[device.position[i]]}
              onValueChange={([v]) => {
                const pos = [...device.position] as [number, number, number];
                pos[i] = Math.round(v * 2) / 2;
                updateDevice(device.id, { position: pos });
              }}
              className="flex-1"
            />
            <Input
              type="number"
              step={0.1}
              value={device.position[i].toFixed(1)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val)) return;
                const pos = [...device.position] as [number, number, number];
                pos[i] = val;
                updateDevice(device.id, { position: pos });
              }}
              className="w-14 h-6 text-[10px] text-center px-1 bg-secondary/30 border-none"
            />
          </div>
        ))}
      </div>

      {/* Rotation sliders -- full XYZ for all devices */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground"><RotateCcw size={12} /> Rotation</div>
          <button onClick={handleResetRotation}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Nollställ
          </button>
        </div>
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-3">{axis}</span>
            <Slider min={-180} max={180} step={5}
              value={[Math.round(device.rotation[i] * (180 / Math.PI))]}
              onValueChange={([v]) => {
                const rot = [...device.rotation] as [number, number, number];
                rot[i] = v * (Math.PI / 180);
                updateDevice(device.id, { rotation: rot });
              }}
              className="flex-1"
            />
            <Input
              type="number"
              step={1}
              value={Math.round(device.rotation[i] * (180 / Math.PI))}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (isNaN(val)) return;
                const rot = [...device.rotation] as [number, number, number];
                rot[i] = val * (Math.PI / 180);
                updateDevice(device.id, { rotation: rot });
              }}
              className="w-14 h-6 text-[10px] text-center px-1 bg-secondary/30 border-none"
            />
          </div>
        ))}
      </div>

      <button onClick={handleDelete}
        className="w-full py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors min-h-[44px] flex items-center justify-center gap-1">
        <Trash2 size={14} /> Ta bort enhet
      </button>
    </div>
  );
}
