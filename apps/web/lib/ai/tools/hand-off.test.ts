import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {HANDOFF_KINDS, MAX_BODY, MAX_SUBJECT, MAX_TITLE, SECRET_WORDS} from '../../nova/handoff/handoff';
import {HAND_OFF_TOOL, MAX_MODEL_HANDOFFS, handOffArgs, handoffFromArgs, handoffFromCalls} from '../../nova/handoff/model';
import {readHealth} from '../../nova/handoff/health';
import {HEALTH_CLOSED_WORDS} from '../../nova/handoff/words';
import {WIDGETS} from '../../nova/widgets/catalog';
import {closedGates} from '../gates';
import {defaultAiSettings} from '../settings';
import {toolEnv, type ToolEnv} from './env';
import {showcaseSources} from './fixtures';
import {handOffTool} from './hand-off';
import {availableTools, runTool, toolBlocked, toolByName, TOOLS, toolSpecs} from './registry';

/**
 * Session AM-2 (owner's step 4b; TIER 3 (AI safety)): `hand_off`, the model's one way to prepare something for outside
 * ZIGoals — what it can ask for, and what no model, tool or reply can do.
 */
const base = (): ToolEnv => toolEnv(showcaseSources(), closedGates(defaultAiSettings()), 'local');
const onNova = (): ToolEnv => ({...base(), handoffs: true});
const onStageOnly = (): ToolEnv => ({...base(), stage: {kinds: WIDGETS.map(w => w.id)}});
const NOW = new Date('2026-11-15T09:00:00Z');
const SEED = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
const root = join(__dirname, '../../..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');

