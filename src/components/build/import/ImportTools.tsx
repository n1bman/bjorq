import { useAppStore } from '../../../store/useAppStore';
import { Compass, Ruler, Move, RotateCw, Trash2, Sun } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { Input } from '../../ui/input';
import * as THREE from 'three';

export default function ImportTools() {
  const homeGeometry = useAppStore((s) => s.homeGeometry);
  const setHomeGeometrySource = useAppStore((s) => s.setHomeGeometrySource);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const setNorthAngle = useAppStore((s) => s.setNorthAngle);
  const clearImportedModel = useAppStore((s) => s.clearImportedModel);

  const imported = homeGeometry.imported;
  const isImported = homeGeometry.source === 'imported';

  if (!isImported) return null;

  return (
    <div className="space-y-4 px-1">
      {/* Info about openings */}
      <div className="rounded-lg bg-secondary/30 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
        <strong className="text-foreground">OBS:</strong> Fönster, dörrar och trappor identifieras inte automatiskt från importerade modeller. 
        Använd verktygen under <em>Struktur</em>-fliken för att manuellt placera öppningar på den importerade modellen.
      </div>

      {/* Position */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Move size={12} /> Placering
        </h4>
        <div className="space-y-1.5">
          {(['x', 'y', 'z'] as const).map((axis, i) => (
            <div key={axis} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-4 uppercase">{axis}</span>
              <Slider
                min={-20} max={20} step={0.1}
                value={[imported.position[i]]}
                onValueChange={([v]) => {
                  const pos = [...imported.position] as [number, number, number];
                  pos[i] = v;
                  setImportedModel({ position: pos });
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-foreground w-8 text-right">{imported.position[i].toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rotation (XYZ) */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <RotateCw size={12} /> Rotation
        </h4>
        <div className="space-y-1.5">
          {(['x', 'y', 'z'] as const).map((axis, i) => (
            <div key={axis} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-4 uppercase">{axis}</span>
              <Slider
                min={-180} max={180} step={1}
                value={[Math.round(THREE.MathUtils.radToDeg(imported.rotation[i])) || 0]}
                onValueChange={([v]) => {
                  const rot = [...imported.rotation] as [number, number, number];
                  rot[i] = THREE.MathUtils.degToRad(v);
                  setImportedModel({ rotation: rot });
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-foreground w-8 text-right">
                {Math.round(THREE.MathUtils.radToDeg(imported.rotation[i]) || 0)}°
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Ruler size={12} /> Skala
        </h4>
        <div className="flex items-center gap-2">
          <Slider
            min={0.1} max={5} step={0.05}
            value={[imported.scale[0]]}
            onValueChange={([v]) => setImportedModel({ scale: [v, v, v] })}
            className="flex-1"
          />
          <Input
            type="number"
            step="0.05"
            min={0.05}
            max={10}
            value={imported.scale[0]}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0.1;
              setImportedModel({ scale: [v, v, v] });
            }}
            className="h-7 text-[10px] w-16"
          />
        </div>
        <p className="text-[9px] text-muted-foreground">
          1 ruta = {(0.5 / imported.scale[0]).toFixed(2)}m vid nuvarande skala
        </p>
      </div>

      {/* North Angle */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Compass size={12} /> Nordriktning
        </h4>
        <div className="flex items-center gap-2">
          <Slider
            min={0} max={360} step={1}
            value={[imported.northAngle]}
            onValueChange={([v]) => setNorthAngle(v)}
            className="flex-1"
          />
          <span className="text-[10px] text-foreground w-8 text-right">{imported.northAngle}°</span>
        </div>
      </div>

      {/* Sunlight transparency */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Sun size={12} /> Solljus-transparens
        </h4>
        <div className="flex items-center gap-2">
          <Slider
            min={0} max={100} step={5}
            value={[Math.round(((imported.importedOpacity ?? 1) * 100))]}
            onValueChange={([v]) => setImportedModel({ importedOpacity: v / 100 })}
            className="flex-1"
          />
          <span className="text-[10px] text-foreground w-8 text-right">{Math.round((imported.importedOpacity ?? 1) * 100)}%</span>
        </div>
        <p className="text-[9px] text-muted-foreground">
          Sänk för att låta solljus passera genom modellen. Under 80% blockeras inga skuggor.
        </p>
      </div>

      {/* Remove imported model */}
      <button
        onClick={() => {
          if (window.confirm('Är du säker på att du vill ta bort den importerade modellen?')) {
            clearImportedModel();
          }
        }}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 text-destructive text-xs hover:bg-destructive/20 transition-all min-h-[44px]"
      >
        <Trash2 size={14} />
        Ta bort importerad modell
      </button>

      {/* Back to procedural */}
      <button
        onClick={() => setHomeGeometrySource('procedural')}
        className="w-full py-2 rounded-lg bg-secondary/30 text-muted-foreground text-xs hover:bg-secondary/50 transition-all min-h-[44px]"
      >
        Byt till procedurellt byggande
      </button>
    </div>
  );
}
