import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (fr-layout): guards for the friends' walks' first-screen and path fixes (the browser checks are in
 * tests/fr-layout-first-screen.spec.ts).
 */
const read = (...parts: string[]) => readFileSync(join(__dirname, '..', ...parts), 'utf8');
const css = (...parts: string[]) => read(...parts).replace(/\/\*[\s\S]*?\*\//g, '');
const block = (sheet: string, media: string) => { const start = sheet.indexOf(`@media ${media} {`); expect(start, media).toBeGreaterThanOrEqual(0); let depth = 0; for (let i = sheet.indexOf('{', start); i < sheet.length; i++) { if (sheet[i] === '{') depth++; else if (sheet[i] === '}' && --depth === 0) return sheet.slice(start, i + 1); } return ''; };

describe('Tasks (FR-L-5, FR-MAX-2, FR-S-7, FR-TJ-8)', () => {
  const nav = read('components', 'tasks', 'tasks-nav.tsx'), sheet = css('components', 'tasks', 'tasks.css');
  it('the views after the first row sit in one fold, toggled by a chip with aria-expanded and aria-controls', () => {
    expect(nav).toMatch(/className="tasks-nav-item tasks-nav-more-toggle" aria-expanded=\{more\} aria-controls=\{MORE_ID\}/);
    expect(nav).toMatch(/<div id=\{MORE_ID\} className="tasks-nav-more" data-open=\{more \? 'true' : undefined\}>\s*\{\/\*[^]*?<h3>Plan and views<\/h3>/);
    const fold = nav.slice(nav.indexOf('<div id={MORE_ID}'));
    for (const heading of ['Projects', 'Labels', 'Priority', 'Saved filters']) expect(fold).toContain(`<h3>${heading}</h3>`);
  });
  it('only a phone folds them: wider screens never show the chip', () => {
    expect(sheet).toMatch(/\.tasks-nav-more-item \{ display: none; \}/);
    const phone = block(sheet, '(max-width: 700px)');
    expect(phone).toMatch(/\.tasks-nav-more-item \{ display: block; \}/);
    expect(phone).toMatch(/\.tasks-nav-more:not\(\[data-open\]\) \{ display: none; \}/);
  });
});

describe('Journal (FR-L-6, FR-MAX-3, FR-S-8, FR-TJ-9)', () => {
  const page = read('components', 'journal', 'journal-page.tsx'), compose = read('components', 'journal', 'journal-compose.tsx'), good = read('components', 'journal', 'three-good-things.tsx');
  it('On this day comes after Write and before the entries', () => {
    const write = page.indexOf('aria-labelledby="journal-write"'), memory = page.indexOf('<OnThisDay '), entries = page.indexOf('aria-labelledby="journal-entries"');
    expect(write).toBeGreaterThan(0); expect(memory).toBeGreaterThan(write); expect(entries).toBeGreaterThan(memory);
  });
  it('Three good things starts folded and opens on #good-things; the question follows the entry box', () => {
    expect(good).toMatch(/useState\(false\)/);
    expect(good).toMatch(/<details id="good-things" className="good-things-fold" open=\{open \|\| undefined\}/);
    expect(good).toMatch(/location\.hash !== '#good-things'/);
    expect(compose.indexOf('className="journal-today-question"')).toBeGreaterThan(compose.indexOf('Today’s entry'));
  });
});

describe('Paths (FR-L-7, FR-MAX-10, FR-S-18, FR-TJ-11, FR-TJ-15, FR-S-9, FR-TJ-6, FR-TJ-10)', () => {
  it('the phone Settings list has a row to Your data at Restore', () => {
    expect(read('components', 'phone', 'phone-settings.tsx')).toContain('["Restore a backup", "Your data: an Export everything ZIP, part by part", "/app/settings/data#restore"]');
  });
  it('the encrypted backup and Export everything link to the restore; the data page jumps to it and holds it', () => {
    for (const file of [['components', 'private-vault-tools.tsx'], ['components', 'export-everything.tsx']]) expect(read(...file)).toContain('Your data → <Link className="text-link" href="/app/settings/data#restore">Restore from a backup</Link>');
    expect(read('app', 'app', 'settings', 'data', 'page.tsx')).toContain('href="#restore">Restore from a backup ↓</a>');
    expect(read('components', 'data-health', 'data-health-view.tsx')).toMatch(/useHashArrival\(/);
  });
  it('Settings leads to the Showcase Demo from its header, on a person\'s own profile', () => {
    expect(read('components', 'settings', 'showcase-slot.tsx')).toMatch(/return active \? null : <a className="text-link settings-showcase-door" href="#showcase">Try the Showcase Demo ↓<\/a>/);
    expect(read('app', 'app', 'settings', 'page.tsx')).toMatch(/Help &amp; feedback →<\/Link><ShowcaseDoor\/>/);
  });
  it('Today\'s "Enter the times" opens the night form; the first five open their forms; Health names Workouts', () => {
    expect(read('components', 'dashboard', 'today-focus.tsx')).toContain('href="/app/health?view=sleep#log-night">Enter the times →</Link>');
    expect(read('components', 'health', 'sleep', 'sleep-view.tsx')).toContain('<section className="panel sleep-log" id="log-night"');
    const five = read('components', 'onboarding', 'first-five.tsx');
    expect(five).toContain("href: '/app/health?add=entry'");
    expect(five).toContain("href: '/app/wealth#log-spending'");
    expect(read('components', 'platform', 'wealth-view.tsx')).toMatch(/useHashArrival\(id=>id==='log-spending'\?\{at:'spending'/);
    expect(read('components', 'wallet', 'address-lookup.tsx')).toMatch(/<section id=\{WATCH_ID\}/);
    expect(read('components', 'health', 'health-app.tsx')).toContain('<Link className="text-link health-hero-workouts" href="/app/health?view=workouts">Workouts →</Link>');
  });
});

describe('Habits (FR-TJ-7) and NOVA\'s Permissions (FR-TJ-1)', () => {
  it('empty time-of-day groups stay away once a habit exists; the insights wait for a check-in', () => {
    const sections = read('components', 'habits', 'habit-sections.tsx');
    expect(sections).toMatch(/const anyHabit = sections\.some\(section => section\.habits\.length > 0\);/);
    expect(sections).toMatch(/if \(empty && anyHabit\) return null;/);
    expect(read('components', 'habits', 'habits-workspace.tsx')).toMatch(/store\.data\.habits\.some\(h => h\.entries\.length > 0\) && \{id: "habits:consistency"/);
  });
  it('Allow Health comes before the scope switches', () => {
    const panel = read('components', 'nova', 'panels', 'permissions-panel.tsx');
    expect(panel.indexOf('className="nova-allow-health"')).toBeGreaterThan(0);
    expect(panel.indexOf('className="nova-allow-health"')).toBeLessThan(panel.indexOf('{NOVA_SCOPES.map(s => <Switch'));
  });
});
