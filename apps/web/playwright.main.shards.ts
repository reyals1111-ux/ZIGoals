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
 */

/** The accessibility sweep, CI's own "a11y" suite (`A11Y_SWEEP` in playwright.config.ts, as since Session AK). */
export const A11Y_SWEEP = /p6-(axe-all|axe-surfaces|keyboard)\.spec\.ts$/;
/** Playwright's default testMatch (`**\/*.@(spec|test).?(c|m)[jt]s?(x)`), which the main config uses. */
export const MAIN_TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/;

export const SHARDS_FILE = 'apps/web/playwright.main.shards.ts';

/** Paths relative to apps/web/tests/, with forward slashes, in Playwright's file order. */
export const MAIN_SHARDS: readonly (readonly string[])[] = [
  // Shard 1, 54.9 worker-min: about 33.7 min of tests at two workers in file order, 36.1 in any order.
  [
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/lina.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/max.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/webkit-au-sanne.spec.ts', 'au/sanne.spec.ts',
    'ah-health-day.spec.ts', 'ah-settings.spec.ts', 'ar-matrix-drag.spec.ts', 'attestation.spec.ts',
    'b3-ai-small.spec.ts', 'checklist-list-ag-polish.spec.ts', 'earn-your-position.spec.ts',
    'export-everything.spec.ts', 'fasting.spec.ts', 'goal-source-allocation.spec.ts',
    'grok53/chain/bn-008-177-180-governance-cards.spec.ts', 'grok53/chain/bn-100-121-183-chess.spec.ts',
    'grok53/chain/l6-fifth-earn.spec.ts', 'grok53/goals/goal-delete-close.spec.ts',
    'grok53/goals/wizard-first-input.spec.ts', 'grok53/habits/nb-199-water-link.spec.ts',
    'grok53/health/dv-059-health-goal-target.spec.ts', 'grok53/health/mo-010-future-diary-dates.spec.ts',
    'grok53/hud/hud-two-way.spec.ts', 'grok53/journey/nb-185-xp-farm.spec.ts', 'grok53/shell/q11-command-menu.spec.ts',
    'grok53/shell/zigi-hold-busy.spec.ts', 'grok53/tasks/al-second-pass.spec.ts',
    'grok53/tasks/ls-002-045-projects-views.spec.ts', 'grok53/tasks/ls-004-global-quick-add.spec.ts',
    'grok53/tasks/ls-068-reminders.spec.ts', 'grok53/today/al-fourth-today.spec.ts', 'health-midnight.spec.ts',
    'phone-folds.spec.ts', 'pwa-ak.spec.ts', 'quick-log-ai.spec.ts', 'radio-shape.spec.ts', 'rewards-sweep.spec.ts',
    'run10-ecosystem.spec.ts', 'stories-af.spec.ts', 'theme-parity-af.spec.ts', 'today-screens.spec.ts',
    'zigi-composer-switch.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-a11y.spec.ts', 'av-rows.spec.ts', 'av-bills-year.spec.ts', 'av-factors.spec.ts', 'av-tasks-done.spec.ts',
    'av-set-best.spec.ts', 'av-run-bests.spec.ts', 'av-bill-calendar.spec.ts', 'av-watch.spec.ts',
    'av2-journal-packs.spec.ts',
    'av2-distance-goals.spec.ts',
    'av2-money-sheet.spec.ts',
    'av2-workout-year.spec.ts',
    'av2-mood-words-journal.spec.ts',
    'revb1-note-reminders.spec.ts',
    'av2-money-people.spec.ts',
    'av2-year-pixels-words.spec.ts',
    'av2-cycle-on-plan.spec.ts',
    'av2-money-networth-movers.spec.ts',
    'av2-more-health-goals.spec.ts',
    'av2-sleep-r4.spec.ts',
    'av2-notes-callouts.spec.ts',
  ],
  // Shard 2, 44.1 worker-min as packed (Session AU); Session AV's new specs were each added here as one worker-minute and
  // took it to 111.3 measured in CI 2002 (59 of the job's 60 min). Its AV specs moved to the other lists by that run's
  // measured minutes (ADR-045 D-CI2002); 54.2 measured left, nova-stage-am2's 33.4 most of it. The minutes below are
  // the packed figures plus each moved file's measured minutes.
  [
    'ah-competitors.spec.ts', 'ah-undo-removals.spec.ts', 'ao/day-ends.spec.ts', 'ap/ap-health-food-days.spec.ts', 'webkit-av-keep.spec.ts',
    'barcode-param-ak.spec.ts', 'checklist-view-writes-nothing-af.spec.ts', 'dashboard-visual.spec.ts',
    'diagnostics.spec.ts', 'g1a-health-numbers.spec.ts', 'g1a-scales.spec.ts', 'grok53/ai/p14b-held-gaze.spec.ts',
    'grok53/first-run/nb-011-locale-reload.spec.ts', 'grok53/goals/goal-notes-and-average.spec.ts',
    'grok53/habits/nb-076-frequency.spec.ts', 'grok53/journey/al-second-journey.spec.ts',
    'grok53/settings/sweep2-showcase.spec.ts', 'grok53/wealth/sweep3-count-tally.spec.ts',
    'health-camera-navigation.spec.ts', 'journal-ai.spec.ts', 'journeys/j07-wallet-chain.spec.ts',
    'journeys/j11-keyboard-names.spec.ts', 'notes-ask.spec.ts', 'nova-stage-am2.spec.ts', 'quick-logging.spec.ts',
    'run11-food-volume.spec.ts', 'run11-goal-history.spec.ts', 'settings-groups.spec.ts', 'theme-polish-ae.spec.ts',
    'themes.spec.ts', 'wallet-tracking.spec.ts', 'wealth.spec.ts', 'webkit-theme-parity.spec.ts',
    'zigi-memory-page.spec.ts', 'zigi-part-boundary.spec.ts',
    // Session AV lane 2 (owner follow-up 4): new specs, about 1 worker-minute each.
    'av2-erase-areas.spec.ts',
    'av2-budget-periods.spec.ts',
    'av2-goal-creator.spec.ts',
    'av2-matrix-labels.spec.ts',
    'av2-task-planning.spec.ts',
    'av2-task-reminders.spec.ts',
    'av2-areas-theme.spec.ts',
    'av2-checkin.spec.ts',
    'av2-experiment-outcomes.spec.ts',
    'av2-feelings-graph.spec.ts',
    'av2-habit-options.spec.ts',
    'av2-hide-figures.spec.ts',
    'av2-muted.spec.ts',
    'av2-todays-practice.spec.ts',
    'av2-chess-engine.spec.ts',
    'av2-bmi-milestones.spec.ts',
    'av2-money-crypto.spec.ts',
    'av2-routine-share.spec.ts',
    'av2-routine-card.spec.ts',
    'av2-pk10-chain-help.spec.ts',
    'av2-custom-fields.spec.ts',
    'av2-repeat-projects.spec.ts',
    'av2-revb2a-periods.spec.ts',
    'av2-money-beside-habits.spec.ts',
    'av2-timeline-any-day.spec.ts',
    'av2-journal-more-photos.spec.ts',
    'av2-revb3c-markdown-import.spec.ts',
    'av2-notes-writing.spec.ts',
    'av2-polish-wealth.spec.ts',
  ],
  // Shard 3, 60.3 worker-min: about 30.3 min of tests at two workers in file order, 36.1 in any order.
  [
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/webkit-au-jules.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/webkit-au-tom.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/jules.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/tom.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/webkit-au-lina.spec.ts',
    // Session AU (ADR-044): the persona specs (tests/au/), about 1 worker-minute each.
    'au/webkit-au-max.spec.ts',
    'a11y-wcag-x.spec.ts', 'ah-multitab.spec.ts', 'ah-part18.spec.ts', 'ah-wealth.spec.ts', 'ambient.spec.ts',
    'ap/ap-money-age.spec.ts', 'ap/ap-money-bill-price.spec.ts', 'at/weight-csv-fields.spec.ts',
    'checklist-planet-halo.spec.ts', 'checklist-quick-add.spec.ts', 'counters-compact.spec.ts',
    'earn-calculator-link.spec.ts', 'earn-dock.spec.ts', 'g1b-amount-calculator.spec.ts', 'g1b-cash-forecast.spec.ts',
    'goals-best-aa.spec.ts', 'grok53/data/ls-025-064-tasks-checklist-backup.spec.ts',
    'grok53/first-run/al-fifth-first-run.spec.ts', 'grok53/goals/finished-closed.spec.ts',
    'grok53/goals/second-pass.spec.ts', 'grok53/habits/pr-044-skip-undo.spec.ts',
    'grok53/health/fifth-pass-checklist.spec.ts', 'grok53/hud/hud-perf.spec.ts', 'grok53/release/rr-ai-tasks.spec.ts',
    'grok53/settings/mo-038-reminders-hub.spec.ts', 'habits-decimal-comma.spec.ts', 'invisible-names.spec.ts',
    'journeys/j10-switch.spec.ts', 'landing-v5-layout.spec.ts', 'logo-fold.spec.ts', 'page-order-aa.spec.ts',
    'run10-widgets.spec.ts', 'run11-habit-integration.spec.ts', 'run11-observation-import.spec.ts',
    'run11-recovery-failures.spec.ts', 'run11-wealth-changes.spec.ts', 'settings-render-all-ak.spec.ts',
    'showcase-today-aa.spec.ts', 'storage-errors-health.spec.ts', 'timeline-af.spec.ts', 'webkit-celebration.spec.ts',
    'webkit-governance.spec.ts', 'webkit-timeline.spec.ts', 'zigi-a11y-pass.spec.ts', 'zigi-brief-af.spec.ts',
    'zigi-no-model-ab.spec.ts', 'zigi-on-device.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-yesterday.spec.ts', 'av-update.spec.ts', 'av-hide-figures.spec.ts', 'av-words-match.spec.ts',
    'av-prompt-day.spec.ts', 'av-budget-pace.spec.ts', 'av-task-notify.spec.ts', 'av-star-permissions.spec.ts',
    'av2-journal-reminder.spec.ts',
    'av2-evening-plan.spec.ts',
    'av2-oracle.spec.ts',
    'av2-appearance.spec.ts',
    'av2-rolling-habit.spec.ts',
    'revb1-plan-views-edit.spec.ts',
    'av2-money-quick-log.spec.ts',
    'av2-minors-tasks.spec.ts',
    'av2-focus-notes.spec.ts',
    'av2-notes-canvas.spec.ts',
    'av2-water-day.spec.ts',
    'av2-money-average-crossover.spec.ts',
    'av2-notes-find.spec.ts',
  ],
  // Shard 4, 60.6 worker-min: about 33.9 min of tests at two workers in file order, 36.1 in any order.
  [
    'ah-habits.spec.ts', 'ap/ap-countdowns.spec.ts', 'ap/ap-health-trends.spec.ts', 'ap/bento.spec.ts',
    'at/zignaly-dates.spec.ts', 'earn-options.spec.ts', 'earn-validators.spec.ts', 'flow-aa.spec.ts',
    'g1a-focus-rounds.spec.ts', 'grok53/chain/c-bn-22-puzzle-log.spec.ts',
    'grok53/first-run/nb-011-wizard-draft.spec.ts', 'grok53/goals/goal-amount-cap.spec.ts',
    'grok53/habits/nb-077-draft.spec.ts', 'grok53/journey/al-fourth-journey.spec.ts',
    'grok53/p14a/se2-one-review-day.spec.ts', 'grok53/p15/p15a-chain.spec.ts', 'grok53/p15/p15a-platform.spec.ts',
    'grok53/tasks/l5-fourth-pass.spec.ts', 'grok53/tasks/ls-001-003-line-and-repeats.spec.ts',
    'grok53/wealth/sweep4-purpose-percent.spec.ts', 'grok53/wealth/tk-portfolio-oversell.spec.ts',
    'hosted-alpha-goal-stage.spec.ts', 'invite-only.spec.ts', 'music.spec.ts', 'nova-setup.spec.ts',
    'nova-stage-am.spec.ts', 'nova-wa.spec.ts', 'p1-nova-make.spec.ts', 'phone-touch-targets.spec.ts',
    'portfolio-v2.spec.ts', 'positions-layout.spec.ts', 'rail-lane-af.spec.ts', 'run9.spec.ts', 'sleep.spec.ts',
    'staking-page.spec.ts', 'tasks-time.spec.ts', 'today-roles-af.spec.ts', 'zigi-aa.spec.ts',
    'zigi-accept-correct.spec.ts', 'zigi-act.spec.ts', 'zigi-history-undo.spec.ts', 'zigi-memory.spec.ts',
    'zigi-oneline-z.spec.ts', 'zigi-page-awareness-af.spec.ts', 'zigi-plans-af.spec.ts', 'zigi-tools.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-matrix-pause.spec.ts', 'av-habit-look.spec.ts', 'av-debt-plan.spec.ts', 'av-plan-day.spec.ts',
    'av-workout-weeks.spec.ts', 'av-sleep-long.spec.ts', 'av-good-things.spec.ts',
    'av2-journal-affirmation.spec.ts',
    'av2-bodyweight-units.spec.ts',
    'av2-money-debts.spec.ts',
    'av2-shoes-tips.spec.ts',
    'av2-scale-stats.spec.ts',
    'revb1-checkin-strip.spec.ts',
    'av2-feelings-strength.spec.ts',
    'av2-task-print.spec.ts',
    'av2-revb2a-showcase-docs.spec.ts',
    'av2-money-credit-card.spec.ts',
    'av2-circuits.spec.ts',
    'av2-journal-throwback.spec.ts',
    'av2-revb3c-notes-folds.spec.ts',
    'av2-revb3c-grid.spec.ts',
  ],
  // Shard 5, 64.2 worker-min: about 33.0 min of tests at two workers in file order, 36.1 in any order.
  [
    'a11y-motion-dialogs.spec.ts', 'aa-a11y.spec.ts', 'add-money.spec.ts', 'ah-goals.spec.ts', 'amounts-ab.spec.ts',
    'ap/ap-health-copy-meal.spec.ts', 'ap/ap-priority-matrix.spec.ts', 'ap/launcher-tuck.spec.ts',
    'at/today-tab-stops-week.spec.ts', 'checklist-celebration-ag-polish.spec.ts', 'checklist-themes.spec.ts',
    'coherence.spec.ts', 'goal-vaults.spec.ts', 'grok53/ai/l7-fifth-safety.spec.ts',
    'grok53/chain/c-bn-14-15-16-ecosystem-gaps.spec.ts', 'grok53/checklist/al-fifth-checklist.spec.ts',
    'grok53/checklist/al-third-pass.spec.ts', 'grok53/first-run/al-third-first-run.spec.ts',
    'grok53/habits/al-second-habits.spec.ts', 'grok53/health/gap-071-072-sleep-csv.spec.ts',
    'grok53/health/nb-139-sleep-default-before-7.spec.ts', 'grok53/health/nb-254-coach-weight-link.spec.ts',
    'grok53/today/nb-081-water-undo.spec.ts', 'grok53/today/sweep3-today.spec.ts', 'grok53/wealth/l1-pass3.spec.ts',
    'help-settings-link.spec.ts', 'insights.spec.ts', 'install-manifest.spec.ts', 'journeys/j04-offline.spec.ts',
    'journeys/j09-lichess.spec.ts', 'meal-estimate-ai.spec.ts', 'meditation.spec.ts', 'mobile-safari-fit.spec.ts',
    'my-links.spec.ts', 'nova-compose-ar.spec.ts', 'onboarding.spec.ts', 'phone-form-sheets.spec.ts',
    'release-review-2-p2.spec.ts', 'reminders.spec.ts', 'run11-migration-recovery.spec.ts',
    'showcase-export-guard.spec.ts', 'staking-errors.spec.ts', 'today-folds-memory.spec.ts', 'vitamins-ab.spec.ts',
    'wallet-menu.spec.ts', 'webkit-staking.spec.ts', 'wiring-2-nova-cards.spec.ts', 'wiring-habits.spec.ts',
    'zigi-phone-rest.spec.ts', 'zigi-settings-reserve.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-focus-habit.spec.ts', 'av-workout-calendar.spec.ts', 'av-own-templates.spec.ts',
    'av-category-suggest.spec.ts', 'av-money-attention.spec.ts',
    'av2-journal-report.spec.ts',
    'av2-exercise-library.spec.ts',
    'av2-pack-photos.spec.ts',
    'av2-backup-folder.spec.ts',
    'av2-timer-presets.spec.ts',
    'revb1-table-targets.spec.ts',
    'av2-money-space.spec.ts',
    'av2-restore-media.spec.ts',
    'av2-journal-dream.spec.ts',
    'av2-notes-outline-print.spec.ts',
    'av2-weigh-in.spec.ts',
    'av2-money-calendar.spec.ts',
    'av2-notes-fold.spec.ts',
  ],
  // Shard 6, 64.7 worker-min: about 32.4 min of tests at two workers in file order, 36.1 in any order.
  [
    'a11y-consent-labels.spec.ts', 'ah-local-today.spec.ts', 'ah-today.spec.ts', 'checklist-ag-polish-2.spec.ts',
    'checklist-celebration-video.spec.ts', 'checklist-launcher.spec.ts', 'checklist-phone-ag-polish-3.spec.ts',
    'customize-aj.spec.ts', 'data-safety-x.spec.ts', 'footer-arc-af.spec.ts', 'g1a-wrap-up-tasks.spec.ts',
    'governance.spec.ts', 'grok53/ai/al-safety-guard.spec.ts', 'grok53/ai/l7-fourth-safety.spec.ts',
    'grok53/chain/bn-084-085-112-tracked-wallets.spec.ts', 'grok53/goals/ls-064-quantity-unit.spec.ts',
    'grok53/health/mo-025-past-fast.spec.ts', 'grok53/health/mo-029-weight-csv.spec.ts',
    'grok53/health/nb-081-water-undo.spec.ts', 'grok53/health/sweep3-health.spec.ts',
    'grok53/hud/bn044-memory-chip.spec.ts', 'grok53/hud/hud-elements.spec.ts', 'grok53/hud/hud-shortcuts.spec.ts',
    'grok53/journey/al-third-journey.spec.ts', 'grok53/markets/l1-pass4-markets.spec.ts',
    'grok53/release/final-goals-wealth.spec.ts', 'grok53/release/final-zigi.spec.ts',
    'grok53/settings/bn-019-no-503-on-settings.spec.ts', 'grok53/settings/bn-113-screen-lock.spec.ts',
    'grok53/settings/sweep4-settings.spec.ts', 'hosted-checklist-stage.spec.ts', 'journeys/j03-money-month.spec.ts',
    'journeys/j12-nova.spec.ts', 'logo-quickadd-goals-header.spec.ts', 'motion-m.spec.ts', 'multitab.spec.ts',
    'nova-answers-as.spec.ts', 'nova-dashboard.spec.ts', 'nutrition-import.spec.ts', 'path-engine.spec.ts',
    'public-alpha.spec.ts', 'run11-food-unknown.spec.ts', 'trader-tools-aj.spec.ts', 'wealth-classes-af.spec.ts',
    'webkit-add-money.spec.ts', 'webkit-phone.spec.ts', 'wiring-2-g1-tools.spec.ts', 'xpub-watch-aj.spec.ts',
    'zigi-browser-agents.spec.ts', 'zigi-hosted.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-review-tasks.spec.ts', 'av-report-more.spec.ts', 'av-repeat-plan.spec.ts', 'av-month-recap.spec.ts',
    'av-bills-month.spec.ts',
    'av2-journal-versions.spec.ts',
    'av2-fit-plan.spec.ts',
    'av2-progression.spec.ts',
    'av2-calm-move.spec.ts',
    'revb1-task-timer.spec.ts',
    'av2-board-imports.spec.ts',
    'av2-money-store-cards.spec.ts',
    'av2-revb2b-load-break.spec.ts',
    'av2-journal-grid.spec.ts',
    'av2-notes-props.spec.ts',
    'av2-plan-week.spec.ts',
    'av2-money-categories.spec.ts',
    'av2-notes-imports.spec.ts',
    'av2-polish-folds.spec.ts',
  ],
  // Shard 7, 65.5 worker-min: about 33.4 min of tests at two workers in file order, 36.1 in any order.
  [
    'aj-owner-decisions.spec.ts', 'ao/owner-calls.spec.ts', 'ao/page-lengths.spec.ts', 'ap/ap-journal-numbers.spec.ts',
    'ap/ap-money-pace.spec.ts', 'ap/service-rows.spec.ts', 'auto-checkins.spec.ts', 'brand-assets.spec.ts',
    'brand-nav-polish.spec.ts', 'checklist-ag-polish.spec.ts', 'cross-insights-ai.spec.ts', 'earn-guide-mode.spec.ts',
    'earn-path.spec.ts', 'exchanges-ai.spec.ts', 'exploratory-round3.spec.ts', 'g1a-cycle.spec.ts',
    'goal-choice-controls.spec.ts', 'grok53/chain/bn-048-earn-one-strip.spec.ts',
    'grok53/chain/c-bn-17-18-ecosystem-status-sort.spec.ts', 'grok53/health/gap-045-079-048-diary.spec.ts',
    'grok53/health/mo-043-soft-checks.spec.ts', 'grok53/hud/hud-fit.spec.ts',
    'grok53/p14a/ds8-showcase-restore.spec.ts', 'grok53/settings/dv-275-extras-reset.spec.ts',
    'grok53/settings/l6-fifth-pass.spec.ts', 'grok53/settings/l6-fourth-settings.spec.ts',
    'grok53/shell/p14d-page-transitions.spec.ts', 'hosted-verifier-order.spec.ts', 'hydration-zone.spec.ts',
    'journeys/j01-fresh-start.spec.ts', 'journeys/j08-zigi.spec.ts', 'landing-v5-captures.spec.ts',
    'market-watch-af.spec.ts', 'owner-polish.spec.ts', 'p4-first-run.spec.ts', 'qa-decisions.spec.ts',
    'run10-account-access.spec.ts', 'run10-motion.spec.ts', 'run10-shared-visuals.spec.ts',
    'run11-large-goal-collection.spec.ts', 'run11-measurements.spec.ts', 'run11-motion-recording.spec.ts',
    'run11-route-mobile-acceptance.spec.ts', 'run9-1-visual.spec.ts', 'run9-2-visual.spec.ts', 'search-aa.spec.ts',
    'staking-sign.spec.ts', 'storage-errors.spec.ts', 'touch-targets.spec.ts', 'unkept-chat-ak.spec.ts',
    'validator-health.spec.ts', 'wiring-2-r2.spec.ts', 'your-ai-captures.spec.ts', 'zigi-context-pack.spec.ts',
    'zigi-conversations.spec.ts', 'zigi-day-in-the-life.spec.ts', 'zigi-knock.spec.ts',
    'zigi-pages-conversations.spec.ts', 'zigi-photo.spec.ts', 'zigi-real-model.spec.ts', 'zigi-stress.spec.ts',
    'zigi-v2-captures.spec.ts', 'zigi-voice-dictation.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-week-grid.spec.ts', 'av-deadlines.spec.ts', 'av-budget-targets.spec.ts', 'av-paste-list.spec.ts',
    'av2-notes-repeating.spec.ts',
    'av2-food-marks.spec.ts',
    'av2-quick-macros.spec.ts',
    'av2-extra-meals.spec.ts',
    'revb1-timer-done.spec.ts',
    'av2-calm-sound.spec.ts',
    'av2-my-day.spec.ts',
    'av2-revb2b-net-carbs.spec.ts',
    'av2-journal-letter.spec.ts',
    'av2-notes-ticks.spec.ts',
    'av2-compare-sleep.spec.ts',
    'av2-money-groups.spec.ts',
    'av2-notes-info.spec.ts',
    'av2-polish-forms.spec.ts',
  ],
  // Shard 8, 66.2 worker-min: about 33.4 min of tests at two workers in file order, 36.1 in any order.
  [
    'a11y-ab-cloud.spec.ts', 'ap/ap-health-orbits.spec.ts', 'ap/ap-health-splits.spec.ts', 'ar-tick-at-once.spec.ts',
    'checklist-timers.spec.ts', 'ecosystem.spec.ts', 'grok53/chain/sweep4-chain.spec.ts',
    'grok53/checklist/ls-checklist-rows.spec.ts', 'grok53/data/int3-backup-records-erase-range.spec.ts',
    'grok53/goals/count-goal-units.spec.ts', 'grok53/goals/sweep4-chess-goals.spec.ts',
    'grok53/health/fourth-pass-field-errors.spec.ts', 'grok53/health/mo-049-nutrition-csv.spec.ts',
    'grok53/health/p-mo-34-light-contrast.spec.ts', 'grok53/journey/al-fifth-journey.spec.ts',
    'grok53/p14a/d9-earn-academy-on-view.spec.ts', 'grok53/p15/p15a-money.spec.ts', 'grok53/release/a10-life.spec.ts',
    'grok53/settings/bn-114-notify-permission.spec.ts', 'grok53/settings/help-al-006-la-31.spec.ts',
    'grok53/shell/l10a-third-pass.spec.ts', 'grok53/tasks/ls-011-065-live-days.spec.ts',
    'grok53/tasks/ls-037-import-export.spec.ts', 'honesty-banners.spec.ts', 'journeys/j02-health-day.spec.ts',
    'landing-v5-fold.spec.ts', 'life-review-values-ai.spec.ts', 'money-launcher-lane-af.spec.ts',
    'nova-families-as.spec.ts', 'owner-preview.spec.ts', 'p1-nova-live.spec.ts', 'persona-x.spec.ts',
    'point-tell.spec.ts', 'product-data.spec.ts', 'run10-health-only-journey.spec.ts', 'run10-plan-revisions.spec.ts',
    'run11-financial-previews.spec.ts', 'run11-food-widgets.spec.ts', 'run11-goal-options-pointer.spec.ts',
    'run9-2-product.spec.ts', 'send-feedback.spec.ts', 'small-features-y.spec.ts', 'switch-import.spec.ts',
    'today-earn-card-af.spec.ts', 'unified-goals.spec.ts', 'webkit-checklist.spec.ts', 'webkit-zigi-freeze.spec.ts',
    'wiring-2-nova-start.spec.ts', 'wiring-goals.spec.ts', 'wiring-wealth.spec.ts', 'zigi-checklist-af.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-countdown-yearly.spec.ts', 'av-high-in.spec.ts', 'av-sleep-score.spec.ts',
    'av2-journal-books.spec.ts',
    'av2-coach-checkin.spec.ts',
    'av2-money-log-tools.spec.ts',
    'av2-sleep-usual.spec.ts',
    'av2-sync-choices.spec.ts',
    'revb1-delete-versions.spec.ts',
    'av2-food-more.spec.ts',
    'av2-task-versions.spec.ts',
    'av2-revb2a-space-rename.spec.ts',
    'av2-money-import-tags.spec.ts',
    'av2-habit-words-trend.spec.ts',
    'av2-noom-r4.spec.ts',
    'av2-revb3c-sealed.spec.ts',
    'av2-revb3c-markdown-import.spec.ts',
  ],
  // Shard 9, 66.7 worker-min: about 33.7 min of tests at two workers in file order, 36.1 in any order.
  [
    'ah-health.spec.ts', 'ao/perfect-day.spec.ts', 'ao/today-tab-stops.spec.ts', 'at/help-screenshots.spec.ts',
    'calculator-aa.spec.ts', 'checklist-overlay-af.spec.ts', 'earn-academy.spec.ts', 'exploratory-exf.spec.ts',
    'g1a-journal-prompts.spec.ts', 'grok53/ai/al-nova-connection.spec.ts', 'grok53/ai/al-stability.spec.ts',
    'grok53/ai/p14b-nova.spec.ts', 'grok53/ai/sweep3-greeting.spec.ts', 'grok53/chain/l6-fourth-chain.spec.ts',
    'grok53/data/nb-002-top-level-welcome.spec.ts', 'grok53/first-run/nb-002-not-now.spec.ts',
    'grok53/goals/activity-goal-rows.spec.ts', 'grok53/habits/nb-058-weekdays.spec.ts',
    'grok53/health/fourth-pass-weight-and-copy.spec.ts', 'grok53/p15/life-p15b.spec.ts',
    'grok53/portfolio/l1-pass4-portfolio.spec.ts', 'grok53/release/rr-money.spec.ts',
    'grok53/settings/d-088-settings-fold.spec.ts', 'grok53/settings/mo-039-switch-undo-line.spec.ts',
    'grok53/shell/layout-every-width.spec.ts', 'grok53/tasks/ls-009-010-023-agenda.spec.ts',
    'grok53/tasks/ls-022-039-unreadable.spec.ts', 'grok53/today/al-third-today.spec.ts',
    'habits-routines-block.spec.ts', 'habits-v2.spec.ts', 'habits.spec.ts', 'health-today-journal-day.spec.ts',
    'life-review-aa.spec.ts', 'nova-hermes.spec.ts', 'page-titles.spec.ts', 'phone-checklist-button.spec.ts',
    'platform.spec.ts', 'progress-glass.spec.ts', 'run10-restored-today.spec.ts', 'run10-widget-overview.spec.ts',
    'session-ac.spec.ts', 'staking-tabs.spec.ts', 'today-phone-folds.spec.ts', 'transactions.spec.ts',
    'visual-v21.spec.ts', 'zigi-auto-accept.spec.ts', 'zigi-chat-backdrop.spec.ts', 'zigi-earn-coach-af.spec.ts',
    'zigi-mini-window.spec.ts', 'zigi-states.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-two-day.spec.ts', 'av-income-flow.spec.ts', 'av-vs-last.spec.ts',
    'av2-notes-versions.spec.ts',
    'av2-food-minors.spec.ts',
    'av2-recipe-book.spec.ts',
    'av2-habit-history.spec.ts',
    'revb1-zigi-notes.spec.ts',
    'av2-challenge-write-out.spec.ts',
    'av2-naps-need.spec.ts',
    'av2-revb2b-week-skip-note.spec.ts',
    'av2-journal-markdown.spec.ts',
    'av2-plan-your-day.spec.ts',
    'av2-feelings-more.spec.ts',
    'av2-money-places.spec.ts',
    'av2-notes-lock.spec.ts',
    'av2-polish-habits.spec.ts',
  ],
  // Shard 10, 66.7 worker-min: about 33.4 min of tests at two workers in file order, 36.1 in any order.
  [
    'a11y-field-errors.spec.ts', 'ah-workouts.spec.ts', 'amount-input.spec.ts', 'ap/ap-task-when.spec.ts',
    'ar-today-orbits.spec.ts', 'at/ap-minors.spec.ts', 'checklist-phone-ag-polish-2.spec.ts', 'chess.spec.ts',
    'copy-polish.spec.ts', 'display-locale.spec.ts', 'earn-guide-zigi.spec.ts', 'earn-plain-words.spec.ts',
    'export-roundtrip.spec.ts', 'food-search-aj.spec.ts', 'for-you.spec.ts', 'g1-insight-feedback.spec.ts',
    'g1b-spending-map.spec.ts', 'goal-morph-ak.spec.ts', 'goals.spec.ts', 'grok53/ai/al-facts-no-model.spec.ts',
    'grok53/ai/al-nova-workflow-undo.spec.ts', 'grok53/chain/bn-003-real-confirm-375.spec.ts',
    'grok53/chain/bn-018-023-staking-labels.spec.ts', 'grok53/goals/fourth-pass.spec.ts',
    'grok53/habits/al-fifth-habits.spec.ts', 'grok53/habits/al-fourth-habits.spec.ts',
    'grok53/health/mo-140-waist-one-unit.spec.ts', 'grok53/hud/hud-look.spec.ts', 'grok53/hud/hud-motion.spec.ts',
    'grok53/markets/sweep3-watchlist-more.spec.ts', 'grok53/shell/o3-apps-extras.spec.ts',
    'grok53/shell/p14d-earlier-scope.spec.ts', 'grok53/shell/plans-a11y-404.spec.ts',
    'grok53/tasks/ls-006-043-zigi-on-tasks.spec.ts', 'grok53/tasks/ls-025-050-073-fields.spec.ts',
    'grok53/today/sweep2-water-words.spec.ts', 'grok53/wealth/tk-currency-import.spec.ts', 'habits-aa.spec.ts',
    'launcher-twins.spec.ts', 'motion-arrival.spec.ts', 'nova-chat.spec.ts', 'phone-refinements.spec.ts',
    'pwa-aa.spec.ts', 'run11-layout-stability.spec.ts', 'run11-observation-groups.spec.ts',
    'storage-health-wording.spec.ts', 'today-empty-copy.spec.ts', 'wallet-reload.spec.ts', 'wiring-health.spec.ts',
    'workouts-import-aj.spec.ts', 'zigi-personality.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-quick-calories.spec.ts', 'av-nl-tasks.spec.ts', 'av-journal-day.spec.ts',
    'av2-notes-views.spec.ts',
    'av2-logging-challenge.spec.ts',
    'av2-recipe-import-library.spec.ts',
    'av2-meditation-milestones.spec.ts',
    'av2-compare-nutrients.spec.ts',
    'av2-note-reminders-tasks.spec.ts',
    'av2-revb2a-balance-lines.spec.ts',
    'av2-journal-periods.spec.ts',
    'av2-reading-font.spec.ts',
    'av2-habit-identity.spec.ts',
    'av2-money-reconcile.spec.ts',
    'av2-notes-photos.spec.ts',
    'av2-polish-health.spec.ts',
  ],
  // Shard 11, 66.8 worker-min: about 33.5 min of tests at two workers in file order, 36.1 in any order.
  [
    'ap/ap-money-ready-to-assign.spec.ts', 'ap/day-goal.spec.ts', 'checklist.spec.ts', 'chess-play-ak.spec.ts',
    'earn-hub.spec.ts', 'finished-feel-aa.spec.ts', 'g1b-networth-share.spec.ts', 'g1b-selection-total.spec.ts',
    'grants.spec.ts', 'grok53/chain/bn-093-governance-loads.spec.ts', 'grok53/goals/dv-204-header-actions.spec.ts',
    'grok53/goals/fifth-pass.spec.ts', 'grok53/habits/nb-135-same-day-delete.spec.ts',
    'grok53/habits/sweep3-habits.spec.ts', 'grok53/health/fifth-pass.spec.ts',
    'grok53/journey/nb-049-false-goal-celebration.spec.ts', 'grok53/release/a10-money-ai.spec.ts',
    'grok53/release/aq-milestone-tick.spec.ts', 'grok53/release/final-life-tasks.spec.ts',
    'grok53/settings/help-bn-024-025-109.spec.ts', 'grok53/shell/o4-sidebar-apps.spec.ts',
    'grok53/wealth/tk-accounts-headline.spec.ts', 'grok53/wealth/tk-pass2.spec.ts', 'health-aa.spec.ts',
    'health-daily.spec.ts', 'journey.spec.ts', 'landing-v5-a11y.spec.ts', 'landing-v5-security.spec.ts',
    'launcher-gutter-ak.spec.ts', 'layout-fixes-ae.spec.ts', 'light-redo-af.spec.ts', 'notes.spec.ts',
    'phone-pages.spec.ts', 'polish2-af.spec.ts', 'price-alerts-aj.spec.ts', 'run10-barcode.spec.ts', 'run9-1.spec.ts',
    'staking-validator-guard-af.spec.ts', 'switch-more-ak.spec.ts', 'tasks-ai.spec.ts', 'timeline-everyday-aj.spec.ts',
    'timezone-phase4.spec.ts', 'ui-design-pass.spec.ts', 'universe-af.spec.ts', 'wealth-chips-af.spec.ts',
    'webkit-earn.spec.ts', 'zigi-chat-polish.spec.ts', 'zigi-local-answers.spec.ts', 'zigi-memory-af.spec.ts',
    'zigi-send-focus.spec.ts', 'zigi-voice-z.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-nutrient-range.spec.ts', 'av-journal-tags.spec.ts', 'av-offline-later-parts.spec.ts',
    'av2-task-attachments.spec.ts',
    'av2-meal-mic.spec.ts',
    'av2-report-symptoms.spec.ts',
    'av2-mood-look.spec.ts',
    'av2-csv-reimport.spec.ts',
    'av2-places-suggest-replace.spec.ts',
    'av2-revb2a-formatters.spec.ts',
    'av2-journal-prompt-answers.spec.ts',
    'av2-task-energy.spec.ts',
    'av2-journal-favourites.spec.ts',
    'av2-money-saved-searches.spec.ts',
    'av2-notes-save.spec.ts',
    'av2-polish-tasks.spec.ts',
  ],
  // Shard 12, 66.2 worker-min: about 33.2 min of tests at two workers in file order, 36.1 in any order.
  [
    'activity-undo-aj.spec.ts', 'ah-numbers.spec.ts', 'ap/ap-hour-grid.spec.ts', 'ap/ap-money-tags.spec.ts',
    'at/tasks-when-counts.spec.ts', 'devices.spec.ts', 'ecosystem-cards.spec.ts', 'footer-motion.spec.ts',
    'g1b-money-photos.spec.ts', 'grok53/chain/bn-097-ecosystem-today-toggle.spec.ts',
    'grok53/chain/n-bn-016-address-messages.spec.ts', 'grok53/consistency/p13-showcase-consistency.spec.ts',
    'grok53/data/sweep2-recovery-copies.spec.ts', 'grok53/first-run/al-fourth-first-run.spec.ts',
    'grok53/goals/third-pass.spec.ts', 'grok53/habits/al-third-helper-contrast.spec.ts',
    'grok53/markets/tk-markets.spec.ts', 'grok53/p14a/st3-showcase-staking-scenario.spec.ts',
    'grok53/settings/bn-020-021-104-106-backups.spec.ts', 'grok53/settings/bn-022-105-erase-fresh.spec.ts',
    'grok53/tasks/ls-007-014-keyboard-undo-bulk.spec.ts', 'habit-skips.spec.ts', 'header-art-ae.spec.ts',
    'health-goals.spec.ts', 'hosted-earn-stage.spec.ts', 'landing-v5-equation.spec.ts', 'landing-v5-perf.spec.ts',
    'landing.spec.ts', 'p3-nova-polish.spec.ts', 'page-marks.spec.ts', 'pages-visibility.spec.ts',
    'phone-shell.spec.ts', 'pillar-phone-length.spec.ts', 'portfolio.spec.ts', 'private-read-delay.spec.ts',
    'run10-financial-evidence.spec.ts', 'run10-source-pinning.spec.ts', 'run10-widgets-status.spec.ts',
    'run11-nutrients.spec.ts', 'sleep-balance-focus-aj.spec.ts', 'slogan-gap-af.spec.ts', 'spending-ai.spec.ts',
    'trusted-types-trial.spec.ts', 'universe-guided-aj.spec.ts', 'wealth-v2.spec.ts', 'webkit-smoke.spec.ts',
    'weekly-review.spec.ts', 'whats-new.spec.ts', 'your-ai.spec.ts', 'zigi-emotions.spec.ts',
    'zigi-simulated-day.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-companion-guarded.spec.ts', 'av-journal-today.spec.ts', 'av-money-search.spec.ts',
    'av2-journal-import.spec.ts',
    'av2-compare-report.spec.ts',
    'av2-money-notices.spec.ts',
    'av2-weekday-targets.spec.ts',
    'av2-week-day.spec.ts',
    'revb1-erase-stores.spec.ts',
    'av2-money-alerts.spec.ts',
    'av2-template-gallery.spec.ts',
    'av2-revb2a-task-versions.spec.ts',
    'av2-money-left-month.spec.ts',
    'av2-library-filters.spec.ts',
    'av2-planned-workouts.spec.ts',
    'av2-journal-ebook.spec.ts',
    'av2-revb3c-notes-folds.spec.ts',
  ],
  // Shard 13, 67.3 worker-min: about 33.9 min of tests at two workers in file order, 36.1 in any order.
  [
    'ah-showcase-reset.spec.ts', 'ao/header-consistency.spec.ts', 'ap/ap-health-mood-tags.spec.ts',
    'ap/ap-money-cash-flow.spec.ts', 'focus-return.spec.ts', 'footer-links-moved.spec.ts',
    'fr17-habit-more-options.spec.ts', 'governance-vote.spec.ts', 'grok53/ai/al-agents-help.spec.ts',
    'grok53/ai/al-zigi-idle.spec.ts', 'grok53/ai/l7-fifth-answers.spec.ts', 'grok53/ai/l7-fourth-answers.spec.ts',
    'grok53/chain/pr-036-040-earn-dated.spec.ts', 'grok53/checklist/al-second-pass.spec.ts',
    'grok53/checklist/l5-fifth-pass.spec.ts', 'grok53/first-run/nb-041-no-goal-tiles.spec.ts',
    'grok53/goals/wizard-milestones.spec.ts', 'grok53/habits/al-third-habits.spec.ts',
    'grok53/health/mo-018-view-links.spec.ts', 'grok53/health/mo-104-blank-names.spec.ts',
    'grok53/health/mo-149-coach-readings.spec.ts', 'grok53/health/pr-018-timer-minimums.spec.ts',
    'grok53/hud/hud-review2.spec.ts', 'grok53/p14/part14-earlier.spec.ts', 'grok53/p14a/af15-p3-academy-bubble.spec.ts',
    'grok53/p15/life-p15b-built.spec.ts', 'grok53/release/rr-life.spec.ts',
    'grok53/settings/bn-029-102-time-zone.spec.ts', 'grok53/settings/search-ls-005-047-ndv-10.spec.ts',
    'grok53/shell/l10a-second-pass.spec.ts', 'grok53/wealth/l1-pass5-wealth.spec.ts', 'guide.spec.ts',
    'holdings-import.spec.ts', 'hostile-files-x.spec.ts', 'install-guide.spec.ts', 'journeys/j05-notifications.spec.ts',
    'local-simulation-backup.spec.ts', 'markets-table.spec.ts', 'motion-polish.spec.ts', 'persona-z.spec.ts',
    'platform-habits.spec.ts', 'quick-add-line.spec.ts', 'run10-dashboard-placement.spec.ts',
    'run10-private-vault.spec.ts', 'run11-goal-draft.spec.ts', 'run9-2-life.spec.ts', 'run9-2-security.spec.ts',
    'safe-screenshot.spec.ts', 'sync-offer-card.spec.ts', 'today-v2.spec.ts', 'wiring-2-photo-send.spec.ts',
    'zigi-alive.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-move-alert.spec.ts', 'av-task-minutes.spec.ts',
    'av2-journal-media.spec.ts',
    'av2-diary-times.spec.ts',
    'av2-money-reimport.spec.ts',
    'av2-workout-progress.spec.ts',
    'av2-habit-imports.spec.ts',
    'revb1-journal-media-export.spec.ts',
    'av2-money-own-budgets.spec.ts',
    'av2-thought-check.spec.ts',
    'av2-copy-clear-day.spec.ts',
    'av2-money-needs-waterfall.spec.ts',
    'av2-meal-readings.spec.ts',
    'av2-runna-r4.spec.ts',
    'av2-notes-archive.spec.ts',
    'av2-revb3c-sealed.spec.ts',
  ],
  // Shard 14, 68.5 worker-min: about 34.4 min of tests at two workers in file order, 36.1 in any order.
  [
    'ah-data-safety.spec.ts', 'ap/ap-health-symptoms.spec.ts', 'ap/first-five.spec.ts',
    'ap/send-feedback-details.spec.ts', 'at/trust-round-trip.spec.ts', 'checklist-phone-ag-polish.spec.ts',
    'consumer-first-x1.spec.ts', 'g1b-recent-categories.spec.ts', 'g1b-review-cards.spec.ts', 'goals-v2.spec.ts',
    'grok53/ai/al-second-pass.spec.ts', 'grok53/ai/al-third-pass.spec.ts', 'grok53/checklist/l5-fourth-pass.spec.ts',
    'grok53/health/mo-110-journal-1900.spec.ts', 'grok53/health/mo-153-meal-menu-name.spec.ts',
    'grok53/hud/sweep4-morph.spec.ts', 'grok53/release/final-shell.spec.ts',
    'grok53/settings/settings-switches-sweep.spec.ts', 'grok53/settings/sweep3-settings-help.spec.ts',
    'grok53/settings/tk-184-sticky-index-768.spec.ts', 'grok53/shell/sweep2-shell.spec.ts',
    'grok53/wealth/l1-pass4-wealth.spec.ts', 'grok53/wealth/p14d-wealth-375.spec.ts', 'habit-paint-first.spec.ts',
    'health-decimal-comma.spec.ts', 'health.spec.ts', 'help-page.spec.ts', 'journeys/j06-data-safety.spec.ts',
    'nova-workflows.spec.ts', 'platform-visual.spec.ts', 'product-shell.spec.ts', 'product-visual.spec.ts',
    'push-reminders.spec.ts', 'remember-device.spec.ts', 'restore-backup.spec.ts', 'run10-goal-creator.spec.ts',
    'run10-habit-actions.spec.ts', 'session-x-findings.spec.ts', 'sidebar-note-af.spec.ts', 'sidebar-sky-af.spec.ts',
    'sign-out-others.spec.ts', 'staking-real-confirm.spec.ts', 'today-scene.spec.ts', 'ui-evidence.spec.ts',
    'wiring-review.spec.ts', 'zigi-face-z.spec.ts', 'zigi-help-settings.spec.ts', 'zigi-proactive.spec.ts',
    'zigi-question-context.spec.ts', 'zigi-robustness.spec.ts', 'zigi-safety.spec.ts',
    // Session AV (ADR-045 D-CI2002): moved from shard 2 (111 worker-min, 59 of its 60 min in CI 2002).
    'av-keep-data.spec.ts',
    'av2-zigi-hello.spec.ts',
    'av2-money-budgets-plan.spec.ts',
    'av2-routine-library.spec.ts',
    'av2-mood-notify.spec.ts',
    'av2-curve-reminders.spec.ts',
    'av2-project-rules.spec.ts',
    'av2-revb2a-payee.spec.ts',
    'av2-journal-quote.spec.ts',
    'av2-task-look.spec.ts',
    'av2-journal-format.spec.ts',
    'av2-revb3c-grid.spec.ts',
    'av2-notes-tags.spec.ts',
    'av2-polish-today.spec.ts',
  ],
];

/** Measured worker-minutes per list (the comments above); a new spec goes to the smallest. */
export const MAIN_SHARD_MINUTES: readonly number[] = [81, 81.2, 81, 80.7, 81, 81, 81, 80.7, 81, 81, 81, 80.7, 80.8, 81];
export const MAIN_SHARD_MINUTES: readonly number[] = [79, 79.2, 79, 79.7, 79, 79, 79, 79.7, 79, 79, 79, 79.7, 79.8, 79];

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
