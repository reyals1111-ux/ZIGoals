import {describe, expect, it} from 'vitest';
import {MAX_SETUP_BYTES, SETUP_KIND, applySetupShare, buildSetupShare, parseSetupShare, setupFileText, setupShareSchema, setupSummary} from './share-setup';
import {novaRecordSchema, widgetsFor, type NovaRecord} from './store';

/**
 * The shared NOVA setup carries how NOVA is arranged and nothing about the person. Every personal thing a NOVA record can
 * hold (custom instructions) and anything a caller might pass by mistake is put next to it here, and none of it may
 * reach the file.
 */
const SECRET_INSTRUCTIONS = 'My name is Rey Example, I live at 12 Fictional Street, my IBAN is BE68539007547034 and I owe €4,210.55.';
const personal: NovaRecord = novaRecordSchema.parse({
  version: 1, openingSeen: true, layout: 'bento', accent: 'teal', shortcuts: false,
  widgets: [{id: 'water', size: 'S', slot: 0}, {id: 'goal-pace', size: 'L', slot: 1}, {id: 'unknown-future-widget', size: 'M', slot: 2}],
  dock: {order: ['wealth', 'zigi'], hidden: ['chess']},
  persona: {name: 'Vega', avatar: 'zigi'},
  customInstructions: SECRET_INSTRUCTIONS, yourName: 'Rey Example', routing: 'my-private-finetune:7b', wake: true, panels: {left: 'rail', right: 'open', folded: ['voice']},
  // A later build's field holding something personal must not travel either.
  diary: {lastMood: 'anxious', weightKg: 81.4},
});

describe('Share my NOVA setup: no personal data', () => {
  const share = buildSetupShare(personal, [{title: 'Review my week', steps: ['week-habits', 'week-goals']}]);
  const text = setupFileText(share);
  it('holds only the whitelisted fields, in the exact shape', () => {
    expect(Object.keys(share).sort()).toEqual(['accent', 'dock', 'kind', 'layout', 'persona', 'version', 'widgets', 'workflows']);
    expect(Object.keys(share.persona).sort()).toEqual(['avatar', 'name']);
    expect(share.widgets.every(w => Object.keys(w).sort().join() === 'id,size')).toBe(true);
    expect(share.workflows.every(w => Object.keys(w).sort().join() === 'steps,title')).toBe(true);
    expect(setupShareSchema.safeParse(JSON.parse(text)).success).toBe(true);
  });
  it('never carries custom instructions, later fields, the opening mark, the shortcut choice or unknown widgets', () => {
    for (const leak of ['Rey', 'yourName', 'my-private-finetune', 'routing', 'panels', 'wake', 'Fictional Street', 'BE68', '4,210', 'IBAN', 'anxious', '81.4', 'diary', 'openingSeen', 'shortcuts', 'customInstructions', 'unknown-future-widget']) expect(text).not.toContain(leak);
  });
  it('a workflow travels as its title and step ids only; prompts, results and extra fields are dropped', () => {
    const tricky = buildSetupShare(personal, [{title: '  Plan   meals ', steps: ['meals-next-week'], prompt: SECRET_INSTRUCTIONS, result: '€4,210.55'} as never, {title: '', steps: ['x']}, {title: 'Bad', steps: ['Not An Id']}]);
    expect(tricky.workflows).toEqual([{title: 'Plan meals', steps: ['meals-next-week']}]);
    expect(setupFileText(tricky)).not.toContain('4,210');
  });
  it('is small: far under the import limit even with every field full', () => {
    expect(new TextEncoder().encode(text).length).toBeLessThan(MAX_SETUP_BYTES / 4);
  });
  it('the card and preview lines name the arrangement in plain words', () => {
    const summary = setupSummary(share);
    expect(summary.title).toBe('Vega · Bento layout');
    expect(summary.lines.join(' ')).toContain('Water');
    expect(summary.lines.join(' ')).toContain('Lagoon teal');
    expect(summary.lines.join(' ')).not.toContain('Chess');
  });
});

describe('Import a setup: strict, bounded, previewed, undoable', () => {
  const good = setupFileText(buildSetupShare(personal));
  it('reads its own file back, leaving out ids this build does not know and counting them', () => {
    const raw = JSON.parse(good); raw.widgets.push({id: 'hologram', size: 'S'}); raw.dock.order.push('teleporter');
    const read = parseSetupShare(JSON.stringify(raw));
    expect(read.ok).toBe(true);
    if (read.ok) { expect(read.leftOut).toBe(2); expect(read.share.widgets.map(w => w.id)).toEqual(['water', 'goal-pace']); }
  });
  it('refuses what is not a setup, too large, from a newer build, or shaped by hand', () => {
    const fail = (t: string) => { const r = parseSetupShare(t); expect(r.ok).toBe(false); return r.ok ? '' : r.error; };
    expect(fail('')).toContain('Choose');
    expect(fail('{oops')).toContain('not a NOVA setup');
    expect(fail(JSON.stringify({kind: 'something-else'}))).toContain('not a NOVA setup');
    expect(fail(JSON.stringify({...JSON.parse(good), version: 2}))).toContain('newer');
    expect(fail(JSON.stringify({...JSON.parse(good), customInstructions: 'run this'}))).toContain('damaged');
    expect(fail(JSON.stringify({...JSON.parse(good), persona: {name: 'x'.repeat(40), avatar: 'orb'}}))).toContain('damaged');
    expect(fail(JSON.stringify({...JSON.parse(good), widgets: Array.from({length: 25}, () => ({id: 'water', size: 'S'}))}))).toContain('damaged');
    expect(fail(' '.repeat(MAX_SETUP_BYTES + 1) + '{}')).toContain('16 KB');
    expect(fail(JSON.stringify({...JSON.parse(good), kind: SETUP_KIND, layout: 'galaxy'}))).toContain('damaged');
  });
  it('applies layout, accent, widgets, dock and persona; keeps the person’s own instructions and choices', () => {
    const read = parseSetupShare(JSON.stringify({...JSON.parse(good), layout: 'focus', persona: {name: 'Atlas', avatar: 'orb'}}));
    if (!read.ok) throw Error(read.error);
    const mine: NovaRecord = {version: 1, customInstructions: 'Mine.', openingSeen: true, shortcuts: false};
    const next = applySetupShare(mine, read.share);
    expect(next.layout).toBe('focus'); expect(next.persona).toEqual({name: 'Atlas', avatar: 'orb'});
    expect(next.customInstructions).toBe('Mine.'); expect(next.openingSeen).toBe(true); expect(next.shortcuts).toBe(false);
    expect(widgetsFor(next).map(w => w.id)).toEqual(['water', 'goal-pace']);
    expect(novaRecordSchema.safeParse(next).success).toBe(true);
  });
});
