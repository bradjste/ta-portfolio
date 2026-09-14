# Technical artist portfolio (React Three Fiber)

One scene: a nine-joint rig on a dotted frame dial, with five swappable models bound to it with a keyed root control and per-joint overlap,
scrubbable on a timeline, with an inspector panel holding About / Work / Contact.

## Run
    npm install
    npm run dev          # local dev server
    npm run build        # static site in dist/ (deploy to Netlify, Vercel, GitHub Pages)
    npm run build:single # everything inlined into dist-single/index.html

## Edit
- `src/content.js` — name, email, links, about text, work entries (TODOs marked)
- `src/anim.js` — keyframes, loop length, joint count, and every slider's range/default (`CONTROLS`)
- `src/palette.js` — base colors; the Hue slider rotates them in HSL for both CSS and the 3D scene
- `src/models.js` — the five selectable models (tail, noodle, blocks, fern, chain); add a builder to add a model
- `src/Scene.jsx` — shared skeleton, bone display, model swapping, lighting, grid, camera framing
- `src/styles.css` — layout and component styles (typeface is Bricolage Grotesque)
- The headline letters ride the same animation curve as the rig (`WavyName` in `App.jsx`)

The contact panel opens a prefilled email draft (no backend needed).
Swap `draft()` in `App.jsx` for Formspree or similar if you want a real form post.
