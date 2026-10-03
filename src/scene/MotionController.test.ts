import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { CameraRig } from './CameraRig';
import { EASING, MotionController, MOTION_DURATION } from './MotionController';

describe('camera motion', () => {
  it('opens perspective without an initial shrink and retains exact endpoints', () => {
    const rig=new CameraRig(); const from=rig.snapshot();
    const to={position:new Vector3(0,-64,41),target:new Vector3(0,0,41),fov:30,roll:0};
    let previous=Infinity;
    for(let i=0;i<=100;i++) {
      rig.interpolate(from,to,i/100);const pose=rig.snapshot();
      const extent=pose.position.distanceTo(pose.target)*Math.tan(pose.fov*Math.PI/360);
      expect(extent).toBeLessThanOrEqual(previous);previous=extent;
    }
    expect(rig.snapshot()).toEqual(to);rig.interpolate(from,to,0);expect(rig.snapshot()).toEqual(from);
  });
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
    expect(rig.camera.fov).toBeCloseTo(20.5);
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
  it('provides bounded monotonic named easing and paused deterministic inspection', () => {
    for (const ease of Object.values(EASING)) {
      expect(ease(0)).toBe(0); expect(ease(1)).toBe(1);
      let previous = 0;
      for (let i = 0; i <= 100; i++) { const value = ease(i / 100); expect(value).toBeGreaterThanOrEqual(previous); expect(value).toBeLessThanOrEqual(1); previous = value; }
    }
    const motion = new MotionController(); const sample = vi.fn(); const complete = vi.fn();
    motion.play({ name: 'focus:keyboard', durationSeconds: 0.64, sample, complete, ease: EASING.CAMERA_OUT });
    motion.preview('focus:keyboard', 0.35); const count = sample.mock.calls.length;
    motion.update(10); expect(sample).toHaveBeenCalledTimes(count); expect(complete).not.toHaveBeenCalled();
    expect(motion.progress).toBeCloseTo(0.35);
  });
});
