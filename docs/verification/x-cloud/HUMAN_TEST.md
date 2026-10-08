# Session X Part 14: the human-style test (charter first)

**Status:** charter written 2026-10-08, before any journey was driven; both passes done the same day. Results, the
coverage table, the time spent and every finding are under Results. Labels: local (production build, `next start`, this
sandbox's Chromium; the final Pass 1 run with CI's fonts), live (alpha.zigoals.app, deploy #32, fictional data in the
browser only), CI.

## What "human-style" means here
A journey is what a person does in one sitting, start to finish, with the checks a careful person makes along the way:
it reads the screen, uses the controls a person would (click, tap, keyboard), makes mistakes and corrects them, reloads,
goes back, opens a second tab. Each journey states what must be true at the end (the record saved, the number right,
nothing else changed, nothing sent that should not be). Unknown is never zero; nothing fake is shown as real.

**Viewports:** D = desktop 1440 × 900, T = tablet/laptop 1024 × 768, P = phone 390 × 844 (touch, iPhone 13 profile).
**Data states:** E = empty Local Demo (a new device), L = Local Demo seeded with fictional records, S = Showcase Demo.
Each journey runs on every viewport listed, in every data state listed. "all" = D, T, P.

**How it runs:** Pass 1 drives every journey as a Playwright script in `apps/web/human-x/` (its own config,
`playwright.human.config.ts`, outside CI's suite) against a production build, at most two workers, plus manual-style
exploratory sessions with screenshots. Pass 2 runs a subset of at least 60 journeys against the live Alpha with polite
pacing (one browser, one worker, a pause between steps, no load testing, market pages opened sparingly because the
CoinGecko budget is shared), fictional data only, nothing leaving the browser beyond what the app itself sends.

**Fix loop:** every real bug in this lane is fixed, re-tested and gets a regression check; first-week polish (empty states,
first-run hints, Today with no data) is done here. ZIGi findings go to the X-LOCAL handoff (launcher and panel smoke only).

## Pages and flows in scope
Today (hero, Quick add, widgets and customisation, reminder cards, What's new, the weekly review, the evening wrap-up,
insights, the Guide, sleep card); Goals (collection and filters, create wizard, goal detail, contributions, milestones,
"On track?", tracked goals, Positions redirect); Habits (create, check in, counters and minutes, skip, vacation,
challenges, stacks, reminders, automatic check-ins from Health, history and reflection, filters); Health (Diary, Foods &
recipes, Meals & planning, Weight, Measurements, Activity, Targets, Journal settings, fasting, water, barcode, Sleep,
Meditation, Devices, quick logging); Wealth (assets, accounts, debts, net worth per currency, asset detail, cash); Portfolio
(portfolios, transactions, charts, coin page, CSV import, keep a copy); Markets (watch, favourites, detail); Staking
(watch-only address, positions); Ecosystem (cards, project links, network tools); Activity (timeline, filters, Actions by
ZIGi); Chess; Music (focus sounds, the player, Spotify's honest state); My links; Settings (every group: Data & privacy,
Your app, Your areas, Account & devices, ZIGi, Help & diagnostics; Your pages & buttons); Help (every topic, feedback,
known limitations); Install; the welcome and first run; Export everything; imports (CSV, Switch to ZIGoals) and undo;
ZIGi (launcher and panel smoke only, X-LOCAL's lane).

**Cross-cutting conditions** applied inside the journeys: reload mid-flow; back and forward; two tabs; offline and
reconnect; time zone and DST (Europe/Brussels across 26 October 2026, America/New_York, Asia/Tokyo, Pacific/Kiritimati);
midnight rollover; huge and tiny numbers; many currencies; Unicode, emoji, right-to-left text and long names; keyboard
only; reduced motion; Motion Off; 200 % zoom.

## The journeys (260)

### Welcome, first run, Today (J001–J030)
| ID | Journey | Views | Data |
|---|---|---|---|
| J001 | A new device opens /app: the welcome card explains Local Demo, nothing is saved yet | all | E |
| J002 | Show the welcome → pick Habits and Health → Finish setup → Today shows those areas only | all | E |
| J003 | The welcome, left half-way, then reloaded: nothing was saved, the card is still offered | all | E |
| J004 | Run the welcome twice: nothing is added twice | D, P | E |
| J005 | Today with no data: every empty state says what to do next, no zero shown as a fact | all | E |
| J006 | Load Showcase Demo from Settings → Today fills; reset leaves personal Local Demo records untouched | all | E, L |
| J007 | Today's hero "+ Quick add" → each action opens its form; Escape closes and focus returns | all | S |
| J008 | Quick add a contribution to a goal from Today; the goal's progress updates on Today and Goals | all | L |
| J009 | Quick-add line: "drank 2 glasses of water" → preview → Save → water on Today and Health | all | L |
| J010 | Quick-add line misunderstood ("asdf") → a plain message, nothing saved | all | L |
| J011 | Quick-add line with "yesterday" → saved on yesterday's date in the device's zone | D, P | L |
| J012 | Customize Today: hide, reorder and remove widgets; reload keeps it | all | S |
| J013 | Customize Today with the keyboard only | D | S |
| J014 | Reminder cards: a due habit reminder shows, "Done" checks in, "Later" hides it | all | L |
| J015 | What's new card: open a link, dismiss; it never returns on this device | all | E, S |
| J016 | Weekly review on its day: six steps with my own numbers, skip one, finish | all | L |
| J017 | Weekly review skipped with one tap; Today stays calm | D, P | L |
| J018 | Evening wrap-up turned on in Settings; after 18:00 tick off the day, intention, mood → Health | all | L |
| J019 | Insight card appears only with two weeks of records; dismiss it → away for four weeks | D, P | L |
| J020 | The Guide turned on: one note a day, "Not today" hides it, turning it off removes it | all | L |
| J021 | Today's sleep card after logging a night | all | L |
| J022 | Today at midnight: the day rolls over without a reload; counters reset for the new day | D, P | L |
| J023 | Today in Pacific/Kiritimati and America/New_York: "today" is the device's day | D, P | L |
| J024 | Today at 200 % zoom: nothing overlaps, no sideways scroll | D | S |
| J025 | Today with reduced motion and with Motion Off: nothing moves by itself | D, P | S |
| J026 | The brand film: opens on request only, plays, closes, focus returns | D, P | S |
| J027 | Today's links to each area land on the right page with the title focused | all | S |
| J028 | Two tabs: check in a habit in one, the other updates or says it changed | D | L |
| J029 | Today offline: what is on the device still shows; market figures say unavailable, not zero | all | S |
| J030 | Today's "On track?" and progress rings agree with the Goals page | D, P | S |

### Goals (J031–J060)
| ID | Journey | Views | Data |
|---|---|---|---|
| J031 | Create a goal with the wizard: name, target, date, art; it appears in Active | all | E, L |
| J032 | The wizard with mistakes: empty name, zero target, past date → each error says what to fix | all | E |
| J033 | Reload in the middle of the wizard → nothing half-saved | D, P | E |
| J034 | Back button from the wizard's second step | D, P | E |
| J035 | A goal named with emoji, accents and 120 characters: list, detail and Today show it whole or ellipsed, never overflowing | all | L |
| J036 | A right-to-left name (Arabic) on the goal card and detail | D, P | L |
| J037 | Huge target (1,000,000,000,000) and tiny (0.01): formatting stays readable | all | L |
| J038 | A goal in each of EUR, USD, JPY (no decimals), CHF | D, P | L |
| J039 | Contribute to a goal, undo it, contribute again; history shows exactly what happened | all | L |
| J040 | Milestones: add two with values and dates; they mark the bar; edit one; delete one | all | L |
| J041 | "On track?" with zero return: what is left, the date it points to, per week/month | all | L |
| J042 | "What if it grew": an assumption shown, never stored (reload: gone) | D, P | L |
| J043 | Complete a goal; it moves to Completed; the filter shows it | all | L |
| J044 | Close a goal; Closed filter; reopen | D, P | L |
| J045 | Filters Active/Completed/Closed/All at 320 px: the chip row scrolls inside itself, the page does not | P | S |
| J046 | The goals collection paginates and the count is right | D, T | S |
| J047 | Goal detail by direct URL of a goal that does not exist → a calm not-found, a way back | all | E |
| J048 | Tracked goals: open a tracked goal's detail from the collection | all | S |
| J049 | /app/goals/positions redirects to Staking | D, P | S |
| J050 | Delete a goal: confirmation, then gone from Goals and Today | all | L |
| J051 | Edit a goal's target and date; Today's numbers follow | D, P | L |
| J052 | Goals with the keyboard only: create, open, contribute | D | E |
| J053 | Goals on a phone: "+ Create a goal" reachable, the cards a third of a screen | P | S |
| J054 | Two tabs editing the same goal | D | L |
| J055 | Goals offline: create works on the device | D, P | E |
| J056 | Goal art: each preset renders; reduced motion shows it still | D, P | L |
| J057 | Goal progress ring at 0 %, 50 %, 100 % and over 100 % | all | L |
| J058 | Goal detail's contribution list with 200 entries scrolls and stays responsive | D | L |
| J059 | A goal created in New York, viewed after switching the device to Tokyo: dates stay the dates I chose | D | L |
| J060 | Goals' empty state on a new device explains the first step | all | E |

### Habits (J061–J090)
| ID | Journey | Views | Data |
|---|---|---|---|
| J061 | Create a daily habit; check it in; the streak shows 1 | all | E |
| J062 | A habit on weekdays only: weekends are rest days, never breaking the streak | all | L |
| J063 | A counter habit (pushups, target 50): +10 five times; done | all | L |
| J064 | A minutes habit (reading 20 min) | D, P | L |
| J065 | Undo a check-in within ten seconds | all | L |
| J066 | Skip a single day from History & reflection; the streak holds | all | L |
| J067 | Vacation for a week from the top of Habits; reminders stay quiet; remove it | all | L |
| J068 | A 30-day challenge; its end date; the calm note when it ends (clock moved) | D, P | L |
| J069 | A stack of three habits shown together; its reminder | all | L |
| J070 | A habit reminder at a time; it shows on Today when due | D, P | L |
| J071 | Automatic check-in from Health water: log water → the habit ticks itself; tapping wins; Undo keeps it off | all | L |
| J072 | Automatic check-in from steps with a target | D, P | L |
| J073 | Habit names with emoji and 80 characters | all | L |
| J074 | Filter habits; search by name | D, P | S |
| J075 | Edit a habit's schedule mid-streak; past days keep their marks | D, P | L |
| J076 | Delete a habit; confirmation; gone from Today | all | L |
| J077 | Habits with the keyboard only | D | L |
| J078 | Habits at 320 px: buttons at least 44 px, no sideways scroll | P | S |
| J079 | Check in just before midnight and just after; two separate days | D | L |
| J080 | DST: a habit checked in on 25, 26 and 27 October 2026 in Brussels keeps a 3-day streak | D | L |
| J081 | Habit history and reflection notes: write, reload, edit | all | L |
| J082 | Habit journal settings (week start, display) | D, P | L |
| J083 | Habits offline; checks saved on the device | D, P | L |
| J084 | Two tabs checking in the same habit | D | L |
| J085 | Habits in Showcase: nothing writes to my Local Demo | D, P | S |
| J086 | A habit linked to meditation minutes | D, P | L |
| J087 | A habit linked to sleep | D, P | L |
| J088 | Habits' empty state | all | E |
| J089 | Today's habit progress matches Habits | all | L |
| J090 | Habits with reduced motion: no celebratory motion | D, P | L |

### Health (J091–J135)
| ID | Journey | Views | Data |
|---|---|---|---|
| J091 | Health's first visit: the consent and what stays on the device | all | E |
| J092 | Diary: add a meal by hand with calories and macros | all | E, L |
| J093 | Diary: invalid food values are refused with a reason; the draft is kept | all | L |
| J094 | Foods & recipes: create a food, then a recipe from two foods; use it in the diary | all | L |
| J095 | Meals & planning: plan a day; grocery list | D, P | L |
| J096 | Copy yesterday's breakfast; Repeat yesterday | all | L |
| J097 | Pinned and usual items as one-tap chips | D, P | L |
| J098 | Water: own glass sizes; add, undo | all | L |
| J099 | Weight: log 78.4 kg; switch to lb in settings; the trend reads right | all | L |
| J100 | Measurements: waist and chest; edit; remove | D, P | L |
| J101 | Activity: steps and an exercise counter | all | L |
| J102 | Targets: set and clear; nothing suggested by ZIGoals | D, P | L |
| J103 | Journal settings: units, day start | D, P | L |
| J104 | Fasting timer: start 16:8, stop early; only hours and targets kept | all | L |
| J105 | Fasting stopped automatically at 24 h (clock moved) | D | L |
| J106 | Health goals: steps for a week; progress from my entries; "No data yet" before | all | L |
| J107 | Barcode: camera denied → a plain message; type the number instead | P | L |
| J108 | Barcode lookup offline → unavailable, nothing invented | D, P | L |
| J109 | Sleep: "I'm going to bed" then "I woke up"; time asleep "estimated" | all | L |
| J110 | Sleep: log a night by hand with quality and tags; edit; delete | all | L |
| J111 | Sleep across the Brussels clock change (night of 25–26 October 2026) | D, P | L |
| J112 | Sleep debt and bedtime consistency show their formulas | D, P | L |
| J113 | A nap | D, P | L |
| J114 | Sleep at 320 px | P | L |
| J115 | Meditation: time a session; mood before and after | all | L |
| J116 | Meditation: the breathing circle; with reduced motion words and a count instead | D, P | L |
| J117 | Meditation weekly goal | D, P | L |
| J118 | Focus sounds: start, timer fade, "Stop when I leave ZIGoals" | D, P | L |
| J119 | Devices: the honest list; Bluetooth unavailable says so | all | E |
| J120 | Devices: Oura, Withings, Polar, Strava say "Needs setup by ZIGoals" | D, P | E |
| J121 | Health's views in order with the keyboard | D | L |
| J122 | Health in Showcase writes nothing to my records | D, P | S |
| J123 | Health with a long food name and emoji | all | L |
| J124 | A day with 50 diary entries: the diary stays usable | D | L |
| J125 | Health offline | D, P | L |
| J126 | Health's date picker: yesterday, last week; back to today | all | L |
| J127 | Health's diary at midnight rollover | D | L |
| J128 | Quick logging from the Health page's counters | all | L |
| J129 | Health in America/New_York vs Asia/Tokyo: the day's entries stay on their day | D | L |
| J130 | Health consent withdrawn: ZIGi's Health gate closes; records stay on the device | D, P | L |
| J131 | Health's empty state | all | E |
| J132 | Health → Sleep → back → Meditation → back: each view's title focused | D, P | L |
| J133 | Health two tabs | D | L |
| J134 | Health with reduced motion and Motion Off | D, P | L |
| J135 | Health at 200 % zoom | D | L |

### Wealth, Portfolio, Markets, Staking, Ecosystem (J136–J180)
| ID | Journey | Views | Data |
|---|---|---|---|
| J136 | Wealth's empty state | all | E |
| J137 | Add a manual asset with a value; labelled as a manual value | all | E, L |
| J138 | Add an asset in JPY, one in CHF: net worth per currency, never converted | all | L |
| J139 | An asset whose value is unknown is never counted as zero | all | L |
| J140 | Accounts and debts: add a debt with a rate and payment; the payoff date appears; remove the rate → gone | all | L |
| J141 | Cash: add, edit, allocate, keep out of staking | D, P | L |
| J142 | Asset detail by direct URL; unknown asset → calm not-found | D, P | E |
| J143 | Wealth's asset mix; the legend matches | D, P | S |
| J144 | Wealth with 1e15 and 0.00000001 values | D, P | L |
| J145 | Wealth offline: manual values still show; market values say unavailable | D, P | S |
| J146 | Portfolio: create, rename, delete a portfolio | all | E |
| J147 | Portfolio: add buy and sell transactions; the position and charts follow | all | L |
| J148 | Portfolio: a gap in prices is shown as a gap, never guessed | D, P | L |
| J149 | Portfolio CSV import: map columns, preview, confirm, undo | all | L |
| J150 | Portfolio CSV with blank cells and an unknown coin: blanks stay unknown; the coin is mine to choose or skip | D, P | L |
| J151 | Portfolio "Keep a copy" and "Replace portfolios" | D, P | L |
| J152 | Portfolio coin page from a position; back keeps the scroll | all | S |
| J153 | Portfolio's value chart with the keyboard (arrows, Home, End) | D | S |
| J154 | Portfolio's 1 h and 7 d changes say "Not provided" without the market service | D, P | S |
| J155 | Portfolio unreadable data: a calm message and a way to keep the bytes | D | L |
| J156 | Markets: browse, favourite three, reorder; reload keeps them | all | S |
| J157 | Markets: open a detail; the price chart; its source and time | all | S |
| J158 | Markets offline and with the market service unavailable: honest states | D, P | S |
| J159 | Markets: a missing price stays "unknown" | D, P | S |
| J160 | Markets with the keyboard only | D | S |
| J161 | Staking: watch-only address entry; invalid address refused | all | E |
| J162 | Staking: Showcase positions; totals; no action that moves funds | all | S |
| J163 | Staking: chain unavailable → an honest message | D, P | E |
| J164 | Staking at 320 px | P | S |
| J165 | Ecosystem: cards open in place; Enter and Space; several stay open | all | S |
| J166 | Ecosystem: a #project link opens its card | D, P | S |
| J167 | Ecosystem: links are safe (new tab, no referrer); no contract addresses or promises | D, P | S |
| J168 | Ecosystem: network tools and integration readiness | D, P | S |
| J169 | Wealth → asset → back → Portfolio → coin → back: focus lands on each title | D, P | S |
| J170 | Wealth and Portfolio in Showcase write nothing to my records | D, P | S |
| J171 | Many currencies on one screen: EUR, USD, GBP, JPY, CHF, BTC-denominated | D | L |
| J172 | Wealth at 200 % zoom | D | S |
| J173 | Portfolio two tabs | D | L |
| J174 | Markets and Portfolio at 390 px | P | S |
| J175 | Wealth's "in perspective" section with one asset only | D, P | L |
| J176 | Portfolio with 300 transactions stays usable | D | L |
| J177 | Staking's watch-only address removed; nothing kept | D, P | L |
| J178 | Wealth's empty Portfolio link leads to creating one | D, P | E |
| J179 | Markets' search with no result says so | D, P | S |
| J180 | Asset names with emoji and 100 characters | all | L |

### Activity, Chess, Music, My links (J181–J200)
| ID | Journey | Views | Data |
|---|---|---|---|
| J181 | Activity's timeline after a few actions; filters | all | L |
| J182 | Activity's empty state | all | E |
| J183 | Activity → an event's link lands on its record | D, P | L |
| J184 | Activity "Actions by ZIGi" with none: honest empty state | D, P | E |
| J185 | Chess hidden until shown; show it in Your pages & buttons | all | E |
| J186 | Chess usernames saved; numbers load one site at a time | D, P | L |
| J187 | Chess with a site answering 429: that site pauses a minute, nothing retried | D | L |
| J188 | Chess puzzles and TV load only on tap; "Play" opens the site | D, P | L |
| J189 | Chess with no username: honest empty state | D, P | E |
| J190 | Music player hidden until shown; show it | all | E |
| J191 | Focus sounds from the player; stop on leave | D, P | L |
| J192 | Spotify not registered: the honest state, no sign-in offered | D, P | E |
| J193 | Apple Music opens its own app (link only) | D, P | E |
| J194 | My links: add three https links with own names and plain icons | all | E |
| J195 | My links: an http or javascript: link is refused | D, P | E |
| J196 | My links: open one: new tab, no referrer | D | L |
| J197 | My links: reorder, edit, delete | D, P | L |
| J198 | My links with long names and emoji | all | L |
| J199 | Chess and Music hidden again: pages still open by link with a note to show them | D, P | L |
| J200 | Activity with the keyboard only | D | L |

### Settings, Help, Install, data (J201–J250)
| ID | Journey | Views | Data |
|---|---|---|---|
| J201 | Settings: the six groups; desktop chips jump; phone list reaches every section | all | E |
| J202 | Your pages & buttons: hide Habits; it leaves the nav; opening it by link shows the note | all | L |
| J203 | Your pages & buttons: the page ZIGoals opens on; "Show everything again" | all | L |
| J204 | Time zone: change it; Today's day follows | D, P | L |
| J205 | Appearance: Motion Off; the preview; reload keeps it | all | E |
| J206 | Wrap-up switch on and off | D, P | L |
| J207 | Habits and Health settings sections | D, P | L |
| J208 | Guide switch | D, P | L |
| J209 | Reminders when closed: unavailable in this build says so, nothing asked | all | E |
| J210 | Market data section: what is fetched, from where | D, P | E |
| J211 | Account & sync on a build without accounts: "not configured on this installation", local records stay | all | E |
| J212 | Showcase: load, look around, reset; personal Local Demo untouched | all | L |
| J213 | Export everything: tick the consent, one ZIP; the file name; nothing written on view | all | L |
| J214 | Export everything in Showcase: the file name says showcase-demo | D, P | S |
| J215 | Switch to ZIGoals: an Apple Health export.zip (fixture) → preview → import → undo | all | E |
| J216 | Switch to ZIGoals: Fitbit/Google Takeout CSV | D, P | E |
| J217 | Switch to ZIGoals: Samsung Health, Oura, Loop Habit Tracker | D, P | E |
| J218 | Switch to ZIGoals: Garmin, Fitbit JSON and Streaks files recognised, not read, with the reason | D, P | E |
| J219 | Switch to ZIGoals: Health's box starts unticked; unticked → no Health records | D, P | E |
| J220 | CSV import of meals with a MyFitnessPal file | D, P | L |
| J221 | Import undo after a change → undo refuses with the reason | D | L |
| J222 | Keep a protected copy (encrypted backup) and restore it on a "new device" (fresh context) | D, P | L |
| J223 | Restore a wrong file → a plain message, nothing changed | D, P | L |
| J224 | Keep my data on this device (persistent storage request) | D, P | E |
| J225 | Diagnostics: connection checks; copy the support preview | D, P | E |
| J226 | Send feedback: without details; with details, edited; nothing sent | all | E |
| J227 | Help: every topic; every question opens and closes; hash links open their answer | all | E |
| J228 | Help → Known limitations' links | all | E |
| J229 | Help → Install on iPhone guide on a phone | P | E |
| J230 | Help with the keyboard only | D | E |
| J231 | Settings with the keyboard only, every group | D | E |
| J232 | Settings at 320 px | P | E |
| J233 | Settings at 200 % zoom | D | E |
| J234 | Settings' ZIGi group: smoke only (X-LOCAL's lane) | D, P | E |
| J235 | The ZIGi launcher and panel: open, close, Escape; nothing sent without a provider (smoke) | D, P | E |
| J236 | Network section: Local Demo and Testnet; the testnet's reviewed version read live | D, P | E |
| J237 | Contract section: "NOT DEPLOYED" | D, P | E |
| J238 | Wallet account: Local Demo identity; Keplr absent says so | D, P | E |
| J239 | Every Settings section's links land on their pages | D | E |
| J240 | Settings two tabs: a preference changed in one shows in the other after reload | D | L |
| J241 | Old backups into this build: Health v1–v3, settings v1–v2, finance v4 restore and read (Part 13 drill reused) | D | E |
| J242 | Export everything's ZIP opens: everything.json and nine CSVs | D | L |
| J243 | Wipe this device's data, then restore the protected copy | D | L |
| J244 | The welcome after a wipe | D, P | E |
| J245 | The installed-app look (display-mode standalone emulated) | P | S |
| J246 | Every page's title names the page (Part 12) | all | S |
| J247 | Every page with reduced motion | P | S |
| J248 | Every page with Motion Off | D | S |
| J249 | Every page offline after a first visit | D, P | S |
| J250 | Every page at 320 px, 360 px and 390 px | P | S |

### Cross-page, navigation and robustness (J251–J260)
| ID | Journey | Views | Data |
|---|---|---|---|
| J251 | The sidebar (desktop) and tab bar + More (phone) reach every page; the current page is marked | all | S |
| J252 | Browser back and forward across five pages; each restores its page and title | all | S |
| J253 | A deep link to every page in a fresh tab | all | E, S |
| J254 | Unknown /app/route → the not-found page with a way back | all | E |
| J255 | A slow network (throttled): loading states say so; nothing claims done early | D, P | S |
| J256 | Storage blocked (private window emulation): the app says what it cannot keep | D | E |
| J257 | A record saved in Brussels, the device moved to Tokyo, then back: nothing duplicated or lost | D | L |
| J258 | Long session: 30 navigations without a reload; memory and responsiveness stay fine | D | S |
| J259 | Window resized from 1440 to 390 and back on each page: no stuck layout | D | S |
| J260 | The skip link on every page | D | S |

## Pass 2 (live Alpha) subset
At least 60 journeys from the list, marked in the results table with "live". Chosen to cover every page once, the
read-only paths first, then device-only writes with fictional data (nothing synced: the public Alpha has no accounts).
Excluded on live: anything that needs a fixture file the live site would treat as personal data beyond the browser, any
loop of market requests, and journeys that move the clock.

## Results
Evidence: local (production build `PUBLIC_ALPHA_UNDEPLOYED`, `next start`, this sandbox's Chromium, two workers; the
final run with CI's fonts) for Pass 1; live (alpha.zigoals.app, deploy #32 = `72ad872`, one worker, a 250 ms pause between steps,
fictional data in the browser only, market requests answered in the browser so none reached the shared CoinGecko key)
for Pass 2. All times UTC, 2026-10-08.

### Time spent
Taken from the commits and the runs' own start and end stamps; Part 14 ran interleaved with Parts 12–13 and Phase 2.

| Step | When | Duration |
|---|---|---|
| Charter written and committed (`9c33a40`) | committed 02:57 | — |
| Journeys written in batches and corrected against the real UI (`8e33b96` … `19481cb`, `d8de111`) | 02:57–11:03 | spread over the morning |
| Pass 1, first run (155 journeys) | about 05:40–06:19 | 39 min; results lost in the restart below |
| Fix loop 1 (`04fadfe`) | committed 06:28 | — |
| Pass 1, second run (201 journeys × D/T/P, 624 cells): 465 passed, 17 failed, 142 not applicable | 08:37–09:19 | 42 min |
| Fix loops 2–4 and the first-week polish (`6abf661`, `cae4f30`, `24a55ff`, `c83f01e`) | committed 07:53–09:45 | — |
| Pass 1, final run (all 261 journeys × D/T/P, 801 cells, the Phase 2 build at `f6f5ba0`): 579 passed, 8 failed, 214 not applicable | 13:36–14:17 | 41 min |
| Fix loop 5 (`81faec1`, `9aa4892`) and every failed cell re-run | 14:17–14:29 | 12 min |
| Screens gallery (`review/session-x-screens`, `991cf24`), while Pass 2 ran | about 14:35–14:45 | about 10 min |
| Pass 2 on the live Alpha (64 journeys, 204 cells): 163 passed, 16 failed, 25 not applicable | 14:30–15:16 | 45 min |
| Classifying the live failures (traces, and a replay on a local build of `72ad872`) | 15:16–15:30 | 14 min |

### What the journeys found, and what happened to it
Fixed in the app, each with a regression test (ADR-016 rows give the cause and the test):
- **Fix loop 1 (X43):** J047 an unknown goal in the Local Demo asked to connect a wallet; J054 two tabs editing one Goal
  wrote a stale name back; J108 offline barcode lookup showed the browser's "Failed to fetch"; J247–J249 Chess in the
  Showcase threw React's hydration error #418.
- **Fix loop 2 (X44):** J154 a Showcase coin it does not hold opened a blank page (now an in-app error page, and the
  coin page draws); J254 an unknown address showed the framework's bare 404 (now an in-app "Page not found"); J187
  Chess's Refresh stayed disabled after a site's pause; J201 a Settings jump landed off target while ZIGi's settings
  loaded above it; J012 Customize Today at tablet widths squeezed a hidden widget's title.
- **First-week polish (X45):** phone Today's folded widget names broke inside words; Activity printed source codes
  ("LOCAL_SIMULATION"); Portfolio's favourites card had no stylesheet (2.3:1 text).
- **Fix loop 3 (X47):** J055 a Goal created offline left the person on the browser's offline page.
- **Fix loop 4 (X48):** J249 offline, a part whose code loads on demand took the whole page down.
- **Fix loop 5 (X60):** Portfolio read "Known value $0.00" with nothing priced (now Unknown); on a slow phone a
  Settings jump still drifted while ZIGi's panels kept loading after two seconds (the hold now lasts until the page
  stops moving, ten seconds at most).

