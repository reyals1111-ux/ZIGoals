# Session AM, AM-2, AM-3, AR and AS — demo tour (28 minutes)

*AM-2 ("NOVA, STUNNING") changed how everything in NOVA looks; what each step does is as in Session AM. Where the look or a step changed, this tour says so.*

*Session AR ("NOVA, COMPOSED") changed how the populated stage is composed: section 2a. Everything else in this tour works as written.*

Open NOVA. Everything below runs on your own computer with no model, no key and no account.

```
NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev
```

then http://127.0.0.1:3100/app/nova (Chrome, Edge or Safari on a computer; a window of 1440 × 900 or larger shows it best, and a 2560 × 1440 screen shows the whole command centre: wider wings, a larger star, the HUD frame's read-outs).

**The star, first.** Add `?star=why` to the address once: under "STANDBY" a line says how the star is drawn right now ("The star is running" and, below it, the pace, the size and your graphics renderer's name). If the galaxy is ever still, slow or a picture, that line says why in plain words ("Still star: Motion is Off in ZIGoals", "Slow star: Calm motion is on", "Still picture: this browser has no WebGL", …).

## 1. The calm stage (an empty profile, 1 minute)
- NOVA takes the whole window: the app's chrome is gone, **Exit NOVA** (or Esc) is the way back, ⌘/Ctrl + J opens NOVA from any page.
- One living star in the centre: a violet–magenta spiral galaxy with a white core, a dark planet with a lit rim on its orbit, a small moon, and a thin blue light streak that runs across the whole stage. A ring of ticks frames it in its own plane, and inside it, in the same plane, the four pillar rings (today's water, habits, lead goal and what is set aside), so the star and its rings are one instrument. It is the agent. Under it: its state in words ("Standby · Tap to talk") and the greeting. Around the stage: corner brackets and tick rulers (the HUD frame), a floor grid running to a horizon, a near-black sky.
- Nothing else is on the stage. Above the command bar: one-tap requests.
- Leave the window alone for a minute, or click another window: the star slows to a rest pace and the sky stops drifting. Come back and press a key: it wakes.

## 2. Load the Showcase (1 minute)
Settings → **Load Showcase Demo**, then open NOVA again. The Showcase's own arrangement stands around the star (labelled "Showcase · fictional example data"): Health in magenta (a calorie ring, lit meters, hearts), Goals in violet (three arcs and the pace chart), Habits in cyan (today's ring, streaks, the week's columns), Wealth in gold (the figure and its valuation chart), the agenda clock, Today's orbit, Tasks, Notes and Focus. Each is a hologram: cut glass with a bright rim, an inner hairline with corner marks, and a bloom in its own colour.

## 2a. The composed stage (Session AR, 3 minutes)
What to look at with the Showcase loaded, on a window of 1440 × 900 and again as wide as your screen goes:
- **A star with satellites.** Beside the star each wing is a **hero** (a tall panel with one dominant instrument: Health's
  calorie ring, Habits' ring for today), a quieter **supporting** panel under it and, from about 1000 px of window height,
  a **compact plate** (one figure and a small instrument). The right wing is the left one upside down, so the two heroes
  stand top left and bottom right, on the galaxy's long axis. On a wide screen the wings step away from the star tier by
  tier. What does not fit beside the star rests on the band below (scroll the stage: its edges fade).
- **The star makes room.** Close widgets until two are left (the × key in each head, or type **clear the stage** and ask
  for two): the star grows to its large size (its bezel is at least 45 % of the stage). Ask for more (**Show my habits
  this week**, **Show my net worth**, **Which bills are due?**): with each one the star steps back in one short motion,
  down to the size it had before with six or more. Nothing ever covers its bezel. With Motion Off (Settings → Motion) or
  your device's reduced motion the change is instant.
- **A request arrives as a hero.** The widget you ask for is its wing's hero, with the beam from the star; ask again and
  the new one takes the other wing; older ones step down to supporting, a plate, then the band. Your own S / M / L (View →
  Arrange) is kept exactly: while arranging, the panels show in the sizes you gave them, and a widget you made Large is
  always a hero.
- **While the star starts** its place is already the star's: its bezel, dimmed, around a dim core. If its code cannot
  load (offline after an update), the galaxy's still picture stands there and the line under its state says "Still
  picture: the star's code did not load".
- **In a state the star changes shape**: tap the star (listening: a lit ring with long ticks pointing in), ask something
  (thinking: a thick ring in segments), and while it answers (speaking: a ticked rim with two rings).
- **In the conversation** an amount and a date read the way the pages write them ("€435.59", "Nov 2026"); the ring beside
  an answer is that answer's own figure; "Go to …" names the widget the answer made.

## 3. Ask, and a widget is made (4 minutes)
Type in the command bar (or tap a chip). A request NOVA has a widget for is answered under the star, with its figure in one sentence and "Answered on this device · no AI used"; the star thinks, speaks and sends a beam to the widget it projects beside it. "Go to …" in the answer puts the keyboard on that widget. Anything else you type is a conversation: it opens at once, as it always did.

Questions to try:
1. **Show my habits this week** — a cyan lattice: each habit against the last seven days, with streaks.
2. **Am I on track for Japan?** — the goal's own widget (it found the goal by its name), with the pace in words; an estimate, never a promise.
3. **Show my net worth** — gold: the tracked wealth, the change since the first recorded valuation, the line.
4. **What did I spend this month?** and **Which bills are due?**
5. **What's the weather?** — in the Showcase: example values, labelled "Showcase example · not a real reading" (the Showcase asks no service). On your own data: "Weather is off", with what MET Norway would see; turn it on in **NOVA → Permissions → Weather (outside data)**, pick your city, and the widget's look follows the sky (sun, night, cloud, rain, snow, fog, thunder), credited "Data from MET Norway (CC BY 4.0)".
6. **What's my weight progress this month?** — the widget is made **locked**: the Showcase, like a new profile, keeps Health off for NOVA. Open Permissions, turn on Health for NOVA and both switches of ZIGi's Health gate: the widget unlocks in magenta, with the heart on its last reading and the hearts for days logged.
7. Dutch works the same: **Hoe gaat mijn gewicht deze maand?**, **Laat mijn gewoontes zien**, **Wat voor weer is het?**
8. **What can you see?**, **Which model are you using?**, **What did I ask before?**, **show the time**.

## 4. Pin, hide, close, open (2 minutes)
- Every widget's head has three keys, always in view at every width: **Pin** (a pin; lit when the widget is pinned), **Hide** (a bar, as a window's minimise) and **Close** (a cross; it warms under the pointer), then an arrow that opens its full page; Back returns to the same stage. There is no "More" menu any more. A widget keeps its side of the star while others come and go.
- **Pin** keeps a widget (its Pin key stays lit); unpinned widgets leave after 12 hours, or stay until you close them (right bar → Your choices).
- **Hide** folds it into the **Dock** above the command bar; tap the chip to bring it back.
- **Close** has Undo. Say **clear the stage** (Undo too), **pin the net worth**, **sluit het weer**.
- The bolt opens a widget's quick actions (log water, tick a habit, add a task): saved to your records at once, with Undo; the pages show the change live, and a change on a page shows in NOVA live. Anything with money is only a pre-filled card you confirm and sign yourself.
- **View** (bottom left): the arrangements (Command, Health, Wealth, Minimal) in one tap, the layouts, Holo or Classic, and the widget gallery.

## 5. The side bars (1 minute)
- **Left** — everything in the app: Today, your pillars, your plan, your mind, money, more, agents. Type in **Go to…**: "sleep", "bills", "new goal", "rekeningen" jump straight to the place. The arrow at its top folds it to icons or hides it.
- **Right** (the last tile of the top bar, or `]`) — **Requests** (what you asked; "from your phone" when it came from there; Show again; Forget), **On the stage**, **Your choices** (keep made widgets; gentle cards, off by default), then Behind the intelligence.

## 6. Voice, a model, your own window (2 minutes)
- The microphone in the command bar opens the conversation on its Talk button; speech input stays off until you turn it on and says where the audio goes first. While NOVA listens, thinks and speaks, the star shows it (rings falling in, arms winding tighter, the core pulsing) and says it in words.
- **Give NOVA a brain**: the guide at `/app/nova/setup` (a model on this computer with Ollama, LM Studio or llama.cpp, per operating system, with live checks; your own key; your Hermes Agent). With a model connected NOVA can also ask the stage for a widget itself; it can never change a permission, the weather switch, the privacy mode or a page-data switch.
- **NOVA in its own window**: the window tile in the top bar. Keep it beside your work; Exit closes it.
- **Make NOVA yours** (the gear tile): rename NOVA ("Premium · free during the Alpha"), accent, shortcuts.

## 7. Calm and still
Settings → Motion → **Calm**: the star turns at a third of its speed ("Slow star: Calm motion is on"), widgets fade in. **Off** (or the device's reduced motion): nothing moves; the star is one composed frame per state ("Still star: Motion is Off in ZIGoals") and a made widget is simply there. Everything that glows is static in every mode: only positions and opacity ever animate.

## 8. Everything on request (AM-3, 3 minutes)
NOVA can now show every pillar and record as a widget, also what Sessions AO and AP added to the pages. In the Showcase, try:
- **Show my net worth over time**, **What is ready to assign?**, **How old is my money?**, **Am I spending faster than usual?**, **Did any bill change?**, **Show my spending by tag**.
- **Show my perfect days**, **When does my day end?** (the day's rules: read-only, with a link to the setting), **What is on for this evening?**, **Show my countdowns**, **Show my journal numbers**, **Show the templates**.
- **Show the priority matrix**, **Show today's hours**, **When is my next review?**, **Show my milestones**, **Show my cash flow**, **Show my accounts and debts**, **Show the debt plan** (a projection, said as one), **Show my savings challenges**, **Show my price alerts**.
- Health-type widgets (run splits, mood tags, symptoms, health trends, food-logging days, fasting, meditation, supplements, cycle) are made **locked** until NOVA's Health permission and ZIGi's Health gate are both on; the cycle widget is never read out in words.
- A list shows whole rows only and ends in "+N more"; the arrow in a widget's head opens its page, Back returns to the stage. The bolt's quick actions exist only where the page has a write with Undo (tick a habit, add a task or a note, put a task on this evening, add a countdown). Money never moves from NOVA.
- Dutch works: **Laat mijn vermogen door de tijd zien**, **Wat staat er voor vanavond?**

## 9. Hand-offs: NOVA prepares, you send (AM-3, 2 minutes)
Each of these makes a **card** that shows exactly what would leave and to where; nothing happens until you press its button, and NOVA sends nothing itself.
- **Draft an email to anna@example.com about Friday: I will bring the slides.** → "Open in your mail app" opens your own mail app with to, subject and body filled in; you send it there.
- **Add dentist to my calendar on 3 December at 10:30** → "Save the calendar file" (.ics).
- **Share this**, **Copy that** (after an answer), **Open https://www.yr.no** (the real host is shown; the link opens in a new tab only when you press).
- "Sent out from this device" under the conversation lists what you approved (when, kind, where; never the text).
- A secret (a recovery phrase, a card number) never goes into a hand-off; Health figures only with both Health switches on; an address a model picked that you did not type is marked on the card.

## 10. Make NOVA your own agent (AM-3, 3 minutes; needs an agent or an MCP server on your computer)
- **Setup guide → Make NOVA your own agent** (`/app/nova/setup#own-agent`): eight steps for Mac, Windows and Linux with three live checks (your agent answers on its port; an MCP server answers; how many tools were found).
- **Right bar → Behind the intelligence → Connect your own agent and tools**: type a server's address (only `http://127.0.0.1:<port>` or `http://localhost:<port>`; anything else is refused in plain words). NOVA lists the tools it found, each **Off** or **Ask every time**: there is no "always".
- With a model connected, NOVA may *propose* a tool call; you get a card with the server, the tool and the exact arguments, and only your press runs it. The result is shown as quoted text "from the tool · untrusted" and can never start another call or change a switch.
- Your agent and tools act with their own accounts on your computer: ZIGoals never sees or stores your mail password or tokens, and nothing goes through a ZIGoals server.

## 11. Weather through the proxy (owner, later)
A build with `NEXT_PUBLIC_WEATHER_PROXY_URL=https://<your worker>/v1/forecast` asks your `workers/weather-proxy` instead of MET Norway (the switch then says who sees what); without it nothing changes. Weather stays off until you turn it on. Deploying the Worker is yours (docs/run11/WEATHER_PROXY_ACTIVATION.md).

## 12. NOVA answers the question asked (Session AS, 5 minutes)
*Session AS ("NOVA ANSWERS EVERYTHING"): every answer below is worked out on this device from your own records, in the
same words on NOVA and in ZIGi, and each kind of answer makes its own widget. In Settings → Load Showcase Demo first;
for the Health questions open Health in NOVA → Permissions (Health page data and Include Health too).*

Type these into NOVA's command bar, one at a time (typos and Dutch are fine):

1. **how many habits did I miss this week** — none missed, 11 of 11 due check-ins, and what is still open today; ranked miss bars.
2. **wgat days did i forget to meditate this month** — Tue, Nov 3 and Thu, Nov 12, both skipped; the month calendar with those two days lit.
3. **which habit do I skip most this month** — each habit with its skipped days, ranked.
4. **on which weekday do I miss habits most** — Mondays; the weekday lattice.
5. **show my habit streaks** — every habit's run as a flame, beside the longest runs ever.
6. **which days did I not reach my water goal this month** — no day below the target; the two days with nothing logged said apart, never counted.
7. **how is my health** — sleep, steps, water and weight, each with its own day; the health scan (its heart is decoration, never a reading).
8. **is my weight going down** — the change since your earlier weigh-in and your goal; the weight trend with its goal line.
9. **how many calories did I eat this week** — the week's total and its daily average.
10. **water this week vs last week** — the two periods side by side, the same number of days each.
11. **wat heb ik deze maand uitgegeven** — in Dutch: the month's spending and where it went; ranked bars and the spending radar.
12. **did I spend more than last month** — this month against last month, the difference said.
13. **how much did I earn this month** — what came in and went out; the cash river.
14. **what is my next bill** — Rent, its amount and its day; the bill dial.
15. **which goals are behind** — the goals behind plan; the goal orbits.
16. **which tasks are overdue** — the two overdue tasks; the overdue bars and the task timeline.
17. **what is my journal streak** — the days in a row you wrote; its flame.
18. **did I focus today** — nothing yet today, beside yesterday's minutes; the focus gauge.
19. **why did I sleep so little last week** — an honest line: your records do not say why, and what they do show.
20. **what can you answer** — the kinds of question NOVA answers, with examples.

What to notice: the sentence under the star answers the question in its first words; the widget beside it shows the
same facts, with its source and as-of in its foot; an unknown is never a zero; nothing is a score or a judgement of
you. With Motion Off everything is there at once and still.

## On a phone
Open NOVA on a phone (or a 390 px window): the star stands in a round bezel of fine ticks with four pillar arcs (Goals, Habits, Health, Wealth) lit to today's figures and dashed while a figure is unknown; NOVA's name and its state sit in the ring's openings. Under the greeting, with the Showcase or your own widgets on the stage, a strip of small cards (one instrument, one figure and a name each) that you swipe sideways; a card opens what its widget's own link opens, and shows a figure only while that part is open to NOVA. Then the one-tap requests as a two-column grid of pillar keys and the command field. The full panels follow below when you scroll. The conversation is a console: cards edged by speaker and a line under each answer saying who answered. A request opens the conversation and is answered in words; it is kept, with the widgets it would make, for your computer (Requests → Show again; across devices once sync is on for your account, on the public Alpha it stays on the device).
