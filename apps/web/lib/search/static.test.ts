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
    expect(hrefs).toHaveLength(14); // Session AF: Earn joined the money group (ADR-028)
    for (const href of hrefs) expect(PAGES.map(p => p.href)).toContain(href);
    const settings = [read('../../app/app/settings/page.tsx'), ...['pages-settings', 'time-zone-settings', 'wrap-up-settings', 'chess-settings'].map(f => read(`../../components/settings/${f}.tsx`)), read('../../components/ai/ai-settings-section.tsx'), read('../../components/import/switch-import.tsx')].join('\n');
    for (const s of SETTINGS.filter(x => x.href.includes('#'))) expect(settings, s.href).toMatch(new RegExp(`id=["{]['"]?${s.href.split('#')[1]}['"]?`));
  });
});
