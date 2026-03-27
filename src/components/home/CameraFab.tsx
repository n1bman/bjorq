import { useAppStore } from '../../store/useAppStore';
import { Camera, ArrowDown, RotateCcw, Square, Maximize, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import type { CameraPreset } from '../../store/types';
import { cameraRef, flyTo } from '../../lib/cameraRef';
import { toast } from 'sonner';

const presets: { key: CameraPreset | 'saved'; label: string; icon: typeof Camera }[] = [
  { key: 'free', label: 'Fri', icon: RotateCcw },
  { key: 'topdown', label: 'Ovanifrån', icon: ArrowDown },
  { key: 'angle', label: 'Vinkel', icon: Maximize },
  { key: 'front', label: 'Fram', icon: Square },
];

interface CameraFabProps {
  style?: React.CSSProperties;
}

export default function CameraFab({ style }: CameraFabProps) {
  const cameraPreset = useAppStore((s) => s.homeView.cameraPreset);
  const setCameraPreset = useAppStore((s) => s.setCameraPreset);
  const customStartPos = useAppStore((s) => s.homeView.customStartPos);
  const customStartTarget = useAppStore((s) => s.homeView.customStartTarget);
  const saveHomeStartCamera = useAppStore((s) => s.saveHomeStartCamera);
  const [open, setOpen] = useState(false);

  const hasSavedView = !!customStartPos;

  const allPresets = hasSavedView
    ? [...presets, { key: 'saved' as const, label: 'Sparad vy', icon: Save }]
    : presets;

  const handleSelect = (key: CameraPreset | 'saved') => {
    if (key === 'saved' && customStartPos && customStartTarget) {
      setCameraPreset('free');
      flyTo([...customStartPos], [...customStartTarget]);
    } else if (key !== 'saved') {
      setCameraPreset(key);
    }
    setOpen(false);
  };

  const handleSaveCurrentView = () => {
    const pos: [number, number, number] = [
      cameraRef.position.x,
      cameraRef.position.y,
      cameraRef.position.z,
    ];
    const target: [number, number, number] = [
      cameraRef.target.x,
      cameraRef.target.y,
      cameraRef.target.z,
    ];
    saveHomeStartCamera(pos, target);
    toast.success('Startvy sparad');
    setOpen(false);
  };

  return (
    <div className="z-50 pointer-events-auto relative" style={style}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-14 h-14 rounded-full glass-panel flex items-center justify-center transition-all',
          open ? 'text-primary amber-glow' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Camera size={20} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 glass-panel rounded-xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={handleSaveCurrentView}
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-medium transition-all min-w-[120px] text-foreground hover:bg-secondary/30"
          >
            <Save size={14} />
            <span>Spara nu</span>
          </button>
          {allPresets.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-medium transition-all min-w-[120px]',
                (key === 'saved' ? false : cameraPreset === key)
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
