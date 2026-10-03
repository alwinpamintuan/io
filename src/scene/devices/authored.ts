import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import source from '../../../assets/devices.gltf?raw';
import { GraphicSolid } from './primitives';
import type { Materials } from './primitives';

// The bundled glTF has one baked POSITION primitive per semantic part. Keep the
// authored polygon metadata only for view-dependent ink; never rebuild its mesh.
const asset = JSON.parse(source) as {
  buffers: { uri: string }[]; bufferViews: { byteOffset: number; byteLength: number }[];
  accessors: { bufferView: number; count: number }[];
  meshes: { name: string; primitives: { attributes: { POSITION: number } }[]; extras: {
    vertices: [number, number, number][]; faces: { indices: number[]; role: keyof Materials }[];
    groups: { start: number; count: number; role: keyof Materials }[];
  } }[];
};
const bytes = Uint8Array.from(atob(asset.buffers[0]!.uri.split(',')[1]!), c => c.charCodeAt(0));
export function authoredPart(name: string, materials: Materials, flat: boolean): GraphicSolid {
  const part = asset.meshes.find(mesh => mesh.name === name);
  if (!part) throw new Error(`Missing authored part: ${name}`);
  const accessor = asset.accessors[part.primitives[0]!.attributes.POSITION]!;
  const view = asset.bufferViews[accessor.bufferView]!;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(bytes.buffer, view.byteOffset, accessor.count * 3).slice(), 3));
  const roles = [...new Set(part.extras.faces.map(face => flat ? 'paper' as const : face.role))];
  part.extras.groups.forEach(group => geometry.addGroup(group.start, group.count, roles.indexOf(flat ? 'paper' : group.role)));
  const solid = new GraphicSolid({ vertices: part.extras.vertices.map(v => new Vector3(...v)), faces: part.extras.faces.map(f => ({ indices: f.indices, material: materials[flat ? 'paper' : f.role] })) }, materials.paper, flat, geometry);
  // Bevel bands and driver assemblies read through value, rather than a black
  // line around every surface. Explicit bezel/seam lines remain where useful.
  solid.object.userData.silhouetteOnly = true;
  if (!/(shell|chassis|panel|cabinet|capsule|housing|foot|base)$/.test(name)) {
    solid.silhouette.object.material.linewidth = 0.9;
    solid.silhouette.object.material.color.set(0x5d5d58);
  }
  solid.object.name = name; solid.mesh.name = name;
  return solid;
}
