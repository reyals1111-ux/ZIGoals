# Session AD Part 3 — per-theme layout and contrast audits

`tests/audit/layout-audit.mjs --theme=<light|dark>` (the device's theme set before every page loads), on this PR's
production build, Chrome, main pages (Today, Goals, a goal, Habits, habit details, Health, Sleep, Wealth, Markets,
Portfolio, Staking, Activity, Settings, Help, Chess, Journey, ZIGi, the phone's More sheet, a new device's Today and
Habits), Showcase and empty device, 390 and 1440 px. The full route × width matrix for every theme runs at Gate C.

- Light, first run (`part3-audit-light-first.md`): 51 contrast findings — pillar, area and tone labels lifted with white
  (Today's life rings, Goals' areas, Health's highlights), Activity's category labels in their accent colour, and the
  theme bar's note on the page — plus one overlap. Fixed in `apps/web/themes/light.extra.css` (`74aee323` and the next
  commit); re-run on the failing pages (`part3-audit-light-after.md`): clean but the overlap.
- Dark (`part3-audit-dark.md`): clean but the overlap.
- The one overlap, Journey at 1440 px ("8" over "level", 4 px), is the same in Nebula and on `main` `61204c3`
  (measured there too): not this PR's; this sandbox's font (Inter). Left as it is.
