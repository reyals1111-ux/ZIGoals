import Link from 'next/link';
import type {ReactNode} from 'react';
import {PageHeader} from '../page-header';
import {InstallGuide} from './install-guide';
import {KeepData} from './keep-data';
import {HelpQuestion} from './help-question';
import './help.css';

/** Owner decision L1: feedback goes to contact@zigoals.app; security reports keep SECURITY.md's address. */
const FEEDBACK_ADDRESS = 'contact@zigoals.app', SECURITY_ADDRESS = 'hello@zigoals.app';
const version = [process.env.NEXT_PUBLIC_APP_VERSION, process.env.NEXT_PUBLIC_APP_COMMIT?.slice(0, 7)].filter(v => v && v !== 'Unknown').join(' · ') || 'unknown';
const feedbackHref = `mailto:${FEEDBACK_ADDRESS}?subject=${encodeURIComponent('ZIGoals Alpha feedback')}&body=${encodeURIComponent(`What happened:\n\nWhat you expected:\n\nDevice and browser:\n\nApp version: ${version}\n\n(Please leave out codes, your recovery secret, and personal money or health details.)`)}`;

const TOPICS: [id: string, label: string][] = [
  ['getting-started', 'Getting started'], ['data-and-sync', 'Your data and sync'], ['recovery-secret', 'Your recovery secret'],
  ['install', 'Install on iPhone'], ['backups', 'Optional backups'], ['questions', 'Questions'], ['whats-new-alpha', 'What\'s new'], ['feedback', 'Send feedback'],
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
      <p>Your email code proves it&rsquo;s you. It cannot unlock your data: only your recovery secret can. ZIGoals asks for it when you open your account on a device; a password manager can fill it in. On your own phone or computer you can tick &ldquo;Remember on this device&rdquo;: ZIGoals then opens your account there without asking again, until you lock it or choose Forget this device in Settings. Don&rsquo;t use it on a shared computer.</p>
    </Section>

    <Section id="recovery-secret" eyebrow="YOUR RECOVERY SECRET" title="The one thing to keep safe">
      <p>When you turn on encrypted sync, your device creates a long random <strong>recovery secret</strong>. It is the only key to your encrypted data, and it is shown only then.</p>
      <ul className="help-list">
        <li><strong>Keep it in a password manager</strong>, or written down somewhere safe and offline.</li>
        <li><strong>Never share it</strong>: not in screenshots, chats or support emails. We will never ask for it.</li>
        <li><strong>Lost a device?</strong> Sign in on another one and unlock with the secret; sync brings everything back.</li>
        <li><strong>Lost the secret, but a device still opens your account?</strong> On that device, choose Rotate vault encryption in Settings to get a new secret, and save it.</li>
        <li><strong>Lost the secret and every device that opens your account?</strong> Then the data is gone. Nobody, including us, can unlock it.</li>
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

    <Section id="whats-new-alpha" eyebrow="WHAT&rsquo;S NEW" title="New in this Alpha, in your own words">
      <p>Nine small things arrived together. Every one is optional, works on this device, and keeps your numbers honest: nothing is estimated, suggested or graded.</p>
      <HelpQuestion id="auto-checkins" question="Can a habit tick itself off from my Health journal?"><p>Yes. Edit the habit and choose what completes it under &ldquo;Done automatically from Health&rdquo;: water, steps, active minutes, a weight reading or one of your exercise counters, with a target if you like. When you open Today, Habits or Health and the day&rsquo;s Health records reach it, the habit is ticked off once, and the card says so. Tapping the habit yourself always wins, and Undo keeps it off for that day. The rule stays on this device; the check-ins it makes are ordinary check-ins.</p></HelpQuestion>
      <HelpQuestion id="health-goals" question="What is a health goal, and where does its progress come from?"><p>A health goal watches one thing you already record in Health: steps, water, an exercise counter, active minutes, or your weight trend. You choose the target and the window; ZIGoals only counts your own entries, and shows &ldquo;No data yet&rdquo; when there is nothing to count. It never suggests a target, never grades a result and gives no medical advice. Health goals stay on this device for now.</p></HelpQuestion>
      <HelpQuestion id="skips" question="I&rsquo;m away for a week. Will my streak break?"><p>No. A skipped day is neutral: it neither adds to a streak nor breaks it. Plan a skip from a habit&rsquo;s &ldquo;History &amp; reflection&rdquo; for a single day, or mark a whole range with &ldquo;Vacation&rdquo; at the top of Habits. Reminders stay quiet on skipped days, and you can remove a planned skip at any time. Rest days need no marking at all: the days off your schedule never count against you.</p></HelpQuestion>
      <HelpQuestion id="weekly-review" question="What is the weekly review?"><p>On the day you choose in Settings, Today offers a short look back at your week: what went well, your goals, habits, health and wealth, and one intention for next week. Every step shows your own numbers for that week, and every field is optional. Finish it, or skip it with one tap; it never nags. Your words stay on this device for now.</p></HelpQuestion>
      <HelpQuestion id="fasting" question="How does the fasting timer work, and is it right for me?"><p>It is a clock: choose 12:12, 14:10, 16:8 or your own target up to 18 hours, start, and stop when you decide. It keeps your last fasts as hours and targets, nothing more: no streaks, no records, no calories, and it never compares one fast with another. A fast is stopped automatically at 24 hours. Fasting isn&rsquo;t for everyone: if you&rsquo;re pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first, and stop if you feel unwell. ZIGoals gives no medical advice.</p></HelpQuestion>
      <HelpQuestion id="insights" question="What are the &ldquo;Something you might notice&rdquo; cards?"><p>When your journals hold at least two weeks of matching records, Today may show a simple pairing in them, in counts: for example, on how many of the days you walked more you also logged water, compared with the other days. The numbers are only your own entries, and the card shows exactly how it counted them. A pairing is not a cause and not advice. Dismiss a card and it stays away for four weeks.</p></HelpQuestion>
      <HelpQuestion id="imports" question="Can I import a CSV from another app?"><p>Yes, from any spreadsheet or export that has a header row: choose the file, match its columns, check the preview and confirm. Transactions go into a Portfolio, holdings into Wealth, meals into Health&rsquo;s diary. The file is read on this device and never uploaded; blank cells stay unknown rather than becoming zero; a coin that isn&rsquo;t recognised is yours to choose or skip. One tap undoes an import until you change any of the records it added. There is no MyFitnessPal preset yet: its export format could not be verified.</p></HelpQuestion>
      <HelpQuestion id="export-everything" question="Can I get all my data out?"><p>Yes, any time: Settings &rarr; &ldquo;Export everything&rdquo; makes one ZIP on your device with a JSON file of every record and a CSV per area that opens in a spreadsheet. You never need it: sync and the encrypted backup keep your records. It is readable, so keep it private, and it is not a restore format.</p></HelpQuestion>
      <HelpQuestion id="quick-add" question="What can I type into Quick add?"><p>A short English line about water, weight, steps, a run, walk, cycle or swim with its minutes, sleep, one of your exercise counters, or a habit by its name: &ldquo;drank 2 glasses of water&rdquo;, &ldquo;weight 78.4&rdquo;, &ldquo;walked 8,000 steps&rdquo;, &ldquo;ran 5k in 28 min&rdquo;, &ldquo;slept 7h&rdquo;, &ldquo;+2 pushups&rdquo;, &ldquo;meditated&rdquo;. ZIGoals shows what it will save before you tap Save, and tells you when it did not understand. Add &ldquo;yesterday&rdquo; to log for yesterday.</p></HelpQuestion>
      <HelpQuestion id="push-reminders" question="Can a reminder reach me when ZIGoals is closed?"><p>Yes, if you turn it on for a device: Settings &rarr; &ldquo;Reminders when closed&rdquo;. After a reminder time you set, your device shows one notification, &ldquo;A reminder from ZIGoals&rdquo;, and nothing more; opening it brings you to Today. It needs a signed-in account, and on an iPhone it works only in the app saved to your Home Screen. The server gets your reminder times, your time zone and the weekdays, your quiet hours, and the address your browser hands out for push messages, never a habit&rsquo;s name, a count or anything you record. Turn it off any time: &ldquo;Turn off and delete from the server&rdquo; removes everything about that device at once. It is not available in every build; the panel says so.</p></HelpQuestion>
      <HelpQuestion id="guide" question="What is the Guide, and what does it read?"><p>The Guide is a short note on Today, at most one a day, made from your own records on this device: an open habit in the evening, a streak at a round number, a goal&rsquo;s next date, your weekly review when it is ready. It is off until you turn it on in Settings &rarr; &ldquo;Guide on this device&rdquo;, and every note is labelled &ldquo;Guide &middot; on this device, no AI service&rdquo;: fixed rules, no model, no service, nothing sent anywhere. It never gives money or medical advice and never moves anything. &ldquo;Not today&rdquo; hides a note; the switch in Settings turns the Guide off again.</p></HelpQuestion>
    </Section>

    <Section id="feedback" eyebrow="SEND FEEDBACK" title="Tell us what you think">
      <p>Something confusing, broken or missing? We&rsquo;d love to hear it.</p>
      <p><a className="primary help-mail" href={feedbackHref}>Email feedback to {FEEDBACK_ADDRESS}</a></p>
      <p className="fine">Please leave out codes, your recovery secret, and personal money or health details. Found a security problem? Write privately to <a className="text-link" href={`mailto:${SECURITY_ADDRESS}`}>{SECURITY_ADDRESS}</a>.</p>
    </Section>
  </div>;
}
