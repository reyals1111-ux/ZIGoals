import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from '../actions/plan';
import {parseReply} from '../actions/parse';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {withChecklist} from '../evals/fixtures-af';
import {localAnswer} from '../local-answers/engine';
import {commandText, quickCommand} from './commands';
beforeAll(() => loadAaPlanner());

// Session AF (L4, P8.6): the Checklist by voice and text, on the device, in English and Dutch, with its stop rule.
const sources = withChecklist(showcaseSources()), env = toolEnv(sources, gatesFor(true), 'local');
const cardOf = (text: string) => { const r = quickCommand(text, env); return r ? parseReply(r.text).proposals : null; };
describe('the templates, typed and spoken, English and Dutch', () => {
  test('checking off: a custom item is ticked on the path, a habit dot is that habit\'s check-in (one card kind)', () => {
    for (const ask of ['mark push-ups done', 'Mark push-ups as done', 'tick off push-ups', 'tick push-ups', 'check off push-ups', 'push-ups done', 'done with push-ups', 'vink push-ups af', 'markeer push-ups als gedaan', 'push-ups gedaan', 'push-ups is klaar', 'euh, vink push-ups af', 'hey zigi, mark push-ups done please'])
      expect(cardOf(ask), ask).toEqual([{kind: 'checklist-tick', item: 'Push-ups', done: true, day: 'today'}]);
    expect(cardOf('mark read done')).toEqual([{kind: 'checklist-tick', item: 'Read', done: true, day: 'today'}]);
    expect(cardOf('vink lezen af')).toBeNull(); // "lezen" is not the habit's name; the person's AI decides
    expect(cardOf('untick push-ups')).toEqual([{kind: 'checklist-tick', item: 'Push-ups', done: false, day: 'today'}]);
    expect(cardOf('push-ups niet gedaan')).toEqual([{kind: 'checklist-tick', item: 'Push-ups', done: false, day: 'today'}]);
  });
  test('adding: the person\'s own words become their item; a habit of that exact name is starred instead', () => {
    expect(cardOf('add read 5 pages to my checklist')).toEqual([{kind: 'checklist-add-custom', text: 'read 5 pages'}]);
    expect(cardOf('put call mum on my list')).toEqual([{kind: 'checklist-add-custom', text: 'call mum'}]);
    expect(cardOf('zet 5 bladzijden lezen op mijn lijst')).toEqual([{kind: 'checklist-add-custom', text: '5 bladzijden lezen'}]);
    expect(cardOf('voeg stretchen toe aan mijn lijst')).toEqual([{kind: 'checklist-add-custom', text: 'stretchen'}]);
    expect(cardOf('add read to my checklist')).toEqual([{kind: 'checklist-add-favourite', item: 'Read'}]);
    expect(cardOf('favourite walk')).toEqual([{kind: 'checklist-add-favourite', item: 'Walk'}]);
    expect(cardOf('maak walk favoriet')).toEqual([{kind: 'checklist-add-favourite', item: 'Walk'}]);
  });
  test('timers and fasts: the sleep timer, a habit\'s timer, a fast with its hours', () => {
    for (const ask of ['start my sleep timer', 'I\'m going to bed', 'start mijn slaaptimer', 'ik ga slapen']) expect(cardOf(ask), ask).toEqual([{kind: 'start-night'}]);
    for (const ask of ['stop my sleep timer', 'I woke up', 'stop mijn slaaptimer', 'ik ben wakker']) expect(cardOf(ask), ask).toEqual([{kind: 'end-night'}]);
    expect(cardOf('start a 16 hour fast')).toEqual([{kind: 'start-fast', targetHours: 16}]);
    expect(cardOf('start a sixteen hour fast')).toBeNull(); // the spoken form is normalised by localAnswer first (below)
    expect(cardOf('start een vasten van 14 uur')).toEqual([{kind: 'start-fast', targetHours: 14}]);
    expect(cardOf('stop my fast')).toEqual([{kind: 'stop-fast'}]);
    const timed = sources.habits.habits.find(h => h.rules.at(-1)?.measurement.kind === 'duration');
    if (timed) expect(cardOf(`start the ${timed.title} timer`)).toEqual([{kind: 'start-timer', habit: timed.title}]);
  });
  test('the list: what is left on the Checklist today, on the device', () => {
    const r = quickCommand('what\'s left on my checklist', env)!;
    expect(r.kind).toBe('answer'); expect(r.text).toMatch(/^On your Checklist today: \d of 4 done\. Still open: /);
    expect(quickCommand('wat staat er nog op mijn lijst', env)!.text).toMatch(/^Op je Checklist vandaag: \d van 4 af\./);
  });
});
describe('the stop rule: anything else follows the existing routes', () => {
  test('a question, a second clause, an amount, another day, an unknown item: no command', () => {
    for (const ask of ['mark push-ups done?', 'mark push-ups done and log water', 'mark push-ups done, then read', 'tick off 20 push-ups', 'mark push-ups done yesterday', 'tick off my walk for last monday', 'vink push-ups gisteren af', 'mark the Japan goal as done', 'mark juggling done', 'check my steps', 'Mark it done', 'i\'m done', 'all done', 'Log two glasses of water'])
      expect(quickCommand(ask, env), ask).toBeNull();
  });
  test('two items that match equally are said back as a question, never a guess', () => {
    const two = toolEnv(withChecklist({...sources, habits: {...sources.habits, habits: [...sources.habits.habits, {...sources.habits.habits[0]!, id: '99999999-9999-4999-8999-999999999999', title: 'Stretch evening'}, {...sources.habits.habits[0]!, id: '88888888-8888-4888-8888-888888888888', title: 'Stretch morning'}]}}), gatesFor(true), 'local');
    const r = quickCommand('mark stretch done', two)!;
    expect(r.kind).toBe('refusal'); expect(r.text).toMatch(/^More than one matches: Stretch evening and Stretch morning\. Say its full name\.$/);
  });
  test('through localAnswer: the spoken form first, a device card with the fenced block, and the planner makes it a card', () => {
    const r = localAnswer('um, start a sixteen hour fast', env);
    expect(r.kind).toBe('answer'); expect(parseReply('text' in r ? r.text : '').proposals).toEqual([{kind: 'start-fast', targetHours: 16}]);
    const dutch = localAnswer('euh, vink push-ups af', env);
    expect('text' in dutch && dutch.text).toMatch(/^Afvinken · Push-ups · vandaag\. /);
    expect(commandText('Hey ZIGi, could you please mark push-ups done, thanks.')).toBe('mark push-ups done');
  });
});
