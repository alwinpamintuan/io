import { DEVICE_IDS } from './state';
import type { DeviceId } from './state';
import type { SceneController } from '../scene/SceneController';
import type { DeviceInputManager } from '../input/DeviceInputManager';
import type { SceneStore } from './state';

export function createMotionDebug(scene: SceneController, inputs: DeviceInputManager, store: SceneStore) {
  const root = document.createElement('fieldset'); root.className = 'motion-debug';
  const legend = document.createElement('legend'); legend.textContent = 'Motion inspection'; root.append(legend);
  const device = document.createElement('select'); device.ariaLabel = 'Transition to inspect';
  DEVICE_IDS.forEach((id) => { const option = document.createElement('option'); option.textContent = id; option.value = id; device.append(option); });
  const progress = document.createElement('input'); progress.type = 'range'; progress.min = '0'; progress.max = '100'; progress.value = '0'; progress.ariaLabel = 'Transition progress';
  const sample = () => { inputs.suspend(); scene.preview(device.value as DeviceId, Number(progress.value) / 100); };
  device.addEventListener('change', sample); progress.addEventListener('input', sample);
  const resume = document.createElement('button'); resume.textContent = 'Resume'; resume.type = 'button';
  resume.addEventListener('click', () => { scene.restore(store.getState()); inputs.resume(); });
  const output = document.createElement('pre'); root.append(device, progress, resume, output); document.querySelector('#app')!.append(root);
  let previous = 0;
  let longTasks = 0; let longest = 0; let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => list.getEntries().forEach((entry) => { if (entry.duration >= 50) { longTasks++; longest = Math.max(longest, entry.duration); } }));
    observer.observe({ type: 'longtask', buffered: true });
  } catch { observer = null; }
  return { update(now: number) { if (now - previous > 200) { output.textContent = scene.telemetry(inputs.activeDevice) + `\nlong tasks ≥50 ms: ${observer ? `${longTasks} · max ${longest.toFixed(1)} ms` : 'unavailable'}`; previous = now; } }, dispose() { root.remove(); observer?.disconnect(); } };
}
