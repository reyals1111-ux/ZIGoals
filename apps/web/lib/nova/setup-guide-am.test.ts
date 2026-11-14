import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {SETUP_STEPS} from './setup';
import {brainNowLine, HERMES_WAY, PLANETS, STAGE_EXAMPLES, STAGE_INTRO, STAGE_KEEP, STAGE_NO_BRAIN, WEATHER_LINE} from './setup-guide';
import {summonFor} from './summon/summon';
import {widgetSpec} from './widgets/catalog';

/**
 * Session AM (ADR-038 D2, D3, D6, D12, D13, D29): "Build your own NOVA" describes NOVA as it is now. The first step
 * explains the stage with requests the on-device step really understands; the brain step says what answers right now
 * and shows the person's own Hermes Agent as a path; weather is one sentence in "What NOVA can see", never a step.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const meet = read('../../components/nova/setup/steps/meet.tsx'), brain = read('../../components/nova/setup/steps/brain.tsx'), scopes = read('../../components/nova/setup/steps/scopes.tsx');

describe('the guide explains the stage (Meet NOVA)', () => {
  it('three example requests, each one making a widget on the device, on areas NOVA may read from the start', () => {
    expect(STAGE_EXAMPLES).toHaveLength(3);
    for (const q of STAGE_EXAMPLES) {
      const made = summonFor(q).widgets;
      expect(made.length, q).toBeGreaterThan(0);
      for (const w of made) expect(widgetSpec(w.id)?.gate, `${q} → ${w.id}`).toMatch(/^(today|goals|habits)$/); // never Health: it is off until chosen
    }
  });
  it('says ask → answer and a widget, pin / hide / close, clear the stage, and that no brain is needed', () => {
    expect(STAGE_INTRO).toContain('NOVA answers and makes a widget for that answer, from your own records');
    expect(STAGE_INTRO).toContain('type, tap a one-tap request, or speak once you turn voice on');
    expect(STAGE_KEEP).toBe('Pin a widget to keep it, hide it in the dock, or close it (with Undo). Say “Clear the stage” to start calm again; what you pinned stays.');
    expect(summonFor('Clear the stage').command).toEqual({kind: 'clear'});
    expect(STAGE_NO_BRAIN).toContain('works before any brain is connected');
    expect(STAGE_NO_BRAIN).toContain('On a phone NOVA answers in a chat; the stage is on a computer.');
  });
  it('the step shows these words and keeps its own check and its four promises', () => {
    for (const name of ['STAGE_INTRO', 'STAGE_EXAMPLES.map', 'STAGE_KEEP', 'STAGE_NO_BRAIN']) expect(meet, name).toContain(`{${name}`);
    expect(meet).toContain('<CheckRow id="meet" setup={setup} run={run} label="I understand — check this device"/>');
    for (const promise of ['Everything stays on this device.', 'Keys never leave it.', 'Nothing is trained on.', 'Money never moves.']) expect(meet, promise).toContain(`<li><b>${promise}</b>`);
  });
});

describe('the brain step says what answers right now, and Hermes is a path of its own', () => {
  it('the status line: on-device answers with no AI connected, else the Brain chip’s own words', () => {
    expect(brainNowLine('none', 'On-device answers')).toBe('Right now: on-device answers, no AI connected');
    expect(brainNowLine('local', 'Local · qwen3.5:9b')).toBe('Right now: Local · qwen3.5:9b');
    expect(brainNowLine('hermes', 'Hermes Agent · hermes-agent')).toBe('Right now: Hermes Agent · hermes-agent');
    expect(brain).toContain("import {useBrain} from '../../status-chips';");
    expect(brain).toContain('{brainNowLine(now.brain.kind, now.brain.words)}');
    expect(brain.indexOf('brainNowLine(now.brain.kind')).toBeLessThan(brain.indexOf('<Choice label="Choose NOVA’s brain"'));
  });
  it('“My Hermes Agent” is a link to its guide, right under the four ways', () => {
    expect(HERMES_WAY).toEqual({label: 'My Hermes Agent', href: '/app/nova/hermes', note: 'Already run Hermes Agent, Nous Research’s open-source agent? It has its own guide.'});
    expect(brain).toContain('<Link className="secondary" href={HERMES_WAY.href}>{HERMES_WAY.label}</Link>');
    expect(brain.indexOf('<Choice label="Choose NOVA’s brain"')).toBeLessThan(brain.indexOf('HERMES_WAY.href'));
    expect(brain.indexOf('HERMES_WAY.href')).toBeLessThan(brain.indexOf('Have a ChatGPT, Claude, Gemini or Grok subscription?'));
    expect(brain).toContain('<CheckRow id="brain" setup={setup} run={run} label="Test the connection"/>');
  });
});

describe('outside data is one sentence, not a step', () => {
  it('weather is named once, in “What NOVA can see”, with what MET Norway sees', () => {
    expect(WEATHER_LINE).toBe('Weather is the only outside data, off until you turn it on in NOVA → Permissions; MET Norway then sees your network address and your place rounded to about 1 km.');
    expect(scopes).toContain('<p className="fine">{WEATHER_LINE}</p>');
    expect(SETUP_STEPS).toHaveLength(10);
    for (const id of SETUP_STEPS) expect(`${PLANETS[id].label} ${PLANETS[id].short}`, id).not.toMatch(/weather|outside data/i);
  });
  it('plain words: no film or comic reference, and the weather service’s consumer name is never used', () => {
    for (const words of [STAGE_INTRO, STAGE_KEEP, STAGE_NO_BRAIN, WEATHER_LINE, HERMES_WAY.note, ...STAGE_EXAMPLES]) expect(words).not.toMatch(/Jarvis|Tony Stark|Iron Man|\bYr\b/i);
  });
});
