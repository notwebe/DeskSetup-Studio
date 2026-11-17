import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentType,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DESK_CONFIG } from '../../constants/deskConfig';
import {
  getActiveMountParams,
  getCatalogItemById,
  getDefaultKeyboardTransform,
  getDefaultMonitorTransform,
  getDefaultMouseTransform,
} from '../../data/catalog';
import { useDragOnDesk } from '../../hooks/useDragOnDesk';
import { useSetupStore, type CategoryId } from '../../store/useSetupStore';
import type {
  AttachTarget,
  CatalogItem,
  ItemTransform,
} from '../../types/catalog';
import {
  clampMonitorWithMount,
  clampRotationY,
  clampToDesk,
  getMouseSurfaceYAt,
  getSurfaceYAt,
  ROTATION_STEP_RAD,
} from '../../utils/clampToDesk';
import { calculateMonitorScreenSize } from '../../utils/monitorSize';
import type { LiveMonitorPose } from './items/MonitorArm';
import {
  ITEM_COMPONENT_REGISTRY,
  type SceneItemComponentProps,
} from './items/registry';

interface DraggableMonitorGroupProps {
  item: CatalogItem<'monitor'>;
  Component: ComponentType<SceneItemComponentProps>;
  poseRef: MutableRefObject<LiveMonitorPose>;
  deskGroupRef?: RefObject<THREE.Group | null>;
}

// Pembungkus monitor di ruang lokal meja dengan drag, seleksi, rotasi Q/E 5 derajat, dan sinkronisasi pose
function DraggableMonitorGroup({
  item,
  Component,
  poseRef,
  deskGroupRef,
}: DraggableMonitorGroupProps) {
  const groupRef = useRef<THREE.Group>(null);

  const placedMountId = useSetupStore((state) => state.placed.monitorMount);
  const transform = useSetupStore((state) => state.transforms.monitor);
  const mountHeight = useSetupStore((state) => state.mountHeight);
  const baseX = useSetupStore((state) => state.baseX);
  const isSelected = useSetupStore(
    (state) => state.selectedTarget === 'monitor'
  );
  const isDragging = useSetupStore((state) => state.isDragging);
  const setTransform = useSetupStore((state) => state.setTransform);

  const mountParams = useMemo(
    () => getActiveMountParams(placedMountId),
    [placedMountId]
  );
  const defaultTransform: ItemTransform = useMemo(
    () => getDefaultMonitorTransform(mountParams),
    [mountParams]
  );

  const frameHeight = useMemo(() => {
    const { screenHeight } = calculateMonitorScreenSize(
      item.params.diagonalInches,
      item.params.aspectRatio
    );
    return screenHeight + item.params.bezelBorder * 2 + 0.006;
  }, [
    item.params.diagonalInches,
    item.params.aspectRatio,
    item.params.bezelBorder,
  ]);

  const { bind } = useDragOnDesk({
    category: 'monitor',
    dimensions: item.dimensions,
    defaultTransform,
    deskGroupRef,
    enabled: true,
  });

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const storeState = useSetupStore.getState();
    const initialMountParams = getActiveMountParams(
      storeState.placed.monitorMount
    );
    const initialDefault = getDefaultMonitorTransform(initialMountParams);
    const initial = storeState.transforms.monitor ?? initialDefault;

    group.position.set(initial.x, DESK_CONFIG.height, initial.z);
    group.rotation.y = initial.rotY;

    poseRef.current.x = initial.x;
    poseRef.current.z = initial.z;
    poseRef.current.rotY = initial.rotY;
    poseRef.current.mountHeight =
      initialMountParams.mountType === 'stand'
        ? item.params.standClearance
        : storeState.mountHeight;
    poseRef.current.baseX = storeState.baseX;
    poseRef.current.frameHeight = frameHeight;
  }, [frameHeight, item.params.standClearance, poseRef]);

  useEffect(() => {
    if (!isSelected) return;

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

      const storeState = useSetupStore.getState();
      const activeParams = getActiveMountParams(storeState.placed.monitorMount);
      const activeDefault = getDefaultMonitorTransform(activeParams);
      const current = storeState.transforms.monitor ?? activeDefault;

      const delta = key === 'q' ? ROTATION_STEP_RAD : -ROTATION_STEP_RAD;
      const nextRotY = clampRotationY(
        current.rotY + delta,
        activeParams.maxRotationDeg
      );
      const clampedPos = clampMonitorWithMount(
        { x: current.x, z: current.z },
        item.dimensions,
        nextRotY,
        activeParams,
        storeState.baseX,
        storeState.mountHeight
      );

      setTransform('monitor', {
        x: clampedPos.x,
        z: clampedPos.z,
        rotY: nextRotY,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, item.dimensions, setTransform]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetX = transform?.x ?? defaultTransform.x;
    const targetZ = transform?.z ?? defaultTransform.z;
    const targetRotY = transform?.rotY ?? defaultTransform.rotY;
    const targetClearance =
      mountParams.mountType === 'stand'
        ? item.params.standClearance
        : mountHeight;

    if (isDragging && isSelected) {
      group.position.set(targetX, DESK_CONFIG.height, targetZ);
      group.rotation.y = targetRotY;
      poseRef.current.baseX = baseX;
    } else {
      group.position.x = THREE.MathUtils.damp(
        group.position.x,
        targetX,
        14,
        delta
      );
      group.position.y = DESK_CONFIG.height;
      group.position.z = THREE.MathUtils.damp(
        group.position.z,
        targetZ,
        14,
        delta
      );
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        targetRotY,
        14,
        delta
      );
      poseRef.current.baseX = THREE.MathUtils.damp(
        poseRef.current.baseX,
        baseX,
        14,
        delta
      );
    }

    poseRef.current.x = group.position.x;
    poseRef.current.z = group.position.z;
    poseRef.current.rotY = group.rotation.y;
    poseRef.current.mountHeight = targetClearance;
    poseRef.current.frameHeight = frameHeight;
  });

  return (
    <group ref={groupRef} onClick={(e) => e.stopPropagation()} {...bind}>
      <Component item={item} isSelected={isSelected} />
    </group>
  );
}

