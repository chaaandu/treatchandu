const IST = 19_800_000;
const DAY = 86_400_000;

const ist = (t: number | string) => new Date((typeof t === "string" ? Date.parse(t) : t) + IST);

/** "4:30 pm" */
export function hm(t: number | string) {
  const d = ist(t);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

/** "Tue 24" */
export function dayLabel(t: number | string) {
  const d = ist(t);
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]} ${d.getUTCDate()}`;
}

export const istMidnight = (t: number) => Math.floor((t + IST) / DAY) * DAY - IST;
export const istHour = (t: number | string) => { const d = ist(t); return d.getUTCHours() + d.getUTCMinutes() / 60; };

/** "3 min ago", "2 days ago" */
export function ago(t: string, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(t)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export const pad = (n: number, w = 2) => String(n).padStart(w, "0");
