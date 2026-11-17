// Objek mutable di luar React untuk menyimpan faktor transisi siang-malam (0 = terang, 1 = malam)
// Dibaca langsung di dalam useFrame tanpa memicu re-render React per frame
export const nightFactor = {
  current: 0,
};
