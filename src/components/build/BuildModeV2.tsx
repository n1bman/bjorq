import { lazy, Suspense, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cameraRef } from '../../lib/cameraRef';
import BuildTopToolbar from './BuildTopToolbar';
import BuildInspector from './BuildInspector';
import BuildCanvas2D from './BuildCanvas2D';
import BuildScene3D from './BuildScene3D';
import type { BuildTool, BuildTab } from '../../store/types';
import { openingPresets } from '../../lib/openingPresets';
import { getAllMaterials } from '../../lib/materials';
import { loadCuratedCatalog, clearCatalogCache } from '../../lib/catalogLoader';
import { processModel, validateFormat, formatStats, ratePerformance } from '../../lib/assetPipeline';
import {
  isHostedSync, uploadPropAsset, ingestToCatalog,
  updateCatalogMeta, replaceCatalogThumbnail, deleteCatalogAsset,
} from '../../lib/apiClient';
import {
  MousePointer2, Minus, Square, DoorOpen, PanelTop,
  Warehouse, Footprints, Paintbrush, Sofa, Cpu,
  Import, Eraser, Upload, Search, FileImage, Box, Ruler, Trash2,
  Lightbulb, ToggleLeft, Activity, Thermometer, Camera, Bot, CookingPot, WashingMachine, Lock, Plug, Refrigerator, Monitor, ChevronDown, ChevronRight, Link2, Fan, ShieldAlert, Droplets, Flame, Bell, Grip, Wifi, Trees, Speaker, Music,
  Zap, Archive, User, Settings, Lamp, Flower2, Bed, UtensilsCrossed, Bath, TreePine, Package, AlertTriangle, CheckCircle, Loader2, FolderPlus,
} from 'lucide-react';
import { domainToKind } from '../../lib/haDomainMapping';
import VacuumMappingTools from './devices/VacuumMappingTools';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import type { CatalogAssetMeta, PropCatalogItem, AssetCategory, AssetHAMapping, DeviceKind } from '../../store/types';
import type { PipelineResult } from '../../lib/assetPipeline';

const ImportPreview3D = lazy(() => import('./ImportPreview3D'));
const ImportTools = lazy(() => import('./import/ImportTools'));

const generateId = () => Math.random().toString(36).slice(2, 10);

/* ═══════════════════════════════════════════════
   BuildCatalogRow — inlined to avoid Vite cache issues
   ═══════════════════════════════════════════════ */

function OpeningCatalog({ type }: { type: 'door' | 'window' | 'garage-door' | 'passage' }) {
  const presets = openingPresets.filter((p) => p.type === type);
  return (
    <>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => {
            useAppStore.setState({ _selectedOpeningPreset: preset.id } as any);
            toast.info(`Valt: ${preset.label}. Klicka på en vägg för att placera.`);
          }}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs text-foreground transition-colors"
        >
          <span className="font-medium">{preset.label}</span>
          <span className="text-muted-foreground text-[10px]">{preset.width}×{preset.height}m</span>
        </button>
      ))}
    </>
  );
}

