# Session AK F2: app bugs found by the journey specs

The journey specs are in `apps/web/tests/journeys/`: one file per journey, each test titled `@journey`, shared steps in
`journey-helpers.ts`. Each bug below is reproduced by its own `test.fixme('@journey <n><x> bug J<n>-<k> …')` in that
journey's file. To check a fix, rename the fixme to `test(` and run it. Each was run as a plain `test` against the
production build of `8a98bdf0` on 127.0.0.1:3101 (desktop, Chromium) and failed for the reason given here.

| Bug | Severity | One line |
|---|---|---|
| J3-1 | Major | A "Fund Goal" contribution from a cash asset never counts in the contribution rhythm (decimals 18 ≠ 2) |
| J3-2 | Minor | "Fill in" from the rhythm opens the Fund form, but the amount is not filled in with a cash asset |
| J4-1 | Major | Offline, a Checklist whose day is complete shows "This page could not be shown." (celebration CSS chunk not cached) |
| J4-2 | Major | Offline, a barcode is never kept for later: the offline-queue chunk is first needed offline, so it cannot load |
| J5-1 | Minor | Done or Undo from a notification does not show on the open page, and Undo does not rewrite the snapshot |
| J5-2 | Major | "Snooze 1 h" is lost when a ZIGoals page is open, because the page rewrites the snapshot without the snooze |
| J6-1 | Minor | Right after Erase everything the still-running worker refills a `zigoals-static-v1` cache |
| J8-1 | Major | ZIGi's goal form card with a date is refused ("Unrecognized key: day") |
| J6-2 | Question | Erase → Restore never brings the Checklist back (by design), and the restore screen does not say so |

## J3-1: a "Fund Goal" contribution from a cash asset never counts in the contribution rhythm

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j03-money-month.spec.ts`, `@journey 3b bug J3-1`.
- **Steps:** Create a EUR value goal. On three Mondays in a row, open the goal → Record contribution → Fund Goal → EUR
  cash, created the first time and chosen after that → quantity 50 → Preview → Confirm & fund Goal. The next Monday,
  open Wealth → "Your contribution rhythm".
- **Expected:** a suggestion for the goal ("on Mondays", with "Fill in €50.00"). `MIN_CONTRIBUTIONS = 3`.
- **Actual:** "Once you have recorded a few contributions to a Goal on a regular day …". Only "Record history only"
  contributions are counted, and those are recorded in the goal's units.
- **Cause:** `lib/contribution-funding.ts:50` records the event in the funding position's units
  (`asset: p.position.asset, decimals: p.position.decimals`). Every manual asset is made with `decimals: 18`
  (`lib/manual-source.ts:19`). `contributionRhythm` in `lib/allocation/autopilot.ts` keeps only events with
  `e.decimals === goal.decimals`.
- **Proposed fix:** in `contributionRhythm`, read each event in goal units. Prefer `valueAtEvent.value` when
  `valueAtEvent.currency === goal.asset && valueAtEvent.decimals === goal.decimals`; the funding code always writes it for
  VALUE goals. Otherwise rescale `quantity` from `e.decimals` to `goal.decimals` when `e.asset === goal.asset`. Add a unit
  test with a funded event at 18 decimals.

## J3-2: "Fill in" from the contribution rhythm does not fill in the amount with a cash asset

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j03-money-month.spec.ts`, `@journey 3c bug J3-2`. The main journey 3 checks that the form opens and that
  nothing moved.
- **Steps:** A goal with three weekly history contributions of €50 and one "Fund Goal" contribution from a new EUR cash
  asset. Open Wealth → "Your contribution rhythm" → "Fill in €50.00" → in the Fund form, choose "EUR Cash".
- **Expected:** "Contribution quantity (EUR)" holds 50 and says "Filled in from your plan", for the person to check.
- **Actual:** the field is empty.
- **Cause:** `components/platform/contribution-flow.tsx` fills it only when
  `asset.decimals === goal.decimals`. The cash asset has 18 decimals and the due amount (`5000`) is in the goal's 2.
- **Proposed fix:** when the chosen asset's `asset` equals the goal's, rescale the due amount from the goal's decimals
  to the asset's and fill it. Leave it empty only for an asset in another currency.

