# Chandu's Desk: architecture (draft 1, 24 Nov 2026)

Working name. To-do #7 on Chandu's list.

## 1. The idea in one line

A public sweet-shop counter where Chandu is both the shopkeeper and the customer.
The team walks up, sees what he's cooking (calendar, now/next, shipped work),
gets a token for their request, and pays in sweets to jump the queue. His real face
watches your cursor and cares about one thing: what sweet you're holding.

Why it works: everything on the page serves one metaphor (a halwai counter), so the
crazy parts are not decoration. The head is the status light, the sweets are the
priority system, the token is the ticket, the display case is the portfolio.

## 2. The page (one scroll, five parts)

1. **The Head** (hero). Chandu's real face, looking at your cursor. It is also his live
   status, driven by the calendar and the clock:
   - free: watching you, hungry
   - in a meeting: headphones, eyes on "screen", glances at you if you hold a sweet
   - focus block: squinting at code; sweets still accepted
   - after 23:00 IST: asleep (zzz); hovering wakes him for one blink
   - sweet offered: mouth opens, eyes go wide, chews, happy
   - request with no sweet: one raised eyebrow
2. **Now / Next.** What he's on right now (from a calendar focus block or the board),
   then the 11-item to-do board (now, next, later, done). "Last shipped 14 min ago"
   from the GitHub pulse.
3. **Counter hours** (calendar). Today + the week as a shop-hours strip: meetings,
   focus, out. Titles only for events on a separate "Public" calendar; everything
   else is a plain busy block. The best free slot to catch him is highlighted.
4. **The Queue** (requests). Each request is a thermal-paper token: number, who, what,
   by when, sweets attached, status. Statuses use kitchen words:
   `Token issued → Tasting → On the stove → Served (with link) | Too bitter (with reason)`.
5. **The Display Case** (work so far). A glass mithai counter with trays. Each shipped
   thing is a box: name, URL, screenshot, date, one real number (e.g. "67 students
   pitched"). Plus a ship-streak heatmap from GitHub (counts only, never commit text:
   commit messages contain student names).

Footer: the Sweet Ledger (who promised, who delivered) and a running "kcal bribed" total.

## 3. The head

**Recommended: photoreal 2.5D gaze grid.** From 3 to 5 good selfies, generate a grid of
frames with LivePortrait (open source; on Replicate as an expression editor with yaw,
pitch, pupil, smile, blink, eyebrow, wink controls).

- Gaze grid 7 × 7 = 49 frames (yaw ±20°, pitch ±15°, pupils follow)
- Expression sets, each ~9 frames: hungry, delighted/chewing, eyebrow, sleepy, headphones
- ~120 frames as WebP, ~15 to 25 KB each; load the neutral grid first, the rest lazily
- Frame choice: angle from head centre to the cursor, eased with a spring (no linear lerp),
  small idle drift + blink every 3 to 6 s so it never looks frozen
- Phone: gyroscope tilt drives the gaze; tap a sweet to feed
- Reduced motion: one still frame per state

It's your actual face, it runs on any phone, and it's cheap to host (no WebGL needed).
A true 3D bust from a photo (Tripo / Rodin / Meshy → GLB) looks like a game asset and has
no expressions unless rigged by hand.

**3D is spent on the sweets instead** (three.js via react-three-fiber + Rapier physics):
procedural mithai, no downloads needed:
- laddoo: noisy sphere with a bump map and boondi grain
- kaju katli: extruded diamond with a silver-vark foil shader (crinkled, iridescent)
- gulab jamun: glossy dark sphere with a syrup clearcoat
- jalebi: tube along a spiral curve, orange with subsurface glow
- rasgulla, barfi, plus Western ones from Microsoft Fluent 3D emoji (MIT): 🍩 🍫 🍪 🧁 🍦

You drag a sweet across the page; it falls with physics into his mouth.

## 4. The sweets economy

| Sweet | Points | kcal |
|---|---|---|
| Kaju katli (box) | 8 | 520 |
| Gulab jamun (2) | 5 | 300 |
| Laddoo | 4 | 190 |
| Jalebi | 3 | 150 |
| Chocolate | 2 | 230 |
| Chai (not a sweet, but) | 1 | 90 |

(Numbers to tune. kcal from Open Food Facts / IFCT.)

**Priority, shown on the page in one line:**
`score = urgency + sweets + days waiting`
- Sweets count half when promised and full when delivered (Chandu taps "got it").
- Days waiting means every request rises over time, so no one starves without a bribe
  (aging, the old operating-system scheduling trick).
- Chandu can pin anything to the top.

**Sugar meter** (global): goes up with every delivered sweet and decays with a 3-day
half-life. Low sugar: the head is hangry. High: sugar rush, confetti on the counter.

## 5. The live layer (multiplayer)

Supabase Realtime presence + broadcast, no login:
- Every visitor's cursor shows as a small sweet with a name tag, in the purple
  cursor-label style from chandumachineni.com.
- The head looks at your cursor, unless someone else holds a better sweet; then he
  gets distracted and looks at theirs. It turns the page into a small game.
- When someone feeds him, everyone currently on the page sees it fly.
- Typing a sweet's name anywhere ("kaju") spawns it.

## 6. Data sources

