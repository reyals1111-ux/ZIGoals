import {expect, it} from 'vitest';
import {asksMemory, QUESTIONS, recommend, type Answers} from './setup-chooser';
import type {OnDeviceAvailability} from './on-device';

// Session V Part 15: "Which setup fits me?" — the whole table, computed on this device from three or four answers.
const states: OnDeviceAvailability[] = ['available', 'downloadable', 'downloading', 'unavailable'];
const all: Answers[] = [];
for (const have of ['subscription', 'api', 'nothing'] as const) for (const where of ['computer', 'phone'] as const) for (const matters of ['privacy', 'quality', 'free'] as const)
  for (const memory of asksMemory({where, matters}) ? (['plenty', 'little', 'unknown'] as const) : [undefined]) all.push({have, where, matters, ...(memory ? {memory} : {})});
it('every combination gets one recommendation with honest pros, cons and steps', () => {
  for (const answers of all) for (const onDevice of states) for (const hosted of [false, true]) {
    const r = recommend(answers, {onDevice, hosted});
    expect(r.pros.length, JSON.stringify(answers)).toBeGreaterThan(0);
    expect(r.cons.length).toBeGreaterThan(0);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.why).not.toBe('');
    // Never a route this browser cannot take, never a hosted offer when there is none, never "also" itself.
    if (onDevice === 'unavailable') expect([r.route, r.also]).not.toContain('on-device');
    if (!hosted) expect([r.route, r.also]).not.toContain('hosted');
    expect(r.also).not.toBe(r.route);
    // A phone can run no model.
    if (answers.where === 'phone') expect(['local', 'on-device']).not.toContain(r.route);
  }
});
it('the memory question only for a computer when privacy or cost decides', () => {
  expect(asksMemory({where: 'computer', matters: 'privacy'})).toBe(true);
  expect(asksMemory({where: 'computer', matters: 'free'})).toBe(true);
  expect(asksMemory({where: 'computer', matters: 'quality'})).toBe(false);
  expect(asksMemory({where: 'phone', matters: 'privacy'})).toBe(false);
  expect(Object.keys(QUESTIONS)).toEqual(['have', 'where', 'matters', 'memory']);
});
it('the main rows', () => {
  const r = (answers: Answers, onDevice: OnDeviceAvailability = 'unavailable', hosted = false) => recommend(answers, {onDevice, hosted});
  expect(r({have: 'nothing', where: 'computer', matters: 'privacy', memory: 'plenty'}).route).toBe('local');
  expect(r({have: 'nothing', where: 'computer', matters: 'privacy', memory: 'little'}, 'downloadable').route).toBe('on-device');
  expect(r({have: 'nothing', where: 'computer', matters: 'privacy', memory: 'little'}).route).toBe('local');
  expect(r({have: 'subscription', where: 'phone', matters: 'free'}).route).toBe('subscription');
  expect(r({have: 'nothing', where: 'phone', matters: 'free'}).route).toBe('subscription');
  expect(r({have: 'api', where: 'phone', matters: 'quality'}).route).toBe('api');
  expect(r({have: 'nothing', where: 'phone', matters: 'quality'}, 'unavailable', true).route).toBe('hosted');
  expect(r({have: 'subscription', where: 'computer', matters: 'quality'}).also).toBe('subscription');
  // A phone and privacy first: the bridge, which sends only what the person copies.
  expect(r({have: 'nothing', where: 'phone', matters: 'privacy'}, 'unavailable', true).route).toBe('subscription');
});
it('no money words that are not true: costs are the provider\'s own, and nothing claims to be free that is not', () => {
  for (const answers of all) for (const onDevice of states) {
    const text = JSON.stringify(recommend(answers, {onDevice}));
    expect(text).not.toMatch(/\$|€|£|per month|cheap/i);
  }
});
