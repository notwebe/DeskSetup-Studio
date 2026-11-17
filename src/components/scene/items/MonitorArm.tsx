import { useMemo, useRef, type MutableRefObject } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';
import type { MonitorMountParams } from '../../../types/catalog';
import {
  ARM_L1,
  ARM_L2,
  ARM_POST_HEIGHT,
  ARM_SHOULDER_OFFSET_Y,
  ARM_TOP_PLATE_THICKNESS,
  ARM_WRIST_BACK_OFFSET,
  segmentBetween,
  solveArmIk3D,
} from '../../../utils/armIk';
import { Clamp } from './Clamp';

export interface LiveMonitorPose {
  x: number;
  z: number;
  rotY: number;
  mountHeight: number;
  baseX: number;
  frameHeight: number;
}

interface MonitorArmProps {
  params: MonitorMountParams;
  poseRef: MutableRefObject<LiveMonitorPose>;
}

const VESA_SCREW_OFFSETS: [number, number][] = [
  [-0.038, -0.038],
  [0.038, -0.038],
  [-0.038, 0.038],
  [0.038, 0.038],
];

// Komponen Monitor Arm 3D sesuai foto referensi:
// Tiang pendek 12 cm, sendi bahu/siku/pergelangan, 2 ruas miring 3D (Two-Bone IK), dan pelat VESA 10x10 cm
export function MonitorArm({ params, poseRef }: MonitorArmProps) {
  const clampGroupRef = useRef<THREE.Group>(null);
  const postGroupRef = useRef<THREE.Group>(null);
  const shoulderJointRef = useRef<THREE.Group>(null);
  const arm1GroupRef = useRef<THREE.Group>(null);
  const elbowJointRef = useRef<THREE.Group>(null);
  const arm2GroupRef = useRef<THREE.Group>(null);
  const wristJointRef = useRef<THREE.Group>(null);
  const vesaGroupRef = useRef<THREE.Group>(null);

  const backEdgeZ = -DESK_CONFIG.depth / 2;
  const poleZ = backEdgeZ + params.poleInsetZ;

  // Varian Heavy-Duty memakai ruas 20% lebih tebal dengan panjang tetap (L1 = 0.26 m, L2 = 0.20 m)
  const isHeavyDuty = params.maxWeightKg > 7;
  const thicknessScale = isHeavyDuty ? 1.2 : 1.0;

  // Ukuran penampang ruas utama (4.5 cm lebar x 3 cm tebal) dan ruas depan (3.5 cm x 2.5 cm)
  const arm1Width = 0.045 * thicknessScale;
  const arm1Thick = 0.03 * thicknessScale;
  const arm2Width = 0.035 * thicknessScale;
  const arm2Thick = 0.025 * thicknessScale;

  // Titik 3D reusable untuk perhitungan IK per frame tanpa alokasi memori berlebih
  const shoulderVec = useMemo(() => new THREE.Vector3(), []);
  const targetWristVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const pose = poseRef.current;
    const poleX = pose.baseX;

    // 1. Posisi klem & tiang pendek (12 cm di atas pelat)
    if (clampGroupRef.current) {
      clampGroupRef.current.position.set(poleX, 0, backEdgeZ);
    }
    if (postGroupRef.current) {
      postGroupRef.current.position.set(poleX, 0, poleZ);
    }

    // 2. Titik bahu S di puncak tiang pendek & target pergelangan T di punggung tengah monitor
    const vesaY = pose.mountHeight + pose.frameHeight / 2;
    shoulderVec.set(poleX, ARM_SHOULDER_OFFSET_Y, poleZ);

    const wristTargetX = pose.x - Math.sin(pose.rotY) * ARM_WRIST_BACK_OFFSET;
    const wristTargetZ = pose.z - Math.cos(pose.rotY) * ARM_WRIST_BACK_OFFSET;
    targetWristVec.set(wristTargetX, vesaY, wristTargetZ);

    // 3. Selesaikan Two-Bone IK 3D (jarak S-E selalu L1 = 0.26 m, E-T selalu L2 = 0.20 m)
    const ik = solveArmIk3D(shoulderVec, targetWristVec, ARM_L1, ARM_L2);

    // 4. Tempatkan sendi bahu, siku, dan pergelangan
    if (shoulderJointRef.current) {
      const angleS = -Math.atan2(
        ik.elbow.z - ik.shoulder.z,
        ik.elbow.x - ik.shoulder.x
      );
      shoulderJointRef.current.position.copy(ik.shoulder);
      shoulderJointRef.current.rotation.set(0, angleS, 0);
    }

    if (elbowJointRef.current) {
      const angleE = -Math.atan2(
        ik.wrist.z - ik.elbow.z,
        ik.wrist.x - ik.elbow.x
      );
      elbowJointRef.current.position.copy(ik.elbow);
      elbowJointRef.current.rotation.set(0, angleE, 0);
    }

    if (wristJointRef.current) {
      wristJointRef.current.position.copy(ik.wrist);
      wristJointRef.current.rotation.set(0, pose.rotY, 0);
    }

    // 5. Tempatkan & orientasikan kedua ruas lengan dengan helper segmentBetween
    if (arm1GroupRef.current) {
      segmentBetween(arm1GroupRef.current, ik.shoulder, ik.elbow, ARM_L1);
    }
    if (arm2GroupRef.current) {
      segmentBetween(arm2GroupRef.current, ik.elbow, ik.wrist, ARM_L2);
    }

    // 6. Tempatkan kepala pivot & pelat VESA tepat di tengah punggung monitor
    if (vesaGroupRef.current) {
      vesaGroupRef.current.position.set(pose.x, vesaY, pose.z);
      vesaGroupRef.current.rotation.set(0, pose.rotY, 0);
    }
  });

  const postRadius = 0.02; // Diameter tiang 4 cm

  return (
    <group position={[0, DESK_CONFIG.height, 0]}>
      {/* Klem varian arm (pelat membulat 9x11x0.6 cm + penjepit belakang + knob ulir bawah) */}
      <Clamp ref={clampGroupRef} variant="arm" />

      {/* Tiang pendek (diameter 4 cm, tinggi 12 cm di atas pelat) + cincin tutup atas */}
      <group ref={postGroupRef} position={[0, 0, poleZ]}>
        <mesh
          position={[0, ARM_TOP_PLATE_THICKNESS + ARM_POST_HEIGHT / 2, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[postRadius, postRadius, ARM_POST_HEIGHT, 28]}
          />
          <meshStandardMaterial
            color="#242429"
            roughness={0.65}
            metalness={0.28}
          />
        </mesh>

        {/* Tutup atas tiang berupa cincin kecil */}
        <mesh
          position={[0, ARM_TOP_PLATE_THICKNESS + ARM_POST_HEIGHT + 0.003, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[postRadius + 0.0025, postRadius + 0.0025, 0.006, 28]}
          />
          <meshStandardMaterial
            color="#3f3f46"
            roughness={0.5}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* Sendi Bahu (S): silinder pendek tegak diameter ~5 cm dengan tutup bulat */}
      <group ref={shoulderJointRef}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.036, 24]} />
          <meshStandardMaterial
            color="#3a3a42"
            metalness={0.6}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.019, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.022, 0.025, 0.004, 24]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.55}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, -0.019, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.022, 0.004, 24]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.55}
            roughness={0.5}
          />
        </mesh>
      </group>

      {/* Ruas Utama (S -> E, panjang 0.26 m): pipih membulat, sedikit menyempit ke arah siku + alur atas */}
      <group ref={arm1GroupRef}>
        {/* Bagian pangkal-tengah ruas 1 */}
        <RoundedBox
          args={[ARM_L1 * 0.62, arm1Thick, arm1Width]}
          radius={0.006}
          smoothness={4}
          position={[-ARM_L1 * 0.16, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#27272a"
            roughness={0.7}
            metalness={0.2}
          />
        </RoundedBox>

        {/* Bagian ujung ruas 1 yang sedikit menyempit ke arah siku */}
        <RoundedBox
          args={[ARM_L1 * 0.62, arm1Thick * 0.9, arm1Width * 0.86]}
          radius={0.005}
          smoothness={4}
          position={[ARM_L1 * 0.16, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#27272a"
            roughness={0.7}
            metalness={0.2}
          />
        </RoundedBox>

        {/* Alur/garis tipis mekanis pada sisi atas ruas utama (strip beda tone) */}
        <mesh
          position={[0, arm1Thick / 2 + 0.0008, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[ARM_L1 * 0.76, 0.002, arm1Width * 0.34]} />
          <meshStandardMaterial
            color="#141417"
            roughness={0.45}
            metalness={0.45}
          />
        </mesh>

        {/* Detail celah mekanis di sisi samping ruas utama */}
        <mesh position={[-0.02, -arm1Thick * 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[ARM_L1 * 0.32, 0.004, arm1Width + 0.0015]} />
          <meshStandardMaterial
            color="#141417"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
      </group>

      {/* Sendi Siku (E): silinder pendek tegak diameter 4 cm dengan tutup bulat & aksen poros */}
      <group ref={elbowJointRef}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.042, 24]} />
          <meshStandardMaterial
            color="#3a3a42"
            metalness={0.6}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.022, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.017, 0.02, 0.004, 24]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.55}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, -0.022, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.02, 0.017, 0.004, 24]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.55}
            roughness={0.5}
          />
        </mesh>
        {/* Pin baut logam terang di sisi siku */}
        <mesh
          position={[0, 0.01, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.0045, 0.0045, 0.042, 16]} />
          <meshStandardMaterial
            color="#a1a1aa"
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* Ruas Depan (E -> T, panjang 0.20 m): lebih ramping (3.5 x 2.5 cm) + alur atas */}
      <group ref={arm2GroupRef}>
        <RoundedBox
          args={[ARM_L2 * 0.92, arm2Thick, arm2Width]}
          radius={0.005}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#27272a"
            roughness={0.7}
            metalness={0.2}
          />
        </RoundedBox>

        {/* Strip alur mekanis pada sisi atas ruas depan */}
        <mesh
          position={[0, arm2Thick / 2 + 0.0008, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[ARM_L2 * 0.74, 0.0018, arm2Width * 0.34]} />
          <meshStandardMaterial
            color="#141417"
            roughness={0.45}
            metalness={0.45}
          />
        </mesh>

        {/* Pin mekanis kecil pada sisi samping ruas depan */}
        <mesh
          position={[ARM_L2 * 0.26, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[0.0035, 0.0035, arm2Width + 0.002, 14]}
          />
          <meshStandardMaterial
            color="#a1a1aa"
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* Sendi Pergelangan (T): silinder pendek tegak diameter 3.5 cm dengan tutup bulat */}
      <group ref={wristJointRef}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.0175, 0.0175, 0.032, 22]} />
          <meshStandardMaterial
            color="#3a3a42"
            metalness={0.6}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.017, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.015, 0.0175, 0.003, 22]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.55}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, -0.017, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.0175, 0.015, 0.003, 22]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.55}
            roughness={0.5}
          />
        </mesh>
      </group>

      {/* Kepala VESA: pivot silinder kecil (diameter 2.5 cm) + pelat persegi 10x10x0.4 cm + 4 sekrup sudut */}
      <group ref={vesaGroupRef}>
        {/* Pelat VESA persegi 10 x 10 cm, tebal 0,4 cm menempel di tengah punggung monitor */}
        <RoundedBox
          args={[0.1, 0.1, 0.004]}
          radius={0.0015}
          smoothness={3}
          position={[0, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#1f1f23"
            roughness={0.65}
            metalness={0.35}
          />
        </RoundedBox>

        {/* 4 sekrup/lubang kecil di keempat sudut pelat VESA */}
        {VESA_SCREW_OFFSETS.map(([sx, sy], idx) => (
          <mesh
            key={idx}
            position={[sx, sy, -0.0025]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.0035, 0.0035, 0.0025, 14]} />
            <meshStandardMaterial
              color="#a1a1aa"
              metalness={0.85}
              roughness={0.25}
            />
          </mesh>
        ))}

        {/* Cincin dudukan bundar di tengah belakang pelat VESA */}
        <mesh
          position={[0, 0, -0.004]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.025, 0.027, 0.005, 24]} />
          <meshStandardMaterial
            color="#27272a"
            roughness={0.55}
            metalness={0.45}
          />
        </mesh>

        {/* Pivot silinder kecil (diameter 2,5 cm) penghubung pelat VESA ke pergelangan T */}
        <mesh
          position={[0, 0, -ARM_WRIST_BACK_OFFSET / 2 - 0.002]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[0.0125, 0.0125, ARM_WRIST_BACK_OFFSET - 0.004, 20]}
          />
          <meshStandardMaterial
            color="#3a3a42"
            metalness={0.6}
            roughness={0.5}
          />
        </mesh>

        {/* Poros tilt horizontal pada kepala pivot */}
        <mesh
          position={[0, 0, -0.014]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.01, 0.01, 0.032, 18]} />
          <meshStandardMaterial
            color="#27272a"
            metalness={0.65}
            roughness={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}
