import {readdirSync} from 'node:fs';

/**
 * Session AU ([TIER 3] (CI), ADR-044 D-CI): the main browser suite's fourteen Chromium shards, as explicit file lists
 * balanced by measured duration, the way playwright.webkit.shards.ts does it for the WebKit job.
 *
 * Playwright's own `--shard` cuts by test count in file order, and test times vary a lot by file (nova-stage-am2's
 * desktop group alone is 28 minutes, theme-parity-af's two groups 32), so on main 836534c3 (run 1895) the fourteen
 * count-cut shards took 17.7 to 50.3 minutes and on run 1893 shard 4 took 55 of its 60. These lists were packed from
 * per-file durations: every test result of a spec file (retries included, they cost wall time) summed per project from
 * the JSON reports of runs 1895 and 1893, the larger of the two runs per file and project, about 883 worker-minutes in
 * all. Longest file first, each went to the list where the job's two workers finish soonest: the larger of the job's
 * own order (desktop groups, then mobile, each in Playwright's file order) and the bound that holds in any order,
 * (W - g) / 2 + g with W the list's worker-minutes and g its longest group; then single moves and swaps out of the
 * slowest list while they lowered it.
 *
 * `partitionProblems` checks that every spec the main suite selects (every spec under tests/ except the accessibility
 * sweep, which CI runs as its own suite) is in exactly one list; the config throws on any problem when `MAIN_SHARD` is
 * set, and `scripts/ci/main-shards.test.ts` runs the same check in `pnpm test`. A new spec therefore fails loudly until
 * it is added here, and the message names the list to add it to: the one with the fewest measured minutes, counting
 * each new spec as one worker-minute so that several new specs spread over several lists. Re-measure and repack when a
 * list's measured minutes drift far from the others.
 *
 * Session AV lane 2 ([TIER 3] (CI), owner follow-up 7, ADR-045 D-CI-SHARDS20): twenty lists, repacked from runs 2013,
 * 2014 and 2016 (the comment on MAIN_SHARDS says how), each at most 70 worker-min: about 35 min of tests on the slowest
 * measured runner, plus about 5 min of setup, so at most 40 of the job's 60.
 */

/** The accessibility sweep, CI's own "a11y" suite (`A11Y_SWEEP` in playwright.config.ts, as since Session AK). */
export const A11Y_SWEEP = /p6-(axe-all|axe-surfaces|keyboard)\.spec\.ts$/;
/** Playwright's default testMatch (`**\/*.@(spec|test).?(c|m)[jt]s?(x)`), which the main config uses. */
export const MAIN_TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/;

export const SHARDS_FILE = 'apps/web/playwright.main.shards.ts';

