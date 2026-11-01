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
  {budget: 'ram8', label: '8 GB of memory', hint: 'A light laptop, no graphics card', ollama: 'qwen3.5:4b', size: 'about 3.3–4 GB', gguf: 'unsloth/Qwen3.5-4B-GGUF', also: 'phi4-mini (2.5 GB), llama3.2:3b (2 GB)', licence: 'Apache 2.0'},
  {budget: 'ram16', label: '16 GB of memory, or a 12 GB graphics card', hint: 'Most laptops; RTX 4070 or 5070', ollama: 'qwen3.5:9b', size: 'about 6.6–7.6 GB', gguf: 'unsloth/Qwen3.5-9B-GGUF', also: 'gemma4:12b (about 8 GB), llama3.1:8b (4.9 GB)', licence: 'Apache 2.0'},
  {budget: 'ram32', label: '32 GB of memory, or a 16 GB graphics card', hint: 'RTX 4070 Ti Super, 4080, 5070 Ti, 5080', ollama: 'gpt-oss:20b', size: 'about 14 GB', gguf: 'ggml-org/gpt-oss-20b-GGUF', also: 'mistral-small3.2:24b (15 GB), gemma4:26b (16–19 GB)', licence: 'Apache 2.0'},
  {budget: 'vram24', label: 'A 24 GB graphics card, or a Mac with 32–48 GB', hint: 'RTX 4090', ollama: 'qwen3.8:27b', size: 'about 18 GB', gguf: 'ggml-org/Qwen3.8-27B-GGUF', also: 'gemma4:31b (19–20 GB), qwen3.6:35b (23 GB)', licence: 'Apache 2.0'},
  {budget: 'vram32', label: 'A 32 GB graphics card', hint: 'RTX 5090', ollama: 'qwen3.6:35b', size: 'about 23 GB', gguf: 'ggml-org/Qwen3.6-35B-A3B-GGUF', also: 'qwen3.8:27b (18 GB), gemma4:31b (19–20 GB)', licence: 'Apache 2.0'},
  {budget: 'mac64', label: 'A Mac with 64 GB or more', hint: 'Apple silicon shares its memory with the graphics', ollama: 'qwen3.6:35b', size: 'about 23 GB', gguf: 'ggml-org/Qwen3.6-35B-A3B-GGUF', also: 'qwen3.8:27b (18 GB), llama3.3:70b (43 GB, Llama licence)', licence: 'Apache 2.0'},
];
export const MODEL_RULE = 'A rule of thumb: the download must fit in your graphics card’s memory for full speed, plus 1–3 GB to spare. On a Mac with Apple silicon, count about two thirds of its memory.';
export const pickFor = (budget: MemoryBudget): ModelPick => MODEL_PICKS.find(p => p.budget === budget) ?? MODEL_PICKS[1]!;

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
  ];
  const shell = os === 'windows' ? 'PowerShell' as const : 'Terminal' as const;
  return [
    os === 'mac' ? {text: 'Install Ollama: download it for macOS from ollama.com/download, open it and drag Ollama to Applications, then open it once.'}
      : os === 'windows' ? {text: 'Install Ollama (or download OllamaSetup.exe from ollama.com/download):', command: 'irm https://ollama.com/install.ps1 | iex', shell}
      : {text: 'Install Ollama:', command: 'curl -fsSL https://ollama.com/install.sh | sh', shell},
    {text: 'Download a model that fits your computer (see “Which model?” below):', command: `ollama pull ${model}`, shell},
    ...allow,
    {text: 'Check that ZIGoals is allowed: an answer with “HTTP/1.1 200” and an Access-Control-Allow-Origin line means yes; “403” means the setting is not active yet.', command: `${os === 'windows' ? 'curl.exe' : 'curl'} -i -H "Origin: ${origin}" http://127.0.0.1:11434/api/version`, shell},
    {text: 'Optional, for Strict privacy: Ollama can also run “cloud” models on ollama.com that look local here. NOVA treats any model whose name ends in “cloud” as a cloud model. To switch Ollama’s cloud features off entirely, set OLLAMA_NO_CLOUD=1 the same way as OLLAMA_ORIGINS above.'},
  ];
}
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
export type PlanetWords = {label: string; short: string; glyph: string; colour: PathColour};
export const PLANETS: Readonly<Record<SetupStepId, PlanetWords>> = {
  meet: {label: 'Meet NOVA', short: 'What stays private', glyph: 'sparkle', colour: 'purple'},
  privacy: {label: 'Privacy mode', short: 'Strict, Guarded or Relaxed', glyph: 'lock', colour: 'purple'},
  brain: {label: 'Your brain, local first', short: 'A model of your own', glyph: 'orbit', colour: 'cyan'},
  'first-chat': {label: 'First conversation', short: 'NOVA knows your day', glyph: 'note', colour: 'cyan'},
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
