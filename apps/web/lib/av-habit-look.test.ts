import {describe, expect, it} from 'vitest';
import {lookOf, withLook} from './habit-look';
import {habitExtrasSchema} from './habits-extras/schema';

/** Session AV (owner follow-up 1, F-HABIT-LOOK): a symbol and a colour per habit, in the loose habit extras record. */
describe('Session AV (F-HABIT-LOOK)', () => {
  it('set, read, replace and remove; other habits and fields kept; the record still reads', () => {
    let x = habitExtrasSchema.parse({version: 1, bells: {h1: true}});
    x = withLook(x, 'h1', {glyph: '★', colour: 'teal'});
    x = withLook(x, 'h2', {glyph: '♥', colour: 'pink'});
    expect([lookOf(x, 'h1'), lookOf(x, 'h2'), lookOf(x, 'h3')]).toEqual([{glyph: '★', colour: 'teal'}, {glyph: '♥', colour: 'pink'}, null]);
    x = withLook(x, 'h1', {glyph: '●', colour: 'blue'});
    expect(lookOf(x, 'h1')).toEqual({glyph: '●', colour: 'blue'});
    expect(habitExtrasSchema.parse(JSON.parse(JSON.stringify(x)))).toEqual(x);
    x = withLook(withLook(x, 'h1', null), 'h2', null);
    expect(x).toEqual({version: 1, bells: {h1: true}});
  });
  it('anything not on the lists reads as no look', () => {
    for (const looks of [null, 'x', {h1: {glyph: '🍕', colour: 'teal'}}, {h1: {glyph: '★', colour: '#ff0000'}}, {h1: 7}]) expect(lookOf({version: 1, looks}, 'h1')).toBeNull();
    expect(lookOf({version: 1, looks: {}}, '__proto__')).toBeNull();
  });
});
