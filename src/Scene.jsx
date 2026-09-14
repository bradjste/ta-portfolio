import { useMemo, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { store, clock, useStore } from './store'
import { FPS, LENGTH, JOINTS, jointRotation, jointStretch } from './anim'
import { paletteAt } from './palette'
import { SEG_H, buildModel, modelInfo } from './models'

const DEG = Math.PI / 180
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The skeleton and its bone display never change; models are skins swapped onto it.
function buildSkeleton() {
  const segments = JOINTS - 1
  const height = segments * SEG_H
  const group = new THREE.Group()

  const bones = []
  for (let i = 0; i < JOINTS; i++) {
    const b = new THREE.Bone()
    b.position.y = i === 0 ? 0 : SEG_H
    if (i > 0) bones[i - 1].add(b)
    bones.push(b)
  }
  group.add(bones[0])
  group.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones) // bone inverses captured here, at rest

  // Bone display drawn through the skin: violet shafts, ink joints.
  const overlay = { depthTest: false, transparent: true }
  const jointGeo = new THREE.SphereGeometry(0.042, 20, 14)
  const boneGeo = new THREE.OctahedronGeometry(1, 0)
  const shaftMat = new THREE.MeshBasicMaterial({ color: '#ffffff', ...overlay, opacity: 0.9 })
  const joints = bones.map((b, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#000000', ...overlay })
    const ball = new THREE.Mesh(jointGeo, mat)
    ball.renderOrder = 10
    ball.userData.jointIndex = i
    b.add(ball)
    let shaft = null
    if (i < JOINTS - 1) {
      shaft = new THREE.Mesh(boneGeo, shaftMat)
      shaft.position.y = SEG_H / 2
      shaft.scale.set(0.04, SEG_H / 2 - 0.045, 0.04)
      shaft.renderOrder = 10
      shaft.userData.jointIndex = i
      b.add(shaft)
    }
    return { ball, mat, shaft, scale: 1, vel: 0 }
  })

  return { group, bones, skeleton, joints, shaftMat, segments, height, pop: { s: 1, v: 0 } }
}

function Rig() {
  const rig = useMemo(buildSkeleton, [])
  const model = useStore((s) => s.model)
  const showMesh = useStore((s) => s.showMesh)
  const showSkeleton = useStore((s) => s.showSkeleton)
  const selected = useStore((s) => s.selected)
  const hue = useStore((s) => s.hue)
  const pal = useMemo(() => paletteAt(hue), [hue])
  const kitRef = useRef(null)
  const latest = useRef({ pal, showMesh })
  latest.current = { pal, showMesh }
  const firstModel = useRef(true)

  // Build the selected model onto the shared skeleton; tear the old one down.
  useEffect(() => {
    const kit = buildModel(model, rig)
    kit.recolor(latest.current.pal)
    kit.setVisible(latest.current.showMesh)
    kitRef.current = kit
    if (!firstModel.current && !prefersReducedMotion) {
      rig.pop.s = 0.55
      rig.pop.v = 0
    }
    firstModel.current = false
    return () => {
      kit.dispose()
      if (kitRef.current === kit) kitRef.current = null
    }
  }, [rig, model])

  useEffect(() => {
    kitRef.current?.recolor(pal)
    rig.shaftMat.color.set(pal.violet)
  }, [rig, pal, model])

  useEffect(() => {
    kitRef.current?.setVisible(showMesh)
    rig.joints.forEach((j) => (j.mat.visible = showSkeleton))
    rig.shaftMat.visible = showSkeleton
  }, [rig, showMesh, showSkeleton, model])

  useEffect(() => {
    rig.joints.forEach((j, i) => j.mat.color.set(i === selected ? pal.orange : pal.ink))
  }, [rig, selected, pal])

  useEffect(() => {
    if (selected !== null) rig.joints[selected].vel += 0.5
  }, [rig, selected])

  const lens = useMemo(() => new Array(JOINTS - 1).fill(SEG_H), [])
  const rotations = useMemo(() => new Array(JOINTS).fill(null).map(() => ({ x: 0, z: 0 })), [])

  useFrame((_, delta) => {
    const s = store.get()
    const sel = s.selected
    const dt = Math.min(delta, 0.05) * 60
    rig.bones.forEach((b, i) => {
      const r = jointRotation(clock.frames, i, s)
      rotations[i].x = r.x
      rotations[i].z = r.z
      b.rotation.set(r.x * DEG, 0, r.z * DEG)
      // Stretch = move the child joint along the bone; skinning or part scaling follows.
      if (i < JOINTS - 1) {
        const len = SEG_H * jointStretch(clock.frames, i, s)
        lens[i] = len
        rig.bones[i + 1].position.y = len
        const shaft = rig.joints[i].shaft
        shaft.position.y = len / 2
        shaft.scale.y = len / 2 - 0.045
      }
      const j = rig.joints[i]
      const target = i === sel ? 2 : 1
      j.vel += (target - j.scale) * 0.2 * dt
      j.vel *= Math.pow(0.8, dt)
      j.scale += j.vel * dt
      j.ball.scale.setScalar(j.scale)
    })
    kitRef.current?.update({ lens, rotations })

    // Springy pop when a new model is swapped in.
    const p = rig.pop
    p.v += (1 - p.s) * 0.18 * dt
    p.v *= Math.pow(0.78, dt)
    p.s += p.v * dt
    rig.group.scale.setScalar(p.s)
  })

  const pick = (e) => {
    const hit = e.intersections.find((h) => h.object.userData.jointIndex !== undefined && h.object.material.visible)
    e.stopPropagation()
    if (!hit) return
    const i = hit.object.userData.jointIndex
    store.set((s) => ({ selected: s.selected === i ? null : i }))
  }

  return (
    <primitive
      object={rig.group}
      onClick={pick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    />
  )
}

// Turntable pad: 96 dots, one per frame of the loop.
function useDialTexture(pal, label) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 1024
    return c
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [canvas])

  useEffect(() => {
    let live = true
    const draw = () => {
      if (!live) return
      drawDial(canvas.getContext('2d'), canvas.width, pal, label)
      tex.needsUpdate = true
    }
    draw()
    document.fonts?.ready.then(draw) // redraw once the web font is in
    return () => (live = false)
  }, [canvas, tex, pal, label])

  return tex
}

