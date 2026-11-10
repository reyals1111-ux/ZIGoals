import type {PathColour} from '../path/colours';
import type {SetupStepId} from './setup';

/**
 * Session AK, owner follow-up 2 (N3, lane NC): the words and facts of "Build your own NOVA". Every command and fact here
 * comes from docs/research/session-ak/NOVA.md (read 1 Nov 2026, sources [S1]–[S60] there) and was checked again against
 * the vendors' own pages by lane NC: Ollama's FAQ and download pages, LM Studio's CLI and server pages, llama.cpp's server
 * README and install guide, the Ollama library and Hugging Face model metadata, and each provider's billing help.
 * One command per block, so each can be copied alone. The app's own origin is passed in (`location.origin`).
 */
export type Os = 'mac' | 'windows' | 'linux';
export const OS_LABELS: Readonly<Record<Os, string>> = {mac: 'macOS', windows: 'Windows', linux: 'Linux'};
export function detectOs(userAgent: string, platform = ''): Os {
  const s = `${userAgent} ${platform}`.toLowerCase();
  if (s.includes('windows') || s.includes('win32') || s.includes('win64')) return 'windows';
  if (s.includes('mac os') || s.includes('macintosh') || s.includes('macintel')) return 'mac';
  return 'linux';
}
/** A step of a server's setup: words, and at most one command to copy (shell names the terminal it runs in). */
export type GuideStep = {text: string; command?: string; shell?: 'Terminal' | 'PowerShell'};
export type ServerId = 'ollama' | 'lmstudio' | 'llamacpp';
export const SERVER_LABELS: Readonly<Record<ServerId, string>> = {ollama: 'Ollama', lmstudio: 'LM Studio', llamacpp: 'llama.cpp'};
/** Pages on this computer itself (a person running ZIGoals locally): Ollama allows them already. */
export const isLocalOrigin = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/** The model picks by memory (NOVA.md §2.5; sizes from the Ollama library; licences from the model cards). */
export type MemoryBudget = 'ram8' | 'ram16' | 'ram32' | 'vram24' | 'vram32' | 'mac64';
export type ModelPick = {budget: MemoryBudget; label: string; hint: string; ollama: string; size: string; gguf: string; also: string; licence: string};
export const MODEL_PICKS: readonly ModelPick[] = [
  {budget: 'ram8', label: 'Light laptop · 8 GB', hint: '8 GB of memory, no graphics card', ollama: 'qwen3.5:4b', size: 'about 3.3–4 GB', gguf: 'unsloth/Qwen3.5-4B-GGUF', also: 'phi4-mini (2.5 GB), llama3.2:3b (2 GB)', licence: 'Apache 2.0'},
  {budget: 'ram16', label: 'Most laptops · 16 GB', hint: '16 GB of memory, or a 12 GB graphics card such as an RTX 4070 or 5070', ollama: 'qwen3.5:9b', size: 'about 6.6–7.6 GB', gguf: 'unsloth/Qwen3.5-9B-GGUF', also: 'gemma4:12b (about 8 GB), llama3.1:8b (4.9 GB)', licence: 'Apache 2.0'},
  {budget: 'ram32', label: 'A strong laptop or desktop · 32 GB', hint: '32 GB of memory, or a 16 GB graphics card such as an RTX 4070 Ti Super, 4080, 5070 Ti or 5080', ollama: 'gpt-oss:20b', size: 'about 14 GB', gguf: 'ggml-org/gpt-oss-20b-GGUF', also: 'mistral-small3.2:24b (15 GB), gemma4:26b (16–19 GB)', licence: 'Apache 2.0'},
  {budget: 'vram24', label: 'A gaming PC, or a Mac with 32–48 GB', hint: 'A 24 GB graphics card such as an RTX 4090, or a Mac with 32–48 GB', ollama: 'qwen3.8:27b', size: 'about 18 GB', gguf: 'ggml-org/Qwen3.8-27B-GGUF', also: 'gemma4:31b (19–20 GB), qwen3.6:35b (23 GB)', licence: 'Apache 2.0'},
  {budget: 'vram32', label: 'A top gaming PC · 32 GB graphics', hint: 'A 32 GB graphics card such as an RTX 5090', ollama: 'qwen3.6:35b', size: 'about 23 GB', gguf: 'ggml-org/Qwen3.6-35B-A3B-GGUF', also: 'qwen3.8:27b (18 GB), gemma4:31b (19–20 GB)', licence: 'Apache 2.0'},
  {budget: 'mac64', label: 'A Mac with 64 GB or more', hint: 'Apple silicon shares its memory with the graphics', ollama: 'qwen3.6:35b', size: 'about 23 GB', gguf: 'ggml-org/Qwen3.6-35B-A3B-GGUF', also: 'qwen3.8:27b (18 GB), llama3.3:70b (43 GB, Llama licence)', licence: 'Apache 2.0'},
];
export const MODEL_RULE = 'A rule of thumb: the download must fit in your graphics card’s memory for full speed, plus 1–3 GB to spare. On a Mac with Apple silicon, count about two thirds of its memory.';
/** Session AK P4 (FR-11): the largest model (billions of parameters) each memory size runs well, for the suggested model. */
export const MAX_PARAMS: Readonly<Record<MemoryBudget, number>> = {ram8: 4, ram16: 12, ram32: 24, vram24: 32, vram32: 36, mac64: 72};
export const pickFor = (budget: MemoryBudget): ModelPick => MODEL_PICKS.find(p => p.budget === budget) ?? MODEL_PICKS[1]!;
/**
 * Session AL (lane L7; Berlin BN-034, N-BN-12, P-PR-84): the memory choice starts from what the browser says about this
 * computer (navigator.deviceMemory is rounded and capped at 8 by the browser; hardwareConcurrency counts threads). Few
 * cores or 8 GB or less starts at the light pick; anything unknown keeps the usual default. The person can always change it.
 */
