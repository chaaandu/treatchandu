"use client";
import type { Face } from "./face";
import { hex } from "./fx";

export type Acc = "none" | "shades" | "crown" | "party" | "band" | "halo";
export const ACCESSORIES: { id: Acc; label: string }[] = [
  { id: "none", label: "Just me" },
  { id: "shades", label: "Shades" },
  { id: "band", label: "Sweatband" },
  { id: "party", label: "Party hat" },
  { id: "crown", label: "Crown" },
  { id: "halo", label: "Halo" },
];

export interface AccDots { pos: Float32Array; col: Float32Array; size: Float32Array; n: number }

/** Builds an accessory (or headphones) as dots in head-local space, sitting on the face's depth. */
export function buildAcc(kind: Acc | "phones", face: Face): AccDots {
  const m = face.marks, sp = face.spacing * 1.05;
  const P: number[] = [], C: number[] = [], S: number[] = [];
  // depth of the face near a point (coarse lookup grid)
  const grid = depthGrid(face);
  const zAt = (x: number, y: number) => grid(x, y);
  const fill = (inside: (x: number, y: number) => string | null, x0: number, x1: number, y0: number, y1: number, z: (x: number, y: number) => number, s = 0.85) => {
    const rowH = sp * 0.866;
    for (let r = 0, y = y0; y <= y1; r++, y = y0 + r * rowH) {
      for (let x = x0 + (r & 1 ? sp / 2 : 0); x <= x1; x += sp) {
        const c = inside(x, y);
        if (!c) continue;
        P.push(x, y, z(x, y)); C.push(...hex(c)); S.push(s);
      }
    }
  };
  const top = m.top[1], fh = m.forehead;
  switch (kind) {
    case "shades": {
      const w = 0.07, h = 0.042, rr = 0.018;
      const lens = (x: number, y: number, e: [number, number]) => {
        const dx = Math.max(0, Math.abs(x - e[0]) - (w - rr)), dy = Math.max(0, Math.abs(y - e[1]) - (h - rr));
        return Math.hypot(dx, dy) < rr;
      };
      fill((x, y) => {
        if (lens(x, y, m.eyeL) || lens(x, y, m.eyeR)) return (x - y * 0.6) % 0.05 < 0.008 && y > m.eyeL[1] ? "#ff9a3c" : "#16110c";
        if (Math.abs(y - m.eyeL[1] - 0.02) < 0.008 && x > m.eyeL[0] && x < m.eyeR[0]) return "#16110c";
        if (Math.abs(y - m.eyeL[1] - 0.025) < 0.007 && (x < m.eyeL[0] - w || x > m.eyeR[0] + w) && x > m.earL[0] && x < m.earR[0]) return "#16110c";
        return null;
      }, m.earL[0], m.earR[0], m.eyeL[1] - 0.06, m.eyeL[1] + 0.06, (x, y) => zAt(x, y) + 0.05, 1);
      break;
    }
    case "band": {
      const y0 = fh[1] + 0.035, y1 = fh[1] + 0.085;
      fill((x, y) => (Math.abs(x) < 0.215 ? (Math.abs(y - (y0 + y1) / 2) < 0.007 ? "#ffffff" : "#ff3d3d") : null), -0.23, 0.23, y0, y1, (x, y) => zAt(x, y) + 0.03, 1);
      break;
    }
    case "crown": {
      const y0 = top - 0.02, base = 0.05, spikes = 5, w = 0.15;
      fill((x, y) => {
        if (Math.abs(x) > w) return null;
        const yy = y - y0;
        if (yy < 0) return null;
        if (yy < base) return Math.abs(yy - base / 2) < 0.008 && Math.abs((x / (2 * w / spikes)) % 1) < 0.35 ? "#ff3d6e" : "#ffc531";
        const f = ((x + w) / (2 * w)) * spikes % 1;
        const spike = 0.09 * (1 - Math.abs(f - 0.5) * 2);
        return yy < base + spike ? "#ffc531" : null;
      }, -0.16, 0.16, y0, y0 + 0.15, () => face.foreheadZ * 0.7, 1);
      break;
    }
    case "party": {
      const ax = 0.07, ay = top + 0.24, bl: [number, number] = [-0.09, top - 0.02], br: [number, number] = [0.13, top + 0.02];
      const inTri = (x: number, y: number) => {
        const s = (a: number[], b: number[], c: number[]) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]);
        const d1 = s([x, y], bl, br), d2 = s([x, y], br, [ax, ay]), d3 = s([x, y], [ax, ay], bl);
        return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
      };
      fill((x, y) => {
        if (Math.hypot(x - ax, y - ay) < 0.028) return "#ffffff";
        if (!inTri(x, y)) return null;
        return Math.floor((y - top) / 0.04) % 2 ? "#ffe14d" : "#1fb5a8";
      }, -0.1, 0.14, top - 0.03, ay + 0.03, () => face.foreheadZ * 0.6, 1);
      break;
    }
    case "halo": {
      fill((x, y) => {
        const d = Math.hypot(x / 0.15, (y - top - 0.07) / 0.032);
        return d > 0.72 && d < 1 ? "#ffe14d" : null;
      }, -0.16, 0.16, top + 0.03, top + 0.11, () => face.foreheadZ * 0.5, 1);
      break;
    }
    case "phones": {
      const cx = (m.earL[0] + m.earR[0]) / 2, half = (m.earR[0] - m.earL[0]) / 2 + 0.02, cy = m.earL[1];
      fill((x, y) => {
        const d = Math.hypot((x - cx) / half, (y - cy) / (top + 0.03 - cy));
        if (y > cy && d > 0.92 && d < 1.06) return "#16110c";
        for (const e of [m.earL, m.earR]) {
          const ex = e[0] + Math.sign(e[0] - cx) * 0.01;
          const dd = Math.hypot((x - ex) / 0.04, (y - e[1]) / 0.065);
          if (dd < 1) return dd < 0.55 ? "#ff6b1a" : "#16110c";
        }
        return null;
      }, m.earL[0] - 0.06, m.earR[0] + 0.06, m.earL[1] - 0.08, top + 0.05, () => face.foreheadZ * 0.5, 1);
      break;
    }
  }
  return { pos: new Float32Array(P), col: new Float32Array(C), size: new Float32Array(S), n: S.length };
}

function depthGrid(face: Face) {
  const G = 48, grid = new Float32Array(G * G);
  for (let i = 0; i < face.n; i++) {
    const gx = Math.floor((face.base[i * 3] + 0.5) * G), gy = Math.floor((face.base[i * 3 + 1] + 0.5) * G);
    if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue;
    grid[gy * G + gx] = Math.max(grid[gy * G + gx], face.base[i * 3 + 2]);
  }
  return (x: number, y: number) => {
    const gx = Math.floor((x + 0.5) * G), gy = Math.floor((y + 0.5) * G);
    let best = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = gx + dx, Y = gy + dy;
      if (X >= 0 && Y >= 0 && X < G && Y < G) best = Math.max(best, grid[Y * G + X]);
    }
    return best;
  };
}
