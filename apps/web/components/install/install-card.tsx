'use client';
import Link from 'next/link';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {currentInstallContext, type InstallContext} from '../../lib/install/platform';
import {installState, promptInstall, subscribeInstall} from '../../lib/install/prompt-store';

/**
 * Settings → "Install ZIGoals" (Session AK Part 3): one place to install, on every device. Where the browser makes its own
 * offer (Chromium on Android and computers) the button shows the browser's dialog; on an iPhone or iPad it points to the
 * Share → Add to Home Screen steps; once installed it says so. Installing gives the offline app, its own icon and
 * shortcuts, and on iPhone the only way to get notifications.
 */
export function InstallCard() {
  const [context, setContext] = useState<InstallContext | null>(null), [said, setSaid] = useState('');
  useEffect(() => { setContext(currentInstallContext()); }, []);
  const state = useSyncExternalStore(subscribeInstall, installState, () => ({available: false, installed: false}));
  const installed = context === 'installed' || state.installed;
  const install = async () => { const outcome = await promptInstall(); setSaid(outcome === 'accepted' ? 'Installing. Open ZIGoals from its new icon.' : outcome === 'dismissed' ? 'Not installed. You can install any time from here.' : 'Your browser did not offer to install just now. Use its menu: Install app, or Add to Home screen.'); };
  return <section className="panel install-card" id="install" aria-labelledby="install-title">
    <p className="eyebrow">THIS DEVICE</p>
    <h2 id="install-title">Install ZIGoals</h2>
    <p>The installed app opens from its own icon, works offline with your records on this device, has shortcuts for Today, the Checklist, water and weight, and on iPhone is the way to get notifications.</p>
    <p role="status" className="install-state">{context === null ? ' ' : installed ? 'Installed on this device. Keep opening it from its icon.' : context === 'apple-browser' ? 'On iPhone and iPad: tap Share, then Add to Home Screen, then Add.' : state.available ? 'Your browser can install ZIGoals now.' : 'Use your browser’s menu: Install app, or Add to Home screen.'}</p>
    <div className="actions">
      {!installed && state.available && <button type="button" className="primary" onClick={() => void install()}>Install ZIGoals</button>}
      {!installed && context === 'apple-browser' && <Link className="secondary" href="/app/help#install">Show the steps →</Link>}
    </div>
    {said && <p role="status" className="fine">{said}</p>}
  </section>;
}
