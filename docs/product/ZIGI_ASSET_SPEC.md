# ZIGi — figure, states, skins and motion (asset spec)

Session V Part 12 (ADR-014). This file is the reference for anyone drawing or animating ZIGi, and for the code
that shows it. It replaces the "ZIGi states", "Assets and budgets" and "Motion" sections of `YOUR_AI_V1.md`, which
stay there for history.

## What ZIGi is made of

- **The manifest** `apps/web/components/zigi/manifest.json`, version 2. It is a static file, imported at build time;
  nothing is fetched at run time. It holds:
  - the **states**: code, label, kind, duration and fallback;
  - the **skins**: label, the base frame in three sizes, the optical offset, and per-state files;
  - the size **budgets**;
  - the number of "Coming soon" tiles in Customize.
- **The reader** is `components/zigi/manifest.ts`. It still reads a version 1 manifest (Session T: sizes and eleven
  states, no skins), as the original skin. The manifest test checks this against a frozen version 1 copy.
- **The figure** is `components/zigi/zigi-avatar.tsx`. It shows one state of one skin at any CSS size, and loads with
  the chat, Settings and Meet ZIGi.
- **The launcher shell** ships on every app page and never imports the manifest. It carries one constant frame
  (`components/zigi/zigi-figure.tsx`, `lib/ai/zigi-look.ts` `SHELL_FRAME`) and the optical offset as two CSS numbers
  (`components/ai/ai-launcher.css`, `--zigi-ox` / `--zigi-oy`). The manifest test keeps both equal to the default skin.
- **The state machine** is `components/zigi/events.ts`, a pure `transition` function plus timers. It loads with the
  chat chunk. The shell carries only the tiny event bus and state store (`components/zigi/bus.ts`). Events emitted
  before the machine starts are delivered to it when it does.

## States

A **loop** holds until the next event. A **one-shot** plays for its duration, then ZIGi rests: idle, or offline while
the device is offline. When a skin has no drawing for a state, it shows the fallback state's drawing, and so on down
the chain to the skin's base frame. Every chain ends at idle; the manifest test checks there are no cycles.

| State | Code | Kind | Duration | Falls back to | When it shows (the trigger) |
|---|---|---|---|---|---|
| idle | F001 | loop | 5.6 s cycle | — | at rest |
| greeting | F002 | one-shot | 2.5 s | idle | the panel's first open of the day |
| insight | F003 | one-shot | 3 s | idle | a reply without proposal cards arrived |
| listening | F004 | loop | 1.6 s | idle | the microphone is on |
| speaking | F005 | loop | 1.6 s | idle | the reply streams, or read-aloud is playing |
| presenting | F006 | one-shot | 3 s | insight | a reply with proposal cards arrived |
| attention | F007 | loop | 2.4 s | idle | not connected yet (the setup pointer) |
| sleepy | F008 | loop | 6 s | idle | the panel has been open and quiet for 90 s |
| celebrate | F009 | one-shot | 2.5 s | idle | a proposal was added (the store confirmed the write) |
| thinking | T001 | loop | 2.4 s | idle | waiting for the first token |
| error | E001 | one-shot | 4 s | idle | a request failed |
| reading-your-data | F010 | loop | 1.6 s | thinking | ZIGi's read-only tools read the records (native tool calling) |
| writing-proposal | F011 | loop | 1.6 s | speaking | a proposal block streams in |
| success | F012 | one-shot | 1.8 s | celebrate | a question was answered on the device ("no AI used") |
| proud | F013 | one-shot | 2.8 s | celebrate | a check-in card took a streak onto 3, 7, 14, 21, 30, 50, 100, 150, 200, 365, 500 or 1000, counted by the habit engine |
| curious | F014 | one-shot | 3 s | attention | the question matches two habits or goals, and ZIGi asks which one |
| surprised | F015 | one-shot | 1.5 s | attention | reserved: no trigger yet (shown on Meet ZIGi) |
| confused | F016 | one-shot | 3 s | attention | a question ZIGi cannot answer on the device, with no AI connected |
| empathetic | F017 | one-shot | 3.5 s | idle | after the answer to a message that touched a sensitive health topic (careful mode, Part 11) |
| encouraging | F018 | one-shot | 2.8 s | insight | "Your week with ZIGi" opens |
| wave-goodbye | F019 | one-shot | 1.4 s | greeting | the panel closes |
| reminder | F020 | one-shot | 2.4 s | attention | a reminder is due (the knock, Part 13) |
| offline | F021 | loop | 4 s | sleepy | the device is offline (ZIGi rests here until it is back) |
| peek | F022 | loop | 4 s | idle | the "Show ZIGi" edge tab while ZIGi is hidden; the knock (Part 13) |
| loading-model | F023 | loop | 1.6 s | thinking | Chrome's on-device model loads (Part 15) |