function drawDial(g, size, pal, label) {
  const cx = size / 2
  g.clearRect(0, 0, size, size)
  g.fillStyle = pal.ink
  g.beginPath(); g.arc(cx, cx, cx - 4, 0, Math.PI * 2); g.fill()

  g.strokeStyle = pal.paper
  g.lineWidth = 3
  g.beginPath(); g.arc(cx, cx, cx * 0.6, 0, Math.PI * 2); g.stroke()

  for (let f = 0; f < LENGTH; f++) {
    const a = (f / LENGTH) * Math.PI * 2 - Math.PI / 2
    const major = f % 24 === 0
    const r = cx * 0.82
    g.fillStyle = major ? pal.orange : f % 2 ? pal.mint : pal.paper
    g.beginPath()
    g.arc(cx + Math.cos(a) * r, cx + Math.sin(a) * r, major ? 22 : 8, 0, Math.PI * 2)
    g.fill()
  }

  g.fillStyle = pal.paper
  g.font = '800 44px "Bricolage Grotesque", Arial, sans-serif'
  g.textAlign = 'center'
  g.fillText(label, cx, cx + cx * 0.4)
  g.font = '600 28px "Bricolage Grotesque", Arial, sans-serif'
  g.fillStyle = pal.orange
  g.fillText(`${LENGTH} frames at ${FPS} fps`, cx, cx + cx * 0.4 + 42)
}

function Dial({ pal }) {
  const model = useStore((s) => s.model)
  const tex = useDialTexture(pal, `${modelInfo(model).label.toLowerCase()} rig`)
  const pointer = useRef()
  useFrame(() => {
    if (pointer.current) pointer.current.rotation.y = -(clock.frames / LENGTH) * Math.PI * 2
  })
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
        <circleGeometry args={[1.1, 96]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      {/* Violet dot sweeping the frame dots with playback */}
      <group ref={pointer}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, -1.02]}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color={pal.violet} />
        </mesh>
      </group>
    </group>
  )
}

function Framing() {
  const { camera, size } = useThree()
  useEffect(() => {
    const { width: w, height: h } = size
    const wide = w > 700
    camera.setViewOffset(w, h, wide ? -w * 0.16 : 0, wide ? h * 0.02 : -h * 0.07, w, h)
    camera.fov = wide ? 38 : 50
    camera.updateProjectionMatrix()
    return () => camera.clearViewOffset()
  }, [camera, size])
  return null
}

function Playback() {
  useFrame((_, delta) => {
    const s = store.get()
    if (s.playing) {
      clock.frames = (clock.frames + Math.min(delta, 0.1) * FPS * s.speed) % LENGTH
      const whole = Math.floor(clock.frames)
      if (whole !== s.frame) store.set({ frame: whole })
    }
  })
  return null
}

export default function Scene() {
  const hue = useStore((s) => s.hue)
  const pal = useMemo(() => paletteAt(hue), [hue])
  return (
    <>
      <Playback />
      <Framing />
      <ambientLight intensity={1.0} />
      <directionalLight position={[3, 6, 4]} intensity={2.0} />
      <Rig />
      <Dial pal={pal} />
      <ContactShadows position={[0, 0.003, 0]} scale={1.6} blur={2} far={3} opacity={0.5} color={pal.ink} />
      <Grid
        position={[0, -0.002, 0]}
        infiniteGrid
        cellSize={0.25}
        sectionSize={1}
        cellColor={pal.gridCell}
        sectionColor={pal.gridSection}
        cellThickness={0.5}
        sectionThickness={1}
        fadeDistance={15}
        fadeStrength={1.6}
      />
      <OrbitControls target={[0, 1.5, 0]} enablePan={false} minDistance={3} maxDistance={10} maxPolarAngle={Math.PI * 0.49} />
    </>
  )
}