/** Paths relative to apps/web/tests/, with forward slashes, in Playwright's file order. */
export const MAIN_SHARDS: readonly (readonly string[])[] = [
  // Session AW (TIER 3 CI, Part 2; ADR-046 D-CI-SHARDS-AW): twenty lists repacked from the JSON reports' measured durations
  // (every test result of a file, retries included, summed over both projects; the larger of the runs read), longest
  // file first, each to the list with the fewest minutes so far. AV's lists were packed from log gaps and measured 45-85
  // worker-min in run 2031; a spec file not yet measured counts one minute.
  // Shard 1, 62.0 worker-min.
  [
    'ap/day-goal.spec.ts', 'ap/send-feedback-details.spec.ts', 'ar-tick-at-once.spec.ts', 'av-money-search.spec.ts',
    'av-vs-last.spec.ts', 'av-yesterday.spec.ts', 'av2-board-imports.spec.ts', 'av2-curve-reminders.spec.ts',
    'av2-cycle-on-plan.spec.ts', 'av2-journal-ebook.spec.ts', 'av2-meal-mic.spec.ts', 'av2-notes-cards.spec.ts',
    'av2-reading-font.spec.ts', 'av2-revb2a-showcase-docs.spec.ts', 'av2-todays-practice.spec.ts',
    'av2-week-day.spec.ts', 'checklist-view-writes-nothing-af.spec.ts', 'earn-path.spec.ts', 'for-you.spec.ts',
    'g1b-amount-calculator.spec.ts', 'governance.spec.ts', 'grok53/chain/bn-100-121-183-chess.spec.ts',
    'grok53/chain/c-bn-14-15-16-ecosystem-gaps.spec.ts', 'grok53/checklist/al-fifth-checklist.spec.ts',
    'grok53/data/sweep2-recovery-copies.spec.ts', 'grok53/first-run/al-third-first-run.spec.ts',
    'grok53/habits/al-third-habits.spec.ts', 'grok53/health/dv-059-health-goal-target.spec.ts',
    'grok53/hud/bn044-memory-chip.spec.ts', 'grok53/p15/p15a-chain.spec.ts', 'grok53/shell/sweep2-shell.spec.ts',
    'landing-v5-layout.spec.ts', 'motion-arrival.spec.ts', 'nova-stage-am2.spec.ts', 'owner-polish.spec.ts',
    'path-engine.spec.ts', 'phone-folds.spec.ts', 'run11-food-unknown.spec.ts', 'today-v2.spec.ts',
    'trader-tools-aj.spec.ts', 'universe-guided-aj.spec.ts', 'zigi-question-context.spec.ts',
    'aw-x4-strides.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 2, 62.0 worker-min.
  [
    'ao/today-tab-stops.spec.ts', 'ap/ap-priority-matrix.spec.ts', 'av-journal-day.spec.ts', 'av-report-more.spec.ts',
    'av2-food-marks.spec.ts', 'av2-habit-options.spec.ts', 'av2-journal-books.spec.ts', 'av2-money-alerts.spec.ts',
    'av2-money-beside-habits.spec.ts', 'av2-money-year-budgets.spec.ts', 'av2-notes-repeating.spec.ts',
    'av2-notes-ticks.spec.ts', 'av2-r5-everyday.spec.ts', 'av2-r5-keep-weights.spec.ts', 'av2-revb3c-grid.spec.ts',
    'av2-routine-share.spec.ts', 'brand-nav-polish.spec.ts', 'checklist-phone-ag-polish-2.spec.ts', 'devices.spec.ts',
    'earn-guide-mode.spec.ts', 'exchanges-ai.spec.ts', 'g1b-money-photos.spec.ts',
    'grok53/goals/goal-amount-cap.spec.ts', 'grok53/goals/second-pass.spec.ts',
    'grok53/habits/al-second-habits.spec.ts', 'grok53/health/mo-149-coach-readings.spec.ts',
    'grok53/release/aq-milestone-tick.spec.ts', 'grok53/tasks/ls-037-import-export.spec.ts',
    'grok53/wealth/sweep4-purpose-percent.spec.ts', 'hosted-alpha-goal-stage.spec.ts', 'journeys/j08-zigi.spec.ts',
    'journeys/j12-nova.spec.ts', 'landing-v5-equation.spec.ts', 'pillar-phone-length.spec.ts', 'rail-lane-af.spec.ts',
    'safe-screenshot.spec.ts', 'spending-ai.spec.ts', 'theme-parity-af.spec.ts', 'today-earn-card-af.spec.ts',
    'unkept-chat-ak.spec.ts', 'zigi-mini-window.spec.ts', 'zigi-safety.spec.ts',
    'webkit-aw-flows.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 3, 62.0 worker-min.
  [
    'a11y-wcag-x.spec.ts', 'ap/ap-health-orbits.spec.ts', 'ap/first-five.spec.ts', 'at/trust-round-trip.spec.ts',
    'av-budget-targets.spec.ts', 'av-high-in.spec.ts', 'av-keep-data.spec.ts', 'av-offline-later-parts.spec.ts',
    'av2-coach-checkin.spec.ts', 'av2-compare-late-meal.spec.ts', 'av2-copy-clear-day.spec.ts',
    'av2-notes-canvas.spec.ts', 'av2-notes-look.spec.ts', 'av2-notes-trash.spec.ts', 'av2-r6-bring-up.spec.ts',
    'av2-r6-gym.spec.ts', 'av2-recipe-book.spec.ts', 'av2-runna-r4.spec.ts', 'calculator-aa.spec.ts',
    'checklist-timers.spec.ts', 'data-safety-x.spec.ts', 'g1b-recent-categories.spec.ts',
    'goal-choice-controls.spec.ts', 'grok53/ai/al-third-pass.spec.ts', 'grok53/data/nb-002-top-level-welcome.spec.ts',
    'grok53/markets/sweep3-watchlist-more.spec.ts', 'grok53/p14a/af15-p3-academy-bubble.spec.ts',
    'grok53/shell/l10a-second-pass.spec.ts', 'habits-routines-block.spec.ts', 'layout-fixes-ae.spec.ts',
    'meal-estimate-ai.spec.ts', 'my-links.spec.ts', 'p4-first-run.spec.ts', 'platform.spec.ts',
    'price-alerts-aj.spec.ts', 'remember-device.spec.ts', 'run10-goal-creator.spec.ts', 'run10-habit-actions.spec.ts',
    'run10-widget-overview.spec.ts', 'run11-route-mobile-acceptance.spec.ts', 'timeline-everyday-aj.spec.ts',
    'wealth.spec.ts', 'webkit-add-money.spec.ts', 'zigi-chat-backdrop.spec.ts', 'zigi-earn-coach-af.spec.ts',
    'zigi-real-model.spec.ts', 'zigi-send-focus.spec.ts',
    'aw-simplicity-c.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 4, 61.9 worker-min.
  [
    'ah-data-safety.spec.ts', 'au/lina.spec.ts', 'au/tom.spec.ts', 'au/webkit-au-lina.spec.ts',
    'av-hide-figures.spec.ts', 'av-task-minutes.spec.ts', 'av-words-match.spec.ts',
    'av2-journal-prompt-answers.spec.ts', 'av2-money-budgets-plan.spec.ts', 'av2-money-networth-movers.spec.ts',
    'av2-money-people.spec.ts', 'av2-money-space.spec.ts', 'av2-timeline-moods.spec.ts',
    'av2-year-pixels-words.spec.ts', 'fasting.spec.ts', 'fr-data-restore.spec.ts', 'goal-source-allocation.spec.ts',
    'grok53/chain/bn-093-governance-loads.spec.ts', 'grok53/checklist/l5-fourth-pass.spec.ts',
    'grok53/goals/ls-064-quantity-unit.spec.ts', 'grok53/habits/al-third-helper-contrast.spec.ts',
    'grok53/habits/nb-076-frequency.spec.ts', 'grok53/habits/pr-044-skip-undo.spec.ts',
    'grok53/health/mo-104-blank-names.spec.ts', 'grok53/health/nb-139-sleep-default-before-7.spec.ts',
    'grok53/health/nb-254-coach-weight-link.spec.ts', 'grok53/tasks/ls-068-reminders.spec.ts',
    'grok53/today/al-third-today.spec.ts', 'health-today-journal-day.spec.ts', 'journeys/j01-fresh-start.spec.ts',
    'landing-v5-perf.spec.ts', 'life-review-aa.spec.ts', 'money-launcher-lane-af.spec.ts', 'owner-preview.spec.ts',
    'positions-layout.spec.ts', 'product-visual.spec.ts', 'pwa-ak.spec.ts', 'quick-log-ai.spec.ts',
    'run10-ecosystem.spec.ts', 'send-feedback.spec.ts', 'staking-sign.spec.ts', 'storage-errors.spec.ts',
    'wiring-goals.spec.ts', 'zigi-accept-correct.spec.ts', 'zigi-hosted.spec.ts', 'zigi-simulated-day.spec.ts',
    'zigi-voice-dictation.spec.ts',
    'aw-kcal.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
    'aw-fr-money.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 5, 62.0 worker-min.
  [
    'a11y-consent-labels.spec.ts', 'at/tasks-when-counts.spec.ts', 'at/weight-csv-fields.spec.ts',
    'av-nutrient-range.spec.ts', 'av-sleep-long.spec.ts', 'av2-custom-fields.spec.ts',
    'av2-experiment-outcomes.spec.ts', 'av2-habit-words-trend.spec.ts', 'av2-journal-format.spec.ts',
    'av2-journal-media.spec.ts', 'av2-journal-reminder.spec.ts', 'av2-money-own-budgets.spec.ts',
    'av2-notes-archive.spec.ts', 'av2-notes-event.spec.ts', 'av2-notes-lock.spec.ts', 'av2-polish4-targets.spec.ts',
    'av2-task-planning.spec.ts', 'coherence.spec.ts', 'display-locale.spec.ts', 'flow-aa.spec.ts',
    'g1b-review-cards.spec.ts', 'g1b-spending-map.spec.ts', 'goal-morph-ak.spec.ts',
    'grok53/ai/l7-fifth-safety.spec.ts', 'grok53/goals/finished-closed.spec.ts',
    'grok53/goals/sweep4-chess-goals.spec.ts', 'grok53/habits/nb-199-water-link.spec.ts',
    'grok53/health/pr-018-timer-minimums.spec.ts', 'grok53/hud/hud-two-way.spec.ts',
    'grok53/markets/tk-markets.spec.ts', 'grok53/p15/p15a-money.spec.ts',
    'grok53/settings/bn-022-105-erase-fresh.spec.ts', 'grok53/settings/bn-029-102-time-zone.spec.ts',
    'grok53/settings/bn-113-screen-lock.spec.ts', 'grok53/tasks/ls-006-043-zigi-on-tasks.spec.ts',
    'grok53/today/sweep2-water-words.spec.ts', 'grok53/wealth/tk-portfolio-oversell.spec.ts', 'holdings-import.spec.ts',
    'journeys/j11-keyboard-names.spec.ts', 'nova-answers-as.spec.ts', 'revb1-table-targets.spec.ts',
    'run10-motion.spec.ts', 'run11-goal-draft.spec.ts', 'slogan-gap-af.spec.ts', 'stories-af.spec.ts',
    'unified-goals.spec.ts', 'wealth-v2.spec.ts', 'zigi-history-undo.spec.ts', 'zigi-local-answers.spec.ts',
    'zigi-proactive.spec.ts',
    'aw-x5-paprika.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 6, 62.0 worker-min.
  [
    'ah-numbers.spec.ts', 'ap/ap-health-splits.spec.ts', 'attestation.spec.ts', 'auto-checkins.spec.ts',
    'av-money-attention.spec.ts', 'av2-checkin.spec.ts', 'av2-exercise-library.spec.ts', 'av2-food-minors.spec.ts',
    'av2-habit-identity.spec.ts', 'av2-journal-grid.spec.ts', 'av2-money-categories.spec.ts', 'av2-notes-tidy.spec.ts',
    'av2-notes-writing.spec.ts', 'av2-planned-day.spec.ts', 'av2-polish-tasks.spec.ts', 'av2-repeat-projects.spec.ts',
    'av2-revb2a-space-rename.spec.ts', 'av2-routine-card.spec.ts', 'av2-task-versions.spec.ts',
    'av2-timer-presets.spec.ts', 'av2-weigh-in.spec.ts', 'earn-dock.spec.ts', 'earn-validators.spec.ts',
    'g1a-scales.spec.ts', 'grok53/ai/al-zigi-idle.spec.ts', 'grok53/ai/l7-fourth-safety.spec.ts',
    'grok53/chain/bn-018-023-staking-labels.spec.ts', 'grok53/health/fifth-pass-checklist.spec.ts',
    'grok53/health/mo-153-meal-menu-name.spec.ts', 'grok53/shell/o4-sidebar-apps.spec.ts',
    'grok53/tasks/ls-004-global-quick-add.spec.ts', 'grok53/tasks/ls-007-014-keyboard-undo-bulk.spec.ts',
    'invite-only.spec.ts', 'journeys/j05-notifications.spec.ts', 'local-simulation-backup.spec.ts', 'logo-fold.spec.ts',
    'motion-m.spec.ts', 'nutrition-import.spec.ts', 'phone-touch-targets.spec.ts', 'product-shell.spec.ts',
    'reminders.spec.ts', 'revb1-task-timer.spec.ts', 'rewards-sweep.spec.ts', 'run10-barcode.spec.ts', 'run9.spec.ts',
    'sign-out-others.spec.ts', 'today-phone-folds.spec.ts', 'wealth-chips-af.spec.ts', 'zigi-part-boundary.spec.ts',
    'zigi-photo.spec.ts', 'zigi-states.spec.ts',
    'aw-x6-body-sleep.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 7, 62.0 worker-min.
  [
    'ah-habits.spec.ts', 'ah-today.spec.ts', 'ap/ap-money-ready-to-assign.spec.ts', 'au/max.spec.ts',
    'av-repeat-plan.spec.ts', 'av2-goal-creator.spec.ts', 'av2-journal-affirmation.spec.ts',
    'av2-journal-packs.spec.ts', 'av2-journal-report.spec.ts', 'av2-journal-throwback.spec.ts',
    'av2-money-groups.spec.ts', 'av2-money-places.spec.ts', 'av2-money-records-check.spec.ts',
    'av2-money-refund.spec.ts', 'av2-money-saved-searches.spec.ts', 'av2-project-rules.spec.ts',
    'av2-r6-portions.spec.ts', 'av2-task-print.spec.ts', 'barcode-param-ak.spec.ts', 'checklist-ag-polish-2.spec.ts',
    'checklist-ag-polish.spec.ts', 'checklist-celebration-video.spec.ts', 'cross-insights-ai.spec.ts',
    'ecosystem.spec.ts', 'grok53/ai/sweep3-greeting.spec.ts', 'grok53/goals/dv-204-header-actions.spec.ts',
    'grok53/health/gap-071-072-sleep-csv.spec.ts', 'grok53/hud/hud-look.spec.ts', 'grok53/hud/hud-motion.spec.ts',
    'grok53/journey/al-second-journey.spec.ts', 'grok53/release/final-life-tasks.spec.ts',
    'grok53/settings/bn-019-no-503-on-settings.spec.ts', 'grok53/settings/sweep2-showcase.spec.ts',
    'grok53/today/al-fourth-today.spec.ts', 'honesty-banners.spec.ts', 'hosted-verifier-order.spec.ts',
    'journeys/j04-offline.spec.ts', 'nova-chat.spec.ts', 'nova-stage-am.spec.ts', 'p1-nova-make.spec.ts',
    'persona-z.spec.ts', 'phone-form-sheets.spec.ts', 'private-read-delay.spec.ts', 'revb1-delete-versions.spec.ts',
    'revb1-note-reminders.spec.ts', 'run11-goal-history.spec.ts', 'run11-large-goal-collection.spec.ts',
    'run9-1.spec.ts', 'wiring-habits.spec.ts', 'zigi-checklist-af.spec.ts', 'zigi-day-in-the-life.spec.ts',
    'aw-x7-money.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 8, 61.9 worker-min.
  [
    'add-money.spec.ts', 'ah-local-today.spec.ts', 'ah-undo-removals.spec.ts', 'ap/ap-health-trends.spec.ts',
    'av-bills-month.spec.ts', 'av-deadlines.spec.ts', 'av-prompt-day.spec.ts', 'av-rows.spec.ts', 'av-two-day.spec.ts',
    'av2-calm-sound.spec.ts', 'av2-fit-plan.spec.ts', 'av2-money-debts.spec.ts', 'av2-money-reimport.spec.ts',
    'av2-note-reminders-tasks.spec.ts', 'av2-notes-callouts.spec.ts', 'av2-notes-select.spec.ts',
    'av2-notes-table-edit.spec.ts', 'av2-projects-r6.spec.ts', 'av2-recipe-import-library.spec.ts',
    'av2-revb2b-load-break.spec.ts', 'checklist-launcher.spec.ts', 'checklist-phone-ag-polish.spec.ts',
    'focus-return.spec.ts', 'fr17-habit-more-options.spec.ts', 'grok53/first-run/al-fifth-first-run.spec.ts',
    'grok53/health/mo-010-future-diary-dates.spec.ts', 'grok53/hud/hud-review2.spec.ts',
    'grok53/journey/nb-049-false-goal-celebration.spec.ts', 'grok53/markets/l1-pass4-markets.spec.ts',
    'grok53/release/final-goals-wealth.spec.ts', 'grok53/settings/help-al-006-la-31.spec.ts',
    'grok53/settings/l6-fifth-pass.spec.ts', 'grok53/settings/l6-fourth-settings.spec.ts',
    'grok53/shell/layout-every-width.spec.ts', 'grok53/tasks/ls-001-003-line-and-repeats.spec.ts',
    'grok53/wealth/l1-pass4-wealth.spec.ts', 'help-settings-link.spec.ts', 'hosted-earn-stage.spec.ts',
    'landing.spec.ts', 'nova-setup.spec.ts', 'persona-x.spec.ts', 'run10-plan-revisions.spec.ts',
    'run10-shared-visuals.spec.ts', 'run11-food-volume.spec.ts', 'transactions.spec.ts', 'universe-af.spec.ts',
    'webkit-theme-parity.spec.ts', 'zigi-brief-af.spec.ts', 'zigi-emotions.spec.ts', 'zigi-help-settings.spec.ts',
    'zigi-pages-conversations.spec.ts',
    'aw-habits-tj7.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 9, 62.0 worker-min.
  [
    'ah-health-day.spec.ts', 'ah-wealth.spec.ts', 'aj-owner-decisions.spec.ts', 'ao/header-consistency.spec.ts',
    'ap/ap-money-cash-flow.spec.ts', 'at/ap-minors.spec.ts', 'av-bill-calendar.spec.ts', 'av-debt-plan.spec.ts',
    'av-journal-tags.spec.ts', 'av2-journal-diarium.spec.ts', 'av2-journal-letter.spec.ts',
    'av2-journal-versions.spec.ts', 'av2-library-filters.spec.ts', 'av2-lock-away.spec.ts', 'av2-money-crypto.spec.ts',
    'av2-r6-meditation.spec.ts', 'av2-revb3c-sealed.spec.ts', 'av2-scale-stats.spec.ts', 'av2-task-reminders.spec.ts',
    'av2-template-gallery.spec.ts', 'chess-play-ak.spec.ts', 'copy-polish.spec.ts', 'customize-aj.spec.ts',
    'ecosystem-cards.spec.ts', 'fr-answers-yesterday.spec.ts', 'grok53/first-run/nb-011-wizard-draft.spec.ts',
    'grok53/habits/nb-058-weekdays.spec.ts', 'grok53/health/fifth-pass.spec.ts',
    'grok53/health/mo-029-weight-csv.spec.ts', 'grok53/journey/al-fourth-journey.spec.ts',
    'grok53/settings/bn-020-021-104-106-backups.spec.ts', 'grok53/settings/sweep3-settings-help.spec.ts',
    'grok53/tasks/al-second-pass.spec.ts', 'grok53/wealth/p14d-wealth-375.spec.ts', 'habits.spec.ts',
    'health-aa.spec.ts', 'health.spec.ts', 'life-review-values-ai.spec.ts', 'nova-dashboard.spec.ts',
    'nova-families-as.spec.ts', 'push-reminders.spec.ts', 'run10-dashboard-placement.spec.ts',
    'run11-goal-options-pointer.spec.ts', 'settings-groups.spec.ts', 'small-features-y.spec.ts',
    'today-empty-copy.spec.ts', 'ui-evidence.spec.ts', 'wiring-2-r2.spec.ts', 'workouts-import-aj.spec.ts',
    'zigi-face-z.spec.ts', 'zigi-page-awareness-af.spec.ts',
    'aw-simplicity-a.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 10, 62.0 worker-min.
  [
    'ah-goals.spec.ts', 'ah-settings.spec.ts', 'ah-workouts.spec.ts', 'ap/ap-health-mood-tags.spec.ts',
    'ap/ap-hour-grid.spec.ts', 'at/zignaly-dates.spec.ts', 'av-companion-guarded.spec.ts', 'av-nl-tasks.spec.ts',
    'av-star-permissions.spec.ts', 'av-tasks-done.spec.ts', 'av-workout-weeks.spec.ts', 'av2-appearance.spec.ts',
    'av2-focus-notes.spec.ts', 'av2-money-paid-early.spec.ts', 'av2-money-spreadsheet.spec.ts',
    'av2-money-yesterday.spec.ts', 'av2-plan-week.spec.ts', 'av2-polish4-health.spec.ts', 'av2-r5-one-side.spec.ts',
    'av2-revb2a-balance-lines.spec.ts', 'av2-sleep-usual.spec.ts', 'av2-zigi-hello.spec.ts', 'b3-ai-small.spec.ts',
    'finished-feel-aa.spec.ts', 'grok53/ai/al-second-pass.spec.ts', 'grok53/ai/l7-fourth-answers.spec.ts',
    'grok53/chain/bn-097-ecosystem-today-toggle.spec.ts', 'grok53/checklist/ls-checklist-rows.spec.ts',
    'grok53/health/p-mo-34-light-contrast.spec.ts', 'grok53/hud/sweep4-morph.spec.ts',
    'grok53/p14/part14-earlier.spec.ts', 'grok53/p14a/se2-one-review-day.spec.ts', 'grok53/release/a10-life.spec.ts',
    'habit-paint-first.spec.ts', 'hydration-zone.spec.ts', 'landing-v5-captures.spec.ts', 'landing-v5-fold.spec.ts',
    'light-redo-af.spec.ts', 'meditation.spec.ts', 'mobile-safari-fit.spec.ts', 'notes-ask.spec.ts',
    'restore-backup.spec.ts', 'run10-widgets-status.spec.ts', 'run11-nutrients.spec.ts', 'staking-errors.spec.ts',
    'staking-tabs.spec.ts', 'switch-import.spec.ts', 'switch-more-ak.spec.ts', 'touch-targets.spec.ts',
    'wiring-2-nova-cards.spec.ts', 'wiring-2-photo-send.spec.ts',
    'aw-simplicity-b.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 11, 62.0 worker-min.
  [
    'a11y-field-errors.spec.ts', 'ah-competitors.spec.ts', 'ah-multitab.spec.ts', 'ambient.spec.ts',
    'ao/owner-calls.spec.ts', 'ap/ap-journal-numbers.spec.ts', 'au/webkit-au-jules.spec.ts', 'av-income-flow.spec.ts',
    'av-own-templates.spec.ts', 'av-run-bests.spec.ts', 'av-sleep-score.spec.ts', 'av-workout-calendar.spec.ts',
    'av2-challenge-write-out.spec.ts', 'av2-logging-challenge.spec.ts', 'av2-money-notices.spec.ts',
    'av2-money-r6-budgets.spec.ts', 'av2-notes-imports.spec.ts', 'av2-notes-tags.spec.ts', 'av2-oracle.spec.ts',
    'chess.spec.ts', 'exploratory-exf.spec.ts', 'g1a-journal-prompts.spec.ts', 'g1b-selection-total.spec.ts',
    'grok53/ai/al-nova-connection.spec.ts', 'grok53/ai/al-nova-workflow-undo.spec.ts', 'grok53/ai/al-stability.spec.ts',
    'grok53/chain/l6-fourth-chain.spec.ts', 'grok53/goals/goal-delete-close.spec.ts',
    'grok53/goals/goal-notes-and-average.spec.ts', 'grok53/goals/third-pass.spec.ts',
    'grok53/habits/al-fourth-habits.spec.ts', 'grok53/health/mo-043-soft-checks.spec.ts', 'habits-aa.spec.ts',
    'header-art-ae.spec.ts', 'journeys/j09-lichess.spec.ts', 'landing-v5-a11y.spec.ts', 'motion-polish.spec.ts',
    'p1-nova-live.spec.ts', 'qa-decisions.spec.ts', 'run10-private-vault.spec.ts', 'run11-migration-recovery.spec.ts',
    'sidebar-sky-af.spec.ts', 'storage-health-wording.spec.ts', 'validator-health.spec.ts', 'wallet-menu.spec.ts',
    'whats-new.spec.ts', 'xpub-watch-aj.spec.ts', 'zigi-aa.spec.ts', 'zigi-auto-accept.spec.ts',
    'zigi-composer-switch.spec.ts', 'zigi-knock.spec.ts',
    'aw-p5-fixes.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 12, 62.0 worker-min.
  [
    'ah-part18.spec.ts', 'amount-input.spec.ts', 'ao/page-lengths.spec.ts', 'ap/ap-health-copy-meal.spec.ts',
    'ap/ap-money-bill-price.spec.ts', 'ap/launcher-tuck.spec.ts', 'au/webkit-au-sanne.spec.ts', 'av-factors.spec.ts',
    'av-move-alert.spec.ts', 'av-paste-list.spec.ts', 'av-watch.spec.ts', 'av2-circuits.spec.ts',
    'av2-compare-sleep.spec.ts', 'av2-habit-parts.spec.ts', 'av2-journal-quote.spec.ts', 'av2-money-log-tools.spec.ts',
    'av2-money-needs-waterfall.spec.ts', 'av2-money-store-cards.spec.ts', 'av2-polish-folds.spec.ts',
    'av2-polish-habits.spec.ts', 'av2-progression.spec.ts', 'av2-r5-feel.spec.ts', 'av2-water-day.spec.ts',
    'av2-weekday-targets.spec.ts', 'av2-workout-progress.spec.ts', 'checklist-overlay-af.spec.ts',
    'checklist-planet-halo.spec.ts', 'footer-links-moved.spec.ts', 'grok53/chain/c-bn-22-puzzle-log.spec.ts',
    'grok53/health/mo-025-past-fast.spec.ts', 'grok53/health/nb-081-water-undo.spec.ts',
    'grok53/hud/hud-shortcuts.spec.ts', 'grok53/journey/nb-185-xp-farm.spec.ts', 'grok53/shell/o3-apps-extras.spec.ts',
    'grok53/tasks/ls-011-065-live-days.spec.ts', 'grok53/tasks/ls-022-039-unreadable.spec.ts',
    'habits-decimal-comma.spec.ts', 'invisible-names.spec.ts', 'music.spec.ts', 'phone-pages.spec.ts',
    'quick-logging.spec.ts', 'revb1-plan-views-edit.spec.ts', 'run11-layout-stability.spec.ts',
    'run11-recovery-failures.spec.ts', 'showcase-export-guard.spec.ts', 'staking-page.spec.ts',
    'today-folds-memory.spec.ts', 'today-roles-af.spec.ts', 'wiring-health.spec.ts', 'wiring-review.spec.ts',
    'zigi-alive.spec.ts',
    'aw-offline.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 13, 62.0 worker-min.
  [
    'au/sanne.spec.ts', 'av-countdown-yearly.spec.ts', 'av-habit-look.spec.ts', 'av-month-recap.spec.ts',
    'av-update-takeover.spec.ts', 'av2-distance-goals.spec.ts', 'av2-erase-areas.spec.ts', 'av2-extra-meals.spec.ts',
    'av2-meal-readings.spec.ts', 'av2-money-merge-accounts.spec.ts', 'av2-more-health-goals.spec.ts',
    'av2-pk10-chain-help.spec.ts', 'av2-places-suggest-replace.spec.ts', 'av2-task-energy.spec.ts',
    'av2-workout-year.spec.ts', 'checklist-quick-add.spec.ts', 'checklist.spec.ts', 'earn-options.spec.ts',
    'goals-v2.spec.ts', 'governance-vote.spec.ts', 'grok53/chain/bn-048-earn-one-strip.spec.ts',
    'grok53/checklist/al-second-pass.spec.ts', 'grok53/habits/sweep3-habits.spec.ts',
    'grok53/health/mo-110-journal-1900.spec.ts', 'grok53/health/mo-140-waist-one-unit.spec.ts',
    'grok53/journey/al-fifth-journey.spec.ts', 'grok53/release/a10-money-ai.spec.ts',
    'grok53/release/final-shell.spec.ts', 'grok53/wealth/tk-currency-import.spec.ts', 'health-midnight.spec.ts',
    'multitab.spec.ts', 'page-marks.spec.ts', 'page-order-aa.spec.ts', 'phone-shell.spec.ts', 'platform-habits.spec.ts',
    'platform-visual.spec.ts', 'portfolio-v2.spec.ts', 'public-alpha.spec.ts', 'run10-health-only-journey.spec.ts',
    'run11-financial-previews.spec.ts', 'run11-wealth-changes.spec.ts', 'run9-2-visual.spec.ts',
    'settings-render-all-ak.spec.ts', 'sidebar-note-af.spec.ts', 'tasks-time.spec.ts', 'themes.spec.ts',
    'timezone-phase4.spec.ts', 'ui-design-pass.spec.ts', 'webkit-smoke.spec.ts', 'webkit-timeline.spec.ts',
    'zigi-memory.spec.ts', 'zigi-settings-reserve.spec.ts',
    'aw-content.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 14, 61.9 worker-min.
  [
    'av-bills-year.spec.ts', 'av-plan-day.spec.ts', 'av-review-tasks.spec.ts', 'av-task-notify.spec.ts',
    'av-update.spec.ts', 'av2-bodyweight-units.spec.ts', 'av2-evening-plan.spec.ts', 'av2-feelings-strength.spec.ts',
    'av2-journal-favourites.spec.ts', 'av2-money-average-crossover.spec.ts', 'av2-money-import-tags.spec.ts',
    'av2-money-quick-log.spec.ts', 'av2-mood-words-journal.spec.ts', 'av2-my-day.spec.ts', 'av2-notes-fold.spec.ts',
    'av2-notes-mentions.spec.ts', 'av2-notes-photos.spec.ts', 'av2-notes-versions.spec.ts',
    'av2-revb2a-formatters.spec.ts', 'brand-assets.spec.ts', 'checklist-celebration-ag-polish.spec.ts',
    'checklist-themes.spec.ts', 'earn-calculator-link.spec.ts', 'footer-arc-af.spec.ts',
    'fr-layout-first-screen.spec.ts', 'goal-vaults.spec.ts', 'grok53/ai/al-safety-guard.spec.ts',
    'grok53/chain/c-bn-17-18-ecosystem-status-sort.spec.ts', 'grok53/goals/activity-goal-rows.spec.ts',
    'grok53/goals/wizard-first-input.spec.ts', 'grok53/health/mo-018-view-links.spec.ts',
    'grok53/settings/d-088-settings-fold.spec.ts', 'grok53/settings/sweep4-settings.spec.ts',
    'grok53/settings/tk-184-sticky-index-768.spec.ts', 'grok53/shell/p14d-earlier-scope.spec.ts',
    'grok53/tasks/ls-002-045-projects-views.spec.ts', 'help-page.spec.ts', 'insights.spec.ts',
    'logo-quickadd-goals-header.spec.ts', 'polish2-af.spec.ts', 'product-data.spec.ts', 'revb1-erase-stores.spec.ts',
    'revb1-zigi-notes.spec.ts', 'run10-restored-today.spec.ts', 'run11-habit-integration.spec.ts',
    'run11-observation-import.spec.ts', 'trusted-types-trial.spec.ts', 'visual-v21.spec.ts', 'wallet-reload.spec.ts',
    'webkit-celebration.spec.ts', 'webkit-phone.spec.ts', 'weekly-review.spec.ts', 'zigi-context-pack.spec.ts',
    'zigi-memory-af.spec.ts',
    'aw-x3-notes-journal.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 15, 61.9 worker-min.
  [
    'aa-a11y.spec.ts', 'ah-health.spec.ts', 'amounts-ab.spec.ts', 'ap/ap-money-tags.spec.ts', 'ap/service-rows.spec.ts',
    'au/webkit-au-max.spec.ts', 'av-journal-today.spec.ts', 'av-matrix-pause.spec.ts', 'av2-calm-move.spec.ts',
    'av2-csv-reimport.spec.ts', 'av2-cycle-r5.spec.ts', 'av2-minors-tasks.spec.ts', 'av2-money-credit-card.spec.ts',
    'av2-notes-props.spec.ts', 'av2-polish-health.spec.ts', 'av2-r5-photos.spec.ts', 'av2-r6-lifts.spec.ts',
    'av2-report-symptoms.spec.ts', 'av2-revb2b-net-carbs.spec.ts', 'av2-rolling-habit.spec.ts',
    'checklist-phone-ag-polish-3.spec.ts', 'consumer-first-x1.spec.ts', 'fr-data-checklist.spec.ts',
    'g1a-cycle.spec.ts', 'g1a-focus-rounds.spec.ts', 'g1b-networth-share.spec.ts', 'grok53/ai/l7-fifth-answers.spec.ts',
    'grok53/chain/n-bn-016-address-messages.spec.ts', 'grok53/chain/sweep4-chain.spec.ts',
    'grok53/data/int3-backup-records-erase-range.spec.ts', 'grok53/habits/al-fifth-habits.spec.ts',
    'grok53/habits/nb-077-draft.spec.ts', 'grok53/health/fourth-pass-weight-and-copy.spec.ts',
    'grok53/hud/hud-perf.spec.ts', 'grok53/settings/help-bn-024-025-109.spec.ts',
    'grok53/shell/q11-command-menu.spec.ts', 'grok53/tasks/ls-009-010-023-agenda.spec.ts',
    'grok53/wealth/l1-pass3.spec.ts', 'install-guide.spec.ts', 'install-manifest.spec.ts', 'journey.spec.ts',
    'journeys/j10-switch.spec.ts', 'phone-refinements.spec.ts', 'portfolio.spec.ts', 'quick-add-line.spec.ts',
    'release-review-2-p2.spec.ts', 'run10-account-access.spec.ts', 'run10-widgets.spec.ts',
    'run11-observation-groups.spec.ts', 'staking-real-confirm.spec.ts', 'storage-errors-health.spec.ts',
    'zigi-browser-agents.spec.ts',
    'aw-programmes.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 16, 61.9 worker-min.
  [
    'ao/perfect-day.spec.ts', 'ap/ap-countdowns.spec.ts', 'ar-today-orbits.spec.ts', 'av-good-things.spec.ts',
    'av2-chess-engine.spec.ts', 'av2-journal-dream.spec.ts', 'av2-journal-more-photos.spec.ts',
    'av2-money-left-month.spec.ts', 'av2-money-streak.spec.ts', 'av2-mood-look.spec.ts', 'av2-notes-find.spec.ts',
    'av2-notes-info.spec.ts', 'av2-notes-tag-templates.spec.ts', 'av2-polish-wealth.spec.ts',
    'av2-quick-macros.spec.ts', 'av2-r5-status.spec.ts', 'av2-r6-sleep.spec.ts', 'av2-revb2a-task-versions.spec.ts',
    'av2-revb2b-week-skip-note.spec.ts', 'av2-routine-library.spec.ts', 'av2-sync-choices.spec.ts',
    'av2-thought-check.spec.ts', 'av2-timeline-any-day.spec.ts', 'checklist-list-ag-polish.spec.ts',
    'earn-guide-zigi.spec.ts', 'grok53/ai/al-agents-help.spec.ts', 'grok53/chain/l6-fifth-earn.spec.ts',
    'grok53/first-run/nb-002-not-now.spec.ts', 'grok53/p14a/ds8-showcase-restore.spec.ts',
    'grok53/p14a/st3-showcase-staking-scenario.spec.ts', 'grok53/release/rr-ai-tasks.spec.ts',
    'grok53/release/rr-life.spec.ts', 'grok53/today/nb-081-water-undo.spec.ts', 'habits-v2.spec.ts',
    'journeys/j02-health-day.spec.ts', 'journeys/j03-money-month.spec.ts', 'launcher-gutter-ak.spec.ts',
    'p3-nova-polish.spec.ts', 'pwa-aa.spec.ts', 'run9-1-visual.spec.ts', 'run9-2-life.spec.ts', 'session-ac.spec.ts',
    'sleep.spec.ts', 'tasks-ai.spec.ts', 'webkit-av-keep.spec.ts', 'webkit-checklist.spec.ts',
    'webkit-governance.spec.ts', 'zigi-a11y-pass.spec.ts', 'zigi-memory-page.spec.ts', 'zigi-no-model-ab.spec.ts',
    'zigi-oneline-z.spec.ts', 'zigi-plans-af.spec.ts', 'zigi-robustness.spec.ts',
    'aw-x2-marvin.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 17, 61.9 worker-min.
  [
    'ah-showcase-reset.spec.ts', 'ap/ap-health-food-days.spec.ts', 'ap/ap-health-symptoms.spec.ts',
    'ap/ap-task-when.spec.ts', 'ar-matrix-drag.spec.ts', 'au/webkit-au-tom.spec.ts', 'av-budget-pace.spec.ts',
    'av-category-suggest.spec.ts', 'av-quick-calories.spec.ts', 'av2-areas-theme.spec.ts', 'av2-backup-folder.spec.ts',
    'av2-budget-periods.spec.ts', 'av2-compare-nutrients.spec.ts', 'av2-diary-times.spec.ts',
    'av2-journal-import.spec.ts', 'av2-mood-notify.spec.ts', 'av2-muted.spec.ts', 'av2-notes-embed.spec.ts',
    'av2-notes-views.spec.ts', 'av2-polish-forms.spec.ts', 'av2-r6-calm.spec.ts', 'av2-restore-media.spec.ts',
    'av2-revb2a-periods.spec.ts', 'av2-task-attachments.spec.ts', 'av2-task-files.spec.ts', 'dashboard-visual.spec.ts',
    'earn-academy.spec.ts', 'export-everything.spec.ts', 'grants.spec.ts', 'grok53/checklist/al-third-pass.spec.ts',
    'grok53/goals/fifth-pass.spec.ts', 'grok53/hud/hud-fit.spec.ts', 'grok53/p15/life-p15b.spec.ts',
    'grok53/settings/mo-038-reminders-hub.spec.ts', 'grok53/tasks/ls-025-050-073-fields.spec.ts',
    'grok53/wealth/l1-pass5-wealth.spec.ts', 'grok53/wealth/tk-pass2.spec.ts', 'notes.spec.ts', 'nova-hermes.spec.ts',
    'pages-visibility.spec.ts', 'phone-checklist-button.spec.ts', 'radio-shape.spec.ts', 'run9-2-product.spec.ts',
    'run9-2-security.spec.ts', 'session-x-findings.spec.ts', 'showcase-today-aa.spec.ts',
    'sleep-balance-focus-aj.spec.ts', 'today-scene.spec.ts', 'webkit-earn.spec.ts', 'webkit-staking.spec.ts',
    'webkit-zigi-freeze.spec.ts', 'wiring-2-g1-tools.spec.ts', 'zigi-chat-polish.spec.ts', 'zigi-conversations.spec.ts',
    'aw-x1-due.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 18, 62.0 worker-min.
  [
    'a11y-ab-cloud.spec.ts', 'ap/bento.spec.ts', 'at/today-tab-stops-week.spec.ts', 'av-set-best.spec.ts',
    'av2-feelings-graph.spec.ts', 'av2-food-more.spec.ts', 'av2-habit-history.spec.ts', 'av2-habit-imports.spec.ts',
    'av2-hide-figures.spec.ts', 'av2-journal-periods.spec.ts', 'av2-money-calendar.spec.ts', 'av2-money-sheet.spec.ts',
    'av2-notes-daily-range.spec.ts', 'av2-notes-save.spec.ts', 'av2-planned-workouts.spec.ts',
    'av2-polish-today.spec.ts', 'av2-polish4-charts.spec.ts', 'av2-revb2a-payee.spec.ts',
    'av2-revb3c-markdown-import.spec.ts', 'earn-hub.spec.ts', 'earn-your-position.spec.ts', 'export-roundtrip.spec.ts',
    'food-search-aj.spec.ts', 'g1b-cash-forecast.spec.ts', 'grok53/ai/al-facts-no-model.spec.ts',
    'grok53/ai/p14b-nova.spec.ts', 'grok53/chain/pr-036-040-earn-dated.spec.ts',
    'grok53/checklist/l5-fifth-pass.spec.ts', 'grok53/consistency/p13-showcase-consistency.spec.ts',
    'grok53/goals/count-goal-units.spec.ts', 'grok53/goals/wizard-milestones.spec.ts',
    'grok53/health/fourth-pass-field-errors.spec.ts', 'grok53/health/gap-045-079-048-diary.spec.ts',
    'grok53/health/mo-049-nutrition-csv.spec.ts', 'grok53/release/final-zigi.spec.ts',
    'grok53/settings/bn-114-notify-permission.spec.ts', 'grok53/settings/mo-039-switch-undo-line.spec.ts',
    'grok53/shell/p14d-page-transitions.spec.ts', 'grok53/today/sweep3-today.spec.ts',
    'health-camera-navigation.spec.ts', 'health-decimal-comma.spec.ts', 'journal-ai.spec.ts', 'launcher-twins.spec.ts',
    'markets-table.spec.ts', 'nova-workflows.spec.ts', 'run10-financial-evidence.spec.ts',
    'run10-source-pinning.spec.ts', 'theme-polish-ae.spec.ts', 'your-ai-captures.spec.ts', 'zigi-on-device.spec.ts',
    'zigi-phone-rest.spec.ts', 'zigi-tools.spec.ts',
    'aw-showcase.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 19, 62.0 worker-min.
  [
    'a11y-motion-dialogs.spec.ts', 'activity-undo-aj.spec.ts', 'ao/day-ends.spec.ts', 'at/help-screenshots.spec.ts',
    'au/jules.spec.ts', 'av-a11y.spec.ts', 'av-week-grid.spec.ts', 'av2-bmi-milestones.spec.ts',
    'av2-feelings-more.spec.ts', 'av2-matrix-labels.spec.ts', 'av2-meditation-milestones.spec.ts',
    'av2-notes-outline-print.spec.ts', 'av2-pack-photos.spec.ts', 'av2-plan-your-day.spec.ts',
    'av2-r5-movement.spec.ts', 'av2-shoes-tips.spec.ts', 'av2-sleep-r4.spec.ts', 'diagnostics.spec.ts',
    'earn-plain-words.spec.ts', 'exploratory-round3.spec.ts', 'g1-insight-feedback.spec.ts', 'goals-best-aa.spec.ts',
    'grok53/chain/bn-003-real-confirm-375.spec.ts', 'grok53/chain/bn-084-085-112-tracked-wallets.spec.ts',
    'grok53/first-run/nb-011-locale-reload.spec.ts', 'grok53/hud/hud-elements.spec.ts',
    'grok53/journey/al-third-journey.spec.ts', 'grok53/p14a/d9-earn-academy-on-view.spec.ts',
    'grok53/p15/life-p15b-built.spec.ts', 'grok53/p15/p15a-platform.spec.ts',
    'grok53/portfolio/l1-pass4-portfolio.spec.ts', 'grok53/release/rr-money.spec.ts',
    'grok53/settings/dv-275-extras-reset.spec.ts', 'grok53/settings/settings-switches-sweep.spec.ts',
    'grok53/shell/l10a-third-pass.spec.ts', 'grok53/tasks/l5-fourth-pass.spec.ts',
    'grok53/wealth/tk-accounts-headline.spec.ts', 'guide.spec.ts', 'health-daily.spec.ts', 'nova-compose-ar.spec.ts',
    'point-tell.spec.ts', 'revb1-checkin-strip.spec.ts', 'revb1-journal-media-export.spec.ts',
    'run11-measurements.spec.ts', 'sync-offer-card.spec.ts', 'timeline-af.spec.ts', 'vitamins-ab.spec.ts',
    'wallet-tracking.spec.ts', 'wealth-classes-af.spec.ts', 'wiring-2-nova-start.spec.ts', 'wiring-wealth.spec.ts',
    'zigi-stress.spec.ts',
    'aw-fr-ui.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
  // Shard 20, 62.0 worker-min.
  [
    'ap/ap-money-age.spec.ts', 'ap/ap-money-pace.spec.ts', 'av-focus-habit.spec.ts', 'av2-compare-report.spec.ts',
    'av2-journal-markdown.spec.ts', 'av2-money-category-file.spec.ts', 'av2-money-reconcile.spec.ts',
    'av2-money-try-a-change.spec.ts', 'av2-naps-need.spec.ts', 'av2-noom-r4.spec.ts', 'av2-revb3c-notes-folds.spec.ts',
    'av2-task-look.spec.ts', 'counters-compact.spec.ts', 'footer-motion.spec.ts', 'g1a-health-numbers.spec.ts',
    'g1a-wrap-up-tasks.spec.ts', 'goals.spec.ts', 'grok53/ai/p14b-held-gaze.spec.ts',
    'grok53/chain/bn-008-177-180-governance-cards.spec.ts', 'grok53/data/ls-025-064-tasks-checklist-backup.spec.ts',
    'grok53/first-run/al-fourth-first-run.spec.ts', 'grok53/first-run/nb-041-no-goal-tiles.spec.ts',
    'grok53/goals/fourth-pass.spec.ts', 'grok53/habits/nb-135-same-day-delete.spec.ts',
    'grok53/health/sweep3-health.spec.ts', 'grok53/settings/search-ls-005-047-ndv-10.spec.ts',
    'grok53/shell/plans-a11y-404.spec.ts', 'grok53/shell/zigi-hold-busy.spec.ts',
    'grok53/wealth/sweep3-count-tally.spec.ts', 'habit-skips.spec.ts', 'health-goals.spec.ts',
    'hosted-checklist-stage.spec.ts', 'hostile-files-x.spec.ts', 'journeys/j06-data-safety.spec.ts',
    'journeys/j07-wallet-chain.spec.ts', 'landing-v5-security.spec.ts', 'market-watch-af.spec.ts', 'nova-wa.spec.ts',
    'onboarding.spec.ts', 'page-titles.spec.ts', 'progress-glass.spec.ts', 'revb1-timer-done.spec.ts',
    'run11-food-widgets.spec.ts', 'run11-motion-recording.spec.ts', 'search-aa.spec.ts',
    'staking-validator-guard-af.spec.ts', 'today-screens.spec.ts', 'your-ai.spec.ts', 'zigi-act.spec.ts',
    'zigi-personality.spec.ts', 'zigi-v2-captures.spec.ts', 'zigi-voice-z.spec.ts',
    'aw-fr-journal.spec.ts', // Session AW: new spec, counted 1 worker-min until measured
  ],
];

/** Measured worker-minutes per list (the comments above); a new spec goes to the smallest. */
export const MAIN_SHARD_MINUTES: readonly number[] = [63.0, 63.0, 63.0, 63.9, 63.0, 63.0, 63.0, 62.9, 63.0, 63.0, 63.0, 63.0, 63.0, 62.9, 62.9, 62.9, 62.9, 63.0, 63.0, 63.0];

/** Every spec under `testsDir` that the main suite selects (all but the accessibility sweep), relative, sorted. */
export function mainSpecFiles(testsDir: string): string[] {
  return (readdirSync(testsDir, {recursive: true}) as string[])
    .map(f => f.split('\\').join('/'))
    .filter(f => !f.split('/').includes('node_modules') && MAIN_TEST_FILE.test(f) && !A11Y_SWEEP.test(f))
    .sort();
}

/** Each problem names the file and the fix; an empty list means every selected spec is in exactly one list. */
export function partitionProblems(
  files: readonly string[],
  shards: readonly (readonly string[])[] = MAIN_SHARDS,
  minutes: readonly number[] = MAIN_SHARD_MINUTES,
): string[] {
  const problems: string[] = [];
  const where = new Map<string, number[]>();
  shards.forEach((list, i) => list.forEach(f => where.set(f, [...(where.get(f) ?? []), i + 1])));
  const present = new Set(files);
  // Each new spec counts as one worker-minute where it is suggested, so the next new spec may go elsewhere.
  const tally = shards.map((_, i) => minutes[i] ?? 0);
  for (const f of files) {
    const at = where.get(f);
    if (!at) {
      const n = tally.indexOf(Math.min(...tally));
      problems.push(`${f} is a main-suite spec in no shard list: add it to shard ${n + 1}'s list in ${SHARDS_FILE} (the fewest minutes, ${tally[n]!.toFixed(1)})`);
      tally[n]! += 1;
    } else if (at.length > 1) problems.push(`${f} is in more than one main shard list (${at.join(', ')}): keep it in one list in ${SHARDS_FILE}`);
  }
  for (const f of where.keys()) {
    if (!present.has(f)) problems.push(`${f} is listed in main shard ${where.get(f)!.join(', ')} but is not a main-suite spec under tests/: remove it from ${SHARDS_FILE}`);
  }
  if (minutes.length !== shards.length) problems.push(`${SHARDS_FILE} has ${shards.length} shard lists but ${minutes.length} measured durations: give each list one`);
  return problems;
}

/** `MAIN_SHARD=n/total`: that list's files as anchored path patterns, after checking the whole partition. */
export function mainShardMatch(spec: string, testsDir: string): RegExp[] {
  const m = /^(\d+)\/(\d+)$/.exec(spec);
  const n = Number(m?.[1]), total = Number(m?.[2]);
  if (!m || total !== MAIN_SHARDS.length || !(n >= 1 && n <= MAIN_SHARDS.length)) {
    throw new Error(`MAIN_SHARD="${spec}": expected n/${MAIN_SHARDS.length} with n from 1 to ${MAIN_SHARDS.length} (the lists in ${SHARDS_FILE})`);
  }
  const problems = partitionProblems(mainSpecFiles(testsDir));
  if (problems.length) throw new Error(`The main shard lists do not cover each spec exactly once:\n- ${problems.join('\n- ')}`);
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('/').join('[\\\\/]');
  return MAIN_SHARDS[n - 1]!.map(f => new RegExp(`[\\\\/]tests[\\\\/]${escape(f)}$`));
}
