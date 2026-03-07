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
  Import, Eraser, Upload, Search, FileImage, Box, Ruler, Trash2,
  Lightbulb, ToggleLeft, Activity, Thermometer, Camera, Bot, CookingPot, WashingMachine, Lock, Plug, Refrigerator, Monitor, ChevronDown, ChevronRight, Link2, Fan, ShieldAlert, Droplets, Flame, Bell, Grip, Wifi, Trees, Speaker, Music,
} from 'lucide-react';
import { domainToKind } from '../../lib/haDomainMapping';
import VacuumMappingTools from './devices/VacuumMappingTools';
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
  const removeFromCatalog = useAppStore((s) => s.removeFromCatalog);
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
        <div key={item.id} className="relative group">
          <button onClick={() => handlePlace(item)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs text-foreground transition-colors">
            <Box className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px]">{item.name}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); removeFromCatalog(item.id); toast.success(`Borttagen: ${item.name}`); }}
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-5 h-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
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
  const showCatalog = activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage' || activeTool === ('furnish' as any) || activeTool === ('import' as any);
  if (!showCatalog) return null;
  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-2 py-1.5 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {(activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage') && <OpeningCatalog type={activeTool as any} />}
        {activeTool === ('furnish' as any) && <FurnishCatalog />}
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