## J4-1: offline, the Checklist with its day complete cannot be shown

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j04-offline.spec.ts`, `@journey 4b bug J4-1`. The main journey 4 opens the Checklist offline before the
  day's last tick.
- **Steps:** With the offline worker in control, open the Checklist online while its one habit is not yet done. Go
  offline, open the Checklist and tick the dot, then open the Checklist again.
- **Expected:** the path with the dot done ("1 of 1 planet today").
- **Actual:** "This page could not be shown." The console shows `ChunkLoadError: Failed to load chunk
  /_next/static/chunks/<hash>.css`, which is the `.checklist-celebration` stylesheet. That chunk was never fetched
  online, so the worker, which caches hashed files as they are visited, does not have it.
- **Suspected file:** `components/checklist/checklist-page.tsx:26`. `DayCelebration` is `lazy(() => import('./day-celebration'))`,
  and its CSS is `day-celebration.css`. It has no error boundary of its own, so its chunk failure reaches the page's.
- **Proposed fix:** load the celebration inside its own quiet `LoadBoundary` and render nothing when its chunk fails, so
  a decoration never takes the page down. Optionally have `public/sw.js` warm the route's lazy decoration chunks after
  install.

## J4-2: offline, a barcode is never kept for later

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j04-offline.spec.ts`, `@journey 4c bug J4-2`. The main journey 4 leaves this step out.
- **Steps:** Worker in control. Open Health → "Scan or look up a food barcode" once online. Go offline, type barcode
  4006381333931, Look up barcode, then come back online.
- **Expected:** "You’re offline. ZIGoals will offer to look this barcode up when you’re back online." Back online, a
  toast "You’re back online. Look up barcode … now?" with "Look it up".
- **Actual:** "Food lookup is unavailable: this device looks offline …", and nothing is offered back online. Failed
  requests while offline include the chunk that holds `zigoals-offline-queue-v1`, `enqueue` and `readJobs`.
- **Cause:** `components/health/barcode-food-lookup.tsx:82` dynamically imports `lib/offline-queue/queue` only inside
  the offline branch. That chunk is first needed when there is no network, so it is never in the cache. The same applies
  to `components/exchanges/exchanges-panel.tsx:112`, which keeps an exchange read for later the same way.
- **Proposed fix:** import the small queue module statically in its callers, or import it when the fold opens (online)
  so the worker caches it. Keep the `catch` for storage refusals.

## J5-1: Done or Undo from a notification does not show on the open page, and Undo leaves the snapshot without the habit

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j05-notifications.spec.ts`, `@journey 5b bug J5-1`.
- **Steps:** Notifications on, a habit with a reminder now, Habits open. A push shows "1 habit due" → Done. The toast
  "… marked done from a notification" appears → Undo.
- **Expected:** the habit's card shows Complete, then Due after Undo. After Undo the device snapshot holds the habit again
  for the next push.
- **Actual:** the card stays "Due" under the toast that says it was marked done; only a reload shows it. After Undo the
  snapshot is not rewritten until the page is reopened or refocused, or the 10-minute refresh runs, so a push in that
  time finds nothing due.
- **Cause:** `lib/notify/actions.ts` writes the habits with `updatePrivateStore` / `updateDurableStore` and dispatches
  no `zigoals:private-change` event, so neither the Habits page nor `components/notify/notify-sync.tsx` (which listens
  for it) learns of the change.
- **Proposed fix:** after the Done write and after its Undo, dispatch `zigoals:private-change` with `HABITS_KEY` (as
  `lib/sync-homes-store.ts:54` does). Habits then re-reads, and NotifySync refreshes the snapshot 1.5 s later.

## J5-2: "Snooze 1 h" is lost when a ZIGoals page is open

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j05-notifications.spec.ts`, `@journey 5c bug J5-2`. The main journey 5 checks the wake minute that is
  sent, which is correct.
