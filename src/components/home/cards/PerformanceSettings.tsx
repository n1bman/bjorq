import { useAppStore } from '@/store/useAppStore';
import { Gauge, Monitor, Sun, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { QualityLevel } from '@/store/types';

const qualityOptions: { value: QualityLevel; label: string; desc: string }[] = [
  { value: 'low', label: 'Låg', desc: 'Minimal – bra för surfplatta/RPi' },
  { value: 'medium', label: 'Medium', desc: 'Balanserad prestanda' },
  { value: 'high', label: 'Hög', desc: 'Full kvalitet' },
];

export default function PerformanceSettings() {
  const perf = useAppStore((s) => s.performance);
  const setPerformance = useAppStore((s) => s.setPerformance);

  const applyTabletMode = (on: boolean) => {
    if (on) {
      setPerformance({ tabletMode: true, quality: 'low', shadows: false, postprocessing: false });
    } else {
      setPerformance({ tabletMode: false });
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gauge size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Prestanda</h3>
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
            <button
              key={q.value}
              onClick={() => setPerformance({ quality: q.value, tabletMode: false })}
              className={`flex-1 rounded-lg px-2 py-2 text-center text-[11px] border transition-all ${
                perf.quality === q.value
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              <span className="block font-medium">{q.label}</span>
              <span className="block text-[9px] opacity-70">{q.desc}</span>
            </button>
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
          onCheckedChange={(v) => setPerformance({ shadows: v, tabletMode: false })}
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
          onCheckedChange={(v) => setPerformance({ postprocessing: v, tabletMode: false })}
        />
      </div>
    </div>
  );
}
