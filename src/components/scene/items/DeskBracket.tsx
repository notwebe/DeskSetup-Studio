import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';
import type { MonitorMountParams } from '../../../types/catalog';
import { Clamp } from './Clamp';
import type { LiveMonitorPose } from './MonitorArm';

interface DeskBracketProps {
  params: MonitorMountParams;
  poseRef: MutableRefObject<LiveMonitorPose>;
}

// Komponen Desk Mount Bracket: klem + tiang pendek + blok geser + lengan pendek + pelat VESA
export function DeskBracket({ params, poseRef }: DeskBracketProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const sliderBlockRef = useRef<THREE.Group>(null);
  const vesaGroupRef = useRef<THREE.Group>(null);

  const backEdgeZ = -DESK_CONFIG.depth / 2;
  const poleZ = backEdgeZ + params.poleInsetZ;
  const { poleHeight, poleRadius, bracketForwardOffset } = params;

  useFrame(() => {
    const pose = poseRef.current;
    const vesaY = pose.mountHeight + pose.frameHeight / 2;
    const clampedSliderY = Math.max(0.06, Math.min(poleHeight - 0.02, vesaY));

    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(pose.baseX, DESK_CONFIG.height, 0);
    }

    if (sliderBlockRef.current) {
      sliderBlockRef.current.position.set(0, clampedSliderY, poleZ);
    }

    if (vesaGroupRef.current) {
      const localMonX = pose.x - pose.baseX;
      const vesaX = localMonX - Math.sin(pose.rotY) * 0.002;
      const vesaZ = pose.z - Math.cos(pose.rotY) * 0.002;
      vesaGroupRef.current.position.set(vesaX, vesaY, vesaZ);
      vesaGroupRef.current.rotation.set(0, pose.rotY, 0);
    }
  });

  return (
    <group ref={rootGroupRef} position={[0, DESK_CONFIG.height, 0]}>
      {/* Klem penjepit tepi belakang desk */}
      <Clamp position={[0, 0, backEdgeZ]} />

      {/* Tiang pendek tegak */}
      <mesh
        position={[0, poleHeight / 2 + 0.006, poleZ]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 24]} />
        <meshStandardMaterial
          color="#27272a"
          metalness={0.82}
          roughness={0.34}
        />
      </mesh>

      {/* Blok geser setinggi mountHeight + lengan pendek lurus ke depan */}
      <group ref={sliderBlockRef} position={[0, 0.25, poleZ]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.046, 0.044, 0.046]} />
          <meshStandardMaterial
            color="#18181b"
            metalness={0.8}
            roughness={0.36}
          />
        </mesh>

        <mesh
          position={[0, 0, bracketForwardOffset / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.028, 0.028, bracketForwardOffset]} />
          <meshStandardMaterial
            color="#3f3f46"
            metalness={0.8}
            roughness={0.35}
          />
        </mesh>
      </group>

      {/* Pelat VESA di belakang monitor (orientasi mengikuti rotY monitor) */}
      <group ref={vesaGroupRef}>
        <mesh position={[0, 0, -0.002]} castShadow receiveShadow>
          <boxGeometry args={[0.095, 0.095, 0.006]} />
          <meshStandardMaterial
            color="#18181b"
            metalness={0.78}
            roughness={0.38}
          />
        </mesh>
      </group>
    </group>
  );
}
