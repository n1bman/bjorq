import { useAppStore } from '@/store/useAppStore';
import { useRef } from 'react';
import { Upload, Trash2, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function FurnishTools() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const catalog = useAppStore((s) => s.props.catalog);
  const items = useAppStore((s) => s.props.items);
  const addToCatalog = useAppStore((s) => s.addToCatalog);
  const addProp = useAppStore((s) => s.addProp);
  const removeProp = useAppStore((s) => s.removeProp);
  const updateProp = useAppStore((s) => s.updateProp);
  const removeFromCatalog = useAppStore((s) => s.removeFromCatalog);
  const fileRef = useRef<HTMLInputElement>(null);

  const floorItems = items.filter((p) => p.floorId === activeFloorId);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFloorId) return;
    const url = URL.createObjectURL(file);
    const catalogId = generateId();
    addToCatalog({ id: catalogId, name: file.name.replace(/\.(glb|gltf)$/i, ''), url, source: 'user' });
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

  const handlePlaceFromCatalog = (catItem: typeof catalog[0]) => {
    if (!activeFloorId) return;
    addProp({
      id: generateId(),
      catalogId: catItem.id,
      floorId: activeFloorId,
      url: catItem.url,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  };

  return (
    <div className="space-y-4 px-1">
      {/* Import */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Importera modell
        </h4>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-all min-h-[44px]"
        >
          <Upload size={16} />
          <span>Ladda upp GLB/GLTF</span>
        </button>
        <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleUpload} />
      </div>

      {/* Catalog */}
      {catalog.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Mina modeller
          </h4>
          {catalog.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-2 py-2 rounded-lg bg-secondary/30 text-xs min-h-[44px]">
              <button
                onClick={() => handlePlaceFromCatalog(item)}
                className="flex-1 text-left text-foreground hover:text-primary transition-colors truncate"
              >
                {item.name}
              </button>
              <button
                onClick={() => removeFromCatalog(item.id)}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Placed items */}
      {floorItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Placerade ({floorItems.length})
          </h4>
          {floorItems.map((prop) => (
            <div key={prop.id} className="bg-secondary/30 rounded-lg p-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground truncate">{prop.url.split('/').pop()}</span>
                <button onClick={() => removeProp(prop.id)} className="p-0.5 rounded hover:bg-destructive/20 text-destructive">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw size={10} className="text-muted-foreground" />
                <Slider
                  min={0} max={360} step={1}
                  value={[prop.rotation[1] * (180 / Math.PI)]}
                  onValueChange={([v]) => updateProp(prop.id, { rotation: [0, v * (Math.PI / 180), 0] })}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Skala</span>
                <Slider
                  min={0.1} max={5} step={0.1}
                  value={[prop.scale[0]]}
                  onValueChange={([v]) => updateProp(prop.id, { scale: [v, v, v] })}
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
