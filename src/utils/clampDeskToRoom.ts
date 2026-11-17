import * as THREE from 'three';
import { ROOM_BOUNDS } from '../components/scene/Room';
import { DESK_CONFIG } from '../constants/deskConfig';

export const ROOM_SIDE_FRONT_MARGIN = 0.05; // 5 cm dari batas samping & depan lantai
export const ROOM_BACK_WALL_MARGIN = 0.15;  // 15 cm dari dinding belakang (agar klem arm tidak tembus)
export const DESK_GRID_SNAP_STEP = 0.1;     // 10 cm snap grid saat Shift ditahan ketika drag meja
export const DESK_ROTATION_STEP_RAD = THREE.MathUtils.degToRad(15); // 15 derajat per tekan Q/E

// Snap nilai koordinat meja ke grid 10 cm
export function snapDeskToGrid(
  value: number,
  step = DESK_GRID_SNAP_STEP
): number {
  return Math.round(value / step) * step;
}

// Fungsi murni pembatas posisi meja di dalam ruangan.
// Menghitung dari 4 sudut kotak pembatas asimetris (top + overhang aksesori kiri 0,08 m)
// yang sudah diputar mengikuti rotY meja agar akurat pada segala sudut rotasi.
export function clampDeskToRoom(
  position: { x: number; z: number },
  rotY = 0,
  deskSize: { width: number; depth: number; leftOverhang?: number } = {
    width: DESK_CONFIG.width,
    depth: DESK_CONFIG.depth,
    leftOverhang: DESK_CONFIG.leftAccessoryOverhang,
  },
  roomBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } = ROOM_BOUNDS
): { x: number; z: number } {
  const leftOverhang =
    deskSize.leftOverhang ?? DESK_CONFIG.leftAccessoryOverhang;

  // Batas kotak pembatas di ruang lokal meja (sisi kiri ditambah 0,08 m untuk cup holder & kait)
  const localMinX = -deskSize.width / 2 - leftOverhang;
  const localMaxX = deskSize.width / 2;
  const localMinZ = -deskSize.depth / 2;
  const localMaxZ = deskSize.depth / 2;

  const corners: [number, number][] = [
    [localMinX, localMinZ],
    [localMaxX, localMinZ],
    [localMinX, localMaxZ],
    [localMaxX, localMaxZ],
  ];

  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);

  let minOffsetX = Infinity;
  let maxOffsetX = -Infinity;
  let minOffsetZ = Infinity;
  let maxOffsetZ = -Infinity;

  // Putar keempat sudut mengelilingi sumbu Y (konvensi Three.js: x' = x*cos + z*sin, z' = -x*sin + z*cos)
  for (const [cx, cz] of corners) {
    const rx = cx * cos + cz * sin;
    const rz = -cx * sin + cz * cos;

    if (rx < minOffsetX) minOffsetX = rx;
    if (rx > maxOffsetX) maxOffsetX = rx;
    if (rz < minOffsetZ) minOffsetZ = rz;
    if (rz > maxOffsetZ) maxOffsetZ = rz;
  }

  const minCenterX = roomBounds.minX + ROOM_SIDE_FRONT_MARGIN - minOffsetX;
  const maxCenterX = roomBounds.maxX - ROOM_SIDE_FRONT_MARGIN - maxOffsetX;

  const minCenterZ = roomBounds.minZ + ROOM_BACK_WALL_MARGIN - minOffsetZ;
  const maxCenterZ = roomBounds.maxZ - ROOM_SIDE_FRONT_MARGIN - maxOffsetZ;

  const safeMinX = Math.min(minCenterX, maxCenterX);
  const safeMaxX = Math.max(minCenterX, maxCenterX);
  const safeMinZ = Math.min(minCenterZ, maxCenterZ);
  const safeMaxZ = Math.max(minCenterZ, maxCenterZ);

  return {
    x: Math.max(safeMinX, Math.min(safeMaxX, position.x)),
    z: Math.max(safeMinZ, Math.min(safeMaxZ, position.z)),
  };
}
