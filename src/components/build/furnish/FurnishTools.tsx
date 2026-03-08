import { useAppStore } from '../../../store/useAppStore';
import { Trash2, RotateCcw } from 'lucide-react';
import { Slider } from '../../ui/slider';
import AssetCatalog from './AssetCatalog';

export default function FurnishTools() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const catalog = useAppStore((s) => s.props.catalog);
  const items = useAppStore((s) => s.props.items);
  const removeProp = useAppStore((s) => s.removeProp);
  const updateProp = useAppStore((s) => s.updateProp);

  const floorItems = items.filter((p) => p.floorId === activeFloorId);

  return (
    <div className="space-y-4 px-1">
      {/* Asset Catalog (search, categories, thumbnails, import) */}
      <AssetCatalog />

      {/* Placed items */}
      {floorItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Placerade ({floorItems.length})
          </h4>
          {floorItems.map((prop) => {
            const catItem = catalog.find((c) => c.id === prop.catalogId);
            return (
              <div key={prop.id} className="bg-secondary/30 rounded-lg p-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {prop.colorOverride && (
                      <div className="w-3 h-3 rounded-full shrink-0 border border-border" style={{ backgroundColor: prop.colorOverride }} />
                    )}
                    <span className="text-foreground truncate">{catItem?.name || 'Modell'}</span>
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
