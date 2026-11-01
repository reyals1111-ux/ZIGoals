import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {HELP_TOPICS} from '../search/static';

/**
 * Session AK G2 (RELEASE_REVIEW R24): Help is task-shaped. The release notes in question form ("What changed in …?",
 * "Where are … now?", "What else is new …?") and the ten "New: …" release sections sit under one "Earlier updates"
 * section after What's new, and the topic index names no release. Every answer keeps its id (links, What's new and
 * Search still open it), which lib/search/static.test.ts checks question by question.
 */
const help = readFileSync(new URL('../../components/help/help-page.tsx', import.meta.url), 'utf8');
const CHANGE_NOTE = /What changed|What else (?:changed|is new)|What(?:&rsquo;|’|')s new in|What is new|is new\?|: what is new\?|\bnow\?$|Where did .* go\?$/i;

describe('Help keeps its topics task-shaped (R24)', () => {
  const [tasks = '', earlier = ''] = help.split('id="earlier-updates"');
  const questions = (part: string) => [...part.matchAll(/<(?:HelpQuestion id="[^"]*"|Question) question="([^"]*)"/g)].map(m => m[1]!);
  it('has an "Earlier updates" section after What\'s new and before Known limitations', () => {
    expect(earlier).not.toBe('');
    expect(help.indexOf('id="whats-new-alpha"')).toBeLessThan(help.indexOf('id="earlier-updates"'));
    expect(help.indexOf('id="earlier-updates"')).toBeLessThan(help.indexOf('id="known-limitations"'));
  });
  it('asks no "what changed / now" question before Earlier updates', () => {
    expect(questions(tasks).length).toBeGreaterThan(40);
    expect(questions(tasks).filter(q => CHANGE_NOTE.test(q))).toEqual([]);
  });
  it('keeps the release sections, with their ids, under Earlier updates, and no topic is named for a release', () => {
    const tail = earlier.split('id="known-limitations"')[0]!;
    for (const id of ['earlier-changes', 'whole-life', 'aa', 'ab', 'abd', 'ac', 'ad', 'ae', 'af', 'aj', 'ak']) expect(tail).toContain(`<Section id="${id}"`);
    expect(questions(tail).filter(q => CHANGE_NOTE.test(q)).length).toBeGreaterThanOrEqual(25);
    expect(HELP_TOPICS.map(([, label]) => label).filter(label => /^New:/.test(label))).toEqual([]);
    expect(HELP_TOPICS.map(([id]) => id)).toEqual(expect.arrayContaining(['earlier-updates']));
    expect(help).not.toMatch(/eyebrow="NEW: /);
  });
});