describe('hand_off: only on NOVA, and it does nothing by itself', () => {
  it('runs only where NOVA is: ZIGi’s panel, a browser agent (WebMCP) and the hosted relay never see it', () => {
    expect(HAND_OFF_TOOL).toBe('hand_off'); expect(handOffTool.surface).toBe('nova-handoff');
    expect(toolBlocked(handOffTool as never, base())).toMatchObject({ok: false, reason: 'area'});
    expect(availableTools(base()).map(t => t.name)).not.toContain('hand_off');
    expect(availableTools(onNova()).map(t => t.name)).toContain('hand_off');
    // The stage alone does not offer it, and it offers no stage tool: each NOVA surface carries its own mark.
    expect(availableTools(onStageOnly()).map(t => t.name)).not.toContain('hand_off');
    expect(availableTools(onNova()).map(t => t.name)).not.toEqual(expect.arrayContaining(['stage_widget']));
    expect(availableTools(onNova()).filter(t => t.surface).map(t => t.name)).toEqual(['hand_off']);
    expect(runTool('hand_off', {kind: 'copy', text: 'hello'}, base())).toMatchObject({ok: false, reason: 'area'});
    expect(TOOLS.filter(t => t.name === 'hand_off')).toHaveLength(1); expect(toolByName('hand_off')).toBe(handOffTool);
    // WebMCP and the page tools are built from an environment without NOVA's stage.
    for (const file of ['lib/ai/webmcp.ts', 'lib/ai/hosted.ts', 'components/ai/ai-chat.tsx']) expect(read(file), file).not.toMatch(/handoffs\s*[:=]/);
    expect(read('components/nova/chat/nova-chat.tsx')).toContain('pack.env.handoffs = true;');
  });
  it('is read-only: it returns "noted" and nothing of the person’s; it reads no record and no page-data switch closes or opens it', () => {
    const r = runTool('hand_off', {kind: 'email', to: 'anna@example.com', subject: 'Dinner', text: 'Shall we say 19:00?'}, onNova());
    expect(r).toMatchObject({ok: true, tool: 'hand_off', label: 'Card · Email draft', truncated: null, data: {done: false}});
    if (!r.ok) throw Error('expected ok');
    expect(Object.keys(r.data).sort()).toEqual(['done', 'note', 'noted']);
    expect(r.data.note).toContain('Nothing was sent, opened, saved, shared or copied, and you cannot do so.');
    // The result gives the model nothing back: not the address, not the text, no record.
    expect(JSON.stringify(r.data)).not.toMatch(/anna@example\.com|Dinner|19:00/);
    const closed: ToolEnv = {...onNova(), areas: {...onNova().areas, today: false, wealth: false, goals: false, habits: false, health: false}};
    expect(runTool('hand_off', {kind: 'copy', text: 'hello'}, closed)).toMatchObject({ok: true});
  });
  it('the tool’s code cannot hand anything over: no network, no navigation, no clipboard, no share, no download, no storage, no timer', () => {
    for (const file of ['lib/ai/tools/hand-off.ts', 'lib/nova/handoff/model.ts', 'lib/nova/handoff/handoff.ts', 'lib/nova/handoff/phrases.ts', 'lib/nova/handoff/when.ts', 'lib/nova/handoff/words.ts', 'lib/nova/handoff/health.ts']) {
      const code = read(file).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
      for (const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'navigator.', 'window.', 'document.', 'location', 'localStorage', 'sessionStorage', 'getAppStorage', 'indexedDB', 'createObjectURL', 'setTimeout', 'setInterval', 'import(', 'eval(', 'noteOutbox', 'smtp', 'nodemailer'])
        expect(code, `${file} must not use ${banned}`).not.toContain(banned);
    }
  });
  it('only the card’s own button hands over, and only on a real press: the runners are called from the card alone, behind `isTrusted`', () => {
    const card = read('components/nova/handoff/handoff-card.tsx'), run = read('components/nova/handoff/run.ts'), hook = read('components/nova/handoff/use-handoffs.ts');
    expect(card).toContain('if (!event.nativeEvent.isTrusted || busy) return;');
    // Every button of the card that does something goes through `press`; the hook and the model path never import a runner.
    expect(card.match(/onClick=\{(?!main\}|copy\}|onDismiss\})/g)).toBeNull();
    for (const runner of ['openMail', 'openLink', 'saveCalendar', 'shareNow', 'copyOut']) {
      expect(hook, runner).not.toContain(runner);
      const users = ['components', 'lib'].flatMap(dir => readdirSync(join(root, dir), {recursive: true, encoding: 'utf8'}).filter(f => /\.tsx?$/.test(f) && !/\.test\./.test(f)).map(f => join(dir, f)))
        .filter(f => f !== 'components/nova/handoff/run.ts' && new RegExp(`\\b${runner}\\b`).test(read(f)));
      expect(users, runner).toEqual(['components/nova/handoff/handoff-card.tsx']);
    }
    // The runners follow only the two kinds of address the builders make, in a new tab without an opener or a referrer.
    expect(run).toContain("/^mailto:/i.test(href)"); expect(run).toContain("/^https?:\\/\\/[^/?#\\s]/i.test(href)");
    expect(run).toContain("link.rel = 'noopener noreferrer'"); expect(run).toContain("link.target = '_blank'"); expect(run).toContain("link.referrerPolicy = 'no-referrer'");
    for (const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'window.open', 'location.href', 'location.assign', 'innerHTML', 'eval(']) for (const [name, code] of [['card', card], ['run', run], ['hook', hook]] as const) expect(code, `${name} ${banned}`).not.toContain(banned);
    // The card is made after the reply, from lookups that ran; nothing in the hook presses or runs it.
    expect(hook).toContain('handoffFromCalls(calls,'); expect(hook).not.toMatch(/\.click\(\)|onRun\(|dispatchEvent/);
  });
  it('no tool or argument anywhere sends, picks the moment or skips the card', () => {
    const spec = toolSpecs([handOffTool as never])[0]!;
    expect(Object.keys(spec.parameters.properties).sort()).toEqual(['date', 'kind', 'minutes', 'subject', 'text', 'time', 'title', 'to', 'url']);
    expect(spec.parameters.properties.kind?.enum).toEqual(['email', 'calendar', 'share', 'link', 'copy']);
    expect(spec.parameters.required).toEqual(['kind']);
    for (const name of TOOLS.map(t => t.name)) expect(name, name).not.toMatch(/^(?:send|deliver|post|publish|smtp|upload|submit)[_-]|_send$|send_(?:email|mail|message)/);
    for (const extra of [{confirm: true}, {send: true}, {auto: true}, {approved: true}, {now: true}, {html: '<b>x</b>'}, {cc: 'x@example.org'}, {bcc: 'x@example.org'}, {attachment: 'file:///etc/passwd'}, {headers: 'X: y'}, {from: 'me@example.com'}])
      expect(runTool('hand_off', {kind: 'email', to: 'anna@example.com', subject: 'Hi', ...extra}, onNova()), JSON.stringify(extra)).toMatchObject({ok: false, reason: 'arguments'});
    expect(spec.description).toContain('You cannot send, open, save, share or copy anything: only the person can');
  });
});

