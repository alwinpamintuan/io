import { Box3, Box3Helper, GridHelper, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { CameraRig } from './CameraRig';
import type { GraphicSolid } from './devices/primitives';

export function readDebugOptions(search: string) {
  const query = new URLSearchParams(search);
  return {
    flat: query.has('debugFlat'), noShadow: query.has('debugNoShadow'),
    grid: query.has('debugGrid'), bounds: query.has('debugBounds'),
    anchors: query.has('debugAnchors'), camera: query.has('debugCamera'), hitTargets: query.has('debugHitTargets'),
  };
}

export const NO_DEBUG = { flat: false, noShadow: false, grid: false, bounds: false, anchors: false, camera: false, hitTargets: false };

export function createSceneDebug(options: typeof NO_DEBUG, solids: readonly GraphicSolid[], anchors: readonly Object3D[], rig: CameraRig) {
  const root = new Group();
  root.name = 'DevelopmentDebug';
  if (options.grid) {
    const grid = new GridHelper(140, 28, 0x777772, 0xbabab5);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.005;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.material.depthWrite = false;
    root.add(grid);
  }
  if (options.bounds) {
    for (const solid of solids) root.add(new Box3Helper(new Box3().setFromObject(solid.mesh), 0x777772));
  }
  if (options.anchors) {
    const geometry = new SphereGeometry(0.65, 8, 6);
    const material = new MeshBasicMaterial({ color: 0x777772, depthTest: false });
    for (const anchor of anchors) {
      const marker = new Mesh(geometry, material);
      marker.position.copy(anchor.getWorldPosition(new Vector3()));
      root.add(marker);
    }
  }
  let output: HTMLOutputElement | null = null;
  if (options.camera) {
    output = document.createElement('output');
    output.className = 'debug-camera';
    document.querySelector('#app')!.append(output);
  }
  return {
    root,
    update() {
      if (!output) return;
      const pose = rig.snapshot();
      output.textContent = `camera ${pose.position.toArray().map((n) => n.toFixed(1)).join(', ')}\ntarget ${pose.target.toArray().map((n) => n.toFixed(1)).join(', ')}\nfov ${pose.fov.toFixed(1)}°`;
    },
    dispose() {
      const geometries = new Set<{ dispose(): void }>();
      const materials = new Set<{ dispose(): void }>();
      root.traverse((object) => {
        if ('geometry' in object) geometries.add(object.geometry as { dispose(): void });
        if ('material' in object) {
          const values = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of values) materials.add(material as { dispose(): void });
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      output?.remove();
      root.clear();
    },
  };
}
