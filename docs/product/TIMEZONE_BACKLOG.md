# Timezone and date backlog (for the later timezone project)

**Status (2026-10-01, Session H):** this file collects decisions and open items only. Nothing here is implemented or changed.

**Owner decision (2026-10-01):** funding days stay UTC for now. Timezone work comes later. This page makes sure nothing is forgotten.

**Design (2026-10-01, Session J):** [TIMEZONE_DESIGN.md](TIMEZONE_DESIGN.md) covers proposed stored formats, versioning and rollback, sync implications, the QA-04 path and UI needs. Pure helpers are in `packages/goal-engine/src/time/`, not wired into the app.

**Sources:**
- Session F's QA sweep, [docs/qa/QA_SWEEP_2026-09-30.md](../qa/QA_SWEEP_2026-09-30.md), with personas in Brussels, Amsterdam and New York and 49 simulated days across the end of summer time;
- the code at `main` `61035dc`.

Paths are relative to `apps/web/`.

## How each part of the app decides "today"
| Area | Day used | Where | Visible to the user as |
|---|---|---|---|
| Goal funding health ("behind / on track", "planned through today", "next contribution") | **UTC** | `fundingHealth`, `lib/goal-intelligence.ts:57` (`today`/`tomorrow` are UTC date slices, `:59`) | Plan form: "Dates use UTC" (`components/platform/tracked-detail.tsx:130`) |
| Plan revisions (effective day, earliest change) | **UTC** | `lib/plan-revisions.ts:5-6` (`day`, `shift`), `earliestPlanChange` `:10` | "Changes apply from their effective day in UTC" (`components/platform/plan-history.tsx:11`) |
| Planned instalments and scenario horizon | **UTC** calendar arithmetic | `scenarioHorizon` `lib/positions.ts:234`, `planScenario` `:252` | — |
| Applicable plan in Goal summaries | **UTC** | `lib/goal-summary.ts:32` | — |
| Valuation capture days (one capture per entity per day) | **UTC** | `captureValuations`, `lib/goal-intelligence.ts:117`; `components/platform/use-valuation-history.ts:12` | Documented in `docs/RUN_9_REPORT.md` |
| Goal history date filters | **UTC** (display may be local) | `lib/goal-intelligence.ts:150-153` | "Choose a valid UTC date range." |
| Habit journal day | **Habit journal timezone**, otherwise the device zone | `habitCalendarDay`, `lib/habits.ts:117-121`; `saveHabitTimezone` `:122` | Habits → "Habit journal timezone" (`components/habits/habits-workspace.tsx:91`) |
| Habit timers | The zone stored with each timer | `lib/habit-actions.ts` (`zonedDay`) | "A timer started under another timezone requires explicit review." |
| Health journal day | **Health timezone** preference, otherwise the device zone | `healthDay`, `lib/health-daily.ts:157`; preference `lib/health.ts:101` | Health → daily tools timezone (`components/health/daily-tools.tsx`) |
| Health "today" on the Today card and the "last 7 days" insight | **Device** day | `components/health/health-today.tsx` (`useLocalToday`), `weekAcross` in `lib/bottom-insights.ts`, `components/dashboard/today-dashboard.tsx` | — |
| Latest weight shown for today | The reading's own zone day (fixed in `9cb79e1`, QA-07) | `lib/body-measurements.ts:49-52` | — |
| Device "today" hook | Device zone, refreshed every 30 s | `useLocalToday`, `components/use-local-today.ts:5` | — |
| Local simulation ledger | Device clock; refuses timestamps more than 5 min ahead (QA-36) | `lib/local-ledger.ts:57` | — |

