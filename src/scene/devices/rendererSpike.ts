import { Group, MathUtils, Object3D, Vector3 } from 'three';
import type { Camera } from 'three';
import type { DeviceId } from '../../app/state';
import { createContactShadow } from '../contactShadow';
import { GraphicLines } from '../lines';
import { GraphicSolid, roundedRing } from './primitives';
import type { Materials } from './primitives';
import { authoredPart } from './authored';

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

  function part(parent: Group, name: string, position = new Vector3()) {
    const model = authoredPart(name, materials, options.flat); model.object.position.copy(position);
    parent.add(model.object); solids.push(model); return model;
  }

  function shadow(root: Group, width: number, depth: number, radius: number, opacity: number, ellipse = false) {
    const contact = createContactShadow(width, depth, radius, opacity, ellipse);
    contact.object.visible = !options.noShadow && !options.flat;
    root.add(contact.object); // Sibling of VisualRoot: lifts can never move it off the desk.
    shadows.push(contact);
  }

  // Baseline Y=26 leaves a projected gap at the specified camera elevation.
  // Y=1.5 makes the keyboard slightly occlude the stand without screen-space nudges.
  const monitor = setup('monitor', new Vector3(-3, -1, 0), 0, new Vector3(0, 0, 26.6));
  part(monitor.visual, 'monitor.foot');
  part(monitor.visual, 'monitor.stem', new Vector3(0, 1, .7));
  part(monitor.visual, 'monitor.junction', new Vector3(0, 1.85, 11.2));
  const panel = part(monitor.visual, 'monitor.panel', new Vector3(0, .7, 26.6));
  panel.object.rotation.x = Math.PI / 2;
  const display = part(panel.object, 'monitor.display', new Vector3(0, 0, 1.465));
  const bezel = new GraphicLines('construction'); bezel.object.userData.authoredSeam = 'monitor bezel';
  const ring = roundedRing(52.2, 29, .3, 1.57);
  bezel.setPoints(ring.flatMap((point, i) => [point, ring[(i + 1) % ring.length]!]));
  panel.object.add(bezel.object); lines.push(bezel);
  part(panel.object,'monitor.power',new Vector3(25.9,-14.7,1.48));
  const mount = new Object3D(); mount.name = 'webcamMount'; mount.position.set(5, .5, 42.3);
  monitor.root.getObjectByName('Anchors')!.add(mount); anchors.push(mount);
  monitor.root.getObjectByName('cameraFocus')!.position.z = 26.6;
  shadow(monitor.root,21.1,11.1,.65,.14);

  const keyboard = setup('keyboard', new Vector3(0,-14,0),-4,new Vector3(0,0,1.7));
  part(keyboard.visual,'keyboard.chassis');
  const inset=roundedRing(41.5,11.8,.45,0);
  for(const point of inset) point.z=1.48+point.y/14.5*.5;
  const topPlate=new GraphicLines('construction',inset.flatMap((point,i)=>[point,inset[(i+1)%inset.length]!]));
  keyboard.visual.add(topPlate.object);lines.push(topPlate);
  shadow(keyboard.root,44.1,14.6,.75,.12);

  const mouse = setup('mouse', new Vector3(31, -13, 0), 4, new Vector3(0, 0, 3));
  const mouseButtons: GraphicSolid[] = [];
  function mousePart(name: string, x = 0, y = 0, z = 0) {
    const part = authoredPart('mouse.' + name, materials, options.flat);
    part.object.position.set(x, y, z); mouse.visual.add(part.object); solids.push(part); return part;
  }
  mousePart('shell'); mousePart('underside');
  mouseButtons.push(mousePart('left_button'), mousePart('right_button'));
  mousePart('wheel_well', 0, 2.6, 2.85);
  const wheel = mousePart('wheel', 0, 2.6, 2.85);
  mouseButtons.push(mousePart('side_button_1'), mousePart('side_button_2'));
  shadow(mouse.root, 7.2, 12, 0, 0.14, true);

  return {
    solids, anchors, mouseButtons, mouseWheel: wheel.object,
    update(camera: Camera) {
      for (const model of solids) model.updateLines(camera, false);
      // The inset front plane needs no heavy duplicated silhouette.
      display.silhouette.object.visible = false;
      display.construction.object.visible = false;
      if (options.flat) { details.visible = false; }
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
