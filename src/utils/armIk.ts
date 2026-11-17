import * as THREE from 'three';

// Konstanta ukuran geometri Monitor Arm (dalam meter, 1 unit = 1 meter)
export const ARM_TOP_PLATE_THICKNESS = 0.006;
export const ARM_POST_HEIGHT = 0.12; // Tinggi tiang pendek 12 cm di atas pelat
export const ARM_SHOULDER_OFFSET_Y =
  ARM_TOP_PLATE_THICKNESS + ARM_POST_HEIGHT + 0.022; // Posisi Y titik bahu S (~14.8 cm di atas desk)

export const ARM_L1 = 0.26; // Panjang ruas utama (bahu S ke siku E): 26 cm
export const ARM_L2 = 0.2;  // Panjang ruas depan (siku E ke pergelangan T): 20 cm
export const ARM_D_MAX = (ARM_L1 + ARM_L2) * 0.98; // Batas jarak 3D maksimum S ke T (~45.08 cm)
export const ARM_D_MIN = 0.12;                     // Batas jarak 3D minimum S ke T (12 cm)
export const ARM_MIN_HORIZ_REACH = 0.15;           // Jarak horizontal minimum monitor dari tiang (15 cm)
export const ARM_WRIST_BACK_OFFSET = 0.032;        // Jarak titik pergelangan T di belakang punggung monitor

export interface ArmIk3DSolution {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
}

const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _side = new THREE.Vector3();
const _orthoUp = new THREE.Vector3();
const _rotMatrix = new THREE.Matrix4();

// Hitung batas jangkauan horizontal maksimum berdasarkan beda tinggi (dy) между S dan T
export function getMaxHorizontalReachForHeight(
  dy: number,
  dMax = ARM_D_MAX,
  minHoriz = ARM_MIN_HORIZ_REACH
): number {
  const remainingSq = dMax * dMax - dy * dy;
  if (remainingSq <= minHoriz * minHoriz) {
    return minHoriz;
  }
  return Math.sqrt(remainingSq);
}

// Perhitungan Two-Bone IK di ruang 3D dengan hukum kosinus (panjang L1 & L2 selalu tetap)
export function solveArmIk3D(
  shoulder: THREE.Vector3,
  targetWrist: THREE.Vector3,
  l1 = ARM_L1,
  l2 = ARM_L2
): ArmIk3DSolution {
  _dir.subVectors(targetWrist, shoulder);
  const rawDist = _dir.length();

  const dMin = Math.max(ARM_D_MIN, Math.abs(l1 - l2) + 0.01);
  const dMax = Math.min(ARM_D_MAX, (l1 + l2) * 0.995);
  const D = Math.max(dMin, Math.min(dMax, rawDist));

  if (rawDist > 1e-5) {
    _dir.divideScalar(rawDist);
  } else {
    _dir.set(0, 0, 1);
  }

  // Titik pergelangan T yang sudah di-clamp agar jarak S->T tepat sebesar D
  const wrist = new THREE.Vector3()
    .copy(shoulder)
    .addScaledVector(_dir, D);

  // Hukum kosinus: L2^2 = L1^2 + D^2 - 2*D*a  =>  a = (L1^2 - L2^2 + D^2) / (2D)
  const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));

  // Vektor pole horizontal tegak lurus arah horizontal S->T (rotasi +90 derajat sekitar sumbu Y)
  // Karena monitor selalu di depan tiang (dz > 0), arah horizontal tidak pernah berbalik -> bebas flip
  const horizLen = Math.hypot(_dir.x, _dir.z);
  if (horizLen > 1e-5) {
    _pole.set(-_dir.z / horizLen, 0, _dir.x / horizLen);
  } else {
    _pole.set(-1, 0, 0);
  }

  // Siku E = S + dir(S->T) * a + pole * h
  // Karena _dir . _pole == 0 dan |_dir| = |_pole| = 1, maka |E - S| === L1 dan |T - E| === L2
  const elbow = new THREE.Vector3()
    .copy(shoulder)
    .addScaledVector(_dir, a)
    .addScaledVector(_pole, h);

  return {
    shoulder: shoulder.clone(),
    elbow,
    wrist,
  };
}

// Menempatkan objek ruas di titik tengah pA & pB, mengorientasikan searah pA->pB (quaternion),
// menjaga permukaan atas tetap menghadap atas (tanpa roll), dan menyesuaikan skala panjangnya
export function segmentBetween(
  targetObj: THREE.Object3D,
  pA: THREE.Vector3,
  pB: THREE.Vector3,
  baseLength: number
): void {
  // Titik tengah antara pA dan pB
  targetObj.position.lerpVectors(pA, pB, 0.5);

  _forward.subVectors(pB, pA);
  const dist = _forward.length();
  if (dist < 1e-5) return;

  _forward.divideScalar(dist);

  // Bangun basis ortonormal: sumbu X sepanjang ruas (pA->pB), sumbu Z mendatar, sumbu Y ke atas ruas
  _side.crossVectors(_forward, _up);
  if (_side.lengthSq() < 1e-6) {
    _side.set(0, 0, 1);
  } else {
    _side.normalize();
  }
  _orthoUp.crossVectors(_side, _forward).normalize();

  _rotMatrix.makeBasis(_forward, _orthoUp, _side);
  targetObj.quaternion.setFromRotationMatrix(_rotMatrix);

  // Atur panjang sesuai jarak aktual (untuk IK kita, dist === baseLength sehingga proporsi tetap 1:1)
  if (baseLength > 0) {
    targetObj.scale.set(dist / baseLength, 1, 1);
  }
}
