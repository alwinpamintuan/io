/** Graphic controls retain semantic buttons and the adapters' select/change API. */
const GLYPHS: Record<string, string> = {
  Reset: '↺', Mirror: '↔', 'Start camera': '◉', 'Start microphone': '◉',
  Stop: '□', 'Stop tone': '□', Haptics: '≋', left: '◐', right: '◑', both: '●',
  Fullscreen: '⛶', 'Exit fullscreen': '⛶', 'Previous pattern': '←', 'Next pattern': '→',
  'Pause motion': 'Ⅱ', 'Resume motion': '▷',
};
const PATTERNS = ['□', '■', '▨', 'R', 'G', 'B', '◧', '▰', '▱', '≡', '⊞', '▦', '☰', 'Ⅲ', '↝', '◷'];

export function designButton(button: HTMLButtonElement, label: string, name = label): void {
  button.classList.add('glyph-control'); button.ariaLabel = name; button.title = name;
  const glyph = document.createElement('span'); glyph.ariaHidden = 'true'; glyph.textContent = GLYPHS[label] ?? label;
  button.replaceChildren(glyph);
}

interface Choice { root: HTMLDivElement; trigger: HTMLButtonElement | null; list: HTMLDivElement; signature: string }
const choices = new WeakMap<HTMLSelectElement, Choice>();
let nextId = 0;

export function designChoice(select: HTMLSelectElement, patterns = false): void {
  if (choices.has(select)) return;
  select.classList.add('semantic-choice'); select.tabIndex = -1; select.ariaHidden = 'true';
  const root = document.createElement('div'); root.className = patterns ? 'pattern-rail' : 'inline-choice';
  const list = document.createElement('div'); list.className = patterns ? 'pattern-options' : 'choice-options';
  list.id = `io-choice-${++nextId}`; list.setAttribute('role', patterns ? 'group' : 'listbox'); list.ariaLabel = select.ariaLabel;
  let trigger: HTMLButtonElement | null = null;
  if (!patterns) {
    trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'choice-trigger';
    trigger.setAttribute('role', 'combobox'); trigger.ariaLabel = select.ariaLabel;
    trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-controls', list.id); trigger.setAttribute('aria-expanded', 'false');
    list.hidden = true; root.append(trigger);
  }
  root.append(list); select.after(root); const choice = { root, trigger, list, signature: '' }; choices.set(select, choice);
  const close = (focus = false): void => { if (!trigger) return; list.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus(); };
  const open = (): void => { if (!trigger) return; list.hidden = false; trigger.setAttribute('aria-expanded', 'true'); (list.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? list.querySelector('button'))?.focus(); };
  trigger?.addEventListener('click', () => list.hidden ? open() : close());
  trigger?.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } });
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget as Node | null)) close(); });
  list.addEventListener('click', e => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button'); if (!button) return;
    select.value = button.dataset.value!; select.dispatchEvent(new Event('change', { bubbles: true })); syncChoices(select.parentElement!); close(true);
  });
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && trigger && !list.hidden) { e.preventDefault(); e.stopPropagation(); close(true); }
    if (!list.contains(e.target as Node) || !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); const buttons = [...list.querySelectorAll<HTMLButtonElement>('button')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  });
  syncChoices(select.parentElement!);
}

export function syncChoices(parent: HTMLElement): void {
  parent.querySelectorAll('select').forEach(select => {
    const choice = choices.get(select); if (!choice) return;
    const { root, trigger, list } = choice; root.hidden = select.hidden;
    if (trigger) {
      trigger.disabled = select.disabled;
      const value = select.selectedOptions[0]?.textContent ?? '—';
      trigger.textContent = select.ariaLabel === 'Tone frequency' ? `${value} Hz` : select.ariaLabel === 'Motion direction' ? ({right:'→',left:'←',up:'↑',down:'↓'}[value] ?? value) : value;
      trigger.title = `${select.ariaLabel}: ${value}`;
    }
    const signature = [...select.options].map(o => `${o.value}:${o.textContent}`).join('|');
    if (signature !== choice.signature) {
      choice.signature = signature; list.replaceChildren();
      [...select.options].forEach((option, i) => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.value = option.value;
        button.textContent = trigger ? option.textContent : PATTERNS[i] ?? '○';
        button.ariaLabel = trigger ? option.textContent : `${option.value} pattern`; button.title = button.ariaLabel ?? '';
        button.className = trigger ? 'choice-option' : 'pattern-glyph';
        if (trigger) button.setAttribute('role', 'option'); list.append(button);
      });
    }
    list.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      const active = button.dataset.value === select.value; button.disabled = select.disabled;
      button.setAttribute(trigger ? 'aria-selected' : 'aria-pressed', String(active));
      if (trigger) button.tabIndex = active ? 0 : -1;
    });
  });
}
