import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {MAX_MODEL_COMMANDS, stageCalls} from '../../nova/summon/summon';
import {WIDGETS} from '../../nova/widgets/catalog';
import {stageWeather} from '../../nova/world/stage-weather';
import {NOVA_WORLD_KEY} from '../../nova/world/record';
import {closedGates} from '../gates';
import {defaultAiSettings} from '../settings';
import {toolEnv, type ToolEnv} from './env';
import {showcaseSources} from './fixtures';
import {stageWidgetTool, weatherTool, STAGE_TOOLS} from './nova-stage';
import {availableTools, runTool, toolBlocked, TOOLS, toolSpecs} from './registry';

/** Session AM (ADR-038 D4, A4): the model's stage tool and weather lookup — what they can do, and what no tool can. */
const base = (): ToolEnv => toolEnv(showcaseSources(), closedGates(defaultAiSettings()), 'local');
const onStage = (stage: ToolEnv['stage'] = {kinds: WIDGETS.map(w => w.id)}): ToolEnv => ({...base(), stage});

describe('stage_widget', () => {
  it('runs only where NOVA’s stage is: ZIGi’s panel, a browser agent and the hosted relay never see it', () => {
    expect(toolBlocked(stageWidgetTool, base())).toMatchObject({ok: false, reason: 'area'});
    expect(availableTools(base()).map(t => t.name)).not.toContain('stage_widget');
    expect(availableTools(base()).map(t => t.name)).not.toContain('weather');
    expect(availableTools(onStage()).map(t => t.name)).toEqual(expect.arrayContaining(['stage_widget', 'weather']));
    expect(runTool('stage_widget', {action: 'show', widget: 'weight'}, base())).toMatchObject({ok: false});
  });
  it('is not closed by a page-data switch (it reads no record), and says only "noted"', () => {
    const r = runTool('stage_widget', {action: 'show', widget: 'weight', range: 'month'}, onStage());
    expect(r).toMatchObject({ok: true, tool: 'stage_widget', data: {noted: 'show Weight', widget: 'Weight'}});
    expect(JSON.stringify(r)).not.toMatch(/\d{2,}\s?(kg|lb|kcal)|[€$]\d/); // no figure of the person's
  });
  it('takes only the closed catalogue and its four actions: no free text, no markup, no other field', () => {
    for (const bad of [{action: 'show', widget: 'weight', html: '<b>x</b>'}, {action: 'show', widget: 'weight', text: 'hello'}, {action: 'delete', widget: 'weight'}, {action: 'show'}, {action: 'show', widget: 'weight', range: 'forever'}])
      expect(runTool('stage_widget', bad, onStage()), JSON.stringify(bad)).toMatchObject({ok: false, reason: 'arguments'});
    expect(runTool('stage_widget', {action: 'show', widget: 'made-up-widget'}, onStage())).toMatchObject({ok: false, reason: 'not-found'});
    expect(runTool('stage_widget', {action: 'show', widget: 'markets'}, onStage({kinds: ['weight']}))).toMatchObject({ok: false, reason: 'not-found'}); // not available here
    const spec = toolSpecs([stageWidgetTool as never])[0]!;
    expect(Object.keys(spec.parameters.properties).sort()).toEqual(['action', 'range', 'widget']);
    expect(spec.parameters.properties.widget?.enum).toEqual(WIDGETS.map(w => w.id));
    expect(spec.parameters.properties.action?.enum).toEqual(['show', 'pin', 'hide', 'close']);
  });
  it('the stage applies a call only for a widget of the catalogue: show with its range, pin / hide / close as commands', () => {
    const calls = [{tool: 'stage_widget', args: {action: 'show', widget: 'weight', range: 'year'}}, {tool: 'stage_widget', args: {action: 'show', widget: 'sleep', range: 'year'}},
      {tool: 'stage_widget', args: {action: 'pin', widget: 'weight'}}, {tool: 'stage_widget', args: {action: 'close', widget: 'nope'}}, {tool: 'stage_widget', args: {action: 'erase', widget: 'weight'}},
      {tool: 'weight', args: {action: 'close', widget: 'weight'}}, {tool: 'stage_widget', args: null}];
    expect(stageCalls(calls)).toEqual({show: [{id: 'weight', params: {range: 'year'}}, {id: 'sleep'}], commands: [{kind: 'pin', id: 'weight'}]});
    // Security review AM-S1: a model never pins a widget whose switch is off (a pin must not lift the locked state).
    expect(stageCalls(calls, {gateOpen: (id: string) => id !== 'weight'}).commands).toEqual([]);
    expect(stageCalls(calls, {available: (id: string) => id !== 'weight'})).toEqual({show: [{id: 'sleep'}], commands: []});
    const many = Array.from({length: 9}, (_, i) => ({tool: 'stage_widget', args: {action: 'close', widget: WIDGETS[i]!.id}}));
    // Session AM (AM-S7, deliberate): one command per reply, the first (was: at most three), so its Undo is the one on screen.
    expect(MAX_MODEL_COMMANDS).toBe(1);
    expect(stageCalls(many).commands).toEqual([{kind: 'close', id: WIDGETS[0]!.id}]);
  });
});

