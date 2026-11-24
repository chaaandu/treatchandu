"use client";
import type { SweetId } from "@/lib/types";

/**
 * Loose dots in screen pixels: sweets pouring into the mouth, sparkles, tears, a runny nose,
 * sweat, sneeze spray, and the football. One pool, one draw call.
 */
export const CAP = 3200;
const BALL = 260; // first slots belong to the football

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];

type Dot = { dx: number; dy: number; c: [number, number, number]; s: number };

function colorAt(id: SweetId, u: number, v: number, q: number, r: number): [string | null, number] {
  let c: string | null = null, s = 1;
  switch (id) {
    case "laddoo": {
      const d = Math.hypot(u, v);
      if (d < 1) { c = (q * 7 + r * 13) % 5 === 0 ? "#ffd36b" : "#f39a1c"; s = 1 - d * 0.25; }
      break;
    }
    case "jamun": {
      const d = Math.hypot(u * 0.92, v);
      if (d < 1) { c = Math.hypot(u + 0.35, v + 0.35) < 0.3 ? "#b4532a" : "#4a1606"; }
      break;
    }
    case "rasgulla": {
      const d = Math.hypot(u, v);
      if (d < 1) { c = d > 0.8 ? "#eadcc0" : "#ffffff"; }
      break;
    }
    case "kaju": {
      if (Math.abs(u) / 1.15 + Math.abs(v) / 0.8 < 1) c = Math.abs(u) / 1.15 + Math.abs(v) / 0.8 > 0.82 ? "#d9b980" : "#dfe2e8";
      break;
    }
    case "jalebi": {
      const d = Math.hypot(u, v), a = Math.atan2(v, u);
      const turn = (d * 2.6 - (a + Math.PI) / (2 * Math.PI) + 10) % 1;
      if (d < 1 && d > 0.08 && Math.abs(turn - 0.5) < 0.2) c = "#f28a14";
      break;
    }
    case "choco": {
      if (Math.abs(u) < 1.1 && Math.abs(v) < 0.68) c = (Math.abs(((u + 1.1) * 2) % 1 - 0.5) < 0.08 || Math.abs(((v + 0.68) * 2.2) % 1 - 0.5) < 0.08) ? "#7a4428" : "#3e1d0e";
      break;
    }
  }
  return [c, s];
}

/** A sweet drawn in dots, centred on 0,0, radius ~R px, with a white halo. */
export function sweetDots(id: SweetId, R = 50): Dot[] {
  const out: Dot[] = [];
  const sp = R / 7.5, rowH = sp * 0.866;
  for (let r = -12; r <= 12; r++) for (let q = -12; q <= 12; q++) {
    const x = q * sp + (r & 1 ? sp / 2 : 0), y = r * rowH;
    const u = x / R, v = y / R;
    let [c, s] = colorAt(id, u, v, q, r);
    if (!c && colorAt(id, u * 0.86, v * 0.86, q, r)[0]) { c = "#ffffff"; s = 0.9; } // white halo so it reads on any ink
    if (c) out.push({ dx: x, dy: -y, c: hex(c), s: s * sp * 1.05 });
  }
  return out;
}

export class Fx {
  x = new Float32Array(CAP); y = new Float32Array(CAP);
  vx = new Float32Array(CAP); vy = new Float32Array(CAP);
  age = new Float32Array(CAP); life = new Float32Array(CAP);
  size = new Float32Array(CAP); size0 = new Float32Array(CAP);
  col = new Float32Array(CAP * 3);
  kind = new Uint8Array(CAP); // 0 off, 1 physics, 2 stream, 3 ball
  g = new Float32Array(CAP);
  sx = new Float32Array(CAP); sy = new Float32Array(CAP); cx = new Float32Array(CAP); cy = new Float32Array(CAP);
  delay = new Float32Array(CAP); dur = new Float32Array(CAP);
  next = BALL;

  private slot() {
    for (let k = 0; k < CAP - BALL; k++) {
      const i = BALL + ((this.next - BALL + k) % (CAP - BALL));
      if (this.kind[i] === 0) { this.next = i + 1 >= CAP ? BALL : i + 1; return i; }
    }
    return -1;
  }

  emit(x: number, y: number, vx: number, vy: number, life: number, size: number, c: [number, number, number], g = 900) {
    const i = this.slot();
    if (i < 0) return;
    this.kind[i] = 1; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.age[i] = 0; this.life[i] = life; this.size[i] = this.size0[i] = size; this.g[i] = g;
    this.col.set(c, i * 3);
  }

