import { useState, useCallback } from 'react';
import { Play, Plus, Trash2, Moon, Sun, Lightbulb, Tv, Film, Snowflake, Flame, Power, Coffee, PartyPopper, Sunset, Sparkles, Home, Eye, Pencil, X, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Slider } from '../../ui/slider';
import { cn } from '../../../lib/utils';
import type { SavedScene, SceneSnapshot } from '../../../store/types';
import { getSceneEntityViews } from '../../../lib/haMenuSelectors';
import { haServiceCaller } from '../../../hooks/useHomeAssistant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const sceneIconOptions = [
  { key: 'Power', icon: Power, label: 'Av' },
  { key: 'Moon', icon: Moon, label: 'Natt' },
  { key: 'Sun', icon: Sun, label: 'Dag' },
  { key: 'Sunset', icon: Sunset, label: 'Kväll' },
  { key: 'Lightbulb', icon: Lightbulb, label: 'Ljus' },
  { key: 'Coffee', icon: Coffee, label: 'Morgon' },
  { key: 'Tv', icon: Tv, label: 'TV' },
  { key: 'Film', icon: Film, label: 'Film' },
  { key: 'Snowflake', icon: Snowflake, label: 'Kyla' },
  { key: 'Flame', icon: Flame, label: 'Värme' },
  { key: 'PartyPopper', icon: PartyPopper, label: 'Fest' },
  { key: 'Sparkles', icon: Sparkles, label: 'Mysig' },
  { key: 'Home', icon: Home, label: 'Hem' },
  { key: 'Eye', icon: Eye, label: 'Fokus' },
];

const iconMap: Record<string, typeof Power> = Object.fromEntries(
  sceneIconOptions.map((o) => [o.key, o.icon])
);

function getSceneIcon(iconStr: string) {
  return iconMap[iconStr] || Lightbulb;
}

