// One source of truth for color. The Hue slider rotates every entry in HSL space
// (hue-rotate() filters shift lightness and turn violet to mud; this keeps colors clean).
export const BASE = {
  base: '#ECE8F5',
  paper: '#FBFAFF',
  ink: '#1E1530',
  ink2: '#3E3552',
  ink3: '#6F6585',
  soft: '#B3A9C9',
  grey: '#625A74',
  line: '#C9C2DA',
  orange: '#FF8C1F',
  violet: '#C04BFF',
  violetLight: '#D98BFF',
  mint: '#2EE59D',
  gridCell: '#D4CDE6',
  gridSection: '#BBB1D6',
}

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export function rotate(hex, deg) {
  if (!deg) return hex
  const [h, s, l] = hexToHsl(hex)
  return hslToHex((((h + deg) % 360) + 360) % 360, s, l)
}

export function paletteAt(deg) {
  return Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, rotate(v, deg)]))
}

const cssName = (k) => '--' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

export function applyCssPalette(p) {
  const root = document.documentElement.style
  for (const [k, v] of Object.entries(p)) root.setProperty(cssName(k), v)
}
