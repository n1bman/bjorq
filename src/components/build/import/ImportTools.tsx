import { useAppStore } from '@/store/useAppStore';
import { useRef, useState } from 'react';
import { Upload, Compass, Ruler, Layers, Move, RotateCw, FileArchive } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import SketchUpWizard from './SketchUpWizard';

export default function ImportTools() {
  const homeGeometry = useAppStore((s) => s.homeGeometry);
  const setHomeGeometrySource = useAppStore((s) => s.setHomeGeometrySource);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const setNorthAngle = useAppStore((s) => s.setNorthAngle);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sketchUpOpen, setSketchUpOpen] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Also read as base64 for persistence across page reloads
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]; // strip data:...;base64,
      setImportedModel({ url, fileData: base64 });
      setHomeGeometrySource('imported');
    };
    reader.onerror = () => {
      // Fallback: save without fileData
      setImportedModel({ url });
      setHomeGeometrySource('imported');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const imported = homeGeometry.imported;
  const isImported = homeGeometry.source === 'imported';

  return (
    <div className="space-y-4 px-1">
      {/* Upload */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Upload size={12} /> Ladda upp modell
        </h4>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-all min-h-[44px]"
        >
          <Upload size={16} />
          <span>Välj GLB/GLTF</span>
        </button>
        <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleUpload} />

        <button
          onClick={() => setSketchUpOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-all min-h-[44px]"
        >
          <FileArchive size={16} />
          <span>Ladda upp SketchUp (ZIP / Mapp)</span>
        </button>
        <SketchUpWizard open={sketchUpOpen} onOpenChange={setSketchUpOpen} />
        {imported.url && (
          <div className="flex items-center gap-2 text-[10px] text-primary">
            <span className="truncate">{imported.url.split('/').pop()}</span>
          </div>
        )}

        {imported.modelStats && (
          <div className="rounded-lg border border-border p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Prestanda</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                imported.modelStats.rating === 'ok' ? 'bg-green-500/20 text-green-400' :
                imported.modelStats.rating === 'heavy' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {imported.modelStats.rating === 'ok' ? '✓ OK' : imported.modelStats.rating === 'heavy' ? '⚠ Tung' : '✗ För tung'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
              <span className="text-muted-foreground">Trianglar</span>
              <span className="text-foreground text-right">{imported.modelStats.triangles.toLocaleString()}</span>
              <span className="text-muted-foreground">Material</span>
              <span className="text-foreground text-right">{imported.modelStats.materials}</span>
              <span className="text-muted-foreground">Texturer</span>
              <span className="text-foreground text-right">{imported.modelStats.textures}</span>
              <span className="text-muted-foreground">Max upplösning</span>
              <span className="text-foreground text-right">{imported.modelStats.maxTextureRes || '–'}px</span>
            </div>
          </div>
        )}
      </div>

      {isImported && (
        <>
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

          {/* Rotation (Y-axis) */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <RotateCw size={12} /> Rotation
            </h4>
            <div className="flex items-center gap-2">
              <Slider
                min={0} max={360} step={1}
                value={[THREE.MathUtils.radToDeg(imported.rotation[1]) || 0]}
                onValueChange={([v]) => {
                  const rad = THREE.MathUtils.degToRad(v);
                  setImportedModel({ rotation: [imported.rotation[0], rad, imported.rotation[2]] });
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-foreground w-8 text-right">
                {Math.round(THREE.MathUtils.radToDeg(imported.rotation[1]) || 0)}°
              </span>
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


          {/* Back to procedural */}
          <button
            onClick={() => setHomeGeometrySource('procedural')}
            className="w-full py-2 rounded-lg bg-secondary/30 text-muted-foreground text-xs hover:bg-secondary/50 transition-all min-h-[44px]"
          >
            Byt till procedurellt byggande
          </button>
        </>
      )}
    </div>
  );
}

// Need THREE for radToDeg/degToRad
import * as THREE from 'three';
