# Session AL demo tour (about 15 minutes)

A spoken walk-through of what Session AL changed, in the order that shows it best. Most of AL is fixes: the Grok #53 bots'
findings, made right the way a person meets them. So the tour shows the new things first and then a few "this used to be
wrong" moments. Each step says where to click, what you should see, and what is honestly not live yet.

## Before you start (not counted in the 15 minutes)
- **Where:** the local preview at http://127.0.0.1:3100/app (`NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`), or the
  Alpha once Alpha #54 is deployed from `main` after this PR is merged. Until then the Alpha runs #53, which has none of this.
- **Browser:** Chrome or Edge. Steps 1–3 at a computer width (1440 px); steps 4–5 at a phone width (DevTools, 390 × 844).
- **Example data:** Settings → "Load Showcase Demo". Every Showcase screen says "Showcase · fictional example data". Step 10
  starts from an empty device instead (a private window).
- **Motion:** Settings → Appearance → Motion "Full" for step 1; step 1 also shows Calm and Off.
- **Nothing needs a ZIGoals server.** No model is needed either: ZIGi and NOVA answer from the device's own records.

## Time budget
| # | Part | Minutes |
|---|---|---|
| 1 | NOVA's holographic HUD | 2 |
| 2 | Tasks at Todoist level | 2 |
| 3 | The Checklist: "Tasks due today" | 1 |
| 4 | Phone: "Apps & extras" and the sidebar's Apps group | 1.5 |
| 5 | One Undo, one way to show an error | 1 |
| 6 | Habits: a checklist inside a habit, time in hours and minutes, a why | 1.5 |
| 7 | Health: the meal follows the clock; start your fast after a meal | 1 |
| 8 | Goals and Wealth: one pace date, accounts, the week's change | 1.5 |
| 9 | ZIGi: safety first, and the same facts as the pages | 1.5 |
| 10 | A fresh start: the welcome makes what it promises | 1 |
| 11 | Plans, Help's release history, and what is not live | 1 |
| | **Total** | **15** |

---

## 1. NOVA's holographic HUD (2 min)
**Where:** "NOVA" (star) in the sidebar, or `/app/nova`.
- **See:** the Holo look: instruments drawn in light (rings, meters, a slow shimmer) over your real numbers — every figure
  is the one its page shows. Click a widget: it opens its page with a short morph.
- **Do:** "Customize the view" (Make it yours) → "Widget look" → Classic, then Holo again (kept on this device). Log a glass of water from the
  Health widget's quick action: the Health page's water total moves, and Undo puts it back.
- **Say:** Motion "Calm" or "Off" (or the system's Reduce motion) makes the HUD fully still. In Light theme the HUD stays a
  dark island on purpose.

## 2. Tasks at Todoist level (2 min)
**Where:** `/app/tasks`.
- **Do:** type `Call the dentist every first Monday 10:30 #Home p1` in the quick line and press "Add task": a
  repeating task in the Home project, priority 1, due 10:30 (the line shows what it read before you add it). Open it: "only this time / all future" when you change a repeat.
- **Do:** ⌘+K (Ctrl+K) for the command menu; `?` for the shortcuts. Once there are tasks, "Select" (or `x`) turns on
  selection: pick several, then Done or Move in the bar.
- **Say:** one checkbox per row marks it done; overdue means the day and, today, the time in your zone — the same count on
  Tasks, Today and NOVA. Tasks and the Checklist are in the encrypted backup, the export and the restore.

## 3. The Checklist: "Tasks due today" (1 min)
**Where:** the Checklist (its launcher, or `/app/checklist`) → List view.
- **See:** "Tasks due today" under your items (owner decision O6). Close it with X or Escape: you are back where you were.

## 4. Phone: "Apps & extras" and the sidebar's Apps group (1.5 min)
**Where:** a 390 px window.
- **See:** no floating buttons over the page. The header's "Apps & extras" opens one sheet with ZIGi, Music, Earn, the
  Checklist and the rest (owner decision O3). At a computer width they keep their places, and the sidebar has an "Apps"
  group (O4).
- **Do:** open Journey at 390 px: it fits the phone (it used to be 628 px wide).

## 5. One Undo, one way to show an error (1 min)
- **Do:** remove a habit, a task or a food: one Undo toast, the same everywhere, and Undo really puts the record back. On a
  phone the toast keeps clear of the box you are typing in and of the next thing you tap.
- **Do:** in Quick add or a Health form, type `abc` as an amount or `72,5` as a weight: the reason shows under the field,
  the focus goes there, and `72,5` is read as 72.5.

## 6. Habits: a checklist inside a habit, time in hours and minutes, a why (1.5 min)
**Where:** Habits → a habit → Details.
- **Do:** "Add a checklist" (one step per line). The steps show on the card; the last tick checks the habit in.
- **Do:** a time habit takes `1:30`, `1 h 30 min` or `45 min`. "Why it matters to you" shows on the card as "Why: …".

## 7. Health: the meal follows the clock; start your fast after a meal (1 min)
**Where:** Health → Diary.
- **See:** "Log food" at 6 pm offers Dinner (not Breakfast); "Log water" and "Log food" move the focus to their form.
- **Do:** on the fasting card, "Ask on Today to start a fast after I log [meal]". Log that meal: Today asks "Start your
  fast?" with your own last target.

## 8. Goals and Wealth: one pace date, accounts, the week's change (1.5 min)
- **Goals:** open the Emergency fund: "At this pace" and "With your plan" are two named dates, the same on the page, on
  NOVA and in ZIGi's answer. Milestones reorder with the ⋮⋮ handle (or Alt+↑/↓).
- **Wealth:** "Count money I already have" in the goal wizard names your accounts and offers "Record <account> as cash"
  through a pre-filled form you check and save. With prices offline the week's change is "not known", never a fall made of
  missing prices; "Market prices as of" is only said for market prices.
- **New:** "Look up an address" on Wealth (any public address on the chains ZIGoals reads; nothing signs or moves).
  It shows only once a chain is chosen in Settings and never in the Showcase: crypto stays out of sight until chosen.

## 9. ZIGi: safety first, and the same facts as the pages (1.5 min)
**Where:** ZIGi (its launcher, or "Apps & extras" on a phone).
- **Do:** ask "Am I on track for my emergency fund?", "What is due today?" (each task once), "Which habits did I miss
  yesterday?". Answers come from the same records the pages read; nothing is sent anywhere without a model.
- **Do:** type "remember my password is hunter2": ZIGi refuses, and the message is not kept in the chat or the history.
- **Say:** a guard on the device runs before any model: secrets, emergencies and distress (English and Dutch). ZIGi and
  NOVA only pre-fill; you confirm every change, and nothing signs or moves funds.

## 10. A fresh start: the welcome makes what it promises (1 min)
**Where:** a private window → `/app`.
- **Do:** pick Read and Meditate in the welcome: the habits it makes are 20 minutes and 10 minutes, as its cards said.
  Drink water and Walk count what you log in Health from the first day.

## 11. Plans, Help's release history, and what is not live (1 min)
- **Plans:** the badge in Settings links to `/app/plans`: what each plan would include, and "Premium · free during the
  Alpha". There is no buy button and no payment code (owner decision O2).
- **Help:** the release history, newest first, each with "Read more".
- **Not live / not in AL:** push notifications stay off until the owner turns them on; no real model runs in tests; the
  owner decisions waiting (Wealth's length at 1440, the goal's name shown four times on Today, and the rest in
  docs/STATUS.md) and the ranked next-session list (docs/review/session-al/NEXT_SESSION_BACKLOG.md).
