import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {DEFAULT_NOVA_SCOPES} from '../ai/context-pack/nova';
import {NOTES_ASK_PREFIX, NOTES_ASK_SHOWCASE, NOVA_PERMISSIONS_HREF, notesAskState, notesPrivacyLine, notesQuestion} from './ask';
import {showcaseNotes} from './showcase';

/** Session AK WA (B5): "Ask about my notes" on the Notes page, through NOVA's own chat, permission and privacy mode. */
describe('Ask about my notes', () => {
  it('teaches with no notes, waits for NOVA → Permissions (off by default), then for a model of the person\'s own', () => {
    expect(DEFAULT_NOVA_SCOPES.notes).toBe(false);
    expect(notesAskState({notes: 0, scopeOn: true, connected: true})).toBe('empty');
    expect(notesAskState({notes: 3, scopeOn: DEFAULT_NOVA_SCOPES.notes, connected: true})).toBe('permission');
    expect(notesAskState({notes: 3, scopeOn: true, connected: false})).toBe('brain');
    expect(notesAskState({notes: 3, scopeOn: true, connected: true})).toBe('ready');
    expect(NOVA_PERMISSIONS_HREF).toBe('/app/nova#nova-permissions');
  });
  it('the question is the person\'s words, marked as about their notes, bounded; nothing for an empty box', () => {
    expect(notesQuestion('  what did I   plan for Japan? ')).toBe(`${NOTES_ASK_PREFIX}what did I plan for Japan?`);
    expect(notesQuestion('   ')).toBeNull();
    expect(notesQuestion('x'.repeat(20_000))!.length).toBe(15_000);
  });
  it('says what leaves the device in each privacy mode', () => {
    expect(notesPrivacyLine('strict', 'Atlas')).toMatch(/only a model on this computer.*Atlas refuses/);
    expect(notesPrivacyLine('guarded', 'NOVA')).toMatch(/taken out, and you see what is sent/);
    expect(notesPrivacyLine('relaxed', 'NOVA')).toMatch(/as they are/);
    expect(notesPrivacyLine(null, 'NOVA')).toMatch(/only to your own model/);
  });
  it('the Showcase example is labelled and quotes a Showcase note that exists', () => {
    expect(NOTES_ASK_SHOWCASE.label).toMatch(/^Showcase example: .*no AI ran and nothing was sent\.$/);
    expect(NOTES_ASK_SHOWCASE.answer).toMatch(/^Example answer\./);
    const titles = showcaseNotes('2026-11-01').notes.map(n => n.title);
    expect(titles).toContain('What helps me stay calm');
  });
  it('goes through NOVA\'s existing chat (sendToNova), never a second engine, and is mounted on the Notes page lazily', () => {
    const view = readFileSync(join(__dirname, '../../components/notes/notes-ask.tsx'), 'utf8'), page = readFileSync(join(__dirname, '../../components/notes/notes-workspace.tsx'), 'utf8');
    expect(view).toMatch(/sendToNova\(/); expect(view).not.toMatch(/fetch\(|useChatSession|adapters/);
    expect(page).toMatch(/const NotesAsk = lazy\(\(\) => import\('\.\/notes-ask'\)\)/);
  });
});
