import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {HELP_QUESTIONS, HELP_TOPICS, PAGES, SETTINGS} from './static';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const unescape = (s: string) => s.replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&hellip;/g, '…').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ');

describe('the search index of the app itself (Session AA-Cloud Part 4)', () => {
  it('lists every Help question and topic exactly as the Help page has them', () => {
    const help = read('../../components/help/help-page.tsx');
    const questions = [...help.matchAll(/<HelpQuestion id="([^"]*)" question="([^"]*)"/g)].map(m => [m[1], unescape(m[2]!)]);
    expect(HELP_QUESTIONS).toEqual(questions);
    for (const [id] of HELP_TOPICS) expect(help).toContain(`'${id}'`);
  });
  it('every navigation page is searchable, and every Settings anchor exists in Settings', () => {
    const nav = read('../../components/app-nav.tsx');
    const hrefs = [...nav.matchAll(/\["(\/app[^"]*)",/g)].map(m => m[1]!);
    expect(hrefs).toHaveLength(15); // Session AF: Earn and Governance joined the money group (ADR-028)
    for (const href of hrefs) expect(PAGES.map(p => p.href)).toContain(href);
    const settings = [read('../../app/app/settings/page.tsx'), ...['pages-settings', 'time-zone-settings', 'wrap-up-settings', 'chess-settings'].map(f => read(`../../components/settings/${f}.tsx`)), read('../../components/ai/ai-settings-section.tsx'), read('../../components/import/switch-import.tsx'), read('../../components/showcase-controls.tsx') /* Session AW: the Showcase slot's panel */,
      // Session AW (Part 3, deliberate): and every part Settings' later chunk loads (components/settings/settings-later.tsx), whose
      // anchors the Settings search index now names too.
      ...[...read('../../app/app/settings/page.tsx').matchAll(/from "\.\.\/\.\.\/\.\.\/components\/([^"]+)"/g)].filter(m => !m[1]!.endsWith('.css')).map(m => { try { return read(`../../components/${m[1]}.tsx`); } catch { return read(`../../components/${m[1]}.ts`); } }),
      ...[...read('../../components/settings/settings-later.tsx').matchAll(/from '\.\.?\/([^']+)'/g)].map(m => { const rel = m[0].includes("'../") ? `../../components/${m[1]}` : `../../components/settings/${m[1]}`; return read(`${rel}.tsx`); })].join('\n');
    // Session AW (Part 3, deliberate): SETTINGS is now Settings' own search index. That every one of its anchors exists in
    // Settings is proven in lib/settings-search/index.test.ts, which reads every source the page and its later chunk load (the
    // ZIGi body's and the per-module backup cards' template ids included): the same check, over more files. Here the hand
    // list's anchors, still on the page as before:
    for (const id of ['privacy', 'appearance', 'backup-restore', 'time-zone', 'habits-settings', 'market-data', 'diagnostics', 'send-feedback', 'point-tell', 'about-this-alpha']) expect(settings, id).toMatch(new RegExp(`id=["{]['"]?${id}['"]?`));
    for (const id of ['privacy', 'appearance', 'backup-restore', 'time-zone', 'habits-settings', 'market-data', 'diagnostics', 'send-feedback']) expect(SETTINGS.map(x => x.href), id).toContain(`/app/settings#${id}`);
    // The links to Settings' sub-page (Your data) land on an anchor of that page.
    for (const s of SETTINGS.filter(x => x.href.startsWith('/app/settings/data#'))) expect(read('../../components/data-health/data-health-view.tsx'), s.href).toMatch(new RegExp(`id="${s.href.split('#')[1]}"`));
  });
});
