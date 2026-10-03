import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3 } from 'three';
import type { Camera, MeshBasicMaterial } from 'three';
import { GraphicLines } from '../lines';
import type { createMaterials } from '../materials';

export type Materials = ReturnType<typeof createMaterials>;
export interface Face { readonly indices: readonly number[]; readonly material: MeshBasicMaterial }
export interface SolidShape { readonly vertices: Vector3[]; readonly faces: Face[] }

// Convex rings, counterclockwise viewed from above. Corners remain intentionally simple.
export function roundedRing(width: number, depth: number, radius: number, z: number): Vector3[] {
  const ring: Vector3[] = [];
  for (let corner = 0; corner < 4; corner += 1) {
    const angle = corner * Math.PI / 2;
    const x = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - radius);
    const y = (corner < 2 ? 1 : -1) * (depth / 2 - radius);
    for (let segment = 0; segment <= 3; segment += 1) {
      const t = angle + segment * Math.PI / 6;
      ring.push(new Vector3(x + radius * Math.cos(t), y + radius * Math.sin(t), z));
    }
  }
  return ring;
}

export function loft(rings: Vector3[][], materials: Materials): SolidShape {
  const count = rings[0]!.length;
  const vertices = rings.flat();
  const faces: Face[] = [
    { indices: Array.from({ length: count }, (_, i) => count - 1 - i), material: materials.sideDeep },
    { indices: Array.from({ length: count }, (_, i) => vertices.length - count + i), material: materials.paper },
  ];
  for (let level = 0; level < rings.length - 1; level += 1) {
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      faces.push({
        indices: [level * count + i, level * count + j, (level + 1) * count + j, (level + 1) * count + i],
        material: materials.sideLight,
      });
    }
  }
  return { vertices, faces };
}

export function slab(width: number, depth: number, height: number, radius: number, materials: Materials): SolidShape {
  return loft([roundedRing(width, depth, radius, 0), roundedRing(width, depth, radius, height)], materials);
}

// A small authored face mesh plus view-dependent boundary lines. No wireframe triangulation.
export class GraphicSolid {
  readonly object = new Group();
  readonly mesh: Mesh;
  readonly silhouette = new GraphicLines('silhouette');
  readonly construction = new GraphicLines('construction');
  private readonly geometry = new BufferGeometry();
  private readonly facePlanes: { normal: Vector3; point: Vector3 }[];
  private readonly edges = new Map<string, { a: number; b: number; faces: number[] }>();
  private visibility = '';

  constructor(private readonly shape: SolidShape, flatMaterial: MeshBasicMaterial, flat = false) {
    const positions: number[] = [];
    const materials: MeshBasicMaterial[] = [];
    const batches: number[][] = [];
    this.facePlanes = shape.faces.map((face, faceIndex) => {
      const a = shape.vertices[face.indices[0]!]!;
      const b = shape.vertices[face.indices[1]!]!;
      const c = shape.vertices[face.indices[2]!]!;
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const material = flat ? flatMaterial : face.material;
      let materialIndex = materials.indexOf(material);
      if (materialIndex < 0) { materialIndex = materials.length; materials.push(material); batches.push([]); }
      const batch = batches[materialIndex]!;
      for (let i = 1; i < face.indices.length - 1; i += 1) {
        for (const index of [face.indices[0]!, face.indices[i]!, face.indices[i + 1]!]) {
          const p = shape.vertices[index]!;
          batch.push(p.x, p.y, p.z);
        }
      }
      for (let i = 0; i < face.indices.length; i += 1) {
        const v = face.indices[i]!;
        const w = face.indices[(i + 1) % face.indices.length]!;
        const key = `${Math.min(v, w)}:${Math.max(v, w)}`;
        const edge = this.edges.get(key) ?? { a: v, b: w, faces: [] };
        edge.faces.push(faceIndex);
        this.edges.set(key, edge);
      }
      return { normal, point: a };
    });
    // One draw per face material, rather than a separate draw for every polygon.
    batches.forEach((batch, materialIndex) => {
      this.geometry.addGroup(positions.length / 3, batch.length / 3, materialIndex);
      positions.push(...batch);
    });
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.computeVertexNormals();
    this.mesh = new Mesh(this.geometry, materials);
    // Offset faces, rather than disabling depth test on outlines: real occlusion stays intact.
    this.object.add(this.mesh, this.silhouette.object, this.construction.object);
  }

  updateLines(camera: Camera, silhouetteOnly = false): void {
    const eye = this.object.worldToLocal(camera.getWorldPosition(new Vector3()));
    const visible = this.facePlanes.map(({ normal, point }) => normal.dot(eye.clone().sub(point)) > 0);
    const signature = `${visible.map(Number).join('')}:${silhouetteOnly}`;
    if (signature === this.visibility) return;
    this.visibility = signature;
    const silhouette: Vector3[] = [];
    const construction: Vector3[] = [];
    for (const edge of this.edges.values()) {
      const a = edge.faces[0]!;
      const b = edge.faces[1]!;
      const target = visible[a] !== visible[b] ? silhouette
        : visible[a] && !silhouetteOnly && this.facePlanes[a]!.normal.dot(this.facePlanes[b]!.normal) < 0.75
          ? construction : null;
      if (target) target.push(this.shape.vertices[edge.a]!, this.shape.vertices[edge.b]!);
    }
    this.silhouette.setPoints(silhouette);
    this.construction.setPoints(construction);
  }

  resize(width: number, height: number): void {
    this.silhouette.resize(width, height);
    this.construction.resize(width, height);
  }

  dispose(): void {
    this.geometry.dispose();
    this.silhouette.dispose();
    this.construction.dispose();
  }
}
