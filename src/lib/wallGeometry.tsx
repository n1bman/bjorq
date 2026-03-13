/**
 * wallGeometry.tsx — Shared wall geometry builder
 *
 * Phase A1: Extracted from Walls3D.tsx and InteractiveWalls3D.tsx.
 * Phase A2: Angle-aware corner fills via convex hull.
 * Phase B1: Integrated with wallFaces.ts for face identity.
 */

import * as THREE from 'three';
import { getMaterialById } from './materials';
import { createWallMaterials, resolveWallColors } from './wallMaterials';
import type { WallSegment, WallOpening } from '../store/types';
export type { WallFaceType, WallFaceId, WallFace, CornerFaceOwnership } from './wallFaces';
export { getWallFaces, getCornerFaceOwnership, detectClickedFace, getRoomFacingSide, wallFaceId, openingFaceId, parseFaceId, getFaceMaterialField } from './wallFaces';

// ─── Types ───

export interface WallRenderOptions {
  /** Fallback material ID from room assignment */
  fallbackMaterialId?: string;
  /** Override wall body color (for selection/hover highlight) */
  highlightColor?: string | null;
  /** Emissive color for wall body */
  emissive?: string;
  /** Emissive intensity for wall body */
  emissiveIntensity?: number;
  /** Callback when an opening mesh is clicked */
  onOpeningClick?: (e: any, openingId: string) => void;
  /** Currently selected opening ID (for opening highlight) */
  selectedOpeningId?: string | null;
  /** Whether to render inner window reveal geometry */
  includeWindowReveal?: boolean;
}

export interface CornerBlockOptions {
  /** Per-wall fallback material map (wallId → materialId) */
  fallbackMaterialMap?: Record<string, string>;
  /** Whether to apply polygon offset (used in home-view renderer) */
  polygonOffset?: boolean;
}

// ─── Helpers ───

/**
 * Find max thickness of walls connected at a given point (excluding wallId itself).
 */
export function getConnectedThickness(
  walls: WallSegment[],
  wallId: string,
  point: [number, number],
  eps = 0.05,
): number {
  let maxT = 0;
  for (const w of walls) {
    if (w.id === wallId) continue;
    const df = Math.abs(w.from[0] - point[0]) + Math.abs(w.from[1] - point[1]);
    const dt = Math.abs(w.to[0] - point[0]) + Math.abs(w.to[1] - point[1]);
    if (df < eps || dt < eps) maxT = Math.max(maxT, w.thickness);
  }
  return maxT;
}

/**
 * Compute mitered wall geometry parameters.
 * Returns the trimmed length, center position, original (untrimmed) values, and angle.
 */
export function computeWallMitering(wall: WallSegment, allWalls: WallSegment[]) {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const origLength = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const origCx = (wall.from[0] + wall.to[0]) / 2;
  const origCz = (wall.from[1] + wall.to[1]) / 2;

  let length = origLength;
  let cx = origCx;
  let cz = origCz;

  const fromConn = getConnectedThickness(allWalls, wall.id, wall.from);
  const toConn = getConnectedThickness(allWalls, wall.id, wall.to);
  const trimFrom = fromConn > 0 ? Math.max(fromConn, wall.thickness) / 2 : 0;
  const trimTo = toConn > 0 ? Math.max(toConn, wall.thickness) / 2 : 0;

  if (trimFrom > 0 || trimTo > 0) {
    const totalTrim = trimFrom + trimTo;
    if (totalTrim < length) {
      const dir = new THREE.Vector2(dx, dz).normalize();
      const nfx = wall.from[0] + dir.x * trimFrom;
      const nfz = wall.from[1] + dir.y * trimFrom;
      const ntx = wall.to[0] - dir.x * trimTo;
      const ntz = wall.to[1] - dir.y * trimTo;
      length -= totalTrim;
      cx = (nfx + ntx) / 2;
      cz = (nfz + ntz) / 2;
    }
  }

  return { dx, dz, origLength, angle, origCx, origCz, length, cx, cz };
}

// ─── Miter Computation (Phase A3) ───

