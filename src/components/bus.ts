"use client";
import type { Mood, SweetId } from "@/lib/types";
import type { Acc } from "./dots/accessories";
import type { ThemeId } from "./dots/theme";

/**
 * One mutable bag shared by the 3D scene (reads it every frame) and React (subscribes).
 * Positions are viewport pixels.
 */
type Listener = () => void;

export const bus = {
  pointer: { x: -1, y: -1, active: false },
  /** where the head should look instead of the pointer (a hovered token, a remote cursor) */
  focus: null as null | { x: number; y: number },
  /** sweet being dragged right now */
  held: null as null | { sweet: SweetId; x: number; y: number; from: number },
  /** head on screen, written by the scene each frame */
  head: { x: 0, y: 0, r: 100, docked: false, mx: 0, my: 0 },
  mood: "free" as Mood,
  /** sugar level the face reacts to, 0..1 (server level + what this visitor fed − what he burned) */
  sugar: 0,
  /** football: performance.now() when a burn was asked for */
  burnAt: 0,
  /** heart eyes + sparkles (new sweets since your last visit) */
  cheerAt: 0,
  /** how the visitor dressed him up */
  custom: { theme: "box" as ThemeId, shape: 0, acc: "none" as Acc, bold: false },
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

export function setCustom(c: Partial<typeof bus.custom>) {
  bus.custom = { ...bus.custom, ...c };
  try { localStorage.setItem("desk.custom", JSON.stringify(bus.custom)); } catch {}
  emit();
}

export function setHover(s: SweetId | null) {
  bus.hoverSweet = s;
  emit();
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __bus: typeof bus }).__bus = bus;
