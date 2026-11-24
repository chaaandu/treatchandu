# Bribe Desk

`treatchandu.vercel.app`: Chandu's public counter. You can see what he's building and when to catch him, get in the queue, and pay in sweets to move up. No logins.

- **The head**: Chandu's face printed as ~9,000 halftone dots, each on a spring, with depth from Depth Anything V2 so it turns in 3D. It follows your cursor, and its moods follow sugar:
  - Fed: the sweet turns to dots and pours into his mouth, his cheeks puff, a yellow sugar wave runs over his face, and his eyes turn into hearts.
  - Sugar rush (55%+): jittery, random heart eyes.
  - Too much (85%+): a cold. Watery eyes, a runny nose, and a sneeze every few seconds that scatters the whole face.
  - **Burn it off**: a football bounces off his head six times; every header burns sugar.
  - Headphones on calls, eyes closed after 11 pm IST.
- **Dress him up**: visitors pick the print colours, the dot shape (round, square, kaju, heart, star) and something to wear (shades, sweatband, party hat, crown, halo). It's saved on their device and only they see it.
- **The counter**: six sweets (kaju katli, gulab jamun, laddoo, rasgulla, jalebi, chocolate). Tap one or drag it anywhere and it goes into your bribe.
- **01 On the stove**: the to-do list as kitchen tickets.
- **02 Counter hours**: the next 7 days from Google Calendar, plus the best time to catch him.
- **03 The queue**: requests as thermal tokens, sorted by `urgency + sweets + days waiting`. Ants find the sweet ones.
- **04 The display case**: shipped work.
- **05 The sweet ledger**: the jar, kcal delivered, who paid and who owes.
- `/t/<token>`: a requester's private page (status, add more sweets).
- `/kitchen`: Chandu's back room (passphrase).

## Run locally

```bash
npm install
cp .env.example .env.local   # all optional for local; /kitchen key is "dev" when KITCHEN_KEY is empty
npm run dev
```

Preview states: `/?mood=asleep`, `/?mood=call`, `/?mood=focus`, `/?mood=out`, and sugar with `/?sugar=0.7` (rush) or `/?sugar=0.95` (cold).

## Go live (Vercel)

1. **Supabase**: create a NEW project (Mumbai). In the SQL editor, run `supabase/schema.sql`. Copy the URL, the secret key, and the publishable key.
2. **Calendar** (see below): copy the secret iCal address.
3. **WhatsApp alerts** (CallMeBot, free, to your own number): follow the "Free WhatsApp API" steps at callmebot.com. You send their bot one WhatsApp message and get an API key back.
4. **Vercel**: the project `treatchandu` (team Mesa-Forge) deploys `main` of github.com/chaaandu/treatchandu automatically; other branches get preview links. Add the env vars from `.env.example` in Vercel → Settings → Environment Variables (at least `KITCHEN_KEY`, the Supabase ones and `ICS_PRIVATE_URL`). Until Supabase is set, the live site keeps tokens in memory only, so they vanish on redeploy.
5. **Own domain later** (optional): add it in Vercel → Domains, then a `CNAME` pointing at `cname.vercel-dns.com`.

## Calendar: exactly what to send

1. Open Google Calendar on the web, click the gear, then **Settings**.
2. On the left, under **Settings for my calendars**, click your calendar.
3. Scroll to **Integrate calendar**, find **Secret address in iCal format**, and copy it.
4. Put it in `ICS_PRIVATE_URL`. Treat it like a password: anyone with it can read your calendar.

What the page shows from it: only blocks, never titles. A block whose title says "focus", "deep work" or "build" shows as **Focus**. One that says "OOO", "leave" or "travel" shows as **Out**. Everything else shows as **Busy**. Events you marked free, or declined (with `CAL_EMAIL` set), don't show.

Want some titles public? Create a second calendar (for example "Bribe Desk"), put those events there, and set its secret address as `ICS_PUBLIC_URL`.

If **Secret address** is missing, your Workspace admin has turned it off. Ask them to allow it for your account, or tell Claude and it will set up an Apps Script feed instead.

## Head assets

1. `node scripts/avatar.mjs` cuts the photo out (MODNet) and estimates depth (Depth Anything V2 Small). Both models are Apache-2.0 and download once into `.cache/`. It writes `public/head/real/color.webp` and `assets/head/real-depth.png`. The source photo (`assets/source/3.png`) stays out of git.
2. `node scripts/dots.mjs` turns those into `public/head/dots.bin` (x, y, z and size per dot) plus `dots.json` (landmarks for eyes, mouth and nose). If you use a new photo, re-read the landmarks at the top of the script.

## Checks

```bash
npx tsc --noEmit && npx eslint src && npx next build
node scripts/look.mjs  # with `npm run dev -- -p 3077` running: eating, cold + sneeze, football, dress-up, docked, mobile → .cache/shots
```
