import type { ItemDimensions, MonitorParams } from '../types/catalog';

const INCH_TO_METER = 0.0254;

// Hitung lebar dan tinggi panel layar (dalam meter) dari diagonal inci dan rasio aspek
export function calculateMonitorScreenSize(
  diagonalInches: number,
  aspectRatio: [number, number]
): { screenWidth: number; screenHeight: number } {
  const [ratioW, ratioH] = aspectRatio;
  const diagonalMeters = diagonalInches * INCH_TO_METER;
  const scale = diagonalMeters / Math.hypot(ratioW, ratioH);

  return {
    screenWidth: ratioW * scale,
    screenHeight: ratioH * scale,
  };
}

// Hitung dimensi total monitor (termasuk bezel dan tinggi penyangga) dalam meter
export function calculateMonitorDimensions(
  params: MonitorParams
): ItemDimensions {
  const { screenWidth, screenHeight } = calculateMonitorScreenSize(
    params.diagonalInches,
    params.aspectRatio
  );

  return {
    width: screenWidth + params.bezelBorder * 2,
    height: params.standClearance + screenHeight + params.bezelBorder * 2,
    depth: 0.18,
  };
}
