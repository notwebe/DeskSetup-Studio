import { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';
import type { DeskTextureMaps } from '../Desk';

interface DeskLegsProps {
  legTextures?: DeskTextureMaps;
  isSelected?: boolean;
}

// Buat geometri kaki dasar berbentuk trapesium dari atas (ujung dipotong miring 45 derajat)
function createTrapezoidFootGeometry(
  footWidth: number,
  footLength: number,
  footHeight: number,
  chamfer: number
): THREE.ExtrudeGeometry {
  const hw = footWidth / 2;
  const hl = footLength / 2;
  const c = Math.min(chamfer, hw * 0.95, hl * 0.4);

  // Shape pada bidang 2D (X = lebar kaki, Y_shape = -Z panjang kaki)
  const shape = new THREE.Shape();
  shape.moveTo(-hw + c, -hl);
  shape.lineTo(hw - c, -hl);
  shape.lineTo(hw, -hl + c);
  shape.lineTo(hw, hl - c);
  shape.lineTo(hw - c, hl);
  shape.lineTo(-hw + c, hl);
  shape.lineTo(-hw, hl - c);
  shape.lineTo(-hw, -hl + c);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: footHeight,
    bevelEnabled: false,
  });

  // Putar agar menapak rata di lantai (y = 0 sampai y = footHeight)
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// Komponen dua kaki berbentuk T terbalik teleskopik (tanpa balok penghubung tengah)
export function DeskLegs({ legTextures, isSelected = false }: DeskLegsProps) {
  const {
    width,
    height,
    topThickness,
    legOffsetFromEdgeX,
    footLength,
    footWidth,
    footHeight,
    footChamfer,
    lowerColWidth,
    lowerColDepth,
    lowerColHeight,
    jointRingHeight,
    upperColWidth,
    upperColDepth,
    topPlateWidth,
    topPlateDepth,
    topPlateHeight,
    legColor,
    legRoughness,
    legMetalness,
  } = DESK_CONFIG;

  const underTopY = height - topThickness;
  const lowerColBottomY = footHeight;
  const lowerColTopY = lowerColBottomY + lowerColHeight;
  const jointRingCenterY = lowerColTopY + jointRingHeight / 2;
  const topPlateBottomY = underTopY - topPlateHeight;
  const upperColBottomY = lowerColTopY + jointRingHeight;
  const upperColHeight = Math.max(0.05, topPlateBottomY - upperColBottomY);

  // Seluruh geometry dan material dibuat satu kali dengan useMemo dan dipakai bersama kedua kaki
  const footGeo = useMemo(
    () =>
      createTrapezoidFootGeometry(
        footWidth,
        footLength,
        footHeight,
        footChamfer
      ),
    [footWidth, footLength, footHeight, footChamfer]
  );

  const lowerColGeo = useMemo(
    () =>
      new THREE.BoxGeometry(lowerColWidth, lowerColHeight, lowerColDepth),
    [lowerColWidth, lowerColHeight, lowerColDepth]
  );

  const jointRingGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        lowerColWidth + 0.003,
        jointRingHeight,
        lowerColDepth + 0.003
      ),
    [lowerColWidth, jointRingHeight, lowerColDepth]
  );

  const upperColGeo = useMemo(
    () =>
      new THREE.BoxGeometry(upperColWidth, upperColHeight, upperColDepth),
    [upperColWidth, upperColHeight, upperColDepth]
  );

  const topPlateGeo = useMemo(
    () =>
      new THREE.BoxGeometry(topPlateWidth, topPlateHeight, topPlateDepth),
    [topPlateWidth, topPlateHeight, topPlateDepth]
  );

  const legMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: legColor,
        roughness: legRoughness,
        metalness: legMetalness,
        envMapIntensity: 0.55,
        ...legTextures,
      }),
    [legColor, legRoughness, legMetalness, legTextures]
  );

  const jointRingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#222226',
        roughness: 0.45,
        metalness: 0.5,
      }),
    []
  );

  const legX = width / 2 - legOffsetFromEdgeX;
  const sideXPositions = [-legX, legX];

  return (
    <group>
      {sideXPositions.map((posX, idx) => (
        <group key={idx} position={[posX, 0, 0]}>
          {/* Kaki dasar trapesium menempel tepat di lantai (y = 0) */}
          <mesh
            position={[0, 0, 0]}
            geometry={footGeo}
            material={legMaterial}
            castShadow
            receiveShadow
          >
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>

          {/* Kolom bawah (0.07 x 0.09, tinggi 0.38 dari atas kaki dasar) */}
          <mesh
            position={[0, lowerColBottomY + lowerColHeight / 2, 0]}
            geometry={lowerColGeo}
            material={legMaterial}
            castShadow
            receiveShadow
          >
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>

          {/* Cincin/celah tipis 0.3 cm pada sambungan teleskopik */}
          <mesh
            position={[0, jointRingCenterY, 0]}
            geometry={jointRingGeo}
            material={jointRingMaterial}
            castShadow
            receiveShadow
          />

          {/* Kolom atas (0.06 x 0.08, naik sampai pelat penyambung bawah top) */}
          <mesh
            position={[0, upperColBottomY + upperColHeight / 2, 0]}
            geometry={upperColGeo}
            material={legMaterial}
            castShadow
            receiveShadow
          >
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>

          {/* Pelat penyambung 0.08 x 0.40 x 0.008 menempel rapat di sisi bawah top */}
          <mesh
            position={[0, topPlateBottomY + topPlateHeight / 2, 0]}
            geometry={topPlateGeo}
            material={legMaterial}
            castShadow
            receiveShadow
          >
            {isSelected && (
              <Outlines thickness={3} color="#f59e0b" toneMapped={false} />
            )}
          </mesh>
        </group>
      ))}
    </group>
  );
}
