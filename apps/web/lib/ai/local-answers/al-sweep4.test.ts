import {expect, test} from 'vitest';
import {emptyHabitData} from '../../habits';
import {emptyPlatform} from '../../positions';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {f9LocalAnswer} from './f9';

// Session AL sweep 4 (PINS-AI note): the agenda lists tasks too (f9-tools.ts agendaDays), so its empty line names them.
test('an empty agenda says what the agenda gathers, tasks included', () => {
  const sources = showcaseSources(undefined, {habits: emptyHabitData(), platform: emptyPlatform(), weekly: null as never, health: null as never});
  const reply = f9LocalAnswer('What is on my agenda tomorrow?', toolEnv(sources, gatesFor(true, 'today'), 'local'));
  expect(reply && 'text' in reply ? reply.text : '').toContain('Nothing is planned tomorrow in your records. The agenda gathers habits, tasks, planned contributions, bills, meals and reviews.');
});
