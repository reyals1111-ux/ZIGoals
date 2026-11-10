// @vitest-environment jsdom
import {expect, test} from 'vitest';
import {isSensitiveScreen, SENSITIVE_SELECTOR} from '../../components/ai/use-sensitive-screen';

// ADR-012, owner rule 8: ZIGi hides, and reads nothing, on dialogs and on the account panels' private forms.
const html = (body: string) => { const root = document.createElement('div'); root.innerHTML = body; return root; };
test('an ordinary page, the chat itself and a signed-in settings page without private forms are not sensitive', () => {
  expect(isSensitiveScreen(html('<main><h1>Habits</h1><button>Check in</button></main>'))).toBe(false);
  expect(isSensitiveScreen(html('<dialog open data-ai-dialog="">chat</dialog>'))).toBe(false);
  expect(isSensitiveScreen(html('<div id="encrypted-sync"><section><p>Signed in</p><input type="checkbox"><button>Sign out</button></section></div>'))).toBe(false);
  expect(isSensitiveScreen(html('<form><input type="password"></form>'))).toBe(false); // outside the account panels (e.g. a provider key field) it is not the account
});
test('open dialogs, sign-in and one-time-code forms, vault unlock, a shown recovery secret and the deletion section are sensitive', () => {
  for (const body of [
    '<dialog open class="phone-sheet">More</dialog>',
    '<dialog open class="dialog"><h2>Review</h2></dialog>',
    '<div id="encrypted-sync"><form><input inputmode="numeric" autocomplete="one-time-code"></form></div>',
    '<div id="encrypted-sync"><form><label>Vault recovery secret<input type="password"></label></form></div>',
    '<div id="encrypted-sync"><div class="notice"><label>New vault recovery secret<input value="x" readonly></label></div></div>',
    '<div id="encrypted-sync"><div class="deletion-copy"><h3>Download a copy first</h3></div></div>',
  ]) expect(isSensitiveScreen(html(body)), body).toBe(true);
  expect(isSensitiveScreen(html('<dialog class="dialog">closed</dialog>'))).toBe(false);
  /* Assertion changed (Session AL, owner reading Q6 in ADR-037, equal strength): the default sign-in email field counts
     only while it has the focus (below), so ZIGi opens on Settings; the other six private forms count as before, and six
     focused-field rules were added. */
  expect(SENSITIVE_SELECTOR.split(', ').length).toBe(13);
});
test('Q6: the sign-in email field makes Settings sensitive only while focused; any focused password, code or key field does too', () => {
  const root = document.createElement('div'); document.body.append(root);
  root.innerHTML = '<div id="encrypted-sync"><form><input type="email" id="al-email"></form></div><form><input type="password" id="al-pass"><input data-sensitive id="al-seed"><input id="al-plain"></form>';
  expect(isSensitiveScreen()).toBe(false);
  for (const id of ['al-email', 'al-pass', 'al-seed']) { (document.getElementById(id) as HTMLInputElement).focus(); expect(isSensitiveScreen(), id).toBe(true); }
  (document.getElementById('al-plain') as HTMLInputElement).focus(); expect(isSensitiveScreen()).toBe(false);
  root.remove();
});
