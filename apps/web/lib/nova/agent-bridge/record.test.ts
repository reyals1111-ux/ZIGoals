import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import egress from '../../egress-policy.json';
import {connectSources} from '../../csp-compose.mjs';
import {readDeviceRecord, updateDeviceRecord} from '../../device-record';
import {NOVA_OUTBOX, NOVA_OUTBOX_KEY, appendOutbox, emptyOutbox, noteOutbox, outboxOf} from '../outbox/record';
import {agentBase, agentCheckLine, brainAllowed, checkOwnAgent, OWN_AGENT_WORDS} from './own-agent';
import {addServer, allOff, askCount, clearOwnAgent, confirmOwnAgentLocal, emptyAgentRecord, keepListed, MAX_ASK, MAX_SERVERS, NOVA_AGENT, NOVA_AGENT_KEY, NOVA_AGENT_RESTORE, novaAgentRestoreSchema, novaAgentSchema, ownAgentOf, removeServer, renameServer, serverById, serverId, serversOf, setOwnAgent, setToolAsk, toolAsks, tokenSlot, type NovaAgentRecord} from './record';

/** Session AM-2 (step 4c, items 5–8): the device record, the history entry, the person's own agent, and what the content security policy allows. */
const at = new Date('2026-11-15T10:00:00.000Z');
const one = () => addServer(emptyAgentRecord(), {id: 'srv00001', address: 'http://127.0.0.1:8000/mcp', label: 'My tools', at});

