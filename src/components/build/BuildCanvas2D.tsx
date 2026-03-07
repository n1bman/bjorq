import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getMaterialById } from '../../lib/materials';
import { angleLock, snapToNode } from '../../lib/buildUtils';
import type { WallSegment } from '../../store/types';
import { openingPresets } from '../../lib/openingPresets';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Trash2, Lock, Unlock, RotateCw, Move, ZoomIn } from 'lucide-react';
const generateId = () => Math.random().toString(36).slice(2, 10);

const COLORS = {
  grid: '#2a2d35',
  gridMajor: '#3a3d45',
  wall: '#e0e0e0',
  wallSelected: '#e8a838',
  wallDrawing: '#4a9eff',
  wallDrawingDash: '#4a9eff',
  node: '#ffffff',
  nodeHover: '#e8a838',
  room: 'rgba(74, 158, 255, 0.08)',
  roomStroke: 'rgba(74, 158, 255, 0.3)',
  roomSelected: 'rgba(74, 158, 255, 0.2)',
  roomSelectedStroke: '#4a9eff',
  cursor: '#e8a838',
  ghost: 'rgba(255,255,255,0.12)',
  stair: 'rgba(232, 168, 56, 0.4)',
  stairStroke: '#e8a838',
  measure: '#4ade80',
  opening: '#e8a838',
  openingWindow: '#4a9eff',
  openingSelected: '#ff6b6b',
  roomDrawPreview: 'rgba(74, 158, 255, 0.15)',
  roomDrawStroke: '#4a9eff',
};

// Point-in-polygon test
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Distance from point to line segment, returns [distance, t parameter 0-1]
function pointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return [Math.sqrt((px - ax) ** 2 + (py - ay) ** 2), 0];
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return [Math.sqrt((px - cx) ** 2 + (py - cy) ** 2), t];
}

type DragNode = { wallId: string; endpoint: 'from' | 'to'; connectedWalls: { wallId: string; endpoint: 'from' | 'to' }[] } | null;
type DragWall = { wallId: string; startFrom: [number, number]; startTo: [number, number]; mouseStart: [number, number] } | null;
type DragOpening = { wallId: string; openingId: string } | null;

