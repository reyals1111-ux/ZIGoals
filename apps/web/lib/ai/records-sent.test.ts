import {expect, test} from 'vitest';
import {recordsSent} from './records-sent';
import {turnMarkdown} from './continue';
import {assistantTurn} from './session';

test('the records sent with a question, as labels: grouped by kind, the page when its data went along, never a value', () => {
  const labels = recordsSent([{handle: 'h3', kind: 'habit', id: 'habit_1', label: 'Drink water'}, {handle: 'h4', kind: 'habit', id: 'habit_2', label: 'Walk'}, {handle: 'g1', kind: 'goal', id: 'goal_1', label: 'Japan adventure'}], 'today');
  expect(labels).toEqual(['Habits: Drink water, Walk', 'Goals: Japan adventure', "Today's page data"]);
  expect(recordsSent([], null)).toEqual([]);
  expect(recordsSent([], 'wealth')).toEqual(["Wealth's page data"]);
});
test('the copied Markdown carries the records line after the source line', () => {
  const turn = {...assistantTurn({text: 'Two glasses so far.', provider: null, model: null, usage: null}), records: ['Habits: Drink water', "Today's page data"]};
  expect(turnMarkdown(turn, 'Answer from your AI (Mock), not from ZIGoals.')).toBe("Two glasses so far.\n\n_Answer from your AI (Mock), not from ZIGoals._\n\n_Records sent: Habits: Drink water · Today's page data_");
});
