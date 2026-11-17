import * as THREE from 'three';
import {
  evaluateMouseCrossSectionPoint,
  MOUSE_COMPONENT_CONSTANTS,
  type MouseVariant,
} from './mouseSpec';

const bodyGeoCache = new Map<MouseVariant, THREE.BufferGeometry>();

// Buat BufferGeometry bodi mouse melalui lofting 40 irisan x 32 titik setengah superellipse (n = 2,6)
// dengan alas bawah datar tertutup triangle fan dan shading halus computeVertexNormals()
export function buildMouseBodyGeometry(
  variant: MouseVariant
): THREE.BufferGeometry {
  const cached = bodyGeoCache.get(variant);
  if (cached) {
    return cached.clone();
  }

  const slicesU = MOUSE_COMPONENT_CONSTANTS.loftSlicesU; // 40
  const ptsPerSlice = MOUSE_COMPONENT_CONSTANTS.loftPointsPerSlice; // 32
  const ringStride = ptsPerSlice + 1;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 1. Vertex permukaan atas (i = 0..slicesU dari depan ke belakang, j = 0..ptsPerSlice dari kiri ke kanan)
  for (let i = 0; i <= slicesU; i++) {
    // Konsentrasikan sedikit lebih rapat di ujung depan/belakang dengan pemetaan halus
    const u = i / slicesU;

    for (let j = 0; j <= ptsPerSlice; j++) {
      const vRatio = j / ptsPerSlice;
      const theta = (1 - vRatio) * Math.PI; // pi (kiri -X) -> pi/2 (atas +Y) -> 0 (kanan +X)
      const pt = evaluateMouseCrossSectionPoint(u, theta, variant);

      positions.push(pt.x, pt.y, pt.z);
      uvs.push(vRatio, u);
    }
  }

  // Indeks quad permukaan atas (normal menghadap luar)
  for (let i = 0; i < slicesU; i++) {
    for (let j = 0; j < ptsPerSlice; j++) {
      const v00 = i * ringStride + j;
      const v10 = (i + 1) * ringStride + j;
      const v01 = i * ringStride + (j + 1);
      const v11 = (i + 1) * ringStride + (j + 1);

      indices.push(v00, v10, v11);
      indices.push(v00, v11, v01);
    }
  }

  // 2. Tutup alas datar di y = 0 menggunakan triangle fan
  const bottomCenterIndex = positions.length / 3;
  positions.push(0, 0, 0);
  uvs.push(0.5, 0.5);

  const perimeterIndices: number[] = [];

  // Sisi kiri (j = 0) dari depan (i = 0) ke belakang (i = slicesU)
  for (let i = 0; i <= slicesU; i++) {
    const pt = evaluateMouseCrossSectionPoint(i / slicesU, Math.PI, variant);
    const idx = positions.length / 3;
    positions.push(pt.x, 0, pt.z);
    uvs.push(0, i / slicesU);
    perimeterIndices.push(idx);
  }

  // Sisi kanan (j = ptsPerSlice) dari belakang (i = slicesU) kembali ke depan (i = 0)
  for (let i = slicesU; i >= 0; i--) {
    const pt = evaluateMouseCrossSectionPoint(i / slicesU, 0, variant);
    const idx = positions.length / 3;
    positions.push(pt.x, 0, pt.z);
    uvs.push(1, i / slicesU);
    perimeterIndices.push(idx);
  }

  for (let k = 0; k < perimeterIndices.length; k++) {
    const curr = perimeterIndices[k];
    const next = perimeterIndices[(k + 1) % perimeterIndices.length];
    // Urutan agar normal menghadap ke bawah (-Y)
    indices.push(bottomCenterIndex, curr, next);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  bodyGeoCache.set(variant, geo);
  return geo.clone();
}
