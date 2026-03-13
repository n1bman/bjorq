/**
 * wallFaces.ts — Phase B1: Wall Face Foundation
 *
 * Defines addressable wall surfaces/faces for future editing,
 * material assignment, and wall-mounted object placement.
 *
 * Key design decisions:
 * - Faces are COMPUTED from existing WallSegment data, not persisted separately.
 * - The existing `leftMaterialId`/`rightMaterialId` fields already store per-face materials.
 * - This module adds stable identifiers and geometric metadata on top.
 * - No persistence changes required — fully backward compatible.
 *
 * Face coordinate system (relative to wall direction from→to):
 * - "left" face: the +z side of the box after rotation (when looking from→to, on your left)
 * - "right" face: the -z side of the box after rotation
 * - "top" face: the +y side
 *
 * This matches the existing wallMaterials.ts mapping:
 *   +z (front) = exterior = leftMaterialId
 *   -z (back)  = interior = rightMaterialId
 */

import type { WallSegment, WallOpening, Room } from '../store/types';

// ─── Face Type Enum ───

/**
 * All possible face types on a wall segment.
 * Primary faces exist on every wall. Opening faces exist per opening.
 */
export type WallFaceType =
  // Primary wall faces
  | 'left'           // +z face (exterior/left when looking from→to)
  | 'right'          // -z face (interior/right when looking from→to)
  | 'top'            // +y face (top edge of wall)
  // Opening-related faces
  | 'opening-reveal-left'   // inside of opening, left wall
  | 'opening-reveal-right'  // inside of opening, right wall
  | 'opening-lintel'        // inside of opening, top surface
  | 'opening-sill';         // inside of opening, bottom surface (windows)

/**
 * Stable face identifier string.
 * Format: "{wallId}:{faceType}" for primary faces
 *         "{wallId}:opening:{openingId}:{faceType}" for opening faces
 */
export type WallFaceId = string;

// ─── Face Data ───

/**
 * Describes a single addressable wall face/surface.
 * This is a computed view — not persisted.
 */
export interface WallFace {
  /** Stable identifier for this face */
  id: WallFaceId;
  /** The wall segment this face belongs to */
  wallId: string;
  /** Face type */
  type: WallFaceType;
  /** Opening ID if this is an opening-related face */
  openingId?: string;
  /** World-space normal direction [x, y, z] (unit vector) */
  normal: [number, number, number];
  /** World-space center point [x, y, z] */
  center: [number, number, number];
  /** Face dimensions [width, height] in meters */
  dimensions: [number, number];
  /** Current material ID assigned to this face (if any) */
  materialId?: string;
  /** Whether this face is eligible for material/decor editing */
  editable: boolean;
  /** Whether this face can receive wall-mounted objects */
  mountable: boolean;
}

/**
 * Corner junction face ownership — describes which wall faces
 * are adjacent to a corner fill block.
 */
export interface CornerFaceOwnership {
  /** Node position key */
  nodeKey: string;
  /** Position of the junction node */
  position: [number, number];
  /** Wall faces that meet at this corner */
  adjacentFaces: WallFaceId[];
  /** Wall IDs connected at this junction */
  wallIds: string[];
}

// ─── Face ID Builders ───

/** Build a face ID for a primary wall face */
export function wallFaceId(wallId: string, faceType: WallFaceType): WallFaceId {
  return `${wallId}:${faceType}`;
}

/** Build a face ID for an opening-related face */
export function openingFaceId(wallId: string, openingId: string, faceType: WallFaceType): WallFaceId {
  return `${wallId}:opening:${openingId}:${faceType}`;
}

/** Parse a face ID back into its components */
export function parseFaceId(faceId: WallFaceId): {
  wallId: string;
  faceType: WallFaceType;
  openingId?: string;
} | null {
  const openingMatch = faceId.match(/^(.+):opening:(.+):(.+)$/);
  if (openingMatch) {
    return {
      wallId: openingMatch[1],
      openingId: openingMatch[2],
      faceType: openingMatch[3] as WallFaceType,
    };
  }
  const primaryMatch = faceId.match(/^(.+):(left|right|top)$/);
  if (primaryMatch) {
    return {
      wallId: primaryMatch[1],
      faceType: primaryMatch[2] as WallFaceType,
    };
  }
  return null;
}

// ─── Face Computation ───

/**
 * Compute the world-space normal for a wall face.
 * The wall direction is from→to; left normal is perpendicular CCW.
 */
