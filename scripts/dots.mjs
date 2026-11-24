// Turns the cut-out photo + depth map into halftone dot data for the avatar.
// Run after scripts/avatar.mjs:  node scripts/dots.mjs
// Output: public/head/dots.bin (Float32: x, y, z, size per dot) + public/head/dots.json (count, spacing, landmarks)
import sharp from "sharp";
import fs from "node:fs/promises";

const COLOR = "public/head/real/color.webp";
const DEPTH = "assets/head/real-depth.png";
const COLS = Number(process.env.DOT_COLS || 148);
// crop of the 1024² cut-out that holds the head (fractions of the image)
const CROP = { x: 0.18, y: 0.02, s: 0.64 };
// landmarks in image fractions (x right, y down), read off a grid
const MARKS = {
  eyeL: [0.43, 0.31], eyeR: [0.57, 0.315], nose: [0.5, 0.4], nostrilL: [0.475, 0.415], nostrilR: [0.525, 0.415],
  mouth: [0.495, 0.445], mouthW: [0.065, 0], chin: [0.49, 0.56], forehead: [0.5, 0.21], top: [0.5, 0.04],
  earL: [0.35, 0.32], earR: [0.64, 0.32], cheekL: [0.405, 0.4], cheekR: [0.59, 0.4],
};

const N = 1024;
const col = await sharp(COLOR).resize(N, N).ensureAlpha().raw().toBuffer();
const dep = await sharp(DEPTH).resize(N, N).greyscale().raw().toBuffer();
// luminance + a blurred copy for local contrast (unsharp mask)
const lum = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) lum[i] = (0.299 * col[i * 4] + 0.587 * col[i * 4 + 1] + 0.114 * col[i * 4 + 2]) / 255;
const blurBuf = await sharp(Buffer.from(lum.map((v) => v * 255)), { raw: { width: N, height: N, channels: 1 } }).blur(14).raw().toBuffer();

const at = (buf, x, y, ch = 1, c = 0) => {
  const xi = Math.max(0, Math.min(N - 1, Math.round(x))), yi = Math.max(0, Math.min(N - 1, Math.round(y)));
  return buf[(yi * N + xi) * ch + c];
};
const box = (x, y) => { // 3×3 average of the sharpened luminance
  let s = 0;
  for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) {
    const xi = Math.max(0, Math.min(N - 1, Math.round(x + dx))), yi = Math.max(0, Math.min(N - 1, Math.round(y + dy)));
    const l = lum[yi * N + xi], b = blurBuf[yi * N + xi] / 255;
    s += l + 1.5 * (l - b);
  }
  return s / 9;
};

const sp = 1 / COLS, rowH = sp * Math.sqrt(3) / 2;
const raw = [];
for (let r = 0, v = 0; v <= 1; r++, v = r * rowH) {
  for (let c = 0, u = (r % 2) * sp / 2; u <= 1; c++, u = (r % 2) * sp / 2 + c * sp) {
    const fx = CROP.x + u * CROP.s, fy = CROP.y + v * CROP.s;
    const X = fx * N, Y = fy * N;
    const a = at(col, X, Y, 4, 3) / 255;
    if (a < 0.5) continue;
    const fade = (1 - smooth(0.49, 0.6, fy)) * (fy > 0.47 ? 1 - smooth(0.1, 0.17, Math.abs(fx - 0.5)) : 1); // neck dissolves, shoulders gone
    if (fade < 0.04) continue;
    raw.push({ u, v, fy, l: box(X, Y), d: at(dep, X, Y) / 255, a, fade });
  }
}
// normalise luminance between percentiles of the face
const ls = raw.map((p) => p.l).sort((a, b) => a - b);
const lo = ls[Math.floor(ls.length * 0.02)], hi = ls[Math.floor(ls.length * 0.9)];
const out = new Float32Array(raw.length * 4);
raw.forEach((p, i) => {
  const ln = Math.max(0, Math.min(1, (p.l - lo) / (hi - lo)));
  const dark = Math.pow(1 - ln, 1.55);
  out[i * 4] = p.u - 0.5;
  out[i * 4 + 1] = 0.5 - p.v;
  out[i * 4 + 2] = p.d * 0.3;
  out[i * 4 + 3] = (0.12 + 0.88 * dark) * Math.min(1, (p.a - 0.4) * 2.5) * p.fade;
});

const toLocal = ([x, y]) => [round((x - CROP.x) / CROP.s - 0.5), round(0.5 - (y - CROP.y) / CROP.s)];
const marks = Object.fromEntries(Object.entries(MARKS).map(([k, v]) => [k, k === "mouthW" ? [round(v[0] / CROP.s), 0] : toLocal(v)]));
await fs.writeFile("public/head/dots.bin", Buffer.from(out.buffer));
await fs.writeFile("public/head/dots.json", JSON.stringify({ count: raw.length, spacing: round(sp), marks }, null, 1));
console.log("dots", raw.length, "spacing", sp.toFixed(4), "bytes", out.byteLength);

function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function round(n) { return Math.round(n * 10000) / 10000; }
