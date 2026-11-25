import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {SETTINGS_GROUP_IDS} from '../settings-folds';
import {SETTINGS_GROUP_TITLES, SETTINGS_INDEX, chainSettingIds, entryHref, searchSettings, settingsSearchItems, shownEntries} from './index';

/**
 * Session AW Part 3 (simplicity c): the Settings search's index covers every anchor on the Settings page, the lower
 * groups and ZIGi's own anchors included, the way lib/search/static.test.ts keeps global Search in step with Help.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const PAGE = '../../app/app/settings/page.tsx';
/** The files Settings renders its sections from: the page, the lower groups' chunk (each of its exports) and the parts the
 *  page imports directly. A new lower-group part is found through settings-later.tsx without editing this list. */
function settingsSources(): {path: string; text: string}[] {
  const later = read('../../components/settings/settings-later.tsx');
  const fromLater = [...later.matchAll(/from '(\.\.?\/[^']+)'/g)].map(m => new URL(`${m[1]}.tsx`, new URL('../../components/settings/', import.meta.url)).pathname);
  const direct = ['../../components/ai/ai-settings-section.tsx', '../../components/ai/ai-settings.tsx', '../../components/settings/nova-settings-links.tsx', '../../components/vault-sync-panel.tsx', '../../components/device-lock.tsx', '../../components/showcase-controls.tsx', '../../components/settings/customize-settings.tsx', '../../components/settings/af-earn-section.tsx', '../../components/settings/af-signing-section.tsx'].map(p => new URL(p, import.meta.url).pathname);
  return [PAGE, ...fromLater, ...direct].map(p => ({path: p, text: readFileSync(p.startsWith('/') ? p : new URL(p, import.meta.url), 'utf8')}));
}
/** The anchors a jump can land on: ids on sections, cards and groups (not a heading's, a note's or a field's own id). */
function anchorsIn(text: string): string[] {
  const ids = [
    ...[...text.matchAll(/<(?:section|details|div|nav|form)\b[^>]*?\bid="([a-z0-9-]+)"/g)].map(m => m[1]!),
    ...[...text.matchAll(/<SettingsGroup id="([a-z-]+)"/g)].map(m => m[1]!),
    // ai-settings.tsx: a card's anchor is a constant, and each of its groups is named by its heading's id.
    ...[...text.matchAll(/[A-Z_]+_ANCHOR = '([a-z-]+)'/g)].map(m => m[1]!),
    ...[...text.matchAll(/<Group id="([a-z-]+)"/g)].map(m => `${m[1]}-title`),
  ];
  // private-backups.tsx: one card per module (`backup-${module}`).
  if (text.includes('id={`backup-${module}`}')) ids.push(...[...text.matchAll(/ module="([a-z-]+)"/g)].map(m => `backup-${m[1]}`));
  return ids;
}

