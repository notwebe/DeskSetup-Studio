import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { nightFactor } from '../../lib/nightFactor';
import { useSetupStore } from '../../store/useSetupStore';
import {
  NIGHT_DAMP_LAMBDA,
  NIGHT_SNAP_EPSILON,
  ROOM_LIGHTING_CONFIG,
} from '../../utils/nightConfig';

interface NightControllerProps {
  directionalLightRef: RefObject<THREE.DirectionalLight | null>;
  dayAmbientRef: RefObject<THREE.AmbientLight | null>;
  nightAmbientRef: RefObject<THREE.AmbientLight | null>;
  wallPointLightRef: RefObject<THREE.PointLight | null>;
  contactShadowsGroupRef: RefObject<THREE.Group | null>;
}

// Pengendali terpusat untuk menggerakkan nightFactor.current (MathUtils.damp, lambda 5)
// serta menginterpolasi seluruh pencahayaan ruangan, fog, background, dan ContactShadows
export function NightController({
  directionalLightRef,
  dayAmbientRef,
  nightAmbientRef,
  wallPointLightRef,
  contactShadowsGroupRef,
}: NightControllerProps) {
  const { scene } = useThree();
  const nightMode = useSetupStore((state) => state.nightMode);

  const dayBgColor = useMemo(
    () => new THREE.Color(ROOM_LIGHTING_CONFIG.day.backgroundColor),
    []
  );
  const nightBgColor = useMemo(
    () => new THREE.Color(ROOM_LIGHTING_CONFIG.night.backgroundColor),
    []
  );
  const workingColor = useMemo(() => new THREE.Color(), []);

  const lastAppliedRef = useRef<number>(-1);

  useFrame((_, delta) => {
    const target = nightMode ? 1 : 0;
    let nf = THREE.MathUtils.damp(
      nightFactor.current,
      target,
      NIGHT_DAMP_LAMBDA,
      delta
    );
    if (Math.abs(target - nf) < NIGHT_SNAP_EPSILON) {
      nf = target;
    }
    nightFactor.current = nf;

    // Hanya perbarui material/cahaya ruangan jika nightFactor berubah
    if (Math.abs(nf - lastAppliedRef.current) < 1e-5) {
      return;
    }
    lastAppliedRef.current = nf;

    const { day, night } = ROOM_LIGHTING_CONFIG;

    // 1. Environment intensity (DAY -> 0,05)
    (
      scene as THREE.Scene & { environmentIntensity?: number }
    ).environmentIntensity = THREE.MathUtils.lerp(
      day.environmentIntensity,
      night.environmentIntensity,
      nf
    );

    // 2. Background & Fog color (lerp dari warna siang ke #05060a)
    workingColor.lerpColors(dayBgColor, nightBgColor, nf);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(workingColor);
    } else {
      scene.background = workingColor.clone();
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(workingColor);
    }

    // 3. Directional light intensity (DAY -> 0) & matikan castShadow saat >= 0,999 (hemat GPU)
    const dirLight = directionalLightRef.current;
    if (dirLight) {
      dirLight.intensity = THREE.MathUtils.lerp(
        day.directionalIntensity,
        night.directionalIntensity,
        nf
      );
      const shouldCastShadow = nf < 0.999;
      if (dirLight.castShadow !== shouldCastShadow) {
        dirLight.castShadow = shouldCastShadow;
      }
    }

    // 4. Ambient light siang & ambient light malam biru gelap (#20284a: 0 -> 0,07)
    if (dayAmbientRef.current) {
      dayAmbientRef.current.intensity = THREE.MathUtils.lerp(
        day.ambientIntensity,
        night.dayAmbientIntensity,
        nf
      );
    }
    if (nightAmbientRef.current) {
      nightAmbientRef.current.intensity = THREE.MathUtils.lerp(
        0,
        night.nightAmbientIntensity,
        nf
      );
    }

    // 5. Gradasi cahaya dinding belakang
    if (wallPointLightRef.current) {
      wallPointLightRef.current.intensity = THREE.MathUtils.lerp(
        day.wallPointLightIntensity,
        night.wallPointLightIntensity,
        nf
      );
    }

    // 6. ContactShadows opacity (DAY -> 0,3 x DAY)
    const contactGroup = contactShadowsGroupRef.current;
    if (contactGroup && contactGroup.children.length > 0) {
      const shadowMesh = contactGroup.children[0] as THREE.Mesh;
      const mat = shadowMesh.material as THREE.MeshBasicMaterial | undefined;
      if (mat && typeof mat.opacity === 'number') {
        mat.opacity = THREE.MathUtils.lerp(
          day.contactShadowsOpacity,
          day.contactShadowsOpacity * night.contactShadowsOpacityFactor,
          nf
        );
      }
    }
  });

  return null;
}
