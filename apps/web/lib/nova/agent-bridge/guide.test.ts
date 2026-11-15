import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {PROTOCOL_LATEST} from './client';
import {AGENT_GUIDE_ID, AGENT_GUIDE_SAFETY, AGENT_GUIDE_SHARES, AGENT_GUIDE_STEPS, AGENT_GUIDE_TITLE, agentSteps, allowSteps, CONNECT_LINES, liveAgentLine, liveServerLine, REMOVE_LINES, serverSteps, USE_DOCS, USE_LINES} from './guide';
import {isLoopback} from './loopback';
import {CARD_WARNING, CARD_WARNING_NL} from './propose';
import {CARD_WORDS} from './words';
import {OWN_AGENT_WAY} from '../setup-guide';

/** Session AM-2 (owner's step 4d): "Make NOVA your own agent" — the path's words and commands; and what the panel's code never does. */
const OSES = ['mac', 'windows', 'linux'] as const;
describe('the path', () => {
  it('eight steps, from what it is to how to remove it, each saying what it shares and with whom', () => {
    expect(AGENT_GUIDE_TITLE).toBe('Make NOVA your own agent'); expect(AGENT_GUIDE_ID).toBe('own-agent'); expect(OWN_AGENT_WAY.href).toBe(`/app/nova/setup#${AGENT_GUIDE_ID}`);
    expect(AGENT_GUIDE_STEPS.map(s => s.id)).toEqual(['what', 'agent', 'server', 'allow', 'connect', 'switch', 'use', 'remove']);
    expect(Object.keys(AGENT_GUIDE_SHARES).sort()).toEqual(AGENT_GUIDE_STEPS.map(s => s.id).sort());
    for (const words of Object.values(AGENT_GUIDE_SHARES)) expect(words).toMatch(/\.$/);
    expect(AGENT_GUIDE_SHARES.connect).toMatch(/A token you type goes to that server only\. ZIGoals’ servers see none of it\./);
    expect(AGENT_GUIDE_SHARES.use).toMatch(/with its own accounts .* is outside ZIGoals/);
    expect(AGENT_GUIDE_SHARES.agent).toMatch(/^Nothing leaves this computer/); expect(AGENT_GUIDE_SHARES.server).toMatch(/^Nothing leaves this computer/);
  });
  it('the safety notes: the tool acts with the person’s accounts, every tool starts Off, read the card, results are untrusted, loopback only, no passwords', () => {
    const all = AGENT_GUIDE_SAFETY.join(' ');
    for (const words of [/acts with YOUR accounts/, /Start with every tool Off/, /There is no “always allow”/, /Read a card before you approve it/, /NOVA cannot see or undo what a tool does/, /untrusted text/, /never lets a result start another tool/, /never on 0\.0\.0\.0/, /never store or see your mail passwords or tokens/]) expect(all).toMatch(words);
    expect(REMOVE_LINES.join(' ')).toMatch(/press “Remove”/); expect(REMOVE_LINES.join(' ')).toMatch(/revoke its access in that account’s own settings/);
    expect(CONNECT_LINES.join(' ')).toMatch(/kept for this visit only, unless you tick “Remember on this device”/); expect(CONNECT_LINES.join(' ')).toMatch(/never synced, never in an export, and sent only to that server/);
    expect(USE_LINES.join(' ')).toMatch(/A result never starts another tool/); expect(USE_LINES.join(' ')).toMatch(/never the arguments or the result/);
  });
  it('every operating system has its own copyable commands, and each only asks this computer', () => {
    for (const os of OSES) {
      const steps = [...agentSteps(os), ...serverSteps(os), ...allowSteps('https://alpha.zigoals.app')], commands = steps.flatMap(s => s.command ? [s] : []);
      expect(commands.length, os).toBeGreaterThanOrEqual(4);
      for (const step of steps) { expect(step.text.length, step.text).toBeGreaterThan(20); if (step.command && step.shell) expect(step.shell).toBe(os === 'windows' ? 'PowerShell' : 'Terminal'); }
      // Every address in a command is a loopback address NOVA itself would accept (or this site's own origin, to allow).
      for (const c of commands) for (const m of c.command!.matchAll(/https?:\/\/[^\s'"]+/g)) expect(m[0] === 'https://alpha.zigoals.app' || isLoopback(m[0]), `${os}: ${m[0]}`).toBe(true);
    }
    expect(agentSteps('mac')[2]!.command).toBe('curl -i http://127.0.0.1:8000/v1/models'); expect(agentSteps('linux', 8642)[2]!.command).toBe('curl -i http://127.0.0.1:8642/v1/models');
    expect(agentSteps('windows')[2]!.command).toBe('curl.exe -i http://127.0.0.1:8000/v1/models');
    expect(serverSteps('mac')[2]!.command).toBe('lsof -nP -iTCP -sTCP:LISTEN'); expect(serverSteps('linux')[2]!.command).toBe('ss -ltnp');
    expect(serverSteps('windows')[2]!.command).toBe('Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess');
    // The "initialize" a person can ask by hand is the one NOVA sends; where its quoting is not certain (Windows) NOVA's own check stands in.
    const init = serverSteps('linux', 9000)[3]!.command!;
    expect(init.startsWith("curl -i -X POST http://127.0.0.1:9000/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '")).toBe(true);
    expect(JSON.parse(init.slice(init.indexOf("-d '") + 4, -1))).toEqual({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: PROTOCOL_LATEST, capabilities: {}, clientInfo: {name: 'check', version: '1'}}});
    expect(serverSteps('windows')[3]).not.toHaveProperty('command'); expect(serverSteps('windows')[3]!.text).toMatch(/NOVA’s own check in step 5/);
  });
  it('never invents how to install or start a program: no package manager, no made-up flag — it points at the program’s own documentation', () => {
    const all = OSES.flatMap(os => [...agentSteps(os), ...serverSteps(os), ...allowSteps('https://alpha.zigoals.app')]);
    for (const step of all) if (step.command) expect(step.command, step.command).not.toMatch(/\b(npx|npm|pnpm|yarn|pip|pipx|uvx?|brew|apt|apt-get|dnf|pacman|winget|choco|docker|cargo|go install|git clone|sudo)\b/);
    expect(all.filter(s => s.text.includes(USE_DOCS)).length).toBeGreaterThanOrEqual(9); // three per operating system
    expect(USE_DOCS).toBe('use the command your tool’s documentation gives');
    expect(allowSteps('https://alpha.zigoals.app')[0]!.command).toBe('https://alpha.zigoals.app');
    expect(allowSteps('x')[1]!.command).toBe('Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
    expect(allowSteps('x').map(s => s.text).join(' ')).toMatch(/Do not use \* \(any site\)/);
  });
  it('the live checks say what answered and how many tools were found', () => {
    expect(liveServerLine('Pretend 1.2', PROTOCOL_LATEST, 3)).toBe(`It answered “initialize” as Pretend 1.2 (protocol ${PROTOCOL_LATEST}). 3 tools found, all Off.`);
    expect(liveServerLine('', '2025-03-26', 1, 2)).toBe('It answered “initialize” (protocol 2025-03-26). 1 tool found, all Off. 2 could not be read and are left out.');
    expect(liveServerLine('S', '2025-03-26', 0)).toBe('It answered “initialize” as S (protocol 2025-03-26). It lists no tools.');
    expect(liveAgentLine(true, 'Your agent answered.')).toBe('Your agent answered.'); expect(liveAgentLine(false, 'Nothing answered.')).toBe('Not yet. Nothing answered.');
  });
  it('the card’s words exist in English and Dutch, with the plain warning in both', () => {
    expect(Object.keys(CARD_WORDS.nl).sort()).toEqual(Object.keys(CARD_WORDS.en).sort());
    expect(CARD_WORDS.en.warning).toBe(CARD_WARNING); expect(CARD_WORDS.nl.warning).toBe(CARD_WARNING_NL);
    expect(CARD_WARNING_NL).toMatch(/eigen computer/); expect(CARD_WARNING_NL).toMatch(/NOVA kan niet zien of ongedaan maken/);
    expect(CARD_WORDS.en.title('send_mail')).toBe('Use “send_mail” once?'); expect(CARD_WORDS.nl.title('send_mail')).toBe('“send_mail” één keer gebruiken?');
    for (const lang of ['en', 'nl'] as const) { expect(CARD_WORDS[lang].fromTool).toMatch(/untrusted|niet vertrouwd/); expect(CARD_WORDS[lang].described).toMatch(/untrusted|niet vertrouwd/); }
  });
});

describe('the panel’s code: what it never does', () => {
  const dir = join(__dirname, '../../../components/nova/agent');
  const files = readdirSync(dir).filter(f => /\.tsx?$/.test(f)), code = (f: string) => readFileSync(join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/g, '');
  it('a server’s words are only ever text: no markup made from them, no link made from them', () => {
    expect(files.sort()).toEqual(['agent-entry.tsx', 'agent-guide.tsx', 'agent-panel.tsx', 'live-store.ts', 'proposals-gate.tsx', 'tool-card.tsx', 'tool-proposals.tsx', 'use-agent-bridge.ts']);
    for (const f of files) {
      const src = code(f);
      expect(src, f).not.toMatch(/dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(/);
      // Every link goes to one of the app's own pages, written in the code: none is built from a value.
      for (const m of src.matchAll(/href=(\{[^}]*\}|"[^"]*")/g)) expect(m[1], `${f}: ${m[0]}`).toMatch(/^"\/app\/nova\/(hermes|setup#own-agent)"$/);
      expect(src, f).not.toMatch(/window\.open|location\.(href|assign|replace)|<a\s/);
    }
  });
  it('a tool is called only from the card’s button, through the one `run`; the card sends once', () => {
    const callers = files.filter(f => /\bcallTool\(/.test(code(f)));
    expect(callers).toEqual(['use-agent-bridge.ts']);
    expect(code('use-agent-bridge.ts').match(/\bcallTool\(/g)).toHaveLength(1);
    // `run` looks first (mayRun), and notes the history after: when, the tool's name, the origin, ok — nothing else.
    const run = code('use-agent-bridge.ts');
    expect(run.indexOf('mayRun(')).toBeGreaterThan(0); expect(run.indexOf('mayRun(')).toBeLessThan(run.indexOf('callTool('));
    expect(run).toMatch(/noteOutbox\(getAppStorage\(\), \{at: new Date\(\)\.toISOString\(\), kind: 'tool', what: card\.tool\.name, target: card\.origin, ok\}\)/);
    expect(run).toMatch(/options\.keep !== false && noteOutbox\(/); // a conversation that is not kept writes no line
    expect(run.match(/noteOutbox\(/g)).toHaveLength(1);
    // The card: one press, one call; Escape and "Not now" close it with nothing sent.
    const card = code('tool-card.tsx');
    expect(card).toMatch(/if \(state !== 'ask'\) return;/); expect(card.match(/\brun\(card, ctx\)/g)).toHaveLength(1);
    // `run` is only ever handed to the card as its button's action: by the panel as it is, by the chat with "keep" (a chat that is not kept adds no history line).
    expect(files.filter(f => /\bbridge\.run\b/.test(code(f))).sort()).toEqual(['agent-panel.tsx', 'tool-proposals.tsx']);
    expect(code('agent-panel.tsx').match(/bridge\.run\b/g)).toEqual(['bridge.run']); expect(code('agent-panel.tsx')).toMatch(/run=\{bridge\.run\}/);
    expect(code('tool-proposals.tsx').match(/bridge\.run\b/g)).toEqual(['bridge.run']); expect(code('tool-proposals.tsx')).toMatch(/run=\{\(card, ctx\) => bridge\.run\(card, ctx, \{keep: session\.kept\}\)\}/);
  });
  it('a token is typed into a password field, kept through the device’s key store, and never put in the record, a log or a URL', () => {
    const panel = code('agent-panel.tsx'), bridge = code('use-agent-bridge.ts');
    expect(panel.match(/type="password"/g)!.length).toBeGreaterThanOrEqual(3);
    expect(bridge).toMatch(/rememberKey\(scope, tokenSlot\(/); expect(bridge).toMatch(/holdKey\(scope, tokenSlot\(/); expect(bridge).toMatch(/forgetKey\(currentAiScope\(\), tokenSlot\(id\)\)/);
    for (const f of files) { const src = code(f); expect(src, f).not.toMatch(/console\.(log|info|warn|error|debug)/); expect(src, f).not.toMatch(/localStorage|sessionStorage\.setItem|document\.cookie/); expect(src, f).not.toMatch(/[?&]token=|\$\{token\}/); }
    expect(bridge).not.toMatch(/record\.update\([^)]*token/);
  });
  it('the conversation hands a result to the model only as wrapped, pasted data, on the person’s press', () => {
    const proposals = code('tool-proposals.tsx');
    expect(proposals).toMatch(/session\.send\(wrapToolResult\(\{origin: card\.origin, tool: card\.tool\.name, text: outcome\.text\}\), \{area: 'today', pasted: true\}\)/);
    expect(proposals.match(/session\.(send|ask)\(/g)).toHaveLength(1);
    expect(proposals).toMatch(/if \(!reply \|\| reply\.source === 'local'\) return/); // only a model proposes, never the device's own answers
    expect(proposals).toMatch(/hidden: document\.visibilityState !== 'visible'/);
    // NOVA's chat offers the tools with a message only when that message holds no tool result.
    const chat = readFileSync(join(dir, '../chat/nova-chat.tsx'), 'utf8');
    expect(chat).toMatch(/if \(!holdsToolResult\(question\)\) \{ try \{ const offered = offeredNow\(\); if \(offered\.length\) pack\.env\.agentTools = \{offered\}; \}/);
    expect(chat.match(/agentTools/g)).toHaveLength(1);
  });
  it('the sheet animates only transform and opacity (B2), keeps 44 px targets and labels of 14 px or more', () => {
    const css = readFileSync(join(dir, 'agent.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/transition:\s*([^;}]+)/g)) expect(m[1]!.trim(), m[0]).toMatch(/^(none|(opacity|transform) [\d.]+s( [a-z-]+)?)$/);
    const frames = /@keyframes na-card-in \{([^@]*?\})\s*\}/.exec(css)![1]!;
    for (const m of frames.matchAll(/([a-z-]+):/g)) expect(['opacity', 'transform']).toContain(m[1]);
    expect(css.match(/@keyframes/g)).toHaveLength(1);
    for (const m of css.matchAll(/font-size:\s*(\d+)px/g)) expect(Number(m[1]), m[0]).toBeGreaterThanOrEqual(14);
    for (const selector of ['.na-key', '.na-switch', '.na-check', '.na-details > summary']) expect(css, selector).toMatch(new RegExp(`${selector.replace(/[.>]/g, '\\$&')} \\{[^}]*min-height: 44px`));
    expect(css).toMatch(/\.na-field > :where\(input, textarea, select\) \{[^}]*min-height: 44px/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/); expect(css).toMatch(/data-app-motion=off/);
  });
});
