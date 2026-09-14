// Everything a visitor reads lives here. Edit freely; the layout adapts.

export const person = {
  name: 'Brad Stevenson',
  role: 'Technical artist',
  pitch: 'Engineer with an art degree, looking to build the tools artists and developers reach for every day.',
  email: 'bradjste@gmail.com',
  location: 'San Diego, CA', 
  links: [
    { label: 'GitHub', href: 'https://github.com/bradjste' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/bradjste' },
    { label: 'Résumé (PDF)', href: '/Brad_Stevenson_Resume.pdf', target: '_blank' },
    { label: 'Itch.io', href: 'https://bradjste.itch.io/' },
  ],
}

export const about = [
  'I spent five years as a full-stack developer at nvisia, shipping Angular and Spring Boot applications. Before that I earned a BA in Interdisciplinary Computing and the Arts from UC San Diego’s music department, after a year studying nanoengineering.',
  'The work I enjoy most sits where engineering meets art: GPU pipelines, procedural systems, physics-driven motion, and interfaces that make a complicated system feel direct.',
  'Outside of that I enjoy playing and making games, music, generative/algorithmic art, and tinkering with electronics.',
]

export const work = [
  {
    title: 'Skimboard',
    kind: 'Library',
    summary: 'WebGPU-native audio synthesis for JavaScript. Synthesis runs in WGSL compute shaders.',
  },
  {
    title: 'Marble roller',
    kind: 'Unity prototype',
    summary: 'Physics-based locomotion with a torque-driven Rigidbody controller and camera-relative input through Unity’s Input System.',
  },
  {
    title: 'Rendering studies',
    kind: 'Graphics',
    summary: 'Signed distance fields and ray marching, plus rasterizer internals: depth buffering, early-Z, and hierarchical Z.',
  },
]
