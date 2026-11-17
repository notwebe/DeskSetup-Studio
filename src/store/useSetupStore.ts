import { create } from 'zustand';
import {
  DEFAULT_BASE_X,
  DEFAULT_DESK_TRANSFORM,
  DEFAULT_MOUNT_HEIGHT,
  DEFAULT_MOUNT_ID,
  getActiveMountParams,
  getCatalogItemById,
  getDefaultKeyboardTransform,
  getDefaultMonitorTransform,
  getDefaultMouseTransform,
} from '../data/catalog';
import type {
  CategoryId,
  ItemDimensions,
  ItemTransform,
  SelectionTarget,
} from '../types/catalog';
import { clampDeskToRoom } from '../utils/clampDeskToRoom';
import {
  clampBaseX,
  clampMonitorWithMount,
  clampMountHeight,
  clampRotationY,
  clampToDesk,
} from '../utils/clampToDesk';
import { ACCENT_COLOR } from '../utils/mouseSpec';

export type { CategoryId, SelectionTarget };

export interface CategoryMeta {
  id: CategoryId;
  label: string;
}

// Daftar 6 tab kategori utama yang ditampilkan di navigasi sidebar
export const CATEGORIES: CategoryMeta[] = [
  { id: 'monitor', label: 'Monitor' },
  { id: 'pc', label: 'PC' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'mouse', label: 'Mouse' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'addons', label: 'Add-ons' },
];

interface SetupStoreState {
  activeCategory: CategoryId;
  placed: Record<CategoryId, string | null>;
  transforms: Record<CategoryId, ItemTransform | null>;
  deskTransform: ItemTransform;
  mountHeight: number;
  baseX: number;
  selectedTarget: SelectionTarget;
  isDragging: boolean;
  nightMode: boolean;
  setupAccent: string;
  setActiveCategory: (category: CategoryId) => void;
  placeItem: (category: CategoryId, itemId: string | null) => void;
  setTransform: (category: CategoryId, transform: ItemTransform) => void;
  setDeskTransform: (transform: ItemTransform) => void;
  resetDeskTransform: () => void;
  setMountHeight: (height: number) => void;
  setBaseX: (baseX: number) => void;
  resetTransform: (category: CategoryId) => void;
  selectTarget: (target: SelectionTarget) => void;
  setIsDragging: (isDragging: boolean) => void;
  toggleNight: () => void;
}

// Hitung posisi anchor mouse berdasarkan kondisi keyboard yang terpasang saat itu
function computeMouseAnchorForState(
  state: Pick<SetupStoreState, 'placed' | 'transforms'>,
  mouseDimensions: Pick<ItemDimensions, 'width' | 'depth'>
): ItemTransform {
  const kbId = state.placed.keyboard;
  const kbItem = kbId ? getCatalogItemById<'keyboard'>(kbId) : undefined;
  let kbInfo: { x: number; z: number; width: number } | null = null;

  if (kbItem) {
    const kbTransform =
      state.transforms.keyboard ??
      getDefaultKeyboardTransform(kbItem.dimensions.depth);
    kbInfo = {
      x: kbTransform.x,
      z: kbTransform.z,
      width: kbItem.dimensions.width,
    };
  }

  return getDefaultMouseTransform(mouseDimensions, kbInfo);
}

