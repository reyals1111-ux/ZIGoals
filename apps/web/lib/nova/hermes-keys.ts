import {forgetKey, hasRememberedKey, holdKey, readKey, rememberKey, SHOWCASE_SCOPE} from '../ai/keys';
import {HERMES_KEY_SLOT} from './hermes-record';

/**
 * Session AK lane P7 (exploratory round 3, EX3-4): the person's Hermes key in its two places. The guide keeps it in the key
 * store's `hermes` slot (tests, "Ask my Hermes"); once Hermes is NOVA's brain, ZIGi's engine sends the `local` slot (the
 * brain's own). Both go through here so they never disagree: a new key that passed the test reaches the brain too, and a
 * key the person did not ask to remember is not brought back on reload by an older sealed one.
 */
/** Keeps the key the guide just tested: sealed when the person asked (never in the Showcase), else for this page only. */
export async function keepHermesKey(scope: string, secret: string, remember: boolean): Promise<void> {
  if (remember && scope !== SHOWCASE_SCOPE) { await rememberKey(scope, HERMES_KEY_SLOT, secret); return; }
  // "Otherwise this page forgets it on reload": an older sealed key must not come back in its place.
  await forgetKey(scope, HERMES_KEY_SLOT);
  holdKey(scope, HERMES_KEY_SLOT, secret);
}
/**
 * The brain's key (`local`) becomes the guide's Hermes key, kept the same way (sealed only if that one is sealed). Returns
 * whether it is remembered on this device. Nothing is sent anywhere.
 */
export async function hermesKeyToBrain(scope: string): Promise<boolean> {
  const secret = await readKey(scope, HERMES_KEY_SLOT), sealed = scope !== SHOWCASE_SCOPE && await hasRememberedKey(scope, HERMES_KEY_SLOT);
  await forgetKey(scope, 'local');
  if (!secret) return false;
  if (sealed) { await rememberKey(scope, 'local', secret); return true; }
  holdKey(scope, 'local', secret);
  return false;
}
