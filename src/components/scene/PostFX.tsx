import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { BloomEffect } from 'postprocessing';
import { nightFactor } from '../../lib/nightFactor';
import {
  BLOOM_ENABLED,
  BLOOM_INTENSITY,
  BLOOM_LUMINANCE_SMOOTHING,
  BLOOM_LUMINANCE_THRESHOLD,
  BLOOM_MULTISAMPLING,
} from '../../utils/nightConfig';

// Komponen Post-Processing yang selalu ter-mount (multisampling 4, Bloom selektif, dan ToneMapping ACES)
export function PostFX() {
  const bloomRef = useRef<BloomEffect | null>(null);
  const lastFactorRef = useRef<number>(-1);

  useFrame(() => {
    if (!BLOOM_ENABLED || !bloomRef.current) return;
    const nf = nightFactor.current;
    if (Math.abs(nf - lastFactorRef.current) < 1e-4) return;
    lastFactorRef.current = nf;

    bloomRef.current.intensity = nf * BLOOM_INTENSITY;
  });

  if (!BLOOM_ENABLED) {
    return null;
  }

  return (
    <EffectComposer multisampling={BLOOM_MULTISAMPLING}>
      <Bloom
        ref={(effect) => {
          bloomRef.current = effect as unknown as BloomEffect | null;
        }}
        mipmapBlur
        luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD}
        luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
        intensity={0}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
