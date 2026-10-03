import { afterEach, describe, expect, it } from 'vitest';
import { Box3, Group, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import { DEVICE_IDS } from '../../app/state';
import { CameraRig } from '../CameraRig';
import { createMaterials } from '../materials';
import { createRendererSpike, SPIKE_DEVICES } from './rendererSpike';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0)) dispose(); });

function fixture(flat = false, noShadow = false) {
  const roots = new Map(DEVICE_IDS.map((id) => [id, new Group()]));
  const world = new Group();
  for (const root of roots.values()) world.add(root);
  const materials = createMaterials();
  const spike = createRendererSpike(roots, materials, { flat, noShadow });
  world.updateMatrixWorld(true);
  const rig = new CameraRig();
  rig.resize(1440, 900);
  spike.resize(1440, 900);
  spike.update(rig.camera);
  cleanup.push(() => { spike.dispose(); Object.values(materials).forEach((material) => material.dispose()); });
  return { roots, world, spike, rig };
}

describe('renderer spike spatial invariants', () => {
  it('batches face polygons into one draw group per shared material', () => {
    const { spike } = fixture();
    for (const solid of spike.solids) {
      const groups = solid.mesh.geometry.groups;
      expect(new Set(groups.map((group) => group.materialIndex)).size).toBe(groups.length);
      expect(groups.reduce((total, group) => total + group.count, 0)).toBe(solid.mesh.geometry.getAttribute('position').count);
    }
  });
  it('grounds the three physical bodies at the common desk plane', () => {
    const { roots } = fixture();
    for (const id of SPIKE_DEVICES) {
      const visual = roots.get(id)!.getObjectByName('VisualRoot')!;
      const physicalBounds = new Box3();
      visual.traverse((object) => {
        if (object instanceof Mesh && object.type === 'Mesh') physicalBounds.union(new Box3().setFromObject(object));
      });
      expect(physicalBounds.min.z).toBeCloseTo(0);
      expect(physicalBounds.max.z).toBeGreaterThan(2);
    }
  });

  it('produces real keyboard-over-stand occlusion under the shared camera', () => {
    const { roots, spike, rig } = fixture();
    const keyboard = roots.get('keyboard')!;
    const foot = spike.solids[0]!.mesh;
    const meshes = spike.solids.map((solid) => solid.mesh);
    const raycaster = new Raycaster();
    let occludedSamples = 0;
    for (let x = -9; x <= 9; x += 3) {
      const sample = new Vector3(x, -6.8, 1.6);
      foot.localToWorld(sample);
      const screen = sample.project(rig.camera);
      raycaster.setFromCamera(new Vector2(screen.x, screen.y), rig.camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.some((hit) => hit.object === foot) && keyboard.getObjectById(hits[0]!.object.id)) occludedSamples += 1;
    }
    expect(occludedSamples).toBeGreaterThan(0);
  });

  it('keeps physical geometry in frame at both desktop review sizes', () => {
    const { spike, rig } = fixture();
    for (const [width, height] of [[1440, 900], [1280, 720]] as const) {
      rig.resize(width, height);
      for (const solid of spike.solids) {
        const attribute = solid.mesh.geometry.getAttribute('position');
        for (let i = 0; i < attribute.count; i += 1) {
          const point = new Vector3().fromBufferAttribute(attribute, i);
          solid.mesh.localToWorld(point);
          point.project(rig.camera);
          expect(Math.abs(point.x)).toBeLessThan(0.95);
          expect(Math.abs(point.y)).toBeLessThan(0.95);
        }
      }
    }
  });

  it('keeps the contact shadow at desk height when VisualRoot lifts', () => {
    const { roots, world } = fixture();
    const keyboard = roots.get('keyboard')!;
    keyboard.getObjectByName('VisualRoot')!.position.z = 2;
    world.updateMatrixWorld(true);
    expect(keyboard.getObjectByName('ContactShadow')!.getWorldPosition(new Vector3()).z).toBeCloseTo(0.015);
  });

  it('maintains distinct CSS-pixel line classes after resizing', () => {
    const { spike } = fixture();
    spike.resize(1280, 720);
    const solid = spike.solids[0]!;
    expect(solid.silhouette.object.material.linewidth).toBe(3.25);
    expect(solid.construction.object.material.linewidth).toBe(1.75);
    expect(solid.silhouette.object.material.resolution.toArray()).toEqual([1280, 720]);
    expect(solid.silhouette.object.material.depthTest).toBe(true);
  });

  it('uses flat inspection without shadows or construction detail', () => {
    const { roots, spike } = fixture(true);
    for (const id of SPIKE_DEVICES) expect(roots.get(id)!.getObjectByName('ContactShadow')!.visible).toBe(false);
    for (const solid of spike.solids) expect(solid.construction.object.visible).toBe(false);
  });
});
