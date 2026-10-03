import './style.css';
import { detectCapabilities, observeReducedMotion } from './app/capabilities';
import { RenderLoop } from './app/renderLoop';
import { HashRouter, parseHash } from './app/router';
import { SceneStore } from './app/state';
import type { DeviceId, SceneAction } from './app/state';
import { SceneController } from './scene/SceneController';
import { DEVICE_IDS } from './app/state';
import { DeviceInputManager } from './input/DeviceInputManager';
import { OverlayManager } from './overlay/OverlayManager';
import { createMotionDebug } from './app/debugPanel';
import { startFallback } from './app/fallback';

function startApplication(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const status = document.querySelector<HTMLParagraphElement>('#status');
  if (!canvas || !status) throw new Error('Missing application shell');

  const capabilities = detectCapabilities();
  const forceReducedMotion = import.meta.env.DEV && new URLSearchParams(location.search).has('debugReducedMotion');
  let scene: SceneController;
  try {
    if (!capabilities.webgl2Api || (import.meta.env.DEV && new URLSearchParams(location.search).has('debugFallback'))) throw new Error('WebGL2 unavailable');
    scene = new SceneController(canvas, forceReducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return startFallback(canvas, status);
  }

  const store = new SceneStore();
  const router = new HashRouter(window);
  const dispatch = (action: SceneAction): void => store.dispatch(action);
  const overlay = new OverlayManager(document.querySelector<HTMLElement>('#app')!, scene);
  const inputs = new DeviceInputManager(canvas, scene, overlay);
  const nav = document.createElement('nav'); nav.className = 'device-navigation'; nav.ariaLabel = 'Peripheral tests';
  let focused: DeviceId | null = null;
  let dismissal: ReturnType<typeof setTimeout> | undefined;
  const reveal = (id: DeviceId | null): void => {
    clearTimeout(dismissal);
    const active = focused ?? id;
    scene.hover(active); overlay.overviewField?.hover(active);
  };
  const dismiss = (): void => { clearTimeout(dismissal); dismissal = setTimeout(() => reveal(null), 120); };
  overlay.overviewField?.setInteraction({ enter: reveal, leave: dismiss, activate: id => router.navigate(id) });
  const buttons = DEVICE_IDS.map((id) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = id === 'camera' ? 'Webcam' : id;
    button.ariaLabel = `Test ${id}`; button.addEventListener('click', () => router.navigate(id));
    button.addEventListener('focus', () => { focused = id; reveal(id); }); button.addEventListener('blur', () => { focused = null; dismiss(); });
    button.addEventListener('pointerenter', () => reveal(id)); button.addEventListener('pointerleave', dismiss);
    nav.append(button); return { id, button };
  });
  document.querySelector('#app')!.append(nav);
  const pointerMove = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const hit = scene.pick(event.clientX - rect.left, event.clientY - rect.top);
    if (event.pointerType !== 'touch') { if (hit) reveal(hit); else dismiss(); }
    canvas.classList.toggle('device-hover', Boolean(hit));
  };
  const pointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') canvas.classList.add('pointer-pressed');
    if (event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const hit = scene.pick(event.clientX - rect.left, event.clientY - rect.top);
    if (hit) router.navigate(hit);
  };
  const pointerUp = (): void => canvas.classList.remove('pointer-pressed');
  const pointerLeave = (): void => { dismiss(); canvas.classList.remove('device-hover', 'pointer-pressed'); };
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('pointercancel', pointerUp);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('blur', pointerUp);
  const unsubscribeState = store.subscribe((state) => {
    clearTimeout(dismissal); focused = null; reveal(null);
    inputs.setState(state);
    scene.applyState(state, dispatch);
    for (const { id, button } of buttons) button.setAttribute('aria-pressed', String(state.mode === 'focus' && state.device === id));
    nav.hidden = state.mode !== 'overview';
    status.textContent = state.mode === 'overview'
      ? 'Choose a device to test.'
      : `${state.device} ${state.phase === 'active' ? 'ready' : state.phase}.`;
  });
  scene.applyState(store.getState(), dispatch);
  status.textContent = 'Choose a device to test.';

  const resize = (): void => scene.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  const stopMotionPreference = observeReducedMotion((reduced) => scene.setReducedMotion(forceReducedMotion || reduced, dispatch));
  const unsubscribeRoute = router.subscribe((device) => dispatch({ type: 'navigate', device }));
  const debugPanel = import.meta.env.DEV && new URLSearchParams(location.search).has('debugMotion') ? createMotionDebug(scene, inputs, store) : null;
  const loop = new RenderLoop(({ deltaSeconds, nowMs }) => {
    inputs.poll(nowMs, deltaSeconds);
    scene.update(deltaSeconds);
    scene.render();
    overlay.update();
    debugPanel?.update(nowMs);
  });
  loop.start();
  const onContextLost = (event: Event): void => {
    event.preventDefault(); inputs.suspend(); loop.stop();
    status.textContent = 'Graphics connection interrupted. IO will resume when it is restored.';
    status.classList.remove('sr-only'); status.classList.add('compatibility-message');
  };
  const onContextRestored = (): void => {
    status.classList.add('sr-only'); status.classList.remove('compatibility-message');
    const state = store.getState(); status.textContent = state.mode === 'overview' ? 'Choose a device to test.' : `${state.device} ${state.phase === 'active' ? 'ready' : state.phase}.`;
    scene.invalidate(); resize(); inputs.resume(); loop.start();
  };
  canvas.addEventListener('webglcontextlost', onContextLost); canvas.addEventListener('webglcontextrestored', onContextRestored);

  // Keep BFCache restoration functional; background suspension belongs to RenderLoop.
  const onPageHide = (event: PageTransitionEvent): void => {
    inputs.suspend();
    if (!event.persisted) dispose();
  };
  window.addEventListener('pagehide', onPageHide);
  const onPageShow = (): void => inputs.resume(); window.addEventListener('pageshow', onPageShow);

  function dispose(): void {
    loop.stop();
    clearTimeout(dismissal);
    unsubscribeRoute();
    unsubscribeState();
    stopMotionPreference();
    observer.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    canvas!.removeEventListener('pointermove', pointerMove); canvas!.removeEventListener('pointerdown', pointerDown);
    canvas!.removeEventListener('pointerleave', pointerLeave); nav.remove();
    canvas!.removeEventListener('pointercancel', pointerUp);
    window.removeEventListener('pointerup', pointerUp); window.removeEventListener('blur', pointerUp);
    canvas!.removeEventListener('webglcontextlost', onContextLost); canvas!.removeEventListener('webglcontextrestored', onContextRestored);
    debugPanel?.dispose();
    inputs.dispose(); overlay.dispose(); scene.dispose();
  }
  return dispose;
}

function updateHeader(): void {
  const route = parseHash(location.hash);
  document.querySelector('#view-label')!.textContent = route === 'camera' ? 'webcam' : route === 'audio' ? 'speaker' : route ?? 'overview';
  document.querySelector<HTMLElement>('.overview-link')!.hidden = route === null;
}
updateHeader();
window.addEventListener('hashchange', updateHeader);
const dispose = startApplication();
if (import.meta.hot) import.meta.hot.dispose(() => { dispose(); window.removeEventListener('hashchange', updateHeader); });