describe('the Settings search index (Session AW Part 3)', () => {
  const sources = settingsSources();
  const anchors = new Set(sources.flatMap(s => anchorsIn(s.text)));
  const everyId = new Set([...anchors, ...sources.flatMap(s => [...s.text.matchAll(/\bid="([a-z0-9-]+)"/g)].map(m => m[1]!))]);

  it('covers every anchor on the Settings page, the lower groups and the ZIGi/NOVA group included', () => {
    // The lower groups' parts are read through settings-later.tsx (25 parts today).
    expect(sources.length).toBeGreaterThanOrEqual(30);
    expect(anchors.size).toBeGreaterThan(50);
    const indexed = new Set(SETTINGS_INDEX.map(e => e.anchor));
    const missing = [...anchors].filter(id => !indexed.has(id));
    expect(missing, 'add these anchors to lib/settings-search/index.ts').toEqual([]);
    // A few the brief names, by group.
    for (const id of ['appearance', 'backup-restore', 'erase-everything', 'time-zone', 'notifications', 'reminders', 'encrypted-sync', 'zigi-voice', 'nova-settings', 'send-feedback']) expect(indexed, id).toContain(id);
  });
  it('jumps only to ids that are on the page; pages of their own are Settings’ own', () => {
    for (const e of SETTINGS_INDEX) {
      if (e.href) { expect(e.href, e.label).toMatch(/^\/app\/(settings\/data(#restore)?|welcome)$/); continue; }
      expect(everyId, `${e.label}: #${e.anchor}`).toContain(e.anchor);
      if (e.jump) expect(anchors, `${e.label}: jump #${e.jump}`).toContain(e.jump);
      expect(entryHref(e)).toBe(`#${e.jump ?? e.anchor}`);
    }
  });
  it('names the groups as the page does, in the page’s order, and every entry sits in one', () => {
    const page = read(PAGE);
    const groups = [...page.matchAll(/\["(settings-[a-z]+)", "([^"]+)"\]/g)].map(m => [m[1], m[2]]);
    expect(groups).toEqual(SETTINGS_GROUP_IDS.map(id => [id, SETTINGS_GROUP_TITLES[id]]));
    for (const e of SETTINGS_INDEX) expect(SETTINGS_GROUP_IDS).toContain(e.group);
    // Page order: an entry's group never comes before an earlier entry's group.
    const order = SETTINGS_INDEX.map(e => SETTINGS_GROUP_IDS.indexOf(e.group));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('has English and Dutch words on every entry, and labels that read as names', () => {
    const keys = new Set<string>();
    for (const e of SETTINGS_INDEX) {
      expect(e.en.length, e.label).toBeGreaterThan(0);
      expect(e.nl.length, e.label).toBeGreaterThan(0);
      expect(e.label).toMatch(/^[A-Z]/);
      const key = `${e.anchor}|${e.label}`;
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
  });
  it('finds every setting by common words, in English and in Dutch', () => {
    const first = (q: string, chain = false) => searchSettings(q, {chain})[0]?.anchor;
    const cases: [string, string][] = [
      ['dark mode', 'appearance'], ['donker', 'appearance'], ['donkere modus', 'appearance'],
      ['backup', 'backup-restore'], ['reservekopie', 'backup-restore'],
      ['erase', 'erase-everything'], ['wissen', 'erase-everything'],
      ['notifications', 'notifications'], ['meldingen', 'notifications'],
      ['time zone', 'time-zone'], ['tijdzone', 'time-zone'],
      ['voice', 'zigi-voice'], ['stem', 'zigi-voice'],
      ['language', 'zigi-voice'], ['taal', 'zigi-voice'],
      ['export', 'export-everything'], ['exporteren', 'export-everything'],
      ['pin', 'device-lock'], ['pincode', 'device-lock'],
      ['sync', 'encrypted-sync'], ['inloggen', 'encrypted-sync'],
      ['herinneringen', 'reminders'], ['reminders', 'reminders'],
      ['font', 'customize-title'], ['lettertype', 'customize-title'],
      ['nova', 'nova-settings'], ['feedback', 'send-feedback'], ['middernacht', 'day-ends'],
      ['Tijdzone', 'time-zone'], ['privé', 'privacy'], ['prive', 'privacy'],
    ];
    for (const [q, anchor] of cases) expect(first(q), q).toBe(anchor);
    // Every entry is found by its own label.
    for (const e of shownEntries({chain: true})) expect(searchSettings(e.label, {chain: true, limit: 24}).map(x => x.label), e.label).toContain(e.label);
  });
  it('keeps the wallet parts out until the chain is chosen', () => {
    expect(searchSettings('wallet').some(e => e.chain)).toBe(false);
    expect(searchSettings('wallet', {chain: true})[0]?.anchor).toBe('wallet-network');
    expect(settingsSearchItems().some(i => i.href.endsWith('#network'))).toBe(false);
    expect(settingsSearchItems({chain: true}).some(i => i.href === '/app/settings#network')).toBe(true);
  });
  it('gives global Search the same entries as Settings links', () => {
    const items = settingsSearchItems();
    expect(items.length).toBe(shownEntries().length);
    for (const item of items) { expect(item.kind).toBe('setting'); expect(item.href).toMatch(/^\/app\/(settings|welcome)/); }
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
    const all = settingsSearchItems({chain: true});
    expect(all.length).toBe(SETTINGS_INDEX.length);
    expect(all.find(i => i.href === '/app/settings#time-zone')?.id).toBe('setting:time-zone');
    expect([...chainSettingIds()].sort()).toEqual(all.filter(i => !items.some(x => x.id === i.id)).map(i => i.id).sort());
  });
  it('finds nothing for words that name no setting, and never throws on markup or a stray sign', () => {
    expect(searchSettings('zzqx')).toEqual([]);
    expect(searchSettings('')).toEqual([]);
    expect(() => searchSettings('<b>%</b> #')).not.toThrow();
  });
});