describe('weather: the reading this device holds, never a guess, never a fetch', () => {
  const storage = (value?: unknown) => ({getItem: (k: string) => k === NOVA_WORLD_KEY && value !== undefined ? JSON.stringify(value) : null});
  const reading = {lat: 50.85, lon: 4.35, fetchedAt: '2026-11-11T13:00:00.000Z', expires: '2026-11-11T13:30:00.000Z', now: {at: '2026-11-11T13:00:00.000Z', t: 12, symbol: 'lightrain'}, hours: [], days: []};
  it('off, no place, not read yet, read', () => {
    expect(stageWeather(storage())).toEqual({on: false});
    expect(stageWeather(storage({version: 1, place: {name: 'Brussels', lat: 50.85, lon: 4.35}}))).toEqual({on: false});
    expect(stageWeather(storage({version: 1, on: true}))).toEqual({on: true});
    expect(stageWeather(storage({version: 1, on: true, place: {name: 'Brussels', lat: 50.85, lon: 4.35}}))).toEqual({on: true, place: 'Brussels'});
    const read = stageWeather(storage({version: 1, on: true, place: {name: 'Brussels', lat: 50.85, lon: 4.35}, reading}));
    expect(read).toMatchObject({on: true, place: 'Brussels', asOf: '2026-11-11T13:00:00.000Z'});
    expect(read.sentence).toMatch(/Brussels/); expect(read.sentence).toMatch(/12/); expect(read.sentence).toMatch(/MET Norway/);
  });
  it('the lookup says off / not read yet in words a model cannot mistake for a reading, and credits the service when there is one', () => {
    expect(runTool('weather', {}, onStage({kinds: [], weather: {on: false}}))).toMatchObject({ok: true, data: {state: 'off'}});
    expect(runTool('weather', {}, onStage({kinds: []}))).toMatchObject({ok: true, data: {state: 'off'}});
    expect(runTool('weather', {}, onStage({kinds: [], weather: {on: true, place: 'Brussels'}}))).toMatchObject({ok: true, data: {state: 'not read yet', place: 'Brussels'}});
    const r = runTool('weather', {}, onStage({kinds: [], weather: {on: true, place: 'Brussels', sentence: 'In Brussels it is 12° with light rain.', asOf: '2026-11-11T13:00:00.000Z'}}));
    expect(r).toMatchObject({ok: true, provenance: 'Data from MET Norway, as read by this device', data: {state: 'read', reading: 'In Brussels it is 12° with light rain.'}});
    expect(runTool('weather', {place: 'Paris'}, onStage())).toMatchObject({ok: false, reason: 'arguments'}); // the model cannot choose a place
    expect(readFileSync(join(__dirname, 'nova-stage.ts'), 'utf8')).not.toMatch(/\bfetch\(/);
  });
});

describe('A4: only the person changes permissions, outside data, the privacy mode and page-data switches', () => {
  const SWITCH = /permission|privacy|scope|page.?share|page.?data|include.?health|outside.?data|weather.?(on|off|switch)|world|egress|consent|sync.?choice/i;
  it('no tool writes anything, and none is named for or takes an argument about those switches', () => {
    expect(STAGE_TOOLS.map(t => t.name)).toEqual(['stage_widget', 'weather']);
    for (const tool of TOOLS) {
      expect(tool.name, tool.name).not.toMatch(/^(set|enable|disable|turn|allow|grant|revoke|toggle)/);
      for (const [name, prop] of Object.entries(tool.parameters.properties)) { expect(name, `${tool.name}.${name}`).not.toMatch(SWITCH); for (const v of prop.enum ?? []) expect(v, `${tool.name}.${name}`).not.toMatch(SWITCH); }
    }
  });
  it('no action card kind (the only way a reply changes anything) names those switches either', () => {
    const schema = readFileSync(join(__dirname, '../actions/schema.ts'), 'utf8');
    const kinds = [...schema.matchAll(/kind: z\.literal\('([a-z-]+)'\)/g)].map(m => m[1]!);
    expect(kinds.length).toBeGreaterThan(60);
    for (const kind of kinds) expect(kind, kind).not.toMatch(SWITCH);
    // The device keys that hold those switches are never the target of an action's write.
    for (const key of ['zigoals:nova-setup:v1', 'zigoals:nova-world:v1', 'zigoals:ai-settings', 'pageShare', 'includeHealth', 'privacyMode']) {
      const plan = readFileSync(join(__dirname, '../actions/plan.ts'), 'utf8');
      expect(plan.includes(key), key).toBe(false);
    }
  });
});
