import { SWEET } from "./sweets";
import type { Need, Offer, Req } from "./types";

const URGENCY: Record<Need, number> = { today: 10, tomorrow: 7, week: 4, whenever: 1 };
const DAY = 86_400_000;

/** score = urgency + sweets (promised count half) + days waiting. Pinned floats to the top. */
export function scoreOf(r: Req, offers: Offer[], now = Date.now()) {
  const sweets = offers
    .filter((o) => o.request_id === r.id)
    .reduce((s, o) => s + SWEET[o.sweet].points * o.qty * (o.state === "delivered" ? 1 : 0.5), 0);
  const waiting = Math.max(0, (now - Date.parse(r.created_at)) / DAY);
  return Math.round((URGENCY[r.need] + sweets + waiting * 1.5) * 10) / 10 + (r.pinned ? 1000 : 0);
}

/** Sugar level: every sweet adds sugar, which decays with a 3-day half-life. 0..1 */
export function sugarOf(offers: Offer[], now = Date.now()) {
  const raw = offers.reduce((s, o) => {
    const at = Date.parse(o.delivered_at || o.created_at);
    const w = o.state === "delivered" ? 1 : 0.4;
    return s + SWEET[o.sweet].points * o.qty * w * Math.pow(0.5, (now - at) / (3 * DAY));
  }, 0);
  return 1 - Math.exp(-raw / 30);
}
