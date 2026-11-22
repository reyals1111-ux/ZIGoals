import {describe, expect, it} from 'vitest';
import {addTask, editTask} from './engine';
import {emptyTasks, type Task} from './schema';
import {dayEnergy, energyLine, taskPoints} from './energy-load';

/** Session AV lane 2 (r3-plan, LEDGER #259; Structured's Energy Monitor): the day's energy in calm words, never red. */
const today = '2026-11-23', at = new Date('2026-11-23T07:00:00Z');
const task = (over: Partial<Task>): Task => ({id: `t${Math.round(Math.random() * 1e9)}`, title: 'Fictional', priority: 'normal', createdAt: at.toISOString(), due: today, ...over});
describe('energy per task and per day', () => {
  it('points per half hour from the task’s energy; half an hour without minutes; restful gives some back', () => {
    expect(taskPoints({energy: 'heavy', minutes: 60})).toBe(6);
    expect(taskPoints({energy: 'medium'})).toBe(2);
    expect(taskPoints({energy: 'light', minutes: 10})).toBe(1);
    expect(taskPoints({energy: 'restful', minutes: 60})).toBe(-2);
    expect(taskPoints({energy: 'neutral', minutes: 120})).toBe(0);
    expect(taskPoints({minutes: 120})).toBe(0);
  });
  it('the total against the amount: room, near, over; done, subtasks and background tasks left out; never below zero', () => {
    const list = [task({energy: 'heavy', minutes: 90}), task({energy: 'medium', minutes: 60}), task({energy: 'restful', minutes: 30}), task({}), task({energy: 'heavy', doneAt: at.toISOString()}), task({energy: 'heavy', parallel: true}), task({energy: 'heavy', parentId: 'x'})];
    const e = dayEnergy(list, 20);
    expect(e).toMatchObject({total: 12, amount: 20, state: 'room', rated: 3, unrated: 1});
    expect(energyLine(e)).toBe('Energy today: about 12 of your 20 — room for more.');
    expect(dayEnergy(list, 15).state).toBe('near');
    expect(energyLine(dayEnergy(list, 10))).toBe('Energy today: about 12 of your 10 — more than your amount: a restful task, or moving one to another day, gives some room.');
    expect(dayEnergy([task({energy: 'restful', minutes: 120})]).total).toBe(0);
    expect(dayEnergy(list).amount).toBe(20);
  });
  it('a heavy task with a time outside the focus window is marked; inside, without a time or without a window it is not', () => {
    const out = task({title: 'Fictional tax return', energy: 'heavy', time: '16:00'}), inside = task({energy: 'heavy', time: '10:00'}), loose = task({energy: 'heavy'});
    expect(dayEnergy([out, inside, loose], 20, {from: 9 * 60, to: 11 * 60}).heavyOutside.map(t => t.title)).toEqual(['Fictional tax return']);
    expect(dayEnergy([out], 20, null).heavyOutside).toEqual([]);
  });
  it('the energy is set and cleared with the task’s edit', () => {
    let r = addTask(emptyTasks(), {title: 'Fictional move', due: today, minutes: 120}, {id: 'm1', at, today});
    r = editTask(r, 'm1', {energy: 'heavy'}, today);
    expect(r.tasks[0]).toMatchObject({energy: 'heavy', minutes: 120});
    expect(editTask(r, 'm1', {energy: null}, today).tasks[0]!.energy).toBeUndefined();
  });
});
