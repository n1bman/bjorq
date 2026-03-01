import { useAppStore } from '../../../store/useAppStore';
import { useRef, useState } from 'react';
import { Upload, Trash2, RotateCcw, Search, FolderOpen } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';

const generateId = () => Math.random().toString(36).slice(2, 10);

const defaultCategories = ['Möbler', 'Belysning', 'Dekoration', 'Kök', 'Badrum', 'Utomhus', 'Övrigt'];

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

  const [importName, setImportName] = useState('');
  const [importCategory, setImportCategory] = useState('Möbler');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const floorItems = items.filter((p) => p.floorId === activeFloorId);

  // Get unique categories from catalog
  const catalogCategories = [...new Set(catalog.map((c) => c.category || 'Övrigt'))];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setImportName(file.name.replace(/\.(glb|gltf)$/i, ''));
    e.target.value = '';
  };

  const handleImport = () => {
    if (!pendingFile || !activeFloorId || !importName.trim()) return;
    const url = URL.createObjectURL(pendingFile);
    const catalogId = generateId();
    addToCatalog({ id: catalogId, name: importName.trim(), url, source: 'user', category: importCategory });
    addProp({
      id: generateId(),
      catalogId,
      floorId: activeFloorId,
      url,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    setPendingFile(null);
    setImportName('');
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

  // Filter catalog
  const filteredCatalog = catalog
    .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((c) => !filterCategory || (c.category || 'Övrigt') === filterCategory)
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  return (
    <div className="space-y-4 px-1">
      {/* Import */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Importera modell
        </h4>

        {!pendingFile ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-all min-h-[44px]"
          >
            <Upload size={16} />
            <span>Ladda upp GLB/GLTF</span>
          </button>
        ) : (
          <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <FolderOpen size={12} />
              <span className="truncate">{pendingFile.name}</span>
            </div>
            <Input
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder="Modellnamn..."
              className="h-7 text-xs"
            />
            <select
              value={importCategory}
              onChange={(e) => setImportCategory(e.target.value)}
              className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border"
            >
              {defaultCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button size="sm" className="flex-1 h-7 text-[10px]" onClick={handleImport} disabled={!importName.trim()}>
                Importera
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setPendingFile(null)}>
                Avbryt
              </Button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Catalog */}
      {catalog.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Mina modeller ({catalog.length})
          </h4>

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök modell..."
              className="h-7 text-xs pl-7"
            />
          </div>

          {/* Category filter */}
          {catalogCategories.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              <Button
                size="sm"
                variant={!filterCategory ? 'default' : 'outline'}
                className="h-5 text-[9px] px-2 shrink-0"
                onClick={() => setFilterCategory(null)}
              >
                Alla
              </Button>
              {catalogCategories.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={filterCategory === c ? 'default' : 'outline'}
                  className="h-5 text-[9px] px-2 shrink-0"
                  onClick={() => setFilterCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredCatalog.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-2 py-2 rounded-lg bg-secondary/30 text-xs min-h-[44px]">
                <button
                  onClick={() => handlePlaceFromCatalog(item)}
                  className="flex-1 text-left text-foreground hover:text-primary transition-colors min-w-0"
                >
                  <p className="truncate">{item.name}</p>
                  {item.category && (
                    <p className="text-[9px] text-muted-foreground">{item.category}</p>
                  )}
                </button>
                <button
                  onClick={() => removeFromCatalog(item.id)}
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {filteredCatalog.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 text-center py-2">
                {searchQuery ? 'Inga matchande modeller' : 'Tomt'}
              </p>
            )}
          </div>
        </div>
      )}

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
                  <span className="text-foreground truncate">{catItem?.name || 'Modell'}</span>
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
