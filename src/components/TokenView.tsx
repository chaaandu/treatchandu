"use client";
import Link from "next/link";
import { useState } from "react";
import { SWEETS } from "@/lib/sweets";
import type { PublicToken, SweetId } from "@/lib/types";
import { Receipt, STATUS_LABEL } from "./Receipt";
import { SweetIcon } from "./SweetIcon";

const STEPS = ["issued", "tasting", "stove", "served"] as const;

export default function TokenView({ slug, initial, detail, link }: { slug: string; initial: PublicToken; detail: string; link: string }) {
  const [t, setT] = useState(initial);
  const [busy, setBusy] = useState<SweetId | null>(null);
  const [err, setErr] = useState("");
  const at = t.status === "bitter" ? -1 : STEPS.indexOf(t.status as (typeof STEPS)[number]);
  const open = t.status !== "served" && t.status !== "bitter";

  const add = async (sweet: SweetId) => {
    setBusy(sweet); setErr("");
    const r = await fetch(`/api/t/${slug}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sweets: { [sweet]: 1 } }) });
    const d = await r.json();
    if (r.ok) setT(d.token); else setErr(d.error || "Couldn't add that.");
    setBusy(null);
  };

  return (
    <div className="token-page">
      <Link className="back" href="/">← Bribe Desk</Link>
      <Receipt t={t} big />
      {t.status === "bitter" ? (
        <p className="muted">{STATUS_LABEL.bitter}. {t.note}</p>
      ) : (
        <>
          <div className="steps" aria-label={`Status: ${STATUS_LABEL[t.status]}`}>
            {STEPS.map((s, i) => <span key={s} data-on={i <= at ? "1" : "0"} />)}
          </div>
          <div className="steps-label mono">{STEPS.map((s) => <span key={s}>{STATUS_LABEL[s]}</span>)}</div>
        </>
      )}
      {(detail || link) && (
        <div className="k-card">
          {detail && <p>{detail}</p>}
          {link && <a className="r-link mono" href={link} target="_blank" rel="noreferrer">{link}</a>}
        </div>
      )}
      {open && (
        <div>
          <h3 className="sub-h mono">Add sweets</h3>
          <div className="more">
            {SWEETS.map((s) => (
              <button key={s.id} onClick={() => add(s.id)} disabled={!!busy}>
                <SweetIcon id={s.id} size={22} /> {s.name}
              </button>
            ))}
          </div>
          {err && <p className="err">{err}</p>}
        </div>
      )}
    </div>
  );
}