  burst(x: number, y: number, n: number, speed: number, size: number, colors: [number, number, number][], g = 600, life = 0.9) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.emit(x, y, Math.cos(a) * v, Math.sin(a) * v - speed * 0.3, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.7), colors[k % colors.length], g);
    }
  }

  /** A sweet that turns to dots and pours into the mouth. Returns when (s) the first dot arrives. */
  pour(id: SweetId, x: number, y: number, mx: number, my: number) {
    const dots = sweetDots(id);
    let first = 9;
    for (const d of dots) {
      const i = this.slot();
      if (i < 0) break;
      this.kind[i] = 2;
      this.sx[i] = x + d.dx; this.sy[i] = y + d.dy;
      // control point: lift up and swirl a little, so the stream arcs into the mouth
      this.cx[i] = (x + mx) / 2 + d.dx * 1.6 + (Math.random() - 0.5) * 40;
      this.cy[i] = Math.min(y, my) - 120 - Math.random() * 60 + d.dy;
      const dist = Math.hypot(d.dx, d.dy);
      this.delay[i] = 0.42 + dist / 160 + Math.random() * 0.12;
      this.dur[i] = 0.62 + Math.random() * 0.2;
      first = Math.min(first, this.delay[i] + this.dur[i]);
      this.age[i] = 0; this.life[i] = this.delay[i] + this.dur[i];
      this.size[i] = this.size0[i] = d.s;
      this.x[i] = this.sx[i]; this.y[i] = this.sy[i];
      this.col.set(d.c, i * 3);
    }
    return first;
  }

  update(dt: number, mouthX: number, mouthY: number) {
    for (let i = BALL; i < CAP; i++) {
      const k = this.kind[i];
      if (!k) continue;
      this.age[i] += dt;
      const a = this.age[i];
      if (a >= this.life[i]) { this.kind[i] = 0; this.size[i] = 0; continue; }
      if (k === 1) {
        this.vy[i] += this.g[i] * dt;
        this.vx[i] *= 1 - 1.5 * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
        const p = a / this.life[i];
        this.size[i] = this.size0[i] * (p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3);
      } else {
        const d = this.delay[i];
        if (a < d) {
          // pop in, then hover
          const p = Math.min(1, a / 0.3);
          const pop = p < 1 ? p * (1.3 - 0.3 * p) : 1;
          this.size[i] = this.size0[i] * pop;
          this.x[i] = this.sx[i] + Math.sin(a * 30 + i) * 0.6;
          this.y[i] = this.sy[i] - pop * 34;
        } else {
          const p = Math.min(1, (a - d) / this.dur[i]);
          const e = p * p * (3 - 2 * p);
          const u = 1 - e, sy = this.sy[i] - 34;
          this.x[i] = u * u * this.sx[i] + 2 * u * e * this.cx[i] + e * e * mouthX;
          this.y[i] = u * u * sy + 2 * u * e * this.cy[i] + e * e * mouthY;
          this.size[i] = this.size0[i] * (1 - e * 0.65);
        }
      }
    }
  }

  /** Football: BALL dots arranged on a spinning sphere at (bx, by) with radius r px. */
  ball(bx: number, by: number, r: number, spin: number, on: boolean, ink: [number, number, number]) {
    const ico = ICO;
    for (let k = 0; k < BALL; k++) {
      if (!on) { this.kind[k] = 0; this.size[k] = 0; continue; }
      // fibonacci points on the front hemisphere
      const t = (k + 0.5) / BALL;
      const zf = 1 - t, rr = Math.sqrt(1 - zf * zf), a = k * 2.39996;
      let px = Math.cos(a) * rr, py = Math.sin(a) * rr; const pz = zf;
      // spin around z and x
      const cs = Math.cos(spin), sn = Math.sin(spin);
      const qx = px * cs - py * sn; py = px * sn + py * cs; px = qx;
      const c2 = Math.cos(spin * 0.7), s2 = Math.sin(spin * 0.7);
      const ry = py * c2 - pz * s2, rz = py * s2 + pz * c2;
      let dark = false;
      for (const v of ico) if (px * v[0] + ry * v[1] + rz * v[2] > 0.88) { dark = true; break; }
      this.kind[k] = 3;
      this.x[k] = bx + px * r; this.y[k] = by - ry * r;
      this.size[k] = r * 0.13 * (0.75 + 0.25 * Math.max(0, rz));
      this.col.set(dark ? ink : [1, 1, 1], k * 3);
    }
  }
}

const p = (1 + Math.sqrt(5)) / 2;
const ICO = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]].map((v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
});

export { hex };
