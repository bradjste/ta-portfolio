export const FPS = 24
export const LENGTH = 96 // loop length in frames
export const JOINTS = 9 // bones in the chain (8 segments + tip)

// Root control keys (rotate Z, degrees). The loop wraps, so frame 96 == frame 0.
export const KEYS = [
  { f: 0, v: 0 },
  { f: 24, v: 40 },
  { f: 48, v: 0 },
  { f: 72, v: -40 },
]

export const TANGENT_MODES = ['stepped', 'linear', 'auto']

// Every slider's range and default lives here, so the UI, reset, and randomize agree.
export const CONTROLS = {
  overlap: { label: 'Overlap', min: 0, max: 8, step: 0.5, default: 3, group: 'Motion' },
  swing: { label: 'Swing', min: 0, max: 2, step: 0.05, default: 1, group: 'Motion' },
  speed: { label: 'Speed', min: 0.25, max: 2, step: 0.05, default: 1, group: 'Motion' },
  wobble: { label: 'Wobble', min: 0, max: 1, step: 0.05, default: 0, group: 'Motion' },
  curl: { label: 'Curl', min: -120, max: 120, step: 5, default: 0, group: 'Pose', bipolar: true },
  squash: { label: 'Squash', min: 0, max: 1, step: 0.05, default: 0, group: 'Pose' },
  tangents: { label: 'Tangents', min: 0, max: 2, step: 1, default: 2, group: 'Keys' },
  hue: { label: 'Hue', min: 0, max: 360, step: 5, default: 0, group: 'Look' },
}

export const DEFAULTS = Object.fromEntries(Object.entries(CONTROLS).map(([k, c]) => [k, c.default]))

function key(i) {
  const n = KEYS.length
  const wrap = Math.floor(i / n)
  const k = KEYS[((i % n) + n) % n]
  return { f: k.f + wrap * LENGTH, v: k.v }
}

// Root curve with switchable key interpolation, like a graph editor's tangent types.
export function sampleRoot(frame, tangents = 2) {
  const f = ((frame % LENGTH) + LENGTH) % LENGTH
  let i = 0
  for (let j = 0; j < KEYS.length; j++) if (KEYS[j].f <= f) i = j
  const p0 = key(i - 1), p1 = key(i), p2 = key(i + 1), p3 = key(i + 2)
  const dt = p2.f - p1.f
  const t = (f - p1.f) / dt
  if (tangents === 0) return p1.v
  if (tangents === 1) return p1.v + (p2.v - p1.v) * t
  const m1 = ((p2.v - p0.v) / (p2.f - p0.f)) * dt
  const m2 = ((p3.v - p1.v) / (p3.f - p1.f)) * dt
  const t2 = t * t, t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * p1.v + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2.v + (t3 - t2) * m2
}

// Loop-safe wobble: sines with whole-number cycles per loop, so frame 96 still meets frame 0.
export function wobbleAt(frame, seed) {
  const a = (frame / LENGTH) * Math.PI * 2
  return 0.55 * Math.sin(5 * a + seed * 1.7) + 0.3 * Math.sin(11 * a + seed * 2.9) + 0.15 * Math.sin(17 * a + seed * 4.3)
}

export function jointRotation(frame, i, s) {
  const share = 0.17 + 0.1 * (i / (JOINTS - 1))
  const delayed = frame - i * s.overlap
  const curlPerJoint = (s.curl / (JOINTS - 1)) * (0.6 + 0.8 * (i / (JOINTS - 1)))
  const wob = s.wobble * 14 * (i / (JOINTS - 1))
  const z = sampleRoot(delayed, s.tangents) * s.swing * share + curlPerJoint + wobbleAt(frame, i) * wob
  const x = sampleRoot(2 * frame - i * s.overlap * 2 + 24, s.tangents) * s.swing * 0.06 + wobbleAt(frame, i + 20) * wob * 0.6
  return { x, z }
}

// Squash and stretch: long while the curve is moving fast, short at the extremes where it turns around.
export function jointStretch(frame, i, s) {
  if (!s.squash) return 1
  const f = frame - i * s.overlap
  const speed = Math.abs(sampleRoot(f + 0.5, 2) - sampleRoot(f - 0.5, 2)) / 2.2 // ~0..1 on the auto curve
  return 1 + s.squash * 0.3 * (Math.min(speed, 1) * 2 - 1)
}

export const jointName = (i, prefix = 'noodle') => `${prefix}_jnt_${String(i + 1).padStart(2, '0')}`
