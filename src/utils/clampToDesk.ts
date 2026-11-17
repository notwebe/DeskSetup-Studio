import * as THREE from 'three';
import { CLAMP_X_RANGE, DESK_CONFIG } from '../constants/deskConfig';
import type { MonitorMountParams } from '../types/catalog';
import {
  ARM_D_MAX,
  ARM_MIN_HORIZ_REACH,
  ARM_SHOULDER_OFFSET_Y,
  ARM_WRIST_BACK_OFFSET,
  getMaxHorizontalReachForHeight,
} from './armIk';

export const DESK_EDGE_MARGIN = 0.03;   // 3 cm margin dari tepi permukaan desk
export const GRID_SNAP_STEP = 0.05;     // 5 cm snap grid saat Shift ditahan (monitor & keyboard)
export const MOUSE_GRID_SNAP_STEP = 0.02; // 2 cm snap grid saat Shift ditahan untuk mouse
export const MAX_ROTATION_RAD = THREE.MathUtils.degToRad(45);
export const ROTATION_STEP_RAD = THREE.MathUtils.degToRad(5);
export const CLAMP_BASE_X_LIMIT = CLAMP_X_RANGE; // +/- 40 cm agar tidak menimpa lubang kabel & pelat kaki

// Hitung tinggi permukaan tumpuan pada koordinat lokal meja (localX, localZ):
// Permukaan meja ditambah ketebalan desk mat (0,003 m) bila berada di dalam area mat
export function getSurfaceYAt(localX: number, localZ: number): number {
  const matCenterZ =
    DESK_CONFIG.depth / 2 -
    DESK_CONFIG.matFrontMargin -
    DESK_CONFIG.matDepth / 2;
  const halfMatW = DESK_CONFIG.matWidth / 2;
  const halfMatD = DESK_CONFIG.matDepth / 2;

  const isOnMat =
    Math.abs(localX) <= halfMatW &&
    localZ >= matCenterZ - halfMatD &&
    localZ <= matCenterZ + halfMatD;

  return isOnMat
    ? DESK_CONFIG.height + DESK_CONFIG.matThickness
    : DESK_CONFIG.height;
}

// Untuk mouse, ambil nilai tertinggi dari 5 titik (pusat + 4 sudut footprint)
// agar mouse tidak pernah tenggelam saat melewati tepi desk mat
export function getMouseSurfaceYAt(
  localX: number,
  localZ: number,
  dimensions: { width: number; depth: number },
  rotY = 0
): number {
  const hw = dimensions.width / 2;
  const hd = dimensions.depth / 2;
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);

  const offsets: [number, number][] = [
    [0, 0],
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ];

  let maxY: number = DESK_CONFIG.height;
  for (const [ox, oz] of offsets) {
    const px = localX + ox * cos + oz * sin;
    const pz = localZ - ox * sin + oz * cos;
    const y = getSurfaceYAt(px, pz);
    if (y > maxY) maxY = y;
  }
  return maxY;
}

// Snap nilai koordinat ke kelipatan grid terdekat (dalam meter)
export function snapToGrid(value: number, step = GRID_SNAP_STEP): number {
  return Math.round(value / step) * step;
}

// Batasi posisi klem sepanjang tepi belakang meja (+/- 0,40 m)
export function clampBaseX(baseX: number): number {
  return Math.max(-CLAMP_BASE_X_LIMIT, Math.min(CLAMP_BASE_X_LIMIT, baseX));
}

// Batasi tinggi penyangga (mountHeight) sesuai rentang spesifikasi mount
export function clampMountHeight(
  height: number,
  mountParams: MonitorMountParams
): number {
  return Math.max(
    mountParams.minHeight,
    Math.min(mountParams.maxHeight, height)
  );
}

// Batasi sudut rotasi sumbu Y sesuai batas maksimum (stand/arm/keyboard: 45 deg, bracket: 25 deg, mouse: 90 deg)
export function clampRotationY(rotY: number, maxDeg = 45): number {
  const maxRad = THREE.MathUtils.degToRad(maxDeg);
  return Math.max(-maxRad, Math.min(maxRad, rotY));
}

// Batasi koordinat (x, z) agar seluruh bounding box item (setelah rotasi) tetap di atas desk
export function clampToDesk(
  position: { x: number; z: number },
  dimensions: { width: number; depth: number },
  rotY = 0,
  deskSize: { width: number; depth: number } = {
    width: DESK_CONFIG.width,
    depth: DESK_CONFIG.depth,
  },
  margin = DESK_EDGE_MARGIN
): { x: number; z: number } {
  const cos = Math.abs(Math.cos(rotY));
  const sin = Math.abs(Math.sin(rotY));

  const effectiveWidth = dimensions.width * cos + dimensions.depth * sin;
  const effectiveDepth = dimensions.width * sin + dimensions.depth * cos;

  const maxX = Math.max(0, deskSize.width / 2 - margin - effectiveWidth / 2);
  const maxZ = Math.max(0, deskSize.depth / 2 - margin - effectiveDepth / 2);

  return {
    x: Math.max(-maxX, Math.min(maxX, position.x)),
    z: Math.max(-maxZ, Math.min(maxZ, position.z)),
  };
}

