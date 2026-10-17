# Session AE Gate C — layout and contrast audits

`tests/audit/layout-audit.mjs` (Session AB-Design's audit: sideways scroll, clipped, spilled and overlapping text, broken
numbers, ring labels, touch targets, covered text, contrast against the pixels behind) against local production builds on
:3101, Chrome channel, every state it can open, in the Showcase and on a new device. Runs are listed in order; each fix
was followed by a re-run of the states it touched.

| Run | Build | Theme | Widths | States | Findings | Outcome |
|---|---|---|---|---|---|---|
| 1 | `87780f88`'s app code | Light | 390, 1440 | 133 | 70 contrast: Habits' 30-day map (69, the days with some or many check-ins: dark numerals on their deep fill, 3.05:1), a new goal's chosen source tile (1, 4.33:1) | fixed `90c1b18d`, `87780f88`; re-run (10 states) clean |
| 2 | `87780f88` | Dark | 390, 1440 | 133 | none | — |
| 3 | `87780f88` | Nebula | 390, 1440 | 133 | none | — |
| 4 | `074c359e` (after the design round) | Nebula | 320 (`6780570b`, interrupted by a container restart after 78 states), 768, 1024, 1920 | 66 + 198 | contrast on a new goal's type cards at 320 (the cards side by side, "meaningful" over a card's edge, 3.94:1); the hero slogan's line boxes touching by 4–5 px at 768 and 1920 (24) | type cards fixed `074c359e`, re-run clean; the slogan overlap is the same on `main` (Session AD's audit recorded the same 310 × 4 and 500 × 5 boxes) — unchanged, protected baseline |
| 5 | `074c359e` | Light | 320, 768, 1024, 1920 (main pages) | 44 | the hero pillars' small words in the night pool's foot fade since the design round (16 contrast, down to 1.3:1); the slogan overlap | fixed `9421f717`; Today, its fold and a new device re-run at 320–1920 (18 states): only the slogan overlap |
| 6 | `074c359e` | Dark | 320, 768, 1024, 1920 (main pages) | 44 | the slogan overlap only | as on `main` |
| 7 | `074c359e` | Nebula, touch (coarse pointer) | 768, 1024 | 132 | the slogan overlap; the positions heading's line on the starfield's lightest glow at 1024 (4.23:1) | fixed `118c2983` |
| 8 | `074c359e` | Nebula, stress records | 390, 1440 (main pages) | 12 | none | — |

Not findings (the audit's advisory list, unchanged since Session AD): controls between 24 and 44 px on the pointer layout
(WCAG 2.5.8 met; 44 px is the touch layout's rule).
