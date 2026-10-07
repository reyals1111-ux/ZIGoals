# Session W: "Your whole life, one app" — owner guide and test checklist

What this release adds, what is on by default, what waits for you, and how to check it on a Mac and an iPhone. Decisions
are in [ADR-015](../architecture/ADR-015-session-w.md); the final evidence is in [STATUS.md](../STATUS.md). Screens of
the new views at 1440, 1024 and 390 px are on the review branch `review/session-w-screens`
([index.md](https://github.com/reyals1111-ux/ZIGoals/blob/review/session-w-screens/index.md); never merged).

## What is new, by area

| Area | What | Where |
|---|---|---|
| Your app | Hide any page or button except Settings and Help; choose the page ZIGoals opens on | Settings → Your app → Your pages & buttons |
| First run | A new welcome: pick what you want to improve, starter habits and goals, an optional tour; nothing saved before "Finish setup" | `/app/welcome` |
| Sleep | Nights and naps, "I'm going to bed" / "I woke up", sleep debt and bedtime consistency with their formulas, a wind-down reminder | Health → Sleep |
| Meditation | A timer or breathing guide (moves only while visible and motion is allowed), moods, mindful minutes, a weekly goal | Health → Meditation |
| Focus sounds | White, pink, brown, rain-like, ocean-like noise and a soft drone, made in the browser | Meditation, the music player |
| Switch to ZIGoals | Apple Health, Fitbit/Google Takeout, Samsung Health, Oura, Loop Habit Tracker, read on the device, with Undo | Settings → Data & privacy |
| Devices | A Bluetooth heart-rate monitor or scale (Chrome/Edge); Oura, Withings, Polar, Strava built and off | Health → Devices |
| Quick logging | Copy yesterday's meal, repeat yesterday, pinned items, your own water sizes | Health's diary |
| Habits | Habit ideas, challenges (7–365 days), stacks, patterns | Habits |
| Goals | Milestones with a value and a date, "On track?" | Goals |
| Wealth | Accounts and debts, net worth per currency, payoff from your own rate | Wealth → Accounts, debts & net worth |
| Today | An evening wrap-up (off until turned on), Sleep, Meditation, Chess, Links and Music widgets | Today, Settings → Your app |
| Chess | Ratings, games, puzzles and TV from chess.com and Lichess (usernames only) | `/app/chess` (hidden until shown) |
| Portfolio and Markets | Portfolio as a full view (value over time, allocation, holdings table, coin pages); Markets' table view | Portfolio, Markets |
| Account | "Sign out all other devices" | Settings → Account & devices → Devices and sessions (signed in) |
| My links | Your socials, apps and sites as buttons on Today | Settings → Your app → My links |
| Music | The music player: focus sounds, Spotify (once registered), Apple Music link | The round button opposite ZIGi (hidden until shown) |
| ZIGi | Thirteen new read-only tools, five new card kinds (an account's balance is only pre-filled), on-device answers for the new areas | ZIGi |
| Help and Settings | Help → "New: your whole life"; What's new for this release; Settings in six labelled groups | Help, Settings |

## Defaults

- Existing people: Chess and the music player are hidden until shown under Your pages & buttons (or picked in the
  welcome); My links' Today card appears once a link exists; the evening wrap-up is off.
- The Showcase shows everything, with fictional records only, and contacts no third party.
- Sync writes are on (W1); Health's new groups sync only with Health's own consent. Accounts and debts stay on the device
  in this release.

## What waits for you (owner actions)

1. **Acceptance redeploy** of the app from `main` after the merge, through the Manual Alpha workflow
   ([MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md)). The rows to check are in
   [FINAL_ACCTEST_REDEPLOY.md](../run11/FINAL_ACCTEST_REDEPLOY.md) ("Session W changes").
2. **Market coordinator redeploy, before the app** (Part 15): until then the 1h/7d changes and market figures say "Not
   provided"; everything else works.
3. **Spotify (optional):** register a Spotify app, add the redirect addresses and the official logo file, set
   `SPOTIFY_CLIENT_ID` ([MUSIC_ACTIVATION.md](MUSIC_ACTIVATION.md)). Development mode allows five listed users.
4. **Health links (optional):** register ZIGoals with Oura, Withings, Polar and Strava and deploy the health-link Worker
   ([HEALTH_LINK_ACTIVATION.md](../run11/HEALTH_LINK_ACTIVATION.md)).
5. **Apple Music (optional):** an Apple Developer membership and a MusicKit token; until then it is a link.
6. **The finance homes switch PR, later:** at least seven days after the W deploy, with the rollback target at or after
   W, a one-line switch moves accounts, debts and milestone dates into finance v5 ([SYNC_HOMES.md](SYNC_HOMES.md)).
7. **Your decisions on the performance options** in [SESSION_W_PERFORMANCE.md](../performance/SESSION_W_PERFORMANCE.md)
   (a static manifest, the logo route's own headers, fewer prefetches, wallet and sync code on use).

## Owner test checklist

Preview locally first (the PR's report has the commands), then repeat the starred rows on the Alpha after the acceptance
redeploy. "Showcase" means Settings → Your app → Load Showcase Demo; "Local Demo" means your own (empty or seeded) data.

**Mac (Chrome, then Safari), 1440 px and a narrow window:**
1. Settings: the six groups in order (Data & privacy first); each chip jumps to its group. ★
2. Your pages & buttons: hide Habits, check the sidebar and a deep link to `/app/habits` ("This page is hidden — show it
   again"); choose Health as the start page, open `/app`; "Show everything again".
3. Showcase → Today: For you, the Sleep, Meditation, Chess and Music widgets in the widget library; My links card. ★
4. Health → Sleep: log a night, "I'm going to bed" then "I woke up"; sleep debt and consistency show their formulas.
5. Health → Meditation: a 1-minute timer; the breathing guide moves, and stops moving with Settings → Your app →
   Motion: Off.
6. Settings → Switch to ZIGoals: a small Apple Health export.zip or a Loop CSV, the preview, Import, then Undo.
7. Health → Devices (Chrome): pair a heart-rate monitor if you have one; Oura/Withings/Polar/Strava say "Needs setup by
   ZIGoals".
8. Habits: start a 30-day challenge from Habit ideas; Goals: add a milestone with a date; Wealth: add an account and a
   debt, check net worth per currency.
9. Chess (show it first): add a public username; ratings and games load; "Play" opens the site.
10. Music: show the player; play a focus sound; Spotify says "not set up" until you register it. ★
11. ZIGi (with your own AI or none): "How did I sleep last night?", "What do I owe?", "What are my chess ratings?" answer
    on the device; with Health not shared, the sleep question is refused.
12. Help → "New: your whole life": each answer opens from What's new on Today. ★

**iPhone (Safari, then the installed app), 390 px:**
13. Settings: the grouped list (25 rows), Backups & restore on the first screen. ★
14. The tab bar follows Your pages & buttons (first four visible pages, then More).
15. The music player sits opposite ZIGi and never covers Quick add; the More sheet's "Your soundtrack" row opens it.
16. Health → Devices says Bluetooth is not available on iPhone; imports work from the Files app.

**Two devices, after the acceptance redeploy (both signed in, sync on):** ★
17. Hide a page on device A; device B follows after sync.
18. Add a link on A; B's Today shows it.
19. Log a night on A (with Health sync consent on both); B shows it. With Health's sync consent off on B, B does not.
20. Sign out all other devices on A; B stops syncing and is signed out; A stays signed in.
