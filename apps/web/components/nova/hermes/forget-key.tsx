'use client';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {readKey} from '../../../lib/ai/keys';
import {currentAiScope} from '../../../lib/ai/scope';
import {HERMES_KEY_SLOT, isHermesBase, type NovaHermes} from '../../../lib/nova/hermes-record';
import {forgetHermesKey} from '../../../lib/nova/hermes-keys';
import {useAiSettings} from '../../ai/use-ai-settings';

const subscribeNothing = () => () => undefined;
/**
 * Session AL Part 14 (security review Z1A-I4): "Forget the Hermes key" without disconnecting anything else. Shown while a
 * Hermes key is kept on this device (the guide's slot, or the brain's while the brain is this Hermes). The guide's address
 * and progress stay; the person pastes the key again in planet 7 to use Hermes with it.
 */
export function ForgetHermesKey({record}: {record: NovaHermes}) {
  const settings = useAiSettings(), scope = useSyncExternalStore(subscribeNothing, currentAiScope, () => 'local');
  const brainIsHermes = settings.loaded && settings.data.provider === 'local' && isHermesBase(settings.data.baseUrl, record);
  const [held, setHeld] = useState(false), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    const has = async () => !!(await readKey(scope, HERMES_KEY_SLOT)) || (brainIsHermes && !!(await readKey(scope, 'local')));
    has().then(v => { if (live) setHeld(v); }, () => { if (live) setHeld(false); });
    return () => { live = false; };
  }, [scope, brainIsHermes]);
  const forget = async () => {
    setBusy(true);
    try { await forgetHermesKey(scope, brainIsHermes); setHeld(false); setNote('The Hermes key is forgotten on this device. Paste it again in planet 7 to use your Hermes with it.'); }
    catch { setNote('The key could not be forgotten: this browser refused its key store. Try again.'); }
    finally { setBusy(false); }
  };
  if (!held && !note) return null;
  return <>
    {held && <button type="button" className="secondary" disabled={busy} onClick={() => void forget()}>Forget the Hermes key</button>}
    {note && <p className="ai-note" role="status">{note}</p>}
  </>;
}
