import { useAppStore } from '../../../store/useAppStore';
import { Trees, Palette } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export default function EnvironmentPanel() {
  const terrain = useAppStore((s) => s.terrain);
  const skyStyle = useAppStore((s) => s.environment.skyStyle);
  const setTerrain = useAppStore((s) => s.setTerrain);
  const setSkyStyle = useAppStore((s) => s.setSkyStyle);

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <Trees size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Miljö & Terräng</h3>
      </div>

      {/* Terrain */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-foreground">Markyta</span>
          <p className="text-[10px] text-muted-foreground">Gräsmatta runt huset</p>
        </div>
        <Switch
          checked={terrain.enabled}
          onCheckedChange={(v) => setTerrain({ enabled: v })}
        />
      </div>

      {terrain.enabled && (
        <div className="space-y-3 pl-2">
          {/* Grass color */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-20">Färg</label>
            <Input
              type="color"
              value={terrain.grassColor}
              onChange={(e) => setTerrain({ grassColor: e.target.value })}
              className="h-8 w-12 p-0.5 border-border"
            />
          </div>

          {/* Radius */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Radie</span>
              <span className="text-xs font-mono text-muted-foreground">{terrain.grassRadius} m</span>
            </div>
            <Slider
              value={[terrain.grassRadius]}
              min={5}
              max={60}
              step={5}
              onValueChange={([v]) => setTerrain({ grassRadius: v })}
            />
          </div>

          {/* Tree count */}
          <div className="text-xs text-muted-foreground">
            Träd placerade: {terrain.trees?.length ?? 0}
            <p className="text-[9px]">Hantera träd i Bygge → Import → Miljö</p>
          </div>
        </div>
      )}

      {/* Sky style */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-muted-foreground" />
          <span className="text-sm text-foreground">Himmel / Bakgrund</span>
        </div>
        <div className="flex gap-1">
          {([
            { key: 'auto' as const, label: 'Auto' },
            { key: 'gradient' as const, label: 'Gradient' },
            { key: 'solid' as const, label: 'Enfärgad' },
          ]).map(({ key, label }) => (
            <Button key={key} size="sm"
              variant={skyStyle === key ? 'default' : 'outline'}
              className="flex-1 h-8 text-[10px]"
              onClick={() => setSkyStyle(key)}>
              {label}
            </Button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground">Auto = HDR-miljö. Gradient/Enfärgad kan vara lättare på svag hårdvara.</p>
      </div>
    </div>
  );
}
