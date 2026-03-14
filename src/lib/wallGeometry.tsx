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
  /** Extra texture scale multiplier from room */
  extraTextureScale?: number;
  /** Texture rotation in degrees from room */
  textureRotationDeg?: number;
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
    const is4Pane = op.style?.startsWith('4pane');
    const is6Pane = op.style === '6pane-frost-mid';
    const outerFrameW = 0.05;

    if (is4Pane) {
      // ─── 4-pane Swedish tvåluftsfönster ───
      const innerW = op.width - outerFrameW * 2;
      const innerH = op.height - outerFrameW * 2;
      const mullionW = outerFrameW * 0.7;
      const railH = outerFrameW * 0.7;
      const splitRatio = 0.35;

      const topPaneH = innerH * splitRatio - railH / 2;
      const botPaneH = innerH * (1 - splitRatio) - railH / 2;
      const halfPaneW = (innerW - mullionW) / 2;

      const railY = opCenterY + innerH / 2 - innerH * splitRatio + elevation;
      const topCenterY = railY + railH / 2 + topPaneH / 2;
      const botCenterY = railY - railH / 2 - botPaneH / 2;

      const frosted = op.style === '4pane-frost-bottom'
        ? [false, false, true, true]
        : [false, false, false, false];

      const paneOffsetX = (side: 'left' | 'right') => {
        const sign = side === 'left' ? -1 : 1;
        return localX + sign * (halfPaneW / 2 + mullionW / 2);
      };

      const panes = [
        { key: 'tl', lx: paneOffsetX('left'), cy: topCenterY, w: halfPaneW, h: topPaneH, frost: frosted[0] },
        { key: 'tr', lx: paneOffsetX('right'), cy: topCenterY, w: halfPaneW, h: topPaneH, frost: frosted[1] },
        { key: 'bl', lx: paneOffsetX('left'), cy: botCenterY, w: halfPaneW, h: botPaneH, frost: frosted[2] },
        { key: 'br', lx: paneOffsetX('right'), cy: botCenterY, w: halfPaneW, h: botPaneH, frost: frosted[3] },
      ];

      for (const pane of panes) {
        const pos = new THREE.Vector3(pane.lx, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, pane.cy, origCz));
        segments.push(
          <mesh key={`${wall.id}-4p-${pane.key}-${i}`}
            position={pos.toArray()} rotation={[0, -angle, 0]} {...openingPointer}>
            <boxGeometry args={[pane.w - 0.01, pane.h - 0.01, 0.008]} />
            <meshStandardMaterial
              color={pane.frost ? '#e8eef4' : '#88ccff'}
              transparent
              opacity={pane.frost ? 0.7 : 0.3}
              roughness={pane.frost ? 0.8 : 0.05}
              metalness={pane.frost ? 0 : 0.1}
              emissive={isOpSelected ? '#2244aa' : '#000000'}
              emissiveIntensity={isOpSelected ? 0.3 : 0}
            />
          </mesh>
        );
      }

      const bars4: [string, number[], number[]][] = [
        ['top', [opPos.x, opCenterY + op.height / 2 - outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
        ['bottom', [opPos.x, opCenterY - op.height / 2 + outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
        ['mullion', [opPos.x, opCenterY + elevation, opPos.z], [mullionW, innerH, frameDepth * 0.8]],
        ['rail', [opPos.x, railY, opPos.z], [innerW, railH, frameDepth * 0.8]],
      ];
      const leftPos4 = new THREE.Vector3(localX - op.width / 2 + outerFrameW / 2, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
        .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
      bars4.push(['left', leftPos4.toArray(), [outerFrameW, op.height, frameDepth]]);
      const rightPos4 = new THREE.Vector3(localX + op.width / 2 - outerFrameW / 2, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
        .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
      bars4.push(['right', rightPos4.toArray(), [outerFrameW, op.height, frameDepth]]);

      for (const [key, pos, dims] of bars4) {
        segments.push(
          <mesh key={`${wall.id}-4pf-${key}-${i}`}
            position={pos as [number, number, number]}
            rotation={[0, -angle, 0]} castShadow {...openingPointer}>
            <boxGeometry args={dims as [number, number, number]} />
            <meshStandardMaterial color={frameColor} roughness={0.3}
              emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
          </mesh>
        );
      }

      // Sill for 4-pane
      const sillNormal4 = new THREE.Vector3(0, 0, flipSign)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      segments.push(
        <mesh key={`${wall.id}-win-sill-${i}`}
          position={[
            opPos.x + sillNormal4.x * 0.05,
            opCenterY - op.height / 2 - 0.02 + elevation,
            opPos.z + sillNormal4.z * 0.05,
          ]}
          rotation={[0, -angle, 0]} castShadow>
          <boxGeometry args={[op.width + 0.12, 0.03, wall.thickness + 0.10]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
        </mesh>
      );
      segments.push(
        <mesh key={`${wall.id}-win-sill-int-${i}`}
          position={[
            opPos.x - sillNormal4.x * 0.04,
            opCenterY - op.height / 2 - 0.01 + elevation,
            opPos.z - sillNormal4.z * 0.04,
          ]}
          rotation={[0, -angle, 0]}>
          <boxGeometry args={[op.width + 0.04, 0.025, wall.thickness * 0.4]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.7} />
        </mesh>
      );
    } else if (is6Pane) {
      // ─── 6-pane window (3 rows × 2 cols), middle row frosted ───
      const innerW = op.width - outerFrameW * 2;
      const innerH = op.height - outerFrameW * 2;
      const mullionW = outerFrameW * 0.7;
      const railH = outerFrameW * 0.7;

      // Row proportions: top 30%, mid 35%, bot 35%
      const topRatio = 0.30, midRatio = 0.35;
      const topH = innerH * topRatio - railH / 2;
      const midH = innerH * midRatio - railH;
      const botH = innerH * (1 - topRatio - midRatio) - railH / 2;
      const halfPaneW = (innerW - mullionW) / 2;

      // Rail Y positions (two horizontal rails)
      const rail1Y = opCenterY + innerH / 2 - innerH * topRatio + elevation;
      const rail2Y = opCenterY + innerH / 2 - innerH * (topRatio + midRatio) + elevation;

      const topCY = rail1Y + railH / 2 + topH / 2;
      const midCY = (rail1Y + rail2Y) / 2;
      const botCY = rail2Y - railH / 2 - botH / 2;

      const paneOffsetX6 = (side: 'left' | 'right') => {
        const sign = side === 'left' ? -1 : 1;
        return localX + sign * (halfPaneW / 2 + mullionW / 2);
      };

      // 6 panes: top-left, top-right, mid-left(frost), mid-right(frost), bot-left, bot-right
      const panes6 = [
        { key: 'tl', lx: paneOffsetX6('left'), cy: topCY, w: halfPaneW, h: topH, frost: false },
        { key: 'tr', lx: paneOffsetX6('right'), cy: topCY, w: halfPaneW, h: topH, frost: false },
        { key: 'ml', lx: paneOffsetX6('left'), cy: midCY, w: halfPaneW, h: midH, frost: true },
        { key: 'mr', lx: paneOffsetX6('right'), cy: midCY, w: halfPaneW, h: midH, frost: true },
        { key: 'bl', lx: paneOffsetX6('left'), cy: botCY, w: halfPaneW, h: botH, frost: false },
        { key: 'br', lx: paneOffsetX6('right'), cy: botCY, w: halfPaneW, h: botH, frost: false },
      ];

      for (const pane of panes6) {
        const pos = new THREE.Vector3(pane.lx, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
          .add(new THREE.Vector3(origCx, pane.cy, origCz));
        segments.push(
          <mesh key={`${wall.id}-6p-${pane.key}-${i}`}
            position={pos.toArray()} rotation={[0, -angle, 0]} {...openingPointer}>
            <boxGeometry args={[pane.w - 0.01, pane.h - 0.01, 0.008]} />
            <meshStandardMaterial
              color={pane.frost ? '#e8eef4' : '#88ccff'}
              transparent
              opacity={pane.frost ? 0.7 : 0.3}
              roughness={pane.frost ? 0.8 : 0.05}
              metalness={pane.frost ? 0 : 0.1}
              emissive={isOpSelected ? '#2244aa' : '#000000'}
              emissiveIntensity={isOpSelected ? 0.3 : 0}
            />
          </mesh>
        );
      }

      // Frame bars: outer frame + mullion + two rails
      const bars6: [string, number[], number[]][] = [
        ['top', [opPos.x, opCenterY + op.height / 2 - outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
        ['bottom', [opPos.x, opCenterY - op.height / 2 + outerFrameW / 2 + elevation, opPos.z], [op.width, outerFrameW, frameDepth]],
        ['mullion', [opPos.x, opCenterY + elevation, opPos.z], [mullionW, innerH, frameDepth * 0.8]],
        ['rail1', [opPos.x, rail1Y, opPos.z], [innerW, railH, frameDepth * 0.8]],
        ['rail2', [opPos.x, rail2Y, opPos.z], [innerW, railH, frameDepth * 0.8]],
      ];
      const leftPos6 = new THREE.Vector3(localX - op.width / 2 + outerFrameW / 2, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
        .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
      bars6.push(['left', leftPos6.toArray(), [outerFrameW, op.height, frameDepth]]);
      const rightPos6 = new THREE.Vector3(localX + op.width / 2 - outerFrameW / 2, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
        .add(new THREE.Vector3(origCx, opCenterY + elevation, origCz));
      bars6.push(['right', rightPos6.toArray(), [outerFrameW, op.height, frameDepth]]);

      for (const [key, pos, dims] of bars6) {
        segments.push(
          <mesh key={`${wall.id}-6pf-${key}-${i}`}
            position={pos as [number, number, number]}
            rotation={[0, -angle, 0]} castShadow {...openingPointer}>
            <boxGeometry args={dims as [number, number, number]} />
            <meshStandardMaterial color={frameColor} roughness={0.3}
              emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
          </mesh>
        );
      }

      // Sill for 6-pane
      const sillNormal6 = new THREE.Vector3(0, 0, flipSign)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      segments.push(
        <mesh key={`${wall.id}-win-sill6-${i}`}
          position={[
            opPos.x + sillNormal6.x * 0.05,
            opCenterY - op.height / 2 - 0.02 + elevation,
            opPos.z + sillNormal6.z * 0.05,
          ]}
          rotation={[0, -angle, 0]} castShadow>
          <boxGeometry args={[op.width + 0.12, 0.03, wall.thickness + 0.10]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
        </mesh>
      );
      segments.push(
        <mesh key={`${wall.id}-win-sill6-int-${i}`}
          position={[
            opPos.x - sillNormal6.x * 0.04,
            opCenterY - op.height / 2 - 0.01 + elevation,
            opPos.z - sillNormal6.z * 0.04,
          ]}
          rotation={[0, -angle, 0]}>
          <boxGeometry args={[op.width + 0.04, 0.025, wall.thickness * 0.4]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.7} />
        </mesh>
      );
    } else {
      // ─── Standard window (casement / french / fixed) ───
      const hasMullion = !isFixed && op.width > 1.0;

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

      // Inner reveal
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
    // Garage frame
    const gfBars: [string, number[], number[]][] = [
      ['top', [opPos.x, opBottom + op.height - 0.025 + elevation, opPos.z], [op.width + 0.06, 0.05, 0.08]],
    ];
    const gfLeft = new THREE.Vector3(localX - op.width / 2 - 0.015, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
      .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz));
    gfBars.push(['left', gfLeft.toArray(), [0.05, op.height, 0.08]]);
    const gfRight = new THREE.Vector3(localX + op.width / 2 + 0.015, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
      .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz));
    gfBars.push(['right', gfRight.toArray(), [0.05, op.height, 0.08]]);

    for (const [key, pos, dims] of gfBars) {
      segments.push(
        <mesh key={`${wall.id}-gf-${key}-${i}`}
          position={pos as [number, number, number]}
          rotation={[0, -angle, 0]} castShadow>
          <boxGeometry args={dims as [number, number, number]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.6} metalness={0.3} />
        </mesh>
      );
    }
  } else if (op.type === 'passage') {
    // Passage — open frame, no leaf
    const passFrameW = 0.045;
    const passBars: [string, number[], number[]][] = [
      ['top', [opPos.x, opBottom + op.height - passFrameW / 2 + elevation, opPos.z], [op.width, passFrameW, frameDepth]],
    ];
    const pleft = new THREE.Vector3(localX - op.width / 2 + passFrameW / 2, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
      .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz));
    passBars.push(['left', pleft.toArray(), [passFrameW, op.height, frameDepth]]);
    const pright = new THREE.Vector3(localX + op.width / 2 - passFrameW / 2, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
      .add(new THREE.Vector3(origCx, opBottom + op.height / 2 + elevation, origCz));
    passBars.push(['right', pright.toArray(), [passFrameW, op.height, frameDepth]]);

    for (const [key, pos, dims] of passBars) {
      segments.push(
        <mesh key={`${wall.id}-pass-${key}-${i}`}
          position={pos as [number, number, number]}
          rotation={[0, -angle, 0]} castShadow {...openingPointer}>
          <boxGeometry args={dims as [number, number, number]} />
          <meshStandardMaterial color={frameColor} roughness={0.3}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
    }

    // Arch style
    if (op.style === 'arch') {
      segments.push(
        <mesh key={`${wall.id}-pass-arch-${i}`}
          position={[opPos.x, opBottom + op.height - 0.08 + elevation, opPos.z]}
          rotation={[0, -angle, 0]} castShadow>
          <boxGeometry args={[op.width - 0.08, 0.08, frameDepth * 0.6]} />
          <meshStandardMaterial color={frameColor} roughness={0.3}
            emissive={opEmissive} emissiveIntensity={opEmissiveIntensity} />
        </mesh>
      );
    }
  }

  return segments;
}

// ─── Main Wall Segment Renderer ───

/**
 * Generates 3D mesh elements for a single wall, including mitered geometry,
 * face materials, and opening models (doors, windows, passages, garage doors).
 */
export function generateWallSegments(
  wall: WallSegment,
  allWalls: WallSegment[],
  elevation: number,
  options?: WallRenderOptions,
): JSX.Element[] {
  const { origLength, origCx, origCz, angle } = computeWallMitering(wall, allWalls);
  const miter = computeMiterOffsets(wall, allWalls);
  const wallHeight = wall.height;

  // Resolve per-face colors
  const { exteriorColor, interiorColor, edgeColor, exteriorRoughness, interiorRoughness, exteriorMetalness, interiorMetalness, exteriorMatId, interiorMatId } = resolveWallColors(wall, options?.fallbackMaterialId);

  const emissive = options?.emissive ?? '#000000';
  const emissiveIntensity = options?.emissiveIntensity ?? 0;

  // Create mitered geometry
  const geo = createMiteredWallGeometry(origLength, wallHeight, wall.thickness, miter);

  // Build material array
  const mats = createWallMaterials({
    exteriorColor: options?.highlightColor ?? exteriorColor,
    interiorColor: options?.highlightColor ?? interiorColor,
    edgeColor: options?.highlightColor ?? edgeColor,
    exteriorRoughness,
    interiorRoughness,
    exteriorMetalness,
    interiorMetalness,
    emissive,
    emissiveIntensity,
    exteriorMatId,
    interiorMatId,
    wallHeight,
    wallWidth: origLength,
    extraScale: options?.extraTextureScale,
    rotationDeg: options?.textureRotationDeg,
  });

  const segments: JSX.Element[] = [];

  if (!wall.openings || wall.openings.length === 0) {
    // No openings — use full mitered geometry
    segments.push(
      <mesh
        key={`${wall.id}-body`}
        geometry={geo}
        material={mats}
        position={[origCx, wallHeight / 2 + elevation, origCz]}
        rotation={[0, -angle, 0]}
        castShadow
        receiveShadow
      />
    );
  } else {
    // Has openings — split wall into sub-sections leaving gaps for openings
    const halfLen = origLength / 2;

    // Compute local X ranges for each opening
    const opRanges = wall.openings.map((op) => {
      const localX = op.offset * origLength - halfLen;
      const halfW = op.width / 2;
      const opBottom = op.type === 'window' ? (op.sillHeight ?? (wallHeight - op.height) / 2) : 0;
      return { left: localX - halfW, right: localX + halfW, bottom: opBottom, top: opBottom + op.height };
    }).sort((a, b) => a.left - b.left);

    // Helper: create a positioned box section of the wall
    const wallSection = (key: string, localCenterX: number, centerY: number, w: number, h: number) => {
      const pos = new THREE.Vector3(localCenterX, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle)
        .add(new THREE.Vector3(origCx, centerY, origCz));
      return (
        <mesh key={key} position={pos.toArray()} rotation={[0, -angle, 0]} castShadow receiveShadow material={mats}>
          <boxGeometry args={[w, h, wall.thickness]} />
        </mesh>
      );
    };

    // 1. Vertical strips (full-height wall between/outside openings)
    let cursor = -halfLen;
    let stripIdx = 0;
    for (const r of opRanges) {
      if (r.left > cursor + 0.001) {
        const w = r.left - cursor;
        segments.push(wallSection(`${wall.id}-vs-${stripIdx++}`, (cursor + r.left) / 2, wallHeight / 2 + elevation, w, wallHeight));
      }
      cursor = Math.max(cursor, r.right);
    }
    if (cursor < halfLen - 0.001) {
      const w = halfLen - cursor;
      segments.push(wallSection(`${wall.id}-vs-${stripIdx}`, (cursor + halfLen) / 2, wallHeight / 2 + elevation, w, wallHeight));
    }

    // 2. Header strips (above each opening)
    for (let oi = 0; oi < opRanges.length; oi++) {
      const r = opRanges[oi];
      const headerH = wallHeight - r.top;
      if (headerH > 0.01) {
        segments.push(wallSection(`${wall.id}-hdr-${oi}`, (r.left + r.right) / 2, r.top + headerH / 2 + elevation, r.right - r.left, headerH));
      }
    }

    // 3. Sill strips (below windows — where bottom > 0)
    for (let oi = 0; oi < opRanges.length; oi++) {
      const r = opRanges[oi];
      if (r.bottom > 0.01) {
        segments.push(wallSection(`${wall.id}-sill-${oi}`, (r.left + r.right) / 2, r.bottom / 2 + elevation, r.right - r.left, r.bottom));
      }
    }
  }

  // Openings
  if (wall.openings) {
    for (let i = 0; i < wall.openings.length; i++) {
      const op = wall.openings[i];
      const opBottom = op.type === 'window' ? (op.sillHeight ?? (wallHeight - op.height) / 2) : 0;
      const openingElements = renderOpeningModels(wall, op, i, opBottom, elevation, origLength, origCx, origCz, angle, options);
      segments.push(...openingElements);
    }
  }

  return segments;
}


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

