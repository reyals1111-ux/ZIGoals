import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {GO_TO, GO_TO_SECTIONS, foldWords, goToFor, goToMatches, goToPages, goToScore, inNovaHash, type GoToNeed} from './go-to';

/**
 * Session AM: NOVA's "go to" list. Every address is checked against the app itself — the route's page file, the page's own
 * `?view=` / `?add=` readers and the anchors its components render — so the left bar never offers a place that is not there.
 */
const WEB = fileURLToPath(new URL('../..', import.meta.url));
const read = (path: string) => readFileSync(join(WEB, path), 'utf8');
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : name.endsWith('.tsx') ? [path] : [];
  });
}
const all = (need: GoToNeed) => { void need; return true; };
const first = (query: string, has: (need: GoToNeed) => boolean = all) => goToMatches(query, has)[0];

describe('NOVA go-to: the list', () => {
  it('ids and names are unique; every entry has English and Dutch words and a plain app address', () => {
    expect(new Set(GO_TO.map(e => e.id)).size).toBe(GO_TO.length);
    expect(new Set(GO_TO.map(e => `${e.where ?? ''}/${e.label}`)).size).toBe(GO_TO.length);
    for (const e of GO_TO) {
      expect(e.en.length, e.id).toBeGreaterThan(0);
      expect(e.nl.length, e.id).toBeGreaterThan(0);
      expect(e.href, e.id).toMatch(/^\/app\/[a-z/-]+(\?[a-z]+=[a-z0-9]+)?(#[a-z-]+)?$/);
      // Sentence case, no shouting: a name starts with a capital and is not all capitals (NOVA and ZIGi are names).
      expect(e.label, e.id).toMatch(/^[A-Z]/);
    }
  });
  it('holds the pages of every section, Today alone above them, and the places inside pages', () => {
    expect(goToPages(GO_TO, 'today').map(e => e.href)).toEqual(['/app/today']);
    expect(goToPages(GO_TO, 'pillars').map(e => e.label)).toEqual(['Goals', 'Habits', 'Health', 'Wealth']);
    expect(goToPages(GO_TO, 'day').map(e => e.label)).toEqual(['Agenda', 'Tasks', 'Checklist', 'Focus']);
    expect(goToPages(GO_TO, 'mind').map(e => e.label)).toEqual(['Notes', 'Journal', 'Life review']);
    expect(goToPages(GO_TO, 'money').map(e => e.label)).toEqual(['Bills', 'Budgets', 'Markets', 'Portfolio', 'Earn', 'Staking', 'Governance', 'Ecosystem']);
    expect(goToPages(GO_TO, 'more').map(e => e.label)).toEqual(['Journey', 'Stories', 'Day timeline', 'Activity', 'Music', 'Chess', 'Plans and prices', 'Help', 'Settings']);
    for (const s of GO_TO_SECTIONS) for (const e of goToPages(GO_TO, s)) expect(e.icon, e.id).toBeTruthy();
    expect(GO_TO.filter(e => !e.section).every(e => !!e.where)).toBe(true);
    expect(GO_TO.length).toBeGreaterThanOrEqual(80);
    // Welcome is not a page to list; neither is the share target.
    expect(GO_TO.some(e => /^\/app\/(welcome|share)\b/.test(e.href))).toBe(false);
  });
});

describe('NOVA go-to: every address is real', () => {
  const paths = [...new Set(GO_TO.map(e => e.href.split(/[?#]/)[0]!))];
  it('each path is a route of the app', () => {
    for (const path of paths) expect(existsSync(join(WEB, 'app', path, 'page.tsx')), path).toBe(true);
  });
  it('each ?view= and ?add= is one its page reads', () => {
    const health = read('components/health/health-app.tsx'), wealth = read('components/platform/wealth-view.tsx'), tasksNav = read('components/tasks/tasks-nav.tsx');
    const tasks = read('components/tasks/tasks-page.tsx'), notes = read('components/notes/notes-workspace.tsx'), habits = read('components/habits/habits-workspace.tsx');
    const healthViews = health.match(/const HASH_VIEWS[^\n]+/)![0], fullViews = health.match(/const FULL_VIEWS[^\n]+/)![0];
    const wealthViews = wealth.match(/WEALTH_VIEWS[^\n]+/)![0], taskViews = tasksNav.match(/const simple = [^\n]+/)![0], noteViews = notes.match(/const VIEWS = [^\n]+/)![0];
    const known: Record<string, (key: string, value: string) => boolean> = {
      '/app/health': (k, v) => k === 'view' ? new RegExp(`[{ ]${v}:`).test(healthViews) || fullViews.includes(`"${v}"`) : k === 'add' && health.includes(`get("add") === "${v}"`),
      '/app/wealth': (k, v) => k === 'view' && new RegExp(`[{,]${v}:`).test(wealthViews),
      '/app/tasks': (k, v) => k === 'view' ? taskViews.includes(`'${v}'`) : k === 'add' && tasks.includes("params.get('add')"),
      '/app/notes': (k, v) => k === 'view' ? noteViews.includes(`['${v}'`) : k === 'capture' && v === '1' && notes.includes("params.get('capture') === '1'"),
      '/app/habits': (k, v) => k === 'add' && habits.includes(`get("add") === "${v}"`),
      '/app/journey': (k, v) => (k === 'focus' && v === 'pomodoro' && read('components/universe/focus-garden.tsx').includes('focus=pomodoro')) || (k === 'wrapped' && read('components/wrapped/wrapped-door.tsx').includes(`{param: 'wrapped', value: '${v}'}`)),
    };
    const withQuery = GO_TO.filter(e => e.href.includes('?'));
    expect(withQuery.length).toBeGreaterThan(15);
    for (const e of withQuery) {
      const [path, rest] = e.href.split('?') as [string, string], [key, value] = rest.split('#')[0]!.split('=') as [string, string];
      expect(known[path]?.(key, value) ?? false, e.href).toBe(true);
    }
  });
  it('each anchor is one a component renders or follows', () => {
    const code = [...sources(join(WEB, 'components')), ...sources(join(WEB, 'app'))].map(f => readFileSync(f, 'utf8')).join('\n');
    const panels = read('components/nova/nova-dashboard.tsx').match(/const PANEL_HASH = \/\^#nova-\(([a-z|]+)\)\$\//)![1]!.split('|');
    const withHash = GO_TO.filter(e => e.href.includes('#'));
    expect(withHash.length).toBeGreaterThan(20);
    for (const e of withHash) {
      const hash = e.href.split('#')[1]!, nova = inNovaHash(e.href);
      const found = nova ? nova === '#briefs' ? code.includes("h === '#briefs'") : panels.includes(nova.slice('#nova-'.length))
        : code.includes(`id="${hash}"`) || code.includes(`anchor="${hash}"`) || code.includes(`"#${hash}"`);
      expect(found, e.href).toBe(true);
    }
  });
  it('an address inside NOVA is told apart, so it opens in place', () => {
    expect(inNovaHash('/app/nova#nova-permissions')).toBe('#nova-permissions');
    expect(inNovaHash('/app/nova#briefs')).toBe('#briefs');
    expect(inNovaHash('/app/nova/setup')).toBeNull();
    expect(inNovaHash('/app/health#water')).toBeNull();
  });
});

describe('NOVA go-to: what the words find', () => {
  it('page names and the deep places of the brief, in English and Dutch', () => {
    const cases: [string, string][] = [
      ['sleep', '/app/health?view=sleep'], ['slaap', '/app/health?view=sleep'], ['Sleep ', '/app/health?view=sleep'],
      ['water', '/app/health#water'], ['weight', '/app/health?view=weight'], ['gewicht', '/app/health?view=weight'],
      ['food', '/app/health?view=diary'], ['eten', '/app/health?view=diary'],
      ['bills', '/app/wealth?view=bills'], ['rekeningen', '/app/wealth?view=bills'], ['budget', '/app/wealth?view=budgets'],
      ['new goal', '/app/goals/new'], ['nieuw doel', '/app/goals/new'], ['add habit', '/app/habits?add=habit'], ['gewoonte toevoegen', '/app/habits?add=habit'],
      ['today’s tasks', '/app/tasks?view=today'], ["today's tasks", '/app/tasks?view=today'], ['taken van vandaag', '/app/tasks?view=today'],
      ['journal today', '/app/journal#journal-write'], ['dagboek vandaag', '/app/journal#journal-write'],
      ['permissions', '/app/nova#nova-permissions'], ['toestemmingen', '/app/nova#nova-permissions'],
      ['setup guide', '/app/nova/setup'], ['Hermes', '/app/nova/hermes'],
      ['goals', '/app/goals'], ['doelen', '/app/goals'], ['habits', '/app/habits'], ['gezondheid', '/app/health'], ['vermogen', '/app/wealth'],
      ['today', '/app/today'], ['vandaag', '/app/today'], ['agenda', '/app/agenda'], ['taken', '/app/tasks'], ['notities', '/app/notes'], ['dagboek', '/app/journal'],
      ['review', '/app/review'], ['settings', '/app/settings'], ['instellingen', '/app/settings'], ['help', '/app/help'], ['hulp', '/app/help'],
      ['journey', '/app/journey'], ['stories', '/app/stories'], ['timeline', '/app/timeline'], ['activity', '/app/activity'], ['music', '/app/music'], ['muziek', '/app/music'],
      ['chess', '/app/chess'], ['schaken', '/app/chess'], ['plans', '/app/plans'], ['markets', '/app/markets'], ['portfolio', '/app/portfolio'], ['earn', '/app/earn'],
      ['staking', '/app/staking'], ['governance', '/app/governance'], ['ecosystem', '/app/ecosystem'], ['checklist', '/app/checklist'], ['focus', '/app/journey#focus'],
      ['pomodoro', '/app/journey?focus=pomodoro#focus'], ['workout', '/app/health?view=workouts'], ['meditatie', '/app/health?view=meditation'], ['backup', '/app/settings#privacy'],
    ];
    for (const [words, href] of cases) expect(first(words)?.href, words).toBe(href);
  });
  it('a part of a word finds it as it is typed; words that name nothing find nothing', () => {
    expect(first('sle')?.label).toBe('Sleep');
    expect(first('médit')?.label).toBe('Meditation'); // accents are ignored
    expect(goToMatches('xyzzy', all)).toEqual([]);
    expect(goToMatches('   ', all)).toEqual([]);
    expect(goToMatches('what is the meaning of life', all)).toEqual([]);
    expect(goToScore(GO_TO[0]!, '')).toBeNull();
    expect(foldWords('Today’s  TASKS!')).toBe('today tasks');
  });
  it('a page comes before a place inside one, and the list is bounded', () => {
    expect(goToMatches('health', all).map(e => e.id)[0]).toBe('health');
    expect(goToMatches('tasks', all)[0]!.id).toBe('tasks');
    expect(goToMatches('a', all, 5)).toHaveLength(5);
    expect(goToMatches('s', all).length).toBeLessThanOrEqual(8);
  });
});

describe('NOVA go-to: only what is switched on', () => {
  it('a hidden page takes its places with it', () => {
    const noHealth = (need: GoToNeed) => need !== 'health';
    expect(goToFor(noHealth).some(e => e.href.startsWith('/app/health'))).toBe(false);
    expect(first('sleep', noHealth)).toBeUndefined();
    expect(first('weight', noHealth)).toBeUndefined();
    expect(first('goals', noHealth)?.href).toBe('/app/goals');
  });
  it('nothing of the chain shows until the person chose it; Governance needs its own switch', () => {
    const consumer = (need: GoToNeed) => !['markets', 'staking', 'portfolio', 'ecosystem', 'earn', 'governance', 'chain', 'chess', 'music'].includes(need);
    const shown = goToFor(consumer);
    for (const href of ['/app/markets', '/app/staking', '/app/portfolio', '/app/ecosystem', '/app/earn', '/app/governance', '/app/wealth/add-money', '/app/chess', '/app/music']) expect(shown.some(e => e.href.startsWith(href)), href).toBe(false);
    expect(goToPages(shown, 'money').map(e => e.label)).toEqual(['Bills', 'Budgets']);
    for (const words of ['staking', 'governance', 'markets', 'earn', 'vote', 'validators', 'stemmen']) expect(goToMatches(words, consumer).filter(e => /markets|staking|governance|earn|ecosystem|portfolio/.test(e.href)), words).toEqual([]);
    const withGovernance = (need: GoToNeed) => consumer(need) || need === 'governance' || need === 'staking';
    expect(first('governance', withGovernance)?.href).toBe('/app/governance');
  });
  it('an app switched off on this device is left out (Tasks, Notes, the Journal, the Agenda)', () => {
    const noTasks = (need: GoToNeed) => need !== 'tasks';
    expect(goToFor(noTasks).some(e => e.href.startsWith('/app/tasks'))).toBe(false);
    expect(goToPages(goToFor(noTasks), 'day').map(e => e.label)).toEqual(['Agenda', 'Checklist', 'Focus']);
  });
});
