import { useEffect, useRef, useState, useId } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import { store, clock, useStore } from './store'
import { LENGTH, KEYS, FPS, CONTROLS, DEFAULTS, TANGENT_MODES, jointRotation, jointStretch, jointName, sampleRoot, wobbleAt } from './anim'
import { person, about, fit, work } from './content'
import { paletteAt, applyCssPalette, rotate, BASE } from './palette'
import { MODELS, modelInfo } from './models'

// Hue track previews what the violet accent turns into across the range.
const HUE_TRACK = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((d) => rotate(BASE.violet, d)).join(', ')})`

const JOINT_TIP = 8 // last joint has no child, so no stretch

// The headline rides the same curve as the rig: each letter is a "joint" a little behind the last.
function WavyName({ text }) {
  const refs = useRef([])
  useEffect(() => {
    let raf
    const tick = () => {
      const s = store.get()
      refs.current.forEach((el, k) => {
        if (!el) return
        // Letters borrow the rig's controls: overlap, swing, tangents, wobble, curl, squash.
        const d = { ...s, overlap: s.overlap * 0.9 }
        const v =
          sampleRoot(clock.frames - k * d.overlap, s.tangents) * s.swing +
          s.curl * 0.12 +
          wobbleAt(clock.frames, k) * s.wobble * 18
        const sy = jointStretch(clock.frames, k, d)
        el.style.transform = `translateY(${(-v * 0.3).toFixed(2)}px) skewX(${(v * -0.25).toFixed(2)}deg) scaleY(${sy.toFixed(3)})`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  let k = -1
  return (
    <h1 className="big-name" aria-label={text}>
      {text.split(' ').map((word, w) => (
        <span key={w} className="word" aria-hidden="true">
          {[...word].map((ch) => {
            k += 1
            const idx = k
            return (
              <span key={idx} ref={(el) => (refs.current[idx] = el)} className="letter">
                {ch}
              </span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}

function FrameCode() {
  const frame = useStore((s) => s.frame)
  const model = useStore((s) => s.model)
  return (
    <p className="code" aria-hidden="true">
      {modelInfo(model).label.toLowerCase()} rig<br />frame {String(frame).padStart(3, '0')}
    </p>
  )
}

function Viewport() {
  return (
    <section className="viewport" aria-label="Interactive rig demo">
      <div className="block-stripe" aria-hidden="true" />
      <WavyName text={person.name} />
      <Canvas
        className="canvas"
        dpr={[1, 2]}
        flat
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [3.8, 2.6, 5], fov: 38 }}
        onPointerMissed={() => store.set({ selected: null })}
      >
        <Scene />
      </Canvas>
      <div className="hud">
        <div className="hud-top">
          <p className="tag">{person.role}</p>
          <FrameCode />
        </div>
        <p className="hud-pitch">{person.pitch}</p>
      </div>
      <p className="hud-hint">Drag to spin it. Tap a joint to poke it.</p>
    </section>
  )
}

function Timeline() {
  const frame = useStore((s) => s.frame)
  const playing = useStore((s) => s.playing)

  const scrub = (f) => {
    clock.frames = f
    store.set({ frame: f, playing: false })
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      if (e.target.closest('input, textarea, button, a, [role="tab"]')) return
      e.preventDefault()
      store.set((s) => ({ playing: !s.playing }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const keyFrames = [...KEYS.map((k) => k.f), LENGTH]

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="hazard" aria-hidden="true" />
      <button className="play" onClick={() => store.set((s) => ({ playing: !s.playing }))} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" /></svg>
        )}
      </button>
      <div className="track">
        {/* Barcode: one bar per frame, keyed frames tall, played frames lit */}
        <div className="barcode" aria-hidden="true">
          {Array.from({ length: LENGTH + 1 }, (_, f) => {
            const isKey = keyFrames.includes(f)
            const cls = [isKey ? 'key' : f % 12 === 0 ? 'major' : '', f <= frame ? 'lit' : '', f === frame ? 'now' : '']
              .filter(Boolean)
              .join(' ')
            return <i key={f} className={cls} style={{ left: `${(f / LENGTH) * 100}%` }} />
          })}
        </div>
        <input
          type="range"
          min={0}
          max={LENGTH - 1}
          step={1}
          value={frame}
          onChange={(e) => scrub(Number(e.target.value))}
          aria-label="Current frame"
        />
      </div>
      <output className="frame-readout">
        <span>{String(frame).padStart(3, '0')}</span>
        <small>{FPS} fps</small>
      </output>
    </section>
  )
}

function Slider({ name, value, onChange, format, marks, trackBg }) {
  const c = CONTROLS[name]
  const id = useId()
  const p = ((value - c.min) / (c.max - c.min)) * 100
  const lo = c.bipolar ? Math.min(p, 50) : 0
  const hi = c.bipolar ? Math.max(p, 50) : p
  return (
    <div className={`attr ${marks ? 'has-marks' : ''}`}>
      <label htmlFor={id}>{c.label}</label>
      <div className="range-wrap">
        <input
          id={id}
          type="range"
          min={c.min}
          max={c.max}
          step={c.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onDoubleClick={() => onChange(c.default)}
          style={{ '--lo': `${lo}%`, '--hi': `${hi}%`, ...(trackBg ? { '--track': trackBg } : {}) }}
          aria-valuetext={format(value)}
        />
        {marks && (
          <div className="marks" aria-hidden="true">
            {marks.map((m, i) => (
              <span key={m} className={i === value ? 'on' : ''}>{m}</span>
            ))}
          </div>
        )}
      </div>
      <span className="attr-value">{format(value)}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  const id = useId()
  return (
    <div className="attr toggle">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

// Mini graph editor: the root control's curve with the current tangent mode, keys, and playhead.
function CurveGraph({ tangents, swing, frame }) {
  const W = 300, H = 64, PAD = 6
  const x = (f) => PAD + (f / LENGTH) * (W - PAD * 2)
  const y = (v) => H / 2 - (v / 80) * (H / 2 - PAD)
  let d = ''
  for (let f = 0; f <= LENGTH; f += 0.5) {
    const v = sampleRoot(f === LENGTH ? LENGTH - 0.001 : f, tangents) * swing
    d += `${f === 0 ? 'M' : 'L'}${x(f).toFixed(1)},${y(v).toFixed(1)}`
  }
  const now = sampleRoot(frame, tangents) * swing
  return (
    <svg className="graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Root curve, ${TANGENT_MODES[tangents]} tangents`}>
      <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} className="graph-zero" />
      <path d={d} className="graph-curve" />
      {[...KEYS, { f: LENGTH, v: 0 }].map((k) => (
        <rect key={k.f} x={x(k.f) - 4} y={y(k.v * swing) - 4} width="8" height="8" className="graph-key" transform={`rotate(45 ${x(k.f)} ${y(k.v * swing)})`} />
      ))}
      <line x1={x(frame)} x2={x(frame)} y1={2} y2={H - 2} className="graph-head" />
      <circle cx={x(frame)} cy={y(now)} r="4.5" className="graph-dot" />
    </svg>
  )
}