Three rules are never broken:

- **Celebrate and proud follow the app, not the AI.** Celebrate follows only `action-applied`, which the proposal
  list sends after the store confirmed the write. Proud follows only a streak milestone the habit engine counted.
  Neither ever follows because a reply said something was done.
- **Pure in-page signals.** ZIGi's states never notify, badge or appear anywhere outside the launcher, the chat and
  Meet ZIGi. Part 13's knock is opt-in.
- **The events and their tests.** `lib/ai/zigi-events.test.ts` tests one transition per event.

## Skins

| Skin | Label | Status |
|---|---|---|
| `origami-nebula` | Original | the default; today the placeholder frame for every state |

Customize also shows `comingSoon` (3) "Coming soon" silhouette tiles. They are not selectable: they are honest
placeholders for looks being drawn. Unknown skin names, such as a skin chosen in a later build, show the default.

To add a skin:

1. Put its files under `apps/web/public/brand/figures/zigi/<skin>/`.
2. Add a `skins.<skin>` entry: `label`, `placeholder: false`, `opticalOffset` (measure it; see below), `sizes`, and
   `states` with the per-state files it has.
3. Lower `comingSoon` by one.
4. The Customize picker lists it automatically.

## Files

- **Format:** WebP with a transparent background. No WebM or HEVC alpha: Safari has no WebM alpha, and one format
  everywhere keeps the budget honest. Rive or Lottie would need a runtime dependency, which is an owner decision.
- **Sizes** (one proportion, 96:126):

  | Size | Pixels | Used for | Budget |
  |---|---|---|---|
  | 1× | 96 × 126 | every size up to 96 px wide | 40 KB |
  | 2× | 192 × 253 | high-density screens | 100 KB |
  | large | 480 × 632 | above 192 px | 200 KB |
  | animated | 192 × 253 | one file per state, every size up to 192 px | 400 KB |

  The manifest test enforces these against the files on disk.
- **Naming:**
  - `<code>-<state>.webp`, `<code>-<state>-2x.webp`, `<code>-<state>-large.webp`;
  - an animated state adds `<code>-<state>-anim.webp`.
- **Brand inventory test:** `lib/brand-assets.test.ts` pins the number of `-2x` files and exempts `-large` frames.
  The commit that adds the first drawings updates that count, and adds the same exemption for `-anim` files.
- **Per-state entries:** `skins.<skin>.states.<state>` = `{"1x": …, "2x": …, "large": …, "animated": …}`. Any field may
  be missing; a missing one falls back as above.
- **Animated files:**
  - The first frame is the still pose.
  - Loops loop seamlessly; one-shots end on the still pose within the state's duration.
  - An animated file plays only while motion is allowed. Under reduced motion, Motion Off or ZIGi's animation Off,
    the still file shows instead (`frameFor` in `zigi-avatar.tsx`).
- **Pose:** the figure stands on the baseline of its box (`object-fit: contain`). The drop shadow is CSS, not part of
  the file.

