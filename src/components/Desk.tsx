"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { SWEET } from "@/lib/sweets";
import type { DeskState, PublicToken, SweetId } from "@/lib/types";
import AskSheet, { type Basket } from "./AskSheet";
import Board from "./Board";
import Bubble from "./Bubble";
import { bus, emit } from "./bus";
import Case from "./Case";
import Hero from "./Hero";
import Hours from "./Hours";
import Ledger from "./Ledger";
import Presence from "./Presence";
import Queue from "./Queue";

const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

const EAT_LINES = ["Mmm. Priority noted.", "Okay okay. Moving you up.", "That's the good stuff.", "Say less.", "Your task just got tastier."];

export default function Desk({ initial }: { initial: DeskState }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  const [basket, setBasket] = useState<Basket>({});
  const [say, setSay] = useState<null | { text: string; at: number }>(null);
  const [here, setHere] = useState(1);
  const [gl, setGl] = useState(false);
  const now = Date.parse(state.now);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.ok) setState(await r.json());
  }, []);

  const talk = useCallback((text: string) => {
    setSay({ text, at: performance.now() });
    setTimeout(() => setSay((s) => (s && performance.now() - s.at >= 3100 ? null : s)), 3300);
  }, []);

  // global pointer, motion preference, saved look, WebGL support
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    bus.reduced = mq.matches;
    try { const l = localStorage.getItem("desk.look"); if (l === "real" || l === "toon") bus.look = l; } catch {}
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
    emit();
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  // ?mood=asleep|call|focus|out previews a state (cosmetic only)
  const [preview, setPreview] = useState<DeskState["mood"] | null>(null);
  useEffect(() => {
    const m = new URLSearchParams(location.search).get("mood");
    if (m === "asleep" || m === "call" || m === "focus" || m === "out" || m === "free") setPreview(m);
  }, []);
  const mood = preview ?? state.mood;
  const shown = preview ? { ...state, mood: preview, moodUntil: state.moodUntil ?? new Date(Date.parse(state.now) + 3_600_000).toISOString() } : state;
  useEffect(() => { bus.mood = mood; emit(); }, [mood]);
  useEffect(() => { const i = setInterval(refresh, 30_000); return () => clearInterval(i); }, [refresh]);

  // a sweet you gave lands → it joins your bribe, then the token form opens
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const fed = (e: Event) => {
      const { sweet } = (e as CustomEvent<{ sweet: SweetId }>).detail;
      setBasket((b) => ({ ...b, [sweet]: Math.min(20, (b[sweet] || 0) + 1) }));
      clearTimeout(timer);
      timer = setTimeout(() => setOpen(true), 1500);
    };
    const ate = (e: Event) => {
      const sweet = (e as CustomEvent<SweetId>).detail;
      talk(sweet === "chai" ? "Chai. Respect." : sweet === "kaju" ? "KAJU KATLI. You're first." : EAT_LINES[Math.floor(Math.random() * EAT_LINES.length)]);
    };
    window.addEventListener("desk:fed-local", fed);
    window.addEventListener("desk:ate", ate);
    return () => { clearTimeout(timer); window.removeEventListener("desk:fed-local", fed); window.removeEventListener("desk:ate", ate); };
  }, [talk]);

  const onDone = useCallback((t: PublicToken, b: Basket) => {
    const n = Object.values(b).reduce((s, x) => s + (x || 0), 0);
    talk(n ? `Token #${t.token_no}. ${n} ${n === 1 ? "sweet" : "sweets"}, noted.` : "No sweets? Bold.");
    refresh();
  }, [talk, refresh]);

  const headClick = () => {
    if (bus.head.docked) { setOpen(true); return; }
    bus.boop = performance.now();
    const pick = Object.values(SWEET)[Math.floor(Math.random() * 7)];
    talk(["Hey.", "Boop.", `Is that ${pick.name.toLowerCase()}?`, "Sweets first, questions later."][Math.floor(Math.random() * 4)]);
  };

  return (
    <div className={`desk ${gl ? "has-gl" : "no-gl"}`} data-mood={mood}>
      {gl && <Scene />}
      <button id="head-hit" className="head-hit" onClick={headClick} aria-label="Chandu" tabIndex={-1} />
      {gl && <Bubble say={say} />}
      <Presence live={state.live} onCount={setHere} />

      <main>
        <Hero state={shown} onAsk={() => setOpen(true)} here={here} />
        <div className="paper">
          <Board board={state.board} />
          <Hours events={state.calendar.events} sample={state.calendar.sample} now={now} />
          <Queue queue={state.queue} now={now} onAsk={() => setOpen(true)} />
          <Case work={state.work} />
          <Ledger ledger={state.ledger} jar={state.jar} kcal={state.kcal} />
          <footer className="foot">
            <p className="foot-big">Bring sweets</p>
            <div className="foot-row mono">
              <a href="https://chandumachineni.com" target="_blank" rel="noreferrer">chandumachineni.com ↗</a>
              <span>treat.chandumachineni.com</span>
              <span>Designed and built by Chandu, with Claude</span>
            </div>
          </footer>
        </div>
      </main>

      <AskSheet open={open} onClose={() => setOpen(false)} basket={basket} setBasket={setBasket} onDone={onDone} />
    </div>
  );
}
