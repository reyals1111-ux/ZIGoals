import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (fixb6): round 6's controls each reachable by one name, and focus kept where a person was.
 * Read from the components' source (they render only in the browser specs).
 */
const src = (...p: string[]) => readFileSync(join(__dirname, '..', '..', 'components', ...p), 'utf8');
describe('fixb6: names', () => {
  it('Rename or merge a tag: Tag and Merge into are named by their own word, not their options', () => {
    const s = src('notes', 'tag-rename.tsx');
    expect(s).toContain('<span id={`${id}-tag`}>Tag</span><select aria-labelledby={`${id}-tag`}');
    expect(s).toContain('<span id={`${id}-into`}>Merge into</span><select aria-labelledby={`${id}-into`}');
  });
  it('the Select bar: its groups never share a name with the field inside them; its selects are named by their word', () => {
    const s = src('tasks', 'tasks-page-extras.tsx');
    expect(s).toContain('role="group" aria-label="Pick a day"');
    expect(s).toContain('role="group" aria-label="Labels"');
    expect(s).not.toContain('aria-labelledby={`${id}-label`}');
    expect(s).not.toContain('aria-labelledby={`${id}-day`}');
    for (const k of ['level', 'move', 'off']) expect(s).toContain(`<select aria-labelledby={\`\${id}-${k}\`}`);
  });
  it('an exercise’s star and a lift’s task button carry one name, as the picker’s star does', () => {
    expect(src('health', 'r6', 'exercise-own.tsx')).toContain('aria-label={`Favourite: ${exercise.name}`}');
    const l = src('health', 'r6', 'lifts.tsx');
    expect(l).toContain('aria-label={`Make it a task for today: ${line}`}');
    expect(l).not.toContain('<span className="sr-only">: {line}</span>');
  });
});
describe('fixb6: focus', () => {
  it('Reorder budgets moves focus once the new order is drawn, to the pressed arrow or the row’s other one', () => {
    const s = src('wealth', 'budgets', 'r6-budgets.tsx');
    expect(s).toContain('if (!focus || focus.from === list) return;');
    expect(s).toContain('at(focus.key) ?? (other ? at(other) : null)');
  });
  it('What lifts you keeps its field after an add, so focus stays in it', () => {
    const l = src('health', 'r6', 'lifts.tsx');
    expect(l).toContain("setDraft(''); setAdding(true); input.current?.focus();");
    expect(l).toContain('(editing || adding || !list.length)');
  });
});
