# Session AP — demo tour ("Ready for friends")

Start: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`, then http://127.0.0.1:3100/app. A computer window (1440 wide) for
steps 1–8, a phone width (390) for 9–10. For the Showcase: Settings → **Load Showcase Demo** (on a computer it sits in the
open "Your app" group, or right under its folded summary).

## A friend's first two minutes (fresh profile)
1. **Today → "Set up ZIGoals in about a minute"**, finish the setup. Today now shows **Your first five**: set a goal, add a
   habit, log a meal, record some money. Each step ticks itself from what you add; the card leaves when all five are done
   (or "Not now, hide this").
2. **Help → Send feedback**: tick "Add details about this device". The box shows browser, system, window, motion, installed,
   time zone, **App**, **Theme**, **Screen** — nothing else. "Copy these details" copies exactly that text.
3. **Help → What's new** (this release first) and **Known limitations** (updated 14 Nov: weather off, the new records stay
   private like Health, Bento and the stepping-aside buttons are for computers, …).

## The owner's 14 Nov decisions (Showcase)
4. **Settings** opens as a page of headings, each with one line of what it holds; open what you use (it stays open on
   this device), or "Open all". A link to a setting (from Help or Search) opens its group.
5. **Settings → Your app → Checklist → "A day counts as done at"**: choose 4. The Checklist's flame now counts a day at
   4 of its dots (all dots on a shorter day), from today on; past days keep the rule they had.
6. **Today, Goals, Habits, Health, Wealth → Layout: List · Bento** (beside the lock): the same cards as tiles. Today's
   welcome header and slogan stay exactly as they are. The choice is remembered per page.
7. **Scroll Today at 1440**: the round buttons on the right (ZIGi, Checklist, music) slide halfway into the edge while
   they would sit on top of the right-hand column, and come back when nothing is under them; point at them or Tab to them
   and they are back at once. With Motion Off they move without sliding.

## New everyday tools (Showcase)
8. **Agenda → Day → "By the hour"**: move a task to an hour ("Move to…" or drag), with Undo. **Tasks**: This evening,
   Someday, and the Priority matrix. **Customize Today → "Days until"** for countdowns. **Journal**: words and writing
   days. **Wealth → Spending**: month by month, categories over a year, top payees, tags; **Budgets**: Ready to assign and
   the age of your money; **Upcoming bills**: when an amount changed. **Health**: mood tags, symptoms, orbits for your own
   goals, trends, run splits from a GPX/TCX file, copy a meal to any day.

## On a phone (390)
9. Settings keeps its own list; there is no Layout switch and no floating buttons (they live in Apps & extras).
10. Today's Tab order on a computer is now 89 stops on the Showcase (was 176 in AL): the sidebar, the theme, the check-in
    buttons, favourites and lists are one stop each; the arrow keys move inside them.

## Behind the scenes (no UI)
- `workers/weather-proxy`: built and tested, **off** until the owner deploys it (docs/run11/WEATHER_PROXY_ACTIVATION.md).
- The 25 "needs a service" rows replayed against the repo's own routes and Workers with recorded upstreams:
  `AP_SERVICE_ROWS=1 … playwright test tests/ap/service-rows.spec.ts` (17/17); one real bug fixed (a staking card's raw
  validator status and float rate).
