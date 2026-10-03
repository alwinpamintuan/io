import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { DeviceId } from '../app/state';
import { GraphicLines } from './lines';

const segment = (x: number, y: number, xx: number, yy: number) => [new Vector3(x, y, .025), new Vector3(xx, yy, .025)];
export function controllerCalibration(aspect: number) {
  return aspect < 1.2 ? { centers: [-3, 4], y: -10, radius: 1.7 } : { centers: [11, 18], y: -1, radius: 1.9 };
}
function controllerField(aspect: number): Vector3[] {
  const { centers, y, radius } = controllerCalibration(aspect);
  return centers.flatMap(x => [...calibrationRing(x, y, radius), ...calibrationRing(x, y, radius / 10),
    ...calibrationRing(x, y, radius * .25),
    ...Array.from({ length: 12 }, (_, i) => {
      const a = i / 12 * Math.PI * 2;
      return segment(x + Math.cos(a) * radius, y + Math.sin(a) * radius,
        x + Math.cos(a) * (radius + .18), y + Math.sin(a) * (radius + .18));
    }).flat(),
    ...segment(x - radius - .3, y, x + radius + .3, y), ...segment(x, y - radius - .3, x, y + radius + .3)]);
}
export function calibrationRing(x: number, y: number, radius: number): Vector3[] {
  return Array.from({ length: 48 }, (_, i) => segment(
    x + Math.cos(i / 48 * Math.PI * 2) * radius, y + Math.sin(i / 48 * Math.PI * 2) * radius,
    x + Math.cos((i + 1) / 48 * Math.PI * 2) * radius, y + Math.sin((i + 1) / 48 * Math.PI * 2) * radius)).flat();
}

/** Localized desk drafting; never a viewport-wide grid or fabricated activity. */
export class MeasurementField {
  readonly root = new Group();
  private readonly overview = new GraphicLines('detail');
  private readonly plane = new GraphicLines('detail');
  private readonly fields = new Map<DeviceId, GraphicLines>();
  constructor(visuals: Map<DeviceId, Object3D>, drivers: Object3D[], mic: Object3D) {
    this.root.name = 'TechnicalSubstrate';
    this.root.add(this.overview.object, this.plane.object);
    const attach = (id: DeviceId, parent: Object3D, points: Vector3[]) => {
      const field = new GraphicLines('detail', points);
      field.object.name = `${id}:MeasurementField`;
      field.object.material.transparent = true; field.object.material.opacity = .14;
      parent.add(field.object); this.fields.set(id, field); field.object.visible = false;
      return field;
    };
    const mouse = [...Array.from({ length: 7 }, (_, i) => segment(5 + i * 2, -8, 5 + i * 2, 8)).flat(),
      ...Array.from({ length: 9 }, (_, i) => segment(5, -8 + i * 2, 17, -8 + i * 2)).flat()];
    attach('mouse', visuals.get('mouse')!, mouse);
    attach('keyboard', visuals.get('keyboard')!, [...segment(-23, -8, -20, -8), ...segment(20, -8, 23, -8)]);
    const controller = attach('controller', visuals.get('controller')!, controllerField(1.6));
    controller.object.position.z = 3;
    // Calibration is a readable test surface, stronger than desk drafting.
    controller.object.material.linewidth = 1.2;
    controller.object.material.opacity = .65;
    controller.object.material.alphaToCoverage = false;
    attach('audio', drivers[0]!, [...segment(4, 0, 22, 0), ...[6, 10, 14, 18, 22].flatMap(x => segment(x, -.3, x, .3))]);
    const microphone = attach('microphone', mic, [...segment(0, 0, 21, 0), ...[5, 10, 15, 20].flatMap(x => segment(x, -.25, x, .25))]);
    microphone.object.rotation.x = Math.PI / 2;
    this.layout(0);
  }
  layout(hiddenCount: number): void {
    // A cropped keyboard construction plane, not a rectangular mat for every device.
    const half = hiddenCount >= 3 ? 25 : 31;
    const points: Vector3[] = [];
    for (let x = -half + 4; x < half; x += 6) points.push(...segment(x, -18, x, 3));
    for (let y = -18; y <= 3; y += 6) points.push(...segment(-half, y, half, y));
    this.overview.setPoints(points);
    this.overview.object.material.transparent = true;
    this.overview.object.material.opacity = .14;
    this.overview.object.material.alphaToCoverage = false;
    this.plane.setPoints([...segment(-half - 9, -23, -half + 4, -23),
      ...segment(half - 4, -23, half + 9, -23), ...segment(0, -24, 0, -22)]);
    this.plane.object.material.transparent = true;
    this.plane.object.material.opacity = .18;
    this.plane.object.material.alphaToCoverage = false;
  }
  state(device: DeviceId | null, stable: boolean): void {
    this.overview.object.visible = device === null;
    this.plane.object.visible = device === null;
    this.fields.forEach((field, id) => { field.object.visible = id === device && stable; });
  }
  resize(width: number, height: number): void {
    this.overview.resize(width, height); this.plane.resize(width, height); this.fields.forEach(f => f.resize(width, height));
    this.fields.get('controller')!.setPoints(controllerField(width / Math.max(1, height)));
  }
  dispose(): void { this.overview.dispose(); this.plane.dispose(); this.fields.forEach(f => { f.object.removeFromParent(); f.dispose(); }); this.root.removeFromParent(); }
}
