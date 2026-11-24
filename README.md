# Bribe Desk

`treat.chandumachineni.com`: Chandu's public counter. You can see what he's building and when to catch him, get in the queue, and pay in sweets to move up. No logins.

- **The head**: Chandu's face as a real 3D surface: a cut-out photo pushed into depth by Depth Anything V2. It follows your cursor, chews what you feed it, wears headphones when the calendar says he's on a call, and sleeps after 11 pm IST. Switch between **3D** and **Real**.
- **The counter**: 3D mithai built in code. Drag one onto his face, or tap it, and it joins your bribe.
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

Preview states: `/?mood=asleep`, `/?mood=call`, `/?mood=focus`, `/?mood=out`.

## Go live (Vercel)

1. **Supabase**: create a NEW project (Mumbai). In the SQL editor, run `supabase/schema.sql`. Copy the URL, the secret key, and the publishable key.
2. **Calendar** (see below): copy the secret iCal address.
3. **WhatsApp alerts** (CallMeBot, free, to your own number): follow the "Free WhatsApp API" steps at callmebot.com. You send their bot one WhatsApp message and get an API key back.
4. **Vercel**: push this folder to its own repo, import it in Vercel, and add the env vars from `.env.example` (at least `KITCHEN_KEY`, the Supabase ones and `ICS_PRIVATE_URL`).
5. **Domain**: in Vercel, add `treat.chandumachineni.com`. In your DNS, add a `CNAME` for `treat` pointing to `cname.vercel-dns.com`.

## Calendar: exactly what to send

1. Open Google Calendar on the web, click the gear, then **Settings**.
2. On the left, under **Settings for my calendars**, click your calendar.
3. Scroll to **Integrate calendar**, find **Secret address in iCal format**, and copy it.
4. Put it in `ICS_PRIVATE_URL`. Treat it like a password: anyone with it can read your calendar.

What the page shows from it: only blocks, never titles. A block whose title says "focus", "deep work" or "build" shows as **Focus**. One that says "OOO", "leave" or "travel" shows as **Out**. Everything else shows as **Busy**. Events you marked free, or declined (with `CAL_EMAIL` set), don't show.

Want some titles public? Create a second calendar (for example "Bribe Desk"), put those events there, and set its secret address as `ICS_PUBLIC_URL`.

If **Secret address** is missing, your Workspace admin has turned it off. Ask them to allow it for your account, or tell Claude and it will set up an Apps Script feed instead.

## Head assets

`node scripts/avatar.mjs` rebuilds `public/head/{toon,real}` from `assets/source/6.png` (toon) and `3.png` (real). It uses open models: MODNet for the cut-out and Depth Anything V2 Small for depth, both Apache-2.0, downloaded once into `.cache/`.

## Checks

```bash
npx tsc --noEmit && npx eslint src && npx next build
node scripts/e2e.mjs   # with `npm run dev -- -p 3077` running: feeds a sweet, prints a token, flips the head, screenshots every section into .cache/shots
```
