"use client";
import type { Mood, SweetId } from "@/lib/types";

/**
 * One mutable bag shared by the 3D scene (reads it every frame) and React (subscribes).
 * Positions are viewport pixels.
 */
type Look = "toon" | "real";
type Listener = () => void;

export const bus = {
  pointer: { x: -1, y: -1, active: false },
  /** where the head should look instead of the pointer (a hovered token, a remote cursor) */
  focus: null as null | { x: number; y: number },
  /** sweet being dragged right now */
  held: null as null | { sweet: SweetId; x: number; y: number; from: number },
  /** head on screen, written by the scene each frame */
  head: { x: 0, y: 0, r: 100, docked: false, mx: 0, my: 0 },
  look: "toon" as Look,
  mood: "free" as Mood,
  /** last time something was eaten, and what */
  ate: { at: 0, sweet: null as SweetId | null },
  boop: 0,
  hoverSweet: null as SweetId | null,
  reduced: false,
  /** sweets flying from a point into the mouth (own drops, other people's feeds) */
  flights: [] as { id: number; sweet: SweetId; x: number; y: number; at: number }[],
};

const listeners = new Set<Listener>();
export const subscribe = (fn: Listener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export const emit = () => listeners.forEach((l) => l());

let fid = 0;
export function feed(sweet: SweetId, x: number, y: number) {
  bus.flights.push({ id: ++fid, sweet, x, y, at: performance.now() });
  emit();
}

export function setLook(l: Look) {
  bus.look = l;
  try { localStorage.setItem("desk.look", l); } catch {}
  emit();
}

export function setHover(s: SweetId | null) {
  bus.hoverSweet = s;
  emit();
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __bus: typeof bus }).__bus = bus;
