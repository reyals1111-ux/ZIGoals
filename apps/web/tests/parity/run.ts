import {expect, type Page, type TestInfo} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {compare, type Diff, type Item, type Klass} from './classify';
import {collect} from './collect';
import {openDevice, openIn, writeTheme, type Theme} from './session';
import {openMore} from '../phone-nav';
import {isKnown} from './known';

/**
 * Session AF (L5a, Part 10.13, ADR-028 H75): one parity check — a route in a state, collected in Nebula, Light and Dark,
 * each compared with Nebula. The full result goes to test-results/theme-parity/ (scripts/parity-report.mjs folds every
 * file into docs/verification/session-af/theme-parity.md); the check fails on any difference H75 does not allow, listed as
 * route · state · element · property · Nebula → theme.
 */
export type State = 'showcase' | 'empty' | 'quick-add' | 'more' | 'folded';
export const ROUTES = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/wealth/calculator', '/app/markets', '/app/portfolio', '/app/staking', '/app/activity', '/app/settings', '/app/settings/data', '/app/help', '/app/chess', '/app/ecosystem', '/app/review', '/app/journey', '/app/earn', '/app/checklist', '/app/zigi', '/app/goals/new', '/app/timeline', '/app/stories'] as const;
export const STATES: readonly [string, State][] = [...ROUTES.map(r => [r, 'showcase'] as [string, State]), ['/app', 'empty'], ['/app/goals', 'empty'], ['/app', 'quick-add'], ['/app', 'more'], ['/app', 'folded']];

async function enter(page: Page, route: string, state: State, theme: Theme) {
  if (state === 'folded') await page.evaluate(() => { const write = (s: Storage, k: string) => { const v = JSON.parse(s.getItem(k) ?? '{"version":1}') as Record<string, unknown>; v.heroCollapsed = true; s.setItem(k, JSON.stringify(v)); }; write(localStorage, 'zigoals:ui-prefs:v1'); for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i)!; if (k.endsWith('zigoals:ui-prefs:v1')) write(sessionStorage, k); } });
  await openIn(page, route, theme);
  if (state === 'quick-add') { await page.getByRole('button', {name: '+ Quick add', exact: true}).first().click(); await expect(page.getByRole('dialog').first()).toBeVisible(); await page.waitForTimeout(400); }
  if (state === 'more') await openMore(page);
}

export async function parity(page: Page, info: TestInfo, route: string, state: State) {
  await openDevice(page, {showcase: state !== 'empty'});
  const snaps = {} as Record<Theme, Item[]>;
  // CI on a2c68959 (WebKit, /app · more): the More button's press feedback (scale .94, 160 ms back) was still easing when
  // Light was collected (its box 0.986 of Nebula's). Every theme is collected with its finite animations and transitions
  // done; endless loops (the owner-approved skies) are left running and never awaited.
  const finished = () => page.evaluate(() => Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map(a => a.finished.catch(() => undefined))));
  for (const theme of ['nebula', 'light', 'dark'] as const) { await enter(page, route, state, theme); await finished(); snaps[theme] = await collect(page); }
  await writeTheme(page, 'nebula');
  const out: {theme: Theme; counts: Partial<Record<Klass, number>>; mismatch: string | null; disallowed: (Diff & {known: boolean})[]}[] = [];
  for (const theme of ['light', 'dark'] as const) {
    const {diffs, mismatch} = compare(snaps.nebula, snaps[theme], theme);
    const counts: Partial<Record<Klass, number>> = {}; for (const d of diffs) counts[d.klass] = (counts[d.klass] ?? 0) + 1;
    out.push({theme, counts, mismatch, disallowed: diffs.filter(d => d.klass === 'DISALLOWED').map(d => ({...d, known: isKnown(route, state, d)}))});
  }
  const engine = page.context().browser()?.browserType().name() ?? 'chromium', project = engine === 'chromium' ? info.project.name : `${info.project.name} (${engine})`;
  const dir = join(info.project.outputDir, 'theme-parity'); mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, `${route.replace(/^\//, '').replace(/\//g, '_')}-${state}-${info.project.name}-${engine}.json`), JSON.stringify({route, state, project, elements: snaps.nebula.length, results: out}, null, 1));
  const line = (d: Diff, theme: Theme) => `${route} · ${state} · ${d.desc} [${d.path}] · ${d.prop} · ${d.nebula.slice(0, 160)} → ${theme}: ${d.other.slice(0, 160)}`;
  // Differences that live in another lane's files are named, not failed (tests/parity/known.ts lists each with its fix).
  for (const r of out) for (const d of r.disallowed) if (isKnown(route, state, d)) info.annotations.push({type: 'known theme difference (another lane’s file)', description: line(d, r.theme)});
  const report = out.flatMap(r => [...(r.mismatch ? [`${route} · ${state} · ${r.theme}: ${r.mismatch}`] : []), ...r.disallowed.filter(d => !isKnown(route, state, d)).map(d => line(d, r.theme))]);
  expect(snaps.nebula.length, 'elements collected').toBeGreaterThan(50);
  expect(report, report.join('\n')).toEqual([]);
}
