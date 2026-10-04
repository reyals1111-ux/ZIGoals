# Session P, PR 3: friends-Alpha features (specs)

**Status:** specification, 2026-10-03, for `features/session-p-2026-10-03` (base `main` `d439dc9`). One file per feature; this file holds the rules every feature follows. Paths are relative to `apps/web/` unless stated. Owner decisions P2 (what syncs), P5 (fasting guardrails), P6 (quick-add English only) and P7 (generic nutrition CSV, no MyFitnessPal preset) are taken; the four additions at plan approval (sync homes and the write switch, the "For you" area, labelled Showcase data, the "What's new" card) are built into every spec.

| Id | Feature | Spec |
|---|---|---|
| H7 | Habits that tick themselves off from Health | [H7-auto-checkins.md](H7-auto-checkins.md) |
| G3 | Goals that track a Health measure | [G3-health-goals.md](G3-health-goals.md) |
| H1 | Streak protection: planned skips, vacation, rest days | [H1-streak-protection.md](H1-streak-protection.md) |
| G1 | Weekly review | [G1-weekly-review.md](G1-weekly-review.md) |
| HE6 | Fasting timer | [HE6-fasting.md](HE6-fasting.md) |
| M3 | Insight cards | [M3-insights.md](M3-insights.md) |
| W3 | CSV import for holdings and transactions | [W3-holdings-import.md](W3-holdings-import.md) |
| I1 | Nutrition CSV import | [I1-nutrition-import.md](I1-nutrition-import.md) |
| T4 | Export everything | [T4-export-everything.md](T4-export-everything.md) |
| A2 | Quick-add line | [A2-quick-add.md](A2-quick-add.md) |

## Owner principles, as rules
- **Consumer first.** No chain, wallet or sync wording inside a feature. The one place a record's home is named is a quiet "on this device" label.
- **Private by design.** Every new record stays on the device (below) until its write switch. No feature makes a network request; the only requests on these pages are the ones the page already made (market quotes, the coin catalog).
- **Never a chore.** Exports and imports are optional; copy says so. Nothing nags: one card, one dismissal.
- **Non-custodial, no advice.** No feature moves money, suggests a target, grades a person or claims a cause. Health copy never praises; fasting copy never praises a longer fast (P5).
- **Honest numbers.** Only the person's own records are counted. Unknown is shown as unknown, never as zero. Nothing is interpolated, forecast or scored.
- **The "Buy ZIG" habit template** (`components/habits/habit-editor.tsx:19`) is not touched.

## Device-only records (P2)
Every genuinely new record type lives in its own versioned key through `getAppStorage()` (`lib/showcase-storage.ts:32`): per account when one is active, the tab's session storage in Showcase, plain `localStorage` otherwise. The pattern is `lib/reminders/` (schema, store, hook) and `lib/portfolio/store.ts` for the unreadable case.

