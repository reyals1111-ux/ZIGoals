import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RaceForm} from '../../components/health/r4/runna-parts';

/** Session AV lane 2 (health r4; review B4E-7): the goal time's field offers a keypad with ":" ("1:55:00"). */
describe('the race form', () => {
  test('the goal time is typed with a text keypad, never the numeric one that has no colon', () => {
    const html = renderToStaticMarkup(createElement(RaceForm, {initial: {name: '', date: '', distanceKm: '10', goal: '', priority: 'main'}, onSave: () => null, onCancel: () => undefined}));
    expect(html).toMatch(/Goal time \(optional, like 1:55:00\)<\/span><input[^>]*inputmode="text"/i);
    expect(html).not.toMatch(/Goal time[^<]*<\/span><input[^>]*inputmode="numeric"/i);
  });
});
