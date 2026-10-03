// Offline mesh authoring. Control-point surfaces are baked to glTF; the app never
// constructs these hero forms. Units: cm, +Y buttons/front, +Z desk normal.
import fs from 'node:fs';
import { ShapeUtils, Vector2 } from 'three';
const parts = [];
function loft(name, rings, topRole = 'paper') {
  const vertices = rings.flat(), n = rings[0].length;
  const triangles = ShapeUtils.triangulateShape(rings[0].map(p => new Vector2(p[0], p[1])), []);
  const faces = triangles.map(t => ({ indices: [...t].reverse(), role: 'sideDeep' }));
  faces.push(...triangles.map(t => ({ indices: t.map(i => vertices.length - n + i), role: topRole })));
  for(let k=0;k<rings.length-1;k++) for(let i=0;i<n;i++) {
    const j=(i+1)%n;
    faces.push({indices:[k*n+i,k*n+j,(k+1)*n+j,(k+1)*n+i],role:k===0?'sideDeep':'sideLight'});
  }
  parts.push({name, vertices, faces}); return parts.at(-1);
}
function ring(w,d,r,z,segments=12) {
  const out=[];
  for(let c=0;c<4;c++) for(let s=0;s<=segments;s++) {
    const a=c*Math.PI/2+s/segments*Math.PI/2;
    out.push([(c===0||c===3?1:-1)*(w/2-r)+r*Math.cos(a),(c<2?1:-1)*(d/2-r)+r*Math.sin(a),z]);
  } return out;
}
function bevel(name,w,d,h,r,role='paper') {
  const b=Math.min(h*.025,.08);
  return loft(name,[ring(w-2*b,d-2*b,Math.max(.01,r-b),0),ring(w,d,r,b),ring(w,d,r,h-b),ring(w-2*b,d-2*b,Math.max(.01,r-b),h)],role);
}
// Mouse: curved profile cage, narrowing nose and raised wrist-side arch.
const mouseRing=(z,scale)=>Array.from({length:96},(_,i)=>{
  const a=i/96*Math.PI*2,y=Math.sin(a);
  return [3.6*Math.cos(a)*(1-.12*Math.max(0,y))*scale,6*y*scale,z];
});
const mouseShell = loft('mouse.shell',[[.16,.91],[.45,1],...Array.from({length:28},(_,i)=>{const a=(i+1)/29*Math.PI/2;return [.6+3*Math.sin(a),Math.cos(a)];})].map(([z,s])=>mouseRing(z,s).map(([x,y,z])=>[x,y-.3,z])));
mouseShell.faces.forEach(f => { if(f.indices.some(i=>i>=96*3)) f.role='paper'; });
bevel('mouse.underside',6.6,11.4,.18,3.1,'sideDeep');
// Sample the baked crown triangles, not a second approximation of its taper.
const crownTriangles=mouseShell.faces.flatMap(face=>Array.from({length:face.indices.length-2},(_,i)=>[face.indices[0],face.indices[i+1],face.indices[i+2]].map(index=>mouseShell.vertices[index])));
function shellSideX(y,z) {
  const intersections=[];
  for(const [a,b,c] of crownTriangles) {
    const by=b[1]-a[1],bz=b[2]-a[2],cy=c[1]-a[1],cz=c[2]-a[2],det=by*cz-bz*cy;
    if(Math.abs(det)<1e-9)continue;
    const u=((y-a[1])*cz-(z-a[2])*cy)/det,v=(by*(z-a[2])-bz*(y-a[1]))/det;
    if(u>=-1e-6&&v>=-1e-6&&u+v<=1+1e-6)intersections.push(a[0]+u*(b[0]-a[0])+v*(c[0]-a[0]));
  }
  if(!intersections.length)throw Error(`Side button outside shell at ${y},${z}`);
  return Math.min(...intersections);
}
// Partition the actual crown into two flush, independently pressable skins.
// Their recesses leave travel room, so inversion never disappears into the shell.
function clip(polygon, axis, boundary, sign) {
  const inside=[], outside=[];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const da=sign*(a[axis]-boundary),db=sign*(b[axis]-boundary);
    (da>=0?inside:outside).push(a);
    if((da>=0)!==(db>=0)) {
      const t=da/(da-db),p=a.map((v,j)=>v+(b[j]-v)*t);
      inside.push(p);outside.push(p);
    }
  }
  return [inside,outside];
}
function polygonPart(name, polygons) {
  const vertices=[],faces=[],lookup=new Map();
  for(const {points,role} of polygons) {
    const indices=points.map(p=>{
      const key=p.map(v=>v.toFixed(5)).join(',');
      if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(p);}
      return lookup.get(key);
    }).filter((index,i,all)=>index!==all[(i+all.length-1)%all.length]);
    if(new Set(indices).size>=3) faces.push({indices,role});
  }
  return {name,vertices,faces};
}
let shellPolygons=mouseShell.faces.map(f=>({points:f.indices.map(i=>mouseShell.vertices[i]),role:f.role}));
for(const [name,side] of [['left_button',-1],['right_button',1]]) {
  const remaining=[],patches=[];
  for(const polygon of shellPolygons) {
    if(polygon.points.some(p=>p[2]<.45)){remaining.push(polygon);continue;}
    let candidate=polygon.points;
    for(const [axis,boundary,sign] of [[0,side*.1,side],[1,.45,1],[1,5.05,-1]]) {
      const [inside,outside]=clip(candidate,axis,boundary,sign);
      if(outside.length>=3)remaining.push({points:outside,role:polygon.role});
      candidate=inside;
      if(candidate.length<3)break;
    }
    if(candidate.length>=3) patches.push({points:candidate,role:'paper'});
  }
  const patch=polygonPart('mouse.'+name,patches);
  const edges=new Map();
  for(const face of patch.faces) for(let i=0;i<face.indices.length;i++) {
    const a=face.indices[i],b=face.indices[(i+1)%face.indices.length],key=[Math.min(a,b),Math.max(a,b)].join(':');
    const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
  }
  remaining.push(...patches.map(p=>({points:p.points.map(([x,y,z])=>[x,y,z-.14]),role:'sideLight'})));
  const skins=patches.map(p=>({points:p.points.map(([x,y,z])=>[x,y,z+.006]),role:'paper'}));
  for(const {a,b,count} of edges.values()) if(count===1) {
    const p=patch.vertices[a],q=patch.vertices[b];
    remaining.push({points:[p,q,[q[0],q[1],q[2]-.14],[p[0],p[1],p[2]-.14]],role:'sideLight'});
    skins.push({points:[[p[0],p[1],p[2]+.006],[p[0],p[1],p[2]-.045],[q[0],q[1],q[2]-.045],[q[0],q[1],q[2]+.006]],role:'sideLight'});
  }
  parts.push(polygonPart('mouse.'+name,skins));shellPolygons=remaining;
}
Object.assign(mouseShell,polygonPart('mouse.shell',shellPolygons));
bevel('mouse.wheel_well',1.1,2.5,.16,.5,'sideDeep');
// A tire rotates about its axle rather than tumbling a pill-shaped top plate.
{
  const vertices=[],faces=[],n=64;
  const rings=[[-.31,.9],[-.27,.975],[.27,.975],[.31,.9]];
  for(const [x,r] of rings) for(let i=0;i<n;i++) {const a=i/n*Math.PI*2;vertices.push([x,Math.cos(a)*r,Math.sin(a)*r]);}
  for(let k=0;k<rings.length-1;k++) for(let i=0;i<n;i++) faces.push({indices:[k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i],role:'ink'});
  for(const [k,reverse] of [[0,true],[3,false]]) {const center=vertices.length;vertices.push([rings[k][0],0,0]);for(let i=0;i<n;i++) {const face=[center,k*n+i,k*n+(i+1)%n];faces.push({indices:reverse?face.reverse():face,role:'ink'});}}
  parts.push({name:'mouse.wheel',vertices,faces});
}
for(const [name,y,z] of [['side_button_1',.6,1.9],['side_button_2',2.3,1.75]]) {
  const profile=ring(1.35,.36,.14,0,8),n=profile.length;
  const vertices=[-.1,.04].flatMap(offset=>profile.map(([u,v])=>[shellSideX(y+u,z+v)+offset,y+u,z+v]));
  const faces=[{indices:Array.from({length:n},(_,i)=>n-1-i),role:'sideDeep'},{indices:Array.from({length:n},(_,i)=>n+i),role:'sideDeep'}];
  for(let i=0;i<n;i++){const j=(i+1)%n;faces.push({indices:[i,j,n+j,n+i],role:'sideLight'});}
  parts.push({name:'mouse.'+name,vertices,faces});
}
const contour=[[0,4.7]];
function curve(a,b,c,d,x,y) {const [sx,sy]=contour.at(-1);for(let i=1;i<=24;i++){const t=i/24,u=1-t;contour.push([u**3*sx+3*u*u*t*a+3*u*t*t*c+t**3*x,u**3*sy+3*u*u*t*b+3*u*t*t*d+t**3*y]);}}
curve(-2.7,4.7,-5.3,5,-6.7,4.3);curve(-8,3.8,-8.5,1.7,-8.1,-.6);
curve(-7.8,-3.2,-7.3,-6.3,-5.7,-6.3);curve(-4.2,-6.3,-3.6,-3,-2.7,-2.3);
curve(-1.6,-1.4,1.6,-1.4,2.7,-2.3);curve(3.6,-3,4.2,-6.3,5.7,-6.3);
curve(7.3,-6.3,7.8,-3.2,8.1,-.6);curve(8.5,1.7,8,3.8,6.7,4.3);curve(5.3,5,2.7,4.7,0,4.7);contour.pop();
loft('controller.shell',[[0,.78],[.16,.88],[.65,.96],[1.6,1],[2.2,.98],[2.4,.93]].map(([z,s])=>contour.map(([x,y])=>[x*s,y*s,z])));
bevel('controller.stick_well',2.8,2.8,.12,1.4,'ink');
bevel('controller.stick',1.95,1.95,.28,.975,'ink');
bevel('controller.face_button',.88,.88,.24,.44);
bevel('controller.dpad',.8,.8,.2,.12);
bevel('controller.menu',.6,.4,.15,.16);
bevel('controller.shoulder',2.8,.8,.3,.25);
bevel('controller.trigger',2.35,1.2,.65,.35,'sideDeep');
// Remaining authored hardware; each manufactured body has a narrow bevel band.
bevel('monitor.foot',21,11,.7,.65);bevel('monitor.stem',2.3,3,10.5,.25,'sideLight');
bevel('monitor.junction',5.5,2.4,4,.6,'sideDeep');
bevel('monitor.panel',54,30.8,1.45,.6);bevel('monitor.display',52.2,29,.035,.3);
bevel('monitor.power',.24,.24,.04,.12,'ink');
const keyboard = bevel('keyboard.chassis',44,14.5,1.45,.7);
keyboard.vertices.forEach(p=>{p[2]+=p[2]/1.45*p[1]/14.5*.5;});
bevel('webcam.housing',10,3.6,1.65,1.75);
bevel('webcam.mount',2.8,2.7,.4,.2,'sideDeep');
bevel('webcam.hinge',1.5,1.5,.8,.75,'sideDeep');
bevel('webcam.lens_outer',3.3,3.3,.25,1.65,'sideDeep');
bevel('webcam.lens_ring',2.8,2.8,.14,1.4,'paper');
bevel('webcam.lens_center',2.3,2.3,.1,1.15,'ink');
bevel('microphone.base',4.2,4.2,.45,2.1,'sideDeep');
bevel('microphone.stem',.7,.7,4.1,.35,'sideLight');
const capsule=loft('microphone.capsule',[[0,.35],[.12,.7],[.4,.93],[.8,1],[6.4,1],[6.8,.93],[7.08,.7],[7.2,.35]].map(([z,s])=>ring(2.8*s,2.8*s,1.4*s,z)), 'sideLight');
capsule.faces.forEach(f=>{if(f.indices.some(i=>capsule.vertices[i][2]>2))f.role='secondary';});
bevel('microphone.collar',2.85,2.85,.35,1.425,'paper');
bevel('speaker.cabinet',8.5,7.5,18.5,.26);
bevel('speaker.baffle',7.7,17.7,.12,.22,'sideLight');
bevel('speaker.woofer',5.7,5.7,.22,2.85,'secondary');
bevel('speaker.woofer_center',3.6,3.6,.15,1.8,'ink');
bevel('speaker.tweeter',2.4,2.4,.17,1.2,'ink');
bevel('speaker.base',7.8,6.8,.15,.25,'sideDeep');
bevel('speaker.led',.18,.18,.03,.09,'ink');
// Standard glTF 2.0 with baked triangle buffers and authored topology metadata.
const chunks=[], views=[], accessors=[], meshes=[], nodes=[]; let offset=0;
function accessor(values) {
  const buffer=Buffer.from(new Float32Array(values).buffer); const view=views.length;
  views.push({buffer:0,byteOffset:offset,byteLength:buffer.length,target:34962});chunks.push(buffer);offset+=buffer.length;
  const xyz=[0,1,2].map(i=>values.filter((_,j)=>j%3===i)); const index=accessors.length;
  accessors.push({bufferView:view,componentType:5126,count:values.length/3,type:'VEC3',min:xyz.map(v=>Math.min(...v)),max:xyz.map(v=>Math.max(...v))});return index;
}
for(const part of parts) {
  const roles=[...new Set(part.faces.map(f=>f.role))], positions=[], groups=[];
  for(const role of roles) {const start=positions.length/3;for(const face of part.faces.filter(f=>f.role===role)) for(let i=1;i<face.indices.length-1;i++) for(const idx of [face.indices[0],face.indices[i],face.indices[i+1]])positions.push(...part.vertices[idx]);groups.push({start,count:positions.length/3-start,role});}
  meshes.push({name:part.name,primitives:[{attributes:{POSITION:accessor(positions)},mode:4}],extras:{vertices:part.vertices,faces:part.faces,groups}});
  nodes.push({name:part.name,mesh:meshes.length-1});
}
const asset={asset:{version:'2.0',generator:'IO control-point mesh authoring'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,buffers:[{byteLength:offset,uri:'data:application/octet-stream;base64,'+Buffer.concat(chunks).toString('base64')}],bufferViews:views,accessors};
fs.mkdirSync('assets',{recursive:true});fs.writeFileSync('assets/devices.gltf',JSON.stringify(asset,(_,v)=>typeof v==='number'?Math.round(v*100000)/100000:v));
console.log(`Authored ${parts.length} parts, ${offset/1024|0} KiB geometry`);
