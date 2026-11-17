import {
  getKeyboardLocalAnchor,
  getMonitorLocalAnchor,
  getMouseLocalAnchor,
} from './anchors';
import type {
  CatalogItem,
  CategoryId,
  ItemDimensions,
  ItemTransform,
  KeyboardVariant,
  MonitorMountParams,
  MonitorParams,
  MountType,
  MouseVariant,
} from '../types/catalog';
import { buildLayout } from '../utils/keyboardLayout';
import { calculateMonitorDimensions } from '../utils/monitorSize';
import { getMouseDimensions } from '../utils/mouseSpec';

export const DEFAULT_MOUNT_ID = 'mount-stand';
export const DEFAULT_MOUNT_HEIGHT = 0.16; // 16 cm di atas permukaan desk
export const DEFAULT_BASE_X = 0;          // Tengah tepi belakang desk

export const DEFAULT_DESK_TRANSFORM: ItemTransform = {
  x: 0,
  z: 0,
  rotY: 0,
};

// Hitung posisi default monitor di ruang lokal meja berdasarkan tipe penyangga aktif
export function getDefaultMonitorTransform(
  mountParams?: MonitorMountParams
): ItemTransform {
  return getMonitorLocalAnchor(mountParams);
}

// Hitung posisi default keyboard di ruang lokal meja berdasarkan kedalaman casing keyboard
export function getDefaultKeyboardTransform(
  keyboardDepth: number
): ItemTransform {
  return getKeyboardLocalAnchor(keyboardDepth);
}

// Hitung posisi anchor mouse di ruang lokal meja
export function getDefaultMouseTransform(
  mouseDimensions: Pick<ItemDimensions, 'width' | 'depth'>,
  placedKeyboardInfo?: { x: number; z: number; width: number } | null
): ItemTransform {
  return getMouseLocalAnchor(mouseDimensions, placedKeyboardInfo);
}

export const DEFAULT_MONITOR_POSITION: ItemTransform =
  getDefaultMonitorTransform();

function createMonitorItem(
  id: string,
  name: string,
  priceIdr: number,
  specText: string,
  params: MonitorParams
): CatalogItem<'monitor'> {
  return {
    id,
    category: 'monitor',
    name,
    priceIdr,
    specText,
    dimensions: calculateMonitorDimensions(params),
    attachTo: 'desk',
    anchor: 'monitor',
    kind: 'procedural',
    params,
  };
}

function createMonitorMountItem(
  id: string,
  name: string,
  priceIdr: number,
  specText: string,
  params: MonitorMountParams
): CatalogItem<'monitorMount'> {
  return {
    id,
    category: 'monitorMount',
    name,
    priceIdr,
    specText,
    dimensions: {
      width: 0.12,
      height: params.poleHeight,
      depth: params.armLength1 + params.armLength2 || 0.15,
    },
    attachTo: 'desk',
    kind: 'procedural',
    params,
  };
}

function createKeyboardItem(
  id: string,
  name: string,
  priceIdr: number,
  specText: string,
  variant: KeyboardVariant
): CatalogItem<'keyboard'> {
  const layout = buildLayout(variant);
  return {
    id,
    category: 'keyboard',
    name,
    priceIdr,
    specText,
    dimensions: {
      width: layout.caseWidth,
      height: layout.caseHeight,
      depth: layout.caseDepth,
    },
    attachTo: 'desk',
    anchor: 'keyboard',
    kind: 'procedural',
    params: { variant },
  };
}

function createMouseItem(
  id: string,
  name: string,
  priceIdr: number,
  specText: string,
  variant: MouseVariant
): CatalogItem<'mouse'> {
  return {
    id,
    category: 'mouse',
    name,
    priceIdr,
    specText,
    dimensions: getMouseDimensions(variant),
    attachTo: 'desk',
    anchor: 'mouse',
    kind: 'procedural',
    params: { variant },
  };
}

