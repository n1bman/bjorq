import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Gauge, Monitor, Sun, Sparkles, RefreshCw, Cpu, AlertTriangle, CheckCircle, Activity, Lightbulb, Eye, Contrast, RotateCcw, ChevronRight, BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { Progress } from '../../ui/progress';
import OptionButton from '../../ui/OptionButton';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import type { QualityLevel } from '../../../store/types';
import { getStats as getCacheStats } from '../../../lib/modelCache';

const qualityOptions: { value: QualityLevel; label: string; desc: string }[] = [
  { value: 'low', label: 'Låg', desc: 'Minimal – bra för surfplatta/RPi' },
  { value: 'medium', label: 'Medium', desc: 'Balanserad prestanda' },
  { value: 'high', label: 'Hög', desc: 'Full kvalitet' },
];

function notify() {
  toast.success('Ändringar sparade', { description: '3D-scenen laddas om automatiskt.' });
}

function computeScore(quality: QualityLevel, shadows: boolean, postprocessing: boolean, tabletMode: boolean) {
  if (tabletMode) return 20;
  let score = quality === 'low' ? 30 : quality === 'medium' ? 60 : 100;
  if (shadows) score += 25;
  if (postprocessing) score += 15;
  return Math.min(score, 140);
}

function getScoreInfo(score: number) {
  if (score <= 40) return { label: 'Lätt', color: 'hsl(142, 71%, 45%)' };
  if (score <= 75) return { label: 'Balanserad', color: 'hsl(45, 93%, 47%)' };
  return { label: 'Krävande', color: 'hsl(0, 84%, 60%)' };
}

function getDprForQuality(quality: QualityLevel, tabletMode: boolean) {
  if (tabletMode) return 0.75;
  return quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
}

function getShadowMapRes(quality: QualityLevel) {
  return quality === 'low' ? 512 : quality === 'medium' ? 1024 : 2048;
}

function getDeviceInfo() {
  const cores = navigator.hardwareConcurrency || 0;
  const screenRes = `${window.screen.width}×${window.screen.height}`;
  const memGB = (navigator as any).deviceMemory || null;
  return { cores, screenRes, memGB };
}

const DEVICE_LIMITS = [
  { label: 'Raspberry Pi', triangles: 50_000, textures: 10, color: 'hsl(0, 84%, 60%)' },
  { label: 'Mobil / Surfplatta', triangles: 150_000, textures: 30, color: 'hsl(45, 93%, 47%)' },
  { label: 'Desktop', triangles: 500_000, textures: 80, color: 'hsl(142, 71%, 45%)' },
];

