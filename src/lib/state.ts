import "server-only";
import { calendar, moodOf } from "./calendar";
import { scoreOf, sugarOf } from "./score";
import { store } from "./store";
import { SWEET } from "./sweets";
import type { DeskState, Offer, PublicToken, Req } from "./types";

export function publicToken(r: Req, offers: Offer[], now: number, reveal = false): PublicToken {
  const mine = offers.filter((o) => o.request_id === r.id);
  const sweets = mine.map((o) => ({ sweet: o.sweet, qty: o.qty, state: o.state }));
  return {
    token_no: r.token_no,
    name: r.name,
    title: r.private && !reveal ? null : r.title,
    need: r.need,
    status: r.status,
    pinned: r.pinned,
    served_url: r.private && !reveal ? "" : r.served_url,
    note: r.private && !reveal ? "" : r.note,
    created_at: r.created_at,
    updated_at: r.updated_at,
    score: scoreOf(r, offers, now),
    sweets,
  };
}

export async function deskState(): Promise<DeskState> {
  const now = Date.now();
  const s = store();
  const [requests, offers, board, work, cal] = await Promise.all([s.requests(), s.offers(), s.board(), s.work(), calendar(now)]);
  const { mood, until } = moodOf(cal.events, now);

  const open = requests.filter((r) => r.status !== "served" && r.status !== "bitter");
  const closed = requests
    .filter((r) => r.status === "served" || r.status === "bitter")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 12);
  const queue = [
    ...open.map((r) => publicToken(r, offers, now)).sort((a, b) => b.score - a.score),
    ...closed.map((r) => publicToken(r, offers, now)),
  ];

  const people = new Map<string, DeskState["ledger"][number]>();
  for (const o of offers) {
    const key = o.name.trim();
    const p = people.get(key.toLowerCase()) ?? { name: key, points: 0, delivered: 0, promised: 0, kcal: 0 };
    const pts = SWEET[o.sweet].points * o.qty;
    if (o.state === "delivered") { p.delivered += o.qty; p.points += pts; p.kcal += SWEET[o.sweet].kcal * o.qty; }
    else { p.promised += o.qty; p.points += pts / 2; }
    people.set(key.toLowerCase(), p);
  }
  const ledger = [...people.values()].sort((a, b) => b.points - a.points);
  const jar = offers
    .flatMap((o) => Array.from({ length: Math.min(o.qty, 12) }, () => ({ name: o.name, sweet: o.sweet, state: o.state, at: o.delivered_at || o.created_at })))
    .sort((a, b) => a.at.localeCompare(b.at));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return {
    now: new Date(now).toISOString(),
    mood,
    moodUntil: until,
    sugar: sugarOf(offers, now),
    calendar: cal,
    board,
    work,
    queue,
    ledger,
    jar,
    kcal: ledger.reduce((s, p) => s + p.kcal, 0),
    sweets: {
      total: offers.reduce((s, o) => s + o.qty, 0),
      delivered: offers.filter((o) => o.state === "delivered").reduce((s, o) => s + o.qty, 0),
    },
    live: url && key ? { supabaseUrl: url, supabaseKey: key } : null,
  };
}
