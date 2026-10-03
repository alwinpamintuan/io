import { MeshBasicMaterial } from 'three';

export const PALETTE = {
  paper: 0xf4f4f0,
  ink: 0x0a0a0a,
  secondary: 0x777772,
  sideLight: 0xdcdcd7,
  sideDeep: 0xbabab5,
} as const;

// CSS-pixel widths used by the explicit wide-line system.
export const LINE_WIDTHS = { silhouette: 3.25, construction: 1.75, detail: 0.875 } as const;

export function createMaterials() {
  const face = (color: number) => new MeshBasicMaterial({
    color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  return {
    paper: face(PALETTE.paper),
    ink: face(PALETTE.ink),
    secondary: face(PALETTE.secondary),
    sideLight: face(PALETTE.sideLight),
    sideDeep: face(PALETTE.sideDeep),
  };
}
