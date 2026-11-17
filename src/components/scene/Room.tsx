import * as THREE from 'three';
import { ROOM_CONFIG } from '../../constants/deskConfig';
import { WallSwitch } from './WallSwitch';

// Konstanta batas area lantai ruangan untuk perhitungan clampDeskToRoom (dalam meter)
export const ROOM_BOUNDS = {
  minX: -ROOM_CONFIG.floorWidth / 2,
  maxX: ROOM_CONFIG.floorWidth / 2,
  minZ: ROOM_CONFIG.backWallZ,
  maxZ: ROOM_CONFIG.floorDepth / 2,
} as const;

// Struktur opsional untuk texture map PBR permukaan ruangan
export interface SurfaceTextureMaps {
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
}

interface RoomProps {
  floorTextures?: SurfaceTextureMaps;
  wallTextures?: SurfaceTextureMaps;
}

// Komponen ruangan sederhana (lantai, dinding belakang, dan saklar lampu di dinding)
export function Room({ floorTextures, wallTextures }: RoomProps = {}) {
  const {
    floorWidth,
    floorDepth,
    wallHeight,
    wallThickness,
    backWallZ,
    floorColor,
  } = ROOM_CONFIG;

  const expandedFloorWidth = floorWidth * 8;
  const expandedFloorDepth = floorDepth * 8;
  const expandedWallWidth = floorWidth * 8;
  const expandedWallHeight = wallHeight * 4;

  return (
    <group>
      {/* Lantai pada y = 0 dengan roughness lebih tinggi dari meja */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[expandedFloorWidth, expandedFloorDepth]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.85}
          metalness={0}
          envMapIntensity={0.35}
          {...floorTextures}
        />
      </mesh>

      {/* Dinding belakang warna netral hangat dengan hasil akhir matte */}
      <mesh
        position={[0, expandedWallHeight / 2, backWallZ - wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry
          args={[expandedWallWidth, expandedWallHeight, wallThickness]}
        />
        <meshStandardMaterial
          color="#f3eee6"
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.25}
          {...wallTextures}
        />
      </mesh>

      {/* Saklar lampu di dinding belakang (anak dari Room, bukan DeskRig) */}
      <WallSwitch />
    </group>
  );
}
