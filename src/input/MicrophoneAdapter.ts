import { ObservableAdapter } from './adapter';
import { MediaCapture } from './MediaCapture';
import type { CaptureState } from './MediaCapture';
import { MediaInputs } from './MediaInputs';
import { normalizeCapabilityError } from '../app/capabilities';

export interface MicrophoneSnapshot { state: CaptureState; amplitude: number; waveform: Float32Array; settings: MediaTrackSettings | null }
export class MicrophoneAdapter extends ObservableAdapter<MicrophoneSnapshot> {
  private active = false;
  private generation = 0;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private waveform = new Float32Array(512);
  private amplitude = 0;
  readonly inputs = new MediaInputs('audioinput', () => this.publish());
  private readonly capture = new MediaCapture(() => {
    if (this.capture?.state !== 'live') this.clearSignal();
    if (this.capture?.state === 'device-disconnected') { void this.context?.close().catch(() => {}); this.context = null; }
    this.publish();
  });
  supported(): boolean { return typeof window.AudioContext === 'function' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext; }
  enter(): void { this.active = true; this.inputs.enter(); }
  exit(): void { this.active = false; this.inputs.exit(); this.stop(); }
  private clearSignal(): void { this.source?.disconnect(); this.analyser?.disconnect(); this.source = null; this.analyser = null; this.waveform.fill(0); this.amplitude = 0; }
  stop(): void { this.generation++; this.clearSignal(); this.capture.stop(); void this.context?.close().catch(() => {}); this.context = null; }
  async select(id: string): Promise<void> { this.inputs.selected = id; if (this.capture.state === 'live' || this.capture.state === 'requesting') await this.start(); }
  async start(): Promise<void> {
    if (!this.active) return;
    this.stop(); const generation = this.generation;
    if (!window.isSecureContext) { this.capture.state = 'secure-context-required'; this.publish(); return; }
    if (typeof window.AudioContext !== 'function') { this.capture.state = 'unsupported'; this.publish(); return; }
    this.capture.state = 'requesting'; this.publish();
    try {
      const context = this.context = new AudioContext(); await context.resume();
      if (!this.active || generation !== this.generation) return;
      const constraint = this.inputs.constraint();
      const stream = await this.capture.request({ audio: { ...(constraint === true ? {} : constraint), echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (!stream || !this.active || generation !== this.generation) { if (generation === this.generation) { void context.close().catch(() => {}); this.context = null; } return; }
      this.source = context.createMediaStreamSource(stream); this.analyser = context.createAnalyser(); this.analyser.fftSize = 512;
      this.source.connect(this.analyser); // Intentionally has no connection to destination.
      await this.inputs.refresh(); this.publish();
    } catch (error) { if (generation === this.generation) { this.stop(); this.capture.state = normalizeCapabilityError(error); this.publish(); } }
  }
  poll(): void { if (!this.active || !this.analyser) return; this.analyser.getFloatTimeDomainData(this.waveform); this.amplitude = Math.sqrt(this.waveform.reduce((sum, value) => sum + value * value, 0) / this.waveform.length); this.publish(); }
  snapshot(): MicrophoneSnapshot { return { state: this.capture.state, amplitude: this.amplitude, waveform: this.waveform, settings: this.capture.stream?.getAudioTracks()[0]?.getSettings() ?? null }; }
}
