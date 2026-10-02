import Link from 'next/link';
import type {ReactNode} from 'react';
import {PageHeader} from '../page-header';
import {InstallGuide} from './install-guide';
import {KeepData} from './keep-data';
import './help.css';

/** Owner decision L1: feedback goes to contact@zigoals.app; security reports keep SECURITY.md's address. */
const FEEDBACK_ADDRESS = 'contact@zigoals.app', SECURITY_ADDRESS = 'hello@zigoals.app';
const version = [process.env.NEXT_PUBLIC_APP_VERSION, process.env.NEXT_PUBLIC_APP_COMMIT?.slice(0, 7)].filter(v => v && v !== 'Unknown').join(' · ') || 'unknown';
const feedbackHref = `mailto:${FEEDBACK_ADDRESS}?subject=${encodeURIComponent('ZIGoals Alpha feedback')}&body=${encodeURIComponent(`What happened:\n\nWhat you expected:\n\nDevice and browser:\n\nApp version: ${version}\n\n(Please leave out codes, your recovery secret, and personal money or health details.)`)}`;

const TOPICS: [id: string, label: string][] = [
  ['getting-started', 'Getting started'], ['data-and-sync', 'Your data and sync'], ['recovery-secret', 'Your recovery secret'],
  ['install', 'Install on iPhone'], ['backups', 'Optional backups'], ['questions', 'Questions'], ['feedback', 'Send feedback'],
];

function Section({id, eyebrow, title, children}: {id: string; eyebrow: string; title: string; children: ReactNode}) {
  return <section className="panel help-section" id={id} aria-labelledby={`help-${id}`}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 id={`help-${id}`}>{title}</h2>
    {children}
  </section>;
}
function Question({question, children}: {question: string; children: ReactNode}) {
  return <details className="help-question"><summary>{question}</summary><div>{children}</div></details>;
}

/**
 * Help (Session L): plain answers for the friends Alpha, following the owner principle. Static text plus two small
 * client parts (the install guide and "Keep my data on this device"). It makes no request and writes nothing on view.
 */
