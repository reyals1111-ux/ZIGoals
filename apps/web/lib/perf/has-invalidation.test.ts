import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from 'vitest';
import {lastCompound, wideHasSelectors, widensHasInvalidation} from './has-invalidation';
import {firstScreenControls} from '../../components/ai/launcher-rest';

const WEB = join(__dirname, '..', '..');
function cssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...cssFiles(path)); else if (name.endsWith('.css')) out.push(path);
  }
  return out;
}

describe('the :has() invalidation guard (Session AK P8b)', () => {
  it('reads the last compound', () => {
    expect(lastCompound(':root:has(.a .b) .workspace > .workspace-status > span')).toBe('span');
    expect(lastCompound('.x:has(> :is(.a, .b)) > :first-child')).toBe(':first-child');
    expect(lastCompound('.panel:has(:focus-visible)')).toBe('.panel:has(:focus-visible)');
  });
  it('flags a :has() before a last part with no class, id or attribute (also inside :where or :not only)', () => {
    expect(widensHasInvalidation(':root .h:has(> .o) > :first-child')).toBe(true);
    expect(widensHasInvalidation(':root:has(.a .b) .w > .s > span')).toBe(true);
    expect(widensHasInvalidation('.b:has(.n) .n strong:where([data-x])')).toBe(true);
    expect(widensHasInvalidation(':root:has(.o[open]) .c > :not(.w, .p)')).toBe(true);
  });
  it('passes a subject :has(), and a last part with a class, id or attribute', () => {
    expect(widensHasInvalidation('.panel:has(:focus-visible)')).toBe(false);
    expect(widensHasInvalidation(':root .h > :first-child:has(~ :is(.o, .p)):not(:has(~ :is(p, h2):not(:first-child)))')).toBe(false);
    expect(widensHasInvalidation(':root:has(.a .b) .w > :where(.s) > span[role="status"]')).toBe(false);
    expect(widensHasInvalidation(':root:has(.l[data-size=l]) .today-rail')).toBe(false);
    expect(widensHasInvalidation(':root .a:has(.b) > :is(.c, .d)')).toBe(false);
  });
  // Known and reported (Session AK P8b), not changed here: the PROTECTED Checklist's overlay hides the shell with two
  // `:not()` rules. They apply on /app/checklist only (checklist.css loads with the Checklist page); a fix that keeps the
  // look needs an attribute set on <html> while the overlay is open (script on a route with ~0 weight headroom), so it is
  // left to the owner's call. Nothing may join this list.
  const KNOWN = [
    'components/checklist/checklist.css: :root:has(.checklist-overlay[open]) .app-content > :not(.workspace, .private-read-delay)',
    'components/checklist/checklist.css: :root:has(.checklist-overlay[open]) .workspace > :not(main, .aa-toast-region)',
  ];
  it('no stylesheet of the app widens it (one such rule restyled the whole page on every change of the tree)', () => {
    const offenders: string[] = [];
    for (const dir of ['app', 'components', 'themes']) for (const file of cssFiles(join(WEB, dir)))
      for (const selector of wideHasSelectors(readFileSync(file, 'utf8'))) offenders.push(`${relative(WEB, file)}: ${selector}`);
    expect(offenders.filter(o => !KNOWN.includes(o))).toEqual([]);
  });
});

describe('firstScreenControls (Session AK P8b): sections the browser skips are never measured', () => {
  const box = (top: number) => ({left: 0, top, right: 100, bottom: top + 44, width: 100, height: 44});
  const control = (top: number, visible?: boolean) => {
    let measured = 0;
    const el = {getBoundingClientRect: () => { measured++; return box(top); }, ...(visible === undefined ? {} : {checkVisibility: (o?: {contentVisibilityAuto?: boolean}) => (o?.contentVisibilityAuto ? visible : true)})};
    return {el, measured: () => measured};
  };
  const doc = (els: unknown[]) => ({querySelectorAll: () => els}) as unknown as Document;
  it('a control inside a skipped (content-visibility: auto, off screen) section is left out without reading its box', () => {
    const shown = control(100, true), skipped = control(5000, false);
    expect(firstScreenControls(doc([shown.el, skipped.el]), 800)).toEqual([{left: 0, top: 100, right: 100, bottom: 144}]);
    expect(shown.measured()).toBe(1);
    expect(skipped.measured()).toBe(0);
  });
  it('without checkVisibility every control is measured as before (one below the fold still left out by its box)', () => {
    const a = control(100), b = control(900);
    expect(firstScreenControls(doc([a.el, b.el]), 800)).toEqual([{left: 0, top: 100, right: 100, bottom: 144}]);
    expect(a.measured()).toBe(1);
    expect(b.measured()).toBe(1);
  });
});