export function defaultBudget(nav: {deviceMemory?: number; hardwareConcurrency?: number} | null | undefined): MemoryBudget {
  const memory = typeof nav?.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null, cores = typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : null;
  return (memory !== null && memory < 8) || (cores !== null && cores <= 4) ? 'ram8' : 'ram16';
}
/** A computer with no graphics card (Berlin's CPU-only box): what to expect, and the small models that answer in time. */
export const CPU_NOTE = 'No graphics card? A model still runs on the processor, only slower: the first answer can take a minute or more while it reads your data. For a quick start, use a small model such as qwen2.5:0.5b, qwen3.5:0.8b or llama3.2:1b (ollama pull qwen2.5:0.5b); NOVA keeps its messages short for small models and tells you if one is too slow.';
/** BN-034: the context window. NOVA names it with every message, so there is nothing to set by hand. */
export const CONTEXT_NOTE = 'Ollama answers with a short memory (a 4,096-token context) unless asked for more. NOVA asks for the size each message needs (up to 32,768 tokens), so there is nothing to set; a bigger window uses more of your computer’s memory.';

/** Ollama, per OS (NOVA.md §2.2; Ollama FAQ and download pages). */
export function ollamaSteps(os: Os, origin: string, model: string): GuideStep[] {
  const local = isLocalOrigin(origin);
  const allow: GuideStep[] = local ? [{text: 'This page runs on this computer, so Ollama already allows it: no setting needed.'}] : os === 'mac' ? [
    {text: 'Allow ZIGoals. The Ollama app reads settings made with launchctl, not a shell export:', command: `launchctl setenv OLLAMA_ORIGINS "${origin}"`, shell: 'Terminal'},
    {text: 'Restart Ollama (or quit it from the menu bar icon and open it again):', command: `osascript -e 'quit app "Ollama"'; sleep 2; open -a Ollama`, shell: 'Terminal'},
    {text: 'This setting lasts until the Mac restarts. After a restart, run the two commands above again.'},
  ] : os === 'windows' ? [
    {text: 'Allow ZIGoals for your user account (Ollama reads your user’s environment variables):', command: `setx OLLAMA_ORIGINS "${origin}"`, shell: 'PowerShell'},
    {text: 'Restart Ollama: right-click the Ollama icon in the taskbar, choose Quit Ollama, then start Ollama from the Start menu.'},
  ] : [
    {text: 'Allow ZIGoals. This opens an editor: under [Service] add the line Environment="OLLAMA_ORIGINS=' + origin + '", then save.', command: 'sudo systemctl edit ollama.service', shell: 'Terminal'},
    {text: 'Load the change:', command: 'sudo systemctl daemon-reload', shell: 'Terminal'},
    {text: 'Restart Ollama:', command: 'sudo systemctl restart ollama', shell: 'Terminal'},
    // Session AL (BN-033, N-SL-01…05): a minimal Linux or a container has no systemd service; Ollama is started by hand.
    {text: 'No systemd (a minimal Linux or a container)? Skip the three steps above and start Ollama by hand, allowing only this site:', command: `OLLAMA_ORIGINS="${origin}" ollama serve`, shell: 'Terminal'},
  ];
  const shell = os === 'windows' ? 'PowerShell' as const : 'Terminal' as const;
  return [
    os === 'mac' ? {text: 'Install Ollama: download it for macOS from ollama.com/download, open it and drag Ollama to Applications, then open it once.'}
      : os === 'windows' ? {text: 'Install Ollama (or download OllamaSetup.exe from ollama.com/download). This command downloads Ollama’s own install script from ollama.com and runs it:', command: 'irm https://ollama.com/install.ps1 | iex', shell}
      : {text: 'Install Ollama. This downloads Ollama’s own install script from ollama.com and runs it; it asks for your password (sudo) and needs curl and zstd (on Debian or Ubuntu: sudo apt install curl zstd). To read the script first: curl -fsSL https://ollama.com/install.sh -o install.sh, open install.sh, then run sh install.sh.', command: 'curl -fsSL https://ollama.com/install.sh | sh', shell},
    {text: 'Download a model that fits your computer (see “Which model?” below):', command: `ollama pull ${model}`, shell},
    // Session AL final pass (N-SL-04, BN-033): what to do when the download fails.
    {text: `If the download fails: check there is free disk space (a model takes a few GB), then run the same command again (it picks up where it stopped). If it says it cannot connect, Ollama is not running: start it${os === 'linux' ? ' with ollama serve in another terminal' : ''}, then pull again. A network that blocks ollama.com stops the download; another network is the only way round that.`},
    ...allow,
    {text: 'Check that ZIGoals is allowed: an answer with “HTTP/1.1 200” and an Access-Control-Allow-Origin line means yes; “403” means the setting is not active yet.', command: `${os === 'windows' ? 'curl.exe' : 'curl'} -i -H "Origin: ${origin}" http://127.0.0.1:11434/api/version`, shell},
    // Session AL final pass (N-SL-02, N-BN-15): another program can hold port 11434; ZIGoals checks it (verifyOllama), and says so.
    {text: 'Check that port 11434 really is Ollama: the answer’s last line should read {"version":"…"} with Ollama’s version number. Anything else means another program holds the port; stop it, then start Ollama again. ZIGoals checks this as well: Find models and the connection test ask the port for Ollama’s version and model list, and say “not Ollama” when the answers don’t fit.'},
  ];
}
/**
 * Session AK P4 (FIRST_RUN_REVIEW FR-14): Ollama's cloud switch is no numbered step a newcomer must read; the guide folds it
 * under "For Strict privacy (optional)", word for word.
 */
