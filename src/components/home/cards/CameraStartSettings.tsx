import { useAppStore } from '../../../store/useAppStore';
import { cameraRef } from '../../../lib/cameraRef';
import { Camera, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function CameraStartSettings() {
  const customStartPos = useAppStore((s) => s.homeView.customStartPos);
  const saveHomeStartCamera = useAppStore((s) => s.saveHomeStartCamera);
  const clearHomeStartCamera = useAppStore((s) => s.clearHomeStartCamera);

  const handleSave = () => {
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
    toast.success('Kamera-startvy sparad');
  };

  const handleClear = () => {
    clearHomeStartCamera();
    toast.success('Återställd till standard (ovanifrån)');
  };

  return (
    <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
      <Camera size={14} className="text-primary shrink-0" />
      <span className="text-xs font-medium text-foreground whitespace-nowrap">Startvy</span>
      {customStartPos && (
        <span className="text-[10px] text-muted-foreground/60 truncate">
          [{customStartPos.map((v) => v.toFixed(1)).join(', ')}]
        </span>
      )}
      <div className="ml-auto flex gap-1.5 shrink-0">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          <Save size={12} />
          Spara
        </button>
        {customStartPos && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
