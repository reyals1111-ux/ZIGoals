
## M1–M3 status (Session AK, lane WC)

Owner follow-up 2, M1–M3, closing the WIRING_AUDIT_2 rows M1, M2 and M3 ("Partly working").

### M1 — shared-element transition: built (one morph)
- **What:** on `/app/goals`, a private goal's full card title (`.unified-goal-card h2`) morphs into the goal page's heading
  (`/app/goals/tracked/[id]`, `.goal-detail-heading h1`): React `<ViewTransition name="zg-goal-<id>" share="zg-morph"
  default="none">` on both ends (`components/motion/goal-title-morph.tsx`), 280 ms on `--zg-spring`
  (`components/motion/motion-2026.css`). Both headings are fit-content boxes, so the words scale, not empty space.
- **Levels:** Full only. Calm gives the pair the class `none` (React then names nothing, so no morph; CSS also holds it
  still if one ever starts); Motion Off and the device's reduced motion start no view transition at all (the existing
  gate, `lib/motion/view-transition-gate.ts`). Compact cards (Today) and chain goals carry no name.
- **Why a hand-off was needed (the framework fact):** React pairs a shared element only when both ends are in the
  navigation's own commit; the new state is captured before passive effects run (react-dom `startViewTransition`:
  mutation and layout callbacks, then `ready`, then spawned work and passive effects). The goal page reads its records in
  an effect (`usePrivateStore`), so its first commit was only "Loading Goal…" and no pair could form. The card now notes
  the tapped goal and the name it showed (`lib/motion/goal-morph.ts`, module memory, 5 s, never stored); the goal page's
  first frame draws that heading in the very tree slot the loaded page uses (root › section › heading › h1), so React keeps
  the same element and the morph continues on the live page while the records arrive. Opened by address (no tap), the page
  renders exactly as before. If a later edit moves those slots, the morph is merely cut short; the spec checks the slot.
- **PROTECTED:** untouched (no chrome, Today hero, Checklist or sidebar change). Weights: two small modules on `/app/goals`,
  `/app` (goal-card.tsx is shared with Today's compact cards) and the goal page; nothing on `/app/checklist`.
- **Tests:** `lib/motion/goal-morph.test.ts`; browser `tests/goal-morph-ak.spec.ts` (Full: the
  `::view-transition-group(zg-goal-…)` animates and the first-frame heading is the kept element; Calm: no goal pair;
  Motion Off and reduced motion: no view transition at all).
- **Not built:** NOVA widget → page morphs (lane WA owns NOVA's widgets; every pillar page also loads its records after
  mounting, so each would need the same first-frame hand-off).

### M2 — `.zg-glass`, `.zg-aurora`, `.zg-nebula-border`: applied or removed (no dead CSS)
- `.zg-glass` is now the control layer's edge, grain and sheen only (it sets no colour, so every surface keeps its own
  tint and contrast in Nebula, Light and Dark, and the generated theme sheets map nothing for it): applied to NOVA's dock
  (`.nova-left`) and command bar (`.nova-command`); the search palette and Quick add keep it by name. Under reduced
  transparency, more contrast and forced colours the edge and grain are not drawn; the sheen turn is Full only.
- `.zg-aurora` is on NOVA's sky (`.nova-sky`, behind the stars): a still gradient everywhere, the 90 s drift only where
  `html[data-zg-ambient=drift]` (Full, not low-end, not a low battery, tab visible). Its default `position: relative` now
  has no weight (`:where`), so an already positioned container keeps its own.
- `.zg-nebula-border` (and its `--zg-angle` property and keyframes) is removed: no surface used it.
- The theme sheets (`apps/web/public/themes/*.css`, `lib/ui-prefs/theme-sheets.ts`) need `node scripts/themes/build-themes.mjs`
  after this change (they were already stale from other lanes' CSS when checked).

### M3 — live activity chips and optimistic UI: recorded, nothing new built
What exists (checked in code, 1 Nov 2026):
- **Live activity chips:** a running habit timer's chip on Today's widget (`components/habits/habit-timer.tsx` `TimerChip`:
  running time, Pause/Resume, Finish, kept across pages and reloads); the Checklist's corner timers
  (`components/checklist/corner-timers.tsx`, `data-running`); NOVA's focus widget running state (`components/nova/widgets/focus.tsx`,
  lane WA); while ZIGi or NOVA answers, the live "looked at …" lookups and NOVA's Duo steps (handed → reading → answering →
  reported). NOVA's status chips (`components/nova/status-chips.tsx`) are state chips (brain, privacy mode, memory,
  pillars, offline), not activities.
- **Optimistic UI with calm confirmation:** every write is a local, synchronous write (`usePrivateStore`, device records)
  that the screen shows at once; sync is a background outbox, so there is no server round trip to be optimistic about.
  The calm confirmation is the one Undo toast (`components/ui/undo-toast.tsx`: one at a time, polite, 8 s, never takes
  the focus; used from 44 components, 18 call sites with an inline Undo) and the confirm cards' 10 s Undo.
Not built, and why: an app-wide "what is running now" chip (one place for a running fast, focus and habit timers) would
live in the shell — the desktop sidebar, tablet rail and phone bars are PROTECTED, and the shell's script is on every route,
including `/app/checklist` with about 0.1 kB of headroom. It needs an owner decision on where it sits.
