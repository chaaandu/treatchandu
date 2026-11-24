import type { Work } from "@/lib/types";

const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } };

/** "The display case": shipped work as mithai boxes behind glass. */
export default function Case({ work }: { work: Work[] }) {
  return (
    <section className="section" id="work">
      <header className="sec-head">
        <span className="mono sec-no">04</span>
        <h2>The display case</h2>
        <p className="sec-sub">Things I&rsquo;ve shipped.</p>
      </header>
      <div className="case">
        <div className="case-glass" aria-hidden />
        <div className="boxes">
          {work.map((w, i) => (
            <a
              key={w.id}
              className="box"
              href={w.url || undefined}
              target="_blank"
              rel="noreferrer"
              style={{ "--h": w.hue, "--pat": i % 4 } as React.CSSProperties}
            >
              <span className="box-lid" aria-hidden><span className="ribbon" /></span>
              <span className="box-body">
                <span className="box-metric">{w.metric}</span>
                <span className="box-title">{w.title}</span>
                <span className="box-blurb">{w.blurb}</span>
                <span className="box-foot mono">
                  <span>{w.when}</span>
                  <span>{host(w.url)} ↗</span>
                </span>
              </span>
            </a>
          ))}
        </div>
        <div className="shelf" aria-hidden />
      </div>
    </section>
  );
}
