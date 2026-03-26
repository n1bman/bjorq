import { useState } from 'react';
import { Play, Plus, Trash2, Moon, Sun, Lightbulb, Tv, Film, Snowflake, Flame, Power, Coffee, PartyPopper, Sunset, Sparkles, Home, Eye } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';
import type { SavedScene, SceneSnapshot } from '../../../store/types';
import { getSceneEntityViews } from '../../../lib/haMenuSelectors';
import { haServiceCaller } from '../../../hooks/useHomeAssistant';

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

export default function ScenesPanel() {
  const savedScenes = useAppStore((s) => s.savedScenes);
  const addScene = useAppStore((s) => s.addScene);
  const removeScene = useAppStore((s) => s.removeScene);
  const activateScene = useAppStore((s) => s.activateScene);
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const floors = useAppStore((s) => s.layout.floors);
  const { scenes, scripts } = useAppStore(getSceneEntityViews);

  const allRooms = floors.flatMap((floor) => floor.rooms ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Lightbulb');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const snapshots: SceneSnapshot[] = selectedDevices
      .filter((id) => deviceStates[id])
      .map((id) => ({ deviceId: id, state: { ...deviceStates[id].data } as Record<string, unknown> }));

    const scene: SavedScene = {
      id: Math.random().toString(36).slice(2, 10),
      name: newName.trim(),
      icon: newIcon,
      snapshots,
      createdAt: new Date().toISOString(),
      linkedRoomIds: selectedRooms.length > 0 ? selectedRooms : undefined,
      scope: selectedRooms.length === 0 ? 'global' : selectedRooms.length === 1 ? 'room' : 'custom',
    };

    addScene(scene);
    setNewName('');
    setSelectedDevices([]);
    setSelectedRooms([]);
    setShowAdd(false);
  };

  const callService = (domain: 'scene' | 'script', entityId: string) => {
    haServiceCaller.current?.(domain, 'turn_on', { entity_id: entityId });
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
              onClick={() => setShowAdd((v) => !v)}
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

        {/* Add scene form */}
        {showAdd && (
          <div className="space-y-4 p-4 rounded-2xl bg-[hsl(var(--surface)/0.5)] border border-[hsl(var(--border)/0.1)]">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Namn på scen..."
              className="h-10 text-sm bg-[hsl(var(--surface-elevated)/0.3)] border-[hsl(var(--border)/0.15)]"
            />

            {/* Icon picker */}
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Välj ikon</span>
              <div className="grid grid-cols-7 gap-2">
                {sceneIconOptions.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setNewIcon(key)}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      newIcon === key
                        ? 'bg-primary/20 border border-primary/40 text-primary'
                        : 'border border-[hsl(var(--border)/0.12)] text-muted-foreground/40 hover:text-foreground hover:border-[hsl(var(--border)/0.25)]'
                    )}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Device selection */}
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Inkludera enheter</span>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-[hsl(var(--surface-elevated)/0.2)] p-2">
                {markers.map((marker) => (
                  <label key={marker.id} className="flex cursor-pointer items-center gap-3 px-2 py-2 rounded-lg hover:bg-[hsl(var(--surface-elevated)/0.3)] transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(marker.id)}
                      onChange={() => setSelectedDevices((prev) => prev.includes(marker.id) ? prev.filter((id) => id !== marker.id) : [...prev, marker.id])}
                      className="rounded border-[hsl(var(--border)/0.3)] accent-[hsl(var(--primary))]"
                    />
                    <span className="text-[12px] text-foreground/80">{marker.name || marker.kind}</span>
                  </label>
                ))}
                {markers.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/30 py-3 text-center">Inga enheter placerade ännu</p>
                )}
              </div>
            </div>

            {/* Room linking */}
            {allRooms.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Lanka till rum (valfritt)</span>
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

            <Button
              className="w-full h-10 text-[12px] font-medium"
              onClick={handleAdd}
              disabled={!newName.trim() || selectedDevices.length === 0}
            >
              Spara scen ({selectedDevices.length} enheter)
            </Button>
          </div>
        )}

        {/* Scene grid — circular buttons like smart home apps */}
        {savedScenes.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full border border-[hsl(var(--border)/0.1)] flex items-center justify-center mx-auto">
              <Sparkles size={24} className="text-muted-foreground/20" />
            </div>
            <p className="text-[12px] text-muted-foreground/40">Inga scener ännu</p>
            <p className="text-[11px] text-muted-foreground/25">Klicka + för att spara nuvarande enhetslägen som en scen</p>
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
                  {/* Delete on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Ta bort"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick tips ── */}
      <div className="nn-widget p-4">
        <p className="text-[11px] text-muted-foreground/30 leading-relaxed">
          Scener sparar aktuella enhetslägen (ljus, färg, styrka) och återställer dem med ett tryck.
          Länka till rum för att begränsa scenens påverkan.
        </p>
      </div>
    </div>
  );
}
