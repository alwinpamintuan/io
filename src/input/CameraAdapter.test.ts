import { afterEach, expect, it, vi } from 'vitest';
import { CameraAdapter } from './CameraAdapter';
afterEach(() => vi.unstubAllGlobals());
it('stops an old source during selection and ignores delayed playback after Stop', async () => {
  let playReady!: () => void; const play = vi.fn(() => new Promise<void>(yes => { playReady = yes; }));
  const video = { muted: false, playsInline: false, autoplay: false, srcObject: null as unknown, pause: vi.fn(), play };
  const tracks = [0, 1].map(i => Object.assign(new EventTarget(), { stop: vi.fn(), getSettings: () => ({ width: i ? 480 : 1280, height: i ? 640 : 720 }) }));
  const streams = tracks.map(track => ({ getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream));
  const getUserMedia = vi.fn().mockResolvedValueOnce(streams[0]).mockResolvedValueOnce(streams[1]);
  const media = Object.assign(new EventTarget(), { getUserMedia, enumerateDevices: async () => [] });
  vi.stubGlobal('window', { isSecureContext: true, navigator: { mediaDevices: media } }); vi.stubGlobal('navigator', { mediaDevices: media }); vi.stubGlobal('document', { createElement: () => video });
  const camera = new CameraAdapter(); camera.enter(); await camera.select('wide'); expect(getUserMedia).not.toHaveBeenCalled(); const first = camera.start(); await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1)); const oldReady = playReady;
  const second = camera.select('portrait'); await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2)); expect(tracks[0]!.stop).toHaveBeenCalled(); expect(getUserMedia).toHaveBeenLastCalledWith({ video: { deviceId: { exact: 'portrait' } }, audio: false });
  camera.stop(); oldReady(); playReady(); await Promise.all([first, second]); expect(camera.snapshot().video).toBeNull(); expect(camera.snapshot().settings).toBeNull(); expect(tracks[1]!.stop).toHaveBeenCalled(); camera.exit();
});
