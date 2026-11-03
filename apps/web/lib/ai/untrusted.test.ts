import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {isUntrustedTool, replyUntrusted, UNTRUSTED_RESULT_TOOLS} from './untrusted';
import {pickVoice, readAloudVoice, speechInputAllowed, STRICT_NO_LOCAL_SPEECH, STRICT_NO_LOCAL_VOICE, transcriptionRefusal} from './voice-privacy';
import {sendToNova, takeNovaHandoff} from '../nova/bridge';

/**
 * Security reviews Z1A-2, Z1A-3 and Z1A-12 (lane ZF): a reply driven by words the person did not type here is never
 * auto-accepted; Strict reads aloud only with a voice on this device and listens only with on-device recognition; a
 * recording never goes to a cloud transcription model in Strict or Guarded.
 */
const WEB = join(__dirname, '../..');
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');

describe('Z1A-2: untrusted inputs, no auto-accept', () => {
  test('notes, imported calendars and the journal are untrusted on every surface', () => {
    expect([...UNTRUSTED_RESULT_TOOLS].sort()).toEqual(['calendar_events', 'journal', 'search_notes']);
    for (const tool of UNTRUSTED_RESULT_TOOLS) {
      expect(isUntrustedTool(tool)).toBe(true);
      expect(replyUntrusted({nova: false, lookups: ['list_goals', tool]})).toBe(true); // ZIGi's own surface too
      expect(replyUntrusted({nova: true, lookups: [tool]})).toBe(true);
    }
    expect(isUntrustedTool('list_goals')).toBe(false);
  });
  test('on NOVA\'s surface any lookup, the pack\'s notes, Hermes and a paste make the reply untrusted', () => {
    expect(replyUntrusted({nova: true})).toBe(false); // NOVA's own words on the person's own records: as before
    expect(replyUntrusted({nova: true, lookups: ['today_summary']})).toBe(true); // the probe: a pack with no notes, then a lookup
    expect(replyUntrusted({nova: true, packUntrusted: true})).toBe(true);
    expect(replyUntrusted({nova: true, agent: true})).toBe(true); // every Hermes reply
    expect(replyUntrusted({nova: true, pasted: true})).toBe(true);
    expect(replyUntrusted({nova: false, pasted: true})).toBe(true);
    expect(replyUntrusted({nova: false, extraUntrusted: true})).toBe(true); // "Ask my AI for more" from a notes lookup
  });
  test('ZIGi\'s own panel keeps today\'s behaviour for its own records and lookups', () => {
    expect(replyUntrusted({nova: false})).toBe(false);
    expect(replyUntrusted({nova: false, lookups: ['list_goals', 'habit_stats', 'spending']})).toBe(false);
  });
  test('the engine passes every input of the turn to the rule, and a regenerate keeps a paste', () => {
    const hook = read('components/ai/use-chat-session.ts');
    expect(hook).toMatch(/replyUntrusted\(\{nova: !!nova, packUntrusted: !!novaPack\?\.untrusted, pasted: !!options\.pasted, agent: !!agent, lookups: found\.map\(l => l\.result\.tool\), extraUntrusted: !!options\.extra\?\.untrusted\}\) \? \{untrusted: true\} : \{\}/);
    expect(hook).toMatch(/if \(!extra\.untrusted\) fresh\.current\.add\(turn\.id\)/);
    expect(hook).toMatch(/calls\.some\(c => isUntrustedTool\(c\.tool\)\) \? \{\.\.\.made, untrusted: true\}/);
    expect(hook).toMatch(/if \(!untrusted\) fresh\.current\.add\(answer\.id\)/);
    expect(hook).toMatch(/surfaces\.current\.set\(asked\.id, \{pasted: true\}\)/);
    expect(hook).not.toMatch(/novaAutoAcceptAllowed\(novaPack \?\? \{untrusted: false\}/);
  });
  test('⌘/Ctrl + J and NOVA\'s command field carry a paste into NOVA\'s chat', () => {
    expect(sendToNova('Plan my day', {pasted: true})).toBe(true);
    expect(takeNovaHandoff('')).toEqual({kind: 'ask', text: 'Plan my day', pasted: true});
    expect(sendToNova('Plan my day')).toBe(true);
    expect(takeNovaHandoff('')).toEqual({kind: 'ask', text: 'Plan my day'});
    for (const file of ['components/nova/command-bar.tsx', 'components/nova/nova-command.tsx']) {
      const text = read(file);
      expect(text, file).toMatch(/onPaste=\{\(\) => \{ pasted\.current = true; \}\}/);
      expect(text, file).toMatch(/sendToNova\(\w+, \{pasted: pasted\.current\}\)/);
    }
    expect(read('components/nova/chat/nova-chat.tsx')).toMatch(/sendText\(taken\.text, undefined, !!taken\.pasted\)/);
  });
});

const voice = (name: string, lang: string, localService: boolean, isDefault = false) => ({name, lang, localService, default: isDefault});
describe('Z1A-3: reading aloud in Strict', () => {
  const online = voice('Google UK English Female', 'en-GB', false), localUs = voice('Microsoft Zira', 'en-US', true), localGb = voice('Daniel', 'en_GB', true);
  test('Strict picks only a voice on this device; with none it does not speak and says why', () => {
    expect(readAloudVoice([online, localUs], 'en-GB', true)).toEqual({voice: localUs, refused: null}); // the review's case: never the online exact match
    expect(readAloudVoice([online, localUs, localGb], 'en-GB', true).voice).toBe(localGb);
    expect(readAloudVoice([online], 'en-GB', true)).toEqual({voice: null, refused: STRICT_NO_LOCAL_VOICE});
    expect(readAloudVoice([], 'en-GB', true).refused).toBe(STRICT_NO_LOCAL_VOICE); // never the default voice, which may be online
    expect(readAloudVoice([voice('Thomas', 'fr-FR', true)], 'nl-NL', true).refused).toBe(STRICT_NO_LOCAL_VOICE);
  });
  test('outside Strict the choice is as before (the first voice for the language, else the default)', () => {
    expect(readAloudVoice([online, localUs], 'en-GB', false)).toEqual({voice: online, refused: null});
    expect(readAloudVoice([], 'en-GB', false)).toEqual({voice: null, refused: null});
    expect(pickVoice([online, localUs], 'en-GB', false)).toBe(online);
  });
  test('every read-aloud (NOVA, ZIGi, the briefs) goes through the one hook, which reads the mode when it speaks', () => {
    const hook = read('components/ai/use-voice.ts');
    expect(hook).toMatch(/const choice = readAloudVoice\(voices, language, strict\);\n\s+if \(choice\.refused\) \{[^}]*setNotice\(choice\.refused\); return false; \}/);
    expect(hook).not.toMatch(/\?\? null; \} catch \{ \/\* the default voice \*\/ \}/);
    for (const file of ['components/nova/chat/nova-chat.tsx', 'components/ai/ai-chat.tsx', 'components/ai/brief-parts.tsx']) expect(read(file), file).toMatch(/reader\.notice && <(?:p|span) className="ai-note" role="status">\{reader\.notice\}/);
    expect(read('lib/nova/setup-checks.ts')).toMatch(/export \{pickVoice, type SpeechVoiceLike\};/);
  });
});
describe('Z1A-12: speech input and transcription in Strict', () => {
  test('Strict listens only with on-device recognition; other modes as before', () => {
    expect(speechInputAllowed(true, false)).toEqual({allowed: false, reason: STRICT_NO_LOCAL_SPEECH});
    expect(speechInputAllowed(true, true).allowed).toBe(true);
    expect(speechInputAllowed(false, false).allowed).toBe(true);
  });
  test('a recording never goes to a cloud transcription model in Strict or Guarded', () => {
    expect(transcriptionRefusal('strict')).toMatch(/^Not sent: Strict/);
    expect(transcriptionRefusal('guarded')).toMatch(/^Not sent: Guarded .*cannot be redacted/);
    expect(transcriptionRefusal('relaxed')).toBeNull(); expect(transcriptionRefusal(null)).toBeNull();
  });
  test('ZIGi\'s and NOVA\'s microphones and the provider recording check the mode before anything starts', () => {
    const talk = read('components/ai/use-talk.ts'), voiceHook = read('components/ai/use-voice.ts');
    expect(talk.match(/speechInputAllowed\(strictNow\(\), onDevice\)/g)).toHaveLength(2); // a press, and the disclosure's "Talk now"
    expect(voiceHook).toMatch(/const allowed = speechInputAllowed\(strictNow\(\), onDevice\); if \(!allowed\.allowed\) \{ setError\(allowed\.reason!\); return; \}/);
    expect(voiceHook).toMatch(/const refusal = transcriptionRefusal\(modeNow\(\)\); if \(refusal\) \{ setError\(refusal\); return; \}\n\s+const mime = /);
  });
});
