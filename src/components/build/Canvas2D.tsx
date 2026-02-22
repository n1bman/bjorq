import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { WallSegment } from '@/store/types';
import { getMaterialById } from '@/lib/materials';

const GRID_COLOR = '#2a2d35';
const GRID_MAJOR_COLOR = '#3a3d45';
const WALL_COLOR = '#e8a845';
const WALL_SELECTED_COLOR = '#4a9eff';
const NODE_COLOR = '#e8a845';
const NODE_HOVER_COLOR = '#ffffff';
const CALIBRATION_COLOR = '#4a9eff';
const DRAWING_COLOR = '#e8a845';
const DOOR_COLOR = '#8B6914';
const WINDOW_COLOR = '#4a9eff';
const NODE_RADIUS = 6;
const WALL_WIDTH = 4;

const generateId = () => Math.random().toString(36).slice(2, 10);

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoveredNode, setHoveredNode] = useState<{ wallId: string; endpoint: 'from' | 'to' } | null>(null);
  const [dragging, setDragging] = useState<{ wallId: string; endpoint: 'from' | 'to' } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<[number, number]>([0, 0]);
  const [floorplanImg, setFloorplanImg] = useState<HTMLImageElement | null>(null);

  const activeTool = useAppStore((s) => s.build.activeTool);
  const wallDrawing = useAppStore((s) => s.build.wallDrawing);
  const calibration = useAppStore((s) => s.build.calibration);
  const canvasOffset = useAppStore((s) => s.build.canvasOffset);
  const canvasZoom = useAppStore((s) => s.build.canvasZoom);
  const selectedWallId = useAppStore((s) => s.build.selectedWallId);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const gridSize = activeFloor?.gridSize ?? 0.5;
  const pixelsPerMeter = activeFloor?.pixelsPerMeter ?? 50; // default 50px/m

  const setWallDrawing = useAppStore((s) => s.setWallDrawing);
  const setCalibration = useAppStore((s) => s.setCalibration);
  const setCanvasOffset = useAppStore((s) => s.setCanvasOffset);
  const setCanvasZoom = useAppStore((s) => s.setCanvasZoom);
  const addWall = useAppStore((s) => s.addWall);
  const updateWallNode = useAppStore((s) => s.updateWallNode);
  const setSelectedWall = useAppStore((s) => s.setSelectedWall);
  const pushUndo = useAppStore((s) => s.pushUndo);

  // Load floorplan image
  useEffect(() => {
    if (activeFloor?.floorplanImage) {
      const img = new Image();
      img.onload = () => setFloorplanImg(img);
      img.src = activeFloor.floorplanImage;
    } else {
      setFloorplanImg(null);
    }
  }, [activeFloor?.floorplanImage]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Transform helpers
  const screenToWorld = useCallback(
    (sx: number, sy: number): [number, number] => {
      return [
        (sx - canvasOffset[0]) / canvasZoom,
        (sy - canvasOffset[1]) / canvasZoom,
      ];
    },
    [canvasOffset, canvasZoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number): [number, number] => {
      return [wx * canvasZoom + canvasOffset[0], wy * canvasZoom + canvasOffset[1]];
    },
    [canvasOffset, canvasZoom]
  );

  const snapToGrid = useCallback(
    (pos: [number, number]): [number, number] => {
      const gridPx = gridSize * pixelsPerMeter;
      return [
        Math.round(pos[0] / gridPx) * gridPx,
        Math.round(pos[1] / gridPx) * gridPx,
      ];
    },
    [gridSize, pixelsPerMeter]
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size.w * window.devicePixelRatio;
    canvas.height = size.h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear
    ctx.clearRect(0, 0, size.w, size.h);

    ctx.save();
    ctx.translate(canvasOffset[0], canvasOffset[1]);
    ctx.scale(canvasZoom, canvasZoom);

    // Floorplan image
    if (floorplanImg) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(floorplanImg, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Grid
    const gridPx = gridSize * pixelsPerMeter;
    const startX = 0;
    const startY = 0;
    const viewW = size.w / canvasZoom;
    const viewH = size.h / canvasZoom;
    const offX = -canvasOffset[0] / canvasZoom;
    const offY = -canvasOffset[1] / canvasZoom;

    ctx.lineWidth = 0.5;
    for (let x = Math.floor(offX / gridPx) * gridPx; x < offX + viewW; x += gridPx) {
      const isMajor = Math.abs(x % (gridPx * 10)) < 0.01;
      ctx.strokeStyle = isMajor ? GRID_MAJOR_COLOR : GRID_COLOR;
      ctx.beginPath();
      ctx.moveTo(x, offY);
      ctx.lineTo(x, offY + viewH);
      ctx.stroke();
    }
    for (let y = Math.floor(offY / gridPx) * gridPx; y < offY + viewH; y += gridPx) {
      const isMajor = Math.abs(y % (gridPx * 10)) < 0.01;
      ctx.strokeStyle = isMajor ? GRID_MAJOR_COLOR : GRID_COLOR;
      ctx.beginPath();
      ctx.moveTo(offX, y);
      ctx.lineTo(offX + viewW, y);
      ctx.stroke();
    }

    // Room fills
    const rooms = activeFloor?.rooms ?? [];
    rooms.forEach((room) => {
      if (!room.polygon || room.polygon.length < 3) return;
      const mat = room.floorMaterialId ? getMaterialById(room.floorMaterialId) : null;
      const fillColor = mat?.color ?? '#e8a845';
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(room.polygon[0][0] * pixelsPerMeter, room.polygon[0][1] * pixelsPerMeter);
      for (let i = 1; i < room.polygon.length; i++) {
        ctx.lineTo(room.polygon[i][0] * pixelsPerMeter, room.polygon[i][1] * pixelsPerMeter);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Room label
      const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
      const cy = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
      ctx.fillStyle = '#ffffff';
      ctx.font = `${11 / canvasZoom}px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(room.name, cx * pixelsPerMeter, cy * pixelsPerMeter);
    });

    // Walls
    const walls = activeFloor?.walls ?? [];
    walls.forEach((wall) => {
      const isSelected = wall.id === selectedWallId;
      ctx.strokeStyle = isSelected ? WALL_SELECTED_COLOR : WALL_COLOR;
      ctx.lineWidth = WALL_WIDTH / canvasZoom;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wall.from[0] * pixelsPerMeter, wall.from[1] * pixelsPerMeter);
      ctx.lineTo(wall.to[0] * pixelsPerMeter, wall.to[1] * pixelsPerMeter);
      ctx.stroke();

      // Openings
      wall.openings.forEach((op) => {
        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const nx = dx / len;
        const nz = dz / len;
        const opCenterX = (wall.from[0] + nx * op.offset * len) * pixelsPerMeter;
        const opCenterZ = (wall.from[1] + nz * op.offset * len) * pixelsPerMeter;
        const opHalfW = (op.width / 2) * pixelsPerMeter;

        ctx.strokeStyle = op.type === 'door' ? DOOR_COLOR : WINDOW_COLOR;
        ctx.lineWidth = (WALL_WIDTH + 2) / canvasZoom;
        ctx.beginPath();
        ctx.moveTo(opCenterX - nx * opHalfW, opCenterZ - nz * opHalfW);
        ctx.lineTo(opCenterX + nx * opHalfW, opCenterZ + nz * opHalfW);
        ctx.stroke();

        // Small perpendicular marks
        const perpX = -nz * 4 / canvasZoom;
        const perpZ = nx * 4 / canvasZoom;
        ctx.lineWidth = 1.5 / canvasZoom;
        ctx.beginPath();
        ctx.moveTo(opCenterX - nx * opHalfW + perpX, opCenterZ - nz * opHalfW + perpZ);
        ctx.lineTo(opCenterX - nx * opHalfW - perpX, opCenterZ - nz * opHalfW - perpZ);
        ctx.moveTo(opCenterX + nx * opHalfW + perpX, opCenterZ + nz * opHalfW + perpZ);
        ctx.lineTo(opCenterX + nx * opHalfW - perpX, opCenterZ + nz * opHalfW - perpZ);
        ctx.stroke();
      });

      // Nodes
      [
        { pos: wall.from, ep: 'from' as const },
        { pos: wall.to, ep: 'to' as const },
      ].forEach(({ pos, ep }) => {
        const isHovered =
          hoveredNode?.wallId === wall.id && hoveredNode?.endpoint === ep;
        ctx.fillStyle = isHovered ? NODE_HOVER_COLOR : NODE_COLOR;
        ctx.beginPath();
        ctx.arc(
          pos[0] * pixelsPerMeter,
          pos[1] * pixelsPerMeter,
          NODE_RADIUS / canvasZoom,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    });

    // Wall drawing preview
    if (wallDrawing.isDrawing && wallDrawing.nodes.length > 0) {
      ctx.strokeStyle = DRAWING_COLOR;
      ctx.lineWidth = WALL_WIDTH / canvasZoom;
      ctx.setLineDash([6 / canvasZoom, 4 / canvasZoom]);
      for (let i = 0; i < wallDrawing.nodes.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(wallDrawing.nodes[i][0], wallDrawing.nodes[i][1]);
        ctx.lineTo(wallDrawing.nodes[i + 1][0], wallDrawing.nodes[i + 1][1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw nodes
      wallDrawing.nodes.forEach((n) => {
        ctx.fillStyle = DRAWING_COLOR;
        ctx.beginPath();
        ctx.arc(n[0], n[1], NODE_RADIUS / canvasZoom, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Calibration line
    if (calibration.point1) {
      ctx.strokeStyle = CALIBRATION_COLOR;
      ctx.lineWidth = 3 / canvasZoom;
      ctx.setLineDash([8 / canvasZoom, 4 / canvasZoom]);
      ctx.beginPath();
      ctx.moveTo(calibration.point1[0], calibration.point1[1]);
      if (calibration.point2) {
        ctx.lineTo(calibration.point2[0], calibration.point2[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Nodes
      [calibration.point1, calibration.point2].forEach((p) => {
        if (!p) return;
        ctx.fillStyle = CALIBRATION_COLOR;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 5 / canvasZoom, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }, [
    size, canvasOffset, canvasZoom, floorplanImg, gridSize, pixelsPerMeter,
    activeFloor?.walls, activeFloor?.rooms, wallDrawing, calibration, selectedWallId, hoveredNode,
  ]);

  // Mouse handlers
  const getCanvasPos = (e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const findNearestNode = (worldPos: [number, number], threshold = 10): { wallId: string; endpoint: 'from' | 'to' } | null => {
    const walls = activeFloor?.walls ?? [];
    const t = threshold / canvasZoom;
    for (const wall of walls) {
      for (const ep of ['from', 'to'] as const) {
        const p = wall[ep];
        const dx = worldPos[0] - p[0] * pixelsPerMeter;
        const dy = worldPos[1] - p[1] * pixelsPerMeter;
        if (Math.sqrt(dx * dx + dy * dy) < t) {
          return { wallId: wall.id, endpoint: ep };
        }
      }
    }
    return null;
  };

  const findNearestWall = (worldPos: [number, number], threshold = 8): string | null => {
    const walls = activeFloor?.walls ?? [];
    const t = threshold / canvasZoom;
    for (const wall of walls) {
      const ax = wall.from[0] * pixelsPerMeter, ay = wall.from[1] * pixelsPerMeter;
      const bx = wall.to[0] * pixelsPerMeter, by = wall.to[1] * pixelsPerMeter;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t2 = Math.max(0, Math.min(1, ((worldPos[0] - ax) * dx + (worldPos[1] - ay) * dy) / len2));
      const px = ax + t2 * dx, py = ay + t2 * dy;
      const dist = Math.sqrt(Math.pow(worldPos[0] - px, 2) + Math.pow(worldPos[1] - py, 2));
      if (dist < t) return wall.id;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const [sx, sy] = getCanvasPos(e);
    const [wx, wy] = screenToWorld(sx, sy);

    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart([sx, sy]);
      return;
    }

    if (activeTool === 'select') {
      const node = findNearestNode([wx, wy]);
      if (node) {
        pushUndo();
        setDragging(node);
        return;
      }
      const wallId = findNearestWall([wx, wy]);
      setSelectedWall(wallId);
    }

    if (activeTool === 'wall') {
      const snapped = snapToGrid([wx, wy]);
      if (!wallDrawing.isDrawing) {
        setWallDrawing({ isDrawing: true, nodes: [snapped] });
      } else {
        const nodes = [...wallDrawing.nodes, snapped];
        setWallDrawing({ nodes });
      }
    }

    if (activeTool === 'calibrate') {
      if (!calibration.point1) {
        setCalibration({ isCalibrating: true, point1: [wx, wy] });
      } else if (!calibration.point2) {
        setCalibration({ point2: [wx, wy] });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const [sx, sy] = getCanvasPos(e);
    const [wx, wy] = screenToWorld(sx, sy);

    if (isPanning) {
      setCanvasOffset([
        canvasOffset[0] + (sx - panStart[0]),
        canvasOffset[1] + (sy - panStart[1]),
      ]);
      setPanStart([sx, sy]);
      return;
    }

    if (dragging && activeFloorId) {
      const snapped = snapToGrid([wx, wy]);
      updateWallNode(
        activeFloorId,
        dragging.wallId,
        dragging.endpoint,
        [snapped[0] / pixelsPerMeter, snapped[1] / pixelsPerMeter]
      );
      return;
    }

    if (activeTool === 'select') {
      setHoveredNode(findNearestNode([wx, wy]));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragging(null);
  };

  const handleDoubleClick = () => {
    if (activeTool === 'wall' && wallDrawing.isDrawing && activeFloorId) {
      // Finish wall drawing - create wall segments from nodes
      pushUndo();
      const nodes = wallDrawing.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
        const wall: WallSegment = {
          id: generateId(),
          from: [nodes[i][0] / pixelsPerMeter, nodes[i][1] / pixelsPerMeter],
          to: [nodes[i + 1][0] / pixelsPerMeter, nodes[i + 1][1] / pixelsPerMeter],
          height: 2.5,
          thickness: 0.15,
          openings: [],
        };
        addWall(activeFloorId, wall);
      }
      setWallDrawing({ isDrawing: false, nodes: [] });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const [sx, sy] = getCanvasPos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = canvasZoom * delta;
    // Zoom toward cursor
    const newOffX = sx - (sx - canvasOffset[0]) * delta;
    const newOffY = sy - (sy - canvasOffset[1]) * delta;
    setCanvasZoom(newZoom);
    setCanvasOffset([newOffX, newOffY]);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        style={{ width: size.w, height: size.h }}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />
      {/* Status bar */}
      <div className="absolute bottom-2 left-2 glass-panel rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex gap-3">
        <span>Zoom: {(canvasZoom * 100).toFixed(0)}%</span>
        <span>Rutnät: {gridSize}m</span>
        {activeFloor?.pixelsPerMeter && (
          <span>Skala: {activeFloor.pixelsPerMeter.toFixed(1)} px/m</span>
        )}
        {activeTool === 'wall' && wallDrawing.isDrawing && (
          <span className="text-primary">Dubbelklicka för att avsluta vägg</span>
        )}
      </div>
    </div>
  );
}
