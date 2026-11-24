import { SWEET } from "@/lib/sweets";
import type { PublicToken, SweetId } from "@/lib/types";
import { SweetIcon } from "./SweetIcon";
import { ago, pad } from "./time";

export const STATUS_LABEL = { issued: "Token issued", tasting: "Tasting", stove: "On the stove", served: "Served", bitter: "Too bitter" } as const;
export const NEED_LABEL = { today: "Today", tomorrow: "Tomorrow", week: "This week", whenever: "Whenever" } as const;

export function sweetsSummary(t: PublicToken) {
  const m = new Map<SweetId, { qty: number; delivered: number }>();
  for (const s of t.sweets) {
    const e = m.get(s.sweet) ?? { qty: 0, delivered: 0 };
    e.qty += s.qty;
    if (s.state === "delivered") e.delivered += s.qty;
    m.set(s.sweet, e);
  }
  return [...m.entries()];
}

export const sweetPoints = (t: PublicToken) => t.sweets.reduce((s, x) => s + SWEET[x.sweet].points * x.qty, 0);

/** A thermal-paper token. */
export function Receipt({ t, rank, big = false, now }: { t: PublicToken; rank?: number; big?: boolean; now?: number }) {
  const sweets = sweetsSummary(t);
  return (
    <article className={`receipt ${big ? "big" : ""}`} data-status={t.status}>
      <div className="r-head mono">
        <span>Bribe Desk</span>
        <span>{rank ? `№ ${rank} in line` : NEED_LABEL[t.need]}</span>
      </div>
      <div className="r-token">
        <span className="mono tiny">Token</span>
        <span className="r-no">#{pad(t.token_no, 3)}</span>
      </div>
      <div className="r-rule" />
      <dl className="r-rows">
        <div><dt className="mono">From</dt><dd>{t.name}</dd></div>
        <div>
          <dt className="mono">For</dt>
          <dd>
            {t.title ?? (
              <span className="redact" aria-label="Private">
                <i style={{ width: "72%" }} /><i style={{ width: "48%" }} />
              </span>
            )}
          </dd>
        </div>
        <div><dt className="mono">Need</dt><dd>{NEED_LABEL[t.need]}</dd></div>
      </dl>
      <div className="r-rule" />
      <div className="r-sweets">
        {sweets.length === 0 ? (
          <span className="mono tiny muted">No sweets</span>
        ) : (
          sweets.map(([id, s]) => (
            <span key={id} className="r-sweet" title={`${s.qty} ${SWEET[id].name}${s.delivered ? `, ${s.delivered} delivered` : ", promised"}`}>
              <SweetIcon id={id} size={big ? 26 : 20} ghost={s.delivered === 0} />
              <span className="mono">×{s.qty}</span>
            </span>
          ))
        )}
      </div>
      {t.note && <p className="r-note">{t.note}</p>}
      {t.served_url && (
        <a className="r-link mono" href={t.served_url} target="_blank" rel="noreferrer">
          Open what was served ↗
        </a>
      )}
      <div className="r-foot mono tiny">
        <span>{ago(t.created_at, now)}</span>
        <span>{t.pinned ? "Pinned" : `Priority ${Math.round(t.score % 1000)}`}</span>
      </div>
      <span className={`stamp s-${t.status}`}>{STATUS_LABEL[t.status]}</span>
    </article>
  );
}
