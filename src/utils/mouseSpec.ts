import type { ItemDimensions } from '../types/catalog';

export type MouseVariant = 'mmo' | 'standard';

// Warna aksen tunggal hijau menyala untuk roda scroll, angka panel MMO, dan emblem
export const ACCENT_COLOR = '#39e03a';

export interface MouseVariantSpec {
  variant: MouseVariant;
  width: number;  // Lebar W (sumbu X, meter)
  height: number; // Tinggi H (sumbu Y, meter)
  length: number; // Panjang L (sumbu Z, meter)
  sideTopButtonSize: [number, number, number]; // [tebal X, tinggi Y, panjang Z]
  hasMmoPanel: boolean;
}

export const MOUSE_SPECS: Record<MouseVariant, MouseVariantSpec> = {
  mmo: {
    variant: 'mmo',
    width: 0.075,
    height: 0.043,
    length: 0.119,
    sideTopButtonSize: [0.004, 0.008, 0.014],
    hasMmoPanel: true,
  },
  standard: {
    variant: 'standard',
    width: 0.065,
    height: 0.038,
    length: 0.12,
    sideTopButtonSize: [0.004, 0.007, 0.012],
    hasMmoPanel: false,
  },
};

// Konstanta posisi relatif (u dari 0 di ujung depan sampai 1 di ujung belakang) & ukuran sub-komponen
export const MOUSE_COMPONENT_CONSTANTS = {
  superellipseExponent: 2.6,
  loftSlicesU: 40,
  loftPointsPerSlice: 32,

  bodyColor: '#101012',
  bodyRoughness: 0.55,
  bodyMetalness: 0,

  // 1. Garis pemisah tombol utama kiri/kanan
  seamStartU: 0.01,
  seamEndU: 0.42,
  seamWidth: 0.0012,
  seamColor: '#050505',

  // 2. Roda scroll, slot, dan dua strip menyala
  wheelU: 0.28,
  wheelRadius: 0.0105,
  wheelWidth: 0.0075,
  wheelProtrusion: 0.002,
  wheelGrooveCount: 40,
  wheelSlotWidth: 0.016,
  wheelSlotLength: 0.028,
  wheelSlotColor: '#050506',
  wheelStripSize: [0.0016, 0.0005, 0.026] as const,
  wheelStripEmissiveIntensity: 1.4,

  // 3. Dua tombol kecil persegi di belakang roda
  dpiButtonUs: [0.46, 0.54] as const,
  dpiButtonSize: [0.008, 0.0015, 0.007] as const,
  dpiButtonColor: '#1a1a1c',
  dpiBorderColor: '#2d2d32',

  // 4. Dua tombol samping atas (maju/mundur) di sisi kiri
  sideTopButtonUs: [0.09, 0.23] as const,
  sideTopButtonHeightRatio: 0.62,
  sideTopButtonProtrusion: 0.003,

  // 5. Panel 12 tombol samping (khusus varian MMO)
  mmoPanelU: 0.48,
  mmoPanelHeightRatio: 0.38,
  mmoPanelTiltDeg: 35,
  mmoPanelInset: 0.002,
  mmoPanelSize: [0.006, 0.028, 0.04] as const, // [tebal normal, lebar miring, panjang Z]
  mmoKeySize: [0.003, 0.0075, 0.0085] as const,
  mmoKeyColor: '#141416',
  mmoRows: 4,
  mmoCols: 3,
  mmoRowPitch: 0.0095,
  mmoColPitch: 0.0085,
  mmoNumberEmissiveIntensity: 1.2,

  // 6. Emblem punggung belakang
  emblemU: 0.78,
  emblemSize: 0.018,
  emblemEmissiveIntensity: 1.0,
} as const;

// Titik kontrol kurva lebar dan tinggi (relatif terhadap W dan H varian)
const WIDTH_KNOTS_U = [0, 0.25, 0.55, 0.8, 1.0];
const WIDTH_KNOTS_V = [0.5, 0.78, 0.95, 1.0, 0.82];

const HEIGHT_KNOTS_U = [0, 0.15, 0.62, 1.0];
const HEIGHT_KNOTS_V = [0.45, 0.58, 1.0, 0.66];

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Interpolasi Monotone Cubic Hermite (Fritsch-Carlson) agar profil halus tanpa overshoot/patah-patah
export function evaluateSmoothSpline(
  u: number,
  xs: readonly number[],
  ys: readonly number[]
): number {
  const n = xs.length;
  const clampedU = Math.max(xs[0], Math.min(xs[n - 1], u));

  const dxs: number[] = [];
  const dys: number[] = [];
  const ms: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const dy = ys[i + 1] - ys[i];
    dxs.push(dx);
    dys.push(dy);
    ms.push(dy / dx);
  }

  const c1s: number[] = [ms[0]];
  for (let i = 0; i < dxs.length - 1; i++) {
    const m = ms[i];
    const mNext = ms[i + 1];
    if (m * mNext <= 0) {
      c1s.push(0);
    } else {
      const dx = dxs[i];
      const dxNext = dxs[i + 1];
      const common = dx + dxNext;
      c1s.push(
        (3 * common) / ((common + dxNext) / m + (common + dx) / mNext)
      );
    }
  }
  c1s.push(ms[ms.length - 1]);

  let seg = n - 2;
  for (let i = 0; i < n - 1; i++) {
    if (clampedU <= xs[i + 1]) {
      seg = i;
      break;
    }
  }

  const h = dxs[seg];
  const t = (clampedU - xs[seg]) / h;
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return (
    h00 * ys[seg] +
    h10 * h * c1s[seg] +
    h01 * ys[seg + 1] +
    h11 * h * c1s[seg + 1]
  );
}