- **Steps:** Notifications on, a habit due now, a ZIGoals page open. A push → "Snooze 1 h".
- **Expected:** the snapshot holds the habit an hour on, so the wake an hour later shows it.
- **Actual:** the worker writes the snoozed item (`public/sw.js` `snooze`) and posts `zigoals:notify-action`. The open
  page answers with `apply().then(refresh)`, and `refreshNotifications` (`lib/notify/device.ts:81`) rewrites the
  snapshot from the records, which know nothing of the snooze. The item is back at its first time, which is outside the
  composer's window an hour later, so that push says "Nothing is due right now." Opening any ZIGoals page during the
  hour does the same. The wake minute stays on the server, because the registration key is unchanged.
- **Proposed fix:** keep snoozes as their own small record in `zigoals-notify-v1` (kv `snoozes`: `kind:id → until`,
  pruned when past), written by the worker. `refreshNotifications` / `buildPlan` would then add each live snooze as an
  item at `until` and keep its `once` minute in the registration.

## J6-1: right after Erase everything a ZIGoals cache is back

**Status: fixed in `07058ae3`; its journey test is a plain test again.**

- **Spec:** `j06-data-safety.spec.ts`, `@journey 6b bug J6-1`. The main journey 6 checks that no page cache and nothing
  but `/_next/static/` files remain.
- **Steps:** Worker in control. Settings → Erase everything… → type ERASE → Erase everything. List `caches.keys()`.
- **Expected:** no `zigoals-*` cache, as the brief says for the caches.
- **Actual:** `zigoals-static-v1` is there again, holding only hashed public files. The worker is still running and
  caches the next chunks the page loads after `forgetOfflineCaches` (`lib/sw/register.ts:24`) deleted them.
- **Proposed fix:** in `eraseEverythingOnThisDevice` (`lib/erase-everything.ts`), unregister the app's service worker
  (`registration.unregister()`) before deleting the caches. The next load registers it again. Alternatively post the
  worker a "stop caching until reload" message.

## J8-1: ZIGi's goal form card with a date is refused

**Status: fixed in `c53dbfaf`; its journey test is a plain test again.**

- **Spec:** `j08-zigi.spec.ts`, `@journey 8b bug J8-1`. The main journey 8 proposes the goal form card without a date.
- **Steps:** The person's AI (mock) answers `{"kind":"goal-draft","name":"Fictional new bike","target":900,
  "currency":"EUR","date":"2027-05-01"}`, which is the shape the protocol note teaches it (`lib/ai/context/specialists.ts`:
  `"date":"2028-06-01"`).
- **Expected:** the card "Goal form, filled in: Fictional new bike", with "By May 1, 2027".
- **Actual:** "I couldn’t turn that into an entry. … Unrecognized key: "day"".
- **Cause:** `lib/ai/actions/parse.ts:88` and `:124` rename any `date` to `day`, a repair meant for log cards.
  `goal-draft`'s strict schema (`lib/ai/actions/schema-ak.ts`) has `date`, not `day`.
- **Proposed fix:** skip the `date` → `day` repair for kinds whose schema has a `date` field (`goal-draft`), or map `day`
  back to `date` for those kinds before validation. Add a parse test with the protocol's own example.

## J6-2 (question for the owner, not a fixme): Erase → Restore never brings the Checklist back

**Status: answered on screen in `c53dbfaf`: the restore screen and Test a backup say the Checklist is never restored (the rule is unchanged).**

`lib/restore/plan.ts` `NEVER_RESTORED` lists "Checklist favourites and day history", so after Erase everything and a
restore from the person's own Export everything, the Checklist path is gone. "Test a backup" still says "All N parts
would restore." The restore screen never shows the `NEVER_RESTORED` sentence: no component imports it. Journey 6
compares every other record and leaves the Checklist out. Suggested: either make `checklist` / `checklistDays`
restorable parts, or show the never-restored sentence under "Restore from a backup" and "Test a backup".

## Not a bug: coverage left open

- **J7b** (`j07-wallet-chain.spec.ts`, `@journey 7b`, fixme): Keplr Mobile signing one reviewed testnet delegation over
  WalletConnect with a stubbed signer. Journey 7 emulates the relay and the wallet (pairing, approval, settlement) and
  proves that pairing asks for nothing to be signed. Signing needs the relay double to answer `cosmos_signDirect`, plus the
  testnet chain doubles of `tests/staking-chain.ts` on the WalletConnect path. The WalletConnect session lives in the
  tab's memory, so the staking page must be reached without a reload. Not built in F2.
