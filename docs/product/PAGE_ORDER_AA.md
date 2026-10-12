# Every page in order (Session AA-Cloud Part 1)

The owner's rule: **never remove a card, option or feature; only reorder and group**, so every page is clean at first
glance. Habits is the model and stays untouched: highlights on top, the actual habits right below. Every page now follows
one order:

1. **Top:** the page's hero, its key figures and highlights, a compact tracker/summary row and the progress slot
   (`components/progress/slot.tsx`, filled by Session AA-Local's game cards).
2. **Within one or two phone screens (at once on desktop):** the page's main items.
3. **Then** secondary tools and widgets.
4. **At the bottom:** summaries, history, archives, weekly reviews, insight archives and links to settings.

Only the **default** order changes. A layout a person arranged on this device (`zigoals:layout:v1`, the Today placement
in settings) still wins: saved ids keep their order and a card it has never seen goes beside its default neighbour
(`lib/page-layout.ts` `resolveOrder`). Nothing stored changes shape (ADR-021 A3). Before/after captures for every page:
`review/session-aa-cloud-screens` (390, 1024, 1440; Showcase and a new device).

Measured with the Showcase on a 390 px phone before this change (`32cb9c5`'s build): Today's Daily Habits started about
5,000 px down (six phone screens), Wealth's holdings about 4,500 px down, Staking's positions after the wallet and scenario
utilities, Activity's feed after the favourites card.

## Today (`/app`)
| | Before | After |
|---|---|---|
| Top | Hero → reminder cards → For you (What's new, the weekly review, the brief, the Guide, insights, the fasting line, Health goals, the journal zone, the wrap-up, folded after three) → "Make Today yours" (until a layout is chosen) | Hero with the progress slot (`today`) and the game place (`today:game`) → **Today's focus**: what is due now (reminder cards; habits due today with their count; the next goal step; a quick Health log: water and Quick add; fasting and last night's sleep), with the places for AA-Local's habit time-of-day widget (`today:habit-time`) and Health coach check-in (`today:coach`) |
| Main | Whole-life overview → Attention agenda → Funding rhythm → Records needing attention → Watchlist → Your Goals → Financial progress → Daily Habits → Daily Health → Next Goal action → Widget summary → your widgets | Grouped under small headings: **Your day** (Daily Habits, Daily Health) → **Your goals** (Your Goals, Next Goal action, Attention agenda, Funding rhythm) → **Your money** (Records needing attention, Watchlist, Financial progress) → **Your widgets** (Widget summary, your widgets, then this session's device widgets: life balance, pace forecasts, the calculator teaser, the review) → **Your whole life** (Whole-life overview) |
| Then | — | **For you** (the brief, the Guide, insights and cross-pillar insights, Health goals, the journal zone) |
| Bottom | How it works → My links → Your week | "Make Today yours" (Showcase only; a new device keeps it on top as its first action) → **Updates and summaries**: What's new, the weekly review / Life review, the evening wrap-up → How it works → My links → Your week |
| Rail (desktop) | Wallet → Staking → Next destination → Recent activity | unchanged |

Reason: on a phone the day's own items (habits, Health, goals) were six screens down below financial agendas and
announcements. Group headings appear only while Today keeps its default order and is not being arranged; a person's own
arrangement is shown exactly as saved.

## Goals (`/app/goals`)
| | Before | After |
|---|---|---|
| Top | Header → Goals/Positions tabs → status filters | Header with key figures (active, on track, finished) and the progress slot → tabs and filters |
| Main | Goal cards | Goal cards (unchanged) |
| Then | Milestones ahead → Health goals | Health goals (they are goals too) → Life balance (Part 2) → Goal templates, a tool (Part 2) |
| Bottom | — | Milestones ahead → Hall of achievements, the archive of finished goals (Part 2). Cards, Vision board and Tree are three views of the main items, switched at the top. |

## Wealth (`/app/wealth`)
| | Before | After |
|---|---|---|
| Top | Hero (total) | Hero (total) with the progress slot → Portfolio pulse (the compact tracker row) |
| Main | The shape of your wealth → Favourite markets → Portfolio pulse → Your wealth, in perspective → What you have → Your assets | What you have → **Your assets** → Accounts, debts & net worth |
| Then | — | The shape of your wealth → Your wealth, in perspective → Allocation and coverage → the compound interest calculator card (Part 3, opens `/app/wealth/calculator`) → Favourite markets |
| Bottom | Your wealth over time → Explain recorded change → Evidence & returns → Archived assets → Accounts, debts & net worth → Allocation and coverage | Your wealth over time → Explain recorded change → Evidence & returns → Archived assets |

Reason: holdings and accounts are the page's items; they were about 4,500 px down on a phone.

## Markets (`/app/markets`)
Hero with the progress slot → Explore markets (the list) → What's tracked, and how. Already in order; the slot and the
premium pass only.

## Portfolio (`/app/portfolio`)
| | Before | After |
|---|---|---|
| Top | Hero → import banner | Hero with the progress slot → import banner |
| Main (each portfolio) | Summary → value over time → allocation → holdings → transactions | Summary → **holdings** → value over time → allocation → transactions |
| Bottom | Market watch → Keep a copy | unchanged |

## Staking (`/app/staking`)
| | Before (phone) | After |
|---|---|---|
| Top | Hero → observed totals | Hero → observed totals |
| Main | (phone) wallet and scenario utilities first → positions | **Positions & allocations → Tracked crypto → reward examples → Valdora** |
| Then | — | Wallet and scenario utilities (the desktop rail is unchanged) |
| Bottom | Future provider architecture → What's tracked | unchanged |

## Activity (`/app/activity`)
Hero with the progress slot → Your activity sources (the compact tracker row) → **the feed** → Markets in your
favourites → older local history. Before: the favourites card sat between the sources and the feed.

## Settings (`/app/settings`)
The six labelled groups stay in their order (Data & privacy first: the page's hero is "Your data. Your control."), with a
**sticky in-page index** on desktop and tablet (a horizontal, scrollable index under the header on phones) and the new
"Your data" health page linked from Data & privacy (Part 6).

## Help (`/app/help`)
Hero → topic index → answers (unchanged order). The ZIGi heading stays on one line on phones.

## Ecosystem, Chess
Hero → search and filters → the list (Ecosystem); hero → ratings → games (Chess). Already in order; premium pass only.

## Health (`/app/health`, light, AA-Local's page)
Only the top: the progress slot under the page heading. Announced in `docs/handoff/AA_CLOUD_TO_LOCAL.md` before it was
made. Everything else in Health is AA-Local's.

## Habits (`/app/habits`)
Untouched (the model). AA-Local places its own `<ProgressSlot page="habits"/>`.
