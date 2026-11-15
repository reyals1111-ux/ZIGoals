import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {noModelReply} from './no-model';

/**
 * Session AM-2 (ADR-039 D10; owner report "ZIGi still says the theme is under 'Your app'"): what ZIGi says about where
 * things are in Settings is read against the page's own groups (app/app/settings/page.tsx), so a group that moves there
 * fails here. Since Session AO the theme, motion and display are the first group, Appearance, no longer in Your app.
 */
const page = readFileSync(new URL('../../../app/app/settings/page.tsx', import.meta.url), 'utf8');
const GROUPS = [...page.slice(page.indexOf('const SETTINGS_GROUPS'), page.indexOf('\n', page.indexOf('const SETTINGS_GROUPS'))).matchAll(/\["(settings-[a-z]+)", "([^"]+)"\]/g)].map(m => [m[1]!, m[2]!] as const);
/** The page's source between a group's opening tag and its closing one. */
const groupSource = (id: string) => { const at = page.indexOf(`<SettingsGroup id="${id}"`); return page.slice(at, page.indexOf('</SettingsGroup>', at)); };
const env = toolEnv(showcaseSources(), gatesFor(true), 'local');
const textOf = (r: object) => 'text' in r && typeof r.text === 'string' ? r.text : '';
const NUMBER = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

describe('ZIGi names Settings\' groups as the page has them', () => {
  test('the page: seven groups, Appearance first, holding the theme and motion; Your app holds neither', () => {
    expect(GROUPS.map(g => g[1])).toEqual(['Appearance', 'Data & privacy', 'Your app', 'Your areas', 'Account & devices', 'Your assistant', 'Help & diagnostics']);
    expect(groupSource('settings-look')).toContain('id="appearance"'); expect(groupSource('settings-look')).toContain('<ThemeSwitch'); expect(groupSource('settings-look')).toContain('<MotionPreference');
    expect(groupSource('settings-app')).not.toContain('<ThemeSwitch'); expect(groupSource('settings-app')).not.toContain('<MotionPreference');
    expect(groupSource('settings-app')).toContain('<PagesSettings'); expect(groupSource('settings-app')).toContain('<TimeZoneSettings'); expect(groupSource('settings-app')).toContain('<WrapUpSettings');
    expect(groupSource('settings-areas')).toContain('id="market-data"'); expect(groupSource('settings-account')).toContain('<VaultSyncControls'); expect(groupSource('settings-account')).toContain('id="wallet-network"');
    expect(groupSource('settings-help')).toContain('id="point-tell"'); expect(groupSource('settings-data')).toContain('<EraseEverything');
  });
  test.each(['What does the Settings page let me change?', 'Where do I turn the theme to Light?', 'How do I switch to the dark theme?', 'light mode'])('"%s": every group by its own name, in the page\'s order, the theme under Appearance', ask => {
    const reply = noModelReply(ask, env), text = textOf(reply);
    expect(reply.kind).toBe('answer');
    expect(text).toContain(`Settings has ${NUMBER[GROUPS.length]} groups: `);
    const at = GROUPS.map(([, title]) => text.indexOf(title));
    expect(at.every(i => i >= 0), `every group named: ${at.join(',')}`).toBe(true); expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).toContain('Appearance (Theme, Motion, display)'); expect(text).toContain('Your app (pages & buttons, time zone, wrap-up)');
    expect(text).toContain('The theme is in the first group, Appearance → Theme: Nebula, Light or Dark.');
    expect(text).not.toContain('Your app → Theme'); expect(text).not.toMatch(/Your app \([^)]*(?:[Tt]heme|[Mm]otion)/); expect(text).not.toContain('six groups');
  });
  test('the other places these answers name are in the group they say', () => {
    expect(textOf(noModelReply('How do I hide the Checklist button?', env))).toContain('Settings → Your app → Your pages & buttons');
    expect(readFileSync(new URL('../../../components/settings/pages-settings.tsx', import.meta.url), 'utf8')).toContain('>Your pages & buttons</h2>');
    expect(readFileSync(new URL('../../../components/point-tell/point-tell-setting.tsx', import.meta.url), 'utf8')).toContain('Show the Point &amp; tell button');
  });
});
