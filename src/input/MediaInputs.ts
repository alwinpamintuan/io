/** Permission-aware exposure only; enumeration never requests capture permission. */
export class MediaInputs {
  inputs: readonly MediaDeviceInfo[] = [];
  selected = '';
  exposure: 'unrequested' | 'restricted' | 'exposed' | 'unsupported' = 'unrequested';
  private generation = 0;
  private active = false;
  constructor(private readonly kind: 'videoinput' | 'audioinput', private readonly changed: () => void) {}
  enter(): void { this.active = true; navigator.mediaDevices?.addEventListener?.('devicechange', this.refresh); void this.refresh(); }
  exit(): void { this.active = false; this.generation++; navigator.mediaDevices?.removeEventListener?.('devicechange', this.refresh); }
  refresh = async (): Promise<void> => {
    const generation = ++this.generation;
    if (!navigator.mediaDevices?.enumerateDevices) { this.exposure = 'unsupported'; this.changed(); return; }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!this.active || generation !== this.generation) return;
      this.inputs = devices.filter((device) => device.kind === this.kind && !!device.deviceId);
      this.exposure = this.inputs.some((device) => !!device.label) ? 'exposed' : 'restricted';
      if (this.selected && !this.inputs.some((device) => device.deviceId === this.selected)) this.selected = '';
      this.changed();
    } catch { if (this.active && generation === this.generation) { this.inputs = []; this.exposure = 'restricted'; this.changed(); } }
  };
  constraint(): MediaTrackConstraints | true { return this.selected ? { deviceId: { exact: this.selected } } : true; }
}