/* ── Spectrum slider helpers (same as DeviceControlCard) ── */
function hueToRgb(h: number): [number, number, number] {
  const s = 1, l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function sliderToRgb(pos: number): [number, number, number] {
  const mid = 180;
  if (Math.abs(pos - mid) < 10) return [255, 255, 255];
  const dist = Math.abs(pos - mid) / mid;
  const hue = pos <= mid ? (pos / mid) * 360 : ((pos - mid) / mid) * 360;
  const [r, g, b] = hueToRgb(hue % 360);
  const w = 1 - dist;
  return [
    Math.round(r + (255 - r) * w * 0.5),
    Math.round(g + (255 - g) * w * 0.5),
    Math.round(b + (255 - b) * w * 0.5),
  ];
}

/* ── Snapshot editor for a single device in a scene ── */
function SnapshotEditor({ snap, onChange, onRemove, deviceName, isLight }: {
  snap: SceneSnapshot;
  onChange: (s: SceneSnapshot) => void;
  onRemove: () => void;
  deviceName: string;
  isLight: boolean;
}) {
  const brightness = (snap.state.brightness as number) ?? 200;
  const rgbColor = snap.state.rgbColor as [number, number, number] | undefined;
  const colorPreview = rgbColor ? `rgb(${rgbColor[0]},${rgbColor[1]},${rgbColor[2]})` : undefined;

  return (
    <div className="space-y-3 p-3 rounded-xl bg-[hsl(var(--surface-elevated)/0.2)] border border-[hsl(var(--border)/0.1)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-foreground/80 font-medium">{deviceName}</span>
        <button onClick={onRemove} className="text-muted-foreground/40 hover:text-destructive transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Action selector */}
      <Select
        value={snap.action}
        onValueChange={(v) => onChange({ ...snap, action: v as 'on' | 'off' | 'set' })}
      >
        <SelectTrigger className="h-8 text-[11px] bg-[hsl(var(--surface)/0.5)] border-[hsl(var(--border)/0.15)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="on">Sätt på</SelectItem>
          <SelectItem value="off">Stäng av</SelectItem>
          <SelectItem value="set">Ställ in</SelectItem>
        </SelectContent>
      </Select>

      {/* Brightness slider — only for on/set + light devices */}
      {snap.action !== 'off' && isLight && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">Ljusstyrka</span>
            <span className="text-[10px] text-muted-foreground/50">{Math.round((brightness / 255) * 100)}%</span>
          </div>
          <Slider
            min={1} max={255} step={1}
            value={[brightness]}
            onValueChange={([v]) => onChange({ ...snap, state: { ...snap.state, brightness: v } })}
            className="h-5"
          />
        </div>
      )}

      {/* Color slider — only for on/set + light devices */}
      {snap.action !== 'off' && isLight && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50">Färg</span>
            {colorPreview && (
              <div className="w-4 h-4 rounded-full border border-[hsl(var(--border)/0.2)]" style={{ background: colorPreview }} />
            )}
          </div>
          <div className="relative h-6 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #ffffff, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
            />
            <input
              type="range" min={0} max={360} step={1}
              value={180}
              onChange={(e) => {
                const rgb = sliderToRgb(Number(e.target.value));
                onChange({ ...snap, state: { ...snap.state, rgbColor: rgb, colorMode: 'rgb' } });
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scene form (create + edit) ── */
function SceneForm({ scene, onSave, onCancel }: {
  scene?: SavedScene;
  onSave: (scene: SavedScene) => void;
  onCancel: () => void;
}) {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const floors = useAppStore((s) => s.layout.floors);
  const allRooms = floors.flatMap((floor) => floor.rooms ?? []);

  const [name, setName] = useState(scene?.name ?? '');
  const [icon, setIcon] = useState(scene?.icon ?? 'Lightbulb');
  const [snapshots, setSnapshots] = useState<SceneSnapshot[]>(
    scene?.snapshots ?? []
  );
  const [selectedRooms, setSelectedRooms] = useState<string[]>(scene?.linkedRoomIds ?? []);
  const [showAddDevice, setShowAddDevice] = useState(false);

  const includedDeviceIds = new Set(snapshots.map((s) => s.deviceId));
  const availableDevices = markers.filter((m) => !includedDeviceIds.has(m.id));

  const addDevice = useCallback((markerId: string) => {
    const state = deviceStates[markerId];
    const newSnap: SceneSnapshot = {
      deviceId: markerId,
      action: state?.data && (state.data as any).on ? 'on' : 'set',
      state: state ? { ...(state.data as Record<string, unknown>) } : {},
    };
    setSnapshots((prev) => [...prev, newSnap]);
  }, [deviceStates]);

  const updateSnapshot = useCallback((idx: number, snap: SceneSnapshot) => {
    setSnapshots((prev) => prev.map((s, i) => i === idx ? snap : s));
  }, []);

  const removeSnapshot = useCallback((idx: number) => {
    setSnapshots((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = () => {
    if (!name.trim() || snapshots.length === 0) return;
    onSave({
      id: scene?.id ?? Math.random().toString(36).slice(2, 10),
      name: name.trim(),
      icon,
      snapshots,
      createdAt: scene?.createdAt ?? new Date().toISOString(),
      linkedRoomIds: selectedRooms.length > 0 ? selectedRooms : undefined,
      scope: selectedRooms.length === 0 ? 'global' : selectedRooms.length === 1 ? 'room' : 'custom',
    });
  };

  const isLight = (deviceId: string) => {
    const s = deviceStates[deviceId];
    return s?.kind === 'light';
  };

  const getDeviceName = (deviceId: string) => {
    const m = markers.find((mk) => mk.id === deviceId);
    return m?.name || m?.kind || deviceId;
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-[hsl(var(--surface)/0.5)] border border-[hsl(var(--border)/0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground/70">
          {scene ? 'Redigera scen' : 'Ny scen'}
        </span>
        <button onClick={onCancel} className="text-muted-foreground/40 hover:text-foreground transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Name */}
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Namn på scen..."
        className="h-10 text-sm bg-[hsl(var(--surface-elevated)/0.3)] border-[hsl(var(--border)/0.15)]"
      />

      {/* Icon picker */}
      <div className="space-y-2">
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Ikon</span>
        <div className="grid grid-cols-7 gap-2">
          {sceneIconOptions.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setIcon(key)}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                icon === key
                  ? 'bg-primary/20 border border-primary/40 text-primary'
                  : 'border border-[hsl(var(--border)/0.12)] text-muted-foreground/40 hover:text-foreground hover:border-[hsl(var(--border)/0.25)]'
              )}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Per-device snapshot editors */}
      <div className="space-y-2">
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
          Enheter ({snapshots.length})
        </span>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {snapshots.map((snap, idx) => (
            <SnapshotEditor
              key={snap.deviceId}
              snap={snap}
              onChange={(s) => updateSnapshot(idx, s)}
              onRemove={() => removeSnapshot(idx)}
              deviceName={getDeviceName(snap.deviceId)}
              isLight={isLight(snap.deviceId)}
            />
          ))}
        </div>

        {/* Add device button */}
        {availableDevices.length > 0 && (
          <div>
            <button
              onClick={() => setShowAddDevice((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              <Plus size={14} />
              <span>Lägg till enhet</span>
              <ChevronDown size={12} className={cn('transition-transform', showAddDevice && 'rotate-180')} />
            </button>
            {showAddDevice && (
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1 rounded-xl bg-[hsl(var(--surface-elevated)/0.2)] p-2">
                {availableDevices.map((marker) => (
                  <button
                    key={marker.id}
                    onClick={() => { addDevice(marker.id); }}
                    className="flex w-full items-center gap-2 px-2 py-2 rounded-lg text-[12px] text-foreground/70 hover:bg-[hsl(var(--surface-elevated)/0.3)] transition-colors"
                  >
                    <Plus size={12} className="text-primary/50" />
                    {marker.name || marker.kind}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room linking */}
      {allRooms.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Rum (valfritt)</span>
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl bg-[hsl(var(--surface-elevated)/0.2)] p-2">
            {allRooms.map((room) => (
              <label key={room.id} className="flex cursor-pointer items-center gap-3 px-2 py-2 rounded-lg hover:bg-[hsl(var(--surface-elevated)/0.3)] transition-colors">
                <input
                  type="checkbox"
                  checked={selectedRooms.includes(room.id)}
                  onChange={() => setSelectedRooms((prev) => prev.includes(room.id) ? prev.filter((id) => id !== room.id) : [...prev, room.id])}
                  className="rounded border-[hsl(var(--border)/0.3)] accent-[hsl(var(--primary))]"
                />
                <span className="text-[12px] text-foreground/80">{room.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <Button
        className="w-full h-10 text-[12px] font-medium"
        onClick={handleSave}
        disabled={!name.trim() || snapshots.length === 0}
      >
        {scene ? 'Spara ändringar' : `Spara scen (${snapshots.length} enheter)`}
      </Button>
    </div>
  );
}

/* ── Main panel ── */
export default function ScenesPanel() {
  const savedScenes = useAppStore((s) => s.savedScenes);
  const addScene = useAppStore((s) => s.addScene);
  const removeScene = useAppStore((s) => s.removeScene);
  const updateScene = useAppStore((s) => s.updateScene);
  const activateScene = useAppStore((s) => s.activateScene);
  const { scenes, scripts } = useAppStore(getSceneEntityViews);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const callService = (domain: 'scene' | 'script', entityId: string) => {
    haServiceCaller.current?.(domain, 'turn_on', { entity_id: entityId });
  };

  const handleSaveNew = (scene: SavedScene) => {
    addScene(scene);
    setShowAdd(false);
  };

  const handleSaveEdit = (scene: SavedScene) => {
    updateScene(scene.id, scene);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* ── HA Scenes & Scripts ── */}
      {(scenes.length + scripts.length > 0) && (
        <div className="nn-widget p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-micro">HOME ASSISTANT</span>
            <span className="text-[10px] text-muted-foreground/40">{scenes.length + scripts.length} scener</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {[...scenes, ...scripts].map(({ entity }) => (
              <button
                key={entity.entityId}
                onClick={() => callService(entity.domain as 'scene' | 'script', entity.entityId)}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className="w-16 h-16 rounded-full border border-[hsl(var(--border)/0.15)] bg-[hsl(var(--surface-elevated)/0.4)] flex items-center justify-center transition-all group-hover:bg-primary/15 group-hover:border-primary/30 group-active:scale-95">
                  <Play size={20} className="text-foreground/50 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[11px] text-muted-foreground/60 text-center leading-tight w-18 truncate group-hover:text-foreground transition-colors">
                  {entity.friendlyName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BjorQ Scenes ── */}
      <div className="nn-widget p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="label-micro">BJORQ-SCENER</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/40">{savedScenes.length} scener</span>
            <button
              onClick={() => { setShowAdd((v) => !v); setEditingId(null); }}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                showAdd
                  ? 'bg-primary/20 text-primary'
                  : 'border border-[hsl(var(--border)/0.2)] text-muted-foreground/50 hover:text-foreground hover:border-[hsl(var(--border)/0.3)]'
              )}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Create form */}
        {showAdd && !editingId && (
          <SceneForm onSave={handleSaveNew} onCancel={() => setShowAdd(false)} />
        )}

        {/* Edit form */}
        {editingId && (
          <SceneForm
            scene={savedScenes.find((s) => s.id === editingId)}
            onSave={handleSaveEdit}
            onCancel={() => setEditingId(null)}
          />
        )}

        {/* Scene grid */}
        {savedScenes.length === 0 && !showAdd ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full border border-[hsl(var(--border)/0.1)] flex items-center justify-center mx-auto">
              <Sparkles size={24} className="text-muted-foreground/20" />
            </div>
            <p className="text-[12px] text-muted-foreground/40">Inga scener ännu</p>
            <p className="text-[11px] text-muted-foreground/25">Klicka + för att skapa en scen</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5">
            {savedScenes.map((scene) => {
              const SceneIcon = getSceneIcon(scene.icon);
              return (
                <div key={scene.id} className="flex flex-col items-center gap-2.5 group relative">
                  <button
                    onClick={() => activateScene(scene.id)}
                    className="w-16 h-16 rounded-full border border-[hsl(var(--border)/0.15)] bg-[hsl(var(--surface-elevated)/0.4)] flex items-center justify-center transition-all group-hover:bg-primary/15 group-hover:border-primary/30 group-active:scale-95"
                  >
                    <SceneIcon size={22} className="text-foreground/50 group-hover:text-primary transition-colors" />
                  </button>
                  <span className="text-[11px] text-muted-foreground/60 text-center leading-tight truncate w-18 group-hover:text-foreground transition-colors">
                    {scene.name}
                  </span>
                  {/* Edit + delete on hover */}
                  <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(scene.id); setShowAdd(false); }}
                      className="w-5 h-5 rounded-full bg-[hsl(var(--surface-elevated)/0.8)] border border-[hsl(var(--border)/0.2)] text-foreground/60 flex items-center justify-center hover:text-primary"
                      title="Redigera"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                      className="w-5 h-5 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center"
                      title="Ta bort"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick tips ── */}
      <div className="nn-widget p-4">
        <p className="text-[11px] text-muted-foreground/30 leading-relaxed">
          Scener sparar per-enhet åtgärder (på/av/ställ in) med ljusstyrka och färg. Tryck på en scen för att aktivera, eller på pennan för att redigera.
        </p>
      </div>
    </div>
  );
}
