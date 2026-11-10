import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {RELEASES, releaseHref} from './release-history';

// Session AL Part 15 (AL-COMPETITOR-GAP-178, C-DVG-90): Help's public release history.
const help = readFileSync(join(__dirname, '../../components/help/help-page.tsx'), 'utf8');
describe('release history', () => {
  it('newest first, each Alpha once, a day or a month as its date', () => {
    const first = RELEASES.map(r => Number(r.alpha.match(/#(\d+)/)![1]));
    expect(first).toEqual([...first].sort((a, b) => b - a));
    expect(new Set(RELEASES.map(r => r.alpha)).size).toBe(RELEASES.length);
    for (const r of RELEASES) expect(r.date, r.alpha).toMatch(/^(\d{1,2} (Oct|Nov|Dec) 2026|(October|November|December) 2026)$/);
    expect(RELEASES[0]).toMatchObject({alpha: '#53', date: '4 Nov 2026'});
  });
  it('every "Read more" points at a Help section or answer that exists; the list is a Section with its date', () => {
    for (const r of RELEASES) if (r.help) expect(help, r.help).toContain(r.question ? `<HelpQuestion id="${r.help}"` : `<Section id="${r.help}"`);
    expect(RELEASES.map(releaseHref)).toContain('#help-ag-polish');
    expect(help).toMatch(/<Section id="release-history" updated="Nov \d{1,2}, 2026"/);
    expect(help).toContain('href={releaseHref(r)}');
  });
  it('plain words: no session code names, no "Jarvis"', () => {
    for (const r of RELEASES) expect(r.title).not.toMatch(/Session|ADR|Jarvis|\bA[A-L]\b/);
  });
});