describe('hand_off: a strict schema with small validated fields', () => {
  const fits = (args: unknown) => handOffArgs.safeParse(args).success;
  it('a kind and bounded plain fields; nothing else', () => {
    for (const kind of HANDOFF_KINDS) expect(fits({kind})).toBe(true);
    for (const bad of [{}, {kind: 'sms'}, {kind: 'EMAIL'}, {kind: 'email', to: ['a@example.com']}, {kind: 'email', subject: 5}, {kind: 'calendar', minutes: '60'}, {kind: 'calendar', minutes: 2.5}, {kind: 'calendar', minutes: 3}, {kind: 'calendar', minutes: 100000},
      {kind: 'calendar', date: 'tomorrow'}, {kind: 'calendar', date: '2026-12-03', time: '2pm'}, {kind: 'calendar', date: '2026-12-03', time: '24:00'}, {kind: 'copy', text: 'x', extra: 1}, null, 'email', []]) expect(fits(bad), JSON.stringify(bad)).toBe(false);
    expect(fits({kind: 'email', subject: 's'.repeat(MAX_SUBJECT)})).toBe(true); expect(fits({kind: 'email', subject: 's'.repeat(MAX_SUBJECT + 1)})).toBe(false);
    expect(fits({kind: 'copy', text: 't'.repeat(MAX_BODY)})).toBe(true); expect(fits({kind: 'copy', text: 't'.repeat(MAX_BODY + 1)})).toBe(false);
    expect(fits({kind: 'calendar', title: 't'.repeat(MAX_TITLE + 1)})).toBe(false); expect(fits({kind: 'link', url: `https://example.com/${'a'.repeat(2000)}`})).toBe(false);
  });
  it('no markup, no control or direction-changing character, one line where one line is meant', () => {
    for (const text of ['<b>bold</b>', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'a <a href="https://evil.example">link</a>', '<!-- x -->', '&lt;b&gt;', '&#60;script&#62;', '</div>', '<?xml version="1.0"?>', 'line‮evil', 'zero​width', 'bell\u0007'])
      for (const field of ['text', 'subject', 'title']) expect(fits({kind: 'email', [field]: text}), `${field}: ${text}`).toBe(false);
    for (const field of ['subject', 'title', 'to']) expect(fits({kind: 'email', [field]: 'two\nlines'}), field).toBe(false);
    expect(fits({kind: 'email', text: 'two\nlines, 3 < 5 and a > b, fish & chips'})).toBe(true);
    for (const url of ['https://example.com/a b', 'https://example.com/‮x', 'https://exa​mple.com']) expect(fits({kind: 'link', url}), url).toBe(false);
  });
  it('the registry turns a call that does not fit, or content that cannot leave, into a plain refusal (never an exception, never a card)', () => {
    expect(runTool('hand_off', {kind: 'email', text: '<b>hi</b>'}, onNova())).toMatchObject({ok: false, reason: 'arguments'});
    expect(runTool('hand_off', {kind: 'link', url: 'javascript:alert(1)'}, onNova())).toMatchObject({ok: false, reason: 'arguments'});
    expect(runTool('hand_off', {kind: 'link', url: 'https://bank.example@evil.example/'}, onNova())).toMatchObject({ok: false, reason: 'arguments'});
    expect(runTool('hand_off', {kind: 'email', to: 'not an address', subject: 'x'}, onNova())).toMatchObject({ok: false, reason: 'arguments'});
    expect(runTool('hand_off', {kind: 'calendar', title: 'x', date: '2026-02-30'}, onNova())).toMatchObject({ok: false, reason: 'arguments'});
    expect(runTool('hand_off', {kind: 'share'}, onNova())).toMatchObject({ok: false, reason: 'arguments'});
    for (const args of [{kind: 'email', to: 'a@example.com', text: `My words: ${SEED}`}, {kind: 'calendar', title: 'Backup', date: '2026-12-03', text: SEED}, {kind: 'share', text: SEED}, {kind: 'copy', text: `0x${'ab12'.repeat(16)}`}, {kind: 'email', subject: 'card 4111 1111 1111 1111'}])
      expect(runTool('hand_off', args, onNova()), JSON.stringify(args)).toMatchObject({ok: false, reason: 'arguments', refusal: SECRET_WORDS.en});
  });
});

