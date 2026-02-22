import { useAppStore } from '@/store/useAppStore';
import type { BuildTool, SnapMode } from '@/store/types';
import {
  MousePointer2, Minus, Square, DoorOpen, SquareStack,
  Undo2, Redo2, Grid3X3, Ruler, Trash2, Copy, Paintbrush,
  Eye, Box, Layers, Ghost, XCircle, Sun, CloudRain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import type { WeatherCondition } from '@/store/types';
import FloorPicker from './FloorPicker';
import { useState } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

const viewModes = [
  { key: 'topdown' as const, label: 'Plan', icon: Eye },
  { key: '3d' as const, label: '3D', icon: Box },
  { key: 'floor-isolate' as const, label: 'Isolera', icon: Layers },
];

const gridSizes = [0.1, 0.25, 0.5, 1.0];
const snapModes: { key: SnapMode; label: string }[] = [
  { key: 'strict', label: 'Strikt' },
  { key: 'soft', label: 'Mjuk' },
  { key: 'off', label: 'Av' },
];

export default function BuildTopToolbar() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoLen = useAppStore((s) => s.build.undoStack.length);
  const redoLen = useAppStore((s) => s.build.redoStack.length);
  const grid = useAppStore((s) => s.build.grid);
  const setGrid = useAppStore((s) => s.setGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);
  const cameraMode = useAppStore((s) => s.build.view.cameraMode);
  const setCameraMode = useAppStore((s) => s.setCameraMode);
  const showGhost = useAppStore((s) => s.build.view.showOtherFloorsGhost);
  const setView = useAppStore((s) => s.setView);
  const clearAllFloors = useAppStore((s) => s.clearAllFloors);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const setSunPosition = useAppStore((s) => s.setSunPosition);
  const weatherCondition = useAppStore((s) => s.environment.weather.condition);
  const setWeather = useAppStore((s) => s.setWeather);
  const envSource = useAppStore((s) => s.environment.source);
  const setWeatherSource = useAppStore((s) => s.setWeatherSource);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showEnvPanel, setShowEnvPanel] = useState(false);

  const handleClearAll = () => {
    clearAllFloors();
    setShowClearConfirm(false);
  };

  const ToolBtn = ({ tool, icon: Icon, label }: { tool: BuildTool; icon: typeof MousePointer2; label: string }) => (
    <button
      onClick={() => setBuildTool(tool)}
      title={label}
      className={cn(
        'flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all min-w-[44px] min-h-[44px] justify-center',
        activeTool === tool
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
      )}
    >
      <Icon size={18} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );

  return (
    <div className="relative z-50">
    <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/80 backdrop-blur-sm overflow-x-auto flex-nowrap">
      {/* Primary tools */}
      <ToolBtn tool="select" icon={MousePointer2} label="Markera" />
      <ToolBtn tool="copy" icon={Copy} label="Kopiera" />
      <ToolBtn tool="erase" icon={Trash2} label="Radera" />

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo/Redo */}
      <button onClick={undo} disabled={undoLen === 0} title="Ångra"
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-30 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Undo2 size={18} />
      </button>
      <button onClick={redo} disabled={redoLen === 0} title="Gör om"
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-30 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Redo2 size={18} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Grid controls */}
      <button onClick={toggleGrid} title="Rutnät"
        className={cn(
          'p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          grid.enabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
        )}>
        <Grid3X3 size={18} />
      </button>

      <select
        value={grid.sizeMeters}
        onChange={(e) => setGrid({ sizeMeters: parseFloat(e.target.value) })}
        className="h-8 px-1.5 rounded-md bg-secondary/50 text-xs text-foreground border-none outline-none cursor-pointer shrink-0"
        style={{ width: 70, maxWidth: 70 }}
        title="Rutnätsstorlek"
      >
        {gridSizes.map((s) => (
          <option key={s} value={s}>{s} m</option>
        ))}
      </select>

      <select
        value={grid.snapMode}
        onChange={(e) => setGrid({ snapMode: e.target.value as SnapMode })}
        className="h-8 px-1.5 rounded-md bg-secondary/50 text-xs text-foreground border-none outline-none cursor-pointer shrink-0"
        style={{ width: 70, maxWidth: 70 }}
        title="Snap-läge"
      >
        {snapModes.map((sm) => (
          <option key={sm.key} value={sm.key}>{sm.label}</option>
        ))}
      </select>

      <div className="w-px h-6 bg-border mx-1" />

      {/* View toggle */}
      <div className="flex items-center gap-0.5 bg-secondary/30 rounded-lg p-0.5">
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCameraMode(key)}
            title={label}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all min-h-[36px]',
              cameraMode === key
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Ghost floors toggle */}
      <button
        onClick={() => setView({ showOtherFloorsGhost: !showGhost })}
        title={showGhost ? 'Dölj andra våningars väggar' : 'Visa andra våningars väggar som skuggor'}
        className={cn(
          'p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          showGhost ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Ghost size={18} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Clear all button */}
      <button
        onClick={() => setShowClearConfirm(true)}
        title="Rensa allt"
        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <XCircle size={18} />
      </button>

      {/* Sun/Weather toggle */}
      <button
        onClick={() => setShowEnvPanel(!showEnvPanel)}
        title="Sol & Väder"
        className={cn(
          'p-2 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          showEnvPanel ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Sun size={18} />
      </button>

      {/* Save & View button */}
      <button
        onClick={() => {
          toast.success('Sparad! Ditt hem är redo att visa.');
          setAppMode('home');
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        <Check size={14} />
        <span className="hidden sm:inline">Klar</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Floor picker */}
      <FloorPicker />

      </div>

      {/* Environment panel - rendered OUTSIDE overflow container */}
      {showEnvPanel && (
        <div className="absolute top-full right-3 mt-2 z-[200] bg-card border border-border rounded-xl p-3 space-y-3 w-56 shadow-xl pointer-events-auto">
          <p className="text-xs font-medium text-foreground">Sol & Väder</p>
          
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Solriktning</span>
            <div className="flex items-center gap-2">
              <Slider min={0} max={360} step={1} value={[sunAzimuth]}
                onValueChange={([v]) => setSunPosition(v, sunElevation)} className="flex-1" />
              <span className="text-[10px] text-foreground w-8 text-right">{sunAzimuth}°</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Solhöjd</span>
            <div className="flex items-center gap-2">
              <Slider min={5} max={90} step={1} value={[sunElevation]}
                onValueChange={([v]) => setSunPosition(sunAzimuth, v)} className="flex-1" />
              <span className="text-[10px] text-foreground w-8 text-right">{sunElevation}°</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Väder</span>
            <div className="flex gap-1 mb-2">
              {(['clear', 'cloudy', 'rain', 'snow'] as WeatherCondition[]).map((w) => (
                <button
                  key={w}
                  onClick={() => { setWeather(w); if (envSource === 'auto') setWeatherSource('manual'); }}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[10px] transition-colors',
                    weatherCondition === w && envSource !== 'auto' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {w === 'clear' ? '☀️' : w === 'cloudy' ? '☁️' : w === 'rain' ? '🌧️' : '❄️'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setWeatherSource(envSource === 'auto' ? 'manual' : 'auto')}
              className={cn(
                'w-full py-1.5 rounded-md text-[10px] font-medium transition-colors',
                envSource === 'auto' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
              )}
            >
              {envSource === 'auto' ? '🌍 Live väder (aktiv)' : '🌍 Aktivera live väder'}
            </button>
          </div>
        </div>
      )}

      {/* Clear confirmation dialog */}
      {showClearConfirm && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[200] bg-card border border-border rounded-xl p-4 space-y-3 w-64 shadow-xl pointer-events-auto">
          <p className="text-sm text-foreground font-medium text-center">Rensa allt?</p>
          <p className="text-xs text-muted-foreground text-center">
            Alla väggar, rum, trappor och möbler på alla våningar tas bort. Kan inte ångras.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-2 rounded-lg bg-secondary/50 text-foreground text-xs font-medium hover:bg-secondary transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors"
            >
              Rensa allt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
