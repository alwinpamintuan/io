import { Vector3 } from 'three';
import type { DeviceId } from '../app/state';
import type { CameraPose } from './CameraRig';

export const FOCUS_DURATION: Record<DeviceId, number> = {
  keyboard: 0.64, mouse: 0.6, monitor: 0.68, camera: 0.64, controller: 0.62, audio: 0.6, microphone: 0.6,
};
export const FOCUS_LIFT: Record<DeviceId, number> = {
  keyboard: 2.5, mouse: 2, monitor: 0, camera: 0, controller: 3.5, audio: 0.6, microphone: 1,
};
export const FOCUS_YAW: Record<DeviceId, number> = {
  keyboard: 4, mouse: -4, monitor: 0, camera: 0, controller: 11, audio: 0, microphone: 0,
};

// Focus poses tuned for readable devices under the shared camera.
export function focusPose(id: DeviceId, target: Vector3, aspect: number): CameraPose {
  const offsets: Record<DeviceId, Vector3> = {
    keyboard: new Vector3(0, -20, 58), mouse: new Vector3(-9, -23, 24),
    monitor: new Vector3(0, -64, 0), camera: new Vector3(0, -34, 3),
    controller: new Vector3(-6, -22, 32), audio: new Vector3(-2, -42, 6), microphone: new Vector3(-2, -31, 13),
  };
  const fov = id === 'keyboard' ? 27 : id === 'camera' ? 31 : 30;
  const offset = offsets[id].clone();
  // Named narrow band keeps the selected device inside the viewport.
  if (aspect < 1.6) offset.multiplyScalar(1.6 / Math.max(0.3, aspect));
  const framing = target.clone();
  if (aspect >= 1.2) {
    if (id === 'mouse') { framing.x += 5; }
    if (id === 'controller') { framing.x += 4; }
    if (id === 'audio') framing.x += 9;
    if (id === 'microphone') framing.x += 5;
    if (id === 'camera') framing.x += 7;
  }
  return { position: framing.clone().add(offset), target: framing, fov, roll: 0 };
}
