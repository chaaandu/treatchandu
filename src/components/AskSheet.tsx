"use client";
import { useEffect, useRef, useState } from "react";
import { SWEETS, SWEET } from "@/lib/sweets";
import type { Need, PublicToken, SweetId } from "@/lib/types";
import { Receipt } from "./Receipt";
import { SweetIcon } from "./SweetIcon";

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void } }
}

const NEEDS: [Need, string][] = [["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "This week"], ["whenever", "Whenever"]];
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type Basket = Partial<Record<SweetId, number>>;

export default function AskSheet({
  open, onClose, basket, setBasket, onDone,
}: {
  open: boolean;
  onClose: () => void;
  basket: Basket;
  setBasket: (b: Basket) => void;
  onDone: (t: PublicToken, sweets: Basket) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [link, setLink] = useState("");
  const [need, setNeed] = useState<Need>("week");
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { slug: string; token: PublicToken }>(null);
  const [copied, setCopied] = useState(false);
  const cf = useRef("");
  const cfBox = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => { try { setName(localStorage.getItem("desk.name") || ""); } catch {} }, []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => (name ? document.getElementById("ask-title") : first.current)?.focus(), 350);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [open, name, onClose]);

  // Cloudflare Turnstile, only when configured
  useEffect(() => {
    if (!open || !SITE_KEY || !cfBox.current || cfBox.current.childElementCount) return;
    const mount = () => window.turnstile?.render(cfBox.current!, { sitekey: SITE_KEY, appearance: "interaction-only", callback: (t: string) => (cf.current = t) });
    if (window.turnstile) return void mount();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = mount;
    document.head.appendChild(s);
  }, [open]);

  const count = Object.values(basket).reduce((s, n) => s + (n || 0), 0);
  const pts = Object.entries(basket).reduce((s, [k, n]) => s + SWEET[k as SweetId].points * (n || 0), 0);
  const bump = (id: SweetId, d: number) => {
    const n = Math.max(0, Math.min(20, (basket[id] || 0) + d));
    const next = { ...basket, [id]: n };
    if (!n) delete next[id];
    setBasket(next);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, title, detail, link, need, private: priv, sweets: basket, website: fd.get("website"), cf: cf.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      try {
        localStorage.setItem("desk.name", name);
        const mine = JSON.parse(localStorage.getItem("desk.tokens") || "[]");
        localStorage.setItem("desk.tokens", JSON.stringify([{ slug: data.slug, no: data.token.token_no }, ...mine].slice(0, 20)));
      } catch {}
      setDone({ slug: data.slug, token: data.token });
      onDone(data.token, basket);
    } catch (e) {
      setErr((e as Error).message);
      if (SITE_KEY) window.turnstile?.reset();
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDone(null); setTitle(""); setDetail(""); setLink(""); setPriv(false); setNeed("week"); setCopied(false);
    setBasket({});
  };
  const close = () => { onClose(); if (done) setTimeout(reset, 400); };
  const tokenUrl = done ? `${location.origin}/t/${done.slug}` : "";

  return (
    <div className="sheet-root" data-open={open ? "1" : "0"} aria-hidden={!open}>
      <div className="sheet-scrim" onClick={close} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby="ask-h">
        <button className="sheet-x" onClick={close} aria-label="Close">×</button>
        {!done ? (
          <form onSubmit={submit} className="ask-form">
            <h2 id="ask-h">Ask Chandu</h2>
            <label className="field">
              <span>Your name</span>
              <input ref={first} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="given-name" />
            </label>
            <label className="field">
              <span>What do you need?</span>
              <input id="ask-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
            </label>
            <label className="field">
              <span>Details <i>optional</i></span>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} maxLength={2000} />
            </label>
            <label className="field">
              <span>Link <i>optional</i></span>
              <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" maxLength={500} placeholder="docs.google.com/…" />
            </label>
            <fieldset className="field">
              <legend>Need it by</legend>
              <div className="chips">
                {NEEDS.map(([v, l]) => (
                  <button type="button" key={v} className="chip" aria-pressed={need === v} onClick={() => setNeed(v)}>{l}</button>
                ))}
              </div>
            </fieldset>
            <fieldset className="field">
              <legend>Bribe {count > 0 && <i className="mono">+{pts} priority</i>}</legend>
              <div className="bribe">
                {SWEETS.map((s) => (
                  <div key={s.id} className="bribe-item" data-on={basket[s.id] ? "1" : "0"}>
                    <button type="button" className="bribe-add" onClick={() => bump(s.id, 1)} aria-label={`Add ${s.name}`}>
                      <SweetIcon id={s.id} size={30} />
                      {basket[s.id] ? <b className="mono">{basket[s.id]}</b> : null}
                    </button>
                    {basket[s.id] ? (
                      <button type="button" className="bribe-minus" onClick={() => bump(s.id, -1)} aria-label={`Remove ${s.name}`}>−</button>
                    ) : null}
                    <span className="bribe-name">{s.name}</span>
                  </div>
                ))}
              </div>
              <p className="hint">You bring them in person. Promised sweets count half until Chandu says they arrived.</p>
            </fieldset>
            <label className="toggle">
              <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
              <span className="toggle-ui" aria-hidden />
              <span>Private: hide what it&rsquo;s about. Your name and sweets still show.</span>
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
            <div ref={cfBox} />
            {err && <p className="err" role="alert">{err}</p>}
            <button className="ask wide" disabled={busy}>
              {busy ? "Printing…" : count ? "Get my token" : "Get my token, no sweets"}
            </button>
          </form>
        ) : (
          <div className="ask-done">
            <div className="printer" aria-hidden><span className="printer-slot" /></div>
            <div className="printed">
              <Receipt t={done.token} big />
            </div>
            <div className="done-actions">
              <p>Keep this link to check on it:</p>
              <div className="copy">
                <input readOnly value={tokenUrl} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" onClick={() => { navigator.clipboard?.writeText(tokenUrl); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
              </div>
              <button className="link-btn" onClick={reset}>Ask something else</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
