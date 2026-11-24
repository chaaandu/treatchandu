"use client";
import { useEffect, useRef, useState } from "react";
import { SWEETS } from "@/lib/sweets";
import type { DeskState, SweetId } from "@/lib/types";
import { bus, emit, feed, setHover } from "./bus";
import { SweetIcon } from "./SweetIcon";
import { hm } from "./time";

export function statusLine(s: Pick<DeskState, "mood" | "moodUntil">) {
  const until = s.moodUntil ? hm(s.moodUntil) : "";
  switch (s.mood) {
    case "call": return { dot: "busy", text: `On a call till ${until}` };
    case "focus": return { dot: "focus", text: `Building till ${until}` };
    case "out": return { dot: "out", text: "Out today" };
    case "asleep": return { dot: "sleep", text: "Asleep, up at 7 am" };
    default: return { dot: "free", text: "Free now" };
  }
}

function Clock() {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    setT(Date.now());
    const i = setInterval(() => setT(Date.now()), 15_000);
    return () => clearInterval(i);
  }, []);
  return <>{t ? `${hm(t)} IST` : "IST"}</>;
}

/** Counts up to the new value whenever it changes. */
export function Roll({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    const a = from.current, start = performance.now(), dur = 900;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (to - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toLocaleString("en-IN")}{suffix}</>;
}

/** Feed Chandu (dots pour into the mouth) and tell the page + other visitors. */
export function give(id: SweetId, x: number, y: number) {
  feed(id, x, y);
  window.dispatchEvent(new CustomEvent("desk:fed-local", { detail: { sweet: id, x, y } }));
}

export default function Hero({ state, sweets, excitement, bump }: { state: DeskState; sweets: number; excitement: number; bump: number }) {
  const st = statusLine(state);
  const start = useRef<{ x: number; y: number; id: SweetId; el: HTMLElement } | null>(null);

  const down = (e: React.PointerEvent<HTMLButtonElement>, id: SweetId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, id, el: e.currentTarget };
    bus.held = { sweet: id, x: e.clientX, y: e.clientY, from: performance.now() };
    emit();
  };
  const move = (e: React.PointerEvent) => {
    if (!bus.held) return;
    bus.held.x = e.clientX;
    bus.held.y = e.clientY;
  };
  const up = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || !bus.held) return;
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8;
    bus.held = null;
    start.current = null;
    const r = s.el.querySelector(".sticker")!.getBoundingClientRect();
    if (!moved) give(s.id, r.left + r.width / 2, r.top + r.height / 2);
    else give(s.id, e.clientX, e.clientY); // dropped anywhere: it still goes in
    emit();
  };
  const key = (e: React.KeyboardEvent<HTMLButtonElement>, id: SweetId) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    give(id, r.left + r.width / 2, r.top + r.height / 3);
  };

  return (
    <section className="hero" id="top">
      <div className="hero-top">
        <span className="wordmark">treat<i>·</i>chandu</span>
        <span className="status"><span className={`dot ${st.dot}`} /><span>{st.text}</span><span className="sep">/</span><span className="clock"><Clock /></span></span>
      </div>

      <div className="poster">
        <h1 aria-label="Bribe Desk"><span aria-hidden>Bribe</span><span aria-hidden>Desk</span></h1>
        <p className="tagline">Sweets move you up the queue.<br />Drag one to my mouth.</p>
      </div>

      <div className="stage"><div id="head-slot" /></div>

      <div className="count" data-bump={bump % 2}>
        <div className="count-sticker">
          <b><Roll to={sweets} /></b>
          <span>sweets<br />so far</span>
        </div>
        <div className="excite">
          <span className="excite-label">Excitement</span>
          <b><Roll to={excitement} suffix="%" /></b>
        </div>
      </div>

      <div className="tray" role="group" aria-label="Feed Chandu a sweet">
        {SWEETS.map((s) => (
          <button
            key={s.id}
            className="slot"
            data-slot={s.id}
            aria-label={`Give ${s.name}`}
            onPointerDown={(e) => down(e, s.id)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => { bus.held = null; start.current = null; emit(); }}
            onPointerEnter={() => setHover(s.id)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(s.id)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => key(e, s.id)}
          >
            <span className="sticker"><SweetIcon id={s.id} size={40} /></span>
            <span className="slot-name">{s.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
