'use client';
import Link from 'next/link';
import {useState} from 'react';

export type WhatsNewLink = {href: string; label: string};
/** Session AE (release `2026-10-session-ae-stunning`, ADR-027): stunning, finished. Each link opens its Help answer. */
export const WHATS_NEW_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-af-earn', label: 'Earn: every way to earn in the ZIG Finance ecosystem, with live numbers and risks'},
  {href: '/app/help#help-af-staking', label: 'Stake ZIG in your own wallet, practice or real, after a review'},
  {href: '/app/help#help-af-wallets', label: 'Link more wallets read-only and see their balances'},
  {href: '/app/help#help-af-add-money', label: 'Add money: buy crypto to your own address, step by step'},
  {href: '/app/help#help-af-governance', label: 'Vote on ZIGChain proposals, in plain words'},
  {href: '/app/help#help-af-checklist', label: 'The Checklist: your day as one path of dots'},
  {href: '/app/help#help-af-brief', label: 'ZIGi plans your day: a morning brief, an evening recap and plans'},
  {href: '/app/help#help-af-universe', label: 'My universe, the Day timeline and Stories'},
];
/** Session AE (release `2026-10-session-ae-stunning`, ADR-027); Session AF followed it, so these lead "Earlier updates". */
const SESSION_AE_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-ae-scene', label: 'Today’s welcome header: one scene, with no box or edge'},
  {href: '/app/help#help-ae-finale', label: 'Each page ends in a finale: Goals → Habits → Health = Wealth'},
  {href: '/app/help#help-ae-themes', label: 'Three finished looks: Nebula, Light and Dark'},
  {href: '/app/help#help-ae-sidebar', label: 'A cleaner sky in the sidebar'},
  {href: '/app/help#help-ae-header-art', label: 'Small orbit drawings in the page headers'},
  {href: '/app/help#help-ae-wallets', label: 'Disconnect Keplr, and link other wallets read-only'},
  {href: '/app/help#help-ae-wallet-card', label: 'Today’s wallet card: choose the wallet and the currency'},
  {href: '/app/help#help-ae-habits', label: 'Habits: even room in each group, and Routines as its own block'},
  {href: '/app/help#help-ae-music', label: 'The music button, ZIGi’s twin'},
];
/**
 * Session AD (release `2026-10-session-ad-final-look`, ADR-026): the final look, and three ways to see it; Session AE
 * followed it, so these lead "Earlier updates". Session AE made Light and Dark final, so the first label no longer says "previews".
 */
