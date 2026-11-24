"use client";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { SWEETS } from "@/lib/sweets";
import type { SweetId } from "@/lib/types";
import { bus, feed } from "./bus";
import { SweetIcon } from "./SweetIcon";

type Cursor = { id: string; name: string; sweet: SweetId; x: number; y: number; held: SweetId | null; t: number };
type Msg = { type: "cursor"; c: Cursor } | { type: "feed"; id: string; sweet: SweetId; x: number; y: number } | { type: "bye"; id: string };

/** Other people at the counter: their cursors are sweets with name tags. Supabase Realtime, or tabs on this device. */
export default function Presence({ live, onCount }: { live: { supabaseUrl: string; supabaseKey: string } | null; onCount: (n: number) => void }) {
  const [others, setOthers] = useState<Record<string, Cursor>>({});
  const me = useRef<Cursor | null>(null);
  const send = useRef<(m: Msg) => void>(() => {});

  useEffect(() => {
    const id = Math.random().toString(36).slice(2, 10);
    let name = "Someone";
    try { name = localStorage.getItem("desk.name") || "Someone"; } catch {}
    const sweet = SWEETS[Math.floor(Math.random() * SWEETS.length)].id;
    me.current = { id, name, sweet, x: 0, y: 0, held: null, t: 0 };

    const recv = (m: Msg) => {
      if (m.type === "cursor") setOthers((o) => ({ ...o, [m.c.id]: { ...m.c, t: Date.now() } }));
      else if (m.type === "bye") setOthers((o) => { const n = { ...o }; delete n[m.id]; return n; });
      else if (m.type === "feed") feed(m.sweet, m.x * window.innerWidth, m.y - window.scrollY);
    };

    let channel: RealtimeChannel | null = null;
    let bc: BroadcastChannel | null = null;
    if (live) {
      const sb = createClient(live.supabaseUrl, live.supabaseKey, { auth: { persistSession: false } });
      channel = sb.channel("counter", { config: { broadcast: { self: false }, presence: { key: id } } });
      channel
        .on("broadcast", { event: "m" }, ({ payload }) => recv(payload as Msg))
        .on("presence", { event: "sync" }, () => onCount(Object.keys(channel!.presenceState()).length))
        .subscribe((s) => { if (s === "SUBSCRIBED") channel!.track({ at: Date.now() }); });
      send.current = (m) => channel?.send({ type: "broadcast", event: "m", payload: m });
    } else if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("bribe-desk");
      bc.onmessage = (e) => recv(e.data as Msg);
      send.current = (m) => bc?.postMessage(m);
    }

    let last = 0;
    const move = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < 50 || !me.current) return;
      last = now;
      try { me.current.name = localStorage.getItem("desk.name") || me.current.name; } catch {}
      me.current = { ...me.current, x: e.clientX / window.innerWidth, y: e.clientY + window.scrollY, held: bus.held?.sweet ?? null };
      send.current({ type: "cursor", c: me.current });
    };
    const ate = (e: Event) => {
      const d = (e as CustomEvent<{ sweet: SweetId; x: number; y: number }>).detail;
      send.current({ type: "feed", id, sweet: d.sweet, x: d.x / window.innerWidth, y: d.y + window.scrollY });
    };
    const bye = () => send.current({ type: "bye", id });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("desk:fed-local", ate);
    window.addEventListener("pagehide", bye);
    const gc = setInterval(() => setOthers((o) => Object.fromEntries(Object.entries(o).filter(([, c]) => Date.now() - c.t < 8000))), 3000);
    return () => {
      bye();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("desk:fed-local", ate);
      window.removeEventListener("pagehide", bye);
      clearInterval(gc);
      channel?.unsubscribe();
      bc?.close();
    };
  }, [live, onCount]);

  // count for the local fallback
  useEffect(() => { if (!live) onCount(Object.keys(others).length + 1); }, [others, live, onCount]);

  // the head gets distracted by anyone holding a sweet
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const holder = Object.values(others).find((c) => c.held);
      if (holder && !bus.held) {
        const y = holder.y - window.scrollY;
        if (y > 0 && y < window.innerHeight) bus.focus = { x: holder.x * window.innerWidth, y };
      }
      raf = requestAnimationFrame(loop);
    };
    if (Object.values(others).some((c) => c.held)) loop();
    return () => { cancelAnimationFrame(raf); if (!bus.held) bus.focus = null; };
  }, [others]);

  return (
    <div className="cursors" aria-hidden>
      {Object.values(others).map((c) => (
        <div key={c.id} className="cursor" style={{ transform: `translate(${c.x * 100}vw, ${c.y}px)` }}>
          <SweetIcon id={c.held ?? c.sweet} size={c.held ? 30 : 20} />
          <span className="cursor-tag">{c.name}</span>
        </div>
      ))}
    </div>
  );
}
