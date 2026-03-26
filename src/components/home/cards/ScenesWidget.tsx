import { useAppStore } from '../../../store/useAppStore';
import { Play, Palette } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function ScenesWidget() {
  const savedScenes = useAppStore((s) => s.savedScenes);
  const activateScene = useAppStore((s) => s.activateScene);

  if (savedScenes.length === 0) return null;

  return (
    <div className="overlay-widget">
      <div className="flex items-center gap-2 mb-2">
        <Palette size={12} className="text-primary" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Scener</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {savedScenes.slice(0, 6).map((scene) => (
          <button
            key={scene.id}
            onClick={() => activateScene(scene.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel hover:bg-primary/15 text-foreground transition-all text-[11px] font-medium backdrop-blur-xl"
          >
            <Play size={10} className="text-primary" />
            <span>{scene.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
