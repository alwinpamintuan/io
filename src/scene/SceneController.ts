import { CanvasTexture, Color, Group, MathUtils, Mesh, NoToneMapping, Plane, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, VideoTexture, WebGLRenderer } from 'three';
import type { Material } from 'three';
import type { DeviceId } from '../app/state';
import type { SceneAction, SceneState } from '../app/state';
import { DEVICE_IDS } from '../app/state';
import { CameraRig } from './CameraRig';
import { createMaterials, PALETTE } from './materials';
import { EASING, MotionController, MOTION_DURATION } from './MotionController';
import { createWorkstation } from './devices/workstation';
import { FOCUS_DURATION, FOCUS_LIFT, FOCUS_YAW, focusPose } from './focus';
import { createKeyboardKeys } from './devices/keyboard';
import type { KeyboardSnapshot } from '../input/KeyboardAdapter';
import type { PointerSnapshot } from '../input/PointerAdapter';
import { GraphicLines } from './lines';
import type { CameraSnapshot } from '../input/CameraAdapter';
import type { GamepadSnapshot } from '../input/GamepadAdapter';
import type { AudioSnapshot } from '../input/AudioAdapter';
import { parseHash } from '../app/router';
import { createSceneDebug, NO_DEBUG, readDebugOptions } from './debug';

// One unit is 1 cm. X = left/right, Y = front/back,
// Z = vertical; all future resting device support geometry contacts Z = 0.
export class SceneController {
  readonly scene = new Scene();
  readonly worldRoot = new Group();
  readonly cameraRig = new CameraRig();
  readonly motion = new MotionController();
  readonly materials: ReturnType<typeof createMaterials>;
  readonly deviceRoots = new Map(DEVICE_IDS.map((id) => [id, new Group()]));
  private readonly renderer: WebGLRenderer;
  readonly workstation: ReturnType<typeof createWorkstation>;
  private readonly debug: ReturnType<typeof createSceneDebug> | null;
  private readonly debugOptions = import.meta.env.DEV ? readDebugOptions(window.location.search) : NO_DEBUG;
  private reducedMotion: boolean;
  private state: SceneState | null = null;
  private dirty = true;
  private hovered: DeviceId | null = null;
  private width = 1440;
  private height = 900;
  private readonly raycaster = new Raycaster();
  private readonly keys: ReturnType<typeof createKeyboardKeys>;
  private readonly trail = new GraphicLines('detail');
  private trailSignature = '';
  private dispatch: ((action: SceneAction) => void) | null = null;
  private screenTexture: CanvasTexture | null = null;
  private videoTexture: VideoTexture | null = null;
  private readonly waveform = new GraphicLines('detail');
  private readonly waves = Array.from({ length: 4 }, () => new GraphicLines('detail'));
  private readonly initialRoute = parseHash(window.location.hash);
  private readonly contrastMaterials = new Map<DeviceId, { material: Material & { color: Color }; color: Color }[]>();
  private readonly ownedContrastMaterials: Material[] = [];
  private frameMs = 0;

  constructor(canvas: HTMLCanvasElement, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    this.renderer = new WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    this.materials = createMaterials();
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor(PALETTE.paper, 1);
    this.worldRoot.name = 'WorldRoot';
    this.scene.add(this.worldRoot);
    for (const [device, root] of this.deviceRoots) {
      root.name = `${device}:DeviceRoot`;
      root.userData.device = device;
      this.worldRoot.add(root);
    }
    this.workstation = createWorkstation(this.deviceRoots, this.materials, this.debugOptions);
    if (this.debugOptions.hitTargets) this.workstation.hitTargets.forEach((mesh) => {
      const material = mesh.material as import('three').MeshBasicMaterial;
      material.visible = true; material.transparent = true; material.opacity = 0.15; material.depthWrite = false;
    });
    this.keys = createKeyboardKeys(this.workstation.visuals.get('keyboard')! as Group);
    this.keys.group.visible = !this.debugOptions.flat; this.keys.detail(false);
    this.cloneDeviceMaterials();
    this.trail.object.name = 'PointerTrail'; this.worldRoot.add(this.trail.object);
    this.worldRoot.add(this.waveform.object, ...this.waves.map((wave) => wave.object));
    this.waveform.object.visible = false; this.waves.forEach((wave) => { wave.object.visible = false; });
    this.worldRoot.updateMatrixWorld(true);
    this.debug = import.meta.env.DEV
      ? createSceneDebug(this.debugOptions, this.workstation.solids, this.workstation.anchors, this.cameraRig) : null;
    if (this.debug) this.scene.add(this.debug.root);
  }

