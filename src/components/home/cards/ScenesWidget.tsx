import { useAppStore } from '../../../store/useAppStore';
import { Play, Palette } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function ScenesWidget() {
  const savedScenes = useAppStore((s) => s.savedScenes);
  const activateScene = useAppStore((s) => s.activateScene);

  if (savedScenes.length === 0) return null;

  return (
    <div className="overlay-widget">
      <div className="flex items-center gap-2 mb-1.5">
        <Palette size={12} className="text-primary" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Scener</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {savedScenes.slice(0, 4).map((scene) => (
          <button
            key={scene.id}
            onClick={() => activateScene(scene.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated/60 hover:bg-primary/15 text-foreground transition-all text-[10px] font-medium"
          >
            <span className="text-xs">{scene.icon}</span>
            <span>{scene.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
