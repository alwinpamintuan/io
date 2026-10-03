import type { DeviceId, SceneState } from '../app/state';
import type { SceneController } from '../scene/SceneController';
import type { CameraSnapshot } from '../input/CameraAdapter';
import type { GamepadSnapshot } from '../input/GamepadAdapter';
import { designButton } from './controls';
import { OverviewField } from './OverviewField';

export class OverlayManager {
  readonly root = document.createElement('section');
  readonly metrics = document.createElement('output');
  readonly controls = document.createElement('div');
  readonly message = document.createElement('p');
  private readonly connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  private readonly path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  private readonly live = document.createElement('span');
  private device: DeviceId | null = null;
  private entering = false;
  private readonly preview = document.createElement('div');
  private readonly previewStatus = document.createElement('span');
  private readonly cameraGuides = document.createElement('div');
  private video: HTMLVideoElement | null = null;
  private mirror = false;
  private readonly drafting = document.createElement('div');
  private readonly indexed = document.createElement('div');
  private indexedSignature = '';
  readonly overviewField: OverviewField | null;
  constructor(parent: HTMLElement, private readonly scene: Pick<SceneController, 'anchor'> & Partial<Pick<SceneController, 'focusProgress' | 'focusBounds' | 'screenBounds' | 'overviewBounds'>>) {
    this.overviewField = scene.overviewBounds ? new OverviewField(parent, { overviewBounds: scene.overviewBounds.bind(scene) }) : null;
    this.root.className = 'instrument'; this.root.hidden = true;
    this.root.ariaLabel = 'Device test'; this.metrics.className = 'measurements';
    this.metrics.setAttribute('aria-live', 'off'); this.metrics.setAttribute('role', 'group');
    this.controls.className = 'test-controls'; this.message.className = 'test-message';
    this.preview.className = 'camera-preview'; this.preview.ariaLabel = 'Local webcam viewing frame'; this.preview.hidden = true;
    this.previewStatus.className = 'preview-status'; this.preview.append(this.previewStatus);
    this.cameraGuides.className = 'camera-guides'; this.cameraGuides.ariaHidden = 'true'; this.cameraGuides.hidden = true; this.preview.append(this.cameraGuides);
    this.indexed.className = 'indexed-controls'; this.indexed.hidden = true; this.indexed.tabIndex = 0; this.indexed.setAttribute('role', 'group'); this.indexed.ariaLabel = 'Browser indexed controller observations';
    this.message.setAttribute('role', 'status'); this.root.append(this.preview, this.metrics, this.indexed, this.controls, this.message); parent.append(this.root);
    this.drafting.className='drafting-marks'; this.drafting.ariaHidden='true'; parent.append(this.drafting);
    for(let i=0;i<4;i++) { const mark=document.createElement('span');mark.className=`registration corner-${i}`;this.drafting.append(mark);const corner=mark.cloneNode() as HTMLElement;this.preview.append(corner); }
    this.connector.classList.add('annotation-connector'); this.connector.setAttribute('aria-hidden', 'true');
    this.connector.append(this.path); this.connector.style.display = 'none'; parent.append(this.connector);
    this.live.className = 'sr-only'; this.live.setAttribute('role', 'status'); parent.append(this.live);
  }
  state(state: SceneState): void {
    this.overviewField?.state(state);
    const previous = this.device;
    this.announce('');
    this.metrics.removeAttribute('aria-label'); this.metrics.removeAttribute('style');
    this.entering = state.mode === 'focus' && state.phase === 'entering';
    this.device = state.mode === 'focus' && (state.phase === 'active' || this.entering) ? state.device : null;
    this.controls.inert = this.entering;
    if (previous !== this.device) { this.controls.replaceChildren(); this.metrics.textContent = ''; this.message.textContent = ''; }
    this.root.classList.toggle('camera-instrument', this.device === 'camera');
    this.root.dataset.device = this.device ?? ''; this.root.style.width='';
    this.preview.hidden = this.device !== 'camera';
    this.indexed.hidden = this.device !== 'controller' || !this.indexed.childElementCount;
    this.drafting.hidden = state.mode === 'focus' && state.device === 'monitor';
    this.root.hidden = !this.device;
    this.connector.style.display = this.device ? '' : 'none';
    if (!this.device) { this.metrics.textContent = ''; this.controls.replaceChildren(); this.message.textContent = ''; }
    else this.root.ariaLabel = `${this.device} test`;
    if (!this.device) { this.video?.remove(); this.video = null; this.mirror = false; this.previewStatus.textContent = ''; }
  }
  camera(value: CameraSnapshot): void {
    if (this.device !== 'camera') return;
    this.preview.dataset.state = value.state;
    this.cameraGuides.hidden = value.state !== 'live';
    const aspect = value.video?.videoWidth && value.video.videoHeight ? value.video.videoWidth / value.video.videoHeight
      : value.settings?.width && value.settings.height ? value.settings.width / value.settings.height : value.settings?.aspectRatio || 16 / 9;
    this.cameraGuides.style.width = `${Math.min(1, aspect / (16 / 9)) * 100}%`;
    this.cameraGuides.style.height = `${Math.min(1, (16 / 9) / aspect) * 100}%`;
    this.previewStatus.textContent = value.state === 'requesting' ? '…' : value.state === 'idle' ? '+' : value.state === 'live' ? '' : '∕';
    if (this.video !== value.video) { this.video?.remove(); this.video = value.video; if (this.video) this.preview.append(this.video); }
    if (this.video) { this.video.style.transform = this.mirror ? 'scaleX(-1)' : ''; this.video.ariaLabel = 'Local webcam preview'; }
  }
  setMirror(value: boolean): void { this.mirror = value; if (this.video) this.video.style.transform = value ? 'scaleX(-1)' : ''; }
  gamepad(value: GamepadSnapshot | null): void {
    const observations = value ? [...value.buttons.map((v, i) => ({ label: `B${i}`, value: v, axis: false })).filter((_, i) => !value.standard || i >= 17), ...value.axes.map((v, i) => ({ label: `A${i}`, value: v, axis: true })).filter((_, i) => !value.standard || i >= 4)] : [];
    const signature = observations.map(o => `${o.label}:${o.value}`).join('|'); if (signature === this.indexedSignature) return; this.indexedSignature = signature;
    this.indexed.replaceChildren(); observations.forEach(o => {
      const row = document.createElement('span'); row.className = 'indexed-observation'; row.textContent = `${o.label} ${o.value.toFixed(3)}`;
      row.style.setProperty('--value', `${(o.axis ? (o.value + 1) / 2 : o.value) * 100}%`); row.ariaLabel = `${o.label} browser reported ${o.value}`; this.indexed.append(row);
    }); this.indexed.hidden = this.device !== 'controller' || !observations.length;
  }
  button(label: string, action: () => void, name = label): HTMLButtonElement {
    const button = document.createElement('button'); button.type = 'button'; designButton(button, label, name);
    button.addEventListener('click', action); this.controls.append(button); return button;
  }
  setMessage(value: string, visible = false): void { if (this.message.textContent !== value) this.message.textContent = value; this.message.classList.toggle('sr-only', !visible); }
  announce(value: string): void { if (this.live.textContent !== value) this.live.textContent = value; }
  update(): void {
    this.overviewField?.update();
    if (!this.device) return;
    const progress = this.scene.focusProgress?.() ?? 1;
    this.root.hidden = this.entering && progress < 0.7;
    this.root.style.opacity = String(this.entering ? Math.min(1, Math.max(0, (progress - 0.7) / 0.25)) : 1);
    this.root.style.pointerEvents = this.entering ? 'none' : '';
    const anchor = this.scene.anchor(this.device);
    // Line begins at the projected device anchor; text occupies adjoining negative space.
    if(this.device==='camera') this.root.style.width=`${Math.min(window.innerWidth>=600 ? window.innerWidth*.36 : window.innerWidth-48,480)}px`;
    const width = this.root.offsetWidth || 290;
    const bounds = this.scene.focusBounds?.(this.device);
    const height=this.root.offsetHeight;
    const w=window.innerWidth,h=window.innerHeight;
    let x=anchor.x+40,y=anchor.y+40;
    const camera=this.device==='camera';
    if(camera) {
      x=w>=600 ? (bounds?.right ?? anchor.x)+28 : 24;
      y=w>=600 ? anchor.y-this.preview.offsetHeight/2 : (bounds?.bottom ?? anchor.y)+28;
    } else if(w>=800) {
      if(this.device==='keyboard') {x=32;y=h-height-28;}
      if(this.device==='mouse') {x=w*.68;y=h*.2;}
      if(this.device==='controller') {x=w*.67;y=h*.68;}
      if(this.device==='audio') {x=w*.49;y=h*.75;}
      if(this.device==='microphone') {x=w*.61;y=h*.52;}
      if(this.device==='monitor') {x=32;y=h-height-24;}
    } else if(bounds) {x=24;y=bounds.bottom+24;}
    x=Math.min(w-width-24,Math.max(24,x));y=Math.min(h-height-24,Math.max(90,y));
    if(this.device==='monitor'&&this.scene.screenBounds&&w>=800) {
      const screen=this.scene.screenBounds();
      this.metrics.style.bottom='auto';this.metrics.style.right='auto';
      this.metrics.style.left=`${screen.right-x-this.metrics.offsetWidth-16}px`;
      this.metrics.style.top=`${screen.top-y+16}px`;
    }
    this.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    this.root.style.setProperty('--anchor-offset', `${Math.round(anchor.x - x)}px`);
    const edge=camera&&w<600?x+width:x;
    const elbow=camera&&w<600?edge+12:edge-12;
    this.path.setAttribute('d', `M${anchor.x},${anchor.y} H${elbow} V${y+this.preview.offsetHeight/2} H${edge}`);
    this.connector.style.visibility = camera && anchor.visible && !this.root.hidden ? 'visible' : 'hidden';
  }
  dispose(): void { this.overviewField?.dispose(); this.video?.remove(); this.root.remove(); this.connector.remove(); this.live.remove(); this.drafting.remove(); }
}
