# Theme parity (Session AF, ADR-028 H75)

Results of `tests/theme-parity-af.spec.ts` (computer and phone layouts) and `tests/webkit-theme-parity.spec.ts`, folded by `scripts/parity-report.mjs` on lane L5a's final build (af/ui, 2026-10-19; Chrome on the computer and phone layouts, WebKit on the phone; the theme sheets regenerated from the lane's generator). Each row compares a route in a state with Nebula: the allowed classes are words (text), neutral and night surfaces, lines and shades (neutral; and the page's own ground), the calm of the named art layers (art-calm) and the theme bar; anything else, and any box that moves by more than half a pixel, is DISALLOWED.

Rows: 114. Totals — text 355912 · neutral 19904 · art-calm 122 · theme-bar 11076 · DISALLOWED 8.

| Route | State | Project | Theme | Elements | text | neutral | art-calm | theme-bar | DISALLOWED |
|---|---|---|---|---|---|---|---|---|---|
| /app/activity | showcase | desktop | dark | 651 | 0 | 66 | 2 | 49 | 0 |
| /app/activity | showcase | desktop | light | 651 | 3552 | 194 | 1 | 79 | 0 |
| /app/activity | showcase | mobile | dark | 844 | 0 | 86 | 1 | 98 | 0 |
| /app/activity | showcase | mobile | light | 844 | 4969 | 226 | 1 | 165 | 0 |
| /app/checklist | showcase | desktop | dark | 339 | 0 | 28 | 2 | 49 | 0 |
| /app/checklist | showcase | desktop | light | 339 | 1300 | 34 | 1 | 79 | 0 |
| /app/checklist | showcase | mobile (webkit) | dark | 538 | 0 | 49 | 1 | 98 | 0 |
| /app/checklist | showcase | mobile (webkit) | light | 538 | 2753 | 68 | 0 | 165 | 0 |
| /app/checklist | showcase | mobile | dark | 538 | 0 | 49 | 1 | 98 | 0 |
| /app/checklist | showcase | mobile | light | 538 | 2753 | 68 | 0 | 165 | 0 |
| /app/chess | showcase | desktop | dark | 750 | 0 | 103 | 2 | 49 | 0 |
| /app/chess | showcase | desktop | light | 750 | 4235 | 132 | 1 | 79 | 0 |
| /app/chess | showcase | mobile | dark | 948 | 0 | 124 | 1 | 98 | 0 |
| /app/chess | showcase | mobile | light | 948 | 5679 | 166 | 1 | 165 | 0 |
| /app/earn | showcase | desktop | dark | 1491 | 0 | 108 | 2 | 49 | 0 |
| /app/earn | showcase | desktop | light | 1491 | 8271 | 155 | 1 | 79 | 0 |
| /app/earn | showcase | mobile (webkit) | dark | 1689 | 0 | 129 | 1 | 98 | 0 |
| /app/earn | showcase | mobile (webkit) | light | 1689 | 9715 | 189 | 1 | 165 | 0 |
| /app/earn | showcase | mobile | dark | 1689 | 0 | 129 | 1 | 98 | 0 |
| /app/earn | showcase | mobile | light | 1689 | 9715 | 189 | 1 | 165 | 0 |
| /app/ecosystem | showcase | desktop | dark | 1771 | 0 | 89 | 2 | 49 | 0 |
| /app/ecosystem | showcase | desktop | light | 1771 | 11039 | 278 | 1 | 79 | 0 |
| /app/ecosystem | showcase | mobile | dark | 1969 | 0 | 110 | 1 | 98 | 0 |
| /app/ecosystem | showcase | mobile | light | 1969 | 12483 | 312 | 1 | 165 | 0 |
| /app/goals/new | showcase | desktop | dark | 809 | 0 | 96 | 2 | 49 | 0 |
| /app/goals/new | showcase | desktop | light | 809 | 4466 | 297 | 1 | 79 | 0 |
| /app/goals/new | showcase | mobile | dark | 1008 | 0 | 116 | 1 | 98 | 0 |
| /app/goals/new | showcase | mobile | light | 1008 | 5920 | 330 | 1 | 165 | 0 |
| /app/goals | empty | desktop | dark | 468 | 0 | 34 | 2 | 49 | 1 |
| /app/goals | empty | desktop | light | 468 | 2360 | 46 | 1 | 79 | 1 |
| /app/goals | empty | mobile | dark | 652 | 0 | 52 | 1 | 98 | 1 |
| /app/goals | empty | mobile | light | 652 | 3635 | 76 | 1 | 165 | 1 |
| /app/goals | showcase | desktop | dark | 2328 | 0 | 186 | 2 | 49 | 0 |
| /app/goals | showcase | desktop | light | 2328 | 4827 | 108 | 1 | 79 | 0 |
| /app/goals | showcase | mobile | dark | 2526 | 0 | 206 | 1 | 98 | 0 |
| /app/goals | showcase | mobile | light | 2526 | 6272 | 141 | 1 | 165 | 0 |
| /app/habits | showcase | desktop | dark | 1603 | 0 | 97 | 2 | 49 | 0 |
| /app/habits | showcase | desktop | light | 1603 | 8495 | 1017 | 1 | 79 | 0 |
| /app/habits | showcase | mobile (webkit) | dark | 1797 | 0 | 118 | 1 | 98 | 0 |
| /app/habits | showcase | mobile (webkit) | light | 1797 | 9912 | 1050 | 0 | 165 | 0 |
| /app/habits | showcase | mobile | dark | 1797 | 0 | 118 | 1 | 98 | 0 |
| /app/habits | showcase | mobile | light | 1797 | 9912 | 1050 | 0 | 165 | 0 |
| /app/health | showcase | desktop | dark | 1258 | 0 | 93 | 2 | 49 | 0 |
| /app/health | showcase | desktop | light | 1258 | 7177 | 357 | 1 | 79 | 0 |
| /app/health | showcase | mobile | dark | 1391 | 0 | 109 | 1 | 98 | 0 |
| /app/health | showcase | mobile | light | 1391 | 8261 | 364 | 1 | 165 | 0 |
| /app/help | showcase | desktop | dark | 951 | 0 | 45 | 2 | 49 | 0 |
| /app/help | showcase | desktop | light | 951 | 5565 | 68 | 1 | 79 | 0 |
| /app/help | showcase | mobile | dark | 1150 | 0 | 66 | 1 | 98 | 0 |
| /app/help | showcase | mobile | light | 1150 | 7018 | 102 | 1 | 165 | 0 |
| /app/journey | showcase | desktop | dark | 589 | 0 | 59 | 2 | 49 | 0 |
| /app/journey | showcase | desktop | light | 589 | 3065 | 73 | 1 | 79 | 0 |
| /app/journey | showcase | mobile | dark | 783 | 0 | 79 | 1 | 98 | 0 |
| /app/journey | showcase | mobile | light | 783 | 4483 | 106 | 1 | 165 | 0 |
| /app/markets | showcase | desktop | dark | 558 | 0 | 50 | 2 | 49 | 0 |
| /app/markets | showcase | desktop | light | 558 | 2834 | 86 | 1 | 79 | 0 |
| /app/markets | showcase | mobile | dark | 752 | 0 | 71 | 1 | 98 | 0 |
| /app/markets | showcase | mobile | light | 752 | 4254 | 119 | 1 | 165 | 0 |
| /app/portfolio | showcase | desktop | dark | 779 | 0 | 56 | 2 | 49 | 0 |
| /app/portfolio | showcase | desktop | light | 779 | 4128 | 85 | 1 | 79 | 0 |
| /app/portfolio | showcase | mobile | dark | 973 | 0 | 77 | 1 | 98 | 0 |
| /app/portfolio | showcase | mobile | light | 973 | 5548 | 118 | 1 | 165 | 0 |
| /app/review | showcase | desktop | dark | 544 | 0 | 60 | 2 | 49 | 0 |
| /app/review | showcase | desktop | light | 544 | 2747 | 83 | 1 | 79 | 0 |
| /app/review | showcase | mobile | dark | 738 | 0 | 80 | 1 | 98 | 0 |
| /app/review | showcase | mobile | light | 738 | 4166 | 116 | 1 | 165 | 0 |
| /app/settings/data | showcase | desktop | dark | 647 | 0 | 112 | 2 | 49 | 0 |
| /app/settings/data | showcase | desktop | light | 647 | 3512 | 135 | 1 | 79 | 0 |
| /app/settings/data | showcase | mobile | dark | 845 | 0 | 133 | 1 | 98 | 0 |
| /app/settings/data | showcase | mobile | light | 845 | 4956 | 169 | 1 | 165 | 0 |
| /app/settings | showcase | desktop | dark | 955 | 0 | 132 | 2 | 98 | 0 |
| /app/settings | showcase | desktop | light | 955 | 5149 | 313 | 1 | 165 | 0 |
| /app/settings | showcase | mobile | dark | 1322 | 0 | 152 | 1 | 147 | 0 |
| /app/settings | showcase | mobile | light | 1322 | 7808 | 346 | 1 | 251 | 0 |
| /app/staking | showcase | desktop | dark | 1366 | 0 | 81 | 2 | 49 | 0 |
| /app/staking | showcase | desktop | light | 1366 | 8457 | 173 | 1 | 79 | 0 |
| /app/staking | showcase | mobile | dark | 1543 | 0 | 98 | 1 | 98 | 0 |
| /app/staking | showcase | mobile | light | 1543 | 9777 | 190 | 1 | 165 | 0 |
| /app/wealth/calculator | showcase | desktop | dark | 581 | 0 | 60 | 2 | 49 | 0 |
| /app/wealth/calculator | showcase | desktop | light | 581 | 2959 | 106 | 1 | 79 | 0 |
| /app/wealth/calculator | showcase | mobile | dark | 783 | 0 | 82 | 1 | 98 | 0 |
| /app/wealth/calculator | showcase | mobile | light | 783 | 4426 | 142 | 1 | 165 | 0 |
| /app/wealth | showcase | desktop | dark | 1729 | 0 | 123 | 2 | 49 | 0 |
| /app/wealth | showcase | desktop | light | 1729 | 10423 | 284 | 2 | 79 | 0 |
| /app/wealth | showcase | mobile (webkit) | dark | 1946 | 0 | 153 | 1 | 98 | 0 |
| /app/wealth | showcase | mobile (webkit) | light | 1946 | 11977 | 329 | 2 | 165 | 0 |
| /app/wealth | showcase | mobile | dark | 1946 | 0 | 153 | 1 | 98 | 0 |
| /app/wealth | showcase | mobile | light | 1946 | 11977 | 329 | 2 | 165 | 0 |
| /app/zigi | showcase | desktop | dark | 695 | 0 | 71 | 2 | 49 | 0 |
| /app/zigi | showcase | desktop | light | 695 | 3745 | 281 | 1 | 79 | 0 |
| /app/zigi | showcase | mobile | dark | 890 | 0 | 91 | 1 | 98 | 0 |
| /app/zigi | showcase | mobile | light | 890 | 5173 | 314 | 1 | 165 | 0 |
| /app | empty | desktop | dark | 1117 | 0 | 108 | 2 | 49 | 1 |
| /app | empty | desktop | light | 1117 | 6146 | 178 | 1 | 79 | 1 |
| /app | empty | mobile | dark | 1333 | 0 | 141 | 1 | 98 | 1 |
| /app | empty | mobile | light | 1333 | 7620 | 224 | 0 | 165 | 1 |
| /app | folded | desktop | dark | 2600 | 0 | 210 | 1 | 49 | 0 |
| /app | folded | desktop | light | 2600 | 6639 | 224 | 1 | 79 | 0 |
| /app | folded | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 |
| /app | folded | mobile | light | 2600 | 6736 | 223 | 0 | 79 | 0 |
| /app | more | mobile (webkit) | dark | 2600 | 0 | 220 | 0 | 49 | 0 |
| /app | more | mobile (webkit) | light | 2600 | 6722 | 223 | 0 | 79 | 0 |
| /app | more | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 |
| /app | more | mobile | light | 2600 | 6736 | 223 | 0 | 79 | 0 |
| /app | quick-add | desktop | dark | 2600 | 0 | 210 | 1 | 49 | 0 |
| /app | quick-add | desktop | light | 2600 | 6639 | 224 | 1 | 79 | 0 |
| /app | quick-add | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 |
| /app | quick-add | mobile | light | 2600 | 6736 | 223 | 0 | 79 | 0 |
| /app | showcase | desktop | dark | 2600 | 0 | 210 | 1 | 49 | 0 |
| /app | showcase | desktop | light | 2600 | 6639 | 224 | 1 | 79 | 0 |
| /app | showcase | mobile (webkit) | dark | 2600 | 0 | 220 | 0 | 49 | 0 |
| /app | showcase | mobile (webkit) | light | 2600 | 6722 | 223 | 0 | 79 | 0 |
| /app | showcase | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 |
| /app | showcase | mobile | light | 2600 | 6729 | 223 | 0 | 79 | 0 |

## Disallowed differences

- /app · empty · desktop · `#dashboard-item-builtin-activity img` [3.0.2.0.0.1.3.0.1.0.0.0.0] · filter · `none` → light: `drop-shadow(rgba(58, 58, 87, 0.18) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app · empty · desktop · `#dashboard-item-builtin-activity img` [3.0.2.0.0.1.3.0.1.0.0.0.0] · filter · `none` → dark: `drop-shadow(rgba(20, 10, 60, 0.45) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app · empty · mobile · `#_R_2hhalu6oqbtb_ img` [4.0.2.0.0.1.3.0.1.0.1.0.0.0.0] · filter · `none` → light: `drop-shadow(rgba(58, 58, 87, 0.18) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app · empty · mobile · `#_R_2hhalu6oqbtb_ img` [4.0.2.0.0.1.3.0.1.0.1.0.0.0.0] · filter · `none` → dark: `drop-shadow(rgba(20, 10, 60, 0.45) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app/goals · empty · desktop · `#goals-health img` [3.0.2.0.2.0.1.0.0.0] · filter · `none` → light: `drop-shadow(rgba(58, 58, 87, 0.18) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app/goals · empty · desktop · `#goals-health img` [3.0.2.0.2.0.1.0.0.0] · filter · `none` → dark: `drop-shadow(rgba(20, 10, 60, 0.45) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app/goals · empty · mobile · `#goals-health img` [4.0.2.0.2.0.1.0.0.0] · filter · `none` → light: `drop-shadow(rgba(58, 58, 87, 0.18) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)
- /app/goals · empty · mobile · `#goals-health img` [4.0.2.0.2.0.1.0.0.0] · filter · `none` → dark: `drop-shadow(rgba(20, 10, 60, 0.45) 0px 6px 14px)` — known: another lane’s file (tests/parity/known.ts)

## Element mismatches (the DOM differed between themes)

None.