function computeWallNormals(wall: WallSegment): {
  leftNormal: [number, number, number];
  rightNormal: [number, number, number];
  angle: number;
} {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) {
    return {
      leftNormal: [0, 0, 1],
      rightNormal: [0, 0, -1],
      angle: 0,
    };
  }
  // Left normal (perpendicular CCW in XZ plane): (-dz, 0, dx) normalized
  const nx = -dz / len;
  const nz = dx / len;
  return {
    leftNormal: [nx, 0, nz],
    rightNormal: [-nx, 0, -nz],
    angle: Math.atan2(dz, dx),
  };
}

/**
 * Get the material ID currently assigned to a wall face.
 * Resolves through the existing leftMaterialId/rightMaterialId/materialId chain.
 */
function getFaceMaterialId(
  wall: WallSegment,
  faceType: WallFaceType,
): string | undefined {
  switch (faceType) {
    case 'left':
      return wall.leftMaterialId ?? wall.materialId;
    case 'right':
      return wall.rightMaterialId ?? wall.interiorMaterialId ?? wall.materialId;
    case 'top':
      return wall.materialId; // top uses the base material
    default:
      return undefined;
  }
}

/**
 * Compute all addressable faces for a wall segment.
 * Returns the primary faces (left, right, top) plus opening-related faces.
 */
export function getWallFaces(wall: WallSegment, elevation = 0): WallFace[] {
  const { leftNormal, rightNormal } = computeWallNormals(wall);
  const midX = (wall.from[0] + wall.to[0]) / 2;
  const midZ = (wall.from[1] + wall.to[1]) / 2;
  const midY = wall.height / 2 + elevation;
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const wallLength = Math.sqrt(dx * dx + dz * dz);

  const faces: WallFace[] = [];

  // Left face (exterior / +z after rotation)
  faces.push({
    id: wallFaceId(wall.id, 'left'),
    wallId: wall.id,
    type: 'left',
    normal: leftNormal,
    center: [
      midX + leftNormal[0] * wall.thickness / 2,
      midY,
      midZ + leftNormal[2] * wall.thickness / 2,
    ],
    dimensions: [wallLength, wall.height],
    materialId: getFaceMaterialId(wall, 'left'),
    editable: true,
    mountable: true,
  });

  // Right face (interior / -z after rotation)
  faces.push({
    id: wallFaceId(wall.id, 'right'),
    wallId: wall.id,
    type: 'right',
    normal: rightNormal,
    center: [
      midX + rightNormal[0] * wall.thickness / 2,
      midY,
      midZ + rightNormal[2] * wall.thickness / 2,
    ],
    dimensions: [wallLength, wall.height],
    materialId: getFaceMaterialId(wall, 'right'),
    editable: true,
    mountable: true,
  });

  // Top face
  faces.push({
    id: wallFaceId(wall.id, 'top'),
    wallId: wall.id,
    type: 'top',
    normal: [0, 1, 0],
    center: [midX, wall.height + elevation, midZ],
    dimensions: [wallLength, wall.thickness],
    materialId: getFaceMaterialId(wall, 'top'),
    editable: false, // top is not typically user-edited
    mountable: false,
  });

  // Opening-related faces
  for (const op of wall.openings) {
    const opCenter = op.offset * wallLength;
    const opBottom = op.type === 'window' ? (op.sillHeight ?? (wall.height - op.height) / 2) : 0;
    const dir = wallLength > 0.001 ? { x: dx / wallLength, z: dz / wallLength } : { x: 1, z: 0 };
    const opWorldX = wall.from[0] + dir.x * opCenter;
    const opWorldZ = wall.from[1] + dir.z * opCenter;
    const opCenterY = opBottom + op.height / 2 + elevation;

    // Lintel (top of opening)
    faces.push({
      id: openingFaceId(wall.id, op.id, 'opening-lintel'),
      wallId: wall.id,
      type: 'opening-lintel',
      openingId: op.id,
      normal: [0, -1, 0],
      center: [opWorldX, opBottom + op.height + elevation, opWorldZ],
      dimensions: [op.width, wall.thickness],
      materialId: undefined,
      editable: true,
      mountable: false,
    });

    // Sill (bottom of opening, mainly for windows)
    if (op.type === 'window' && opBottom > 0) {
      faces.push({
        id: openingFaceId(wall.id, op.id, 'opening-sill'),
        wallId: wall.id,
        type: 'opening-sill',
        openingId: op.id,
        normal: [0, 1, 0],
        center: [opWorldX, opBottom + elevation, opWorldZ],
        dimensions: [op.width, wall.thickness],
        materialId: undefined,
        editable: true,
        mountable: false,
      });
    }

    // Reveal faces (inner sides of the opening cut-through)
    faces.push({
      id: openingFaceId(wall.id, op.id, 'opening-reveal-left'),
      wallId: wall.id,
      type: 'opening-reveal-left',
      openingId: op.id,
      normal: [dir.x, 0, dir.z], // along wall direction
      center: [
        opWorldX - dir.x * op.width / 2,
        opCenterY,
        opWorldZ - dir.z * op.width / 2,
      ],
      dimensions: [wall.thickness, op.height],
      materialId: undefined,
      editable: true,
      mountable: false,
    });

    faces.push({
      id: openingFaceId(wall.id, op.id, 'opening-reveal-right'),
      wallId: wall.id,
      type: 'opening-reveal-right',
      openingId: op.id,
      normal: [-dir.x, 0, -dir.z], // opposite wall direction
      center: [
        opWorldX + dir.x * op.width / 2,
        opCenterY,
        opWorldZ + dir.z * op.width / 2,
      ],
      dimensions: [wall.thickness, op.height],
      materialId: undefined,
      editable: true,
      mountable: false,
    });
  }

  return faces;
}