// Tiny silhouettes for the model picker.
const MODEL_ICONS = {
  tail: <path d="M8 21c0-6 1-10 4-14 1-1.5 2.5-3 4-4" strokeWidth="3.2" />,
  noodle: (
    <>
      <path d="M12 21V6" strokeWidth="5" />
      <circle cx="10.6" cy="6.5" r="0.9" className="fill" />
      <circle cx="13.4" cy="6.5" r="0.9" className="fill" />
    </>
  ),
  blocks: (
    <>
      <rect x="6.5" y="15" width="11" height="6" rx="1.5" />
      <rect x="7.5" y="9" width="9" height="5" rx="1.5" />
      <rect x="8.5" y="3.5" width="7" height="4.5" rx="1.5" />
    </>
  ),
  fern: (
    <>
      <path d="M12 22V3" />
      <path d="M12 17c-3 0-5-2-6-4M12 13c3 0 5-2 6-4M12 9c-2 0-3.5-1.5-4-3" />
    </>
  ),
  chain: (
    <>
      <rect x="9" y="2.5" width="6" height="8" rx="3" />
      <rect x="9" y="13.5" width="6" height="8" rx="3" />
      <path d="M12 8.5v7" strokeWidth="3" />
    </>
  ),
}

function ModelPicker({ value }) {
  const onKeyDown = (e) => {
    const i = MODELS.findIndex((m) => m.id === value)
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = MODELS[(i + dir + MODELS.length) % MODELS.length]
    store.set({ model: next.id, selected: null })
    document.getElementById(`model-${next.id}`)?.focus()
  }
  return (
    <fieldset className="group">
      <legend>Model</legend>
      <div className="models" role="radiogroup" aria-label="Model" onKeyDown={onKeyDown}>
        {MODELS.map((m) => (
          <button
            key={m.id}
            id={`model-${m.id}`}
            role="radio"
            aria-checked={value === m.id}
            tabIndex={value === m.id ? 0 : -1}
            className="model"
            onClick={() => store.set({ model: m.id, selected: null })}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{MODEL_ICONS[m.id]}</svg>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

const pick = (c) => {
  const steps = Math.round((c.max - c.min) / c.step)
  return +(c.min + Math.floor(Math.random() * (steps + 1)) * c.step).toFixed(3)
}

function randomize() {
  const next = {}
  for (const k of ['overlap', 'swing', 'speed', 'wobble', 'curl', 'squash', 'tangents']) next[k] = pick(CONTROLS[k])
  // Keep the results lively rather than frozen or unreadable.
  next.swing = Math.max(next.swing, 0.5)
  next.speed = Math.max(next.speed, 0.6)
  next.curl = Math.max(-90, Math.min(90, next.curl))
  store.set(next)
}

function HueFilter() {
  const hue = useStore((s) => s.hue)
  useEffect(() => {
    applyCssPalette(paletteAt(hue))
  }, [hue])
  return null
}

const set = (key) => (v) => store.set({ [key]: v })
const signed = (v) => `${v > 0 ? '+' : ''}${v}°`
const pct = (v) => `${Math.round(v * 100)}%`

function Attributes() {
  const s = useStore((st) => st) // one subscription; this panel is small
  const info = modelInfo(s.model)
  const rot = s.selected === null ? null : jointRotation(s.frame, s.selected, s)
  const stretch = s.selected === null || s.selected === JOINT_TIP ? 1 : jointStretch(s.frame, s.selected, s)

  return (
    <section className="attributes block" aria-labelledby="rig-title">
      <HueFilter />
      <header className="bar">
        <h2 id="rig-title">{info.prefix}_rig</h2>
        <span>{info.binding}</span>
      </header>
      <div className="block-body">
        <p className="note">
          The root is keyed on four frames. Each joint further down plays the same curve a few frames later, and that delay is the
          whole motion. Every model is bound to the same nine joints, and so are the letters in my name. Double-click any slider
          to reset it.
        </p>

        <ModelPicker value={s.model} />

        <fieldset className="group">
          <legend>Motion</legend>
          <Slider name="overlap" value={s.overlap} onChange={set('overlap')} format={(v) => `${v} fr`} />
          <Slider name="swing" value={s.swing} onChange={set('swing')} format={pct} />
          <Slider name="speed" value={s.speed} onChange={set('speed')} format={(v) => `${v.toFixed(2)}×`} />
          <Slider name="wobble" value={s.wobble} onChange={set('wobble')} format={pct} />
        </fieldset>

        <fieldset className="group">
          <legend>Pose</legend>
          <Slider name="curl" value={s.curl} onChange={set('curl')} format={signed} />
          <Slider name="squash" value={s.squash} onChange={set('squash')} format={pct} />
        </fieldset>

        <fieldset className="group">
          <legend>Keys</legend>
          <Slider name="tangents" value={s.tangents} onChange={set('tangents')} format={(v) => TANGENT_MODES[v]} marks={TANGENT_MODES} />
          <CurveGraph tangents={s.tangents} swing={s.swing} frame={s.frame} />
        </fieldset>

        <fieldset className="group">
          <legend>Look</legend>
          <Slider name="hue" value={s.hue} onChange={set('hue')} format={(v) => `${v}°`} trackBg={HUE_TRACK} />
          <div className="toggles">
            <Toggle label="Mesh" checked={s.showMesh} onChange={set('showMesh')} />
            <Toggle label="Skeleton" checked={s.showSkeleton} onChange={set('showSkeleton')} />
          </div>
        </fieldset>

        <div className="actions">
          <button className="dice" onClick={randomize}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="2" y="2" width="16" height="16" rx="4" />
              <circle cx="6.5" cy="6.5" r="1.6" /><circle cx="13.5" cy="13.5" r="1.6" /><circle cx="10" cy="10" r="1.6" />
            </svg>
            Randomize
          </button>
          <button className="ghost" onClick={() => store.set({ ...DEFAULTS })}>Reset</button>
        </div>

        <div className={`selection ${rot ? 'active' : ''}`} aria-live="polite">
          {rot ? (
            <>
              <strong>{jointName(s.selected, info.prefix)}</strong>
              <span>rX {rot.x.toFixed(1)}°</span>
              <span>rZ {rot.z.toFixed(1)}°</span>
              <span>length {stretch.toFixed(2)}</span>
            </>
          ) : (
            <span>No joint selected</span>
          )}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <div className="prose">
      {about.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}
      <h3>For this role</h3>
      <dl className="fit">
        {fit.map((f) => (
          <div key={f.need}>
            <dt>{f.need}</dt>
            <dd>{f.have}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const CHIPS = [
  ['var(--orange)', 'var(--ink)'],
  ['var(--mint)', 'var(--ink)'],
  ['var(--violet)', 'var(--ink)'],
  ['var(--ink)', 'var(--mint)'],
]

function Work() {
  return (
    <ul className="work">
      {work.map((w, i) => (
        <li key={w.title} style={{ '--chip': CHIPS[i % CHIPS.length][0], '--chip-ink': CHIPS[i % CHIPS.length][1] }}>
          <a href={w.href}>
            <span className="work-title">{w.title}</span>
            <span className="work-kind">{w.kind}</span>
          </a>
          <p>{w.summary}</p>
        </li>
      ))}
    </ul>
  )
}

function Contact() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const nameId = useId()
  const msgId = useId()

  const draft = () => {
    const subject = encodeURIComponent(name ? `Hello from ${name}` : 'Hello')
    const body = encodeURIComponent(message)
    window.location.href = `mailto:${person.email}?subject=${subject}&body=${body}`
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="contact">
      <div className="email-row">
        <a href={`mailto:${person.email}`}>{person.email}</a>
        <button className="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy email'}</button>
      </div>
      <p className="muted">{person.location}</p>
      <label htmlFor={nameId}>Your name</label>
      <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <label htmlFor={msgId}>Message</label>
      <textarea id={msgId} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
      <button className="primary" onClick={draft}>Open email draft</button>
      <ul className="links">
        {person.links.map((l) => (
          <li key={l.label}><a href={l.href}>{l.label}</a></li>
        ))}
      </ul>
    </div>
  )
}

const TABS = [
  { id: 'about', label: 'About', Panel: About },
  { id: 'work', label: 'Work', Panel: Work },
  { id: 'contact', label: 'Contact', Panel: Contact },
]

function Inspector() {
  const [tab, setTab] = useState('about')
  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === tab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
      setTab(next.id)
      document.getElementById(`tab-${next.id}`)?.focus()
    }
  }
  const Active = TABS.find((t) => t.id === tab).Panel

  return (
    <aside className="inspector">
      <Attributes />
      <div className="tabs" role="tablist" aria-label="Portfolio" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="tabpanel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="panel block">
        <div className="block-body">
          <Active />
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <div className="app">
      <Viewport />
      <Timeline />
      <Inspector />
    </div>
  )
}
