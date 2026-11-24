"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { bus } from "../bus";
import { buildAcc, type Acc } from "./accessories";
import { Face, loadFace, type Expr } from "./face";
import { CAP, Fx, hex } from "./fx";
import { THEMES } from "./theme";

/* ---------------- shaders ---------------- */

const SHAPE = /* glsl */ `
uniform int uShape;
float shapeMask(vec2 p) {
  if (uShape == 1) { vec2 q = abs(p); return 1.0 - smoothstep(0.34, 0.42, max(q.x, q.y)); }
  if (uShape == 2) { vec2 q = abs(p); return 1.0 - smoothstep(0.4, 0.48, q.x * 0.85 + q.y * 1.15); }
  if (uShape == 3) { vec2 q = p * 2.5; q.y = -q.y + 0.3; float a = q.x * q.x + q.y * q.y - 1.0; return 1.0 - smoothstep(-0.05, 0.05, a * a * a - q.x * q.x * q.y * q.y * q.y); }
  if (uShape == 4) { float a = atan(p.y, p.x); float k = 0.3 + 0.16 * cos(5.0 * a + 1.5708); return 1.0 - smoothstep(k - 0.03, k + 0.03, length(p)); }
  return 1.0 - smoothstep(0.4, 0.5, length(p));
}`;

const faceVert = /* glsl */ `
attribute float aSize; attribute float aTint; attribute float aHeart;
uniform float uDot; uniform vec2 uOffset;
varying float vTint; varying float vHeart;
void main() {
  vTint = aTint; vHeart = aHeart;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.xy += uOffset * gl_Position.w;
  gl_PointSize = aSize * uDot;
}`;
const faceFrag = /* glsl */ `
${SHAPE}
uniform vec3 uInk; uniform vec3 uGlow; uniform vec3 uHeart; uniform float uMis;
varying float vTint; varying float vHeart;
void main() {
  float m = shapeMask(gl_PointCoord - 0.5);
  if (m < 0.03) discard;
  vec3 c = mix(mix(uInk, uGlow, vTint), uHeart, vHeart);
  if (uMis > 0.5) c = uGlow;
  gl_FragColor = vec4(c, m);
}`;
const colorVert = /* glsl */ `
attribute float aSize; attribute vec3 color;
uniform float uDot; uniform float uPx;
varying vec3 vCol;
void main() {
  vCol = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * mix(uDot, uPx, step(0.5, uPx));
}`;
const colorFrag = /* glsl */ `
${SHAPE}
varying vec3 vCol;
void main() {
  float m = shapeMask(gl_PointCoord - 0.5);
  if (m < 0.03) discard;
  gl_FragColor = vec4(vCol, m);
}`;

/* ---------------- helpers ---------------- */

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const say = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const TEAR = hex("#9fe6ff"), DRIP = hex("#c9f59a"), SWEAT = hex("#bfefff"), SPARK = [hex("#ffe14d"), hex("#ffffff"), hex("#ff4fa0")];

const faceMat = (mis: boolean) => new THREE.ShaderMaterial({
  vertexShader: faceVert, fragmentShader: faceFrag, transparent: true, depthWrite: false, depthTest: false,
  uniforms: {
    uDot: { value: 4 }, uOffset: { value: new THREE.Vector2() }, uShape: { value: 0 }, uMis: { value: mis ? 1 : 0 },
    uInk: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uHeart: { value: new THREE.Color("#e8003d") },
  },
});
const colorMat = (dpr: number) => new THREE.ShaderMaterial({
  vertexShader: colorVert, fragmentShader: colorFrag, transparent: true, depthWrite: false, depthTest: false,
  uniforms: { uDot: { value: 4 }, uPx: { value: dpr }, uShape: { value: 0 } },
});