// Store utama DeskSetup Studio: kategori aktif, item terpasang (koordinat lokal meja), transformasi meja, & mode malam
export const useSetupStore = create<SetupStoreState>((set) => ({
  activeCategory: 'monitor',
  placed: {
    monitor: null,
    monitorMount: DEFAULT_MOUNT_ID,
    pc: null,
    keyboard: null,
    mouse: null,
    lighting: null,
    addons: null,
  },
  transforms: {
    monitor: null,
    monitorMount: null,
    pc: null,
    keyboard: null,
    mouse: null,
    lighting: null,
    addons: null,
  },
  deskTransform: { ...DEFAULT_DESK_TRANSFORM },
  mountHeight: DEFAULT_MOUNT_HEIGHT,
  baseX: DEFAULT_BASE_X,
  selectedTarget: null,
  isDragging: false,
  nightMode: false,
  setupAccent: ACCENT_COLOR,

  setActiveCategory: (category) => set({ activeCategory: category }),

  placeItem: (category, itemId) =>
    set((state) => {
      // 1. Jika memilih tipe penyangga monitor (monitorMount)
      if (category === 'monitorMount') {
        const nextMountId = itemId ?? DEFAULT_MOUNT_ID;
        const mountParams = getActiveMountParams(nextMountId);
        const nextHeight = clampMountHeight(state.mountHeight, mountParams);

        return {
          placed: { ...state.placed, monitorMount: nextMountId },
          transforms: { ...state.transforms, monitor: null },
          mountHeight: nextHeight,
          baseX: DEFAULT_BASE_X,
        };
      }

      // 2. Saat item dihapus, reset transformasi kategori tersebut
      if (itemId === null) {
        return {
          placed: { ...state.placed, [category]: null },
          transforms: { ...state.transforms, [category]: null },
          selectedTarget:
            state.selectedTarget === category ? null : state.selectedTarget,
        };
      }

      // 3. Saat memasang atau mengganti item di kategori yang sama
      const newItem = getCatalogItemById(itemId);
      const currentTransform = state.transforms[category];
      let nextTransform: ItemTransform | null = currentTransform;
      let nextBaseX = state.baseX;

      if (category === 'monitor' && newItem) {
        const mountParams = getActiveMountParams(state.placed.monitorMount);
        const rawTransform =
          currentTransform ?? getDefaultMonitorTransform(mountParams);
        const clampedRotY = clampRotationY(
          rawTransform.rotY,
          mountParams.maxRotationDeg
        );
        const clamped = clampMonitorWithMount(
          { x: rawTransform.x, z: rawTransform.z },
          newItem.dimensions,
          clampedRotY,
          mountParams,
          state.baseX,
          state.mountHeight
        );

        nextBaseX = clamped.baseX;
        nextTransform = currentTransform
          ? { x: clamped.x, z: clamped.z, rotY: clampedRotY }
          : null;
      } else if (category === 'mouse' && newItem) {
        if (currentTransform) {
          const clampedRotY = clampRotationY(currentTransform.rotY, 90);
          const clamped = clampToDesk(
            { x: currentTransform.x, z: currentTransform.z },
            newItem.dimensions,
            clampedRotY
          );
          nextTransform = {
            x: clamped.x,
            z: clamped.z,
            rotY: clampedRotY,
          };
        } else {
          nextTransform = computeMouseAnchorForState(state, newItem.dimensions);
        }
      } else if (currentTransform && newItem) {
        const clampedRotY = clampRotationY(currentTransform.rotY, 45);
        const clamped = clampToDesk(
          { x: currentTransform.x, z: currentTransform.z },
          newItem.dimensions,
          clampedRotY
        );
        nextTransform = {
          x: clamped.x,
          z: clamped.z,
          rotY: clampedRotY,
        };
      }

      return {
        placed: { ...state.placed, [category]: itemId },
        transforms: { ...state.transforms, [category]: nextTransform },
        baseX: nextBaseX,
      };
    }),

  setTransform: (category, transform) =>
    set((state) => {
      if (category === 'monitor') {
        const mountParams = getActiveMountParams(state.placed.monitorMount);
        if (mountParams.mountType === 'bracket') {
          return {
            transforms: { ...state.transforms, monitor: transform },
            baseX: clampBaseX(transform.x),
          };
        }
      }
      return {
        transforms: { ...state.transforms, [category]: transform },
      };
    }),

  setDeskTransform: (transform) =>
    set(() => {
      const clamped = clampDeskToRoom(
        { x: transform.x, z: transform.z },
        transform.rotY
      );
      return {
        deskTransform: {
          x: clamped.x,
          z: clamped.z,
          rotY: transform.rotY,
        },
      };
    }),

  resetDeskTransform: () =>
    set({
      deskTransform: { ...DEFAULT_DESK_TRANSFORM },
    }),

  setMountHeight: (height) =>
    set((state) => {
      const mountParams = getActiveMountParams(state.placed.monitorMount);
      const nextHeight = clampMountHeight(height, mountParams);
      const monitorId = state.placed.monitor;
      const monitorItem = monitorId ? getCatalogItemById(monitorId) : undefined;

      if (monitorItem && mountParams.mountType === 'arm') {
        const current =
          state.transforms.monitor ?? getDefaultMonitorTransform(mountParams);
        const clamped = clampMonitorWithMount(
          { x: current.x, z: current.z },
          monitorItem.dimensions,
          current.rotY,
          mountParams,
          state.baseX,
          nextHeight
        );
        return {
          mountHeight: nextHeight,
          transforms: {
            ...state.transforms,
            monitor: {
              x: clamped.x,
              z: clamped.z,
              rotY: current.rotY,
            },
          },
        };
      }

      return {
        mountHeight: nextHeight,
      };
    }),

  setBaseX: (newBaseX) =>
    set((state) => {
      const clampedBase = clampBaseX(newBaseX);
      const mountParams = getActiveMountParams(state.placed.monitorMount);
      const monitorId = state.placed.monitor;
      const monitorItem = monitorId ? getCatalogItemById(monitorId) : undefined;

      if (!monitorItem || mountParams.mountType === 'stand') {
        return { baseX: clampedBase };
      }

      const current =
        state.transforms.monitor ?? getDefaultMonitorTransform(mountParams);

      const targetX =
        mountParams.mountType === 'bracket' ? clampedBase : current.x;

      const clamped = clampMonitorWithMount(
        { x: targetX, z: current.z },
        monitorItem.dimensions,
        current.rotY,
        mountParams,
        clampedBase,
        state.mountHeight
      );

      return {
        baseX: clamped.baseX,
        transforms: {
          ...state.transforms,
          monitor: {
            x: clamped.x,
            z: clamped.z,
            rotY: current.rotY,
          },
        },
      };
    }),

  resetTransform: (category) =>
    set((state) => {
      if (category === 'monitor') {
        const mountParams = getActiveMountParams(state.placed.monitorMount);
        return {
          transforms: { ...state.transforms, monitor: null },
          mountHeight: mountParams.defaultHeight,
          baseX: DEFAULT_BASE_X,
        };
      }

      if (category === 'mouse') {
        const mouseId = state.placed.mouse;
        const mouseItem = mouseId ? getCatalogItemById(mouseId) : undefined;
        const anchorTransform = mouseItem
          ? computeMouseAnchorForState(state, mouseItem.dimensions)
          : null;
        return {
          transforms: { ...state.transforms, mouse: anchorTransform },
        };
      }

      return {
        transforms: { ...state.transforms, [category]: null },
      };
    }),

  selectTarget: (target) => set({ selectedTarget: target }),

  setIsDragging: (isDragging) => set({ isDragging }),

  toggleNight: () => set((state) => ({ nightMode: !state.nightMode })),
}));
