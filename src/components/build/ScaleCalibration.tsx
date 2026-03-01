import { useAppStore } from '../../store/useAppStore';
import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Ruler, Check, X } from 'lucide-react';

export default function ScaleCalibration() {
  const calibration = useAppStore((s) => s.build.calibration);
  const setCalibration = useAppStore((s) => s.setCalibration);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const [meters, setMeters] = useState('');

  const hasLine = calibration.point1 && calibration.point2;

  const pixelDistance = hasLine
    ? Math.sqrt(
        Math.pow(calibration.point2![0] - calibration.point1![0], 2) +
        Math.pow(calibration.point2![1] - calibration.point1![1], 2)
      )
    : 0;

  const handleConfirm = () => {
    const m = parseFloat(meters);
    if (!m || m <= 0 || !activeFloorId || pixelDistance === 0) return;
    const ppm = pixelDistance / m;
    setPixelsPerMeter(activeFloorId, ppm);
    setCalibration({ isCalibrating: false, point1: null, point2: null, realMeters: m });
    setBuildTool('select');
  };

  const handleCancel = () => {
    setCalibration({ isCalibrating: false, point1: null, point2: null });
    setBuildTool('select');
  };

  if (!calibration.isCalibrating && !hasLine) return null;

  return (
    <div className="glass-panel rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Ruler size={16} className="text-accent" />
        <span>Skalkalibrering</span>
      </div>

      {!hasLine ? (
        <p className="text-xs text-muted-foreground">
          Klicka på två punkter längs en känd vägg i planlösningen.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Linjeavstånd: {pixelDistance.toFixed(0)} px
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Meter"
              value={meters}
              onChange={(e) => setMeters(e.target.value)}
              className="h-8 text-sm bg-secondary/50"
            />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} className="h-7 text-xs gap-1">
              <Check size={12} /> Bekräfta
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs gap-1">
              <X size={12} /> Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
