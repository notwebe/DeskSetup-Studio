import { useRef, useState } from 'react';
import { RoundedBox, useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM_CONFIG } from '../../constants/deskConfig';
import { nightFactor } from '../../lib/nightFactor';
import { useSetupStore } from '../../store/useSetupStore';
import { WALL_SWITCH_CONFIG } from '../../utils/nightConfig';

// Komponen Saklar Lampu di Dinding Belakang (anak dari Room, BUKAN DeskRig)
export function WallSwitch() {
  const toggleNight = useSetupStore((state) => state.toggleNight);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'pointer', 'auto');

  const rockerRef = useRef<THREE.Group>(null);
  const indicatorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const lastFactorRef = useRef<number>(-1);

  const {
    x,
    y,
    plateWidth,
    plateHeight,
    plateDepth,
    plateColor,
    plateRoughness,
    frameWidth,
    frameHeight,
    frameDepth,
    rockerWidth,
    rockerHeight,
    rockerDepth,
    rockerColor,
    rockerMaxTiltRad,
    indicatorRadius,
    indicatorOffsetY,
    indicatorColor,
    indicatorMaxEmissiveIntensity,
  } = WALL_SWITCH_CONFIG;

  // Menempel tepat pada permukaan depan dinding belakang
  const wallFrontZ = ROOM_CONFIG.backWallZ;

  // Animasi kemiringan rocker & indikator oranye mengikuti nightFactor.current tanpa re-render React
  useFrame(() => {
    const nf = nightFactor.current;
    if (Math.abs(nf - lastFactorRef.current) < 1e-4) return;
    lastFactorRef.current = nf;

    if (rockerRef.current) {
      // Terang (nf = 0): sisi atas menekan ke dalam (+0,14 rad)
      // Gelap (nf = 1): sisi bawah menekan ke dalam (-0,14 rad)
      rockerRef.current.rotation.x = THREE.MathUtils.lerp(
        rockerMaxTiltRad,
        -rockerMaxTiltRad,
        nf
      );
    }

    if (indicatorMatRef.current) {
      indicatorMatRef.current.emissiveIntensity =
        nf * indicatorMaxEmissiveIntensity;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Hanya toggle jika bukan geseran kamera
    if (e.delta <= 4) {
      toggleNight();
    }
  };

  return (
    <group
      position={[x, y, wallFrontZ]}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {/* Pelat dasar 0,086 x 0,086 x 0,010 m (putih gading #e8e6e1) */}
      <RoundedBox
        args={[plateWidth, plateHeight, plateDepth]}
        radius={0.004}
        smoothness={3}
        position={[0, 0, plateDepth / 2]}
        receiveShadow
      >
        <meshStandardMaterial
          color={plateColor}
          roughness={plateRoughness}
          metalness={0.02}
        />
      </RoundedBox>

      {/* Bingkai dalam tipis mengelilingi rocker */}
      <RoundedBox
        args={[frameWidth, frameHeight, frameDepth]}
        radius={0.002}
        smoothness={2}
        position={[0, 0.003, plateDepth + frameDepth / 2 - 0.0005]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#dcd9d0"
          roughness={0.55}
          metalness={0.02}
        />
      </RoundedBox>

      {/* Tombol rocker yang berputar pada sumbu X */}
      <group ref={rockerRef} position={[0, 0.003, plateDepth + 0.001]}>
        <RoundedBox
          args={[rockerWidth, rockerHeight, rockerDepth]}
          radius={0.0022}
          smoothness={3}
          receiveShadow
        >
          <meshStandardMaterial
            color={rockerColor}
            roughness={0.42}
            metalness={0.02}
          />
        </RoundedBox>
      </group>

      {/* Indikator kecil oranye redup di bawah rocker (menyala saat mode malam) */}
      <mesh
        position={[0, indicatorOffsetY, plateDepth + 0.0006]}
        receiveShadow
      >
        <circleGeometry args={[indicatorRadius, 20]} />
        <meshStandardMaterial
          ref={indicatorMatRef}
          color={indicatorColor}
          emissive={indicatorColor}
          emissiveIntensity={0}
          roughness={0.3}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
