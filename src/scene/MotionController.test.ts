import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { CameraRig } from './CameraRig';
import { MotionController, MOTION_DURATION } from './MotionController';

describe('camera motion', () => {
  it('uses elapsed time and restores the exact overview with the same camera', () => {
    const rig = new CameraRig();
    const camera = rig.camera;
    const overview = rig.snapshot();
    const focus = { position: new Vector3(0, -8, 6), target: new Vector3(0, 0, 1), fov: 30, roll: 0.1 };
    rig.registerFocusPose('keyboard', focus);
    focus.position.x = 99; // Registered poses are owned copies.
    const destination = rig.poseFor('keyboard');
    const motion = new MotionController();
    const complete = vi.fn();
    motion.play({
      name: 'focus:keyboard', durationSeconds: MOTION_DURATION.navigation,
      sample: (progress) => rig.interpolate(overview, destination, progress), complete,
    });
    motion.update(MOTION_DURATION.navigation / 2);
    expect(rig.snapshot()).not.toEqual(overview);
    expect(rig.snapshot()).not.toEqual(destination);
    expect(complete).not.toHaveBeenCalled();
    motion.update(MOTION_DURATION.navigation / 2);
    expect(rig.snapshot()).toEqual(destination);
    expect(complete).toHaveBeenCalledTimes(1);
    const current = rig.snapshot();
    motion.play({
      name: 'overview', durationSeconds: MOTION_DURATION.reduced,
      sample: (progress) => rig.interpolate(current, overview, progress), complete,
    });
    motion.update(0.15);
    expect(rig.snapshot()).toEqual(overview);
    expect(rig.camera).toBe(camera);
    expect(motion.active).toBe(false);
    motion.update(1);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('interrupts motion without firing the cancelled completion', () => {
    const motion = new MotionController();
    const oldComplete = vi.fn();
    const newComplete = vi.fn();
    motion.play({ name: 'focus:mouse', durationSeconds: 0.6, sample: vi.fn(), complete: oldComplete });
    motion.update(0.2);
    motion.play({ name: 'overview', durationSeconds: 0.15, sample: vi.fn(), complete: newComplete });
    motion.update(0.15);
    expect(oldComplete).not.toHaveBeenCalled();
    expect(newComplete).toHaveBeenCalledTimes(1);
  });
});
