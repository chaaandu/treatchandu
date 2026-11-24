"use client";
import { SWEET } from "@/lib/sweets";
import type { PublicToken } from "@/lib/types";
import Ants from "./Ants";
import { bus } from "./bus";
import { Receipt, sweetPoints, sweetsSummary } from "./Receipt";

function noteFor(t: PublicToken) {
  if (!t.sweets.length) return undefined;
  if (t.status === "served" || t.status === "bitter") return "lots of sweets were here";
  const top = sweetsSummary(t).sort((a, b) => SWEET[b[0]].points * b[1].qty - SWEET[a[0]].points * a[1].qty)[0];
  return sweetPoints(t) >= 8 ? `smells like ${SWEET[top[0]].name.toLowerCase()}` : undefined;
}

export default function Queue({ queue, now, onAsk }: { queue: PublicToken[]; now: number; onAsk: () => void }) {
  const open = queue.filter((t) => t.status !== "served" && t.status !== "bitter");
  const closed = queue.filter((t) => t.status === "served" || t.status === "bitter");
  const look = (e: React.PointerEvent<HTMLElement>, t: PublicToken) => {
    if (!t.sweets.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    bus.focus = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  return (
    <section className="section" id="queue">
      <header className="sec-head">
        <span className="mono sec-no">03</span>
        <h2>The queue</h2>
        <p className="sec-sub">Sweets move you up. Waiting does too.</p>
      </header>

      {open.length === 0 ? (
        <div className="empty">
          <p>Nobody in line.</p>
          <button className="ask small" onClick={onAsk}>Be first</button>
        </div>
      ) : (
        <div className="tokens">
          {open.map((t, i) => (
            <div
              key={t.token_no}
              className="token-wrap"
              style={{ "--tilt": `${((t.token_no * 37) % 7) - 3}deg` } as React.CSSProperties}
              onPointerEnter={(e) => look(e, t)}
              onPointerLeave={() => (bus.focus = null)}
            >
              {t.sweets.length > 0 && <Ants count={Math.ceil(sweetPoints(t) / 2)} note={noteFor(t)} />}
              <Receipt t={t} rank={i + 1} now={now} />
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h3 className="sub-h mono">Recently served</h3>
          <div className="tokens done">
            {closed.map((t) => (
              <div key={t.token_no} className="token-wrap" style={{ "--tilt": `${((t.token_no * 53) % 5) - 2}deg` } as React.CSSProperties}>
                {t.sweets.length > 0 && <Ants count={Math.ceil(sweetPoints(t) / 3)} note={noteFor(t)} />}
                <Receipt t={t} now={now} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