Handed to X-LOCAL (ZIGi's lane, nothing of theirs edited): H6 (ZIGi's settings grow after a jump), H7 (the phone
launcher covers part of a first-screen action on six pages), H9 (lazy parts inside ZIGi; done in their lane).

Owner decision: **J053**, phone goal cards are about 607 px tall, not "at most a third of the screen" as the charter
hoped; meeting it is a redesign of the accepted Goals baseline.

Not a finding: **J026** (the brand film) fails only in this sandbox's Chromium, which cannot play the film; CI's
Chrome plays it, and `tests/logo-quickadd-goals-header.spec.ts` covers the film there.

Everything else that failed on the way was the script, not the app, and was corrected to the real interface without
weakening what it checks: waiting for the new address before reading a page, Today's first-run choice before "For you",
real addresses and exact names, a closed (not deleted) Goal with history, a review day saved before Today opens
(settings v2 writes asynchronously), the en-US clock after P2.5, a title re-read while a view loads.

### The restart incident
Between 06:28 and 07:44 a container restart rolled the working copy back to an earlier snapshot. Pushed commits were safe; the
uncommitted journeys written after the charter and the first run's result files were lost. `8e33b96` restored what
could be recovered exactly and the rest were rewritten; from then on each batch of journeys was committed and pushed
as soon as it ran, and every later run wrote its results outside the checkout.

