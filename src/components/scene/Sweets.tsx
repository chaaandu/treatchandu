"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SWEETS } from "@/lib/sweets";
import type { SweetId } from "@/lib/types";
import { bus } from "../bus";
import { mithai } from "./mithai";

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const FLIGHT_MS = 720;

/** The tray sweets (tracking DOM slots in the hero) plus sweets flying into the mouth. */
export function Sweets() {
  const { camera, size } = useThree();
  const tray = useRef<THREE.Group>(null);
  const air = useRef<THREE.Group>(null);
  const items = useMemo(
    () => SWEETS.map((s, i) => ({ id: s.id, obj: mithai(s.id), x: 0, y: 0, s: 0, pop: 1, lift: 0, spin: i * 0.9, init: false })),
    [],
  );
  const flying = useRef(new Map<number, { obj: THREE.Object3D; sweet: SweetId; x: number; y: number; at: number }>());
  const slots = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const g = tray.current!;
    items.forEach((it) => g.add(it.obj));
    return () => { items.forEach((it) => g.remove(it.obj)); };
  }, [items]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const W = size.width, H = size.height;
    const cam = camera as THREE.PerspectiveCamera;
    const perPx = (2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / H;
    const toWorld = (x: number, y: number, o: THREE.Object3D, z = 0.6) => o.position.set((x - W / 2) * perPx, -(y - H / 2) * perPx, z);
    const now = performance.now();

    if (!slots.current.length || !slots.current[0].isConnected) slots.current = Array.from(document.querySelectorAll<HTMLElement>("[data-slot]"));
    const byId = new Map(slots.current.map((el) => [el.dataset.slot as SweetId, el]));

    for (const it of items) {
      const el = byId.get(it.id);
      const r = el?.getBoundingClientRect();
      const visible = !!r && r.bottom > -40 && r.top < H + 40 && r.width > 0;
      const held = bus.held?.sweet === it.id;
      let tx = r ? r.left + r.width / 2 : 0, ty = r ? r.top + r.height * 0.36 : 0;
      let ts = r ? r.width * 0.6 : 0;
      if (held) { tx = bus.held!.x; ty = bus.held!.y; ts *= 1.35; }
      if (!it.init && r) { it.x = tx; it.y = ty; it.s = ts; it.init = true; }
      const k = held ? 40 : 14;
      it.x = damp(it.x, tx, k, dt); it.y = damp(it.y, ty, k, dt); it.s = damp(it.s, ts, 10, dt);
      it.pop = damp(it.pop, 1, 7, dt);
      const hover = bus.hoverSweet === it.id && !held;
      it.lift = damp(it.lift, hover ? 1 : 0, 10, dt);
      it.spin += dt * (bus.reduced ? 0 : 0.5 + it.lift * 3 + (held ? 2 : 0));
      it.obj.visible = visible || held;
      toWorld(it.x, it.y - it.lift * 8, it.obj, held ? 2 : 0.6);
      it.obj.scale.setScalar(Math.max(0.0001, it.s * perPx * it.pop * (1 + it.lift * 0.12)));
      const flat = it.id === "kaju" || it.id === "choco";
      const yaw = flat ? Math.sin(it.spin * 0.8) * 0.55 : it.spin;
      it.obj.rotation.set(Math.sin(state.clock.elapsedTime * 0.9 + it.spin) * 0.15 + (held ? 0.3 : 0), yaw, held ? Math.sin(now / 120) * 0.12 : 0);
    }

    // new flights
    for (const f of bus.flights) {
      if (flying.current.has(f.id)) continue;
      const obj = mithai(f.sweet);
      air.current!.add(obj);
      flying.current.set(f.id, { obj, sweet: f.sweet, x: f.x, y: f.y, at: f.at });
      const it = items.find((i) => i.id === f.sweet);
      if (it && bus.held === null) it.pop = 0; // respawn the tray copy
    }
    for (const [id, f] of flying.current) {
      const p = Math.min(1, (now - f.at) / FLIGHT_MS);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const hx = bus.head.mx, hy = bus.head.my;
      const arc = Math.min(260, Math.hypot(hx - f.x, hy - f.y) * 0.45);
      const x = f.x + (hx - f.x) * e;
      const y = f.y + (hy - f.y) * e - Math.sin(p * Math.PI) * arc;
      toWorld(x, y, f.obj, 3);
      const sz = THREE.MathUtils.lerp(90, bus.head.r * 0.32, e) * (p > 0.85 ? (1 - p) / 0.15 : 1);
      f.obj.scale.setScalar(Math.max(0.0001, sz * perPx));
      f.obj.rotation.set(p * 6, p * 9, 0);
      if (p >= 1) {
        air.current!.remove(f.obj);
        flying.current.delete(id);
        bus.flights = bus.flights.filter((x) => x.id !== id);
        bus.ate = { at: performance.now(), sweet: f.sweet };
        window.dispatchEvent(new CustomEvent("desk:ate", { detail: f.sweet }));
      }
    }
  });

  return (
    <>
      <group ref={tray} />
      <group ref={air} />
    </>
  );
}
