import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

/**
 * Session AK P3 (NOVA_DESIGN_REVIEW.md ND-6): NOVA's style sheets load as separate chunks, and the order they arrive in
 * decides which rule wins. Two sheets that style the same class with different values therefore change the page by load
 * order: the guide's `.nova-check` stacked View controls' checkboxes once the right panel had loaded setup.css, and
 * `.nova-send`, `.nova-setup-card` and `.nova-tool` meant different things in different sheets.
 *
 * The rule checked here: a class that a sheet styles directly (the selector's last part is that class alone, optionally
 * inside NOVA's own scope roots or a theme root) belongs to ONE sheet. Contextual overrides (`.nova-chat .nova-btn`) are a
 * sheet deliberately styling another's class inside its own part, and are allowed. A same-valued repeat is not a conflict.
 */
const NOVA = fileURLToPath(new URL('../../components/nova', import.meta.url));
const SCOPE = /^(?::root(?:\[[^\]]*\])*|html(?:\[[^\]]*\])*|\.nova-root|\.nova-frame(?:\[[^\]]*\])*|\.nova-sheet(?:\[[^\]]*\])*)$/;

function sheets(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sheets(path) : name.endsWith('.css') ? [path] : [];
  });
}
type Rule = {selector: string; decls: Map<string, string>};
/** Top-level rules only (rules inside @media/@supports/@container are conditional overrides by design). */
export function topLevelRules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, ''), out: Rule[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    // Find the matching close brace (nested blocks for at-rules).
    let depth = 1, j = open + 1;
    while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
    const body = text.slice(open + 1, j - 1);
    if (!head.startsWith('@')) {
      const decls = new Map<string, string>();
      for (const part of body.split(';')) {
        const colon = part.indexOf(':');
        if (colon > 0) decls.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '));
      }
      for (const selector of head.split(',')) out.push({selector: selector.trim().replace(/\s+/g, ' '), decls});
    }
    i = j;
  }
  return out;
}
/** The class a selector styles directly, or null when it is contextual (styled inside another part) or not a plain class. */
export function ownedClass(selector: string): string | null {
  const parts = selector.replace(/:not\(#\\-\)/g, '').split(/\s*[>+~]\s*|\s+/).filter(Boolean);
  const last = parts.at(-1), m = last?.match(/^\.([a-z0-9-]+)$/i);
  if (!m) return null;
  return parts.slice(0, -1).every(p => SCOPE.test(p)) ? m[1]! : null;
}

describe('NOVA style sheets do not fight over a class (ND-6)', () => {
  it('finds the sheets', () => { expect(sheets(NOVA).length).toBeGreaterThan(4); });
  it('a class styled directly with conflicting values belongs to one sheet only', () => {
    const owners = new Map<string, {file: string; decls: Map<string, string>}[]>();
    for (const file of sheets(NOVA)) for (const rule of topLevelRules(readFileSync(file, 'utf8'))) {
      const cls = ownedClass(rule.selector);
      if (!cls) continue;
      const list = owners.get(cls) ?? [];
      list.push({file: relative(NOVA, file), decls: rule.decls});
      owners.set(cls, list);
    }
    const conflicts: string[] = [];
    for (const [cls, list] of owners) {
      for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
        const x = list[a]!, y = list[b]!;
        if (x.file === y.file) continue;
        for (const [prop, value] of x.decls) if (y.decls.has(prop) && y.decls.get(prop) !== value) conflicts.push(`.${cls} { ${prop} } in ${x.file} and ${y.file}`);
      }
    }
    expect([...new Set(conflicts)]).toEqual([]);
  });
  it('the checker sees a collision, and leaves contextual overrides alone', () => {
    expect(ownedClass('.nova-check')).toBe('nova-check');
    expect(ownedClass('.nova-root .nova-setup-card:not(#\\-)')).toBe('nova-setup-card');
    expect(ownedClass(':root[data-theme=light] .nova-root .nova-x')).toBe('nova-x');
    expect(ownedClass('.nova-chat .nova-btn')).toBeNull();
    expect(ownedClass('.nova-send:hover')).toBeNull();
    const rules = topLevelRules('/* x */ .a, .b { color: red; display: grid } @media (x) { .a { color: blue } } .c{}');
    expect(rules.map(r => r.selector)).toEqual(['.a', '.b', '.c']);
    expect(rules[0]!.decls.get('display')).toBe('grid');
  });
});
