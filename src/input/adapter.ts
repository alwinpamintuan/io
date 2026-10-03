export interface DeviceAdapter<T> {
  supported(): boolean;
  enter(): void;
  exit(): void;
  snapshot(): T;
  subscribe(listener: (value: T) => void): () => void;
}

export abstract class ObservableAdapter<T> implements DeviceAdapter<T> {
  private listeners = new Set<(value: T) => void>();
  abstract supported(): boolean;
  abstract enter(): void;
  abstract exit(): void;
  abstract snapshot(): T;
  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
  protected publish(): void { const value = this.snapshot(); this.listeners.forEach((listener) => listener(value)); }
}

export function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('button, a, input, select, textarea, [contenteditable="true"]');
}