// ─── Corner Face Ownership ───

/**
 * Compute which wall faces are adjacent to each corner junction.
 * This maps corner fill geometry to the wall faces it connects.
 */
export function getCornerFaceOwnership(
  walls: WallSegment[],
  eps = 0.05,
): CornerFaceOwnership[] {
  const nodeMap = new Map<string, { pos: [number, number]; wallIds: string[] }>();

  for (const wall of walls) {
    for (const pt of [wall.from, wall.to]) {
      const key = `${Math.round(pt[0] / eps) * eps},${Math.round(pt[1] / eps) * eps}`;
      const existing = nodeMap.get(key);
      if (existing) {
        if (!existing.wallIds.includes(wall.id)) {
          existing.wallIds.push(wall.id);
        }
      } else {
        nodeMap.set(key, { pos: pt, wallIds: [wall.id] });
      }
    }
  }

  const result: CornerFaceOwnership[] = [];

  for (const [key, { pos, wallIds }] of nodeMap) {
    if (wallIds.length < 2) continue;

    // Determine which face of each wall faces toward/away from this corner
    const adjacentFaces: WallFaceId[] = [];
    for (const wid of wallIds) {
      // Both primary faces of each wall are adjacent to the corner
      adjacentFaces.push(wallFaceId(wid, 'left'));
      adjacentFaces.push(wallFaceId(wid, 'right'));
    }

    result.push({
      nodeKey: key,
      position: pos,
      adjacentFaces,
      wallIds,
    });
  }

  return result;
}

// ─── Room-Facing Side Detection ───

/**
 * Determine which face of a wall faces toward a given room polygon.
 * Returns 'left' or 'right'.
 *
 * Uses the room centroid to determine which side faces inward.
 */
export function getRoomFacingSide(
  wall: WallSegment,
  roomPolygon: [number, number][],
): 'left' | 'right' {
  if (!roomPolygon || roomPolygon.length < 3) return 'left';

  const { leftNormal } = computeWallNormals(wall);
  const midX = (wall.from[0] + wall.to[0]) / 2;
  const midZ = (wall.from[1] + wall.to[1]) / 2;

  // Room centroid
  const cx = roomPolygon.reduce((a, p) => a + p[0], 0) / roomPolygon.length;
  const cz = roomPolygon.reduce((a, p) => a + p[1], 0) / roomPolygon.length;

  // Direction from wall midpoint to room centroid
  const toRoomX = cx - midX;
  const toRoomZ = cz - midZ;

  // Dot product with left normal
  const dot = toRoomX * leftNormal[0] + toRoomZ * leftNormal[2];

  return dot > 0 ? 'left' : 'right';
}

/**
 * Get the material field name for a given face side.
 * Maps face type to the WallSegment property that stores its material.
 */
export function getFaceMaterialField(
  faceType: WallFaceType,
): keyof WallSegment | null {
  switch (faceType) {
    case 'left': return 'leftMaterialId';
    case 'right': return 'rightMaterialId';
    case 'top': return 'materialId';
    default: return null; // Opening faces don't have dedicated fields yet
  }
}

/**
 * Determine if a click point on a wall is on the left or right face.
 * Uses the click position relative to the wall center and normal.
 */
export function detectClickedFace(
  wall: WallSegment,
  clickWorldPos: [number, number, number],
  elevation = 0,
): 'left' | 'right' {
  const { leftNormal } = computeWallNormals(wall);
  const midX = (wall.from[0] + wall.to[0]) / 2;
  const midZ = (wall.from[1] + wall.to[1]) / 2;

  const toClickX = clickWorldPos[0] - midX;
  const toClickZ = clickWorldPos[2] - midZ;

  const dot = toClickX * leftNormal[0] + toClickZ * leftNormal[2];
  return dot > 0 ? 'left' : 'right';
}
