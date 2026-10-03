export type MeasurementConfidence = 'direct' | 'derived' | 'unsupported';

export type CapabilityError =
  | 'unsupported'
  | 'permission-denied'
  | 'device-unavailable'
  | 'device-disconnected'
  | 'secure-context-required'
  | 'unknown';

export interface Capabilities {
  readonly secureContext: boolean;
  readonly webgl2Api: boolean;
  readonly pointerEvents: boolean;
  readonly coalescedPointerEvents: boolean;
  readonly rawPointerEvents: boolean;
  readonly gamepad: boolean;
  readonly mediaCapture: boolean;
  readonly webAudio: boolean;
  readonly webHid: boolean;
}

// Feature exposure only: this neither requests access nor claims a device is present.
// WebGL creation can still fail because of GPU/browser policy; main handles that.
export function detectCapabilities(browser: Window & typeof globalThis = window): Capabilities {
  const pointer = browser.PointerEvent;
  const nav = browser.navigator;
  return {
    secureContext: browser.isSecureContext === true,
    webgl2Api: typeof browser.WebGL2RenderingContext === 'function',
    pointerEvents: typeof pointer === 'function',
    coalescedPointerEvents: typeof pointer?.prototype.getCoalescedEvents === 'function',
    rawPointerEvents: 'onpointerrawupdate' in browser,
    gamepad: typeof nav.getGamepads === 'function',
    mediaCapture: browser.isSecureContext === true && typeof nav.mediaDevices?.getUserMedia === 'function',
    webAudio: typeof browser.AudioContext === 'function',
    webHid: browser.isSecureContext === true && 'hid' in nav,
  };
}

export function normalizeCapabilityError(error: unknown): CapabilityError {
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : null;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError': return 'permission-denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'NotReadableError':
    case 'OverconstrainedError': return 'device-unavailable';
    case 'NotSupportedError': return 'unsupported';
    default: return 'unknown';
  }
}

export function observeReducedMotion(
  onChange: (reduced: boolean) => void,
  browser: Pick<Window, 'matchMedia'> = window,
): () => void {
  const query = browser.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (): void => onChange(query.matches);
  query.addEventListener('change', listener);
  listener();
  return () => query.removeEventListener('change', listener);
}
