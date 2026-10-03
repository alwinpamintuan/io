import { BoxGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import type { Camera } from 'three';
import type { DeviceId } from '../../app/state';
import { createContactShadow } from '../contactShadow';
import { GraphicLines } from '../lines';
import { GraphicSolid, slab } from './primitives';
import type { Materials } from './primitives';
import { createRendererSpike } from './rendererSpike';
import type { SpikeOptions } from './rendererSpike';

/** Persistent workstation. Canonical roots never move during navigation. */
export function createWorkstation(roots: Map<DeviceId, Group>, materials: Materials, options: SpikeOptions) {
  const spike = createRendererSpike(roots, materials, options);
  const solids = [...spike.solids];
  const shadows: ReturnType<typeof createContactShadow>[] = [];
  const owned: { dispose(): void }[] = [];
  const anchors = [...spike.anchors];
  const hitTargets: Mesh[] = [];
  const visuals = new Map<DeviceId, Object3D>();
  for (const id of ['keyboard', 'mouse', 'monitor'] as const) visuals.set(id, roots.get(id)!.getObjectByName('VisualRoot')!);
  // A wider physical desk composition meets the reference occupancy target.
  roots.get('mouse')!.position.x = 60;

  function setup(id: DeviceId, position: Vector3, yaw: number, focus: Vector3) {
    const root = roots.get(id)!;
    root.position.copy(position);
    root.rotation.z = MathUtils.degToRad(yaw);
    const visual = new Group(); visual.name = 'VisualRoot';
    const anchorGroup = new Group(); anchorGroup.name = 'Anchors';
    const support = new Object3D(); support.name = 'support';
    const cameraFocus = new Object3D(); cameraFocus.name = 'cameraFocus'; cameraFocus.position.copy(focus);
    anchorGroup.add(support, cameraFocus); root.add(visual, anchorGroup);
    anchors.push(support, cameraFocus); visuals.set(id, visual);
    return { root, visual };
  }
  function body(parent: Object3D, w: number, d: number, h: number, r: number, x = 0, y = 0, z = 0, frontPaper = false) {
    const shape = slab(w, d, h, r, materials);
    if (frontPaper) for (let i = 2; i < shape.faces.length; i++) {
      const face = shape.faces[i]!; const a = shape.vertices[face.indices[0]!]!; const b = shape.vertices[face.indices[1]!]!;
      if (b.x - a.x > 0.01 && Math.abs(b.y - a.y) < Math.abs(b.x - a.x)) shape.faces[i] = { ...face, material: materials.paper };
    }
    const solid = new GraphicSolid(shape, materials.paper, options.flat);
    solid.object.position.set(x, y, z); parent.add(solid.object); solids.push(solid); return solid;
  }
  function shadow(root: Group, w: number, d: number, ellipse = false, x = 0, y = 0) {
    const contact = createContactShadow(w, d, 0.5, 0.12, ellipse);
    contact.object.visible = !options.flat && !options.noShadow;
    contact.object.position.set(x, y, 0.015); root.add(contact.object); shadows.push(contact);
  }
  function hit(id: DeviceId, parent: Object3D, size: Vector3, center: Vector3) {
    const geometry = new BoxGeometry(size.x, size.y, size.z);
    const material = new MeshBasicMaterial({ visible: false });
    const mesh = new Mesh(geometry, material); mesh.position.copy(center);
    mesh.name = `${id}:HitTarget`; mesh.userData.device = id; parent.add(mesh);
    hitTargets.push(mesh); owned.push(geometry, material);
  }
  hit('keyboard', visuals.get('keyboard')!, new Vector3(45, 15.5, 4), new Vector3(0, 0, 2));
  hit('mouse', visuals.get('mouse')!, new Vector3(8.5, 13, 5), new Vector3(0, 0, 2.5));
  hit('monitor', visuals.get('monitor')!, new Vector3(61, 4.5, 35), new Vector3(0, 0, 42.5));

  // Speaker bases stay on the common desk. The right cabinet crosses the panel.
  const audio = setup('audio', new Vector3(), 0, new Vector3(-60, 12, 10));
  const drivers: Object3D[] = [];
  for (const [x, y, yaw] of [[-60, 13, 1], [27, 16, -2]]) {
    const cabinet = new Group(); cabinet.position.set(x!, y!, 0); cabinet.rotation.z = MathUtils.degToRad(yaw!);
    audio.visual.add(cabinet);
    body(cabinet, 8.5, 8.5, 18.5, 0.35, 0, 0, 0, true);
    for (const [radius, z] of [[2.8, 7], [1.25, 14.5]]) {
      const driver = body(cabinet, radius! * 2, radius! * 2, 0.25, radius!, 0, -4.3, z!);
      driver.object.rotation.x = Math.PI / 2;
      driver.mesh.material = options.flat ? materials.paper : materials.sideDeep;
      if (radius === 2.8) drivers.push(driver.object);
    }
    shadow(audio.root, 8.7, 8.7, false, x, y);
    hit('audio', cabinet, new Vector3(10, 10, 19), new Vector3(0, 0, 9.5));
  }

  const controller = setup('controller', new Vector3(-29, -20, 0), -17, new Vector3(0, 0, 4));
  // Two rounded, tapered grips and bridge provide actual shell depth.
  body(controller.visual, 13, 6.5, 4, 2, 0, 1, 1);
  for (const x of [-5.4, 5.4]) {
    const grip = body(controller.visual, 5.7, 10.5, 4, 2.6, x, -1.4, 0);
    grip.object.rotation.z = MathUtils.degToRad(x < 0 ? -14 : 14);
    shadow(controller.root, 5, 7, true, x, -2);
  }
  const sticks: Object3D[] = [];
  const buttons = new Map<number, GraphicSolid>();
  for (const x of [-2.7, 2.7]) {
    body(controller.visual, 3.4, 3.4, 0.35, 1.7, x, -1, 4.9).mesh.material = materials.sideDeep;
    const stick = body(controller.visual, 2.5, 2.5, 0.55, 1.25, x, -1, 5.25);
    buttons.set(x < 0 ? 10 : 11, stick);
    sticks.push(stick.object);
  }
  for (const [index, x, y] of [[0, 5.5, 0.4], [1, 6.6, 1.5], [2, 4.4, 1.5], [3, 5.5, 2.6],
    [12, -5.5, 2.7], [13, -5.5, 0.3], [14, -6.7, 1.5], [15, -4.3, 1.5],
    [8, -1, 2.8], [9, 1, 2.8], [16, 0, 3.9], [4, -5, 4.1], [5, 5, 4.1], [6, -5, 5.3], [7, 5, 5.3]]) {
    buttons.set(index!, body(controller.visual, index! >= 4 && index! <= 7 ? 2.4 : 0.9, 0.9, 0.45, 0.3, x, y, 5));
  }
  hit('controller', controller.visual, new Vector3(18, 12, 6), new Vector3(0, 0, 3));

  // A mount anchor, rather than a second global transform, owns the webcam.
  const mount = roots.get('monitor')!.getObjectByName('webcamMount')!;
  const webcam = setup('camera', new Vector3(), 0, new Vector3(0, -2, 2.1));
  mount.add(webcam.root);
  body(webcam.visual, 3.5, 4, 1.5, 0.3, 0, 1, -1.3);
  body(webcam.visual, 9, 3.6, 4.2, 0.6, 0, 0, 0, true);
  const lens = body(webcam.visual, 3.2, 3.2, 0.3, 1.6, 0, -1.85, 2.1);
  lens.object.rotation.x = Math.PI / 2; lens.mesh.material = options.flat ? materials.paper : materials.ink;
  const inner = body(lens.object, 2.5, 2.5, 0.08, 1.25, 0, 0, 0.32);
  inner.mesh.material = options.flat ? materials.paper : materials.sideDeep;
  hit('camera', webcam.visual, new Vector3(10, 4.5, 5), new Vector3(0, 0, 2.1));
  const cameraStatus = new GraphicLines('construction'); webcam.visual.add(cameraStatus.object); owned.push(cameraStatus);

  // Test surfaces occupy the display and lens in the very same world.
  const screenGeometry = new PlaneGeometry(57.2, 31.2);
  const screenMaterial = new MeshBasicMaterial({ color: 0xf4f4f0 });
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, -2.061, 42.5); screen.rotation.x = Math.PI / 2;
  visuals.get('monitor')!.add(screen); owned.push(screenGeometry, screenMaterial);
  const videoGeometry = new PlaneGeometry(2.4, 1.5);
  const videoMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const video = new Mesh(videoGeometry, videoMaterial);
  video.position.set(0, -2.3, 2.1); video.rotation.x = Math.PI / 2; video.visible = false;
  webcam.visual.add(video); owned.push(videoGeometry, videoMaterial);

  const mouseButtons = [-1.45, 1.45].map((x) => body(visuals.get('mouse')!, 2.5, 3.4, 0.3, 0.45, x, -2, 3.45));
  const mouseWheel = spike.solids.at(-1)!.object;
  const labelPositions: Record<DeviceId, Vector3> = {
    keyboard: new Vector3(22, -6, 3), mouse: new Vector3(3.6, 0, 3), monitor: new Vector3(30.5, -2.1, 25),
    camera: new Vector3(4.5, -1.8, 2.1), controller: new Vector3(8, 0, 4), audio: new Vector3(-55.5, 8.5, 7),
  };
  for (const [id, root] of roots) {
    const labelAnchor = new Object3D(); labelAnchor.name = 'labelAnchor'; labelAnchor.position.copy(labelPositions[id]);
    root.getObjectByName('Anchors')!.add(labelAnchor); anchors.push(labelAnchor);
  }

  return {
    solids, anchors, hitTargets, visuals, screen, video, drivers, sticks, buttons, mouseButtons, mouseWheel, cameraLens: lens.object, cameraStatus,
    update(camera: Camera) {
      spike.update(camera);
      for (const solid of solids.slice(spike.solids.length)) solid.updateLines(camera, options.flat);
      for (const root of roots.values()) {
        const lift = visuals.get(root.userData.device as DeviceId)?.position.z ?? root.getObjectByName('VisualRoot')?.position.z ?? 0;
        root.children.filter((child) => child.name === 'ContactShadow').forEach((child) => {
          const mat = (child as Mesh).material;
          if ('uniforms' in mat) {
            const shader = mat as import('three').ShaderMaterial;
            shader.uniforms.opacity!.value = 0.12 / (1 + lift * 0.22);
            shader.uniforms.fringe!.value = 0.55 + lift * 0.12;
          }
        });
      }
    },
    resize(width: number, height: number) {
      spike.resize(width, height);
      cameraStatus.resize(width, height);
      for (const solid of solids.slice(spike.solids.length)) solid.resize(width, height);
    },
    dispose() {
      spike.dispose();
      for (const solid of solids.slice(spike.solids.length)) solid.dispose();
      shadows.forEach((item) => item.dispose()); owned.forEach((item) => item.dispose());
    },
  };
}
