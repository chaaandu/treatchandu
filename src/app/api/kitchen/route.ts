import { isKitchen, clean, cleanUrl } from "@/lib/server";
import { store } from "@/lib/store";
import type { Lane, Status, Work } from "@/lib/types";

const STATUSES: Status[] = ["issued", "tasting", "stove", "served", "bitter"];
const LANES: Lane[] = ["now", "next", "later", "done"];

export async function GET(req: Request) {
  if (!isKitchen(req)) return Response.json({ error: "Wrong key" }, { status: 401 });
  const s = store();
  const [requests, offers, board, work] = await Promise.all([s.requests(), s.offers(), s.board(), s.work()]);
  const safe = requests.map((r) => { const { ip_hash, ...rest } = r; void ip_hash; return rest; }).reverse();
  return Response.json({ requests: safe, offers, board, work });
}

export async function POST(req: Request) {
  if (!isKitchen(req)) return Response.json({ error: "Wrong key" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = store();
  const rid = String(b.id ?? "");
  switch (b.action) {
    case "status":
      if (!STATUSES.includes(b.status as Status)) break;
      await s.updateRequest(rid, { status: b.status as Status, served_url: cleanUrl(b.served_url), note: clean(b.note, 300) });
      return Response.json({ ok: true });
    case "pin":
      await s.updateRequest(rid, { pinned: b.pinned === true });
      return Response.json({ ok: true });
    case "delete":
      await s.deleteRequest(rid);
      return Response.json({ ok: true });
    case "delivered":
      await s.updateOffer(rid, b.delivered === false ? { state: "promised", delivered_at: null } : { state: "delivered", delivered_at: new Date().toISOString() });
      return Response.json({ ok: true });
    case "lane":
      if (!LANES.includes(b.lane as Lane)) break;
      await s.updateBoard(rid, { lane: b.lane as Lane, ...(typeof b.title === "string" ? { title: clean(b.title, 90) } : {}) });
      return Response.json({ ok: true });
    case "work": {
      const w = b.work as Partial<Work>;
      if (!w?.title) break;
      await s.saveWork({
        id: clean(w.id, 40) || `w${Date.now()}`,
        title: clean(w.title, 60),
        url: cleanUrl(w.url),
        when: clean(w.when, 30),
        blurb: clean(w.blurb, 160),
        metric: clean(w.metric, 30),
        hue: Number.isFinite(w.hue) ? Math.round(Number(w.hue)) % 360 : 20,
        sort: Number.isFinite(w.sort) ? Number(w.sort) : 99,
      });
      return Response.json({ ok: true });
    }
    case "work-delete":
      await s.deleteWork(rid);
      return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
