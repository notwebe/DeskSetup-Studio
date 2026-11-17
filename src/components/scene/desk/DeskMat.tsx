import { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';
import { getDeskMatTexture } from '../../../utils/deskMatTexture';
import { createRoundedRectShape } from './DeskTop';

interface DeskMatProps {
  isSelected?: boolean;
}

// Komponen Desk Mat (1,00 x 0,40 x 0,003 m) di atas permukaan meja dengan tekstur kurva hijau
export function DeskMat({ isSelected = false }: DeskMatProps) {
  const {
    depth,
    height,
    matWidth,
    matDepth,
    matThickness,
    matCornerRadius,
    matFrontMargin,
    matRoughness,
    matMetalness,
  } = DESK_CONFIG;

  const matGeometry = useMemo(() => {
    const shape = createRoundedRectShape(matWidth, matDepth, matCornerRadius);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: matThickness,
      bevelEnabled: false,
      curveSegments: 12,
    });

    geo.rotateX(-Math.PI / 2);

    // Normalisasi UV ke rentang [0, 1] agar CanvasTexture (kurva hijau + jahitan tepi) terpetakan pas
    const posAttr = geo.attributes.position;
    const uvAttr = geo.attributes.uv;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const u = (vx + matWidth / 2) / matWidth;
      const v = 1 - (vz + matDepth / 2) / matDepth;
      uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [matWidth, matDepth, matThickness, matCornerRadius]);

  const matMaterial = useMemo(() => {
    const texture = getDeskMatTexture();
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: matRoughness,
      metalness: matMetalness,
    });
  }, [matRoughness, matMetalness]);

  // Tengah di X = 0, jarak 0,06 m dari tepi depan meja (+depth / 2)
  const matZ = depth / 2 - matFrontMargin - matDepth / 2;

  return (
    <mesh
      position={[0, height, matZ]}
      geometry={matGeometry}
      material={matMaterial}
      receiveShadow
    >
      {isSelected && (
        <Outlines thickness={2} color="#f59e0b" toneMapped={false} />
      )}
    </mesh>
  );
}
