# Session X Part 14: the human-style test (charter first)

**Status:** charter written 2026-10-08, before any journey was driven. Results, the coverage table, time spent and every
finding are added below as the passes run. Labels: local (production build, `next start`, this sandbox's Chromium with
the Inter font installed), live (alpha.zigoals.app, deploy #32, fictional data in the browser only), CI.

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
To be filled in as the passes run: the coverage table (journey × viewport × data state → pass / fail / fixed), the time
spent, every finding with its fix commit or reason, and the screenshots' location (`review/session-x-screens`).
