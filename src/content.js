// Everything a visitor reads lives here. Edit freely; the layout adapts.

export const person = {
  name: 'Brad Stevenson',
  role: 'Technical artist',
  pitch: 'Engineer with an art degree, looking to build the tools animators and cinematics artists reach for every day.',
  email: 'bradjste@gmail.com',
  location: 'San Diego, CA', 
  links: [
    { label: 'GitHub', href: 'https://github.com/bradjste' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/bradjste' },
    { label: 'Résumé (PDF)', href: '/Brad_Stevenson_Resume.pdf' },
  ],
}

export const about = [
  'I spent five years as a full-stack developer at nvisia, shipping Angular and Spring Boot applications. Before that I earned a BA in Interdisciplinary Computing and the Arts from UC San Diego’s music department, after a year studying nanoengineering.',
  'The work I enjoy most sits where engineering meets art: GPU pipelines, procedural systems, physics-driven motion, and interfaces that make a complicated system feel direct. A tools role is where those threads meet the people who use them.',
  'Outside of that I do research-level mathematics in number theory and combinatorics, and I’m a contributor to the OEIS.',
]

// Things from the posting you can speak to. Keep this honest; add Maya/Python/UE5 items as you build them.
export const fit = [
  { need: 'Tool UI (UMG, Qt)', have: 'Five years of component-based UI in Angular: data binding, reusable components, and views driven by application state.' },
  { need: 'Code libraries other TAs build on', have: 'Skimboard, an npm library designed for other developers to build on.' },
  { need: 'Rigging and animation pipelines', have: 'This page: a skinned joint chain with a keyed root and per-joint overlap offsets, scrubbed on a timeline.' },
  { need: 'Houdini and PCG (a plus)', have: 'Long-running work on procedural and cellular-automaton systems driven by local rules.' },
]

export const work = [
  {
    title: 'Skimboard',
    kind: 'Library',
    summary: 'WebGPU-native audio synthesis for JavaScript. Synthesis runs in WGSL compute shaders; dual AGPL and commercial licensing.',
    href: '#', // TODO
  },
  {
    title: 'Marble roller',
    kind: 'Unity prototype',
    summary: 'Physics-based locomotion with a torque-driven Rigidbody controller and camera-relative input through Unity’s Input System.',
    href: '#',
  },
  {
    title: 'Programmable blocks',
    kind: 'Simulation',
    summary: 'A self-organizing cellular automaton with swap-based local rules, double-buffered synchronous updates, and traveling signal layers.',
    href: '#',
  },
  {
    title: 'Rendering studies',
    kind: 'Graphics',
    summary: 'Signed distance fields and ray marching, plus rasterizer internals: depth buffering, early-Z, and hierarchical Z.',
    href: '#',
  },
  // Example of the piece that would carry the most weight for this posting:
  // {
  //   title: 'Maya to Unreal batch exporter',
  //   kind: 'Python and Qt tool',
  //   summary: 'PySide panel that validates rigs, exports FBX in batch, and imports into UE5 with retarget settings applied.',
  //   href: '#',
  // },
]
