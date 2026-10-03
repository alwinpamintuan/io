import { BoxGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import type { Camera } from 'three';
import type { DeviceId } from '../../app/state';
import { createContactShadow } from '../contactShadow';
import { GraphicLines } from '../lines';
import { GraphicSolid } from './primitives';
import type { Materials } from './primitives';
import { createRendererSpike } from './rendererSpike';
import type { SpikeOptions } from './rendererSpike';
import { authoredPart } from './authored';

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
  roots.get('mouse')!.position.set(29,-15,0);
  const detailGroups = new Map<DeviceId, Group>();
  const detailLines: GraphicLines[] = [];
  function detail(id: DeviceId, points: Vector3[]) {
    let group = detailGroups.get(id);
    if (!group) { group = new Group(); group.name = 'FocusDetail'; visuals.get(id)!.add(group); detailGroups.set(id, group); }
    const line = new GraphicLines('detail', points); group.add(line.object); detailLines.push(line); owned.push(line);
    return line;
  }

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
  function part(parent: Object3D, name: string, x=0, y=0, z=0, frontal=false) {
    const solid=authoredPart(name,materials,options.flat);solid.object.position.set(x,y,z);
    if(frontal) solid.object.rotation.x=Math.PI/2;
    parent.add(solid.object);solids.push(solid);return solid;
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
  hit('monitor', visuals.get('monitor')!, new Vector3(54, 2, 30.8), new Vector3(0, 0, 26.6));

  // Both cabinets flank the lowered display in one rear desk band.
  const audio = setup('audio', new Vector3(), 0, new Vector3(-35, 3, 10));
  const drivers: Object3D[] = [];
  for (const [x, y, yaw] of [[-35, 7, 1], [28, 9, -2]]) {
    const cabinet = new Group(); cabinet.position.set(x!, y!, 0); cabinet.rotation.z = MathUtils.degToRad(yaw!);
    audio.visual.add(cabinet);
    part(cabinet,'speaker.base');
    part(cabinet,'speaker.cabinet',0,0,.15);
    part(cabinet,'speaker.baffle',0,-3.76,9.4,true);
    const driver=part(cabinet,'speaker.woofer',0,-3.9,7.1,true);
    part(driver.object,'speaker.woofer_center',0,0,.23);
    drivers.push(driver.object);
    part(cabinet,'speaker.tweeter',0,-3.9,14.7,true);
    part(cabinet,'speaker.led',3,-3.9,1,true);
    shadow(audio.root, 8.7, 8.7, false, x, y);
    hit('audio', cabinet, new Vector3(10, 10, 19), new Vector3(0, 0, 9.5));
  }

  const controller = setup('controller', new Vector3(-24, -24, 0), -17, new Vector3(0, 0, 4));
  const shell = authoredPart('controller.shell', materials, options.flat);
  shell.object.name = 'ControllerShell'; controller.visual.add(shell.object); solids.push(shell);
  for (const x of [-5.4, 5.4]) {
    shadow(controller.root, 5, 7, true, x, -2);
  }
  const sticks: Object3D[] = [];
  const buttons = new Map<number, GraphicSolid>();
  function controllerPart(name: string, x: number, y: number, z: number) {
    const part = authoredPart('controller.' + name, materials, options.flat);
    part.object.position.set(x,y,z + .6); controller.visual.add(part.object); solids.push(part); return part;
  }
  for (const x of [-2.7, 2.7]) {
    controllerPart('stick_well',x,-1,1.81);
    const stick = controllerPart('stick',x,-1,1.96);
    buttons.set(x < 0 ? 10 : 11,stick); sticks.push(stick.object);
  }
  for (const [index,x,y] of [[0,5.5,.4],[1,6.6,1.5],[2,4.4,1.5],[3,5.5,2.6],
    [12,-5.5,2.4],[13,-5.5,.6],[14,-6.4,1.5],[15,-4.6,1.5],
    [8,-1,2.8],[9,1,2.8],[16,0,3.9]]) {
    buttons.set(index!,controllerPart(index! < 4 ? 'face_button' : index! < 12 || index === 16 ? 'menu' : 'dpad',x!,y!,1.81));
  }
  for (const [index,x] of [[4,-5],[5,5],[6,-5],[7,5]]) {
    const trigger = index! >= 6;
    const part = controllerPart(trigger ? 'trigger' : 'shoulder',x!,trigger ? 4.65 : 3.95,trigger ? 1.05 : 1.75);
    buttons.set(index!,part);
  }
  const buttonRest = new Map([...buttons].map(([index, part]) => [index, part.object.position.clone()]));
  hit('controller', controller.visual, new Vector3(18, 14, 6), new Vector3(0, 0, 3));

  const mic = setup('microphone', new Vector3(35, -4, 0), 0, new Vector3(0, 0, 8));
  part(mic.visual,'microphone.base');part(mic.visual,'microphone.stem',0,0,.45);
  part(mic.visual,'microphone.capsule',0,0,4.55);part(mic.visual,'microphone.collar',0,0,4.65);
  const micEffect = new Object3D(); micEffect.name = 'effectAnchor'; micEffect.position.set(0, -1.42, 9); mic.visual.add(micEffect); anchors.push(micEffect);
  shadow(mic.root, 5.2, 5.2, true); hit('microphone', mic.visual, new Vector3(6, 6, 13), new Vector3(0, 0, 6.5));
  for(let z=6;z<10.8;z+=.45) detail('microphone',[new Vector3(-1,-1.42,z),new Vector3(1,-1.42,z)]);

  // A mount anchor, rather than a second global transform, owns the webcam.
  const mount = roots.get('monitor')!.getObjectByName('webcamMount')!;
  const webcam = setup('camera', new Vector3(), 0, new Vector3(0, -2, 2.1));
  mount.add(webcam.root);
  part(webcam.visual,'webcam.mount',0,0,-.4);
  part(webcam.visual,'webcam.hinge',0,0,0);
  part(webcam.visual,'webcam.housing',0,.65,2.25,true);
  const lens=part(webcam.visual,'webcam.lens_outer',0,-1.02,2.25,true);
  part(lens.object,'webcam.lens_ring',0,0,.26);
  part(lens.object,'webcam.lens_center',0,0,.41);
  hit('camera', webcam.visual, new Vector3(10, 4.5, 5), new Vector3(0, 0, 2.1));
  const cameraStatus = new GraphicLines('construction'); webcam.visual.add(cameraStatus.object); owned.push(cameraStatus);

  // Test surfaces occupy the display and lens in the very same world.
  const screenGeometry = new PlaneGeometry(52.15, 28.95);
  const screenMaterial = new MeshBasicMaterial({ color: 0xfcfcf8 });
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, -.82, 26.6); screen.rotation.x = Math.PI / 2;
  visuals.get('monitor')!.add(screen); owned.push(screenGeometry, screenMaterial);
  // One partial grid and a small calibration reticle, physically on the display.
  // Test patterns hide this group so solid-field inspection stays undecorated.
  const screenIdentity = new Group(); screenIdentity.name = 'ScreenIdentity';
  screen.add(screenIdentity);
  const gridPoints: Vector3[] = [];
  for (let x = -9; x <= 9; x += 3) gridPoints.push(new Vector3(x,-6,.006),new Vector3(x,6,.006));
  for (let y = -6; y <= 6; y += 3) gridPoints.push(new Vector3(-9,y,.006),new Vector3(9,y,.006));
  const grid = new GraphicLines('detail', gridPoints);
  grid.object.material.transparent = true; grid.object.material.opacity = .26;
  const circle = Array.from({length:64},(_,i)=>new Vector3(Math.cos(i/64*Math.PI*2)*3.8,Math.sin(i/64*Math.PI*2)*3.8,.008));
  const reticle = new GraphicLines('detail', [
    ...circle.flatMap((p,i)=>[p,circle[(i+1)%circle.length]!]),
    new Vector3(-1,0,.008),new Vector3(1,0,.008),new Vector3(0,-1,.008),new Vector3(0,1,.008),
    ...[-1,1].flatMap(sign=>[new Vector3(sign*21,-.6,.008),new Vector3(sign*21,.6,.008)]),
  ]);
  reticle.object.material.transparent = true; reticle.object.material.opacity = .48;
  screenIdentity.add(grid.object,reticle.object); detailLines.push(grid,reticle); owned.push(grid,reticle);
  screenIdentity.visible = !options.flat;
  const mouseButtons = spike.mouseButtons;
  const mouseRest = mouseButtons.map((part) => part.object.position.clone());
  const mouseWheel = spike.mouseWheel;
  const tread=detail('mouse', Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return [new Vector3(-.28,Math.cos(a)*.98,Math.sin(a)*.98),new Vector3(.28,Math.cos(a)*.98,Math.sin(a)*.98)];}).flat());
  mouseWheel.add(detailGroups.get('mouse')!);tread.object.material.color.set(0xfcfcf8);
  const labelPositions: Record<DeviceId, Vector3> = {
    keyboard: new Vector3(22, -6, 3), mouse: new Vector3(3.6, 0, 3), monitor: new Vector3(30.5, -2.1, 11),
    camera: new Vector3(4.5, -1.1, 2.25), controller: new Vector3(8, 0, 3), audio: new Vector3(-31, 3.2, 7), microphone: new Vector3(2.3, -1.9, 9),
  };
  for (const [id, root] of roots) {
    const labelAnchor = new Object3D(); labelAnchor.name = 'labelAnchor'; labelAnchor.position.copy(labelPositions[id]);
    root.getObjectByName('Anchors')!.add(labelAnchor); anchors.push(labelAnchor);
  }

  return {
    solids, anchors, hitTargets, visuals, screen, screenIdentity, drivers, sticks, buttons, buttonRest, mouseButtons, mouseRest, mouseWheel, micEffect, cameraLens: lens.object, cameraStatus, detailGroups,
    update(camera: Camera) {
      spike.update(camera);
      for (const solid of solids.slice(spike.solids.length)) solid.updateLines(camera, false);
      for (const root of roots.values()) {
        const lift = visuals.get(root.userData.device as DeviceId)?.position.z ?? root.getObjectByName('VisualRoot')?.position.z ?? 0;
        root.children.filter((child) => child.name === 'ContactShadow').forEach((child) => {
          const mat = (child as Mesh).material;
          if ('uniforms' in mat) {
            const shader = mat as import('three').ShaderMaterial;
            shader.uniforms.opacity!.value = 0.12 / (1 + lift * 0.22);
            shader.uniforms.fringe!.value = 0.22 + Math.min(lift,3) * 0.06;
          }
        });
      }
    },
    resize(width: number, height: number) {
      spike.resize(width, height);
      cameraStatus.resize(width, height);
      detailLines.forEach((line) => line.resize(width, height));
      for (const solid of solids.slice(spike.solids.length)) solid.resize(width, height);
    },
    dispose() {
      spike.dispose();
      for (const solid of solids.slice(spike.solids.length)) solid.dispose();
      shadows.forEach((item) => item.dispose()); owned.forEach((item) => item.dispose());
    },
  };
}
