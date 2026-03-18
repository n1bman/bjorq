/**
 * Walls3D.tsx — Home-view (non-interactive) wall renderer.
 * Phase A1: Delegates all geometry to shared wallGeometry.ts module.
 * Room wall finish via RoomWallSurfaces3D additive layer.
 * CI sync marker: keep surface module in tracked file.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import type { Room, WallSegment } from '../../store/types';
import { generateWallSegments } from '../../lib/wallGeometry';
import { getRoomFacingSide } from '../../lib/wallFaces';
import { getMaterialById } from '../../lib/materials';
import { applyMaterialTextures } from '../../lib/wallTextureLoader';

const SURFACE_OFFSET = 0.002;

interface RoomWallSurfaces3DProps {
  rooms: Room[];
  walls: WallSegment[];
  elevation: number;
  interactive?: boolean;
  onRoomClick?: (roomId: string) => void;
}

function clipWallToRoom(wall: WallSegment, roomPolygon: [number, number][]): [number, number] | null {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return null;

  const ux = dx / len;
  const uz = dz / len;

  let tMin = Infinity;
  let tMax = -Infinity;

  for (const [px, pz] of roomPolygon) {
    const t = (px - wall.from[0]) * ux + (pz - wall.from[1]) * uz;
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }

  tMin = Math.max(0, tMin);
  tMax = Math.min(len, tMax);
  if (tMax - tMin < 0.01) return null;

  return [tMin, tMax];
}

function generateClippedStrips(
  wall: WallSegment,
  tMin: number,
  tMax: number,
): { t0: number; t1: number; y0: number; y1: number }[] {
  const wallHeight = wall.height;
  const strips: { t0: number; t1: number; y0: number; y1: number }[] = [];
  const openingIntervals: { t0: number; t1: number; y0: number; y1: number }[] = [];

  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const wallLen = Math.sqrt(dx * dx + dz * dz);

  for (const op of wall.openings) {
    const halfW = op.width / 2;
    const normalizedOffset =
      typeof op.offset === 'number'
        ? op.offset
        : typeof (op as any).position === 'number'
          ? (op as any).position
          : 0.5;

    const opT0 = normalizedOffset * wallLen - halfW;
    const opT1 = normalizedOffset * wallLen + halfW;
    const sillHeight = op.sillHeight ?? 0;
    const opTop = sillHeight + op.height;
    openingIntervals.push({ t0: opT0, t1: opT1, y0: sillHeight, y1: opTop });
  }

  openingIntervals.sort((a, b) => a.t0 - b.t0);

  if (openingIntervals.length === 0) {
    strips.push({ t0: tMin, t1: tMax, y0: 0, y1: wallHeight });
    return strips;
  }

  let cursor = tMin;
  for (const op of openingIntervals) {
    const clampedT0 = Math.max(op.t0, tMin);
    const clampedT1 = Math.min(op.t1, tMax);

    if (cursor < clampedT0 - 0.001) {
      strips.push({ t0: cursor, t1: clampedT0, y0: 0, y1: wallHeight });
    }

    if (op.y0 > 0.01 && clampedT0 < clampedT1) {
      strips.push({ t0: clampedT0, t1: clampedT1, y0: 0, y1: op.y0 });
    }

    if (op.y1 < wallHeight - 0.01 && clampedT0 < clampedT1) {
      strips.push({ t0: clampedT0, t1: clampedT1, y0: op.y1, y1: wallHeight });
    }

    cursor = Math.max(cursor, clampedT1);
  }

  if (cursor < tMax - 0.001) {
    strips.push({ t0: cursor, t1: tMax, y0: 0, y1: wallHeight });
  }

  return strips;
}

export function RoomWallSurfaces3D({ rooms, walls, elevation, interactive, onRoomClick }: RoomWallSurfaces3DProps) {
  const surfaces = useMemo(() => {
    const elements: JSX.Element[] = [];

    for (const room of rooms) {
      if (!room.wallMaterialId || !room.polygon || room.polygon.length < 3) continue;

      const mat = getMaterialById(room.wallMaterialId);
      if (!mat) continue;

      for (const wallId of room.wallIds) {
        const wall = walls.find((w) => w.id === wallId);
        if (!wall) continue;

        const clip = clipWallToRoom(wall, room.polygon);
        if (!clip) continue;
        const [tMin, tMax] = clip;

        const faceSide = getRoomFacingSide(wall, room.polygon);

        const dx = wall.to[0] - wall.from[0];
        const dz = wall.to[1] - wall.from[1];
        const wallLen = Math.sqrt(dx * dx + dz * dz);
        if (wallLen < 0.001) continue;

        const ux = dx / wallLen;
        const uz = dz / wallLen;
        const nx = -dz / wallLen;
        const nz = dx / wallLen;

        const sign = faceSide === 'left' ? 1 : -1;
        const offsetDist = sign * (wall.thickness / 2 + SURFACE_OFFSET);
        const angle = Math.atan2(dz, dx);
        const strips = generateClippedStrips(wall, tMin, tMax);

        for (let si = 0; si < strips.length; si++) {
          const strip = strips[si];
          const stripLen = strip.t1 - strip.t0;
          const stripH = strip.y1 - strip.y0;
          if (stripLen < 0.005 || stripH < 0.005) continue;

          const midT = (strip.t0 + strip.t1) / 2;
          const midY = (strip.y0 + strip.y1) / 2 + elevation;

          const px = wall.from[0] + ux * midT + nx * offsetDist;
          const pz = wall.from[1] + uz * midT + nz * offsetDist;

          const material = new THREE.MeshStandardMaterial({
            color: mat.color,
            roughness: mat.roughness ?? 0.8,
            metalness: mat.metalness ?? 0,
            side: THREE.DoubleSide,
            depthWrite: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });

          const scale = room.wallTextureScale ?? 1;
          const rot = room.wallTextureRotation ?? 0;
          applyMaterialTextures(material, mat, stripH, stripLen, 'auto', 'wall', false, scale, rot);

          elements.push(
            <mesh
              key={`${room.id}-${wallId}-${si}`}
              position={[px, midY, pz]}
              rotation={[0, -angle, 0]}
              renderOrder={2}
              onClick={interactive ? (e) => { e.stopPropagation(); onRoomClick?.(room.id); } : undefined}
            >
              <planeGeometry args={[stripLen, stripH]} />
              <primitive object={material} attach="material" />
            </mesh>
          );
        }
      }
    }

    return elements;
  }, [rooms, walls, elevation, interactive, onRoomClick]);

  return <group>{surfaces}</group>;
}

export default function Walls3D() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floor = floors.find((f) => f.id === activeFloorId);
  const walls = floor?.walls ?? [];
  const rooms = floor?.rooms ?? [];
  const elevation = floor?.elevation ?? 0;

  const wallMeshes = useMemo(() =>
    walls.map((wall) => (
      <group key={wall.id}>
        {generateWallSegments(wall, walls, elevation)}
      </group>
    )), [walls, elevation]);

  return (
    <group renderOrder={1}>
      {wallMeshes}
      <RoomWallSurfaces3D rooms={rooms} walls={walls} elevation={elevation} />
    </group>
  );
}
