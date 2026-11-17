import { DESK_CONFIG } from '../constants/deskConfig';
import {
  getKeyboardLocalAnchor,
  getMonitorLocalAnchor,
  getMouseLocalAnchor,
} from '../data/anchors';
import type { ItemDimensions, MonitorMountParams } from '../types/catalog';
import { getMouseSurfaceYAt, getSurfaceYAt } from './clampToDesk';

// Menghitung posisi default monitor di ruang lokal meja [x, y, z]
export function getAnchorPosition(
  mountParams?: MonitorMountParams
): [number, number, number] {
  const anchor = getMonitorLocalAnchor(mountParams);
  return [anchor.x, DESK_CONFIG.height, anchor.z];
}

// Menghitung posisi default keyboard di ruang lokal meja [x, y, z] (memperhitungkan tinggi desk mat)
export function getKeyboardAnchorPosition(
  keyboardDepth: number
): [number, number, number] {
  const anchor = getKeyboardLocalAnchor(keyboardDepth);
  const surfaceY = getSurfaceYAt(anchor.x, anchor.z);
  return [anchor.x, surfaceY, anchor.z];
}

// Menghitung posisi anchor mouse di ruang lokal meja [x, y, z] (memakai tinggi tertinggi dari 5 titik)
export function getMouseAnchorPosition(
  mouseDimensions: Pick<ItemDimensions, 'width' | 'depth'>,
  placedKeyboardInfo?: { x: number; z: number; width: number } | null
): [number, number, number] {
  const anchor = getMouseLocalAnchor(mouseDimensions, placedKeyboardInfo);
  const surfaceY = getMouseSurfaceYAt(
    anchor.x,
    anchor.z,
    mouseDimensions,
    anchor.rotY
  );
  return [anchor.x, surfaceY, anchor.z];
}
