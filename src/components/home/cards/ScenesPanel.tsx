import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Plus, Trash2, Play, Palette } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SavedScene, SceneSnapshot } from '../../../store/types';

const sceneIcons = ['🌅', '🌙', '🎬', '🎉', '💡', '🏠', '🌊', '❄️', '🔥', '☀️'];

export default function ScenesPanel() {
  const savedScenes = useAppStore((s) => s.savedScenes);
  const addScene = useAppStore((s) => s.addScene);
  const removeScene = useAppStore((s) => s.removeScene);
  const activateScene = useAppStore((s) => s.activateScene);
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🌅');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const handleAdd = () => {
    if (!newName.trim()) return;

    // Snapshot current states of selected devices
    const snapshots: SceneSnapshot[] = selectedDevices
      .filter((id) => deviceStates[id])
      .map((id) => ({
        deviceId: id,
        state: { ...deviceStates[id].data } as Record<string, unknown>,
      }));

    const scene: SavedScene = {
      id: Math.random().toString(36).slice(2, 10),
      name: newName.trim(),
      icon: newIcon,
      snapshots,
      createdAt: new Date().toISOString(),
    };

    addScene(scene);
    setNewName('');
    setSelectedDevices([]);
    setShowAdd(false);
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Scener</h4>
            <span className="text-[10px] text-muted-foreground">({savedScenes.length})</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} />
          </Button>
        </div>

        {showAdd && (
          <div className="mb-4 p-3 rounded-lg bg-secondary/30 space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Scennamn..."
              className="h-7 text-xs"
            />

            {/* Icon picker */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Ikon</p>
              <div className="flex gap-1 flex-wrap">
                {sceneIcons.map((icon) => (
                  <button
                    key={icon}
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center text-sm',
                      newIcon === icon ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary/30 hover:bg-secondary/50'
                    )}
                    onClick={() => setNewIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Device selection — snapshot their current state */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">
                Inkludera enheter (deras nuvarande tillstånd sparas)
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {markers.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(m.id)}
                      onChange={() => toggleDevice(m.id)}
                      className="rounded border-border"
                    />
                    <span className="text-[10px] text-foreground">{m.name || m.kind}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button size="sm" className="w-full h-7 text-[10px]" onClick={handleAdd} disabled={!newName.trim() || selectedDevices.length === 0}>
              Spara scen ({selectedDevices.length} enheter)
            </Button>
          </div>
        )}

        {savedScenes.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60 text-center py-4">
            Inga scener ännu. Klicka + för att spara nuvarande enhetslägen som en scen.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {savedScenes.map((scene) => (
              <div key={scene.id} className="relative group p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-all">
                <button
                  onClick={() => activateScene(scene.id)}
                  className="w-full text-left space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{scene.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{scene.name}</p>
                      <p className="text-[9px] text-muted-foreground">{scene.snapshots.length} enheter</p>
                    </div>
                  </div>
                </button>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => activateScene(scene.id)}
                    className="p-1 rounded hover:bg-primary/20 text-primary"
                    title="Aktivera"
                  >
                    <Play size={10} />
                  </button>
                  <button
                    onClick={() => removeScene(scene.id)}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground"
                    title="Ta bort"
                  >
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
