import { useState } from 'react';
import { Palette, Play, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';
import type { SavedScene, SceneSnapshot } from '../../../store/types';
import { getSceneEntityViews } from '../../../lib/haMenuSelectors';
import { haServiceCaller } from '../../../hooks/useHomeAssistant';

const sceneIcons = ['🌅', '🌙', '🎬', '🎉', '💡', '🏠', '🌊', '❄️', '🔥', '☀️'];

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
  const [newIcon, setNewIcon] = useState('🌅');
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
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <Palette size={16} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Home Assistant-scener</h4>
          <span className="text-[10px] text-muted-foreground">({scenes.length + scripts.length})</span>
        </div>
        {scenes.length + scripts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">Inga scene.* eller script.* hittades i HA ännu.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[...scenes, ...scripts].map(({ entity, linked, marker }) => (
              <div key={entity.entityId} className="relative rounded-lg border border-border/50 bg-secondary/20 p-3">
                <div className="space-y-1">
                  <p className="truncate text-xs font-medium text-foreground">{entity.friendlyName}</p>
                  <p className="truncate text-[9px] text-muted-foreground">{entity.entityId}</p>
                  <p className="text-[9px] text-muted-foreground">{linked && marker ? `Lankad till ${marker.name}` : 'Ej länkad i design'}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-[10px]" onClick={() => callService(entity.domain as 'scene' | 'script', entity.entityId)}>
                    <Play size={10} /> Aktivera
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">BjorQ-scener</h4>
            <span className="text-[10px] text-muted-foreground">({savedScenes.length})</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={14} />
          </Button>
        </div>

        {showAdd && (
          <div className="mb-4 space-y-3 rounded-lg bg-secondary/30 p-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Scennamn..." className="h-7 text-xs" />

            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Ikon</p>
              <div className="flex flex-wrap gap-1">
                {sceneIcons.map((icon) => (
                  <button key={icon} className={cn('flex h-7 w-7 items-center justify-center rounded-md text-sm', newIcon === icon ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary/30 hover:bg-secondary/50')} onClick={() => setNewIcon(icon)}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Inkludera enheter</p>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {markers.map((marker) => (
                  <label key={marker.id} className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={selectedDevices.includes(marker.id)} onChange={() => setSelectedDevices((prev) => prev.includes(marker.id) ? prev.filter((id) => id !== marker.id) : [...prev, marker.id])} className="rounded border-border" />
                    <span className="text-[10px] text-foreground">{marker.name || marker.kind}</span>
                  </label>
                ))}
              </div>
            </div>

            {allRooms.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">Lanka till rum (valfritt)</p>
                <div className="max-h-24 space-y-1 overflow-y-auto">
                  {allRooms.map((room) => (
                    <label key={room.id} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={selectedRooms.includes(room.id)} onChange={() => setSelectedRooms((prev) => prev.includes(room.id) ? prev.filter((id) => id !== room.id) : [...prev, room.id])} className="rounded border-border" />
                      <span className="text-[10px] text-foreground">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" className="h-7 w-full text-[10px]" onClick={handleAdd} disabled={!newName.trim() || selectedDevices.length === 0}>
              Spara scen ({selectedDevices.length} enheter)
            </Button>
          </div>
        )}

        {savedScenes.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-muted-foreground/60">Inga BjorQ-scener ännu. Klicka + for att spara nuvarande lagen.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {savedScenes.map((scene) => (
              <div key={scene.id} className="group relative rounded-lg border border-border/50 bg-secondary/20 p-3 transition-all hover:bg-secondary/30">
                <button onClick={() => activateScene(scene.id)} className="w-full space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{scene.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{scene.name}</p>
                      <p className="text-[9px] text-muted-foreground">{scene.snapshots.length} enheter</p>
                    </div>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => activateScene(scene.id)} className="rounded p-1 text-primary hover:bg-primary/20" title="Aktivera">
                    <Play size={10} />
                  </button>
                  <button onClick={() => removeScene(scene.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/20" title="Ta bort">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
