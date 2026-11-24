import { after } from "next/server";
import { notify } from "@/lib/notify";
import { id } from "@/lib/server";
import { publicToken } from "@/lib/state";
import { store } from "@/lib/store";
import type { Offer } from "@/lib/types";
import { parseSweets, sweetLine } from "@/lib/sweets";

async function find(slug: string) {
  const s = store();
  const [requests, offers] = await Promise.all([s.requests(), s.offers()]);
  const r = requests.find((x) => x.slug === slug);
  return { r, offers };
}

export async function GET(_req: Request, ctx: RouteContext<"/api/t/[slug]">) {
  const { slug } = await ctx.params;
  const { r, offers } = await find(slug);
  if (!r) return Response.json({ error: "No such token" }, { status: 404 });
  return Response.json({ token: publicToken(r, offers, Date.now(), true), detail: r.detail, link: r.link, private: r.private });
}

/** Add more sweets to your own token. */
export async function POST(req: Request, ctx: RouteContext<"/api/t/[slug]">) {
  const { slug } = await ctx.params;
  const { r, offers } = await find(slug);
  if (!r) return Response.json({ error: "No such token" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sweets = parseSweets(body.sweets);
  if (!sweets.length) return Response.json({ error: "Pick a sweet" }, { status: 400 });
  if (offers.filter((o) => o.request_id === r.id).length > 30) return Response.json({ error: "That's plenty of sweets." }, { status: 429 });
  const now = new Date().toISOString();
  const add: Offer[] = sweets.map(([sweet, qty]) => ({ id: id(), request_id: r.id, name: r.name, sweet, qty, state: "promised", created_at: now }));
  await store().addOffers(add);
  after(() => notify(`🍬 More sweets on #${r.token_no} from ${r.name}: ${sweetLine(sweets)}`, ""));
  return Response.json({ token: publicToken(r, [...offers, ...add], Date.now(), true) });
}
