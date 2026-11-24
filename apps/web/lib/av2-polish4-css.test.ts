import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';

/**
 * Session AV lane 2 (polish4, owner follow-up 6 step 4): the lane-2 screens brought up to the readability rules. The
 * browser specs (tests/av2-polish4-*.spec.ts) measure the pages; this keeps the rules and the markup that make them so
 * (jsdom draws no layout): section titles white → nebula (NebulaFlow, the existing token), body copy 15 px, fields 16 px
 * on a phone, 44 × 44 targets, chart axis words in HTML at 14 px, one name per action ("Save", not "Keep"), and Dutch
 * buttons where a practice is offered in Dutch.
 */
const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = (path: string) => readFileSync(join(WEB, path), 'utf8');
const css = (path: string) => raw(path).replace(/\/\*[\s\S]*?\*\//g, '');

describe('section titles white → nebula', () => {
  const TITLES: [string, string][] = [
    ['components/game/month-theme-panel.tsx', 'journey-theme-off'], ['components/game/month-theme-panel.tsx', 'journey-theme'],
    ['components/game/rebirth.tsx', 'journey-rebirth'], ['components/health/body-figures.tsx', 'body-figures-title'],
    ['components/health/food-plus/nutrient-timing.tsx', 'nutrient-timing-title'], ['components/health/food-plus/oracle.tsx', 'food-oracle-title'],
    ['components/health/plus/feelings-card.tsx', 'av2-feelings-title'], ['components/health/plus/feelings-card.tsx', 'av2-graph-title'],
    ['components/health/r3/weigh-in.tsx', 'weigh-in-title'], ['components/health/r4/sleep-parts.tsx', 'r4-timing-title'],
    ['components/health/sleep/sleep-usual.tsx', 'sleep-usual-title'], ['components/journal/journal-page.tsx', 'journal-files-title'],
    ['components/notes/notes-workspace.tsx', 'note-canvas-title'], ['components/tasks/tasks-page.tsx', 'tasks-files-title'],
    ...['shoes', 'races', 'goals', 'report', 'library'].map(k => ['components/health/workouts/workouts-view.tsx', `workouts-${k}-title`] as [string, string]),
  ];
  test.each(TITLES)('%s: the %s title flows white → nebula', (file, identity) => {
    expect(raw(file)).toMatch(new RegExp(`<h2 [^>]*>(?:<span aria-hidden="true">[^<]*</span>)?<NebulaFlow identity="${identity}">`));
  });
});

test('body copy reads at 15 px', () => {
  expect(css('components/health/health-aa.css')).toContain('.health-extra-empty p, .health-meal-empty p { margin: 0; font-size: .9375rem; }');
  expect(css('components/health/r6/body-r6.css')).toContain('.r6-how p { font-size: 15px; }');
  expect(css('components/health/r6/body-r6.css')).toMatch(/\.r6-help-line \{[^}]*font-size: 15px; \}/);
  expect(css('components/help/help.css')).toContain('.help-search-chain > p { margin: 0; font-size: 15px; }');
  expect(css('components/help/help.css')).toMatch(/\.help-chain-note \{[^}]*font-size: 15px;/);
  expect(css('components/journal/journal.css')).toContain('.journal-import-skipped ul{margin:0;padding-left:18px;font-size:15px;');
  expect(css('components/wealth/spending/insights/insights.css')).toContain('.money-avg-line{margin:0;font-size:15px;');
});

test('fields are 16 px on a phone (no iOS zoom)', () => {
  expect(css('components/journal/entry-format.css')).toContain('@media (max-width: 900px) { .journal-format select { font-size: 16px; } }');
  expect(css('components/notes/notes.css')).toContain('@media (max-width: 900px) { .note-marks select, .notes-board-card select, .note-table-grid input { font-size: 16px; } }');
  expect(css('components/health/r4/health-r4.css')).toContain(':root :is(.r4-plan, .r4-races) .health-form .field :is(input, select) { font-size: 16px; }');
});

test('targets are at least 44 × 44', () => {
  expect(css('components/journal-prompts/prompt-picker.css')).toMatch(/\.prompt-picker-own \.text-link \{[^}]*min-height: 44px; min-width: 44px;/);
  expect(css('components/tasks/tasks.css')).toMatch(/\.tasks-links button\.text-link \{[^}]*min-height: 44px; min-width: 44px;/);
  expect(css('components/journal/journal.css')).toMatch(/\.journal-theme-choice\{[^}]*min-height:44px;min-width:44px;/);
  expect(css('components/notes/notes.css')).toMatch(/\.note-look-options label \{[^}]*min-height: 44px; min-width: 44px;/);
  expect(css('components/wealth/spending/money-r5.css')).toContain('.money-ytd-open{min-height:44px;min-width:44px;');
  expect(css('components/import/import.css')).toContain('.switch-more label.check { display: flex; align-items: center; gap: 8px; min-height: 44px; }');
});

test('chart axis words are HTML at 14 px, not SVG text that shrinks with the chart', () => {
  for (const [tsx, sheet, prefix] of [['components/habits/habit-longer-history.tsx', 'components/habits/habit-longer-history.css', 'habit-longer'], ['components/scales/scale-stats.tsx', 'components/scales/your-scales.css', 'scale-stats']] as const) {
    const src = raw(tsx), rules = css(sheet);
    expect(src).not.toMatch(/<text\b/);
    expect(src).toContain(`className="${prefix}-y" aria-hidden="true"`);
    expect(src).toContain(`className="${prefix}-x" aria-hidden="true"`);
    expect(rules).toMatch(new RegExp(`\\.${prefix}-y \\{[^}]*font-size: 14px;`));
    expect(rules).toMatch(new RegExp(`\\.${prefix}-x \\{[^}]*font-size: 14px;`));
  }
});

test('one name per action: a form that saves says Save (Keep it means "do not remove" elsewhere)', () => {
  for (const file of ['components/agenda/hour-grid-r5.tsx', 'components/notes/notes-canvas.tsx', 'components/wealth/account-sheet.tsx', 'components/wealth/credit-card.tsx', 'components/wealth/spending/people-money.tsx']) {
    expect(raw(file), file).not.toMatch(/>Keep(?: it)?</);
  }
  expect(raw('components/health/r4/runna-parts.tsx')).toContain("{max ? 'Change it' : 'Save'}");
  expect(raw('components/wealth/spending/quick-log.tsx')).toContain('onClick={keep}>Add to saved entries</button>');
});

test('a practice offered in Dutch has Dutch buttons', () => {
  const src = raw('components/health/meditation/today-practice.tsx');
  expect(src).toContain("{lang === 'nl' ? `Begin · ${g.minutes} min met de bel` : `Begin · ${g.minutes} min with the bell`}");
  expect(src).toContain("{lang === 'nl' ? 'Nog een' : 'Another one'}");
  expect(src).not.toContain('className="meditation-today-actions" lang="en"');
  expect(raw('components/health/workouts/routine-library-view.tsx')).toContain('<section className="av2-import" lang="en"');
});
