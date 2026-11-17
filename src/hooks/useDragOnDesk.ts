import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { DESK_CONFIG } from '../constants/deskConfig';
import { getActiveMountParams } from '../data/catalog';
import { useSetupStore } from '../store/useSetupStore';
import type {
  CategoryId,
  ItemDimensions,
  ItemTransform,
} from '../types/catalog';
import {
  clampMonitorWithMount,
  clampToDesk,
  GRID_SNAP_STEP,
  MOUSE_GRID_SNAP_STEP,
  snapToGrid,
} from '../utils/clampToDesk';

interface UseDragOnDeskOptions {
  category: CategoryId;
  dimensions: ItemDimensions;
  defaultTransform: ItemTransform;
  deskGroupRef?: RefObject<THREE.Group | null>;
  enabled?: boolean;
}

interface PointerCaptureCapable {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
}

// Hook generik untuk menggeser item di atas permukaan meja (bekerja penuh di koordinat lokal meja)
export function useDragOnDesk({
  category,
  dimensions,
  defaultTransform,
  deskGroupRef,
  enabled = true,
}: UseDragOnDeskOptions) {
  const setTransform = useSetupStore((state) => state.setTransform);
  const selectTarget = useSetupStore((state) => state.selectTarget);
  const setIsDragging = useSetupStore((state) => state.setIsDragging);

  // Bidang horizontal dunia setinggi permukaan atas meja (y = DESK_CONFIG.height)
  const deskWorldPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -DESK_CONFIG.height),
    []
  );
  const worldIntersectPoint = useMemo(() => new THREE.Vector3(), []);
  const localIntersectPoint = useMemo(() => new THREE.Vector3(), []);

  const dragOffsetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const isDraggingRef = useRef(false);
  const isHoveredRef = useRef(false);

  // Konversi titik potong raycast dari koordinat dunia ke koordinat lokal meja
  const getDeskLocalIntersection = useCallback(
    (ray: THREE.Ray): THREE.Vector3 | null => {
      if (!ray.intersectPlane(deskWorldPlane, worldIntersectPoint)) {
        return null;
      }

      localIntersectPoint.copy(worldIntersectPoint);

      if (deskGroupRef?.current) {
        deskGroupRef.current.updateWorldMatrix(true, false);
        deskGroupRef.current.worldToLocal(localIntersectPoint);
        return localIntersectPoint;
      }

      // Fallback transformasi balik dari deskTransform di store bila ref belum tersedia
      const { x, z, rotY } = useSetupStore.getState().deskTransform;
      const dx = worldIntersectPoint.x - x;
      const dz = worldIntersectPoint.z - z;
      const cos = Math.cos(-rotY);
      const sin = Math.sin(-rotY);
      localIntersectPoint.set(
        dx * cos + dz * sin,
        worldIntersectPoint.y,
        -dx * sin + dz * cos
      );
      return localIntersectPoint;
    },
    [deskGroupRef, deskWorldPlane, localIntersectPoint, worldIntersectPoint]
  );

  const updateCursor = useCallback(() => {
    if (!enabled) {
      document.body.style.cursor = 'auto';
      return;
    }
    if (isDraggingRef.current) {
      document.body.style.cursor = 'grabbing';
    } else if (isHoveredRef.current) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'auto';
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
      document.body.style.cursor = 'auto';
    };
  }, [setIsDragging]);

  const onPointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      e.stopPropagation();
      isHoveredRef.current = true;
      updateCursor();
    },
    [enabled, updateCursor]
  );

  const onPointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      e.stopPropagation();
      isHoveredRef.current = false;
      updateCursor();
    },
    [enabled, updateCursor]
  );

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      e.stopPropagation();
      selectTarget(category);

      (e.target as unknown as PointerCaptureCapable)?.setPointerCapture?.(
        e.pointerId
      );

      const storeState = useSetupStore.getState();
      const currentTransform = storeState.transforms[category];
      const currentX = currentTransform?.x ?? defaultTransform.x;
      const currentZ = currentTransform?.z ?? defaultTransform.z;

      // Hitung offset awal di ruang lokal meja agar item tidak melompat saat mulai ditarik
      const localPt = getDeskLocalIntersection(e.ray);
      if (localPt) {
        dragOffsetRef.current = {
          x: currentX - localPt.x,
          z: currentZ - localPt.z,
        };
      } else {
        dragOffsetRef.current = { x: 0, z: 0 };
      }

      isDraggingRef.current = true;
      setIsDragging(true);
      updateCursor();
    },
    [
      enabled,
      category,
      defaultTransform,
      getDeskLocalIntersection,
      selectTarget,
      setIsDragging,
      updateCursor,
    ]
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enabled || !isDraggingRef.current) return;
      e.stopPropagation();

      const localPt = getDeskLocalIntersection(e.ray);
      if (localPt) {
        let nextX = localPt.x + dragOffsetRef.current.x;
        let nextZ = localPt.z + dragOffsetRef.current.z;

        // Tahan Shift untuk snap ke grid (2 cm untuk mouse, 5 cm untuk monitor & keyboard)
        if (e.shiftKey) {
          const snapStep =
            category === 'mouse' ? MOUSE_GRID_SNAP_STEP : GRID_SNAP_STEP;
          nextX = snapToGrid(nextX, snapStep);
          nextZ = snapToGrid(nextZ, snapStep);
        }

        const storeState = useSetupStore.getState();
        const currentTransform = storeState.transforms[category];
        const rotY = currentTransform?.rotY ?? defaultTransform.rotY;

        if (category === 'monitor') {
          const mountParams = getActiveMountParams(
            storeState.placed.monitorMount
          );
          const clamped = clampMonitorWithMount(
            { x: nextX, z: nextZ },
            dimensions,
            rotY,
            mountParams,
            storeState.baseX,
            storeState.mountHeight
          );
          setTransform(category, {
            x: clamped.x,
            z: clamped.z,
            rotY,
          });
        } else {
          const clamped = clampToDesk({ x: nextX, z: nextZ }, dimensions, rotY);
          setTransform(category, {
            x: clamped.x,
            z: clamped.z,
            rotY,
          });
        }
      }
    },
    [
      enabled,
      category,
      defaultTransform,
      dimensions,
      getDeskLocalIntersection,
      setTransform,
    ]
  );

  const endDrag = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDraggingRef.current) return;
      e.stopPropagation();

      (e.target as unknown as PointerCaptureCapable)?.releasePointerCapture?.(
        e.pointerId
      );

      isDraggingRef.current = false;
      setIsDragging(false);
      updateCursor();
    },
    [setIsDragging, updateCursor]
  );

  return {
    bind: {
      onPointerOver,
      onPointerOut,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
