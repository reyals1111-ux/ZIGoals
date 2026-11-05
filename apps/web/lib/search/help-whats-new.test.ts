import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

// Session AL (PR-034, PR-032, X3-27, N-LA-07; AL-HELP-006, P-LA-31): Help's What's new opens with this version's answers,
// the same ones Today's What's new card links; the notice answer quotes the live notice; Known limitations names the
// Lichess limit as starting a game; the private screens are listed. Read as text: Help is a server component and the
// card a client module, so neither is imported here.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const help = read('../../components/help/help-page.tsx');
const card = read('../../components/for-you/whats-new-card.tsx');
const notice = read('../../components/shell/alpha-notice.tsx');
const shell = read('../../components/shell.tsx');

describe("Help's What's new and notice answers follow the live app", () => {
  it("lists every link of Today's What's new card first, each pointing at an answer that exists", () => {
    const cardBlock = card.slice(card.indexOf('export const WHATS_NEW_LINKS'), card.indexOf('];', card.indexOf('export const WHATS_NEW_LINKS')));
    const cardIds = [...cardBlock.matchAll(/#help-([a-z0-9-]+)'/g)].map(m => m[1]);
    const helpBlock = help.slice(help.indexOf('export const THIS_VERSION'), help.indexOf('];', help.indexOf('export const THIS_VERSION')));
    const helpIds = [...helpBlock.matchAll(/\['([a-z0-9-]+)', '/g)].map(m => m[1]);
    expect(cardIds.length).toBeGreaterThan(5);
    for (const id of cardIds) expect(helpIds, id).toContain(id);
    expect(helpIds).toContain('ag-polish'); // the Checklist
    for (const id of helpIds) expect(help, id).toContain(`id="${id}"`);
    expect(help.indexOf('THIS_VERSION.map')).toBeLessThan(help.indexOf('Before that, eleven small things'));
  });

  it('the notice answer quotes the words the notice shows', () => {
    expect(notice).toContain("'Your records stay in this browser and are not a backup.'");
    expect(shell).toContain('"PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN" : "PUBLIC ALPHA"');
    const answer = help.slice(help.indexOf('id="z-alpha"'), help.indexOf('</HelpQuestion>', help.indexOf('id="z-alpha"')));
    expect(answer).toContain('<strong>PUBLIC ALPHA</strong> &ldquo;Your records stay in this browser and are not a backup.&rdquo;');
    expect(answer).toContain('PUBLIC ALPHA &middot; NOTHING MOVES UNLESS YOU SIGN');
  });

  it('Known limitations says the Lichess limit is about starting a game, and that blitz ratings still show', () => {
    expect(help).not.toContain('Lichess games found from ZIGoals are rapid or classical only');
    expect(help).toContain('A new Lichess game started from ZIGoals is rapid or classical only');
    expect(help).toContain('Your blitz and bullet ratings and finished games are still read and shown in Chess');
  });

  it('lists the private screens that pause ZIGi, matching what the pause actually reads', () => {
    const sensitive = read('../../components/ai/use-sensitive-screen.ts');
    expect(sensitive).toContain("'dialog[open]:not([data-ai-dialog])'");
    expect(sensitive).toContain("'input[type=\"password\"]:focus'");
    const answer = help.slice(help.indexOf('id="your-ai-private"'), help.indexOf('</HelpQuestion>', help.indexOf('id="your-ai-private"')));
    for (const words of ['the Checklist', 'the screen cover', 'Settings &rarr; your account', 'a one-time code', 'Paused while a private screen is open in the tab.']) expect(answer, words).toContain(words);
  });

  it('every Help topic says when its text last changed (GAP-165)', () => {
    const sections = [...help.matchAll(/<Section id="([a-z0-9-]+)"([^>]*)>/g)];
    expect(sections.length).toBeGreaterThan(15);
    for (const [, id, rest] of sections) expect(rest, id).toMatch(/ updated="(Nov|Oct|Dec) \d{1,2}, 2026( or earlier)?"/);
    expect(help).toContain('<p className="help-updated">Last updated {updated}</p>');
  });
});