const SESSION_AD_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-ad-themes', label: 'Three looks: Light and Dark beside Nebula'},
  {href: '/app/help#help-ad-banner', label: 'The footer banner, final, with every link still close'},
  {href: '/app/help#help-ad-hero', label: 'Today’s planets flow softly into the page'},
  {href: '/app/help#help-ad-dates', label: 'One date style everywhere, in your own clock'},
  {href: '/app/help#help-ad-sync-status', label: 'Sync by section, and signed-out devices forget their unlock'},
  {href: '/app/help#help-ad-restore', label: 'Restore: clearer messages, Stop restoring, Undo after a reload'},
  {href: '/app/help#help-ad-zigi', label: 'Meet ZIGi: all 25 states and what each one means'},
];
/** Session AC (release `2026-10-session-ac-polish`, ADR-025): polish — each thing once; Session AD followed it, so these lead "Earlier updates". */
const SESSION_AC_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-ac-habits', label: 'Habit cards show their last 28 days under the counter'},
  {href: '/app/help#help-ac-sky', label: 'A calmer sky: plain dark at the top, richest in the middle'},
  {href: '/app/help#help-ac-footer', label: 'The page ends at the footer links; the Alpha’s facts live in Settings and Help'},
  {href: '/app/help#help-ac-today', label: 'Today shows each thing once (every card can come back)'},
  {href: '/app/help#help-ac-wealth', label: 'Wealth: your assets, accounts and debts in one list with filters'},
  {href: '/app/help#help-ac-water', label: 'One Water card: the ring, one tap with Undo, your history'},
  {href: '/app/help#help-ac-vision', label: 'Your own picture on a vision board tile'},
  {href: '/app/help#help-ac-more', label: 'Tab titles, custom units, aligned reminders and more'},
];
/** Session AB-Design (release `2026-10-session-ab-design`, ADR-024): one 4-in-1 look; Session AC followed it, so these lead "Earlier updates". */
const SESSION_AB_DESIGN_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-abd-look', label: 'One calm look across Goals, Habits, Health and Wealth, and a Life overview on Today'},
  {href: '/app/help#help-abd-footer', label: 'The footer banner: Goals, Habits & Health = Wealth'},
  {href: '/app/help#help-abd-showcase', label: 'Fewer banners: one Alpha notice and a small Showcase chip'},
  {href: '/app/help#help-abd-gamify', label: 'The rocket: Journey widgets on Today and a Journey card on each page'},
  {href: '/app/help#help-abd-goals', label: 'Goal cards with their own artwork, a mood-board vision board and a goal tree'},
  {href: '/app/help#help-abd-habits-health', label: 'Habits under the sky of their time of day; Health highlights and a day-by-day planner'},
  {href: '/app/help#help-abd-wealth', label: 'Wealth in your base currency, the rest never converted'},
  {href: '/app/help#help-abd-search-review', label: 'Search by pillar, and the Life review as a small magazine'},
];
/** Session AB-Cloud (release `2026-10-session-ab-cloud`, ADR-023): your extras sync, Restore, Point & tell, vitamins, grouped amounts; AB-Design merged after it, so these lead "Earlier updates". */
const SESSION_AB_CLOUD_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-ab-sync', label: 'Your goal plans, habit extras, routines and more now sync, encrypted'},
  {href: '/app/help#help-ab-restore', label: 'Restore from a backup: see what it holds, merge or replace, Undo'},
  {href: '/app/help#help-ab-point-tell', label: 'Point & tell: pin a note on any part of a page'},
  {href: '/app/help#help-ab-vitamins', label: 'Vitamins A, C, D, E, K, B12 and folate in Health'},
  {href: '/app/help#help-ab-amounts', label: 'Type 3,250.50 or 3.250,50; a new goal starts in your currency'},
  {href: '/app/help#help-ab-photos', label: 'Photos stay on your device, on purpose'},
];
/** Session AA-Local (release `2026-10-session-aa-local`, ADR-022): Habits, Health and the game layer, best in class; ZIGi everywhere; AB-Cloud merged after it, so these lead "Earlier updates". */
const SESSION_AA_LOCAL_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-aa-habits', label: 'Habits by time of day, a one-tap timer finish, days since for a quit habit, skip with a reason, routines'},
  {href: '/app/help#help-aa-journey', label: 'The game layer: levels, quests, badges and a Journey page, off until you switch it on'},
  {href: '/app/help#help-aa-health', label: 'Health: your weight trend and energy estimate, a weekly coach, a meal planner with a grocery list, recipe import'},
  {href: '/app/help#help-aa-swipes', label: 'Swipe a habit or a diary entry on a phone; delete still asks'},
  {href: '/app/help#help-aa-welcome', label: 'A welcome that sets up your first habits from what you choose, with Undo setup'},
  {href: '/app/help#help-aa-reminders', label: 'One reminders page: every type, quiet hours'},
  {href: '/app/help#help-aa-zigi', label: 'ZIGi learned every new action, in English and Dutch, typed or spoken'},
];
/** Session AA-Cloud (release `2026-10-session-aa-cloud`, ADR-021): pages in order, Goals, the calculator, search and the Life review; AA-Local merged second, so these lead "Earlier updates". */
const SESSION_AA_CLOUD_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-aa-order', label: 'Every page starts with what matters most'},
  {href: '/app/help#help-aa-goals', label: 'Life areas, a balance wheel, a vision board and sub-goals'},
  {href: '/app/help#help-aa-forecast', label: '“At this pace”: an estimated date for each goal'},
  {href: '/app/help#help-aa-calculator', label: 'A compound interest calculator'},
  {href: '/app/help#help-aa-search', label: 'Search everything, with “/”'},
  {href: '/app/help#help-aa-review', label: 'A Life review of your week or month'},
  {href: '/app/help#help-aa-data', label: 'Your data: what is kept, and where'},
  {href: '/app/help#help-aa-home-screen', label: 'Home Screen shortcuts and sharing to ZIGoals'},
];
/** Session Z-Local (release `2026-10-session-z-local`, ADR-020): ZIGi's brain, spoken and complete; folded under "Earlier updates" after AA-Cloud's. */
const SESSION_Z_LOCAL_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-your-ai-voice', label: 'Say it the way you say it: numbers, times, “no wait, three”'},
  {href: '/app/help#help-your-ai-act', label: 'ZIGi can do every ordinary task in the app'},
  {href: '/app/help#help-your-ai-writes', label: 'ZIGi says when there is nothing to change, and which records it saw'},
  {href: '/app/help#help-your-ai-cost', label: 'On Claude, cached prompts cost about four fifths less'},
];
/** Session Z-Cloud (release `2026-10-session-z-cloud`, ADR-019): ZIGi's new face, voice and the persona decisions, under "Earlier updates" after Z-Local's. */
const SESSION_Z_CLOUD_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-z-panel', label: 'ZIGi’s cleaner panel and your own suggestions'},
  {href: '/app/help#help-your-ai-voice', label: 'Talk to ZIGi in English or Dutch'},
  {href: '/app/help#help-z-delete-habit', label: 'Delete an archived habit for good'},
  {href: '/app/help#help-z-status', label: 'A phone’s status line and Status sheet'},
  {href: '/app/help#help-z-have', label: '“What you have” in Wealth'},
  {href: '/app/help#help-z-units', label: 'Weight in pounds, water in fluid ounces'},
  {href: '/app/help#help-z-step-up', label: 'Why your recovery secret is asked again'},
];
/** Session Y (release `2026-10-session-y`), folded under "Earlier updates" after Z-Cloud's. */
const SESSION_Y_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-y-vacation', label: 'End a vacation early'},
  {href: '/app/help#help-y-minus', label: '“−” beside “+” on measured habits'},
  {href: '/app/help#help-y-unit', label: 'Change a metal’s weight unit'},
  {href: '/app/help#help-y-sync', label: 'Sync explains an older or missing cloud copy'},
];
/** Session X-Local (release `2026-10-session-x`), folded under "Earlier updates" after Session Y's. */
const SESSION_X_LOCAL_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-your-ai-alive', label: 'ZIGi comes alive: the real art, idle, emotions'},
  {href: '/app/help#help-your-ai-act', label: 'ZIGi creates anything: stacks, edits, the mood, links, widgets'},
  {href: '/app/help#help-your-ai-auto', label: 'Auto-accept: cards added for you, with Undo'},
];
/** Session W (release `2026-10-session-w`), folded under "Earlier updates" with Session V's. */
const SESSION_W_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-w-pages', label: 'Hide pages and buttons'},
  {href: '/app/help#help-w-sleep', label: 'Sleep and sleep debt'},
  {href: '/app/help#help-w-meditation', label: 'Meditation and breathing'},
  {href: '/app/help#help-w-sounds', label: 'Focus sounds and music'},
  {href: '/app/help#help-w-import', label: 'Bring data from other apps'},
  {href: '/app/help#help-w-devices', label: 'Heart-rate monitors, scales'},
  {href: '/app/help#help-w-habits', label: 'Habit challenges and stacks'},
  {href: '/app/help#help-w-goals', label: 'Milestones and “On track?”'},
  {href: '/app/help#help-w-wealth', label: 'Accounts, debts, net worth'},
  {href: '/app/help#help-w-chess', label: 'Chess: chess.com, Lichess'},
  {href: '/app/help#help-w-links', label: 'My links on Today'},
];
/** The earlier releases' links (Session Z-Local, Z-Cloud, Y, X-Local, W, V), folded under "Earlier updates". */
export const EARLIER_LINKS: WhatsNewLink[] = [
  ...SESSION_AE_LINKS,
  ...SESSION_AD_LINKS,
  ...SESSION_AC_LINKS,
  ...SESSION_AB_DESIGN_LINKS,
  ...SESSION_AB_CLOUD_LINKS,
  ...SESSION_AA_LOCAL_LINKS,
  ...SESSION_AA_CLOUD_LINKS,
  ...SESSION_Z_LOCAL_LINKS,
  ...SESSION_Z_CLOUD_LINKS,
  ...SESSION_Y_LINKS,
  ...SESSION_X_LOCAL_LINKS,
  ...SESSION_W_LINKS,
  {href: '/app/help#help-auto-checkins', label: 'Habits that tick themselves off from Health'},
  {href: '/app/help#help-health-goals', label: 'Health goals'},
  {href: '/app/help#help-skips', label: 'Planned skips and vacation days'},
  {href: '/app/help#help-weekly-review', label: 'A weekly review'},
  {href: '/app/help#help-fasting', label: 'A fasting timer'},
  {href: '/app/help#help-insights', label: 'Things you might notice'},
  {href: '/app/help#help-imports', label: 'Import a CSV'},
  {href: '/app/help#help-export-everything', label: 'Export everything (optional)'},
  {href: '/app/help#help-quick-add', label: 'Type a line into Quick add'},
  {href: '/app/help#help-push-reminders', label: 'Reminders when ZIGoals is closed'},
  {href: '/app/help#help-guide', label: 'The Guide, on this device'},
  {href: '/app/help#help-your-ai-what', label: 'ZIGi · Your Personal AI Companion (Premium, free during Alpha)'},
  {href: '/app/help#help-your-ai-data', label: 'Ask ZIGi about your records, and more from ZIGi'},
];
/**
 * The one-time "What's new" card (Session P): links to the Help entries of the new features, the previous release's under
 * "Earlier updates"; "Got it" writes the device flag.
 */
export function WhatsNewCard({links = WHATS_NEW_LINKS, earlier = EARLIER_LINKS, onDismiss}: {links?: WhatsNewLink[]; earlier?: WhatsNewLink[]; onDismiss: () => boolean}) {
  const [error, setError] = useState('');
  return <section className="panel for-you-card whats-new-card" aria-labelledby="whats-new-title">
    <p className="eyebrow">What’s new</p><h2 id="whats-new-title">A few new things.</h2>
    <p className="fine">Each one is optional, and nothing changes until you use it.</p>
    <ul className="whats-new-links">{links.map((link, i) => <li key={`${i}:${link.href}`}><Link href={link.href}>{link.label}</Link></li>)}</ul>
    {earlier.length > 0 && <details className="whats-new-earlier"><summary>Earlier updates</summary><ul className="whats-new-links">{earlier.map((link, i) => <li key={`${i}:${link.href}`}><Link href={link.href}>{link.label}</Link></li>)}</ul></details>}
    <button type="button" className="primary" onClick={() => { if (!onDismiss()) setError('This card could not be hidden on this device; it may show once more.'); }}>Got it</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
