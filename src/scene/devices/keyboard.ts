import { BoxGeometry, BufferGeometry, Float32BufferAttribute, CanvasTexture, Color, Group, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from 'three';
import { KEY_LAYOUT } from '../../input/keyboardLayout';
import type { KeyboardSnapshot } from '../../input/KeyboardAdapter';
import { PALETTE } from '../materials';

/** Shared instanced keycaps and legend atlas keep full-size keyboard draw calls bounded. */
export function createKeyboardKeys(parent: Group) {
  const box = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: PALETTE.paper });
  const outlineMaterial = new MeshBasicMaterial({ color: PALETTE.sideDeep });
  const caps = new InstancedMesh(box, material, KEY_LAYOUT.length);
  const outlines = new InstancedMesh(box, outlineMaterial, KEY_LAYOUT.length);
  const legendCanvas = document.createElement('canvas'); legendCanvas.width = 1024; legendCanvas.height = 1024;
  const ctx = legendCanvas.getContext('2d')!;
  ctx.font = '25px monospace'; ctx.fillStyle = '#f4f4f0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  KEY_LAYOUT.forEach((key, i) => ctx.fillText(key.label, i % 16 * 64 + 32, Math.floor(i / 16) * 64 + 32));
  const atlas = new CanvasTexture(legendCanvas);
  const legendGeometry = new PlaneGeometry(1, 1);
  const legendMaterial = new ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { atlas: { value: atlas }, detail: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying float cell; varying vec3 tint;
      void main(){ vUv=uv; cell=float(gl_InstanceID); tint=instanceColor;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D atlas; uniform float detail; varying vec2 vUv; varying float cell; varying vec3 tint;
      void main(){ vec2 tile=vec2(mod(cell,16.0),15.0-floor(cell/16.0));
        float a=texture2D(atlas,(tile+vUv)/16.0).a;
        if(a<0.01) discard; gl_FragColor=vec4(tint,a*detail);
        #include <colorspace_fragment>
      }`,
  });
  const legends = new InstancedMesh(legendGeometry, legendMaterial, KEY_LAYOUT.length);
  const edgeGeometry = new BufferGeometry();
  const positions: number[] = [];
  for (const [x0,y0,x1,y1] of [[-.5,-.5,.5,-.48],[-.5,.48,.5,.5],[-.5,-.48,-.48,.48],[.48,-.48,.5,.48]]) {
    positions.push(x0!,y0!,0,x1!,y0!,0,x1!,y1!,0,x0!,y0!,0,x1!,y1!,0,x0!,y1!,0);
  }
  edgeGeometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  const edgeMaterial=new MeshBasicMaterial({color:PALETTE.ink});
  const inspectionEdges=new InstancedMesh(edgeGeometry,edgeMaterial,KEY_LAYOUT.length);inspectionEdges.visible=false;
  const group = new Group(); group.name = 'AddressableKeys'; group.add(outlines, caps, legends, inspectionEdges); parent.add(group);
  const matrix = new Matrix4(); const color = new Color();
  let signature = '';
  function update(snapshot: KeyboardSnapshot): void {
    const next = [...snapshot.held.keys()].join(',') + ':' + [...snapshot.tested].join(',');
    if (signature === next) return; signature = next;
    KEY_LAYOUT.forEach((key, index) => {
      const held = snapshot.held.has(key.code);
      const z = 1.5 + key.y / 14.5 * 0.5 + (held ? 0.15 : 0.38);
      matrix.makeScale(key.width, key.depth, 0.5); matrix.setPosition(key.x, key.y, z);
      outlines.setMatrixAt(index, matrix);
      matrix.makeScale(key.width - 0.07, key.depth - 0.07, 0.12); matrix.setPosition(key.x, key.y, z + 0.205);
      caps.setMatrixAt(index, matrix); caps.setColorAt(index, color.set(held ? PALETTE.ink : snapshot.tested.has(key.code) ? PALETTE.sideLight : PALETTE.paper));
      matrix.makeScale(Math.min(2, key.width), 1.45, 1); matrix.setPosition(key.x, key.y, z + 0.275);
      legends.setMatrixAt(index, matrix); legends.setColorAt(index, color.set(held ? PALETTE.paper : PALETTE.ink));
    });
    for (const mesh of [caps, outlines, legends]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); }
  }
  update({ held: new Map(), tested: new Set(), last: null, holdMs: null, repeatMs: null });
  return { group, update, inspect() {
    group.visible = true; legends.visible = false;
    (caps.material as MeshBasicMaterial).color.set(0xffffff);
    (outlines.material as MeshBasicMaterial).color.set(0xffffff);
    inspectionEdges.visible=true;
    KEY_LAYOUT.forEach((_,i) => {
      caps.setColorAt(i,color.set(0xffffff));caps.getMatrixAt(i,matrix);
      matrix.elements[10]=1;matrix.elements[14]!+=.066;inspectionEdges.setMatrixAt(i,matrix);
    });inspectionEdges.instanceMatrix.needsUpdate=true;inspectionEdges.computeBoundingSphere();
    if(caps.instanceColor) caps.instanceColor.needsUpdate = true;
  }, detail(visible: boolean | number) { const amount = Number(visible); legends.visible = amount > 0; legendMaterial.uniforms.detail!.value = amount; outlineMaterial.color.set(PALETTE.sideLight).lerp(new Color(PALETTE.sideDeep), amount); }, dispose() {
    parent.remove(group); box.dispose(); material.dispose(); outlineMaterial.dispose(); atlas.dispose(); legendGeometry.dispose(); legendMaterial.dispose(); edgeGeometry.dispose();edgeMaterial.dispose();inspectionEdges.dispose();caps.dispose(); outlines.dispose(); legends.dispose();
  } };
}
