import { afterEach, expect, it, vi } from 'vitest';
import { MediaInputs } from './MediaInputs';
afterEach(() => vi.unstubAllGlobals());
it('enumerates restricted exposure without requesting capture, refreshes exposed choices, and never recaptures on devicechange', async () => {
  let devices = [{ kind: 'videoinput', deviceId: '', label: '' }]; const getUserMedia = vi.fn();
  const media = Object.assign(new EventTarget(), { enumerateDevices: vi.fn(async () => devices), getUserMedia });
  vi.stubGlobal('navigator', { mediaDevices: media });
  const inputs = new MediaInputs('videoinput', vi.fn()); inputs.enter(); await inputs.refresh(); expect(inputs.exposure).toBe('restricted'); expect(inputs.inputs).toHaveLength(0); expect(getUserMedia).not.toHaveBeenCalled();
  devices = [{ kind: 'videoinput', deviceId: 'a', label: 'Virtual A' }, { kind: 'videoinput', deviceId: 'b', label: 'Virtual B' }]; await inputs.refresh(); expect(inputs.exposure).toBe('exposed'); expect(inputs.inputs).toHaveLength(2);
  inputs.selected = 'b'; expect(inputs.constraint()).toEqual({ deviceId: { exact: 'b' } });
  devices = []; media.dispatchEvent(new Event('devicechange')); await Promise.resolve(); expect(inputs.selected).toBe(''); expect(getUserMedia).not.toHaveBeenCalled();
  inputs.exit(); const calls = media.enumerateDevices.mock.calls.length; media.dispatchEvent(new Event('devicechange')); expect(media.enumerateDevices).toHaveBeenCalledTimes(calls);
});
it('ignores enumeration completing after exit', async () => {
  let resolve!: (value: unknown[]) => void;
  vi.stubGlobal('navigator', { mediaDevices: { enumerateDevices: () => new Promise(yes => { resolve = yes; }) } });
  const changed = vi.fn(); const inputs = new MediaInputs('audioinput', changed); inputs.enter(); inputs.exit(); resolve([{ kind: 'audioinput', deviceId: 'x', label: 'X' }]); await Promise.resolve(); expect(inputs.inputs).toHaveLength(0); expect(changed).not.toHaveBeenCalled();
});
