import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Trash2, Lock, Unlock, RotateCw, Move, ZoomIn } from 'lucide-react';

import { useCanvas2DHitTest } from './hooks/useCanvas2DHitTest';
import { useCanvas2DDraw } from './hooks/useCanvas2DDraw';
import { useCanvas2DTools } from './hooks/useCanvas2DTools';

export default function BuildCanvas2D({ overlayMode = false }: { overlayMode?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(40);
  const [cursorWorld, setCursorWorld] = useState<[number, number] | null>(null);

  // Measure tool state
  const [measureStart, setMeasureStart] = useState<[number, number] | null>(null);
  const [measureEnd, setMeasureEnd] = useState<[number, number] | null>(null);

  // Room drawing state
  const [roomDrawStart, setRoomDrawStart] = useState<[number, number] | null>(null);
  const [roomDrawEnd, setRoomDrawEnd] = useState<[number, number] | null>(null);

  // Vacuum zone nodes
  const [vacZoneNodes, setVacZoneNodes] = useState<[number, number][]>([]);

  // Reference drawing image
  const refImgRef = useRef<HTMLImageElement | null>(null);
  const [refImgLoaded, setRefImgLoaded] = useState(false);

  // Store selectors
  const activeTool = useAppStore((s) => s.build.activeTool);
  const grid = useAppStore((s) => s.build.grid);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const selection = useAppStore((s) => s.build.selection);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const propItems = useAppStore((s) => s.props.items);
  const showGhost = useAppStore((s) => s.build.view.showOtherFloorsGhost);
  const deviceMarkers = useAppStore((s) => s.devices.markers);
  const homeGeometry = useAppStore((s) => s.homeGeometry);
  const setImportOverlaySync = useAppStore((s) => s.setImportOverlaySync);
  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const setSelection = useAppStore((s) => s.setSelection);

  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const stairs = floor?.stairs ?? [];
  const floorProps = propItems.filter((p) => p.floorId === activeFloorId);
  const ghostFloors = showGhost ? floors.filter((f) => f.id !== activeFloorId) : [];
  const referenceDrawing = floor?.referenceDrawing;

  // Load reference image
  useEffect(() => {
    if (!referenceDrawing?.url) {
      refImgRef.current = null;
      setRefImgLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      refImgRef.current = img;
      setRefImgLoaded(true);
    };
    img.src = referenceDrawing.url;
  }, [referenceDrawing?.url]);

  // World <-> Screen conversions
  const worldToScreen = useCallback(
    (wx: number, wz: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const cx = canvas.width / (window.devicePixelRatio || 1) / 2;
      const cy = canvas.height / (window.devicePixelRatio || 1) / 2;
      return [cx + (wx - offset[0]) * zoom, cy + (wz - offset[1]) * zoom];
    },
    [offset, zoom]
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const cx = canvas.width / (window.devicePixelRatio || 1) / 2;
      const cy = canvas.height / (window.devicePixelRatio || 1) / 2;
      return [(sx - cx) / zoom + offset[0], (sy - cy) / zoom + offset[1]];
    },
    [offset, zoom]
  );

  const snapToGrid = useCallback(
    (x: number, z: number): [number, number] => {
      if (!grid.enabled || grid.snapMode === 'off') return [x, z];
      const s = grid.sizeMeters;
      return [Math.round(x / s) * s, Math.round(z / s) * s];
    },
    [grid]
  );

  // ─── Hit testing ───
  const { findNodeAt, findConnectedWalls, findPropAt, findWallAt, findOpeningAt, findRoomAt } =
    useCanvas2DHitTest({ walls, rooms, floorProps, screenToWorld, zoom });

  // ─── Canvas drawing ───
  useCanvas2DDraw({
    canvasRef, containerRef, offset, zoom, overlayMode, grid, walls, rooms, stairs,
    selection, activeTool, wallDrawing, cursorWorld, ghostFloors, referenceDrawing,
    refImgRef, refImgLoaded, floorProps, deviceMarkers, activeFloorId,
    measureStart, measureEnd, roomDrawStart, roomDrawEnd, homeGeometry,
    vacZoneNodes, floor, worldToScreen, snapToGrid, setImportOverlaySync,
  });

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tool = useAppStore.getState().build.activeTool;
      const drawing = useAppStore.getState().build.wallDrawing;

      if (e.key === 'Escape') {
        if (drawing.isDrawing) {
          setWallDrawing({ isDrawing: false, nodes: [] });
          e.preventDefault();
        } else {
          setSelection({ type: null, id: null });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && drawing.isDrawing) {
        e.preventDefault();
        if (drawing.nodes.length <= 1) {
          setWallDrawing({ isDrawing: false, nodes: [] });
        } else {
          setWallDrawing({ nodes: drawing.nodes.slice(0, -1) });
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setWallDrawing, setSelection]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      setOffset((o) => [...o] as [number, number]);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ─── Pointer/touch/wheel handlers ───
  const {
    handlePointerDown, handlePointerMove, handlePointerUp,
    handleDoubleClick, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd,
    getCursor,
  } = useCanvas2DTools({
    canvasRef, screenToWorld, worldToScreen, snapToGrid, zoom, offset, setOffset, setZoom,
    setCursorWorld, findNodeAt, findConnectedWalls, findPropAt, findWallAt, findOpeningAt, findRoomAt,
    walls, rooms, stairs, floorProps, deviceMarkers, floor, floors, activeFloorId, activeTool,
    wallDrawing, selection,
    measureStart, measureEnd, setMeasureStart, setMeasureEnd,
    roomDrawStart, roomDrawEnd, setRoomDrawStart, setRoomDrawEnd,
    vacZoneNodes, setVacZoneNodes,
  });

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden"
      style={{ touchAction: 'none', zIndex: overlayMode ? 1 : undefined, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: getCursor() }}
      />

      {/* Status bar */}
      <div className="absolute bottom-2 left-2 z-10 glass-panel rounded-lg px-3 py-1.5 text-[10px] text-muted-foreground flex gap-3 flex-wrap">
        <span>Mittenklick: panorera</span>
        <span>Scroll: zooma</span>
        {activeTool === 'wall' && wallDrawing.isDrawing && (
          <span className="text-primary font-medium">Dubbelklicka: avsluta · Esc: avbryt · Ctrl+Z: ångra punkt</span>
        )}
        {activeTool === 'wall' && !wallDrawing.isDrawing && (
          <span className="text-primary font-medium">Klicka för att börja rita vägg</span>
        )}
        {activeTool === 'room' && (
          <span className="text-primary font-medium">Dra för att rita rum</span>
        )}
        {activeTool === 'select' && (
          <span className="text-primary font-medium">Dra noder/väggar · Dubbelklicka vägg = dela</span>
        )}
        {(activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage') && (
          <span className="text-primary font-medium">Klicka på vägg för att placera {activeTool === 'door' ? 'dörr' : activeTool === 'garage-door' ? 'garageport' : activeTool === 'passage' ? 'passage' : 'fönster'}</span>
        )}
        {activeTool === 'measure' && !measureStart && (
          <span className="text-primary font-medium">Klicka för att börja mäta</span>
        )}
        {activeTool === 'measure' && measureStart && !measureEnd && (
          <span className="text-primary font-medium">Klicka för att avsluta mätning</span>
        )}
        {activeTool === 'measure' && measureStart && measureEnd && (
          <span className="text-primary font-medium">Klicka för ny mätning</span>
        )}
        {activeTool === 'stairs' && (
          <span className="text-primary font-medium">Klicka för att placera trappa</span>
        )}
        {activeTool === 'place-vacuum-dock' && (
          <span className="text-primary font-medium">Klicka för att placera docka</span>
        )}
        {activeTool === 'vacuum-zone' && vacZoneNodes.length === 0 && (
          <span className="text-primary font-medium">Klicka för att börja rita robotzon</span>
        )}
        {activeTool === 'vacuum-zone' && vacZoneNodes.length > 0 && (
          <span className="text-primary font-medium">Dubbelklicka för att stänga zon ({vacZoneNodes.length} pkt)</span>
        )}
        {showGhost && (
          <span className="text-muted-foreground/60">Visar andra våningars väggar som skuggor</span>
        )}
      </div>

      {/* ─── Planritning (reference drawing) controls ─── */}
      {referenceDrawing?.url && (activeTool === 'import' || useAppStore.getState().build.tab === 'import') && (
        <ReferenceControls />
      )}
    </div>
  );
}

function ReferenceControls() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const updateReferenceDrawing = useAppStore((s) => s.updateReferenceDrawing);
  const setReferenceDrawing = useAppStore((s) => s.setReferenceDrawing);

  const floor = floors.find((f) => f.id === activeFloorId);
  const ref = floor?.referenceDrawing;
  if (!ref || !activeFloorId) return null;

  const update = (changes: Partial<typeof ref>) => updateReferenceDrawing(activeFloorId, changes);

  return (
    <div className="absolute top-2 right-2 w-56 bg-background/95 backdrop-blur border border-border rounded-lg p-3 flex flex-col gap-3 shadow-lg z-20">
      <span className="text-xs font-semibold text-foreground">Planritning</span>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">Opacitet</Label>
        <Slider min={0} max={1} step={0.05} value={[ref.opacity]} onValueChange={([v]) => update({ opacity: v })} />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><ZoomIn className="w-3 h-3" />Skala (px/m)</Label>
        <div className="flex items-center gap-2">
          <Slider min={10} max={500} step={1} value={[ref.scale]} onValueChange={([v]) => update({ scale: v })} className="flex-1" />
          <input type="number" value={ref.scale} onChange={(e) => update({ scale: Number(e.target.value) || 100 })} className="w-14 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><RotateCw className="w-3 h-3" />Rotation (°)</Label>
        <div className="flex items-center gap-2">
          <Slider min={0} max={360} step={1} value={[ref.rotation]} onValueChange={([v]) => update({ rotation: v })} className="flex-1" />
          <input type="number" value={ref.rotation} onChange={(e) => update({ rotation: Number(e.target.value) || 0 })} className="w-14 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Move className="w-3 h-3" />Position</Label>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground">X</label>
          <input type="number" step={0.1} value={ref.offsetX} onChange={(e) => update({ offsetX: Number(e.target.value) || 0 })} className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
          <label className="text-[10px] text-muted-foreground">Y</label>
          <input type="number" step={0.1} value={ref.offsetY} onChange={(e) => update({ offsetY: Number(e.target.value) || 0 })} className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ref.locked ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
          <Label className="text-[10px] text-muted-foreground">Lås</Label>
          <Switch checked={ref.locked} onCheckedChange={(v) => update({ locked: v })} className="scale-75" />
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => setReferenceDrawing(activeFloorId, undefined)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
