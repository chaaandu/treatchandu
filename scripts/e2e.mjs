// Drives the real page: feed a sweet, submit a token, flip the head, scroll every section.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3077";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const out = process.argv[5] || ".cache/shots/e2e";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 700 });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(base, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await p.mouse.move(W * 0.75, H * 0.25, { steps: 6 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}-1-hero.png` });

// drag the kaju katli onto the head
const slot = await p.locator('[data-slot="kaju"]').boundingBox();
const head = await p.locator("#head-slot").boundingBox();
await p.mouse.move(slot.x + slot.width / 2, slot.y + slot.height * 0.4);
await p.mouse.down();
await p.mouse.move(W * 0.62, H * 0.55, { steps: 10 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}-2-holding.png` });
await p.mouse.move(head.x + head.width / 2, head.y + head.height * 0.55, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(900);
await p.screenshot({ path: `${out}-3-eating.png` });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}-4-sheet.png` });

await p.fill('input[autocomplete="given-name"]', "Riya");
await p.fill("#ask-title", "Review the IBP 2 rubric before Friday");
await p.getByRole("button", { name: "Add Gulab jamun" }).click();
await p.getByRole("button", { name: "Add Gulab jamun" }).click();
await p.getByRole("button", { name: "Get my token" }).click();
await p.waitForTimeout(2600);
await p.screenshot({ path: `${out}-5-token.png` });
const tokenUrl = await p.locator(".copy input").inputValue();

// a private one, no sweets
await p.getByRole("button", { name: "Ask something else" }).click();
await p.fill("#ask-title", "Salary chat, private");
await p.locator(".toggle").click();
await p.getByRole("button", { name: /Get my token/ }).click();
await p.waitForTimeout(1200);
await p.keyboard.press("Escape");
await p.waitForTimeout(800);

await p.getByRole("radio", { name: "Real" }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: `${out}-6-dissolve.png` });
await p.waitForTimeout(1600);
await p.screenshot({ path: `${out}-7-real.png` });

await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1500);
let i = 0;
for (const id of ["stove", "hours", "queue", "work", "ledger"]) {
  await p.locator(`#${id}`).scrollIntoViewIfNeeded();
  await p.evaluate((id) => document.getElementById(id).scrollIntoView({ block: "start", behavior: "instant" }), id);
  await p.waitForTimeout(700);
  await p.mouse.move(W * 0.4, H * 0.5, { steps: 3 });
  await p.screenshot({ path: `${out}-s${++i}-${id}.png` });
}
await p.goto(tokenUrl, { waitUntil: "networkidle" });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}-t-page.png` });
console.log(tokenUrl, "\n", errs.slice(0, 10).join("\n") || "no errors");
await b.close();
