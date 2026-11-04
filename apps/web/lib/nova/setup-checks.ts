import {pickVoice, type SpeechVoiceLike} from '../ai/voice-privacy';
import {AiError, scrubSecrets} from '../ai/errors';
import {listModels} from '../ai/models';
import type {OnDeviceAvailability} from '../ai/on-device';
import {guardRequest, isCloudTarget, isOllamaCloudModel, targetName} from '../ai/privacy-mode';
import {PROVIDERS} from '../ai/providers';
import type {AiSettings} from '../ai/settings';
import type {ChatRequest} from '../ai/types';
import type {ChatSummary} from '../ai/chats';
import type {AiMemory, AiOptions, AiUsage} from '../ai/store/records';
import {notesForAi} from '../ai/memory';
import type {NovaRecord} from './store';
import {DEFAULT_PERSONA_NAME} from './store';
import {redactionSummary, redactText} from './redact';
import {LOCAL_SERVERS, verifyOllama} from './local-servers';
import type {PrivacyMode} from './setup';

/**
 * Session AK, owner follow-up 2 (N3, lane NC): each planet's check, the thing that proves the step worked. Pure, or with
 * every outside effect passed in (a fetch for the model list, a key read, the speech engine), so each is unit-tested with
 * mocked servers. A check never sends a record anywhere: the model list is the only request, to the person's own server
 * or provider, exactly as the connection test in Settings has always done.
 */
export type CheckResult = {ok: boolean; note: string};
const pass = (note: string): CheckResult => ({ok: true, note});
const fail = (note: string): CheckResult => ({ok: false, note});

/** 1 Meet NOVA: nothing shaped like a provider key sits readable in this browser's storage (keys live sealed in their own store). */
export function checkMeet(values: readonly string[]): CheckResult {
  const leaks = values.filter(v => scrubSecrets(v) !== v).length;
  return leaks ? fail(`${leaks} stored value${leaks === 1 ? '' : 's'} in this browser look${leaks === 1 ? 's' : ''} like an API key in plain text. Keys belong in the sealed key store: disconnect and connect again in Settings.`)
    : pass('Checked on this device: no API key sits in readable storage. Keys are sealed in this browser’s own key store, never synced, never sent to ZIGoals.');
}

const PROBE_TEXT = 'Lunch with my sister Anna at 12 Abbey Road; I owe her €1,234.56.';
const probe = (provider: ChatRequest['provider'], model = 'probe'): ChatRequest => ({provider, model, system: 'Probe.', messages: [{role: 'user', content: PROBE_TEXT}], maxOutputTokens: 1, key: null});
/** 2 Privacy mode: the engine's own guard, run on a test message (nothing is sent): Strict refuses a cloud, Guarded redacts, Relaxed passes. */
export async function checkPrivacy(chosen: PrivacyMode | null, stored: PrivacyMode | null): Promise<CheckResult> {
  if (!chosen) return fail('Choose a mode first.');
  if (stored !== chosen) return fail('The mode is not saved on this device yet. Choose it again.');
  const cloud = probe('openai'), local = probe('local', 'qwen3.5:9b');
  if (chosen === 'strict') {
    const refused = await guardRequest(cloud, {mode: 'strict', knownNames: []}).then(() => false, e => e instanceof AiError && e.kind === 'blocked');
    const ollamaCloud = await guardRequest(probe('local', 'gemma4:cloud'), {mode: 'strict', knownNames: []}).then(() => false, () => true);
    const kept = (await guardRequest(local, {mode: 'strict', knownNames: []})) === local;
    return refused && ollamaCloud && kept ? pass('Strict is on. A test message to a cloud model was refused before sending, and so was an Ollama cloud model; your local model gets it.') : fail('Strict did not hold in the test. Reload the page and try again.');
  }
  if (chosen === 'guarded') {
    const out = await guardRequest(cloud, {mode: 'guarded', knownNames: []}), text = out.messages[0]!.content;
    const clean = !/Anna|Abbey|1,234\.56/.test(text), found = redactText(PROBE_TEXT).found;
    return clean ? pass(`Guarded is on. A test message lost ${redactionSummary(found)} before a cloud model would see it: “${text}”`) : fail('Guarded did not redact the test message. Reload the page and try again.');
  }
  const same = (await guardRequest(cloud, {mode: 'relaxed', knownNames: []})) === cloud;
  return same ? pass('Relaxed is on: the areas you share go to your model as they are.') : fail('Relaxed did not hold in the test.');
}

