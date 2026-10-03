import { AxesHelper, Box3, Box3Helper, GridHelper, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { CameraRig } from './CameraRig';
import type { GraphicSolid } from './devices/primitives';

const FLAGS = {
  flat: ['debugFlat','Flat diagnostic'], silhouette: ['debugSilhouette','Black silhouettes'],
  noShadow: ['debugNoShadow','Disable shadows'], axes: ['debugAxes','World axes'],
  grid: ['debugGrid','Desk plane'], origins: ['debugOrigins','Device origins'],
  bounds: ['debugBounds','Device bounding boxes'], target: ['debugTarget','Camera target'],
  anchors: ['debugAnchors','Focus anchors'], hitTargets: ['debugHitTargets','Hit volumes'],
  contacts: ['debugContacts','Contact points'], outlines: ['debugOutlines','Outline classes'],
  receivers: ['debugReceivers','Shadow receivers'], camera: ['debugCamera','Camera pose'],
} as const;
export const NO_DEBUG = { flat:false, silhouette:false, noShadow:false, axes:false, grid:false, origins:false, bounds:false, target:false, anchors:false, hitTargets:false, contacts:false, outlines:false, receivers:false, camera:false };
export function readDebugOptions(search: string): typeof NO_DEBUG {
  const query=new URLSearchParams(search);
  return Object.fromEntries(Object.entries(FLAGS).map(([key,[flag]])=>[key,query.has(flag)])) as typeof NO_DEBUG;
}

export function createSceneDebug(options: typeof NO_DEBUG, solids: readonly GraphicSolid[], anchors: readonly Object3D[], rig: CameraRig) {
  const root=new Group();root.name='DevelopmentDebug';
  const tracked: { marker: Object3D; source: Object3D }[]=[];
  const boxes: { helper: Box3Helper; source: Object3D }[]=[];
  const deviceRoots=new Set<Object3D>();
  for(const solid of solids) {let object: Object3D|null=solid.object;while(object&&!object.name.endsWith(':DeviceRoot'))object=object.parent;if(object)deviceRoots.add(object);}
  if(options.axes) root.add(new AxesHelper(18));
  if(options.grid) {const grid=new GridHelper(140,28,0x777772,0xbabab5);grid.rotation.x=Math.PI/2;grid.position.z=.005;grid.material.transparent=true;grid.material.opacity=.25;grid.material.depthWrite=false;root.add(grid);}
  function mark(source: Object3D,color=0x555555) {
    const marker=new Mesh(new SphereGeometry(.45,12,8),new MeshBasicMaterial({color,depthTest:false}));
    tracked.push({marker,source});root.add(marker);
  }
  if(options.origins) deviceRoots.forEach(source=>mark(source));
  if(options.anchors) anchors.filter(a=>a.name==='cameraFocus'||a.name==='effectAnchor').forEach(source=>mark(source));
  if(options.contacts) deviceRoots.forEach(device=>device.children.filter(c=>c.name==='ContactShadow').forEach(source=>mark(source)));
  if(options.bounds) deviceRoots.forEach(source=>{const helper=new Box3Helper(new Box3(),0x777772);boxes.push({helper,source});root.add(helper);});
  let target: Mesh | null=null;
  if(options.target) {target=new Mesh(new SphereGeometry(.7,12,8),new MeshBasicMaterial({color:0x111111,depthTest:false}));root.add(target);}
  function outlineClasses() {
    let world: Object3D=solids[0]!.object;while(world.parent&&world.name!=='WorldRoot')world=world.parent;
    world.traverse(object=>{const role=object.userData.lineRole as string|undefined;if(role&&object instanceof Mesh&&!Array.isArray(object.material)&&'color' in object.material)(object.material as MeshBasicMaterial).color.set(role==='silhouette'?0x111111:role==='construction'?0x777777:0xbbbbbb);});
  }
  if(options.outlines) outlineClasses();
  if(options.receivers) deviceRoots.forEach(device=>device.children.filter(c=>c.name==='ContactShadow').forEach(source=>{const helper=new Box3Helper(new Box3(),0x555555);boxes.push({helper,source});root.add(helper);}));
  let output: HTMLOutputElement|null=null;
  if(options.camera){output=document.createElement('output');output.className='debug-camera';document.querySelector('#app')!.append(output);}
  let panel: HTMLElement|null=null;
  if(new URLSearchParams(window.location.search).has('debugVisual')) {
    panel=document.createElement('fieldset');panel.className='visual-debug';
    const legend=document.createElement('legend');legend.textContent='Visual inspection';panel.append(legend);
    Object.entries(FLAGS).forEach(([key,[flag,label]])=>{
      const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=options[key as keyof typeof FLAGS];
      input.addEventListener('change',()=>{const url=new URL(location.href);if(input.checked)url.searchParams.set(flag,'');else url.searchParams.delete(flag);location.href=url.href;});
      row.append(input,document.createTextNode(label));panel!.append(row);
    });document.querySelector('#app')!.append(panel);
  }
  return {root,update(){
    if(options.outlines) outlineClasses();
    tracked.forEach(({marker,source})=>marker.position.copy(source.getWorldPosition(new Vector3())));
    boxes.forEach(({helper,source})=>helper.box.setFromObject(source));
    const pose=rig.snapshot();target?.position.copy(pose.target);
    if(output)output.textContent=`camera ${pose.position.toArray().map(n=>n.toFixed(1)).join(', ')}\ntarget ${pose.target.toArray().map(n=>n.toFixed(1)).join(', ')}\nfov ${pose.fov.toFixed(1)}°`;
  },dispose(){
    const geometries=new Set<{dispose():void}>(),materials=new Set<{dispose():void}>();
    root.traverse(object=>{if('geometry' in object)geometries.add(object.geometry as {dispose():void});if('material' in object)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m as {dispose():void}));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());output?.remove();panel?.remove();root.clear();
  }};
}