export const OLLAMA_STRICT_NOTE = 'Ollama can also run “cloud” models on ollama.com that look local here. NOVA treats any model whose name ends in “cloud” as a cloud model. To switch Ollama’s cloud features off entirely, set OLLAMA_NO_CLOUD=1 the same way as OLLAMA_ORIGINS above.';
/** LM Studio (NOVA.md §2.3; LM Studio's server and CLI pages). */
export function lmStudioSteps(os: Os): GuideStep[] {
  const shell = os === 'windows' ? 'PowerShell' as const : 'Terminal' as const;
  return [
    {text: 'Install LM Studio from lmstudio.ai and open it once. (macOS: Apple silicon only.)'},
    {text: 'Download a model in LM Studio’s model search: type the name from “Which model?” below (for example Qwen3.5 9B) and pick a version that fits your memory.'},
    {text: 'In the Developer tab, open Server Settings and turn on Enable CORS. LM Studio recommends turning on Require Authentication too: then paste its token as the server token in the connection below.'},
    {text: 'Start the server on port 1234 with CORS on (or use the Start server switch in the Developer tab):', command: 'lms server start --cors --port 1234', shell},
    {text: 'Leave “Serve on Local Network” off: ZIGoals runs on this same computer.'},
  ];
}
/** llama.cpp's llama-server (NOVA.md §2.4; llama.cpp's server README and install guide). Its default port is now 9931. */
export function llamaCppSteps(os: Os, origin: string, gguf: string): GuideStep[] {
  const shell = os === 'windows' ? 'PowerShell' as const : 'Terminal' as const;
  return [
    os === 'windows' ? {text: 'Install llama.cpp:', command: 'winget install llama.cpp', shell} : {text: 'Install llama.cpp with Homebrew (or MacPorts, Nix or a release download):', command: 'brew install llama.cpp', shell},
    {text: 'Start the server with a model from Hugging Face (downloaded once) and this site allowed. Port 9931 is llama.cpp’s current default; older guides say 8080.', command: `llama-server -hf ${gguf} --port 9931 --cors-origins ${origin}`, shell},
    {text: 'Optional: add --api-key followed by a secret of your choice, then paste the same secret as the server token below.'},
  ];
}

