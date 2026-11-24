import "server-only";
import ical, { type VEvent } from "node-ical";
import type { CalEvent, CalKind, Mood } from "./types";

export const IST = 19_800_000; // +05:30, no DST
const DAY = 86_400_000;
const TTL = 5 * 60_000;

/** Midnight IST of the day containing t, as a UTC timestamp. */
export const istMidnight = (t: number) => Math.floor((t + IST) / DAY) * DAY - IST;

function kindOf(title: string): CalKind {
  if (/\b(ooo|out of office|leave|holiday|vacation|travel|off)\b/i.test(title)) return "out";
  if (/\b(focus|deep work|heads ?down|build|blocked|no meetings?)\b/i.test(title)) return "focus";
  return "meeting";
}

type Raw = { start: Date; end: Date; summary: string; allDay: boolean };

function declined(ev: VEvent, me?: string) {
  if (!me) return false;
  const list = Array.isArray(ev.attendee) ? ev.attendee : ev.attendee ? [ev.attendee] : [];
  return list.some((a: unknown) => {
    const val = typeof a === "string" ? a : (a as { val?: string }).val ?? "";
    const params = typeof a === "string" ? {} : ((a as { params?: Record<string, string> }).params ?? {});
    return val.toLowerCase().includes(me.toLowerCase()) && String(params.PARTSTAT).toUpperCase() === "DECLINED";
  });
}

async function readIcs(url: string, from: Date, to: Date): Promise<Raw[]> {
  const res = await fetch(url, { cache: "no-store", headers: { "user-agent": "bribe-desk" } });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  const data = ical.sync.parseICS(await res.text());
  const me = process.env.CAL_EMAIL;
  const out: Raw[] = [];
  for (const item of Object.values(data)) {
    if (!item || item.type !== "VEVENT") continue;
    const ev = item as VEvent;
    if (ev.transparency === "TRANSPARENT" || ev.status === "CANCELLED" || declined(ev, me)) continue;
    const summary = typeof ev.summary === "string" ? ev.summary : ((ev.summary as { val?: string })?.val ?? "");
    if (ev.rrule) {
      for (const inst of ical.expandRecurringEvent(ev, { from, to })) {
        out.push({ start: new Date(inst.start), end: new Date(inst.end), summary: String(inst.summary ?? summary), allDay: inst.isFullDay });
      }
    } else if (ev.start && ev.end) {
      const s = new Date(ev.start), e = new Date(ev.end);
      if (e >= from && s <= to) out.push({ start: s, end: e, summary, allDay: ev.datetype === "date" });
    }
  }
  return out;
}

function sample(from: number): CalEvent[] {
  const ev: CalEvent[] = [];
  const at = (d: number, h: number, m: number) => new Date(from + d * DAY + (h * 60 + m) * 60_000).toISOString();
  for (let d = 0; d < 7; d++) {
    const dow = new Date(from + d * DAY + IST).getUTCDay();
    if (dow === 0) { ev.push({ start: at(d, 0, 0), end: at(d, 23, 59), kind: "out", title: null }); continue; }
    ev.push({ start: at(d, 10, 0), end: at(d, 10, 30), kind: "meeting", title: null });
    ev.push({ start: at(d, 14, 0), end: at(d, 16, 30), kind: "focus", title: "Building" });
    if (d % 2 === 0) ev.push({ start: at(d, 12, 0), end: at(d, 13, 0), kind: "meeting", title: null });
    if (d % 3 === 1) ev.push({ start: at(d, 17, 30), end: at(d, 18, 30), kind: "meeting", title: null });
  }
  return ev;
}

const g = globalThis as unknown as { __cal?: { at: number; v: { events: CalEvent[]; sample: boolean } } };

export async function calendar(now = Date.now()): Promise<{ events: CalEvent[]; sample: boolean }> {
  if (g.__cal && now - g.__cal.at < TTL) return g.__cal.v;
  const from = istMidnight(now);
  const priv = process.env.ICS_PRIVATE_URL;
  const pub = process.env.ICS_PUBLIC_URL;
  if (!priv && !pub) return { events: sample(from), sample: true };

  const range = [new Date(from), new Date(from + 7 * DAY)] as const;
  const map = (raws: Raw[], showTitle: boolean): CalEvent[] =>
    raws.map((r) => {
      const kind = r.allDay ? (kindOf(r.summary) === "out" ? "out" : null) : kindOf(r.summary);
      if (!kind) return null;
      return { start: r.start.toISOString(), end: r.end.toISOString(), kind, title: showTitle ? r.summary.slice(0, 60) : null };
    }).filter(Boolean) as CalEvent[];

  try {
    const [a, b] = await Promise.all([
      priv ? readIcs(priv, ...range) : Promise.resolve([]),
      pub ? readIcs(pub, ...range) : Promise.resolve([]),
    ]);
    const events = [...map(a, false), ...map(b, true)].sort((x, y) => x.start.localeCompare(y.start));
    const v = { events, sample: false };
    g.__cal = { at: now, v };
    return v;
  } catch (e) {
    console.error("calendar", e);
    return g.__cal?.v ?? { events: [], sample: false };
  }
}

/** What the head should be doing right now. */
export function moodOf(events: CalEvent[], now = Date.now()): { mood: Mood; until: string | null } {
  const h = new Date(now + IST).getUTCHours();
  if (h >= 23 || h < 7) {
    const wake = istMidnight(now) + (h >= 23 ? DAY : 0) + 7 * 3_600_000;
    return { mood: "asleep", until: new Date(wake).toISOString() };
  }
  const cur = events.filter((e) => Date.parse(e.start) <= now && Date.parse(e.end) > now);
  const pick = cur.find((e) => e.kind === "meeting") ?? cur.find((e) => e.kind === "out") ?? cur.find((e) => e.kind === "focus");
  if (!pick) return { mood: "free", until: null };
  return { mood: pick.kind === "meeting" ? "call" : pick.kind, until: pick.end };
}
