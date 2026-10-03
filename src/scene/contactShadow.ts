import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { PALETTE } from './materials';

export function createContactShadow(width: number, depth: number, radius: number, opacity: number, ellipse = false) {
  const fringe = 0.55;
  const geometry = new PlaneGeometry(width + fringe * 2, depth + fringe * 2);
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      ink: { value: new Color(PALETTE.ink) }, opacity: { value: opacity },
      size: { value: [width / 2, depth / 2] }, radius: { value: radius },
      fringe: { value: fringe }, ellipse: { value: ellipse },
    },
    vertexShader: `varying vec2 point;
      void main() { point = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 ink; uniform float opacity, radius, fringe;
      uniform vec2 size; uniform bool ellipse; varying vec2 point;
      void main() {
        vec2 q = abs(point) - size + radius;
        float distance = ellipse ? (length(point / size) - 1.0) * min(size.x, size.y)
          : length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        float alpha = opacity * (1.0 - smoothstep(-0.1, fringe, distance));
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(ink, alpha);
        #include <colorspace_fragment>
      }`,
  });
  const object = new Mesh(geometry, material);
  object.name = 'ContactShadow';
  object.position.z = 0.015;
  return { object, dispose: () => { geometry.dispose(); material.dispose(); } };
}
