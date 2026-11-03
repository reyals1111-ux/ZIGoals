import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {PALETTE_ACTIONS, SUGGESTED_ACTIONS, actionsOnly, effectLine, goalContributionActions, searchActions} from './actions';

const APP = join(__dirname, '..', '..', 'app', 'app');
const routeExists = (href: string) => { const path = href.split(/[?#]/)[0]!.replace(/^\/app\/?/, ''); return existsSync(join(APP, path, 'page.tsx')); };

describe('the search palette\'s actions (Session AK, F5d)', () => {
  it('finds the actions people name', () => {
    const first = (q: string) => searchActions(PALETTE_ACTIONS, q)[0]?.id;
    expect(first('log water')).toBe('action:log-water');
    expect(first('water')).toBe('action:log-water');
    expect(first('start focus')).toBe('action:start-focus');
    expect(first('add contribution')).toBe('action:add-contribution');
    expect(first('open review')).toBe('action:open-review');
    expect(first('open agenda')).toBe('action:open-agenda');
    expect(first('agenda')).toBe('action:open-agenda');
    expect(first('ics')).toBe('action:export-calendar');
    expect(first('wrapped')).toBe('action:open-wrapped');
    expect(searchActions(PALETTE_ACTIONS, 'xyzzy')).toEqual([]);
    expect(searchActions(PALETTE_ACTIONS, '')).toEqual([]);
    expect(searchActions(PALETTE_ACTIONS, 'add', 3)).toHaveLength(3);
  });
  it('">" asks for actions only; ">" alone lists them', () => {
    expect(actionsOnly('>water')).toBe(true);
    expect(actionsOnly('water')).toBe(false);
    expect(searchActions(PALETTE_ACTIONS, '>water')[0]!.id).toBe('action:log-water');
    expect(searchActions(PALETTE_ACTIONS, '>', 50)).toHaveLength(PALETTE_ACTIONS.length);
  });
  it('every action opens a real page of the app and never writes by itself', () => {
    expect(new Set(PALETTE_ACTIONS.map(a => a.id)).size).toBe(PALETTE_ACTIONS.length);
    for (const a of PALETTE_ACTIONS) {
      expect(a.href, a.id).toMatch(/^\/app(?:[/?#]|$)/);
      expect(routeExists(a.href), a.href).toBe(true);
      expect(['opens', 'confirm']).toContain(a.effect);
    }
    for (const id of SUGGESTED_ACTIONS) expect(PALETTE_ACTIONS.some(a => a.id === id)).toBe(true);
    expect(effectLine({effect: 'confirm'})).toContain('nothing is saved until you confirm');
    expect(effectLine({effect: 'opens'})).toContain('nothing is saved');
  });
  it('the intents the actions use are ones their pages answer', () => {
    const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
    expect(read('components/shortcut-host.tsx')).toMatch(/which === 'water'/);
    expect(read('components/shortcut-host.tsx')).toMatch(/which === 'ask'/);
    expect(read('components/health/health-app.tsx')).toContain('searchParams.get("add") === "entry"');
    expect(read('components/habits/habits-workspace.tsx')).toContain('get("add") === "habit"');
    expect(read('components/platform/wealth-view.tsx')).toContain('<ActionIntent value="asset"');
    expect(read('components/platform/goal-intelligence.tsx')).toContain('param="contribute" value="1"');
    expect(read('components/universe/focus-garden.tsx')).toContain('id="focus"');
    expect(read('components/agenda/agenda-page.tsx')).toContain('param="export" value="1"');
    expect(read('components/wrapped/wrapped-door.tsx')).toContain("param: 'wrapped', value: 'open'");
  });
  it('one "Add a contribution to …" per active, non-project goal, opening its preview-and-confirm flow', () => {
    const list = goalContributionActions([
      {id: '9201', name: 'Fictional fund', status: 'active', type: 'VALUE'},
      {id: '9202', name: 'Fictional done', status: 'completed', type: 'VALUE'},
      {id: '9203', name: 'Fictional project', status: 'active', type: 'PROJECT'},
      {id: 'local:x', name: 'Fictional local', status: 'active', type: 'VALUE'},
    ]);
    expect(list).toEqual([expect.objectContaining({id: 'action:contribute:9201', title: 'Add a contribution to Fictional fund', href: '/app/goals/tracked/9201?contribute=1', effect: 'confirm'})]);
    expect(searchActions([...PALETTE_ACTIONS, ...list], 'contribute fictional')[0]!.id).toBe('action:contribute:9201');
    expect(goalContributionActions(Array.from({length: 30}, (_, i) => ({id: String(i), name: `G${i}`, status: 'active', type: 'VALUE'})))).toHaveLength(20);
  });
});
