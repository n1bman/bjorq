import { useAppStore } from '@/store/useAppStore';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { PenTool, Sun, Thermometer } from 'lucide-react';
import type { WeatherCondition } from '@/store/types';

export default function DashboardOverlay() {
  const setAppMode = useAppStore((s) => s.setAppMode);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const setSunPosition = useAppStore((s) => s.setSunPosition);
  const weatherCondition = useAppStore((s) => s.environment.weather.condition);
  const temperature = useAppStore((s) => s.environment.weather.temperature);
  const setWeather = useAppStore((s) => s.setWeather);
  const floors = useAppStore((s) => s.layout.floors);
  const homeGeometry = useAppStore((s) => s.homeGeometry);

  const hasContent = floors.some((f) => f.walls.length > 0 || f.rooms.length > 0) || homeGeometry.source === 'imported';

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top-right environment panel */}
      <div className="absolute top-3 right-3 pointer-events-auto">
        <div className="glass-panel rounded-xl p-3 space-y-3 w-56">
          <div className="flex items-center gap-2">
            <Sun size={14} className="text-primary" />
            <span className="text-xs font-medium text-foreground">Miljö</span>
          </div>

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
            <div className="flex gap-1">
              {(['clear', 'cloudy', 'rain', 'snow'] as WeatherCondition[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeather(w)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[10px] transition-colors',
                    weatherCondition === w ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {w === 'clear' ? '☀️' : w === 'cloudy' ? '☁️' : w === 'rain' ? '🌧️' : '❄️'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Thermometer size={12} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{temperature}°C</span>
          </div>
        </div>
      </div>

      {/* Bottom-left room list */}
      {hasContent && (
        <div className="absolute bottom-3 left-3 pointer-events-auto">
          <div className="glass-panel rounded-xl p-3 w-48 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rum</span>
            <div className="mt-1 space-y-1">
              {floors.flatMap((f) =>
                f.rooms.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs text-foreground py-0.5">
                    <span>{r.name}</span>
                    <span className="text-muted-foreground text-[10px]">{f.name}</span>
                  </div>
                ))
              )}
              {floors.every((f) => f.rooms.length === 0) && homeGeometry.source === 'imported' && (
                <span className="text-[10px] text-muted-foreground">Importerad modell</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit button */}
      <div className="absolute bottom-3 right-3 pointer-events-auto">
        <button
          onClick={() => setAppMode('build')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-lg"
        >
          <PenTool size={14} />
          Redigera
        </button>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground text-sm">Inget hem byggt ännu</p>
            <p className="text-muted-foreground/60 text-xs">Gå till Bygge för att skapa din planlösning</p>
          </div>
        </div>
      )}
    </div>
  );
}