## Open items
1. **QA-04: funding and plan days are UTC** (major; decided to stay UTC for now).
   - Tom, in New York, funds at 21:30 local on the due day. He already sees "Funding Wealth behind", "Planned through today €500" and "Contribution variance −€500", and "Next contribution" jumps to next month.
   - In Brussels, 00:00–02:00 is still "yesterday".
   - Option (F): compute `today` in `fundingHealth` and in plan revisions from a **stored plan zone**, defaulting to UTC for existing plans.
   - A change moves instalment boundaries for existing plans and is visible across synced devices. It therefore needs its own design note and TIER 3 PR, and there is no data-format change without one.
2. **The plan form mixes zones.** "Next expected date" defaults to the **device** day (`localDate()` in `tracked-detail.tsx:130`), while the form says "Dates use UTC" and `earliestPlanChange` is UTC. Around midnight the default and the minimum can disagree by a day.
3. **QA-16: the Health journal date does not move at midnight while the page stays open** (minor; UI backlog). `components/health/health-app.tsx:89` sets `date` once with `useState`. At 00:02, water is logged to yesterday. Suggested fix (F): follow `useLocalToday()`/`healthDay()` when the selected date equals the old "today".
4. **QA-24: device day versus Health journal zone** (minor). With a Health timezone that differs from the device's, the Today card and "last 7 days" (device day) can disagree with the Health page (journal day) for a few hours a day. One source of "Health today" is needed.
5. **Three independent zone settings.**
   - The Habit journal timezone, the Health timezone and the device zone are separate, and Goals ignore all three (UTC).
   - Before adding a fourth, decide whether one account-level "journal timezone" should drive Habits, Health and (optionally) plans, with per-module overrides kept for compatibility.
   - Existing stored zones must keep their meaning: old entries are date-only and stay as recorded.
6. **Valuation capture days in UTC.**
   - A New York evening capture belongs to the next UTC day, so "one capture per day" can skip or double a local day around midnight.
   - Changing it changes history density, so keep UTC unless the plan zone (item 1) lands.
7. **Synced devices in different zones.** Habit and Health zones travel with the private data, while the device zone does not. Any change must keep sync deterministic: the same records give the same days on every device.
8. **Clock skew.** The local simulation ledger refuses timestamps more than 5 minutes ahead of the device clock (QA-36). A wrong device clock looks like a timezone bug to users. Consider a plain message.

## DST and calendar edges already verified (keep them green)
From Session F, browser and unit:
- the journal date was right on each of 49 days across 25 Oct 2026, and on the repeated 02:30 hour;
- New York, 1 Nov 01:30 (second pass);
- year end in New York and Brussels;
- 2028-02-29;
- streaks survive a missed day, DST and a journal zone change exactly as documented;
- the Monday–Sunday week spans the DST change.

## Tests that already exist
- **Per-case TZ suites.** These switch `process.env.TZ` per case, so CI covers every zone with no `ci.yml` change:
  - `lib/calendar-zones.test.ts`: UTC, Europe/Brussels, America/New_York; DST ends, rollovers, year end, the leap day;
  - `lib/latest-weight-day.test.ts`: QA-07, three device zones.
- **Zone-parameter tests** (zone passed in, host TZ unchanged): `lib/habit-timezone.test.ts`, `lib/health-daily.test.ts`, `lib/body-measurements.test.ts`, `lib/habit-actions.test.ts`.
- **Evidence:** 54/54 date regression tests under host TZ UTC, Brussels, New York, Auckland and Kolkata (Session F, STATUS).

**For the timezone project:**
- add per-case TZ suites for `fundingHealth`, the plan-revision days and `captureValuations` **before** changing them, so each new rule fails first;
- add a browser check for QA-16 (Health page open across midnight).

## User-facing setting ideas (not decided)
- One "Journal timezone" in Settings, defaulting to the device zone, with Habits and Health following it unless overridden. Show the zone next to "Today" when it differs from the device.
- Plans: show "Due today (UTC)" while plans stay UTC. Later, a per-plan zone chosen when the plan is created, with existing plans kept on UTC.
- A gentle notice when the device zone changes (travel): "Your journal stays in Europe/Brussels. Switch?" Never rewrite past entries.
