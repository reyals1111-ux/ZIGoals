# Timezone phase 4 (R2): the decisions before it starts

> Session U Part 9, 2026-10-05. A decision sheet only: nothing here is implemented, and no stored format changes. Phase 4
> is "writes and UI" in [TIMEZONE_DESIGN.md](TIMEZONE_DESIGN.md) ("What this means for the phases"). It may start once the
> T4 preconditions hold (the earliest day is 2026-10-11; see SYNC_HOMES.md, "The write switch", for where they stand).

T3 (valuation capture days stay UTC) and T4 (the R1 → R2 gap) are settled and not repeated here. T1 and T2 were answered
on 2026-10-02; what phase 4 still needs from them is how they show. T6 and QA-24 are open.

## T1: a new plan's zone (answered: new plans follow the journal zone)

**Still to choose:** what the plan form shows.

| Option | What it means |
|---|---|
| A. A zone field on the plan form, prefilled with the journal zone (else UTC), always visible | The zone is never a surprise; one more field on every plan |
| B. The zone in the plan's summary line ("on the 15th, New York time"), changed through "Edit plan" | Shorter form; the zone is still written down once and visible |
| C. No zone shown unless it differs from the device | Least visible; a plan made while travelling may silently follow the wrong zone |

**Recommendation: B.** The default follows the owner's answer, the person sees the zone wherever the date appears, and the
form stays as short as today. A zone change stays a new plan revision from the next day in the old zone (unchanged rule).

## T2: one journal zone with per-module overrides (answered)

**Still to choose:** where it lives, and what happens to the Habits and Health zones people already set.

| Option | What it means |
|---|---|
| A. "Your time zone" in Settings → Today; the Habits and Health zones become "Use a different zone for Habits / Health" under it | One place to look; existing choices keep their meaning as overrides |
| B. Keep the three settings where they are and add the account zone beside them | No move, but three similar settings |

**Recommendation: A**, with the first-time prompt from the design ("write down the zone the first time it matters"): the
first time Today, Habits or Health computes a day from the device zone, it offers once to save that zone as the journal
zone. Nothing is written without that tap.

## T6: the due-day rule (open; "stays as it is until phase 4")

Today an instalment due today already counts as "planned through today", so the QA-04 case (New York, due 2026-10-15,
21:30 local, not funded yet) shows "behind −€500" even with the plan's own zone: the zone alone cannot fix it.

| Option | What it means |
|---|---|
| A. Keep the rule | QA-04 stays failing (Z16); "behind" can show on the due day itself |
| B. An instalment counts as planned once its day has ended in the plan's zone; until then the plan says "due today" | QA-04 flips; nobody is "behind" on the day they are meant to fund |
| C. Due at a fixed time of day (for example 18:00 in the plan's zone) | A cut-off the person never chose |

**Recommendation: B.** It matches how people read a due date, needs no new setting, and flips Z16 together with the zone.
The funding history, past instalments and their ids do not change.

## QA-24: "today" for Health on the Today card (open; phase 5 in the design)

Today's Health card counts "today" in the device zone, while the Health page uses the Health zone when one is set, so
the two can disagree for a while after midnight when travelling.

| Option | What it means |
|---|---|
| A. Keep the device zone on Today | Simple; Today and Health can show different days |
| B. The same order as the Health page: the Health zone, then the journal zone (T2), then the device | Today and Health always agree; the card says the zone when it differs from the device |

**Recommendation: B**, shipped with phase 4's journal zone so the order is the same everywhere; the Today card shows the
zone next to "Today" when it differs from the device (UI needs, item 7 of the design).

## Re-run with phase 4

Session F's 49-day DST sweep, and Stage 8 rows B2, B4 and B5 on two devices in different zones (unchanged from the design).
