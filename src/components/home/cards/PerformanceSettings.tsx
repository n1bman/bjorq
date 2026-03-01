import { useAppStore } from '../../../store/useAppStore';
import { Gauge, Monitor, Sun, Sparkles, RefreshCw } from 'lucide-react';
import { Switch } from '../../ui/switch';
import OptionButton from '../../ui/OptionButton';
import { toast } from 'sonner';
import type { QualityLevel } from '../../../store/types';

const qualityOptions: { value: QualityLevel; label: string; desc: string }[] = [
  { value: 'low', label: 'Låg', desc: 'Minimal – bra för surfplatta/RPi' },
  { value: 'medium', label: 'Medium', desc: 'Balanserad prestanda' },
  { value: 'high', label: 'Hög', desc: 'Full kvalitet' },
];

function notify() {
  toast.success('Ändringar sparade ✅', { description: '3D-scenen laddas om automatiskt.' });
}

export default function PerformanceSettings() {
  const perf = useAppStore((s) => s.performance);
  const setPerformance = useAppStore((s) => s.setPerformance);

  const applyTabletMode = (on: boolean) => {
    if (on) {
      setPerformance({ tabletMode: true, quality: 'low', shadows: false, postprocessing: false });
    } else {
      setPerformance({ tabletMode: false });
    }
    notify();
  };

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <Gauge size={18} className="text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Prestanda</h3>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <RefreshCw size={9} /> 3D-scenen laddas om automatiskt vid ändring
          </p>
        </div>
      </div>

      {/* Tablet mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-muted-foreground" />
          <div>
            <span className="text-sm text-foreground">Surfplatteläge</span>
            <p className="text-[10px] text-muted-foreground">Optimerat för iPad / Android / RPi</p>
          </div>
        </div>
        <Switch checked={perf.tabletMode} onCheckedChange={applyTabletMode} />
      </div>

      {/* Quality */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kvalitet</span>
        <div className="flex gap-2">
          {qualityOptions.map((q) => (
            <OptionButton
              key={q.value}
              active={perf.quality === q.value}
              onClick={() => { setPerformance({ quality: q.value, tabletMode: false }); notify(); }}
              label={q.label}
              description={q.desc}
            />
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun size={14} className="text-muted-foreground" />
          <span className="text-sm text-foreground">Skuggor</span>
        </div>
        <Switch
          checked={perf.shadows}
          onCheckedChange={(v) => { setPerformance({ shadows: v, tabletMode: false }); notify(); }}
        />
      </div>

      {/* Postprocessing */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-muted-foreground" />
          <span className="text-sm text-foreground">Efterbearbetning</span>
        </div>
        <Switch
          checked={perf.postprocessing}
          onCheckedChange={(v) => { setPerformance({ postprocessing: v, tabletMode: false }); notify(); }}
        />
      </div>
    </div>
  );
}
