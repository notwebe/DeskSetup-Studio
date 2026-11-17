import * as THREE from 'three';

let cachedDeskMatTexture: THREE.CanvasTexture | null = null;

// Buat tekstur prosedural desk mat (2048 x 820) satu kali menggunakan Canvas 2D
export function getDeskMatTexture(): THREE.CanvasTexture {
  if (cachedDeskMatTexture) {
    return cachedDeskMatTexture;
  }

  const width = 2048;
  const height = 820;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. Dasar hitam pekat #0a0a0a
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // 2. Kurva mengalir paralel (18 garis kombinasi sinusoid hijau #9be000)
    // Paling rapat di sisi kanan dan memudar secara bertahap ke sisi kiri
    const curveCount = 18;
    const segments = 160;

    for (let i = 0; i < curveCount; i++) {
      const normalizedIdx = i / (curveCount - 1); // 0..1
      const baseAlpha = 0.5 + 0.4 * Math.sin(normalizedIdx * Math.PI);

      // Jarak antar garis menyempit di sisi kanan (t -> 1) dan melebar di sisi kiri (t -> 0)
      const leftSpreadY =
        height * 0.08 + normalizedIdx * (height * 0.84);
      const rightBunchY =
        height * 0.34 + normalizedIdx * (height * 0.38);

      for (let s = 0; s < segments; s++) {
        const t0 = s / segments;
        const t1 = (s + 1) / segments;

        // Alpha memudar ke kiri (t mendekati 0) dan tegas di tengah-kanan
        const fadeLeft = Math.pow(Math.max(0, Math.min(1, (t0 - 0.04) / 0.65)), 1.35);
        const segAlpha = baseAlpha * (0.08 + 0.92 * fadeLeft);

        const computeY = (t: number) => {
          const envelopeY = leftSpreadY * (1 - t) + rightBunchY * t;
          const wave1 =
            Math.sin(t * Math.PI * 2.4 + i * 0.16) *
            (46 * (1 - 0.45 * t));
          const wave2 =
            Math.sin(t * Math.PI * 5.2 - i * 0.09 + 1.1) *
            (22 * (0.4 + 0.6 * t));
          const wave3 =
            Math.cos(t * Math.PI * 8.5 + i * 0.22) *
            (9 * t);
          return envelopeY + wave1 + wave2 + wave3;
        };

        const x0 = t0 * width;
        const y0 = computeY(t0);
        const x1 = t1 * width;
        const y1 = computeY(t1);

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = '#9be000';
        ctx.globalAlpha = segAlpha;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 3. Garis jahitan tipis abu gelap (#222222) mengikuti tepi pada jarak 4 px
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    const stitchInset = 4;
    const cornerRadius = 18;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(
        stitchInset,
        stitchInset,
        width - stitchInset * 2,
        height - stitchInset * 2,
        cornerRadius
      );
    } else {
      ctx.rect(
        stitchInset,
        stitchInset,
        width - stitchInset * 2,
        height - stitchInset * 2
      );
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  cachedDeskMatTexture = texture;
  return texture;
}