export function HelpPage() {
  return <div className="help-page">
    <PageHeader titleId="help-title" eyebrow="Help & guides" title="Help." lede="How ZIGoals keeps your plans, and how to get the most out of the Alpha."/>
    <p className="help-back"><Link className="text-link" href="/app/settings">← Back to Settings</Link></p>
    <nav className="help-topics" aria-label="Help topics">{TOPICS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

    <Section id="getting-started" eyebrow="GETTING STARTED" title="Three small first steps">
      <ol className="help-steps">
        <li><strong>Your first Goal.</strong> In <Link className="text-link" href="/app/goals">Goals</Link>, choose <strong>+ Create a goal</strong>: name it, pick what you are aiming for, and follow the steps.</li>
        <li><strong>Your first Habit.</strong> In <Link className="text-link" href="/app/habits">Habits</Link>, choose <strong>+ New habit</strong>, start from a template or your own title, and tap it each day you do it.</li>
        <li><strong>Quick counters.</strong> In <Link className="text-link" href="/app/health">Health</Link>, <strong>Quick counters</strong> add today&rsquo;s repetitions with one tap, and Water adds a glass at a time.</li>
      </ol>
      <p>Today brings them together. Want the guided tour again? <Link className="text-link" href="/app/welcome">Show the welcome</Link>.</p>
    </Section>

    <Section id="data-and-sync" eyebrow="YOUR DATA AND SYNC" title="Where your data lives">
      <h3>Before accounts open</h3>
      <p>Your Goals, Habits, Health and Wealth live only on this device, in this browser. Browser storage is not encrypted: anyone who can use this browser profile could read it, so keep your phone and computer locked.</p>
      <h3>Once accounts open</h3>
      <p>You sign in with a code sent to your email, and turn on encrypted sync once: it&rsquo;s offered right after you sign in. From then on, every device you unlock stays up to date automatically. No backups or transfers by hand. Turn on encrypted sync on your first device before you start using a second one.</p>
      <p>Your data is end-to-end encrypted on your device before it leaves; nobody else can read it. The server stores that encrypted data plus what it needs to deliver it: your account, record identifiers, sizes, times, and which part of the app a record belongs to. It cannot read your plans, habits or health entries. Health syncs only if you turn it on, separately.</p>
      <h3>Signing in is not recovery</h3>
      <p>Your email code proves it&rsquo;s you. It cannot unlock your data: only your recovery secret can. ZIGoals asks for it each time you open your account on a device; a password manager can fill it in.</p>
    </Section>

    <Section id="recovery-secret" eyebrow="YOUR RECOVERY SECRET" title="The one thing to keep safe">
      <p>When you turn on encrypted sync, your device creates a long random <strong>recovery secret</strong>. It is the only key to your encrypted data, and it is shown only then.</p>
      <ul className="help-list">
        <li><strong>Keep it in a password manager</strong>, or written down somewhere safe and offline.</li>
        <li><strong>Never share it</strong>: not in screenshots, chats or support emails. We will never ask for it.</li>
        <li><strong>Lost a device?</strong> Sign in on another one and unlock with the secret; sync brings everything back.</li>
        <li><strong>Lost the secret and every device?</strong> Then the data is gone. Nobody, including us, can unlock it.</li>
      </ul>
    </Section>

    <Section id="install" eyebrow="INSTALL ON IPHONE" title="Install ZIGoals on your iPhone">
      <InstallGuide/>
      <h3>Protect what&rsquo;s on this device</h3>
      <p>Before accounts open, your data lives only on this device: installing ZIGoals and keeping its data on this device protect it. Once accounts open, you turn encrypted sync on once, and every device you unlock stays up to date automatically. A backup is only an optional extra safety net.</p>
      <h3>Keep my data on this device</h3>
      <KeepData/>
    </Section>

    <Section id="backups" eyebrow="OPTIONAL BACKUPS" title="An extra safety net, never a chore">
      <p>You don&rsquo;t need backups to stay up to date: once sync is on, your devices keep each other current. A backup is just an extra copy you can keep if you like, and the way to move records you already made in Safari into the installed app.</p>
      <ul className="help-list">
        <li><strong>Encrypted backup:</strong> one file protected by its own separate secret. Make or restore one under <Link className="text-link" href="/app/settings#private-vault">Settings → Keep a protected copy</Link>.</li>
        <li><strong>Readable exports</strong> of a single part (Goals, Habits, Health) are plain files with your personal data: store them privately.</li>
      </ul>
    </Section>

    <Section id="questions" eyebrow="QUESTIONS" title="Good to know about the Alpha">
      <Question question="Is any of this real money?"><p>No. The Alpha is a local simulation and a testnet preview: nothing is bought, sold or sent, and testnet tokens have no value.</p></Question>
      <Question question="Are my Goals on the blockchain?"><p>Not yet. The on-chain Goal contract is not deployed, so Goals stay in this app.</p></Question>
      <Question question="Where do prices come from?"><p>Automatic prices come from CoinGecko and are labelled with their source. ZIGoals asks only about the public assets you choose, never your amounts, Goals or wallet. If automatic prices are unavailable, the app says so and your own values keep working: a value you enter yourself is labelled as a manual value, never shown as a live quote.</p></Question>
      <Question question="Can I look up a food by its barcode?"><p>When product lookup is available, yes: in Health&rsquo;s Diary, open &ldquo;Scan or look up a food barcode&rdquo;. Only the barcode number is sent, through ZIGoals to Open Food Facts; the camera picture stays on your device. If lookup is unavailable or a product isn&rsquo;t found, add the food yourself in Foods &amp; recipes.</p></Question>
      <Question question="Is my data encrypted on this device?"><p>No. Browser storage isn&rsquo;t encrypted, so lock your device. With encrypted sync, your data is encrypted on your device before it leaves.</p></Question>
      <Question question="Sync says &ldquo;Needs attention&rdquo;. Did I lose something?"><p>No. Sync found two versions it won&rsquo;t merge by itself and keeps both until you choose. Open <Link className="text-link" href="/app/settings#encrypted-sync">Settings → Account &amp; sync</Link> to review them.</p></Question>
    </Section>

    <Section id="feedback" eyebrow="SEND FEEDBACK" title="Tell us what you think">
      <p>Something confusing, broken or missing? We&rsquo;d love to hear it.</p>
      <p><a className="primary help-mail" href={feedbackHref}>Email feedback to {FEEDBACK_ADDRESS}</a></p>
      <p className="fine">Please leave out codes, your recovery secret, and personal money or health details. Found a security problem? Write privately to <a className="text-link" href={`mailto:${SECURITY_ADDRESS}`}>{SECURITY_ADDRESS}</a>.</p>
    </Section>
  </div>;
}
