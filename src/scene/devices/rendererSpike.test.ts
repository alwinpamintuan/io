import { afterEach, describe, expect, it } from 'vitest';
import { Group, Raycaster, Vector3 } from 'three';
import { DEVICE_IDS } from '../../app/state';
import { createMaterials } from '../materials';
import { createRendererSpike } from './rendererSpike';

const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0)) dispose(); });

function fixture() {
  const roots = new Map(DEVICE_IDS.map((id) => [id, new Group()]));
  const world = new Group();
  for (const root of roots.values()) world.add(root);
  const materials = createMaterials();
  const spike = createRendererSpike(roots, materials, { flat: false, noShadow: false });
  world.updateMatrixWorld(true);
  cleanup.push(() => { spike.dispose(); Object.values(materials).forEach((material) => material.dispose()); });
  return { world, spike };
}

describe('mouse control visibility', () => {
  it('keeps both primary button skins above their recess floors throughout press travel', () => {
    const { spike, world } = fixture();
    const shell = spike.solids.find(solid => solid.object.name === 'mouse.shell')!;
    for (const [index, x] of [[0, -1], [1, 1]]) {
      const button = spike.mouseButtons[index!]!;
      const ray = new Raycaster(new Vector3(x!, 2, 10), new Vector3(0, 0, -1));
      // Transform the local ray into the actual canonical mouse pose.
      ray.ray.applyMatrix4(button.object.parent!.matrixWorld);
      const resting = ray.intersectObjects([shell.mesh, button.mesh], false);
      expect(resting[0]!.object).toBe(button.mesh);
      expect(resting[1]!.object).toBe(shell.mesh);
      button.object.position.z -= .08; world.updateMatrixWorld(true);
      const pressed = ray.intersectObjects([shell.mesh, button.mesh], false);
      expect(pressed[0]!.object).toBe(button.mesh);
      expect(pressed[0]!.point.z - pressed[1]!.point.z).toBeGreaterThan(0);
    }
  });
  it('keeps the shallow side controls attached and visible while pressing into the shell', () => {
    const { spike, world } = fixture();
    const meshes = spike.solids.filter(solid => solid.mesh.name.startsWith('mouse.')).map(solid => solid.mesh);
    for (const [index,y,z] of [[2,.6,1.9],[3,2.3,1.75]]) {
      const button = spike.mouseButtons[index!]!;
      for (const travel of [0,.035]) {
        button.object.position.x = travel;world.updateMatrixWorld(true);
        for (const offset of [-.3,0,.3]) {
          const ray = new Raycaster(new Vector3(-10,y!+offset,z!),new Vector3(1,0,0));
          ray.ray.applyMatrix4(button.object.parent!.matrixWorld);
          expect(ray.intersectObjects(meshes,false)[0]!.object.name, `side ${index}, travel ${travel}, sample ${offset}`).toBe(button.mesh.name);
        }
      }
    }
  });
});
