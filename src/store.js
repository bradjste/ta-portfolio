import { useSyncExternalStore } from 'react'
import { DEFAULTS } from './anim'

// Tiny external store so the canvas and the DOM panels share state
// without re-rendering the whole tree every frame.
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let state = {
  frame: 0,
  playing: !prefersReducedMotion,
  ...DEFAULTS, // overlap, swing, speed, wobble, curl, squash, tangents, hue
  model: 'noodle',
  showMesh: true,
  showSkeleton: true,
  selected: null, // joint index or null
}

const listeners = new Set()

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
    listeners.forEach((l) => l())
  },
  subscribe(l) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

// Continuous playback time in frames (float). Mutated in useFrame, never triggers renders.
export const clock = { frames: 0 }

export function useStore(selector) {
  return useSyncExternalStore(store.subscribe, () => selector(state))
}
