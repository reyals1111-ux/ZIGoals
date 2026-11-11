import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {HELP_QUESTIONS} from '../search/static';
import {ONE_TAP} from '../nova/summon/words';
import {summonFor} from '../nova/summon/summon';

/**
 * Session AM (ADR-038): Help describes NOVA's stage as it is: widgets made on request, pin / hide / close, the dock, the
 * requests history, one-tap requests, the weather switch and its credit, gentle cards (off by default), NOVA in its own
 * window, and a chat on a phone. The words quoted from the app are the app's own (checked against their sources here).
 */
const help = readFileSync(join(__dirname, '../../components/help/help-page.tsx'), 'utf8');
const source = (path: string) => readFileSync(join(__dirname, '../../components', path), 'utf8');
const answer = (id: string) => help.slice(help.indexOf(`<HelpQuestion id="${id}"`), help.indexOf('</HelpQuestion>', help.indexOf(`<HelpQuestion id="${id}"`)));

describe('Help: NOVA’s stage', () => {
  const stage = answer('nova-stage');
  it('is an answer of its own, searchable, and leads this version’s What’s new', () => {
    expect(stage).toContain('question="How do I ask NOVA for a widget, and pin, hide or close it?"');
    expect(HELP_QUESTIONS).toContainEqual(['nova-stage', 'How do I ask NOVA for a widget, and pin, hide or close it?']);
    const list = help.slice(help.indexOf('export const THIS_VERSION'), help.indexOf('];', help.indexOf('export const THIS_VERSION')));
    expect(list.indexOf("['nova-stage', 'NOVA makes a widget for what you ask: pin it, hide it or close it']")).toBeGreaterThan(0);
    expect(list.indexOf("['nova-stage'")).toBeLessThan(list.indexOf("['nova-what'"));
  });
  it('names every part of the stage', () => {
    for (const words of [
      'NOVA answers under the star and makes a widget for that answer, from your own records on this device', 'It works with no AI connected.', 'in English or Dutch',
      '<strong>Pin</strong> keeps it on the stage.', '<strong>Hide</strong> folds it into the dock', '<strong>Close</strong> removes it, with Undo.', 'Back returns to the same stage',
      'leaves by itself after 12 hours', '&ldquo;Keep made widgets until I close them&rdquo;', '&ldquo;Clear the stage&rdquo; (what you pinned stays)', '&ldquo;Show the Command arrangement&rdquo;',
      'your <strong>Requests</strong>, newest first, each with &ldquo;Show again&rdquo;', '&ldquo;Forget all requests&rdquo;', '&ldquo;from your phone&rdquo;',
      '<strong>Gentle cards</strong> are off until you turn on &ldquo;Gentle cards from your briefs&rdquo;', 'Never a notification', '&ldquo;NOVA in its own window&rdquo;',
      'It can never change a permission, the weather switch, your privacy mode or which pages may be read', 'it is off until you turn it on in NOVA &rarr; Permissions', 'href="#help-nova-weather"', '&ldquo;Data from MET Norway&rdquo;',
    ]) expect(stage, words).toContain(words);
    expect(answer('nova-what')).toContain('On a phone NOVA is a chat: it answers in words, and the stage is on a computer.');
    expect(answer('nova-what')).toContain('Ask for something and NOVA answers and makes a widget for that answer');
  });
  it('quotes the app’s own labels and requests', () => {
    const right = source('nova/stage/right-stage.tsx'), top = source('nova/nova-top.tsx');
    for (const label of ['Keep made widgets until I close them', 'Gentle cards from your briefs', 'Show again', 'Forget all requests', 'from your phone']) expect(right, label).toContain(label);
    expect(top).toContain('data-tip="NOVA in its own window"');
    for (const label of ['My day', 'What&rsquo;s next', 'Habits this week', 'Goals', 'Agenda', 'Weather']) { expect(stage, label).toContain(label); expect(ONE_TAP.map(t => t.label), label).toContain(label.replace('&rsquo;', '’')); }
    for (const q of ['Show my habits this week', 'How are my goals?', 'What’s on my agenda?']) { expect(stage, q).toContain(q.replace('’', '&rsquo;')); expect(summonFor(q).widgets.length, q).toBeGreaterThan(0); }
    expect(summonFor('Pin my weight').command).toEqual({kind: 'pin', id: 'weight'});
    expect(summonFor('Hide the sleep widget').command).toEqual({kind: 'hide', id: 'sleep'});
    expect(summonFor('Close the weather').command).toEqual({kind: 'close', id: 'weather'});
    expect(summonFor('Show the Command arrangement').command).toEqual({kind: 'arrangement', preset: 'command'});
  });
  it('the name is Premium, free during the Alpha, with a link to Plans; plain words throughout', () => {
    expect(answer('nova-yours')).toContain('Giving NOVA another name is <Link className="text-link" href="/app/plans">Premium, free during the Alpha</Link>, and works for everyone now.');
    for (const text of [stage, answer('nova-what'), answer('nova-yours')]) expect(text).not.toMatch(/Jarvis|Tony Stark|Iron Man|Session A[A-Z]\b|ADR-\d/);
  });
});
