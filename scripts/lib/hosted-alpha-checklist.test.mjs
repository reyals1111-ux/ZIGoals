import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {CHECKLIST_PATH, CHECKLIST_SENTINELS, CHECKLIST_STAGE, checklistStage, doneName} from './hosted-alpha-checklist.mjs';
import {SENTINELS, VERIFIER_STAGES} from './hosted-alpha-stages.mjs';

// Session AF (L3; ADR-028 H57): the Checklist stage module the lead appends as stage 10. These checks keep its words and
// selectors tied to the app's own source, so a renamed button fails here instead of the owner's live check.
const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const source = read('./hosted-alpha-checklist.mjs'), code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the Checklist verifier stage (stage 10, appended)', () => {
  test('its shape: number 10, browser, not live-only, recorded by the verifier; existing numbers unchanged', () => {
    expect(CHECKLIST_STAGE).toMatchObject({number: 10, key: 'checklist', browser: true, liveOnly: false, reportsItself: false});
    expect(CHECKLIST_STAGE.run).toBe(checklistStage);
    expect(Object.isFrozen(CHECKLIST_STAGE)).toBe(true);
    // Wired by the lead (Session AF): appended last, exactly once, after the Earn stage 9; stages 1–8 keep their numbers and order.
    const numbers = VERIFIER_STAGES.map(s => s.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(VERIFIER_STAGES.filter(s => s.key === 'checklist')).toEqual([CHECKLIST_STAGE]);
    expect(VERIFIER_STAGES.at(-1)).toBe(CHECKLIST_STAGE);
  });
  test('the sentinel is fictional, unique and never a secret-like value', () => {
    expect(CHECKLIST_SENTINELS.habit).toBe('Verifier orbit sip 7f3e');
    // Wired by the lead: the privacy check looks for it in every captured request, exactly once in the list.
    expect(SENTINELS.filter(value => value === CHECKLIST_SENTINELS.habit)).toHaveLength(1);
    expect(CHECKLIST_SENTINELS.habit).not.toMatch(/@|https?:|key|token|secret/i);
  });
  test('browser-local only: no request of its own, no wallet, no import.meta or top-level await', () => {
    expect(code).not.toMatch(/\bfetch\(|XMLHttpRequest|keplr|signAndBroadcast|import\.meta/i);
    expect(code.split('\n').filter(line => /^\s*await /.test(line) && !/^\s{2,}/.test(line))).toEqual([]);
  });
  test('its words and selectors are the app’s own', () => {
    const star = read('../../apps/web/components/checklist/star-toggle.tsx'), page = read('../../apps/web/components/checklist/checklist-page.tsx');
    const adapters = read('../../apps/web/lib/checklist/adapters.ts'), toast = read('../../apps/web/components/ui/undo-toast.tsx'), completion = read('../../apps/web/components/habits/habit-completion.tsx');
    expect(star).toContain('`Star ${label} for your Checklist path`');
    expect(star).toContain('`${label} is on your Checklist path. Take it off`');
    expect(page).toContain('<NebulaFlow identity="checklist-title">Your orbit</NebulaFlow>');
    expect(page).toContain('checklist-progress-line');
    expect(page).toContain("`${done} of ${total} ${total === 1 ? 'dot' : 'dots'} today`");
    expect(adapters).toContain('message: `${dot.label} logged for ${forDay(day, ctx.date)}.`');
    expect(adapters).toContain("undone: `${dot.label}: back as it was.`");
    expect(toast).toContain('className="aa-toast-undo"');
    expect(completion).toContain('`${day.status === "complete" ? "Undo completion for" : "Complete"} ${habit.title}`');
    expect(CHECKLIST_PATH).toBe('/app/checklist');
  });
  test('a done dot is named by its label, its note and "done" (the path engine’s words)', () => {
    expect(doneName('Verifier orbit sip 7f3e').test('Verifier orbit sip 7f3e: 1 time: done')).toBe(true);
    expect(doneName('Verifier orbit sip 7f3e').test('Verifier orbit sip 7f3e: done')).toBe(true);
    expect(doneName('Verifier orbit sip 7f3e').test('Verifier orbit sip 7f3e: not done yet')).toBe(false);
    expect(doneName('a.b (c)').test('a.b (c): done')).toBe(true);
  });
});
