import { useAppStore } from '@/store/useAppStore';
import { useRef } from 'react';
import { Upload, Compass, Ruler, Layers, Move } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export default function ImportTools() {
  const homeGeometry = useAppStore((s) => s.homeGeometry);
  const setHomeGeometrySource = useAppStore((s) => s.setHomeGeometrySource);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const setNorthAngle = useAppStore((s) => s.setNorthAngle);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImportedModel({ url });
    setHomeGeometrySource('imported');
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

        {imported.url && (
          <div className="flex items-center gap-2 text-[10px] text-primary">
            <span className="truncate">{imported.url.split('/').pop()}</span>
          </div>
        )}
      </div>

      {isImported && (
        <>
          {/* Position/Scale */}
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

          {/* Scale */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Ruler size={12} /> Skala
            </h4>
            <div className="flex items-center gap-2">
              <Slider
                min={0.01} max={10} step={0.01}
                value={[imported.scale[0]]}
                onValueChange={([v]) => setImportedModel({ scale: [v, v, v] })}
                className="flex-1"
              />
              <span className="text-[10px] text-foreground w-10 text-right">{imported.scale[0].toFixed(2)}x</span>
            </div>
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