export type BrainDeps = {settings: AiSettings; mode: PrivacyMode | null; key: string | null; fetcher?: typeof fetch; onDevice: OnDeviceAvailability; onDeviceOn: boolean; signal?: AbortSignal};
const serverName = (settings: AiSettings) => LOCAL_SERVERS.find(s => s.baseUrl === settings.baseUrl)?.name ?? (settings.localServer === 'ollama' ? 'Ollama' : 'your local server');
/** 3 Your brain: a live connection test through ZIGi's own model list, naming the model it found. */
export async function checkBrain({settings, mode, key, fetcher, onDevice, onDeviceOn, signal}: BrainDeps): Promise<CheckResult> {
  if (settings.mode === 'subscription') return fail('A subscription cannot answer inside ZIGoals. Connect a local model or an API key.');
  if (!settings.enabled || !settings.provider || !settings.model) {
    if (onDeviceOn && onDevice === 'available') return pass('Chrome’s on-device model is ready on this computer: short answers, nothing sent anywhere. Connect a local model for full answers.');
    return fail('No model is connected yet. Follow one of the paths above, then press Test again.');
  }
  const {provider, model} = settings;
  if (mode === 'strict' && isCloudTarget(provider, false, model)) return fail(`${targetName(provider, false, model)} is a cloud model, and Strict sends nothing to a cloud. Connect a local model, or choose Guarded or Relaxed in step 2.`);
  if (provider !== 'local' && !key) return fail(`Your ${PROVIDERS[provider].name} key is not on this device. Paste it again below.`);
  try {
    // Session AL (BN-035): a server on Ollama's port that does not answer like Ollama is refused before anything is sent.
    if (provider === 'local' && settings.localServer === 'ollama' && settings.baseUrl) { const real = await verifyOllama(settings.baseUrl, {fetcher, signal}); if (!real.ok) return fail(real.message); }
    const list = await listModels({provider, key, baseUrl: settings.baseUrl ?? undefined, localServer: settings.localServer ?? undefined, fetcher, signal});
    if (!list.some(m => m.id === model)) return fail(`${provider === 'local' ? serverName(settings) : PROVIDERS[provider].name} answered, but ${model} is not in its list. Choose another model below${provider === 'local' ? ', or download it first' : ''}.`);
    if (provider === 'local') return pass(`Found ${model} on ${serverName(settings)} at ${settings.baseUrl}.${isOllamaCloudModel(model) ? ' Note: this model runs on ollama.com, not on this computer.' : ' It runs on this computer.'}`);
    return pass(`Connected to ${PROVIDERS[provider].name}: ${model} is available with your key.`);
  } catch (error) {
    return fail(error instanceof AiError ? error.message : 'The connection test failed.');
  }
}

/** 4 First conversation: a question and its answer saved on this device in the last day (ZIGi and NOVA share one history). */
export function checkFirstChat(chats: readonly Pick<ChatSummary, 'updatedAt' | 'turnCount' | 'title'>[], now: Date): CheckResult {
  const since = now.getTime() - 24 * 3600_000;
  const recent = chats.find(c => c.turnCount >= 2 && Date.parse(c.updatedAt) >= since);
  return recent ? pass(`Your first conversation is saved on this device: “${recent.title}”.`) : fail('No question and answer from today yet. Ask one above, then check again.');
}

