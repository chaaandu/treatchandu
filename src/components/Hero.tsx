"use client";
import { useEffect, useRef, useState } from "react";
import { SWEETS } from "@/lib/sweets";
import type { DeskState, SweetId } from "@/lib/types";
import { bus, emit, feed, setHover, setLook, subscribe } from "./bus";
import Sky from "./Sky";
import { SweetIcon } from "./SweetIcon";
import { hm } from "./time";

export function statusLine(s: Pick<DeskState, "mood" | "moodUntil">) {
  const until = s.moodUntil ? hm(s.moodUntil) : "";
  switch (s.mood) {
    case "call": return { dot: "busy", text: `On a call till ${until}` };
    case "focus": return { dot: "focus", text: `Focus till ${until}` };
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
  return <span className="mono">{t ? `${hm(t)} IST` : "IST"}</span>;
}

function LookToggle() {
  const [look, set] = useState(bus.look);
  useEffect(() => subscribe(() => set(bus.look)), []);
  return (
    <div className="look" role="radiogroup" aria-label="Head">
      <span className="look-pill" data-on={look} />
      {(["toon", "real"] as const).map((l) => (
        <button key={l} role="radio" aria-checked={look === l} onClick={() => setLook(l)}>
          {l === "toon" ? "3D" : "Real"}
        </button>
      ))}
    </div>
  );
}

function Sign() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0, a = 0, v = 0, lastX = bus.pointer.x;
    const loop = () => {
      const dx = bus.pointer.active && lastX >= 0 ? Math.max(-40, Math.min(40, bus.pointer.x - lastX)) : 0;
      lastX = bus.pointer.active ? bus.pointer.x : -1;
      const el = ref.current;
      if (el && !bus.reduced) {
        const r = el.getBoundingClientRect();
        const near = bus.pointer.y < r.bottom + 40 && bus.pointer.x > r.left - 40 && bus.pointer.x < r.right + 40;
        v += (near ? dx * 0.02 : 0) - a * 0.035 - v * 0.04;
        a += v;
        a = Math.max(-14, Math.min(14, a));
        el.style.transform = `rotate(${a}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="sign-wrap" aria-hidden>
      <div className="sign" ref={ref}>
        <span className="string l" />
        <span className="string r" />
        <div className="board">
          <span className="board-top">Est. 2026 · Sweets accepted</span>
          <span className="board-name">Bribe Desk</span>
          <span className="board-bottom">Prop. Chandu</span>
        </div>
      </div>
    </div>
  );
}

function SugarJar({ level }: { level: number }) {
  const pct = Math.round(level * 100);
  return (
    <div className="sugar" title="Sugar level. Every sweet tops it up; it halves every 3 days.">
      <div className="sugar-jar">
        <div className="sugar-fill" style={{ height: `${Math.max(4, pct)}%` }} />
        <div className="sugar-shine" />
      </div>
      <div className="sugar-meta">
        <span className="mono tiny">Sugar</span>
        <b>{pct}%</b>
      </div>
    </div>
  );
}

/** Feed Chandu (3D flight) and tell the page + other visitors. */
export function give(id: SweetId, x: number, y: number) {
  feed(id, x, y);
  window.dispatchEvent(new CustomEvent("desk:fed-local", { detail: { sweet: id, x, y } }));
}

export default function Hero({ state, onAsk, here }: { state: DeskState; onAsk: () => void; here: number }) {
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
    const onHead = Math.hypot(e.clientX - bus.head.x, e.clientY - bus.head.y) < bus.head.r * 1.3;
    bus.held = null;
    start.current = null;
    if (!moved) {
      const r = s.el.getBoundingClientRect();
      give(s.id, r.left + r.width / 2, r.top + r.height * 0.36);
    } else if (onHead) {
      give(s.id, e.clientX, e.clientY);
    }
    emit();
  };
  const key = (e: React.KeyboardEvent<HTMLButtonElement>, id: SweetId) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    give(id, r.left + r.width / 2, r.top + r.height * 0.36);
  };

  return (
    <section className="hero" id="top">
      <Sky night={state.mood === "asleep"} />
      <header className="topbar">
        <div className="status">
          <span className={`dot ${st.dot}`} />
          <span>{st.text}</span>
          <span className="sep">·</span>
          <Clock />
          {here > 1 && (
            <>
              <span className="sep">·</span>
              <span>{here} at the counter</span>
            </>
          )}
        </div>
        <nav className="nav" aria-label="Sections">
          {[["stove", "Stove"], ["hours", "Hours"], ["queue", "Queue"], ["work", "Work"], ["ledger", "Ledger"]].map(([id, label], i) => (
            <a key={id} href={`#${id}`}>
              <span className="mono">0{i + 1}</span>
              {label}
            </a>
          ))}
        </nav>
        <LookToggle />
      </header>

      <Sign />

      <div className="stage">
        <div id="head-slot" />
      </div>

      <div className="counter">
        <div className="counter-edge" />
        <div className="counter-inner">
          <div className="tray" role="group" aria-label="Sweets. Feed one to Chandu.">
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
                <span className="plate" />
                <span className="slot-fallback"><SweetIcon id={s.id} size={34} /></span>
                <span className="slot-name">{s.name}</span>
                <span className="slot-pts mono">+{s.points}</span>
              </button>
            ))}
          </div>
          <div className="counter-side">
            <SugarJar level={state.sugar} />
            <button className="ask" onClick={onAsk}>
              Ask Chandu
              <span className="ask-arrow" aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