| Key | Written by | Shape (`version: 1`, zod `strictObject`) | Personal | Synced home (read support shipped in PR 2, SYNC_HOMES.md) |
|---|---|---|---|---|
| `zigoals:habit-health-links:v1` | H7 | `{version, links: {[habitId]: HabitHealthLink} ≤ 200, applied: AppliedCheckIn[] ≤ 5,000}` | yes | habits v3: `habits[].healthLink`, `entries[].source` |
| `zigoals:health-goals:v1` | G3 | `{version, goals: HealthGoal[] ≤ 200}` | yes | finance v4: `healthGoals[]` |
| `zigoals:weekly-review:v1` | G1 | `{version, weekday: 0–6, reviews: Review[] ≤ 520}` | yes | settings v2: `weeklyReview` |
| `zigoals:fasting:v1` | HE6 | `{version, sessions: FastingSession[] ≤ 2,000}` | yes | health v2: `fasting` |
| `zigoals:insights:v1` | M3 | `{version, dismissed: {[cardId]: "YYYY-MM-DD"} ≤ 200}` | yes | stays device-only (a view preference, like reminder dismissals) |
| `zigoals:import-undo:v1` | W3, I1 | `{version, imports: ImportRecord[] ≤ 20}` | yes | stays device-only (an undo ledger for records that already sync as ordinary records) |
| `zigoals:whats-new:v1` | the card | `{version, dismissed: string[] ≤ 50}` (release ids) | no | stays device-only (a flag, like `zigoals:onboarding:v1`) |
| `zigoals:push:v1` (PR 4, ADR-010) | the push panel in Settings, the daily refresh | `{version, subscriptionId, endpointHash, quiet: {from, to}, lastSyncDay}` | yes (a device's push subscription) | stays device-only: it describes this browser's subscription, which no other device can use |
| `zigoals:guide:v1` (PR 4, ADR-011) | the Guide switch, "Not today" | `{version, enabled, enabledOn?, dismissed: {[nudgeId]: day} ≤ 100}` | yes | stays device-only (a view preference, like insight dismissals) |

Rules for each key:
1. **Schema:** `lib/<feature>/schema.ts` exports the key, the zod schema, the type and `empty<Name>()`. Field names and types of a record with a synced home are exactly those of the home's schema (`habitHealthLinkSchema` in `lib/habits.ts`, `healthGoalSchema` in `lib/positions.ts`, `weeklyReviewSchema` in `lib/dashboard-settings.ts`, `fastingSessionSchema` in `lib/health.ts`, all as shipped in PR 2), so the move is a plain copy.
2. **Read tolerance:** `read<Name>(storage)` returns `{data, unreadable}` as `readReminders` does (`lib/reminders/store.ts:4`). Unreadable bytes are never rewritten by any automatic path. The feature shows one calm notice ("Your saved <things> on this device could not be read. They were not changed.") and disables its own writes. The only way to replace them is the person's explicit "Start over…" with a second confirmation (as Portfolio, `components/portfolio/portfolio-view.tsx:82`), which first copies the old bytes to `<key>:recovery:<uuid>`.
3. **Writes:** only the feature's own actions write, through `update<Name>(storage, change)` that parses the result before `setItem`. Viewing any page writes nothing (tested).
4. **Hook:** `use<Name>()` mirrors `useReminders` (`components/reminders/use-reminders.ts`): read after mount, refresh on `storage`, its own change event and `ACCOUNT_CHANGE`.
5. **Onboarding:** `lib/onboarding.ts` gains `export const DEVICE_RECORD_KEYS` listing the six personal keys (documentation and the T4 export use it). They are deliberately *not* in `NON_PERSONAL_KEYS` (`lib/onboarding.ts:27`), so `noExistingData` treats a device with any of them as not new and the welcome never returns. `zigoals:whats-new:v1` *is* added to `NON_PERSONAL_KEYS`.
6. **Backups:** no new key is in the module backups, the encrypted backup or sync until T4's export (which includes all of them, readable).
7. **Limits:** every array and record is capped (table above); a feature refuses a write past its cap with a plain message rather than trimming history.
8. **Zod seeds:** every new schema is added to `lib/vault/zod-jitless.test.ts` `load()`, so the JIT and jitless parsers are compared on it (QA-25).

### The write switch (per feature, a later PR)
Exactly SYNC_HOMES.md "The write switch": preconditions (PR 2's Alpha deploy live, at least one further Alpha deploy **and** seven days, the Stage 8 sync rows run on a build with PR 2, no "newer ZIGoals" refusals, the rollback target at or after PR 2); the feature's store then writes through `updatePrivateStore` into its module, bumps the module's `schemaVersion` on first write, migrates the device key once (read, write into the module, delete the key), keeps the key readable one release longer, and adds the migration test plus a two-device Stage 8 row. Each spec's Data section gives its mapping. M3, the import ledger and the What's new flag have no switch.

## The "For you" area on Today
One new section on Today, `components/dashboard/for-you.tsx`, rendered right after the reminder cards (`components/dashboard/today-dashboard.tsx:168`) and before the welcome card, only when `settings.loaded && settings.data.onboarded` and the device is not brand-new (`brandNew` false), never on `/app/welcome`.
- `aria-label="For you"`, eyebrow `FOR YOU`, no heading of its own on phones (the cards carry their headings).
- It holds every new Today card: the fasting line (HE6), the "What's new" card, the weekly review card (G1), PR 4's Guide card, the health goals card (G3) and the insights card (M3). Existing cards (reminders, welcome, widgets) are untouched.
- **At most two cards are open: one on a phone, two on wider screens** (measured in Session P: two open cards made Today meaningfully longer at 390×844, one keeps it within a few percent). Priority when more are ready: (1) fasting line while a fast is running, (2) What's new, once, (3) weekly review when due, (4) Guide (PR 4; opt-in), (5) health goals, (6) insights. The rest sit behind one row "Show more (n)" / "Hide" that reuses the folded-section markup and styles of `components/phone/phone-fold.tsx` (`.phone-fold`, `.phone-fold-toggle`, `.phone-fold-body`, `aria-expanded`, `aria-controls`). `PhoneFold` itself is phone-only (`usePhoneActive`); `ForYou` adds an additive `always` prop to it so the same row works on every size. A `#hash` link to a card inside the fold opens it, as PhoneFold does.
- Nothing in the area is written on view. Dismissing or finishing a card writes only that card's key.
- **Phone screen count** (390×844, Showcase loaded, motion off): new `tests/today-screens.spec.ts` measures `document.documentElement.scrollHeight / 844` on `main` `d439dc9` and on the branch, records both numbers in the STATUS entry, and asserts the branch value is at most the baseline plus 0.5 screen with "For you" folded (two cards). A larger growth fails the spec.
- Motion: cards use the existing one-time arrival (`data-arrive`, `components/motion.css:88`); no loops. Under `prefers-reduced-motion` or `html[data-app-motion="off"]` the final state renders at once.

## The "What's new" card (one-time)
- Shown once per device as a "For you" card: eyebrow `WHAT'S NEW`, title "A few new things.", list of links, button "Got it" (`primary`, min-height 44 px).
- Copy: "All of this stays on this device, and nothing happens unless you use it." Links, each to its Help entry (below): "Habits that tick themselves off from Health", "Health goals", "Planned skips and vacation days", "A weekly review", "A fasting timer", "Things you might notice", "Import a CSV", "Export everything (optional)", "Type a line into Quick add".
- Flag `zigoals:whats-new:v1` `{version: 1, dismissed: ["2026-10-pr3"]}`; "Got it" writes it; it is never shown during onboarding (`brandNew`, `!settings.data.onboarded`, `/app/welcome`), never when the flag is unreadable (fail closed, as `onboardingSeen`), and shown in Showcase (its flag then lives in the tab's session storage).
- PR 4 adds its Guide link to the same list and keeps the same release id; a later release uses a new id.

## Showcase data labelling
`lib/showcase-data.ts` `buildShowcase(day)` gains a record for every new key (the `records` map is written by `activateShowcase`, `lib/showcase-storage.ts:46`). Rules, following the existing conventions `lib/showcase-detect.ts` relies on:
- every fictional record has a fixed id with a `showcase-` prefix (or the habit UUID prefix `92000000-0000-4000-8000-`), never a random one;
- every free-text field carries `SHOWCASE DATA · fictional …` (the exact label of each record is in its spec); where a card shows the record, the card says "Showcase example";
- existing Showcase records keep their ids and bytes; new Health records (water, an imported food and two diary entries) are appended, and the counts pinned by `lib/showcase.test.ts` and `tests/showcase-export-guard.spec.ts` are updated in the same commit;
- Showcase makes no request and writes nothing on view, as today.

What each feature adds: automatic check-in markers for "Walk" (H7), a health goal (G3), a planned skip on "Exercise" (H1), one completed review for last week (G1), one completed 16:8 session yesterday (HE6), water entries so one insight meets its thresholds (M3), one imported food with two diary entries and its undo record (I1), and PR 4's Guide card fixture. The What's new card shows in Showcase as elsewhere.

## Help entries
`components/help/help-page.tsx` gains a section `whats-new-alpha` ("WHAT'S NEW" · "New in this Alpha, all on this device") listed in `TOPICS`, holding one `Question` per feature. `Question` gains an optional `id` (additive) so a link such as `/app/help#help-auto-checkins` lands on it; a small client effect opens the targeted `details` on load and on `hashchange` (the PhoneFold reveal pattern). Entry ids: `help-auto-checkins`, `help-health-goals`, `help-skips`, `help-weekly-review`, `help-fasting`, `help-insights`, `help-imports`, `help-export-everything`, `help-quick-add`. The question and answer text of each is in its spec. FRIENDS_GUIDE.md gets a "What's new" paragraph with the same nine lines.

## Shared test strategy
- **Unit (vitest, `lib/<feature>/*.test.ts`):** schema (valid, every limit, version 2 refused), store (unreadable read, nothing rewritten, write refused while unreadable, Start over copies the old bytes), engine cases listed per spec with expected values, zone cases through `habitCalendarDay` (`lib/habits.ts:120`) and `healthDay` (`lib/health-daily.ts:157`) on the eleven host zones of `lib/plan-revisions.timezone.test.ts:14`, DST days (2026-03-29 and 2026-10-25 in Europe/Brussels; 2026-03-08 and 2026-11-01 in America/New_York), empty data, and the Showcase fixture.
- **Browser (Playwright, `tests/<feature>.spec.ts`, projects `desktop` and `mobile`, `apps/web/playwright.config.ts`):** every spec routes `**/api/**` to 503 (the offline fixture), sets `zigoals:onboarding:v1` seen and `zigoals:motion:v1` off, and uses Showcase through Settings → "Load Showcase Demo" where it needs data. Each asserts: the feature's happy path; the stored bytes of its key after the action (exact object); nothing written on view (every `zigoals:` key unchanged after visiting the page); the unreadable notice; phone sizes 390×844 (and 320×568 where a sheet is involved); keyboard reach and names for every control; touch targets ≥ 44 px on the mobile project (the `smallTargets` helper of `tests/phone-touch-targets.spec.ts`).
- **Freeze check** (`scripts/desktop-freeze-check.mjs`, six sizes, 154 captures): run against `main` `d439dc9`; the differences must be exactly the list below.
- **Stage 8:** `docs/run11/STAGE8_COVERAGE.md` and the run-sheet gain row **B13** "automatic check-ins, planned skips and imported records sync as ordinary records; verified on two devices" (plan 3.11).

## Authorized desktop and tablet differences (whole PR)
Everything else must be pixel-identical to `d439dc9` at every size.
1. **Today:** the "For you" section (fasting line, What's new, weekly review, health goals, insights) and nothing else; in Showcase, the Showcase fixtures of those cards.
2. **Habits:** the editor's "Done automatically from Health" section and the "Plan a skip / Vacation / Rest days" controls; on a card, the "Done automatically" badge, the "Planned skip" calendar label and legend entry, and the skip and vacation rows.
3. **Goals:** the "Health goals · on this device" section and its creator.
4. **Health:** the "Fasting timer" module, the "Import a nutrition CSV" disclosure in Diary, and the "Recent imports" rows while an undo is available.
5. **Settings:** the "Export everything (optional)" section, the weekly review weekday field, and the phone settings rows for both (phones only).
6. **Quick add dialog:** the line field and its preview card (also the `dialog-quick-add` freeze capture).
7. **Portfolio:** "Import transactions from a CSV" in "Keep a copy" and the import panel.
8. **Wealth:** "Import from a CSV file" in the "Add to your wealth" sheet (also the `dialog-add-asset` capture).
9. **Help:** the "What's new" section and topic link.
Each feature spec repeats its own lines so a reviewer can check them one by one.
