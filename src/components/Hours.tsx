import type { CalEvent } from "@/lib/types";
import { dayLabel, hm, istHour, istMidnight } from "./time";

const START = 8, END = 22, DAY = 86_400_000, HOUR = 3_600_000;

/** Longest free gap in working hours (10–19 IST), today from now on, else the next working day. */
function bestSlot(events: CalEvent[], now: number) {
  for (let d = 0; d < 7; d++) {
    const base = istMidnight(now) + d * DAY;
    let from = Math.max(base + 10 * HOUR, now);
    from = Math.ceil(from / (30 * 60_000)) * 30 * 60_000;
    const to = base + 19 * HOUR;
    if (from >= to) continue;
    const busy = events
      .map((e) => [Date.parse(e.start), Date.parse(e.end)] as const)
      .filter(([s, e]) => e > from && s < to)
      .sort((a, b) => a[0] - b[0]);
    if (busy.some(([s, e]) => s <= base + 10 * HOUR && e >= to)) continue; // out all day
    let best: [number, number] | null = null, cur = from;
    for (const [s, e] of busy) {
      if (s > cur && (!best || s - cur > best[1] - best[0])) best = [cur, s];
      cur = Math.max(cur, e);
    }
    if (to > cur && (!best || to - cur > best[1] - best[0])) best = [cur, to];
    if (best && best[1] - best[0] >= 30 * 60_000) return { day: d, from: best[0], to: best[1] };
  }
  return null;
}

export default function Hours({ events, sample, now }: { events: CalEvent[]; sample: boolean; now: number }) {
  const days = Array.from({ length: 7 }, (_, i) => istMidnight(now) + i * DAY);
  const slot = bestSlot(events, now);
  const nowH = istHour(now);
  const pos = (h: number) => `${((Math.min(END, Math.max(START, h)) - START) / (END - START)) * 100}%`;

  return (
    <section className="section" id="hours">
      <header className="sec-head">
        <span className="mono sec-no">02</span>
        <h2>Counter hours</h2>
        {slot ? (
          <p className="sec-sub">
            Best time to catch me: <b>{slot.day === 0 ? "today" : slot.day === 1 ? "tomorrow" : dayLabel(slot.from)}, {hm(slot.from)} to {hm(slot.to)}</b>
          </p>
        ) : (
          <p className="sec-sub">Booked solid this week. Sweets help.</p>
        )}
        {sample && <span className="sample mono">Sample week</span>}
      </header>

      <div className="cal-scroll">
      <div className="cal" style={{ "--rows": END - START } as React.CSSProperties}>
        <div className="cal-hours mono" aria-hidden>
          {Array.from({ length: END - START + 1 }, (_, i) => START + i).filter((h) => h % 2 === 0).map((h) => (
            <span key={h} style={{ top: pos(h) }}>{h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`}</span>
          ))}
        </div>
        {days.map((d, i) => {
          const evs = events.filter((e) => Date.parse(e.end) > d && Date.parse(e.start) < d + DAY);
          return (
            <div key={d} className={`cal-day ${i === 0 ? "today" : ""}`}>
              <div className="cal-label">
                <span className="mono">{i === 0 ? "Today" : dayLabel(d).split(" ")[0]}</span>
                <b>{dayLabel(d).split(" ")[1]}</b>
              </div>
              <div className="cal-col">
                {evs.map((e, j) => {
                  const s = Math.max(Date.parse(e.start), d), en = Math.min(Date.parse(e.end), d + DAY);
                  const sh = (s - d) / HOUR, eh = (en - d) / HOUR;
                  if (eh <= START || sh >= END) return null;
                  const label = e.title ?? (e.kind === "meeting" ? "Busy" : e.kind === "focus" ? "Focus" : "Out");
                  return (
                    <div key={j} className={`ev ${e.kind}`} style={{ top: pos(sh), height: `calc(${pos(eh)} - ${pos(sh)})` }} title={`${label}, ${hm(s)}–${hm(en)}`}>
                      <span>{label}</span>
                    </div>
                  );
                })}
                {slot && slot.day === i && (
                  <div className="ev free" style={{ top: pos(istHour(slot.from)), height: `calc(${pos(istHour(slot.to) || 24)} - ${pos(istHour(slot.from))})` }}>
                    <span>Catch me</span>
                  </div>
                )}
                {i === 0 && nowH >= START && nowH <= END && <div className="now-line" style={{ top: pos(nowH) }}><span className="mono">{hm(now)}</span></div>}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </section>
  );
}
