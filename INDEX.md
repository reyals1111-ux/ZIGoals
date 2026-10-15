# Session AC captures (review only; never merged)
Owner amendment 4: only the views the items change, the same set before and after. Production builds, the Showcase,
fixed clock 2026-10-16T09:30Z, every `/api` call answered 503 (offline on purpose), Playwright Chromium.
- `before/`: `main` `9e41f0d` (Alpha #41).
- `after/`: `61267f43` (the vision tile re-captured after its ⋯ fix; the rest from `39bf9172`, same UI).
- Veil pixel check (owner amendment 3, most common colour): page top after rgb(2 9 24) on desktop and phone (before: rgb(5 4 15)); page end rgb(2 9 24) desktop, before and after.

| File | Item |
|---|---|
| habits-{d,t,p}.png, habits-d-motionoff.png | 1 (1440, 1024, 390; Motion Off) |
| longpage-wealth-{d,p}-{top,middle,bottom}.png, shortpage-reminders-{d,p}.png | 2 and 3 (long page top/middle/bottom, footer end; a short page) |
| today-{d,t,p}.png | 5 (Today defaults) |
| wealth-{d,t,p}.png | 5 (Wealth holdings) |
| health-water*.png | 6 |
| goals-vision-tile.png | 7 |
| settings-data-{d,p}.png, reminders-title-{d,p}.png | 3 (About block) and 4 (the tab title, printed at the top) |

`capture.mjs` made them: `node capture.mjs <base-url> <out-dir>`.
