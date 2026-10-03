export const DEVICE_IDS = [
  'keyboard', 'mouse', 'monitor', 'camera', 'controller', 'audio',
] as const;

export type DeviceId = (typeof DEVICE_IDS)[number];
export type SceneRoute = DeviceId | null;

// Revision correlates asynchronous completion with the latest navigation intent.
export type SceneState =
  | { readonly mode: 'overview'; readonly revision: number }
  | {
      readonly mode: 'focus';
      readonly device: DeviceId;
      readonly phase: 'entering' | 'active' | 'exiting';
      readonly revision: number;
    };

export type SceneAction =
  | { readonly type: 'navigate'; readonly device: SceneRoute }
  | { readonly type: 'transition-completed'; readonly revision: number };

export const INITIAL_SCENE_STATE: SceneState = { mode: 'overview', revision: 0 };

export function isDeviceId(value: string): value is DeviceId {
  return DEVICE_IDS.some((device) => device === value);
}

export function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  if (action.type === 'navigate') {
    if (action.device === null) {
      if (state.mode === 'overview' || state.phase === 'exiting') return state;
      return { ...state, phase: 'exiting', revision: state.revision + 1 };
    }

    if (state.mode === 'focus' && state.device === action.device && state.phase !== 'exiting') {
      return state;
    }

    return {
      mode: 'focus', device: action.device, phase: 'entering',
      revision: state.revision + 1,
    };
  }

  if (state.mode === 'overview' || action.revision !== state.revision) return state;
  if (state.phase === 'entering') return { ...state, phase: 'active' };
  if (state.phase === 'exiting') return { mode: 'overview', revision: state.revision };
  return state;
}

export type SceneListener = (state: SceneState) => void;

export class SceneStore {
  private state: SceneState = INITIAL_SCENE_STATE;
  private readonly listeners = new Set<SceneListener>();

  getState(): SceneState {
    return this.state;
  }

  dispatch(action: SceneAction): void {
    const next = sceneReducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    for (const listener of [...this.listeners]) listener(next);
  }

  subscribe(listener: SceneListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
