import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { DeskAccessories } from './desk/DeskAccessories';
import { DeskLegs } from './desk/DeskLegs';
import { DeskMat } from './desk/DeskMat';
import { DeskTop } from './desk/DeskTop';

// Struktur opsional untuk texture map PBR meja
export interface DeskTextureMaps {
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
}

interface DeskProps {
  topTextures?: DeskTextureMaps;
  legTextures?: DeskTextureMaps;
  isSelected?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerCancel?: (e: ThreeEvent<PointerEvent>) => void;
}

// Komponen pintu masuk rakitan meja gaming elektrik (Top, Kaki T-terbalik, Desk Mat, dan Aksesori)
export function Desk({
  topTextures,
  legTextures,
  isSelected = false,
  ...eventHandlers
}: DeskProps = {}) {
  return (
    <group position={[0, 0, 0]} {...eventHandlers}>
      <DeskTop topTextures={topTextures} isSelected={isSelected} />
      <DeskLegs legTextures={legTextures} isSelected={isSelected} />
      <DeskMat isSelected={isSelected} />
      <DeskAccessories isSelected={isSelected} />
    </group>
  );
}
