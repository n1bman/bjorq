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
import { isWallMountable } from '../../lib/wallMountPlacement';
import { processModel, validateFormat, formatStats, ratePerformance, formatSize, getOptimizationLevel, optimizeModel } from '../../lib/assetPipeline';
import type { OptimizationResult, OptimizationLevel } from '../../lib/assetPipeline';
import { Progress } from '../ui/progress';
import {
  isHostedSync, uploadPropAsset, ingestToCatalog,
  updateCatalogMeta, replaceCatalogThumbnail, deleteCatalogAsset,
} from '../../lib/apiClient';
import {
  MousePointer2, Minus, Square, DoorOpen, PanelTop,
  Warehouse, Footprints, Paintbrush, Sofa, Cpu,
  Import, Eraser, Upload, Search, FileImage, Box, Ruler, Trash2,
  Lightbulb, ToggleLeft, Activity, Thermometer, Camera, Bot, CookingPot, WashingMachine, Lock, Plug, Refrigerator, Monitor, ChevronDown, ChevronRight, Link2, Fan, ShieldAlert, Droplets, Flame, Bell, Grip, Wifi, Trees, Speaker, Music,
  Archive, User, Settings, Lamp, Flower2, Bed, UtensilsCrossed, Bath, TreePine, Package, AlertTriangle, CheckCircle, Loader2, FolderPlus, Wand2, Download, LinkIcon, List, Grid3X3,
  MapPin,
} from 'lucide-react';
import { domainToKind } from '../../lib/haDomainMapping';
import VacuumMappingTools from './devices/VacuumMappingTools';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import type { CatalogAssetMeta, PropCatalogItem, AssetCategory } from '../../store/types';
import type { PipelineResult } from '../../lib/assetPipeline';

