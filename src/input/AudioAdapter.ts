import { normalizeCapabilityError } from '../app/capabilities';
import type { CapabilityError } from '../app/capabilities';
import { ObservableAdapter } from './adapter';

export interface AudioSnapshot { output: boolean; channel: 'left' | 'right' | 'both'; outputLevel: number; error: CapabilityError | null }
export class AudioAdapter extends ObservableAdapter<AudioSnapshot> {
  private active = false;
  private generation = 0;
  private outputGeneration = 0;
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private error: CapabilityError | null = null;
  private channel: 'left' | 'right' | 'both' = 'both';
  private outputStarted = 0;
  supported(): boolean { return typeof window.AudioContext === 'function'; }
  enter(): void { this.active = true; this.error = null; }
  exit(): void {
    this.active = false; this.generation++; this.stopOutput();
    void this.context?.close().catch(() => {}); this.context = null; this.error = null;
  }
  private async ready(): Promise<AudioContext | null> {
    if (!this.active) return null;
    if (!this.supported()) { this.error = 'unsupported'; this.publish(); return null; }
    const generation = this.generation;
    try {
      const context = this.context ??= new AudioContext();
      await context.resume();
      if (generation === this.generation) this.error = null;
      return this.active && generation === this.generation && context === this.context ? context : null;
    } catch (error) { if (generation === this.generation) { this.error = normalizeCapabilityError(error); this.publish(); } return null; }
  }
  async tone(channel: 'left' | 'right' | 'both', frequency: number): Promise<void> {
    this.stopOutput(); const operation = this.outputGeneration;
    const context = await this.ready(); if (!context || operation !== this.outputGeneration) return;
    const oscillator = context.createOscillator(); const gain = context.createGain(); const panner = context.createStereoPanner();
    oscillator.type = 'sine'; oscillator.frequency.value = [220, 440, 880].includes(frequency) ? frequency : 440;
    panner.pan.value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
    gain.gain.setValueAtTime(0, context.currentTime); gain.gain.linearRampToValueAtTime(0.04, context.currentTime + 0.03);
    gain.gain.setValueAtTime(0.04, context.currentTime + 0.85); gain.gain.linearRampToValueAtTime(0, context.currentTime + 1);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    this.oscillator = oscillator; this.gain = gain; this.panner = panner;
    this.channel = channel; this.outputStarted = context.currentTime;
    oscillator.onended = () => { if (this.oscillator === oscillator) this.stopOutput(); };
    oscillator.start(); oscillator.stop(context.currentTime + 1); this.publish();
  }
  stopOutput(): void {
    this.outputGeneration++;
    if (this.oscillator) { this.oscillator.onended = null; try { this.oscillator.stop(); } catch { /* Already ended. */ } this.oscillator.disconnect(); }
    this.gain?.disconnect(); this.panner?.disconnect(); this.oscillator = null; this.gain = null; this.panner = null; this.publish();
  }
  snapshot(): AudioSnapshot {
    const elapsed = this.context ? this.context.currentTime - this.outputStarted : 0;
    const outputLevel = this.oscillator ? Math.max(0, Math.min(1, elapsed / 0.03, (1 - elapsed) / 0.15)) : 0;
    return { output: this.oscillator !== null, channel: this.channel, outputLevel, error: this.error };
  }
}
