import { DESK_CONFIG, KEYBOARD_CONFIG } from '../constants/deskConfig';
import type { ItemDimensions, MonitorMountParams } from '../types/catalog';
import { clampToDesk } from '../utils/clampToDesk';

// Koordinat anchor kait headphone di bawah tepi kiri meja (koordinat lokal meja)
export const HEADPHONE_HOOK_ANCHOR = {
  x: -DESK_CONFIG.width / 2 - DESK_CONFIG.hookOutwardReach * 0.5,
  y:
    DESK_CONFIG.height -
    DESK_CONFIG.topThickness -
    DESK_CONFIG.hookDropLength,
  z:
    DESK_CONFIG.depth / 2 -
    DESK_CONFIG.cupHolderFrontMargin -
    DESK_CONFIG.hookBehindCupOffset,
  rotY: 0,
} as const;

// Semua koordinat anchor dihitung di ruang lokal meja (relatif terhadap pusat meja [0, 0, 0])
export const DESK_LOCAL_ANCHORS = {
  monitorStand: {
    x: 0,
    z: -DESK_CONFIG.depth / 2 + DESK_CONFIG.legInset + 0.09,
    rotY: 0,
  },
  monitorArm: {
    x: 0,
    z: -DESK_CONFIG.depth / 2 + 0.03 + 0.22,
    rotY: 0,
  },
  monitorBracket: {
    x: 0,
    z: -DESK_CONFIG.depth / 2 + 0.03 + 0.06,
    rotY: 0,
  },
  keyboard: {
    x: 0,
    frontMargin: KEYBOARD_CONFIG.frontMarginFromDesk, // 0,12 m dari tepi depan meja
    rotY: 0,
  },
  mouse: {
    gapFromKeyboard: 0.04,       // 4 cm dari tepi kanan keyboard
    fallbackX: 0.3,              // 30 cm di kanan tengah meja bila tidak ada keyboard
    fallbackFrontDistance: 0.19, // Pusat Z berjarak 19 cm dari tepi depan meja
    rotY: 0,
  },
  'headphone-hook': HEADPHONE_HOOK_ANCHOR,
  // Anchor PC lantai di sisi kanan luar tepi meja agar tidak bertabrakan dengan kaki dasar
  'pc-floor': {
    x: DESK_CONFIG.width / 2 + 0.3,
    y: 0,
    z: 0,
    rotY: 0,
  },
} as const;

export function getMonitorLocalAnchor(mountParams?: MonitorMountParams): {
  x: number;
  z: number;
  rotY: number;
} {
  if (!mountParams || mountParams.mountType === 'stand') {
    return { ...DESK_LOCAL_ANCHORS.monitorStand };
  }
  if (mountParams.mountType === 'bracket') {
    return {
      x: 0,
      z:
        -DESK_CONFIG.depth / 2 +
        mountParams.poleInsetZ +
        mountParams.bracketForwardOffset,
      rotY: 0,
    };
  }
  return {
    x: 0,
    z: -DESK_CONFIG.depth / 2 + mountParams.poleInsetZ + 0.22,
    rotY: 0,
  };
}

// Hitung posisi anchor lokal keyboard: X = 0, tepi depan berjarak 0,12 m dari tepi depan meja
export function getKeyboardLocalAnchor(keyboardDepth: number): {
  x: number;
  z: number;
  rotY: number;
} {
  return {
    x: DESK_LOCAL_ANCHORS.keyboard.x,
    z:
      DESK_CONFIG.depth / 2 -
      DESK_LOCAL_ANCHORS.keyboard.frontMargin -
      keyboardDepth / 2,
    rotY: DESK_LOCAL_ANCHORS.keyboard.rotY,
  };
}

// Hitung posisi anchor lokal mouse (dipakai hanya saat pertama kali pasang atau saat Reset posisi):
// - Jika keyboard terpasang: tepi kiri mouse berjarak 0,04 m dari tepi kanan keyboard, Z sama dengan pusat keyboard
// - Jika tidak ada keyboard: X = 0,30 m dari tengah meja, pusat Z berjarak 0,19 m dari tepi depan meja
export function getMouseLocalAnchor(
  mouseDimensions: Pick<ItemDimensions, 'width' | 'depth'>,
  placedKeyboardInfo?: { x: number; z: number; width: number } | null
): {
  x: number;
  z: number;
  rotY: number;
} {
  let rawX: number;
  let rawZ: number;

  if (placedKeyboardInfo) {
    rawX =
      placedKeyboardInfo.x +
      placedKeyboardInfo.width / 2 +
      DESK_LOCAL_ANCHORS.mouse.gapFromKeyboard +
      mouseDimensions.width / 2;
    rawZ = placedKeyboardInfo.z;
  } else {
    rawX = DESK_LOCAL_ANCHORS.mouse.fallbackX;
    rawZ =
      DESK_CONFIG.depth / 2 - DESK_LOCAL_ANCHORS.mouse.fallbackFrontDistance;
  }

  const clamped = clampToDesk({ x: rawX, z: rawZ }, mouseDimensions, 0);
  return {
    x: clamped.x,
    z: clamped.z,
    rotY: DESK_LOCAL_ANCHORS.mouse.rotY,
  };
}
