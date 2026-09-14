import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// Every model binds to the same 9-joint chain, so the animation carries over untouched.
// "smooth" models are skinned meshes (vertices blended between two joints);
// "rigid" models are separate parts parented to one joint each.

export const SEG_H = 0.42

export const MODELS = [
  { id: 'noodle', label: 'Noodle', prefix: 'noodle', binding: 'smooth skin' },
  { id: 'tail', label: 'Tail', prefix: 'tail', binding: 'smooth skin' },
  { id: 'blocks', label: 'Blocks', prefix: 'block', binding: 'rigid parts' },
  { id: 'fern', label: 'Fern', prefix: 'fern', binding: 'smooth + rigid' },
  { id: 'chain', label: 'Chain', prefix: 'link', binding: 'rigid parts' },
]

export const modelInfo = (id) => MODELS.find((m) => m.id === id) ?? MODELS[0]

// Soft three-step ramp for cel shading.
export const ramp = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([168, 222, 255]), 3, 1, THREE.RedFormat)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
})()

const toon = (extra = {}) => new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: ramp, ...extra })

// Inverted-hull outline: back faces pushed out along normals, drawn in ink. Works with skinning,
// and keeps every part readable against the background circle whatever its color.
function outlineMaterial(thickness = 0.018) {
  const mat = new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.BackSide })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n  transformed += normal * ${thickness.toFixed(4)};`,
    )
  }
  mat.customProgramCacheKey = () => `outline-${thickness}`
  return mat
}

// ---------- shared kit plumbing ----------

function makeKit() {
  const mats = {} // palette key -> material (rigid parts)
  const vertexSets = [] // { attr, keys } for vertex-colored skins
  const owned = [] // { obj, parent }
  const disposables = []
  const kit = {
    mat(key, extra) {
      if (!mats[key]) {
        mats[key] = toon(extra)
        disposables.push(mats[key])
      }
      return mats[key]
    },
    attach(obj, parent) {
      parent.add(obj)
      owned.push({ obj, parent })
      obj.traverse((o) => o.geometry && disposables.push(o.geometry))
      return obj
    },
    vertexColors(geo, keys) {
      geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(keys.length * 3), 3))
      vertexSets.push({ attr: geo.attributes.color, keys })
    },
    allMaterials: [],
    outlineMat: null,
    // Adds an ink hull. Rigid parts get it as a child; skinned meshes get a twin bound to the same skeleton.
    outline(mesh, ctx) {
      kit.outlineMat ??= outlineMaterial()
      if (!kit.allMaterials.includes(kit.outlineMat)) kit.allMaterials.push(kit.outlineMat)
      if (mesh.isSkinnedMesh) {
        const twin = new THREE.SkinnedMesh(mesh.geometry, kit.outlineMat)
        twin.bind(ctx.skeleton, new THREE.Matrix4())
        twin.frustumCulled = false
        kit.attach(twin, ctx.group)
      } else {
        mesh.add(new THREE.Mesh(mesh.geometry, kit.outlineMat))
      }
      return mesh
    },
    recolor(pal) {
      for (const [k, m] of Object.entries(mats)) m.color.set(pal[k])
      kit.outlineMat?.color.set(pal.ink)
      const cache = {}
      for (const { attr, keys } of vertexSets) {
        keys.forEach((k, n) => {
          const c = (cache[k] ??= new THREE.Color(pal[k]))
          attr.setXYZ(n, c.r, c.g, c.b)
        })
        attr.needsUpdate = true
      }
    },
    setVisible(v) {
      Object.values(mats).forEach((m) => (m.visible = v))
      kit.allMaterials.forEach((m) => (m.visible = v))
    },
    update() {},
    dispose() {
      owned.forEach(({ obj, parent }) => parent.remove(obj))
      new Set([...disposables, ...kit.allMaterials]).forEach((d) => d.dispose())
    },
  }
  return kit
}

// Linear two-joint weights from height: the classic way to skin a chain.
function skinByHeight(geo, segments) {
  const pos = geo.attributes.position
  const skinIndex = []
  const skinWeight = []
  for (let k = 0; k < pos.count; k++) {
    const y = pos.getY(k)
    const idx = THREE.MathUtils.clamp(Math.floor(y / SEG_H), 0, segments - 1)
    const w = THREE.MathUtils.clamp((y - idx * SEG_H) / SEG_H, 0, 1)
    skinIndex.push(idx, idx + 1, 0, 0)
    skinWeight.push(1 - w, w, 0, 0)
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
}

function smoothSkin(kit, ctx, geo, keyAt) {
  skinByHeight(geo, ctx.segments)
  const pos = geo.attributes.position
  const keys = []
  for (let k = 0; k < pos.count; k++) keys.push(keyAt(pos.getY(k) / ctx.height, pos.getX(k), pos.getZ(k)))
  kit.vertexColors(geo, keys)
  const mat = toon({ vertexColors: true })
  kit.allMaterials.push(mat)
  const mesh = new THREE.SkinnedMesh(geo, mat)
  // Skeleton inverses were captured at rest, so bind with an identity bind matrix.
  mesh.bind(ctx.skeleton, new THREE.Matrix4())
  mesh.frustumCulled = false
  kit.attach(mesh, ctx.group)
  kit.outline(mesh, ctx)
  return mesh
}

const bands = (list) => (t) => {
  let key = list[0][1]
  for (const [start, k] of list) if (t >= start) key = k
  return key
}

// ---------- models ----------

function tail(ctx) {
  const kit = makeKit()
  const geo = new THREE.CylinderGeometry(0.12, 0.32, ctx.height, 40, ctx.segments * 16, false)
  geo.translate(0, ctx.height / 2, 0)
  smoothSkin(
    kit,
    ctx,
    geo,
    bands([
      [0, 'ink'], [0.075, 'orange'], [0.1, 'paper'], [0.3, 'mint'], [0.33, 'paper'],
      [0.5, 'violet'], [0.58, 'paper'], [0.7, 'orange'], [0.73, 'paper'], [0.84, 'mint'],
    ]),
  )
  return kit
}

function noodle(ctx) {
  const kit = makeKit()
  const r = 0.17
  const geo = new THREE.CapsuleGeometry(r, ctx.height - r * 2, 12, 32, ctx.segments * 16)
  geo.translate(0, ctx.height / 2, 0)
  const rings = bands([
    [0, 'ink'], [0.05, 'mint'], [0.22, 'orange'], [0.25, 'mint'], [0.42, 'orange'],
    [0.45, 'mint'], [0.62, 'orange'], [0.65, 'mint'],
  ])
  smoothSkin(kit, ctx, geo, rings)

  // Face rides rigidly on the last segment, turned toward the default camera.
  const face = new THREE.Group()
  face.position.y = SEG_H * 0.45
  face.rotation.y = 0.62
  const white = new THREE.SphereGeometry(0.062, 20, 14)
  const pupil = new THREE.SphereGeometry(0.03, 16, 10)
  for (const side of [-1, 1]) {
    const eye = kit.outline(new THREE.Mesh(white, kit.mat('paper')))
    eye.position.set(side * 0.078, 0.06, 0.14)
    const dot = new THREE.Mesh(pupil, kit.mat('ink'))
    dot.position.set(side * 0.074, 0.058, 0.195)
    face.add(eye, dot)
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20, Math.PI), kit.mat('ink'))
  smile.rotation.z = Math.PI
  smile.position.set(0, -0.04, 0.165)
  face.add(smile)
  kit.attach(face, ctx.bones[ctx.segments - 1])
  return kit
}

function blocks(ctx) {
  const kit = makeKit()
  const cycle = ['orange', 'violet', 'mint', 'paper']
  const parts = []
  for (let i = 0; i < ctx.segments; i++) {
    const w = 0.62 - i * 0.045
    const box = new THREE.Mesh(new RoundedBoxGeometry(w, SEG_H * 0.88, w, 3, 0.07), kit.mat(cycle[i % cycle.length]))
    box.position.y = SEG_H / 2
    box.rotation.y = (i % 2 ? 1 : -1) * 0.14
    box.userData.jointIndex = i
    kit.outline(box)
    parts.push(box)
    kit.attach(box, ctx.bones[i])
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), kit.mat('orange'))
  ball.position.y = 0.16
  ball.userData.jointIndex = ctx.segments
  kit.outline(ball)
  kit.attach(ball, ctx.bones[ctx.segments])

  kit.update = ({ lens }) => {
    parts.forEach((p, i) => {
      p.position.y = lens[i] / 2
      p.scale.y = lens[i] / SEG_H
    })
  }
  return kit
}

function leafGeometry(len) {
  const w = len * 0.34
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(w, len * 0.45, 0, len)
  s.quadraticCurveTo(-w, len * 0.45, 0, 0)
  return new THREE.ShapeGeometry(s, 10)
}

function fern(ctx) {
  const kit = makeKit()
  const stem = new THREE.CylinderGeometry(0.03, 0.07, ctx.height, 12, ctx.segments * 8, false)
  stem.translate(0, ctx.height / 2, 0)
  smoothSkin(kit, ctx, stem, bands([[0, 'ink'], [0.06, 'violet']]))

  // Leaf pairs at each joint, spun by the golden angle so they spiral like a real plant.
  const GOLDEN = 137.5 * (Math.PI / 180)
  const pivots = []
  for (let i = 1; i <= ctx.segments; i++) {
    const len = 0.95 - i * 0.07
    const geo = leafGeometry(len)
    const whorl = new THREE.Group()
    whorl.rotation.y = i * GOLDEN
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.userData.base = side * (0.95 + i * 0.03)
      pivot.rotation.z = -pivot.userData.base
      const leaf = new THREE.Mesh(geo, kit.mat(i % 3 === 0 ? 'orange' : 'mint', { side: THREE.DoubleSide }))
      leaf.rotation.x = 0.25
      leaf.userData.jointIndex = Math.min(i, ctx.segments)
      pivot.add(leaf)
      whorl.add(pivot)
      pivots.push({ pivot, joint: i })
    }
    kit.attach(whorl, ctx.bones[i])
  }
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), kit.mat('orange'))
  bud.position.y = 0.08
  bud.userData.jointIndex = ctx.segments
  kit.outline(bud)
  kit.attach(bud, ctx.bones[ctx.segments])

  // Leaves lag behind their joint's rotation: a little secondary motion on top of the rig.
  kit.update = ({ rotations }) => {
    for (const { pivot, joint } of pivots) {
      const rz = (rotations[Math.min(joint, rotations.length - 1)]?.z ?? 0) * (Math.PI / 180)
      pivot.rotation.z = -pivot.userData.base - rz * 0.9
    }
  }
  return kit
}

function chain(ctx) {
  const kit = makeKit()
  const cycle = ['orange', 'violet', 'mint']
  const parts = []
  for (let i = 0; i < ctx.segments; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 14, 36), kit.mat(cycle[i % cycle.length]))
    const taper = 1 - i * 0.05
    link.userData.sy = 1.3
    link.scale.set(taper, link.userData.sy, taper)
    link.position.y = SEG_H / 2
    link.rotation.y = i % 2 ? Math.PI / 2 : 0
    link.userData.jointIndex = i
    kit.outline(link)
    parts.push(link)
    kit.attach(link, ctx.bones[i])
  }
  kit.update = ({ lens }) => {
    parts.forEach((p, i) => {
      p.position.y = lens[i] / 2
      p.scale.y = p.userData.sy * (lens[i] / SEG_H)
    })
  }
  return kit
}

const BUILDERS = { tail, noodle, blocks, fern, chain }

export function buildModel(id, ctx) {
  return (BUILDERS[id] ?? tail)(ctx)
}
