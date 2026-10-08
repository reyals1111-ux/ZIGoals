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
  { title: "Data & privacy", rows: [
    ["Backups & restore", "Encrypted download and module copies", "private-vault"],
    ["Privacy & storage", "What stays in this browser", "privacy"],
    ["Export everything", "Optional: one readable ZIP of all your records", "export-everything"],
    ["Import from other apps", "Apple Health, Fitbit, Samsung, Oura, Loop", "switch-import"],
  ] },
  { title: "Your app", rows: [
    ["Showcase tour", "Fictional demo data in separate storage", "showcase"],
    ["Pages & start page", "Hide what you don’t use; where ZIGoals opens", "your-pages"],
    ["Time zone", "The day your journals follow", "time-zone"],
    ["Wrap-up on Today", "An optional evening card", "wrap-up"],
    ["Motion & display", "Follow device preference, or Off", "appearance"],
    ["Music & focus sounds", "The music player and Spotify", "music"],
    ["Links on Today", "Your socials, apps and sites", "links"],
    ["Show the welcome again", "Set up a first goal and habit", "/app/welcome"],
  ] },
  { title: "Your areas", rows: [
    ["Habit settings", "Schedules, targets and history", "habits-settings"],
    ["Weekly review day", "The day Today offers your review", "habits-settings"],
    ["Health settings", "Your journal and targets", "health-settings"],
    ["Chess usernames", "chess.com and Lichess, public data", "chess"],
    ["Guide on this device", "Calm notes from your own records", "guide"],
    ["Reminders when closed", "Push on this device, opt-in", "reminders"],
    ["Market data sources", "Price sources and freshness", "market-data"],
  ] },
  { title: "Account & devices", rows: [
    ["Account & sync", "Email sign-in, encrypted vault, devices", "encrypted-sync"],
    ["Wallet account", "Local Demo or Keplr", "account"],
    ["Testnet network", "Chain and wallet connection", "network"],
    ["Contract status", "Deployment status", "contract"],
  ] },
  { title: "ZIGi", rows: [
    ["ZIGi · your AI", "Your own AI, page by page", "your-ai"],
  ] },
  { title: "Help & diagnostics", rows: [
    ["Diagnostics & support", "Connection checks for this alpha", "diagnostics"],
    ["Send feedback", "Email us, with the details you choose", "send-feedback"],
  ] },
];

export function PhoneSettingsList() {
  const show = usePhoneChrome();
  if (!show) return null;
  return <nav className="phone-settings-list" aria-label="Settings sections">
    {GROUPS.map(group => <section key={group.title} aria-label={group.title}>
      <h2>{group.title}</h2>
      <ul>
        {group.rows.map(([label, note, target]) => {
          const content = <><span className="phone-settings-copy"><strong>{label}</strong><small>{note}</small></span><span className="phone-settings-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span></>;
          // Section rows jump within the page; the welcome row opens its own page (phones only, by the owner's choice).
          return <li key={`${target}:${label}`}>{target.startsWith("/") ? <Link href={target} aria-label={label}>{content}</Link> : <a href={`#${target}`} aria-label={label}>{content}</a>}</li>;
        })}
      </ul>
    </section>)}
  </nav>;
}