/** The honest note about subscriptions (NOVA.md §4; the providers' own help pages). */
export const SUBSCRIPTION_NOTE = 'Your ChatGPT, Claude, Gemini or Grok subscription can’t sign in here: those plans pay for the provider’s own apps and don’t include access for other apps. Use a free local model (recommended), a free API tier, or your own API key.';
export const SUBSCRIPTION_DETAILS: readonly string[] = [
  'ChatGPT Plus and Pro: API use is separate and billed on its own (OpenAI Help Center).',
  'Claude Pro: the API is billed separately. Claude Max, Ultra and Team include monthly API credits: link them to a Claude Console organization (claude.ai → Settings → Billing → API credits), create an API key there, and paste that key here. ZIGoals then spends those credits like any key.',
  'Google AI Pro and Ultra: the plan’s developer benefits apply only inside Google AI Studio; the Gemini API is billed separately.',
  'SuperGrok and X Premium: xAI publishes no way for another app to use them; the xAI API is a separate, separately billed product.',
];
/** Own API keys: where to get one, a free tier where there is one, and the spending advice. */
export type KeyProvider = 'anthropic' | 'openai' | 'gemini' | 'xai';
export const KEY_NOTES: Readonly<Record<KeyProvider, {free: string}>> = {
  anthropic: {free: 'No free tier. Prepaid credits; Claude Max, Ultra and Team include monthly API credits (see above).'},
  openai: {free: 'No free tier. Prepaid credits, billed apart from ChatGPT.'},
  gemini: {free: 'A free tier exists for the Flash models, but Google may use free-tier prompts to improve its products and people may read them. Google’s terms also say apps offered to people in the EEA, Switzerland or the UK may use only the paid service: there, use a paid key.'},
  xai: {free: 'No free tier. Prepaid credits, billed apart from SuperGrok.'},
};
export const SPENDING_ADVICE = 'Before you paste a key, set a monthly spending limit in that provider’s billing settings. NOVA’s own cost meter is an estimate; the provider’s limit is the one that stops spending.';
export const OPENROUTER_NOTE = 'OpenRouter: one sign-in for many models, with its own page to see and revoke the key. Models whose name ends in “:free” cost nothing, with limits (20 a minute; 50 a day until you buy 10 credits). Check OpenRouter’s training setting for free models.';

/** The ten planets: words and look (four orbits, in the path engine's palette). */
/** `tab` (Session AK M7, layout audit): the shorter name the planet's tab shows on the path where the full one ran past a 320 px
 *  card; `label` stays its full name (the planet's accessible name, its title, the guide's heading). */
export type PlanetWords = {label: string; short: string; tab?: string; glyph: string; colour: PathColour};
export const PLANETS: Readonly<Record<SetupStepId, PlanetWords>> = {
  meet: {label: 'Meet NOVA', short: 'What stays private', glyph: 'sparkle', colour: 'purple'},
  privacy: {label: 'Privacy mode', short: 'Strict, Guarded or Relaxed', glyph: 'lock', colour: 'purple'},
  brain: {label: 'Your brain, local first', short: 'A model of your own', glyph: 'orbit', colour: 'cyan'},
  'first-chat': {label: 'First conversation', short: 'NOVA knows your day', tab: 'First chat', glyph: 'chat', colour: 'cyan'},
  scopes: {label: 'What NOVA can see', short: 'Pillar by pillar', glyph: 'target', colour: 'cyan'},
  memory: {label: 'Memory', short: 'Review and forget', glyph: 'book', colour: 'magenta'},
  voice: {label: 'Voice', short: 'Optional, on the device', glyph: 'language', colour: 'magenta'},
  briefs: {label: 'Daily briefs', short: 'Morning and evening', glyph: 'sun', colour: 'gold'},
  workflows: {label: 'Workflows', short: 'Review my week', glyph: 'checklist', colour: 'gold'},
  yours: {label: 'Make it yours', short: 'Layout, persona, cost cap', glyph: 'star', colour: 'gold'},
};
export const ORBITS: readonly {id: string; label: string; colour: PathColour; steps: readonly SetupStepId[]}[] = [
  {id: 'nova-private', label: 'Private by design', colour: 'purple', steps: ['meet', 'privacy']},
  {id: 'nova-brain', label: 'A brain of your own', colour: 'cyan', steps: ['brain', 'first-chat', 'scopes']},
  {id: 'nova-knows', label: 'Remember and speak', colour: 'magenta', steps: ['memory', 'voice']},
  {id: 'nova-daily', label: 'Your daily NOVA', colour: 'gold', steps: ['briefs', 'workflows', 'yours']},
];

/**
 * Session AL Part 14 (lane P14-B; security review Z1A-I1): with no privacy mode chosen, NOVA's chat sends to a cloud key as
 * ZIGi always did, while NOVA's briefs and workflows act as Strict. The two defaults disagree, so NOVA's composer says so
 * before the first cloud send and points to the choice. Null when a mode is chosen or the brain is on this computer.
 */
export function noModeCloudNote(mode: string | null, provider: string | null | undefined, providerName: string): string | null {
  if (mode !== null || !provider || provider === 'local') return null;
  return `You have not chosen a privacy mode yet, so this chat sends to ${providerName} as ZIGi does, with what NOVA → Permissions allows. NOVA’s briefs and workflows act as Strict until you choose: Build NOVA’s brain → Privacy.`;
}
