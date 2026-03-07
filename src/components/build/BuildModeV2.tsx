import { lazy, Suspense, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import BuildTopToolbar from './BuildTopToolbar';
import BuildInspector from './BuildInspector';
import BuildCanvas2D from './BuildCanvas2D';
import BuildScene3D from './BuildScene3D';
import type { BuildTool, BuildTab } from '../../store/types';
import { openingPresets } from '../../lib/openingPresets';
import { getAllMaterials } from '../../lib/materials';
import {
  MousePointer2, Minus, Square, DoorOpen, PanelTop,
  Warehouse, Footprints, Paintbrush, Sofa, Cpu,
  Import, Eraser, Upload, Search, FileImage, Box,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const ImportPreview3D = lazy(() => import('./ImportPreview3D'));

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

function FurnishCatalog() {
  const catalog = useAppStore((s) => s.props.catalog);
  const addProp = useAppStore((s) => s.addProp);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => catalog.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [catalog, search],
  );
  const handlePlace = (item: typeof catalog[0]) => {
    if (!activeFloorId) { toast.error('Välj en våning först'); return; }
    addProp({ id: generateId(), catalogId: item.id, name: item.name, floorId: activeFloorId, url: item.url, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
    setBuildTool('select');
    toast.success(`Placerat: ${item.name}`);
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const name = file.name.replace(/\.[^.]+$/, '');
      useAppStore.getState().addToCatalog({ id: generateId(), name, url: blobUrl, fileData: base64, source: 'user' as const, category: 'imported' } as any);
      toast.success(`Importerad: ${name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  return (
    <>
      <div className="flex items-center gap-1 px-2 border border-border rounded-md bg-muted/50">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök möbler…" className="bg-transparent text-xs py-1 w-24 outline-none text-foreground placeholder:text-muted-foreground" />
      </div>
      {filtered.map((item) => (
        <button key={item.id} onClick={() => handlePlace(item)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs text-foreground transition-colors">
          <Box className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px]">{item.name}</span>
        </button>
      ))}
      <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-md border border-dashed border-border hover:bg-muted text-xs text-muted-foreground transition-colors">
        <Upload className="w-5 h-5" />
        <span className="text-[10px]">Ladda upp</span>
      </button>
      <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleUpload} />
    </>
  );
}

function ImportCatalog() {
  const floorplanRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
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
  const handleModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      useAppStore.getState().setImportedModel({ url: blobUrl, fileData: base64 });
      toast.success('3D-modell importerad');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const cards = [
    { label: 'Planritning', icon: FileImage, accept: '.png,.jpg,.jpeg', ref: floorplanRef, handler: handleFloorplan },
    { label: '3D-modell', icon: Box, accept: '.glb,.gltf', ref: modelRef, handler: handleModel },
  ];
  return (
    <>
      {cards.map((card) => (
        <div key={card.label}>
          <button onClick={() => card.ref.current?.click()} className="flex flex-col items-center gap-1 px-4 py-2 rounded-md border border-border hover:bg-muted text-xs text-foreground transition-colors">
            <card.icon className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px]">{card.label}</span>
          </button>
          <input ref={card.ref} type="file" accept={card.accept} className="hidden" onChange={card.handler} />
        </div>
      ))}
    </>
  );
}

function DeviceCatalog() {
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const activeTool = useAppStore((s) => s.build.activeTool);
  const devices = [
    { tool: 'place-light' as const, label: 'Lampa' },
    { tool: 'place-switch' as const, label: 'Strömbrytare' },
    { tool: 'place-sensor' as const, label: 'Sensor' },
    { tool: 'place-climate' as const, label: 'Klimat' },
    { tool: 'place-camera' as const, label: 'Kamera' },
    { tool: 'place-media-screen' as const, label: 'Skärm' },
    { tool: 'place-speaker' as const, label: 'Högtalare' },
    { tool: 'place-vacuum' as const, label: 'Dammsugare' },
    { tool: 'place-door-lock' as const, label: 'Lås' },
    { tool: 'place-fan' as const, label: 'Fläkt' },
    { tool: 'place-alarm' as const, label: 'Larm' },
    { tool: 'place-soundbar' as const, label: 'Soundbar' },
    { tool: 'place-cover' as const, label: 'Persienn' },
    { tool: 'place-power-outlet' as const, label: 'Uttag' },
    { tool: 'place-garage-door' as const, label: 'Garageport' },
    { tool: 'place-lawn-mower' as const, label: 'Gräsklippare' },
  ];
  return (
    <>
      {devices.map((d) => (
        <button key={d.tool} onClick={() => setBuildTool(d.tool)}
          className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-md border text-xs transition-colors',
            activeTool === d.tool ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-foreground')}>
          <span className="text-[10px]">{d.label}</span>
        </button>
      ))}
    </>
  );
}

function BuildCatalogRow() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const showCatalog = activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage' || activeTool === ('furnish' as any) || activeTool === ('import' as any) || activeTool.startsWith('place-');
  if (!showCatalog) return null;
  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-2 py-1.5 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {(activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage') && <OpeningCatalog type={activeTool as any} />}
        {activeTool === ('furnish' as any) && <FurnishCatalog />}
        {activeTool === ('furnish' as any) && <FurnishCatalog />}
        {activeTool === ('import' as any) && <ImportCatalog />}
        {activeTool.startsWith('place-') && <DeviceCatalog />}
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
  { tool: 'window', tab: 'structure', label: 'Fönster', icon: PanelTop, hasCatalog: true },
  { tool: 'garage-door', tab: 'structure', label: 'Garage', icon: Warehouse, hasCatalog: true },
  { tool: 'stairs', tab: 'structure', label: 'Trappa', icon: Footprints },
  { tool: 'paint', tab: 'structure', label: 'Måla', icon: Paintbrush, hasCatalog: true },
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

  return (
    <div className="w-full h-full relative flex flex-col">
      <BuildTopToolbar />
      <div className="flex-1 relative overflow-hidden">
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
