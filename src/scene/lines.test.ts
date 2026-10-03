import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { GraphicLines } from './lines';

it('reuses GPU attributes for live data and disposes before growing capacity', () => {
  const lines = new GraphicLines('detail', [new Vector3(), new Vector3(1, 0, 0)]);
  const geometry = lines.object.geometry; const buffer = geometry.getAttribute('instanceStart');
  for (let i = 0; i < 1000; i++) lines.setPoints([new Vector3(i, 0, 0), new Vector3(i + 1, 0, 0)]);
  expect(lines.object.geometry).toBe(geometry); expect(lines.object.geometry.getAttribute('instanceStart')).toBe(buffer);
  const dispose = vi.fn(); geometry.addEventListener('dispose', dispose);
  lines.setPoints([new Vector3(), new Vector3(1, 0, 0), new Vector3(1, 1, 0), new Vector3(0, 1, 0)]);
  expect(dispose).toHaveBeenCalledOnce(); expect(lines.object.geometry.instanceCount).toBe(2);
  lines.setPoints([]); expect(lines.object.visible).toBe(false); lines.dispose();
});
describe('line width roles', () => {
  it('preserves CSS resolution independently of segment capacity', () => {
    const lines = new GraphicLines('silhouette'); lines.resize(1440, 900); lines.setPoints([new Vector3(), new Vector3(1, 1, 1)]);
    expect(lines.object.material.resolution.toArray()).toEqual([1440, 900]); expect(lines.object.material.linewidth).toBe(2); lines.dispose();
  });
});
