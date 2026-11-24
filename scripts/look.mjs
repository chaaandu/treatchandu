// Visual pass over the dot avatar: node scripts/look.mjs [base]
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3077";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
const open = async (path, w = 1440, h = 900, mobile = false) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem("desk.seen", "-1"));
  await p.goto(base + path, { waitUntil: "networkidle" });
  await p.waitForFunction(() => window.__bus && window.__bus.head.x > 0, null, { timeout: 40000 });
  await p.waitForTimeout(800);
  return p;
};
const shot = (p, n) => p.screenshot({ path: `.cache/shots/l-${n}.png` });

let p = await open("/?mood=free");
await p.mouse.move(400, 300, { steps: 5 }); await p.waitForTimeout(900); await shot(p, "1-hero");
await p.click('[data-slot="laddoo"] .sticker');
await p.waitForTimeout(380); await shot(p, "2-present");
await p.waitForTimeout(520); await shot(p, "3-pour");
await p.waitForTimeout(900); await shot(p, "4-hearts");
await p.close();

p = await open("/?mood=free&sugar=0.95");
await p.mouse.move(700, 200, { steps: 3 });
await p.waitForTimeout(2600); await shot(p, "5-cold");
await p.waitForFunction(() => document.querySelector(".bubble span")?.textContent?.includes("ACHOO"), null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(120); await shot(p, "6-sneeze");
await p.getByRole("button", { name: /Burn it off/ }).click();
await p.waitForTimeout(1500); await shot(p, "7-header");
await p.waitForTimeout(1400); await shot(p, "8-header2");
await p.close();

p = await open("/?mood=call");
await p.getByRole("button", { name: /Dress him up/ }).click();
await p.getByRole("button", { name: "Midnight" }).click();
await p.getByRole("button", { name: "Crown" }).click();
await p.getByRole("button", { name: "Heart" }).click();
await p.waitForTimeout(900); await shot(p, "9-dress");
await p.getByRole("button", { name: "Close" }).first().click();
await p.getByRole("button", { name: "Sweet box" }).click({ force: true }).catch(() => {});
await p.evaluate(() => document.getElementById("queue").scrollIntoView({ behavior: "instant" }));
await p.waitForTimeout(1200); await shot(p, "10-docked");
await p.close();

p = await open("/?mood=free", 390, 844, true);
await shot(p, "11-mobile");
await p.close();
console.log(errs.slice(0, 8).join("\n") || "no errors");
await b.close();