function SceneLoadMetrics() {
  const stats = getCacheStats();
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenbelastning</span>
        </div>
        <ChevronRight size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-1 pb-2">
        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground text-center">
          <div><span className="block text-foreground font-medium">{stats.modelCount}</span>Modeller</div>
          <div><span className="block text-foreground font-medium">{(stats.totalTriangles / 1000).toFixed(1)}k</span>Trianglar</div>
          <div><span className="block text-foreground font-medium">{stats.textureCount}</span>Texturer</div>
        </div>
        <div className="space-y-2">
          {DEVICE_LIMITS.map((device) => {
            const pct = Math.min((stats.totalTriangles / device.triangles) * 100, 100);
            const over = stats.totalTriangles > device.triangles;
            return (
              <div key={device.label} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{device.label}</span>
                  <span className={`font-medium ${over ? 'text-destructive' : 'text-foreground'}`}>
                    {over ? '⚠ Över gräns' : `${pct.toFixed(0)}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: over ? 'hsl(0, 84%, 60%)' : device.color }}
                  />
                </div>
                <p className="text-[8px] text-muted-foreground/60">Max: {(device.triangles / 1000).toFixed(0)}k trianglar / {device.textures} texturer</p>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function getRecommendation(score: number, cores: number, memGB: number | null) {
  const isWeak = cores > 0 && cores <= 4;
  const isLowMem = memGB !== null && memGB <= 4;
  if (score > 75 && (isWeak || isLowMem)) {
    return 'Din enhet verkar ha begränsade resurser. Prova "Medium" eller "Låg" kvalitet för bättre prestanda.';
  }
  if (score > 100) {
    return 'Höga inställningar med alla effekter. Kan vara tungt på äldre enheter.';
  }
  return null;
}

export default function GraphicsSettings() {
  const perf = useAppStore((s) => s.performance);
  const setPerformance = useAppStore((s) => s.setPerformance);
  const setProfile = useAppStore((s) => s.setProfile);

  const score = useMemo(() => computeScore(perf.quality, perf.shadows, perf.postprocessing, perf.tabletMode), [perf]);
  const scoreInfo = getScoreInfo(score);
  const device = useMemo(() => getDeviceInfo(), []);
  const dpr = getDprForQuality(perf.quality, perf.tabletMode);
  const shadowRes = getShadowMapRes(perf.quality);
  const recommendation = getRecommendation(score, device.cores, device.memGB);

  const applyTabletMode = (on: boolean) => {
    if (on) {
      setPerformance({ tabletMode: true, quality: 'low', shadows: false, postprocessing: false, antialiasing: false });
    } else {
      setPerformance({ tabletMode: false, antialiasing: true });
    }
    notify();
  };

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <Gauge size={18} className="text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Rendering</h3>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <RefreshCw size={9} /> 3D-scenen laddas om automatiskt vid ändring
          </p>
        </div>
      </div>

      {/* Performance Score */}
      <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Belastning</span>
          <span className="text-xs font-bold" style={{ color: scoreInfo.color }}>{scoreInfo.label}</span>
        </div>
        <Progress value={Math.min(score, 140) / 1.4} className="h-2" />
        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
          <div className="text-center">
            <span className="block text-foreground font-medium">{dpr}x</span>
            DPR
          </div>
          <div className="text-center">
            <span className="block text-foreground font-medium">{perf.shadows ? `${shadowRes}px` : 'Av'}</span>
            Skuggor
          </div>
          <div className="text-center">
            <span className="block text-foreground font-medium">{perf.postprocessing ? 'På' : 'Av'}</span>
            Effekter
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Cpu size={10} />
        <span>{device.cores > 0 ? `${device.cores} kärnor` : 'Okänd CPU'}</span>
        <span>·</span>
        <span>{device.screenRes}</span>
        {device.memGB && <><span>·</span><span>{device.memGB} GB RAM</span></>}
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-[10px] text-destructive">{recommendation}</p>
        </div>
      )}
      {!recommendation && score <= 75 && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-primary">Bra balans mellan kvalitet och prestanda.</p>
        </div>
      )}

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

      {/* Advanced collapsible */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avancerat</span>
          </div>
          <ChevronRight size={14} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-1 pb-2">
          {/* Anti-aliasing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-muted-foreground" />
              <span className="text-sm text-foreground">Anti-aliasing</span>
            </div>
            <Switch
              checked={perf.antialiasing}
              onCheckedChange={(v) => { setPerformance({ antialiasing: v }); notify(); }}
            />
          </div>

          {/* Tone Mapping + Exposure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Contrast size={14} className="text-muted-foreground" />
                <span className="text-sm text-foreground">Tone mapping</span>
              </div>
              <Switch
                checked={perf.toneMapping}
                onCheckedChange={(v) => { setPerformance({ toneMapping: v }); notify(); }}
              />
            </div>
            {perf.toneMapping && (
              <div className="pl-6 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Exponering</span>
                  <span className="text-xs font-mono text-muted-foreground">{(perf.exposure ?? 1.0).toFixed(1)}</span>
                </div>
                <Slider
                  value={[perf.exposure]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={([v]) => { setPerformance({ exposure: v }); }}
                />
              </div>
            )}
          </div>

          {/* Environment Light */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-muted-foreground" />
              <span className="text-sm text-foreground">Miljöljus (HDR)</span>
            </div>
            <Switch
              checked={perf.environmentLight}
              onCheckedChange={(v) => { setPerformance({ environmentLight: v }); notify(); }}
            />
          </div>

          {/* Max lights */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-muted-foreground" />
                <span className="text-sm text-foreground">Max ljuskällor</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {perf.maxLights === 0 ? 'Obegränsat' : perf.maxLights}
              </span>
            </div>
            <Slider
              value={[perf.maxLights]}
              min={0}
              max={16}
              step={1}
              onValueChange={([v]) => { setPerformance({ maxLights: v }); }}
            />
            <p className="text-[9px] text-muted-foreground">0 = obegränsat. Lägre värde → bättre prestanda på RPi.</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Scene Load Metrics */}
      <SceneLoadMetrics />

      {/* Performance HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-muted-foreground" />
          <div>
            <span className="text-sm text-foreground">Performance HUD</span>
            <p className="text-[10px] text-muted-foreground">Visar FPS-räknare i hörnet</p>
          </div>
        </div>
        <Switch
          checked={perf.showHUD}
          onCheckedChange={(v) => { setPerformance({ showHUD: v }); }}
        />
      </div>

      {perf._autoDetectedPerformance && perf.tabletMode && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Cpu size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-primary">Surfplatteläge aktiverades automatiskt baserat på din hårdvara.</p>
        </div>
      )}

      {/* Reset to defaults */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => {
          setPerformance({
            quality: 'high',
            shadows: true,
            postprocessing: false,
            tabletMode: false,
            antialiasing: true,
            toneMapping: true,
            exposure: 1.0,
            environmentLight: true,
            maxLights: 0,
            showHUD: false,
            _autoDetectedPerformance: false,
          });
          setProfile({ dashboardBg: 'scene3d' });
          toast.success('Grafikinställningar återställda', { description: '3D-scenen laddas om med standardvärden.' });
        }}
      >
        <RotateCcw size={14} />
        Återställ standard
      </Button>
    </div>
  );
}