function Dots({ face }: { face: Face }) {
  const { camera, size, gl } = useThree();
  const dpr = gl.getPixelRatio();
  const group = useRef<THREE.Group>(null);
  const fx = useMemo(() => new Fx(), []);

  // face geometry shared by the ink layer and the misprint layer
  const faceGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(face.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(face.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aTint", new THREE.BufferAttribute(face.tint, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aHeart", new THREE.BufferAttribute(face.heartC, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
    return g;
  }, [face]);
  const inkMat = useMemo(() => faceMat(false), []);
  const misMat = useMemo(() => faceMat(true), []);

  const fxGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CAP * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(fx.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(fx.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    return g;
  }, [fx]);
  const fxMat = useMemo(() => colorMat(dpr), [dpr]);
  const accMat = useMemo(() => colorMat(0), []);
  const accGeo = useRef<THREE.BufferGeometry | null>(null);
  const emptyGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const phonesGeo = useMemo(() => {
    const a = buildAcc("phones", face), g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(a.col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(a.size, 1));
    return g;
  }, [face]);
  const accPts = useRef<THREE.Points>(null);
  const phonesPts = useRef<THREE.Points>(null);

  const st = useRef({
    x: 0, y: 0, px: 300, init: false, docked: false, yaw: 0, pitch: 0, roll: 0, kick: 0, kickV: 0,
    blinkAt: 2, blink: 0, mouth: 0, puff: 0, heart: 0, squint: 0, jitter: 0, shiver: 0,
    eat: null as null | { start: number; arrive: number; close: number; sweet: string },
    sneezeNext: 6, sneeze: -10, tearNext: 0, dripNext: 0, rushHeart: 4,
    acc: "" as Acc | "", ink: new THREE.Color(), glow: new THREE.Color(), lastBurn: 0,
    ball: null as null | { start: number; hits: number; spin: number },
    seen: 0, cheer: 0,
  });
  const hit = useRef<HTMLElement | null>(null);
  const badge = useRef<HTMLElement | null>(null);
  const v3 = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 24);
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const s = st.current;
    const W = size.width, H = size.height;
    const cam = camera as THREE.PerspectiveCamera;
    const perPx = (2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / H;
    const reduced = bus.reduced;

    /* ---- where the head lives ---- */
    const slot = document.getElementById("head-slot");
    const r = slot?.getBoundingClientRect();
    const inHero = !!r && r.bottom > H * 0.45 && r.top < H;
    const dock = W < 640 ? 92 : 128;
    const tx = inHero ? r!.left + r!.width / 2 : W - dock * 0.62 - 12;
    const ty = inHero ? r!.top + r!.height / 2 : H - dock * 0.62 - (W < 640 ? 84 : 12);
    const tpx = inHero ? r!.width : dock;
    if (!s.init) { s.x = tx; s.y = ty; s.px = tpx; s.init = true; }
    const k = inHero && !s.docked ? 40 : 8;
    s.x = damp(s.x, tx, k, dt); s.y = damp(s.y, ty, k, dt); s.px = damp(s.px, tpx, k, dt);
    s.docked = !inHero;

    /* ---- theme + customisation ---- */
    const th = THEMES[bus.custom.theme] ?? THEMES.box;
    s.ink.lerp(new THREE.Color(th.ink), 0.12); s.glow.lerp(new THREE.Color(th.glow), 0.12);
    for (const m of [inkMat, misMat]) {
      m.uniforms.uInk.value.copy(s.ink); m.uniforms.uGlow.value.copy(s.glow);
      m.uniforms.uShape.value = bus.custom.shape;
      m.uniforms.uDot.value = face.spacing * s.px * dpr * (bus.custom.bold ? 1.32 : 1.12);
    }
    accMat.uniforms.uDot.value = face.spacing * s.px * dpr * 1.1;
    const misShift = (bus.pointer.active ? (bus.pointer.x / W - 0.5) : 0.2) * 0.004;
    misMat.uniforms.uOffset.value.set(0.0035 + misShift, -0.003);
    if (s.acc !== bus.custom.acc) {
      s.acc = bus.custom.acc;
      const a = buildAcc(bus.custom.acc, face);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(a.pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(a.col, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(a.size, 1));
      accGeo.current?.dispose();
      accGeo.current = g;
      if (accPts.current) accPts.current.geometry = g;
    }
    if (phonesPts.current) phonesPts.current.visible = bus.mood === "call" && bus.custom.acc !== "shades";

    /* ---- what to look at ---- */
    let lx: number, ly: number;
    if (bus.held) { lx = bus.held.x; ly = bus.held.y; }
    else if (s.ball) { lx = s.x; ly = s.y - H; }
    else if (bus.focus) { lx = bus.focus.x; ly = bus.focus.y; }
    else if (bus.pointer.active) { lx = bus.pointer.x; ly = bus.pointer.y; }
    else { lx = s.x + Math.sin(t * 0.37) * W * 0.25; ly = s.y + Math.sin(t * 0.23) * H * 0.1; }
    const near = Math.hypot(bus.pointer.x - s.x, bus.pointer.y - s.y) < s.px * 0.6;
    const asleep = bus.mood === "asleep" && !bus.held && !near && !s.eat && !s.ball;
    const amp = bus.mood === "call" && !bus.held ? 0.5 : 1;
    const dockAmp = s.docked ? 0.25 : 1;
    let yaw = clamp((lx - s.x) / (W * 0.45), -1, 1) * 0.42 * amp * dockAmp;
    let pitch = clamp((ly - s.y) / (H * 0.5), -1, 1) * 0.3 * amp * dockAmp;
    if (asleep) { yaw = Math.sin(t * 0.4) * 0.04; pitch = 0.2; }

    /* ---- eating timeline ---- */
    const sec = now / 1000;
    for (const f of bus.flights) {
      if ((f as { started?: boolean }).started) continue;
      (f as { started?: boolean }).started = true;
      const first = fx.pour(f.sweet, f.x, f.y, bus.head.mx, bus.head.my);
      s.eat = { start: sec, arrive: sec + first, close: sec + first + 0.75, sweet: f.sweet };
      setTimeout(() => { bus.flights = bus.flights.filter((x) => x !== f); }, 3000);
    }
    let mouth = 0, puff = 0, heart = 0, squint = 0, lean = 0;
    if (s.eat) {
      const e = s.eat;
      if (sec < e.close) { mouth = clamp((sec - e.start - 0.12) / Math.max(0.2, e.arrive - e.start - 0.12), 0, 1); lean = 1; }
      else {
        const a = sec - e.close;
        if (a < 0.08) mouth = 1 - a / 0.08;
        if (a >= 0 && !(e as { done?: boolean }).done) {
          (e as { done?: boolean }).done = true;
          face.wave = { at: t, x: face.marks.mouth[0], y: face.marks.mouth[1] };
          face.impulse(face.marks.mouth[0], face.marks.mouth[1], 0.35, 0.35, 0.2);
          fx.burst(bus.head.mx, bus.head.my - s.px * 0.05, 18, 260, s.px * 0.018, SPARK, 300, 0.8);
          bus.ate = { at: now, sweet: null };
          say("desk:ate", e.sweet);
        }
        puff = a < 0.75 ? Math.abs(Math.sin((a / 0.75) * Math.PI * 2)) * 0.9 : 0;
        heart = a > 0.25 && a < 1.9 ? Math.min(1, (a - 0.25) / 0.15, (1.9 - a) / 0.25) : 0;
        squint = a < 1.9 ? 0.4 : 0;
        if (a > 2.1) s.eat = null;
      }
    }
    // hungry: someone is hovering or holding a sweet
    if (!s.eat && (bus.held || bus.hoverSweet)) { mouth = Math.max(mouth, bus.held ? 0.35 : 0.18); lean = 0.6; }

    /* ---- sugar states ---- */
    const sugar = bus.sugar;
    const rush = !reduced && sugar >= 0.55 && sugar < 0.85 ? (sugar - 0.55) / 0.3 : 0;
    const cold = sugar >= 0.85 && !s.ball;
    s.jitter = damp(s.jitter, rush * 0.9 + (cold ? 0 : 0), 4, dt);
    s.shiver = damp(s.shiver, cold && !reduced ? 0.7 : 0, 3, dt);
    if (rush > 0.3 && !s.eat && t > s.rushHeart) { s.rushHeart = t + 5 + Math.random() * 4; s.heart = 1; }
    if (cold && !asleep) {
      const eyesY = 0.035;
      if (t > s.tearNext) {
        s.tearNext = t + 0.35 + Math.random() * 0.3;
        for (const e of [face.marks.eyeL, face.marks.eyeR]) {
          v3.set(e[0] + (Math.random() - 0.5) * 0.03, e[1] - eyesY, face.eyeLz + 0.02).applyMatrix4(group.current!.matrixWorld);
          const p = worldToPx(v3, W, H, perPx);
          fx.emit(p[0], p[1], (Math.random() - 0.5) * 10, 10, 1.4, s.px * 0.016, TEAR, 140);
        }
      }
      if (t > s.dripNext) {
        s.dripNext = t + 0.07;
        const n = Math.random() < 0.5 ? face.marks.nostrilL : face.marks.nostrilR;
        v3.set(n[0], n[1] - 0.01, face.noseZ + 0.02).applyMatrix4(group.current!.matrixWorld);
        const p = worldToPx(v3, W, H, perPx);
        fx.emit(p[0], p[1], 0, 8, 0.6 + Math.random() * 0.5, s.px * 0.014, DRIP, Math.random() < 0.1 ? 500 : 40);
      }
      // sneeze: a breath in, then everything flies
      if (t > s.sneezeNext - 0.6 && t < s.sneezeNext) { squint = 0.8; mouth = Math.max(mouth, 0.35); pitch -= 0.14; }
      if (t >= s.sneezeNext) {
        s.sneezeNext = t + 8 + Math.random() * 5;
        s.sneeze = t;
        face.impulse(face.marks.nose[0], face.marks.nose[1], 2.4, 1.2, 0.6);
        s.kickV += 3;
        v3.set(face.marks.nose[0], face.marks.nose[1], face.noseZ + 0.05).applyMatrix4(group.current!.matrixWorld);
        const p = worldToPx(v3, W, H, perPx);
        fx.burst(p[0], p[1], 40, 420, s.px * 0.015, [DRIP, TEAR, hex("#ffffff")], 500, 0.8);
        say("desk:sneeze");
      }
    } else if (s.sneezeNext < t + 2) s.sneezeNext = t + 3;

    /* ---- football: burn it off ---- */
    if (bus.burnAt && bus.burnAt !== s.lastBurn && !s.ball) { s.lastBurn = bus.burnAt; s.ball = { start: t, hits: 0, spin: 0 }; }
    let ballOn = false;
    if (s.ball) {
      const b = s.ball, a = t - b.start, HITS = 6, ENTER = 0.75, CYCLE = 0.72;
      v3.set(face.marks.forehead[0], face.marks.forehead[1] + 0.12, face.foreheadZ).applyMatrix4(group.current!.matrixWorld);
      const top = worldToPx(v3, W, H, perPx);
      const R = s.px * 0.11, cx = top[0], cy = top[1] - R;
      let bx: number, by: number;
      if (a < ENTER) {
        const p = a / ENTER, sx = W + 80, sy = H * 0.95;
        bx = sx + (cx - sx) * p; by = sy + (cy - sy) * p - Math.sin(p * Math.PI) * H * 0.35;
      } else if (a < ENTER + HITS * CYCLE) {
        const c = Math.floor((a - ENTER) / CYCLE), p = ((a - ENTER) % CYCLE) / CYCLE;
        if (c >= b.hits) {
          b.hits = c + 1;
          face.impulse(face.marks.forehead[0], face.marks.forehead[1] + 0.08, 1.1, 0.45, 0.3);
          s.kickV -= 4.5;
          fx.burst(cx, cy + R, 8, 220, s.px * 0.016, [SWEAT], 700, 0.7);
          say("desk:header", b.hits);
        }
        bx = cx + Math.sin(c * 1.7) * s.px * 0.04 * p;
        by = cy - Math.sin(p * Math.PI) * Math.max(40, Math.min(cy - R - 24, s.px * 0.42));
      } else {
        const p = (a - ENTER - HITS * CYCLE) / 0.8;
        bx = cx - p * W * 0.7; by = cy - p * H * 0.9 + p * p * H * 0.2;
        if (p >= 1) { s.ball = null; say("desk:burned"); }
      }
      b.spin += dt * 9;
      ballOn = !!s.ball;
      fx.ball(bx, by, R, b.spin, ballOn, [s.ink.r, s.ink.g, s.ink.b]);
      squint = Math.max(squint, 0.5);
      mouth = Math.max(mouth, 0.12);
    } else fx.ball(0, 0, 0, 0, false, [0, 0, 0]);

    if (bus.cheerAt && bus.cheerAt !== s.cheer) {
      s.cheer = bus.cheerAt; s.heart = 1.6; s.kickV -= 2.5;
      fx.burst(s.x, s.y - s.px * 0.45, 40, 380, s.px * 0.02, SPARK, 500, 1.1);
    }

    /* ---- blinks, kicks, head transform ---- */
    if (t > s.blinkAt) { s.blinkAt = t + 2.2 + Math.random() * 3.5; s.blink = 1; }
    s.blink = Math.max(0, s.blink - dt * 7);
    s.heart = Math.max(heart, s.heart - dt * 0.9);
    s.kickV += (-s.kick * 60 - s.kickV * 9) * dt; s.kick += s.kickV * dt;
    s.mouth = damp(s.mouth, mouth, 22, dt);
    s.puff = damp(s.puff, puff, 18, dt);
    s.squint = damp(s.squint, squint, 10, dt);
    s.yaw = damp(s.yaw, yaw, reduced ? 20 : 7, dt);
    s.pitch = damp(s.pitch, pitch + lean * 0.08, reduced ? 20 : 7, dt);
    s.roll = damp(s.roll, -s.yaw * 0.15 + (asleep ? 0.12 : 0), 6, dt);
    const sneezeAge = t - s.sneeze;
    const expr: Expr = {
      blink: asleep ? 1 : s.blink > 0.5 ? (1 - s.blink) * 2 : s.blink * 2,
      mouth: s.mouth + (sneezeAge > 0 && sneezeAge < 0.3 ? 0.7 : 0),
      puff: s.puff, heart: Math.min(1, s.heart), jitter: s.jitter, shiver: s.shiver,
      breathe: reduced ? 0 : Math.sin(t * (asleep ? 1.2 : 2)) * (asleep ? 0.02 : 0.007), squint: s.squint,
    };
    face.update(t, dt, expr);

    const g = group.current!;
    const sc = s.px * perPx;
    g.position.set((s.x - W / 2) * perPx, -(s.y - H / 2) * perPx + (reduced ? 0 : Math.sin(t * 1.3) * 0.006 * sc), 0);
    g.rotation.set(s.pitch + s.kick * 0.1, s.yaw, s.roll);
    g.scale.setScalar(sc);
    g.updateMatrixWorld();

    // mouth in screen px, for the stream to aim at
    v3.set(face.marks.mouth[0], face.marks.mouth[1] - s.mouth * 0.03, face.mouthZ).applyMatrix4(g.matrixWorld);
    const mp = worldToPx(v3, W, H, perPx);
    Object.assign(bus.head, { x: s.x, y: s.y, r: s.px * 0.32, docked: s.docked, mx: mp[0], my: mp[1] });

    /* ---- effects ---- */
    fx.update(dt, mp[0], mp[1]);
    const fp = fxGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < CAP; i++) { fp[i * 3] = (fx.x[i] - W / 2) * perPx; fp[i * 3 + 1] = -(fx.y[i] - H / 2) * perPx; fp[i * 3 + 2] = 2; }
    fxGeo.attributes.position.needsUpdate = true;
    fxGeo.attributes.aSize.needsUpdate = true;
    fxGeo.attributes.color.needsUpdate = true;
    for (const name of ["position", "aSize", "aTint", "aHeart"]) faceGeo.attributes[name].needsUpdate = true;

    /* ---- DOM: hit area, docked badge ---- */
    hit.current ??= document.getElementById("head-hit");
    badge.current ??= document.getElementById("dock-badge");
    if (hit.current) {
      const d = s.px * 0.62;
      hit.current.style.transform = `translate(${s.x - d / 2}px, ${s.y - d / 2}px)`;
      hit.current.style.width = hit.current.style.height = `${d}px`;
      hit.current.dataset.docked = s.docked ? "1" : "0";
    }
    if (badge.current) {
      const d = dock * 1.08;
      badge.current.style.transform = `translate(${s.x - d / 2}px, ${s.y - d / 2}px)`;
      badge.current.style.width = badge.current.style.height = `${d}px`;
      badge.current.dataset.on = s.docked && Math.abs(s.px - dock) < 30 ? "1" : "0";
    }
  });

  return (
    <>
      <group ref={group}>
        <points geometry={faceGeo} material={misMat} renderOrder={1} frustumCulled={false} />
        <points geometry={faceGeo} material={inkMat} renderOrder={2} frustumCulled={false} />
        <points ref={phonesPts} geometry={phonesGeo} material={accMat} renderOrder={3} frustumCulled={false} />
        <points ref={accPts} geometry={emptyGeo} material={accMat} renderOrder={3} frustumCulled={false} />
      </group>
      <points geometry={fxGeo} material={fxMat} renderOrder={4} frustumCulled={false} />
    </>
  );
}

function worldToPx(v: THREE.Vector3, W: number, H: number, perPx: number): [number, number] {
  // the camera is at z=10 looking at the origin; correct for perspective of points off the z=0 plane
  const k = 10 / (10 - v.z);
  return [W / 2 + (v.x * k) / perPx, H / 2 - (v.y * k) / perPx];
}

export default function DotScene() {
  const [face, setFace] = useState<Face | null>(null);
  useEffect(() => { loadFace().then(setFace).catch((e) => console.error("face", e)); }, []);
  return (
    <div className="scene" aria-hidden>
      <Canvas dpr={[1, 2]} camera={{ fov: 25, position: [0, 0, 10], near: 0.1, far: 50 }} gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }} style={{ pointerEvents: "none" }}>
        {face && <Dots face={face} />}
      </Canvas>
    </div>
  );
}
