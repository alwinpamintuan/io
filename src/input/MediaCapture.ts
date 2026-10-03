import { normalizeCapabilityError } from '../app/capabilities';
import type { CapabilityError } from '../app/capabilities';

export type CaptureState = 'idle' | 'requesting' | 'live' | CapabilityError;
export const ERROR_TEXT: Record<CapabilityError, string> = {
  unsupported: 'This browser does not support this test.',
  'permission-denied': 'Access was denied. Allow access in your browser settings, then retry.',
  'device-unavailable': 'No available device was found. Connect a device and retry.',
  'device-disconnected': 'The device disconnected. Connect it and retry.',
  'secure-context-required': 'Camera and microphone tests require HTTPS or localhost.',
  unknown: 'The test could not start. Please retry.',
};

/** Generation guard stops streams that resolve after exit, hide, cancel, or another request. */
export class MediaCapture {
  state: CaptureState = 'idle';
  stream: MediaStream | null = null;
  private generation = 0;
  constructor(private readonly changed: () => void, private readonly browser: Window & typeof globalThis = window) {}
  async request(constraints: MediaStreamConstraints): Promise<MediaStream | null> {
    this.stop(); const generation = this.generation;
    if (!this.browser.isSecureContext) { this.state = 'secure-context-required'; this.changed(); return null; }
    if (!this.browser.navigator.mediaDevices?.getUserMedia) { this.state = 'unsupported'; this.changed(); return null; }
    this.state = 'requesting'; this.changed();
    try {
      const stream = await this.browser.navigator.mediaDevices.getUserMedia(constraints);
      if (generation !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return null; }
      this.stream = stream; this.state = 'live';
      stream.getTracks().forEach((track) => track.addEventListener('ended', () => {
        if (generation !== this.generation) return;
        this.stop(); this.state = 'device-disconnected'; this.changed();
      }, { once: true }));
      this.changed(); return stream;
    } catch (error) {
      if (generation === this.generation) { this.state = normalizeCapabilityError(error); this.changed(); }
      return null;
    }
  }
  stop(): void {
    this.generation++; this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null; this.state = 'idle'; this.changed();
  }
}
