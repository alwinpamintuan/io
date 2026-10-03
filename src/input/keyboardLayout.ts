export interface KeyDefinition { code: string; label: string; x: number; y: number; width: number; depth: number }
export const KEY_LAYOUT: KeyDefinition[] = [];
const u = 1.86;
function row(y: number, start: number, entries: (string | [string, string, number])[]): void {
  let x = start;
  for (const entry of entries) {
    const [code, label, width] = typeof entry === 'string' ? [entry, entry.replace(/^Key|^Digit|^Numpad/, ''), 1] : entry;
    KEY_LAYOUT.push({ code, label, x: x + width * u / 2, y, width: width * u - 0.18, depth: 1.65 });
    x += width * u;
  }
}
row(5.2, -21.4, [['Escape', 'esc', 1], ...Array.from({ length: 12 }, (_, i): [string, string, number] => [`F${i + 1}`, `F${i + 1}`, i === 0 || i === 4 || i === 8 ? 1.45 : 1])]);
row(3.1, -21.4, [['Backquote', '~', 1], ...'1234567890'.split('').map((n) => `Digit${n}`), ['Minus', '−', 1], ['Equal', '=', 1], ['Backspace', '←', 2]]);
row(1.1, -21.4, [['Tab', 'tab', 1.5], ...'QWERTYUIOP'.split('').map((n) => `Key${n}`), ['BracketLeft', '[', 1], ['BracketRight', ']', 1], ['Backslash', '\\', 1.5]]);
row(-0.9, -21.4, [['CapsLock', 'caps', 1.75], ...'ASDFGHJKL'.split('').map((n) => `Key${n}`), ['Semicolon', ';', 1], ['Quote', "'", 1], ['Enter', 'enter', 2.25]]);
row(-2.9, -21.4, [['ShiftLeft', 'shift', 2.25], ...'ZXCVBNM'.split('').map((n) => `Key${n}`), ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1], ['ShiftRight', 'shift', 2.75]]);
row(-4.9, -21.4, [['ControlLeft', 'ctrl', 1.25], ['MetaLeft', '◇', 1.25], ['AltLeft', 'alt', 1.25], ['Space', '', 6.25], ['AltRight', 'alt', 1.25], ['MetaRight', '◇', 1.25], ['ContextMenu', '≡', 1.25], ['ControlRight', 'ctrl', 1.25]]);
row(5.2, 7.5, [['PrintScreen', 'prt', 1], ['ScrollLock', 'scr', 1], ['Pause', 'pause', 1]]);
row(3.1, 7.5, [['Insert', 'ins', 1], ['Home', 'home', 1], ['PageUp', 'pg↑', 1]]);
row(1.1, 7.5, [['Delete', 'del', 1], ['End', 'end', 1], ['PageDown', 'pg↓', 1]]);
row(-2.9, 9.36, [['ArrowUp', '↑', 1]]);
row(-4.9, 7.5, [['ArrowLeft', '←', 1], ['ArrowDown', '↓', 1], ['ArrowRight', '→', 1]]);
row(3.1, 13.8, [['NumLock', 'num', 1], ['NumpadDivide', '/', 1], ['NumpadMultiply', '*', 1], ['NumpadSubtract', '−', 1]]);
row(1.1, 13.8, ['Numpad7', 'Numpad8', 'Numpad9']);
row(-0.9, 13.8, ['Numpad4', 'Numpad5', 'Numpad6']);
row(-2.9, 13.8, ['Numpad1', 'Numpad2', 'Numpad3']);
row(-4.9, 13.8, [['Numpad0', '0', 2], ['NumpadDecimal', '.', 1]]);
KEY_LAYOUT.push({ code: 'NumpadAdd', label: '+', x: 20.31, y: 0.1, width: 1.68, depth: 3.65 },
  { code: 'NumpadEnter', label: '↵', x: 20.31, y: -3.9, width: 1.68, depth: 3.65 });

const FALLBACK: Record<string, string> = { ' ': 'Space', Esc: 'Escape', '+': 'Equal', '-': 'Minus', '=': 'Equal', ',': 'Comma', '.': 'Period', '/': 'Slash', ';': 'Semicolon', "'": 'Quote', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash', '`': 'Backquote' };
export function keyboardCode(event: Pick<KeyboardEvent, 'code' | 'key' | 'location'>): string {
  if (event.code && event.code !== 'Unidentified') return event.code;
  if (event.location === 3 && /^[0-9]$/.test(event.key)) return `Numpad${event.key}`;
  if (event.location === 3) return ({ Enter: 'NumpadEnter', '+': 'NumpadAdd', '-': 'NumpadSubtract', '*': 'NumpadMultiply', '/': 'NumpadDivide', '.': 'NumpadDecimal', ',': 'NumpadDecimal' } as Record<string, string>)[event.key] ?? event.key;
  const shifted: Record<string, string> = { '!': 'Digit1', '@': 'Digit2', '#': 'Digit3', '$': 'Digit4', '%': 'Digit5', '^': 'Digit6', '&': 'Digit7', '*': 'Digit8', '(': 'Digit9', ')': 'Digit0', ':': 'Semicolon', '?': 'Slash', '"': 'Quote', '<': 'Comma', '>': 'Period', '{': 'BracketLeft', '}': 'BracketRight', '|': 'Backslash', '~': 'Backquote', '_': 'Minus' };
  if (shifted[event.key]) return shifted[event.key]!;
  if (/^[a-z]$/i.test(event.key)) return `Key${event.key.toUpperCase()}`;
  if (/^[0-9]$/.test(event.key)) return `Digit${event.key}`;
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return `${event.key}${event.location === 2 ? 'Right' : 'Left'}`;
  return FALLBACK[event.key] ?? event.key;
}