## Optical centre

ZIGi is not symmetric, so centring its box in the launcher's circle leaves the figure looking off-centre. Each skin
carries `opticalOffset {x, y}`. This is how far to move the figure so that its **alpha-weighted centre** (each pixel
weighted by its opacity) lands on the circle's centre. The values are fractions of the figure's box width and height.

- **The original skin:** x −0.041, y +0.001, measured from the placeholder in Chromium on 2026-10-06. The figure's
  visual centre sits at 0.541 / 0.499 of its box.
- **The check:** `tests/zigi-alive.spec.ts` measures it in the page, from the very file the browser chose, at S, M and
  L (48, 56 and 64 px circles; 38, 44 and 52 px figures) and at 1× and 2× density. It asserts the visual centre is
  within 0.75 px of the circle's centre, and that the manifest's offset matches the measurement.

## Motion

- **The person's choice:** Customize → Animation offers Full, Calm (the default) and Off, stored in `zigoals:zigi:v1`.
  The launcher shell writes it to `html[data-zigi-motion]`.
- **The launcher's breath:** a CSS-only idle loop on the circle's figure. It moves the `img` only, never the button,
  so the click target stays still. Calm is a slow, small breath (5.6 s); Full is livelier (3.6 s, a little sway). The
  shell holds no animation code and no pause logic: browsers do not run animations in hidden tabs.
- **In the panel and on Meet ZIGi:** every state has its own small CSS move (`components/zigi/zigi.css`). The idle
  breath runs on the panel's head only. On Meet ZIGi, loops that scroll out of view pause.
- **What always wins:** nothing moves under the device's `prefers-reduced-motion: reduce`, the app's Motion Off
  (`html[data-app-motion=off]`) or ZIGi's animation Off. `tests/zigi-alive.spec.ts` asserts the computed
  `animation-name: none` in each case.
- **The freeze check and screenshots:** the freeze check runs with reduced motion, the launcher hidden and the edge tab
  off (a valid `zigoals:zigi:v1` record), so ZIGi adds no pixel differences there. Screenshots disable animations.

## The launcher (Part 12 fixes)

- **One control:** the "Open <app> ↗" pill, the circle and a small nebula-gradient chevron centred below it.
  - The chevron is "Hide ZIGi": a 44 px target with a tooltip, keyboard-reachable, with the same ten-second Undo.
  - The pill wears the circle's glass, ring and glow, and sits on the circle's centre line.
- **Side and size:** right or left, S, M or L.
  - On a computer, a left-side ZIGi sits just past the sidebar.
  - The chat panel opens on ZIGi's side.
  - On phones, ZIGi sits above the tab bar and is away while a sheet, More or the keyboard is open.
- **The edge tab:** while ZIGi is hidden, a small "Show ZIGi" tab at the screen's edge, on ZIGi's side, brings it back
  and puts the focus on ZIGi.
  - It is on by default; Customize and Settings turn it off.
  - It is rendered outside the launcher's `data-testid="ai-launcher"`.
  - Sensitive screens hide it, as they hide ZIGi.

## Customize and Meet ZIGi

- **Customize:** the chat panel's toolbar (next to New, History, Settings and Expand) and Settings → ZIGi · your AI →
  "ZIGi's look and feel" (`#zigi-look`) offer the same controls:
  - look (Original, plus the "Coming soon" tiles);
  - animation, side, size and greeting;
  - the edge tab;
  - knock when a reminder is due (Part 13; off by default, also offered once in the chat).

  Every choice is a display preference on this device, in Export and never synced.
- **Meet ZIGi** (`/app/zigi`):
  - shows every state of every skin at the launcher's, the panel's and a large size, with its code, kind and fallback;
  - one-shots play again on request, and the animation choice sits at the top;
  - it is linked from Customize, not in the navigation; the phone's top bar reads "Meet ZIGi", with Back to Settings;
  - it reads no records and writes nothing on view.
