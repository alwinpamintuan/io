import type { DeviceId, SceneState } from '../app/state';
import { DEVICE_IDS } from '../app/state';
import type { SceneController } from '../scene/SceneController';

const NS = 'http://www.w3.org/2000/svg';
const LABELS: Record<DeviceId, string> = { monitor: 'display', keyboard: 'keyboard', mouse: 'pointer', controller: 'controller', camera: 'camera', audio: 'audio', microphone: 'microphone' };

/** Projected drafting and a single interactive annotation, absent throughout focus. */
export class OverviewField {
  readonly root = document.createElementNS(NS, 'svg');
  private signature = '';
  private active: DeviceId | null = null;
  readonly label = document.createElement('button');
  private interaction: { enter: (id: DeviceId) => void; leave: () => void; activate: (id: DeviceId) => void } | null = null;
  setInteraction(value: NonNullable<OverviewField['interaction']>): void { this.interaction = value; }
  hover(id: DeviceId | null): void {
    if (this.active === id) return;
    this.active = id;
    this.root.querySelectorAll('[data-device]').forEach(node => node.classList.toggle('is-active', node.getAttribute('data-device') === id));
    this.label.hidden = !id || this.root.style.display === 'none';
    if (id) { this.label.textContent = LABELS[id]; this.label.ariaLabel = `Test ${id}`; }
    this.signature = '';
  }
  constructor(parent: HTMLElement, private readonly scene: Pick<SceneController, 'overviewBounds'>) {
    this.root.classList.add('overview-field');
    this.root.setAttribute('aria-hidden', 'true');
    this.label.type = 'button'; this.label.className = 'overview-label'; this.label.tabIndex = -1; this.label.hidden = true;
    this.label.addEventListener('pointerenter', () => { if (this.active) this.interaction?.enter(this.active); });
    this.label.addEventListener('pointerleave', () => this.interaction?.leave());
    this.label.addEventListener('click', () => { if (this.active) this.interaction?.activate(this.active); });
    parent.append(this.root, this.label);
  }
  state(state: SceneState): void {
    this.root.style.display = state.mode === 'overview' ? '' : 'none';
    if (state.mode !== 'overview') this.hover(null);
  }
  update(): void {
    if (this.root.style.display === 'none') return;
    const w = this.root.clientWidth, h = this.root.clientHeight;
    if (!w || !h) return;
    const bounds = new Map(DEVICE_IDS.map(id => [id, this.scene.overviewBounds(id)]));
    const signature = JSON.stringify([w, h, this.active, [...bounds]]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.root.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.root.replaceChildren();
    const element = (tag: string, attrs: Record<string, string | number>, parent: Element = this.root) => {
      const node = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
      parent.append(node); return node;
    };
    const defs = element('defs', {}), mask = element('mask', { id: 'overview-paper-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: w, height: h }, defs);
    element('rect', { width: w, height: h, fill: 'white' }, mask);
    for (const b of bounds.values()) if (b.visible) {
      element('rect', { x: b.left - 5, y: b.top - 5, width: b.right - b.left + 10, height: b.bottom - b.top + 10, fill: 'black' }, mask);
    }
    const construction = element('g', { class: 'overview-construction', mask: 'url(#overview-paper-mask)' });
    const line = (x: number, y: number, xx: number, yy: number, parent = construction) => element('path', { d: `M${x},${y} L${xx},${yy}` }, parent);
    const cross = (x: number, y: number, size = 4) => { line(x - size, y, x + size, y); line(x, y - size, x, y + size); };
    const margin = 28, top = 104, bottom = h - (w <= 700 ? 140 : margin);
    const monitor = bounds.get('monitor')!, keyboard = bounds.get('keyboard')!;
    // Broken envelope shares the existing registration coordinates, without boxing the hero.
    for (const x of [margin, w - margin]) {
      line(x, top + 24, x, h * .42); line(x, h * .59, x, bottom - 24);
      cross(x, h * .51);
    }
    const datumY = Math.max(top + 38, monitor.top + 30);
    line(margin + 16, datumY, monitor.left - 55, datumY);
    // The single upper-right gesture follows the display datum.
    line(monitor.right + 55, datumY, w - margin - 16, datumY);
    line(w * .42, bottom, w * .58, bottom); cross(w * .5, bottom);
    line(margin + 12, keyboard.bottom + 22, w * .34, keyboard.bottom + 22);
    line(w * .68, keyboard.bottom + 22, w - margin - 12, keyboard.bottom + 22);
    cross(w * .17, datumY); cross(w * .84, keyboard.bottom + 22);
    // Small cropped elevation grid, mostly occluded by the monitor.
    const gridLeft = monitor.left - Math.min(76, w * .08), gridTop = Math.max(top + 12, monitor.top - 38);
    const grid = element('g', { class: 'overview-grid', mask: 'url(#overview-paper-mask)' });
    for (let i = 0; i < 6; i++) line(gridLeft + i * 22, gridTop, gridLeft + i * 22, gridTop + 138, grid);
    for (let i = 0; i < 6; i++) line(gridLeft - 8, gridTop + i * 24, gridLeft + 122, gridTop + i * 24, grid);
    for (const id of ['controller', 'mouse'] as const) {
      const b = bounds.get(id)!; if (!b.visible) continue;
      const radial = element('g', { class: `overview-radial${this.active === id ? ' is-active' : ''}`, 'data-device': id, mask: 'url(#overview-paper-mask)' });
      const x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
      const rx = Math.max(42, (b.right - b.left) * .78), ry = rx * .42;
      element('path', { d: `M${x - rx},${y} A${rx},${ry} 0 0 1 ${x},${y - ry} M${x + rx},${y} A${rx},${ry} 0 0 1 ${x},${y + ry}` }, radial);
      line(x - rx - 22, y, x + rx + 22, y, radial);
    }
    const audio = bounds.get('audio')!;
    if (audio.visible) for (const x of [audio.left - 16, audio.right + 16]) {
      line(x, audio.top - 26, x, audio.bottom + 26); cross(x, audio.top + 12);
    }
    // Device-related structure stays quiet until that device is selected by hover/focus.
    for (const id of ['monitor', 'camera', 'keyboard', 'audio', 'microphone'] as const) {
      const b = bounds.get(id)!; if (!b.visible) continue;
      const field = element('g', { class: `overview-device-field${this.active === id ? ' is-active' : ''}`, 'data-device': id, mask: 'url(#overview-paper-mask)' });
      const x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
      if (id === 'keyboard' || id === 'audio') {
        const yy = id === 'keyboard' ? b.bottom + 14 : y;
        line(b.left - 22, yy, b.right + 22, yy, field);
      } else {
        if (id === 'camera' && this.active === id) {
          const optical = element('g', { class: 'overview-optical' });
          line(x - 7, y, x + 7, y, optical); line(x, y - 7, x, y + 7, optical);
        }
        line(x - 14, y, x + 14, y, field); line(x, b.top - 18, x, b.bottom + 18, field);
      }
    }
    const id = this.active;
    this.label.hidden = !id;
    if (!id) return;
    const b = bounds.get(id)!;
    // Omitted objects still have accessible navigation, but no fictitious scene leader.
    if (!b.visible) { this.label.hidden = true; return; }
    const slots: Record<DeviceId, [number, number]> = {
      monitor: [.18, .23], camera: [.74, .19], audio: [.12, .46], microphone: [.87, .57],
      controller: [.14, .78], keyboard: [.48, .85], mouse: [.84, .79],
    };
    const [sx, sy] = slots[id];
    const labelWidth = 100, labelHeight = 36;
    const overlaps = (x: number, y: number) => [...bounds.values()].some(o => o.visible && x < o.right + 12 && x + labelWidth > o.left - 12 && y < o.bottom + 12 && y + labelHeight > o.top - 12);
    const candidates: [number, number][] = [[sx * w, sy * h], [b.left - 126, b.top - 40], [b.right + 26, b.bottom + 24]];
    for (let y = top; y < bottom - labelHeight; y += 40) for (const x of [margin + 12, w - margin - labelWidth - 12, (w - labelWidth) / 2]) candidates.push([x, y]);
    const positions = candidates.map(([x, y]) => [Math.max(margin, Math.min(w - margin - labelWidth, x)), Math.max(top, Math.min(bottom - labelHeight, y))] as const);
    const [x, y] = positions.find(([x, y]) => !overlaps(x, y)) ?? positions[0]!;
    this.label.style.left = `${x}px`; this.label.style.top = `${y}px`;
    const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
    const ex = x + (x < cx ? labelWidth : 0), ey = y + labelHeight / 2;
    const dx = ex - cx, dy = ey - cy;
    const t = Math.min((b.right - b.left) / 2 / Math.max(.001, Math.abs(dx)), (b.bottom - b.top) / 2 / Math.max(.001, Math.abs(dy)));
    const ax = cx + dx * t, ay = cy + dy * t;
    const group = element('g', { class: 'overview-callout', 'data-device': id });
    const d = `M${ax},${ay} L${ex + (dx < 0 ? 18 : -18)},${ey} H${ex}`;
    element('path', { d, class: 'overview-leader', pathLength: 1 }, group);
    element('circle', { cx: ax, cy: ay, r: 1.8 }, group);
    const bridge = element('path', { d, class: 'overview-hover-bridge' }, group);
    bridge.addEventListener('pointerenter', () => this.interaction?.enter(id));
    bridge.addEventListener('pointerleave', () => this.interaction?.leave());
  }
  dispose(): void { this.root.remove(); this.label.remove(); }
}