// Data katalog: Monitor (3), Penyangga Monitor (4), Keyboard (3), dan Mouse (2)
export const CATALOG_ITEMS: CatalogItem[] = [
  // Monitor
  createMonitorItem(
    'monitor-24-16-9',
    '24" 16:9',
    1800000,
    '24" IPS • 1920×1080 (16:9) • 3,5 kg',
    {
      diagonalInches: 24,
      aspectRatio: [16, 9],
      bezelThickness: 0.015,
      bezelBorder: 0.007,
      standClearance: 0.095,
      weightKg: 3.5,
    }
  ),
  createMonitorItem(
    'monitor-27-16-9',
    '27" 16:9',
    3200000,
    '27" IPS • 2560×1440 (16:9) • 5 kg',
    {
      diagonalInches: 27,
      aspectRatio: [16, 9],
      bezelThickness: 0.016,
      bezelBorder: 0.007,
      standClearance: 0.1,
      weightKg: 5,
    }
  ),
  createMonitorItem(
    'monitor-34-21-9',
    '34" Ultrawide 21:9',
    6500000,
    '34" WQHD • 3440×1440 (21:9) • 8,5 kg',
    {
      diagonalInches: 34,
      aspectRatio: [21, 9],
      bezelThickness: 0.018,
      bezelBorder: 0.008,
      standClearance: 0.105,
      weightKg: 8.5,
    }
  ),

  // Penyangga Monitor (monitorMount)
  createMonitorMountItem(
    'mount-stand',
    'Stand Bawaan',
    0,
    'Stand meja bawaan • Geser bebas di permukaan desk',
    {
      mountType: 'stand',
      maxWeightKg: 99,
      poleHeight: 0,
      poleRadius: 0,
      poleInsetZ: 0.03,
      armLength1: 0,
      armLength2: 0,
      minReach: 0,
      bracketForwardOffset: 0,
      minHeight: 0.095,
      maxHeight: 0.105,
      defaultHeight: 0.1,
      maxRotationDeg: 45,
    }
  ),
  createMonitorMountItem(
    'mount-arm-basic',
    'Monitor Arm Basic',
    350000,
    'Maks 7 kg • Lengan 2 ruas • Tinggi 8–40 cm',
    {
      mountType: 'arm',
      maxWeightKg: 7,
      poleHeight: 0.12,
      poleRadius: 0.02,
      poleInsetZ: 0.03,
      armLength1: 0.26,
      armLength2: 0.2,
      minReach: 0.12,
      bracketForwardOffset: 0,
      minHeight: 0.08,
      maxHeight: 0.4,
      defaultHeight: 0.16,
      maxRotationDeg: 45,
    }
  ),
  createMonitorMountItem(
    'mount-arm-heavy',
    'Monitor Arm Heavy-Duty',
    850000,
    'Maks 12 kg • Lengan diperkuat • Tinggi 8–40 cm',
    {
      mountType: 'arm',
      maxWeightKg: 12,
      poleHeight: 0.12,
      poleRadius: 0.02,
      poleInsetZ: 0.03,
      armLength1: 0.26,
      armLength2: 0.2,
      minReach: 0.12,
      bracketForwardOffset: 0,
      minHeight: 0.08,
      maxHeight: 0.4,
      defaultHeight: 0.16,
      maxRotationDeg: 45,
    }
  ),
  createMonitorMountItem(
    'mount-bracket',
    'Desk Mount Bracket',
    250000,
    'Maks 10 kg • Tiang belakang tetap • Tinggi 8–35 cm',
    {
      mountType: 'bracket',
      maxWeightKg: 10,
      poleHeight: 0.45,
      poleRadius: 0.018,
      poleInsetZ: 0.03,
      armLength1: 0,
      armLength2: 0,
      minReach: 0.06,
      bracketForwardOffset: 0.06,
      minHeight: 0.08,
      maxHeight: 0.35,
      defaultHeight: 0.15,
      maxRotationDeg: 25,
    }
  ),

  // Keyboard (3 varian ANSI)
  createKeyboardItem(
    'keyboard-tkl',
    'Keyboard TKL Mekanikal',
    750000,
    'TKL ANSI, 84 tombol, kabel USB',
    'tkl'
  ),
  createKeyboardItem(
    'keyboard-fullsize',
    'Keyboard Full-size',
    650000,
    'Full-size ANSI, 104 tombol',
    'fullsize'
  ),
  createKeyboardItem(
    'keyboard-65',
    'Keyboard 65%',
    900000,
    '65% ANSI, 68 tombol',
    '65'
  ),

  // Mouse (2 varian nirkabel)
  createMouseItem(
    'mouse-mmo',
    'Mouse MMO 12 Tombol Wireless',
    1800000,
    'MMO, 12 tombol samping, nirkabel',
    'mmo'
  ),
  createMouseItem(
    'mouse-standard',
    'Mouse Gaming Standar',
    450000,
    'Ergonomis, 6 tombol, nirkabel',
    'standard'
  ),
];

export function getCatalogItemsByCategory<C extends CategoryId>(
  category: C
): CatalogItem<C>[] {
  return CATALOG_ITEMS.filter(
    (item): item is CatalogItem<C> => item.category === category
  );
}

export function getCatalogItemById<C extends CategoryId = CategoryId>(
  id: string
): CatalogItem<C> | undefined {
  return CATALOG_ITEMS.find((item) => item.id === id) as
    | CatalogItem<C>
    | undefined;
}

export function getActiveMountParams(
  mountId: string | null
): MonitorMountParams {
  const item = mountId
    ? getCatalogItemById<'monitorMount'>(mountId)
    : undefined;
  if (item && item.category === 'monitorMount') {
    return item.params;
  }
  const fallback = getCatalogItemById<'monitorMount'>(DEFAULT_MOUNT_ID)!;
  return fallback.params;
}

export function getActiveMountType(mountId: string | null): MountType {
  return getActiveMountParams(mountId).mountType;
}
