import "server-only";

/**
 * Tells Chandu about a new token. Every channel is optional; all configured ones fire.
 *  WhatsApp: CallMeBot (free, to your own number): CALLMEBOT_PHONE + CALLMEBOT_KEY
 *  Slack:    SLACK_WEBHOOK_URL
 *  Email:    RESEND_API_KEY + NOTIFY_EMAIL (+ NOTIFY_FROM)
 * Failures never block the request.
 */
export async function notify(text: string, link: string) {
  const jobs: Promise<unknown>[] = [];
  const full = `${text}\n${link}`;

  const phone = process.env.CALLMEBOT_PHONE, key = process.env.CALLMEBOT_KEY;
  if (phone && key) {
    const u = new URL("https://api.callmebot.com/whatsapp.php");
    u.searchParams.set("phone", phone);
    u.searchParams.set("text", full);
    u.searchParams.set("apikey", key);
    jobs.push(fetch(u, { cache: "no-store" }));
  }

  const slack = process.env.SLACK_WEBHOOK_URL;
  if (slack) jobs.push(fetch(slack, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: full }) }));

  const resend = process.env.RESEND_API_KEY, to = process.env.NOTIFY_EMAIL;
  if (resend && to) {
    jobs.push(fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resend}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.NOTIFY_FROM || "Bribe Desk <desk@resend.dev>", to, subject: text.slice(0, 120), text: full }),
    }));
  }

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => r.status === "rejected" && console.error("notify", r.reason));
}
