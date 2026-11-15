"use client";
import "./phone-settings.css";
import Link from "next/link";
import { AppIcon } from "../app-icon";
import { usePhoneChrome } from "./use-phone-layout";

/**
 * Settings on a phone (Session E): a grouped list under the title, like the system settings app, that takes the place of
 * the section chips. Each row goes to the existing section (same ids, same content and order below it). Server-rendered
 * for phones, removed after hydration elsewhere; phone-settings.css keeps it hidden on larger screens until then.
 */
// Row names are distinct from every other name on the page and in the phone chrome (the "Habits" and "Health" tabs, the
// section headings), so a link or text lookup by name still finds exactly one element. Session W Part 24: the groups
// are the page's six labelled groups, Data & privacy first so backups stay on the first screen (Session E).
const GROUPS: { title: string; rows: [label: string, note: string, target: string][] }[] = [
  // Session AO (owner decision 13 Nov): Appearance first, as on a computer.
  { title: "Appearance", rows: [
    ["Theme, motion & display", "Nebula, Dark or Light; motion; text size", "appearance"],
  ] },
  { title: "Data & privacy", rows: [
    ["Backups & restore", "Encrypted backup and copies of each area", "private-vault"], // Session AL third pass (DV-261)
    ["Privacy & storage", "What stays in this browser", "privacy"],
    ["Export everything", "Optional: one readable ZIP of all your records", "export-everything"],
    ["Import from other apps", "Apple Health, Samsung, Oura, Loop", "switch-import"],
  ] },
  { title: "Your app", rows: [
    ["Pages & start page", "Hide what you don’t use; where ZIGoals opens", "your-pages"],
    ["Time zone", "The day your journals follow", "time-zone"],
    // Session AO (C-DVG-22, UX review): its own row, as on a computer.
    ["My day ends at", "When habits and the Checklist start a new day", "day-ends"],
    ["Wrap-up on Today", "An optional evening card", "wrap-up"],
    ["Show the welcome again", "Set up a first goal and habit", "/app/welcome"],
  ] },
  { title: "Your areas", rows: [
    ["Habit settings", "Schedules, targets and history", "habits-settings"],
    ["Weekly review day", "The day Today offers your review", "habits-settings"],
    ["Health targets", "Calories, water, steps and units", "health-settings"],
    ["Guide on this device", "Calm notes from your own records", "guide"],
    ["Reminders when closed", "Push on this device, opt-in", "reminders"],
    ["Market data sources", "Price sources and freshness", "market-data"],
  ] },
  // Session AL sweep 4 (DV-262, DV-266): the optional extras in one group, so the areas read as the life areas only.
  { title: "Extras", rows: [
    ["Music & focus sounds", "The music player and Spotify", "music"],
    ["Links on Today", "Your socials, apps and sites", "links"],
    ["Chess usernames", "chess.com and Lichess, public data", "chess"],
  ] },
  { title: "Account & devices", rows: [
    ["Account & sync", "Email sign-in, encrypted vault, devices", "encrypted-sync"],
    // Session AK X1 (RELEASE_REVIEW R4): the wallet, network and contract panels, one row, once the chain is chosen.
    ["Wallet & network (advanced)", "Wallet account, networks and contract status", "wallet-network"],
  ] },
  // Session AK G2 (RELEASE_REVIEW_2 R2-4): one assistant group, ZIGi's settings and NOVA's.
  { title: "Your assistant", rows: [
    ["ZIGi · Your Personal AI Companion", "Your own AI, page by page", "your-ai"],
    ["NOVA, the command center", "Brain setup, what NOVA sees, memory and cost", "nova-settings"],
  ] },
  { title: "Help & diagnostics", rows: [
    ["Diagnostics & support", "Checks to share if something goes wrong", "diagnostics"],
    ["Send feedback", "Email us, with the details you choose", "send-feedback"],
  ] },
  // Session AL sweep 4 (DV-262): the demo tour last, on its own, not among the data rows.
  { title: "Try it", rows: [
    ["Showcase tour", "Fictional examples, in this tab only", "showcase"],
  ] },
];

/** Rows shown only once the chain is chosen (lib/chain-choice.ts). */
const CHAIN_ROWS = new Set(["wallet-network"]);
export function PhoneSettingsList({ chain = true }: { chain?: boolean }) {
  const show = usePhoneChrome();
  if (!show) return null;
  return <nav className="phone-settings-list" aria-label="Settings sections">
    {GROUPS.map(group => <section key={group.title} aria-label={group.title}>
      <h2>{group.title}</h2>
      <ul>
        {group.rows.filter(([, , target]) => chain || !CHAIN_ROWS.has(target)).map(([label, note, target]) => {
          const content = <><span className="phone-settings-copy"><strong>{label}</strong><small>{note}</small></span><span className="phone-settings-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span></>;
          // Section rows jump within the page; the welcome row opens its own page (phones only, by the owner's choice).
          return <li key={`${target}:${label}`}>{target.startsWith("/") ? <Link href={target} aria-label={label}>{content}</Link> : <a href={`#${target}`} aria-label={label}>{content}</a>}</li>;
        })}
      </ul>
    </section>)}
  </nav>;
}