### Pass 2: the live Alpha
64 journeys marked `@live` (the charter asks for 60), each on the viewports it lists: 204 cells, 163 passed, 16
failed, 25 not applicable, in 45 minutes. The live Alpha is deploy #32 (`72ad872`, `X-ZIGoals-Build` read before the
run), so it runs none of this PR. Every failure was read from its trace, and each is something this PR adds or fixes:
- **J047** (D, T, P): an unknown goal still says "Connect the wallet and network that own this goal" (fixed in fix
  loop 1, X43).
- **J201** (D, T): the Settings jump lands off target while ZIGi's settings load above it (fixed in fix loops 2 and 5,
  X44 and X60). On the phone it waits for the grouped list's "Send feedback" row, which Part 11 added.
- **J226** (D, T, P): Send feedback is not on the live Alpha (Part 11).
- **J228** (D, T, P): Help's "What the Alpha can't do yet" is not on the live Alpha (Part 11).
- **J254** (D, T, P): an unknown address shows the framework's bare 404 (fixed in fix loop 2, X44).
- **J250** (P): React's hydration error #418 on Chess in the Showcase at 320, 360 and 390 px (fixed in fix loop 1,
  X43), and once more at the step from Wealth to Portfolio. Replaying the same sequence on a local build of `72ad872`
  gives #418 on Chess only; on this PR's head, none. The fourth is listed for a live check after the next deploy.

