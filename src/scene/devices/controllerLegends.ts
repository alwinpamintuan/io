import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { GraphicSolid } from './primitives';
export const LEGEND_STYLES = ['Neutral', 'Xbox', 'PlayStation'] as const;
export type LegendStyle = typeof LEGEND_STYLES[number];
export const CONTROLLER_LEGENDS: Record<LegendStyle, readonly string[]> = {
  Neutral: ['●', '○', '□', '△', '−', '−', '↓', '↓', '−', '+', '◎', '◎', '↑', '↓', '←', '→', '○'],
  Xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', '▱', '≡', 'LS', 'RS', '↑', '↓', '←', '→', '⌂'],
  PlayStation: ['×', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', '−', '≡', '◎', '◎', '↑', '↓', '←', '→', '⌂'],
};
/** Legends are view state; indexes always retain the browser's standard mapping. */
export function createControllerLegends(buttons: Map<number, GraphicSolid>) {
  const geometry = new PlaneGeometry(1, 1);
  const entries = [...buttons].map(([index, part]) => {
    const wide = index >= 4 && index <= 7 || index === 10 || index === 11;
    const canvas = document.createElement('canvas'); canvas.width = wide ? 256 : 128; canvas.height = 128;
    const texture = new CanvasTexture(canvas); const material = new MeshBasicMaterial({ map: texture, color: 0x0a0a0a, transparent: true, depthWrite: false });
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(wide ? 1.5 : index === 8 || index === 9 || index === 16 ? 0.52 : 0.72, wide ? 0.7 : index === 8 || index === 9 || index === 16 ? 0.34 : 0.72, 1);
    part.mesh.geometry.computeBoundingBox();
    mesh.position.z = part.mesh.geometry.boundingBox!.max.z + .012;
    mesh.renderOrder=3;
    const group = new Group(); group.name = 'ControlLegend'; group.add(mesh); part.object.add(group);
    return { index, canvas, texture, material, group };
  });
  let style: LegendStyle = 'Neutral';
  let mapping: boolean | null = null;
  function setStyle(next: LegendStyle) {
    style = next;
    entries.forEach(({ index, canvas, texture }) => {
      const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#fff'; ctx.font = 'bold 108px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(CONTROLLER_LEGENDS[mapping === null ? 'Neutral' : style][index]!, canvas.width/2, 64); texture.needsUpdate = true;
    });
  }
  setStyle(style);
  return { setStyle, mapping(standard: boolean | null) { if (mapping !== standard) { mapping = standard; setStyle(style); } }, detail(amount: number) { entries.forEach(({ group, material }) => { group.visible = amount > 0 && mapping !== false; material.opacity = amount; }); }, press(index: number, pressed: boolean) { entries.find((e) => e.index === index)?.material.color.set(pressed ? 0xf4f4f0 : 0x0a0a0a); }, dispose() { geometry.dispose(); entries.forEach(({ texture, material, group }) => { group.removeFromParent(); texture.dispose(); material.dispose(); }); } };
}
