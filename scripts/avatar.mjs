// Builds the head assets: cut-out colour + depth map, per look.
// Run: node scripts/avatar.mjs  (downloads two small open models the first time)
//   Background: Xenova/modnet (Apache-2.0)   Depth: onnx-community/depth-anything-v2-small (Apache-2.0)
import { pipeline, AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

env.cacheDir = path.resolve(".cache/models");

const LOOKS = [
  { id: "toon", src: "assets/source/6.png" },
  { id: "real", src: "assets/source/3.png" },
];
const OUT = 1024;

const depthPipe = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", { dtype: "fp32" });
const matModel = await AutoModel.from_pretrained("Xenova/modnet", { dtype: "fp32" });
const matProc = await AutoProcessor.from_pretrained("Xenova/modnet");

for (const look of LOOKS) {
  const img = await RawImage.read(look.src);
  const W = img.width, H = img.height;

  // 1. Matte (alpha)
  const { pixel_values } = await matProc(img);
  const { output } = await matModel({ input: pixel_values });
  const matte = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(W, H);
  const alpha = Buffer.from(matte.data);

  // 2. Depth (relative, brighter = closer)
  const { depth } = await depthPipe(img);
  const d = await depth.resize(W, H);
  const dep = Buffer.from(d.data);

  // 3. Bounding box of the subject
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (alpha[y * W + x] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const pad = Math.round(0.04 * Math.max(x1 - x0, y1 - y0));
  const side = Math.max(x1 - x0, y1 - y0) + pad * 2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const left = Math.round(cx - side / 2), top = Math.round(cy - side / 2);

  // depth normalised to the subject only, background pushed to 0
  let dmin = 255, dmax = 0;
  for (let i = 0; i < W * H; i++) if (alpha[i] > 128) { if (dep[i] < dmin) dmin = dep[i]; if (dep[i] > dmax) dmax = dep[i]; }
  const dn = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) {
    const v = Math.max(0, Math.min(1, (dep[i] - dmin) / Math.max(1, dmax - dmin)));
    dn[i] = Math.round(v * (alpha[i] / 255) * 255);
  }

  const rgb = await sharp(look.src).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i];
  }

  const square = async (buf, ch) => {
    const big = await sharp(buf, { raw: { width: W, height: H, channels: ch } })
      .extend({ top: side, bottom: side, left: side, right: side, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
    const cut = await sharp(big).extract({ left: left + side, top: top + side, width: side, height: side }).png().toBuffer();
    let s = sharp(cut).resize(OUT, OUT);
    if (ch === 1) s = s.toColourspace("b-w");
    return s;
  };

  const dir = path.join("public/head", look.id);
  await fs.mkdir(dir, { recursive: true });
  await (await square(rgba, 4)).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(dir, "color.webp"));
  await (await square(dn, 1)).blur(3.2).png({ compressionLevel: 9 }).toFile(path.join(dir, "depth.png"));
  // previews for checking
  await (await square(rgba, 4)).png().toFile(path.join(".cache", `${look.id}-color.png`));
  await (await square(dn, 1)).blur(3.2).png().toFile(path.join(".cache", `${look.id}-depth.png`));
  console.log(look.id, { W, H, box: [x0, y0, x1, y1], side });
}
