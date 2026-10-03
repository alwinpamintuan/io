import type { DeviceId, SceneState } from '../app/state';
import type { SceneController } from '../scene/SceneController';
import type { OverlayManager } from '../overlay/OverlayManager';
import { KeyboardAdapter } from './KeyboardAdapter';
import { PointerAdapter } from './PointerAdapter';
import { MonitorAdapter } from './MonitorAdapter';
import { CameraAdapter } from './CameraAdapter';
import { GamepadAdapter } from './GamepadAdapter';
import { AudioAdapter } from './AudioAdapter';
import { MicrophoneAdapter } from './MicrophoneAdapter';
import type { MediaInputs } from './MediaInputs';
import { designChoice, syncChoices } from '../overlay/controls';
import { LEGEND_STYLES } from '../scene/devices/controllerLegends';
import type { LegendStyle } from '../scene/devices/controllerLegends';
import { ERROR_TEXT } from './MediaCapture';
import type { CaptureState } from './MediaCapture';

function captureText(state: CaptureState, idle: string): string {
  return state === 'idle' ? idle : state === 'requesting' ? 'Waiting for permission…' : state === 'live' ? '' : ERROR_TEXT[state];
}
export type DeviceScene = Pick<SceneController, 'keyboard' | 'pointer' | 'monitor' | 'camera' | 'gamepad' | 'audio' | 'microphone' | 'controllerStyle' | 'invalidate' | 'resetMonitor'>;

