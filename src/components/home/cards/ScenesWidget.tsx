import { useAppStore } from '../../../store/useAppStore';
import { Play, Palette } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function ScenesWidget() {
  const savedScenes = useAppStore((s) => s.savedScenes);
  const activateScene = useAppStore((s) => s.activateScene);

  if (savedScenes.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[120px]">
      <div className="flex items-center gap-2 mb-2">
        <Palette size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground">Scener</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {savedScenes.slice(0, 4).map((scene) => (
          <button
            key={scene.id}
            onClick={() => activateScene(scene.id)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/40 hover:bg-primary/20 text-foreground transition-all min-h-[32px]"
          >
            <span className="text-sm">{scene.icon}</span>
            <span className="text-[10px]">{scene.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
