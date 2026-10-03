import { MeshBasicMaterial } from 'three';

export const PALETTE = {
  background: 0xf3f2ec,
  paper: 0xfcfcf8,
  ink: 0x111111,
  secondary: 0x5d5d58,
  sideLight: 0xdddcd5,
  sideDeep: 0xaaa9a2,
} as const;

// CSS-pixel widths used by the explicit wide-line system.
export const LINE_WIDTHS = { silhouette: 2, construction: 0.9, detail: 0.65 } as const;

export function createMaterials() {
  const face = (color: number) => new MeshBasicMaterial({
    color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  return {
    paper: face(PALETTE.paper),
    white: face(0xffffff),
    ink: face(PALETTE.ink),
    secondary: face(PALETTE.secondary),
    sideLight: face(PALETTE.sideLight),
    sideDeep: face(PALETTE.sideDeep),
  };
}