/** All testers share the application's frame clock and one focus-scoped lifecycle. */
export class DeviceInputManager {
  readonly keyboard: KeyboardAdapter;
  readonly pointer: PointerAdapter;
  readonly monitor = new MonitorAdapter();
  readonly camera = new CameraAdapter();
  readonly controller = new GamepadAdapter();
  readonly audio = new AudioAdapter();
  readonly microphone = new MicrophoneAdapter();
  private mediaSelect: HTMLSelectElement | null = null;
  private active: DeviceId | null = null;
  private presented: DeviceId | null = null;
  private lastMetrics = 0;
  private lastAnnouncement = 0;
  private state: SceneState | null = null;
  private stopSubscriptions: (() => void)[];
  private controllerSelect: HTMLSelectElement | null = null;
  private hapticButton: HTMLButtonElement | null = null;
  private cameraStart: HTMLButtonElement | null = null;
  private microphoneStart: HTMLButtonElement | null = null;
  private fullscreenError: string | null = null;
  constructor(private readonly canvas: HTMLCanvasElement, private readonly scene: DeviceScene, private readonly overlay: OverlayManager) {
    this.keyboard = new KeyboardAdapter(window, canvas);
    this.pointer = new PointerAdapter(canvas);
    this.stopSubscriptions = [
      this.keyboard.subscribe((value) => scene.keyboard(value)),
      this.pointer.subscribe((value) => scene.pointer(value)),
      this.monitor.subscribe((value) => scene.monitor(value.canvas)),
      this.camera.subscribe((value) => { scene.camera(value); overlay.camera(value); }),
      this.controller.subscribe((value) => { scene.gamepad(value); overlay.gamepad(value); }),
      this.audio.subscribe((value) => { if (!value.output) scene.audio(value, performance.now()); }),
      this.microphone.subscribe((value) => scene.microphone(value)),
    ];
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('blur', this.blur);
  }
  get activeDevice(): DeviceId | null { return this.active; }
  setState(state: SceneState): void {
    this.state = state;
    const next = !document.hidden && state.mode === 'focus' && state.phase === 'active' ? state.device : null;
    const presentation = !document.hidden && state.mode === 'focus' && state.phase !== 'exiting' ? state.device : null;
    if (next !== this.active) {
      if(this.active) this.stopActive(); this.active=next;
      if(next) {
        this.canvas.tabIndex=-1;this.focusSurface();
        switch(next) {
          case 'keyboard':this.keyboard.enter();break;
          case 'mouse':this.pointer.enter();break;
          case 'monitor':this.monitor.enter(this.canvas);break;
          case 'camera':this.camera.enter();break;
          case 'controller':this.controller.enter();break;
          case 'audio':this.audio.enter();break;
          case 'microphone':this.microphone.enter();break;
        }
      }
    }
    this.overlay.state(state);
    if(presentation!==this.presented) {
      this.presented=presentation;
      if(presentation) this.prepareControls(presentation);
    }
  }
  private prepareControls(next: DeviceId): void {
    const labels:Record<DeviceId,string>={keyboard:'Keys · hold time',mouse:'Clicks · wheel · browser events',monitor:'Browser repaint cadence',camera:'Track settings',controller:'Not yet detected',audio:'Ready to test output',microphone:'Digital RMS'};
    this.overlay.metrics.textContent=labels[next];
    if (next === 'keyboard') {
      this.overlay.button('Reset', () => { this.keyboard.reset(); this.focusSurface(); }, 'Reset keyboard test');
    } else if (next === 'mouse') {
      this.overlay.button('Reset', () => { this.pointer.reset(); this.focusSurface(); }, 'Reset mouse test');
    } else if (next === 'monitor') {
      this.monitor.addControls(this.overlay.controls);
      this.overlay.button('Fullscreen', () => {
        this.fullscreenError = null;
        void this.monitor.fullscreen().then((ok) => { if (this.active === 'monitor') this.fullscreenError = ok ? null : 'Fullscreen is unavailable in this browser.'; });
      });
    } else if (next === 'camera') {
      this.mediaSelect = this.mediaInput((id) => { void this.camera.select(id); });
      const mirror = this.overlay.button('Mirror', () => { const enabled = mirror.getAttribute('aria-pressed') !== 'true'; mirror.setAttribute('aria-pressed', String(enabled)); this.overlay.setMirror(enabled); }); mirror.setAttribute('aria-pressed', 'false');
      this.overlay.camera(this.camera.snapshot());
      this.cameraStart = this.overlay.button('Start camera', () => { void this.camera.start(); });
      this.overlay.button('Stop', () => this.camera.stop(), 'Stop camera');
    } else if (next === 'controller') {
      this.scene.controllerStyle('Neutral');
      const legends = this.select('Controller legend style', LEGEND_STYLES);
      legends.addEventListener('change', () => this.scene.controllerStyle(legends.value as LegendStyle));
      this.controllerSelect = this.select('Connected controller', []);
      this.controllerSelect.addEventListener('change', () => this.controller.select(Number(this.controllerSelect!.value)));
      this.hapticButton = this.overlay.button('Haptics', () => { void this.controller.vibrate().then((ok) => {
        if (this.active === 'controller') this.overlay.announce(ok ? 'Haptic pulse sent.' : 'Haptics are unavailable for this controller.');
      }); }, 'Send a brief haptic pulse'); this.hapticButton.hidden = true;
    } else if (next === 'audio') {
      const frequency = this.select('Tone frequency', ['220', '440', '880']); frequency.value = '440';
      for (const channel of ['left', 'right', 'both'] as const) this.overlay.button(channel, () => { void this.audio.tone(channel, Number(frequency.value)); }, `Play one-second ${channel} channel tone`);
      this.overlay.button('Stop tone', () => this.audio.stopOutput());
    } else if (next === 'microphone') {
      this.mediaSelect = this.mediaInput((id) => { void this.microphone.select(id); });
      this.microphoneStart = this.overlay.button('Start microphone', () => { void this.microphone.start(); });
      this.overlay.button('Stop', () => this.microphone.stop(), 'Stop microphone');
    }
    syncChoices(this.overlay.controls);
  }
  private mediaInput(change: (id: string) => void): HTMLSelectElement {
    const select = this.select('Exposed media input', []); select.hidden = true;
    select.addEventListener('change', () => change(select.value)); return select;
  }
  private updateMediaInputs(inputs: MediaInputs): void {
    const select = this.mediaSelect; if (!select) return;
    const signature = inputs.inputs.map(d => `${d.deviceId}:${d.label}`).join('|');
    if (select.dataset.sources !== signature) {
      select.dataset.sources = signature; select.replaceChildren();
      const option = document.createElement('option'); option.value = ''; option.textContent = 'Default input'; select.append(option);
      inputs.inputs.forEach((device, i) => { const o = document.createElement('option'); o.value = device.deviceId; o.textContent = device.label || `Exposed input ${i + 1}`; select.append(o); });
    }
    select.value = inputs.selected; select.hidden = inputs.exposure !== 'exposed' || inputs.inputs.length < 2;
  }
  private select(label: string, values: readonly string[]): HTMLSelectElement {
    const select = document.createElement('select'); select.ariaLabel = label;
    values.forEach((value) => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); });
    this.overlay.controls.append(select); designChoice(select); return select;
  }
  private focusSurface(): void { this.canvas.focus({ preventScroll: true }); }
  private stopActive(): void {
    switch (this.active) {
      case 'keyboard': this.keyboard.exit(); break;
      case 'mouse': this.pointer.exit(); break;
      case 'monitor': this.monitor.exit(); this.scene.resetMonitor(); break;
      case 'camera': this.camera.exit(); break;
      case 'controller': this.controller.exit(); break;
      case 'audio': this.audio.exit(); break;
      case 'microphone': this.microphone.exit(); break;
    }
    // Input-derived graphics are transient and disappear before camera departure.
    this.scene.audio({ output: false, channel: 'both', outputLevel: 0, error: null }, 0);
    this.scene.microphone({ state: 'idle', amplitude: 0, waveform: new Float32Array(), settings: null });
    this.mediaSelect = null;
    this.controllerSelect = null; this.hapticButton = null; this.cameraStart = null; this.microphoneStart = null;
    this.fullscreenError = null;
    this.active = null;
  }
  suspend(): void { this.stopActive();this.presented=null; if (this.state) this.overlay.state({ mode: 'overview', revision: this.state.revision }); }
  resume(): void { if (this.state) this.setState(this.state); }
  preview(id: DeviceId): void {
    this.overlay.state({ mode: 'focus', device: id, phase: 'entering', revision: this.state?.revision ?? 0 });
    if(this.presented!==id){this.presented=id;this.prepareControls(id);}
  }
  private visibility = (): void => { if (document.hidden) this.suspend(); else this.resume(); };
  private blur = (): void => { this.monitor.timing.reset(); this.pointer.timing.reset(); this.audio.stopOutput(); };
  poll(now: number, deltaSeconds: number): void {
    if (this.active === 'mouse') {
      const before = this.pointer.snapshot().trail.length; this.pointer.prune(now);
      if (this.pointer.snapshot().trail.length !== before) this.scene.pointer(this.pointer.snapshot());
    } else if (this.active === 'monitor') { if (deltaSeconds > 0.05) this.monitor.timing.reset(); else this.monitor.poll(now); }
    else if (this.active === 'controller') this.controller.poll();
    else if (this.active === 'camera' && this.camera.snapshot().state === 'live') this.scene.invalidate();
    else if (this.active === 'audio') { const value = this.audio.snapshot(); if (value.output) this.scene.audio(value, now); }
    else if (this.active === 'microphone') this.microphone.poll();
    if (now - this.lastMetrics < 150) return; this.lastMetrics = now;
    this.metrics(now);
    if (now - this.lastAnnouncement >= 800) {
      this.lastAnnouncement = now;
      if (this.active === 'keyboard') { const value = this.keyboard.snapshot(); this.overlay.announce(`${value.tested.size} keys detected. ${value.held.size} keys held.`); }
      else if (this.active === 'mouse') this.overlay.announce(mouseButtons(this.pointer.snapshot().buttons));
      else if (this.active === 'controller') { const value = this.controller.snapshot(); this.overlay.announce(value ? `Browser-exposed controller connected. ${value.pressed.filter(Boolean).length} buttons pressed.` : this.controller.connection === 'disconnected' ? 'Previously exposed controller disconnected.' : 'Not yet detected.'); }
      else if (this.active === 'camera') this.overlay.announce(`Camera ${this.camera.snapshot().state}.`);
      else if (this.active === 'audio') { const value = this.audio.snapshot(); this.overlay.announce(value.output ? `${value.channel} channel playback initiated.` : 'Output stopped.'); }
      else if (this.active === 'microphone') this.overlay.announce(`Microphone ${this.microphone.snapshot().state}.`);
    }
  }
  private metrics(now: number): void {
    const output = this.overlay.metrics;
    if (this.active === 'keyboard') {
      const value = this.keyboard.snapshot(); const held = [...value.held.keys()];
      const duration = held.length ? Math.round(now - value.held.get(held.at(-1)!)!) : value.holdMs;
      output.textContent = `${value.tested.size} detected · ${held.length} held\n${held.join(' + ') || value.last || '—'}${duration !== null ? ` · ${duration} ms` : ''}${value.repeatMs !== null ? `\n${Math.round(value.repeatMs)} ms repeat` : ''}`;
      this.overlay.setMessage('System shortcuts may be reserved by your browser or operating system.');
    } else if (this.active === 'mouse') {
      const value = this.pointer.snapshot(); const timing = this.pointer.timing.estimate(now);
      const units = ['px', 'lines', 'pages'][value.wheel.mode] ?? 'units';
      const states = ['Left','Right','Middle','Back','Forward'].map((name,i)=>`${name} ${value.buttons & (1<<i) ? 'down' : 'up'}`);
      output.textContent = `${states.slice(0,2).join(' · ')}\n${states.slice(2).join(' · ')}${value.extra?.map(b=>` B${b.index} ${b.down?'down':'up'}`).join('') ?? ''}${value.clickMs !== null ? `\n${value.clickMs} ms clicks` : ''}\nWheel X ${value.wheel.x} · Y ${value.wheel.y} ${units}${timing ? `\n≈ ${timing.hz} Hz · browser events` : ''}`;
      output.ariaLabel = `${mouseButtons(value.buttons)}. Wheel horizontal ${value.wheel.x}, vertical ${value.wheel.y} ${units}. ${timing ? `Estimated browser-observed event rate ${timing.hz} hertz.` : 'Move the mouse to estimate browser-observed event rate.'}`;
      this.overlay.setMessage('Event frequency is a browser estimate.');
    } else if (this.active === 'monitor') {
      const timing = this.monitor.timing.estimate(now);
      output.textContent = timing ? `≈ ${timing.hz} Hz · ${timing.ms} ms` : 'Sampling repaint cadence…';
      output.ariaLabel = timing ? `Estimated browser repaint cadence ${timing.hz} hertz, median frame interval ${timing.ms} milliseconds.` : 'Sampling browser repaint cadence.';
      this.overlay.setMessage(this.fullscreenError ?? 'Browser repaint estimate. Pixel patterns depend on zoom and display scaling.', !!this.fullscreenError);
    } else if (this.active === 'camera') {
      const value = this.camera.snapshot(); const settings = value.settings;
      output.textContent = settings ? [settings.width && settings.height ? `${settings.width} × ${settings.height}` : '', settings.frameRate ? `${Math.round(settings.frameRate * 10) / 10} fps reported` : '', settings.aspectRatio ? `${settings.aspectRatio.toFixed(2)} aspect` : ''].filter(Boolean).join(' · ') : 'Camera';
      this.overlay.setMessage(captureText(value.state, 'Preview stays on this device. Select Start camera to allow access.'), !['idle','requesting','live'].includes(value.state));
      this.updateMediaInputs(this.camera.inputs);
      if (this.cameraStart) this.cameraStart.disabled = value.state === 'requesting' || value.state === 'live';
    } else if (this.active === 'controller') {
      const value = this.controller.snapshot(); const pads = this.controller.available();
      if (this.controllerSelect) {
        const signature = pads.map((pad) => `${pad.index}:${pad.id}`).join('|');
        if (this.controllerSelect.dataset.pads !== signature) {
          this.controllerSelect.dataset.pads = signature; this.controllerSelect.replaceChildren();
          pads.forEach((pad) => { const option = document.createElement('option'); option.value = String(pad.index); option.textContent = pad.id; this.controllerSelect!.append(option); });
        }
        if (value) this.controllerSelect.value = String(value.index); this.controllerSelect.hidden = pads.length < 2;
      }
      if (this.hapticButton) this.hapticButton.hidden = !value?.haptics;
      output.textContent = value ? `${value.buttons.length} buttons · ${value.axes.length} axes${value.standard ? `
${value.axes.slice(0, 4).map((axis, i) => `A${i} ${axis.toFixed(3)}`).join('  ')}
${value.buttons.slice(0, 17).map((button, i) => button > 0 ? `B${i} ${button.toFixed(2)}` : '').filter(Boolean).join('  ') || '—'}${value.axes.length >= 4 ? `
stick offset ${Math.hypot(value.axes[0]!, value.axes[1]!).toFixed(3)} / ${Math.hypot(value.axes[2]!, value.axes[3]!).toFixed(3)}` : ''}` : ''}` : 'Not yet detected';
      if (!value && this.controller.connection === 'disconnected') output.textContent = 'Previously exposed controller disconnected';
      this.overlay.setMessage(this.controller.error ? ERROR_TEXT[this.controller.error] : !value ? 'Connect a controller and press a button to make it visible to the browser.' : !value.standard ? 'Generic indexed mapping. Physical button locations are unknown.' : '', !!this.controller.error || !!value && !value.standard);
    } else if (this.active === 'audio') {
      const value = this.audio.snapshot();
      output.textContent = value.output ? 'Playback initiated' : 'Ready to test output';
      this.overlay.setMessage(value.error ? ERROR_TEXT[value.error] : 'One-second tones at a conservative level. Inspect audibility and channels by listening.', !!value.error);
    } else if (this.active === 'microphone') {
      const value = this.microphone.snapshot(); this.updateMediaInputs(this.microphone.inputs);
      output.textContent = value.state === 'live' ? `${value.amplitude.toFixed(3)} RMS · digital amplitude` : 'Microphone';
      this.overlay.setMessage(captureText(value.state, 'Access not requested. Start to allow local input; no monitoring or recording.'), !['idle','requesting','live'].includes(value.state));
      if (this.microphoneStart) this.microphoneStart.disabled = value.state === 'requesting' || value.state === 'live';
    }
    syncChoices(this.overlay.controls);
  }
  dispose(): void {
    this.stopActive(); this.camera.exit(); this.audio.exit(); this.microphone.exit();
    this.stopSubscriptions.forEach((stop) => stop()); document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('blur', this.blur);
  }
}

export function mouseButtons(mask: number): string { return ['Left', 'Right', 'Middle', 'Back', 'Forward'].map((name, i) => `${name} ${mask & (1 << i) ? 'down' : 'up'}`).join(' · '); }
