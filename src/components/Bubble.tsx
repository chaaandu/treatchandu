"use client";
import { useEffect, useRef, useState } from "react";
import { SWEET } from "@/lib/sweets";
import type { Mood } from "@/lib/types";
import { bus, subscribe } from "./bus";

const MOOD: Record<Mood, string> = {
  free: "Got sweets?",
  call: "On a call. Sweets still accepted.",
  focus: "Building. Leave it on the counter.",
  out: "Out today. The queue's open.",
  asleep: "zzz",
};

/** Chandu's speech bubble. Sits beside the head wherever it is. */
export default function Bubble({ say }: { say: { text: string; at: number } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const h = bus.head;
        const W = window.innerWidth, bw = el.offsetWidth, bh = el.offsetHeight;
        const right = h.x < W * 0.7;
        let x: number, y: number, side: "left" | "right" | "top";
        if (h.docked) { x = h.x - h.r * 1.1 - bw; y = h.y - h.r * 1.5; side = "left"; }
        else if (right && h.x + h.r * 0.95 + bw < W - 8) { x = h.x + h.r * 0.95; y = h.y - h.r * 1.05; side = "right"; }
        else if (!right && h.x - h.r * 0.95 - bw > 8) { x = h.x - h.r * 0.95 - bw; y = h.y - h.r * 1.05; side = "left"; }
        else { x = h.x - bw / 2; y = h.y - h.r * 1.3 - bh; side = "top"; }
        x = Math.max(8, Math.min(W - bw - 8, x));
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.side = side;
        el.dataset.show = h.x > 0 && (!h.docked || el.dataset.hot === "1") ? "1" : "0";
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const now = typeof performance !== "undefined" ? performance.now() : 0;
  let text = MOOD[bus.mood];
  let hot = false;
  if (say && now - say.at < 3200) { text = say.text; hot = true; }
  else if (bus.held) { text = "Bring it here."; hot = true; }
  else if (bus.hoverSweet) { text = SWEET[bus.hoverSweet].quip; hot = true; }

  return (
    <div ref={ref} className="bubble" data-hot={hot ? "1" : "0"} aria-live="polite">
      <span key={text}>{text}</span>
    </div>
  );
}
