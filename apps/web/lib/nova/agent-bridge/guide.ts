import type {GuideStep, Os} from '../setup-guide';
import {PROTOCOL_LATEST} from './client';

/**
 * Session AM-2 (owner's step 4d): "Make NOVA your own agent", the words and copyable commands of the path in the setup
 * hub, per operating system. Pure.
 *
 * The commands here are only ones that ship with the operating system and whose exact form is certain: `curl` (macOS,
 * Linux), `curl.exe` and PowerShell's own `Get-NetTCPConnection` (Windows 10 and later), `lsof` (macOS) and `ss` (Linux).
 * They only ASK this computer (a loopback address); none installs or starts anything. How to install and start an agent
 * or a tool server is that program's own business: the guide says so and points at its documentation rather than
 * inventing a package name or a flag. Hermes Agent has its own guide with its own checked commands (/app/nova/hermes).
 */
export const AGENT_GUIDE_ID = 'own-agent';
export const AGENT_GUIDE_TITLE = 'Make NOVA your own agent';
export const AGENT_GUIDE_LEDE = 'Give NOVA hands outside ZIGoals — through an agent and tools that run on your own computer, with their own accounts. NOVA lists the tools it finds; every action is a card you approve; nothing is ever sent by itself.';
export const EXAMPLE_AGENT_PORT = 8000, EXAMPLE_TOOLS_PORT = 8000;
export const USE_DOCS = 'use the command your tool’s documentation gives';
export type AgentGuideStepId = 'what' | 'agent' | 'server' | 'allow' | 'connect' | 'switch' | 'use' | 'remove';
export const AGENT_GUIDE_STEPS: readonly {id: AgentGuideStepId; title: string; short: string}[] = [
  {id: 'what', title: 'What this is, and what it is not', short: 'Your agent, your tools, your accounts'},
  {id: 'agent', title: 'Run your agent on this computer', short: 'Hermes Agent, or any OpenAI-compatible agent'},
  {id: 'server', title: 'Run a tool server on this computer', short: 'A Model Context Protocol server, on a loopback address'},
  {id: 'allow', title: 'Let this site reach it', short: 'One setting in the server, one question from the browser'},
  {id: 'connect', title: 'Connect it to NOVA', short: 'The address, a token if it wants one, a live check'},
  {id: 'switch', title: 'Switch on only what you need', short: 'Every tool starts Off'},
  {id: 'use', title: 'Ask, read the card, approve', short: 'Nothing runs without your press'},
  {id: 'remove', title: 'Remove a connection', short: 'One button; the tool keeps nothing of NOVA’s'},
];
/** What each step shares, and with whom. */
export const AGENT_GUIDE_SHARES: Readonly<Record<AgentGuideStepId, string>> = {
  what: 'Nothing is shared by reading this.',
  agent: 'Nothing leaves this computer: the check asks your own agent, on its loopback address, for its list of models.',
  server: 'Nothing leaves this computer: the server only listens. What it later sends out, it sends with its own accounts.',
  allow: 'Nothing is shared: you tell your own server that this site may talk to it, and your browser that this site may reach apps on this computer.',
  connect: 'NOVA asks your server, on this computer, what it is and which tools it has. A token you type goes to that server only. ZIGoals’ servers see none of it.',
  switch: 'Nothing is shared: the switches are kept on this device.',
  use: 'What the card shows — the tool and the exact arguments — goes to your own server when you press. What the tool then does with its own accounts (send a mail, search the web) is outside ZIGoals.',
  remove: 'Nothing is shared. Removing forgets the address, the switches and any remembered token on this device.',
};
export const AGENT_GUIDE_SAFETY: readonly string[] = [
  'A tool acts with YOUR accounts on your computer: it can send a mail in your name or change your calendar. Connect only tools you chose and trust.',
  'Start with every tool Off. Switch on “Ask every time” only for the tools you need. There is no “always allow”.',
  'Read a card before you approve it: which server, which tool, the exact arguments. NOVA cannot see or undo what a tool does.',
  'Everything a tool answers is untrusted text. NOVA shows it as plain text, never follows it, and never lets a result start another tool.',
  'Keep your server on a loopback address (127.0.0.1 or localhost), never on 0.0.0.0: then only programs on this computer can reach it.',
  'NOVA and ZIGoals never store or see your mail passwords or tokens: those stay in your agent and your tools. A token for the tool server itself stays in this browser.',
];
const base = (port: number) => `http://127.0.0.1:${port}`;
const INITIALIZE = `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${PROTOCOL_LATEST}","capabilities":{},"clientInfo":{"name":"check","version":"1"}}}`;
/** Step 2: is an agent answering on its loopback port? */
export function agentSteps(os: Os, port = EXAMPLE_AGENT_PORT): GuideStep[] {
  const shell = os === 'windows' ? 'PowerShell' as const : 'Terminal' as const;
  return [
    {text: 'Using Hermes Agent? Follow its own guide (the link below): it has the exact commands, and a check for every step.'},
    {text: `Using another agent? Start it so that it serves the OpenAI-compatible API on this computer — ${USE_DOCS}. Note the port it prints (the examples here use ${port}).`},
    {text: 'Ask it for its models yourself. A list of models means it is running; an error about a key means it wants one.',
      command: os === 'windows' ? `curl.exe -i ${base(port)}/v1/models` : `curl -i ${base(port)}/v1/models`, shell},
    {text: 'Then check it from here: type the address under “Your own agent” below and press “Check my agent”.'},
  ];
}
/** Step 3: a tool server, listening on a loopback address only. */
export function serverSteps(os: Os, port = EXAMPLE_TOOLS_PORT): GuideStep[] {
  const shell = os === 'windows' ? 'PowerShell' as const : 'Terminal' as const;
  return [
    {text: `Pick a Model Context Protocol (MCP) server for what you want — mail, web search, a calendar — and start it in its “Streamable HTTP” mode on 127.0.0.1: ${USE_DOCS}. It prints an address, usually ending in /mcp.`},
    {text: 'It signs in to your mail or calendar itself, in its own settings. Those passwords and tokens stay there: never give them to NOVA.'},
    {text: 'See what is listening, and on which address. Your server should show 127.0.0.1 (or ::1), not 0.0.0.0 and not *.',
      command: os === 'mac' ? 'lsof -nP -iTCP -sTCP:LISTEN' : os === 'linux' ? 'ss -ltnp' : 'Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess', shell},
    // The same question NOVA asks. On Windows the quoting of a JSON body differs between PowerShell versions, so the guide
    // does not print a command it cannot be sure of: NOVA's own check (step 5) asks it instead.
    os === 'windows'
      ? {text: 'To ask it to introduce itself, use NOVA’s own check in step 5 (“Connect and list tools”): it asks the server’s “initialize” and says what answered.'}
      : {text: 'Ask it to introduce itself. An answer that names the server means it speaks MCP at that address.',
          command: `curl -i -X POST ${base(port)}/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '${INITIALIZE}'`, shell},
  ];
}
/** Step 4: the server allows this site; the browser allows the site to reach this computer. */
export function allowSteps(origin: string): GuideStep[] {
  return [
    {text: `Your server answers a web page only if it is told to. In its settings, allow this site’s address (its “CORS” or “allowed origins” setting) — ${USE_DOCS}:`, command: origin},
    {text: 'If the setting asks which headers a page may send, allow these; and let the page read (expose) Mcp-Session-Id.', command: 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version'},
    {text: 'Allow this one site only. Do not use * (any site): any web page you open could then use your tools.'},
    {text: 'The first time, your browser asks whether this site may reach apps on this computer. Choose Allow. (Safari cannot do this from a secure site: use Chrome, Edge or Firefox.)'},
  ];
}
export const CONNECT_LINES: readonly string[] = [
  'Type the address your server printed under “Tool servers on this computer” below. Only http://127.0.0.1:<port>, http://localhost:<port> or http://[::1]:<port> is accepted.',
  'If the server wants a token, type it there. It is kept for this visit only, unless you tick “Remember on this device” (then it is sealed in this browser, as your model key is). It is never synced, never in an export, and sent only to that server.',
  'Press “Connect and list tools”. NOVA says what answered and how many tools it found.',
];
export const USE_LINES: readonly string[] = [
  'With a model connected, ask in your own words (“search the web for…”, “mail Anna that…”). Your model may propose ONE tool; NOVA shows it as a card.',
  'Without a model, open a tool below and press “Fill in by hand”: the same card.',
  'The card shows the server’s address on this computer, the tool, each argument, and the raw JSON if you want it. Press “Run this tool once”, or “Not now”.',
  'What the tool answers is shown as plain, untrusted text. You decide whether your model may read it. A result never starts another tool.',
  'Every call you approved is listed under “Sent out from this device”: when, which server, which tool, and whether it worked — never the arguments or the result.',
];
export const REMOVE_LINES: readonly string[] = [
  'Under “Tool servers on this computer”, press “Remove” on a server: its address, its switches and any remembered token are forgotten on this device.',
  '“Disconnect” only ends this visit’s connection; “All tools Off” keeps the address and switches every tool Off.',
  'Stopping the server program on your computer ends it for every app. To take back what a tool may do with your mail or calendar, revoke its access in that account’s own settings.',
];
/** The live checks' lines. */
export const liveAgentLine = (ok: boolean, words: string): string => ok ? words : `Not yet. ${words}`;
export const liveServerLine = (server: string, protocol: string, tools: number, skipped = 0): string =>
  `It answered “initialize”${server ? ` as ${server}` : ''} (protocol ${protocol}). ${tools === 0 ? 'It lists no tools.' : `${tools} tool${tools === 1 ? '' : 's'} found, all Off.`}${skipped ? ` ${skipped} could not be read and ${skipped === 1 ? 'is' : 'are'} left out.` : ''}`;
