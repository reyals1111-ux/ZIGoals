'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';

/**
 * Session AL (D-159): "← Back to Settings" shows only when Help was opened from Settings. Settings' Help link marks the
 * move in memory (no storage, no URL change); opened from Today, the sidebar or Search, Help offers no way back to a
 * page the person never came from. Leaving Help forgets the mark, so a later visit from elsewhere shows no back link.
 */
let fromSettings = false;
export const markHelpFromSettings = () => { fromSettings = true; };

export function HelpBack() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (fromSettings) setShow(true);
    return () => { fromSettings = false; };
  }, []);
  if (!show) return null;
  return <p className="help-back"><Link className="text-link" href="/app/settings">← Back to Settings</Link></p>;
}
