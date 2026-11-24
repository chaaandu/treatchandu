"use client";
import { useMemo, useState } from "react";
import { SWEET } from "@/lib/sweets";
import type { DeskState } from "@/lib/types";
import { SweetIcon } from "./SweetIcon";
import { dayLabel } from "./time";

/** Deterministic jitter so the jar looks poured, not gridded. */
const jit = (i: number, k: number) => Math.round(((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) * 100) / 100;

export default function Ledger({ ledger, jar, kcal }: Pick<DeskState, "ledger" | "jar" | "kcal">) {
  const [tip, setTip] = useState<null | { i: number; text: string }>(null);
  const COLS = 6;
  const pieces = useMemo(
    () =>
      jar.slice(-84).map((p, i) => {
        const row = Math.floor(i / COLS), col = i % COLS;
        return { ...p, i, x: Math.round((10 + col * 15.5 + (row % 2) * 6 + jit(i, 1) * 3) * 10) / 10, y: Math.round((3 + row * 11 + jit(i, 2) * 2) * 10) / 10, r: Math.round(jit(i, 3) * 40) };
      }),
    [jar],
  );
  const max = Math.max(1, ...ledger.map((l) => l.points));
  const days = (kcal / 2400).toFixed(1);

  return (
    <section className="section" id="ledger">
      <header className="sec-head">
        <span className="mono sec-no">05</span>
        <h2>The sweet ledger</h2>
        <p className="sec-sub">Who paid, and who still owes.</p>
      </header>

      <div className="ledger">
        <div className="jar-wrap">
          <div className="jar">
            <div className="jar-lid" />
            <div className="jar-body">
              {pieces.map((p) => (
                <span
                  key={p.i}
                  className="jar-piece"
                  style={{ left: `${p.x}%`, bottom: `${p.y}%`, transform: `rotate(${p.r}deg)`, animationDelay: `${p.i * 30}ms` }}
                  onPointerEnter={() => setTip({ i: p.i, text: `${p.name} · ${SWEET[p.sweet].name} · ${p.state === "delivered" ? "delivered" : "promised"} · ${dayLabel(p.at)}` })}
                  onPointerLeave={() => setTip(null)}
                >
                  <SweetIcon id={p.sweet} size={42} ghost={p.state === "promised"} />
                </span>
              ))}
              {pieces.length === 0 && <span className="jar-empty mono">Empty</span>}
              <div className="jar-shine" />
            </div>
          </div>
          <p className="jar-tip mono tiny" aria-live="polite">{tip?.text ?? "Solid = delivered · faded = promised"}</p>
        </div>

        <div className="fame">
          <div className="kcal">
            <span className="kcal-n">{kcal.toLocaleString("en-IN")}</span>
            <span className="mono tiny">kcal delivered{kcal > 0 ? ` · ${days} days of Chandu` : ""}</span>
          </div>
          {ledger.length === 0 ? (
            <p className="muted">First bribe takes the top spot.</p>
          ) : (
            <ol className="fame-list">
              {ledger.slice(0, 10).map((l, i) => (
                <li key={l.name}>
                  <span className="mono fame-rank">{String(i + 1).padStart(2, "0")}</span>
                  <span className="fame-name">{l.name}</span>
                  <span className="fame-bar"><i style={{ width: `${(l.points / max) * 100}%` }} /></span>
                  <span className="mono fame-meta">
                    {l.delivered > 0 && <>{l.delivered} paid</>}
                    {l.delivered > 0 && l.promised > 0 && " · "}
                    {l.promised > 0 && <span className="owes">{l.promised} owed</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
