import { ObservableAdapter, isControl } from './adapter';
import { TimingWindow } from '../utils/statistics';
import { designButton, designChoice, syncChoices } from '../overlay/controls';

export const MONITOR_MODES = ['white', 'black', 'gray', 'red', 'green', 'blue', 'gradient', 'near-black', 'near-white', 'color-ramps', 'grid', 'checkerboard', 'horizontal-lines', 'vertical-lines', 'motion', 'timing'] as const;
export type MonitorMode = typeof MONITOR_MODES[number];
export interface MonitorSnapshot { mode: MonitorMode; canvas: HTMLCanvasElement; speed: number; direction: 'right' | 'left' | 'down' | 'up'; paused: boolean }
export class MonitorAdapter extends ObservableAdapter<MonitorSnapshot> {
  readonly canvas = document.createElement('canvas');
  readonly wrapper = document.createElement('section');
  readonly controls = document.createElement('div');
  readonly timing = new TimingWindow(1500, 512);
  private active = false;
  private generation = 0;
  private mode: MonitorMode = 'white';
  private speed = 180;
  private direction: MonitorSnapshot['direction'] = 'right';
  private paused = false;
  private previous = 0;
  private distance = 0;
  private activity = 0;
  private surface: HTMLElement | null = null;
  constructor() {
    super(); this.wrapper.className = 'monitor-fullscreen'; this.wrapper.ariaLabel = 'Monitor inspection';
    this.controls.className = 'test-controls fullscreen-controls'; this.controls.ariaLabel = 'Fullscreen pattern controls';
    this.canvas.tabIndex = 0; this.canvas.ariaLabel = 'Monitor inspection pattern';
    this.wrapper.append(this.canvas, this.controls); this.resetDimensions();
    this.wrapper.addEventListener('pointermove', this.reveal); this.wrapper.addEventListener('pointerdown', this.reveal); this.wrapper.addEventListener('focusin', this.reveal);
  }
  supported(): boolean { return true; }
  enter(surface?: HTMLElement): void {
    this.active = true; this.generation++; this.surface = surface ?? null;
    this.resetDimensions(); this.setMode('white'); this.timing.reset(); this.previous = 0;
    this.controls.replaceChildren(); this.addControls(this.controls, true);
    document.addEventListener('fullscreenchange', this.resize); window.addEventListener('resize', this.resize);
    this.wrapper.addEventListener('keydown', this.key); this.surface?.addEventListener('keydown', this.key);
  }
  exit(): void {
    this.active = false; this.generation++; this.timing.reset();
    document.removeEventListener('fullscreenchange', this.resize); window.removeEventListener('resize', this.resize);
    this.wrapper.removeEventListener('keydown', this.key); this.surface?.removeEventListener('keydown', this.key); this.surface = null;
    if (document.fullscreenElement === this.wrapper) void document.exitFullscreen().catch(() => {});
    this.wrapper.remove(); this.resetDimensions(); this.setMode('white');
  }
  private resetDimensions(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(Math.min(window.innerWidth || 1440, 1920) * 0.9 * dpr));
    this.canvas.height = Math.round(this.canvas.width * 31.2 / 57.2);
  }
  private resize = (): void => {
    if (document.fullscreenElement === this.wrapper) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.max(1, Math.round(window.innerWidth * dpr)); this.canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
      this.reveal();
    } else { this.wrapper.remove(); this.resetDimensions(); this.surface?.focus({ preventScroll: true }); }
    this.timing.reset(); this.previous = 0; this.draw(); this.publish();
  };
  setMode(mode: MonitorMode): void { this.mode = mode; this.distance = 0; this.draw(); this.publish(); this.syncControls(); this.reveal(); }
  step(delta: number): void { this.setMode(MONITOR_MODES[(MONITOR_MODES.indexOf(this.mode) + delta + MONITOR_MODES.length) % MONITOR_MODES.length]!); }
  setMotion(speed: number, direction: MonitorSnapshot['direction'], paused: boolean): void {
    this.speed = Math.max(0, Math.min(720, speed)); this.direction = direction; this.paused = paused; this.previous = 0; this.draw(); this.publish(); this.syncControls(); this.reveal();
  }
  snapshot(): MonitorSnapshot { return { mode: this.mode, canvas: this.canvas, speed: this.speed, direction: this.direction, paused: this.paused }; }
  poll(now: number): void {
    if (!this.active) return; this.timing.add(now);
    const elapsed = this.previous ? Math.max(0, Math.min(0.05, (now - this.previous) / 1000)) : 0; this.previous = now;
    if (this.mode === 'motion' && !this.paused) { this.distance += elapsed * this.speed * Math.min(2, window.devicePixelRatio || 1); this.draw(); this.publish(); }
    if (document.fullscreenElement === this.wrapper) this.controls.classList.toggle('controls-hidden', now - this.activity > 3000 && !this.controls.contains(document.activeElement));
  }
  private reveal = (): void => { this.activity = performance.now(); this.controls.classList.remove('controls-hidden'); };
  private key = (event: KeyboardEvent): void => {
    this.reveal(); if (isControl(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') { event.preventDefault(); this.step(event.code === 'ArrowRight' ? 1 : -1); }
    if (event.code === 'Space' && this.mode === 'motion') { event.preventDefault(); this.setMotion(this.speed, this.direction, !this.paused); }
  };
  addControls(parent: HTMLElement, fullscreen = false): void {
    const button = (label: string, action: () => void) => { const b = document.createElement('button'); b.type = 'button'; designButton(b,label); b.addEventListener('click', action); parent.append(b); return b; };
    button('Previous pattern', () => this.step(-1)); button('Next pattern', () => this.step(1));
    const select = (label: string, values: readonly string[], action: (value: string) => void) => { const s = document.createElement('select'); s.ariaLabel = label; values.forEach((value) => { const o = document.createElement('option'); o.value = value; o.textContent = value; s.append(o); }); s.addEventListener('change', () => action(s.value)); parent.append(s); designChoice(s,label==='Monitor test pattern'); return s; };
    select('Monitor test pattern', MONITOR_MODES, (value) => this.setMode(value as MonitorMode));
    select('Motion speed in CSS pixels per second', ['60', '180', '360', '720'], (value) => this.setMotion(Number(value), this.direction, this.paused));
    select('Motion direction', ['right', 'left', 'down', 'up'], (value) => this.setMotion(this.speed, value as MonitorSnapshot['direction'], this.paused));
    const pause = button('Pause motion', () => this.setMotion(this.speed, this.direction, !this.paused)); pause.dataset.pause = 'true';
    if (fullscreen) { button('Exit fullscreen', () => { void document.exitFullscreen().catch(() => {}); }); const note = document.createElement('small'); note.textContent = 'Pixel patterns depend on zoom and display scaling. Browser repaint timing is an estimate.'; parent.append(note); }
    this.syncControls(parent);
  }
  private syncControls(parent?: HTMLElement): void {
    for (const root of parent ? [parent] : [this.controls, document.querySelector<HTMLElement>('.instrument .test-controls')]) {
      if (!root) continue;
      root.querySelectorAll('select').forEach((s) => { if (s.ariaLabel === 'Monitor test pattern') s.value = this.mode; else if (s.ariaLabel?.startsWith('Motion speed')) s.value = String(this.speed); else if (s.ariaLabel === 'Motion direction') s.value = this.direction; });
      const b = root.querySelector<HTMLButtonElement>('[data-pause]'); if (b) { designButton(b,this.paused ? 'Resume motion' : 'Pause motion'); b.setAttribute('aria-pressed', String(this.paused)); b.hidden=this.mode!=='motion'; }
      root.querySelectorAll<HTMLSelectElement>('select').forEach(s=>{if(s.ariaLabel?.startsWith('Motion'))s.hidden=this.mode!=='motion';});
      syncChoices(root);
    }
  }
  private draw(): void {
    const ctx = this.canvas.getContext('2d')!; const w = this.canvas.width; const h = this.canvas.height; ctx.imageSmoothingEnabled = false;
    const colors: Partial<Record<MonitorMode, string>> = { white: '#fff', black: '#000', gray: '#808080', red: '#f00', green: '#0f0', blue: '#00f' };
    ctx.fillStyle = colors[this.mode] ?? '#f4f4f0'; ctx.fillRect(0, 0, w, h);
    if (this.mode === 'gradient' || this.mode === 'color-ramps') {
      const rows = this.mode === 'gradient' ? ['#fff'] : ['#f00', '#0f0', '#00f'];
      rows.forEach((color, i) => { const gradient = ctx.createLinearGradient(0, 0, w, 0); gradient.addColorStop(0, '#000'); gradient.addColorStop(1, color); ctx.fillStyle = gradient; ctx.fillRect(0, i * h / rows.length, w, h / rows.length); });
    }
    if (this.mode === 'near-black' || this.mode === 'near-white') for (let i = 0; i < 12; i++) { const c = this.mode === 'near-black' ? i * 2 : 233 + i * 2; ctx.fillStyle = `rgb(${c},${c},${c})`; ctx.fillRect(Math.floor(i * w / 12), 0, Math.ceil(w / 12), h); }
    if (this.mode === 'checkerboard' || this.mode === 'horizontal-lines' || this.mode === 'vertical-lines') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#000';
      if (this.mode === 'checkerboard') for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { if ((x / 16 + y / 16) % 2 === 0) ctx.fillRect(x, y, 16, 16); }
      else if (this.mode === 'horizontal-lines') for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
      else for (let x = 0; x < w; x += 2) ctx.fillRect(x, 0, 1, h);
    }
    if (this.mode === 'grid') {
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = Math.max(1, w / 720); ctx.beginPath(); const step = Math.min(w, h) / 8;
      for (let x = w / 2 % step; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = h / 2 % step; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke(); ctx.strokeRect(2, 2, w - 4, h - 4); ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.mode === 'motion') {
      const vertical = this.direction === 'down' || this.direction === 'up'; const extent = vertical ? h : w; const size = Math.max(20, extent * 0.06);
      let position = this.distance % (extent + size) - size; if (this.direction === 'left' || this.direction === 'up') position = extent - size - position;
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(vertical ? w * 0.2 : position, vertical ? position : h * 0.2, vertical ? w * 0.6 : size, vertical ? size : h * 0.6);
    }
    this.canvas.ariaLabel = `${this.mode} monitor inspection pattern`;
  }
  async fullscreen(): Promise<boolean> {
    if (!this.active || !this.wrapper.requestFullscreen) return false;
    const generation = this.generation; document.querySelector('#app')!.append(this.wrapper);
    try { await this.wrapper.requestFullscreen(); if (!this.active || generation !== this.generation) { if (document.fullscreenElement === this.wrapper) await document.exitFullscreen(); this.wrapper.remove(); return false; } this.resize(); this.canvas.focus(); return true; }
    catch { this.wrapper.remove(); this.resetDimensions(); this.draw(); this.publish(); return false; }
  }
}
