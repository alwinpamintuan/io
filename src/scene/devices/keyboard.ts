import { BoxGeometry, CanvasTexture, Color, Group, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from 'three';
import { KEY_LAYOUT } from '../../input/keyboardLayout';
import type { KeyboardSnapshot } from '../../input/KeyboardAdapter';
import { PALETTE } from '../materials';

/** Shared instanced keycaps and legend atlas keep full-size keyboard draw calls bounded. */
export function createKeyboardKeys(parent: Group) {
  const box = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: PALETTE.paper });
  const outlineMaterial = new MeshBasicMaterial({ color: PALETTE.ink });
  const caps = new InstancedMesh(box, material, KEY_LAYOUT.length);
  const outlines = new InstancedMesh(box, outlineMaterial, KEY_LAYOUT.length);
  const legendCanvas = document.createElement('canvas'); legendCanvas.width = 1024; legendCanvas.height = 1024;
  const ctx = legendCanvas.getContext('2d')!;
  ctx.font = '25px monospace'; ctx.fillStyle = '#f4f4f0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  KEY_LAYOUT.forEach((key, i) => ctx.fillText(key.label, i % 16 * 64 + 32, Math.floor(i / 16) * 64 + 32));
  const atlas = new CanvasTexture(legendCanvas);
  const legendGeometry = new PlaneGeometry(1, 1);
  const legendMaterial = new ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { atlas: { value: atlas } },
    vertexShader: `varying vec2 vUv; varying float cell; varying vec3 tint;
      void main(){ vUv=uv; cell=float(gl_InstanceID); tint=instanceColor;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D atlas; varying vec2 vUv; varying float cell; varying vec3 tint;
      void main(){ vec2 tile=vec2(mod(cell,16.0),15.0-floor(cell/16.0));
        float a=texture2D(atlas,(tile+vUv)/16.0).a;
        if(a<0.01) discard; gl_FragColor=vec4(tint,a);
        #include <colorspace_fragment>
      }`,
  });
  const legends = new InstancedMesh(legendGeometry, legendMaterial, KEY_LAYOUT.length);
  const group = new Group(); group.name = 'AddressableKeys'; group.add(outlines, caps, legends); parent.add(group);
  const matrix = new Matrix4(); const color = new Color();
  let signature = '';
  function update(snapshot: KeyboardSnapshot): void {
    const next = [...snapshot.held.keys()].join(',') + ':' + [...snapshot.tested].join(',');
    if (signature === next) return; signature = next;
    KEY_LAYOUT.forEach((key, index) => {
      const held = snapshot.held.has(key.code);
      const z = 2.45 + key.y / 14.5 * 0.8 + (held ? 0.15 : 0.38);
      matrix.makeScale(key.width, key.depth, 0.5); matrix.setPosition(key.x, key.y, z);
      outlines.setMatrixAt(index, matrix);
      matrix.makeScale(key.width - 0.1, key.depth - 0.1, 0.5); matrix.setPosition(key.x, key.y, z + 0.015);
      caps.setMatrixAt(index, matrix); caps.setColorAt(index, color.set(held ? PALETTE.ink : snapshot.tested.has(key.code) ? PALETTE.sideLight : PALETTE.paper));
      matrix.makeScale(Math.min(2, key.width), 1.45, 1); matrix.setPosition(key.x, key.y, z + 0.275);
      legends.setMatrixAt(index, matrix); legends.setColorAt(index, color.set(held ? PALETTE.paper : PALETTE.ink));
    });
    for (const mesh of [caps, outlines, legends]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); }
  }
  update({ held: new Map(), tested: new Set(), last: null, holdMs: null, repeatMs: null });
  return { group, update, detail(visible: boolean) { legends.visible = visible; }, dispose() {
    parent.remove(group); box.dispose(); material.dispose(); outlineMaterial.dispose(); atlas.dispose(); legendGeometry.dispose(); legendMaterial.dispose(); caps.dispose(); outlines.dispose(); legends.dispose();
  } };
}
