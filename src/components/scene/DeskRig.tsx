import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useSetupStore } from '../../store/useSetupStore';
import type { ItemTransform } from '../../types/catalog';
import {
  clampDeskToRoom,
  DESK_ROTATION_STEP_RAD,
  snapDeskToGrid,
} from '../../utils/clampDeskToRoom';
import { Desk } from './Desk';
import { PlacedItems } from './PlacedItems';

interface PointerCaptureCapable {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
}

// Parent group yang membungkus meja (Desk) dan seluruh item ber-attachTo "desk"
// Mendukung klik untuk memilih meja, drag meja via ref (tanpa re-render anak), dan rotasi Q/E 15 derajat
export function DeskRig() {
  const deskGroupRef = useRef<THREE.Group>(null);

  const deskTransform = useSetupStore((state) => state.deskTransform);
  const isDeskSelected = useSetupStore(
    (state) => state.selectedTarget === 'desk'
  );
  const setDeskTransform = useSetupStore((state) => state.setDeskTransform);
  const selectTarget = useSetupStore((state) => state.selectTarget);
  const setIsDragging = useSetupStore((state) => state.setIsDragging);

  // Ref transformasi meja live selama drag agar komponen anak tidak re-render setiap gerakan
  const liveDeskRef = useRef<ItemTransform>({
    x: deskTransform.x,
    z: deskTransform.z,
    rotY: deskTransform.rotY,
  });
  const isDraggingDeskRef = useRef(false);
  const isHoveredDeskRef = useRef(false);

  // Bidang horizontal raycast dengan tinggi dinamis sesuai titik klik awal (bebas paralaks)
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);
  const dragOffsetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  const updateCursor = useCallback(() => {
    if (isDraggingDeskRef.current) {
      document.body.style.cursor = 'grabbing';
    } else if (isDeskSelected && isHoveredDeskRef.current) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'auto';
    }
  }, [isDeskSelected]);

  useEffect(() => {
    updateCursor();
  }, [isDeskSelected, updateCursor]);

  useEffect(() => {
    return () => {
      if (isDraggingDeskRef.current) {
        isDraggingDeskRef.current = false;
        setIsDragging(false);
      }
      document.body.style.cursor = 'auto';
    };
  }, [setIsDragging]);

  // Setel posisi awal grup sebelum frame pertama
  useLayoutEffect(() => {
    const group = deskGroupRef.current;
    if (!group) return;
    const initial = useSetupStore.getState().deskTransform;
    group.position.set(initial.x, 0, initial.z);
    group.rotation.set(0, initial.rotY, 0);
    liveDeskRef.current = { ...initial };
  }, []);

  // Rotasi meja 15 derajat per tekan Q/E saat meja terpilih (bebas 360 derajat + clamp ulang)
  useEffect(() => {
    if (!isDeskSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key !== 'q' && key !== 'e') return;

      const delta = key === 'q' ? DESK_ROTATION_STEP_RAD : -DESK_ROTATION_STEP_RAD;
      const current = useSetupStore.getState().deskTransform;
      const nextRotY = current.rotY + delta;
      const clamped = clampDeskToRoom(
        { x: current.x, z: current.z },
        nextRotY
      );

      setDeskTransform({
        x: clamped.x,
        z: clamped.z,
        rotY: nextRotY,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeskSelected, setDeskTransform]);

  // Klik pada meja memilih meja (jika bukan akhir dari drag kamera)
  const handleDeskClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta <= 4) {
        selectTarget('desk');
      }
    },
    [selectTarget]
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      isHoveredDeskRef.current = true;
      updateCursor();
    },
    [updateCursor]
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      isHoveredDeskRef.current = false;
      updateCursor();
    },
    [updateCursor]
  );

  // Meja hanya bisa diseret kalau sedang terpilih; jika belum terpilih, biarkan kamera berputar
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDeskSelected) return;
      e.stopPropagation();

      (e.target as unknown as PointerCaptureCapable)?.setPointerCapture?.(
        e.pointerId
      );

      // Tinggi bidang raycast = tinggi titik klik awal agar bebas efek paralaks
      const clickY = e.point.y;
      dragPlane.set(new THREE.Vector3(0, 1, 0), -clickY);

      if (e.ray.intersectPlane(dragPlane, intersectPoint)) {
        dragOffsetRef.current = {
          x: liveDeskRef.current.x - intersectPoint.x,
          z: liveDeskRef.current.z - intersectPoint.z,
        };
      } else {
        dragOffsetRef.current = { x: 0, z: 0 };
      }

      isDraggingDeskRef.current = true;
      setIsDragging(true);
      updateCursor();
    },
    [dragPlane, intersectPoint, isDeskSelected, setIsDragging, updateCursor]
  );

  // Selama drag, perbarui posisi group langsung lewat ref tanpa re-render React
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDraggingDeskRef.current) return;
      e.stopPropagation();

      if (e.ray.intersectPlane(dragPlane, intersectPoint)) {
        let nextX = intersectPoint.x + dragOffsetRef.current.x;
        let nextZ = intersectPoint.z + dragOffsetRef.current.z;

        // Tahan Shift saat drag meja untuk snap ke grid 10 cm
        if (e.shiftKey) {
          nextX = snapDeskToGrid(nextX);
          nextZ = snapDeskToGrid(nextZ);
        }

        const clamped = clampDeskToRoom(
          { x: nextX, z: nextZ },
          liveDeskRef.current.rotY
        );

        liveDeskRef.current.x = clamped.x;
        liveDeskRef.current.z = clamped.z;

        if (deskGroupRef.current) {
          deskGroupRef.current.position.set(clamped.x, 0, clamped.z);
          deskGroupRef.current.updateMatrixWorld();
        }
      }
    },
    [dragPlane, intersectPoint]
  );

  const endDeskDrag = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDraggingDeskRef.current) return;
      e.stopPropagation();

      (e.target as unknown as PointerCaptureCapable)?.releasePointerCapture?.(
        e.pointerId
      );

      isDraggingDeskRef.current = false;
      setIsDragging(false);

      // Simpan posisi akhir meja ke store saat pointer dilepas
      setDeskTransform({ ...liveDeskRef.current });
      updateCursor();
    },
    [setDeskTransform, setIsDragging, updateCursor]
  );

  // Interpolasi halus (damp) saat rotasi Q/E atau saat tombol "Reset meja" ditekan
  useFrame((_, delta) => {
    const group = deskGroupRef.current;
    if (!group || isDraggingDeskRef.current) return;

    group.position.x = THREE.MathUtils.damp(
      group.position.x,
      deskTransform.x,
      12,
      delta
    );
    group.position.y = 0;
    group.position.z = THREE.MathUtils.damp(
      group.position.z,
      deskTransform.z,
      12,
      delta
    );
    group.rotation.y = THREE.MathUtils.damp(
      group.rotation.y,
      deskTransform.rotY,
      12,
      delta
    );

    liveDeskRef.current.x = group.position.x;
    liveDeskRef.current.z = group.position.z;
    liveDeskRef.current.rotY = group.rotation.y;
  });

  return (
    <group ref={deskGroupRef}>
      <Desk
        isSelected={isDeskSelected}
        onClick={handleDeskClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDeskDrag}
        onPointerCancel={endDeskDrag}
      />
      <PlacedItems attachTo="desk" deskGroupRef={deskGroupRef} />
    </group>
  );
}
