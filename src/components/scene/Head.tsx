"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { bus } from "../bus";

/**
 * Chandu's head: a cut-out photo pushed into 3D by its depth map (Depth Anything V2),
 * lit by the same "sun" as the sky, turning to whatever it wants to look at.
 * Two looks (toon / real) cross-dissolve with a burning kesar edge.
 */

// Feature anchors in each image's own uv (0..1, y up)
const TOON = { mouth: [0.51, 0.4], earL: [0.27, 0.46], earR: [0.76, 0.46] };
const REAL = { mouth: [0.495, 0.55] };
// Real photo is placed into the head plane: uvB = (uv - .5) / S + O
const S = 1.45;
const O: [number, number] = [REAL.mouth[0] - (TOON.mouth[0] - 0.5) / S, REAL.mouth[1] - (TOON.mouth[1] - 0.5) / S];

const vert = /* glsl */ `
uniform sampler2D uDepthA, uDepthB;
uniform float uAmp, uMix, uChew, uGulp;
uniform vec2 uMouth;
uniform vec4 uXfB;
varying vec2 vUv; varying vec3 vPos; varying vec3 vN;
vec2 toB(vec2 uv){ return (uv - 0.5) / uXfB.xy + uXfB.zw; }
float inside(vec2 p){ return step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0); }
float depthAt(vec2 uv){ vec2 ub = toB(uv); return mix(texture2D(uDepthA, uv).r, texture2D(uDepthB, ub).r * inside(ub), uMix); }
void main(){
  vUv = uv;
  float d = depthAt(uv);
  float e = 0.006;
  float dx = depthAt(uv + vec2(e, 0.0)) - depthAt(uv - vec2(e, 0.0));
  float dy = depthAt(uv + vec2(0.0, e)) - depthAt(uv - vec2(0.0, e));
  vN = normalize(normalMatrix * normalize(vec3(-dx * uAmp / (2.0 * e), -dy * uAmp / (2.0 * e), 1.0)));
  vec3 p = position;
  vec2 m = uMouth;
  float w = 1.0 - smoothstep(0.0, 0.2, length((uv - m) * vec2(1.0, 1.25)));
  p.x += (uv.x - m.x) * w * uChew * 0.32;
  p.y -= w * uChew * 0.022;
  float gy = mix(m.y - 0.16, 0.03, uGulp);
  float g = (1.0 - smoothstep(0.0, 0.06, abs(uv.y - gy))) * (1.0 - smoothstep(0.0, 0.11, abs(uv.x - m.x))) * sin(uGulp * 3.14159);
  p.x += (uv.x - m.x) * g * 0.45;
  p.z += d * uAmp + g * 0.02;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
uniform sampler2D uColA, uColB;
uniform float uMix, uSpec, uOpacity, uTime;
uniform vec3 uLight, uGlow;
uniform vec4 uXfB;
varying vec2 vUv; varying vec3 vPos; varying vec3 vN;
vec2 toB(vec2 uv){ return (uv - 0.5) / uXfB.xy + uXfB.zw; }
float inside(vec2 p){ return step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 ub = toB(vUv);
  vec4 a = texture2D(uColA, vUv);
  vec4 b = texture2D(uColB, ub) * inside(ub);
  b.a *= smoothstep(0.0, 0.16, vUv.y);
  float n = fbm(vUv * 4.0 + 7.0);
  float edge = uMix * 1.25 - 0.12;
  float t = 1.0 - smoothstep(edge - 0.015, edge + 0.015, n);
  vec4 c = mix(a, b, t);
  float band = (1.0 - smoothstep(0.0, 0.035, abs(n - edge))) * step(0.001, uMix) * step(uMix, 0.999) * max(a.a, b.a);
  if (c.a < 0.03 && band < 0.05) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(-vPos);
  vec3 L = normalize(uLight);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 36.0) * uSpec;
  float diff = 0.88 + 0.14 * max(dot(N, L), 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 col = c.rgb * diff + spec * c.a + rim * vec3(0.62, 0.8, 1.0) * 0.22 * c.a;
  col = mix(col, uGlow, band);
  gl_FragColor = vec4(col, max(c.a, band) * uOpacity);
}`;

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