// Konversi parameter u (0 = ujung depan -Z, 1 = ujung belakang +Z) ke koordinat Z lokal
export function uToMouseZ(u: number, variant: MouseVariant): number {
  const { length } = MOUSE_SPECS[variant];
  return (u - 0.5) * length;
}

export interface MouseSliceProfile {
  u: number;
  z: number;
  halfWidthBase: number;
  height: number;
  leftBottomExtra: number;
  rightBottomExtra: number;
}

// Evaluasi profil penampang mouse pada posisi u (0..1)
export function evaluateMouseProfile(
  u: number,
  variant: MouseVariant
): MouseSliceProfile {
  const spec = MOUSE_SPECS[variant];
  const W = spec.width;
  const H = spec.height;
  const z = uToMouseZ(u, variant);

  const wRel = evaluateSmoothSpline(u, WIDTH_KNOTS_U, WIDTH_KNOTS_V);
  const hRel = evaluateSmoothSpline(u, HEIGHT_KNOTS_U, HEIGHT_KNOTS_V);

  // Pembulatan ujung depan dan belakang: f(u) = sqrt(1 - |2u - 1|^4)
  const term = Math.min(1, Math.pow(Math.abs(2 * u - 1), 4));
  const fU = Math.sqrt(Math.max(0, 1 - term));
  const sqrtFU = Math.sqrt(fU);

  const halfWidthBase = (W / 2) * wRel * Math.max(0.18, fU);
  const height = H * hRel * Math.max(0.12, sqrtFU);

  let leftBottomExtra = 0;
  let rightBottomExtra = 0;

  if (variant === 'mmo') {
    // Sisi kiri melebar tambahan 0,10 * W dari u=0,25 sampai u=0,55 dan mereda sampai u=0,95
    const leftRise = smoothstep(0.25, 0.55, u);
    const leftFall = 1 - smoothstep(0.55, 0.95, u);
    leftBottomExtra = 0.1 * W * leftRise * leftFall * fU;

    // Sisi kanan melebar tambahan 0,04 * W pada u antara 0,55 dan 0,85 (penyangga kelingking)
    const rightRise = smoothstep(0.55, 0.68, u);
    const rightFall = 1 - smoothstep(0.7, 0.85, u);
    rightBottomExtra = 0.04 * W * rightRise * rightFall * fU;
  }

  return {
    u,
    z,
    halfWidthBase,
    height,
    leftBottomExtra,
    rightBottomExtra,
  };
}

// Evaluasi titik 3D pada permukaan setengah superellipse (theta: 0 = kanan +X, pi/2 = puncak atas, pi = kiri -X)
export function evaluateMouseCrossSectionPoint(
  u: number,
  theta: number,
  variant: MouseVariant
): { x: number; y: number; z: number } {
  const spec = MOUSE_SPECS[variant];
  const profile = evaluateMouseProfile(u, variant);
  const n = MOUSE_COMPONENT_CONSTANTS.superellipseExponent;
  const exp = 2 / n;

  const cosT = Math.cos(theta);
  const sinT = Math.max(0, Math.sin(theta));

  const cx = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
  const sy = Math.pow(sinT, exp);

  const y = profile.height * sy;
  const yNorm = Math.min(1, Math.max(0, y / spec.height));
  // Pelebaran hanya di bagian bawah penampang: dikalikan (1 - y/H)^1.5
  const bottomWeight = Math.pow(1 - yNorm, 1.5);

  const extra =
    cx < 0
      ? profile.leftBottomExtra * bottomWeight
      : profile.rightBottomExtra * bottomWeight;

  const x = cx * (profile.halfWidthBase + extra);
  return { x, y, z: profile.z };
}

// Hitung tinggi permukaan atas (x = 0) dan sudut kemiringan memanjang (pitch sekitar sumbu X) pada posisi u
export function getMouseTopRidgePose(
  u: number,
  variant: MouseVariant
): { y: number; z: number; pitchX: number } {
  const eps = 0.015;
  const u0 = Math.max(0.01, u - eps);
  const u1 = Math.min(0.99, u + eps);
  const p = evaluateMouseProfile(u, variant);
  const p0 = evaluateMouseProfile(u0, variant);
  const p1 = evaluateMouseProfile(u1, variant);

  const dy = p1.height - p0.height;
  const dz = p1.z - p0.z;
  // Rotasi sumbu X agar bidang yang menghadap +Y miring mengikuti dy/dz
  const pitchX = Math.atan2(dy, dz);

  return { y: p.height, z: p.z, pitchX };
}

// Cari koordinat X sisi kiri bodi (x < 0) pada posisi u dan ketinggian yTarget
export function getMouseLeftSideXAtHeight(
  u: number,
  yTarget: number,
  variant: MouseVariant
): { x: number; y: number; z: number } {
  const profile = evaluateMouseProfile(u, variant);
  const n = MOUSE_COMPONENT_CONSTANTS.superellipseExponent;
  const clampedY = Math.max(0.002, Math.min(profile.height * 0.96, yTarget));

  const sy = clampedY / Math.max(1e-4, profile.height);
  // sy = (sin(theta))^(2/n) => sin(theta) = sy^(n/2)
  const sinT = Math.min(0.999, Math.pow(sy, n / 2));
  const theta = Math.PI - Math.asin(sinT);

  return evaluateMouseCrossSectionPoint(u, theta, variant);
}

// Dimensi bounding box katalog untuk varian mouse
export function getMouseDimensions(variant: MouseVariant): ItemDimensions {
  const spec = MOUSE_SPECS[variant];
  // Sertakan sedikit pelebaran bawah untuk MMO agar footprint clamp akurat
  const totalWidth = variant === 'mmo' ? spec.width * 1.08 : spec.width;
  return {
    width: totalWidth,
    height: spec.height,
    depth: spec.length,
  };
}
