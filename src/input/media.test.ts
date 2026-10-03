import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaCapture } from './MediaCapture';
import { AudioAdapter } from './AudioAdapter';
import { MicrophoneAdapter } from './MicrophoneAdapter';
import { normalizeGamepad } from './GamepadAdapter';

afterEach(() => vi.unstubAllGlobals());
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function browser(getUserMedia: () => Promise<MediaStream>, secure = true) { return { isSecureContext: secure, navigator: { mediaDevices: { getUserMedia } } } as unknown as Window & typeof globalThis; }
function stream() { const track = Object.assign(new EventTarget(), { stop: vi.fn() }); return { value: { getTracks: () => [track] } as unknown as MediaStream, track }; }

describe('media lifecycle', () => {
  it('stops a stream resolving after exit without making it live', async () => {
    const pending = deferred<MediaStream>(); const media = new MediaCapture(vi.fn(), browser(() => pending.promise));
    const request = media.request({ video: true }); expect(media.state).toBe('requesting'); media.stop();
    const device = stream(); pending.resolve(device.value); await request;
    expect(device.track.stop).toHaveBeenCalledOnce(); expect(media.stream).toBeNull(); expect(media.state).toBe('idle');
  });
  it('rejects stale errors and normalizes permission denial', async () => {
    const pending = deferred<MediaStream>(); const media = new MediaCapture(vi.fn(), browser(() => pending.promise));
    const request = media.request({ audio: true }); pending.reject({ name: 'NotAllowedError' }); await request;
    expect(media.state).toBe('permission-denied');
    const denied = deferred<MediaStream>(); const cancelled = new MediaCapture(vi.fn(), browser(() => denied.promise));
    const next = cancelled.request({ audio: true }); cancelled.stop(); denied.reject({ name: 'NotAllowedError' }); await next;
    expect(cancelled.state).toBe('idle');
  });
  it('does not prompt in an insecure context and stops disconnected tracks', async () => {
    const capture = vi.fn(); const media = new MediaCapture(vi.fn(), browser(capture, false));
    await media.request({ video: true }); expect(media.state).toBe('secure-context-required'); expect(capture).not.toHaveBeenCalled();
    const device = stream(); const live = new MediaCapture(vi.fn(), browser(async () => device.value));
    await live.request({ video: true }); device.track.dispatchEvent(new Event('ended'));
    expect(live.state).toBe('device-disconnected'); expect(live.stream).toBeNull(); expect(device.track.stop).toHaveBeenCalled();
  });
  it('cancels tones and microphone requests while audio resume is pending', async () => {
    const resume = deferred<void>(); const createOscillator = vi.fn(); const getUserMedia = vi.fn();
    const context = { resume: () => resume.promise, close: async () => {}, createOscillator };
    vi.stubGlobal('window', { AudioContext: function () { return context; }, isSecureContext: true, navigator: { mediaDevices: { getUserMedia } } });
    vi.stubGlobal('AudioContext', function () { return context; });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const audio = new AudioAdapter(); audio.enter(); const mic = new MicrophoneAdapter(); mic.enter();
    const tone = audio.tone('left', 440); const microphone = mic.start();
    audio.stopOutput(); mic.stop(); resume.resolve(); await Promise.all([tone, microphone]);
    expect(createOscillator).not.toHaveBeenCalled(); expect(getUserMedia).not.toHaveBeenCalled(); audio.exit(); mic.exit();
  });
  it('keeps generic gamepad indexes and raw small offsets without a hidden deadzone', () => {
    const pad = normalizeGamepad({ id: 'Generic', index: 2, mapping: '', axes: [0.001, -0.003], buttons: [{ value: 0.42, pressed: false }], timestamp: 1 } as unknown as Gamepad);
    expect(pad.standard).toBe(false); expect(pad.axes).toEqual([0.001, -0.003]); expect(pad.buttons).toEqual([0.42]); expect(pad.haptics).toBe(false);
  });
});
