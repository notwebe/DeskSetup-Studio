import { useEffect, useMemo, useRef } from 'react';
import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getActiveMountType } from '../../../data/catalog';
import { nightFactor } from '../../../lib/nightFactor';
import { useSetupStore } from '../../../store/useSetupStore';
import type { CatalogItem } from '../../../types/catalog';
import { calculateMonitorScreenSize } from '../../../utils/monitorSize';
import {
  MONITOR_LIGHT_COLOR,
  MONITOR_LIGHT_DECAY,
  MONITOR_LIGHT_DISTANCE,
  MONITOR_LIGHT_FORWARD_OFFSET,
  MONITOR_LIGHT_INTENSITY,
  SCREEN_ON_IN_DAY,
  SCREEN_ON_INTENSITY,
} from '../../../utils/nightConfig';

interface MonitorProps {
  item: CatalogItem<'monitor'>;
  isSelected?: boolean;
}

// Buat tekstur wallpaper gradien gelap untuk layar monitor menggunakan CanvasTexture
function createScreenWallpaperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Gradien dasar gelap (biru malam -> indigo -> slate)
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#090d1a');
    bgGrad.addColorStop(0.5, '#171c3a');
    bgGrad.addColorStop(1, '#0b1324');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pendar cahaya lembut di tengah layar
    const glow = ctx.createRadialGradient(
      canvas.width * 0.52,
      canvas.height * 0.45,
      10,
      canvas.width * 0.52,
      canvas.height * 0.45,
      canvas.width * 0.48
    );
    glow.addColorStop(0, 'rgba(90, 108, 255, 0.42)');
    glow.addColorStop(0.5, 'rgba(139, 92, 246, 0.22)');
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Garis taskbar tipis di bagian bawah layar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(0, canvas.height - 14, canvas.width, 14);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.fillRect(canvas.width / 2 - 28, canvas.height - 9, 56, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Komponen monitor 3D prosedural dengan layar menyala saat mode malam & PointLight limpahan cahaya
export function Monitor({ item, isSelected = false }: MonitorProps) {
  const { params } = item;
  const placedMountId = useSetupStore((state) => state.placed.monitorMount);
  const mountHeight = useSetupStore((state) => state.mountHeight);

  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const spillLightRef = useRef<THREE.PointLight>(null);
  const lastFactorRef = useRef<number>(-1);

  const mountType = getActiveMountType(placedMountId);
  const showStand = mountType === 'stand';

  const { screenWidth, screenHeight } = useMemo(
    () =>
      calculateMonitorScreenSize(params.diagonalInches, params.aspectRatio),
    [params.diagonalInches, params.aspectRatio]
  );

  const screenTexture = useMemo(() => createScreenWallpaperTexture(), []);

  useEffect(() => {
    return () => {
      screenTexture.dispose();
    };
  }, [screenTexture]);

  // Tinggi tepi bawah bezel dari permukaan desk mengikuti standClearance atau mountHeight
  const clearance = showStand ? params.standClearance : mountHeight;

  // Dimensi frame bezel, layar, neck, dan base
  const frameWidth = screenWidth + params.bezelBorder * 2;
  const chinExtra = 0.006; // Dagu bawah bezel sedikit lebih tebal
  const frameHeight = screenHeight + params.bezelBorder * 2 + chinExtra;
  const frameDepth = params.bezelThickness;

  const frameCenterY = clearance + frameHeight / 2;
  const screenCenterY = frameCenterY + chinExtra / 2;

  const baseWidth = Math.min(0.28, screenWidth * 0.38);
  const baseDepth = 0.17;
  const baseHeight = 0.008;

  const neckWidth = 0.042;
  const neckDepth = 0.022;
  const neckHeight = clearance + frameHeight * 0.45;
  const neckZ = -0.045;
  const panelZ = 0.01;
  const screenFrontZ = panelZ + frameDepth / 2 + 0.001;

  // Update intensitas layar dan PointLight limpahan mengikuti nightFactor.current
  useFrame(() => {
    const nf = SCREEN_ON_IN_DAY ? 1 : nightFactor.current;
    if (Math.abs(nf - lastFactorRef.current) < 1e-4) return;
    lastFactorRef.current = nf;

    if (screenMatRef.current) {
      screenMatRef.current.emissiveIntensity = nf * SCREEN_ON_INTENSITY;
      const baseBrightness = 0.04 + 0.96 * nf;
      screenMatRef.current.color.setScalar(baseBrightness);
    }

    if (spillLightRef.current) {
      spillLightRef.current.intensity = nf * MONITOR_LIGHT_INTENSITY;
      spillLightRef.current.visible = nf >= 0.001;
    }
  });

  const initialFactor = SCREEN_ON_IN_DAY ? 1 : nightFactor.current;

  return (
    <group position={[0, 0, 0]}>
      {/* Stand bawaan (base, neck, dan konektor) hanya tampil jika mountType === "stand" */}
      {showStand && (
        <>
          <mesh position={[0, baseHeight / 2, -0.01]} castShadow receiveShadow>
            <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
            <meshStandardMaterial
              color="#71717a"
              metalness={0.8}
              roughness={0.35}
            />
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>

          <mesh position={[0, neckHeight / 2, neckZ]} castShadow receiveShadow>
            <boxGeometry args={[neckWidth, neckHeight, neckDepth]} />
            <meshStandardMaterial
              color="#71717a"
              metalness={0.8}
              roughness={0.35}
            />
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>

          <mesh
            position={[0, frameCenterY, (neckZ + panelZ) / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.06, 0.05, Math.abs(panelZ - neckZ)]} />
            <meshStandardMaterial
              color="#52525b"
              metalness={0.75}
              roughness={0.4}
            />
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>
        </>
      )}

      {/* Bodi & bezel hitam matte */}
      <mesh position={[0, frameCenterY, panelZ]} castShadow receiveShadow>
        <boxGeometry args={[frameWidth, frameHeight, frameDepth]} />
        <meshStandardMaterial
          color="#18181b"
          roughness={0.75}
          metalness={0.15}
        />
        {isSelected && (
          <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
        )}
      </mesh>

      {/* Panel layar di depan bezel (gelap saat siang, menyala saat malam) */}
      <mesh
        position={[0, screenCenterY, screenFrontZ]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[screenWidth, screenHeight]} />
        <meshStandardMaterial
          ref={screenMatRef}
          map={screenTexture}
          color={new THREE.Color().setScalar(0.04 + 0.96 * initialFactor)}
          emissive="#ffffff"
          emissiveMap={screenTexture}
          emissiveIntensity={initialFactor * SCREEN_ON_INTENSITY}
          roughness={0.25}
          metalness={0.05}
          toneMapped={false}
        />
      </mesh>

      {/* Cahaya limpahan layar (PointLight 0,20 m di depan pusat layar, tanpa shadow) */}
      <pointLight
        ref={spillLightRef}
        position={[
          0,
          screenCenterY,
          screenFrontZ + MONITOR_LIGHT_FORWARD_OFFSET,
        ]}
        color={MONITOR_LIGHT_COLOR}
        intensity={initialFactor * MONITOR_LIGHT_INTENSITY}
        distance={MONITOR_LIGHT_DISTANCE}
        decay={MONITOR_LIGHT_DECAY}
        visible={initialFactor >= 0.001}
      />
    </group>
  );
}
