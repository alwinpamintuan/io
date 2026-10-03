import { Group, MathUtils, Object3D, Vector3 } from 'three';
import type { Camera } from 'three';
import type { DeviceId } from '../../app/state';
import { createContactShadow } from '../contactShadow';
import { GraphicLines } from '../lines';
import { GraphicSolid, loft, roundedRing, slab } from './primitives';
import type { Materials } from './primitives';

export const SPIKE_DEVICES = ['monitor', 'keyboard', 'mouse'] as const;

export interface SpikeOptions { readonly flat: boolean; readonly noShadow: boolean }

export function createRendererSpike(roots: Map<DeviceId, Group>, materials: Materials, options: SpikeOptions) {
  const solids: GraphicSolid[] = [];
  const lines: GraphicLines[] = [];
  const shadows: ReturnType<typeof createContactShadow>[] = [];
  const details = new Group();
  const anchors: Object3D[] = [];

  function setup(device: (typeof SPIKE_DEVICES)[number], position: Vector3, yaw: number, focus: Vector3) {
    const root = roots.get(device)!;
    root.position.copy(position);
    root.rotation.z = MathUtils.degToRad(yaw);
    const visual = new Group();
    visual.name = 'VisualRoot';
    const anchorGroup = new Group();
    anchorGroup.name = 'Anchors';
    const support = new Object3D();
    support.name = 'support';
    const cameraFocus = new Object3D();
    cameraFocus.name = 'cameraFocus';
    cameraFocus.position.copy(focus);
    anchorGroup.add(support, cameraFocus);
    anchors.push(support, cameraFocus);
    root.add(visual, anchorGroup);
    return { root, visual };
  }

  function addSlab(parent: Group, width: number, depth: number, height: number, radius: number, position = new Vector3()) {
    const model = new GraphicSolid(slab(width, depth, height, radius, materials), materials.paper, options.flat);
    model.object.position.copy(position);
    parent.add(model.object);
    solids.push(model);
    return model;
  }

  function shadow(root: Group, width: number, depth: number, radius: number, opacity: number, ellipse = false) {
    const contact = createContactShadow(width, depth, radius, opacity, ellipse);
    contact.object.visible = !options.noShadow && !options.flat;
    root.add(contact.object); // Sibling of VisualRoot: lifts can never move it off the desk.
    shadows.push(contact);
  }

  // Baseline Y=26 leaves a projected gap at the specified camera elevation.
  // Y=1.5 makes the keyboard slightly occlude the stand without screen-space nudges.
  const monitor = setup('monitor', new Vector3(-3, 1.5, 0), 0, new Vector3(0, 0, 42.5));
  addSlab(monitor.visual, 23, 14, 1.6, 0.7);
  addSlab(monitor.visual, 5, 5, 25, 0.3, new Vector3(0, 1, 1.6));
  const panel = addSlab(monitor.visual, 61, 35, 4, 0.8, new Vector3(0, 2, 42.5));
  // Panel local XY is the screen plane; its depth points toward the viewer (-Y).
  panel.object.rotation.x = Math.PI / 2;
  const display = addSlab(panel.object, 57.4, 31.4, 0.04, 0.45, new Vector3(0, 0, 4.015));
  // Display border is a construction edge, rather than another external silhouette.
  const bezel = new GraphicLines('construction');
  const ring = roundedRing(57.4, 31.4, 0.45, 4.07);
  bezel.setPoints(ring.flatMap((point, i) => [point, ring[(i + 1) % ring.length]!]));
  panel.object.add(bezel.object);
  lines.push(bezel);
  const mount = new Object3D();
  mount.name = 'webcamMount';
  mount.position.set(7, 0, 61.3);
  monitor.root.getObjectByName('Anchors')!.add(mount);
  anchors.push(mount);
  shadow(monitor.root, 23.2, 14.2, 0.8, 0.14);

  const keyboard = setup('keyboard', new Vector3(0, -14, 0), -4, new Vector3(0, 0, 2.5));
  const top = roundedRing(44, 14.5, 1.1, 0);
  for (const point of top) point.z = 2.4 + point.y / 14.5 * 0.8;
  const chassis = new GraphicSolid(loft([roundedRing(44, 14.5, 1.1, 0), top], materials), materials.paper, options.flat);
  keyboard.visual.add(chassis.object);
  solids.push(chassis);
  const inset = roundedRing(41.5, 11.8, 0.65, 0);
  for (const point of inset) point.z = 2.42 + point.y / 14.5 * 0.8;
  const topPlate = new GraphicLines('construction', inset.flatMap((point, i) => [point, inset[(i + 1) % inset.length]!]));
  keyboard.visual.add(topPlate.object);
  lines.push(topPlate);
  shadow(keyboard.root, 44.2, 14.7, 1.2, 0.12);

  const mouse = setup('mouse', new Vector3(31, -13, 0), 4, new Vector3(0, 0, 3));
  const ellipseRing = (width: number, depth: number, z: number, offset = 0): Vector3[] =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = i / 16 * Math.PI * 2;
      return new Vector3(width / 2 * Math.cos(angle), depth / 2 * Math.sin(angle) + offset, z);
    });
  const shell = new GraphicSolid(loft([
    ellipseRing(6.9, 11.7, 0), ellipseRing(7.2, 12, 1.1),
    ellipseRing(5.8, 9.4, 3.3, 0.5), ellipseRing(2.7, 4.4, 4.2, 0.7),
  ], materials), materials.paper, options.flat);
  mouse.visual.add(shell.object);
  solids.push(shell);
  // A single shallow wheel marker keeps this a primitive, without modeled buttons.
  const wheel = addSlab(mouse.visual, 0.6, 1.6, 0.15, 0.2, new Vector3(0, -0.2, 4.2));
  wheel.mesh.material = options.flat ? materials.paper : materials.ink;
  details.add(wheel.object);
  mouse.visual.add(details);
  shadow(mouse.root, 7.2, 12, 0, 0.14, true);

  return {
    solids, anchors,
    update(camera: Camera) {
      for (const model of solids) model.updateLines(camera, options.flat);
      // The inset front plane needs no heavy duplicated silhouette.
      display.silhouette.object.visible = false;
      display.construction.object.visible = false;
      if (options.flat) { bezel.object.visible = false; topPlate.object.visible = false; details.visible = false; }
    },
    resize(width: number, height: number) {
      for (const model of solids) model.resize(width, height);
      for (const line of lines) line.resize(width, height);
    },
    dispose() {
      for (const model of solids) model.dispose();
      for (const line of lines) line.dispose();
      for (const contact of shadows) contact.dispose();
    },
  };
}