const ImportPreview3D = lazy(() => import('./ImportPreview3D'));
const ImportTools = lazy(() => import('./import/ImportTools'));
// BibliotekWorkspace is inlined below to avoid Vite/Rollup dynamic import issues

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
  const pushUndo = useAppStore((s) => s.pushUndo);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  return (
    <>
      {selection.type === 'wall' && selection.faceSide && (
        <div className="mb-2 px-2 py-1.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium text-center">
          {selection.faceSide === 'left' ? '◀ Vänster sida' : 'Höger sida ▶'}
        </div>
      )}
      {materials.map((mat) => (
        <button
          key={mat.id}
          onClick={() => {
            if (!activeFloorId) return;
            if (selection.type === 'wall' && selection.id) {
              pushUndo();
              // Apply to the clicked face side using B1 face system
              const side = selection.faceSide;
              if (side === 'left') {
                updateWall(activeFloorId, selection.id, { leftMaterialId: mat.id });
              } else if (side === 'right') {
                updateWall(activeFloorId, selection.id, { rightMaterialId: mat.id });
              } else {
                // Fallback: apply to both sides
                updateWall(activeFloorId, selection.id, { leftMaterialId: mat.id, rightMaterialId: mat.id });
              }
              toast.success(`Material: ${mat.name}`);
            } else if (selection.type === 'room' && selection.id) {
              pushUndo();
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
  devices: 'Enheter', outdoor: 'Utomhus',
  electronics: 'Elektronik', 'smart-devices': 'Smarta enheter',
  imported: 'Importerade',
};

const AC_CATEGORY_ICONS: Record<string, React.ElementType> = {
  sofas: Sofa, chairs: Sofa, tables: Box, beds: Bed,
  storage: Package, lighting: Lamp, decor: Box, plants: Flower2,
  kitchen: UtensilsCrossed, bathroom: Bath, outdoor: TreePine,
  devices: Monitor, electronics: Monitor, 'smart-devices': Cpu,
  imported: Box,
};


type ACSourceFilter = 'all' | 'curated' | 'user' | 'wizard';

interface ACEntry {
  id: string; name: string; thumbnail?: string; category: string;
  source: 'curated' | 'user' | 'builtin' | 'wizard'; modelPath?: string;
  catalogItem?: PropCatalogItem; curatedMeta?: CatalogAssetMeta;
  dimensions?: { width: number; depth: number; height: number };
  performance?: { vertices?: number; triangles?: number; textureBytes?: number };
  subcategory?: string;
  wizardMeta?: import('../../lib/wizardClient').WizardAsset;
  wizardMode?: 'synced' | 'imported';
  staleSync?: boolean; // true if wizardMode=synced (deprecated, needs re-import)
}

function AssetCatalog({ initialSourceFilter }: { initialSourceFilter?: ACSourceFilter }) {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const catalog = useAppStore((s) => s.props.catalog);
  const propItems = useAppStore((s) => s.props.items);
  const addToCatalog = useAppStore((s) => s.addToCatalog);
  const addProp = useAppStore((s) => s.addProp);
  const removeProp = useAppStore((s) => s.removeProp);
  const removeFromCatalog = useAppStore((s) => s.removeFromCatalog);
  const setSelection = useAppStore((s) => s.setSelection);

  const floorProps = useMemo(() => propItems.filter((p: any) => p.floorId === activeFloorId), [propItems, activeFloorId]);
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of floorProps) { counts[p.catalogId] = (counts[p.catalogId] || 0) + 1; }
    return counts;
  }, [floorProps]);

  const [curatedAssets, setCuratedAssets] = useState<CatalogAssetMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<ACSourceFilter>(initialSourceFilter ?? 'all');
  // Reset sourceFilter when initialSourceFilter prop changes
  useEffect(() => { setSourceFilter(initialSourceFilter ?? 'all'); }, [initialSourceFilter]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [placementFilter, setPlacementFilter] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<PipelineResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importName, setImportName] = useState('');
  const [importCategory, setImportCategory] = useState<AssetCategory>('imported');
  const [importSubcategory, setImportSubcategory] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStep, setOptimizationStep] = useState<'analyze' | 'optimizing' | 'optimized'>('analyze');
  const [manageAsset, setManageAsset] = useState<ACEntry | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [manageName, setManageName] = useState('');
  const [manageCategory, setManageCategory] = useState<AssetCategory>('imported');
  const [manageSubcategory, setManageSubcategory] = useState('');
  const [managePlacement, setManagePlacement] = useState('floor');

  // Wizard import state (import-only, no sync mode)
  const [wizardImportingId, setWizardImportingId] = useState<string | null>(null);
  const [wizardSourceMeta, setWizardSourceMeta] = useState<import('../../lib/wizardClient').WizardAsset | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  useEffect(() => { loadCuratedCatalog().then(setCuratedAssets); }, []);

  // Wizard assets
  const wizardStatus = useAppStore((s) => s.wizard.status);
  const [wizardAssets, setWizardAssets] = useState<import('../../lib/wizardClient').WizardAsset[]>([]);
  const fetchWizardAssets = useCallback(() => {
    if (wizardStatus !== 'connected') { setWizardAssets([]); setWizardError(null); return; }
    setWizardLoading(true); setWizardError(null);
    import('../../lib/wizardClient').then(({ fetchWizardCatalog }) => {
      fetchWizardCatalog(true).then((assets) => { setWizardAssets(assets); setWizardError(null); })
        .catch((err) => { console.error('[Wizard] Catalog fetch failed:', err); setWizardAssets([]); setWizardError(err?.message || 'Kunde inte hämta katalogen'); toast.error('Wizard-katalog kunde inte hämtas'); })
        .finally(() => setWizardLoading(false));
    });
  }, [wizardStatus]);
  useEffect(() => { fetchWizardAssets(); }, [fetchWizardAssets]);

  // Track which wizard asset IDs have been imported locally
  const importedWizardIds = useMemo(() => new Set(
    catalog.filter(c => c.wizardMode === 'imported' && c.wizardAssetId).map(c => c.wizardAssetId!)
  ), [catalog]);

  const allEntries: ACEntry[] = [
    ...curatedAssets.map((c): ACEntry => ({
      id: c.id, name: c.name, thumbnail: c.thumbnail ? `/catalog/${c.thumbnail}` : undefined,
      category: c.category, source: 'curated', modelPath: `/catalog/${c.model}`, curatedMeta: c,
      dimensions: c.dimensions, performance: c.performance, subcategory: c.subcategory,
    })),
    ...catalog.map((c): ACEntry => {
      // Stale synced entries get marked for re-import
      const isStaleSync = c.wizardMode === 'synced';
      return {
        id: c.id, name: c.name, thumbnail: c.thumbnail, category: c.category || 'imported',
        source: isStaleSync ? 'wizard' as const : c.source as any, catalogItem: c,
        dimensions: c.dimensions, performance: c.performance as any, subcategory: c.subcategory,
        wizardMode: c.wizardMode,
        staleSync: isStaleSync,
      };
    }),
    // Only show wizard catalog entries that haven't been imported already
    ...wizardAssets.filter(w => !importedWizardIds.has(w.id)).map((w): ACEntry => {
      const bb = w.boundingBox;
      const dims = bb ? { width: +(bb.max[0] - bb.min[0]).toFixed(2), depth: +(bb.max[2] - bb.min[2]).toFixed(2), height: +(bb.max[1] - bb.min[1]).toFixed(2) } : undefined;
      let thumb: string | undefined;
      if (w.thumbnail) {
        const base = useAppStore.getState().wizard.url.replace(/\/+$/, '');
        thumb = w.thumbnail.startsWith('http') ? w.thumbnail : `${base}${w.thumbnail.startsWith('/') ? w.thumbnail : '/' + w.thumbnail}`;
      }
      // Always fall back to the direct thumbnail endpoint
      if (!thumb) {
        const base = useAppStore.getState().wizard.url.replace(/\/+$/, '');
        thumb = `${base}/assets/${encodeURIComponent(w.id)}/thumbnail`;
      }
      return {
        id: `wizard-${w.id}`, name: w.name, thumbnail: thumb,
        category: w.category || 'imported', source: 'wizard', subcategory: w.subcategory,
        dimensions: dims,
        performance: w.triangleCount ? { triangles: w.triangleCount } : undefined,
        wizardMeta: w,
      };
    }),
  ];

  const categories = [...new Set(allEntries.map((e) => e.category))].sort();
  const hasUser = allEntries.some((e) => e.source === 'user' || e.wizardMode === 'imported');
  const hasCurated = allEntries.some((e) => e.source === 'curated');
  const hasWizard = wizardStatus === 'connected' || wizardAssets.length > 0;
  const PLACEMENT_LABELS: Record<string, string> = { floor: 'Golv', wall: 'Vägg', ceiling: 'Tak', table: 'Yta' };
  const placementTypes = [...new Set(allEntries.map(e => e.catalogItem?.placement || e.curatedMeta?.placement).filter(Boolean))] as string[];

  const filtered = allEntries
    .filter((e) => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((e) => !filterCategory || e.category === filterCategory)
    .filter((e) => {
      if (placementFilter) {
        const p = e.catalogItem?.placement || e.curatedMeta?.placement;
        if (p !== placementFilter) return false;
      }
      if (sourceFilter === 'wizard') return e.source === 'wizard';
      // Hide non-imported wizard entries from all non-wizard views
      if (e.source === 'wizard' && !e.catalogItem) return false;
      if (sourceFilter === 'all') return true;
      if (sourceFilter === 'user') return (e.source === 'user') || e.wizardMode === 'imported';
      return e.source === sourceFilter;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const err = validateFormat(file); if (err) { toast.error(err); return; }
    setImportFile(file); setImportName(file.name.replace(/\.(glb|gltf)$/i, ''));
    setImportCategory('imported'); setImportSubcategory('');
    setOptimizedResult(null); setOptimizationStep('analyze');
    setIsProcessing(true); setImportDialogOpen(true);
    try {
      const result = await processModel(file); setImportResult(result);
      result.warnings.forEach((w) => toast.warning(w));
      if (!result.thumbnail) toast.warning('Thumbnail kunde inte genereras');
    } catch { toast.error('Kunde inte analysera modellen'); setImportDialogOpen(false); }
    finally { setIsProcessing(false); }
  }, []);

  const handleOptimize = useCallback(async () => {
    if (!importResult || !importFile) return;
    setIsOptimizing(true); setOptimizationStep('optimizing');
    try {
      const result = await optimizeModel(importFile, importResult.stats, { maxTextureRes: 1024 });
      setOptimizedResult(result);
      setOptimizationStep('optimized');
    } catch (err) {
      console.error('[Optimize] Failed:', err);
      toast.error('Optimering misslyckades — du kan fortfarande importera originalet, men det kan påverka prestanda.');
      setOptimizationStep('analyze');
    } finally {
      setIsOptimizing(false);
    }
  }, [importResult, importFile]);

  const setPendingWallMount = useAppStore((s) => s.setPendingWallMount);

  const placePropFn = useCallback((catalogId: string, url: string) => {
    if (!activeFloorId) return;

    const catItem = useAppStore.getState().props.catalog.find((c: any) => c.id === catalogId);
    const curatedMeta = curatedAssets?.find?.((c: any) => c.id === catalogId);
    const placement = catItem?.placement || curatedMeta?.placement;
    const category = catItem?.category || curatedMeta?.category;

    if (isWallMountable({ placement, category })) {
      setPendingWallMount({ catalogId, url });
      toast.info('Klicka på en vägg för att placera');
      return;
    }

    const tx = Math.round(cameraRef.target.x * 10) / 10;
    const tz = Math.round(cameraRef.target.z * 10) / 10;
    const existing = floorProps.filter((p: any) => p.catalogId === catalogId);
    const offset = existing.length * 0.5;
    addProp({ id: generateId(), catalogId, floorId: activeFloorId, url, position: [tx + offset, 0, tz + offset], rotation: [0,0,0], scale: [1,1,1] });
  }, [activeFloorId, addProp, floorProps, setPendingWallMount]);

  const handleImportConfirm = useCallback(async () => {
    if (!importFile || !importResult || !activeFloorId || !importName.trim()) return;

    const finalFile = optimizedResult
      ? new File([optimizedResult.blob], importName.trim().replace(/\s+/g, '_') + '.glb', { type: 'model/gltf-binary' })
      : importFile;
    const finalStats = optimizedResult ? optimizedResult.stats : importResult.stats;
    const finalThumbnail = optimizedResult ? optimizedResult.thumbnail : importResult.thumbnail;

    const wizId = wizardSourceMeta?.id;
    const catalogId = wizId ? `wizard-imp-${wizId}` : (() => { const b = generateId(); return (catalog.find(c => c.id === b) || curatedAssets.find(c => c.id === b)) ? b + generateId().slice(0,4) : b; })();
    const wizardExtras = wizardSourceMeta ? { wizardAssetId: wizardSourceMeta.id, wizardMode: 'imported' as const, wizardMeta: { boundingBox: wizardSourceMeta.boundingBox, center: wizardSourceMeta.center, estimatedScale: wizardSourceMeta.estimatedScale, triangleCount: wizardSourceMeta.triangleCount, fileSize: wizardSourceMeta.fileSize, category: wizardSourceMeta.category, subcategory: wizardSourceMeta.subcategory } } : {};

    if (saveToCatalog && isHostedSync()) {
      try {
        await ingestToCatalog(finalFile, { name: importName.trim(), category: importCategory, subcategory: importSubcategory || undefined, placement: 'floor', dimensions: importResult.dimensions, performance: finalStats }, finalThumbnail || undefined);
        clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Sparad i katalogen');
      } catch (err: any) {
        if (err?.status === 409) { if (window.confirm('Asset finns redan. Ersätt?')) { try { await ingestToCatalog(finalFile, { name: importName.trim(), category: importCategory, placement: 'floor', dimensions: importResult.dimensions, performance: finalStats }, finalThumbnail || undefined, true); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); } catch {} } }
        else toast.error('Kunde inte spara till katalogen');
      }
    }

    if (isHostedSync()) {
      try {
        const result = await uploadPropAsset('home', finalFile, { name: importName.trim(), category: importCategory, subcategory: importSubcategory || undefined, placement: 'floor', dimensions: importResult.dimensions, performance: finalStats }, finalThumbnail || undefined);
        if (result) {
          const item: PropCatalogItem = { id: result.assetId || catalogId, name: importName.trim(), url: result.modelUrl, source: 'user', thumbnail: result.thumbnailUrl || finalThumbnail || undefined, category: importCategory, subcategory: importSubcategory || undefined, dimensions: importResult.dimensions, placement: 'floor', performance: finalStats, ...wizardExtras };
          addToCatalog(item as any); placePropFn(item.id, result.modelUrl); setImportDialogOpen(false); setImportResult(null); setImportFile(null); setOptimizedResult(null); return;
        }
      } catch (err) { console.warn('[AssetCatalog] Server upload failed:', err); }
    }

    const url = URL.createObjectURL(finalFile);
    const item: PropCatalogItem = { id: catalogId, name: importName.trim(), url, source: 'user', thumbnail: finalThumbnail || undefined, category: importCategory, subcategory: importSubcategory || undefined, dimensions: importResult.dimensions, placement: 'floor', performance: finalStats, ...wizardExtras };
    if (finalFile.size <= 4*1024*1024) { const r = new FileReader(); r.onload = () => { addToCatalog({ ...item, fileData: (r.result as string).split(',')[1] } as any); placePropFn(catalogId, url); }; r.readAsDataURL(finalFile); }
    else { addToCatalog(item as any); placePropFn(catalogId, url); toast.info('Stor modell — sparas bara under denna session'); }
    setImportDialogOpen(false); setImportResult(null); setImportFile(null); setOptimizedResult(null); setWizardSourceMeta(null);
  }, [importFile, importResult, activeFloorId, importName, importCategory, importSubcategory, addToCatalog, saveToCatalog, catalog, curatedAssets, placePropFn, optimizedResult, wizardSourceMeta]);

  // Import a Wizard asset (download model + thumbnail, store locally)
  const handleWizardImport = useCallback(async (entry: ACEntry) => {
    if (!entry.wizardMeta || !activeFloorId) return;
    const wm = entry.wizardMeta;

    // Duplicate check: if already imported, just place another instance
    const existingCatalog = catalog.find(c => c.wizardAssetId === wm.id && c.wizardMode === 'imported');
    if (existingCatalog) {
      placePropFn(existingCatalog.id, existingCatalog.url);
      toast.success(`${entry.name} placerad`);
      return;
    }

    setWizardImportingId(wm.id);
    toast.info(`Importerar ${entry.name}...`);
    try {
      const { downloadWizardModel, downloadWizardThumbnail } = await import('../../lib/wizardClient');
      const [modelBlob, thumbBlob] = await Promise.all([
        downloadWizardModel(wm.id),
        downloadWizardThumbnail(wm.id),
      ]);
      const catalogId = `wizard-imp-${wm.id}`;
      let modelUrl: string;
      let thumbnailUrl: string | undefined = entry.thumbnail;

      // Convert thumbnail to base64 data URL for persistence
      if (thumbBlob) {
        try {
          const thumbReader = new FileReader();
          thumbnailUrl = await new Promise<string>((resolve) => {
            thumbReader.onload = () => resolve(thumbReader.result as string);
            thumbReader.onerror = () => resolve(entry.thumbnail || '');
            thumbReader.readAsDataURL(thumbBlob);
          });
        } catch { /* keep original URL */ }
      }

      if (isHostedSync()) {
        try {
          const modelFile = new File([modelBlob], `${wm.id}.glb`, { type: 'model/gltf-binary' });
          const result = await uploadPropAsset('home', modelFile, { name: entry.name, category: (entry.category as AssetCategory) || 'imported', placement: 'floor', dimensions: entry.dimensions }, thumbnailUrl);
          if (result) { modelUrl = result.modelUrl; thumbnailUrl = result.thumbnailUrl || thumbnailUrl; }
          else { modelUrl = URL.createObjectURL(modelBlob); }
        } catch { modelUrl = URL.createObjectURL(modelBlob); }
      } else {
        modelUrl = URL.createObjectURL(modelBlob);
      }

      const item: PropCatalogItem = {
        id: catalogId, name: entry.name, url: modelUrl, source: 'user',
        thumbnail: thumbnailUrl, category: (entry.category as AssetCategory) || 'imported',
        subcategory: entry.subcategory, placement: 'floor',
        dimensions: entry.dimensions, performance: entry.performance as any,
        wizardAssetId: wm.id, wizardMode: 'imported',
        wizardMeta: { boundingBox: wm.boundingBox, center: wm.center, estimatedScale: wm.estimatedScale, triangleCount: wm.triangleCount, fileSize: wm.fileSize, category: wm.category, subcategory: wm.subcategory },
      };

      // Store base64 if small enough for persistence
      if (modelBlob.size <= 4 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          addToCatalog({ ...item, fileData: (reader.result as string).split(',')[1] } as any);
          const scale = wm.estimatedScale || 1;
          const yOffset = -(wm.center?.y ?? 0) * scale;
          const tx = Math.round(cameraRef.target.x * 10) / 10;
          const tz = Math.round(cameraRef.target.z * 10) / 10;
          addProp({ id: generateId(), catalogId, floorId: activeFloorId, url: modelUrl, position: [tx, yOffset, tz], rotation: [0, 0, 0], scale: [scale, scale, scale] });
          toast.success(`${entry.name} importerad och placerad`);
        };
        reader.readAsDataURL(new Blob([modelBlob]));
      } else {
        addToCatalog(item as any);
        const scale = wm.estimatedScale || 1;
        const yOffset = -(wm.center?.y ?? 0) * scale;
        const tx = Math.round(cameraRef.target.x * 10) / 10;
        const tz = Math.round(cameraRef.target.z * 10) / 10;
        addProp({ id: generateId(), catalogId, floorId: activeFloorId, url: modelUrl, position: [tx, yOffset, tz], rotation: [0, 0, 0], scale: [scale, scale, scale] });
        toast.success(`${entry.name} importerad (stor modell — sessionsbaserad)`);
      }
    } catch (err) {
      console.error('[Wizard] Import failed:', err);
      toast.error('Kunde inte importera Wizard-modell');
    }
    setWizardImportingId(null);
  }, [activeFloorId, catalog, addToCatalog, addProp, placePropFn]);

  const handlePlaceEntry = useCallback(async (entry: ACEntry) => {
    if (!activeFloorId) return;

    // Stale synced entries → need re-import from Wizard
    if (entry.staleSync && entry.catalogItem?.wizardAssetId) {
      // Try to re-import if wizard is connected
      if (wizardStatus === 'connected') {
        const wm = entry.catalogItem.wizardMeta;
        if (wm) {
          // Remove stale catalog entry, re-import fresh
          removeFromCatalog(entry.id);
          const fakeEntry: ACEntry = {
            ...entry, source: 'wizard',
            wizardMeta: { id: entry.catalogItem.wizardAssetId, name: entry.name, category: wm.category || entry.category, boundingBox: wm.boundingBox, center: wm.center, estimatedScale: wm.estimatedScale, triangleCount: wm.triangleCount, fileSize: wm.fileSize, subcategory: wm.subcategory } as any,
          };
          await handleWizardImport(fakeEntry);
          return;
        }
      }
      toast.error('Wizard ej ansluten — kan inte ladda synkad modell. Anslut Wizard och försök igen.');
      return;
    }

    // Wizard assets from live catalog → open import dialog (like file import)
    if (entry.source === 'wizard' && entry.wizardMeta && !entry.catalogItem) {
      setWizardImportingId(entry.wizardMeta.id);
      setWizardSourceMeta(entry.wizardMeta);
      setIsProcessing(true);
      setImportDialogOpen(true);
      setImportName(entry.name);
      // Map wizard category to local category
      const wizCat = entry.wizardMeta.category?.toLowerCase() || '';
      const catMap: Record<string, AssetCategory> = {
        sofas: 'sofas', sofa: 'sofas', chairs: 'chairs', chair: 'chairs',
        tables: 'tables', table: 'tables', beds: 'beds', bed: 'beds',
        storage: 'storage', lighting: 'lighting', light: 'lighting',
        decor: 'decor', decoration: 'decor', plants: 'plants', plant: 'plants',
        kitchen: 'kitchen', bathroom: 'bathroom', outdoor: 'outdoor',
        electronics: 'electronics', electronic: 'electronics',
        'smart-devices': 'smart-devices', sensor: 'smart-devices', sensors: 'smart-devices',
        devices: 'devices', furniture: 'sofas',
      };
      setImportCategory(catMap[wizCat] || 'imported');
      setImportSubcategory(entry.wizardMeta.subcategory || '');
      setOptimizedResult(null);
      setOptimizationStep('analyze');
      try {
        const { downloadWizardModel } = await import('../../lib/wizardClient');
        const modelBlob = await downloadWizardModel(entry.wizardMeta.id);
        const modelFile = new File([modelBlob], `${entry.wizardMeta.id}.glb`, { type: 'model/gltf-binary' });
        setImportFile(modelFile);
        const result = await processModel(modelFile);
        setImportResult(result);
        result.warnings.forEach((w) => toast.warning(w));
      } catch (err) {
        console.error('[Wizard] Download/process failed:', err);
        toast.error('Kunde inte hämta Wizard-modell');
        setImportDialogOpen(false);
      } finally {
        setIsProcessing(false);
        setWizardImportingId(null);
      }
      return;
    }

    // Already imported wizard asset or regular user asset → just place
    if (entry.source === 'curated' && entry.modelPath) {
      if (!catalog.find(c => c.id === entry.id)) addToCatalog({ id: entry.id, name: entry.name, url: entry.modelPath, source: 'curated', thumbnail: entry.thumbnail, category: entry.category, placement: entry.curatedMeta?.placement, dimensions: entry.curatedMeta?.dimensions, haMapping: entry.curatedMeta?.ha, performance: entry.curatedMeta?.performance } as any);
      placePropFn(entry.id, entry.modelPath);
    } else if (entry.catalogItem) {
      placePropFn(entry.catalogItem.id, entry.catalogItem.url);
    }
  }, [activeFloorId, catalog, addToCatalog, placePropFn, handleWizardImport, removeFromCatalog, wizardStatus]);

  const openManageDialog = useCallback((entry: ACEntry) => { setManageAsset(entry); setManageName(entry.name); setManageCategory((entry.category as AssetCategory) || 'imported'); setManageSubcategory(entry.subcategory || ''); setManagePlacement(entry.curatedMeta?.placement || 'floor'); setManageDialogOpen(true); }, []);
  const handleSaveMeta = useCallback(async () => { if (!manageAsset) return; try { await updateCatalogMeta(manageAsset.id, { name: manageName.trim() || manageAsset.name, category: manageCategory, subcategory: manageSubcategory || undefined, placement: managePlacement }); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Metadata uppdaterad'); setManageDialogOpen(false); } catch { toast.error('Kunde inte uppdatera'); } }, [manageAsset, manageName, manageCategory, manageSubcategory, managePlacement]);
  const handleReplaceThumbnail = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f || !manageAsset) return; try { await replaceCatalogThumbnail(manageAsset.id, f); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Thumbnail ersatt'); } catch { toast.error('Kunde inte ersätta thumbnail'); } }, [manageAsset]);
  const handleDeleteCurated = useCallback(async () => { if (!manageAsset) return; if (!window.confirm(`Ta bort "${manageAsset.name}"?`)) return; try { await deleteCatalogAsset(manageAsset.id); clearCatalogCache(); loadCuratedCatalog().then(setCuratedAssets); toast.success('Borttagen'); setManageDialogOpen(false); } catch { toast.error('Kunde inte ta bort'); } }, [manageAsset]);

  // Delete handler for user/imported assets (including wizard-imported)
  const handleDeleteEntry = useCallback((entry: ACEntry) => {
    if (!window.confirm(`Ta bort "${entry.name}"?`)) return;
    // Remove all placed instances of this catalog item
    const instances = propItems.filter((p: any) => p.catalogId === entry.id);
    instances.forEach((p: any) => removeProp(p.id));
    removeFromCatalog(entry.id);
    toast.success(`${entry.name} borttagen`);
  }, [propItems, removeProp, removeFromCatalog]);

  const canDelete = (entry: ACEntry) => entry.source === 'user' || entry.wizardMode === 'imported' || entry.staleSync;

  const rating = importResult ? ratePerformance(importResult.stats) : null;
  const optLevel: OptimizationLevel | null = importResult ? getOptimizationLevel(importResult.stats) : null;
  const getPerfColor = (perf?: ACEntry['performance']) => { if (!perf) return null; const t = perf.triangles ?? 0; if (t <= 10000) return 'bg-primary'; if (t <= 50000) return 'bg-yellow-500'; return 'bg-destructive'; };

  return (
    <div className="space-y-3 px-1">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sök modell..." className="h-8 text-xs pl-8 bg-secondary/20 rounded-lg border-border/30" />
      </div>

      {sourceFilter !== 'wizard' && (hasUser || hasCurated || hasWizard) && (
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...(hasCurated ? ['curated'] : []), ...(hasUser ? ['user'] : []), ...(hasWizard ? ['wizard'] : [])] as ACSourceFilter[]).map((sf) => (
            <Button key={sf} size="sm" variant={sourceFilter === sf ? 'default' : 'ghost'} className={cn("h-7 text-[10px] px-2.5 rounded-lg shrink-0", sourceFilter !== sf && 'bg-muted/30')} onClick={() => setSourceFilter(sf)}>
              {sf === 'all' ? 'Alla' : sf === 'curated' ? 'Katalog' : sf === 'user' ? 'Mina' : '✨ Wizard'}
            </Button>
          ))}
        </div>
      )}

      {sourceFilter !== 'wizard' && categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 sticky top-0 z-10 bg-card/95 backdrop-blur-sm py-1">
          <Button size="sm" variant={!filterCategory ? 'default' : 'ghost'} className={cn("h-7 text-[10px] px-2.5 rounded-lg shrink-0", filterCategory !== null && 'bg-muted/30')} onClick={() => setFilterCategory(null)}>Alla</Button>
          {categories.map((c) => (
            <Button key={c} size="sm" variant={filterCategory === c ? 'default' : 'ghost'} className={cn("h-7 text-[10px] px-2.5 rounded-lg shrink-0", filterCategory !== c && 'bg-muted/30')} onClick={() => setFilterCategory(c)}>
              {AC_CATEGORY_LABELS[c] || c}
            </Button>
          ))}
        </div>
      )}

      {/* Placement filter chips */}
      {sourceFilter !== 'wizard' && placementTypes.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {placementTypes.map((pt) => (
            <Button key={pt} size="sm" variant={placementFilter === pt ? 'default' : 'ghost'} className={cn("h-6 text-[9px] px-2 rounded-lg shrink-0", placementFilter !== pt && 'bg-muted/20')} onClick={() => setPlacementFilter(placementFilter === pt ? null : pt)}>
              {PLACEMENT_LABELS[pt] || pt}
            </Button>
          ))}
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex justify-end">
        <div className="flex border border-border/40 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={cn("p-1.5", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <Grip size={13} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn("p-1.5", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <Box size={13} />
          </button>
        </div>
      </div>

      {sourceFilter === 'wizard' && wizardLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">Hämtar Wizard-katalog...</span>
        </div>
      )}
      {sourceFilter === 'wizard' && wizardError && !wizardLoading && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <AlertTriangle size={18} className="text-destructive" />
          <span className="text-xs text-destructive">{wizardError}</span>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={fetchWizardAssets}>Försök igen</Button>
        </div>
      )}
      {sourceFilter === 'wizard' && !wizardLoading && !wizardError && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
          <Wand2 size={18} />
          <span className="text-xs">Inga assets i Wizard-katalogen</span>
        </div>
      )}

      {/* Grouped catalog sections */}
      {(() => {
        const sourceGroups: { key: string; label: string; borderColor: string; icon: React.ElementType; entries: ACEntry[] }[] = [];
        const wizardEntries = filtered.filter(e => e.source === 'wizard');
        const userEntries = filtered.filter(e => (e.source === 'user') || e.wizardMode === 'imported');
        const curatedEntries = filtered.filter(e => e.source === 'curated');

        if (wizardEntries.length > 0) sourceGroups.push({ key: 'wizard', label: 'Wizard', borderColor: 'border-l-orange-500', icon: Wand2, entries: wizardEntries });
        if (userEntries.length > 0) sourceGroups.push({ key: 'user', label: 'Mina', borderColor: 'border-l-blue-500', icon: User, entries: userEntries });
        if (curatedEntries.length > 0) sourceGroups.push({ key: 'curated', label: 'Katalog', borderColor: 'border-l-muted-foreground/40', icon: Archive, entries: curatedEntries });

        const skipGrouping = sourceGroups.length <= 1 || sourceFilter !== 'all';

        const renderCard = (entry: ACEntry) => {
          const leftBorder = entry.source === 'wizard' ? 'border-l-2 border-l-orange-500'
            : entry.wizardMode === 'imported' ? 'border-l-2 border-l-blue-500'
            : entry.source === 'user' ? 'border-l-2 border-l-blue-400'
            : '';
          const isImporting = wizardImportingId && entry.wizardMeta?.id === wizardImportingId;

          const placementType = entry.catalogItem?.placement || entry.curatedMeta?.placement;
          const placementLabel = placementType ? PLACEMENT_LABELS[placementType] : null;

          if (viewMode === 'list') {
            return (
              <button key={entry.id} onClick={() => handlePlaceEntry(entry)} disabled={!!isImporting} className={cn("flex items-center gap-2 w-full px-2 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-colors text-xs group", leftBorder, isImporting && 'opacity-50')}>
                {isImporting && <Loader2 size={12} className="animate-spin shrink-0" />}
                {entry.staleSync && <span className="shrink-0" title="Kräver re-import"><AlertTriangle size={12} className="text-destructive" /></span>}
                {entry.wizardMode === 'imported' && !entry.staleSync && <span className="shrink-0" title="Från Wizard"><Wand2 size={10} className="text-orange-400" /></span>}
                {entry.thumbnail ? (
                  <img src={entry.thumbnail} alt={entry.name} className="w-8 h-8 object-contain rounded shrink-0" loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none'; const p = e.currentTarget.nextElementSibling; if (p) (p as HTMLElement).style.display = 'flex'; }} />
                ) : null}
                <div className="w-8 h-8 bg-muted/30 rounded items-center justify-center text-muted-foreground shrink-0" style={{ display: entry.thumbnail ? 'none' : 'flex' }}>
                  {(() => { const I = AC_CATEGORY_ICONS[entry.category] || Box; return <I size={14} strokeWidth={1.5} />; })()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-[11px] text-foreground truncate block">{entry.name}</span>
                  <div className="flex items-center gap-1">
                    {entry.dimensions && <span className="text-[8px] text-muted-foreground">{entry.dimensions.width}×{entry.dimensions.depth}×{entry.dimensions.height}m</span>}
                    {getPerfColor(entry.performance) && <span className={`inline-block w-1.5 h-1.5 rounded-full ${getPerfColor(entry.performance)}`} />}
                    {placementLabel && <span className="text-[8px] bg-muted/40 rounded px-1 py-0.5 text-muted-foreground">{placementLabel}</span>}
                  </div>
                </div>
                {instanceCounts[entry.id] > 0 && <span className="bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">×{instanceCounts[entry.id]}</span>}
                {canDelete(entry) && <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry); }} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity shrink-0"><Trash2 size={10} /></button>}
              </button>
            );
          }

          return (
            <button key={entry.id} onClick={() => handlePlaceEntry(entry)} disabled={!!isImporting} className={cn("relative flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/20 hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-colors text-xs group min-h-[64px]", leftBorder, isImporting && 'opacity-50')}>
              {isImporting && <div className="absolute inset-0 flex items-center justify-center z-30 bg-background/60 rounded-xl"><Loader2 size={16} className="animate-spin text-primary" /></div>}
              {entry.staleSync && <div className="absolute top-1 right-1 z-20" title="Kräver re-import"><AlertTriangle size={10} className="text-destructive" /></div>}
              {entry.wizardMode === 'imported' && !entry.staleSync && <div className="absolute top-1 right-1 z-20" title="Från Wizard"><Wand2 size={10} className="text-orange-400" /></div>}
              {instanceCounts[entry.id] > 0 && <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center z-20">×{instanceCounts[entry.id]}</div>}
              {entry.thumbnail ? (
                <img src={entry.thumbnail} alt={entry.name} className="w-full h-20 object-contain rounded p-1" loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; const p = e.currentTarget.nextElementSibling; if (p) (p as HTMLElement).style.display = 'flex'; }} />
              ) : null}
              <div className="w-full h-20 bg-muted/30 rounded items-center justify-center text-muted-foreground" style={{ display: entry.thumbnail ? 'none' : 'flex' }}>
                {(() => { const I = AC_CATEGORY_ICONS[entry.category] || Box; return <I size={20} strokeWidth={1.5} />; })()}
              </div>
              <span className="text-[11px] text-foreground truncate w-full text-center">{entry.name}</span>
              <div className="flex items-center gap-1 w-full justify-center flex-wrap">
                {entry.dimensions && <span className="text-[8px] text-muted-foreground">{entry.dimensions.width}×{entry.dimensions.depth}×{entry.dimensions.height}m</span>}
                {getPerfColor(entry.performance) && <span className={`inline-block w-1.5 h-1.5 rounded-full ${getPerfColor(entry.performance)}`} />}
                {entry.subcategory && entry.subcategory !== entry.category && <span className="text-[8px] text-muted-foreground/60">{entry.subcategory}</span>}
                {placementLabel && <span className="text-[8px] bg-muted/40 rounded px-1 py-0.5 text-muted-foreground">{placementLabel}</span>}
              </div>
              {canDelete(entry) && <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry); }} className="absolute bottom-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-opacity"><Trash2 size={10} /></button>}
              {entry.source === 'curated' && isHostedSync() && <button onClick={(e) => { e.stopPropagation(); openManageDialog(entry); }} className="absolute bottom-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"><Settings size={10} /></button>}
            </button>
          );
        };

        return (
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {skipGrouping ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-1.5' : 'space-y-1'}>
                {filtered.map(renderCard)}
                {sourceFilter !== 'wizard' && viewMode === 'grid' && (
                  <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all min-h-[80px]">
                    <Upload size={16} /><span className="text-[10px]">Importera</span>
                  </button>
                )}
              </div>
            ) : (
              sourceGroups.map((group) => (
                <div key={group.key}>
                  <button
                    onClick={() => setCollapsedSections(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                    className="flex items-center gap-1.5 w-full py-1.5 mt-2 pt-2 border-t border-border/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {collapsedSections[group.key] ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                    <group.icon size={10} />
                    <span>{group.label}</span>
                    <span className="text-[9px] font-normal ml-auto">{group.entries.length}</span>
                  </button>
                  {!collapsedSections[group.key] && (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-1.5 mt-1' : 'space-y-1 mt-1'}>
                      {group.entries.map(renderCard)}
                    </div>
                  )}
                </div>
              ))
            )}
            {sourceFilter !== 'wizard' && viewMode === 'list' && (
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 w-full px-2 py-2 rounded-md border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all text-xs">
                <Upload size={14} /><span className="text-[10px]">Importera modell</span>
              </button>
            )}
            {sourceFilter !== 'wizard' && !skipGrouping && viewMode === 'grid' && (
              <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all min-h-[80px]">
                <Upload size={16} /><span className="text-[10px]">Importera</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* Placed items on this floor */}
      {floorProps.length > 0 && (
        <div className="space-y-1.5 border-t border-border/30 pt-3 mt-3">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Placerade ({floorProps.length})</h4>
          <div className="space-y-0.5 max-h-[30vh] overflow-y-auto">
            {floorProps.map((p: any) => {
              const catItem = catalog.find((c: any) => c.id === p.catalogId);
              return (
                <div key={p.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 group text-[10px]">
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

      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setOptimizedResult(null); setOptimizationStep('analyze'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Importera modell</DialogTitle><DialogDescription className="sr-only">Importera en 3D-modell</DialogDescription></DialogHeader>

          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-8"><Loader2 size={24} className="animate-spin text-primary" /><p className="text-xs text-muted-foreground">Analyserar modell...</p></div>
          ) : optimizationStep === 'optimizing' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Optimerar...</p>
              <p className="text-[10px] text-muted-foreground/70">Skalar ner texturer, rensar tomma noder, deduplicerar material...</p>
            </div>
          ) : optimizationStep === 'optimized' && optimizedResult ? (
            <div className="space-y-3">
              {(optimizedResult.thumbnail || importResult?.thumbnail) ? <div className="flex justify-center"><img src={optimizedResult.thumbnail || importResult?.thumbnail || ''} alt="Optimerad" className="w-24 h-24 object-contain rounded bg-muted/20" /></div> : null}

              {optimizedResult.noImprovement ? (
                <div className="rounded-lg border border-muted bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold text-foreground flex items-center gap-1"><CheckCircle size={12} className="text-primary" /> Modellen är redan optimerad</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Ingen ytterligare förbättring möjlig. Originalet importeras.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-[10px] font-semibold text-primary mb-2 flex items-center gap-1"><CheckCircle size={12} /> Optimering klar</p>
                  <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 gap-y-1 text-[10px]">
                    {optimizedResult.savings.fileSizePct !== 0 && (<>
                      <span className="text-muted-foreground">Storlek</span>
                      <span className="text-muted-foreground text-right">{formatSize(optimizedResult.beforeStats.fileSizeKB)}</span>
                      <span className="text-foreground text-right font-medium">{formatSize(optimizedResult.stats.fileSizeKB)}</span>
                      <span className="font-bold text-primary">-{optimizedResult.savings.fileSizePct}%</span>
                    </>)}
                    {optimizedResult.savings.texResPct !== 0 && (<>
                      <span className="text-muted-foreground">Texturer</span>
                      <span className="text-muted-foreground text-right">{optimizedResult.beforeStats.maxTextureRes ?? '–'}px</span>
                      <span className="text-foreground text-right font-medium">{optimizedResult.stats.maxTextureRes ?? '–'}px</span>
                      <span className="font-bold text-primary">-{optimizedResult.savings.texResPct}%</span>
                    </>)}
                    {optimizedResult.savings.materialsPct !== 0 && (<>
                      <span className="text-muted-foreground">Material</span>
                      <span className="text-muted-foreground text-right">{optimizedResult.beforeStats.materials}</span>
                      <span className="text-foreground text-right font-medium">{optimizedResult.stats.materials}</span>
                      <span className="font-bold text-primary">-{optimizedResult.savings.materialsPct}%</span>
                    </>)}
                    <span className="text-muted-foreground">Trianglar</span>
                    <span className="text-muted-foreground text-right">{optimizedResult.beforeStats.triangles > 1000 ? `${(optimizedResult.beforeStats.triangles / 1000).toFixed(1)}k` : optimizedResult.beforeStats.triangles}</span>
                    <span className="text-foreground text-right font-medium">{optimizedResult.stats.triangles > 1000 ? `${(optimizedResult.stats.triangles / 1000).toFixed(1)}k` : optimizedResult.stats.triangles}</span>
                    <span className="text-muted-foreground font-bold">0%</span>
                  </div>
                </div>
              )}

              <div className="space-y-1"><Label className="text-[10px]">Namn</Label><Input value={importName} onChange={(e) => setImportName(e.target.value)} className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Kategori</Label><select value={importCategory} onChange={(e) => setImportCategory(e.target.value as AssetCategory)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">{Object.entries(AC_CATEGORY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-[10px]">Underkategori</Label><Input value={importSubcategory} onChange={(e) => setImportSubcategory(e.target.value)} placeholder="t.ex. soffbord..." className="h-7 text-xs" /></div>
              {isHostedSync() && <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer"><input type="checkbox" checked={saveToCatalog} onChange={(e) => setSaveToCatalog(e.target.checked)} className="rounded border-border" /><FolderPlus size={12} />Spara i permanent katalog</label>}
            </div>
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

              {isHostedSync() && <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer"><input type="checkbox" checked={saveToCatalog} onChange={(e) => setSaveToCatalog(e.target.checked)} className="rounded border-border" /><FolderPlus size={12} />Spara i permanent katalog</label>}
              {importResult.warnings.length > 0 && <div className="space-y-1">{importResult.warnings.map((w,i) => <p key={i} className="text-[10px] text-accent-foreground flex items-center gap-1"><AlertTriangle size={10} /> {w}</p>)}</div>}

              <div className={cn("rounded-lg p-2 text-[10px] flex items-start gap-2",
                optLevel === 'ok' ? 'bg-primary/10 text-primary' :
                optLevel === 'recommended' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                'bg-destructive/10 text-destructive'
              )}>
                {optLevel === 'ok' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium">
                    {optLevel === 'ok' ? 'Bra — redo att använda' :
                     optLevel === 'recommended' ? 'Optimering rekommenderas' :
                     'Optimering starkt rekommenderad'}
                  </p>
                  <p className="opacity-70 mt-0.5">
                    {optLevel === 'ok'
                      ? 'OK för Raspberry Pi och mobil'
                      : 'Minskar filstorlek och texturer. Triangelantal påverkas inte nämnvärt.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-1">
            <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(false)}>Avbryt</Button>

            {optimizationStep === 'optimized' && optimizedResult ? (
              <Button size="sm" onClick={handleImportConfirm} disabled={!importName.trim()}>Importera</Button>
            ) : optimizationStep === 'analyze' && importResult ? (
              <>
                {optLevel !== 'ok' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={handleImportConfirm} disabled={isProcessing || !importName.trim()}>Importera original</Button>
                    <Button size="sm" onClick={handleOptimize} disabled={isProcessing || isOptimizing}>Optimera & importera</Button>
                  </>
                ) : (
                  <>
                    <button onClick={handleOptimize} disabled={isOptimizing} className="text-[10px] text-muted-foreground hover:text-foreground underline disabled:opacity-50">Optimera ändå</button>
                    <Button size="sm" onClick={handleImportConfirm} disabled={isProcessing || !importName.trim()}>Importera</Button>
                  </>
                )}
              </>
            ) : null}
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
   BibliotekWorkspace — Full asset-management workspace (Phase 4A)
   No canvas. Content-management layout with metadata editing.
   ═══════════════════════════════════════════════ */

type BibSourceFilter = 'all' | 'curated' | 'user' | 'wizard';

interface BibAssetEntry {
  id: string; name: string; thumbnail?: string; category: string; subcategory?: string;
  source: 'curated' | 'user' | 'builtin' | 'wizard';
  catalogItem?: import('../../store/types').PropCatalogItem;
  curatedMeta?: CatalogAssetMeta;
  dimensions?: { width: number; depth: number; height: number };
  performance?: { vertices?: number; triangles?: number; textureBytes?: number };
  tags?: string[];
  visibility?: import('../../store/types').AssetVisibility;
  placement?: import('../../store/types').AssetPlacement;
}

const BIB_CAT_LABELS: Record<string, string> = {
  sofas: 'Soffor', chairs: 'Stolar', tables: 'Bord', beds: 'Sängar',
  storage: 'Förvaring', lighting: 'Belysning', decor: 'Dekoration',
  plants: 'Växter', kitchen: 'Kök', bathroom: 'Badrum',
  devices: 'Enheter', outdoor: 'Utomhus',
  electronics: 'Elektronik', 'smart-devices': 'Smarta enheter',
  imported: 'Importerade',
};

const BIB_CAT_ICONS: Record<string, React.ElementType> = {
  sofas: Sofa, chairs: Sofa, tables: Box, beds: Bed,
  storage: Package, lighting: Lamp, decor: Box, plants: Flower2,
  kitchen: UtensilsCrossed, bathroom: Bath, outdoor: TreePine,
  devices: Monitor, electronics: Monitor, 'smart-devices': Cpu,
  imported: Box,
};

const PLACEMENT_OPTIONS: { value: import('../../store/types').AssetPlacement; label: string }[] = [
  { value: 'floor', label: 'Golv' },
  { value: 'wall', label: 'Vägg' },
  { value: 'ceiling', label: 'Tak' },
  { value: 'table', label: 'Bord/yta' },
];

const VISIBILITY_OPTIONS: { value: import('../../store/types').AssetVisibility; label: string; icon: React.ElementType }[] = [
  { value: 'visible', label: 'Synlig', icon: Box },
  { value: 'favorite', label: 'Favorit', icon: CheckCircle },
  { value: 'hidden', label: 'Dold', icon: AlertTriangle },
];

function BibliotekWorkspace() {
  const catalog = useAppStore((s) => s.props.catalog);
  const addToCatalog = useAppStore((s) => s.addToCatalog);
  const removeFromCatalog = useAppStore((s) => s.removeFromCatalog);
  const updateCatalogItem = useAppStore((s) => s.updateCatalogItem);

  const [curatedAssets, setCuratedAssets] = useState<CatalogAssetMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<BibSourceFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<BibAssetEntry | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Metadata editing state (only for user-owned assets)
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<AssetCategory>('imported');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editPlacement, setEditPlacement] = useState<import('../../store/types').AssetPlacement>('floor');
  const [editVisibility, setEditVisibility] = useState<import('../../store/types').AssetVisibility>('visible');
  const [tagInput, setTagInput] = useState('');

  // Import dialog
  const [bibImportOpen, setBibImportOpen] = useState(false);
  const [bibImportResult, setBibImportResult] = useState<PipelineResult | null>(null);
  const [bibImportFile, setBibImportFile] = useState<File | null>(null);
  const [bibImportName, setBibImportName] = useState('');
  const [bibImportCat, setBibImportCat] = useState<AssetCategory>('imported');
  const [bibImportSub, setBibImportSub] = useState('');
  const [bibProcessing, setBibProcessing] = useState(false);
  const [bibOptimizedResult, setBibOptimizedResult] = useState<OptimizationResult | null>(null);
  const [bibIsOptimizing, setBibIsOptimizing] = useState(false);
  const [bibOptStep, setBibOptStep] = useState<'analyze' | 'optimizing' | 'optimized'>('analyze');
  const bibFileRef = useRef<HTMLInputElement>(null);

  const wizardStatus = useAppStore((s) => s.wizard.status);
  const [wizardAssets, setWizardAssets] = useState<import('../../lib/wizardClient').WizardAsset[]>([]);

  useEffect(() => { loadCuratedCatalog().then(setCuratedAssets); }, []);

  useEffect(() => {
    if (wizardStatus !== 'connected') { setWizardAssets([]); return; }
    import('../../lib/wizardClient').then(({ fetchWizardCatalog }) => {
      fetchWizardCatalog(true).then(setWizardAssets).catch(() => setWizardAssets([]));
    });
  }, [wizardStatus]);

  // Sync edit state when selection changes
  useEffect(() => {
    if (selectedAsset?.catalogItem) {
      const ci = selectedAsset.catalogItem;
      setEditName(ci.name);
      setEditCategory((ci.category || 'imported') as AssetCategory);
      setEditSubcategory(ci.subcategory || '');
      setEditTags((ci.tags || []).join(', '));
      setEditPlacement(ci.placement || 'floor');
      setEditVisibility(ci.visibility || 'visible');
    }
  }, [selectedAsset?.id]);

  const entries: BibAssetEntry[] = useMemo(() => {
    const result: BibAssetEntry[] = [];
    for (const meta of curatedAssets) {
      result.push({
        id: `curated-${meta.id}`, name: meta.name, thumbnail: meta.thumbnail ? `/catalog/${meta.thumbnail}` : undefined,
        category: meta.category, subcategory: meta.subcategory, source: 'curated',
        curatedMeta: meta, dimensions: meta.dimensions, performance: meta.performance,
        placement: meta.placement, tags: meta.tags,
      });
    }
    for (const item of catalog) {
      result.push({
        id: item.id, name: item.name, thumbnail: item.thumbnail,
        category: item.category || 'imported', subcategory: item.subcategory, source: 'user',
        catalogItem: item, tags: item.tags, visibility: item.visibility,
        placement: item.placement,
        dimensions: item.dimensions as any, performance: item.performance as any,
      });
    }
    for (const wa of wizardAssets) {
      const alreadyImported = catalog.some((c) => c.wizardAssetId === wa.id);
      if (!alreadyImported) {
        const bb = wa.boundingBox;
        const dims = bb ? { width: +(bb.max[0] - bb.min[0]).toFixed(2), depth: +(bb.max[2] - bb.min[2]).toFixed(2), height: +(bb.max[1] - bb.min[1]).toFixed(2) } : undefined;
        let thumb: string | undefined;
        if (wa.thumbnail) {
          const base = useAppStore.getState().wizard.url.replace(/\/+$/, '');
          thumb = wa.thumbnail.startsWith('http') ? wa.thumbnail : `${base}${wa.thumbnail.startsWith('/') ? wa.thumbnail : '/' + wa.thumbnail}`;
        }
        if (!thumb) {
          const base = useAppStore.getState().wizard.url.replace(/\/+$/, '');
          thumb = `${base}/assets/${encodeURIComponent(wa.id)}/thumbnail`;
        }
        result.push({ id: `wizard-${wa.id}`, name: wa.name, thumbnail: thumb, category: wa.category || 'imported', source: 'wizard', dimensions: dims });
      }
    }
    return result;
  }, [curatedAssets, catalog, wizardAssets]);

  const filtered = useMemo(() => {
    let list = entries;
    if (sourceFilter !== 'all') list = list.filter((e) => e.source === sourceFilter);
    if (filterCategory) list = list.filter((e) => e.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (e.subcategory || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, sourceFilter, filterCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, BibAssetEntry[]> = {};
    for (const e of filtered) { (map[e.category || 'imported'] ??= []).push(e); }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))].sort(), [entries]);

  const handleBibFileSelect = async (file: File) => {
    const err = validateFormat(file);
    if (err) { toast.error(err); return; }
    setBibImportFile(file);
    setBibImportName(file.name.replace(/\.(glb|gltf)$/i, ''));
    setBibOptimizedResult(null); setBibOptStep('analyze');
    setBibProcessing(true);
    try { setBibImportResult(await processModel(file)); } catch { toast.error('Kunde inte analysera modellen'); }
    finally { setBibProcessing(false); }
  };

  const handleBibOptimize = useCallback(async () => {
    if (!bibImportResult || !bibImportFile) return;
    setBibIsOptimizing(true); setBibOptStep('optimizing');
    try {
      const result = await optimizeModel(bibImportFile, bibImportResult.stats, { maxTextureRes: 1024 });
      setBibOptimizedResult(result);
      setBibOptStep('optimized');
    } catch (err) {
      console.error('[Bibliotek Optimize] Failed:', err);
      toast.error('Optimering misslyckades — du kan fortfarande importera originalet.');
      setBibOptStep('analyze');
    } finally {
      setBibIsOptimizing(false);
    }
  }, [bibImportResult, bibImportFile]);

  const handleBibImportConfirm = async () => {
    if (!bibImportFile || !bibImportResult) return;
    const finalFile = bibOptimizedResult
      ? new File([bibOptimizedResult.blob], bibImportName.trim().replace(/\s+/g, '_') + '.glb', { type: 'model/gltf-binary' })
      : bibImportFile;
    setBibProcessing(true);
    try {
      if (isHostedSync()) {
        const r = await ingestToCatalog(finalFile, { name: bibImportName, category: bibImportCat }, bibImportResult.thumbnail);
        if (r) toast.success('Importerad till katalogen');
      } else {
        addToCatalog({ id: `user-${Date.now()}`, name: bibImportName || bibImportFile.name, url: URL.createObjectURL(finalFile), source: 'user', category: bibImportCat, visibility: 'visible' });
        toast.success('Tillagd i lokalt bibliotek');
      }
    } catch { toast.error('Import misslyckades'); }
    finally { setBibProcessing(false); setBibImportOpen(false); setBibImportFile(null); setBibImportResult(null); setBibOptimizedResult(null); }
  };

  const toggleSection = (cat: string) => setCollapsedSections((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const isEditable = selectedAsset?.source === 'user' && !!selectedAsset.catalogItem;

  const saveMetadata = () => {
    if (!selectedAsset?.catalogItem) return;
    const parsedTags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    updateCatalogItem(selectedAsset.catalogItem.id, {
      name: editName,
      category: editCategory,
      subcategory: editSubcategory || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      placement: editPlacement,
      visibility: editVisibility,
    });
    // Update local selection to reflect changes
    setSelectedAsset((prev) => prev ? { ...prev, name: editName, category: editCategory, subcategory: editSubcategory, tags: parsedTags, placement: editPlacement, visibility: editVisibility } : null);
    toast.success('Metadata sparad');
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const current = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!current.includes(tagInput.trim())) {
      current.push(tagInput.trim());
      setEditTags(current.join(', '));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    const current = editTags.split(',').map(t => t.trim()).filter(Boolean);
    setEditTags(current.filter(t => t !== tag).join(', '));
  };

  return (
    <div className="flex h-full bg-background">
      {/* ── Left: Asset list/grid ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Top bar: search + import */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-foreground whitespace-nowrap">Bibliotek</h2>
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sök namn, kategori, taggar..." className="pl-8 h-8 text-sm" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBibImportOpen(true)}>
            <Upload className="w-4 h-4" /> Importera
          </Button>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </button>
        </div>

        {/* Source filter pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-card/30">
          {(['all', 'curated', 'user', 'wizard'] as BibSourceFilter[]).map((sf) => (
            <button key={sf} onClick={() => setSourceFilter(sf)}
              className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                sourceFilter === sf ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted')}>
              {{ all: 'Alla', curated: 'Katalog', user: 'Mina', wizard: 'Wizard' }[sf]}
            </button>
          ))}
          {filterCategory && (
            <button onClick={() => setFilterCategory(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              ✕ {BIB_CAT_LABELS[filterCategory] || filterCategory}
            </button>
          )}
        </div>

        {/* Category strip */}
        <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto border-b border-border/30 bg-card/20">
          {categories.map((cat) => {
            const CatIcon = BIB_CAT_ICONS[cat] || Box;
            return (
              <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors',
                  filterCategory === cat ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                <CatIcon className="w-3 h-3" /> {BIB_CAT_LABELS[cat] || cat}
              </button>
            );
          })}
        </div>

        {/* Asset grid/list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-8">{searchQuery ? 'Inga tillgångar matchar sökningen.' : 'Inga tillgångar i biblioteket.'}</p>}
          {grouped.map(([cat, items]) => {
            const isCollapsed = collapsedSections[cat];
            const CatIcon = BIB_CAT_ICONS[cat] || Box;
            return (
              <div key={cat} className="mb-3">
                <button onClick={() => toggleSection(cat)} className="flex items-center gap-1.5 w-full text-left px-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <CatIcon className="w-3.5 h-3.5" /> {BIB_CAT_LABELS[cat] || cat}
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">{items.length}</Badge>
                </button>
                {!isCollapsed && (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mt-1">
                      {items.map((entry) => {
                        const isHidden = entry.visibility === 'hidden';
                        const isFav = entry.visibility === 'favorite';
                        return (
                          <button key={entry.id} onClick={() => setSelectedAsset(entry)}
                            className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center relative',
                              selectedAsset?.id === entry.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/50 hover:border-border hover:bg-muted/30',
                              isHidden && 'opacity-40')}>
                            {isFav && <span className="absolute top-1 right-1 text-[10px]">⭐</span>}
                            <div className="w-full aspect-square rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                              {entry.thumbnail ? <img src={entry.thumbnail} alt={entry.name} className="w-full h-full object-contain" loading="lazy" /> : <Box className="w-6 h-6 text-muted-foreground/40" />}
                            </div>
                            <span className="text-[10px] text-foreground leading-tight line-clamp-2">{entry.name}</span>
                            <div className="flex items-center gap-1">
                              {entry.source === 'wizard' && <Wand2 className="w-2.5 h-2.5 text-muted-foreground" />}
                              <span className="text-[9px] text-muted-foreground">{{ curated: 'Katalog', user: 'Min', wizard: 'Wizard', builtin: 'Inbyggd' }[entry.source]}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 mt-1">
                      {items.map((entry) => {
                        const isHidden = entry.visibility === 'hidden';
                        const isFav = entry.visibility === 'favorite';
                        return (
                          <button key={entry.id} onClick={() => setSelectedAsset(entry)}
                            className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
                              selectedAsset?.id === entry.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground',
                              isHidden && 'opacity-40')}>
                            <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                              {entry.thumbnail ? <img src={entry.thumbnail} alt={entry.name} className="w-full h-full object-contain" loading="lazy" /> : <Box className="w-4 h-4 text-muted-foreground/40" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{isFav ? '⭐ ' : ''}{entry.name}</p>
                              <p className="text-[10px] text-muted-foreground">{BIB_CAT_LABELS[entry.category] || entry.category}</p>
                            </div>
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex gap-0.5 shrink-0">
                                {entry.tags.slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-[8px] px-1 py-0">{t}</Badge>)}
                              </div>
                            )}
                            {entry.source === 'wizard' && <Wand2 className="w-3 h-3 text-muted-foreground shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Footer status */}
        <div className="px-4 py-1.5 border-t border-border bg-card/40 text-[10px] text-muted-foreground flex items-center gap-3">
          <span>{filtered.length} av {entries.length} tillgångar</span>
          {wizardStatus === 'connected' && <span className="flex items-center gap-1"><Wand2 className="w-3 h-3" /> Wizard ansluten</span>}
        </div>
      </div>

      {/* ── Right: Detail & metadata panel ── */}
      <div className="w-[360px] shrink-0 flex flex-col bg-card/60 backdrop-blur-sm border-l border-border">
        {selectedAsset ? (
          <div className="flex-1 overflow-y-auto">
            {/* Preview area */}
            <div className="p-4 border-b border-border">
              <div className="aspect-[4/3] rounded-xl bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
                {selectedAsset.thumbnail
                  ? <img src={selectedAsset.thumbnail} alt={selectedAsset.name} className="w-full h-full object-contain" />
                  : <Box className="w-16 h-16 text-muted-foreground/30" />
                }
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* ── Identity ── */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identitet</h3>
                {isEditable ? (
                  <>
                    <div><Label className="text-[10px] text-muted-foreground">Namn</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">Kategori</Label>
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as AssetCategory)}
                          className="w-full h-8 rounded-md border border-input bg-background text-foreground px-2 text-sm">
                          {Object.entries(BIB_CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select></div>
                      <div><Label className="text-[10px] text-muted-foreground">Underkategori</Label>
                        <Input value={editSubcategory} onChange={(e) => setEditSubcategory(e.target.value)} placeholder="Valfritt" className="h-8 text-sm" /></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div><Label className="text-[10px] text-muted-foreground">Namn</Label><p className="text-sm font-medium text-foreground">{selectedAsset.name}</p></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">Kategori</Label><p className="text-xs text-foreground">{BIB_CAT_LABELS[selectedAsset.category] || selectedAsset.category}</p></div>
                      {selectedAsset.subcategory && <div><Label className="text-[10px] text-muted-foreground">Underkategori</Label><p className="text-xs text-foreground">{selectedAsset.subcategory}</p></div>}
                    </div>
                  </>
                )}
                <div><Label className="text-[10px] text-muted-foreground">Källa</Label>
                  <Badge variant="secondary" className="text-[10px]">{{ curated: 'Katalog', user: 'Min', wizard: 'Wizard', builtin: 'Inbyggd' }[selectedAsset.source]}</Badge>
                </div>
              </div>

              {/* ── Tags ── */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taggar</h3>
                {isEditable ? (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {editTags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">✕</button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Ny tagg..."
                        className="h-7 text-xs flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}} />
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addTag}>+</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(selectedAsset.tags || []).length > 0
                      ? (selectedAsset.tags || []).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)
                      : <p className="text-[10px] text-muted-foreground italic">Inga taggar</p>}
                  </div>
                )}
              </div>

              {/* ── Placement hint ── */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Placering</h3>
                {isEditable ? (
                  <div className="flex gap-1">
                    {PLACEMENT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setEditPlacement(opt.value)}
                        className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors',
                          editPlacement === opt.value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-foreground">{PLACEMENT_OPTIONS.find(p => p.value === (selectedAsset.placement || 'floor'))?.label || 'Golv'}</p>
                )}
              </div>

              {/* ── Visibility ── */}
              {isEditable && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Synlighet</h3>
                  <div className="flex gap-1">
                    {VISIBILITY_OPTIONS.map(opt => {
                      const OptIcon = opt.icon;
                      return (
                        <button key={opt.value} onClick={() => setEditVisibility(opt.value)}
                          className={cn('flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                            editVisibility === opt.value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                          <OptIcon className="w-3 h-3" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Dimensions & performance ── */}
              {selectedAsset.dimensions && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dimensioner</h3>
                  <p className="text-xs text-foreground font-mono">
                    {selectedAsset.dimensions.width.toFixed(2)} × {selectedAsset.dimensions.depth.toFixed(2)} × {selectedAsset.dimensions.height.toFixed(2)} m
                  </p>
                </div>
              )}
              {selectedAsset.performance && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prestanda</h3>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    {selectedAsset.performance.vertices != null && <p>Vertices: {selectedAsset.performance.vertices.toLocaleString()}</p>}
                    {selectedAsset.performance.triangles != null && <p>Trianglar: {selectedAsset.performance.triangles.toLocaleString()}</p>}
                  </div>
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                {isEditable && (
                  <Button size="sm" className="w-full gap-1.5" onClick={saveMetadata}>
                    <CheckCircle className="w-3.5 h-3.5" /> Spara ändringar
                  </Button>
                )}
                {selectedAsset.source === 'user' && selectedAsset.catalogItem && (
                  <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={() => {
                    removeFromCatalog(selectedAsset.catalogItem!.id);
                    setSelectedAsset(null);
                    toast.success('Borttagen från biblioteket');
                  }}>
                    <Trash2 className="w-3.5 h-3.5" /> Ta bort
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
            <Package className="w-12 h-12 opacity-30" />
            <p className="text-sm text-center">Välj en tillgång för att se detaljer och redigera metadata.</p>
            <p className="text-[10px] text-center text-muted-foreground/60">Du kan redigera namn, kategori, taggar, placering och synlighet för dina egna tillgångar.</p>
          </div>
        )}
      </div>

      {/* Import dialog */}
      <Dialog open={bibImportOpen} onOpenChange={setBibImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Importera modell till biblioteket</DialogTitle><DialogDescription>Ladda upp en .glb/.gltf-fil. Modellen analyseras automatiskt.</DialogDescription></DialogHeader>

          {/* File picker — always visible */}
          <input ref={bibFileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={(e) => e.target.files?.[0] && handleBibFileSelect(e.target.files[0])} />
          {!bibImportResult && !bibProcessing && (
            <Button variant="outline" className="w-full gap-2" onClick={() => bibFileRef.current?.click()} disabled={bibProcessing}>
              <Upload className="w-4 h-4" /> {bibImportFile ? bibImportFile.name : 'Välj fil...'}
            </Button>
          )}

          {bibProcessing && !bibIsOptimizing && <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /> Analyserar modell...</div>}
          {bibIsOptimizing && <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /> Optimerar modell...</div>}

          {/* Optimized result view */}
          {bibOptStep === 'optimized' && bibOptimizedResult && !bibIsOptimizing ? (
            <div className="space-y-3">
              {bibOptimizedResult.thumbnail ? <div className="flex justify-center"><img src={bibOptimizedResult.thumbnail} alt="Preview" className="w-24 h-24 object-contain rounded bg-muted/20" /></div> : <div className="flex justify-center"><div className="w-24 h-24 bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-[10px]">Ingen förhandsgranskning</div></div>}

              {!bibOptimizedResult.noImprovement ? (
                <div className="rounded-lg bg-primary/10 p-2 text-[10px] space-y-1">
                  <p className="font-medium text-primary flex items-center gap-1"><CheckCircle size={12} /> Optimering klar</p>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 text-[10px]">
                    <span className="text-muted-foreground">Egenskap</span><span className="text-muted-foreground text-right">Före</span><span className="text-muted-foreground text-right">Efter</span><span className="text-muted-foreground text-right">Δ</span>
                    <span className="text-muted-foreground">Filstorlek</span>
                    <span className="text-muted-foreground text-right">{formatSize(bibOptimizedResult.beforeStats.fileSizeKB)}</span>
                    <span className="text-foreground text-right font-medium">{formatSize(bibOptimizedResult.stats.fileSizeKB)}</span>
                    <span className="font-bold text-primary">-{bibOptimizedResult.savings.fileSizePct}%</span>
                    <span className="text-muted-foreground">Material</span>
                    <span className="text-muted-foreground text-right">{bibOptimizedResult.beforeStats.materials}</span>
                    <span className="text-foreground text-right font-medium">{bibOptimizedResult.stats.materials}</span>
                    {bibOptimizedResult.savings.materialsPct > 0 ? <span className="font-bold text-primary">-{bibOptimizedResult.savings.materialsPct}%</span> : <span className="text-muted-foreground">0%</span>}
                    <span className="text-muted-foreground">Trianglar</span>
                    <span className="text-muted-foreground text-right">{bibOptimizedResult.beforeStats.triangles > 1000 ? `${(bibOptimizedResult.beforeStats.triangles / 1000).toFixed(1)}k` : bibOptimizedResult.beforeStats.triangles}</span>
                    <span className="text-foreground text-right font-medium">{bibOptimizedResult.stats.triangles > 1000 ? `${(bibOptimizedResult.stats.triangles / 1000).toFixed(1)}k` : bibOptimizedResult.stats.triangles}</span>
                    <span className="text-muted-foreground font-bold">0%</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center">Modellen behöver ingen ytterligare optimering.</p>
              )}

              <div className="space-y-1"><Label className="text-[10px]">Namn</Label><Input value={bibImportName} onChange={(e) => setBibImportName(e.target.value)} className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Kategori</Label><select value={bibImportCat} onChange={(e) => setBibImportCat(e.target.value as AssetCategory)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">{Object.entries(BIB_CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-[10px]">Underkategori</Label><Input value={bibImportName} onChange={(e) => setBibImportName(e.target.value)} placeholder="t.ex. soffbord..." className="h-7 text-xs" /></div>
            </div>
          ) : bibImportResult && !bibProcessing && !bibIsOptimizing ? (
            <div className="space-y-3">
              {/* Thumbnail */}
              {bibImportResult.thumbnail ? <div className="flex justify-center"><img src={bibImportResult.thumbnail} alt="Preview" className="w-24 h-24 object-contain rounded bg-muted/20" /></div> : <div className="flex justify-center"><div className="w-24 h-24 bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-[10px]">Ingen förhandsgranskning</div></div>}

              {/* Stats + dimensions + rating */}
              {(() => {
                const r = ratePerformance(bibImportResult.stats);
                return (
                  <div className="flex items-center gap-2 text-[10px]">
                    {r === 'ok' && <CheckCircle size={12} className="text-primary" />}
                    {r === 'heavy' && <AlertTriangle size={12} className="text-accent-foreground" />}
                    {r === 'too-heavy' && <AlertTriangle size={12} className="text-destructive" />}
                    <span className="text-muted-foreground">{formatStats(bibImportResult.stats)}</span>
                    {bibImportResult.dimensions && <span className="text-muted-foreground">· {bibImportResult.dimensions.width}×{bibImportResult.dimensions.depth}×{bibImportResult.dimensions.height}m</span>}
                  </div>
                );
              })()}

              {/* Warnings */}
              {bibImportResult.warnings.length > 0 && <div className="space-y-1">{bibImportResult.warnings.map((w, i) => <p key={i} className="text-[10px] text-accent-foreground flex items-center gap-1"><AlertTriangle size={10} /> {w}</p>)}</div>}

              {/* Optimization recommendation panel */}
              {(() => {
                const level = getOptimizationLevel(bibImportResult.stats);
                return (
                  <div className={cn("rounded-lg p-2 text-[10px] flex items-start gap-2",
                    level === 'ok' ? 'bg-primary/10 text-primary' :
                    level === 'recommended' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                    'bg-destructive/10 text-destructive'
                  )}>
                    {level === 'ok' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium">
                        {level === 'ok' ? 'Bra — redo att använda' :
                         level === 'recommended' ? 'Optimering rekommenderas' :
                         'Optimering starkt rekommenderad'}
                      </p>
                      <p className="opacity-70 mt-0.5">
                        {level === 'ok'
                          ? 'OK för Raspberry Pi och mobil'
                          : 'Minskar filstorlek och texturer. Triangelantal påverkas inte nämnvärt.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Form fields */}
              <div className="space-y-1"><Label className="text-[10px]">Namn</Label><Input value={bibImportName} onChange={(e) => setBibImportName(e.target.value)} className="h-7 text-xs" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Kategori</Label><select value={bibImportCat} onChange={(e) => setBibImportCat(e.target.value as AssetCategory)} className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">{Object.entries(BIB_CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-[10px]">Underkategori</Label><Input placeholder="t.ex. soffbord..." className="h-7 text-xs" /></div>
            </div>
          ) : null}

          <DialogFooter className="gap-1">
            <Button size="sm" variant="outline" onClick={() => setBibImportOpen(false)}>Avbryt</Button>

            {bibOptStep === 'optimized' && bibOptimizedResult ? (
              <Button size="sm" onClick={handleBibImportConfirm} disabled={!bibImportName.trim()}>Importera</Button>
            ) : bibOptStep === 'analyze' && bibImportResult && !bibProcessing ? (
              <>
                {(() => {
                  const level = getOptimizationLevel(bibImportResult.stats);
                  return level !== 'ok' ? (
                    <>
                      <Button size="sm" variant="outline" onClick={handleBibImportConfirm} disabled={bibProcessing || !bibImportName.trim()}>Importera original</Button>
                      <Button size="sm" onClick={handleBibOptimize} disabled={bibProcessing || bibIsOptimizing}>Optimera & importera</Button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleBibOptimize} disabled={bibIsOptimizing} className="text-[10px] text-muted-foreground hover:text-foreground underline disabled:opacity-50">Optimera ändå</button>
                      <Button size="sm" onClick={handleBibImportConfirm} disabled={bibProcessing || !bibImportName.trim()}>Importera</Button>
                    </>
                  );
                })()}
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DesignTabBar — replaces BuildBottomDock
   3 primary tabs + contextual sub-tools per tab
   ═══════════════════════════════════════════════ */

interface SubToolDef {
  tool: BuildTool;
  label: string;
  icon: typeof MousePointer2;
}

const planritningTools: SubToolDef[] = [
  { tool: 'select', label: 'Välj', icon: MousePointer2 },
  { tool: 'wall', label: 'Vägg', icon: Minus },
  { tool: 'room', label: 'Rum', icon: Square },
  { tool: 'door', label: 'Dörr', icon: DoorOpen },
  { tool: 'passage', label: 'Passage', icon: DoorOpen },
  { tool: 'window', label: 'Fönster', icon: PanelTop },
  { tool: 'garage-door', label: 'Garage', icon: Warehouse },
  { tool: 'stairs', label: 'Trappa', icon: Footprints },
  { tool: 'paint', label: 'Måla', icon: Paintbrush },
  { tool: 'template', label: 'Mallar', icon: Package },
  { tool: 'measure', label: 'Mät', icon: Ruler },
  { tool: 'calibrate', label: 'Skala', icon: Ruler },
  { tool: 'copy', label: 'Kopiera', icon: Import },
  { tool: 'import' as BuildTool, label: 'Import', icon: Import },
  { tool: 'erase', label: 'Radera', icon: Eraser },
];

const inredningTools: SubToolDef[] = [
  { tool: 'select', label: 'Välj', icon: MousePointer2 },
  { tool: 'furnish' as BuildTool, label: 'Möbler', icon: Sofa },
  { tool: 'wizard' as BuildTool, label: 'Wizard', icon: Wand2 },
  { tool: 'place-light', label: 'Enheter', icon: Cpu },
];

function DesignTabBar() {
  const activeTab = useAppStore((s) => s.build.tab);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTab = useAppStore((s) => s.setBuildTab);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const setCameraMode = useAppStore((s) => s.setCameraMode);

  const handleTabClick = (tab: BuildTab) => {
    setBuildTab(tab);
    if (tab === 'planritning') {
      setBuildTool('select');
      setCameraMode('topdown'); // 2D-first for structural work
    } else if (tab === 'inredning') {
      setBuildTool('furnish' as any); // Catalog as primary surface
      setCameraMode('3d'); // 3D-first for interior design
    }
    // bibliotek has no sub-tools or camera preference
  };

  const subTools = activeTab === 'planritning' ? planritningTools
    : activeTab === 'inredning' ? inredningTools
    : null;

  return (
    <div className="bg-background/95 backdrop-blur border-t border-border">
      {/* Sub-tools row */}
      {subTools && (
        <div className="flex items-center justify-center gap-1 px-2 py-1 border-b border-border/50">
          {subTools.map(({ tool, label, icon: Icon }) => {
            const isActive = activeTool === tool
              || (tool === 'place-light' && activeTool.startsWith('place-'))
              || (tool === ('furnish' as BuildTool) && activeTool === ('furnish' as BuildTool))
              || (tool === ('wizard' as BuildTool) && activeTool === ('wizard' as BuildTool))
              || (tool === ('import' as BuildTool) && activeTool === ('import' as BuildTool));
            return (
              <button key={tool} onClick={() => setBuildTool(tool)}
                className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-xs transition-colors min-w-[3rem]',
                  isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* Primary 3-tab bar */}
      <div className="flex items-center justify-center gap-1 px-2 py-1.5">
        {([
          { key: 'planritning' as BuildTab, label: 'Planritning', icon: Ruler },
          { key: 'inredning' as BuildTab, label: 'Inredning', icon: Sofa },
          { key: 'bibliotek' as BuildTab, label: 'Bibliotek', icon: Archive },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => handleTabClick(key)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]',
              activeTab === key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30')}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
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
  const isBibliotek = activeTab === 'bibliotek';
  const isInredning = activeTab === 'inredning';

  // In Inredning: always show catalog as primary surface, device panel overlays when device tool active
  const showDevicePanel = !isBibliotek && (activeTool.startsWith('place-') || activeTool === 'vacuum-zone' || activeTool === ('place-vacuum-dock' as any));
  const showImportPanel = !isBibliotek && activeTab === 'planritning' && isImported;
  // In Inredning: catalog is always visible (primary surface). In Planritning: only when furnish/wizard tool active
  const showCatalogPanel = !isBibliotek && (
    isInredning
      ? !showDevicePanel  // always show unless device tool is active
      : (activeTool === ('furnish' as any) || activeTool === ('wizard' as any))
  );

  // Soft room context hint for Inredning
  const selection = useAppStore((s) => s.build.selection);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const rooms = useAppStore((s) => {
    if (!activeFloorId) return [];
    const floor = s.layout.floors.find((f: any) => f.id === activeFloorId);
    return floor?.rooms || [];
  });
  const selectedRoom = selection.type === 'room' && selection.id
    ? rooms.find((r: any) => r.id === selection.id)
    : null;

  // Determine catalog source filter
  const catalogSourceFilter = activeTool === ('wizard' as any) ? 'wizard' as const : 'all' as const;

  return (
    <div className="w-full h-full relative flex flex-col">
      <BuildTopToolbar />
      {isBibliotek ? (
        /* Bibliotek: dedicated workspace, no canvas */
        <div className="flex-1 overflow-hidden">
          <BibliotekWorkspace />
        </div>
      ) : (
        /* Planritning / Inredning: canvas-based */
        <div className="flex-1 relative overflow-hidden">
          {/* Device placement tools (overlays catalog when active) */}
          {showDevicePanel && (
            <div className="absolute left-0 top-0 bottom-0 w-[220px] bg-card/95 backdrop-blur-sm border-r border-border z-20 overflow-y-auto py-3">
              <InlinedDevicePlacementTools />
            </div>
          )}
          {/* Import tools (Planritning only) */}
          {showImportPanel && !showDevicePanel && !showCatalogPanel && (
            <div className="absolute left-0 top-0 bottom-0 w-[220px] bg-card/95 backdrop-blur-sm border-r border-border z-20 overflow-y-auto py-3">
              <Suspense fallback={null}>
                <ImportTools />
              </Suspense>
            </div>
          )}
          {/* Asset catalog — primary surface in Inredning */}
          {showCatalogPanel && (
            <div className={cn(
              "absolute left-0 top-0 bottom-0 bg-card/95 backdrop-blur-sm border-r border-border z-20 overflow-y-auto flex flex-col",
              isInredning ? "w-[300px]" : "w-[260px] py-3 px-2"
            )}>
              {/* Soft room context hint (Inredning only) */}
              {isInredning && (
                <div className="px-3 py-3 border-b border-border/40 bg-secondary/10">
                  <div className="flex items-center gap-2">
                    <Sofa className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Inredning</span>
                    {selectedRoom && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 ml-auto gap-1">
                        <MapPin size={9} />
                        {(selectedRoom as any).name}
                      </Badge>
                    )}
                  </div>
                  {selectedRoom && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Förslag visas för {(selectedRoom as any).name}, men alla tillgångar kan placeras fritt.
                    </p>
                  )}
                </div>
              )}
              <div className={isInredning ? "flex-1 overflow-y-auto px-2 py-3" : ""}>
                <AssetCatalog initialSourceFilter={catalogSourceFilter} />
              </div>
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
      )}
      {!isBibliotek && <BuildCatalogRow />}
      <DesignTabBar />
    </div>
  );
}
