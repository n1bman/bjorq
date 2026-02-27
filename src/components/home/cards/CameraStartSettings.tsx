import { useAppStore } from '@/store/useAppStore';
import { cameraRef } from '@/lib/cameraRef';
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
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Camera size={16} className="text-primary" />
        Kamera-startvy
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Navigera kameran i 3D-scenen till önskad vinkel och spara den som startvy för Hem och Kontrollpanelen. Vyn används som utgångspunkt — du kan fritt rotera efteråt.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          <Save size={14} />
          Spara nuvarande vy
        </button>
        {customStartPos && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={14} />
            Återställ
          </button>
        )}
      </div>
      {customStartPos && (
        <p className="text-[10px] text-muted-foreground/60">
          Sparad position: [{customStartPos.map((v) => v.toFixed(1)).join(', ')}]
        </p>
      )}
    </div>
  );
}
