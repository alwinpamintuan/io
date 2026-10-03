import { ObservableAdapter } from './adapter';
import { TimingWindow } from '../utils/statistics';

export const MONITOR_MODES = ['white', 'black', 'gray', 'red', 'green', 'blue', 'gradient', 'grid', 'motion', 'timing'] as const;
export type MonitorMode = typeof MONITOR_MODES[number];
export class MonitorAdapter extends ObservableAdapter<{ mode: MonitorMode; canvas: HTMLCanvasElement }> {
  readonly canvas = document.createElement('canvas');
  readonly timing = new TimingWindow(1500, 512);
  private active = false;
  private mode: MonitorMode = 'white';
  constructor() { super(); this.canvas.width = 1280; this.canvas.height = Math.round(1280 * 31.2 / 57.2); }
  supported(): boolean { return true; }
  enter(): void {
    this.active = true; this.resetDimensions(); this.setMode('white'); this.timing.reset();
    document.addEventListener('fullscreenchange', this.resize); window.addEventListener('resize', this.resize);
  }
  exit(): void {
    this.active = false; this.timing.reset();
    document.removeEventListener('fullscreenchange', this.resize); window.removeEventListener('resize', this.resize);
    if (document.fullscreenElement === this.canvas) void document.exitFullscreen().catch(() => {});
    this.canvas.remove(); this.resetDimensions(); this.setMode('white');
  }
  private resetDimensions(): void { this.canvas.width = 1280; this.canvas.height = Math.round(1280 * 31.2 / 57.2); }
  private resize = (): void => {
    const full = document.fullscreenElement === this.canvas;
    this.canvas.width = full ? Math.max(1, window.innerWidth) : 1280;
    this.canvas.height = full ? Math.max(1, window.innerHeight) : Math.round(1280 * 31.2 / 57.2);
    this.timing.reset(); this.draw(performance.now()); this.publish();
  };
  setMode(mode: MonitorMode): void { this.mode = mode; this.draw(0); this.publish(); }
  snapshot() { return { mode: this.mode, canvas: this.canvas }; }
  poll(now: number): void {
    if (!this.active) return;
    this.timing.add(now);
    if (this.mode === 'motion') { this.draw(now); this.publish(); }
  }
  private draw(now: number): void {
    const ctx = this.canvas.getContext('2d')!; const w = this.canvas.width; const h = this.canvas.height;
    const colors: Partial<Record<MonitorMode, string>> = { white: '#fff', black: '#000', gray: '#808080', red: '#f00', green: '#0f0', blue: '#00f' };
    ctx.fillStyle = colors[this.mode] ?? '#f4f4f0'; ctx.fillRect(0, 0, w, h);
    if (this.mode === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, w, 0); gradient.addColorStop(0, '#000'); gradient.addColorStop(1, '#fff');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    }
    if (this.mode === 'grid') {
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= w; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += 80) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke(); ctx.strokeRect(2, 2, w - 4, h - 4); ctx.beginPath(); ctx.arc(w / 2, h / 2, 220, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.mode === 'motion') { ctx.fillStyle = '#0a0a0a'; ctx.fillRect((now * 0.3) % (w + 80) - 80, h * 0.2, 80, h * 0.6); }
  }
  async fullscreen(): Promise<boolean> {
    if (!this.active || !this.canvas.requestFullscreen) return false;
    this.canvas.className = 'fullscreen-pattern'; this.canvas.ariaLabel = `${this.mode} monitor test pattern`;
    document.querySelector('#app')!.append(this.canvas);
    try { await this.canvas.requestFullscreen(); return true; } catch { this.canvas.remove(); return false; }
  }
}