/** 6 Memory: the notes record reads, and "Use my notes" says what NOVA may use. */
export function checkMemory(options: AiOptions, memory: AiMemory, unreadable: boolean): CheckResult {
  if (unreadable) return fail('Your notes could not be read on this device. Open What ZIGi remembers to see what happened.');
  const all = memory.notes?.length ?? 0, used = notesForAi(options, memory)?.length ?? 0;
  if (options.useNotes === false) return pass(`Memory is off: NOVA uses none of your ${all} note${all === 1 ? '' : 's'}.`);
  return pass(all ? `Memory is on: NOVA may use ${used} of your ${all} note${all === 1 ? '' : 's'} (health notes only with Health). Review or forget any of them at any time.` : 'Memory is ready: nothing is kept until you add a note or accept a “Remember this?” card.');
}

/** 7 Voice: speech output on this device; in Strict only a voice the device says is local. */
// Security review Z1A-3: one voice picker for the guide's test line and every read-aloud (lib/ai/voice-privacy.ts).
export {pickVoice, type SpeechVoiceLike};
export function checkVoice(result: {spoke: boolean; voice: SpeechVoiceLike | null; error?: string}, strict: boolean): CheckResult {
  if (!result.voice) return fail(strict ? 'No voice on this device works without a speech service, and Strict sends nothing away. You can skip voice; it is optional.' : 'This browser offers no voice for your language. Voice is optional.');
  if (!result.spoke) return fail(result.error ? `The voice did not play: ${result.error}` : 'The voice did not play. Check the sound, then try again.');
  return pass(`NOVA spoke with “${result.voice.name}”${result.voice.localService ? ', a voice on this device' : ', a voice your browser reads through its online service'}.`);
}

/** 8 Daily briefs: a brief made on this device from your own records (or the honest word that there is nothing yet). */
export function checkBrief(lines: readonly string[] | null): CheckResult {
  if (lines === null) return pass('The brief composer ran on this device. There is nothing to say yet: add a habit or a goal, and tomorrow’s brief has content.');
  return lines.length ? pass(`A brief was made on this device from your records (${lines.length} line${lines.length === 1 ? '' : 's'}), with no model and nothing sent.`) : fail('The brief came back empty.');
}

/** 9 Workflows: "Review my week" ran once, and one workflow of your own is saved. */
export function checkWorkflows(state: {ranReview: boolean; savedOwn: boolean}): CheckResult {
  if (state.ranReview && state.savedOwn) return pass('“Review my week” ran on this device, and a workflow of your own is saved.');
  return fail([!state.ranReview && 'Run “Review my week” once.', !state.savedOwn && 'Save one workflow of your own (Edit a template, then Save).'].filter(Boolean).join(' '));
}

/** 10 Make it yours: at least one choice of your own on NOVA (layout, accent, name, avatar, instructions, widgets, dock or a cost cap). */
export function checkYours(nova: NovaRecord, usage: Pick<AiUsage, 'softCap' | 'dailyCap'> | null): CheckResult {
  const made: string[] = [];
  if (nova.layout) made.push(`layout ${nova.layout}`);
  if (nova.accent) made.push('your accent');
  if (nova.persona?.name && nova.persona.name !== DEFAULT_PERSONA_NAME) made.push(`the name “${nova.persona.name}”`);
  if (nova.persona?.avatar) made.push(`the ${nova.persona.avatar === 'zigi' ? 'ZIGi' : 'orb'} avatar`);
  if (nova.customInstructions?.trim()) made.push('your instructions');
  if (nova.widgets) made.push('your widgets');
  if (nova.dock?.order || nova.dock?.hidden) made.push('your dock');
  if (usage?.dailyCap || usage?.softCap) made.push('a cost cap');
  return made.length ? pass(`NOVA is yours: ${made.join(', ')}.`) : fail('Nothing changed yet. Open Make it yours on NOVA, choose a layout, a name or a cost cap, then check again.');
}
