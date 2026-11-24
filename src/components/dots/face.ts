"use client";
/**
 * The dot face: ~10k halftone dots from Chandu's photo, each on a spring.
 * Expressions are offsets applied to regions (eyes, jaw, cheeks); impulses (sneeze, header) kick velocities.
 * Coordinates are head-local: x right, y up, roughly -0.5..0.5; z toward the viewer.
 */

export type Marks = Record<"eyeL" | "eyeR" | "nose" | "nostrilL" | "nostrilR" | "mouth" | "chin" | "forehead" | "top" | "earL" | "earR" | "cheekL" | "cheekR", [number, number]>;

export interface Expr {
  blink: number;   // 0..1
  mouth: number;   // 0..1 open
  puff: number;    // 0..1 cheeks
  heart: number;   // 0..1 heart eyes
  jitter: number;  // sugar rush
  shiver: number;  // cold
  breathe: number; // small scale on y
  squint: number;  // happy squint
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Face {
  n: number;
  spacing: number;
  marks: Marks;
  base: Float32Array;  // x y z
  size0: Float32Array;
  pos: Float32Array;   // rendered positions
  size: Float32Array;  // rendered sizes
  tint: Float32Array;  // yellow glow 0..1
  heartC: Float32Array; // heart-eye colour 0..1
  disp: Float32Array; vel: Float32Array;
  // per-dot weights
  eyeW: Float32Array; eyeCy: Float32Array; heartW: Float32Array; heartX: Float32Array; heartY: Float32Array;
  jawW: Float32Array; lipW: Float32Array; cheekW: Float32Array; rnd: Float32Array;
  eyeLz = 0; eyeRz = 0; mouthZ = 0; foreheadZ = 0; noseZ = 0;

  constructor(raw: Float32Array, meta: { count: number; spacing: number; marks: Marks }) {
    const n = (this.n = meta.count);
    this.spacing = meta.spacing;
    this.marks = meta.marks;
    this.base = new Float32Array(n * 3);
    this.size0 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.base[i * 3] = raw[i * 4];
      this.base[i * 3 + 1] = raw[i * 4 + 1];
      this.base[i * 3 + 2] = raw[i * 4 + 2];
      this.size0[i] = raw[i * 4 + 3];
    }
    this.pos = new Float32Array(this.base);
    this.size = new Float32Array(this.size0);
    this.tint = new Float32Array(n);
    this.heartC = new Float32Array(n);
    this.disp = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.eyeW = new Float32Array(n); this.eyeCy = new Float32Array(n); this.heartW = new Float32Array(n);
    this.heartX = new Float32Array(n); this.heartY = new Float32Array(n);
    this.jawW = new Float32Array(n); this.lipW = new Float32Array(n); this.cheekW = new Float32Array(n);
    this.rnd = new Float32Array(n);

    const m = this.marks;
    const mouth = m.mouth, mw = 0.085;
    const zAt = (p: [number, number]) => {
      let best = 0, bd = 1e9;
      for (let i = 0; i < n; i++) {
        const d = (this.base[i * 3] - p[0]) ** 2 + (this.base[i * 3 + 1] - p[1]) ** 2;
        if (d < bd) { bd = d; best = this.base[i * 3 + 2]; }
      }
      return best;
    };
    this.eyeLz = zAt(m.eyeL); this.eyeRz = zAt(m.eyeR); this.mouthZ = zAt(m.mouth); this.foreheadZ = zAt(m.forehead); this.noseZ = zAt(m.nose);

    const eyeR = 0.064;
    const eyeIdx: number[][] = [[], []];
    for (let i = 0; i < n; i++) {
      const x = this.base[i * 3], y = this.base[i * 3 + 1];
      this.rnd[i] = Math.random();
      for (const [side, e] of [[0, m.eyeL], [1, m.eyeR]] as const) {
        const d = Math.hypot((x - e[0]) / 1.35, y - e[1]);
        if (d < eyeR) { this.eyeW[i] = 1 - smooth(eyeR * 0.6, eyeR, d); this.eyeCy[i] = e[1]; eyeIdx[side].push(i); }
      }
      // jaw: below the mouth line, within the face width, fading towards the chin
      const dx = Math.abs(x - mouth[0]);
      if (y < mouth[1] && y > m.chin[1] - 0.05 && dx < mw * 1.6) {
        this.jawW[i] = (1 - smooth(mw * 0.9, mw * 1.6, dx)) * smooth(mouth[1] - 0.005, mouth[1] - 0.03, y) * (1 - smooth(m.chin[1] + 0.02, m.chin[1] - 0.05, y) * 0.5);
      }
      if (y >= mouth[1] && y < mouth[1] + 0.03 && dx < mw) this.lipW[i] = (1 - smooth(mw * 0.6, mw, dx)) * (1 - smooth(mouth[1], mouth[1] + 0.03, y));
      for (const c of [m.cheekL, m.cheekR]) {
        const d = Math.hypot(x - c[0], y - c[1]);
        if (d < 0.075) this.cheekW[i] = (1 - smooth(0.02, 0.075, d)) * Math.sign(c[0] - mouth[0]);
      }
    }
    // heart eyes: lay the eye's dots onto an evenly filled heart, centre outwards
    eyeIdx.forEach((list, side) => {
      const e = side ? m.eyeR : m.eyeL;
      // reading order on both sides, so dots slide down/across instead of crossing
      list.sort((a, b) => (this.base[b * 3 + 1] - this.base[a * 3 + 1]) || (this.base[a * 3] - this.base[b * 3]));
      const pts = heartGrid(list.length, 0.052);
      list.forEach((i, k) => {
        this.heartW[i] = 1;
        if (k < pts.length) { this.heartX[i] = e[0] + pts[k][0]; this.heartY[i] = e[1] + 0.006 + pts[k][1]; }
        else { this.heartX[i] = e[0]; this.heartY[i] = e[1]; this.heartW[i] = 2; } // spare dots hide in the middle
      });
    });
  }

