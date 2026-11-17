import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESK_CONFIG, KEYBOARD_CONFIG } from '../../../constants/deskConfig';
import { getDefaultKeyboardTransform } from '../../../data/catalog';
import { nightFactor } from '../../../lib/nightFactor';
import { useSetupStore } from '../../../store/useSetupStore';
import type { CatalogItem } from '../../../types/catalog';
import { getSurfaceYAt } from '../../../utils/clampToDesk';
import { getSharedGlowTexture } from '../../../utils/glowTexture';
import {
  buildLayout,
  type KeyboardLayoutData,
  type KeyCapSpec,
} from '../../../utils/keyboardLayout';
import {
  GLOW_DECAL_SURFACE_OFFSET_Y,
  KEY_GAP_COLOR_MULTIPLIER,
  KEY_GAP_MAX_OPACITY,
  KEY_GAP_PLANE_OFFSET_Y,
  KEY_GAP_RECT_EXPAND_M,
  KEY_LEGEND_INTENSITY,
  KEYBOARD_GLOW_MAX_OPACITY,
  KEYBOARD_GLOW_PADDING_M,
} from '../../../utils/nightConfig';
import { createRoundedRectShape } from '../desk/DeskTop';

interface KeyboardProps {
  item: CatalogItem<'keyboard'>;
  isSelected?: boolean;
}

const NOOP_RAYCAST = () => null;

// Sampel titik keliling persegi panjang bersudut bulat pada bidang XZ
function sampleRoundedRectPerimeter(
  width: number,
  depth: number,
  radius: number,
  segmentsPerCorner = 5
): Array<[number, number]> {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw * 0.45, hd * 0.45);
  const pts: Array<[number, number]> = [];

  const corners: Array<{ cx: number; cz: number; startAngle: number }> = [
    { cx: hw - r, cz: hd - r, startAngle: 0 },
    { cx: -hw + r, cz: hd - r, startAngle: Math.PI / 2 },
    { cx: -hw + r, cz: -hd + r, startAngle: Math.PI },
    { cx: hw - r, cz: -hd + r, startAngle: (Math.PI * 3) / 2 },
  ];

  for (const corner of corners) {
    for (let i = 0; i <= segmentsPerCorner; i++) {
      const theta =
        corner.startAngle + (i / segmentsPerCorner) * (Math.PI / 2);
      pts.push([
        corner.cx + Math.cos(theta) * r,
        corner.cz + Math.sin(theta) * r,
      ]);
    }
  }

  return pts;
}

