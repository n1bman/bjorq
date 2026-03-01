import { useAppStore } from '../../store/useAppStore';
import { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Slider } from '../ui/slider';

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function PropsPanel() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const props = useAppStore((s) => s.props.items);
  const addProp = useAppStore((s) => s.addProp);
  const addToCatalog = useAppStore((s) => s.addToCatalog);
  const removeProp = useAppStore((s) => s.removeProp);
  const updateProp = useAppStore((s) => s.updateProp);
  const fileRef = useRef<HTMLInputElement>(null);

  const floorProps = props.filter((p) => p.floorId === activeFloorId);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFloorId) return;
    const url = URL.createObjectURL(file);
    const catalogId = generateId();
    addToCatalog({
      id: catalogId,
      name: file.name,
      url,
      source: 'user',
    });
    addProp({
      id: generateId(),
      catalogId,
      floorId: activeFloorId,
      url,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    e.target.value = '';
  };

  return (
    <div className="glass-panel rounded-xl p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display">3D-objekt</h3>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
        >
          <Upload size={12} />
          <span>Importera</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleUpload} />

      {floorProps.length === 0 && (
        <p className="text-muted-foreground italic">Inga 3D-objekt. Importera en GLB/GLTF-fil.</p>
      )}

      {floorProps.map((prop) => (
        <div key={prop.id} className="bg-secondary/30 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-foreground truncate w-32">{prop.url.split('/').pop()}</span>
            <button onClick={() => removeProp(prop.id)} className="p-0.5 rounded hover:bg-destructive/20 text-destructive">
              <Trash2 size={12} />
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-10">Rot Y:</span>
              <Slider
                min={0} max={360} step={1}
                value={[prop.rotation[1] * (180 / Math.PI)]}
                onValueChange={([v]) => updateProp(prop.id, { rotation: [0, v * (Math.PI / 180), 0] })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-10">Skala:</span>
              <Slider
                min={0.1} max={5} step={0.1}
                value={[prop.scale[0]]}
                onValueChange={([v]) => updateProp(prop.id, { scale: [v, v, v] })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
