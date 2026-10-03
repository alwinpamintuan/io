import { ObservableAdapter } from './adapter';
import { MediaCapture } from './MediaCapture';
import type { CaptureState } from './MediaCapture';

export interface CameraSnapshot { state: CaptureState; settings: MediaTrackSettings | null; video: HTMLVideoElement | null }
export class CameraAdapter extends ObservableAdapter<CameraSnapshot> {
  private active = false;
  private readonly capture = new MediaCapture(() => this.publish());
  private readonly video = document.createElement('video');
  constructor() { super(); this.video.muted = true; this.video.playsInline = true; this.video.autoplay = true; }
  supported(): boolean { return !!navigator.mediaDevices?.getUserMedia && window.isSecureContext; }
  enter(): void { this.active = true; }
  exit(): void { this.active = false; this.stop(); }
  stop(): void { this.video.pause(); this.video.srcObject = null; this.capture.stop(); }
  async start(): Promise<void> {
    if (!this.active) return;
    const stream = await this.capture.request({ video: true, audio: false });
    if (!stream || !this.active) return;
    this.video.srcObject = stream;
    try { await this.video.play(); } catch { if (this.video.srcObject === stream) { this.stop(); this.capture.state = 'unknown'; } }
    this.publish();
  }
  snapshot(): CameraSnapshot {
    return { state: this.capture.state, settings: this.capture.stream?.getVideoTracks()[0]?.getSettings() ?? null,
      video: this.capture.state === 'live' ? this.video : null };
  }
}
