import { Box3, CanvasTexture, Color, Group, MathUtils, Mesh, NearestFilter, NoToneMapping, Plane, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from 'three';
import type { Material } from 'three';
import type { DeviceId } from '../app/state';
import type { SceneAction, SceneState } from '../app/state';
import { DEVICE_IDS } from '../app/state';
import { CameraRig, createOverviewPose } from './CameraRig';
import { MeasurementField, controllerCalibration } from './MeasurementField';
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
import type { MicrophoneSnapshot } from '../input/MicrophoneAdapter';
import { createControllerLegends } from './devices/controllerLegends';
import type { LegendStyle } from './devices/controllerLegends';
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
  private readonly direction = new GraphicLines('detail');
  private readonly controllerVectors = new GraphicLines('detail');
  private lastGamepad: GamepadSnapshot | null = null;
  private readonly measurementField: MeasurementField;
  private readonly hiddenDevices = new Set<DeviceId>();
  private trailSignature = '';
  private pointerAge = .65;
  private pointerTime: number | null = null;
  private wheelObservedAngle = 0;
  private wheelTargetAngle = 0;
  private dispatch: ((action: SceneAction) => void) | null = null;
  private screenTexture: CanvasTexture | null = null;
  private readonly legends: ReturnType<typeof createControllerLegends>;
  private readonly detailBounds = new Map<DeviceId, Box3>();
  private readonly detailStrength = new Map<DeviceId, number>();
  private readonly waveform = new GraphicLines('detail');
  private readonly stickScopes = [new GraphicLines('detail'), new GraphicLines('detail')];
  private readonly waves = Array.from({ length: 4 }, () => new GraphicLines('construction'));
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
    this.renderer.setClearColor(this.debugOptions.flat ? 0xe8e8e8 : PALETTE.background, 1);
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
    if (this.debugOptions.silhouette) {
      this.workstation.solids.forEach(solid => { solid.mesh.material = this.materials.ink; solid.silhouette.object.visible = false; solid.construction.object.visible = false; });
      this.keys.group.visible = false;
      this.workstation.screen.material.color.set(PALETTE.ink);
    }
    this.cloneDeviceMaterials();
    this.legends = createControllerLegends(this.workstation.buttons); this.legends.detail(0);
    this.worldRoot.updateMatrixWorld(true);
    this.workstation.visuals.forEach((visual, id) => { this.detailBounds.set(id, new Box3().setFromObject(visual)); this.detailStrength.set(id, 0); });
    this.measurementField = new MeasurementField(this.workstation.visuals, this.workstation.drivers, this.workstation.micEffect);
    this.worldRoot.add(this.measurementField.root);
    this.trail.object.name = 'PointerTrail'; this.worldRoot.add(this.trail.object);
    this.direction.object.name = 'PointerDirection'; this.worldRoot.add(this.direction.object);
    this.controllerVectors.object.name = 'ControllerVectors'; this.workstation.visuals.get('controller')!.add(this.controllerVectors.object);
    this.controllerVectors.object.material.linewidth = 1.2;
    this.stickScopes.forEach(scope => { scope.object.material.linewidth = 1; });
    this.worldRoot.add(this.waveform.object, ...this.waves.map((wave) => wave.object), ...this.stickScopes.map(scope => scope.object));
    this.waveform.object.visible = false; this.waves.forEach((wave) => { wave.object.visible = false; });
    this.worldRoot.updateMatrixWorld(true);
    this.debug = import.meta.env.DEV
      ? createSceneDebug(this.debugOptions, this.workstation.solids, this.workstation.anchors, this.cameraRig) : null;
    if (this.debug) this.scene.add(this.debug.root);
    if (import.meta.env.DEV) this.setDeviceVisibility(new URLSearchParams(window.location.search).get('debugHide')?.split(',') ?? []);
  }

  /** Presentation policy only: visibility does not assert browser hardware knowledge.
   * Keep the selected tester accessible even when its overview object is omitted. */
  setDeviceVisibility(hidden: readonly string[]): void {
    this.hiddenDevices.clear();
    for (const id of DEVICE_IDS) if (hidden.includes(id) && !['monitor', 'keyboard', 'mouse'].includes(id)) this.hiddenDevices.add(id);
    const pose = createOverviewPose();
    const scale = 1 - this.hiddenDevices.size * .018;
    pose.position.sub(pose.target).multiplyScalar(scale).add(pose.target);
    this.cameraRig.setOverviewPose(pose); this.measurementField.layout(this.hiddenDevices.size);
    if (this.state && this.motion.active && this.dispatch) this.applyState(this.state, this.dispatch);
    else if (this.state) this.restore(this.state);
    this.invalidate();
  }

  private presentFields(): void {
    const selected = this.state?.mode === 'focus' ? this.state.device : null;
    for (const [id, root] of this.deviceRoots) root.visible = !this.hiddenDevices.has(id) || id === selected;
    const stable = this.state?.mode === 'focus' && this.state.phase !== 'exiting' && (!this.motion.active || this.motion.progress >= .7);
    this.measurementField.state(selected, stable && !this.debugOptions.flat && !this.debugOptions.silhouette);
    this.controllerVectors.object.visible = selected === 'controller' && stable && this.controllerVectors.object.geometry.instanceCount > 0;
    if (this.debugOptions.flat || this.debugOptions.silhouette) this.measurementField.root.visible = false;
  }

  applyState(state: SceneState, dispatch: (action: SceneAction) => void): void {
    this.dispatch = dispatch;
    const previous = this.state;
    this.state = state;
    this.presentFields();
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
        const clearTuck=selected && id==='controller' && !this.reducedMotion;
        visual.position.z = MathUtils.lerp(corridor && entry ? 0 : z, lift, clearTuck?Math.min(1,t/.7):t);
        visual.rotation.z = MathUtils.lerp(corridor && entry ? 0 : yaw, rotation, clearTuck?Math.max(0,(t-.12)/.88):t);
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
    this.direction.resize(width, height); this.controllerVectors.resize(width, height); this.measurementField.resize(width, height);
    this.waveform.resize(width, height); this.waves.forEach((wave) => wave.resize(width, height));
    this.stickScopes.forEach(scope => scope.resize(width,height));
    this.registerPoses();
    if (this.motion.active && this.state && this.dispatch) this.applyState(this.state, this.dispatch);
    else this.cameraRig.applyPose(this.cameraRig.poseFor(this.state?.mode === 'focus' ? this.state.device : null));
    this.gamepad(this.lastGamepad);
    this.invalidate();
  }

  invalidate(): void {
    this.dirty = true;
  }
  focusProgress(): number { return this.motion.active ? this.motion.progress : 1; }

  update(deltaSeconds: number): void {
    this.frameMs = deltaSeconds * 1000;
    this.motion.update(deltaSeconds);
    if (this.pointerAge < .65) {
      this.pointerAge = Math.min(.65, this.pointerAge + deltaSeconds);
      for (const line of [this.trail, this.direction]) {
        line.object.material.transparent = true; line.object.material.opacity = .65 * (1 - this.pointerAge / .65);
      }
      this.invalidate();
    }
    const wheel=this.workstation.mouseWheel;
    if(Math.abs(wheel.rotation.x-this.wheelTargetAngle)>.001) {
      wheel.rotation.x=this.reducedMotion?this.wheelTargetAngle:MathUtils.lerp(wheel.rotation.x,this.wheelTargetAngle,1-Math.exp(-deltaSeconds/0.025));
      if(Math.abs(wheel.rotation.x-this.wheelTargetAngle)<.001)wheel.rotation.x=this.wheelTargetAngle;
      this.invalidate();
    }
    this.resolveDetail(deltaSeconds);
    this.presentFields();
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
        if (!(object instanceof Mesh) || object.name.endsWith('HitTarget') || object === this.workstation.screen) return;
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
    if (this.debugOptions.flat || this.debugOptions.silhouette) return;
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
    this.presentFields();
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
    return this.raycaster.intersectObjects(this.workstation.hitTargets.filter(mesh => !this.hiddenDevices.has(mesh.userData.device)), false)[0]?.object.userData.device ?? null;
  }

  hover(id: DeviceId | null): void { this.hovered = id; this.invalidate(); }

  keyboard(snapshot: KeyboardSnapshot): void { this.keys.update(snapshot); this.invalidate(); }

  pointer(snapshot: PointerSnapshot): void {
    this.workstation.mouseButtons.forEach((button, index) => {
      const down = (snapshot.buttons & [1, 2, 8, 16][index]!) !== 0;
      button.object.position.copy(this.workstation.mouseRest[index]!);
      if (index < 2) button.object.position.z -= down ? 0.08 : 0; else button.object.position.x += down ? 0.035 : 0;
      button.mesh.material = down ? this.materials.ink : index < 2 ? this.materials.paper : this.materials.sideDeep;
    });
    const wheelDelta=snapshot.wheel.angle-this.wheelObservedAngle;
    this.wheelObservedAngle=snapshot.wheel.angle;
    this.wheelTargetAngle=snapshot.wheel.angle===0?0:this.wheelTargetAngle+MathUtils.clamp(wheelDelta,-Math.PI/3,Math.PI/3);
    this.workstation.mouseWheel.position.z=2.85-(snapshot.buttons&4?.08:0);
    const wheelMesh = this.workstation.mouseWheel.children.find((child) => child instanceof Mesh) as Mesh | undefined;
    if (wheelMesh) wheelMesh.material = snapshot.buttons & 4 ? this.materials.sideDeep : this.materials.ink;
    const points: Vector3[] = [];
    if (!this.reducedMotion) for (const sample of snapshot.trail) {
      this.raycaster.setFromCamera(new Vector2(sample.x / this.width * 2 - 1, 1 - sample.y / this.height * 2), this.cameraRig.camera);
      const point = this.raycaster.ray.intersectPlane(new Plane(new Vector3(0, 0, 1), -0.035), new Vector3());
      if (point) points.push(point);
    }
    const signature = snapshot.trail.map((point) => point.time).join(',');
    const latestTime = snapshot.trail.at(-1)?.time ?? null;
    if (latestTime !== this.pointerTime) { this.pointerTime = latestTime; if (latestTime !== null) this.pointerAge = 0; }
    if (signature !== this.trailSignature) {
      this.trailSignature = signature; this.trail.setPoints(points.flatMap((point, i) => i === 0 ? [] : [points[i - 1]!, point]));
      const last = points.at(-1), previous = points.at(-2);
      const arrow: Vector3[] = [];
      if (last && previous && last.distanceTo(previous) > .01) {
        const vector = last.clone().sub(previous).normalize();
        const end = last.clone().addScaledVector(vector, 1.6);
        const normal = new Vector3(-vector.y, vector.x, 0);
        arrow.push(last, end, end, end.clone().addScaledVector(vector, -.6).addScaledVector(normal, .3), end, end.clone().addScaledVector(vector, -.6).addScaledVector(normal, -.3));
      }
      this.direction.setPoints(arrow);
    }
    this.invalidate();
  }

  monitor(canvas: HTMLCanvasElement): void {
    if (this.debugOptions.flat || this.debugOptions.silhouette) return;
    this.workstation.screenIdentity.visible = false;
    if (this.screenTexture?.image !== canvas) {
      this.screenTexture?.dispose(); this.screenTexture = new CanvasTexture(canvas); this.screenTexture.colorSpace = SRGBColorSpace;
    }
    if (this.workstation.screen.material.map !== this.screenTexture) { this.workstation.screen.material.map = this.screenTexture; this.workstation.screen.material.needsUpdate = true; }
    this.workstation.screen.material.color.set(0xffffff);
    this.screenTexture.minFilter = NearestFilter; this.screenTexture.magFilter = NearestFilter; this.screenTexture.generateMipmaps = false; this.screenTexture.needsUpdate = true; this.invalidate();
  }

  resetMonitor(): void {
    this.workstation.screenIdentity.visible = !this.debugOptions.flat && !this.debugOptions.silhouette;
    this.workstation.screen.material.map = null; this.workstation.screen.material.color.set(PALETTE.paper);
    this.workstation.screen.material.needsUpdate = true; this.invalidate();
  }

  camera(snapshot: CameraSnapshot): void {
    const failed = !['idle', 'live', 'requesting'].includes(snapshot.state);
    this.workstation.cameraStatus.setPoints(failed ? [new Vector3(-1.1, -2.42, 1), new Vector3(1.1, -2.42, 3.2)] : []);
    this.invalidate();
  }

  controllerStyle(style: LegendStyle): void { this.legends.setStyle(style); this.invalidate(); }

  private resolveDetail(delta: number): void {
    for (const [id, bounds] of this.detailBounds) {
      const visual = this.workstation.visuals.get(id)!;
      // Bounds were authored in world space at rest; project their corners through the shared rig.
      const corners: Vector3[] = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new Vector3(x, y, z + visual.position.z).project(this.cameraRig.camera));
      const occupancy = Math.max((Math.max(...corners.map(p => p.x)) - Math.min(...corners.map(p => p.x))) / 2, (Math.max(...corners.map(p => p.y)) - Math.min(...corners.map(p => p.y))) / 2);
      const selected = this.state?.mode === 'focus' && this.state.device === id && this.state.phase !== 'exiting';
      const target = selected && !this.debugOptions.flat ? MathUtils.clamp((occupancy - (id === 'controller' || id === 'keyboard' ? 0.3 : 0.18)) / 0.18, 0, 1) : 0;
      const previous = this.detailStrength.get(id) ?? 0;
      let value = MathUtils.lerp(previous, target, Math.min(1, delta / 0.1)); if (Math.abs(value - target) < 0.005) value = target;
      if (value !== previous) this.invalidate(); this.detailStrength.set(id, value);
      const group = this.workstation.detailGroups.get(id); if (group) { group.visible = value > 0; group.traverse(object => { if (object instanceof Mesh && !Array.isArray(object.material)) { object.material.transparent = true; object.material.opacity = value; } }); }
      // Neutral marks identify the illustrated controls even without hardware.
      // Unknown mappings retain generic observations instead of implied labels.
      if (id === 'controller') this.legends.detail(value);
      if (id === 'keyboard') this.keys.detail(value);
    }
  }

  gamepad(snapshot: GamepadSnapshot | null): void {
    this.lastGamepad = snapshot;
    this.legends.mapping(snapshot?.standard ?? null);
    for (const [index, button] of this.workstation.buttons) {
      const value = snapshot?.standard ? snapshot.buttons[index] ?? 0 : 0;
      const trigger = index === 6 || index === 7;
      const pressed = !!snapshot?.standard && (trigger ? value > 0.1 : snapshot.pressed[index] ?? false);
      const travel = index === 8 || index === 9 || index === 16 ? .1 : .18;
      button.object.position.z = this.workstation.buttonRest.get(index)!.z - (trigger ? value * 0.8 : pressed ? travel : 0);
      const dark = index === 10 || index === 11;
      this.legends.press(index, dark ? !pressed : pressed);
      button.mesh.material = dark ? pressed ? this.materials.paper : this.materials.ink : pressed ? this.materials.ink : this.materials.paper;
    }
    this.workstation.sticks.forEach((stick, i) => {
      stick.position.x = (i === 0 ? -2.7 : 2.7) + (snapshot?.standard ? snapshot.axes[i * 2] ?? 0 : 0) * 0.7;
      stick.position.y = -1 - (snapshot?.standard ? snapshot.axes[i * 2 + 1] ?? 0 : 0) * 0.7;
    });
    this.stickScopes.forEach((scope,i) => {
      if (!snapshot?.standard || snapshot.axes.length < (i+1)*2) { scope.setPoints([]);return; }
      // The stick gate is the diagnostic surface.
      // World-space rings remain attached through lift/yaw and leave annotations
      // free to grow with real button observations in adjacent negative space.
      const visual=this.workstation.visuals.get('controller')!;
      const cx=i===0?-2.7:2.7, radius=1.6;
      const point=(dx:number,dy:number)=>visual.localToWorld(new Vector3(cx+dx,-1-dy,2.96));
      const ring=Array.from({length:64},(_,j)=>point(Math.cos(j/64*Math.PI*2)*radius,Math.sin(j/64*Math.PI*2)*radius));
      const points=ring.flatMap((p,j)=>[p,ring[(j+1)%ring.length]!]);
      const dead=Array.from({length:32},(_,j)=>point(Math.cos(j/32*Math.PI*2)*radius*.1,Math.sin(j/32*Math.PI*2)*radius*.1));
      points.push(...dead.flatMap((p,j)=>[p,dead[(j+1)%dead.length]!]));
      points.push(point(0,0),point(snapshot.axes[i*2]!*radius,snapshot.axes[i*2+1]!*radius));
      scope.setPoints(points);
    });
    const vectors: Vector3[] = [];
    const calibration = controllerCalibration(this.width / this.height);
    if (snapshot?.standard) calibration.centers.forEach((x, i) => {
      if (snapshot.axes.length < (i + 1) * 2) return;
      const ax = snapshot.axes[i * 2]!, ay = snapshot.axes[i * 2 + 1]!;
      // The small center circle is a reference, not a claim about hardware dead zones.
      if (Math.hypot(ax, ay) < .01) return;
      const p = (xx: number, yy: number) => new Vector3(xx, yy, 3.04);
      vectors.push(p(x, calibration.y), p(x + ax * calibration.radius, calibration.y - ay * calibration.radius));
    });
    this.controllerVectors.setPoints(vectors);
    this.invalidate();
  }

  audio(snapshot: AudioSnapshot, nowMs: number): void {
    this.waves.forEach((wave, index) => {
      const side = index < 2 ? 0 : 1;
      if (!snapshot.output || this.reducedMotion || snapshot.channel === (side === 0 ? 'right' : 'left')) { wave.setPoints([]); return; }
      const t = ((nowMs / 700 + index / 2) % 1); const radius = 3.5 + t * 16;
      const driver = this.workstation.drivers[side]!;
      const ring = Array.from({ length: 33 }, (_, i) => {
        const angle = (i / 32 - .5) * Math.PI * .72;
        return driver.localToWorld(new Vector3(Math.cos(angle) * radius * (side === 0 ? 1 : -1), Math.sin(angle) * radius, .3));
      });
      wave.setPoints(ring.flatMap((point, i) => i === 0 ? [] : [ring[i - 1]!, point]));
      // This is initiated playback geometry, not measured acoustic amplitude.
      wave.object.material.opacity = (1 - t) * .45; wave.object.material.transparent = true;
    });
    this.invalidate();
  }

  microphone(snapshot: MicrophoneSnapshot): void {
    const points: Vector3[] = [];
    if (snapshot.state === 'live') for (let i = 0; i < 64; i++) points.push(this.workstation.micEffect.localToWorld(new Vector3(i / 63 * 21, 0, (snapshot.waveform[Math.floor(i / 64 * snapshot.waveform.length)] ?? 0) * 6)));
    else if (!['idle', 'requesting'].includes(snapshot.state)) points.push(this.workstation.micEffect.localToWorld(new Vector3(0, 0, -1)), this.workstation.micEffect.localToWorld(new Vector3(2, 0, 1)));
    this.waveform.setPoints(points.flatMap((point, i) => i === 0 ? [] : [points[i - 1]!, point])); this.invalidate();
  }

  anchor(id: DeviceId): { x: number; y: number; visible: boolean } {
    const visual = this.workstation.visuals.get(id)!;
    const anchor = this.deviceRoots.get(id)!.getObjectByName('labelAnchor') ?? this.deviceRoots.get(id)!.getObjectByName('cameraFocus')!;
    const point = visual.localToWorld(anchor.position.clone());
    point.project(this.cameraRig.camera);
    return { x: (point.x + 1) / 2 * this.width, y: (1 - point.y) / 2 * this.height, visible: Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z < 1 };
  }
  screenBounds(): { left:number;top:number;right:number;bottom:number } {
    const mesh=this.workstation.screen,positions=mesh.geometry.getAttribute('position');
    const points=Array.from({length:positions.count},(_,i)=>mesh.localToWorld(new Vector3().fromBufferAttribute(positions,i)).project(this.cameraRig.camera));
    return {left:Math.min(...points.map(p=>(p.x+1)/2*this.width)),right:Math.max(...points.map(p=>(p.x+1)/2*this.width)),top:Math.min(...points.map(p=>(1-p.y)/2*this.height)),bottom:Math.max(...points.map(p=>(1-p.y)/2*this.height))};
  }
  focusBounds(id: DeviceId): { right: number; bottom: number } {
    const box = this.detailBounds.get(id)!; const lift = this.workstation.visuals.get(id)!.position.z;
    const corners: Vector3[] = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z + lift).project(this.cameraRig.camera));
    return { right: Math.max(...corners.map(p => (p.x + 1) / 2 * this.width)), bottom: Math.max(...corners.map(p => (1 - p.y) / 2 * this.height)) };
  }

  render(): void {
    if (!this.dirty) return;
    this.worldRoot.updateMatrixWorld(true);
    this.presentFields();
    this.workstation.update(this.cameraRig.camera);
    if (this.debugOptions.flat) {
      this.workstation.solids.forEach(solid => { solid.mesh.material = this.materials.white; });
      this.workstation.screen.material.color.set(0xffffff);
      this.keys.inspect(); this.workstation.cameraStatus.object.visible = false;
      this.trail.object.visible = false; this.waveform.object.visible = false; this.waves.forEach(wave => { wave.object.visible = false; });
      this.direction.object.visible = false; this.controllerVectors.object.visible = false;
      this.stickScopes.forEach(scope=>{scope.object.visible=false;});
    }
    if (this.debugOptions.silhouette) {
      this.workstation.screenIdentity.visible = false;
      this.legends.detail(0);
      this.workstation.solids.forEach(solid => { solid.mesh.material = this.materials.ink; solid.silhouette.object.visible = false; solid.construction.object.visible = false; });
      this.worldRoot.traverse(object => { if (object.name === 'ContactShadow' || object.name === 'FocusDetail') object.visible = false; });
      this.trail.object.visible = false; this.waveform.object.visible = false; this.waves.forEach(wave => { wave.object.visible = false; }); this.workstation.cameraStatus.object.visible=false;
      this.direction.object.visible = false; this.controllerVectors.object.visible = false;
      this.stickScopes.forEach(scope=>{scope.object.visible=false;});
    }
    this.debug?.update();
    this.renderer.render(this.scene, this.cameraRig.camera);
    this.dirty = false;
  }

  dispose(): void {
    this.motion.cancel();
    this.workstation.dispose();
    this.keys.dispose(); this.trail.dispose();
    this.direction.dispose(); this.controllerVectors.dispose(); this.measurementField.dispose();
    this.waveform.dispose(); this.waves.forEach((wave) => wave.dispose()); this.stickScopes.forEach(scope=>scope.dispose()); this.screenTexture?.dispose(); this.legends.dispose();
    this.debug?.dispose();
    this.scene.clear();
    this.worldRoot.clear();
    this.deviceRoots.clear();
    for (const material of Object.values(this.materials)) material.dispose();
    this.ownedContrastMaterials.forEach((material) => material.dispose());
    this.renderer.dispose();
  }
}