describe('zigoals:nova-agent:v1', () => {
  it('a new server starts with every tool Off; a switch is "Ask every time" or Off, nothing else', () => {
    const {record, server} = one();
    expect(record).toEqual({version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8000/mcp', label: 'My tools', addedAt: '2026-11-15T10:00:00.000Z'}]});
    expect(server).not.toHaveProperty('ask'); expect(toolAsks(server, 'search')).toBe(false); expect(askCount(record)).toBe(0);
    const on = setToolAsk(record, 'srv00001', 'search', true);
    expect(serverById(on, 'srv00001')!.ask).toEqual(['search']); expect(toolAsks(serverById(on, 'srv00001')!, 'search')).toBe(true); expect(askCount(on)).toBe(1);
    expect(setToolAsk(on, 'srv00001', 'search', true)).toEqual(on); // once
    expect(setToolAsk(on, 'srv00001', 'search', false)).toEqual(record); // Off is absent, not a value
    expect(setToolAsk(record, 'nope', 'search', true)).toEqual(record);
    expect(() => setToolAsk(record, 'srv00001', 'not a tool', true)).toThrow();
    // No field anywhere says "always", "allow" or "auto": the schema has no place for one.
    const source = readFileSync(join(__dirname, 'record.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(source).not.toMatch(/always|auto|allow|trusted/i);
  });
  it('holds no token, description, schema, argument or result — only an id, the address, a label, a time and the switched tools', () => {
    const full = setToolAsk(one().record, 'srv00001', 'search', true);
    expect(Object.keys(full.servers![0]!).sort()).toEqual(['addedAt', 'address', 'ask', 'id', 'label']);
    expect(tokenSlot('srv00001', 'http://127.0.0.1:8000/mcp')).toBe('mcp-srv00001-i8000'); /* finding 8 (deliberate): the slot is the id and the origin */ expect(JSON.stringify(full)).not.toMatch(/token|secret|password|description|schema|arguments|result/i);
  });
  it('only a loopback address can be stored, by a change or by hand', () => {
    for (const address of ['https://example.com/mcp', 'http://192.168.1.10:8000', 'http://2130706433:8000', 'http://user:pw@127.0.0.1:8000', 'http://127.0.0.1:8000/mcp?token=abc', 'http://localhost.evil.example']) {
      expect(() => addServer(emptyAgentRecord(), {id: 'srv00002', address, at}), address).toThrow();
      // A record edited by hand, or crafted: the row is left out when read, the rest still reads.
      const crafted = {version: 1, servers: [{id: 'evil0001', address, label: 'Evil', ask: ['run']}, {id: 'srv00001', address: 'http://localhost:9000/mcp', label: 'Good'}]};
      expect(novaAgentSchema.parse(crafted).servers, address).toEqual([{id: 'srv00001', address: 'http://localhost:9000/mcp', label: 'Good'}]);
    }
  });
  it('bounded and tolerant: at most eight servers, one per id and address, a hundred switched tools, plain labels', () => {
    let record = emptyAgentRecord();
    for (let i = 0; i < MAX_SERVERS; i++) record = addServer(record, {id: `srv0000${i}`, address: `http://127.0.0.1:${8000 + i}/mcp`, at}).record;
    expect(serversOf(record)).toHaveLength(MAX_SERVERS);
    expect(() => addServer(record, {id: 'srv00009', address: 'http://127.0.0.1:9999/mcp', at})).toThrow(/At most 8/);
    expect(addServer(record, {id: 'srv00009', address: 'http://127.0.0.1:8000/mcp', at})).toEqual({record, server: serversOf(record)[0]}); // the same address is the same server
    expect(serversOf(record)[0]!.label).toBe('127.0.0.1:8000'); // no label given: the address
    const many = {version: 1, servers: Array.from({length: 30}, (_, i) => ({id: `srv${String(i).padStart(5, '0')}`, address: `http://127.0.0.1:${7000 + i}`, label: 'x'}))};
    expect(novaAgentSchema.parse(many).servers).toHaveLength(MAX_SERVERS);
    const dup = {version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8000', label: 'a'}, {id: 'srv00001', address: 'http://127.0.0.1:8001', label: 'b'}, {id: 'srv00002', address: 'http://127.0.0.1:8000/', label: 'c'}]};
    expect(novaAgentSchema.parse(dup).servers!.map(s => s.label)).toEqual(['a']);
    const asks = {version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8000', label: 'a', ask: [...Array.from({length: 150}, (_, i) => `t${i}`), 't0', 'bad name', 7, null]}]};
    expect(novaAgentSchema.parse(asks).servers![0]!.ask).toHaveLength(MAX_ASK);
    expect(JSON.parse(JSON.stringify(novaAgentSchema.parse({version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8000', label: 'a', ask: 'all'}]}))).servers[0]).toEqual({id: 'srv00001', address: 'http://127.0.0.1:8000', label: 'a'}); // not a list: Off
    for (const bad of [{version: 2}, {servers: []}, {version: 1, servers: 'x'}, null, 'x']) expect(novaAgentSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    expect(novaAgentSchema.parse({version: 1, later: {kept: true}})).toEqual({version: 1, later: {kept: true}}); // a later build's field survives
    expect(renameServer(one().record, 'srv00001', '  Mail\u202E and\ncalendar  ').servers![0]!.label).toBe('Mail and calendar');
    expect(() => renameServer(one().record, 'srv00001', '   ')).toThrow();
    expect(removeServer(one().record, 'srv00001')).toEqual({version: 1});
    expect(serverId(new Uint8Array([0, 1, 2, 25, 26, 35, 36, 255]))).toBe('abcz09ad'); expect(serverId(new Uint8Array(8))).toMatch(/^[a-z0-9]{8}$/);
  });
  it('a tool the server no longer lists is no longer switched on; "all off" switches everything Off', () => {
    let record = setToolAsk(setToolAsk(one().record, 'srv00001', 'search', true), 'srv00001', 'send_mail', true);
    expect(keepListed(record, 'srv00001', ['search', 'send_mail', 'new_tool'])).toBe(record);
    record = keepListed(record, 'srv00001', ['search']);
    expect(serverById(record, 'srv00001')!.ask).toEqual(['search']);
    expect(serverById(keepListed(record, 'srv00001', []), 'srv00001')).not.toHaveProperty('ask');
    expect(askCount(allOff(record))).toBe(0); expect(serversOf(allOff(record))).toHaveLength(1);
  });
  it('a restore brings the addresses and labels; every tool comes back Off and the agent unconfirmed', () => {
    let record = setToolAsk(setToolAsk(one().record, 'srv00001', 'search', true), 'srv00001', 'send_mail', true);
    record = confirmOwnAgentLocal(setOwnAgent(record, {address: 'http://localhost:8642/v1', model: 'my-agent', at}), true);
    expect(NOVA_AGENT.schema.parse(record)).toEqual(record); // the device's own reader keeps the switches
    const restored = NOVA_AGENT_RESTORE.schema.parse(JSON.parse(JSON.stringify(record)));
    expect(restored).toEqual({version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8000/mcp', label: 'My tools', addedAt: '2026-11-15T10:00:00.000Z'}], agent: {address: 'http://localhost:8642', model: 'my-agent'}});
    expect(askCount(restored)).toBe(0);
    // A crafted file cannot switch a tool on in any spelling, nor bring another host.
    for (const crafted of [{version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8000', label: 'a', ask: ['x'], always: ['x'], mode: 'always'}]}, {version: 1, servers: [{id: 'srv00001', address: 'http://evil.example', label: 'a', ask: ['x']}]}])
      expect(askCount(novaAgentRestoreSchema.parse(crafted) as NovaAgentRecord)).toBe(0);
    expect([NOVA_AGENT_RESTORE.key, NOVA_AGENT_RESTORE.empty()]).toEqual([NOVA_AGENT_KEY, {version: 1}]); expect(NOVA_AGENT_KEY).toBe('zigoals:nova-agent:v1');
    expect(NOVA_AGENT_RESTORE.schema).not.toBe(NOVA_AGENT.schema);
  });
  it('reads and writes through the device-record pattern', () => {
    const m = new Map<string, string>(), storage = {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }};
    expect(readDeviceRecord(storage, NOVA_AGENT)).toEqual({data: {version: 1}, unreadable: false});
    updateDeviceRecord(storage, NOVA_AGENT, r => one().record && addServer(r, {id: 'srv00001', address: 'localhost:3000/mcp', at}).record);
    expect(JSON.parse(m.get(NOVA_AGENT_KEY)!)).toMatchObject({version: 1, servers: [{address: 'http://localhost:3000/mcp', label: 'localhost:3000'}]});
    m.set(NOVA_AGENT_KEY, '{not json'); expect(readDeviceRecord(storage, NOVA_AGENT)).toEqual({data: {version: 1}, unreadable: true});
  });
});

describe('the history: when, which server, which tool, ok or failed — never arguments or results', () => {
  it('an approved call is one entry of the shared record', () => {
    const entry = {at: at.toISOString(), kind: 'tool' as const, what: 'send_mail', target: 'http://127.0.0.1:8000', ok: true};
    const record = appendOutbox(emptyOutbox(), entry);
    expect(outboxOf(record)).toEqual([entry]); expect(Object.keys(outboxOf(record)[0]!).sort()).toEqual(['at', 'kind', 'ok', 'target', 'what']);
    expect(outboxOf(appendOutbox(record, {...entry, ok: false}))[0]).toMatchObject({ok: false});
    const m = new Map<string, string>(), storage = {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }};
    expect(noteOutbox(storage, entry)).toBe(true);
    expect(readDeviceRecord(storage, NOVA_OUTBOX).data.entries).toEqual([entry]); expect([...m.keys()]).toEqual([NOVA_OUTBOX_KEY]);
  });
});

describe('the person’s own OpenAI-compatible agent', () => {
  const models = (ids: string[], status = 200) => (async () => new Response(JSON.stringify({data: ids.map(id => ({id}))}), {status, headers: {'content-type': 'application/json'}})) as unknown as typeof fetch;
  it('its address is a loopback base a browser can reach, without the wire’s /v1', () => {
    expect(agentBase('http://127.0.0.1:8642/v1')).toEqual({ok: true, base: 'http://127.0.0.1:8642'});
    expect(agentBase('localhost:8000/')).toEqual({ok: true, base: 'http://localhost:8000'});
    expect(agentBase('http://[::1]:8000')).toMatchObject({ok: false, message: expect.stringMatching(/127\.0\.0\.1 or http:\/\/localhost/)});
    for (const bad of ['https://api.openai.com/v1', 'http://192.168.1.2:8000', 'http://2130706433:8000/v1', 'http://user:pw@localhost:8000']) expect(agentBase(bad).ok, bad).toBe(false);
  });
  it('the live check is GET <base>/v1/models through ZIGi’s own listing; a key goes only there', async () => {
    const seen: {url: string; init?: RequestInit}[] = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => { seen.push({url: String(input), init}); return new Response(JSON.stringify({data: [{id: 'my-agent'}, {id: 'whisper-1'}]}), {status: 200}); }) as typeof fetch;
    const check = await checkOwnAgent('http://127.0.0.1:8642/v1', 'key-123', {fetcher, now: () => 5});
    expect(check).toEqual({ok: true, base: 'http://127.0.0.1:8642', models: ['my-agent'], model: 'my-agent', ms: 0});
    expect(seen.map(s => s.url)).toEqual(['http://127.0.0.1:8642/v1/models']);
    expect(seen[0]!.init).toMatchObject({credentials: 'omit', headers: {authorization: 'Bearer key-123'}});
    expect(agentCheckLine(check)).toBe('Your agent answered on this computer in 0 ms: 1 model (my-agent).');
    const refusedAddress = await checkOwnAgent('https://example.com/v1', null, {fetcher}); expect(refusedAddress.ok).toBe(false); expect(seen).toHaveLength(1); // nothing was asked
  });
  it('says what is wrong in plain words: a key wanted or refused, nothing there, no model', async () => {
    expect(await checkOwnAgent('http://localhost:8000', null, {fetcher: models([], 401)})).toMatchObject({ok: false, message: expect.stringMatching(/asks for a key/)});
    expect(await checkOwnAgent('http://localhost:8000', 'k', {fetcher: models([], 401)})).toMatchObject({ok: false, message: expect.stringMatching(/refused the key/)});
    expect(await checkOwnAgent('http://localhost:8000', null, {fetcher: models([])})).toMatchObject({ok: false, message: expect.stringMatching(/lists no model/)});
    const down = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await checkOwnAgent('http://localhost:8000', null, {fetcher: down})).toMatchObject({ok: false, message: expect.stringMatching(/Nothing answered at that address, or the browser hid the answer/)});
  });
  it('as NOVA’s brain: Strict and Guarded need the person’s confirmation that it answers with a local model', () => {
    expect(brainAllowed(null, false)).toEqual({ok: true}); expect(brainAllowed('relaxed', false)).toEqual({ok: true});
    expect(brainAllowed('strict', true)).toEqual({ok: true}); expect(brainAllowed('guarded', true)).toEqual({ok: true});
    expect(brainAllowed('strict', false)).toMatchObject({ok: false, message: expect.stringMatching(/^Strict: an agent may pass your words on to a cloud model/)});
    expect(brainAllowed('guarded', false)).toMatchObject({ok: false, message: expect.stringMatching(/^Guarded:/)});
    expect(OWN_AGENT_WORDS.acts).toMatch(/its own accounts and tools, outside ZIGoals/); expect(OWN_AGENT_WORDS.acts).toMatch(/never sees or stores its passwords or tokens/); expect(OWN_AGENT_WORDS.acts).toMatch(/nothing goes through a ZIGoals server/);
  });
  it('the confirmation belongs to one address: another address starts unconfirmed', () => {
    let record = confirmOwnAgentLocal(setOwnAgent(emptyAgentRecord(), {address: 'http://127.0.0.1:8000/v1', model: 'a', at}), true);
    expect(ownAgentOf(record)).toEqual({address: 'http://127.0.0.1:8000', model: 'a', checkedAt: at.toISOString(), localConfirmed: true});
    record = setOwnAgent(record, {address: 'http://127.0.0.1:8000', model: 'b'}); expect(ownAgentOf(record)).toEqual({address: 'http://127.0.0.1:8000', model: 'b', localConfirmed: true}); // the same agent, checked again
    record = setOwnAgent(record, {address: 'http://127.0.0.1:9000', model: 'b'}); expect(ownAgentOf(record)).toEqual({address: 'http://127.0.0.1:9000', model: 'b'}); // another: asked again
    expect(confirmOwnAgentLocal(emptyAgentRecord(), true)).toEqual({version: 1}); expect(clearOwnAgent(record)).toEqual({version: 1});
    expect(() => setOwnAgent(emptyAgentRecord(), {address: 'https://example.com'})).toThrow();
  });
});

describe('the content security policy: loopback only, nothing added for this step', () => {
  it('connect-src already allows http://localhost:* and http://127.0.0.1:* (any port) and no other plain-http source', () => {
    expect(egress.localModelSources).toEqual(['http://localhost:*', 'http://127.0.0.1:*']);
    for (const cls of ['app', 'site'] as const) {
      const sources = connectSources(egress, cls) as string[];
      expect(sources.filter(s => s.startsWith('http:'))).toEqual(['http://localhost:*', 'http://127.0.0.1:*']);
      // A content security policy cannot name an IPv6 address (its host grammar has no brackets or colons): none is listed, so
      // a browser may block http://[::1] — said beside the address (./loopback.ts IPV6_NOTE) rather than widening the policy.
      expect(sources.some(s => s.includes('['))).toBe(false);
      expect(sources).not.toContain('http:'); expect(sources).not.toContain('*'); expect(sources.some(s => /^http:\/\/\*/.test(s))).toBe(false);
    }
  });
  it('this step’s code names no remote host', () => {
    for (const file of ['client.ts', 'loopback.ts', 'own-agent.ts', 'propose.ts', 'guard.ts', 'untrusted.ts', 'record.ts', 'schema.ts', 'jsonrpc.ts', 'sse.ts']) {
      const code = readFileSync(join(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/ .*$/gm, '');
      for (const m of code.matchAll(/https?:\/\/[^\s'"`<)]+/g)) expect(m[0], `${file}: ${m[0]}`).toMatch(/^http:\/\/(127\.0\.0\.1|localhost|\[::1\]|\$\{)/);
    }
  });
});
