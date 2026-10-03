import { describe, expect, it, vi } from 'vitest';
import { DEVICE_IDS, INITIAL_SCENE_STATE, SceneStore, sceneReducer } from './state';
import type { SceneState } from './state';

describe('sceneReducer', () => {
  it.each(DEVICE_IDS)('enters %s focus before activation', (device) => {
    const entering = sceneReducer(INITIAL_SCENE_STATE, { type: 'navigate', device });
    expect(entering).toEqual({ mode: 'focus', device, phase: 'entering', revision: 1 });
    expect(sceneReducer(entering, { type: 'transition-completed', revision: 1 }))
      .toEqual({ ...entering, phase: 'active' });
    expect(INITIAL_SCENE_STATE).toEqual({ mode: 'overview', revision: 0 });
  });

  it('retains the focused device during exit, then restores overview', () => {
    const active: SceneState = { mode: 'focus', device: 'keyboard', phase: 'active', revision: 1 };
    const exiting = sceneReducer(active, { type: 'navigate', device: null });
    expect(exiting).toEqual({ ...active, phase: 'exiting', revision: 2 });
    expect(sceneReducer(exiting, { type: 'transition-completed', revision: 2 }))
      .toEqual({ mode: 'overview', revision: 2 });
  });

  it('can return home while still entering', () => {
    const entering = sceneReducer(INITIAL_SCENE_STATE, { type: 'navigate', device: 'mouse' });
    expect(sceneReducer(entering, { type: 'navigate', device: null }))
      .toEqual({ mode: 'focus', device: 'mouse', phase: 'exiting', revision: 2 });
  });

  it('retargets a transition without accepting stale completion', () => {
    const first = sceneReducer(INITIAL_SCENE_STATE, { type: 'navigate', device: 'keyboard' });
    const second = sceneReducer(first, { type: 'navigate', device: 'mouse' });
    expect(second).toEqual({ mode: 'focus', device: 'mouse', phase: 'entering', revision: 2 });
    expect(sceneReducer(second, { type: 'transition-completed', revision: first.revision })).toBe(second);
  });

  it('protects a later visit to the same device from an earlier completion', () => {
    const first = sceneReducer(INITIAL_SCENE_STATE, { type: 'navigate', device: 'keyboard' });
    const exiting = sceneReducer(first, { type: 'navigate', device: null });
    const reentering = sceneReducer(exiting, { type: 'navigate', device: 'keyboard' });
    expect(reentering).toEqual({ ...first, revision: 3 });
    expect(sceneReducer(reentering, { type: 'transition-completed', revision: 1 })).toBe(reentering);
    expect(sceneReducer(reentering, { type: 'transition-completed', revision: 2 })).toBe(reentering);
  });

  it('switches directly from one active device to another', () => {
    const active: SceneState = { mode: 'focus', device: 'monitor', phase: 'active', revision: 7 };
    expect(sceneReducer(active, { type: 'navigate', device: 'audio' }))
      .toEqual({ mode: 'focus', device: 'audio', phase: 'entering', revision: 8 });
  });

  it('does not restart repeated navigation or settled transitions', () => {
    expect(sceneReducer(INITIAL_SCENE_STATE, { type: 'navigate', device: null })).toBe(INITIAL_SCENE_STATE);
    expect(sceneReducer(INITIAL_SCENE_STATE, { type: 'transition-completed', revision: 0 })).toBe(INITIAL_SCENE_STATE);
    const entering = sceneReducer(INITIAL_SCENE_STATE, { type: 'navigate', device: 'camera' });
    const active = sceneReducer(entering, { type: 'transition-completed', revision: 1 });
    const exiting = sceneReducer(active, { type: 'navigate', device: null });
    expect(sceneReducer(entering, { type: 'navigate', device: 'camera' })).toBe(entering);
    expect(sceneReducer(active, { type: 'navigate', device: 'camera' })).toBe(active);
    expect(sceneReducer(active, { type: 'transition-completed', revision: 1 })).toBe(active);
    expect(sceneReducer(exiting, { type: 'navigate', device: null })).toBe(exiting);
  });
});

describe('SceneStore', () => {
  it('notifies only for changes and releases subscriptions', () => {
    const store = new SceneStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: 'navigate', device: null });
    expect(listener).not.toHaveBeenCalled();
    store.dispatch({ type: 'navigate', device: 'mouse' });
    expect(listener).toHaveBeenCalledExactlyOnceWith(store.getState());
    unsubscribe();
    store.dispatch({ type: 'navigate', device: 'monitor' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
