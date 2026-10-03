import { Vector3 } from 'three';
import type { DeviceId } from '../app/state';
import type { CameraPose } from './CameraRig';

export const FOCUS_DURATION: Record<DeviceId, number> = {
  keyboard: 0.64, mouse: 0.6, monitor: 0.68, camera: 0.64, controller: 0.62, audio: 0.6,
};
export const FOCUS_LIFT: Record<DeviceId, number> = {
  keyboard: 2, mouse: 2, monitor: 0, camera: 0, controller: 2.5, audio: 0.6,
};
export const FOCUS_YAW: Record<DeviceId, number> = {
  keyboard: 4, mouse: -4, monitor: 0, camera: 0, controller: 11, audio: 0,
};

// Construction-sheet poses tuned to its occupancy targets under the actual camera.
export function focusPose(id: DeviceId, target: Vector3, aspect: number): CameraPose {
  const offsets: Record<DeviceId, Vector3> = {
    keyboard: new Vector3(10, -47, 69), mouse: new Vector3(7, -17, 20),
    monitor: new Vector3(0, -76, 0), camera: new Vector3(0, -22, 1),
    controller: new Vector3(-8, -24, 33), audio: new Vector3(-4, -25, 10),
  };
  const fov = id === 'keyboard' ? 27 : id === 'camera' ? 31 : 30;
  const offset = offsets[id].clone();
  // Named narrow band keeps the selected device inside the viewport.
  if (aspect < 1.6) offset.multiplyScalar(1.6 / Math.max(0.3, aspect));
  return { position: target.clone().add(offset), target: target.clone(), fov, roll: 0 };
}
