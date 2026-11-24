import { after } from "next/server";
import { notify } from "@/lib/notify";
import { clean, cleanBlock, cleanUrl, humanCheck, id, ipHash, slug } from "@/lib/server";
import { publicToken } from "@/lib/state";
import { store } from "@/lib/store";
import { parseSweets, sweetLine } from "@/lib/sweets";
import type { Need, Offer } from "@/lib/types";

const NEEDS: Need[] = ["today", "tomorrow", "week", "whenever"];
const PER_DAY = 5;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  if (body.website) return Response.json({ error: "Bad request" }, { status: 400 }); // honeypot

  const name = clean(body.name, 40);
  const title = clean(body.title, 120);
  if (!name || !title) return Response.json({ error: "Add your name and what you need." }, { status: 400 });
  if (!(await humanCheck(body.cf))) return Response.json({ error: "Couldn't check you're human. Try again." }, { status: 400 });

  const ip = ipHash(req);
  const s = store();
  const since = Date.now() - 86_400_000;
  const recent = (await s.requests()).filter((r) => r.ip_hash === ip && Date.parse(r.created_at) > since).length;
  if (recent >= PER_DAY) return Response.json({ error: "That's 5 today. Come back tomorrow, with sweets." }, { status: 429 });

  const now = new Date().toISOString();
  const r = await s.createRequest({
    id: id(),
    slug: slug(),
    name,
    title,
    detail: cleanBlock(body.detail, 2000),
    link: cleanUrl(body.link),
    need: NEEDS.includes(body.need as Need) ? (body.need as Need) : "whenever",
    private: body.private === true,
    status: "issued",
    pinned: false,
    served_url: "",
    note: "",
    ip_hash: ip,
    created_at: now,
    updated_at: now,
  });

  const sweets = parseSweets(body.sweets);
  const offers: Offer[] = sweets.map(([sweet, qty]) => ({ id: id(), request_id: r.id, name, sweet, qty, state: "promised", created_at: now }));
  await s.addOffers(offers);

  const origin = process.env.SITE_URL || new URL(req.url).origin;
  after(() => notify(`🍬 Token #${r.token_no} from ${name}: ${title} (${sweetLine(sweets)}, ${r.need})`, `${origin}/kitchen`));

  return Response.json({ slug: r.slug, token: publicToken(r, offers, Date.now(), true) });
}