Every other live journey passed on each of its viewports: the pages, navigation, the welcome, Today's empty states,
Goals, Habits, Health, Wealth, Portfolio, Markets, Staking and Ecosystem read paths, Activity, Chess, Music, Settings,
Help, Install, two tabs, deep links, the skip link, keyboard paths and reduced motion. Nothing reached the shared
CoinGecko key: the harness answers market requests in the browser and no live journey asks for market data.

### Screens
Every main page at 1440, 1024 and 390 px, on a new device and in the Showcase (96 full-page captures from the
production build at `9aa4892`): [`review/session-x-screens`](https://github.com/reyals1111-ux/ZIGoals/blob/review/session-x-screens/index.md),
an orphan branch for review only.

### Coverage
Pass 1 per journey and data state (E new device, L seeded Local Demo, S Showcase) on each viewport: **pass**; **fixed**
(failed in the final run, passed after the fix loop's change); **fail**; **n/a** (a viewport the charter does not list
for that journey). The last column is Pass 2 on the live Alpha (empty for journeys not marked `@live`).
Final totals, 801 cells: 579 pass, 5 fixed, 3 fail (J026 ×2 local-only, J053 owner decision), 214 not applicable.
| Journey [data] | D 1440 | T 1024 | P 390 | Live D / T / P |
|---|---|---|---|---|
| J001 [E] a new device opens Today: the welcome explains Local Demo and nothing is saved yet | pass | pass | pass | pass / pass / pass |
| J002 [E] the welcome: Habits and Health chosen, Finish setup, Today shows exactly those areas | pass | pass | pass | pass / pass / pass |
| J003 [E] the welcome left half-way and reloaded: nothing saved, the card still offered | pass | pass | pass |  |
| J004 [E] the welcome run twice adds nothing twice | pass | n/a | pass |  |
| J005 [E] Today with no data: every empty state says what to do next; no zero shown as a fact | pass | pass | pass | pass / pass / pass |
| J006 [E] Showcase loads and resets without touching my own Local Demo records | pass | pass | pass |  |
| J006 [L] Showcase loads and resets without touching my own Local Demo records | pass | pass | pass |  |
| J007 [S] Quick add from Today: the dialog opens, Escape closes it and focus returns | pass | pass | pass | pass / pass / pass |
| J008 [L] Quick add a contribution to a goal from Today; its progress follows on Today and Goals | pass | pass | pass |  |
| J009 [L] the Quick-add line: "drank 2 glasses of water" previewed, saved, shown on Health | pass | pass | pass | pass / pass / pass |
| J010 [L] the Quick-add line misunderstood: a plain message, nothing saved | pass | pass | pass |  |
| J011 [L] the Quick-add line with "yesterday" saves on yesterday in the device's zone | pass | n/a | pass |  |
| J012 [S] Customize Today: hide and show a widget; reload keeps the choice | pass | pass | pass |  |
| J013 [S] Customize Today with the keyboard only: move a widget later, hide it, finish; reload keeps both | pass | n/a | n/a |  |
| J014 [L] a habit reminder shows on Today when its time comes, and stays dismissed for today | pass | pass | pass |  |
| J015 [E] What's new: dismissed once, it never returns on this device | pass | pass | pass |  |
| J015 [S] What's new: dismissed once, it never returns on this device | pass | pass | pass |  |
| J016 [L] the weekly review on its day: steps with my own numbers, an intention, finished | pass | pass | pass |  |
| J017 [L] the weekly review skipped with one tap; Today stays calm | fixed | n/a | pass |  |
| J018 [L] the evening wrap-up: on in Settings, after 18:00 a calm card, a mood saved | pass | pass | pass |  |
| J019 [L] an insight appears only with two weeks of records; dismissed, it stays away for four weeks | pass | n/a | pass |  |
| J020 [L] the Guide: on, one labelled note, "Not today", then off | pass | pass | pass |  |
| J021 [L] Today's sleep card follows a night logged in Sleep | pass | pass | pass |  |
| J022 [L] Today at midnight: the day rolls over without a reload | pass | n/a | pass |  |
| J023 [L] Today's day is the device's day in Kiritimati and in New York | pass | n/a | pass |  |
| J024 [S] Today at 200 % zoom (720 px wide): nothing overlaps, nothing sideways | pass | n/a | n/a |  |
| J025 [S] Today with reduced motion and with Motion Off: nothing moves by itself | pass | n/a | pass |  |
| J026 [S] the brand film opens only on request, plays, closes with Escape and focus returns | fail | n/a | fail |  |
| J027 [S] every Today link lands on its page with the title shown | pass | pass | pass | pass / pass / pass |
| J028 [L] two tabs: a habit checked in one tab shows in the other after it reloads | pass | n/a | n/a |  |
| J029 [S] Today offline: what is on the device still shows; market figures say unavailable, never zero | pass | pass | pass |  |
| J030 [S] Today's goal cards (on-track status and progress ring) agree with the Goals page | pass | n/a | pass |  |
| J031 [E] create a goal with the wizard; it appears in Active | pass | pass | pass | pass / pass / pass |
| J031 [L] create a goal with the wizard; it appears in Active | pass | pass | pass | pass / pass / pass |
| J032 [E] the wizard with mistakes: no name, no target; it says what to fix and saves nothing | pass | pass | pass |  |
| J033 [E] a reload in the middle of the wizard saves nothing half-done | pass | n/a | pass |  |
| J034 [E] browser Back from the wizard's second step asks first; the wizard's own Back keeps what I typed; nothing saved | pass | n/a | pass |  |
| J035 [L] a goal named with emoji and accents stays inside its card everywhere | pass | pass | pass |  |
| J036 [L] a right-to-left goal name shows on the card and the detail | pass | n/a | pass |  |
| J037 [L] huge and tiny targets stay readable | pass | pass | pass |  |
| J038 [L] goals in EUR, USD, JPY (no decimals) and CHF, each shown in its own currency | pass | n/a | pass |  |
| J039 [L] add simulated funds, then see them on the goal | pass | pass | pass |  |
| J040 [L] milestones: one calm note when reached; add one with a value and a date; edit; remove | pass | pass | pass |  |
| J041 [L] "On track?" with zero return: what is left, the pace, the date it points to | pass | pass | pass | pass / pass / pass |
| J042 [L] "What if it grew": my assumption shown, never stored | pass | n/a | pass |  |
| J043 [L] complete a goal: funded to its target it moves to Completed, and that filter shows it | pass | pass | pass |  |
| J044 [L] close a goal (allocations released), then reopen it | pass | n/a | pass |  |
| J045 [S] the filters at 320 px: the chips scroll inside their row, the page does not | n/a | n/a | pass |  |
| J046 [S] the goals collection pages through more than 24 Goals and its count is right | pass | pass | n/a |  |
| J047 [E] a goal that does not exist: a calm message and a way back | pass | pass | pass | fail / fail / fail |
| J048 [S] a tracked Goal's page opens from the collection, and Back returns to it | pass | pass | pass |  |
| J049 [S] /app/goals/positions leads to Staking | pass | n/a | pass | pass / n/a / pass |
| J050 [L] delete a goal after confirming; it leaves Goals and Today | pass | pass | pass |  |
| J051 [L] edit a goal's target and date; Today's numbers follow | pass | n/a | pass |  |
| J052 [E] Goals with the keyboard only: create, open, contribute | pass | n/a | n/a |  |
| J053 [S] Goals on a phone: "+ Create a goal" on the first screen; each card at most a third of the screen | n/a | n/a | fail |  |
| J054 [L] two tabs editing the same goal: each tab's change is kept | pass | n/a | n/a |  |
| J055 [E] Goals offline: a goal created with the wizard is kept on the device | pass | n/a | pass |  |
| J056 [L] Goal art: each preset renders; with reduced motion it stays still | pass | n/a | pass |  |
| J057 [L] Goal progress ring at 0 %, 50 %, 100 % and over 100 % | pass | pass | pass |  |
| J058 [L] a goal with 200 contributions: its timeline pages through them all and stays quick | pass | n/a | n/a |  |
| J059 [L] a goal created in New York keeps the dates I chose once the device is in Tokyo | pass | n/a | n/a |  |
| J060 [E] Goals' empty state on a new device explains the first step | pass | pass | pass | pass / pass / pass |
| J061 [E] create a daily habit, check it in, see it done | pass | pass | pass | pass / pass / pass |
| J062 [L] a weekdays-only habit: the weekend is a rest day and never breaks the streak | pass | pass | pass |  |
| J063 [L] a counter habit: +1 three times reaches its target of 3 | pass | pass | pass |  |
| J064 [L] a minutes habit: reading 20 minutes, reached in two sittings | pass | n/a | pass |  |
| J065 [L] undo a check-in | pass | pass | pass | pass / pass / pass |
| J066 [L] skip a single missed day from History & reflection: the streak holds | pass | pass | pass |  |
| J067 [L] vacation days: mark a week, then remove it | pass | pass | pass |  |
| J068 [L] a 30-day challenge: its end date, then one calm note when it ends (clock moved) | pass | n/a | pass |  |
| J069 [L] a stack of three habits shown together; its chained reminder on Today | pass | pass | pass |  |
| J070 [L] a reminder time added to a habit shows on Today when due, and leaves once the habit is done | pass | n/a | pass |  |
| J071 [L] water ticks a habit off by itself; a tap wins; Undo keeps it off for the day | pass | pass | pass |  |
| J072 [L] steps tick a habit off once the day reaches its target | pass | n/a | pass |  |
| J073 [L] a habit title with emoji and 80 characters stays whole or ellipsed, never overflowing | pass | pass | pass | pass / pass / pass |
| J074 [S] filter habits, then find one by its name | pass | n/a | pass |  |
| J075 [L] a schedule edited mid-streak: past days keep their marks; the change starts tomorrow | pass | n/a | pass |  |
| J076 [L] delete (archive) a habit: it leaves the list and Today | pass | pass | pass |  |
| J077 [L] Habits with the keyboard only: create, check in, filter, undo, open history | pass | n/a | n/a |  |
| J078 [S] Habits at 320 px: every control at least 44 px, nothing sideways | n/a | n/a | pass |  |
| J079 [L] a check-in just before and just after midnight lands on two days | pass | n/a | n/a |  |
| J080 [L] DST: checked in on 25, 26 and 27 October 2026 in Brussels, three separate days | pass | n/a | n/a |  |
| J081 [L] history and reflection: write a note, reload, it is there | pass | pass | pass |  |
| J082 [L] the habit journal setting (its time zone): a wrong name refused, a right one saved and kept | pass | n/a | pass |  |
| J083 [L] Habits offline: a check-in is saved on the device and is still there back online | pass | n/a | pass |  |
| J084 [L] two tabs checking in the same counter habit: both check-ins count | pass | n/a | n/a |  |
| J085 [S] Habits in Showcase writes nothing to my own records | pass | n/a | pass | pass / n/a / pass |
| J086 [L] a habit linked to mindful minutes ticks itself off from a logged session | pass | n/a | pass |  |
| J087 [L] a habit linked to sleep ticks itself off from last night | pass | n/a | pass |  |
| J088 [E] Habits' empty state says what to do first | pass | pass | pass | pass / pass / pass |
| J089 [L] Today's habit progress matches Habits | pass | pass | pass |  |
| J090 [L] Habits with reduced motion: a check-in plays no celebratory motion | pass | n/a | pass |  |
| J091 [E] Health's first visit says what stays on the device | pass | pass | pass | pass / pass / pass |
| J092 [E] the diary: a food, then a meal of 1.5 servings, the calories right | pass | pass | pass | pass / pass / pass |
| J092 [L] the diary: a food, then a meal of 1.5 servings, the calories right | pass | pass | pass | pass / pass / pass |
| J093 [L] a food with no name is refused with a reason; the draft is kept | pass | pass | pass |  |
| J094 [L] Foods & recipes: two foods, a recipe from both, then the recipe logged in the diary | pass | pass | pass |  |
| J095 [L] Meals & planning: tomorrow planned from two saved meals; the grocery list adds them up; a checkoff is kept | pass | n/a | pass |  |
| J096 [L] Copy yesterday's breakfast and lunch, then the next morning "Repeat yesterday" | pass | pass | pass |  |
| J097 [L] one-tap chips: the usual oats at breakfast; a pinned yoghurt on every meal, kept after a reload | pass | n/a | pass |  |
| J098 [L] water: my own glass sizes (a typo refused first), two glasses added, one removed, kept after a reload | pass | pass | pass |  |
| J099 [L] weight: 78.4 kg saved and listed; a second entry the same day | pass | pass | pass | pass / pass / pass |
| J100 [L] measurements: waist and chest saved; the waist corrected, its earlier value kept in its history | pass | n/a | pass |  |
| J101 [L] activity by hand: a walk with steps and minutes, saved and kept after a reload | pass | pass | pass |  |
| J102 [L] targets: set mine, then clear one; ZIGoals suggests none | pass | n/a | pass |  |
| J103 [L] Journal settings: a wrong zone refused; Tokyo, lb, US fl oz and my own water target; the day follows the zone | pass | n/a | pass |  |
| J104 [L] fasting: start 16:8, stop early; only hours and the target are kept | pass | pass | pass |  |
| J105 [L] a fast left running is stopped automatically at 24 hours when the clock moves on | pass | n/a | n/a |  |
| J106 [L] a health goal counts only my own water entries; "No data yet" before | pass | pass | pass |  |
| J107 [L] barcode: the camera is refused, the message is plain; the number typed instead, reviewed, then logged | n/a | n/a | pass |  |
| J108 [L] barcode lookup offline, then with the lookup service down: "unavailable", nothing invented, nothing logged | pass | n/a | pass |  |
| J109 [L] Sleep: "I'm going to bed", then "I woke up"; time asleep marked estimated | pass | pass | pass | pass / pass / pass |
| J110 [L] a night logged by hand with quality and a tag, edited, then deleted | pass | pass | pass |  |
| J111 [L] a night across the Brussels clock change counts nine hours in bed | pass | n/a | pass |  |
| J112 [L] Sleep debt and bedtime consistency, each with the formula it is worked out from | pass | n/a | pass |  |
| J113 [L] a nap is logged as a nap and never counted as a night | pass | n/a | pass |  |
| J114 [L] Sleep at 320 px: the title on the first screen, the form and the night inside the page, 44 px buttons | n/a | n/a | pass |  |
| J115 [L] Meditation: a one-minute session timed to the end | pass | pass | pass | pass / pass / pass |
| J116 [L] the breathing circle moves with motion; with reduced motion or Motion Off it stands still and words and a count guide | pass | n/a | pass |  |
| J117 [L] Meditation's weekly goal: set my own, minutes count toward it, kept after a reload, then removed | pass | n/a | pass |  |
| J118 [L] focus sounds: a 15-minute timer ends the sound on time; "Stop when I leave ZIGoals" stops it when I leave | fixed | n/a | fixed |  |
| J119 [E] Devices: the honest list; without Web Bluetooth it says so | pass | pass | pass | pass / pass / pass |
| J120 [E] Devices: Oura, Withings, Polar and Strava each say "Needs setup by ZIGoals"; nothing connects | pass | n/a | pass |  |
| J121 [L] Health's views in order with the keyboard; Enter and Space open them; focus stays visible | pass | n/a | n/a |  |
| J122 [S] Health in Showcase writes nothing to my records | pass | n/a | pass | pass / n/a / pass |
| J123 [L] a long food name with emoji stays inside its card | pass | pass | pass |  |
| J124 [L] a day with 50 diary entries: every meal lists its own, totals add up, removing and logging still work | pass | n/a | n/a |  |
| J125 [L] Health offline: water, a meal and a weight saved on the device; after reconnecting and a reload all three are there | pass | n/a | pass |  |
| J126 [L] Health's date picker: yesterday, last week by typing the date, then back to today | pass | pass | pass |  |
| J127 [L] the diary at midnight: the page moves to the new day, a half-typed meal is kept and logged on the new day | pass | n/a | n/a |  |
| J128 [L] the Health page's counters: no entry is a dash, not zero; taps add and take away; a counter of my own; kept after a reload | pass | pass | pass |  |
| J129 [L] Health in America/New_York, then Asia/Tokyo: each day's entries stay on the day they were logged | pass | n/a | n/a |  |
| J130 [L] Health consent withdrawn: ZIGi's Health gate closes again; my Health records stay as they were | pass | n/a | pass |  |
| J131 [E] Health's empty state says what to do first | pass | pass | pass |  |
| J132 [L] Health → Sleep → back → Meditation → back: each title shown | pass | n/a | pass |  |
| J133 [L] Health in two tabs: each tab's water and meals show in the other; nothing is lost when both add at once | pass | n/a | n/a |  |
| J134 [L] Health, Sleep and Meditation with reduced motion, then with Motion Off: nothing keeps moving, even after a save | pass | n/a | pass |  |
| J135 [L] Health at 200 % zoom (720 px wide): the title, the date and the meals fit; a meal and water are logged | pass | n/a | n/a |  |
| J136 [E] Wealth's empty state | pass | pass | pass | pass / pass / pass |
| J137 [E] a manual cash asset added in Wealth, labelled as my own value | pass | pass | pass | pass / pass / pass |
| J137 [L] a manual cash asset added in Wealth, labelled as my own value | pass | pass | pass | pass / pass / pass |
| J137b [E] Escape closes "Add to your wealth" and focus returns to its button | pass | n/a | pass | pass / n/a / pass |
| J138 [L] accounts in EUR, JPY and CHF: net worth per currency, never converted | pass | pass | pass | pass / pass / pass |
| J139 [L] an asset whose value is unknown is never counted as zero | pass | pass | pass |  |
| J140 [L] a loan with a rate shows a payoff only from my own numbers | pass | pass | pass |  |
| J141 [L] cash: added, edited, allocated to a goal, and kept out of staking | pass | n/a | pass |  |
| J142 [E] an asset's page by direct address; an unknown asset → a calm "unavailable" and the way back | pass | n/a | pass |  |
| J143 [S] Wealth's asset mix: the ring's words and the legend say the same, adding up to 100 % | pass | n/a | pass |  |
| J144 [L] Wealth with a value of 1e15 and a quantity of 0.00000001: both readable, exact, inside the page | pass | n/a | pass |  |
| J145 [S] Wealth offline: manual values still show; market prices are a price or "Unavailable", never zero | pass | n/a | pass |  |
| J146 [E] Portfolio: create one; without prices, values stay unknown | pass | pass | pass | pass / pass / pass |
| J147 [L] Portfolio: a buy and a sell; the holding, the cost basis and the chart follow | pass | pass | pass |  |
| J148 [L] Portfolio: a gap in prices stays a gap, never guessed (with the market service unavailable the whole range is one) | pass | n/a | pass |  |
| J149 [L] Portfolio CSV import: columns matched, an unknown coin skipped, imported, then undone to the exact bytes | pass | pass | pass |  |
| J150 [L] Portfolio CSV: blank cells stay unknown; an unknown coin is mine to choose | pass | n/a | pass |  |
| J151 [L] Portfolio "Keep a copy": exported, then "Replace portfolios" from the file (cancelled once, then confirmed) | pass | n/a | pass |  |
| J152 [S] Portfolio coin page from a Showcase position; back returns | pass | pass | pass |  |
| J153 [S] Portfolio's value chart with the keyboard: Home, arrows and End move along the line | pass | n/a | n/a |  |
| J154 [S] Portfolio's 1 h and 7 d changes: labelled fixtures in the Showcase, "Not provided" without the market service | pass | n/a | pass |  |
| J155 [L] Portfolio data that cannot be read: a calm message, the bytes kept and carried by Export everything | pass | n/a | n/a |  |
| J156 [S] Markets with the market service unavailable: an honest state, no invented prices | pass | pass | pass | pass / pass / pass |
| J157 [S] Markets: a market's page with its price chart, the chart's source and its time | pass | pass | pass |  |
| J158 [S] Markets offline and with the market service unavailable: prices are known or say so, never zero | pass | n/a | pass |  |
| J159 [S] Markets: a missing price stays "unavailable" on the card and in the table, never zero | pass | n/a | pass |  |
| J160 [S] Markets: cards by default; the table with the keyboard; the choice and an honest "unavailable" without the service | pass | pass | pass |  |
| J161 [E] Staking: a watch-only address that is not one is refused | pass | pass | pass | pass / pass / pass |
| J162 [S] Staking in Showcase: positions and totals; nothing that moves funds | pass | pass | pass | pass / pass / pass |
| J163 [E] Staking: the chain answers nothing → an honest message, nothing saved | pass | n/a | pass |  |
| J164 [S] Staking at 320 px: the title on the first screen, cards inside the page, the wallet reader as a sheet | n/a | n/a | pass |  |
| J165 [S] Ecosystem cards: open in place with Enter and Space; several stay open | pass | pass | pass | pass / pass / pass |
| J166 [S] an Ecosystem #project link opens its card and brings it into view | pass | n/a | pass | pass / n/a / pass |
| J167 [S] Ecosystem links open safely: new tab, no referrer | pass | n/a | pass | pass / n/a / pass |
| J168 [S] Ecosystem: network tools and integration readiness, every link safe | pass | n/a | pass |  |
| J169 [S] Wealth → asset → back → Portfolio → coin → back: focus lands on each page | pass | n/a | pass |  |
| J170 [S] Wealth and Portfolio in Showcase, even an edit, write nothing to my own records | pass | n/a | pass |  |
| J171 [L] many currencies on one screen: EUR, USD, GBP, JPY, CHF and BTC, each its own net worth | pass | n/a | n/a |  |
| J172 [S] Wealth at 200 % zoom (720 px wide): the total and the assets fit, nothing sideways | pass | n/a | n/a |  |
| J173 [L] Portfolio in two tabs: a portfolio made in one shows in the other; both tabs' trades are kept | pass | n/a | n/a |  |
| J174 [S] Markets and Portfolio at 390 px: the essentials stay, nothing sideways, 44 px targets | n/a | n/a | pass |  |
| J175 [L] Wealth's "in perspective" with one asset: that class counted, every other class empty, never zero | pass | n/a | pass |  |
| J176 [L] a portfolio with 300 transactions opens and records the next one quickly, figures exact | pass | n/a | n/a |  |
| J177 [L] Staking: a watch-only address lives only in its snapshot; nothing remembers it as a setting | pass | n/a | pass |  |
| J178 [E] from an empty Wealth to a first portfolio | pass | n/a | pass |  |
| J179 [S] Markets: a search with no result says so and offers the full catalog | pass | n/a | pass |  |
| J180 [L] an asset name with emoji and 100 characters stays inside the page | pass | pass | pass |  |
| J181 [L] Activity lists what I just did | pass | pass | pass | pass / pass / pass |
| J182 [E] Activity's empty state | pass | pass | pass | pass / pass / pass |
| J183 [L] Activity: each event's link lands on its own record (a Goal, an asset, a habit) | pass | n/a | pass |  |
| J184 [E] Activity with no ZIGi actions: no "Actions by ZIGi" filter is offered and nothing claims ZIGi did anything | pass | n/a | pass |  |
| J185 [E] Chess is hidden until shown; showing it adds it to the navigation | pass | pass | pass | pass / pass / pass |
| J186 [L] Chess: usernames saved; the ratings load one request at a time, with only the username and no cookie or referrer | pass | n/a | pass |  |
| J187 [L] Chess with a site answering 429: that site pauses a minute, nothing retried; the other still shows | pass | n/a | n/a |  |
| J188 [L] Chess puzzles and TV load only on a tap; "Play" opens the site in a window of its own | pass | n/a | pass |  |
| J189 [E] Chess with no username: an honest empty state, no request to either site | pass | n/a | pass | pass / n/a / pass |
| J190 [E] the music player is hidden until shown; Settings → Music shows it | pass | pass | pass | pass / pass / pass |
| J191 [L] focus sounds play and stop; nothing is downloaded | pass | n/a | pass |  |
| J192 [E] Spotify not registered here: it says so and offers no sign-in | pass | n/a | pass | pass / n/a / pass |
| J193 [E] Apple Music is a link to its own app, safely | pass | n/a | pass | pass / n/a / pass |
| J194 [E] My links: three https links with my own names | pass | pass | pass | pass / pass / pass |
| J195 [E] My links refuses http:// and javascript: addresses | pass | n/a | pass | pass / n/a / pass |
| J196 [L] My links: one opens in a new tab with no opener and no referrer, exactly as typed | pass | n/a | n/a |  |
| J197 [L] My links: reorder, edit, delete (after a "Keep it"), kept after a reload | pass | n/a | pass |  |
| J198 [L] My links with a long name and an emoji: whole or ellipsed, inside Settings and Today | pass | pass | pass |  |
| J199 [L] a hidden page still opens from a link, with a note to show it again | pass | n/a | pass |  |
| J200 [L] Activity with the keyboard only: a filter chosen with Enter, an event opened with Enter | pass | n/a | n/a |  |
| J201 [E] Settings: six groups; computers jump by chips, phones by the grouped list | pass | pass | fixed | fail / fail / fail |
| J202 [L] hide Habits: it leaves the navigation; by link it opens with a note to show it again | pass | pass | pass |  |
| J203 [L] "Show everything again" brings every page back | pass | pass | pass |  |
| J204 [L] Your time zone: a wrong name refused; saved, and Today and Habits follow it | pass | n/a | pass |  |
| J205 [E] Motion Off from Settings; the choice survives a reload | pass | pass | pass | pass / pass / pass |
| J206 [L] the evening wrap-up switch: on, the card shows after its time; off, it is gone | pass | n/a | pass |  |
| J207 [L] the Habits and Health sections: the weekly review day kept, each link lands on its page | pass | n/a | pass |  |
| J208 [L] the Guide switch: on and off, each said plainly and kept after a reload | pass | n/a | pass |  |
| J209 [E] reminders while ZIGoals is closed: unavailable in this build says so; nothing is asked | pass | pass | pass | pass / pass / pass |
| J210 [E] the market data section says what is fetched and from where; its link opens Markets | pass | n/a | pass | pass / n/a / pass |
| J211 [E] Account & sync without accounts on this build: it says so; local records stay | pass | pass | pass | pass / pass / pass |
| J212 [L] Showcase: load, look around, reset; my own records untouched | pass | pass | pass |  |
| J213 [L] Export everything: the consent first, then one ZIP with a dated name; nothing written on view | pass | pass | pass |  |
| J214 [S] Export everything in Showcase: the file name says showcase-demo; one ZIP with everything | pass | n/a | pass |  |
| J215 [E] Apple Health export.zip: the preview, Health's box ticked, imported, then undone | pass | pass | pass |  |
| J216 [E] Fitbit / Google Takeout CSVs: recognised and previewed, nothing written before confirming; imported, then undone | pass | n/a | pass |  |
| J217 [E] Samsung Health, Oura and Loop Habit Tracker: each recognised and previewed, nothing written before confirming; imported; Loop undone | pass | n/a | pass |  |
| J218 [E] a Garmin export is recognised, not read, and says why | pass | n/a | pass |  |
| J219 [E] Switch to ZIGoals: Health's box starts unticked; unticked, nothing reaches Health | pass | n/a | pass |  |
| J220 [L] meals from a MyFitnessPal file: recognised, matched, previewed, imported to their own day; percentages left out | pass | n/a | pass |  |
| J221 [L] an import changed afterwards: Undo refuses and says why; nothing is removed | pass | n/a | n/a |  |
| J222 [L] a protected copy (encrypted backup) restored on a new device | pass | n/a | pass |  |
| J223 [L] restoring with a wrong secret or the wrong file: a plain message, nothing changed | pass | n/a | pass |  |
| J224 [E] "Keep my data on this device" asks the browser and says what it answered | pass | n/a | pass | pass / n/a / pass |
| J225 [E] diagnostics: the connection check reads only, and the support preview copies nothing until asked | pass | n/a | pass | pass / n/a / pass |
| J226 [E] Send feedback: without details, then with my edited details; nothing sent or stored | pass | pass | pass | fail / fail / fail |
| J227 [E] Help: every question opens and closes; a hash link opens its answer | pass | pass | pass | pass / pass / pass |
| J228 [E] Help → Known limitations: its links work | pass | pass | pass | fail / fail / fail |
| J229 [E] Help → Install on iPhone on a phone: the steps for this browser | n/a | n/a | pass | n/a / n/a / pass |
| J230 [E] Help with the keyboard only: topics, then a question opened and closed with Enter | pass | n/a | n/a | pass / n/a / n/a |
| J231 [E] Settings with the keyboard only: every group reached from its chip; a control in each works | pass | n/a | n/a |  |
| J232 [E] Settings at 320 px: every row reachable, nothing sideways, rows at least 44 px | n/a | n/a | pass | n/a / n/a / pass |
| J233 [E] Settings at 200 % zoom (640 px wide): nothing lost or sideways | pass | n/a | n/a |  |
| J234 [E] Settings' ZIGi group: there, reachable, asking nothing of any other site (smoke only, X-LOCAL's lane) | pass | n/a | pass |  |
| J235 [E] ZIGi launcher and panel: open, close with Escape; nothing sent without a provider (smoke) | pass | n/a | pass | pass / n/a / pass |
| J236 [E] the network section: Local Demo and the Testnet; the testnet's version read live, read-only | pass | n/a | pass |  |
| J237 [E] the contract section says NOT DEPLOYED and financial execution is off | pass | n/a | pass | pass / n/a / pass |
| J238 [E] the wallet account: Local Demo identity; Keplr absent says so and Local demo stays | pass | n/a | pass |  |
| J239 [E] every link in Settings lands on its page | pass | n/a | n/a |  |
| J240 [L] Settings in two tabs: a preference changed in one shows in the other after a reload | pass | n/a | n/a |  |
| J241 [E] older backups (Health v1–v3, settings v1–v2, finance v4) restore into this build and read (Part 13 drill) | pass | n/a | n/a |  |
| J242 [L] Export everything's ZIP opens: everything.json and nine CSVs, with my own records | pass | n/a | n/a |  |
| J243 [L] wipe this device's data, then restore the protected copy | pass | n/a | n/a |  |
| J244 [E] after a wipe the welcome is offered again, and nothing personal is left | pass | n/a | pass |  |
| J245 [S] the installed-app look (display-mode standalone): recognised as installed, the phone chrome intact | n/a | n/a | pass |  |
| J246 [S] every page names itself in the browser tab | pass | pass | pass |  |
| J247 [S] every page with reduced motion: nothing keeps moving | n/a | n/a | pass |  |
| J248 [S] every page with Motion Off: nothing keeps moving | pass | n/a | n/a |  |
| J249 [S] every page, once visited, keeps working offline and says so; nothing turns into zero | pass | n/a | pass |  |
| J250 [S] every page at 320, 360 and 390 px: no sideways scroll, the title on the first screen | n/a | n/a | fixed | n/a / n/a / fail |
| J251 [S] the navigation reaches every page and marks the current one | pass | pass | pass | pass / pass / pass |
| J252 [S] back and forward across five pages restore each page | pass | pass | pass | pass / pass / pass |
| J253 [E] a deep link to every page in a fresh tab | pass | pass | pass | pass / pass / pass |
| J253 [S] a deep link to every page in a fresh tab | pass | pass | pass | pass / pass / pass |
| J254 [E] an unknown /app route shows a calm not-found with a way back | pass | pass | pass | fail / fail / fail |
| J255 [S] a slow network: pages say they are loading and never claim done early | pass | n/a | pass |  |
| J256 [E] storage blocked: the app says what it cannot keep, and nothing breaks | pass | n/a | n/a |  |
| J257 [L] records saved in Brussels, the device moved to Tokyo, then back: nothing duplicated or lost | pass | n/a | n/a |  |
| J258 [S] a long session: 30 navigations without a reload stay responsive | pass | n/a | n/a |  |
| J259 [S] resized from 1440 to 390 and back on each page: no stuck layout | pass | n/a | n/a |  |
| J260 [S] the skip link on every page moves focus to the content | pass | n/a | n/a | pass / n/a / n/a |