| What | Source | How |
|---|---|---|
| Calendar | Google Calendar | Secret iCal address (no OAuth), or share with a service account. Cron every 5 min. Titles only from the "Public" calendar |
| Now / Next | Supabase `board`, seeded from the 11 to-dos | Chandu edits at /kitchen or asks Claude |
| Ship pulse | GitHub API (fine-grained token, server only) | Daily commit + deploy counts. Never commit messages |
| Work | Supabase `work` | Curated; screenshots taken once with Playwright at build time |
| Sweets | Static catalogue | kcal from Open Food Facts / IFCT |
| Head frames | LivePortrait on Replicate | Generated once, stored in /public |

## 7. Architecture

```
Browser (Next.js page, RSC + client islands)
  ├─ Head: <canvas> sprite player (WebP frames), spring-eased gaze
  ├─ Sweets: react-three-fiber + Rapier (lazy-loaded on first interaction)
  ├─ Presence: Supabase Realtime channel "counter"
  └─ UI: Motion springs, CSS grid
        │
Vercel (separate project, own repo)
  ├─ GET  /api/state          everything for the page, cached 30 s
  ├─ POST /api/requests       new token (Turnstile + rate limit)
  ├─ POST /api/offers         attach a sweet (promised)
  ├─ GET  /t/[slug]           a requester's private token page
  ├─ POST /api/kitchen/*      Chandu's actions (passphrase in env)
  ├─ CRON /api/cron/calendar  every 5 min → cal_events
  ├─ CRON /api/cron/pulse     hourly → pulse
  └─ OG   /api/og/[token]     share card "Token #47: Chandu owes me"
        │
Supabase (NEW project, no student data, nothing from Forge)
  people(id, name, face_url, color)
  requests(id, token_no, slug, person_id, title, detail, link, need_by,
           visibility public|private, status, pinned, served_url, note, created_at)
  offers(id, request_id, person_id, sweet, qty, state promised|delivered, created_at)
  board(id, todo_no, title, lane now|next|later|done, sort)
  work(id, title, url, shipped_on, blurb, metric, image, sort)
  cal_events(uid, start_at, end_at, kind meeting|focus|out, public_title)
  pulse(day, commits, deploys)
        │
Notify Chandu: Slack DM webhook / email (Resend) / WhatsApp, his pick
```

**No login, still safe:**
- Visitors pick their name from the team list (remembered on the device). Not auth, just identity.
- Cloudflare Turnstile (invisible) + per-IP rate limit (5 requests a day) + honeypot field.
- Private requests show publicly as "Private request from Riya", title hidden.
- Each token gets an unguessable link so the requester can check status.
- Only Chandu changes statuses: /kitchen with a passphrase from env (one person, no accounts).
- RLS on: the browser reads only through /api/state; Supabase writes only from the server.

## 8. Design system: loud shell, quiet core

Maximal at the edges (head, sweets, signboard), strictly minimal where people read
(queue, calendar, board). Copy stays minimal: only what someone needs to act.

What it borrows, and from where:
- **Chandu's own brand** (base): condensed editorial serif + mono, dotted paper grid,
  purple cursor tag. It should feel like his site's mischievous sibling.
- **Indian halwai signboards**: hand-painted display type for very few words only
  (Rozha One / Yatra One), marigold, rani pink and kesar orange accents on warm paper,
  silver-vark foil as the one shiny material.
- **Swiss / International style**: 12-column grid, tabular numbers, flush-left, for all data.
- **Dieter Rams**: everything earns its place; no explanatory text.
- **2007-era skeuomorphism**, only on physical objects: the thermal token (perforated edge,
  prints line by line), the glass display case.
- **Disney's 12 principles** on the head and sweets: anticipation before the bite,
  squash and stretch on landing, follow-through on the chew.
- **Japanese ma**: big empty space around the head so it breathes.
- **Motion**: springs only, nothing linear; respects reduced motion.
- **Sound**: off by default; a crunch and a "ting" from the shop bell when on.

Easter eggs: 3 am visit (asleep, snoring), Diwali week (diyas on the counter),
Konami code (sugar rush), an untouched sweet left on the counter for a minute (he steals it).

## 9. Build phases

- **P0: the counter opens.** Next.js shell, design tokens, the head (gaze grid only),
  board seeded from the 11 to-dos, display case, calendar via iCal.
- **P1: tokens.** Requests, private token page, notifications, /kitchen, Turnstile, rate limit.
- **P2: sweets.** 3D mithai + physics, offers, ledger, priority score, expressions, sugar meter.
- **P3: alive.** Multiplayer cursors, distracted head, calendar-driven states, pulse heatmap,
  OG share cards, easter eggs, sound.

## 10. Status (24 Nov 2026)

Decided by Chandu: name **Bribe Desk**, domain **treat.chandumachineni.com**, anyone can use it (not just
the Mesa team, so names are free text), WhatsApp first for alerts (Slack + email optional), private requests
hide the title but show the name and sweets, and ants crawl round tokens that had sweets.

Built (v1, runs locally): everything in sections 2 to 8 except the GitHub ship pulse, OG share cards and sound.
The head is a depth-displaced photo (Depth Anything V2 + MODNet) rather than a LivePortrait frame grid, with
both looks (toon from 6.png, real from 3.png) and a burning-edge dissolve between them.

Waiting on Chandu: calendar secret iCal address, new Supabase project, CallMeBot key, the real list of work
for the display case, a Vercel project + DNS for the subdomain.

Next ideas: LivePortrait expression frames (wink, eyebrow, real chewing), GitHub ship pulse (counts only),
OG share card per token, sound, Diwali / 3 am easter eggs.
