# NOVA, always on — art direction (Session AM)

Owner brief, 11 Nov 2026: make NOVA the most impressive part of ZIGoals, a personal AI command centre a person keeps open
all day. This document is the design contract for the session: the concept, the layout, the motion language, the widget
system, the centre node and the performance plan. Decisions that bind the code are in
[`ADR-038`](../architecture/ADR-038-session-am.md). References: `review/session-am-refs` (43 owner mockups and four
described screenshots; inspiration only, nothing copied 1:1; their labels are placeholders).

## 1. Concept: "the observatory"

NOVA is a quiet observatory with one living star in it. The star is the agent. The room is dark and nearly empty until
the person asks for something; then the star answers and *light is projected into the room*: a widget made for that
answer, drawn by the star, in the colour of the part of life it belongs to. Ask again and another one appears. What the
person wants to keep, they pin; the rest goes dark again when they close it.

Three sentences decide every later choice:

1. **Calm by default, spectacular on request.** An empty stage is the resting state, not an error. The spectacle is the
   moment a widget is made, and it lasts under a second.
2. **Light is data.** Every glowing line on the stage is a figure from the person's own records, with its source and its
   time. Ornament is thin, dim and never looks like data. Unknown is drawn as unknown (a dashed, unlit trace), never as 0.
3. **One star, one voice.** The centre node is the only thing that listens, thinks and speaks. Widgets never talk; they
   show.

The edge over the "personal AI dashboards" people build for themselves: NOVA already holds the person's Goals, Habits,
Health, Wealth, Tasks, Notes, Journal, Agenda and Checklist, so the first request works in the first second, with no
model and no setup.

## 2. Palette and type

