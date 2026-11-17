import { forwardRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';
import { ARM_TOP_PLATE_THICKNESS } from '../../../utils/armIk';

interface ClampProps {
  position?: [number, number, number];
  variant?: 'default' | 'arm';
}

// Komponen klem penjepit tepi belakang desk
// Mendukung varian "arm" (sesuai foto referensi: pelat membulat 9x11x0.6 cm + knob ulir bawah)
// dan varian "default" untuk DeskBracket
export const Clamp = forwardRef<THREE.Group, ClampProps>(function Clamp(
  { position = [0, 0, -DESK_CONFIG.depth / 2], variant = 'default' },
  ref
) {
  const { topThickness } = DESK_CONFIG;

  if (variant === 'arm') {
    const topPlateWidth = 0.09;  // 9 cm
    const topPlateDepth = 0.11;  // 11 cm
    const topPlateThick = ARM_TOP_PLATE_THICKNESS; // 0,6 cm
    const spineThick = 0.01;
    const spineWidth = 0.068;
    const spineHeight = topThickness + 0.056;
    const lowerJawY = -topThickness - 0.004;
    const lowerBracketY = -topThickness - 0.04;

    return (
      <group ref={ref} position={position}>
        {/* Pelat atas membulat 9 x 11 x 0,6 cm di permukaan desk */}
        <RoundedBox
          args={[topPlateWidth, topPlateThick, topPlateDepth]}
          radius={0.0025}
          smoothness={4}
          position={[0, topPlateThick / 2, topPlateDepth / 2 - spineThick]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#222226"
            metalness={0.35}
            roughness={0.62}
          />
        </RoundedBox>

        {/* Dudukan dasar tiang yang sedikit meruncing di atas pelat */}
        <mesh
          position={[0, topPlateThick + 0.004, 0.03]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.022, 0.03, 0.008, 24]} />
          <meshStandardMaterial
            color="#1f1f23"
            metalness={0.4}
            roughness={0.58}
          />
        </mesh>

        {/* Blok penjepit tegak di sisi luar tepi belakang desk */}
        <mesh
          position={[0, -topThickness / 2 - 0.018, -spineThick / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[spineWidth, spineHeight, spineThick]} />
          <meshStandardMaterial
            color="#1b1b1f"
            metalness={0.5}
            roughness={0.52}
          />
        </mesh>

        {/* Detail dua alur vertikal pada blok penjepit belakang */}
        {[-0.016, 0.016].map((slotX, idx) => (
          <mesh
            key={idx}
            position={[slotX, -topThickness / 2 - 0.022, -spineThick - 0.0006]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.005, spineHeight * 0.62, 0.0015]} />
            <meshStandardMaterial
              color="#09090b"
              metalness={0.3}
              roughness={0.8}
            />
          </mesh>
        ))}

        {/* Pelat penjepit bawah langsung di bawah ketebalan papan desk */}
        <mesh position={[0, lowerJawY, 0.024]} castShadow receiveShadow>
          <boxGeometry args={[0.062, 0.007, 0.056]} />
          <meshStandardMaterial
            color="#1f2937"
            metalness={0.6}
            roughness={0.45}
          />
        </mesh>

        {/* Lengan penahan ulir di bagian bawah klem */}
        <mesh position={[0, lowerBracketY, 0.022]} castShadow receiveShadow>
          <boxGeometry args={[0.058, 0.007, 0.052]} />
          <meshStandardMaterial
            color="#1b1b1f"
            metalness={0.55}
            roughness={0.48}
          />
        </mesh>

        {/* Batang ulir silinder vertikal */}
        <mesh
          position={[0, -topThickness - 0.024, 0.026]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.0055, 0.0055, 0.042, 16]} />
          <meshStandardMaterial
            color="#3f3f46"
            metalness={0.75}
            roughness={0.35}
          />
        </mesh>

        {/* Knob ulir pemutar (silinder + pegangan sayap) di bawah desk */}
        <group position={[0, -topThickness - 0.049, 0.026]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.012, 0.01, 0.01, 20]} />
            <meshStandardMaterial
              color="#18181b"
              metalness={0.3}
              roughness={0.65}
            />
          </mesh>
          <RoundedBox
            args={[0.044, 0.009, 0.015]}
            radius={0.003}
            smoothness={3}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color="#18181b"
              metalness={0.3}
              roughness={0.65}
            />
          </RoundedBox>
        </group>
      </group>
    );
  }

  // Varian default untuk Desk Mount Bracket
  const plateThickness = 0.006;
  const clampWidth = 0.074;
  const topPlateDepth = 0.072;
  const bottomPlateDepth = 0.062;
  const spineThickness = 0.01;
  const spineHeight = topThickness + plateThickness * 2;

  return (
    <group ref={ref} position={position}>
      {/* Pelat atas yang menempel di permukaan atas desk */}
      <mesh
        position={[0, plateThickness / 2, topPlateDepth / 2 - spineThickness]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[clampWidth, plateThickness, topPlateDepth]} />
        <meshStandardMaterial
          color="#1f2937"
          metalness={0.8}
          roughness={0.38}
        />
      </mesh>

      {/* Pelat bawah yang menempel tepat di bawah papan desk */}
      <mesh
        position={[
          0,
          -topThickness - plateThickness / 2,
          bottomPlateDepth / 2 - spineThickness,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[clampWidth, plateThickness, bottomPlateDepth]} />
        <meshStandardMaterial
          color="#1f2937"
          metalness={0.8}
          roughness={0.38}
        />
      </mesh>

      {/* Blok tegak belakang yang menghubungkan pelat atas dan bawah */}
      <mesh
        position={[0, -topThickness / 2, -spineThickness / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[clampWidth, spineHeight, spineThickness]} />
        <meshStandardMaterial
          color="#18181b"
          metalness={0.82}
          roughness={0.35}
        />
      </mesh>

      {/* Baut pengunci di bawah pelat bawah */}
      <mesh
        position={[0, -topThickness - plateThickness - 0.012, 0.022]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.008, 0.01, 0.024, 16]} />
        <meshStandardMaterial
          color="#111827"
          metalness={0.75}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
});
