import { createElement, type ComponentType, type MutableRefObject } from 'react';
import type { CatalogItem, CategoryId } from '../../../types/catalog';
import { DeskBracket } from './DeskBracket';
import { Keyboard } from './Keyboard';
import { Monitor } from './Monitor';
import { MonitorArm, type LiveMonitorPose } from './MonitorArm';
import { Mouse } from './Mouse';

export interface SceneItemComponentProps<C extends CategoryId = any> {
  item: CatalogItem<C>;
  isSelected?: boolean;
  poseRef?: MutableRefObject<LiveMonitorPose>;
}

// Komponen dispatcher untuk kategori monitorMount (Stand bawaan, Monitor Arm, Desk Bracket)
function MonitorMountItem({
  item,
  poseRef,
}: SceneItemComponentProps<'monitorMount'>) {
  if (!poseRef || item.params.mountType === 'stand') {
    return null;
  }

  if (item.params.mountType === 'arm') {
    return createElement(MonitorArm, { params: item.params, poseRef });
  }

  return createElement(DeskBracket, { params: item.params, poseRef });
}

// Registry komponen 3D per kategori
export const ITEM_COMPONENT_REGISTRY: Partial<
  Record<CategoryId, ComponentType<SceneItemComponentProps>>
> = {
  monitor: Monitor,
  monitorMount: MonitorMountItem,
  keyboard: Keyboard,
  mouse: Mouse,
};
