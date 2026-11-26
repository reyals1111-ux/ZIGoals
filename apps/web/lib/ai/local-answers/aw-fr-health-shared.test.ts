import {describe, expect, test} from 'vitest';
import {ask, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {aiGates} from '../gates';
import {settingsWith} from '../tools/fixtures';
import {healthBlockOf, toolEnv} from '../tools/env';
import {HEALTH_CLOSED, HEALTH_CLOSED_BY, HEALTH_CLOSED_NL} from '../tools/format';
import {novaLocalEnv} from '../../nova/local-env';
import {DEFAULT_NOVA_SCOPES} from '../context-pack/nova';
import {healthSharedAnswer} from './aw-fr-health-shared';
import {novaEnvInfo} from './nova-env';

/**
 * Session AW (fr-answers review): (1) the Health-closed replies say only what is true when Allow Health cannot open Health
 * (an account whose Health permission is off on this device, Health off this device's Today), in ZIGi and NOVA, EN and NL;
 * (3) "is my health shared", "kun je mijn gezondheid zien?", "is mijn health gedeeld" reach the answer about whether Health
 * is shared, before the exact layer's Health summary and the navigation reading of "zien".
 */
const gates = (extra: {accountActive?: boolean; accountHealthPermitted?: boolean | null; layoutHasHealth?: boolean; health?: boolean}) =>
  aiGates({settings: settingsWith(extra.health ?? true), area: 'today', pathname: '/app', layoutHasHealth: extra.layoutHasHealth ?? true, accountActive: extra.accountActive ?? false, accountHealthPermitted: extra.accountHealthPermitted ?? null, sensitive: false});
const SCOPES = {...DEFAULT_NOVA_SCOPES, health: true};
const zigi = (g: ReturnType<typeof gates>) => toolEnv(showcaseAll(), g, 'local');
const nova = (g: ReturnType<typeof gates>) => novaLocalEnv({sources: showcaseAll(), gates: g, scopes: SCOPES, chainChosen: true})!;

describe('why Health is closed, when the one button cannot open it', () => {
  test('the gates say it: an account without the Health permission, Health off Today; nothing when open or when the button opens it', () => {
    expect(gates({accountActive: true, accountHealthPermitted: false}).healthBlock).toBe('account');
    expect(gates({accountActive: true, accountHealthPermitted: null}).healthBlock).toBe('account');
    expect(gates({layoutHasHealth: false}).healthBlock).toBe('layout');
    expect(gates({}).healthBlock).toBeUndefined();
    expect(gates({health: false}).healthBlock).toBeUndefined();
    expect(gates({accountActive: true, accountHealthPermitted: true})).not.toHaveProperty('healthBlock');
    expect(healthBlockOf(zigi(gates({accountActive: true, accountHealthPermitted: false})))).toBe('account');
    expect(healthBlockOf(zigi(gates({})))).toBeNull();
    expect(novaEnvInfo(nova(gates({layoutHasHealth: false})))?.healthBlock).toBe('layout');
  });
  test('ZIGi: the reason, never "one tap", and no button that would not help (EN and NL)', () => {
    const account = zigi(gates({accountActive: true, accountHealthPermitted: false})), layout = zigi(gates({layoutHasHealth: false}));
    expect(ask('How much water did I drink today?', account).text).toBe(HEALTH_CLOSED_BY.account.en);
    expect(ask('Hoeveel water heb ik vandaag gedronken?', account).text).toBe(HEALTH_CLOSED_BY.account.nl);
    expect(ask('How much water did I drink today?', layout).text).toBe(HEALTH_CLOSED_BY.layout.en);
    for (const t of [HEALTH_CLOSED_BY.account.en, HEALTH_CLOSED_BY.account.nl]) { expect(t).not.toMatch(/one tap|één tik|```/); expect(t).toContain('Settings → Account & sync'); }
    // With the button able to open Health, the reply stays as it is, with its one card.
    expect(ask('How much water did I drink today?', zigi(gates({health: false}))).text).toMatch(new RegExp(`^${HEALTH_CLOSED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n\`\`\`zigoals-action`));
    expect(HEALTH_CLOSED_NL).toContain('één tik');
  });
  test('NOVA: the same reasons in NOVA\'s words', () => {
    const account = nova(gates({accountActive: true, accountHealthPermitted: false})), layout = nova(gates({layoutHasHealth: false}));
    expect(ask('How did I sleep?', account).text).toBe('Health answers are off on this device, so nothing from Health is read here: with your account open, Health is read only when the account’s Health permission is on for this device, and here it is off or not confirmed yet (Settings → Account & sync).');
    expect(ask('Hoe heb ik geslapen?', account).text).toBe('Health-antwoorden staan uit op dit apparaat, dus er wordt hier niets uit Health gelezen: met je account open wordt Health alleen gelezen als de Health-toestemming van het account op dit apparaat aan staat, en hier staat die uit of is die nog niet bevestigd (Settings → Account & sync).');
    expect(ask('How did I sleep?', layout).text).toBe('Health answers are off on this device, so nothing from Health is read here: Health is not on your Today layout on this device. Add it to Today first, then Allow Health in NOVA → Permissions opens it in one tap.');
  });
});

describe('"is my health shared", in English and Dutch, gets the answer about sharing', () => {
  const EN = ['Can you see my health?', 'is my health shared', 'Is my health shared?', 'Do you have access to my health data?', 'can you read my health records', 'are you reading my health?'];
  const NL = ['kun je mijn gezondheid zien?', 'is mijn health gedeeld', 'Kun je mijn gezondheidsgegevens zien?', 'zie je mijn gezondheid?', 'Is mijn gezondheid gedeeld?', 'heb je toegang tot mijn health?'];
  test('shared: yes, with the switch that turns it off (Settings → ZIGi), in ZIGi and NOVA', () => {
    for (const env of [zigiEnv(showcaseAll()), novaEnv(showcaseAll())]) {
      for (const q of EN) { const a = ask(q, env); expect(a.text, q).toMatch(/^Yes: Health is shared with me on this device right now/); expect(a.text, q).toContain('Settings → ZIGi'); }
      for (const q of NL) { const a = ask(q, env); expect(a.text, q).toMatch(/^Ja: Health is nu op dit apparaat met mij gedeeld/); expect(a.text, q).toContain('Settings → ZIGi'); expect(a.text, q).not.toContain('Opening Health'); }
    }
  });
  test('not shared: the closed answer in the question\'s language, the reason where the button cannot help', () => {
    const shut = zigiEnv(showcaseAll(), false);
    expect(ask('is my health shared', shut).text).toMatch(/^No: Health is not shared with me now/);
    expect(ask('is mijn health gedeeld', shut).text).toMatch(/^Nee: Health is nu niet met mij gedeeld/);
    expect(ask('kun je mijn gezondheid zien?', zigi(gates({accountActive: true, accountHealthPermitted: false}))).text).toBe(`Nee: ${HEALTH_CLOSED_BY.account.nl}`);
    expect(ask('Is my health shared?', nova(gates({health: false}))).text).toMatch(/^Health answers are off on this device/);
  });
  test('only the whole question: longer ones keep their own answers', () => {
    const env = zigiEnv(showcaseAll());
    for (const q of ['can you see my health score', 'how is my health', 'show my health', 'open health', 'Toon mijn gezondheid', 'hoe is mijn gezondheid']) expect(healthSharedAnswer(q, env), q).toBeNull();
  });
});
