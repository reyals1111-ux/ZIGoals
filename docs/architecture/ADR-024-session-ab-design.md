# ADR-024: Session AB-Design, "The giant UI upgrade: one premium 4-in-1 app": session decisions

Status: **In progress** on `feature/session-ab-design`, from `main` `6c1052b2` (Merge #84; the owner reports it live as
Alpha #39 — the repository records nothing past Alpha #38 `e3fa408d`, so "#39 = 6c1052b" is owner-reported here), on
the owner's Mac (M1 Max). This record holds the owner's decisions at plan approval and every decision the session took
without asking (the brief: the safest option that keeps every promise and every public-safety fact). The parallel lane
AB-Cloud (`feature/session-ab-cloud`, ADR-023) owns data/sync, workers, workflows, scripts, docs except this lane's own,
Settings → Sync and Your data files, the Restore flow and the "Point & tell" feedback mode; this lane owns all visual
work. The lanes talk through `docs/handoff/AB_DESIGN_TO_CLOUD.md` (mine) and `docs/handoff/AB_CLOUD_TO_DESIGN.md`
(read on `origin/feature/session-ab-cloud` at every gate). Evidence: `docs/verification/ab-design/`; captures on
`review/session-ab-design-screens`. The owner's request list: `docs/product/OWNER_UI_REQUESTS_AB.md`.

## Owner decisions (2026-10-13, plan approval)
- **The brief:** eight parts in priority order (the global shell; Today; Goals; Habits; Health; Wealth and Portfolio;
  the 4-in-1 identity, the game layer and AA's features made premium; the phone sweep), three gates, one giant PR
  (Draft until Gate C), captures before/after at 1440/1024/390 (+320 spot checks) on an orphan branch with an index,
  the decisions here as D1…Dn. Keep everything (move or tuck, never remove), Showcase never looks real, estimates
  labelled, unknown is not zero, no fake links, placeholders say "Soon". New device-only state in one loose versioned key
  `zigoals:ui-prefs:v1`; saved layouts never rewritten. Respect reduced motion and Motion Off; Playwright two workers,
  nothing in parallel; no new dependencies; no wallet/contract/key changes; never merge or deploy.
- **The protected baseline (CLAUDE.md, docs/STATUS.md "Current accepted baseline"):** this redesign changes the accepted
  look on purpose; the owner's plan approval is the owner approval the rule requires. The sidebar motto stays pixels in
  `public/brand/words/*.webp` (the three "not DOM text" tests remain true); only its position moves.
- **D1 Typography (request 37):** keep the system font stack this run; one explicit type scale ships as CSS tokens.
  Inter (OFL, self-hosted; ≈ 95–110 KB Latin subset or ≈ 340 KB full per face, re-measured Today-screens ceilings and
  320 px pixel checks) is recorded as an owner item, not done.
- **D2 Phone top bar (request 10):** `+ / Search / More`; Settings and Help are the last rows of More; the wallet shortcut
  keeps its icon when that button is enabled; the tab bar is Today, Goals, Habits, Health, Wealth.
- **Owner edits at approval (pre-approved, applied):**
  1. Requests 32, 33 and 35 belong to Part 7 (order 28, 29, 30, 31, 33, 32, 34, 36, 35, 38, 39). Part 8 (request 40) is
     never skipped, even under a lean-finish note. Request 9 also: with Gamify on, XP/level widgets can be added to
     Today through the normal widget picker; off = none shown.
  2. A quality loop after every part: production build → captures of the touched pages in the Showcase
     (1440/1024/390 + 320) → self-review against the owner's checklist (one spacing scale; nothing overlapping or
     wrapping badly; contrast ≥ 4.5:1 and no tiny grey copy; one card/header/button language; pillar colours
     consistent; motion one-time and still under reduced motion/Motion Off; every new visual finished on phone and
     desktop) → fixes before the next part. At Gate B and Gate C one independent, read-only design-critique agent over
     the before/after gallery; every weakness fixed and recorded here.
  3. The craft bar: the footer banner must look like a top-tier app/website footer (layered depth over the single
     planet, a glowing constellation-style line linking the three steps with the fold-mark glyphs, the wordmark and
     slogan as the centrepiece, links and the disclaimer clean and readable; phones stack the steps). The eight vision
     illustrations and the ten new card scenes are rich, layered, lit artworks in one nebula style, iterated on the
     captures.
  4. Footer X links: config prefilled with `x.com/ZIGoals` and `x.com/ZIGFluencer`, both `enabled: false` until the
     owner confirms; nothing renders while disabled.
  5. Card art (17) is wired to AB-Cloud's `setGoalCardArt` as soon as that commit is on
     `origin/feature/session-ab-cloud` (re-checked at every gate); otherwise the adapter stays and the one-line switch
     is listed in both handoffs for the second merger. Base currency (24) defaults from AB-Cloud's `defaultCurrency()`
     (euro-area → EUR, else USD) once available; until then USD.
  6. Local-Mac rules: `caffeinate -dimsu` for the session; servers only from Bash (nohup, ports 3102–3104, curl health
     checks), never the preview pane; every long command under a timeout; no further approval requests (owner items go
     to `docs/verification/ab-design/SESSION_STATUS.md` "Resume here", the PR and the handoff); commit and push at every
     part boundary; the Mac's WebKit as well as Chrome for the iPhone captures in Part 8; every server and caffeinate
     stopped at the end.
  7. Budget: finish before Sunday 13:00 Brussels without being paused; a lean-finish note means finish the current part,
     do Part 8 anyway, Gate C lean, STATUS entry, PR ready.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| D3 | 0 | The "before" gallery is captured from `main`'s own production build (`6c1052b2`, `:3103`) in the Showcase at 1440/1024/390/320 before any edit; "after" columns are added per gate from this branch's build. | A gallery whose before-images come from the same build the owner has live is the only honest baseline for the freeze check and the critique agent. |
| D4 | 1 | `zigoals:ui-prefs:v1` is one loose versioned record (`{version:1, heroCollapsed?, musicFolded?, themeMode?, baseCurrency?, dismissed?}`), read tolerantly (garbage → defaults), written through `getAppStorage()` so the Showcase keeps its own copy; named in `lib/ab-device-keys.ts`; a display key in onboarding's `NON_PERSONAL_KEYS`, Export everything's `DEVICE_KEYS` and the data catalog; erase keeps it. | The owner's rule plus the `aa-device-keys` pattern: nothing enters a strict synced record, builds #32–#39 ignore the key, a bad reader can only fall back to defaults. |
| D5 | 1 | The main background is a vector starfield (`public/art/v24/starfield.svg`, generated by a seeded script kept in `apps/web/art-src/`), attached as a fixed full-viewport layer with solid top and bottom fades; the sidebar keeps its own art. | Vector is crisp at every DPR for ≈ 10 KB gzip, needs no 1x/2x pairs, and a fixed layer never stretches over the scroll height (the cause of today's blur). Static by construction. |
| D6 | 1 | One footer component replaces the shell footer and both horizon layers; the horizon art is drawn exactly once as the band's own background; the 3-step line draws once through `useEntrance` and is fully drawn under reduced motion / Motion Off; the disclaimer spans keep the `network-banner` and `mode-strip` class names and the same sentences. | The doubled horizon was two stacked layers at two widths; removing both and drawing once fixes it. Keeping the class names and sentences keeps `scripts/verify-hosted-alpha.mjs` (AB-Cloud's path) green without editing it; the handoff tells AB-Cloud it may retarget. |

## Assertions changed (deliberate, listed)
Filled per part. None weakened: every public-safety fact is still asserted at its new place.

## Freeze check
Filled at Gate C: every desktop difference with its reason.

## Design critique (Gate B, Gate C)
Filled at the gates: the agent's list and the fix for each item.

## Rejected options
- Raster AVIF/WebP starfield at 1x/2x: crisp only at two DPRs, ≈ 150–300 KB for a 2x frame against ≈ 10 KB for the vector; the owner allowed either, the vector keeps page weight healthy.
- Editing `scripts/verify-hosted-alpha.mjs` for the notice change: AB-Cloud's path; asked through the handoff instead.

## Consequences
Filled at Gate C.
