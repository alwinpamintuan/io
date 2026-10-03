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
    // Round 2 §4/15: calm outer margins, coherent internal density.
    expect(occupancy).toBeGreaterThan(0.5);
    expect(occupancy).toBeLessThanOrEqual(0.7);
    const height = (Math.max(...projected.map(point => point.y)) - Math.min(...projected.map(point => point.y))) / 2;
    expect(height).toBeGreaterThan(.55); expect(height).toBeLessThan(.72);
    expect(Math.max(...projected.map(point => Math.abs(point.y)))).toBeLessThan(.8);
    const speakerPositions = station.drivers.map(driver => driver.getWorldPosition(new Vector3()));
    expect(speakerPositions[0]!.z).toBe(speakerPositions[1]!.z);
    expect(Math.abs(speakerPositions[0]!.y - speakerPositions[1]!.y)).toBeLessThan(3);
    const stem = station.solids.find(solid => solid.object.name === 'monitor.stem')!;
    expect(new Box3().setFromObject(stem.mesh).max.z).toBeLessThan(12);
    const panel = station.solids.find(solid => solid.object.name === 'monitor.panel')!;
    expect(new Box3().setFromObject(panel.mesh).min.z).toBeCloseTo(11.2, 1);
    const shell = station.solids.find(solid => solid.mesh.name === 'controller.shell')!;
    expect(new Box3().setFromObject(shell.mesh).max.z).toBeCloseTo(2.4);
    const leftDriver = station.drivers[0]!.getWorldPosition(new Vector3());
    const monitor = new Box3().setFromObject(station.visuals.get('monitor')!);
    expect(monitor.min.x - leftDriver.x).toBeGreaterThan(0);
    expect(monitor.min.x - leftDriver.x).toBeLessThan(2 * 8.5);
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