interface DraggableKeyboardGroupProps {
  item: CatalogItem<'keyboard'>;
  Component: ComponentType<SceneItemComponentProps>;
  deskGroupRef?: RefObject<THREE.Group | null>;
}

// Pembungkus keyboard di ruang lokal meja dengan tinggi dinamis getSurfaceYAt (meja + mat), drag, dan Q/E
function DraggableKeyboardGroup({
  item,
  Component,
  deskGroupRef,
}: DraggableKeyboardGroupProps) {
  const groupRef = useRef<THREE.Group>(null);

  const transform = useSetupStore((state) => state.transforms.keyboard);
  const isSelected = useSetupStore(
    (state) => state.selectedTarget === 'keyboard'
  );
  const isDragging = useSetupStore((state) => state.isDragging);
  const setTransform = useSetupStore((state) => state.setTransform);

  const defaultTransform: ItemTransform = useMemo(
    () => getDefaultKeyboardTransform(item.dimensions.depth),
    [item.dimensions.depth]
  );

  const { bind } = useDragOnDesk({
    category: 'keyboard',
    dimensions: item.dimensions,
    defaultTransform,
    deskGroupRef,
    enabled: true,
  });

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const storeState = useSetupStore.getState();
    const initial = storeState.transforms.keyboard ?? defaultTransform;
    const initialY = getSurfaceYAt(initial.x, initial.z);

    group.position.set(initial.x, initialY, initial.z);
    group.rotation.y = initial.rotY;
  }, [defaultTransform]);

  useEffect(() => {
    if (!isSelected) return;

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

      const storeState = useSetupStore.getState();
      const current = storeState.transforms.keyboard ?? defaultTransform;

      const delta = key === 'q' ? ROTATION_STEP_RAD : -ROTATION_STEP_RAD;
      const nextRotY = clampRotationY(current.rotY + delta, 45);
      const clampedPos = clampToDesk(
        { x: current.x, z: current.z },
        item.dimensions,
        nextRotY
      );

      setTransform('keyboard', {
        x: clampedPos.x,
        z: clampedPos.z,
        rotY: nextRotY,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, defaultTransform, item.dimensions, setTransform]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetX = transform?.x ?? defaultTransform.x;
    const targetZ = transform?.z ?? defaultTransform.z;
    const targetRotY = transform?.rotY ?? defaultTransform.rotY;

    if (isDragging && isSelected) {
      const surfaceY = getSurfaceYAt(targetX, targetZ);
      group.position.set(targetX, surfaceY, targetZ);
      group.rotation.y = targetRotY;
    } else {
      group.position.x = THREE.MathUtils.damp(
        group.position.x,
        targetX,
        14,
        delta
      );
      group.position.z = THREE.MathUtils.damp(
        group.position.z,
        targetZ,
        14,
        delta
      );
      group.position.y = getSurfaceYAt(group.position.x, group.position.z);
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        targetRotY,
        14,
        delta
      );
    }
  });

  return (
    <group ref={groupRef} onClick={(e) => e.stopPropagation()} {...bind}>
      <Component item={item} isSelected={isSelected} />
    </group>
  );
}

