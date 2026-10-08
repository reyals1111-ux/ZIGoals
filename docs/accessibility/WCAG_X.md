# WCAG 2.2 AA, Session X (2026-10-08)

**Scope:** every page of the app (`/app` and below) and Health's Sleep, Meditation and Devices views, on both Playwright
projects (desktop 1280 × 720, iPhone 13 390 × 664), empty and with the Showcase. ZIGi's launcher, panel and Meet ZIGi are X-LOCAL's lane: excluded from the
automated checks here, findings handed over (`docs/handoff/X_CLOUD_TO_LOCAL.md`, H5). The landing site has its own checks
(`tests/landing-v5-a11y.spec.ts`).
**Method:** `apps/web/tests/a11y-wcag-x.spec.ts` (automated, reusing `tests/a11y-audit.ts`, no new dependency) plus the
earlier a11y specs, and a manual review for what a browser cannot decide. Labels: local, CI, source. This is a
self-assessment against [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (W3C Recommendation, 12 December 2024 edition), not a
certification.

**Status:** all criteria pass on the local production build after five fixes (F1–F5). Spec runs on 2026-10-08:
run 1 (first draft) and run 2 sorted the spec's own false positives from real findings; run 3 and run 4 confirmed the fixes
(14 of 16 passed in run 4, the rest being the spec's gradient-text reading); run 6 added the Health views (15 of 16; the
contrast test then caught a button mid-fade, now measured once transitions end); the final run is recorded under Gate C
in `docs/STATUS.md`. CI runs the spec with the rest of the browser suite.

## Criteria (Level A and AA)
"Spec" = checked by `a11y-wcag-x.spec.ts` on every page; "earlier spec" names the existing test; "review" = checked by
hand on 2026-10-08; "n/a" = the app has no such content. Results are local (production build, `PUBLIC_ALPHA_UNDEPLOYED`)
unless marked CI.

| # | Criterion | Level | How it is checked | Result |
|---|---|---|---|---|
| 1.1.1 | Non-text content | A | spec (image-alt, names for every control); review of charts' text alternatives (`role=img` with a title, tables beside charts) | pass |
| 1.2.1 | Audio-only and video-only (prerecorded) | A | the brand film has music and on-screen words, no speech; its summary says so (`a11y-motion-dialogs.spec.ts`) | pass |
| 1.2.2 | Captions (prerecorded) | A | n/a: no speech in the brand film | n/a |
| 1.2.3 | Audio description or media alternative | A | the film's one-line summary describes what is shown (earlier spec) | pass |
| 1.2.5 | Audio description (prerecorded) | AA | review: the film's text alternative covers its visual content | pass |
| 1.3.1 | Info and relationships | A | spec (labels, radio groups, landmarks, one h1, no naming attribute on a role-less element); review of tables and lists | pass after fixes (F1) |
| 1.3.2 | Meaningful sequence | A | spec (keyboard order follows the reading order) | pass |
| 1.3.3 | Sensory characteristics | A | review of instructions ("the button on the right" is never the only cue) | pass |
| 1.3.4 | Orientation | AA | earlier spec: landscape phone layout (`phone-pages.spec.ts`) | pass |
| 1.3.5 | Identify input purpose | AA | review: email `autocomplete="email"`, the sign-in code `one-time-code` | pass |
| 1.4.1 | Use of colour | A | review: states carry text or icons, not colour alone (pressed chips, errors, streak days) | pass |
| 1.4.2 | Audio control | A | focus sounds play only on request, with Stop (`music.spec.ts`) | pass |
| 1.4.3 | Contrast (minimum) | AA | spec (computed text colour against the composited background, gradients by their stops, once transitions end) for Sleep, Meditation, Chess, the music panel, Portfolio and Settings (15–426 texts per area); review elsewhere | pass |
| 1.4.4 | Resize text | AA | spec: 200 % zoom (640 CSS px) without loss | pass |
| 1.4.5 | Images of text | AA | review: only the logo | pass |
| 1.4.10 | Reflow | AA | spec: 320 CSS px, no sideways scroll on every page | pass after fix (F2) |
| 1.4.11 | Non-text contrast | AA | review of focus rings (#69d9e9 on the navy surfaces, above 3:1), field borders, chart lines | pass |
| 1.4.12 | Text spacing | AA | spec: the four spacing overrides, no sideways scroll | pass |
| 1.4.13 | Content on hover or focus | AA | review: liquid-glass hover is decoration only; tooltips dismissable | pass |
| 2.1.1 | Keyboard | A | spec (Tab through every page) and the earlier keyboard specs (Help, Ecosystem, charts) | pass |
| 2.1.2 | No keyboard trap | A | spec: focus always moves on (a date or time field takes one Tab per segment first) | pass |
| 2.1.4 | Character key shortcuts | A | review: `?` and ⌘K belong to ZIGi (X-LOCAL); `?` only outside text fields | pass (X-LOCAL's to keep) |
| 2.2.1 | Timing adjustable | A | review: no time limits; the sign-in code's expiry is the provider's | pass |
| 2.2.2 | Pause, stop, hide | A | spec: nothing keeps moving under reduced motion or Motion Off; no auto-playing media | pass |
| 2.3.1 | Three flashes or below | A | review: no flashing content | pass |
| 2.4.1 | Bypass blocks | A | spec: the skip link is the first Tab on every page, and the next Tab lands in the content | pass |
| 2.4.2 | Page titled | A | spec: every page has its own title (Session X Part 12, ADR-016 X39; Meet ZIGi handed over, H4) | pass |
| 2.4.3 | Focus order | A | spec and review | pass |
| 2.4.4 | Link purpose (in context) | A | spec (names); review of "Open →" style links | pass |
| 2.4.5 | Multiple ways | AA | navigation, Today's links, Help topics, Settings' grouped list | pass |
| 2.4.6 | Headings and labels | AA | spec (one h1, named sections); review | pass |
| 2.4.7 | Focus visible | AA | spec: a focus indicator on every focused control | pass after fix (F5) |
| 2.4.11 | Focus not obscured (minimum) | AA | spec: the focused control is never entirely hidden (five points sampled) | pass after fix (F4) |
| 2.5.1 | Pointer gestures | A | review: no path-based or multipoint gestures required (the phone sheets' drag also closes by button) | pass |
| 2.5.2 | Pointer cancellation | A | review: actions on click (up), not on down | pass |
| 2.5.3 | Label in name | A | spec (names) and review of icon buttons | pass |
| 2.5.4 | Motion actuation | A | n/a: nothing is driven by device motion | n/a |
| 2.5.7 | Dragging movements | AA | review: the charts inspect by pointer move or arrow keys; reordering by buttons; sheets close by button | pass |
| 2.5.8 | Target size (minimum) | AA | spec: 24 × 24 px, or the spacing exception, or inline in a sentence; measured again with every disclosure open (the design language asks 44 px on phones, which phone-base.css gives) | pass after fixes (F3) |
| 3.1.1 | Language of page | A | spec: `lang="en"` | pass |
| 3.1.2 | Language of parts | AA | review: names people type in other scripts are their own content | pass |
| 3.2.1 | On focus | A | review | pass |
| 3.2.2 | On input | A | review: switches save as stated; selects never navigate by themselves | pass |
| 3.2.3 | Consistent navigation | AA | spec: the same navigation on every page | pass |
| 3.2.4 | Consistent identification | AA | review: page titles match navigation labels | pass |
| 3.2.6 | Consistent help | A | spec: the way to Settings (Help & diagnostics, Send feedback) keeps its place in the main navigation and the phone bar on every page | pass |
| 3.3.1 | Error identification | A | review and the forms' specs (the field and the error in text) | pass |
| 3.3.2 | Labels or instructions | A | spec (labels) | pass |
| 3.3.3 | Error suggestion | AA | review: errors say what to do | pass |
| 3.3.4 | Error prevention (legal, financial, data) | AA | confirmations before deletion and before any simulated money action; Export everything's consent | pass |
| 3.3.7 | Redundant entry | A | review: no step asks again for what was already entered | pass |
| 3.3.8 | Accessible authentication (minimum) | AA | the sign-in is an email code with paste and one-time-code autofill; no cognitive test | pass |
| 4.1.2 | Name, role, value | A | spec (names, roles, aria-checked on switches) | pass |
| 4.1.3 | Status messages | AA | review and earlier specs: saves and errors announce through `role=status`/`alert` | pass |

(4.1.1 Parsing is obsolete in WCAG 2.2 and always satisfied.)

## Findings and fixes (local, 2026-10-08)
Four runs of the spec against production builds; each finding was traced to its element before anything changed, and
every fix leaves desktop and tablet layouts where they were unless stated.

| # | Criterion | Finding | Fix |
|---|---|---|---|
| F1 | 1.3.1, 4.1.2 | `aria-label` on a `div` or `span` with no role, which names nothing for assistive technology: the Wealth total, each portfolio composition, the ecosystem initials tile, the motion preview, the two position grids (Wealth, Portfolio, Ecosystem, Settings, Staking) | Each gets the role its label describes (`group`, or `img` for the initials tile); the label text is unchanged |
| F2 | 1.4.10 | Wealth at 320 px was 326 px wide: on phones a holding card's "In Goals" and "Available" sit side by side without wrapping, and the card's grid track grew to fit them (both projects) | `phone-wealth.css`: that row may wrap; it only does when the two do not fit, so 390 px phones and every computer are unchanged |
| F3 | 2.5.8 | Targets under 24 px touching another target: Private recovery's three stacked disclosures (23.3 px, Settings); "Open Sleep →" under the bedtime button (19 px, Health); the first Goal link in Staking's open "Use for a Goal" disclosure, 2 px under its summary; with the fallback font CI uses (no Inter), Today's "Explore ecosystem providers →" beside "View staking →" (23 px) | The disclosures at least 24 px (desktop; phones keep their 44 px); the Sleep link gets 3 px of padding, which never moves an inline line; the open disclosure's summary gets 8 px below it (closed, nothing changes); the staking card's links at least 24 px (with Inter they already are) |
| F4 | 2.4.11 | A focused control could be entirely hidden: on computers behind the floating music button (Settings' last switch, Staking's "Report a bug"); on phones behind the music and ZIGi buttons above the tab bar, and on Create a goal behind its sticky actions (filter chips, card options, idea buttons, form fields) | Keyboard focus now stops above them: `scroll-padding-bottom` 84 px on computers (`globals.css`) and the tab bar + 88 px on phones (`phone-shell.css`). Nothing moves; it changes where the browser scrolls a newly focused control to, and the centre a script's `scrollIntoView({block: 'center'})` aims at (42 px higher on computers). `scroll-margin` on the controls was tried instead: `focus()` honours it, but Chrome's Tab navigation does not |
| F5 | 2.4.7 | A date field's own calendar button (the browser's, inside the field) takes a Tab stop and draws no ring: the field looked unfocused (Create a goal, Health, Settings' time field) | `design-system.css`: a date or time field keeps the app's ring while that inner button has focus (`:focus-within:not(:focus)`) |

What the runs showed was not a finding, and how the spec was corrected (no check made weaker):
- A control's clickable label counts as part of its target, and the spacing exception is applied as the Understanding
  document defines it (a 24 px circle per undersized target), so a checkbox inside a wide label is not a finding.
- A control inside a closed disclosure has a layout box but cannot be hit: the target check measures only what is shown,
  then opens every disclosure and measures again (that second pass found F3's Staking link).
- 2.4.11 fails only when the focused control is entirely hidden (five points sampled), as the criterion says; 2.4.12 (AAA)
  is not claimed.
- A keyboard trap is focus that Tab cannot move: a date or time field takes one Tab per segment, and under heavy load one
  Tab can land while a page re-renders, so focus has to stay put twice (five times in a segmented field) to count.
- The skip link is checked by where the next Tab lands (inside `#main`), not by `document.activeElement` after Enter.
- Gradient text is measured by its colour stops, its layers drawn over each other, against what is behind it (the titles'
  one-time light sweep is a mostly transparent layer over the nebula; counted alone it read as 1:1); text over an image is
  skipped and counted.
- Text in a disabled control is exempt under 1.4.3 (inactive user interface components): Settings' and Chess's buttons that
  wait for input (Unlock and preview, Import backup, Save usernames, the account buttons while accounts are closed, the
  first and last reorder arrows) read 2.4–4.2:1 at their 48 % disabled opacity and are not findings.
- While a page streams, React keeps the streamed part in a hidden holder (`div[hidden][id^="S:"]`, ids included) until it
  swaps it in; the checks start once no holder is left (a duplicate `habits-title` seen once under load was that holder).
- Two runs used the fonts CI has (Inter hidden from the browser; CI's runner has no Inter): the fallback font is taller in
  places and found F3's staking link; the spec passes both ways.
- The phone bar's Settings button is found by its name: on Help the bar's back link ("Back to Settings") has the same
  address.
- Health's Sleep, Meditation and Devices views load on demand after a one-line placeholder; each is checked once its own
  heading is there (a first contrast run measured two placeholder lines).
- Buttons fade their colours over 0.15 s (`globals.css`); contrast is read once no transition runs (a switch that takes its
  saved state after loading read 4.36:1 mid-fade; settled, the primary gradient's worst stop gives 5.6:1).

## Not covered here
- ZIGi's launcher, panel and Meet ZIGi (X-LOCAL's lane; handoff H5 lists what the shell now does for them).
- Real assistive technology (VoiceOver, TalkBack, NVDA) and real devices: owner or tester items in
  `docs/ROADMAP_SWEEP_X.md` (device tests).
- Contrast is measured on the six areas the brief names; the rest of the app is reviewed by eye against the text tokens in
  `components/design-system.css` (all at least 7:1 on #0d1629).
