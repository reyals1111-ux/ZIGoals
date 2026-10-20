# Theme parity (Session AF, ADR-028 H75)

Results of `tests/theme-parity-af.spec.ts` (computer and phone layouts) and `tests/webkit-theme-parity.spec.ts`, folded by `scripts/parity-report.mjs` on cac3b73e, local production build, Chrome (desktop + mobile), the Gate C full suite. Each row compares a route in a state with Nebula: the allowed classes are words (text), neutral and night surfaces, lines and shades (neutral; and the page's own ground), the calm of the named art layers (art-calm), the theme bar, and by day a gradient word's stops in deeper shades of the same hues (gradient-word, H130); anything else, and any box that moves by more than half a pixel, is DISALLOWED.

Rows: 110. Totals — text 328821 · neutral 17408 · art-calm 125 · theme-bar 10550 · gradient-word 575 · DISALLOWED 0.

| Route | State | Project | Theme | Elements | text | neutral | art-calm | theme-bar | gradient-word | DISALLOWED |
|---|---|---|---|---|---|---|---|---|---|---|
| /app/activity | showcase | desktop | dark | 654 | 0 | 66 | 2 | 49 | 0 | 0 |
| /app/activity | showcase | desktop | light | 654 | 3569 | 194 | 1 | 79 | 2 | 0 |
| /app/activity | showcase | mobile | dark | 858 | 0 | 87 | 1 | 98 | 0 | 0 |
| /app/activity | showcase | mobile | light | 858 | 5062 | 227 | 1 | 165 | 2 | 0 |
| /app/checklist | showcase | desktop | dark | 506 | 0 | 30 | 2 | 49 | 0 | 0 |
| /app/checklist | showcase | desktop | light | 506 | 1541 | 68 | 1 | 79 | 1 | 0 |
| /app/checklist | showcase | mobile | dark | 636 | 0 | 52 | 1 | 98 | 0 | 0 |
| /app/checklist | showcase | mobile | light | 636 | 3035 | 103 | 0 | 165 | 1 | 0 |
| /app/chess | showcase | desktop | dark | 753 | 0 | 103 | 2 | 49 | 0 | 0 |
| /app/chess | showcase | desktop | light | 753 | 4251 | 132 | 1 | 79 | 3 | 0 |
| /app/chess | showcase | mobile | dark | 962 | 0 | 125 | 1 | 98 | 0 | 0 |
| /app/chess | showcase | mobile | light | 962 | 5771 | 167 | 1 | 165 | 3 | 0 |
| /app/earn | showcase | desktop | dark | 1723 | 0 | 109 | 2 | 49 | 0 | 0 |
| /app/earn | showcase | desktop | light | 1723 | 9587 | 156 | 1 | 79 | 18 | 0 |
| /app/earn | showcase | mobile | dark | 1932 | 0 | 131 | 1 | 98 | 0 | 0 |
| /app/earn | showcase | mobile | light | 1932 | 11107 | 191 | 1 | 165 | 18 | 0 |
| /app/ecosystem | showcase | desktop | dark | 1774 | 0 | 89 | 2 | 49 | 0 | 0 |
| /app/ecosystem | showcase | desktop | light | 1774 | 11056 | 278 | 1 | 79 | 2 | 0 |
| /app/ecosystem | showcase | mobile | dark | 1983 | 0 | 111 | 1 | 98 | 0 | 0 |
| /app/ecosystem | showcase | mobile | light | 1983 | 12576 | 313 | 1 | 165 | 2 | 0 |
| /app/goals/new | showcase | desktop | dark | 812 | 0 | 96 | 2 | 49 | 0 | 0 |
| /app/goals/new | showcase | desktop | light | 812 | 4483 | 297 | 1 | 79 | 2 | 0 |
| /app/goals/new | showcase | mobile | dark | 1022 | 0 | 117 | 1 | 98 | 0 | 0 |
| /app/goals/new | showcase | mobile | light | 1022 | 6013 | 331 | 1 | 165 | 2 | 0 |
| /app/goals | empty | desktop | dark | 471 | 0 | 34 | 2 | 49 | 0 | 0 |
| /app/goals | empty | desktop | light | 471 | 2372 | 47 | 1 | 79 | 7 | 0 |
| /app/goals | empty | mobile | dark | 666 | 0 | 53 | 1 | 98 | 0 | 0 |
| /app/goals | empty | mobile | light | 666 | 3723 | 78 | 1 | 165 | 7 | 0 |
| /app/goals | showcase | desktop | dark | 2331 | 0 | 186 | 2 | 49 | 0 | 0 |
| /app/goals | showcase | desktop | light | 2331 | 4836 | 98 | 1 | 79 | 20 | 0 |
| /app/goals | showcase | mobile | dark | 2540 | 0 | 207 | 1 | 98 | 0 | 0 |
| /app/goals | showcase | mobile | light | 2540 | 6357 | 132 | 1 | 165 | 20 | 0 |
| /app/habits | showcase | desktop | dark | 1605 | 0 | 97 | 2 | 49 | 0 | 0 |
| /app/habits | showcase | desktop | light | 1605 | 8492 | 1016 | 1 | 79 | 10 | 0 |
| /app/habits | showcase | mobile | dark | 1811 | 0 | 119 | 1 | 98 | 0 | 0 |
| /app/habits | showcase | mobile | light | 1811 | 9992 | 1050 | 0 | 165 | 10 | 0 |
| /app/health | showcase | desktop | dark | 1261 | 0 | 93 | 2 | 49 | 0 | 0 |
| /app/health | showcase | desktop | light | 1261 | 7185 | 357 | 1 | 79 | 9 | 0 |
| /app/health | showcase | mobile | dark | 1405 | 0 | 110 | 1 | 98 | 0 | 0 |
| /app/health | showcase | mobile | light | 1405 | 8345 | 365 | 1 | 165 | 9 | 0 |
| /app/help | showcase | desktop | dark | 999 | 0 | 45 | 2 | 49 | 0 | 0 |
| /app/help | showcase | desktop | light | 999 | 5879 | 68 | 1 | 79 | 20 | 0 |
| /app/help | showcase | mobile | dark | 1209 | 0 | 67 | 1 | 98 | 0 | 0 |
| /app/help | showcase | mobile | light | 1209 | 7408 | 103 | 1 | 165 | 20 | 0 |
| /app/journey | showcase | desktop | dark | 729 | 0 | 61 | 2 | 49 | 0 | 0 |
| /app/journey | showcase | desktop | light | 729 | 4010 | 97 | 1 | 79 | 9 | 0 |
| /app/journey | showcase | mobile | dark | 934 | 0 | 82 | 1 | 98 | 0 | 0 |
| /app/journey | showcase | mobile | light | 934 | 5504 | 131 | 1 | 165 | 9 | 0 |
| /app/markets | showcase | desktop | dark | 561 | 0 | 50 | 2 | 49 | 0 | 0 |
| /app/markets | showcase | desktop | light | 561 | 2850 | 86 | 1 | 79 | 3 | 0 |
| /app/markets | showcase | mobile | dark | 766 | 0 | 72 | 1 | 98 | 0 | 0 |
| /app/markets | showcase | mobile | light | 766 | 4346 | 120 | 1 | 165 | 3 | 0 |
| /app/portfolio | showcase | desktop | dark | 782 | 0 | 56 | 2 | 49 | 0 | 0 |
| /app/portfolio | showcase | desktop | light | 782 | 4144 | 85 | 1 | 79 | 3 | 0 |
| /app/portfolio | showcase | mobile | dark | 987 | 0 | 78 | 1 | 98 | 0 | 0 |
| /app/portfolio | showcase | mobile | light | 987 | 5640 | 119 | 1 | 165 | 3 | 0 |
| /app/review | showcase | desktop | dark | 548 | 0 | 61 | 2 | 49 | 0 | 0 |
| /app/review | showcase | desktop | light | 548 | 2758 | 84 | 1 | 79 | 12 | 0 |
| /app/review | showcase | mobile | dark | 753 | 0 | 82 | 1 | 98 | 0 | 0 |
| /app/review | showcase | mobile | light | 753 | 4253 | 118 | 1 | 165 | 12 | 0 |
| /app/settings/data | showcase | desktop | dark | 665 | 0 | 117 | 2 | 49 | 0 | 0 |
| /app/settings/data | showcase | desktop | light | 665 | 3626 | 140 | 1 | 79 | 10 | 0 |
| /app/settings/data | showcase | mobile | dark | 874 | 0 | 139 | 1 | 98 | 0 | 0 |
| /app/settings/data | showcase | mobile | light | 874 | 5146 | 175 | 1 | 165 | 10 | 0 |
| /app/settings | showcase | desktop | dark | 1003 | 0 | 141 | 2 | 98 | 0 | 0 |
| /app/settings | showcase | desktop | light | 1003 | 5436 | 326 | 1 | 165 | 31 | 0 |
| /app/settings | showcase | mobile | dark | 1381 | 0 | 162 | 1 | 147 | 0 | 0 |
| /app/settings | showcase | mobile | light | 1381 | 8171 | 360 | 1 | 251 | 31 | 0 |
| /app/staking | showcase | desktop | dark | 1366 | 0 | 81 | 2 | 49 | 0 | 0 |
| /app/staking | showcase | desktop | light | 1366 | 8449 | 152 | 1 | 79 | 27 | 0 |
| /app/staking | showcase | mobile | dark | 1554 | 0 | 99 | 1 | 98 | 0 | 0 |
| /app/staking | showcase | mobile | light | 1554 | 9845 | 170 | 1 | 165 | 27 | 0 |
| /app/stories | showcase | desktop | dark | 406 | 0 | 28 | 2 | 49 | 0 | 0 |
| /app/stories | showcase | desktop | light | 406 | 1852 | 37 | 1 | 79 | 5 | 0 |
| /app/stories | showcase | mobile | dark | 612 | 0 | 49 | 1 | 98 | 0 | 0 |
| /app/stories | showcase | mobile | light | 612 | 3356 | 71 | 1 | 165 | 5 | 0 |
| /app/timeline | showcase | desktop | dark | 541 | 0 | 37 | 2 | 49 | 0 | 0 |
| /app/timeline | showcase | desktop | light | 541 | 2728 | 65 | 1 | 79 | 2 | 0 |
| /app/timeline | showcase | mobile | dark | 747 | 0 | 58 | 1 | 98 | 0 | 0 |
| /app/timeline | showcase | mobile | light | 747 | 4232 | 99 | 1 | 165 | 2 | 0 |
| /app/wealth/calculator | showcase | desktop | dark | 584 | 0 | 60 | 2 | 49 | 0 | 0 |
| /app/wealth/calculator | showcase | desktop | light | 584 | 2971 | 105 | 1 | 79 | 8 | 0 |
| /app/wealth/calculator | showcase | mobile | dark | 797 | 0 | 83 | 1 | 98 | 0 | 0 |
| /app/wealth/calculator | showcase | mobile | light | 797 | 4514 | 142 | 1 | 165 | 8 | 0 |
| /app/wealth | showcase | desktop | dark | 1733 | 0 | 123 | 2 | 49 | 0 | 0 |
| /app/wealth | showcase | desktop | light | 1733 | 10445 | 283 | 2 | 79 | 5 | 0 |
| /app/wealth | showcase | mobile | dark | 1961 | 0 | 154 | 1 | 98 | 0 | 0 |
| /app/wealth | showcase | mobile | light | 1961 | 12075 | 329 | 2 | 165 | 5 | 0 |
| /app/zigi | showcase | desktop | dark | 698 | 0 | 71 | 2 | 49 | 0 | 0 |
| /app/zigi | showcase | desktop | light | 698 | 3762 | 281 | 1 | 79 | 2 | 0 |
| /app/zigi | showcase | mobile | dark | 904 | 0 | 92 | 1 | 98 | 0 | 0 |
| /app/zigi | showcase | mobile | light | 904 | 5266 | 315 | 1 | 165 | 2 | 0 |
| /app | empty | desktop | dark | 1120 | 0 | 108 | 2 | 49 | 0 | 0 |
| /app | empty | desktop | light | 1120 | 6160 | 179 | 1 | 79 | 5 | 0 |
| /app | empty | mobile | dark | 1347 | 0 | 142 | 1 | 98 | 0 | 0 |
| /app | empty | mobile | light | 1347 | 7710 | 226 | 0 | 165 | 5 | 0 |
| /app | folded | desktop | dark | 2600 | 0 | 207 | 1 | 49 | 0 | 0 |
| /app | folded | desktop | light | 2600 | 6596 | 196 | 1 | 79 | 21 | 0 |
| /app | folded | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 | 0 |
| /app | folded | mobile | light | 2600 | 6786 | 210 | 0 | 79 | 20 | 0 |
| /app | more | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 | 0 |
| /app | more | mobile | light | 2600 | 6786 | 210 | 0 | 79 | 20 | 0 |
| /app | quick-add | desktop | dark | 2600 | 0 | 207 | 1 | 49 | 0 | 0 |
| /app | quick-add | desktop | light | 2600 | 6596 | 196 | 1 | 79 | 21 | 0 |
| /app | quick-add | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 | 0 |
| /app | quick-add | mobile | light | 2600 | 6786 | 210 | 0 | 79 | 20 | 0 |
| /app | showcase | desktop | dark | 2600 | 0 | 207 | 1 | 49 | 0 | 0 |
| /app | showcase | desktop | light | 2600 | 6596 | 196 | 1 | 79 | 21 | 0 |
| /app | showcase | mobile | dark | 2600 | 0 | 220 | 0 | 49 | 0 | 0 |
| /app | showcase | mobile | light | 2600 | 6786 | 210 | 0 | 79 | 20 | 0 |

## Disallowed differences

None.

## Element mismatches (the DOM differed between themes)

None.
