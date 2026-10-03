import type { DeviceId, SceneState } from '../app/state';
import type { SceneController } from '../scene/SceneController';
import type { OverlayManager } from '../overlay/OverlayManager';
import { KeyboardAdapter } from './KeyboardAdapter';
import { PointerAdapter } from './PointerAdapter';
import { MonitorAdapter, MONITOR_MODES } from './MonitorAdapter';
import { CameraAdapter } from './CameraAdapter';
import { GamepadAdapter } from './GamepadAdapter';
import { AudioAdapter } from './AudioAdapter';
import { ERROR_TEXT } from './MediaCapture';
import type { CaptureState } from './MediaCapture';

function captureText(state: CaptureState, idle: string): string {
  return state === 'idle' ? idle : state === 'requesting' ? 'Waiting for permission…' : state === 'live' ? '' : ERROR_TEXT[state];
}
export type DeviceScene = Pick<SceneController, 'keyboard' | 'pointer' | 'monitor' | 'camera' | 'gamepad' | 'audio' | 'invalidate' | 'resetMonitor'>;

/** All testers share the application's frame clock and one focus-scoped lifecycle. */
export class DeviceInputManager {
  readonly keyboard = new KeyboardAdapter();
  readonly pointer: PointerAdapter;
  readonly monitor = new MonitorAdapter();
  readonly camera = new CameraAdapter();
  readonly controller = new GamepadAdapter();
  readonly audio = new AudioAdapter();
  private active: DeviceId | null = null;
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
    this.pointer = new PointerAdapter(canvas);
    this.stopSubscriptions = [
      this.keyboard.subscribe((value) => scene.keyboard(value)),
      this.pointer.subscribe((value) => scene.pointer(value)),
      this.monitor.subscribe((value) => scene.monitor(value.canvas)),
      this.camera.subscribe((value) => scene.camera(value)),
      this.controller.subscribe((value) => scene.gamepad(value)),
      this.audio.subscribe((value) => { if (!value.output && value.microphone !== 'live') scene.audio(value, performance.now()); }),
    ];
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('blur', this.blur);
  }
  get activeDevice(): DeviceId | null { return this.active; }
  setState(state: SceneState): void {
    this.state = state;
    const next = !document.hidden && state.mode === 'focus' && state.phase === 'active' ? state.device : null;
    if (next === this.active) { if (!next) this.overlay.state(state); return; }
    this.stopActive(); this.active = next; this.overlay.state(state);
    if (!next) return;
    this.canvas.tabIndex = -1; this.focusSurface();
    if (next === 'keyboard') {
      this.keyboard.enter(); this.overlay.button('Reset', () => { this.keyboard.reset(); this.focusSurface(); }, 'Reset keyboard test');
    } else if (next === 'mouse') {
      this.pointer.enter(); this.overlay.button('Reset', () => { this.pointer.reset(); this.focusSurface(); }, 'Reset mouse test');
    } else if (next === 'monitor') {
      this.monitor.enter();
      const select = this.select('Monitor test pattern', MONITOR_MODES);
      select.addEventListener('change', () => this.monitor.setMode(select.value as typeof MONITOR_MODES[number]));
      this.overlay.button('Fullscreen', () => {
        this.fullscreenError = null;
        void this.monitor.fullscreen().then((ok) => { if (this.active === 'monitor') this.fullscreenError = ok ? null : 'Fullscreen is unavailable in this browser.'; });
      });
    } else if (next === 'camera') {
      this.camera.enter();
      this.cameraStart = this.overlay.button('Start camera', () => { void this.camera.start(); });
      this.overlay.button('Stop', () => this.camera.stop(), 'Stop camera');
    } else if (next === 'controller') {
      this.controller.enter(); this.controllerSelect = this.select('Connected controller', []);
      this.controllerSelect.addEventListener('change', () => this.controller.select(Number(this.controllerSelect!.value)));
      this.hapticButton = this.overlay.button('Haptics', () => { void this.controller.vibrate().then((ok) => {
        if (this.active === 'controller') this.overlay.announce(ok ? 'Haptic pulse sent.' : 'Haptics are unavailable for this controller.');
      }); }, 'Send a brief haptic pulse'); this.hapticButton.hidden = true;
    } else if (next === 'audio') {
      this.audio.enter(); const frequency = this.select('Tone frequency', ['220', '440', '880']); frequency.value = '440';
      for (const channel of ['left', 'right', 'both'] as const) this.overlay.button(channel, () => { void this.audio.tone(channel, Number(frequency.value)); }, `Play one-second ${channel} channel tone`);
      this.overlay.button('Stop tone', () => this.audio.stopOutput());
      this.microphoneStart = this.overlay.button('Start microphone', () => { void this.audio.startMicrophone(); });
      this.overlay.button('Stop mic', () => this.audio.stopMicrophone(), 'Stop microphone');
    }
  }
  private select(label: string, values: readonly string[]): HTMLSelectElement {
    const select = document.createElement('select'); select.ariaLabel = label;
    values.forEach((value) => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); });
    this.overlay.controls.append(select); return select;
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
    }
    // Input-derived graphics are transient and disappear before camera departure.
    this.scene.audio({ microphone: 'idle', output: false, channel: 'both', outputLevel: 0, error: null, amplitude: 0, waveform: new Float32Array() }, 0);
    this.controllerSelect = null; this.hapticButton = null; this.cameraStart = null; this.microphoneStart = null;
    this.fullscreenError = null;
    this.active = null;
  }
  suspend(): void { this.stopActive(); if (this.state) this.overlay.state({ mode: 'overview', revision: this.state.revision }); }
  resume(): void { if (this.state) this.setState(this.state); }
  private visibility = (): void => { if (document.hidden) this.suspend(); else this.resume(); };
  private blur = (): void => { this.monitor.timing.reset(); this.pointer.timing.reset(); this.audio.stopOutput(); };
  poll(now: number, deltaSeconds: number): void {
    if (this.active === 'mouse') {
      const before = this.pointer.snapshot().trail.length; this.pointer.prune(now);
      if (this.pointer.snapshot().trail.length !== before) this.scene.pointer(this.pointer.snapshot());
    } else if (this.active === 'monitor') { if (deltaSeconds > 0.05) this.monitor.timing.reset(); else this.monitor.poll(now); }
    else if (this.active === 'controller') this.controller.poll();
    else if (this.active === 'camera' && this.camera.snapshot().state === 'live') this.scene.invalidate();
    else if (this.active === 'audio') { this.audio.poll(); const value = this.audio.snapshot(); if (value.output || value.microphone === 'live') this.scene.audio(value, now); }
    if (now - this.lastMetrics < 150) return; this.lastMetrics = now;
    this.metrics(now);
    if (now - this.lastAnnouncement >= 800) {
      this.lastAnnouncement = now;
      if (this.active === 'keyboard') { const value = this.keyboard.snapshot(); this.overlay.announce(`${value.tested.size} keys detected. ${value.held.size} keys held.`); }
      else if (this.active === 'mouse') this.overlay.announce(`Mouse button mask ${this.pointer.snapshot().buttons}.`);
      else if (this.active === 'controller') { const value = this.controller.snapshot(); this.overlay.announce(value ? `Controller connected. ${value.pressed.filter(Boolean).length} buttons pressed.` : 'No controller detected.'); }
      else if (this.active === 'camera') this.overlay.announce(`Camera ${this.camera.snapshot().state}.`);
      else if (this.active === 'audio') { const value = this.audio.snapshot(); this.overlay.announce(`${value.output ? `${value.channel} channel tone playing.` : 'Output stopped.'} Microphone ${value.microphone}.`); }
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
      output.textContent = `${value.buttons.toString(2).padStart(5, '0')} buttons${value.clickMs !== null ? ` · ${value.clickMs} ms clicks` : ''}\n${value.wheel.y} ${units} wheel${timing ? `\n≈ ${timing.hz} Hz` : ''}`;
      output.ariaLabel = `Mouse button bitfield ${value.buttons}. ${timing ? `Estimated browser-observed event rate ${timing.hz} hertz.` : 'Move the mouse to estimate browser-observed event rate.'}`;
      this.overlay.setMessage('Event frequency is a browser estimate.');
    } else if (this.active === 'monitor') {
      const timing = this.monitor.timing.estimate(now);
      output.textContent = timing ? `≈ ${timing.hz} Hz · ${timing.ms} ms` : 'Sampling repaint cadence…';
      output.ariaLabel = timing ? `Estimated browser repaint cadence ${timing.hz} hertz, median frame interval ${timing.ms} milliseconds.` : 'Sampling browser repaint cadence.';
      this.overlay.setMessage(this.fullscreenError ?? 'Browser repaint estimate; not panel response time.');
    } else if (this.active === 'camera') {
      const value = this.camera.snapshot(); const settings = value.settings;
      output.textContent = settings ? [settings.width && settings.height ? `${settings.width} × ${settings.height}` : '', settings.frameRate ? `${Math.round(settings.frameRate * 10) / 10} fps` : '', settings.aspectRatio ? `${settings.aspectRatio.toFixed(2)} aspect` : ''].filter(Boolean).join(' · ') : 'Camera';
      this.overlay.setMessage(captureText(value.state, 'Preview stays on this device. Select Start camera to allow access.'));
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
      output.textContent = value ? `${value.buttons.length} buttons · ${value.axes.length} axes\n${value.axes.map((axis, i) => `A${i} ${axis.toFixed(3)}`).join('  ')}\n${value.buttons.map((button, i) => button > 0 ? `B${i} ${button.toFixed(2)}` : '').filter(Boolean).join('  ') || '—'}${value.standard && value.axes.length >= 4 ? `\nstick offset ${Math.hypot(value.axes[0]!, value.axes[1]!).toFixed(3)} / ${Math.hypot(value.axes[2]!, value.axes[3]!).toFixed(3)}` : ''}` : 'No controller detected';
      this.overlay.setMessage(this.controller.error ? ERROR_TEXT[this.controller.error] : !value ? 'Connect a controller and press a button to make it visible to the browser.' : !value.standard ? 'Generic indexed mapping. Physical button locations are unknown.' : '');
    } else if (this.active === 'audio') {
      const value = this.audio.snapshot();
      output.textContent = `${value.output ? 'Tone playing' : 'Output ready'}${value.microphone === 'live' ? `\n${value.amplitude.toFixed(3)} RMS` : ''}`;
      this.overlay.setMessage(value.error ? ERROR_TEXT[value.error] : captureText(value.microphone, 'One-second tones at a conservative level. Microphone amplitude is digital, not calibrated sound pressure.'));
      if (this.microphoneStart) this.microphoneStart.disabled = value.microphone === 'requesting' || value.microphone === 'live';
    }
  }
  dispose(): void {
    this.stopActive(); this.camera.exit(); this.audio.exit();
    this.stopSubscriptions.forEach((stop) => stop()); document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('blur', this.blur);
  }
}
