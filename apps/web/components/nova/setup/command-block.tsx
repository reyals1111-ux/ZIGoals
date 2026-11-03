'use client';
import {useState} from 'react';

/** One command to copy, alone in its block (N3: "copyable commands one per block"), with the terminal it runs in. */
export function CommandBlock({command, shell}: {command: string; shell?: string}) {
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const copy = () => {
    if (!navigator.clipboard) { setCopied('no'); return; }
    navigator.clipboard.writeText(command).then(() => setCopied('yes'), () => setCopied('no'));
  };
  return <div className="nova-cmd" data-command="">
    {shell && <span className="nova-cmd-shell">{shell}</span>}
    <pre tabIndex={0} aria-label={`Command${shell ? ` for ${shell}` : ''}`}><code>{command}</code></pre>
    <button type="button" className="secondary nova-cmd-copy" onClick={copy}>{copied === 'yes' ? 'Copied' : 'Copy'}<span className="sr-only"> this command</span></button>
    <span className="sr-only" role="status">{copied === 'yes' ? 'Copied.' : copied === 'no' ? 'Copying was not allowed here: select the command and copy it yourself.' : ''}</span>
  </div>;
}