// Batasi posisi monitor dengan menggabungkan batas desk + aturan mount (stand / arm 3D / bracket)
export function clampMonitorWithMount(
  position: { x: number; z: number },
  dimensions: { width: number; height?: number; depth: number },
  rotY: number,
  mountParams: MonitorMountParams,
  baseX: number,
  mountHeight = 0.16
): { x: number; z: number; baseX: number } {
  const clampedBaseX = clampBaseX(baseX);

  if (mountParams.mountType === 'stand') {
    const deskClamped = clampToDesk(position, dimensions, rotY);
    return { x: deskClamped.x, z: deskClamped.z, baseX: clampedBaseX };
  }

  const panelDims = { width: dimensions.width, depth: 0.05 };
  const poleZ = -DESK_CONFIG.depth / 2 + mountParams.poleInsetZ;

  if (mountParams.mountType === 'bracket') {
    const lockedZ = poleZ + mountParams.bracketForwardOffset;
    const deskClamped = clampToDesk(
      { x: position.x, z: lockedZ },
      panelDims,
      rotY
    );
    const syncedX = clampBaseX(deskClamped.x);
    return { x: syncedX, z: lockedZ, baseX: syncedX };
  }

  const poleX = clampedBaseX;
  const estFrameHeight = dimensions.height
    ? Math.max(0.28, dimensions.height - 0.1)
    : 0.34;
  const targetY = mountHeight + estFrameHeight / 2;
  const dy = targetY - ARM_SHOULDER_OFFSET_Y;

  const minHorizMonitor = ARM_MIN_HORIZ_REACH;
  const maxHorizWrist = getMaxHorizontalReachForHeight(
    dy,
    ARM_D_MAX,
    minHorizMonitor - ARM_WRIST_BACK_OFFSET
  );

  let { x, z } = clampToDesk(position, panelDims, rotY);
  z = Math.max(poleZ + 0.08, z);

  const monDx = x - poleX;
  const monDz = z - poleZ;
  const monHorizDist = Math.hypot(monDx, monDz);
  if (monHorizDist < minHorizMonitor) {
    if (monHorizDist > 1e-5) {
      const s = minHorizMonitor / monHorizDist;
      x = poleX + monDx * s;
      z = poleZ + monDz * s;
    } else {
      z = poleZ + minHorizMonitor;
    }
  }

  const wristOffsetX = -Math.sin(rotY) * ARM_WRIST_BACK_OFFSET;
  const wristOffsetZ = -Math.cos(rotY) * ARM_WRIST_BACK_OFFSET;
  const wristX = x + wristOffsetX;
  const wristZ = z + wristOffsetZ;

  const wDx = wristX - poleX;
  const wDz = wristZ - poleZ;
  const wDist = Math.hypot(wDx, wDz);

  if (wDist > maxHorizWrist && wDist > 1e-5) {
    const s = maxHorizWrist / wDist;
    x = poleX + wDx * s - wristOffsetX;
    z = poleZ + wDz * s - wristOffsetZ;
  }

  const finalDesk = clampToDesk({ x, z }, panelDims, rotY);
  x = finalDesk.x;
  z = Math.max(poleZ + 0.08, finalDesk.z);

  const finalWristZ = z + wristOffsetZ;
  const finalWDz = finalWristZ - poleZ;
  const maxWDx = Math.sqrt(
    Math.max(0, maxHorizWrist * maxHorizWrist - finalWDz * finalWDz)
  );
  const clampedWristX = Math.max(
    poleX - maxWDx,
    Math.min(poleX + maxWDx, x + wristOffsetX)
  );
  x = clampToDesk({ x: clampedWristX - wristOffsetX, z }, panelDims, rotY).x;

  const finalMonDist = Math.hypot(x - poleX, z - poleZ);
  if (finalMonDist < minHorizMonitor) {
    const curDx = x - poleX;
    const neededDz = Math.sqrt(
      Math.max(0, minHorizMonitor * minHorizMonitor - curDx * curDx)
    );
    z = clampToDesk({ x, z: poleZ + neededDz }, panelDims, rotY).z;
  }

  return { x, z, baseX: clampedBaseX };
}
