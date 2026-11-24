"use client";
import { useEffect, useRef } from "react";
import { bus } from "./bus";

/** Painted sky: streaky cirrus up top, soft cumulus low down, a sun that follows you. */
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uSun; uniform float uNight;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; mat2 r=mat2(0.8,0.6,-0.6,0.8); for(int i=0;i<6;i++){ v+=a*noise(p); p=r*p*2.02; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec3 top = mix(vec3(0.17,0.44,0.80), vec3(0.06,0.09,0.22), uNight);
  vec3 bot = mix(vec3(0.76,0.86,0.96), vec3(0.20,0.22,0.38), uNight);
  vec3 col = mix(bot, top, smoothstep(0.0, 1.0, uv.y));
  // cirrus streaks
  vec2 q = vec2(p.x * 0.55 + uTime * 0.006, p.y * 3.2);
  float c1 = fbm(q * 2.0 + fbm(q * 3.0) * 0.6);
  col = mix(col, vec3(1.0), smoothstep(0.5, 0.95, c1) * 0.55 * smoothstep(0.2, 0.9, uv.y) * (1.0 - uNight * 0.7));
  // cumulus, low
  vec2 k = vec2(p.x * 1.4 + uTime * 0.012, p.y * 2.2);
  float c2 = fbm(k * 1.6 + vec2(0.0, fbm(k * 2.0 - uTime * 0.01)));
  float low = 1.0 - smoothstep(0.12, 0.62, uv.y);
  float puff = smoothstep(0.46, 0.75, c2) * low;
  vec3 cloud = mix(vec3(0.86,0.9,0.97), vec3(1.0), smoothstep(0.5, 0.9, c2));
  col = mix(col, mix(cloud, vec3(0.5,0.55,0.75), uNight), puff * 0.9);
  // sun
  vec2 sp = vec2(uSun.x * asp, uSun.y);
  float d = length(p - sp);
  col += vec3(1.0, 0.92, 0.75) * (exp(-d * 9.0) * 0.45 + exp(-d * 2.5) * 0.12) * (1.0 - uNight);
  // stars at night
  float st = step(0.996, hash(floor(gl_FragCoord.xy / 2.0))) * uNight * smoothstep(0.3, 1.0, uv.y);
  col += st * 0.8;
  // grain
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}`;

export default function Sky({ night }: { night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes"), uTime = gl.getUniformLocation(prog, "uTime");
    const uSun = gl.getUniformLocation(prog, "uSun"), uNight = gl.getUniformLocation(prog, "uNight");

    let raf = 0, visible = true, sx = 0.72, sy = 0.82;
    const scale = Math.min(window.devicePixelRatio, 1.5) * 0.6; // soft sky, cheap pixels
    const resize = () => {
      cv.width = Math.round(cv.clientWidth * scale);
      cv.height = Math.round(cv.clientHeight * scale);
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); });
    io.observe(cv);
    const t0 = performance.now();
    const draw = () => {
      const r = cv.getBoundingClientRect();
      if (bus.pointer.active) {
        sx += ((bus.pointer.x - r.left) / r.width * 0.5 + 0.45 - sx) * 0.03;
        sy += (1 - (bus.pointer.y - r.top) / r.height * 0.4 - sy) * 0.03;
      }
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, bus.reduced ? 0 : (performance.now() - t0) / 1000);
      gl.uniform2f(uSun, sx, sy);
      gl.uniform1f(uNight, night ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = () => {
      cancelAnimationFrame(raf);
      draw();
      if (visible && !bus.reduced) raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [night]);
  return <canvas ref={ref} className="sky" aria-hidden />;
}