interface DraggableMouseGroupProps {
  item: CatalogItem<'mouse'>;
  Component: ComponentType<SceneItemComponentProps>;
  deskGroupRef?: RefObject<THREE.Group | null>;
}

// Pembungkus mouse di ruang lokal meja dengan tinggi tertinggi dari 5 titik footprint, drag, dan Q/E (+/- 90 deg)
function DraggableMouseGroup({
  item,
  Component,
  deskGroupRef,
}: DraggableMouseGroupProps) {
  const groupRef = useRef<THREE.Group>(null);

  const transform = useSetupStore((state) => state.transforms.mouse);
  const isSelected = useSetupStore(
    (state) => state.selectedTarget === 'mouse'
  );
  const isDragging = useSetupStore((state) => state.isDragging);
  const setTransform = useSetupStore((state) => state.setTransform);

  const defaultTransform: ItemTransform = useMemo(
    () => getDefaultMouseTransform(item.dimensions),
    [item.dimensions]
  );

  const { bind } = useDragOnDesk({
    category: 'mouse',
    dimensions: item.dimensions,
    defaultTransform,
    deskGroupRef,
    enabled: true,
  });

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const storeState = useSetupStore.getState();
    const initial = storeState.transforms.mouse ?? defaultTransform;
    const initialY = getMouseSurfaceYAt(
      initial.x,
      initial.z,
      item.dimensions,
      initial.rotY
    );

    group.position.set(initial.x, initialY, initial.z);
    group.rotation.y = initial.rotY;
  }, [defaultTransform, item.dimensions]);

  // Rotasi mouse 5 derajat per tekan Q/E (dibatasi +/- 90 derajat) saat mouse terpilih
  useEffect(() => {
    if (!isSelected) return;

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

      const storeState = useSetupStore.getState();
      const current = storeState.transforms.mouse ?? defaultTransform;

      const delta = key === 'q' ? ROTATION_STEP_RAD : -ROTATION_STEP_RAD;
      const nextRotY = clampRotationY(current.rotY + delta, 90);
      const clampedPos = clampToDesk(
        { x: current.x, z: current.z },
        item.dimensions,
        nextRotY
      );

      setTransform('mouse', {
        x: clampedPos.x,
        z: clampedPos.z,
        rotY: nextRotY,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, defaultTransform, item.dimensions, setTransform]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetX = transform?.x ?? defaultTransform.x;
    const targetZ = transform?.z ?? defaultTransform.z;
    const targetRotY = transform?.rotY ?? defaultTransform.rotY;

    if (isDragging && isSelected) {
      const surfaceY = getMouseSurfaceYAt(
        targetX,
        targetZ,
        item.dimensions,
        targetRotY
      );
      group.position.set(targetX, surfaceY, targetZ);
      group.rotation.y = targetRotY;
    } else {
      group.position.x = THREE.MathUtils.damp(
        group.position.x,
        targetX,
        14,
        delta
      );
      group.position.z = THREE.MathUtils.damp(
        group.position.z,
        targetZ,
        14,
        delta
      );
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        targetRotY,
        14,
        delta
      );
      group.position.y = getMouseSurfaceYAt(
        group.position.x,
        group.position.z,
        item.dimensions,
        group.rotation.y
      );
    }
  });

  return (
    <group ref={groupRef} onClick={(e) => e.stopPropagation()} {...bind}>
      <Component item={item} isSelected={isSelected} />
    </group>
  );
}

