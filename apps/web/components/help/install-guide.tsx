'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {currentInstallContext, type InstallContext} from '../../lib/install/platform';

const STATUS: Record<InstallContext, string> = {
  installed: 'You’re using ZIGoals as an installed app. Keep opening it from its icon.',
  'apple-browser': 'You’re in a browser. Add ZIGoals to your Home Screen with the steps below (on a Mac: File, then Add to Dock), then open it from there.',
  other: 'On your iPhone, follow these steps in Safari.',
};

/**
 * "Install ZIGoals on your iPhone" (Session L). The status line uses feature detection only (lib/install/platform.ts)
 * and is filled in after the page loads, so nothing differs between the server and the first render. Reads only.
 */
export function InstallGuide() {
  const [context, setContext] = useState<InstallContext | null>(null);
  useEffect(() => { setContext(currentInstallContext()); }, []);
  return <div className="install-guide">
    <p className="help-status" data-context={context ?? 'pending'}>{context ? STATUS[context] : ' '}</p>
    <ol className="help-steps">
      <li>Open ZIGoals in <strong>Safari</strong> on your iPhone. Some other iPhone browsers offer this in their Share menu too.</li>
      <li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
      <li>Keep the name <strong>ZIGoals</strong> and tap <strong>Add</strong>.</li>
      <li>From now on, open ZIGoals from its icon on your Home Screen.</li>
    </ol>
    <p>The installed app keeps its own copy of your data, separate from Safari. So install first, then use the icon.</p>
    <p className="fine">Already started in Safari? You can bring those records over once: make an encrypted backup in Safari and restore it in the installed app, both under <Link className="text-link" href="/app/settings#private-vault">Settings → Keep a protected copy</Link>. When accounts open you won&rsquo;t need this: sign in, unlock, and sync brings everything.</p>
  </div>;
}
