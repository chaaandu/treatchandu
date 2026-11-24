"use client";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { SweetId } from "@/lib/types";

/** Procedural mithai. Every piece fits roughly in a unit sphere (radius ~0.5). */

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function laddoo(): THREE.Object3D {
  const g = new THREE.IcosahedronGeometry(0.46, 24);
  const p = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  const c1 = new THREE.Color("#f6b13c"), c2 = new THREE.Color("#e48a18"), c3 = new THREE.Color("#ffd27a");
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // boondi: little bumps everywhere
    const n = Math.sin(v.x * 41) * Math.sin(v.y * 37) * Math.sin(v.z * 43);
    const bump = 1 + Math.max(0, n) * 0.06;
    v.multiplyScalar(bump);
    p.setXYZ(i, v.x, v.y * 0.97, v.z);
    const c = n > 0.35 ? c3 : n < -0.3 ? c2 : c1;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, m));
  // pista sliver on top
  const pista = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 4, 8), new THREE.MeshStandardMaterial({ color: "#8db36b", roughness: 0.5 }));
  pista.position.set(0.05, 0.47, 0.06);
  pista.rotation.set(0.3, 0, 1.2);
  grp.add(pista);
  return grp;
}

function kaju(): THREE.Object3D {
  const s = new THREE.Shape();
  s.moveTo(0, 0.34); s.lineTo(0.48, 0); s.lineTo(0, -0.34); s.lineTo(-0.48, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3, curveSegments: 1 });
  g.center();
  // crinkle the faces a little so the foil catches light
  const p = g.attributes.position as THREE.BufferAttribute;
  const r = rand(7);
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getZ(i)) > 0.07) p.setZ(i, p.getZ(i) + (r() - 0.5) * 0.004);
  g.computeVertexNormals();
  const vark = new THREE.MeshPhysicalMaterial({ color: "#d4d6dc", metalness: 0.65, roughness: 0.32, clearcoat: 0.6, iridescence: 0.45, iridescenceIOR: 1.45 });
  const body = new THREE.MeshStandardMaterial({ color: "#e2c99b", roughness: 0.85 });
  const m = new THREE.Mesh(g, [vark, body]);
  m.rotation.x = -0.55;
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

function jamun(): THREE.Object3D {
  const g = new THREE.SphereGeometry(0.42, 64, 48);
  g.scale(1.08, 0.94, 1.08);
  const m = new THREE.MeshPhysicalMaterial({ color: "#4f1d09", roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.4, sheenColor: new THREE.Color("#a0471c") });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, m));
  return grp;
}

function rasgulla(): THREE.Object3D {
  const g = new THREE.SphereGeometry(0.42, 64, 48);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + Math.sin(v.x * 23 + v.y * 17) * Math.sin(v.z * 19) * 0.012);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color: "#fbf6ea", roughness: 0.55, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 1, sheenColor: new THREE.Color("#ffffff") });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, m));
  return grp;
}

function jalebi(): THREE.Object3D {
  const pts: THREE.Vector3[] = [];
  const turns = 2.6;
  for (let i = 0; i <= 220; i++) {
    const t = i / 220;
    const a = t * turns * Math.PI * 2;
    const rr = 0.06 + t * 0.36;
    pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, Math.sin(a * 3) * 0.018));
  }
  // the loop that every jalebi ends with
  const end = pts[pts.length - 1];
  pts.push(new THREE.Vector3(end.x + 0.06, end.y - 0.08, 0.02), new THREE.Vector3(end.x - 0.05, end.y - 0.16, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, 600, 0.058, 14, false);
  const m = new THREE.MeshPhysicalMaterial({ color: "#f2850f", roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, emissive: "#7a2b00", emissiveIntensity: 0.12 });
  const grp = new THREE.Group();
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -0.5;
  grp.add(mesh);
  return grp;
}

function choco(): THREE.Object3D {
  const grp = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: "#3e2112", roughness: 0.38, clearcoat: 0.4 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.6, 0.1, 3, 0.03), m);
  grp.add(base);
  const sq = new RoundedBoxGeometry(0.2, 0.25, 0.06, 2, 0.025);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const b = new THREE.Mesh(sq, m);
    b.position.set(-0.33 + i * 0.22, -0.135 + j * 0.27, 0.06);
    grp.add(b);
  }
  grp.rotation.x = -0.45;
  return grp;
}

function chai(): THREE.Object3D {
  const prof = [
    [0.0, -0.36], [0.2, -0.36], [0.23, -0.33], [0.3, 0.0], [0.34, 0.3], [0.37, 0.34], [0.33, 0.34], [0.3, 0.29],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(prof, 64);
  const clay = new THREE.MeshStandardMaterial({ color: "#b0552f", roughness: 0.92, side: THREE.DoubleSide });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, clay));
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshPhysicalMaterial({ color: "#c58a59", roughness: 0.15, clearcoat: 1 }));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.27;
  grp.add(tea);
  grp.rotation.x = 0.35;
  return grp;
}

const BUILD: Record<SweetId, () => THREE.Object3D> = { laddoo, kaju, jamun, rasgulla, jalebi, choco, chai };

const cache = new Map<SweetId, THREE.Object3D>();
export function mithai(id: SweetId): THREE.Object3D {
  if (!cache.has(id)) cache.set(id, BUILD[id]());
  return cache.get(id)!.clone();
}
