import { DEVICE_IDS, SceneStore } from './state';
import { HashRouter } from './router';
import { RenderLoop } from './renderLoop';
import { DeviceInputManager } from '../input/DeviceInputManager';
import type { DeviceScene } from '../input/DeviceInputManager';
import { OverlayManager } from '../overlay/OverlayManager';

/** Semantic tester fallback uses the same adapters, permissions, clock and routes. */
export function startFallback(original: HTMLCanvasElement, status: HTMLParagraphElement): () => void {
  const canvas = document.createElement('canvas'); canvas.id = 'scene'; canvas.setAttribute('role', 'img'); canvas.ariaLabel = 'Device test surface';
  original.replaceWith(canvas); const app = document.querySelector<HTMLElement>('#app')!;
  const ctx = canvas.getContext('2d');
  let video: HTMLVideoElement | null = null;
  let pattern: HTMLCanvasElement | null = null;
  const clear = (): void => { if (ctx) { ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, canvas.width, canvas.height); } };
  const text = (value: string): void => { clear(); if (!ctx) return; ctx.fillStyle = '#0a0a0a'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.fillText(value, canvas.width / 2, canvas.height / 2); };
  const scene: DeviceScene & { anchor(): { x: number; y: number; visible: boolean } } = {
    keyboard(value) { text([...value.held.keys()].join(' + ') || value.last || 'Press a key'); },
    pointer(value) { clear(); if (!ctx) return; ctx.strokeStyle = '#777772'; ctx.beginPath(); value.trail.forEach((point, i) => { if (i) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y); }); ctx.stroke(); },
    monitor(source) { pattern = source; clear(); ctx?.drawImage(source, canvas.width * 0.15, canvas.height * 0.2, canvas.width * 0.7, canvas.height * 0.5); },
    resetMonitor() { pattern = null; clear(); },
    camera() {}, controllerStyle() {},
    gamepad(value) { text(value ? value.id : 'Connect a controller and press a button'); },
    audio() {},
    microphone(value) {
      clear(); if (!ctx || value.state !== 'live') return;
      ctx.strokeStyle = '#0a0a0a'; ctx.beginPath();
      value.waveform.forEach((sample, i) => { const x = canvas.width * (0.2 + i / value.waveform.length * 0.6); const y = canvas.height / 2 + sample * 80; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    },
    invalidate() {}, anchor() { return { x: canvas.width * 0.3, y: canvas.height * 0.65, visible: true }; },
  };
  const overlay = new OverlayManager(app, scene); const inputs = new DeviceInputManager(canvas, scene, overlay);
  const router = new HashRouter(window); const store = new SceneStore();
  const nav = document.createElement('nav'); nav.className = 'fallback-navigation'; nav.ariaLabel = 'Peripheral tests';
  const buttons = DEVICE_IDS.map((id) => {
    const button = document.createElement('button'); button.textContent = id === 'camera' ? 'Webcam' : id; button.type = 'button'; button.ariaLabel = `Test ${id}`;
    button.addEventListener('click', () => router.navigate(id)); nav.append(button); return { id, button };
  }); app.append(nav);
  status.classList.remove('sr-only'); status.classList.add('compatibility-message');
  status.textContent = 'The 3D workstation is unavailable. Choose a device to use its accessible test surface.';
  const unsubscribeState = store.subscribe((state) => {
    if (state.mode === 'focus' && state.phase !== 'active') { store.dispatch({ type: 'transition-completed', revision: state.revision }); return; }
    inputs.setState(state); if (state.mode === 'overview') clear();
    buttons.forEach(({ id, button }) => button.setAttribute('aria-pressed', String(state.mode === 'focus' && state.device === id)));
  });
  const unsubscribeRoute = router.subscribe((device) => store.dispatch({ type: 'navigate', device }));
  const resize = (): void => {
    nav.style.top=`${status.offsetTop+status.offsetHeight+24}px`;
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    if (pattern) scene.monitor(pattern); else clear();
  }; window.addEventListener('resize', resize); resize();
  const loop = new RenderLoop(({ nowMs, deltaSeconds }) => { inputs.poll(nowMs, deltaSeconds); overlay.update(); }); loop.start();
  const pageHide = (event: PageTransitionEvent): void => { inputs.suspend(); if (!event.persisted) dispose(); };
  const pageShow = (): void => inputs.resume();
  window.addEventListener('pagehide', pageHide); window.addEventListener('pageshow', pageShow);
  function dispose(): void {
    loop.stop(); inputs.dispose(); overlay.dispose(); nav.remove(); video?.remove(); unsubscribeRoute(); unsubscribeState();
    window.removeEventListener('resize', resize); window.removeEventListener('pagehide', pageHide); window.removeEventListener('pageshow', pageShow);
  }
  return dispose;
}
