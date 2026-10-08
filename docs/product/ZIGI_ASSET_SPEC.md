# ZIGi — figure, states, skins and motion (asset spec)

Session V Part 12 (ADR-014); Studio-2 art, the mapped states and the Studio-4 slots since Session X-Local Parts 1–2
([ADR-017](../architecture/ADR-017-session-x-local.md)). This file is the reference for anyone drawing or animating
ZIGi, and for the code that shows it. It replaces the "ZIGi states", "Assets and budgets" and "Motion" sections of
`YOUR_AI_V1.md`, which stay there for history.

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
  (`components/zigi/zigi-figure.tsx`, `lib/ai/zigi-look.ts` `SHELL_FRAME`: the original skin's idle still) and the
  optical offset as two CSS numbers (`components/ai/ai-launcher.css`, `--zigi-ox` / `--zigi-oy`). The manifest test
  keeps both equal to the default skin's base frame.
- **The alive chunk** (`components/zigi/alive.ts`, Session X-Local Part 1, ADR-017 S7) loads lazily on every app page
  once ZIGi is on screen and the browser is idle, never as part of the shell. It runs the state machine on every page and
  publishes to the bus which files show each state (`zigiFrames`): the poster, and the animated clip while motion is
  allowed. The shell figure reads the bus; the chat's avatar reads the manifest directly.
- **The state machine** is `components/zigi/events.ts`, a pure `transition` function plus timers (started by the alive
  chunk, and by the chat chunk on the first open; one listener per page). The shell carries only the tiny event bus and
  the stores (`components/zigi/bus.ts`). Events emitted before the machine starts are delivered to it when it does.
- **One picture** is `components/zigi/zigi-image.tsx`: the poster shows at once; the animated file is fetched and decoded
  off screen and swapped in only once it can play. Nothing large is on the critical path.

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

### The art each state wears (Studio-2, Session X-Local Part 1)

Studio-2 delivered clips for eleven states. The other fourteen wear a delivered clip (the manifest's `wears`), chosen after
watching every clip on the studio's review page, and keep their own small CSS move (`zigi.css`) on top. Studio-4 slots
(below) replace some of them when their files land.

| State | Wears | Why | Replaced by a Studio-4 slot |
|---|---|---|---|
| reading-your-data | thinking (T001) | the thinker pose and the index taps read as "looking something up"; the CSS scan adds the left–right glance | — |
| writing-proposal | speaking (F005) | open-handed gestures while a card streams in; the CSS nod stays | — |
| success | insight (F003) | a calm "got it" (the eye snaps bright, the index goes up), not a hop: ordinary successes stay small (ADR-017 S17) | — |
| proud | celebrate (F009) | the hop and the fists, for a streak milestone the engine counted | — |
| curious | listening (F004) | the lean-in and the eye that follows: ZIGi asks which one | — |
| surprised | insight (F003) | the eye snapping wide on frame 31; the CSS pop adds the lift | — |
| confused | error (E001) | the glance aside and the shrug, without error's desaturation | — |
| empathetic | listening (F004) | the gentle lean-in and the slow blink | — |
| encouraging | speaking (F005) | warm open-hand gestures; the CSS double nod | — |
| wave-goodbye | idle (F001) | greeting's wave starts with a walk-in from screen-left, wrong for a goodbye; idle's still with the CSS wave until the in-place greeting lands | `transitions.greetingInPlace` (X001) |
| reminder | attention (F007) | the knock itself | — |
| offline | sleepy (F008) | resting; the CSS dim and desaturation say "offline" | — |
| peek | listening (F004) | a quiet lean-in at the screen's edge, eye alive (attention's endless knock would be noise on the edge tab) | `gaze.viewer` (X021) |
| loading-model | thinking (T001) | the thinker pose; the CSS dim says "loading" | — |

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
| `origami-nebula` | Original | the default; Studio-2 art (eleven clips, the other states wear one of them) |

Customize also shows `comingSoon` (3) "Coming soon" silhouette tiles. They are not selectable: they are honest
placeholders for looks being drawn. Unknown skin names, such as a skin chosen in a later build, show the default.

To add a skin:

1. Put its files under `apps/web/public/brand/figures/zigi/<skin>/` (`scripts/zigi/import-studio.mjs --skin <skin>`
   copies a studio delivery there and fills the manifest, Part 2).
2. Add a `skins.<skin>` entry: `label`, `placeholder: false`, `opticalOffset` (measure it; see below), `sizes`, and
   `states` with the per-state files it has, plus `extras` (the Studio-4 slots).
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
- **Naming (the studio's names, kept exactly so that a later delivery is a pure file swap, ADR-017 S2):**
  - `<code>-<state>.webp`, `<code>-<state>-2x.webp`, `<code>-<state>-large.webp`;
  - an animated state adds `<code>-<state>.anim.webp` and its APNG fallback `<code>-<state>.anim.png` (96 × 126,
    12 fps, a 255-colour palette with binary alpha: shown only where a browser cannot play animated WebP);
  - Studio-4 extras follow the same shape with their own codes: `X001-greeting-in-place…`, `X010-idle-glance…`,
    `X020-gaze-chat-input…`, `R001-…` to `R013-…`.
- **Brand inventory test:** `lib/brand-assets.test.ts` pins the number of `-2x` files (28) and exempts `-large` frames
  and `.anim.webp` clips. `lib/ai/zigi-assets.test.ts` checks every delivered file mechanically: the format from its bytes,
  the pixel size, the byte budget, the loop count (loops loop, one-shots play once), every state resolvable, every
  fallback chain ending in an existing file, and the Studio-4 slots present and empty.
- **Per-state entries:** `skins.<skin>.states.<state>` = `{"1x": …, "2x": …, "large": …, "animated": …,
  "animatedFallback": …, "wears"?: <state>}`. Any field may be missing; a missing one falls back as above.
- **The Studio-4 slots** (`skins.<skin>.extras`, data only, `null` until the files land): `reactions` R001–R013,
  `idleVariants` (X010, X011), `transitions` (`greetingInPlace` X001, `chain`), `gaze` (`chatInput` X020, `viewer` X021,
  `target` X022). `reactionTriggers` at the top level names the semantic event each reaction answers; it stays `null`
  until Studio-4 or the owner names it (ADR-017 S11). The importer fills the slots; no code changes for a swap.
- **The receipt:** every delivered file's SHA-256 is in `docs/verification/x-local/STUDIO2_RECEIPT.md`; the importer
  verifies a new delivery against a receipt of that shape (or a `SHA256SUMS`) and refuses anything unlisted.
- **Animated files:**
  - The first frame is the still pose (NEUTRAL).
  - Loops loop seamlessly; one-shots end on the still pose within the state's duration and hold it until ZIGi rests.
  - An animated file plays only while motion is allowed. Under reduced motion, Motion Off or ZIGi's animation Off,
    the still file shows instead (`frameFor` in `zigi-avatar.tsx`; the alive chunk publishes no clip to the shell).
  - The poster shows first; the clip is fetched only when its state shows and ZIGi is on screen, decoded off screen,
    then swapped in (`zigi-image.tsx`). Nothing preloads every clip.
- **Pose:** the figure stands on the baseline of its box (`object-fit: contain`) and fills 83 % of the frame's height
  (feet 2 % above the bottom: room for the hop and the raised arms). The drop shadow is CSS, not part of the file.

## Optical centre

ZIGi is not symmetric, so centring its box in the launcher's circle leaves the figure looking off-centre. Each skin
carries `opticalOffset {x, y}`. This is how far to move the figure so that its **alpha-weighted centre** (each pixel
weighted by its opacity) lands on the circle's centre. The values are fractions of the figure's box width and height.

- **The original skin:** x +0.023, y −0.090, measured from `F001-idle.webp` (1×, 2× and large agree to 0.002) in
  Chrome on 2026-10-07. The figure's visual centre sits at 0.477 / 0.589 of its box, low because the figure keeps
  headroom; the offset lifts it onto the circle's centre. (The placeholder measured x −0.041, y +0.001.)
- **The box:** the launcher's figure box is 1.18× the placeholder's (52 px in the 56 px circle; 45 px for S, 61 px for
  L; 35 px on the edge tab), so the smaller fill reads as the same size as before.
- **The check:** `tests/zigi-alive.spec.ts` measures it in the page, from the very file the browser chose, at S, M and
  L (48, 56 and 64 px circles; 38, 44 and 52 px figures) and at 1× and 2× density. It asserts the visual centre is
  within 0.75 px of the circle's centre, and that the manifest's offset matches the measurement.

## Motion

- **The person's choice:** Customize → Animation offers Full, Calm (the default) and Off, stored in `zigoals:zigi:v1`.
  The launcher shell writes it to `html[data-zigi-motion]`. Since Session X-Local Part 3: **Calm** plays the idle clip
  (F001) and a clip for what happens; **Full** adds the idle rotation below; **Off** shows a still frame for every state.
- **The launcher's breath:** a CSS-only idle loop on the circle's figure, kept for the poster until the idle clip plays
  (the clip breathes by itself). It moves the `img` only, never the button, so the click target stays still. The shell
  holds no animation code and no pause logic: browsers do not run animations in hidden tabs.
- **The idle rotation** (`components/zigi/idle.ts`, run by the alive chunk; owner decision D2): under Full, while ZIGi
  rests in idle, a variation now and then: a *glance* (listening F004, weight 0.5; thinking T001, 0.3) or, rarely, an
  *accent* (insight F003, 0.2), plus the Studio-4 idle variants (X010, X011) once their files land. The base idle keeps
  half of every pick. A variation starts 25–60 s (random) after the last one ended and plays for its clip's length; never
  the same variation twice in a row; an accent at most once per 3 minutes and never right after another accent; sleepy
  (F008) is never a variation (it comes only from the 90 s inactivity rule). It runs only while the tab is visible,
  ZIGi is idle, motion is allowed and nobody has typed in a text field for 3 s; it stops at once when any of those
  changes. Under Calm there are no variations; under Off, reduced motion or Motion Off, posters only. The panel's head
  shows the variation too; Meet ZIGi and Customize never do (reference figures).
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
