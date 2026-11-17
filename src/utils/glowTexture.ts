import * as THREE from 'three';

let sharedGlowTexture: THREE.CanvasTexture | null = null;

// Buat CanvasTexture radial gradient 256 x 256 (putih di tengah, transparan di tepi) satu kali
// Dipakai bersama oleh semua decal glow (keyboard, mouse, dll.)
export function getSharedGlowTexture(): THREE.CanvasTexture {
  if (sharedGlowTexture) {
    return sharedGlowTexture;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  sharedGlowTexture = tex;
  return tex;
}
