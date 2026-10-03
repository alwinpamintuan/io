import { afterEach, expect, it, vi } from 'vitest';
import { MicrophoneAdapter } from './MicrophoneAdapter';
afterEach(() => vi.unstubAllGlobals());
it('keeps idle selection permission-free, observes digital RMS without monitoring, and closes an ended source', async () => {
  const track = Object.assign(new EventTarget(), { stop: vi.fn(), getSettings: () => ({ sampleRate: 48000 }) });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const analyser = { fftSize: 0, disconnect: vi.fn(), getFloatTimeDomainData: (data: Float32Array) => data.fill(0.5) };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = { resume: async () => {}, close: vi.fn().mockResolvedValue(undefined), createMediaStreamSource: () => source, createAnalyser: () => analyser, destination: {} };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const media = Object.assign(new EventTarget(), { getUserMedia, enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'virtual', label: 'Virtual input' }] });
  vi.stubGlobal('window', { isSecureContext: true, AudioContext: function () { return context; }, navigator: { mediaDevices: media } });
  vi.stubGlobal('AudioContext', function () { return context; }); vi.stubGlobal('navigator', { mediaDevices: media });
  const microphone = new MicrophoneAdapter(); microphone.enter(); await microphone.select('virtual'); expect(getUserMedia).not.toHaveBeenCalled(); expect(microphone.snapshot().state).toBe('idle');
  await microphone.start(); microphone.poll(); expect(microphone.snapshot().amplitude).toBe(0.5); expect(microphone.snapshot().settings).toEqual({ sampleRate: 48000 });
  expect(getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: 'virtual' }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
  expect(source.connect).toHaveBeenCalledExactlyOnceWith(analyser); expect(source.connect).not.toHaveBeenCalledWith(context.destination);
  track.dispatchEvent(new Event('ended')); expect(microphone.snapshot().amplitude).toBe(0); expect(microphone.snapshot().settings).toBeNull(); expect(context.close).toHaveBeenCalled(); microphone.exit();
});
