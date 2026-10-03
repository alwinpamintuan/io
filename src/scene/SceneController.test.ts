import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { SceneStore } from '../app/state';
import { SceneController } from './SceneController';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    info = { render: { calls: 0, triangles: 0 } };
    setPixelRatio() {} setSize() {} setClearColor() {} render() {} dispose() {}
  } };
});
afterEach(() => vi.unstubAllGlobals());
function fixture(reduced = false) {
  vi.stubGlobal('window', { location: { hash: '', search: '' } });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {} }) }) });
  const scene = new SceneController({} as HTMLCanvasElement, reduced); const store = new SceneStore();
  const dispatch = store.dispatch.bind(store); store.subscribe((state) => scene.applyState(state, dispatch));
  scene.applyState(store.getState(), dispatch); scene.resize(1440, 900, 2);
  return { scene, store, dispatch };
}
describe('scene navigation integration', () => {
  it('retargets interrupted entry and restores exact canonical transforms with persistent roots', () => {
    const { scene, store, dispatch } = fixture(); const roots = [...scene.deviceRoots.values()]; const overview = scene.cameraRig.snapshot();
    expect(scene.workstation.solids[0]!.silhouette.object.material.resolution.toArray()).toEqual([1440, 900]);
    dispatch({ type: 'navigate', device: 'keyboard' }); scene.update(0.2); const interrupted = scene.cameraRig.snapshot();
    dispatch({ type: 'navigate', device: null }); expect(scene.cameraRig.snapshot()).toEqual(interrupted);
    scene.update(0.54); expect(store.getState().mode).toBe('overview'); expect(scene.cameraRig.snapshot()).toEqual(overview);
    expect([...scene.deviceRoots.values()]).toEqual(roots);
    for (const visual of scene.workstation.visuals.values()) { expect(visual.position.z).toBe(0); expect(visual.rotation.z).toBe(0); }
    scene.dispose();
  });
  it('retargets a resize during motion and fits monitor screen at desktop and portrait aspect ratios', () => {
    const { scene, store, dispatch } = fixture();
    dispatch({ type: 'navigate', device: 'monitor' }); scene.update(0.2); scene.resize(700, 900, 2); scene.update(1);
    expect(store.getState()).toMatchObject({ phase: 'active', device: 'monitor' });
    expect(scene.cameraRig.snapshot()).toEqual(scene.cameraRig.poseFor('monitor'));
    for (const [width, height] of [[1440, 900], [1280, 720], [700, 900]]) {
      scene.resize(width!, height!, 2); scene.worldRoot.updateMatrixWorld(true);
      for (const [x, y] of [[-28.6, -15.6], [28.6, 15.6]]) {
        const point = scene.workstation.screen.localToWorld(new Vector3(x, y, 0)).project(scene.cameraRig.camera);
        expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1);
      }
    }
    scene.dispose();
  });
  it('uses reduced-motion near-pose travel without an animated FOV sweep', () => {
    const { scene, store, dispatch } = fixture(true);
    dispatch({ type: 'navigate', device: 'mouse' }); const departure = scene.cameraRig.snapshot(); const destination = scene.cameraRig.poseFor('mouse');
    expect(departure.fov).toBe(destination.fov); expect(departure.position.distanceTo(destination.position)).toBeLessThan(2);
    scene.update(0.15); expect(store.getState()).toMatchObject({ phase: 'active' }); expect(scene.cameraRig.snapshot()).toEqual(destination);
    scene.dispose();
  });
});