export function Head() {
  const [colA, depA, colB, depB] = useTexture(["/head/toon/color.webp", "/head/toon/depth.png", "/head/real/color.webp", "/head/real/depth.png"]);
  useMemo(() => {
    for (const t of [colA, depA, colB, depB]) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    }
  }, [colA, depA, colB, depB]);

  const uniforms = useMemo(
    () => ({
      uColA: { value: colA }, uDepthA: { value: depA }, uColB: { value: colB }, uDepthB: { value: depB },
      uXfB: { value: new THREE.Vector4(S, S, O[0], O[1]) },
      uAmp: { value: 0.3 }, uMix: { value: 0 }, uChew: { value: 0 }, uGulp: { value: 0 },
      uMouth: { value: new THREE.Vector2(TOON.mouth[0], TOON.mouth[1]) },
      uSpec: { value: 0.35 }, uOpacity: { value: 1 }, uTime: { value: 0 },
      uLight: { value: new THREE.Vector3(0.4, 0.6, 1) },
      uGlow: { value: new THREE.Color("#ff7a1a") },
    }),
    [colA, depA, colB, depB],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1, 220, 220), []);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const group = useRef<THREE.Group>(null);
  const phones = useRef<THREE.Group>(null);
  const zs = useRef<THREE.Group>(null);
  const st = useRef({ x: 0, y: 0, size: 300, yaw: 0, pitch: 0, roll: 0, mix: 0, lean: 0, docked: false, init: false, phones: 0, sleep: 0 });
  const hit = useRef<HTMLElement | null>(null);
  const { camera, size } = useThree();

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const t = state.clock.elapsedTime;
    const s = st.current;
    const W = size.width, H = size.height;
    const cam = camera as THREE.PerspectiveCamera;
    const perPx = (2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / H;

    // where should the head be: hero slot, or docked bottom-right
    const slot = document.getElementById("head-slot");
    const r = slot?.getBoundingClientRect();
    const inHero = !!r && r.bottom > H * 0.42 && r.top < H;
    const dockSize = W < 640 ? 84 : 132;
    const tx = inHero ? r!.left + r!.width / 2 : W - dockSize * 0.62;
    const ty = inHero ? r!.top + r!.height / 2 : H - dockSize * 0.6;
    const tsize = inHero ? r!.width : dockSize;
    if (!s.init) { s.x = tx; s.y = ty; s.size = tsize; s.init = true; }
    const k = inHero && !s.docked ? 30 : 7;
    s.x = damp(s.x, tx, k, dt); s.y = damp(s.y, ty, k, dt); s.size = damp(s.size, tsize, k, dt);
    s.docked = !inHero;

    // what to look at
    const held = bus.held;
    let lx: number, ly: number;
    if (held) { lx = held.x; ly = held.y; }
    else if (bus.focus) { lx = bus.focus.x; ly = bus.focus.y; }
    else if (bus.pointer.active) { lx = bus.pointer.x; ly = bus.pointer.y; }
    else { lx = s.x + Math.sin(t * 0.37) * W * 0.25; ly = s.y + Math.sin(t * 0.23) * H * 0.12; }

    const near = Math.hypot(bus.pointer.x - s.x, bus.pointer.y - s.y) < s.size * 0.7;
    const asleep = bus.mood === "asleep" && !held && !near && performance.now() - bus.ate.at > 4000;
    s.sleep = damp(s.sleep, asleep ? 1 : 0, 3, dt);

    const amp = bus.mood === "call" && !held ? 0.55 : 1;
    let yaw = THREE.MathUtils.clamp((lx - s.x) / (W * 0.45), -1, 1) * 0.5 * amp;
    let pitch = THREE.MathUtils.clamp((ly - s.y) / (H * 0.5), -1, 1) * 0.34 * amp;
    if (bus.mood === "call" && !held) { pitch += 0.12; yaw -= 0.08; }
    yaw = THREE.MathUtils.lerp(yaw, Math.sin(t * 0.5) * 0.05, s.sleep);
    pitch = THREE.MathUtils.lerp(pitch, 0.22, s.sleep);

    const since = performance.now() - bus.ate.at;
    const boop = performance.now() - bus.boop;
    const wiggle = boop < 900 ? Math.sin(boop / 45) * 0.12 * (1 - boop / 900) : 0;
    s.yaw = damp(s.yaw, yaw, bus.reduced ? 20 : 9, dt);
    s.pitch = damp(s.pitch, pitch, bus.reduced ? 20 : 9, dt);
    s.roll = damp(s.roll, -s.yaw * 0.18 + s.sleep * 0.2 + wiggle, 8, dt);
    s.lean = damp(s.lean, held ? 1 : 0, 6, dt);
    s.mix = damp(s.mix, bus.look === "real" ? 1 : 0, 2.6, dt);
    s.phones = damp(s.phones, bus.mood === "call" ? 1 : 0, 6, dt);

    // chew for 1.5 s after a sweet lands, then a gulp
    const chew = since < 1500 ? Math.abs(Math.sin(since / 85)) * (1 - since / 1500) * 0.9 + 0.15 * (since < 1200 ? 1 : 0) : 0;
    const gulp = since > 1450 && since < 2100 ? (since - 1450) / 650 : 0;
    const breathe = bus.reduced ? 0 : Math.sin(t * (asleep ? 1.1 : 1.8)) * (asleep ? 0.018 : 0.008);
    const bob = bus.reduced ? 0 : Math.sin(t * 1.3) * 0.012;

    const g = group.current!;
    const scale = s.size * perPx * (1 + s.lean * 0.06);
    g.position.set((s.x - W / 2) * perPx, -(s.y - H / 2) * perPx + bob * scale, s.lean * 0.4);
    g.rotation.set(s.pitch, s.yaw, s.roll);
    g.scale.set(scale * (1 - breathe * 0.4), scale * (1 + breathe), scale);

    // R3F may hold its own copy of the uniforms object; always write to the material's
    const u = (mat.current?.uniforms ?? uniforms) as typeof uniforms;
    u.uMix.value = s.mix;
    u.uChew.value = chew;
    u.uGulp.value = gulp;
    u.uTime.value = t;
    u.uSpec.value = THREE.MathUtils.lerp(0.38, 0.1, s.mix);
    u.uAmp.value = THREE.MathUtils.lerp(0.3, 0.24, s.mix);
    u.uMouth.value.set(TOON.mouth[0], TOON.mouth[1]);
    // sun follows the pointer a little
    const px = bus.pointer.active ? (bus.pointer.x / W) * 2 - 1 : 0.3;
    const py = bus.pointer.active ? -((bus.pointer.y / H) * 2 - 1) : 0.5;
    u.uLight.value.set(px * 0.8, py * 0.8 + 0.3, 1);

    if (phones.current) {
      phones.current.visible = s.phones > 0.02;
      const k = 0.6 + 0.4 * s.phones;
      phones.current.scale.set(k * (1 - 0.1 * s.mix), k, k);
      phones.current.position.y = (1 - s.phones) * 0.4 + 0.12 * s.mix; // real photo's ears sit higher
    }
    if (zs.current) {
      zs.current.visible = s.sleep > 0.05;
      zs.current.children.forEach((c, i) => {
        const p = (t * 0.35 + i / 3) % 1;
        c.position.set(0.34 + p * 0.22, 0.32 + p * 0.38, 0.3);
        (c as THREE.Mesh).scale.setScalar((0.05 + p * 0.07) * s.sleep);
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(p * Math.PI) * s.sleep;
      });
    }

    // publish for the DOM (speech bubble, drop target, hit area)
    const mouthY = s.y + (0.5 - TOON.mouth[1]) * s.size;
    Object.assign(bus.head, { x: s.x, y: s.y, r: s.size * 0.42, docked: s.docked, mx: s.x + (TOON.mouth[0] - 0.5) * s.size + s.yaw * s.size * 0.12, my: mouthY + s.pitch * s.size * 0.1 });
    hit.current ??= document.getElementById("head-hit");
    if (hit.current) {
      const d = s.size * 0.62;
      hit.current.style.transform = `translate(${s.x - d / 2}px, ${s.y - d / 2}px)`;
      hit.current.style.width = hit.current.style.height = `${d}px`;
      hit.current.dataset.docked = s.docked ? "1" : "0";
    }
  });

  const zMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false }), []);

  return (
    <group ref={group}>
      <mesh geometry={geo} renderOrder={2}>
        <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} />
      </mesh>
      <Headphones ref={phones} />
      <group ref={zs}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={zMat} renderOrder={3}>
            <ZGeometry />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ZGeometry() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0.5); s.lineTo(0.5, 0.5); s.lineTo(0.5, 0.32); s.lineTo(-0.18, -0.32); s.lineTo(0.5, -0.32);
    s.lineTo(0.5, -0.5); s.lineTo(-0.5, -0.5); s.lineTo(-0.5, -0.32); s.lineTo(0.18, 0.32); s.lineTo(-0.5, 0.32); s.closePath();
    return s;
  }, []);
  return <shapeGeometry args={[shape]} />;
}

const Headphones = ({ ref }: { ref: React.Ref<THREE.Group> }) => {
  const [l, rr] = [TOON.earL, TOON.earR];
  const cx = (l[0] + rr[0]) / 2 - 0.5, cy = l[1] - 0.5, half = (rr[0] - l[0]) / 2;
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh position={[cx, cy, 0.12]} scale={[1, 1.72, 1]}>
        <torusGeometry args={[half + 0.035, 0.03, 16, 64, Math.PI]} />
        <meshStandardMaterial color="#17130f" roughness={0.4} metalness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[cx + side * (half + 0.03), cy, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.09, 40]} />
            <meshStandardMaterial color="#17130f" roughness={0.35} metalness={0.2} />
          </mesh>
          <mesh position={[0, side * -0.05, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.02, 40]} />
            <meshStandardMaterial color="#ff6b1a" roughness={0.3} emissive="#ff6b1a" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
