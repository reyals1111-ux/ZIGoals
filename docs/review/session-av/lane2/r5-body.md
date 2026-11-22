# Lane 2 round 5 — body and through the day (Bevel, Clue, Productive, Tiimo): builder registry

Branch `lane2/r5-body`, from `lane2/batch4`. Rows: LEDGER "Round 5: rows #348–#390", groups V5 (Bevel and Clue: #371,
#379–#383) and V3 (Productive and Tiimo: #369, #370). One section per feature. Every stored change is listed under
"Stored changes" for the lead's TIER 3 (stored formats) label; the notification-plan change (#369) is TIER 3 (PWA).

Rules kept throughout: every cycle and food part sits inside Health (its gate and consent) and the cycle log's own
switch; the moods on the Day Timeline show only while Health is shown. The cycle work is a look back only: `CYCLE_LINE`
stays, no phase, no forecast of symptoms, no fertile window, no new prediction of a period (the existing next-period
range is only read less: a cycle left out is not in it, and "No period" hides it). No contraception or fertility advice,
no medical reading of any word logged. No calorie expenditure anywhere. Compare's rules are unchanged (90 days, 14 days
a side, never a cause).

## Stored changes (TIER 3 (stored formats), all additive; no new key)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:cycle:v1` (existing, device-only, loose) | optional `own` `[{id (a–z and -, 1–30, the form a day's symptoms keep), word (1–24), gone?: true}]` (≤ 60; an unreadable item is dropped alone), `hidden` `[id]` (≤ 60), `order` `[id]` (≤ 120), `leftOut` `[a cycle's first day]` (≤ 200), `noPeriod: true`, `peri: true`; each `.optional().catch(undefined)`. A day's own word is stored in its `symptoms` as its id, so the strict-looking day schema of older builds reads it. | Kept untouched (the record is loose); an older build shows an own word as its id ("migraine") and still offers flow and the estimate. |
| `zigoals:food-plus:v1` (existing, device-only, loose) | optional `lateMeal` `{hours 1–6, kcal 50–3000}`, `.optional().catch(undefined)`. | Kept untouched; older builds have no late-meal factor. |
| `zigoals:notify:v1` (existing, device-only, loose) | optional `habitParts` `{on, morning?, afternoon?, evening? ("HH:MM", each dropped alone when unreadable)}`, `.optional().catch(undefined)`. Exported, never restored (as before). | Kept untouched; an older build sends one reminder per habit, as before. |

Test: `lib/av2-r5-body-stored.test.ts` (old records read, a bad value drops alone, Export everything → erase → Restore
keeps the cycle and food-plus fields; the notification prefs are exported and not restored, as before).