  applyState(state: SceneState, dispatch: (action: SceneAction) => void): void {
    this.dispatch = dispatch;
    const previous = this.state;
    this.state = state;
    this.invalidate();
    if (state.mode === 'overview') {
      this.motion.cancel(); this.cameraRig.applyPose(this.cameraRig.poseFor(null));
      this.workstation.visuals.forEach((visual) => { visual.position.z = 0; visual.rotation.z = 0; });
      this.keys.detail(false); this.contrast(null, 0); return;
    }
    if (state.phase === 'active') return;

    const route = state.phase === 'exiting' ? null : state.device;
    this.hovered = null;
    this.registerPoses();
    const from = this.cameraRig.snapshot();
    const to = this.cameraRig.poseFor(route);
    const departure = this.reducedMotion ? { ...to, position: to.position.clone().sub(to.target).multiplyScalar(1.025).add(to.target) } : from;
    const transforms = [...this.workstation.visuals].map(([id, visual]) => ({
      id, visual, z: visual.position.z, yaw: visual.rotation.z,
    }));
    const corridor = !this.reducedMotion && route !== null && previous?.mode === 'focus' && previous.device !== route;
    const overview = this.cameraRig.poseFor(null);
    const sample = (progress: number): void => {
      // History may request another device; its route intent uses the same world corridor.
      const entry = corridor && progress >= 0.45;
      const t = corridor ? entry ? (progress - 0.45) / 0.55 : progress / 0.45 : progress;
      this.cameraRig.interpolate(corridor && entry ? overview : departure,
        corridor && !entry ? overview : to, t);
      for (const { id, visual, z, yaw } of transforms) {
        const selected = id === route && (!corridor || entry);
        const lift = selected ? FOCUS_LIFT[id] : 0;
        const rotation = selected ? MathUtils.degToRad(FOCUS_YAW[id]) : 0;
        visual.position.z = MathUtils.lerp(corridor && entry ? 0 : z, lift, t);
        visual.rotation.z = MathUtils.lerp(corridor && entry ? 0 : yaw, rotation, t);
      }
      this.invalidate();
      this.keys.detail(route === 'keyboard' && progress > 0.45);
      const recession = route === null ? 1 - progress : Math.max(0, (progress - 0.35) / 0.65);
      this.contrast(route ?? state.device, recession);
    };
    this.motion.play({
      name: route === null ? 'overview' : `focus:${route}`,
      durationSeconds: this.reducedMotion ? MOTION_DURATION.reduced
        : corridor ? 1.16 : route === null ? MOTION_DURATION.exit : state.revision === 1 && route === this.initialRoute ? 0.4 : FOCUS_DURATION[route],
      sample,
      ease: this.reducedMotion ? EASING.FADE_OUT : route === null ? EASING.CAMERA_IN_OUT : EASING.CAMERA_OUT,
      complete: () => {
        this.cameraRig.applyPose(to); // Exact endpoint, including overview restoration.
        sample(1);
        dispatch({ type: 'transition-completed', revision: state.revision });
      },
    });
  }