interface PlacedItemsProps {
  attachTo?: AttachTarget;
  deskGroupRef?: RefObject<THREE.Group | null>;
}

// Merender item yang terpasang sesuai target attachTo ("desk" di dalam DeskRig, "room" di luar DeskRig)
export function PlacedItems({
  attachTo = 'desk',
  deskGroupRef,
}: PlacedItemsProps = {}) {
  const placed = useSetupStore((state) => state.placed);
  const selectTarget = useSetupStore((state) => state.selectTarget);

  const poseRef = useRef<LiveMonitorPose>({
    x: 0,
    z: -0.21,
    rotY: 0,
    mountHeight: 0.16,
    baseX: 0,
    frameHeight: 0.34,
  });

  if (attachTo === 'room') {
    return (
      <group>
        {(Object.entries(placed) as [CategoryId, string | null][]).map(
          ([category, itemId]) => {
            if (
              !itemId ||
              category === 'monitor' ||
              category === 'monitorMount' ||
              category === 'keyboard' ||
              category === 'mouse'
            ) {
              return null;
            }
            const item = getCatalogItemById(itemId);
            const Component = ITEM_COMPONENT_REGISTRY[category];
            if (!item || !Component || item.attachTo !== 'room') return null;

            return (
              <group key={`${category}-${item.id}`}>
                <Component item={item} />
              </group>
            );
          }
        )}
      </group>
    );
  }

  const monitorId = placed.monitor;
  const monitorItem = monitorId
    ? getCatalogItemById<'monitor'>(monitorId)
    : undefined;
  const MonitorComponent = ITEM_COMPONENT_REGISTRY.monitor;

  const mountId = placed.monitorMount;
  const mountItem = mountId
    ? getCatalogItemById<'monitorMount'>(mountId)
    : undefined;
  const MountComponent = ITEM_COMPONENT_REGISTRY.monitorMount;

  const keyboardId = placed.keyboard;
  const keyboardItem = keyboardId
    ? getCatalogItemById<'keyboard'>(keyboardId)
    : undefined;
  const KeyboardComponent = ITEM_COMPONENT_REGISTRY.keyboard;

  const mouseId = placed.mouse;
  const mouseItem = mouseId
    ? getCatalogItemById<'mouse'>(mouseId)
    : undefined;
  const MouseComponent = ITEM_COMPONENT_REGISTRY.mouse;

  return (
    <group>
      {monitorItem &&
        MonitorComponent &&
        monitorItem.attachTo === 'desk' && (
          <>
            <DraggableMonitorGroup
              key={`monitor-${monitorItem.id}`}
              item={monitorItem}
              Component={MonitorComponent}
              poseRef={poseRef}
              deskGroupRef={deskGroupRef}
            />

            {mountItem && MountComponent && mountItem.attachTo === 'desk' && (
              <group
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.delta <= 4) {
                    selectTarget('monitor');
                  }
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  selectTarget('monitor');
                }}
                onPointerOver={(e) => e.stopPropagation()}
                onPointerOut={(e) => e.stopPropagation()}
              >
                <MountComponent
                  key={`mount-${mountItem.id}`}
                  item={mountItem}
                  poseRef={poseRef}
                />
              </group>
            )}
          </>
        )}

      {keyboardItem &&
        KeyboardComponent &&
        keyboardItem.attachTo === 'desk' && (
          <DraggableKeyboardGroup
            key={`keyboard-${keyboardItem.id}`}
            item={keyboardItem}
            Component={KeyboardComponent}
            deskGroupRef={deskGroupRef}
          />
        )}

      {mouseItem &&
        MouseComponent &&
        mouseItem.attachTo === 'desk' && (
          <DraggableMouseGroup
            key={`mouse-${mouseItem.id}`}
            item={mouseItem}
            Component={MouseComponent}
            deskGroupRef={deskGroupRef}
          />
        )}
    </group>
  );
}
