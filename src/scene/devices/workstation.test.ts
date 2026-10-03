import { describe, expect, it } from 'vitest';
import { Box3, Group, Vector3 } from 'three';
import { DEVICE_IDS } from '../../app/state';
import { CameraRig } from '../CameraRig';
import { focusPose } from '../focus';
import { createMaterials } from '../materials';
import { createWorkstation } from './workstation';

describe('persistent workstation', () => {
  it('provides every device, keeps webcam parented, grounds support, and retains identity', () => {
    const roots = new Map(DEVICE_IDS.map((id) => [id, new Group()]));
    const world = new Group(); roots.forEach((root) => world.add(root));
    const materials = createMaterials();
    const station = createWorkstation(roots, materials, { flat: false, noShadow: false });
    world.updateMatrixWorld(true);
    expect(roots.get('camera')!.parent!.name).toBe('webcamMount');
    for (const id of DEVICE_IDS) {
      expect(station.visuals.get(id)).toBeTruthy();
      expect(station.hitTargets.some((hit) => hit.userData.device === id)).toBe(true);
      if (id !== 'camera') expect(roots.get(id)!.getObjectByName('support')!.getWorldPosition(new Vector3()).z).toBe(0);
    }
    const rig = new CameraRig(); rig.resize(1440, 900);
    const projected = station.solids.flatMap((solid) => {
      const attribute = solid.mesh.geometry.getAttribute('position');
      return Array.from({ length: attribute.count }, (_, i) => solid.mesh.localToWorld(new Vector3().fromBufferAttribute(attribute, i)).project(rig.camera));
    });
    const occupancy = (Math.max(...projected.map((point) => point.x)) - Math.min(...projected.map((point) => point.x))) / 2;
    expect(occupancy).toBeGreaterThanOrEqual(0.66); expect(occupancy).toBeLessThanOrEqual(0.74);
    const keyboard = station.visuals.get('keyboard')!;
    const rest = rig.snapshot();
    rig.interpolate(rest, focusPose('keyboard', new Vector3(0, -14, 4.5), 1.6), 1);
    expect(station.visuals.get('keyboard')).toBe(keyboard);
    rig.interpolate(rig.snapshot(), rest, 1);
    expect(rig.snapshot()).toEqual(rest);
    expect(new Box3().setFromObject(station.visuals.get('controller')!).min.z).toBeCloseTo(0);
    station.dispose(); Object.values(materials).forEach((material) => material.dispose());
  });
});
