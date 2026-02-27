import { useAppStore } from '@/store/useAppStore';
import { Camera, ArrowDown, RotateCcw, Square, Maximize, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import type { CameraPreset } from '@/store/types';

const presets: { key: CameraPreset; label: string; icon: typeof Camera }[] = [
  { key: 'free', label: 'Fri', icon: RotateCcw },
  { key: 'topdown', label: 'Ovanifrån', icon: ArrowDown },
  { key: 'angle', label: 'Vinkel', icon: Maximize },
  { key: 'front', label: 'Fram', icon: Square },
];

export default function CameraFab() {
  const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
  const setCameraPreset = useAppStore((s) => s.setCameraPreset);
  const saveHomeStartCamera = useAppStore((s) => s.saveHomeStartCamera);
  const hasCustomStart = useAppStore((s) => !!s.homeView.customStartPos);
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="glass-panel rounded-xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {presets.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setCameraPreset(key);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-medium transition-all min-w-[120px]',
                cameraPreset === key
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}

          {/* Save current view as default start */}
          <div className="border-t border-border/30 mt-1 pt-1">
            <button
              onClick={() => {
                saveHomeStartCamera();
                toast.success('Startvy sparad');
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-medium transition-all min-w-[120px]',
                hasCustomStart
                  ? 'text-primary/70 hover:text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Save size={14} />
              <span>Spara startvy</span>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-14 h-14 rounded-full glass-panel flex items-center justify-center transition-all',
          open ? 'text-primary amber-glow' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Camera size={20} />
      </button>
    </div>
  );
}
