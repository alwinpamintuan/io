import { Vector3 } from 'three';
import type { InterleavedBufferAttribute } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LINE_WIDTHS, PALETTE } from './materials';

export type LineRole = keyof typeof LINE_WIDTHS;

export class GraphicLines {
  readonly object: LineSegments2;
  private geometry = new LineSegmentsGeometry();
  private capacity = 0;
  private readonly material: LineMaterial;

  constructor(role: LineRole, points: readonly Vector3[] = []) {
    this.material = new LineMaterial({
      color: PALETTE.ink, linewidth: LINE_WIDTHS[role], worldUnits: false,
      alphaToCoverage: true, depthTest: true, depthWrite: false,
    });
    this.object = new LineSegments2(this.geometry, this.material);
    // CSS-pixel widths: the addon normally supplies drawing-buffer dimensions.
    this.object.onBeforeRender = () => {};
    this.setPoints(points);
  }

  setPoints(points: readonly Vector3[]): void {
    const segments = Math.floor(points.length / 2);
    this.object.visible = segments > 0;
    if (!segments) { this.geometry.instanceCount = 0; return; }
    if (segments > this.capacity) {
      // Dispose while the old GPU attributes are still attached to the geometry.
      this.geometry.dispose(); this.capacity = 2 ** Math.ceil(Math.log2(segments));
      this.geometry = new LineSegmentsGeometry();
      this.geometry.setPositions(new Float32Array(this.capacity * 6)); this.object.geometry = this.geometry;
    }
    const data = (this.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute).data;
    for (let i = 0; i < segments * 2; i++) {
      const point = points[i]!; data.array[i * 3] = point.x; data.array[i * 3 + 1] = point.y; data.array[i * 3 + 2] = point.z;
    }
    data.needsUpdate = true; this.geometry.instanceCount = segments;
    this.geometry.computeBoundingBox(); this.geometry.computeBoundingSphere();
  }

  resize(width: number, height: number): void {
    this.material.resolution.set(Math.max(1, width), Math.max(1, height));
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
