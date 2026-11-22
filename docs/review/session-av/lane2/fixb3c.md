# Lane 2 — fixb3c (batch 3, the polish pass's browser failures)

Branch `lane2/fixb3c` from `lane2/batch3` (`a45b6e3d`). Measured against the 3101 production build of `a45b6e3d` through the
browser lock. CSS fixes were checked without a rebuild by injecting the exact new rules into every page (`addInitScript`,
throwaway fixture, not committed) and running copies of the real specs. Commits: `03321196` (Health), `59e56c79` (Tasks,
guard test), `11a37f14` (forms spec helper). Guard unit test: `apps/web/lib/fixb3c-layout.test.ts` (5 tests).

No stored change, no new key, no dependency, nothing new on Today. CSS files touched (layout only, no colours; the lead
regenerates the theme sheets as usual): `components/tasks/tasks.css`, `components/health/health-aa.css`.

| failure | cause | fix | commit | verified |
|---|---|---|---|---|
| `av2-polish-tasks:17` the views end above the list | App. `globals.css` gives every `nav` `order: 3` at ≤ 700 px (the phone header's nav), and the Tasks nav is a `<nav>`, so it still followed the list (P-4 removed AL's `order: 1` but not this). Next, once the lazy counts load the chips were 553 px tall in every theme (the spec's 520; Nebula passed only when it measured before the counts arrived) | `.tasks-layout > .tasks-nav { order: 0 }` at ≤ 900 px; chips 10 px at the sides, 4 px gaps, headings 6 px: 457 px; every chip stays 44 px tall | `59e56c79` | injected CSS: 18/18 (3 themes × 4 tests × 2 projects, after the counts load) |
| `av2-polish-tasks:67` "Move to … →" | Spec. The button is a flex row, so `innerText` puts `\n` between the words and the arrow (a flex item) though both sit on one line (arrow box inside the 44 px button, right of the words) | labelled deliberate: the same regex on the normalised text, plus the arrow measured on the words' line and right of them | `59e56c79` | as built: passes |
| `av2-polish-forms:14` the label has words (textTop −18 000) | Spec. `boxBesideWords` measured after a separate `scrollIntoViewIfNeeded`; meanwhile Journal's lazy folds drew seven more `label.switch-row` (prompt packs, reminder) higher up the page, so `.first()` resolved to one ~20 000 px above the viewport. The labels' words are fine (text 2–13 px under each label's top) | labelled deliberate: the helper scrolls the label into view inside the measuring step (`behavior: 'instant'`); the four assertions are unchanged | `11a37f14` | as built: 12/12 (3 themes × 390/1440 × 2 projects) |
| `av2-polish-health:53` `.sleep-score-parts b` 46.5 px | App. `li` is a flex row with the default `align-items: stretch`; P-21's `nowrap` figure was stretched to the height of a part that wraps to two lines (its text was one line) | `.sleep-score-parts li { align-items: baseline }` (looks the same: one font size) | `03321196` | injected CSS: passes, both projects |
| `pillar-phone-length:33` healthFresh 7.26 > 7.0 | App. P-15's "Add to …" button stood under "Nothing logged yet." with the 17 px top padding and the heading's 18 px margin: 99 px per empty meal, × 4 on a fresh day (+208 px); the page had been at ~7.0 before | an empty meal's words and button share one row (wraps on a narrow screen), padding 0, the heading 4 px above it: 48 px. Ceiling untouched | `03321196` | injected CSS: healthFresh **6.94** |

## Found while checking (not in the list)

| spec | cause | fix | commit | verified |
|---|---|---|---|---|
| `grok53/release/a10-life:120` A10-11 (pinned by Session AL: the first task on the first screen at 768) | App, from P-4: the views stood above the list at every one-column width; first task at y 1,395 of 1,024. With them after it the title still ended at 1,025 | between 701 and 900 px the list stays first (`order: 1`) and the smart-add help keeps 12 px below it (was 20): title 992–1017. Phones (≤ 700) keep P-4's views above | `59e56c79` | injected CSS: passes, both projects (fails as built) |
| `grok53/release/a10-life:15` A10-1 Log water focuses a field in view | App, not polish: the Water card grew ("Your drinks" above the amount), so at 390 the focused `#health-water-amount` sat at y 847 of 844 after the card scrolled to its top | `revealWhenShown` brings the focused field to the middle of the screen when it is out of view, now and after 0.4 s / 1.2 s while it keeps focus (`health-app.tsx`) | `03321196` | **needs rebuild** (JS; fails as built, both projects) |
| `pillar-phone-length:33` healthShowcase **9.11 > 8.2**, wealthFresh **6.34 > 6.0** | Masked until now: the spec stops at the first failing key (healthFresh). Not from the polish pass: Health's Showcase diary stack is 4,461 px; Wealth's fresh Spending panel is 2,527 px (people money 277, store cards 407, money tools 493 — earlier lane-2 features). wealthShowcase 9.88 is within 10.0 | **left** — bringing these under their pinned ceilings means folding lane-2 features on the phone (a design choice across several builders' work), not a polish tightening; not attempted here. The spec stays red after the rebuild on these two keys | — | measured as built and with the injected CSS |

## For the lead
- Rebuild, then run: `av2-polish-tasks`, `av2-polish-forms`, `av2-polish-health`, `pillar-phone-length` (healthFresh only
  goes green; see above), `grok53/release/a10-life`, and beside them `health`, `run10-health-only-journey`,
  `av2-extra-meals`, `ar-matrix-drag`, `ap-priority-matrix`, `av2-task-planning` (the injected-CSS copies of the first four
  groups passed, except the masked keys).
- Help / What's new: none (fixes to existing features).
