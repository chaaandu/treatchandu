"use client";
import { useCallback, useEffect, useState } from "react";
import { SWEET } from "@/lib/sweets";
import type { BoardItem, Lane, Offer, Req, Status, Work } from "@/lib/types";
import { NEED_LABEL, STATUS_LABEL } from "./Receipt";
import { SweetIcon } from "./SweetIcon";
import { ago, pad } from "./time";

type Data = { requests: Omit<Req, "ip_hash">[]; offers: Offer[]; board: BoardItem[]; work: Work[] };

/** Chandu's back room: statuses, sweets received, the board, the display case. One passphrase, no accounts. */
export default function Kitchen() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"tokens" | "board" | "work">("tokens");
  const [err, setErr] = useState("");

  const load = useCallback(async (k: string) => {
    const r = await fetch("/api/kitchen", { headers: { "x-kitchen-key": k }, cache: "no-store" });
    if (!r.ok) { setErr("Wrong key."); setData(null); return; }
    setErr("");
    setData(await r.json());
    try { localStorage.setItem("desk.kitchen", k); } catch {}
  }, []);

  useEffect(() => {
    try { const k = localStorage.getItem("desk.kitchen"); if (k) { setKey(k); load(k); } } catch {}
  }, [load]);

  const act = async (body: object) => {
    const r = await fetch("/api/kitchen", { method: "POST", headers: { "content-type": "application/json", "x-kitchen-key": key }, body: JSON.stringify(body) });
    if (!r.ok) setErr((await r.json()).error || "Failed");
    await load(key);
  };

  if (!data)
    return (
      <main className="kitchen">
        <h1>Kitchen</h1>
        <form className="k-login" onSubmit={(e) => { e.preventDefault(); load(key); }}>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Passphrase" autoFocus />
          <button className="k-btn dark">Open</button>
        </form>
        {err && <p className="err">{err}</p>}
      </main>
    );

  const open = data.requests.filter((r) => r.status !== "served" && r.status !== "bitter").length;
  const owed = data.offers.filter((o) => o.state === "promised").reduce((s, o) => s + o.qty, 0);

  return (
    <main className="kitchen">
      <h1>Kitchen</h1>
      <p className="muted">{open} open · {owed} sweets promised, not yet received</p>
      <div className="k-tabs">
        {(["tokens", "board", "work"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
        <button onClick={() => load(key)}>Refresh</button>
      </div>
      {err && <p className="err">{err}</p>}

      {tab === "tokens" && data.requests.map((r) => <TokenCard key={r.id} r={r} offers={data.offers.filter((o) => o.request_id === r.id)} act={act} />)}
      {tab === "board" && data.board.map((b) => <BoardRow key={b.id} b={b} act={act} />)}
      {tab === "work" && (
        <>
          {data.work.map((w) => <WorkRow key={w.id} w={w} act={act} />)}
          <WorkRow w={{ id: "", title: "", url: "", when: "", blurb: "", metric: "", hue: 200, sort: data.work.length }} act={act} fresh />
        </>
      )}
    </main>
  );
}

function TokenCard({ r, offers, act }: { r: Data["requests"][number]; offers: Offer[]; act: (b: object) => Promise<void> }) {
  const [status, setStatus] = useState<Status>(r.status);
  const [url, setUrl] = useState(r.served_url);
  const [note, setNote] = useState(r.note);
  return (
    <div className="k-card">
      <div className="k-row">
        <span className="mono">#{pad(r.token_no, 3)}</span>
        <h3 className="grow">{r.title} {r.private && <span className="muted">· private</span>}</h3>
        <span className="muted">{r.name} · {NEED_LABEL[r.need]} · {ago(r.created_at)}</span>
      </div>
      {r.detail && <p>{r.detail}</p>}
      {r.link && <a className="r-link mono" href={r.link} target="_blank" rel="noreferrer">{r.link}</a>}
      {offers.length > 0 && (
        <div className="k-row">
          {offers.map((o) => (
            <button key={o.id} className="k-pill" data-state={o.state} title="Tap to mark received" onClick={() => act({ action: "delivered", id: o.id, delivered: o.state !== "delivered" })}>
              <SweetIcon id={o.sweet} size={18} /> {o.qty}× {SWEET[o.sweet].name} · {o.state === "delivered" ? "received ✓" : "promised"}
            </button>
          ))}
        </div>
      )}
      <div className="k-row">
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input className="grow" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (shows on the token)" />
        <input className="grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to what you served" />
        <button className="k-btn dark" onClick={() => act({ action: "status", id: r.id, status, note, served_url: url })}>Save</button>
        <button className="k-btn" onClick={() => act({ action: "pin", id: r.id, pinned: !r.pinned })}>{r.pinned ? "Unpin" : "Pin"}</button>
        <button className="k-btn danger" onClick={() => confirm(`Delete token #${r.token_no}?`) && act({ action: "delete", id: r.id })}>Delete</button>
      </div>
    </div>
  );
}

function BoardRow({ b, act }: { b: BoardItem; act: (x: object) => Promise<void> }) {
  const [title, setTitle] = useState(b.title);
  return (
    <div className="k-card">
      <div className="k-row">
        <span className="mono">#{pad(b.no)}</span>
        <input className="grow" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={b.lane} onChange={(e) => act({ action: "lane", id: b.id, lane: e.target.value as Lane, title })}>
          {["now", "next", "later", "done"].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="k-btn dark" onClick={() => act({ action: "lane", id: b.id, lane: b.lane, title })}>Save</button>
      </div>
    </div>
  );
}

function WorkRow({ w, act, fresh = false }: { w: Work; act: (x: object) => Promise<void>; fresh?: boolean }) {
  const [v, setV] = useState(w);
  const f = (k: keyof Work) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: k === "hue" || k === "sort" ? Number(e.target.value) : e.target.value });
  return (
    <div className="k-card">
      {fresh && <h3>Add to the display case</h3>}
      <div className="k-row">
        <input className="grow" value={v.title} onChange={f("title")} placeholder="Title" />
        <input className="grow" value={v.url} onChange={f("url")} placeholder="URL" />
        <input value={v.when} onChange={f("when")} placeholder="When" size={10} />
        <input value={v.metric} onChange={f("metric")} placeholder="Big number" size={12} />
      </div>
      <div className="k-row">
        <input className="grow" value={v.blurb} onChange={f("blurb")} placeholder="One line" />
        <label className="muted">Hue <input type="number" value={v.hue} onChange={f("hue")} min={0} max={359} style={{ width: 70 }} /></label>
        <label className="muted">Order <input type="number" value={v.sort} onChange={f("sort")} style={{ width: 60 }} /></label>
        <button className="k-btn dark" onClick={() => act({ action: "work", work: v })}>Save</button>
        {!fresh && <button className="k-btn danger" onClick={() => confirm(`Remove ${w.title}?`) && act({ action: "work-delete", id: w.id })}>Remove</button>}
      </div>
    </div>
  );
}
