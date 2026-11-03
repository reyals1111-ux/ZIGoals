# Session AK F8: performance and accessibility (owner follow-up 1)

Measured by the F8 lane on 31 October 2026 against the production build of `8a98bdf0`, Chromium, through the browser
lock: Slow 4G (150 ms RTT, 1.6 Mbps), CPU 4×, 390×844 at DPR 3; median of 3. "Cold" = new context, service workers
blocked, empty cache; "warm" = worker installed, reload; "offline" = worker, network off. Times in ms.

## Before (cold)

| Route | FCP | LCP | load | hydrated | long tasks | longest | TBT | CLS | kB (JS) |
|---|---|---|---|---|---|---|---|---|---|
| /app | 2428 | 7932 | 6449 | 7100 | 23 | 623 | 2199 | 0.001 | 1318 (741) |
| /app/health | 1900 | 3252 | 7370 | 5469 | 20 | 674 | 2044 | 0.751 | 1389 (665) |
| /app/wealth | 1732 | 3148 | 4835 | 5416 | 22 | 334 | 1539 | 0.117 | 1146 (745) |
| /app/agenda | 1304 | 6532 | 4124 | 4529 | 11 | 316 | 818 | 0.024 | 932 (585) |
| /app/journey | 1392 | 5024 | 5467 | 4544 | 13 | 443 | 1225 | 0.001 | (592 JS) |
| /app/earn | 1372 | 6160 | 4350 | 5555 | 19 | 1082 | 2948 | 0 | 1085 (615) |

Warm / offline (FCP / LCP / hydrated / TBT): /app 1448/4388/3755/1778 and 1416/3480/2656/1406; /app/health
760/1252/2216/1799 and 548/1936/1268/1031; /app/wealth 692/1148/2100/1192 and 732/1784/1236/699; /app/agenda
572/3436/2208/916 and 508/1604/1198/516; /app/journey 408/2348/2010/942 and 488/1684/1329/481; /app/earn 944/944/4134/1976
and 920/3952/3063/1747. The offline shell opens all six routes.

Heaviest at CPU 4× (warm): Earn (fresh) longest task 4.0 s, TBT 8.0 s; Checklist (Showcase) longest 2.5 s, TBT 4.5 s;
Today (Showcase) TBT 4.45 s; Settings (Showcase) TBT 2.4 s. INP proxies (Showcase, 4×): Quick add 368, Earn "What's a
validator?" 520, other taps 160–344. A6 headroom (Showcase): platform 120 KB (6 % of 2 MB), health 106 KB; a module at
2 MB costs 17 ms parse, 17 ms stringify, 46 ms setItem at 4×.

## Causes and fixes

- The path engine measured each name with a forced layout (about 170 ms each on Earn at 4×): all names now go into the
  probe at once and are read after one layout — Earn's 16 names 2.85–3.07 s → 0.16–0.17 s, the Checklist's 15 names
  0.55–0.62 s → 0.04 s, widths identical (components/path/path.tsx).
- ZIGi's placement search on the path spent 1.9 s in `overlap` on the Showcase Checklist: a place whose cost before
  collisions already reaches the best so far is skipped (both terms never below zero, so the chosen place is exactly the
  same; components/path/path-zigi.tsx). No visual change on the PROTECTED Checklist.
- Earn laid out all 16 sections on load: `content-visibility: auto` on the sections below the first screen
  (components/earn/earn.css). Injected, median of 3: TBT 8.0 → 5.9 s, longest 4.0 → 2.6 s; geometry, deep links and the
  accessibility tree unchanged. With the path fix the longest task is expected under about 1 s.
- Quick add re-rendered the whole sheet in the tap: its chunk preloads on pointerdown and focus of "+", and the state
  that only arms Back-closes moves into a transition (components/quick-add.tsx).

## Accessibility (axe-core from the pnpm store, WCAG 2.0/2.1/2.2 A and AA and best practice, Nebula, Light, Dark)

Clean on the agenda (week, month, export), Wrapped, search actions, the debt planner, net-worth milestones, experiments,
On this day, the token check, supplements, measurement trends, both savings challenges, habit intentions, Earn and the
Checklist. Fixed: Wrapped's dialog keeps focus and Escape works anywhere in it; the search palette counts actions in its
spoken result count and its field shows a focus line; focus moves into the agenda export and the token check when they
open; habit intentions and experiments return focus; names match the visible text on the no-spend "Today" button and the
first-week "Not yet"; supplements' reminder names its item and the note is always a status region.
Remaining: Governance repeats the section labels "What it would change" and "Final votes" on every card
(landmark-unique, components/governance/proposal-card.tsx).

## Proposals recorded (not done in this PR)

1. Settings: `content-visibility: auto` on its groups (injected: TBT 2.4 → 1.45 s) — left out because Settings' hash
   links and scrolling are pinned by many specs; a follow-up with its own spec pass.
2. Today: mount the widget area below the first screen on view (2,768 of Today's 3,513 elements; React rendering is the
   cost). The hero and slogan are PROTECTED and stay.
3. Cold-load layout shift on Health and Wealth: the PROTECTED footer paints before the page content; a min-height on
   `.workspace main` or on the loading placeholders.
4. Duplicate images on every route (the wordmark in two formats, the logo and ZIGi's idle frame fetched twice) and the
   footer's scene image without `loading=lazy`.
5. Defer the animated ZIGi until idle on Health's cold load (358 KB); the intro video is PROTECTED.
6. LCP lands after hydration on every route: less JavaScript on first load is the lever (/app ships 741 KB).
