import { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';
import type { DeskTextureMaps } from '../Desk';

interface DeskTopProps {
  topTextures?: DeskTextureMaps;
  isSelected?: boolean;
}

// Buat bentuk 2D persegi panjang dengan empat sudut membulat
export function createRoundedRectShape(
  width: number,
  depth: number,
  radius: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw, hd);

  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hd - r);
  shape.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw + r, hd);
  shape.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hd + r);
  shape.absarc(-hw + r, -hd + r, r, Math.PI, (Math.PI * 3) / 2, false);

  return shape;
}

// Komponen daun meja hitam glossy bersudut membulat + dua lubang kabel (grommets)
export function DeskTop({ topTextures, isSelected = false }: DeskTopProps) {
  const {
    width,
    depth,
    height,
    topThickness,
    topCornerRadius,
    topBevel,
    topCurveSegments,
    topColor,
    topRoughness,
    topMetalness,
    topClearcoat,
    topClearcoatRoughness,
    grommetOffsetX,
    grommetBackMargin,
    grommetOuterRadius,
    grommetInnerRadius,
    grommetHeight,
    grommetOuterColor,
    grommetInnerColor,
  } = DESK_CONFIG;

  // Geometry dan material dibuat satu kali dengan useMemo
  const topGeometry = useMemo(() => {
    const innerW = width - topBevel * 2;
    const innerD = depth - topBevel * 2;
    const innerR = Math.max(0.005, topCornerRadius - topBevel);
    const shape = createRoundedRectShape(innerW, innerD, innerR);

    const extrudeDepth = Math.max(0.002, topThickness - topBevel * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelThickness: topBevel,
      bevelSize: topBevel,
      bevelSegments: 3,
      curveSegments: topCurveSegments,
    });

    // Putar agar bidang shape berada di XZ dan ketebalan di sumbu Y
    geo.rotateX(-Math.PI / 2);
    // Geser sehingga bagian bawah daun meja tepat di y = 0 dan permukaan atas tepat di y = topThickness
    geo.translate(0, topBevel, 0);
    geo.computeVertexNormals();
    return geo;
  }, [width, depth, topThickness, topCornerRadius, topBevel, topCurveSegments]);

  const topMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: topColor,
        roughness: topRoughness,
        metalness: topMetalness,
        clearcoat: topClearcoat,
        clearcoatRoughness: topClearcoatRoughness,
        envMapIntensity: 0.7,
        ...topTextures,
      }),
    [
      topColor,
      topRoughness,
      topMetalness,
      topClearcoat,
      topClearcoatRoughness,
      topTextures,
    ]
  );

  const grommetOuterGeo = useMemo(
    () =>
      new THREE.CylinderGeometry(
        grommetOuterRadius,
        grommetOuterRadius,
        grommetHeight,
        28
      ),
    [grommetOuterRadius, grommetHeight]
  );

  const grommetInnerGeo = useMemo(
    () =>
      new THREE.CylinderGeometry(
        grommetInnerRadius,
        grommetInnerRadius,
        grommetHeight + 0.0006,
        28
      ),
    [grommetInnerRadius, grommetHeight]
  );

  const grommetOuterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: grommetOuterColor,
        roughness: 0.5,
        metalness: 0.2,
      }),
    [grommetOuterColor]
  );

  const grommetInnerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: grommetInnerColor,
        roughness: 0.95,
        metalness: 0,
      }),
    [grommetInnerColor]
  );

  const grommetZ = -(depth / 2 - grommetBackMargin);
  const grommetY = height + grommetHeight / 2 - 0.001;
  const grommetXPositions = [-grommetOffsetX, grommetOffsetX];

  return (
    <group>
      {/* Daun meja utama: bagian bawah di height - topThickness, permukaan atas persis di height */}
      <mesh
        position={[0, height - topThickness, 0]}
        geometry={topGeometry}
        material={topMaterial}
        castShadow
        receiveShadow
      >
        {isSelected && (
          <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
        )}
      </mesh>

      {/* Dua lubang kabel (grommets) di sudut kiri-belakang dan kanan-belakang */}
      {grommetXPositions.map((gx, idx) => (
        <group key={idx} position={[gx, grommetY, grommetZ]}>
          <mesh
            geometry={grommetOuterGeo}
            material={grommetOuterMat}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={grommetInnerGeo}
            material={grommetInnerMat}
            receiveShadow
          />
        </group>
      ))}
    </group>
  );
}
