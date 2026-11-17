import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  OrbitControls,
  SoftShadows,
} from '@react-three/drei';
import { DeskRig } from './DeskRig';
import { NightController } from './NightController';
import { PlacedItems } from './PlacedItems';
import { PostFX } from './PostFX';
import { Room } from './Room';
import { DESK_CONFIG, ROOM_CONFIG } from '../../constants/deskConfig';
import { useSetupStore } from '../../store/useSetupStore';
import { ROOM_LIGHTING_CONFIG } from '../../utils/nightConfig';

// Canvas 3D utama dengan DeskRig, NightController, PostFX Bloom, dan pencahayaan siang/malam
export function SceneCanvas() {
  const isDragging = useSetupStore((state) => state.isDragging);
  const selectTarget = useSetupStore((state) => state.selectTarget);

  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const dayAmbientRef = useRef<THREE.AmbientLight>(null);
  const nightAmbientRef = useRef<THREE.AmbientLight>(null);
  const wallPointLightRef = useRef<THREE.PointLight>(null);
  const contactShadowsGroupRef = useRef<THREE.Group>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      className="touch-none"
      style={{ touchAction: 'none' }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
      camera={{
        position: [0, 1.32, 1.68],
        fov: 40,
        near: 0.05,
        far: 100,
      }}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      onPointerMissed={() => selectTarget(null)}
    >
      <color attach="background" args={[ROOM_CONFIG.backgroundColor]} />

      {/* Fog ringan di kejauhan untuk menjaga kesan kedalaman ruangan luas */}
      <fog attach="fog" args={[ROOM_CONFIG.backgroundColor, 6, 18]} />

      {/* Bayangan lembut pada shadow map */}
      <SoftShadows size={12} samples={10} focus={0.5} />

      {/* Pencahayaan ruangan siang & malam yang dikendalikan oleh NightController */}
      <ambientLight
        ref={dayAmbientRef}
        intensity={ROOM_LIGHTING_CONFIG.day.ambientIntensity}
      />
      <ambientLight
        ref={nightAmbientRef}
        color={ROOM_LIGHTING_CONFIG.night.nightAmbientColor}
        intensity={0}
      />
      <directionalLight
        ref={directionalLightRef}
        position={[2.5, 4, 3]}
        intensity={ROOM_LIGHTING_CONFIG.day.directionalIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight
        ref={wallPointLightRef}
        position={[0, 1.9, -0.25]}
        intensity={ROOM_LIGHTING_CONFIG.day.wallPointLightIntensity}
        distance={4}
        decay={2}
        color="#fff3e0"
      />

      {/* Pengendali dimmer siang/malam (nightFactor.current) */}
      <NightController
        directionalLightRef={directionalLightRef}
        dayAmbientRef={dayAmbientRef}
        nightAmbientRef={nightAmbientRef}
        wallPointLightRef={wallPointLightRef}
        contactShadowsGroupRef={contactShadowsGroupRef}
      />

      {/* Environment lighting interior dengan intensitas terkontrol */}
      <Suspense fallback={null}>
        <Environment
          preset="apartment"
          environmentIntensity={ROOM_LIGHTING_CONFIG.day.environmentIntensity}
        />
      </Suspense>

      {/* Klik area lantai/dinding ruangan membatalkan seleksi */}
      <group
        onClick={(e) => {
          if (e.delta <= 4) {
            e.stopPropagation();
            selectTarget(null);
          }
        }}
      >
        <Room />
      </group>

      {/* Parent group meja beserta seluruh item yang menempel pada meja (attachTo: "desk") */}
      <DeskRig />

      {/* Item yang menempel pada ruangan/lantai (attachTo: "room") */}
      <PlacedItems attachTo="room" />

      {/* Contact shadow dinamis yang mengikuti meja dan seluruh item saat bergerak */}
      <ContactShadows
        ref={contactShadowsGroupRef}
        position={[0, 0.001, 0]}
        opacity={ROOM_LIGHTING_CONFIG.day.contactShadowsOpacity}
        scale={8}
        blur={2.2}
        far={1.4}
        resolution={256}
        frames={Infinity}
        color="#2b2118"
      />

      {/* Post-processing EffectComposer (Bloom selektif + ToneMapping ACES) */}
      <PostFX />

      {/* Kontrol kamera orbit */}
      <OrbitControls
        enabled={!isDragging}
        target={[0, DESK_CONFIG.height, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={0.38}
        maxDistance={3.0}
        maxPolarAngle={Math.PI / 2 - 0.03}
        makeDefault
      />
    </Canvas>
  );
}
