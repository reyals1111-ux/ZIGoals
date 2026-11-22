import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * Session AV lane 2 (r3-plan, review B3A-6): the row's energy chip has one class name, styled by a rule in a sheet the row
 * itself loads (so it is muted in every list: Tasks, Today, the Agenda, a goal, NOVA), with theme variables only.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, '..', '..', ...p), 'utf8');
describe('the energy chip’s style', () => {
  it('the class the row draws is the class the sheet styles, and the row loads that sheet', () => {
    const row = read('components', 'tasks', 'task-parts.tsx'), sheet = read('components', 'tasks', 'task-row-r3.css');
    expect(row).toContain('<span className="task-energy">Energy · ');
    expect(row).toContain("import './task-row-r3.css';");
    expect(sheet).toMatch(/\.task-energy \{ color: var\(--text-secondary, var\(--muted\)\); \}/);
    expect(sheet.replace(/\/\*[^]*?\*\//g, '')).not.toMatch(/#[0-9a-f]{3,8}\b|red|danger/i); // the rule, not its comment
    expect(read('components', 'tasks', 'tasks-r3.css')).not.toContain('.task-energy-chip');
  });
});