NOVA is a night island in every theme (Light's dark-islands rule; Dark deepens it). Colours come from the app's own
tokens; nothing new is invented.

| Role | Token | Value |
|---|---|---|
| Deep sky | `--nova-deep` | `#050818` (Dark: `#010207`) |
| Ink | `--nova-ink`, `-2`, `-3` | `#eef3ff`, `#cdd8ee`, `#aebcd8` (all ≥ 7:1 on the sky) |
| Goals | `--pillar-goals` | `#9273ff` violet |
| Habits | `--pillar-habits` | `#23eaff` cyan |
| Health | `--pillar-health` | `#ff74be` magenta |
| Wealth | `--pillar-wealth` | `#ffd27a` gold |
| The day (agenda, tasks, checklist, focus) | "ice" | `#bfe6ff` |
| Mind (notes, journal) | "lilac" | `#cbbfff` |
| World (weather; outside data) | "sky" | `#7fb6ff`, re-tinted by the weather itself |
| NOVA itself | `--nova-a/b/c` | the person's accent (violet → cyan → magenta by default) |

- **Neon is a stroke, never a fill.** Fills are glass: `color-mix(neon 10–14 %, #0a1030)` at 86–92 % opacity. A neon
  colour as text is used only for figures ≥ 20 px and only when it reaches 4.5:1 on its glass; labels are ink.
- **Type.** The app's own typeface. Figures are tabular, 28–56 px, weight 650. Labels are 14 px small caps with
  0.08 em tracking (the mockups' tiny caps are a *style*; here they are never under 14 px). Body 15–16 px. Inputs 16 px.
- **Glow has three layers and no more:** a 1 px bright core line, a 6 px bloom at 55 %, a 26 px haze at 18 %. More
  layers read as fog and cost paint time.

## 3. Layout (desktop first)

```
┌───────────┬──────────────────────────────────────────────┬────────────┐
│  LEFT     │  top bar: exit · time · day · status         │  RIGHT     │
│  Everything│                                              │  Behind    │
│  in the   │   ┌ card ┐                    ┌ card ┐        │  the       │
│  app      │   └──────┘      ✺ STAR        └──────┘        │  intelli-  │
│  (hide-   │   ┌ card ┐   listens/thinks   ┌ card ┐        │  gence +   │
│  able)    │   └──────┘      speaks        └──────┘        │  Requests  │
│           │        NOVA's answer, one or two lines        │  (hide-    │
│           │   one-tap requests ·  ▸ command bar  · mic    │  able)     │
└───────────┴──────────────────────────────────────────────┴────────────┘
```

- **The stage.** The star sits at the optical centre. Widgets are projected into two columns beside it and, when those
  are full, onto a band below (the existing orbit placement; nothing overlaps the star). With no widgets the star stands
  alone with the greeting, the day line and the command bar: this is the first screen with real data.
- **The command bar** is the one place to ask, open and do (typed, spoken or tapped). Above it sits one row of one-tap
  requests chosen from the person's own data ("My day", "Weight this month", "Habits this week", "Money", "Agenda", and
  "Weather" once it is on). The answer appears as one or two lines under the star *and* in the conversation; the
  conversation opens as a panel on request or when an answer needs a decision (a confirm card, a choice).
- **Left bar: everything in the app.** Pillars, pages, apps and agents with live counts, a filter field, and the person's
  space. Open, an icon rail, or hidden (remembered per device).
- **Right bar: behind the intelligence, and what was asked.** The brain, voice, permissions, usage and activity as today,
  plus **Requests**: the history of what the person asked (on this device and, with sync, on their phone), each one tap
  from being projected again, and the pinned widgets.
- **Tablet (641–1100 px):** the same stage, side bars folded by default (unchanged rule). **Phone (≤ 640 px):** NOVA is a
  chat agent: the star, the answer, the composer. Widgets are not projected on a phone; the answer carries its figures in
  words and an inline chart, and the request is kept for the desktop (see ADR-038, sync).
- **A standalone app.** NOVA keeps the whole window (the app's chrome is hidden, as the Checklist app does), has its own
  title, its own installable shortcut and mini window, and one way out (Exit, Esc).

## 4. The widget system ("projections")

Every widget is the same object with a different instrument inside:

- **Frame.** Glass slab, 12 px radius with two cut corners (top-right, bottom-left, 14 px chamfer), a 1 px neon rim that
  is brightest at the top-left, corner ticks, a faint 22 px grid that fades toward the edges. Large widgets add a ruler
  edge and a scan texture at 3 % opacity. The frame's colour is the widget's realm (table in §2).
- **Head.** A 14 px small-caps title with the realm's glyph, then the actions: **Pin**, **Hide** (to the dock), **Close**,
  and **Open** (the full page, with the morph; Back returns to the same stage). On a narrow widget the actions fold into
  one "More" button. Every target is 44 px.
- **Body = one hero + up to two supports.** The hero is one instrument (a ring, a trend line, a bar field, a timeline, a
  mix ribbon, a dial). Supports are one line each. No widget holds more than seven figures (glanceable in two seconds).
- **Foot.** The source and the as-of time, always ("Your Health records · today 14:20", "Data from MET Norway · 14:00"), and the
  Showcase label when the data is the Showcase's.
- **Sizes** S / M / L as today (one, two or four rows of the stage's unit); the request picks the size, the person can
  change it.
- **States.** *Live* (figures), *teaching* (empty: one line and the action that fills it), *locked* (the page-data switch
  or NOVA's Health permission is off: says which switch, shows nothing), *off* (outside data not turned on: says how to
  turn it on; never a sample), *unreadable* (storage refused: says so).

### Instruments by realm

| Realm | Request (examples, English and Dutch) | Instrument |
|---|---|---|
| Health | "weight progress this month", "hoe gaat mijn gewicht" | Trend line with a heartbeat marker, change over the range, a row of hearts for days logged |
| Health | "how did I sleep", "water", "steps", "calories today" | Sleep bars against the goal · a filling vessel · step field · macro rings |
| Habits | "my habits this week", "streaks" | Week lattice (7 × habits), streak flames as tick rings, consistency dial |
| Goals | "how are my goals", "am I on track for Japan" | Progress arcs per goal · one goal's pace line with its estimate (an estimate, not a promise) |
| Wealth | "net worth", "what did I spend", "next bill", "budget" | Recorded-valuation line · spending bars · bill countdown · budget meters. Money moves are only a pre-filled card the person signs |
| The day | "what's next", "my agenda", "tasks today", "checklist" | 24-hour clock arc · next-three list · task ticks (tick here, Undo) · orbit ring |
| Mind | "recent notes", "journal streak", "what did I write about…" | Note chips · a month of journal marks |
| Focus | "start a focus session" | Timer ring with start/stop |
| World | "what's the weather", "do I need an umbrella", "sunrise" | The weather widget (below), with the sun's times |
| NOVA | "what can you see", "which brain", "what did I ask" | Permissions matrix · brain status · request history |

### The weather widget (the owner's example of a themed widget)

Its look *is* the weather, drawn with the same strokes as everything else (no photographs, no emoji):

- **Clear day:** warm white-gold sun ring with slow ray ticks, sky tint `#7fb6ff → #ffd9a0`.
- **Clear night:** crescent with rim light, a few fixed stars, tint deep indigo; the frame's rim cools to ice.
- **Cloud:** layered glass cloud outlines drifting 2 px over 20 s; tint grey-blue.
- **Rain / drizzle:** slanted hairline streaks in cyan falling through the hero area; a ripple baseline.
- **Thunder:** rain plus one magenta bolt glyph that brightens once when the widget is made (never flashes repeatedly).
- **Snow:** slow drifting dots, ice tint. **Fog:** horizontal bands, lower contrast ornament (text contrast unchanged).

Hero: the temperature, the condition in words, feels-like. Supports: the next 24 hours as a temperature line with
precipitation bars, and five days as min–max capsules. Foot: the service's name, the place and the time of the reading.
Until the person turns outside data on, the widget is in its *off* state: what it would show, which service it would ask,
what that service receives (a rounded location, nothing else), and the switch.

### How a widget is made (the signature moment, ≤ 900 ms)

1. **0 ms** The star brightens (the request was understood) and a hairline beam leaves the core toward the slot.
2. **120 ms** The frame's corner ticks appear at the slot and the rim draws itself from them (stroke-dashoffset,
   320 ms, `cubic-bezier(.2,.7,.2,1)`).
3. **300 ms** The glass fades in behind the rim (opacity 0 → 1, 240 ms) while one scan line sweeps top to bottom
   (360 ms), revealing the content behind it.
4. **520 ms** The hero instrument draws once from zero to its value (420 ms, ease-out); figures count up (Full only).
5. **≤ 900 ms** The beam fades; the rim settles from 100 % to its resting 60 % glow. Done; nothing loops.

Closing is the reverse in 220 ms (scan up, rim retracts). Hiding sends the widget to the dock as a chip (FLIP, 260 ms).
Pinning stamps a small pin glyph and brightens the rim once. Under **Calm** the widget fades in (150 ms, no beam, no
scan, no count-up). Under **Motion Off / reduced motion** it is simply there, complete, with its figures final.

## 5. The centre node: a nebula star system

Described references 3 and 4: a living spiral with a bright core, seen from inside a nebula, with a planet on an orbit,
rim-lit from behind, and one thin horizontal light streak.

- **Drawn with** one hand-written WebGL fragment shader on one small canvas (no library): a tilted disc with two
  logarithmic spiral arms under differential rotation (the inner disc turns faster), fractal gas in violet → magenta →
  peach with cyan sparks along the arms, dust lanes, a white-violet core with a soft bulge, stars that turn with the
  disc, a sparse field of stars streaming toward the viewer for depth, the orbit trace, the planet (dark body, rim light
  on the side facing the core, hidden only when it passes behind the core) and the blue anamorphic streak through the
  core. The person's accent recolours it. A prototype of this shader was rendered in the session sandbox before planning.
- **It is the agent, and each state is unmistakable as a still frame too** (state is always also said in words):

| State | What the star does | Still frame (Motion Off) |
|---|---|---|
| Standby | Slow turn (one arm sweep ≈ 90 s), the core breathes ±5 % | The spiral, calm core |
| Listening | Cyan rings fall *inward* to the core; the arms open slightly; the core follows the microphone's level when speech input is on | Three cyan rings around the core |
| Thinking | The arms wind tighter and turn faster; the star field streams faster; the planet speeds up | Tightly wound arms, brighter core |
| Speaking | The core pulses with the speech; rings travel *outward* | Bright core, magenta-white outward rings |
| Making a widget | One beam toward the slot (§4) | — |

- **Fallbacks.** No WebGL, a lost context, a low-end device, battery saver or Save-Data: one pre-computed still frame
  (drawn once on a 2D canvas from the same palette) with the existing SVG orb's state marks. The ZIGi avatar option stays.

## 6. Motion language

O5 (the NOVA motion exception) applies: ambient motion while NOVA is visible; Calm is slower and fewer; Motion Off and
reduced motion are fully still; everything pauses when hidden or off-screen; nothing ever follows the pointer.

- **Three speeds only:** *instant* (≤ 120 ms: press, toggle), *quick* (220–320 ms: open, close, dock), *made* (≤ 900 ms:
  a widget is projected). One easing family: `cubic-bezier(.2,.7,.2,1)` out, `cubic-bezier(.5,0,.8,.2)` in.
- **Ambient:** the star, and nothing else, moves continuously. Widgets are still after they are made, except a figure
  that changes (one 400 ms glow) and the weather's own small drift.
- **Satisfying clicks:** every press has a 90 ms press-in and a rim flash on release; a request sent from the command
  bar sends a short pulse up the stage's centre line into the star. Hover is the liquid-glass highlight after ~70 ms of
  intent (a fixed highlight; it does not follow the pointer).
- **Calm:** star at one third speed, 12 fps; widgets fade in; no beams, scans, count-ups or drift.
- **Off / reduced motion:** one still frame of the star for the current state; widgets appear complete. Still, complete
  and beautiful: the still frame is composed, not a frozen accident.

## 7. Sound and voice

- Typed and spoken requests are equals. Speech input stays off until the person turns it on, says where the audio goes
  before first use, and in Strict runs only on the device (existing rules). Read-aloud uses the device's voices.
- No interface sounds (an always-on app next to other work stays silent).

## 8. Accessibility and readability

- Labels ≥ 14 px, body 15–16 px, inputs 16 px on phones, targets ≥ 44 px, text contrast ≥ 4.5:1, focus ring 3 px.
- **A new widget is announced** once in a polite live region: "Weight this month is on the stage: 81.4 kg, down 1.2 kg
  since 12 October." Focus does not move (the person is typing); the widget is the next stop after the command bar, and a
  "Skip to the newest widget" link follows the answer.
- Every instrument has a text alternative (a visually hidden table or sentence with the same figures and dates).
- Everything is reachable by keyboard: `Tab` order is command bar → answer → widgets (newest first) → dock → side bars;
  each widget's actions are buttons; `Delete` on a focused widget closes it (with Undo); `P` pins when shortcuts are on.
- The star's state is text ("Standby · Tap to talk") and an `aria-live` status, never colour or motion alone.

## 9. Performance plan (an always-on app on a laptop)

Targets, measured in Chromium with CPU 4× throttling and recorded in ADR-038:

| Situation | Target |
|---|---|
| Hidden tab, minimised window | 0 frames, 0 timers except the minute clock |
| Visible, **resting** (window not focused, or no key/tap/request for 60 s) | star ≤ 6 fps at half resolution; main thread ≤ 1 % |
| Visible, **active** | star 30 fps (60 during a state change), widgets idle; ≥ 55 fps while a widget is made |
| Calm | star 12 fps · Motion Off: 1 frame per state change |
| First paint | unchanged: the star, cards, shader and summon engine load after first paint, each in its own chunk |
| Route weight | `/app/nova` stays inside its budget (458 kB gzip); no budget raised, no dependency added |

How:

- **One canvas for the star**, sized to its box (≤ 520 CSS px), device-pixel ratio capped at 1.5 (1 when resting). The
  sky keeps its existing 30 fps canvas with its own rules; the two never both run at full rate (the sky rests when the
  star is active and the reverse is fine because the sky's drift is barely visible).
- **A frame governor.** The loop measures its own frame cost; three slow frames in a row step quality down (resolution,
  then noise octaves, then the still frame). It never steps up while the person is interacting.
- **Activity without pointer tracking.** "Active" is decided by key presses, taps, focus and requests, never by pointer
  movement. Window blur, `visibilitychange`, and the Page Lifecycle `freeze` event all drop the loop to rest or stop.
- **Widgets cost nothing at rest:** SVG and CSS only, no per-frame script; animations run once and end; off-screen
  widgets are marked and skip even those. `content-visibility: auto` on the band below the fold.
- **Glass.** Backdrop blur stays on at most the widgets in the two side columns (as today); the band and the dock use a
  flat tint.
- **Data.** Widgets read the app's stores through the pages' own hooks (they already update across tabs); no polling.
  Outside data is fetched only when a widget that needs it is on the stage, at most once per 30 minutes per place, and
  never while hidden.

---

# AM-2 — "NOVA, STUNNING": the design language (11 Nov 2026)

Session AM's look read as "slightly upgraded". AM-2 replaces the look of everything inside NOVA; the concept, the
words, the mechanics and the safety of §1–§9 stay. Where this part and §2–§6 disagree about *look*, this part wins.
Decisions are in ADR-038 "AM-2". The bar is the 43 references (`review/session-am-refs`) and screenshots 1–4.

## A. One sentence
**The observatory, lit:** four depth layers and one light source. The star is the brightest thing on the screen and
everything else looks lit by it — back to front: deep nebula → the star system → the widget plane (holograms) → the HUD
frame (the instrument the person looks through).

## B. What the references do that AM did not (the checklist for every surface)
1. **Light has weight.** Strokes are 2–3.5 px where they carry data (rings, bars, chart lines), with a bright core and a
   soft bloom behind. Hairlines (1 px) are for frames, grids and ticks only.
2. **Double frames.** A bright outer rim and a faint inner hairline with bright corner marks; cut corners; small tabs,
   notches and tick rulers. Never a plain rounded rectangle.
3. **Gradient data.** A ring or a bar is a gradient along its length (the realm's neon into its lighter second colour,
   or cyan → violet → magenta on NOVA's own instruments), brightest at its leading end, with a lit cap or dot there.
4. **Big figures.** One hero figure per widget at 36–56 px, tabular, weight 650–700, in the realm's ink with a neon
   bloom behind it; its unit small beside it; its label in 14 px tracked capitals above or below.
5. **Bezels and ticks.** Rings sit inside tick bezels; charts sit on fine grids with small axis ticks; lists have a lit
   node per row. Ornament is thin and dim and never looks like a figure.
6. **Strips.** The foot of a widget is an instrument strip: source · as-of · a small live dot, in 14 px, on a hairline.
7. **Saturation.** Deep navy glass (`#04071a`–`#0a1030`), full-strength neon. No grey panels, no washed pastel fills.

## C. Tokens (CSS custom properties; all exist on `.nova-widget[data-pillar]`, holo-parts.css)
| Realm (`data-pillar`) | `--neon` | `--neon-2` | `--neon-ink` |
|---|---|---|---|
| goals | `#9273ff` | `#c0adff` | `#e2d9ff` |
| habits | `#23eaff` | `#8ff6ff` | `#c6fbff` |
| health | `#ff74be` | `#ffa9d8` | `#ffd3ea` |
| wealth | `#ffd27a` | `#ffe6b3` | `#fff0cf` |
| orbit (the day) | `#7fc8ff` | `#c4e6ff` | `#e3f3ff` |
| mind | `#d59bff` | `#ecd2ff` | `#f6e9ff` |
| world | `#5aa2ff` | `#ffd9a0` | `#e6f0ff` (re-tinted by the weather) |
| nova | `--nova-a` | `--nova-b` | `#f1edff` |

- **Text.** Figures and titles use `--neon-ink` (always ≥ 7:1 on the glass). `--neon` as text only at ≥ 24 px or bold
  ≥ 18.66 px and only where it reaches 4.5:1 (cyan, gold and pink do; violet `#9273ff` does not at small sizes: use
  `--neon-2` or ink). Labels are `#cdd8ee` or lighter, 14 px minimum; body 15–16 px.
- **Bloom recipe (static).** Behind a stroke or a figure: `drop-shadow(0 0 6px neon)` on an SVG group, or
  `text-shadow: 0 0 14px neon 70 %`, or for a box `0 0 14px 1px neon 62 %, 0 0 46px 4px neon 26 %`. Set once; never
  animated.
- **The frame** is `holo/holo.css` "The panel" (aura → glass → rim → inner hairline → ruler), `--cut` 18 px and `--nick`
  7 px (13 / 5 on a small widget). Widget bodies must not draw their own outer frame.
- **The keys** are `stage/stage.css` `.ns-act` (a 44 px target with a 34 × 28 lit key inside). Any small action inside a
  widget uses the same recipe.

## D. Instruments (the kit every widget draws with)
- **Ring gauge** (refs 05, 12, 31, 39, 42, 43): track 3.5 px at neon 16 %; value arc 3.5–5 px, gradient, round cap, a
  lit dot at its end; a tick bezel outside (60 ticks, every fifth longer); the figure in the middle.
- **Bars** (refs 06, 19, 20, 33, 37): vertical columns with a gradient from neon 35 % at the foot to full neon at the
  top and a 2 px white-hot cap; horizontal meters as segmented or solid tracks with a lit leading end.
- **Trend** (refs 01, 15, 23): a 2.5 px line with bloom, an area fill fading to nothing, a fine grid, a lit lead point
  with a ring, min/max ticks in 14 px.
- **Lattice / heat** (ref 32): rounded cells, unlit cells as outlines, lit cells filled with a bloom; today outlined.
- **Rows** (refs 14, 18): a lit node, the label, a right-aligned figure, a hairline between rows.
- **Themes.** Health: magenta, hearts, a heartbeat trace. Habits: cyan lattice and streak rings. Goals: violet
  concentric arcs. Wealth: gold terminal lines and stacked bars. The day: ice clock bezel and timeline. Weather: the sky
  itself (sun ring, crescent, cloud glass, rain streaks, snow, fog), the frame re-tinted by it.

## E. Motion (owner addition B2: glow stays cheap)
- **Animate only `transform` and `opacity`.** Never animate `box-shadow`, `filter`, `backdrop-filter`, `clip-path`,
  `background`, `width`/`height` or a colour in a loop. Bloom and glow layers are static.
- **No `backdrop-filter` on the widget plane.** Glass is its own colour.
- **Made (once, ≤ 900 ms, Full only):** the frame arrives (stage.css F3); the instrument then draws itself once: a ring
  or a line may draw with `stroke-dashoffset` (a one-shot on a small SVG path, no filter on the animated element),
  bars rise with `transform: scaleY`, rows rise with `translateY` + opacity, figures count up (`HoloFigure`).
- **Ambient (O5, Full; Calm: slower and fewer; Off / reduced motion: none):** only ornaments move — a tick bezel turning
  (`transform: rotate`, the existing `holo-spin` on `.holo-orn` / `.holo-lens`), the sheen band, a lead dot's opacity,
  the weather's drift. Never a data arc, bar or line. Everything stops when the tab is hidden
  (`.nova-frame[data-hud-motion=paused]`) and when the widget is off screen (`.nova-widget[data-off]`).
- **Nothing follows the pointer.**

## F. Rules the specs keep (do not break; change a spec only where a layout change requires it, marked deliberate)
- Night island in every theme; `.holo-num` and the widget title ≥ 4.5:1; every visible button or link ≥ 44 × 44 px.
- `data-fit=rows` instruments drop whole rows to fit their panel (container queries on `holo-body`) and are never cut.
- Under Motion Off / reduced motion: zero running animations in `.nova-root`, pixel-still.
- `holo-spin` runs only on `span.holo-orn` and `span.holo-lens`, 90 s Full / 270 s Calm (`ci15-perf.test.ts` pins the
  strings); nothing animates inside `.holo-arc`, `.holo-track`, `.holo-segs`, `.holo-bar`, `.holo-wave-line`.
- A class styled directly belongs to one sheet (`lib/nova/css-collisions.test.ts`); `-webkit-backdrop-filter` before
  `backdrop-filter` where one is still used outside the widget plane.
- Every figure keeps its source and as-of; unknown is drawn as unknown (a dashed, unlit trace), never as 0.
