import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import { Outlines, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { nightFactor } from '../../../lib/nightFactor';
import { useSetupStore } from '../../../store/useSetupStore';
import type { CatalogItem } from '../../../types/catalog';
import { getSharedGlowTexture } from '../../../utils/glowTexture';
import { buildMouseBodyGeometry } from '../../../utils/mouseBodyGeometry';
import {
  evaluateMouseProfile,
  getMouseLeftSideXAtHeight,
  getMouseTopRidgePose,
  MOUSE_COMPONENT_CONSTANTS,
  MOUSE_SPECS,
  type MouseVariant,
} from '../../../utils/mouseSpec';
import {
  GLOW_DECAL_SURFACE_OFFSET_Y,
  MOUSE_EMBLEM_MAX_INTENSITY,
  MOUSE_GLOW_MAX_OPACITY,
  MOUSE_GLOW_PADDING_M,
  MOUSE_MMO_NUMBER_MAX_INTENSITY,
  MOUSE_WHEEL_STRIP_MAX_INTENSITY,
} from '../../../utils/nightConfig';
import { createRoundedRectShape } from '../desk/DeskTop';

interface MouseProps {
  item: CatalogItem<'mouse'>;
  isSelected?: boolean;
}

const NOOP_RAYCAST = () => null;

// Buat tekstur bump noise mikro (64x64) untuk permukaan soft-touch bodi mouse
function createSoftTouchBumpTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    let seed = 1337;
    for (let i = 0; i < data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const val = 118 + (seed % 20);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.needsUpdate = true;
  return tex;
}

// Buat CanvasTexture bump bergaris (~40 alur keliling) untuk roda scroll
function createWheelGrooveBumpTexture(grooveCount: number): THREE.CanvasTexture {
  const width = 64;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    for (let y = 0; y < height; y++) {
      const wave = Math.sin((y / height) * Math.PI * 2 * grooveCount);
      const v = Math.round(128 + wave * 110);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, width, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Buat CanvasTexture atlas angka 1-12 berwarna putih (diwarnai oleh setupAccent material)
function createMmoNumbersAtlasTexture(): THREE.CanvasTexture {
  const cols = 3;
  const rows = 4;
  const cellW = 128;
  const cellH = 128;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 58px Inter, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const num = r * cols + c + 1;
        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        ctx.fillText(String(num), cx, cy);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Buat CanvasTexture emblem buatan sendiri: dua cincin konsentris tipis dengan celah kecil
function createConcentricRingsEmblemTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';

    ctx.lineWidth = 7;
    const outerRadius = size * 0.36;
    const outerGaps = 3;
    const gapRad = 0.28;
    const arcSpan = (Math.PI * 2) / outerGaps;
    for (let i = 0; i < outerGaps; i++) {
      const start = i * arcSpan + gapRad / 2 - Math.PI / 2;
      const end = (i + 1) * arcSpan - gapRad / 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, start, end);
      ctx.stroke();
    }

    ctx.lineWidth = 6;
    const innerRadius = size * 0.2;
    const innerGaps = 2;
    const innerSpan = (Math.PI * 2) / innerGaps;
    for (let i = 0; i < innerGaps; i++) {
      const start = i * innerSpan + gapRad * 0.65;
      const end = (i + 1) * innerSpan - gapRad * 0.65;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, start, end);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Buat geometri pita garis pemisah tombol kiri-kanan mengikuti kurva punggung tengah dari u=0..0,42
function createCenterSeamGeometry(variant: MouseVariant): THREE.BufferGeometry {
  const { seamStartU, seamEndU, seamWidth } = MOUSE_COMPONENT_CONSTANTS;
  const steps = 16;
  const hw = seamWidth / 2;
  const liftY = 0.00025;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const u = seamStartU + (i / steps) * (seamEndU - seamStartU);
    const p = evaluateMouseProfile(u, variant);
    positions.push(-hw, p.height + liftY, p.z);
    positions.push(hw, p.height + liftY, p.z);
  }

  for (let i = 0; i < steps; i++) {
    const b0 = i * 2;
    const b1 = i * 2 + 1;
    const t0 = (i + 1) * 2;
    const t1 = (i + 1) * 2 + 1;
    indices.push(b0, t0, t1);
    indices.push(b0, t1, b1);
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

// Buat geometri rounded box kecil untuk InstancedMesh 12 tombol samping MMO
function createSmallRoundedBoxGeometry(
  sx: number,
  sy: number,
  sz: number,
  radius = 0.001
): THREE.ExtrudeGeometry {
  const shape = createRoundedRectShape(sz, sy, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: sx,
    bevelEnabled: true,
    bevelThickness: 0.0004,
    bevelSize: 0.0004,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-sx / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

// Buat satu BufferGeometry gabungan dari 12 plane kecil dengan UV masing-masing sel atlas (1-12)
function createMergedMmoNumberPlanesGeometry(): THREE.BufferGeometry {
  const {
    mmoPanelSize,
    mmoKeySize,
    mmoRows,
    mmoCols,
    mmoRowPitch,
    mmoColPitch,
  } = MOUSE_COMPONENT_CONSTANTS;

  const planeZ = mmoKeySize[2] * 0.72;
  const planeY = mmoKeySize[1] * 0.72;
  const xPlane = -mmoPanelSize[0] / 2 - mmoKeySize[0] - 0.00055;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < mmoRows; r++) {
    for (let c = 0; c < mmoCols; c++) {
      const zCenter = (r - (mmoRows - 1) / 2) * mmoRowPitch;
      const yCenter = ((mmoCols - 1) / 2 - c) * mmoColPitch;

      const hz = planeZ / 2;
      const hy = planeY / 2;

      const u0 = c / mmoCols;
      const u1 = (c + 1) / mmoCols;
      const vTop = 1 - r / mmoRows;
      const vBot = 1 - (r + 1) / mmoRows;

      const baseVertex = positions.length / 3;

      positions.push(
        xPlane, yCenter - hy, zCenter - hz,
        xPlane, yCenter - hy, zCenter + hz,
        xPlane, yCenter + hy, zCenter + hz,
        xPlane, yCenter + hy, zCenter - hz
      );

      for (let k = 0; k < 4; k++) {
        normals.push(-1, 0, 0);
      }

      uvs.push(
        u0, vBot,
        u1, vBot,
        u1, vTop,
        u0, vTop
      );

      indices.push(
        baseVertex,
        baseVertex + 1,
        baseVertex + 2,
        baseVertex,
        baseVertex + 2,
        baseVertex + 3
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

// Sub-komponen Panel 12 Tombol Samping khusus varian MMO
function MmoSidePanel({
  variant,
  setupAccent,
  numbersMatRef,
}: {
  variant: MouseVariant;
  setupAccent: string;
  numbersMatRef: RefObject<THREE.MeshStandardMaterial>;
}) {
  const spec = MOUSE_SPECS[variant];
  const {
    mmoPanelU,
    mmoPanelHeightRatio,
    mmoPanelTiltDeg,
    mmoPanelInset,
    mmoPanelSize,
    mmoKeySize,
    mmoKeyColor,
    mmoRows,
    mmoCols,
    mmoRowPitch,
    mmoColPitch,
  } = MOUSE_COMPONENT_CONSTANTS;

  const keysMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const totalButtons = mmoRows * mmoCols;

  const surfPt = useMemo(
    () =>
      getMouseLeftSideXAtHeight(
        mmoPanelU,
        spec.height * mmoPanelHeightRatio,
        variant
      ),
    [mmoPanelU, spec.height, mmoPanelHeightRatio, variant]
  );

  const keyGeometry = useMemo(
    () =>
      createSmallRoundedBoxGeometry(
        mmoKeySize[0],
        mmoKeySize[1],
        mmoKeySize[2],
        0.001
      ),
    [mmoKeySize]
  );

  const keyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: mmoKeyColor,
        roughness: 0.5,
        metalness: 0.1,
      }),
    [mmoKeyColor]
  );

  const numbersAtlasTex = useMemo(() => createMmoNumbersAtlasTexture(), []);
  const mergedNumbersGeo = useMemo(
    () => createMergedMmoNumberPlanesGeometry(),
    []
  );

  useEffect(() => {
    return () => {
      keyGeometry.dispose();
      numbersAtlasTex.dispose();
      mergedNumbersGeo.dispose();
    };
  }, [keyGeometry, numbersAtlasTex, mergedNumbersGeo]);

  useLayoutEffect(() => {
    const mesh = keysMeshRef.current;
    if (!mesh) return;

    const xButtonCenter = -mmoPanelSize[0] / 2 - mmoKeySize[0] / 2;
    let idx = 0;

    for (let r = 0; r < mmoRows; r++) {
      for (let c = 0; c < mmoCols; c++) {
        const zLocal = (r - (mmoRows - 1) / 2) * mmoRowPitch;
        const yLocal = ((mmoCols - 1) / 2 - c) * mmoColPitch;

        dummy.position.set(xButtonCenter, yLocal, zLocal);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [mmoPanelSize, mmoKeySize, mmoRows, mmoCols, mmoRowPitch, mmoColPitch, dummy]);

  const tiltRad = -THREE.MathUtils.degToRad(mmoPanelTiltDeg);
  const initialNf = nightFactor.current;

  return (
    <group
      position={[surfPt.x + mmoPanelInset, surfPt.y, surfPt.z]}
      rotation={[0, 0, tiltRad]}
    >
      <RoundedBox
        args={[mmoPanelSize[0], mmoPanelSize[1], mmoPanelSize[2]]}
        radius={0.0018}
        smoothness={3}
        castShadow
        receiveShadow
        raycast={NOOP_RAYCAST}
      >
        <meshStandardMaterial
          color="#0b0b0d"
          roughness={0.65}
          metalness={0.1}
        />
      </RoundedBox>

      <instancedMesh
        ref={keysMeshRef}
        args={[keyGeometry, keyMaterial, totalButtons]}
        castShadow
        receiveShadow
        raycast={NOOP_RAYCAST}
      />

      <mesh geometry={mergedNumbersGeo} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial
          ref={numbersMatRef}
          map={numbersAtlasTex}
          color={setupAccent}
          emissive={setupAccent}
          emissiveMap={numbersAtlasTex}
          emissiveIntensity={initialNf * MOUSE_MMO_NUMBER_MAX_INTENSITY}
          transparent
          alphaTest={0.08}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Komponen utama 3D Mouse Gaming Nirkabel dengan lampu malam & glow decal
export function Mouse({ item, isSelected = false }: MouseProps) {
  const { variant } = item.params;
  const spec = MOUSE_SPECS[variant];
  const setupAccent = useSetupStore((state) => state.setupAccent);

  const stripLeftMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const stripRightMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const mmoNumbersMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const emblemMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const matGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lastFactorRef = useRef<number>(-1);

  const {
    bodyColor,
    bodyRoughness,
    bodyMetalness,
    seamColor,
    wheelU,
    wheelRadius,
    wheelWidth,
    wheelProtrusion,
    wheelGrooveCount,
    wheelSlotWidth,
    wheelSlotLength,
    wheelSlotColor,
    wheelStripSize,
    dpiButtonUs,
    dpiButtonSize,
    dpiButtonColor,
    dpiBorderColor,
    sideTopButtonUs,
    sideTopButtonHeightRatio,
    sideTopButtonProtrusion,
    emblemU,
    emblemSize,
  } = MOUSE_COMPONENT_CONSTANTS;

  const bodyGeometry = useMemo(
    () => buildMouseBodyGeometry(variant),
    [variant]
  );
  const bumpTexture = useMemo(() => createSoftTouchBumpTexture(), []);
  const seamGeometry = useMemo(
    () => createCenterSeamGeometry(variant),
    [variant]
  );
  const wheelBumpTexture = useMemo(
    () => createWheelGrooveBumpTexture(wheelGrooveCount),
    [wheelGrooveCount]
  );
  const emblemTexture = useMemo(
    () => createConcentricRingsEmblemTexture(),
    []
  );
  const sharedGlowTex = useMemo(() => getSharedGlowTexture(), []);

  useEffect(() => {
    return () => {
      bodyGeometry.dispose();
      bumpTexture.dispose();
      seamGeometry.dispose();
      wheelBumpTexture.dispose();
      emblemTexture.dispose();
    };
  }, [
    bodyGeometry,
    bumpTexture,
    seamGeometry,
    wheelBumpTexture,
    emblemTexture,
  ]);

  const slotGeometry = useMemo(() => {
    const shape = createRoundedRectShape(
      wheelSlotWidth,
      wheelSlotLength,
      0.004
    );
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.0014,
      bevelEnabled: false,
      curveSegments: 10,
    });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, [wheelSlotWidth, wheelSlotLength]);

  useEffect(() => {
    return () => {
      slotGeometry.dispose();
    };
  }, [slotGeometry]);

  const wheelPose = useMemo(
    () => getMouseTopRidgePose(wheelU, variant),
    [wheelU, variant]
  );

  const dpiPoses = useMemo(
    () => dpiButtonUs.map((u) => getMouseTopRidgePose(u, variant)),
    [dpiButtonUs, variant]
  );

  const sideTopPoints = useMemo(
    () =>
      sideTopButtonUs.map((u) =>
        getMouseLeftSideXAtHeight(
          u,
          spec.height * sideTopButtonHeightRatio,
          variant
        )
      ),
    [sideTopButtonUs, spec.height, sideTopButtonHeightRatio, variant]
  );

  const emblemPose = useMemo(
    () => getMouseTopRidgePose(emblemU, variant),
    [emblemU, variant]
  );

  const stripOffsetX = wheelWidth / 2 + wheelStripSize[0] / 2 + 0.0003;
  const wheelCenterY = wheelPose.y - wheelRadius + wheelProtrusion;

  // Perbarui emissiveIntensity strip roda, angka MMO, emblem, dan glow mat mengikuti nightFactor.current
  useFrame(() => {
    const nf = nightFactor.current;
    if (Math.abs(nf - lastFactorRef.current) < 1e-4) return;
    lastFactorRef.current = nf;

    const stripIntensity = nf * MOUSE_WHEEL_STRIP_MAX_INTENSITY;
    if (stripLeftMatRef.current) {
      stripLeftMatRef.current.emissiveIntensity = stripIntensity;
    }
    if (stripRightMatRef.current) {
      stripRightMatRef.current.emissiveIntensity = stripIntensity;
    }
    if (mmoNumbersMatRef.current) {
      mmoNumbersMatRef.current.emissiveIntensity =
        nf * MOUSE_MMO_NUMBER_MAX_INTENSITY;
    }
    if (emblemMatRef.current) {
      emblemMatRef.current.emissiveIntensity = nf * MOUSE_EMBLEM_MAX_INTENSITY;
    }
    if (matGlowMatRef.current) {
      matGlowMatRef.current.opacity = nf * MOUSE_GLOW_MAX_OPACITY;
      matGlowMatRef.current.visible = nf > 0.001;
    }
  });

  const initialNf = nightFactor.current;

  return (
    <group position={[0, 0, 0]}>
      {/* Hit-box tunggal transparan seukuran mouse */}
      <mesh position={[0, spec.height / 2, 0]}>
        <boxGeometry
          args={[item.dimensions.width, spec.height, spec.length]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Glow Decal di bawah mouse pada permukaan meja/mat */}
      <mesh
        position={[0, GLOW_DECAL_SURFACE_OFFSET_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={10}
        raycast={NOOP_RAYCAST}
      >
        <planeGeometry
          args={[
            item.dimensions.width + MOUSE_GLOW_PADDING_M * 2,
            spec.length + MOUSE_GLOW_PADDING_M * 2,
          ]}
        />
        <meshBasicMaterial
          ref={matGlowMatRef}
          map={sharedGlowTex}
          color={setupAccent}
          transparent
          opacity={initialNf * MOUSE_GLOW_MAX_OPACITY}
          visible={initialNf > 0.001}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          toneMapped={false}
        />
      </mesh>

      {/* Bodi utama mouse hasil lofting 40x32 superellipse */}
      <mesh
        geometry={bodyGeometry}
        castShadow
        receiveShadow
        raycast={NOOP_RAYCAST}
      >
        <meshStandardMaterial
          color={bodyColor}
          roughness={bodyRoughness}
          metalness={bodyMetalness}
          bumpMap={bumpTexture}
          bumpScale={0.00015}
        />
        {isSelected && (
          <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
        )}
      </mesh>

      {/* 1. Garis pemisah tipis tombol utama kiri/kanan */}
      <mesh geometry={seamGeometry} raycast={NOOP_RAYCAST}>
        <meshStandardMaterial color={seamColor} roughness={0.9} metalness={0} />
      </mesh>

      {/* 2. Slot gelap, Roda Scroll bergaris, dan 2 Strip Menyala */}
      <group>
        <mesh
          position={[0, wheelPose.y - 0.0005, wheelPose.z]}
          rotation={[wheelPose.pitchX, 0, 0]}
          geometry={slotGeometry}
          receiveShadow
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial
            color={wheelSlotColor}
            roughness={0.8}
            metalness={0.05}
          />
        </mesh>

        <mesh
          position={[0, wheelCenterY, wheelPose.z]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
          receiveShadow
          raycast={NOOP_RAYCAST}
        >
          <cylinderGeometry
            args={[wheelRadius, wheelRadius, wheelWidth, 36]}
          />
          <meshStandardMaterial
            color="#161618"
            roughness={0.65}
            metalness={0.1}
            bumpMap={wheelBumpTexture}
            bumpScale={0.0008}
          />
        </mesh>

        {/* Strip kiri roda */}
        <mesh
          position={[-stripOffsetX, wheelPose.y + 0.0006, wheelPose.z]}
          rotation={[wheelPose.pitchX, 0, 0]}
          raycast={NOOP_RAYCAST}
        >
          <boxGeometry
            args={[
              wheelStripSize[0],
              wheelStripSize[1],
              wheelStripSize[2],
            ]}
          />
          <meshStandardMaterial
            ref={stripLeftMatRef}
            color="#1a2e1a"
            emissive={setupAccent}
            emissiveIntensity={initialNf * MOUSE_WHEEL_STRIP_MAX_INTENSITY}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>

        {/* Strip kanan roda */}
        <mesh
          position={[stripOffsetX, wheelPose.y + 0.0006, wheelPose.z]}
          rotation={[wheelPose.pitchX, 0, 0]}
          raycast={NOOP_RAYCAST}
        >
          <boxGeometry
            args={[
              wheelStripSize[0],
              wheelStripSize[1],
              wheelStripSize[2],
            ]}
          />
          <meshStandardMaterial
            ref={stripRightMatRef}
            color="#1a2e1a"
            emissive={setupAccent}
            emissiveIntensity={initialNf * MOUSE_WHEEL_STRIP_MAX_INTENSITY}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* 3. Dua tombol kecil persegi di belakang roda */}
      {dpiPoses.map((pose, idx) => (
        <group
          key={idx}
          position={[0, pose.y + 0.0002, pose.z]}
          rotation={[pose.pitchX, 0, 0]}
        >
          <mesh receiveShadow raycast={NOOP_RAYCAST}>
            <boxGeometry
              args={[
                dpiButtonSize[0] + 0.0012,
                0.0006,
                dpiButtonSize[2] + 0.0012,
              ]}
            />
            <meshStandardMaterial
              color={dpiBorderColor}
              roughness={0.5}
              metalness={0.2}
            />
          </mesh>
          <mesh
            position={[0, dpiButtonSize[1] / 2, 0]}
            castShadow
            receiveShadow
            raycast={NOOP_RAYCAST}
          >
            <boxGeometry
              args={[dpiButtonSize[0], dpiButtonSize[1], dpiButtonSize[2]]}
            />
            <meshStandardMaterial
              color={dpiButtonColor}
              roughness={0.45}
              metalness={0.15}
            />
          </mesh>
        </group>
      ))}

      {/* 4. Dua tombol samping atas (maju/mundur) di sisi kiri */}
      {sideTopPoints.map((pt, idx) => (
        <RoundedBox
          key={idx}
          args={spec.sideTopButtonSize}
          radius={0.0012}
          smoothness={3}
          position={[
            pt.x -
              spec.sideTopButtonSize[0] / 2 +
              (spec.sideTopButtonSize[0] - sideTopButtonProtrusion),
            pt.y,
            pt.z,
          ]}
          rotation={[0, 0, -0.22]}
          castShadow
          receiveShadow
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial
            color="#18181b"
            roughness={0.45}
            metalness={0.15}
          />
        </RoundedBox>
      ))}

      {/* 5. Panel 12 tombol samping + angka menyala (khusus varian MMO) */}
      {spec.hasMmoPanel && (
        <MmoSidePanel
          variant={variant}
          setupAccent={setupAccent}
          numbersMatRef={mmoNumbersMatRef}
        />
      )}

      {/* 6. Emblem buatan sendiri (dua cincin konsentris tipis bercelah) di punggung belakang */}
      <mesh
        position={[0, emblemPose.y + 0.0004, emblemPose.z]}
        rotation={[-Math.PI / 2 + emblemPose.pitchX, 0, 0]}
        raycast={NOOP_RAYCAST}
      >
        <planeGeometry args={[emblemSize, emblemSize]} />
        <meshStandardMaterial
          ref={emblemMatRef}
          map={emblemTexture}
          color={setupAccent}
          emissive={setupAccent}
          emissiveMap={emblemTexture}
          emissiveIntensity={initialNf * MOUSE_EMBLEM_MAX_INTENSITY}
          transparent
          alphaTest={0.05}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