  setReducedMotion(reduced: boolean, dispatch: (action: SceneAction) => void): void {
    if (reduced === this.reducedMotion) return;
    this.reducedMotion = reduced;
    if (this.state) this.applyState(this.state, dispatch);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(Math.max(1, pixelRatio), 2));
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.cameraRig.resize(width, height);
    this.workstation.resize(width, height);
    this.trail.resize(width, height);
    this.waveform.resize(width, height); this.waves.forEach((wave) => wave.resize(width, height));
    this.registerPoses();
    if (this.motion.active && this.state && this.dispatch) this.applyState(this.state, this.dispatch);
    else this.cameraRig.applyPose(this.cameraRig.poseFor(this.state?.mode === 'focus' ? this.state.device : null));
    this.invalidate();
  }

  invalidate(): void {
    this.dirty = true;
  }

  update(deltaSeconds: number): void {
    this.frameMs = deltaSeconds * 1000;
    this.motion.update(deltaSeconds);
    if (this.state?.mode === 'overview') {
      for (const [id, visual] of this.workstation.visuals) {
        const desired = !this.reducedMotion && id === this.hovered && id !== 'monitor' && id !== 'camera' ? 0.45 : 0;
        const next = MathUtils.lerp(visual.position.z, desired, Math.min(1, deltaSeconds * 24));
        if (Math.abs(next - desired) < 0.001) visual.position.z = desired;
        else visual.position.z = next;
        if (Math.abs(next - desired) > 0.001 || next !== desired) this.invalidate();
      }
    }
  }

  private cloneDeviceMaterials(): void {
    for (const [id, visual] of this.workstation.visuals) {
      const clones = new Map<Material, Material>(); const entries: { material: Material & { color: Color }; color: Color }[] = [];
      visual.traverse((object) => {
        if (!(object instanceof Mesh) || object.name.endsWith('HitTarget')) return;
        const replace = (material: Material): Material => {
          if (!('color' in material) || !(material.color instanceof Color)) return material;
          if ('isLineMaterial' in material) {
            entries.push({ material: material as Material & { color: Color }, color: material.color.clone() }); return material;
          }
          let clone = clones.get(material);
          if (!clone) {
            clone = material.clone(); clones.set(material, clone); this.ownedContrastMaterials.push(clone);
            entries.push({ material: clone as Material & { color: Color }, color: material.color.clone() });
          }
          return clone;
        };
        object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
      });
      this.contrastMaterials.set(id, entries);
    }
  }

  private contrast(selected: DeviceId | null, strength: number): void {
    const paper = new Color(PALETTE.paper);
    for (const [id, entries] of this.contrastMaterials) {
      const amount = id === selected ? 0 : Math.max(0, Math.min(1, strength)) * 0.55;
      for (const entry of entries) entry.material.color.copy(entry.color).lerp(paper, amount);
    }
  }

  telemetry(activeAdapter: DeviceId | null): string {
    const pose = this.cameraRig.snapshot();
    const visual = this.state?.mode === 'focus' ? this.workstation.visuals.get(this.state.device) : null;
    return `${this.state?.mode === 'focus' ? `${this.state.device}:${this.state.phase}` : 'overview'} · ${this.motion.name ?? 'idle'} ${this.motion.progress.toFixed(2)}\n${this.frameMs.toFixed(1)} ms · ${this.frameMs > 0 ? Math.round(1000 / this.frameMs) : 0} observed fps · ${this.renderer.info.render.calls} draws · ${this.renderer.info.render.triangles} triangles\nadapter ${activeAdapter ?? 'none'} · local ${visual ? `${visual.position.z.toFixed(2)} Z / ${MathUtils.radToDeg(visual.rotation.z).toFixed(2)}° yaw` : 'rest'}\ncamera ${pose.position.toArray().map((n) => n.toFixed(1)).join(',')} → ${pose.target.toArray().map((n) => n.toFixed(1)).join(',')} · ${pose.fov.toFixed(1)}°`;
  }

  preview(id: DeviceId, progress: number): void {
    if (!import.meta.env.DEV) return;
    this.applyState({ mode: 'overview', revision: this.state?.revision ?? 0 }, () => {});
    this.applyState({ mode: 'focus', device: id, phase: 'entering', revision: this.state?.revision ?? 0 }, () => {});
    this.motion.preview(`focus:${id}`, progress); this.render();
  }

  restore(state: SceneState): void {
    this.motion.cancel(); this.state = state;
    const id = state.mode === 'focus' ? state.device : null;
    this.registerPoses(); this.cameraRig.applyPose(this.cameraRig.poseFor(id));
    for (const [device, visual] of this.workstation.visuals) {
      visual.position.z = device === id ? FOCUS_LIFT[device] : 0;
      visual.rotation.z = device === id ? MathUtils.degToRad(FOCUS_YAW[device]) : 0;
    }
    this.contrast(id, id ? 1 : 0); this.keys.detail(id === 'keyboard'); this.invalidate();
  }

  private registerPoses(): void {
    this.worldRoot.updateMatrixWorld(true);
    for (const [id, root] of this.deviceRoots) {
      const target = root.getObjectByName('cameraFocus')!.getWorldPosition(new Vector3());
      if (id !== 'monitor' && id !== 'camera') target.z += FOCUS_LIFT[id];
      this.cameraRig.registerFocusPose(id, focusPose(id, target, this.width / this.height));
    }
  }

  pick(x: number, y: number): DeviceId | null {
    if (this.state?.mode !== 'overview') return null;
    this.worldRoot.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.cameraRig.camera);
    return this.raycaster.intersectObjects(this.workstation.hitTargets, false)[0]?.object.userData.device ?? null;
  }

  hover(id: DeviceId | null): void { this.hovered = id; this.invalidate(); }

  keyboard(snapshot: KeyboardSnapshot): void { this.keys.update(snapshot); this.invalidate(); }

  pointer(snapshot: PointerSnapshot): void {
    this.workstation.mouseButtons.forEach((button, index) => {
      const down = (snapshot.buttons & (index === 0 ? 1 : 2)) !== 0;
      button.object.position.z = down ? 3.25 : 3.45;
      button.mesh.material = down ? this.materials.ink : this.materials.paper;
    });
    this.workstation.mouseWheel.rotation.x = snapshot.wheel.angle;
    const wheelMesh = this.workstation.mouseWheel.children.find((child) => child instanceof Mesh) as Mesh | undefined;
    if (wheelMesh) wheelMesh.material = snapshot.buttons & 4 ? this.materials.sideDeep : this.materials.ink;
    const points: Vector3[] = [];
    if (!this.reducedMotion) for (const sample of snapshot.trail) {
      this.raycaster.setFromCamera(new Vector2(sample.x / this.width * 2 - 1, 1 - sample.y / this.height * 2), this.cameraRig.camera);
      const point = this.raycaster.ray.intersectPlane(new Plane(new Vector3(0, 0, 1), -0.035), new Vector3());
      if (point && point.distanceTo(this.deviceRoots.get('mouse')!.getWorldPosition(new Vector3())) < 45) points.push(point);
    }
    const signature = snapshot.trail.map((point) => point.time).join(',');
    if (signature !== this.trailSignature) {
      this.trailSignature = signature; this.trail.setPoints(points.flatMap((point, i) => i === 0 ? [] : [points[i - 1]!, point]));
    }
    this.invalidate();
  }

  monitor(canvas: HTMLCanvasElement): void {
    if (this.screenTexture?.image !== canvas) {
      this.screenTexture?.dispose(); this.screenTexture = new CanvasTexture(canvas); this.screenTexture.colorSpace = SRGBColorSpace;
      this.workstation.screen.material.map = this.screenTexture; this.workstation.screen.material.needsUpdate = true;
    }
    this.workstation.screen.material.color.set(0xffffff);
    this.screenTexture.needsUpdate = true; this.invalidate();
  }

  resetMonitor(): void {
    this.workstation.screen.material.map = null; this.workstation.screen.material.color.set(PALETTE.paper);
    this.workstation.screen.material.needsUpdate = true; this.invalidate();
  }

  camera(snapshot: CameraSnapshot): void {
    if (snapshot.video) {
      if (this.videoTexture?.image !== snapshot.video) { this.videoTexture?.dispose(); this.videoTexture = new VideoTexture(snapshot.video); this.videoTexture.colorSpace = SRGBColorSpace; }
      this.workstation.video.material.map = this.videoTexture;
      this.workstation.video.material.needsUpdate = true;
      this.workstation.video.visible = true;
      const aspect = snapshot.settings?.aspectRatio ?? (snapshot.video.videoWidth && snapshot.video.videoHeight ? snapshot.video.videoWidth / snapshot.video.videoHeight : 16 / 9);
      const height = Math.min(3.5, 7.44 / aspect); const width = height * aspect;
      this.workstation.video.scale.set(width / 2.4, height / 1.5, 1);
    } else {
      this.workstation.video.visible = false; this.workstation.video.material.map = null;
      this.videoTexture?.dispose(); this.videoTexture = null;
    }
    this.workstation.cameraLens.visible = !snapshot.video;
    const failed = !['idle', 'live', 'requesting'].includes(snapshot.state);
    this.workstation.cameraStatus.setPoints(failed ? [new Vector3(-1.1, -2.42, 1), new Vector3(1.1, -2.42, 3.2)] : []);
    this.invalidate();
  }

  gamepad(snapshot: GamepadSnapshot | null): void {
    for (const [index, button] of this.workstation.buttons) {
      const value = snapshot?.standard ? snapshot.buttons[index] ?? 0 : 0;
      button.object.position.z = (index === 10 || index === 11 ? 5.25 : 5) - value * (index === 6 || index === 7 ? 0.8 : 0.18);
      button.mesh.material = value > 0.1 ? this.materials.ink : this.materials.paper;
    }
    this.workstation.sticks.forEach((stick, i) => {
      stick.position.x = (i === 0 ? -2.7 : 2.7) + (snapshot?.standard ? snapshot.axes[i * 2] ?? 0 : 0) * 0.7;
      stick.position.y = -1 - (snapshot?.standard ? snapshot.axes[i * 2 + 1] ?? 0 : 0) * 0.7;
    });
    this.invalidate();
  }

  audio(snapshot: AudioSnapshot, nowMs: number): void {
    const points: Vector3[] = [];
    if (snapshot.microphone === 'live') {
      const count = 64;
      const driver = this.workstation.drivers[0]!;
      for (let i = 0; i < count; i++) points.push(driver.localToWorld(new Vector3(i / (count - 1) * 14, (snapshot.waveform[Math.floor(i / count * snapshot.waveform.length)] ?? 0) * 8, 0.3)));
    }
    this.waveform.setPoints(points.flatMap((point, i) => i === 0 ? [] : [points[i - 1]!, point]));
    this.waves.forEach((wave, index) => {
      const side = index < 2 ? 0 : 1;
      if (!snapshot.output || this.reducedMotion || snapshot.channel === (side === 0 ? 'right' : 'left')) { wave.setPoints([]); return; }
      const t = ((nowMs / 700 + index / 2) % 1); const radius = 2.8 + t * 6;
      const driver = this.workstation.drivers[side]!;
      const ring = Array.from({ length: 32 }, (_, i) => driver.localToWorld(new Vector3(Math.cos(i / 32 * Math.PI * 2) * radius, Math.sin(i / 32 * Math.PI * 2) * radius, 0.3 + t * 4)));
      wave.setPoints(ring.flatMap((point, i) => [point, ring[(i + 1) % ring.length]!]));
      wave.object.material.opacity = (1 - t) * 0.6 * snapshot.outputLevel; wave.object.material.transparent = true;
    });
    this.invalidate();
  }

  anchor(id: DeviceId): { x: number; y: number; visible: boolean } {
    const visual = this.workstation.visuals.get(id)!;
    const anchor = this.deviceRoots.get(id)!.getObjectByName('labelAnchor') ?? this.deviceRoots.get(id)!.getObjectByName('cameraFocus')!;
    const point = visual.localToWorld(anchor.position.clone());
    point.project(this.cameraRig.camera);
    return { x: (point.x + 1) / 2 * this.width, y: (1 - point.y) / 2 * this.height, visible: Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z < 1 };
  }

  render(): void {
    if (!this.dirty) return;
    this.worldRoot.updateMatrixWorld(true);
    this.workstation.update(this.cameraRig.camera);
    this.debug?.update();
    this.renderer.render(this.scene, this.cameraRig.camera);
    this.dirty = false;
  }

  dispose(): void {
    this.motion.cancel();
    this.workstation.dispose();
    this.keys.dispose(); this.trail.dispose();
    this.waveform.dispose(); this.waves.forEach((wave) => wave.dispose()); this.screenTexture?.dispose(); this.videoTexture?.dispose();
    this.debug?.dispose();
    this.scene.clear();
    this.worldRoot.clear();
    this.deviceRoots.clear();
    for (const material of Object.values(this.materials)) material.dispose();
    this.ownedContrastMaterials.forEach((material) => material.dispose());
    this.renderer.dispose();
  }
}
