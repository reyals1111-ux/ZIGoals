# Lane 2 fixb1b — five batch-1 browser specs (desktop and mobile)

Branch `lane2/fixb1b` from `feature/session-av-2` at fe2d7991. Specs run against the production build of fe2d7991 at
:3101, through the shared browser lock.

| # | Spec | Cause | Fix | Verified |
|---|------|-------|-----|----------|
| 1 | tests/grok53/settings/help-al-006-la-31.spec.ts:28 | PK-10 hides the chain answer `av-move-alert` on a fresh profile, but the What's new Money group still names it ("alerts on a percent move and on a portfolio's value") and says "Each has its own answer just below". The **app text** is wrong, and the spec still expected the hidden answer. | The spec (deliberate, equally strict) checks that on a fresh profile `#help-av-move-alert` is absent and the Money answer does not name it, then chooses the chain (`chooseChain`, as tests/help-page.spec.ts does) and checks that the answer is there and named. The help-page.tsx text change is below, for the lead. | Needs the help-page.tsx edit below and a rebuild. Against :3101 everything passes except the new "does not name it" line, as expected. |
| 2 | tests/av2-pk10-chain-help.spec.ts:66 | **App.** HelpSearch and ChainHelp both subscribe to `hashchange`. In a browser each listener runs with its own React update, and HelpSearch subscribed first, so its effect ran before ChainHelp put the linked answer on the page. `document.getElementById` found nothing, and the answer stayed listed under the search. (jsdom's `dispatchEvent` inside `act` batches both updates, so the unit test never saw it.) | components/help/help-search.tsx: the answer the address names counts as shown (`hash === '#help-<id>' \|\| getElementById`), as ChainHelp shows it. New unit test in lib/help/chain-help.test.ts: HelpSearch alone; a hashchange that names a listed answer drops it from the list and the status line. It fails without the fix. | Unit test green. The spec still fails on :3101 (old build): **needs the lead's rebuild.** |
| 3 | tests/revb1-note-reminders.spec.ts:10 | **Spec.** `textbox 'Note'` also matched "Capture a note" and "New note". | Scoped to the new note's article, with `Note` and `Save` matched exactly, as in 6f5dd773 (deliberate). | Passes on :3101, desktop and mobile. |
| 4 | tests/revb1-plan-views-edit.spec.ts:22 | **Spec.** Focus was returned correctly. The name `'Fictional standup'` also matched the day's "Move “Fictional standup” to another day" button (strict mode), and the same applied to "Fictional errand 4" in Month. Once those were exact, a second problem showed: the single-jump `dragTo` from the row's centre (its Move button) started no native drag in about half the runs, on both projects (probe: dragstart never fired, from the centre, the time or the title). | Title buttons matched exactly. The drag is now a real stepped mouse drag held by the task's time, which worked 10 of 10 in the probe. It is still asserted by the stored `due` (deliberate, as strict). | Passes on :3101, desktop and mobile, 3 runs each (6/6). |
| 5 | tests/revb1-timer-done.spec.ts:14 | **Spec.** The click worked: the task was done, the timer stopped and its 40 min were added. But `check()` then waits for the box to read ticked, and the done task leaves the open list at once, so it waited until the timeout (as tests/tasks-ai.spec.ts notes). | `click()`. Then the spec asserts that the task's `doneAt` is stored and that the open "Mark … done" box is gone. The existing spent/timer/status assertions stay (deliberate). | Passes on :3101, desktop and mobile. |

## For the lead: help-page.tsx (Help and What's new), #1

In `<HelpQuestion id="av-new-money" …>`, replace

```
watching a category without a budget; alerts on a percent move and on a portfolio&rsquo;s value; a month in short
```

with

```
watching a category without a budget; <ChainText chosen="alerts on a percent move and on a portfolio&rsquo;s value; " plain=""/>a month in short
```

`ChainText` is already imported there from `./chain-help`. Until the chain is chosen, the Money group no longer names the
hidden alerts answer. Once it is chosen, it reads word for word as before. The What's new link label (line 37) does not
name the alerts and is unchanged. Nothing else changes: no stored data, no shard list, no CSS.

Stored changes: none. CSS: none. Always visible on Today: nothing.
