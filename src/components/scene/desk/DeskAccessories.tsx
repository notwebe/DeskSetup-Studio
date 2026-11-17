import { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../../constants/deskConfig';

interface DeskAccessoriesProps {
  isSelected?: boolean;
}

// Komponen aksesori meja: Cup Holder kiri, Kait Headphone J-hook kiri, dan Panel Kontrol depan
export function DeskAccessories({ isSelected = false }: DeskAccessoriesProps) {
  const {
    width,
    depth,
    height,
    topThickness,
    accessoryColor,
    accessoryRoughness,
    accessoryMetalness,
    cupHolderFrontMargin,
    cupHolderDiameter,
    cupHolderOutwardOffset,
    cupHolderDropY,
    hookBehindCupOffset,
    hookTubeRadius,
    hookDropLength,
    hookOutwardReach,
    controlPanelX,
    controlPanelFrontMargin,
    controlPanelWidth,
    controlPanelDepth,
    controlPanelHeight,
    controlScreenWidth,
    controlScreenHeight,
    controlScreenEmissiveIntensity,
  } = DESK_CONFIG;

  const leftEdgeX = -width / 2;
  const underTopY = height - topThickness;

  // 1. Posisi Cup Holder di tepi kiri, 0,12 m dari tepi depan
  const cupZ = depth / 2 - cupHolderFrontMargin;
  const cupRingX = leftEdgeX - cupHolderOutwardOffset;
  const cupRingY = height - cupHolderDropY;
  const cupRadius = cupHolderDiameter / 2;

  // 2. Posisi Kait Headphone 0,20 m di belakang cup holder pada tepi kiri
  const hookZ = cupZ - hookBehindCupOffset;

  // 3. Posisi Panel Kontrol di bawah tepi depan (X = +0,38, jarak 0,03 dari tepi depan)
  const panelZ = depth / 2 - controlPanelFrontMargin - controlPanelDepth / 2;
  const panelY = underTopY - controlPanelHeight / 2;

  // Material bersama dibuat satu kali dengan useMemo
  const accessoryMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: accessoryColor,
        roughness: accessoryRoughness,
        metalness: accessoryMetalness,
      }),
    [accessoryColor, accessoryRoughness, accessoryMetalness]
  );

  const screenMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#222222',
        emissive: '#ffffff',
        emissiveIntensity: controlScreenEmissiveIntensity,
        roughness: 0.3,
      }),
    [controlScreenEmissiveIntensity]
  );

  const buttonDotMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#52525b',
        roughness: 0.4,
        metalness: 0.5,
      }),
    []
  );

  // Geometri Cup Holder
  const cupTorusGeo = useMemo(() => {
    const geo = new THREE.TorusGeometry(cupRadius, 0.0055, 16, 32);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [cupRadius]);

  const cupBaseRingGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      cupRadius * 0.78,
      cupRadius * 0.78,
      0.004,
      24
    );
    return geo;
  }, [cupRadius]);

  const cupClampTopGeo = useMemo(
    () => new THREE.BoxGeometry(0.032, 0.005, 0.036),
    []
  );
  const cupClampSpineGeo = useMemo(
    () => new THREE.BoxGeometry(0.006, topThickness + 0.01, 0.036),
    [topThickness]
  );
  const cupArmGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        cupHolderOutwardOffset - cupRadius + 0.012,
        0.008,
        0.022
      ),
    [cupHolderOutwardOffset, cupRadius]
  );

  // Geometri Kait Headphone bentuk J dari TubeGeometry (radius 0,006 m)
  const hookTubeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(leftEdgeX + 0.018, underTopY - 0.003, hookZ),
      new THREE.Vector3(leftEdgeX - 0.005, underTopY - 0.008, hookZ),
      new THREE.Vector3(
        leftEdgeX - 0.008,
        underTopY - hookDropLength * 0.65,
        hookZ
      ),
      new THREE.Vector3(
        leftEdgeX - hookOutwardReach * 0.35,
        underTopY - hookDropLength,
        hookZ
      ),
      new THREE.Vector3(
        leftEdgeX - hookOutwardReach,
        underTopY - hookDropLength + 0.012,
        hookZ
      ),
      new THREE.Vector3(
        leftEdgeX - hookOutwardReach - 0.004,
        underTopY - hookDropLength + 0.032,
        hookZ
      ),
    ]);
    return new THREE.TubeGeometry(curve, 28, hookTubeRadius, 12, false);
  }, [leftEdgeX, underTopY, hookZ, hookDropLength, hookOutwardReach, hookTubeRadius]);

  const hookMountPlateGeo = useMemo(
    () => new THREE.BoxGeometry(0.036, 0.005, 0.028),
    []
  );

  // Geometri Panel Kontrol
  const panelBoxGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        controlPanelWidth,
        controlPanelHeight,
        controlPanelDepth
      ),
    [controlPanelWidth, controlPanelHeight, controlPanelDepth]
  );

  const screenPlaneGeo = useMemo(
    () => new THREE.PlaneGeometry(controlScreenWidth, controlScreenHeight),
    [controlScreenWidth, controlScreenHeight]
  );

  const buttonDotGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.002, 12);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  return (
    <group>
      {/* 1. Cup Holder pada tepi kiri meja */}
      <group>
        {/* Klem C pemegang tepi kiri */}
        <mesh
          position={[leftEdgeX + 0.012, height + 0.0025, cupZ]}
          geometry={cupClampTopGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        />
        <mesh
          position={[leftEdgeX + 0.012, underTopY - 0.0025, cupZ]}
          geometry={cupClampTopGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        />
        <mesh
          position={[leftEdgeX - 0.003, height - topThickness / 2, cupZ]}
          geometry={cupClampSpineGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        />

        {/* Lengan penghubung ke cincin cup holder */}
        <mesh
          position={[
            leftEdgeX - (cupHolderOutwardOffset - cupRadius) / 2 - 0.003,
            cupRingY,
            cupZ,
          ]}
          geometry={cupArmGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        />

        {/* Cincin horizontal torus (diameter 0.08 m) */}
        <mesh
          position={[cupRingX, cupRingY, cupZ]}
          geometry={cupTorusGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        >
          {isSelected && (
            <Outlines thickness={2.5} color="#f59e0b" toneMapped={false} />
          )}
        </mesh>

        {/* Penahan dasar bawah cup holder */}
        <mesh
          position={[cupRingX, cupRingY - 0.048, cupZ]}
          geometry={cupBaseRingGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        />
      </group>

      {/* 2. Kait Headphone bentuk J di bawah tepi kiri */}
      <group>
        <mesh
          position={[leftEdgeX + 0.018, underTopY - 0.0025, hookZ]}
          geometry={hookMountPlateGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={hookTubeGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        >
          {isSelected && (
            <Outlines thickness={2.5} color="#f59e0b" toneMapped={false} />
          )}
        </mesh>
      </group>

      {/* 3. Panel Kontrol Standing Desk di bawah tepi depan kanan */}
      <group position={[controlPanelX, panelY, panelZ]}>
        <mesh
          geometry={panelBoxGeo}
          material={accessoryMaterial}
          castShadow
          receiveShadow
        >
          {isSelected && (
            <Outlines thickness={2.5} color="#f59e0b" toneMapped={false} />
          )}
        </mesh>

        {/* Layar kecil menyala putih redup di sisi depan panel */}
        <mesh
          position={[
            -controlPanelWidth * 0.16,
            0,
            controlPanelDepth / 2 + 0.0006,
          ]}
          geometry={screenPlaneGeo}
          material={screenMaterial}
        />

        {/* Tiga titik tombol kecil di sebelah kanan layar */}
        {[0.016, 0.028, 0.04].map((btnX, idx) => (
          <mesh
            key={idx}
            position={[btnX, 0, controlPanelDepth / 2 + 0.0008]}
            geometry={buttonDotGeo}
            material={buttonDotMaterial}
            castShadow
          />
        ))}
      </group>
    </group>
  );
}