export default function BuildCanvas2D({ overlayMode = false }: { overlayMode?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(40);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<[number, number]>([0, 0]);
  const [cursorWorld, setCursorWorld] = useState<[number, number] | null>(null);

  // Measure tool state
  const [measureStart, setMeasureStart] = useState<[number, number] | null>(null);
  const [measureEnd, setMeasureEnd] = useState<[number, number] | null>(null);

  // Touch state
  const [touchPinch, setTouchPinch] = useState<{ dist: number; zoom: number; center: [number, number] } | null>(null);

  // Drag states
  const [dragNode, setDragNode] = useState<DragNode>(null);
  const [dragWall, setDragWall] = useState<DragWall>(null);
  const [dragOpening, setDragOpening] = useState<DragOpening>(null);
  const [isDraggingProp, setIsDraggingProp] = useState(false);
  const [dragPropId, setDragPropId] = useState<string | null>(null);
  const [dragPropOffset, setDragPropOffset] = useState<[number, number]>([0, 0]);
  const [dragDeviceId, setDragDeviceId] = useState<string | null>(null);
  const [dragDeviceOffset, setDragDeviceOffset] = useState<[number, number]>([0, 0]);

  // Room drawing state
  const [roomDrawStart, setRoomDrawStart] = useState<[number, number] | null>(null);
  const [roomDrawEnd, setRoomDrawEnd] = useState<[number, number] | null>(null);

  // Reference drawing image
  const refImgRef = useRef<HTMLImageElement | null>(null);
  const [refImgLoaded, setRefImgLoaded] = useState(false);

  const activeTool = useAppStore((s) => s.build.activeTool);
  const vacuumZoneDrawing = useRef<[number, number][]>([]);
  const [vacZoneNodes, setVacZoneNodes] = useState<[number, number][]>([]);
  const grid = useAppStore((s) => s.build.grid);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const selection = useAppStore((s) => s.build.selection);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const propItems = useAppStore((s) => s.props.items);
  const showGhost = useAppStore((s) => s.build.view.showOtherFloorsGhost);
  const deviceMarkers = useAppStore((s) => s.devices.markers);
  const addDevice = useAppStore((s) => s.addDevice);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const homeGeometry = useAppStore((s) => s.homeGeometry);
  const setVacuumDock = useAppStore((s) => s.setVacuumDock);
  const addVacuumZone = useAppStore((s) => s.addVacuumZone);
  const setImportOverlaySync = useAppStore((s) => s.setImportOverlaySync);

  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const addWall = useAppStore((s) => s.addWall);
  const setSelection = useAppStore((s) => s.setSelection);
  const pushUndo = useAppStore((s) => s.pushUndo);
  const deleteWall = useAppStore((s) => s.deleteWall);
  const updateWallNode = useAppStore((s) => s.updateWallNode);
  const splitWall = useAppStore((s) => s.splitWall);
  const addOpening = useAppStore((s) => s.addOpening);
  const updateOpeningOffset = useAppStore((s) => s.updateOpeningOffset);
  const updateProp = useAppStore((s) => s.updateProp);
  const addStair = useAppStore((s) => s.addStair);
  const addRoomFromRect = useAppStore((s) => s.addRoomFromRect);
  const updateRoomPolygons = useAppStore((s) => s.updateRoomPolygons);

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

  // Find wall node (endpoint) near screen position
  const findNodeAt = useCallback(
    (sx: number, sy: number): { wallId: string; endpoint: 'from' | 'to'; pos: [number, number] } | null => {
      const threshold = 12 / zoom; // world units
      const [wx, wz] = screenToWorld(sx, sy);
      for (const wall of walls) {
        const df = Math.sqrt((wx - wall.from[0]) ** 2 + (wz - wall.from[1]) ** 2);
        if (df < threshold) return { wallId: wall.id, endpoint: 'from', pos: wall.from };
        const dt = Math.sqrt((wx - wall.to[0]) ** 2 + (wz - wall.to[1]) ** 2);
        if (dt < threshold) return { wallId: wall.id, endpoint: 'to', pos: wall.to };
      }
      return null;
    },
    [walls, screenToWorld, zoom]
  );

  // Find connected walls that share the same node position
  const findConnectedWalls = useCallback(
    (pos: [number, number], excludeWallId: string): { wallId: string; endpoint: 'from' | 'to' }[] => {
      const eps = 0.01;
      const result: { wallId: string; endpoint: 'from' | 'to' }[] = [];
      for (const wall of walls) {
        if (wall.id === excludeWallId) continue;
        if (Math.abs(wall.from[0] - pos[0]) < eps && Math.abs(wall.from[1] - pos[1]) < eps) {
          result.push({ wallId: wall.id, endpoint: 'from' });
        }
        if (Math.abs(wall.to[0] - pos[0]) < eps && Math.abs(wall.to[1] - pos[1]) < eps) {
          result.push({ wallId: wall.id, endpoint: 'to' });
        }
      }
      return result;
    },
    [walls]
  );

  const findPropAt = useCallback(
    (sx: number, sy: number) => {
      const [wx, wz] = screenToWorld(sx, sy);
      const threshold = 0.5;
      for (const prop of floorProps) {
        const dist = Math.sqrt((wx - prop.position[0]) ** 2 + (wz - prop.position[2]) ** 2);
        if (dist < threshold) return prop;
      }
      return null;
    },
    [floorProps, screenToWorld]
  );

  const findWallAt = useCallback(
    (sx: number, sy: number): WallSegment | null => {
      const [wx, wz] = screenToWorld(sx, sy);
      const threshold = 0.3;
      for (const wall of walls) {
        const [dist] = pointToSegment(wx, wz, wall.from[0], wall.from[1], wall.to[0], wall.to[1]);
        if (dist < threshold) return wall;
      }
      return null;
    },
    [walls, screenToWorld]
  );

  // Find opening on a wall near click position
  const findOpeningAt = useCallback(
    (sx: number, sy: number): { wall: WallSegment; openingId: string } | null => {
      const [wx, wz] = screenToWorld(sx, sy);
      const threshold = 0.4;
      for (const wall of walls) {
        for (const op of wall.openings) {
          const opx = wall.from[0] + (wall.to[0] - wall.from[0]) * op.offset;
          const opz = wall.from[1] + (wall.to[1] - wall.from[1]) * op.offset;
          const dist = Math.sqrt((wx - opx) ** 2 + (wz - opz) ** 2);
          if (dist < threshold) return { wall, openingId: op.id };
        }
      }
      return null;
    },
    [walls, screenToWorld]
  );

  const findRoomAt = useCallback(
    (sx: number, sy: number) => {
      const [wx, wz] = screenToWorld(sx, sy);
      for (const room of rooms) {
        if (room.polygon && room.polygon.length >= 3 && pointInPolygon(wx, wz, room.polygon)) {
          return room;
        }
      }
      return null;
    },
    [rooms, screenToWorld]
  );

  // ─── Draw ───
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
    if (overlayMode) {
      ctx.clearRect(0, 0, w, h);
    } else {
      ctx.fillStyle = 'hsl(220, 20%, 10%)';
      ctx.fillRect(0, 0, w, h);
    }

    // Sync overlay camera
    if (overlayMode) {
      setImportOverlaySync({ zoom, offsetX: offset[0], offsetY: offset[1] });
    }

    // Draw grid
    if (grid.enabled) {
      const gridPx = grid.sizeMeters * zoom;
      if (gridPx > 4) {
        const [ox, oy] = worldToScreen(0, 0);
        const startX = ((ox % gridPx) - gridPx) % gridPx;
        const startY = ((oy % gridPx) - gridPx) % gridPx;

        ctx.strokeStyle = overlayMode ? 'rgba(42, 45, 53, 0.4)' : COLORS.grid;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = startX; x < w; x += gridPx) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = startY; y < h; y += gridPx) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        const majorPx = gridPx * 10;
        if (majorPx > 20) {
          const majorStartX = ((ox % majorPx) - majorPx) % majorPx;
          const majorStartY = ((oy % majorPx) - majorPx) % majorPx;
          ctx.strokeStyle = overlayMode ? 'rgba(58, 61, 69, 0.4)' : COLORS.gridMajor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = majorStartX; x < w; x += majorPx) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
          for (let y = majorStartY; y < h; y += majorPx) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
          ctx.stroke();
        }
      }
    }

    // ─── Reference drawing ───
    if (referenceDrawing && refImgRef.current && refImgLoaded) {
      const img = refImgRef.current;
      const ppm = referenceDrawing.scale; // pixels per meter
      const imgWMeters = img.width / ppm;
      const imgHMeters = img.height / ppm;
      const imgWPx = imgWMeters * zoom;
      const imgHPx = imgHMeters * zoom;
      const [cx, cy] = worldToScreen(referenceDrawing.offsetX, referenceDrawing.offsetY);

      ctx.save();
      ctx.globalAlpha = referenceDrawing.opacity;
      ctx.translate(cx, cy);
      if (referenceDrawing.rotation !== 0) {
        ctx.rotate((referenceDrawing.rotation * Math.PI) / 180);
      }
      ctx.drawImage(img, -imgWPx / 2, -imgHPx / 2, imgWPx, imgHPx);
      ctx.restore();
    }

    // ─── Ghost floors ───
    for (const gf of ghostFloors) {
      for (const gw of gf.walls) {
        const [x1, y1] = worldToScreen(gw.from[0], gw.from[1]);
        const [x2, y2] = worldToScreen(gw.to[0], gw.to[1]);
        ctx.strokeStyle = COLORS.ghost;
        ctx.lineWidth = Math.max(1, gw.thickness * zoom * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Draw rooms
    for (const room of rooms) {
      if (!room.polygon || room.polygon.length < 3) continue;
      const isSelected = selection.type === 'room' && selection.id === room.id;
      
      // Get room floor material color
      const roomMat = room.floorMaterialId ? getMaterialById(room.floorMaterialId) : null;
      const roomFillColor = roomMat ? roomMat.color + '30' : (isSelected ? COLORS.roomSelected : COLORS.room);
      
      ctx.beginPath();
      const [sx, sy] = worldToScreen(room.polygon[0][0], room.polygon[0][1]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < room.polygon.length; i++) {
        const [px, py] = worldToScreen(room.polygon[i][0], room.polygon[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = roomFillColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? COLORS.roomSelectedStroke : COLORS.roomStroke;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      const cx2 = room.polygon.reduce((a, p) => a + p[0], 0) / room.polygon.length;
      const cz2 = room.polygon.reduce((a, p) => a + p[1], 0) / room.polygon.length;
      const [tx, ty] = worldToScreen(cx2, cz2);
      ctx.fillStyle = isSelected ? 'rgba(74, 158, 255, 0.8)' : 'rgba(255,255,255,0.5)';
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

      const thickPx = wall.thickness * zoom;
      ctx.strokeStyle = isSelected ? COLORS.wallSelected : COLORS.wall;
      ctx.lineWidth = Math.max(2, thickPx);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Openings with architectural symbols
      for (const op of wall.openings) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const opx = x1 + dx * op.offset;
        const opy = y1 + dy * op.offset;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;
        const ux = dx / len;
        const uy = dy / len;
        const halfW = (op.width * zoom) / 2;

        const isOpSelected = selection.type === 'opening' && selection.id === op.id;

        if (op.type === 'door') {
          const isDouble = op.style === 'double';
          const isSliding = op.style === 'sliding';

          // Clear wall line behind opening
          ctx.strokeStyle = '#1a1d23';
          ctx.lineWidth = Math.max(2, wall.thickness * zoom) + 2;
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW, opy - uy * halfW);
          ctx.lineTo(opx + ux * halfW, opy + uy * halfW);
          ctx.stroke();

          if (isSliding) {
            // Sliding door: two parallel lines offset
            ctx.strokeStyle = isOpSelected ? COLORS.openingSelected : COLORS.opening;
            ctx.lineWidth = 2;
            const off1 = 3, off2 = -3;
            ctx.beginPath();
            ctx.moveTo(opx - ux * halfW + nx * off1, opy - uy * halfW + ny * off1);
            ctx.lineTo(opx + ux * halfW * 0.6 + nx * off1, opy + uy * halfW * 0.6 + ny * off1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(opx + ux * halfW + nx * off2, opy + uy * halfW + ny * off2);
            ctx.lineTo(opx - ux * halfW * 0.6 + nx * off2, opy - uy * halfW * 0.6 + ny * off2);
            ctx.stroke();
          } else {
            // Standard door arc(s)
            ctx.strokeStyle = isOpSelected ? COLORS.openingSelected : COLORS.opening;
            ctx.lineWidth = 1.5;

            if (isDouble) {
              // Two quarter arcs from each side
              const hingeAngle = Math.atan2(dy, dx);
              // Left leaf
              ctx.beginPath();
              ctx.arc(opx - ux * halfW, opy - uy * halfW, halfW, hingeAngle + Math.PI * 1.5, hingeAngle + Math.PI * 2);
              ctx.stroke();
              // Left panel line
              ctx.beginPath();
              ctx.moveTo(opx - ux * halfW, opy - uy * halfW);
              ctx.lineTo(opx - ux * halfW + nx * halfW, opy - uy * halfW + ny * halfW);
              ctx.stroke();
              // Right leaf
              ctx.beginPath();
              ctx.arc(opx + ux * halfW, opy + uy * halfW, halfW, hingeAngle + Math.PI, hingeAngle + Math.PI * 1.5);
              ctx.stroke();
              // Right panel line
              ctx.beginPath();
              ctx.moveTo(opx + ux * halfW, opy + uy * halfW);
              ctx.lineTo(opx + ux * halfW + nx * halfW, opy + uy * halfW + ny * halfW);
              ctx.stroke();
            } else {
              // Single door: arc from hinge point
              const hingeAngle = Math.atan2(dy, dx);
              ctx.beginPath();
              ctx.arc(opx - ux * halfW, opy - uy * halfW, halfW * 2, hingeAngle + Math.PI * 1.5, hingeAngle + Math.PI * 2);
              ctx.stroke();
              // Panel line (open position)
              ctx.beginPath();
              ctx.moveTo(opx - ux * halfW, opy - uy * halfW);
              ctx.lineTo(opx - ux * halfW + nx * halfW * 2, opy - uy * halfW + ny * halfW * 2);
              ctx.stroke();
            }
          }
        } else if (op.type === 'window') {
          // Window: double parallel lines
          ctx.strokeStyle = '#1a1d23';
          ctx.lineWidth = Math.max(2, wall.thickness * zoom) + 2;
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW, opy - uy * halfW);
          ctx.lineTo(opx + ux * halfW, opy + uy * halfW);
          ctx.stroke();

          ctx.strokeStyle = isOpSelected ? COLORS.openingSelected : COLORS.openingWindow;
          ctx.lineWidth = 1.5;
          const off = 2.5;
          // Outer line
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW + nx * off, opy - uy * halfW + ny * off);
          ctx.lineTo(opx + ux * halfW + nx * off, opy + uy * halfW + ny * off);
          ctx.stroke();
          // Inner line
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW - nx * off, opy - uy * halfW - ny * off);
          ctx.lineTo(opx + ux * halfW - nx * off, opy + uy * halfW - ny * off);
          ctx.stroke();

          // End caps
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW + nx * off, opy - uy * halfW + ny * off);
          ctx.lineTo(opx - ux * halfW - nx * off, opy - uy * halfW - ny * off);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(opx + ux * halfW + nx * off, opy + uy * halfW + ny * off);
          ctx.lineTo(opx + ux * halfW - nx * off, opy + uy * halfW - ny * off);
          ctx.stroke();
        } else if (op.type === 'garage-door') {
          // Garage door: hatched rectangle
          ctx.strokeStyle = '#1a1d23';
          ctx.lineWidth = Math.max(2, wall.thickness * zoom) + 2;
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW, opy - uy * halfW);
          ctx.lineTo(opx + ux * halfW, opy + uy * halfW);
          ctx.stroke();

          ctx.strokeStyle = isOpSelected ? COLORS.openingSelected : '#8a8a8a';
          ctx.lineWidth = 2;
          const gOff = 6;
          // Rectangle
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW + nx * gOff, opy - uy * halfW + ny * gOff);
          ctx.lineTo(opx + ux * halfW + nx * gOff, opy + uy * halfW + ny * gOff);
          ctx.lineTo(opx + ux * halfW - nx * gOff, opy + uy * halfW - ny * gOff);
          ctx.lineTo(opx - ux * halfW - nx * gOff, opy - uy * halfW - ny * gOff);
          ctx.closePath();
          ctx.stroke();

          // Cross-hatch lines inside
          ctx.lineWidth = 0.8;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW + nx * gOff, opy - uy * halfW + ny * gOff);
          ctx.lineTo(opx + ux * halfW - nx * gOff, opy + uy * halfW - ny * gOff);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(opx + ux * halfW + nx * gOff, opy + uy * halfW + ny * gOff);
          ctx.lineTo(opx - ux * halfW - nx * gOff, opy - uy * halfW - ny * gOff);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (op.type === 'passage') {
          // Passage: simple gap with dashed frame
          ctx.strokeStyle = '#1a1d23';
          ctx.lineWidth = Math.max(2, wall.thickness * zoom) + 2;
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW, opy - uy * halfW);
          ctx.lineTo(opx + ux * halfW, opy + uy * halfW);
          ctx.stroke();

          ctx.strokeStyle = isOpSelected ? COLORS.openingSelected : '#aaa';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          const pOff = 3;
          // Two end lines showing passage sides
          ctx.beginPath();
          ctx.moveTo(opx - ux * halfW + nx * pOff, opy - uy * halfW + ny * pOff);
          ctx.lineTo(opx - ux * halfW - nx * pOff, opy - uy * halfW - ny * pOff);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(opx + ux * halfW + nx * pOff, opy + uy * halfW + ny * pOff);
          ctx.lineTo(opx + ux * halfW - nx * pOff, opy + uy * halfW - ny * pOff);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Opening drag dot
        ctx.fillStyle = isOpSelected ? COLORS.openingSelected : '#fff';
        ctx.beginPath();
        ctx.arc(opx, opy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes (endpoints)
      const nodeSize = 4;
      ctx.fillStyle = COLORS.node;
      ctx.beginPath();
      ctx.arc(x1, y1, nodeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, nodeSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── Draw stairs ───
    for (const stair of stairs) {
      const [sx2, sy2] = worldToScreen(stair.position[0], stair.position[1]);
      const wPx = stair.width * zoom;
      const lPx = stair.length * zoom;
      const isSelected = selection.type === 'stair' && selection.id === stair.id;

      ctx.save();
      ctx.translate(sx2, sy2);
      ctx.rotate(stair.rotation);

      ctx.fillStyle = isSelected ? 'rgba(74, 158, 255, 0.3)' : COLORS.stair;
      ctx.strokeStyle = isSelected ? '#4a9eff' : COLORS.stairStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-wPx / 2, -lPx / 2, wPx, lPx);
      ctx.strokeRect(-wPx / 2, -lPx / 2, wPx, lPx);

      const treads = 8;
      ctx.strokeStyle = isSelected ? 'rgba(74, 158, 255, 0.5)' : 'rgba(232, 168, 56, 0.5)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < treads; i++) {
        const ty = -lPx / 2 + (lPx / treads) * i;
        ctx.beginPath();
        ctx.moveTo(-wPx / 2, ty);
        ctx.lineTo(wPx / 2, ty);
        ctx.stroke();
      }

      ctx.strokeStyle = isSelected ? '#4a9eff' : COLORS.stairStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, lPx / 2 - 4);
      ctx.lineTo(0, -lPx / 2 + 4);
      ctx.lineTo(-4, -lPx / 2 + 10);
      ctx.moveTo(0, -lPx / 2 + 4);
      ctx.lineTo(4, -lPx / 2 + 10);
      ctx.stroke();

      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Trappa', sx2, sy2 + lPx / 2 + 3);
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

        // Show wall length tooltip during drawing
        const lastNode = wallDrawing.nodes[wallDrawing.nodes.length - 1];
        const segLen = Math.sqrt((snapped[0] - lastNode[0]) ** 2 + (snapped[1] - lastNode[1]) ** 2);
        if (segLen > 0.1) {
          const midSx = (worldToScreen(lastNode[0], lastNode[1])[0] + cx) / 2;
          const midSy = (worldToScreen(lastNode[0], lastNode[1])[1] + cy) / 2;
          const label = `${segLen.toFixed(2)} m`;
          ctx.save();
          ctx.setLineDash([]);
          ctx.font = 'bold 11px DM Sans, sans-serif';
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(midSx - tw / 2 - 3, midSy - 20, tw + 6, 16);
          ctx.fillStyle = COLORS.wallDrawing;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, midSx, midSy - 12);
          ctx.restore();
        }

        // Auto-close indicator: highlight first node if close
        if (wallDrawing.nodes.length >= 3) {
          const firstNode = wallDrawing.nodes[0];
          const distToFirst = Math.sqrt((snapped[0] - firstNode[0]) ** 2 + (snapped[1] - firstNode[1]) ** 2);
          if (distToFirst < 0.3) {
            const [fx, fy] = worldToScreen(firstNode[0], firstNode[1]);
            ctx.save();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fx, fy, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const node of wallDrawing.nodes) {
        const [nx2, ny2] = worldToScreen(node[0], node[1]);
        ctx.fillStyle = COLORS.wallDrawing;
        ctx.beginPath();
        ctx.arc(nx2, ny2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ─── Room rectangle drawing preview ───
    if (roomDrawStart && roomDrawEnd) {
      const [sx1, sy1] = worldToScreen(roomDrawStart[0], roomDrawStart[1]);
      const [sx2, sy2] = worldToScreen(roomDrawEnd[0], roomDrawEnd[1]);
      ctx.fillStyle = COLORS.roomDrawPreview;
      ctx.fillRect(Math.min(sx1, sx2), Math.min(sy1, sy2), Math.abs(sx2 - sx1), Math.abs(sy2 - sy1));
      ctx.strokeStyle = COLORS.roomDrawStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(Math.min(sx1, sx2), Math.min(sy1, sy2), Math.abs(sx2 - sx1), Math.abs(sy2 - sy1));
      ctx.setLineDash([]);

      // Dimension labels
      const rw = Math.abs(roomDrawEnd[0] - roomDrawStart[0]);
      const rd = Math.abs(roomDrawEnd[1] - roomDrawStart[1]);
      ctx.fillStyle = '#4a9eff';
      ctx.font = 'bold 11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${rw.toFixed(1)} m`, (sx1 + sx2) / 2, Math.min(sy1, sy2) - 4);
      ctx.save();
      ctx.translate(Math.max(sx1, sx2) + 14, (sy1 + sy2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${rd.toFixed(1)} m`, 0, 0);
      ctx.restore();
    }

    // ─── Draw imported model footprint ───
    if (homeGeometry.source === 'imported' && homeGeometry.imported.url) {
      const imp = homeGeometry.imported;
      const footW = 10 * imp.scale[0];
      const footD = 10 * imp.scale[2];
      const cx = imp.position[0];
      const cz = imp.position[2];
      const [ix1, iy1] = worldToScreen(cx - footW / 2, cz - footD / 2);
      const [ix2, iy2] = worldToScreen(cx + footW / 2, cz + footD / 2);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(Math.min(ix1, ix2), Math.min(iy1, iy2), Math.abs(ix2 - ix1), Math.abs(iy2 - iy1));
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
      ctx.font = '10px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Importerad modell', (ix1 + ix2) / 2, (iy1 + iy2) / 2);
    }

    // ─── Draw vacuum mapping ───
    if (floor?.vacuumMapping) {
      const vm = floor.vacuumMapping;
      // Draw zones
      const zoneColors = [
        { fill: 'rgba(74, 158, 255, 0.15)', stroke: 'rgba(74, 158, 255, 0.6)', text: 'rgba(74, 158, 255, 0.8)' },
        { fill: 'rgba(168, 85, 247, 0.15)', stroke: 'rgba(168, 85, 247, 0.6)', text: 'rgba(168, 85, 247, 0.8)' },
        { fill: 'rgba(34, 197, 94, 0.15)', stroke: 'rgba(34, 197, 94, 0.6)', text: 'rgba(34, 197, 94, 0.8)' },
        { fill: 'rgba(251, 146, 60, 0.15)', stroke: 'rgba(251, 146, 60, 0.6)', text: 'rgba(251, 146, 60, 0.8)' },
        { fill: 'rgba(236, 72, 153, 0.15)', stroke: 'rgba(236, 72, 153, 0.6)', text: 'rgba(236, 72, 153, 0.8)' },
        { fill: 'rgba(34, 211, 238, 0.15)', stroke: 'rgba(34, 211, 238, 0.6)', text: 'rgba(34, 211, 238, 0.8)' },
      ];
      for (let zi = 0; zi < vm.zones.length; zi++) {
        const zone = vm.zones[zi];
        const zc = zoneColors[zi % zoneColors.length];
        if (zone.polygon.length < 3) continue;
        ctx.beginPath();
        const [zx0, zy0] = worldToScreen(zone.polygon[0][0], zone.polygon[0][1]);
        ctx.moveTo(zx0, zy0);
        for (let i = 1; i < zone.polygon.length; i++) {
          const [zpx, zpy] = worldToScreen(zone.polygon[i][0], zone.polygon[i][1]);
          ctx.lineTo(zpx, zpy);
        }
        ctx.closePath();
        ctx.fillStyle = zc.fill;
        ctx.fill();
        ctx.strokeStyle = zc.stroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone label — ensure it's inside the polygon
        let cx2 = zone.polygon.reduce((a, p) => a + p[0], 0) / zone.polygon.length;
        let cz2 = zone.polygon.reduce((a, p) => a + p[1], 0) / zone.polygon.length;
        // If centroid is outside, find a midpoint of an edge that IS inside
        if (!pointInPolygon(cx2, cz2, zone.polygon)) {
          for (let ei = 0; ei < zone.polygon.length; ei++) {
            const next = (ei + 1) % zone.polygon.length;
            const mx = (zone.polygon[ei][0] + zone.polygon[next][0]) / 2;
            const mz = (zone.polygon[ei][1] + zone.polygon[next][1]) / 2;
            if (pointInPolygon(mx, mz, zone.polygon)) {
              cx2 = mx; cz2 = mz; break;
            }
          }
        }
        const [tx2, ty2] = worldToScreen(cx2, cz2);
        const zoneRoom = rooms.find((r) => r.id === zone.roomId || r.name === zone.roomId);
        const zoneLabel = zoneRoom?.name ?? zone.roomId;
        ctx.fillStyle = zc.text;
        ctx.font = 'bold 10px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🤖 ${zoneLabel}`, tx2, ty2);
      }

      // Draw dock
      if (vm.dockPosition) {
        const [dx, dy] = worldToScreen(vm.dockPosition[0], vm.dockPosition[1]);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⌂', dx, dy);
      }
    }

    // ─── Draw device markers ───
    const floorDevices = deviceMarkers.filter((m) => m.floorId === activeFloorId);
    const deviceColors: Record<string, string> = {
      light: '#facc15',
      switch: '#60a5fa',
      sensor: '#4ade80',
      climate: '#22d3ee',
      vacuum: '#a78bfa',
      camera: '#ef4444',
      fridge: '#cbd5e1',
      oven: '#f97316',
      washer: '#7dd3fc',
      'garage-door': '#f59e0b',
      'door-lock': '#fbbf24',
      'power-outlet': '#fde047',
      media_screen: '#818cf8',
    };
    for (const dev of floorDevices) {
      const [dx2, dy2] = worldToScreen(dev.position[0], dev.position[2]);
      const isSelected = selection.type === 'device' && selection.id === dev.id;
      const color = deviceColors[dev.kind] ?? '#fff';

      if (dev.kind === 'media_screen') {
        // Draw as rectangle
        const sc = dev.scale ?? [1.2, 0.675, 1];
        const rw = sc[0] * zoom;
        const rh = sc[1] * zoom;
        ctx.fillStyle = color;
        ctx.globalAlpha = isSelected ? 0.5 : 0.3;
        ctx.fillRect(dx2 - rw / 2, dy2 - rh / 2, rw, rh);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isSelected ? '#fff' : color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(dx2 - rw / 2, dy2 - rh / 2, rw, rh);
        // TV label
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '9px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dev.name || '📺 TV', dx2, dy2);
      } else {
        const radius = isSelected ? 10 : 7;
        ctx.beginPath();
        ctx.arc(dx2, dy2, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = isSelected ? 1 : 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(dx2, dy2, radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        const label = dev.name || dev.kind;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '9px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, dx2, dy2 + radius + 3);
      }
    }

    // Draw props as icons
    for (const prop of floorProps) {
      const [px, py] = worldToScreen(prop.position[0], prop.position[2]);
      const isSelected = selection.type === 'prop' && selection.id === prop.id;
      const size = 8;

      ctx.fillStyle = isSelected ? '#4a9eff' : '#e8a838';
      ctx.globalAlpha = isSelected ? 1 : 0.8;
      ctx.fillRect(px - size, py - size, size * 2, size * 2);
      ctx.globalAlpha = 1;

      if (isSelected) {
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '9px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(prop.url.split('/').pop()?.slice(0, 10) ?? '3D', px, py + size + 3);
    }

    // ─── Measure tool ───
    if (measureStart) {
      const [mx1, my1] = worldToScreen(measureStart[0], measureStart[1]);
      ctx.fillStyle = COLORS.measure;
      ctx.beginPath();
      ctx.arc(mx1, my1, 5, 0, Math.PI * 2);
      ctx.fill();

      const end = measureEnd ?? (cursorWorld ? snapToGrid(cursorWorld[0], cursorWorld[1]) : null);
      if (end) {
        const [mx2, my2] = worldToScreen(end[0], end[1]);
        ctx.strokeStyle = COLORS.measure;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(mx1, my1);
        ctx.lineTo(mx2, my2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.measure;
        ctx.beginPath();
        ctx.arc(mx2, my2, 5, 0, Math.PI * 2);
        ctx.fill();

        const dist = Math.sqrt((end[0] - measureStart[0]) ** 2 + (end[1] - measureStart[1]) ** 2);
        const midX = (mx1 + mx2) / 2;
        const midY = (my1 + my2) / 2;
        const label = `${dist.toFixed(2)} m`;
        ctx.font = 'bold 12px DM Sans, sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(midX - tw / 2 - 4, midY - 18, tw + 8, 20);
        ctx.fillStyle = COLORS.measure;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY - 8);
      }
    }

    // ─── Vacuum zone drawing preview ───
    if (vacZoneNodes.length > 0) {
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      const [vx0, vy0] = worldToScreen(vacZoneNodes[0][0], vacZoneNodes[0][1]);
      ctx.moveTo(vx0, vy0);
      for (let i = 1; i < vacZoneNodes.length; i++) {
        const [vx, vy] = worldToScreen(vacZoneNodes[i][0], vacZoneNodes[i][1]);
        ctx.lineTo(vx, vy);
      }
      if (cursorWorld && activeTool === 'vacuum-zone') {
        const snapped = snapToGrid(cursorWorld[0], cursorWorld[1]);
        const [cx, cy] = worldToScreen(snapped[0], snapped[1]);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const node of vacZoneNodes) {
        const [nx, ny] = worldToScreen(node[0], node[1]);
        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cursor crosshair
    if (cursorWorld && (activeTool === 'wall' || activeTool === 'room' || activeTool === 'stairs' || activeTool === 'measure' || activeTool === 'vacuum-zone' || activeTool === 'place-vacuum-dock')) {
      const snapped = snapToGrid(cursorWorld[0], cursorWorld[1]);
      const [cx, cy] = worldToScreen(snapped[0], snapped[1]);
      ctx.strokeStyle = activeTool === 'measure' ? COLORS.measure : (activeTool === 'vacuum-zone' || activeTool === 'place-vacuum-dock' ? '#4a9eff' : COLORS.cursor);
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

  // ─── Keyboard shortcuts: Escape & Ctrl+Z during wall drawing ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tool = useAppStore.getState().build.activeTool;
      const drawing = useAppStore.getState().build.wallDrawing;

      // Escape: cancel wall drawing or deselect
      if (e.key === 'Escape') {
        if (drawing.isDrawing) {
          setWallDrawing({ isDrawing: false, nodes: [] });
          e.preventDefault();
        } else {
          setSelection({ type: null, id: null });
        }
        return;
      }

      // Ctrl+Z during wall drawing: undo last node
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

  // ─── Touch handlers ───
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
        const center: [number, number] = [(t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2];
        setTouchPinch({ dist, zoom, center });
      }
    },
    [zoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchPinch) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
        const scale = dist / touchPinch.dist;
        const newZoom = Math.max(5, Math.min(200, touchPinch.zoom * scale));
        setZoom(newZoom);
        const center: [number, number] = [(t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2];
        const dx = (center[0] - touchPinch.center[0]) / newZoom;
        const dy = (center[1] - touchPinch.center[1]) / newZoom;
        setOffset((o) => [o[0] - dx, o[1] - dy]);
        setTouchPinch({ dist: touchPinch.dist, zoom: touchPinch.zoom, center });
      }
    },
    [touchPinch]
  );

  const handleTouchEnd = useCallback(() => { setTouchPinch(null); }, []);

  // ─── Pointer handlers ───
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Middle mouse = pan
      if (e.button === 1) {
        setIsPanning(true);
        setPanStart([e.clientX, e.clientY]);
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;

      // ─── Measure tool ───
      if (activeTool === 'measure') {
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);
        if (!measureStart || measureEnd) {
          setMeasureStart(snapped);
          setMeasureEnd(null);
        } else {
          setMeasureEnd(snapped);
        }
        return;
      }

      // ─── Vacuum dock placement ───
      if (activeTool === 'place-vacuum-dock' && activeFloorId) {
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);
        setVacuumDock(activeFloorId, snapped);
        useAppStore.getState().setBuildTool('select');
        return;
      }

      // ─── Vacuum zone drawing ───
      if (activeTool === 'vacuum-zone' && activeFloorId) {
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);
        setVacZoneNodes((prev) => [...prev, snapped]);
        return;
      }

      // ─── Device placement tools ───
      if (activeTool.startsWith('place-') && activeFloorId) {
        const rawKind = activeTool.replace('place-', '');
        const kind = (rawKind === 'media-screen' ? 'media_screen' : rawKind) as import('../../store/types').DeviceKind;
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);
        const fl = floors.find((f) => f.id === activeFloorId);
        const elev = fl?.elevation ?? 0;
        const h = fl?.heightMeters ?? 2.5;
        let yPos = elev + 2.2;
        if (kind === 'light') yPos = elev + h - 0.1;
        else if (kind === 'switch' || kind === 'sensor') yPos = elev + 1.2;
        else if (kind === 'climate') yPos = elev + 1.5;
        else if (kind === 'media_screen') yPos = elev + 1.5;

        const isScreen = kind === 'media_screen';
        addDevice({
          id: generateId(),
          kind,
          name: '',
          floorId: activeFloorId,
          surface: isScreen ? 'free' : (kind === 'light' ? 'ceiling' : 'floor'),
          position: [snapped[0], yPos, snapped[1]],
          rotation: [0, 0, 0],
          ...(isScreen ? {
            scale: [1.2, 0.675, 1] as [number, number, number],
            screenConfig: { aspectRatio: 16 / 9, uiStyle: 'minimal' as const, showProgress: true },
          } : {}),
        });
        useAppStore.getState().setBuildTool('select');
        return;
      }

      // ─── Stairs tool ───
      if (activeTool === 'stairs' && activeFloorId) {
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);
        pushUndo();
        addStair(activeFloorId, {
          id: generateId(),
          floorId: activeFloorId,
          position: snapped,
          rotation: 0,
          width: 1,
          length: 2.5,
          fromFloorId: activeFloorId,
          toFloorId: activeFloorId,
        });
        return;
      }

      // ─── Door/Window/Garage-door/Passage placement ───
      if ((activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door' || activeTool === 'passage') && activeFloorId) {
        const wall = findWallAt(sx, sy);
        if (wall) {
          const [wx, wz] = screenToWorld(sx, sy);
          const [dist, t] = pointToSegment(wx, wz, wall.from[0], wall.from[1], wall.to[0], wall.to[1]);
          if (dist < 0.5) {
            pushUndo();
            const presetId = (useAppStore.getState() as any)._selectedOpeningPreset;
            const preset = presetId ? openingPresets.find((p: any) => p.id === presetId) : null;
            const openingId = generateId();
            const openingType = activeTool as 'door' | 'window' | 'garage-door' | 'passage';
            const defaultWidths: Record<string, number> = { door: 0.9, window: 1.2, 'garage-door': 2.5, passage: 0.9 };
            const defaultHeights: Record<string, number> = { door: 2.1, window: 1.2, 'garage-door': 2.2, passage: 2.1 };
            addOpening(activeFloorId, wall.id, {
              id: openingId,
              type: openingType,
              offset: Math.max(0.05, Math.min(0.95, t)),
              width: preset?.width ?? (defaultWidths[activeTool] || 0.9),
              height: preset?.height ?? (defaultHeights[activeTool] || 2.1),
              sillHeight: preset?.sillHeight ?? (activeTool === 'window' ? 0.9 : 0),
              style: preset?.style,
            });
            setSelection({ type: 'opening', id: openingId });
            useAppStore.getState().setBuildTool('select');
            useAppStore.setState({ _selectedOpeningPreset: null } as any);
          }
        }
        return;
      }

      // ─── Room rectangle tool ───
      if (activeTool === 'room') {
        const [wx, wz] = screenToWorld(sx, sy);
        const snapped = snapToGrid(wx, wz);
        setRoomDrawStart(snapped);
        setRoomDrawEnd(snapped);
        return;
      }

      // ─── Wall drawing tool ───
      if (activeTool === 'wall' && activeFloorId) {
        const [wx, wz] = screenToWorld(sx, sy);
        let snapped = snapToGrid(wx, wz);
        
        // Angle-lock: Shift key locks to 0°/45°/90° increments
        if (e.shiftKey && wallDrawing.isDrawing && wallDrawing.nodes.length > 0) {
          const lastNode = wallDrawing.nodes[wallDrawing.nodes.length - 1];
          snapped = angleLock(lastNode, snapped);
          snapped = snapToGrid(snapped[0], snapped[1]);
        }
        
        if (!wallDrawing.isDrawing) {
          setWallDrawing({ isDrawing: true, nodes: [snapped] });
        } else {
          // Auto-close: if close to first node, close the polygon
          const firstNode = wallDrawing.nodes[0];
          const distToFirst = Math.sqrt((snapped[0] - firstNode[0]) ** 2 + (snapped[1] - firstNode[1]) ** 2);
          if (wallDrawing.nodes.length >= 3 && distToFirst < 0.3) {
            // Close polygon: add walls and create room
            pushUndo();
            const nodes = [...wallDrawing.nodes, firstNode];
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
          } else {
            setWallDrawing({ nodes: [...wallDrawing.nodes, snapped] });
          }
        }
        return;
      }

      // ─── Select tool ───
      if (activeTool === 'select') {
        // 1. Check opening first (for dragging)
        const openingHit = findOpeningAt(sx, sy);
        if (openingHit) {
          setSelection({ type: 'opening', id: openingHit.openingId });
          setDragOpening({ wallId: openingHit.wall.id, openingId: openingHit.openingId });
          pushUndo();
          return;
        }

        // 2. Check device markers
        const [swx, swz] = screenToWorld(sx, sy);
        const floorDevs = deviceMarkers.filter((m) => m.floorId === activeFloorId);
        for (const dev of floorDevs) {
          const dist = Math.sqrt((swx - dev.position[0]) ** 2 + (swz - dev.position[2]) ** 2);
          if (dist < 0.5) {
            setSelection({ type: 'device', id: dev.id });
            setDragDeviceId(dev.id);
            setDragDeviceOffset([swx - dev.position[0], swz - dev.position[2]]);
            return;
          }
        }

        // 3. Check wall node (endpoint) for dragging
        const node = findNodeAt(sx, sy);
        if (node) {
          const connected = findConnectedWalls(node.pos, node.wallId);
          pushUndo();
          setDragNode({ wallId: node.wallId, endpoint: node.endpoint, connectedWalls: connected });
          setSelection({ type: 'wall', id: node.wallId });
          return;
        }

        // 3. Check prop
        const prop = findPropAt(sx, sy);
        if (prop) {
          setSelection({ type: 'prop', id: prop.id });
          const [wx, wz] = screenToWorld(sx, sy);
          setIsDraggingProp(true);
          setDragPropId(prop.id);
          setDragPropOffset([wx - prop.position[0], wz - prop.position[2]]);
          return;
        }

        // 4. Check wall segment (for dragging entire wall)
        const wall = findWallAt(sx, sy);
        if (wall) {
          const [wx, wz] = screenToWorld(sx, sy);
          pushUndo();
          setDragWall({ wallId: wall.id, startFrom: [...wall.from], startTo: [...wall.to], mouseStart: [wx, wz] });
          setSelection({ type: 'wall', id: wall.id });
          return;
        }

        // 5. Check stair
        for (const stair of stairs) {
          const [stx, sty] = worldToScreen(stair.position[0], stair.position[1]);
          const wPx = stair.width * zoom / 2;
          const lPx = stair.length * zoom / 2;
          if (Math.abs(sx - stx) < wPx && Math.abs(sy - sty) < lPx) {
            setSelection({ type: 'stair', id: stair.id });
            return;
          }
        }

        // 6. Check room
        const room = findRoomAt(sx, sy);
        if (room) {
          setSelection({ type: 'room', id: room.id });
          return;
        }

        // 7. Deselect
        setSelection({ type: null, id: null });
        return;
      }

      // ─── Erase tool ───
      if (activeTool === 'erase' && activeFloorId) {
        const wall = findWallAt(sx, sy);
        if (wall) {
          pushUndo();
          deleteWall(activeFloorId, wall.id);
        }
      }
    },
    [activeTool, activeFloorId, wallDrawing, screenToWorld, snapToGrid, setWallDrawing, findWallAt, findPropAt, findNodeAt, findConnectedWalls, findOpeningAt, findRoomAt, setSelection, pushUndo, deleteWall, measureStart, measureEnd, addStair, addOpening, stairs, worldToScreen, zoom, addDevice, floors, deviceMarkers]
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

      // ─── Node dragging ───
      if (dragNode && activeFloorId) {
        const snapped = snapToGrid(wx, wz);
        updateWallNode(activeFloorId, dragNode.wallId, dragNode.endpoint, snapped);
        for (const conn of dragNode.connectedWalls) {
          updateWallNode(activeFloorId, conn.wallId, conn.endpoint, snapped);
        }
        return;
      }

      // ─── Wall segment dragging ───
      if (dragWall && activeFloorId) {
        const dxW = wx - dragWall.mouseStart[0];
        const dzW = wz - dragWall.mouseStart[1];
        const newFrom = snapToGrid(dragWall.startFrom[0] + dxW, dragWall.startFrom[1] + dzW);
        const newTo: [number, number] = [
          newFrom[0] + (dragWall.startTo[0] - dragWall.startFrom[0]),
          newFrom[1] + (dragWall.startTo[1] - dragWall.startFrom[1]),
        ];
        updateWallNode(activeFloorId, dragWall.wallId, 'from', newFrom);
        updateWallNode(activeFloorId, dragWall.wallId, 'to', newTo);
        return;
      }

      // ─── Opening dragging along wall ───
      if (dragOpening && activeFloorId) {
        const wall = walls.find((w) => w.id === dragOpening.wallId);
        if (wall) {
          const [, t] = pointToSegment(wx, wz, wall.from[0], wall.from[1], wall.to[0], wall.to[1]);
          const clampedT = Math.max(0.05, Math.min(0.95, t));
          updateOpeningOffset(activeFloorId, dragOpening.wallId, dragOpening.openingId, clampedT);
        }
        return;
      }

      // ─── Prop dragging ───
      if (isDraggingProp && dragPropId) {
        const snapped = snapToGrid(wx - dragPropOffset[0], wz - dragPropOffset[1]);
        const prop = floorProps.find((p) => p.id === dragPropId);
        if (prop) {
          updateProp(dragPropId, { position: [snapped[0], prop.position[1], snapped[1]] });
        }
        return;
      }

      // ─── Device dragging ───
      if (dragDeviceId) {
        const dev = deviceMarkers.find((m) => m.id === dragDeviceId);
        if (dev) {
          const snapped = snapToGrid(wx - dragDeviceOffset[0], wz - dragDeviceOffset[1]);
          updateDevice(dragDeviceId, { position: [snapped[0], dev.position[1], snapped[1]] });
        }
        return;
      }

      // ─── Room rectangle drawing ───
      if (roomDrawStart && activeTool === 'room') {
        const snapped = snapToGrid(wx, wz);
        setRoomDrawEnd(snapped);
      }
    },
    [isPanning, panStart, zoom, offset, screenToWorld, dragNode, dragWall, dragOpening, isDraggingProp, dragPropId, dragPropOffset, dragDeviceId, dragDeviceOffset, roomDrawStart, activeTool, activeFloorId, snapToGrid, updateWallNode, updateOpeningOffset, updateProp, updateDevice, floorProps, walls, deviceMarkers]
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);

    // Finish node drag
    if (dragNode) {
      setDragNode(null);
      if (activeFloorId) updateRoomPolygons(activeFloorId);
      return;
    }

    // Finish wall drag
    if (dragWall) {
      setDragWall(null);
      if (activeFloorId) updateRoomPolygons(activeFloorId);
      return;
    }

    // Finish opening drag
    if (dragOpening) { setDragOpening(null); return; }

    // Finish prop drag
    if (isDraggingProp) {
      setIsDraggingProp(false);
      setDragPropId(null);
      return;
    }

    // Finish device drag
    if (dragDeviceId) {
      setDragDeviceId(null);
      return;
    }

    // Finish room rectangle
    if (roomDrawStart && roomDrawEnd && activeTool === 'room' && activeFloorId) {
      const x = Math.min(roomDrawStart[0], roomDrawEnd[0]);
      const z = Math.min(roomDrawStart[1], roomDrawEnd[1]);
      const w = Math.abs(roomDrawEnd[0] - roomDrawStart[0]);
      const d = Math.abs(roomDrawEnd[1] - roomDrawStart[1]);
      if (w > 0.2 && d > 0.2) {
        const existingNums = rooms.map((r) => {
          const m = r.name.match(/^Rum (\d+)$/);
          return m ? parseInt(m[1], 10) : 0;
        });
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
        addRoomFromRect(activeFloorId, x, z, w, d, `Rum ${nextNum}`);
      }
      setRoomDrawStart(null);
      setRoomDrawEnd(null);
    }
  }, [dragNode, dragWall, dragOpening, isDraggingProp, dragDeviceId, roomDrawStart, roomDrawEnd, activeTool, activeFloorId, addRoomFromRect, updateRoomPolygons]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Finish vacuum zone drawing
      if (activeTool === 'vacuum-zone' && vacZoneNodes.length >= 3 && activeFloorId) {
        // Find which room this polygon is in (use centroid)
        const cx = vacZoneNodes.reduce((a, p) => a + p[0], 0) / vacZoneNodes.length;
        const cz = vacZoneNodes.reduce((a, p) => a + p[1], 0) / vacZoneNodes.length;
        const room = rooms.find((r) => {
          if (!r.polygon || r.polygon.length < 3) return false;
          let inside = false;
          for (let i = 0, j = r.polygon.length - 1; i < r.polygon.length; j = i++) {
            const xi = r.polygon[i][0], yi = r.polygon[i][1];
            const xj = r.polygon[j][0], yj = r.polygon[j][1];
            if ((yi > cz) !== (yj > cz) && cx < ((xj - xi) * (cz - yi)) / (yj - yi) + xi) inside = !inside;
          }
          return inside;
        });
        const floorData = floors.find((f) => f.id === activeFloorId);
        const roomId = room?.name ?? `Zon ${(floorData?.vacuumMapping?.zones?.length ?? 0) + 1}`;
        addVacuumZone(activeFloorId, { roomId, polygon: [...vacZoneNodes] });
        setVacZoneNodes([]);
        return;
      }

      // Finish wall drawing
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
        return;
      }

      // Split wall on double-click with select tool
      if (activeTool === 'select' && activeFloorId) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wall = findWallAt(sx, sy);
        if (wall) {
          const [wx, wz] = screenToWorld(sx, sy);
          const snapped = snapToGrid(wx, wz);
          pushUndo();
          splitWall(activeFloorId, wall.id, snapped);
          setSelection({ type: null, id: null });
        }
      }
    },
    [activeTool, wallDrawing, activeFloorId, floor, pushUndo, addWall, setWallDrawing, findWallAt, screenToWorld, snapToGrid, splitWall, setSelection, vacZoneNodes, rooms, addVacuumZone]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(5, Math.min(200, z * factor)));
    },
    []
  );

  const getCursor = () => {
    if (isDraggingProp || dragNode || dragWall || dragOpening || dragDeviceId) return 'grabbing';
    if (activeTool === 'wall' || activeTool === 'room') return 'crosshair';
    if (activeTool === 'door' || activeTool === 'window' || activeTool === 'garage-door') return 'crosshair';
    if (activeTool === 'erase') return 'not-allowed';
    if (activeTool === 'measure') return 'crosshair';
    if (activeTool === 'stairs') return 'copy';
    if (activeTool === 'vacuum-zone' || activeTool === 'place-vacuum-dock') return 'crosshair';
    return 'default';
  };

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

      {/* ─── Planritning (reference drawing) controls — only in import mode ─── */}
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

      {/* Opacity */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">Opacitet</Label>
        <Slider min={0} max={1} step={0.05} value={[ref.opacity]} onValueChange={([v]) => update({ opacity: v })} />
      </div>

      {/* Scale */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><ZoomIn className="w-3 h-3" />Skala (px/m)</Label>
        <div className="flex items-center gap-2">
          <Slider min={10} max={500} step={1} value={[ref.scale]} onValueChange={([v]) => update({ scale: v })} className="flex-1" />
          <input type="number" value={ref.scale} onChange={(e) => update({ scale: Number(e.target.value) || 100 })} className="w-14 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
        </div>
      </div>

      {/* Rotation */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><RotateCw className="w-3 h-3" />Rotation (°)</Label>
        <div className="flex items-center gap-2">
          <Slider min={0} max={360} step={1} value={[ref.rotation]} onValueChange={([v]) => update({ rotation: v })} className="flex-1" />
          <input type="number" value={ref.rotation} onChange={(e) => update({ rotation: Number(e.target.value) || 0 })} className="w-14 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
        </div>
      </div>

      {/* Position */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Move className="w-3 h-3" />Position</Label>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground">X</label>
          <input type="number" step={0.1} value={ref.offsetX} onChange={(e) => update({ offsetX: Number(e.target.value) || 0 })} className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
          <label className="text-[10px] text-muted-foreground">Y</label>
          <input type="number" step={0.1} value={ref.offsetY} onChange={(e) => update({ offsetY: Number(e.target.value) || 0 })} className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground" />
        </div>
      </div>

      {/* Lock + Delete */}
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
