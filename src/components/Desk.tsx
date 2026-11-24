"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { DeskState, PublicToken, SweetId } from "@/lib/types";
import AskSheet, { type Basket } from "./AskSheet";
import Board from "./Board";
import Bubble from "./Bubble";
import { bus, emit, subscribe } from "./bus";
import Case from "./Case";
import Dock from "./Dock";
import { THEMES } from "./dots/theme";
import Hero from "./Hero";
import Hours from "./Hours";
import Ledger from "./Ledger";
import Presence from "./Presence";
import Queue from "./Queue";

const DotScene = dynamic(() => import("./dots/DotScene"), { ssr: false });

const EAT = ["Mmm. Priority noted.", "Okay okay. You're moving up.", "That's the good stuff.", "Say less.", "Worth it."];
const FED = 0.14;     // sugar per sweet fed on this visit
const HEADER = 0.05;  // sugar burned per header

export default function Desk({ initial }: { initial: DeskState }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  const [basket, setBasket] = useState<Basket>({});
  const [say, setSay] = useState<null | { text: string; at: number }>(null);
  const [gl, setGl] = useState(false);
  const [fed, setFed] = useState(0);        // sweets fed this visit
  const [burned, setBurned] = useState(0);  // sugar burned this visit
  const [burning, setBurning] = useState(false);
  const [bump, setBump] = useState(0);
  const [theme, setTheme] = useState(bus.custom.theme);
  const now = Date.parse(state.now);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.ok) setState(await r.json());
  }, []);

  const talk = useCallback((text: string, ms = 3100) => {
    const at = performance.now();
    setSay({ text, at });
    setTimeout(() => setSay((s) => (s && s.at === at ? null : s)), ms);
  }, []);

  // pointer, motion preference, saved outfit, WebGL
  useEffect(() => {
    bus.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const c = JSON.parse(localStorage.getItem("desk.custom") || "null");
      if (c && c.theme in THEMES) bus.custom = { ...bus.custom, ...c };
    } catch {}
    setTheme(bus.custom.theme);
    const c = document.createElement("canvas");
    setGl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    const move = (e: PointerEvent) => {
      bus.pointer.x = e.clientX; bus.pointer.y = e.clientY; bus.pointer.active = true;
      if (bus.held) { bus.held.x = e.clientX; bus.held.y = e.clientY; }
    };
    const leave = () => { bus.pointer.active = false; };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    const off = subscribe(() => setTheme(bus.custom.theme));
    emit();
    return () => {
      off();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);
  const th = THEMES[theme] ?? THEMES.box;

  // ?mood=asleep|call|focus|out and ?sugar=0..1 preview states (cosmetic)
  const [preview, setPreview] = useState<DeskState["mood"] | null>(null);
  const [sugarPreview, setSugarPreview] = useState<number | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const m = q.get("mood");
    if (m === "asleep" || m === "call" || m === "focus" || m === "out" || m === "free") setPreview(m);
    const s = q.get("sugar");
    if (s && !Number.isNaN(+s)) setSugarPreview(Math.min(1, Math.max(0, +s)));
  }, []);
  const mood = preview ?? state.mood;
  const shown = preview ? { ...state, mood: preview, moodUntil: state.moodUntil ?? new Date(now + 3_600_000).toISOString() } : state;
  useEffect(() => { bus.mood = mood; emit(); }, [mood]);

  // sugar the face reacts to: real sweets (decaying) + what you fed − what he burned
  const sugar = Math.min(1, Math.max(0, (sugarPreview ?? state.sugar) + fed * FED - burned));
  useEffect(() => { bus.sugar = sugar; emit(); }, [sugar]);
  const sweets = state.sweets.total;
  const excitement = (sweets + fed) * 100 + Math.round(sugar * 250);

  // new sweets since your last visit → he lights up
  useEffect(() => {
    try {
      const seen = Number(localStorage.getItem("desk.seen") ?? "-1");
      if (seen >= 0 && sweets > seen) {
        const n = sweets - seen;
        setTimeout(() => { bus.cheerAt = performance.now(); talk(`${n} new ${n === 1 ? "sweet" : "sweets"} since you were here!`, 4200); }, 1800);
      }
      localStorage.setItem("desk.seen", String(sweets));
    } catch {}
  }, [sweets, talk]);

  useEffect(() => { const i = setInterval(refresh, 30_000); return () => clearInterval(i); }, [refresh]);

  // events from the face
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onFed = (e: Event) => {
      const { sweet } = (e as CustomEvent<{ sweet: SweetId }>).detail;
      setBasket((b) => ({ ...b, [sweet]: Math.min(20, (b[sweet] || 0) + 1) }));
      setFed((f) => f + 1);
      clearTimeout(timer);
      timer = setTimeout(() => setOpen(true), 2800);
    };
    const onAte = (e: Event) => {
      const sweet = (e as CustomEvent<SweetId>).detail;
      setBump((b) => b + 1);
      talk(bus.sugar >= 0.85 ? "Too much sugar. Eyes watering. Worth it." : sweet === "kaju" ? "KAJU KATLI. You're first." : EAT[Math.floor(Math.random() * EAT.length)]);
    };
    const onSneeze = () => talk("ACHOO!", 1400);
    const onHeader = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      setBurned((b) => b + HEADER);
      talk(n >= 6 ? "Six headers. Sugar? What sugar." : `${n}!`, 900);
    };
    const onBurned = () => { setBurning(false); talk("Burned it off. Feed me again.", 2600); };
    window.addEventListener("desk:fed-local", onFed);
    window.addEventListener("desk:ate", onAte);
    window.addEventListener("desk:sneeze", onSneeze);
    window.addEventListener("desk:header", onHeader);
    window.addEventListener("desk:burned", onBurned);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("desk:fed-local", onFed);
      window.removeEventListener("desk:ate", onAte);
      window.removeEventListener("desk:sneeze", onSneeze);
      window.removeEventListener("desk:header", onHeader);
      window.removeEventListener("desk:burned", onBurned);
    };
  }, [talk]);

  const burn = () => {
    if (burning) return;
    if (!gl) { talk("Need a better screen for football."); return; }
    setBurning(true);
    window.scrollTo({ top: 0, behavior: bus.reduced ? "auto" : "smooth" });
    setTimeout(() => { bus.burnAt = performance.now(); }, 400);
    talk("Football time.", 1200);
  };

  const onDone = useCallback((t: PublicToken, b: Basket) => {
    const n = Object.values(b).reduce((s, x) => s + (x || 0), 0);
    talk(n ? `Token #${t.token_no}. ${n} ${n === 1 ? "sweet" : "sweets"}, noted.` : "No sweets? Bold.");
    refresh();
  }, [talk, refresh]);

  const headClick = () => {
    if (bus.head.docked) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    bus.cheerAt = performance.now();
    talk(["Hey.", "Boop.", "Sweets first, questions later.", "I can smell jalebi."][Math.floor(Math.random() * 4)]);
  };

  const vars = { "--hero-bg": th.bg, "--hero-ink": th.ink, "--hero-glow": th.glow, "--hero-text": th.text } as React.CSSProperties;

  return (
    <div className={`desk ${gl ? "has-gl" : "no-gl"}`} data-mood={mood} style={vars}>
      {gl && <DotScene />}
      <span id="dock-badge" className="dock-badge" aria-hidden />
      <button id="head-hit" className="head-hit" onClick={headClick} aria-label="Chandu" tabIndex={-1} />
      {gl && <Bubble say={say} />}
      <Presence live={state.live} onCount={() => {}} />

      <main>
        <Hero state={shown} sweets={sweets} excitement={excitement} bump={bump} />
        <Board board={state.board} />
        <Hours events={state.calendar.events} sample={state.calendar.sample} now={now} />
        <Queue queue={state.queue} now={now} onAsk={() => setOpen(true)} />
        <Case work={state.work} />
        <Ledger ledger={state.ledger} jar={state.jar} kcal={state.kcal} />
        <footer className="foot">
          <p className="foot-big">Bring sweets</p>
          <div className="foot-row">
            <a href="https://chandumachineni.com" target="_blank" rel="noreferrer">chandumachineni.com ↗</a>
            <span>treatchandu.vercel.app</span>
            <span>Made by Chandu, with Claude</span>
          </div>
        </footer>
      </main>

      <Dock onAsk={() => setOpen(true)} onBurn={burn} burning={burning} />
      <AskSheet open={open} onClose={() => setOpen(false)} basket={basket} setBasket={setBasket} onDone={onDone} />
    </div>
  );
}
