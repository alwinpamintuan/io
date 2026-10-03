import type { DeviceId, SceneState } from '../app/state';
import type { SceneController } from '../scene/SceneController';

export class OverlayManager {
  readonly root = document.createElement('section');
  readonly metrics = document.createElement('output');
  readonly controls = document.createElement('div');
  readonly message = document.createElement('p');
  private readonly connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  private readonly path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  private readonly live = document.createElement('span');
  private device: DeviceId | null = null;
  constructor(parent: HTMLElement, private readonly scene: Pick<SceneController, 'anchor'>) {
    this.root.className = 'instrument'; this.root.hidden = true;
    this.root.ariaLabel = 'Device test'; this.metrics.className = 'measurements';
    this.metrics.setAttribute('aria-live', 'off'); this.metrics.setAttribute('role', 'group');
    this.controls.className = 'test-controls'; this.message.className = 'test-message';
    this.message.setAttribute('role', 'status'); this.root.append(this.metrics, this.controls, this.message); parent.append(this.root);
    this.connector.classList.add('annotation-connector'); this.connector.setAttribute('aria-hidden', 'true');
    this.connector.append(this.path); this.connector.style.display = 'none'; parent.append(this.connector);
    this.live.className = 'sr-only'; this.live.setAttribute('role', 'status'); parent.append(this.live);
  }
  state(state: SceneState): void {
    this.announce('');
    this.metrics.removeAttribute('aria-label');
    this.device = state.mode === 'focus' && state.phase === 'active' ? state.device : null;
    this.root.hidden = !this.device;
    this.connector.style.display = this.device ? '' : 'none';
    if (!this.device) { this.metrics.textContent = ''; this.controls.replaceChildren(); this.message.textContent = ''; }
    else this.root.ariaLabel = `${this.device} test`;
  }
  button(label: string, action: () => void, name = label): HTMLButtonElement {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.ariaLabel = name;
    button.addEventListener('click', action); this.controls.append(button); return button;
  }
  setMessage(value: string): void { if (this.message.textContent !== value) this.message.textContent = value; }
  announce(value: string): void { if (this.live.textContent !== value) this.live.textContent = value; }
  update(): void {
    if (!this.device) return;
    const anchor = this.scene.anchor(this.device);
    // Line begins at the projected device anchor; text occupies adjoining negative space.
    const width = this.root.offsetWidth || 290;
    const x = Math.min(window.innerWidth - width - 24, Math.max(24, anchor.x + 65));
    const y = Math.min(window.innerHeight - this.root.offsetHeight - 24, Math.max(96, anchor.y + 48));
    this.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    this.root.style.setProperty('--anchor-offset', `${Math.round(anchor.x - x)}px`);
    this.path.setAttribute('d', `M${anchor.x},${anchor.y} L${x},${y - 12} H${x + 64}`);
    this.connector.style.visibility = anchor.visible ? 'visible' : 'hidden';
  }
  dispose(): void { this.root.remove(); this.connector.remove(); this.live.remove(); }
}