describe('a model’s request becomes at most one card, built by the same checks as the person’s own words', () => {
  const ctx = {now: NOW};
  it('each kind builds the same hand-off the builders make', () => {
    expect(handoffFromArgs({kind: 'email', to: 'a@example.com, b@example.org', subject: 'Hi', text: 'Hello'}, ctx)).toMatchObject({ok: true, handoff: {kind: 'email', to: ['a@example.com', 'b@example.org'], href: 'mailto:a@example.com,b@example.org?subject=Hi&body=Hello'}});
    expect(handoffFromArgs({kind: 'calendar', title: 'Dentist', date: '2026-12-03', time: '14:00', minutes: 45, text: 'Bring the card'}, ctx)).toMatchObject({ok: true, handoff: {kind: 'calendar', minutes: 45, note: 'Bring the card', fileName: 'nova-dentist-2026-12-03.ics'}});
    expect(handoffFromArgs({kind: 'share', text: 'Hello', url: 'https://example.com/x'}, ctx)).toMatchObject({ok: true, handoff: {kind: 'share', url: 'https://example.com/x', host: 'example.com'}});
    expect(handoffFromArgs({kind: 'copy', text: 'Hello'}, ctx)).toEqual({ok: true, handoff: {kind: 'copy', text: 'Hello'}});
    expect(handoffFromArgs({kind: 'link'}, ctx)).toMatchObject({ok: false, reason: 'link'});
  });
  it('a link a model names is marked as not the person’s own, unless that exact address stands in words they typed themselves', () => {
    const link = (typed?: string[]) => { const b = handoffFromArgs({kind: 'link', url: 'https://example.com/docs'}, {now: NOW, typed}); if (!b.ok || b.handoff.kind !== 'link') throw Error('expected a link'); return b.handoff.untrusted; };
    expect(link()).toBe(true); expect(link([])).toBe(true);
    expect(link(['what is on https://example.com/docs?'])).toBe(false); expect(link(['see example.com/docs please'])).toBe(false);
    expect(link(['what is on https://example.com/other'])).toBe(true); expect(link(['https://example.com.evil.example/docs'])).toBe(true); expect(link(['https://evil.example/?u=https://example.com/docs'])).toBe(true);
  });
  it('at most one card per reply: the first request that ran and builds; a refused call is never applied; the rest are dropped', () => {
    expect(MAX_MODEL_HANDOFFS).toBe(1);
    const calls = [
      {tool: 'weight', args: {kind: 'copy', text: 'not a hand-off'}, ok: true},
      {tool: 'hand_off', args: {kind: 'copy', text: 'refused by the registry'}, ok: false},
      {tool: 'hand_off', args: {kind: 'email', text: '<b>does not fit</b>'}, ok: true},
      {tool: 'hand_off', args: {kind: 'email', to: 'a@example.com', subject: 'First'}, ok: true},
      {tool: 'hand_off', args: {kind: 'link', url: 'https://example.com/second'}, ok: true},
      {tool: 'hand_off', args: {kind: 'copy', text: 'third'}, ok: true},
    ];
    const made = handoffFromCalls(calls, ctx);
    expect(made.handoff).toMatchObject({kind: 'email', subject: 'First'}); expect(made.dropped).toBe(2); expect(made.refused).toBeNull();
    expect(handoffFromCalls([], ctx)).toEqual({handoff: null, refused: null, dropped: 0});
    expect(handoffFromCalls([{tool: 'hand_off', args: null, ok: true}, {tool: 'hand_off', args: {kind: 'share'}, ok: true}], ctx)).toMatchObject({handoff: null, refused: expect.stringContaining('nothing to share')});
    expect(handoffFromCalls([{tool: 'hand_off', args: {kind: 'copy', text: SEED}, ok: true}], ctx)).toEqual({handoff: null, refused: SECRET_WORDS.en, dropped: 0});
  });
  it('Q14, Q16: in a conversation that read Health, a model’s hand-off is made only while NOVA’s Health permission and the Health gate are both on', () => {
    const args = {kind: 'email' as const, to: 'coach@example.com', subject: 'My week', text: 'Slept 7 h 10 min; weight 71.2 kg.'};
    expect(handoffFromArgs(args, {now: NOW, healthRead: true, healthOpen: false})).toEqual({ok: false, reason: 'empty', words: HEALTH_CLOSED_WORDS.en});
    expect(handoffFromArgs(args, {now: NOW, healthRead: true, healthOpen: false, lang: 'nl'})).toMatchObject({ok: false, words: HEALTH_CLOSED_WORDS.nl});
    expect(handoffFromArgs(args, {now: NOW, healthRead: true, healthOpen: true})).toMatchObject({ok: true});
    expect(handoffFromArgs(args, {now: NOW, healthRead: false, healthOpen: false})).toMatchObject({ok: true});
    expect(handoffFromCalls([{tool: 'hand_off', args, ok: true}], {now: NOW, healthRead: true, healthOpen: false})).toEqual({handoff: null, refused: HEALTH_CLOSED_WORDS.en, dropped: 0});
    // Whether a reply read Health comes from its lookups and record labels, by the registry's own areas: never from its words.
    const isHealth = (name: string) => toolByName(name)?.area === 'health';
    expect(TOOLS.some(t => t.area === 'health')).toBe(true);
    const healthTool = TOOLS.find(t => t.area === 'health')!.name;
    expect(readHealth({tools: [healthTool]}, isHealth)).toBe(true); expect(readHealth({tools: ['tasks', 'bills', 'hand_off', 'stage_widget']}, isHealth)).toBe(false);
    expect(readHealth({records: ['Health: sleep, weight']}, isHealth)).toBe(true); expect(readHealth({records: ['Today’s page', 'Goals: Japan']}, isHealth)).toBe(false);
    expect(readHealth({}, isHealth)).toBe(false);
  });
  it('the hand-off tool itself is not a Health tool and reads nothing of Health', () => {
    expect(handOffTool.area).toBe('today'); expect(toolByName('hand_off')?.area).not.toBe('health');
    const withHealth: ToolEnv = {...onNova(), areas: {...onNova().areas, health: true}};
    expect(JSON.stringify(runTool('hand_off', {kind: 'copy', text: 'x'}, withHealth))).toBe(JSON.stringify(runTool('hand_off', {kind: 'copy', text: 'x'}, onNova())));
  });
});
