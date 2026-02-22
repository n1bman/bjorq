import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { WallSegment } from '@/store/types';

const generateId = () => Math.random().toString(36).slice(2, 10);

const COLORS = {
  grid: '#2a2d35',
  gridMajor: '#3a3d45',
  wall: '#e0e0e0',
  wallSelected: '#e8a838',
  wallDrawing: '#4a9eff',
  wallDrawingDash: '#4a9eff',
  node: '#ffffff',
  room: 'rgba(74, 158, 255, 0.08)',
  roomStroke: 'rgba(74, 158, 255, 0.3)',
  cursor: '#e8a838',
  floorplanOverlay: 0.3,
};

export default function BuildCanvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(40); // pixels per meter
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<[number, number]>([0, 0]);
  const [cursorWorld, setCursorWorld] = useState<[number, number] | null>(null);

  const activeTool = useAppStore((s) => s.build.activeTool);
  const grid = useAppStore((s) => s.build.grid);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const selection = useAppStore((s) => s.build.selection);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);

  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const addWall = useAppStore((s) => s.addWall);
  const setSelection = useAppStore((s) => s.setSelection);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const deleteWall = useAppStore((s) => s.deleteWall);

  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];

  // World <-> Screen conversions
  const worldToScreen = useCallback(
    (wx: number, wz: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      return [cx + (wx - offset[0]) * zoom, cy + (wz - offset[1]) * zoom];
    },
    [offset, zoom]
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
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

  // Find wall under screen point
  const findWallAt = useCallback(
    (sx: number, sy: number): WallSegment | null => {
      const [wx, wz] = screenToWorld(sx, sy);
      const threshold = 0.3; // meters
      for (const wall of walls) {
        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const len2 = dx * dx + dz * dz;
        if (len2 === 0) continue;
        let t = ((wx - wall.from[0]) * dx + (wz - wall.from[1]) * dz) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = wall.from[0] + t * dx;
        const pz = wall.from[1] + t * dz;
        const dist = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2);
        if (dist < threshold) return wall;
      }
      return null;
    },
    [walls, screenToWorld]
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.fillStyle = 'hsl(220, 20%, 10%)';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    if (grid.enabled) {
      const gridPx = grid.sizeMeters * zoom;
      if (gridPx > 4) {
        const [ox, oy] = worldToScreen(0, 0);
        const startX = ((ox % gridPx) - gridPx) % gridPx;
        const startY = ((oy % gridPx) - gridPx) % gridPx;

        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = startX; x < w; x += gridPx) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = startY; y < h; y += gridPx) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Major grid lines
        const majorPx = gridPx * 10;
        if (majorPx > 20) {
          const majorStartX = ((ox % majorPx) - majorPx) % majorPx;
          const majorStartY = ((oy % majorPx) - majorPx) % majorPx;
          ctx.strokeStyle = COLORS.gridMajor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = majorStartX; x < w; x += majorPx) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
          }
          for (let y = majorStartY; y < h; y += majorPx) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
          }
          ctx.stroke();
        }
      }
    }

    // Draw rooms
    for (const room of rooms) {
      if (!room.polygon || room.polygon.length < 3) continue;
      ctx.beginPath();
      const [sx, sy] = worldToScreen(room.polygon[0][0], room.polygon[0][1]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < room.polygon.length; i++) {
        const [px, py] = worldToScreen(room.polygon[i][0], room.polygon[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = COLORS.room;
      ctx.fill();
      ctx.strokeStyle = COLORS.roomStroke;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Room name
      const cx2 = room.polygon.reduce((a, p) => a + p[0], 0) / room.polygon.length;
      const cz2 = room.polygon.reduce((a, p) => a + p[1], 0) / room.polygon.length;
      const [tx, ty] = worldToScreen(cx2, cz2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.name, tx, ty);
    }

    // Draw walls
    for (const wall of walls) {
      const [x1, y1] = worldToScreen(wall.from[0], wall.from[1]);
      const [x2, y2] = worldToScreen(wall.to[0], wall.to[1]);

      const isSelected = selection.type === 'wall' && selection.id === wall.id;

      // Wall line with thickness
      const thickPx = wall.thickness * zoom;
      ctx.strokeStyle = isSelected ? COLORS.wallSelected : COLORS.wall;
      ctx.lineWidth = Math.max(2, thickPx);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Openings
      for (const op of wall.openings) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const ox = x1 + dx * op.offset;
        const oy = y1 + dy * op.offset;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;
        const halfW = (op.width * zoom) / 2;

        ctx.strokeStyle = op.type === 'door' ? '#e8a838' : '#4a9eff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox + nx * halfW, oy + ny * halfW);
        ctx.lineTo(ox - nx * halfW, oy - ny * halfW);
        ctx.stroke();
      }

      // Nodes
      ctx.fillStyle = COLORS.node;
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wall drawing preview
    if (wallDrawing.isDrawing && wallDrawing.nodes.length > 0) {
      ctx.strokeStyle = COLORS.wallDrawing;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      const [sx0, sy0] = worldToScreen(wallDrawing.nodes[0][0], wallDrawing.nodes[0][1]);
      ctx.moveTo(sx0, sy0);
      for (let i = 1; i < wallDrawing.nodes.length; i++) {
        const [sx2, sy2] = worldToScreen(wallDrawing.nodes[i][0], wallDrawing.nodes[i][1]);
        ctx.lineTo(sx2, sy2);
      }
      if (cursorWorld) {
        const snapped = snapToGrid(cursorWorld[0], cursorWorld[1]);
        const [cx, cy] = worldToScreen(snapped[0], snapped[1]);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Nodes
      for (const node of wallDrawing.nodes) {
        const [nx, ny] = worldToScreen(node[0], node[1]);
        ctx.fillStyle = COLORS.wallDrawing;
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cursor crosshair
    if (cursorWorld && (activeTool === 'wall' || activeTool === 'room')) {
      const snapped = snapToGrid(cursorWorld[0], cursorWorld[1]);
      const [cx, cy] = worldToScreen(snapped[0], snapped[1]);
      ctx.strokeStyle = COLORS.cursor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      // trigger re-render
      setOffset((o) => [...o] as [number, number]);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Mouse handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Middle button or space+click = pan
      if (e.button === 1) {
        setIsPanning(true);
        setPanStart([e.clientX, e.clientY]);
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      if (activeTool === 'wall' && activeFloorId) {
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);

        if (!wallDrawing.isDrawing) {
          setWallDrawing({ isDrawing: true, nodes: [snapped] });
        } else {
          setWallDrawing({ nodes: [...wallDrawing.nodes, snapped] });
        }
      } else if (activeTool === 'select') {
        const wall = findWallAt(sx, sy);
        if (wall) {
          setSelection({ type: 'wall', id: wall.id });
        } else {
          setSelection({ type: null, id: null });
        }
      } else if (activeTool === 'erase' && activeFloorId) {
        const wall = findWallAt(sx, sy);
        if (wall) {
          pushUndo();
          deleteWall(activeFloorId, wall.id);
        }
      }
    },
    [activeTool, activeFloorId, wallDrawing, screenToWorld, snapToGrid, setWallDrawing, findWallAt, setSelection, pushUndo, deleteWall]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (isPanning) {
        const dx = (e.clientX - panStart[0]) / zoom;
        const dy = (e.clientY - panStart[1]) / zoom;
        setOffset([offset[0] - dx, offset[1] - dy]);
        setPanStart([e.clientX, e.clientY]);
        return;
      }

      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const [wx, wz] = screenToWorld(sx, sy);
      setCursorWorld([wx, wz]);
    },
    [isPanning, panStart, zoom, offset, screenToWorld]
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      pushUndo();
      const nodes = wallDrawing.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
        const wall: WallSegment = {
          id: generateId(),
          from: nodes[i],
          to: nodes[i + 1],
          height: floor?.heightMeters ?? 2.5,
          thickness: 0.15,
          openings: [],
        };
        addWall(activeFloorId, wall);
      }
      setWallDrawing({ isDrawing: false, nodes: [] });
      setCursorWorld(null);
    }
  }, [activeTool, wallDrawing, activeFloorId, floor, pushUndo, addWall, setWallDrawing]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(5, Math.min(200, z * factor)));
    },
    []
  );

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden"
      style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ cursor: activeTool === 'wall' ? 'crosshair' : activeTool === 'erase' ? 'not-allowed' : 'default' }}
      />

      {/* Status bar */}
      <div className="absolute bottom-2 left-2 z-10 glass-panel rounded-lg px-3 py-1.5 text-[10px] text-muted-foreground flex gap-3">
        <span>Mittenklick: panorera</span>
        <span>Scroll: zooma</span>
        {activeTool === 'wall' && wallDrawing.isDrawing && (
          <span className="text-primary font-medium">Dubbelklicka för att avsluta</span>
        )}
        {activeTool === 'wall' && !wallDrawing.isDrawing && (
          <span className="text-primary font-medium">Klicka för att börja rita vägg</span>
        )}
      </div>
    </div>
  );
}