interface MiterResult {
  fromLeft: number;
  fromRight: number;
  toLeft: number;
  toRight: number;
}

/**
 * Compute per-corner miter offsets for a wall at its from/to endpoints.
 * Each offset is how far the corner vertex shifts along the wall's local X axis
 * (positive = extend into body, negative = extend outward past junction).
 *
 * Junction logic:
 * - Dead end (0 neighbors): flat (offset = 0)
 * - L-corner (1 non-parallel neighbor): miter at bisector angle
 * - T-junction (2+ non-parallel neighbors that agree): use shared miter
 * - Disagreement (e.g. + junction): flat end, corner blocks handle it
 */
export function computeMiterOffsets(wall: WallSegment, allWalls: WallSegment[], eps = 0.05): MiterResult {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return { fromLeft: 0, fromRight: 0, toLeft: 0, toRight: 0 };

  const dirX = dx / len, dirZ = dz / len;
  // Left normal (CCW rotation of wall direction)
  const normX = -dirZ, normZ = dirX;
  const halfT = wall.thickness / 2;
  const result: MiterResult = { fromLeft: 0, fromRight: 0, toLeft: 0, toRight: 0 };

  for (const end of ['from', 'to'] as const) {
    const point = wall[end];
    // Direction from this endpoint INTO the wall body
    const wInX = end === 'from' ? dirX : -dirX;
    const wInZ = end === 'from' ? dirZ : -dirZ;

    const candidates: number[] = [];

    for (const other of allWalls) {
      if (other.id === wall.id) continue;
      const odf = Math.abs(other.from[0] - point[0]) + Math.abs(other.from[1] - point[1]);
      const odt = Math.abs(other.to[0] - point[0]) + Math.abs(other.to[1] - point[1]);
      if (odf >= eps && odt >= eps) continue;

      const isOtherFrom = odf < eps;
      const odx = other.to[0] - other.from[0], odz = other.to[1] - other.from[1];
      const olen = Math.sqrt(odx * odx + odz * odz);
      if (olen < 0.001) continue;

      const oDirX = odx / olen, oDirZ = odz / olen;
      const oNormX = -oDirZ, oNormZ = oDirX;
      const oHalfT = other.thickness / 2;

      // Neighbor's inward direction from junction
      const nInX = isOtherFrom ? oDirX : -oDirX;
      const nInZ = isOtherFrom ? oDirZ : -oDirZ;

      // Cross product — zero means parallel, skip
      const cross = wInX * nInZ - wInZ * nInX;
      if (Math.abs(cross) < 0.01) continue;

      // Left-edge intersection: solve for t along wallInDir
      const rhsX = oNormX * oHalfT - normX * halfT;
      const rhsZ = oNormZ * oHalfT - normZ * halfT;
      const tLeft = (rhsX * nInZ - rhsZ * nInX) / cross;

      candidates.push(tLeft);
    }

    if (candidates.length === 0) continue;

    // Check if all candidates agree (T-junction: both halves give same offset)
    let useOffset = candidates[0];
    let agree = true;
    for (let i = 1; i < candidates.length; i++) {
      if (Math.abs(candidates[i] - useOffset) > 0.02) { agree = false; break; }
    }
    if (!agree) continue; // Disagreement (+ junction) → flat end

    // Clamp to avoid extreme miters at very acute angles
    const maxOffset = len * 0.4;
    useOffset = Math.max(-maxOffset, Math.min(maxOffset, useOffset));

    // Convert t (along wallInDir) to local X offsets
    // At 'from' end: wallInDir = +localX → offset = t
    // At 'to' end: wallInDir = -localX → offset = -t
    if (end === 'from') {
      result.fromLeft = useOffset;
      result.fromRight = -useOffset;
    } else {
      result.toLeft = -useOffset;
      result.toRight = useOffset;
    }
  }

  return result;
}

/**
 * Create a mitered wall BufferGeometry with per-corner vertex offsets.
 * Material groups match BoxGeometry convention:
 *   0: +x (to end), 1: -x (from end), 2: +y (top), 3: -y (bottom),
 *   4: +z (left/exterior), 5: -z (right/interior)
 */