function PaintCatalog() {
  const materials = getAllMaterials();
  const selection = useAppStore((s) => s.build.selection);
  const updateWall = useAppStore((s) => s.updateWall);
  const setRoomMaterial = useAppStore((s) => s.setRoomMaterial);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  return (
    <>
      {materials.map((mat) => (
        <button
          key={mat.id}
          onClick={() => {
            if (!activeFloorId) return;
            if (selection.type === 'wall' && selection.id) {
              updateWall(activeFloorId, selection.id, { interiorMaterialId: mat.id });
              toast.success(`Material: ${mat.name}`);
            } else if (selection.type === 'room' && selection.id) {
              setRoomMaterial(activeFloorId, selection.id, 'floor', mat.id);
              toast.success(`Golvmaterial: ${mat.name}`);
            } else {
              toast.info('Välj en vägg eller ett rum först');
            }
          }}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
        >
          <div className="w-8 h-8 rounded" style={{ backgroundColor: mat.color }} />
          <span className="text-[10px] text-foreground">{mat.name}</span>
        </button>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════
   AssetCatalog — inlined to avoid Vite resolve issues
   ═══════════════════════════════════════════════ */

const AC_CATEGORY_LABELS: Record<string, string> = {
  sofas: 'Soffor', chairs: 'Stolar', tables: 'Bord', beds: 'Sängar',
  storage: 'Förvaring', lighting: 'Belysning', decor: 'Dekoration',
  plants: 'Växter', kitchen: 'Kök', bathroom: 'Badrum',
  devices: 'Enheter', outdoor: 'Utomhus', imported: 'Importerade',
};

const AC_CATEGORY_ICONS: Record<string, React.ElementType> = {
  sofas: Sofa, chairs: Sofa, tables: Box, beds: Bed,
  storage: Package, lighting: Lamp, decor: Box, plants: Flower2,
  kitchen: UtensilsCrossed, bathroom: Bath, outdoor: TreePine,
  devices: Monitor, imported: Box,
};


type ACSourceFilter = 'all' | 'curated' | 'user';

interface ACEntry {
  id: string; name: string; thumbnail?: string; category: string;
  source: 'curated' | 'user' | 'builtin'; modelPath?: string;
  catalogItem?: PropCatalogItem; curatedMeta?: CatalogAssetMeta;
  dimensions?: { width: number; depth: number; height: number };
  performance?: { vertices?: number; triangles?: number; textureBytes?: number };
  subcategory?: string;
}

function AssetCatalog() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const catalog = useAppStore((s) => s.props.catalog);
  const propItems = useAppStore((s) => s.props.items);
  const addToCatalog = useAppStore((s) => s.addToCatalog);
  const addProp = useAppStore((s) => s.addProp);
  const removeProp = useAppStore((s) => s.removeProp);
  const removeFromCatalog = useAppStore((s) => s.removeFromCatalog);
  const setSelection = useAppStore((s) => s.setSelection);

  // Count instances per catalogId on this floor
  const floorProps = useMemo(() => propItems.filter((p: any) => p.floorId === activeFloorId), [propItems, activeFloorId]);
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of floorProps) { counts[p.catalogId] = (counts[p.catalogId] || 0) + 1; }
    return counts;
  }, [floorProps]);

  const [curatedAssets, setCuratedAssets] = useState<CatalogAssetMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<ACSourceFilter>('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<PipelineResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importName, setImportName] = useState('');
  const [importCategory, setImportCategory] = useState<AssetCategory>('imported');
  const [importSubcategory, setImportSubcategory] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [manageAsset, setManageAsset] = useState<ACEntry | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [manageName, setManageName] = useState('');
  const [manageCategory, setManageCategory] = useState<AssetCategory>('imported');
  const [manageSubcategory, setManageSubcategory] = useState('');
  const [managePlacement, setManagePlacement] = useState('floor');

  useEffect(() => { loadCuratedCatalog().then(setCuratedAssets); }, []);

  const allEntries: ACEntry[] = [
    ...curatedAssets.map((c): ACEntry => ({
      id: c.id, name: c.name, thumbnail: c.thumbnail ? `/catalog/${c.thumbnail}` : undefined,
      category: c.category, source: 'curated', modelPath: `/catalog/${c.model}`, curatedMeta: c,
      dimensions: c.dimensions, performance: c.performance, subcategory: c.subcategory,
    })),
    ...catalog.map((c): ACEntry => ({
      id: c.id, name: c.name, thumbnail: c.thumbnail, category: c.category || 'imported',
      source: c.source as any, catalogItem: c,
      dimensions: c.dimensions, performance: c.performance as any, subcategory: c.subcategory,
    })),
  ];

  const categories = [...new Set(allEntries.map((e) => e.category))].sort();
  const hasUser = allEntries.some((e) => e.source === 'user');
  const hasCurated = allEntries.some((e) => e.source === 'curated');
  const filtered = allEntries
    .filter((e) => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((e) => !filterCategory || e.category === filterCategory)
    .filter((e) => sourceFilter === 'all' || e.source === sourceFilter)
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const err = validateFormat(file); if (err) { toast.error(err); return; }
    setImportFile(file); setImportName(file.name.replace(/\.(glb|gltf)$/i, ''));
    setImportCategory('imported'); setImportSubcategory('');
    setIsProcessing(true); setImportDialogOpen(true);
    try {
      const result = await processModel(file); setImportResult(result);
      result.warnings.forEach((w) => toast.warning(w));
      if (!result.thumbnail) toast.warning('Thumbnail kunde inte genereras');
    } catch { toast.error('Kunde inte analysera modellen'); setImportDialogOpen(false); }
    finally { setIsProcessing(false); }
  }, []);

  const placePropFn = useCallback((catalogId: string, url: string) => {
    if (!activeFloorId) return;
    // Smart placement: use camera target as placement point instead of origin
    const tx = Math.round(cameraRef.target.x * 10) / 10;
    const tz = Math.round(cameraRef.target.z * 10) / 10;
    // Offset slightly if there's already a prop at the same spot
    const existing = floorProps.filter((p: any) => p.catalogId === catalogId);
    const offset = existing.length * 0.5;
    addProp({ id: generateId(), catalogId, floorId: activeFloorId, url, position: [tx + offset, 0, tz + offset], rotation: [0,0,0], scale: [1,1,1] });
  }, [activeFloorId, addProp, floorProps]);

  const handleImportConfirm = useCallback(async () => {
    if (!importFile || !importResult || !activeFloorId || !importName.trim()) return;
    const catalogId = (() => { const b = generateId(); return (catalog.find(c => c.id === b) || curatedAssets.find(c => c.id === b)) ? b + generateId().slice(0,4) : b; })();

    if (saveToCatalog && isHostedSync()) {
      try {
        await ingestToCatalog(importFile, { name: importName.trim(), category: importCategory, subcategory: importSubcategory || undefined, placement: 'floor', dimensions: importResult.dimensions, performance: importResult.stats }, importResult.thumbnail || undefined);
        clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Sparad i katalogen');
      } catch (err: any) {
        if (err?.status === 409) { if (window.confirm('Asset finns redan. Ersätt?')) { try { await ingestToCatalog(importFile, { name: importName.trim(), category: importCategory, placement: 'floor', dimensions: importResult.dimensions, performance: importResult.stats }, importResult.thumbnail || undefined, true); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); } catch {} } }
        else toast.error('Kunde inte spara till katalogen');
      }
    }

    if (isHostedSync()) {
      try {
        const result = await uploadPropAsset('home', importFile, { name: importName.trim(), category: importCategory, subcategory: importSubcategory || undefined, placement: 'floor', dimensions: importResult.dimensions, performance: importResult.stats }, importResult.thumbnail || undefined);
        if (result) {
          const item: PropCatalogItem = { id: result.assetId || catalogId, name: importName.trim(), url: result.modelUrl, source: 'user', thumbnail: result.thumbnailUrl || importResult.thumbnail || undefined, category: importCategory, subcategory: importSubcategory || undefined, dimensions: importResult.dimensions, placement: 'floor', performance: importResult.stats };
          addToCatalog(item as any); placePropFn(item.id, result.modelUrl); setImportDialogOpen(false); setImportResult(null); setImportFile(null); return;
        }
      } catch (err) { console.warn('[AssetCatalog] Server upload failed:', err); }
    }

    const url = URL.createObjectURL(importFile);
    const item: PropCatalogItem = { id: catalogId, name: importName.trim(), url, source: 'user', thumbnail: importResult.thumbnail || undefined, category: importCategory, subcategory: importSubcategory || undefined, dimensions: importResult.dimensions, placement: 'floor', performance: importResult.stats };
    if (importFile.size <= 4*1024*1024) { const r = new FileReader(); r.onload = () => { addToCatalog({ ...item, fileData: (r.result as string).split(',')[1] } as any); placePropFn(catalogId, url); }; r.readAsDataURL(importFile); }
    else { addToCatalog(item as any); placePropFn(catalogId, url); toast.info('Stor modell — sparas bara under denna session'); }
    setImportDialogOpen(false); setImportResult(null); setImportFile(null);
  }, [importFile, importResult, activeFloorId, importName, importCategory, importSubcategory, addToCatalog, saveToCatalog, catalog, curatedAssets, placePropFn]);

  const handlePlaceEntry = useCallback((entry: ACEntry) => {
    if (!activeFloorId) return;
    if (entry.source === 'curated' && entry.modelPath) {
      if (!catalog.find(c => c.id === entry.id)) addToCatalog({ id: entry.id, name: entry.name, url: entry.modelPath, source: 'curated', thumbnail: entry.thumbnail, category: entry.category, placement: entry.curatedMeta?.placement, dimensions: entry.curatedMeta?.dimensions, haMapping: entry.curatedMeta?.ha, performance: entry.curatedMeta?.performance } as any);
      placePropFn(entry.id, entry.modelPath);
    } else if (entry.catalogItem) { placePropFn(entry.catalogItem.id, entry.catalogItem.url); }
  }, [activeFloorId, catalog, addToCatalog, placePropFn]);

  const openManageDialog = useCallback((entry: ACEntry) => { setManageAsset(entry); setManageName(entry.name); setManageCategory((entry.category as AssetCategory) || 'imported'); setManageSubcategory(entry.subcategory || ''); setManagePlacement(entry.curatedMeta?.placement || 'floor'); setManageDialogOpen(true); }, []);
  const handleSaveMeta = useCallback(async () => { if (!manageAsset) return; try { await updateCatalogMeta(manageAsset.id, { name: manageName.trim() || manageAsset.name, category: manageCategory, subcategory: manageSubcategory || undefined, placement: managePlacement }); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Metadata uppdaterad'); setManageDialogOpen(false); } catch { toast.error('Kunde inte uppdatera'); } }, [manageAsset, manageName, manageCategory, manageSubcategory, managePlacement]);
  const handleReplaceThumbnail = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f || !manageAsset) return; try { await replaceCatalogThumbnail(manageAsset.id, f); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Thumbnail ersatt'); } catch { toast.error('Kunde inte ersätta thumbnail'); } }, [manageAsset]);
  const handleDeleteCurated = useCallback(async () => { if (!manageAsset) return; if (!window.confirm(`Ta bort "${manageAsset.name}"?`)) return; try { await deleteCatalogAsset(manageAsset.id); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Borttagen'); setManageDialogOpen(false); } catch { toast.error('Kunde inte ta bort'); } }, [manageAsset]);

  const rating = importResult ? ratePerformance(importResult.stats) : null;
  const getPerfColor = (perf?: ACEntry['performance']) => { if (!perf) return null; const t = perf.triangles ?? 0; if (t <= 10000) return 'bg-primary'; if (t <= 50000) return 'bg-yellow-500'; return 'bg-destructive'; };

  return (
    <div className="space-y-3 px-1">
      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sök modell..." className="h-7 text-xs pl-7" />
      </div>

      {(hasUser && hasCurated) && (
        <div className="flex gap-1">
          {(['all', 'curated', 'user'] as ACSourceFilter[]).map((sf) => (
            <Button key={sf} size="sm" variant={sourceFilter === sf ? 'default' : 'outline'} className="h-5 text-[9px] px-2 shrink-0" onClick={() => setSourceFilter(sf)}>
              {sf === 'all' ? 'Alla' : sf === 'curated' ? 'Katalog' : 'Mina'}
            </Button>
          ))}
        </div>
      )}

      {categories.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <Button size="sm" variant={!filterCategory ? 'default' : 'outline'} className="h-5 text-[9px] px-2 shrink-0" onClick={() => setFilterCategory(null)}>Alla</Button>
          {categories.map((c) => (
            <Button key={c} size="sm" variant={filterCategory === c ? 'default' : 'outline'} className="h-5 text-[9px] px-2 shrink-0" onClick={() => setFilterCategory(c)}>
              {AC_CATEGORY_LABELS[c] || c}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto">
        {filtered.map((entry) => (
          <button key={entry.id} onClick={() => handlePlaceEntry(entry)} className="relative flex flex-col items-center gap-0.5 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors text-xs group min-h-[44px]">
            {instanceCounts[entry.id] > 0 && <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center z-20">×{instanceCounts[entry.id]}</div>}
            
            <div className="absolute top-1 right-1 p-0.5 rounded text-muted-foreground/50 z-10">{entry.source === 'curated' ? <Archive size={8} /> : <User size={8} />}</div>
            {entry.thumbnail ? (
              <img src={entry.thumbnail} alt={entry.name} className="w-full h-16 object-contain rounded" loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; const p = e.currentTarget.nextElementSibling; if (p) (p as HTMLElement).style.display = 'flex'; }} />
            ) : null}
            <div className="w-full h-16 bg-muted/30 rounded items-center justify-center text-muted-foreground" style={{ display: entry.thumbnail ? 'none' : 'flex' }}>
              {(() => { const I = AC_CATEGORY_ICONS[entry.category] || Box; return <I size={20} strokeWidth={1.5} />; })()}
            </div>
            <span className="text-[10px] text-foreground truncate w-full text-center">{entry.name}</span>
            <div className="flex items-center gap-1 w-full justify-center">
              {entry.dimensions && <span className="text-[8px] text-muted-foreground">{entry.dimensions.width}×{entry.dimensions.depth}×{entry.dimensions.height}m</span>}
              {getPerfColor(entry.performance) && <span className={`inline-block w-1.5 h-1.5 rounded-full ${getPerfColor(entry.performance)}`} />}
              {entry.subcategory && entry.subcategory !== entry.category && <span className="text-[8px] text-muted-foreground/60">{entry.subcategory}</span>}
            </div>
            {entry.source === 'user' && <button onClick={(e) => { e.stopPropagation(); removeFromCatalog(entry.id); }} className="absolute bottom-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity"><Trash2 size={10} /></button>}
            {entry.source === 'curated' && isHostedSync() && <button onClick={(e) => { e.stopPropagation(); openManageDialog(entry); }} className="absolute bottom-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"><Settings size={10} /></button>}
          </button>
        ))}
        <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all min-h-[80px]">
          <Upload size={16} /><span className="text-[10px]">Importera</span>
        </button>
      </div>

      {/* Placed items on this floor */}
      {floorProps.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Placerade ({floorProps.length})</h4>
          <div className="space-y-0.5 max-h-[30vh] overflow-y-auto">
            {floorProps.map((p: any) => {
              const catItem = catalog.find((c: any) => c.id === p.catalogId);
              return (
                <div key={p.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-secondary/40 group text-[10px]">
                  <button onClick={() => setSelection({ type: 'prop', id: p.id })} className="flex-1 text-left text-foreground truncate hover:text-primary transition-colors">
                    {catItem?.name || p.catalogId}
                  </button>
                  <span className="text-muted-foreground/60 text-[8px]">
                    {p.position[0].toFixed(1)},{p.position[2].toFixed(1)}
                  </span>
                  <button onClick={() => removeProp(p.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity">
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleFileSelect} />
      <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceThumbnail} />

      {filtered.length === 0 && !searchQuery && catalog.length === 0 && curatedAssets.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center"><Sofa size={20} className="text-muted-foreground" /></div>
          <div><p className="text-xs font-medium text-foreground">Inga möbler i katalogen ännu</p><p className="text-[10px] text-muted-foreground mt-0.5">Importera 3D-modeller (GLB/GLTF) för att börja möblera.</p></div>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => fileRef.current?.click()}><Upload size={12} />Importera modell</Button>
        </div>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Importera modell</DialogTitle><DialogDescription className="sr-only">Importera en 3D-modell</DialogDescription></DialogHeader>
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-8"><Loader2 size={24} className="animate-spin text-primary" /><p className="text-xs text-muted-foreground">Analyserar modell...</p></div>
          ) : importResult ? (
            <div className="space-y-3">
              {importResult.thumbnail ? <div className="flex justify-center"><img src={importResult.thumbnail} alt="Preview" className="w-24 h-24 object-contain rounded bg-muted/20" /></div> : <div className="flex justify-center"><div className="w-24 h-24 bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-[10px]">Ingen förhandsgranskning</div></div>}
              <div className="flex items-center gap-2 text-[10px]">
                {rating === 'ok' && <CheckCircle size={12} className="text-primary" />}{rating === 'heavy' && <AlertTriangle size={12} className="text-accent-foreground" />}{rating === 'too-heavy' && <AlertTriangle size={12} className="text-destructive" />}
                <span className="text-muted-foreground">{formatStats(importResult.stats)}</span>
                {importResult.dimensions && <span className="text-muted-foreground">· {importResult.dimensions.width}×{importResult.dimensions.depth}×{importResult.dimensions.height}m</span>}
              </div>
              <div className="space-y-1"><Label className="text-[10px]">Namn</Label><Input value={importName} onChange={(e) => setImportName(e.target.value)} className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Kategori</Label><select value={importCategory} onChange={(e) => setImportCategory(e.target.value as AssetCategory)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">{Object.entries(AC_CATEGORY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-[10px]">Underkategori</Label><Input value={importSubcategory} onChange={(e) => setImportSubcategory(e.target.value)} placeholder="t.ex. soffbord..." className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">HA-mappning</Label><select value={importHAMapping} onChange={(e) => setImportHAMapping(e.target.value)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border"><option value="none">Ingen</option>{AC_HA_DOMAINS.map(o => <option key={o.domain} value={o.domain}>{o.label}</option>)}</select></div>
              {isHostedSync() && <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer"><input type="checkbox" checked={saveToCatalog} onChange={(e) => setSaveToCatalog(e.target.checked)} className="rounded border-border" /><FolderPlus size={12} />Spara i permanent katalog</label>}
              {importResult.warnings.length > 0 && <div className="space-y-1">{importResult.warnings.map((w,i) => <p key={i} className="text-[10px] text-accent-foreground flex items-center gap-1"><AlertTriangle size={10} /> {w}</p>)}</div>}
              {/* Optimization verdict */}
              <div className={cn("rounded-lg p-2 text-[10px] flex items-center gap-2", rating === 'ok' ? 'bg-primary/10 text-primary' : rating === 'heavy' ? 'bg-accent/50 text-accent-foreground' : 'bg-destructive/10 text-destructive')}>
                {rating === 'ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                <div>
                  <p className="font-medium">{rating === 'ok' ? 'Bra optimering' : rating === 'heavy' ? 'Tung modell' : 'Mycket tung'}</p>
                  <p className="opacity-70">{rating === 'ok' ? 'OK för Raspberry Pi och mobil' : rating === 'heavy' ? 'Kan vara trög på mobil/RPi' : 'Risk för låg FPS — överväg att förenkla'}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(false)}>Avbryt</Button>
            <Button size="sm" onClick={handleImportConfirm} disabled={isProcessing || !importName.trim() || !importResult}>Importera</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Hantera katalogresurs</DialogTitle><DialogDescription className="text-[10px]">Redigera metadata, byt thumbnail eller ta bort.</DialogDescription></DialogHeader>
          {manageAsset && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-[10px]">Namn</Label><Input value={manageName} onChange={(e) => setManageName(e.target.value)} className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Kategori</Label><select value={manageCategory} onChange={(e) => setManageCategory(e.target.value as AssetCategory)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">{Object.entries(AC_CATEGORY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-[10px]">Underkategori</Label><Input value={manageSubcategory} onChange={(e) => setManageSubcategory(e.target.value)} className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Placering</Label><select value={managePlacement} onChange={(e) => setManagePlacement(e.target.value)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border"><option value="floor">Golv</option><option value="wall">Vägg</option><option value="ceiling">Tak</option></select></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => thumbRef.current?.click()} className="text-[10px]">Byt thumbnail</Button><Button size="sm" variant="destructive" onClick={handleDeleteCurated} className="text-[10px]">Ta bort</Button></div>
            </div>
          )}
          <DialogFooter><Button size="sm" variant="outline" onClick={() => setManageDialogOpen(false)}>Avbryt</Button><Button size="sm" onClick={handleSaveMeta}>Spara</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportCatalog() {
  const floorplanRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const imported = useAppStore((s) => s.homeGeometry.imported);
  const setImportedModel = useAppStore((s) => s.setImportedModel);
  const setHomeGeometrySource = useAppStore((s) => s.setHomeGeometrySource);

  const handleFloorplan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('PDF stöds inte direkt. Konvertera till PNG eller JPG först.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const store = useAppStore.getState();
      const floorId = store.layout.activeFloorId;
      if (floorId && store.setReferenceDrawing) store.setReferenceDrawing(floorId, { url: dataUrl, opacity: 0.5, scale: 100, offsetX: 0, offsetY: 0, rotation: 0, locked: false });
      toast.success('Planritning importerad');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { isHostedSync } = await import('../../lib/apiClient');
    if (isHostedSync()) {
      try {
        const { uploadAsset } = await import('../../lib/apiClient');
        const result = await uploadAsset('home', 'building', file.name.replace(/\.\w+$/, ''), 'balanced', file);
        const serverUrl = `/projects/home/assets/building/${result.assetId}/files/balanced.glb`;
        setImportedModel({ url: serverUrl, fileData: undefined });
        setHomeGeometrySource('imported');
      } catch (err) {
        console.error('[Import] Server upload failed, falling back to blob:', err);
        const url = URL.createObjectURL(file);
        setImportedModel({ url });
        setHomeGeometrySource('imported');
      }
    } else {
      const url = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImportedModel({ url, fileData: base64 });
        setHomeGeometrySource('imported');
      };
      reader.onerror = () => {
        setImportedModel({ url });
        setHomeGeometrySource('imported');
      };
      reader.readAsDataURL(file);
    }
    toast.success('3D-modell importerad');
    e.target.value = '';
  };

  return (
    <>
      {/* Planritning — direct file picker */}
      <div>
        <button onClick={() => floorplanRef.current?.click()} className="flex flex-col items-center gap-1 px-4 py-2 rounded-md border border-border hover:bg-muted text-xs text-foreground transition-colors">
          <FileImage className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px]">Planritning</span>
        </button>
        <input ref={floorplanRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleFloorplan} />
      </div>

      {/* 3D-modell — opens dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogTrigger asChild>
          <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-md border border-border hover:bg-muted text-xs text-foreground transition-colors">
            <Box className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px]">3D-modell</span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importera 3D-modell</DialogTitle>
            <DialogDescription>Ladda upp en GLB/GLTF-fil av ditt hem.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <button
              onClick={() => modelRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-sm transition-all"
            >
              <Upload size={18} />
              <span>Välj GLB/GLTF</span>
            </button>
            <input ref={modelRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleModel} />

            {imported.url && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Box size={14} />
                <span className="truncate">{imported.url.split('/').pop()}</span>
              </div>
            )}

            {imported.modelStats && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Prestanda</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    imported.modelStats.rating === 'ok' ? 'bg-green-500/20 text-green-400' :
                    imported.modelStats.rating === 'heavy' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {imported.modelStats.rating === 'ok' ? '✓ OK' : imported.modelStats.rating === 'heavy' ? '⚠ Tung' : '✗ För tung'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
        </DialogContent>
      </Dialog>
    </>
  );
}

/* DevicePlacementTools — inlined to avoid Vite resolve issues */

interface DeviceToolDef {
  key: BuildTool;
  kind: string;
  label: string;
  icon: typeof Lightbulb;
  color: string;
  category: string;
}

const deviceToolDefs: DeviceToolDef[] = [
  { key: 'place-light', kind: 'light', label: 'Ljus', icon: Lightbulb, color: 'text-yellow-400', category: 'Ljus' },
  { key: 'place-switch', kind: 'switch', label: 'Knapp', icon: ToggleLeft, color: 'text-blue-400', category: 'Ljus' },
  { key: 'place-power-outlet', kind: 'power-outlet', label: 'Eluttag', icon: Plug, color: 'text-yellow-300', category: 'Ljus' },
  { key: 'place-climate', kind: 'climate', label: 'Klimat', icon: Thermometer, color: 'text-cyan-400', category: 'Klimat' },
  { key: 'place-fan', kind: 'fan', label: 'Fläkt', icon: Fan, color: 'text-cyan-400', category: 'Klimat' },
  { key: 'place-water-heater', kind: 'water-heater', label: 'Varmvatten', icon: Flame, color: 'text-orange-500', category: 'Klimat' },
  { key: 'place-humidifier', kind: 'humidifier', label: 'Luftfuktare', icon: Droplets, color: 'text-teal-400', category: 'Klimat' },
  { key: 'place-sensor', kind: 'sensor', label: 'Sensor', icon: Activity, color: 'text-green-400', category: 'Sensorer' },
  { key: 'place-camera', kind: 'camera', label: 'Kamera', icon: Camera, color: 'text-red-400', category: 'Kameror' },
  { key: 'place-media-screen', kind: 'media_screen', label: 'Skärm', icon: Monitor, color: 'text-indigo-400', category: 'Media' },
  { key: 'place-speaker', kind: 'speaker', label: 'Högtalare', icon: Speaker, color: 'text-emerald-400', category: 'Media' },
  { key: 'place-soundbar', kind: 'soundbar', label: 'Soundbar', icon: Music, color: 'text-pink-400', category: 'Media' },
  { key: 'place-remote', kind: 'remote', label: 'Fjärr', icon: Wifi, color: 'text-gray-400', category: 'Media' },
  { key: 'place-door-lock', kind: 'door-lock', label: 'Dörrlås', icon: Lock, color: 'text-amber-400', category: 'Säkerhet' },
  { key: 'place-alarm', kind: 'alarm', label: 'Larm', icon: ShieldAlert, color: 'text-red-500', category: 'Säkerhet' },
  { key: 'place-siren', kind: 'siren', label: 'Siren', icon: Bell, color: 'text-red-400', category: 'Säkerhet' },
  { key: 'place-cover', kind: 'cover', label: 'Persienn/Port', icon: PanelTop, color: 'text-stone-400', category: 'Hem' },
  { key: 'place-garage-door', kind: 'garage-door', label: 'Garageport', icon: DoorOpen, color: 'text-amber-500', category: 'Hem' },
  { key: 'place-valve', kind: 'valve', label: 'Ventil', icon: Grip, color: 'text-blue-500', category: 'Hem' },
  { key: 'place-vacuum', kind: 'vacuum', label: 'Dammsugare', icon: Bot, color: 'text-purple-400', category: 'Robot' },
  { key: 'place-lawn-mower', kind: 'lawn-mower', label: 'Gräsklippare', icon: Trees, color: 'text-green-500', category: 'Robot' },
  { key: 'place-fridge', kind: 'fridge', label: 'Kylskåp', icon: Refrigerator, color: 'text-slate-300', category: 'Vitvaror' },
  { key: 'place-oven', kind: 'oven', label: 'Ugn', icon: CookingPot, color: 'text-orange-400', category: 'Vitvaror' },
  { key: 'place-washer', kind: 'washer', label: 'Tvättmaskin', icon: WashingMachine, color: 'text-sky-300', category: 'Vitvaror' },
];

const deviceCategoryOrder = ['Ljus', 'Klimat', 'Sensorer', 'Kameror', 'Media', 'Säkerhet', 'Hem', 'Robot', 'Vitvaror'];

const kindLabelsMap: Record<string, string> = {
  light: '💡 Ljus', switch: '🔌 Knapp', sensor: '🌡️ Sensor', climate: '❄️ Klimat',
  vacuum: '🤖 Dammsugare', camera: '📷 Kamera', fridge: '🧊 Kylskåp', oven: '🍳 Ugn',
  washer: '🫧 Tvättmaskin', 'garage-door': '🚗 Garageport', 'door-lock': '🔒 Dörrlås',
  'power-outlet': '🔌 Eluttag', media_screen: '📺 Skärm', fan: '🌀 Fläkt',
  cover: '🪟 Persienn', scene: '🎬 Scen', alarm: '🚨 Larm', 'water-heater': '🔥 Varmvatten',
  humidifier: '💧 Luftfuktare', siren: '🔔 Siren', valve: '🔧 Ventil',
  remote: '📡 Fjärr', 'lawn-mower': '🌿 Gräsklippare', speaker: '🔊 Högtalare', soundbar: '🎵 Soundbar',
};

function InlinedDevicePlacementTools() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const markers = useAppStore((s) => s.devices.markers);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const removeDevice = useAppStore((s) => s.removeDevice);
  const setSelection = useAppStore((s) => s.setSelection);
  const selectedId = useAppStore((s) => s.build.selection.type === 'device' ? s.build.selection.id : null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Ljus']));

  const floorMarkers = markers.filter((m) => m.floorId === activeFloorId);

  const grouped = useMemo(() => {
    const map = new Map<string, DeviceToolDef[]>();
    for (const cat of deviceCategoryOrder) {
      const tools = deviceToolDefs.filter((t) => t.category === cat);
      if (tools.length > 0) map.set(cat, tools);
    }
    return map;
  }, []);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
        Placera enhet
      </h3>

      <div className="flex flex-col gap-0.5">
        {Array.from(grouped.entries()).map(([category, tools]) => {
          const isOpen = openCategories.has(category);
          const hasActive = tools.some((t) => t.key === activeTool);
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className={cn(
                  'flex items-center gap-1.5 w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  hasActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span>{category}</span>
                <span className="ml-auto text-[9px] text-muted-foreground/60">{tools.length}</span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-0.5 mb-1">
                  {tools.map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setBuildTool(key)}
                      title={label}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg text-xs font-medium transition-all min-h-[36px]',
                        activeTool === key
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                      )}
                    >
                      <Icon size={16} className={activeTool === key ? color : ''} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {floorMarkers.length > 0 && (
        <div className="border-t border-border mt-2 pt-2 px-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Placerade ({floorMarkers.length})
          </p>
          <div className="flex flex-col gap-0.5 max-h-[30vh] overflow-y-auto">
            {floorMarkers.map((m) => (
              <div key={m.id} onClick={() => setSelection({ type: 'device', id: m.id })} className={cn(
                "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer",
                selectedId === m.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary/20"
              )}>
                <span className="truncate">{m.name || kindLabelsMap[m.kind] || m.kind}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDevice(m.id); }}
                  className="text-destructive/60 hover:text-destructive p-0.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <VacuumMappingTools />
      <InlinedUnlinkedHAEntities />
    </div>
  );
}

function InlinedUnlinkedHAEntities() {
  const [expanded, setExpanded] = useState(false);
  const status = useAppStore((s) => s.homeAssistant.status);
  const entities = useAppStore((s) => s.homeAssistant.entities);
  const markers = useAppStore((s) => s.devices.markers);
  const addDevice = useAppStore((s) => s.addDevice);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const setBuildTool = useAppStore((s) => s.setBuildTool);

  const linkedEntityIds = useMemo(
    () => new Set(markers.filter((m) => m.ha?.entityId).map((m) => m.ha!.entityId)),
    [markers]
  );

  const unlinked = useMemo(
    () => entities.filter((e) => !linkedEntityIds.has(e.entityId)),
    [entities, linkedEntityIds]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof unlinked>();
    for (const e of unlinked) {
      const list = map.get(e.domain) || [];
      list.push(e);
      map.set(e.domain, list);
    }
    return map;
  }, [unlinked]);

  if (status !== 'connected' || entities.length === 0) return null;

  const handlePlace = (entity: typeof entities[0]) => {
    const kind = domainToKind(entity.domain);
    if (!kind || !activeFloorId) return;
    const marker = {
      id: generateId(),
      kind,
      name: entity.friendlyName,
      floorId: activeFloorId,
      surface: 'floor' as const,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      ha: { entityId: entity.entityId },
    };
    addDevice(marker);
    setBuildTool('select');
  };

  return (
    <div className="border-t border-border mt-2 pt-2 px-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Link2 size={10} />
        <span>HA-entiteter</span>
        <span className="ml-auto text-[9px]">
          {linkedEntityIds.size}/{entities.length}
        </span>
      </button>

      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1 max-h-[35vh] overflow-y-auto">
          {unlinked.length === 0 ? (
            <p className="text-[9px] text-muted-foreground py-2 text-center">Alla entiteter är kopplade ✓</p>
          ) : (
            Array.from(grouped.entries()).map(([domain, items]) => (
              <div key={domain}>
                <p className="text-[9px] font-semibold text-muted-foreground mt-1 mb-0.5">{domain}</p>
                {items.map((entity) => {
                  const kind = domainToKind(entity.domain);
                  return (
                    <button
                      key={entity.entityId}
                      onClick={() => handlePlace(entity)}
                      disabled={!kind}
                      title={kind ? `Placera som ${kind}` : 'Kan ej mappas'}
                      className={cn(
                        'w-full flex items-start gap-1.5 px-1.5 py-1 rounded text-[10px] text-left transition-colors',
                        kind
                          ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 cursor-pointer'
                          : 'text-muted-foreground/40 cursor-not-allowed'
                      )}
                    >
                      <span className="truncate flex-1">{entity.friendlyName}</span>
                      <span className="text-[8px] text-muted-foreground/60 shrink-0">{entity.state}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BuildCatalogRow() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const showCatalog = activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage' || activeTool === ('import' as any);
  if (!showCatalog) return null;
  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-2 py-1.5 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {(activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage') && <OpeningCatalog type={activeTool as any} />}
        {activeTool === ('import' as any) && <ImportCatalog />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BuildBottomDock — inlined to avoid Vite cache issues
   ═══════════════════════════════════════════════ */

interface DockItem {
  tool: BuildTool;
  tab: BuildTab;
  label: string;
  icon: typeof MousePointer2;
  hasCatalog?: boolean;
}

const dockItems: DockItem[] = [
  { tool: 'select', tab: 'structure', label: 'Välj', icon: MousePointer2 },
  { tool: 'wall', tab: 'structure', label: 'Vägg', icon: Minus },
  { tool: 'room', tab: 'structure', label: 'Rum', icon: Square },
  { tool: 'door', tab: 'structure', label: 'Dörr', icon: DoorOpen, hasCatalog: true },
  { tool: 'passage', tab: 'structure', label: 'Passage', icon: DoorOpen, hasCatalog: true },
  { tool: 'window', tab: 'structure', label: 'Fönster', icon: PanelTop, hasCatalog: true },
  { tool: 'garage-door', tab: 'structure', label: 'Garage', icon: Warehouse, hasCatalog: true },
  { tool: 'stairs', tab: 'structure', label: 'Trappa', icon: Footprints },
  { tool: 'measure', tab: 'structure', label: 'Mät', icon: Ruler },
  { tool: 'furnish' as BuildTool, tab: 'furnish', label: 'Möbler', icon: Sofa, hasCatalog: true },
  { tool: 'place-light', tab: 'devices', label: 'Enheter', icon: Cpu, hasCatalog: true },
  { tool: 'import' as BuildTool, tab: 'import', label: 'Import', icon: Import, hasCatalog: true },
  { tool: 'erase', tab: 'structure', label: 'Radera', icon: Eraser },
];

function BuildBottomDock() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const setBuildTab = useAppStore((s) => s.setBuildTab);
  const handleClick = (item: DockItem) => { setBuildTab(item.tab); setBuildTool(item.tool); };
  return (
    <div className="flex items-center justify-center gap-1 px-2 py-1.5 bg-background/95 backdrop-blur border-t border-border">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTool === item.tool || (item.tool === 'place-light' && activeTool.startsWith('place-')) || (item.tool === ('furnish' as BuildTool) && activeTool === ('furnish' as BuildTool)) || (item.tool === ('import' as BuildTool) && activeTool === ('import' as BuildTool));
        return (
          <button key={item.tool} onClick={() => handleClick(item)}
            className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-xs transition-colors min-w-[3rem]',
              isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main BuildModeV2 component
   ═══════════════════════════════════════════════ */

export default function BuildModeV2() {
  const cameraMode = useAppStore((s) => s.build.view.cameraMode);
  const isImported = useAppStore((s) => s.homeGeometry.source === 'imported');
  const hasImportedUrl = useAppStore((s) => !!s.homeGeometry.imported.url);
  const showImportOverlay = cameraMode === 'topdown' && isImported && hasImportedUrl;
  const activeTool = useAppStore((s) => s.build.activeTool);
  const activeTab = useAppStore((s) => s.build.tab);
  const showDevicePanel = activeTool.startsWith('place-') || activeTool === 'vacuum-zone' || activeTool === ('place-vacuum-dock' as any);
  const showImportPanel = activeTab === 'import' && isImported;
  const showFurnishPanel = activeTool === ('furnish' as any);

  return (
    <div className="w-full h-full relative flex flex-col">
      <BuildTopToolbar />
      <div className="flex-1 relative overflow-hidden">
        {/* Device side panel */}
        {showDevicePanel && (
          <div className="absolute left-0 top-0 bottom-0 w-[220px] bg-card/95 backdrop-blur-sm border-r border-border z-20 overflow-y-auto py-3">
            <InlinedDevicePlacementTools />
          </div>
        )}
        {/* Import tools side panel */}
        {showImportPanel && !showDevicePanel && !showFurnishPanel && (
          <div className="absolute left-0 top-0 bottom-0 w-[220px] bg-card/95 backdrop-blur-sm border-r border-border z-20 overflow-y-auto py-3">
            <Suspense fallback={null}>
              <ImportTools />
            </Suspense>
          </div>
        )}
        {/* Furnish side panel */}
        {showFurnishPanel && !showDevicePanel && (
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-card/95 backdrop-blur-sm border-r border-border z-20 overflow-y-auto py-3 px-2">
            <AssetCatalog />
          </div>
        )}
        {cameraMode === 'topdown' ? (
          <>
            {showImportOverlay && (
              <Suspense fallback={null}>
                <ImportPreview3D />
              </Suspense>
            )}
            <BuildCanvas2D overlayMode={showImportOverlay} />
          </>
        ) : (
          <BuildScene3D />
        )}
        <BuildInspector />
      </div>
      <BuildCatalogRow />
      <BuildBottomDock />
    </div>
  );
}
