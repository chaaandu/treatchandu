import type { BoardItem } from "@/lib/types";
import { pad } from "./time";

/** "On the stove": the to-do list as kitchen tickets on a rail. */
export default function Board({ board }: { board: BoardItem[] }) {
  const lane = (l: BoardItem["lane"]) => board.filter((b) => b.lane === l).sort((a, b) => a.sort - b.sort);
  const now = lane("now"), next = lane("next"), later = lane("later"), done = lane("done");
  return (
    <section className="section" id="stove">
      <header className="sec-head">
        <span className="mono sec-no">01</span>
        <h2>On the stove</h2>
        <p className="sec-sub">What I&rsquo;m building, and what&rsquo;s next.</p>
      </header>

      <div className="rail-wrap">
        <div className="rail" aria-hidden />
        <div className="tickets">
          {now.map((b) => <Ticket key={b.id} b={b} tag="Now" hot />)}
          {next.map((b) => <Ticket key={b.id} b={b} tag="Next" />)}
        </div>
      </div>

      <div className="later">
        <div className="later-col">
          <h3 className="sub-h mono">Later</h3>
          <ol>
            {later.map((b) => (
              <li key={b.id}><span className="mono">#{pad(b.no)}</span>{b.title}</li>
            ))}
          </ol>
        </div>
        {done.length > 0 && (
          <div className="later-col">
            <h3 className="sub-h mono">Done</h3>
            <ol className="done-list">
              {done.map((b) => (
                <li key={b.id}><span className="mono">#{pad(b.no)}</span><s>{b.title}</s></li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

function Ticket({ b, tag, hot = false }: { b: BoardItem; tag: string; hot?: boolean }) {
  return (
    <div className={`ticket ${hot ? "hot" : ""}`} style={{ "--tilt": `${((b.no * 29) % 5) - 2}deg` } as React.CSSProperties}>
      <span className="clip" aria-hidden />
      <div className="t-top mono">
        <span>#{pad(b.no)}</span>
        <span className="t-tag">{tag}</span>
      </div>
      <p className="t-title">{b.title}</p>
      {hot && <span className="t-flame" aria-hidden />}
    </div>
  );
}
