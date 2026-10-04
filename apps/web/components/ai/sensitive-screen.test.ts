// @vitest-environment jsdom
import {expect, test} from 'vitest';
import {isSensitiveScreen, SENSITIVE_SELECTOR} from './use-sensitive-screen';

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
    '<div id="encrypted-sync"><form><input type="email"></form></div>',
    '<div id="encrypted-sync"><form><input inputmode="numeric" autocomplete="one-time-code"></form></div>',
    '<div id="encrypted-sync"><form><label>Vault recovery secret<input type="password"></label></form></div>',
    '<div id="encrypted-sync"><div class="notice"><label>New vault recovery secret<input value="x" readonly></label></div></div>',
    '<div id="encrypted-sync"><div class="deletion-copy"><h3>Download a copy first</h3></div></div>',
  ]) expect(isSensitiveScreen(html(body)), body).toBe(true);
  expect(isSensitiveScreen(html('<dialog class="dialog">closed</dialog>'))).toBe(false);
  expect(SENSITIVE_SELECTOR.split(', ').length).toBe(7);
});