function createMiteredWallGeometry(
  length: number, height: number, thickness: number, miter: MiterResult,
): THREE.BufferGeometry {
  const hl = length / 2, hh = height / 2, ht = thickness / 2;

  // 8 corner vertices — left = +z, right = -z, from = -x, to = +x
  const V = {
    FLB: [-hl + miter.fromLeft,  -hh, +ht] as number[],
    FLT: [-hl + miter.fromLeft,  +hh, +ht] as number[],
    FRB: [-hl + miter.fromRight, -hh, -ht] as number[],
    FRT: [-hl + miter.fromRight, +hh, -ht] as number[],
    TLB: [+hl + miter.toLeft,    -hh, +ht] as number[],
    TLT: [+hl + miter.toLeft,    +hh, +ht] as number[],
    TRB: [+hl + miter.toRight,   -hh, -ht] as number[],
    TRT: [+hl + miter.toRight,   +hh, -ht] as number[],
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vc = 0;

  // Add a quad face (v0-v1-v2-v3 in order that produces outward normal)
  function addFace(v0: number[], v1: number[], v2: number[], v3: number[]) {
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v3[0] - v0[0], v3[1] - v0[1], v3[2] - v0[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;

    const b = vc;
    positions.push(...v0, ...v1, ...v2, ...v3);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    vc += 4;
  }

  // 6 faces — vertex order verified to produce correct outward normals
  addFace(V.TRB, V.TRT, V.TLT, V.TLB); // Group 0: +x (to end)
  addFace(V.FLB, V.FLT, V.FRT, V.FRB); // Group 1: -x (from end)
  addFace(V.FRT, V.FLT, V.TLT, V.TRT); // Group 2: +y (top)
  addFace(V.FLB, V.FRB, V.TRB, V.TLB); // Group 3: -y (bottom)
  addFace(V.FLB, V.TLB, V.TLT, V.FLT); // Group 4: +z (left/exterior)
  addFace(V.FRB, V.FRT, V.TRT, V.TRB); // Group 5: -z (right/interior)

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  for (let g = 0; g < 6; g++) geo.addGroup(g * 6, 6, g);

  return geo;
}

// ─── Opening Rendering ───

function renderOpeningModels(
  wall: WallSegment,
  op: WallOpening,
  i: number,
  opBottom: number,
  elevation: number,
  origLength: number,
  origCx: number,
  origCz: number,
  angle: number,
  options?: WallRenderOptions,
): JSX.Element[] {
  const segments: JSX.Element[] = [];
  const flipSign = op.flipped ? -1 : 1;
  const localX = op.offset * origLength - origLength / 2;
  const opCenterY = opBottom + op.height / 2;
  const opPos = new THREE.Vector3(localX, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
    .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));

  const frameW = 0.04;
  const frameDepth = op.type === 'window' ? 0.10 : 0.06;

  const opMatId = op.materialId;
  const opMat = opMatId ? getMaterialById(opMatId) : null;
  const defaultFrameColor = op.type === 'garage-door' ? '#6a6a6a' : '#c0c0c0';
  const frameColor = opMat?.color ?? defaultFrameColor;

  // Opening selection highlight
  const isOpSelected = options?.selectedOpeningId === op.id;
  const opEmissive = isOpSelected ? '#4a6aff' : '#000000';
  const opEmissiveIntensity = isOpSelected ? 0.5 : 0;

  // Conditionally add pointer handler
  const openingPointer = options?.onOpeningClick
    ? { onPointerDown: (e: any) => options.onOpeningClick!(e, op.id) }
    : {};

  if (op.type === 'door') {
    const isDouble = op.style === 'double';
    const isSliding = op.style === 'sliding';
    const panelW = isDouble ? (op.width - 0.04) / 2 : op.width - 0.04;
    const doorColor = opMat?.color ?? '#7a5a35';

    // Door frame – top
    segments.push(
      <mesh key={`${wall.id}-door-ft-${i}`}
        position={[opPos.x, opBottom + op.height - frameW / 2 + elevation, opPos.z]}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[op.width, frameW, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.3}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
    // Door frame – left
    segments.push(
      <mesh key={`${wall.id}-door-fl-${i}`}
        position={new THREE.Vector3(localX - op.width / 2 + frameW / 2, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[frameW, op.height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.3}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
    // Door frame – right
    segments.push(
      <mesh key={`${wall.id}-door-fr-${i}`}
        position={new THREE.Vector3(localX + op.width / 2 - frameW / 2, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[frameW, op.height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.3}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );

    // Door panel(s)
    if (isDouble) {
      segments.push(
        <mesh key={`${wall.id}-door-pl-${i}`}
          position={new THREE.Vector3(localX - panelW / 2 - 0.01, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
          rotation={[0, -angle, 0]} castShadow {...openingPointer}>
          <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
          <meshStandardMaterial color={doorColor} roughness={0.5}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
      segments.push(
        <mesh key={`${wall.id}-door-pr-${i}`}
          position={new THREE.Vector3(localX + panelW / 2 + 0.01, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
          rotation={[0, -angle, 0]} castShadow {...openingPointer}>
          <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
          <meshStandardMaterial color={doorColor} roughness={0.5}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
    } else {
      const panelOffset = isSliding ? -0.15 : 0;
      segments.push(
        <mesh key={`${wall.id}-door-panel-${i}`}
          position={new THREE.Vector3(localX + panelOffset, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
          rotation={[0, -angle, 0]} castShadow {...openingPointer}>
          <boxGeometry args={[panelW, op.height - 0.06, 0.04]} />
          <meshStandardMaterial color={isSliding ? '#5a4a3a' : doorColor} roughness={0.5}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
      if (isSliding) {
        segments.push(
          <mesh key={`${wall.id}-door-rail-${i}`}
            position={[opPos.x, opBottom + op.height - 0.02 + elevation, opPos.z]}
            rotation={[0, -angle, 0]}>
            <boxGeometry args={[op.width + 0.1, 0.02, 0.03]} />
            <meshStandardMaterial color="#888" roughness={0.3} metalness={0.5} />
          </mesh>
        );
      }
    }

    // Door handle
    segments.push(
      <mesh key={`${wall.id}-door-handle-${i}`}
        position={new THREE.Vector3(localX + (isDouble ? 0 : panelW * 0.35), 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + 1.0 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.05]} />
        <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.7} />
      </mesh>
    );
  } else if (op.type === 'window') {
    const isFrench = op.style === 'french';
    const isFixed = op.style === 'fixed';
    const hasMullion = !isFixed && op.width > 1.0;
    const outerFrameW = 0.05;

    // Glass panel
    segments.push(
      <mesh key={`${wall.id}-win-glass-${i}`}
        position={[opPos.x, opCenterY + elevation, opPos.z]}
        rotation={[0, -angle, 0]} {...openingPointer}>
        <boxGeometry args={[op.width - 0.06, op.height - 0.06, 0.008]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={isFrench ? 0.35 : 0.3}
          roughness={0.05} metalness={0.1}
          emissive={isOpSelected ? '#2244aa' : '#000000'}
          emissiveIntensity={isOpSelected ? 0.3 : 0} />
      </mesh>
    );

    // Frame bars
    const bars: [string, number[], number[]][] = [
      ['top', [opPos.x, opCenterY + op.height / 2 - outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
      ['bottom', [opPos.x, opCenterY - op.height / 2 + outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
    ];
    const leftPos = new THREE.Vector3(localX - op.width / 2 + outerFrameW / 2, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
      .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
    bars.push(['left', leftPos.toArray(), [outerFrameW, op.height, frameDepth]]);
    const rightPos = new THREE.Vector3(localX + op.width / 2 - outerFrameW / 2, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
      .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
    bars.push(['right', rightPos.toArray(), [outerFrameW, op.height, frameDepth]]);

    if (hasMullion) {
      bars.push(['mullion', [opPos.x, opCenterY + elevation, opPos.z], [outerFrameW * 0.7, op.height - 0.06, frameDepth * 0.8]]);
    }

    for (const [key, pos, dims] of bars) {
      segments.push(
        <mesh key={`${wall.id}-win-f${key}-${i}`}
          position={pos as [number, number, number]}
          rotation={[0, -angle, 0]} castShadow {...openingPointer}>
          <boxGeometry args={dims as [number, number, number]} />
          <meshStandardMaterial color={frameColor} roughness={0.3}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
    }

    // Inner reveal (only in interactive/build mode)
    if (options?.includeWindowReveal) {
      const revealDepth = wall.thickness * 0.3;
      segments.push(
        <mesh key={`${wall.id}-win-reveal-top-${i}`}
          position={[opPos.x, opCenterY + op.height / 2 - 0.01 + elevation, opPos.z]}
          rotation={[0, -angle, 0]}>
          <boxGeometry args={[op.width - 0.02, 0.02, revealDepth]} />
          <meshStandardMaterial color="#d0d0d0" roughness={0.8} />
        </mesh>
      );
    }

    // Window sill
    if (!isFrench) {
      const sillNormal = new THREE.Vector3(0, 0, flipSign)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      // Exterior sill
      segments.push(
        <mesh key={`${wall.id}-win-sill-${i}`}
          position={[
            opPos.x + sillNormal.x * 0.05,
            opCenterY - op.height / 2 - 0.02 + elevation,
            opPos.z + sillNormal.z * 0.05,
          ]}
          rotation={[0, -angle, 0]} castShadow>
          <boxGeometry args={[op.width + 0.12, 0.03, wall.thickness + 0.10]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
        </mesh>
      );
      // Interior sill
      segments.push(
        <mesh key={`${wall.id}-win-sill-int-${i}`}
          position={[
            opPos.x - sillNormal.x * 0.04,
            opCenterY - op.height / 2 - 0.01 + elevation,
            opPos.z - sillNormal.z * 0.04,
          ]}
          rotation={[0, -angle, 0]}>
          <boxGeometry args={[op.width + 0.04, 0.025, wall.thickness * 0.4]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.7} />
        </mesh>
      );
    }
  } else if (op.type === 'garage-door') {
    const sections = 4;
    const sectionH = (op.height - 0.04) / sections;
    const garageColor = opMat?.color ?? '#b0b0b0';
    for (let s = 0; s < sections; s++) {
      const sy = opBottom + 0.02 + sectionH * s + sectionH / 2;
      segments.push(
        <mesh key={`${wall.id}-garage-sec-${i}-${s}`}
          position={new THREE.Vector3(localX, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
            .add(new THREE.Vector3(origCx, sy + elevation, origCz)).toArray()}
          rotation={[0, -angle, 0]} castShadow {...openingPointer}>
          <boxGeometry args={[op.width - 0.06, sectionH - 0.02, 0.04]} />
          <meshStandardMaterial color={garageColor} roughness={0.7} metalness={0.2}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
    }

    // Garage door frame
    const gFrameW = 0.05;
    segments.push(
      <mesh key={`${wall.id}-garage-ft-${i}`}
        position={[opPos.x, opBottom + op.height - gFrameW / 2 + elevation, opPos.z]}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[op.width, gFrameW, 0.07]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
    segments.push(
      <mesh key={`${wall.id}-garage-fl-${i}`}
        position={new THREE.Vector3(localX - op.width / 2 + gFrameW / 2, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[gFrameW, op.height, 0.07]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
    segments.push(
      <mesh key={`${wall.id}-garage-fr-${i}`}
        position={new THREE.Vector3(localX + op.width / 2 - gFrameW / 2, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[gFrameW, op.height, 0.07]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.3}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
  } else if (op.type === 'passage') {
    const pFrameW = 0.04;
    const pFrameDepth = 0.06;
    const pFrameColor = opMat?.color ?? '#b0b0b0';
    // Top frame
    segments.push(
      <mesh key={`${wall.id}-pass-ft-${i}`}
        position={[opPos.x, opBottom + op.height - pFrameW / 2 + elevation, opPos.z]}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[op.width, pFrameW, pFrameDepth]} />
        <meshStandardMaterial color={pFrameColor} roughness={0.4}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
    // Left frame
    segments.push(
      <mesh key={`${wall.id}-pass-fl-${i}`}
        position={new THREE.Vector3(localX - op.width / 2 + pFrameW / 2, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[pFrameW, op.height, pFrameDepth]} />
        <meshStandardMaterial color={pFrameColor} roughness={0.4}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
    // Right frame
    segments.push(
      <mesh key={`${wall.id}-pass-fr-${i}`}
        position={new THREE.Vector3(localX + op.width / 2 - pFrameW / 2, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz)).toArray()}
        rotation={[0, -angle, 0]} castShadow {...openingPointer}>
        <boxGeometry args={[pFrameW, op.height, pFrameDepth]} />
        <meshStandardMaterial color={pFrameColor} roughness={0.4}
          emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
      </mesh>
    );
  }

  return segments;
}

// ─── Main Segment Generator ───

/**
 * Generate all JSX mesh elements for a single wall segment,
 * including mitered body, opening splits, and opening 3D models.
 */
export function generateWallSegments(
  wall: WallSegment,
  allWalls: WallSegment[],
  elevation: number,
  options?: WallRenderOptions,
): JSX.Element[] {
  const { origLength, angle, origCx, origCz, length, cx, cz } = computeWallMitering(wall, allWalls);
  const miterOffsets = computeMiterOffsets(wall, allWalls);

  const wallColors = resolveWallColors(wall, options?.fallbackMaterialId);

  // Build dual-sided material array, with optional highlight override
  const dualMats = options?.highlightColor
    ? createWallMaterials({
        ...wallColors,
        exteriorColor: options.highlightColor,
        interiorColor: options.highlightColor,
        edgeColor: options.highlightColor,
        emissive: options.emissive,
        emissiveIntensity: options.emissiveIntensity,
      })
    : createWallMaterials({
        ...wallColors,
        emissive: options?.emissive,
        emissiveIntensity: options?.emissiveIntensity,
      });

  const wallHeight = wall.height;
  const segments: JSX.Element[] = [];

  // No openings: single box
  if (wall.openings.length === 0) {
    const miterGeo = createMiteredWallGeometry(origLength, wallHeight, wall.thickness, miterOffsets);
    segments.push(
      <mesh key={`${wall.id}-solid`}
        position={[origCx, wallHeight / 2 + elevation, origCz]}
        rotation={[0, -angle, 0]}
        castShadow receiveShadow
        material={dualMats}>
        <primitive object={miterGeo} attach="geometry" />
      </mesh>
    );
  } else {
    // Split wall around openings
    const sortedOpenings = [...wall.openings].sort((a, b) => a.offset - b.offset);
    let cursor = 0;

    sortedOpenings.forEach((op, i) => {
      const opStart = op.offset * origLength - op.width / 2;
      const opEnd = op.offset * origLength + op.width / 2;
      const opBottom = op.type === 'window' ? (op.sillHeight ?? (wallHeight - op.height) / 2) : 0;
      const opTop = opBottom + op.height;

      // Segment before opening
      if (opStart > cursor) {
        const segLen = opStart - cursor;
        const segCenter = cursor + segLen / 2;
        const localX = segCenter - origLength / 2;
        const pos = new THREE.Vector3(localX, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, wallHeight / 2 + elevation, origCz));
        // First sub-segment touches wall's from endpoint → apply from-end miter
        const isFirstSeg = cursor === 0;
        const segMiter: MiterResult = isFirstSeg
          ? { fromLeft: miterOffsets.fromLeft, fromRight: miterOffsets.fromRight, toLeft: 0, toRight: 0 }
          : { fromLeft: 0, fromRight: 0, toLeft: 0, toRight: 0 };
        const segGeo = createMiteredWallGeometry(segLen, wallHeight, wall.thickness, segMiter);
        segments.push(
          <mesh key={`${wall.id}-seg-${i}-pre`} position={pos.toArray()} rotation={[0, -angle, 0]}
            castShadow material={dualMats}>
            <primitive object={segGeo} attach="geometry" />
          </mesh>
        );
      }

      // Above opening
      if (opTop < wallHeight) {
        const aboveH = wallHeight - opTop;
        const localX = op.offset * origLength - origLength / 2;
        const pos = new THREE.Vector3(localX, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opTop + aboveH / 2 + elevation, origCz));
        segments.push(
          <mesh key={`${wall.id}-seg-${i}-above`} position={pos.toArray()} rotation={[0, -angle, 0]}
            castShadow material={dualMats}>
            <boxGeometry args={[op.width, aboveH, wall.thickness]} />
          </mesh>
        );
      }

      // Below opening (for windows with sill height > 0)
      if (opBottom > 0) {
        const localX = op.offset * origLength - origLength / 2;
        const pos = new THREE.Vector3(localX, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, opBottom / 2 + elevation, origCz));
        segments.push(
          <mesh key={`${wall.id}-seg-${i}-below`} position={pos.toArray()} rotation={[0, -angle, 0]}
            castShadow material={dualMats}>
            <boxGeometry args={[op.width, opBottom, wall.thickness]} />
          </mesh>
        );
      }

      // 3D opening models (door/window/garage/passage)
      segments.push(
        ...renderOpeningModels(wall, op, i, opBottom, elevation, origLength, origCx, origCz, angle, options)
      );

      cursor = opEnd;
    });

    // Final segment after last opening
    if (cursor < origLength) {
      const segLen = origLength - cursor;
      const segCenter = cursor + segLen / 2;
      const localX = segCenter - origLength / 2;
      const pos = new THREE.Vector3(localX, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
        .add(new THREE.Vector3(origCx, wallHeight / 2 + elevation, origCz));
      // Last sub-segment touches wall's to endpoint → apply to-end miter
      const lastSegMiter: MiterResult = {
        fromLeft: 0, fromRight: 0,
        toLeft: miterOffsets.toLeft, toRight: miterOffsets.toRight,
      };
      const lastSegGeo = createMiteredWallGeometry(segLen, wallHeight, wall.thickness, lastSegMiter);
      segments.push(
        <mesh key={`${wall.id}-seg-last`} position={pos.toArray()} rotation={[0, -angle, 0]}
          castShadow material={dualMats}>
          <primitive object={lastSegGeo} attach="geometry" />
        </mesh>
      );
    }
  }

  return segments;
}

// ─── Convex Hull (Andrew's monotone chain) ───

function convexHull2D(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 1) return pts;

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  // Lower hull
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  // Upper hull
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// ─── Corner Block Generator ───

/**
 * Gather wall edge points at a junction and return the connected wall info.
 */
function getJunctionEdgePoints(
  nodePos: [number, number],
  walls: WallSegment[],
  eps: number,
): { edgePoints: [number, number][]; maxHeight: number; wallColors: ReturnType<typeof resolveWallColors>[]; maxThickness: number } {
  const edgePoints: [number, number][] = [];
  let maxHeight = 0;
  let maxThickness = 0;
  const wallColors: ReturnType<typeof resolveWallColors>[] = [];

  for (const wall of walls) {
    const df = Math.abs(wall.from[0] - nodePos[0]) + Math.abs(wall.from[1] - nodePos[1]);
    const dt = Math.abs(wall.to[0] - nodePos[0]) + Math.abs(wall.to[1] - nodePos[1]);
    if (df >= eps && dt >= eps) continue;

    const dx = wall.to[0] - wall.from[0];
    const dz = wall.to[1] - wall.from[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.001) continue;

    // Normal perpendicular to wall direction
    const nx = -dz / len;
    const nz = dx / len;
    const halfT = wall.thickness / 2;

    edgePoints.push([nodePos[0] + nx * halfT, nodePos[1] + nz * halfT]);
    edgePoints.push([nodePos[0] - nx * halfT, nodePos[1] - nz * halfT]);

    maxHeight = Math.max(maxHeight, wall.height);
    maxThickness = Math.max(maxThickness, wall.thickness);
  }

  return { edgePoints, maxHeight, wallColors, maxThickness };
}

/**
 * Generate corner fill blocks at wall junctions.
 * Phase A2: Uses convex hull of wall edge points for angle-aware corners.
 * Falls back to axis-aligned square block if hull computation fails.
 */
export function generateCornerBlocks(
  walls: WallSegment[],
  elevation: number,
  options?: CornerBlockOptions,
): JSX.Element[] {
  const eps = 0.05;

  // Collect junction nodes
  const nodeMap = new Map<string, {
    pos: [number, number];
    maxThickness: number;
    maxHeight: number;
    wallColors: ReturnType<typeof resolveWallColors>[];
  }>();

  for (const wall of walls) {
    const fallbackMatId = options?.fallbackMaterialMap?.[wall.id];
    const wc = resolveWallColors(wall, fallbackMatId);
    for (const pt of [wall.from, wall.to]) {
      const key = `${Math.round(pt[0] / eps) * eps},${Math.round(pt[1] / eps) * eps}`;
      const existing = nodeMap.get(key);
      if (existing) {
        existing.maxThickness = Math.max(existing.maxThickness, wall.thickness);
        existing.maxHeight = Math.max(existing.maxHeight, wall.height);
        existing.wallColors.push(wc);
      } else {
        nodeMap.set(key, { pos: pt, maxThickness: wall.thickness, maxHeight: wall.height, wallColors: [wc] });
      }
    }
  }

  const blocks: JSX.Element[] = [];

  for (const [key, { pos, maxThickness, maxHeight, wallColors }] of nodeMap) {
    // Count connections
    let connectionCount = 0;
    for (const wall of walls) {
      const df = Math.abs(wall.from[0] - pos[0]) + Math.abs(wall.from[1] - pos[1]);
      const dt = Math.abs(wall.to[0] - pos[0]) + Math.abs(wall.to[1] - pos[1]);
      if (df < eps || dt < eps) connectionCount++;
    }
    // Phase A3: Skip L-corners (2 walls) — mitered geometry handles them
    if (connectionCount < 3) continue;

    const dominantColor = wallColors[0]?.exteriorColor ?? '#e0e0e0';
    const matProps: Record<string, any> = {
      color: dominantColor,
      roughness: 0.7,
      side: THREE.FrontSide,
    };
    if (options?.polygonOffset) {
      matProps.polygonOffset = true;
      matProps.polygonOffsetFactor = -1;
      matProps.polygonOffsetUnits = -1;
    }

    // Try angle-aware convex hull corner
    const { edgePoints, maxHeight: junctionHeight } = getJunctionEdgePoints(pos, walls, eps);
    const height = Math.max(maxHeight, junctionHeight);

    let usedHull = false;
    if (edgePoints.length >= 3) {
      try {
        const hull = convexHull2D(edgePoints);
        if (hull.length >= 3) {
          // Compute hull area to validate — reject degenerate hulls
          let area = 0;
          for (let i = 0; i < hull.length; i++) {
            const j = (i + 1) % hull.length;
            area += (hull[i][0] - pos[0]) * (hull[j][1] - pos[1]);
            area -= (hull[j][0] - pos[0]) * (hull[i][1] - pos[1]);
          }
          area = Math.abs(area) / 2;

          if (area > 0.0001 && area < 10) {
            // Build Shape in local coordinates relative to nodePos
            const shape = new THREE.Shape();
            shape.moveTo(hull[0][0] - pos[0], hull[0][1] - pos[1]);
            for (let i = 1; i < hull.length; i++) {
              shape.lineTo(hull[i][0] - pos[0], hull[i][1] - pos[1]);
            }
            shape.closePath();

            blocks.push(
              <mesh key={`corner-${key}`}
                position={[pos[0], elevation, pos[1]]}
                rotation={[-Math.PI / 2, 0, 0]}
                castShadow receiveShadow>
                <extrudeGeometry args={[shape, { depth: height, bevelEnabled: false }]} />
                <meshStandardMaterial {...matProps} />
              </mesh>
            );
            usedHull = true;
          }
        }
      } catch {
        // Fall through to square fallback
      }
    }

    // Fallback: axis-aligned square block (original behavior)
    if (!usedHull) {
      blocks.push(
        <mesh key={`corner-${key}`}
          position={[pos[0], height / 2 + elevation, pos[1]]}
          castShadow receiveShadow>
          <boxGeometry args={[maxThickness, height, maxThickness]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      );
    }
  }

  return blocks;
}