  /** Kick every dot away from a point (sneeze, header). */
  impulse(px: number, py: number, strength: number, radius = 2, spread = 0.4) {
    for (let i = 0; i < this.n; i++) {
      const dx = this.base[i * 3] - px, dy = this.base[i * 3 + 1] - py;
      const d = Math.hypot(dx, dy) + 1e-4;
      const f = strength * Math.max(0, 1 - d / radius) * (1 - spread + spread * 2 * this.rnd[i]);
      this.vel[i * 3] += (dx / d) * f;
      this.vel[i * 3 + 1] += (dy / d) * f;
      this.vel[i * 3 + 2] += f * 0.6 * (this.rnd[i] - 0.3);
    }
  }

  /** A pulse of yellow that spreads from a point (sugar going in). */
  wave = { at: -10, x: 0, y: 0 };

  update(t: number, dt: number, e: Expr, stiff = 90) {
    const { base, disp, vel, pos, size, size0, n } = this;
    const damp = 2 * Math.sqrt(stiff) * 0.55;
    const wAge = t - this.wave.at;
    const wFront = wAge * 0.55, wOn = wAge < 1.6;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const x = base[i3], y = base[i3 + 1];
      let tx = 0, ty = y * e.breathe;
      const tz = 0;
      const ew = this.eyeW[i];
      if (ew > 0) {
        const cy = this.eyeCy[i];
        ty += (cy - y) * Math.min(1, e.blink + e.squint * 0.45) * 0.92 * ew;
        const hw = this.heartW[i];
        if (e.heart > 0 && hw > 0) { tx += (this.heartX[i] - x) * e.heart; ty += (this.heartY[i] - y) * e.heart; }
      }
      const jw = this.jawW[i];
      if (jw > 0) ty -= e.mouth * 0.055 * jw;
      const lw = this.lipW[i];
      if (lw > 0) ty += e.mouth * 0.012 * lw;
      const cw = this.cheekW[i];
      if (cw !== 0) tx += e.puff * 0.028 * cw;
      if (e.jitter > 0) { tx += (Math.random() - 0.5) * 0.006 * e.jitter; ty += (Math.random() - 0.5) * 0.006 * e.jitter; }
      if (e.shiver > 0) tx += Math.sin(t * 60 + y * 30) * 0.0035 * e.shiver;

      // spring towards the expression target
      const ax = (tx - disp[i3]) * stiff - vel[i3] * damp;
      const ay = (ty - disp[i3 + 1]) * stiff - vel[i3 + 1] * damp;
      const az = (tz - disp[i3 + 2]) * stiff - vel[i3 + 2] * damp;
      vel[i3] += ax * dt; vel[i3 + 1] += ay * dt; vel[i3 + 2] += az * dt;
      disp[i3] += vel[i3] * dt; disp[i3 + 1] += vel[i3 + 1] * dt; disp[i3 + 2] += vel[i3 + 2] * dt;
      pos[i3] = x + disp[i3]; pos[i3 + 1] = y + disp[i3 + 1]; pos[i3 + 2] = base[i3 + 2] + disp[i3 + 2];

      // eyes shrink a little when closed, grow when hearts
      const hw2 = this.heartW[i];
      size[i] = hw2 === 2 ? size0[i] * (1 - e.heart) : (size0[i] + (hw2 ? e.heart * (0.92 - size0[i]) : 0)) * (1 - ew * Math.min(1, e.blink) * 0.3);
      this.heartC[i] = hw2 ? e.heart : 0;
      if (wOn) {
        const r = Math.hypot(x - this.wave.x, y - this.wave.y);
        const k = Math.exp(-((r - wFront) ** 2) / 0.0035) * (1 - wAge / 1.6);
        this.tint[i] = Math.max(this.tint[i] * 0.9, k);
      } else if (this.tint[i] > 0) this.tint[i] *= 0.9;
    }
  }
}

/** About n points on a hex grid filling a heart of half-width ~s, in reading order (rows top to bottom). */
function heartGrid(n: number, s: number): [number, number][] {
  const inside = (x: number, y: number) => { const X = (x / s) * 1.05, Y = (y / s) * 1.05 + 0.2; return (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y <= 0; };
  const grid = (h: number) => {
    const pts: [number, number][] = [], rowH = h * 0.866;
    for (let r = Math.ceil(1.4 * s / rowH); r >= -Math.ceil(1.4 * s / rowH); r--) {
      for (let q = -Math.ceil(1.4 * s / h); q <= Math.ceil(1.4 * s / h); q++) {
        const x = q * h + (r & 1 ? h / 2 : 0), y = r * rowH;
        if (inside(x, y)) pts.push([x, y]);
      }
    }
    return pts;
  };
  // binary search the spacing so the heart holds about n dots
  let lo = s / 60, hi = s;
  for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (grid(mid).length >= n) lo = mid; else hi = mid; }
  return grid(lo);
}

export async function loadFace(): Promise<Face> {
  const [bin, meta] = await Promise.all([
    fetch("/head/dots.bin").then((r) => r.arrayBuffer()),
    fetch("/head/dots.json").then((r) => r.json()),
  ]);
  return new Face(new Float32Array(bin), meta);
}
