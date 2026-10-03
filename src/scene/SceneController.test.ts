import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, Vector3 } from 'three';
import { SceneStore } from '../app/state';
import { DEVICE_IDS } from '../app/state';
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
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillText() {}, clearRect() {} }) }) });
  const scene = new SceneController({} as HTMLCanvasElement, reduced); const store = new SceneStore();
  const dispatch = store.dispatch.bind(store); store.subscribe((state) => scene.applyState(state, dispatch));
  scene.applyState(store.getState(), dispatch); scene.resize(1440, 900, 2);
  return { scene, store, dispatch };
}
describe('scene navigation integration', () => {
  it('projects resting hardware bounds for responsive overview fields and reports omitted devices', () => {
    const { scene } = fixture();
    for (const width of [1440, 700, 390]) {
      scene.resize(width, 900, 1);
      for (const id of DEVICE_IDS) {
        const bounds = scene.overviewBounds(id);
        expect(bounds.visible).toBe(true);
        expect(bounds.right).toBeGreaterThan(bounds.left);
        expect(bounds.bottom).toBeGreaterThan(bounds.top);
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(width);
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.bottom).toBeLessThanOrEqual(900);
      }
      const monitor = scene.overviewBounds('monitor'), screen = scene.screenBounds();
      expect(screen.left).toBeGreaterThanOrEqual(monitor.left);
      expect(screen.right).toBeLessThanOrEqual(monitor.right);
    }
    scene.setDeviceVisibility(['camera', 'controller']);
    expect(scene.overviewBounds('camera').visible).toBe(false);
    expect(scene.overviewBounds('controller').visible).toBe(false);
    expect(scene.overviewBounds('monitor').visible).toBe(true);
    scene.dispose();
  });
  it('keeps stereo origins visible and channel feedback present with reduced motion', () => {
    const { scene, dispatch } = fixture(true);
    dispatch({ type: 'navigate', device: 'audio' }); scene.update(.7);
    for (const width of [1440, 700]) {
      scene.resize(width, 900, 1);
      for (const driver of scene.workstation.drivers) {
        const origin = driver.getWorldPosition(new Vector3()).project(scene.cameraRig.camera);
        expect(Math.abs(origin.x)).toBeLessThan(1);
        expect(Math.abs(origin.y)).toBeLessThan(1);
      }
      scene.audio({ output: true, channel: 'right', outputLevel: 1, error: null }, 100);
      const waves = (scene as unknown as { waves: { object: { geometry: { instanceCount: number } } }[] }).waves;
      expect(waves.slice(0, 2).every(w => w.object.geometry.instanceCount === 0)).toBe(true);
      expect(waves.slice(2).every(w => w.object.geometry.instanceCount > 0)).toBe(true);
      scene.audio({ output: false, channel: 'right', outputLevel: 0, error: null }, 200);
      expect(waves.every(w => w.object.geometry.instanceCount === 0)).toBe(true);
    }
    scene.dispose();
  });
  it('reframes reduced layouts, omits hit targets, and restores optional testers without moving roots', () => {
    const { scene, dispatch } = fixture();
    const roots = [...scene.deviceRoots.values()], positions = roots.map(r => r.position.clone());
    const original = scene.cameraRig.snapshot();
    scene.setDeviceVisibility(['controller', 'camera', 'microphone', 'audio', 'monitor']);
    expect(scene.deviceRoots.get('monitor')!.visible).toBe(true);
    expect(scene.deviceRoots.get('controller')!.visible).toBe(false);
    const compact = scene.cameraRig.snapshot(); expect(compact.position.distanceTo(compact.target)).toBeLessThan(original.position.distanceTo(original.target));
    const point = scene.deviceRoots.get('controller')!.position.clone().project(scene.cameraRig.camera);
    expect(scene.pick((point.x + 1) * 720, (1 - point.y) * 450)).not.toBe('controller');
    dispatch({ type: 'navigate', device: 'controller' }); scene.update(.2);
    scene.setDeviceVisibility(['controller', 'camera']); scene.update(.7);
    expect(scene.deviceRoots.get('controller')!.visible).toBe(true);
    dispatch({ type: 'navigate', device: null }); scene.update(.54);
    expect(scene.deviceRoots.get('controller')!.visible).toBe(false);
    expect(roots.map(r => r.position)).toEqual(positions);
    scene.setDeviceVisibility([]); expect(scene.cameraRig.snapshot()).toEqual(original); scene.dispose();
  });
  it('finishes interrupted visibility transitions and keeps drafting outside physical annotation bounds', () => {
    const { scene, store, dispatch } = fixture();
    dispatch({ type: 'navigate', device: 'mouse' }); scene.update(.2);
    scene.setDeviceVisibility(['microphone']); scene.update(.7);
    expect(store.getState()).toMatchObject({ device: 'mouse', phase: 'active' });
    const bounds = scene.focusBounds('mouse');
    const field = scene.workstation.visuals.get('mouse')!.getObjectByName('mouse:MeasurementField')!;
    field.position.x += 100;
    expect(scene.focusBounds('mouse')).toEqual(bounds);
    dispatch({ type: 'navigate', device: null }); scene.update(.2);
    scene.setDeviceVisibility(['controller']); scene.update(.7);
    expect(store.getState().mode).toBe('overview'); scene.dispose();
  });
  it('keeps flush button inversion visible and bounds wheel display without changing observations', () => {
    const {scene}=fixture();
    const snapshot={buttons:5,clickMs:null,wheel:{x:0,y:10000,mode:0,angle:150},trail:[]};
    scene.pointer(snapshot);
    const button=scene.workstation.mouseButtons[0]!;
    expect(button.mesh.material).toBe(scene.materials.ink);
    expect(button.object.position.z).toBeCloseTo(scene.workstation.mouseRest[0]!.z-.08);
    expect(scene.workstation.mouseWheel.position.z).toBeCloseTo(2.77);
    scene.update(.09);expect(scene.workstation.mouseWheel.rotation.x).toBeGreaterThan(.9);
    expect(scene.workstation.mouseWheel.rotation.x).toBeLessThanOrEqual(Math.PI/3);
    expect(snapshot.wheel.angle).toBe(150);scene.dispose();
  });
  it('separates reported digital pressed state from analog trigger travel without changing mapping for legends', () => {
    const { scene } = fixture(); const buttons = Array(17).fill(0); buttons[0] = 0.42; buttons[6] = 0.42;
    const snapshot = { id: 'Fixture', index: 0, standard: true, buttons, pressed: Array(17).fill(false), axes: [0.001, -0.003, 0, 0], timestamp: 1, haptics: false };
    scene.gamepad(snapshot); expect(scene.workstation.buttons.get(0)!.mesh.material).toBe(scene.materials.paper);
    expect(scene.workstation.buttons.get(6)!.object.position.z).toBeCloseTo(scene.workstation.buttonRest.get(6)!.z - 0.42 * 0.8);
    const positions = scene.workstation.sticks.map(stick => stick.position.clone()); scene.controllerStyle('Xbox'); scene.gamepad(snapshot); expect(scene.workstation.sticks.map(stick => stick.position)).toEqual(positions);
    snapshot.pressed[0] = true; scene.gamepad(snapshot); expect(scene.workstation.buttons.get(0)!.mesh.material).toBe(scene.materials.ink); scene.dispose();
  });
  it('shows neutral control identity without a connected pad and hides implied labels for unknown mappings', () => {
    const { scene, dispatch } = fixture();
    dispatch({ type: 'navigate', device: 'controller' }); scene.update(.7);
    const legend = scene.workstation.buttons.get(0)!.object.getObjectByName('ControlLegend')!;
    expect(legend.visible).toBe(true);
    scene.gamepad({ id: 'Unknown', index: 0, standard: false, buttons: [1], pressed: [true], axes: [0], timestamp: 1, haptics: false });
    scene.update(.2); expect(legend.visible).toBe(false);
    scene.gamepad(null); scene.update(.2); expect(legend.visible).toBe(true);
    scene.dispose();
  });
  it('keeps the small menu buttons and their marks above the controller crown when pressed', () => {
    const { scene } = fixture(); const buttons = Array(17).fill(0), pressed = Array(17).fill(false);
    for (const index of [8,9,16]) { buttons[index] = 1; pressed[index] = true; }
    scene.gamepad({ id: 'Standard', index: 0, standard: true, buttons, pressed, axes: [0,0,0,0], timestamp: 1, haptics: false });
    scene.worldRoot.updateMatrixWorld(true);
    const shell = scene.workstation.solids.find(solid => solid.mesh.name === 'controller.shell')!;
    const crown = new Box3().setFromObject(shell.mesh).max.z;
    for (const index of [8,9,16]) expect(new Box3().setFromObject(scene.workstation.buttons.get(index)!.mesh).max.z).toBeGreaterThan(crown);
    scene.dispose();
  });
  it('reattaches the persistent monitor texture after exit and keeps inspection fields untinted', () => {
    const { scene, dispatch } = fixture(); const canvas = {} as HTMLCanvasElement;
    scene.monitor(canvas); const texture = scene.workstation.screen.material.map;
    expect(scene.workstation.screenIdentity.visible).toBe(false);
    scene.resetMonitor(); expect(scene.workstation.screen.material.map).toBeNull();
    expect(scene.workstation.screenIdentity.visible).toBe(true);
    scene.monitor(canvas); expect(scene.workstation.screen.material.map).toBe(texture);
    dispatch({ type: 'navigate', device: 'monitor' }); scene.update(0.7);
    expect(scene.workstation.screen.material.color.getHex()).toBe(0xffffff); scene.dispose();
  });
  it.each(DEVICE_IDS)('activates %s within 700 ms while retaining canonical roots and resolves detail during travel', (device) => {
    const { scene, store, dispatch } = fixture(); const roots = [...scene.deviceRoots.values()];
    const positions = roots.map(root => root.position.clone());
    dispatch({ type: 'navigate', device }); scene.update(0.45);
    if (device === 'mouse' || device === 'microphone') expect(scene.workstation.detailGroups.get(device)!.visible).toBe(true);
    if (device === 'controller') expect(scene.workstation.buttons.get(0)!.object.getObjectByName('ControlLegend')!.visible).toBe(true);
    scene.update(0.25); expect(store.getState()).toMatchObject({ phase: 'active', device });
    expect([...scene.deviceRoots.values()]).toEqual(roots); expect(roots.map(root => root.position)).toEqual(positions);
    dispatch({ type: 'navigate', device: null }); scene.update(0.54); expect(store.getState().mode).toBe('overview'); scene.dispose();
  });
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
      for (const [x, y] of [[-26.075, -14.475], [26.075, 14.475]]) {
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
