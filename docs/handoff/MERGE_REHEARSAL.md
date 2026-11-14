# Merge rehearsal: AM-2 (PR #101) + AN/AO/AP (PR #102)

**Never merged; nothing pushed to main.** Branch `rehearsal/am-plus-an` = PR #102's head `b00b7be7` with
`origin/feature/session-am-nova` (`4fae048d`) merged in by one merge commit (`0fa56f2e`). Draft
[PR #103](https://github.com/reyals1111-ux/ZIGoals/pull/103) "REHEARSAL — do not merge (AM + AN/AO/AP)" runs the combined
code in CI: [run 1750](https://github.com/reyals1111-ux/ZIGoals/actions/runs/43649334521) (not waited for; read it there).

## Checks run here (owner: no local build, no local browser runs)
- lint: 0 errors (23 warnings, as before) · typecheck: clean · theme sheets `--check`: clean after regenerating
- frozen readers #37–#54: 96/96 · unit suite: 10,750 passed; 6 failed, the same six as on PR #102 alone (this sandbox's
  Node 22: pre-run11-setup ×2, wealth-al-pass4 TK-127, finance-homes ×3; green in CI on Node 24).
- **Nothing failed only when combined** at this level. Browser evidence is run 1750.

## Conflicting files and their exact resolution (12)
| File | Resolution |
|---|---|
| `apps/web/lib/aa-device-forget.ts` | imports: AO, AP and AM device keys; erase list `…, ...AO_ERASE_KEYS, ...AP_ERASE_KEYS, ...AM_ERASE_KEYS]` |
| `apps/web/lib/data-health/catalog.ts` | imports of AO, AP, AM labels; entries: AO (`dayEnds`, `networthHistory`), AP (seven records), AM (`novaStage`, `novaWorld`) |
| `apps/web/lib/export/everything.ts` | imports of all three; `...AO_EXPORT_KEYS, ...AP_EXPORT_KEYS, ...AM_EXPORT_KEYS` |
| `apps/web/lib/onboarding.ts` | imports of all three; personal keys `…AL, AO, AP, AM`; non-personal keys end `...AO_DISPLAY_KEYS, ...AP_DISPLAY_KEYS, ...AM_DISPLAY_KEYS]` |
| `apps/web/lib/vault/frozen-fixtures.test.ts` | AM's line (NOVA_KEY and NOVA_STAGE_KEY moved to `carried`, NOVA_WORLD_KEY added) plus AO's `NETWORTH_HISTORY_KEY` at the end |
| `apps/web/components/help/help-page.tsx` | THIS_VERSION: AP's nine lines, then AM's `nova-stage`; What's new date "Nov 14, 2026" |
| `apps/web/tests/grok53/settings/help-al-006-la-31.spec.ts` | count 22 (12 + AP 9 + AM 1), and AM's `#help-nova-stage` link check kept |
| `apps/web/tests/help-page.spec.ts` | in-sentence links 78 (72 + AP 2 + AM 4), in both the poll and the final `expect`; both sessions' comments |
| `docs/STATUS.md` | both entries: AP, AO, AN, then AM (each unchanged) |
| `apps/web/lib/ui-prefs/theme-sheets.ts`, `apps/web/public/theme-boot.js`, `apps/web/public/themes/dark.css` | generated: one side taken, then `node scripts/themes/build-themes.mjs` (and `--check` clean) |

## Auto-merged files checked by hand
- `scripts/lib/hosted-alpha-stages.mjs`: both AM's `NOVA_STAGE` (stage 13) and AP's `openSettingsGroups` (Settings'
  folded groups, TIER 3 release verifier `6af92530`) are present.
- `apps/web/playwright.webkit.shards.ts`: every `zigi-*`/`webkit-*` spec on disk is in exactly one list except the six
  `WEBKIT_TEST_IGNORE` names (real-model, conversations, …), as intended.
- `apps/web/lib/restore/plan.ts`, `lib/search/static.ts`, `lib/showcase-data.ts`, the other theme sheets: merged cleanly.

## What AM-2 must do when it merges main in (after #102 lands)
1. Take these same resolutions (the table above); regenerate the theme sheets; run lint, typecheck, unit, frozen readers.
2. Help's counts: What's new links 22 and in-sentence links 78, unless AM-2 adds more (then move them with a comment).
3. Settings is folded by default after #102: any NOVA/ZIGi spec or hosted stage that reaches a Settings section by
   `page.goto('/app/settings')` must open its group (`tests/settings-open.ts` → `openSettings`/`openAllSettingsGroups`,
   `scripts/lib/settings-open.mjs` for scripts), or go by the section's own `#anchor`. Seed visits should wait for the page
   to be live (`html[data-app-hydrated]`) before a same-page jump (ADR-040 D24b).
4. CI now retries a failed browser test once (`ZIGOALS_CI_RETRY=1`); flaky tests are listed in each job summary.
5. Mood tags and symptoms (AP) stay out of ZIGi/NOVA until wired behind the Health switches (Q14/Q16); the weather client
   goes through `workers/weather-proxy` once the owner deploys it.