// Buat geometri keycap ber-taper (atas 78% dari bawah) dengan sudut membulat halus
function createTaperedKeycapGeometry(
  bottomW: number,
  bottomD: number,
  height: number,
  topTaper: number
): THREE.BufferGeometry {
  const topW = bottomW * topTaper;
  const topD = bottomD * topTaper;

  const botPts = sampleRoundedRectPerimeter(bottomW, bottomD, 0.0018, 4);
  const topPts = sampleRoundedRectPerimeter(topW, topD, 0.0014, 4);
  const n = botPts.length;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    positions.push(botPts[i][0], 0, botPts[i][1]);
  }
  for (let i = 0; i < n; i++) {
    positions.push(topPts[i][0], height, topPts[i][1]);
  }
  const topCenterIdx = 2 * n;
  positions.push(0, height, 0);

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const b0 = i;
    const b1 = next;
    const t0 = n + i;
    const t1 = n + next;

    indices.push(b0, b1, t1);
    indices.push(b0, t1, t0);
  }

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    indices.push(topCenterIdx, n + i, n + next);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Buat geometri casing baji (ExtrudeGeometry dari profil samping trapesium)
function createWedgeCaseGeometry(
  caseWidth: number,
  caseDepth: number,
  frontHeight: number,
  backHeight: number
): THREE.ExtrudeGeometry {
  const bevel = 0.0012;
  const hd = caseDepth / 2 - bevel;
  const hf = Math.max(0.004, frontHeight - bevel * 2);
  const hb = Math.max(0.006, backHeight - bevel * 2);

  const shape = new THREE.Shape();
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(hd, hb);
  shape.lineTo(-hd, hf);
  shape.closePath();

  const extrudeLength = caseWidth - bevel * 2;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeLength,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });

  geo.rotateY(Math.PI / 2);
  geo.translate(-extrudeLength / 2, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

// Buat CanvasTexture transparan untuk seluruh teks legend tombol sesuai tata letak buildLayout
function createLegendCanvasTexture(
  layout: KeyboardLayoutData
): THREE.CanvasTexture {
  const {
    legendPxPerMm,
    legendMaxTexWidth,
    legendTextColor,
    keycapTopTaper,
  } = KEYBOARD_CONFIG;

  const idealWidth = Math.round(layout.keysAreaWidth * 1000 * legendPxPerMm);
  const texWidth = Math.min(legendMaxTexWidth, idealWidth);
  const pxPerMeter = texWidth / layout.keysAreaWidth;
  const texHeight = Math.max(
    256,
    Math.round(layout.keysAreaDepth * pxPerMeter)
  );

  const canvas = document.createElement('canvas');
  canvas.width = texWidth;
  canvas.height = texHeight;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, texWidth, texHeight);
    ctx.fillStyle = legendTextColor;

    const unitPx = KEYBOARD_CONFIG.unitPitch * pxPerMeter;

    for (const key of layout.keys) {
      if (!key.legend) continue;

      const cx = key.x * pxPerMeter;
      const cy = texHeight - key.z * pxPerMeter;

      const topW = key.w * keycapTopTaper * pxPerMeter;
      const topD = key.d * keycapTopTaper * pxPerMeter;

      if (key.legend.includes('\n')) {
        const [topChar, bottomChar] = key.legend.split('\n');
        const fontSize = Math.round(unitPx * 0.19);
        ctx.font = `600 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topChar, cx, cy - topD * 0.22);
        ctx.fillText(bottomChar, cx, cy + topD * 0.22);
      } else if (key.isFunctionKey) {
        const fontSize = Math.round(unitPx * 0.155);
        ctx.font = `600 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const padX = topW * 0.12;
        const padY = topD * 0.14;
        ctx.fillText(
          key.legend.toLowerCase(),
          cx - topW / 2 + padX,
          cy + topD / 2 - padY
        );
      } else {
        const isFKey = key.legend.startsWith('F') && key.legend.length >= 2;
        const fontSize = Math.round(unitPx * (isFKey ? 0.2 : 0.25));
        ctx.font = `600 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key.legend, cx, cy);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Buat CanvasTexture untuk cahaya di sela tombol (rounded rect putih per tombol + 1,2 mm tiap sisi, blur 1 px)
function createKeyGapGlowTexture(
  layout: KeyboardLayoutData
): THREE.CanvasTexture {
  const texWidth = 1024;
  const pxPerMeter = texWidth / layout.keysAreaWidth;
  const texHeight = Math.max(
    256,
    Math.round(layout.keysAreaDepth * pxPerMeter)
  );

  const canvas = document.createElement('canvas');
  canvas.width = texWidth;
  canvas.height = texHeight;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, texWidth, texHeight);
    ctx.filter = 'blur(1px)';
    ctx.fillStyle = '#ffffff';

    const expand = KEY_GAP_RECT_EXPAND_M * 2;
    const cornerRadiusPx = 0.0022 * pxPerMeter;

    for (const key of layout.keys) {
      const rw = (key.w + expand) * pxPerMeter;
      const rd = (key.d + expand) * pxPerMeter;
      const rx = key.x * pxPerMeter - rw / 2;
      const ry = texHeight - key.z * pxPerMeter - rd / 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(rx, ry, rw, rd, cornerRadiusPx);
      } else {
        ctx.rect(rx, ry, rw, rd);
      }
      ctx.fill();
    }
    ctx.filter = 'none';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface KeySizeGroup {
  keyId: string;
  w: number;
  d: number;
  geometry: THREE.BufferGeometry;
  items: KeyCapSpec[];
}

// Komponen satu kelas ukuran keycap menggunakan InstancedMesh agar bebas distorsi scale
function KeycapInstancedGroup({
  group,
  keysAreaWidth,
  plateMargin,
  plateThickness,
  material,
}: {
  group: KeySizeGroup;
  keysAreaWidth: number;
  plateMargin: number;
  plateThickness: number;
  material: THREE.Material;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    group.items.forEach((k, idx) => {
      const localX = -keysAreaWidth / 2 + k.x;
      const localZ = -plateMargin - k.z;
      dummy.position.set(localX, plateThickness, localZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [group.items, keysAreaWidth, plateMargin, plateThickness, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[group.geometry, material, group.items.length]}
      castShadow
      receiveShadow
      raycast={NOOP_RAYCAST}
    />
  );
}

// Komponen 3D Keyboard Mekanikal Prosedural (TKL, Full-size, 65%) dengan pencahayaan malam
export function Keyboard({ item, isSelected = false }: KeyboardProps) {
  const { variant } = item.params;
  const layout = useMemo(() => buildLayout(variant), [variant]);
  const setupAccent = useSetupStore((state) => state.setupAccent);

  const legendMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const gapGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const matGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lastFactorRef = useRef<number>(-1);

  const {
    plateMargin,
    wedgeFrontHeight,
    wedgeBackHeight,
    plateThickness,
    plateCornerRadius,
    keycapHeight,
    keycapTopTaper,
    legendOffsetAboveKey,
    caseColor,
    caseRoughness,
    plateColor,
    plateMetalness,
    plateRoughness,
    keycapColor,
    keycapRoughness,
    keycapMetalness,
    indicatorRadius,
    indicatorEmissiveIntensity,
    cableRadius,
    cableRadialSegments,
    cableTubularSegments,
    cableColor,
    cableRoughness,
  } = KEYBOARD_CONFIG;

  const { caseWidth, caseDepth, caseHeight, keysAreaWidth, keysAreaDepth } =
    layout;

  const tiltAngle = useMemo(
    () => Math.atan2(wedgeBackHeight - wedgeFrontHeight, caseDepth),
    [wedgeBackHeight, wedgeFrontHeight, caseDepth]
  );

  // 1. Geometri & material Casing Baji
  const wedgeGeo = useMemo(
    () =>
      createWedgeCaseGeometry(
        caseWidth,
        caseDepth,
        wedgeFrontHeight,
        wedgeBackHeight
      ),
    [caseWidth, caseDepth, wedgeFrontHeight, wedgeBackHeight]
  );

  const caseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: caseColor,
        roughness: caseRoughness,
        metalness: 0.1,
      }),
    [caseColor, caseRoughness]
  );

  // 2. Geometri & material Pelat Atas Logam
  const plateGeo = useMemo(() => {
    const shape = createRoundedRectShape(
      caseWidth - 0.002,
      caseDepth - 0.002,
      plateCornerRadius
    );
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: plateThickness,
      bevelEnabled: false,
      curveSegments: 12,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -caseDepth / 2);
    geo.computeVertexNormals();
    return geo;
  }, [caseWidth, caseDepth, plateCornerRadius, plateThickness]);

  const plateMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: plateColor,
        metalness: plateMetalness,
        roughness: plateRoughness,
      }),
    [plateColor, plateMetalness, plateRoughness]
  );

  // 3. Kelompokkan tombol per kelas ukuran (w, d)
  const keyGroups = useMemo<KeySizeGroup[]>(() => {
    const map = new Map<string, { w: number; d: number; items: KeyCapSpec[] }>();
    for (const k of layout.keys) {
      const id = `${k.w.toFixed(5)}_${k.d.toFixed(5)}`;
      const existing = map.get(id);
      if (existing) {
        existing.items.push(k);
      } else {
        map.set(id, { w: k.w, d: k.d, items: [k] });
      }
    }

    return Array.from(map.entries()).map(([keyId, val]) => ({
      keyId,
      w: val.w,
      d: val.d,
      geometry: createTaperedKeycapGeometry(
        val.w,
        val.d,
        keycapHeight,
        keycapTopTaper
      ),
      items: val.items,
    }));
  }, [layout.keys, keycapHeight, keycapTopTaper]);

  useEffect(() => {
    return () => {
      keyGroups.forEach((g) => g.geometry.dispose());
    };
  }, [keyGroups]);

  const keycapMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: keycapColor,
        roughness: keycapRoughness,
        metalness: keycapMetalness,
      }),
    [keycapColor, keycapRoughness, keycapMetalness]
  );

  // 4. Lapisan teks legend tombol & lapisan cahaya sela tombol (dibuat sekali per varian)
  const legendTexture = useMemo(
    () => createLegendCanvasTexture(layout),
    [layout]
  );

  const keyGapGlowTexture = useMemo(
    () => createKeyGapGlowTexture(layout),
    [layout]
  );

  useEffect(() => {
    return () => {
      legendTexture.dispose();
      keyGapGlowTexture.dispose();
    };
  }, [legendTexture, keyGapGlowTexture]);

  const legendPlaneGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(keysAreaWidth, keysAreaDepth);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [keysAreaWidth, keysAreaDepth]);

  const boostedGapColor = useMemo(
    () =>
      new THREE.Color(setupAccent).multiplyScalar(KEY_GAP_COLOR_MULTIPLIER),
    [setupAccent]
  );

  const sharedGlowTex = useMemo(() => getSharedGlowTexture(), []);

  // 5. Lampu indikator untuk varian TKL dan Full-size
  const indicatorGeo = useMemo(() => {
    const geo = new THREE.CircleGeometry(indicatorRadius, 16);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [indicatorRadius]);

  const indicatorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: indicatorEmissiveIntensity,
        roughness: 0.2,
      }),
    [indicatorEmissiveIntensity]
  );

  // 6. Kabel USB dinamis dari sudut kanan-belakang casing ke lubang kabel meja terdekat
  const kbTransform = useSetupStore((state) => state.transforms.keyboard);
  const defaultKbTransform = useMemo(
    () => getDefaultKeyboardTransform(caseDepth),
    [caseDepth]
  );

  const kbX = kbTransform?.x ?? defaultKbTransform.x;
  const kbZ = kbTransform?.z ?? defaultKbTransform.z;
  const kbRotY = kbTransform?.rotY ?? defaultKbTransform.rotY;

  const cableGeo = useMemo(() => {
    const baseY = getSurfaceYAt(kbX, kbZ);
    const cos = Math.cos(kbRotY);
    const sin = Math.sin(kbRotY);

    const toKeyboardLocal = (
      deskX: number,
      deskY: number,
      deskZ: number
    ): THREE.Vector3 => {
      const dx = deskX - kbX;
      const dz = deskZ - kbZ;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      return new THREE.Vector3(lx, deskY - baseY, lz);
    };

    const localStartX = caseWidth / 2 - 0.024;
    const localStartZ = -caseDepth / 2;
    const startDeskX = kbX + localStartX * cos + localStartZ * sin;
    const startDeskZ = kbZ - localStartX * sin + localStartZ * cos;
    const startDeskY =
      getSurfaceYAt(startDeskX, startDeskZ) + cableRadius + 0.003;

    const grommetX =
      kbX < 0 ? -DESK_CONFIG.grommetOffsetX : DESK_CONFIG.grommetOffsetX;
    const grommetZ = -(DESK_CONFIG.depth / 2 - DESK_CONFIG.grommetBackMargin);

    const exitDist = 0.04;
    const p1DeskX = startDeskX - sin * exitDist;
    const p1DeskZ = startDeskZ - cos * exitDist;
    const p1DeskY =
      getSurfaceYAt(p1DeskX, p1DeskZ) + cableRadius + 0.001;

    const midDeskX =
      p1DeskX * 0.45 +
      grommetX * 0.55 +
      (grommetX >= 0 ? 0.025 : -0.025);
    const midDeskZ = p1DeskZ * 0.5 + grommetZ * 0.5;
    const midDeskY =
      getSurfaceYAt(midDeskX, midDeskZ) + cableRadius + 0.0012;

    const lipDeskX = grommetX * 0.92 + p1DeskX * 0.08;
    const lipDeskZ = grommetZ + 0.014;
    const lipDeskY = DESK_CONFIG.height + cableRadius + 0.002;

    const endDeskX = grommetX;
    const endDeskZ = grommetZ;
    const endDeskY = DESK_CONFIG.height - 0.012;

    const curve = new THREE.CatmullRomCurve3([
      toKeyboardLocal(startDeskX, startDeskY, startDeskZ),
      toKeyboardLocal(p1DeskX, p1DeskY, p1DeskZ),
      toKeyboardLocal(midDeskX, midDeskY, midDeskZ),
      toKeyboardLocal(lipDeskX, lipDeskY, lipDeskZ),
      toKeyboardLocal(endDeskX, endDeskY, endDeskZ),
    ]);

    return new THREE.TubeGeometry(
      curve,
      cableTubularSegments,
      cableRadius,
      cableRadialSegments,
      false
    );
  }, [
    kbX,
    kbZ,
    kbRotY,
    caseWidth,
    caseDepth,
    cableRadius,
    cableTubularSegments,
    cableRadialSegments,
  ]);

  useEffect(() => {
    return () => {
      cableGeo.dispose();
    };
  }, [cableGeo]);

  const cableMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: cableColor,
        roughness: cableRoughness,
        metalness: 0.05,
      }),
    [cableColor, cableRoughness]
  );

  // Perbarui intensitas legenda tombol, cahaya sela tombol, dan glow mat mengikuti nightFactor.current
  useFrame(() => {
    const nf = nightFactor.current;
    if (Math.abs(nf - lastFactorRef.current) < 1e-4) return;
    lastFactorRef.current = nf;

    if (legendMatRef.current) {
      legendMatRef.current.emissiveIntensity = nf * KEY_LEGEND_INTENSITY;
    }

    if (gapGlowMatRef.current) {
      gapGlowMatRef.current.opacity = nf * KEY_GAP_MAX_OPACITY;
      gapGlowMatRef.current.visible = nf > 0.001;
    }

    if (matGlowMatRef.current) {
      matGlowMatRef.current.opacity = nf * KEYBOARD_GLOW_MAX_OPACITY;
      matGlowMatRef.current.visible = nf > 0.001;
    }
  });

  const initialNf = nightFactor.current;

  return (
    <group position={[0, 0, 0]}>
      {/* Hit-box tunggal transparan seukuran casing + tombol untuk menangani pointer/drag */}
      <mesh position={[0, caseHeight / 2, 0]}>
        <boxGeometry args={[caseWidth, caseHeight, caseDepth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Glow Decal di bawah keyboard pada permukaan meja/mat */}
      <mesh
        position={[0, GLOW_DECAL_SURFACE_OFFSET_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={10}
        raycast={NOOP_RAYCAST}
      >
        <planeGeometry
          args={[
            caseWidth + KEYBOARD_GLOW_PADDING_M * 2,
            caseDepth + KEYBOARD_GLOW_PADDING_M * 2,
          ]}
        />
        <meshBasicMaterial
          ref={matGlowMatRef}
          map={sharedGlowTex}
          color={setupAccent}
          transparent
          opacity={initialNf * KEYBOARD_GLOW_MAX_OPACITY}
          visible={initialNf > 0.001}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          toneMapped={false}
        />
      </mesh>

      {/* Casing baji bawah */}
      <mesh
        geometry={wedgeGeo}
        material={caseMaterial}
        castShadow
        receiveShadow
        raycast={NOOP_RAYCAST}
      >
        {isSelected && (
          <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
        )}
      </mesh>

      {/* Grup miring mengikuti permukaan atas baji dengan pivot di tepi depan */}
      <group
        position={[0, wedgeFrontHeight, caseDepth / 2]}
        rotation={[tiltAngle, 0, 0]}
      >
        {/* Pelat logam atas */}
        <mesh
          geometry={plateGeo}
          material={plateMaterial}
          castShadow
          receiveShadow
          raycast={NOOP_RAYCAST}
        >
          {isSelected && (
            <Outlines thickness={2.5} color="#f59e0b" toneMapped={false} />
          )}
        </mesh>

        {/* Bidang cahaya di sela tombol (tepat di atas pelat logam dan di bawah keycap) */}
        <mesh
          position={[
            0,
            plateThickness + KEY_GAP_PLANE_OFFSET_Y,
            -plateMargin - keysAreaDepth / 2,
          ]}
          geometry={legendPlaneGeo}
          raycast={NOOP_RAYCAST}
        >
          <meshBasicMaterial
            ref={gapGlowMatRef}
            map={keyGapGlowTexture}
            color={boostedGapColor}
            transparent
            opacity={initialNf * KEY_GAP_MAX_OPACITY}
            visible={initialNf > 0.001}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            toneMapped={false}
          />
        </mesh>

        {/* InstancedMesh keycap per kelas ukuran (w, d) */}
        {keyGroups.map((group) => (
          <KeycapInstancedGroup
            key={`${variant}-${group.keyId}`}
            group={group}
            keysAreaWidth={keysAreaWidth}
            plateMargin={plateMargin}
            plateThickness={plateThickness}
            material={keycapMaterial}
          />
        ))}

        {/* Bidang transparan teks legend tombol dengan emissive mengikuti nightFactor */}
        <mesh
          position={[
            0,
            plateThickness + keycapHeight + legendOffsetAboveKey,
            -plateMargin - keysAreaDepth / 2,
          ]}
          geometry={legendPlaneGeo}
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial
            ref={legendMatRef}
            map={legendTexture}
            emissive={setupAccent}
            emissiveMap={legendTexture}
            emissiveIntensity={initialNf * KEY_LEGEND_INTENSITY}
            transparent
            alphaTest={0.04}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            roughness={0.5}
            metalness={0}
            toneMapped={false}
          />
        </mesh>

        {/* Tiga lampu indikator putih di area kanan atas (khusus TKL & Full-size) */}
        {layout.indicatorPositions.map((ind, idx) => (
          <mesh
            key={idx}
            position={[
              -keysAreaWidth / 2 + ind.x,
              plateThickness + 0.0005,
              -plateMargin - ind.z,
            ]}
            geometry={indicatorGeo}
            material={indicatorMaterial}
            raycast={NOOP_RAYCAST}
          />
        ))}
      </group>

      {/* Kabel USB dinamis menuju lubang kabel meja terdekat */}
      <mesh
        geometry={cableGeo}
        material={cableMaterial}
        castShadow
        receiveShadow
        raycast={NOOP_RAYCAST}
      />
    </group>
  );
}
