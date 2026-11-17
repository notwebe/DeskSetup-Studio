import type { KeyboardVariant } from '../utils/keyboardLayout';
import type { MouseVariant } from '../utils/mouseSpec';

export type { KeyboardVariant, MouseVariant };

export type CategoryId =
  | 'monitor'
  | 'monitorMount'
  | 'pc'
  | 'keyboard'
  | 'mouse'
  | 'lighting'
  | 'addons';

export type CatalogItemKind = 'procedural' | 'glb';

export type MountType = 'stand' | 'arm' | 'bracket';

export type AttachTarget = 'desk' | 'room';

export type SelectionTarget = 'desk' | CategoryId | null;

// Dimensi bounding box item dalam satuan meter (1 unit = 1 meter)
export interface ItemDimensions {
  width: number;  // Sumbu X (meter)
  height: number; // Sumbu Y (meter)
  depth: number;  // Sumbu Z (meter)
}

// Transformasi posisi dan rotasi pada bidang horizontal (XZ) dan rotasi sumbu Y
export interface ItemTransform {
  x: number;
  z: number;
  rotY: number; // Radian pada sumbu Y
}

export interface MonitorParams {
  diagonalInches: number;
  aspectRatio: [number, number];
  bezelThickness: number; // Ketebalan bodi panel monitor (meter)
  bezelBorder: number;    // Lebar bingkai bezel di sekitar layar (meter)
  standClearance: number; // Jarak bawah bezel dari permukaan meja pada stand bawaan (meter)
  weightKg: number;       // Berat monitor dalam kilogram
}

export interface MonitorMountParams {
  mountType: MountType;
  maxWeightKg: number;
  poleHeight: number;           // Tinggi tiang di atas permukaan meja (meter)
  poleRadius: number;           // Radius silinder tiang (meter)
  poleInsetZ: number;           // Jarak tiang ke dalam dari tepi belakang meja (meter)
  armLength1: number;           // Panjang ruas lengan 1 bahu-ke-siku (meter)
  armLength2: number;           // Panjang ruas lengan 2 siku-ke-pergelangan (meter)
  minReach: number;             // Jarak horizontal minimum dari tiang ke monitor (meter)
  bracketForwardOffset: number; // Jarak tetap monitor di depan tiang untuk bracket (meter)
  minHeight: number;            // Batas bawah mountHeight (meter)
  maxHeight: number;            // Batas atas mountHeight (meter)
  defaultHeight: number;        // Nilai default mountHeight (meter)
  maxRotationDeg: number;       // Batas sudut putar Q/E (+/- derajat)
}

export interface KeyboardParams {
  variant: KeyboardVariant;
}

export interface MouseParams {
  variant: MouseVariant;
}

export interface CategoryParamsMap {
  monitor: MonitorParams;
  monitorMount: MonitorMountParams;
  keyboard: KeyboardParams;
  mouse: MouseParams;
  pc: Record<string, unknown>;
  lighting: Record<string, unknown>;
  addons: Record<string, unknown>;
}

// Tipe utama item katalog perlengkapan desk/ruangan
export interface CatalogItem<C extends CategoryId = CategoryId> {
  id: string;
  category: C;
  name: string;
  priceIdr: number;
  specText: string;
  dimensions: ItemDimensions;
  attachTo: AttachTarget;
  anchor?: string;
  kind: CatalogItemKind;
  modelUrl?: string;
  params: CategoryParamsMap[C];
}
