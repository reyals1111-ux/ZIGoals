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
// Row and group names are distinct from every other name on the page and in the phone chrome (the "Habits" and "Health"
// tabs, the section headings), so a link or text lookup by name still finds exactly one element.
const GROUPS: { title: string; rows: [label: string, note: string, target: string][] }[] = [
  { title: "Data & backups", rows: [
    ["Backups & restore", "Encrypted download and module copies", "private-vault"],
    ["Privacy & storage", "What stays in this browser", "privacy"],
    ["Account & sync", "Email sign-in and encrypted vault", "encrypted-sync"],
    ["Export everything", "Optional: one readable ZIP of all your records", "export-everything"],
  ] },
  { title: "Try & display", rows: [
    ["Showcase tour", "Fictional demo data in separate storage", "showcase"],
    ["Motion & display", "Follow device preference, or Off", "appearance"],
    ["Show the welcome again", "Set up a first goal and habit", "/app/welcome"],
  ] },
  { title: "Wallet & network", rows: [
    ["Wallet account", "Local Demo or Keplr", "account"],
    ["Testnet network", "Chain and wallet connection", "network"],
    ["Contract status", "Deployment status", "contract"],
  ] },
  { title: "Sources & modules", rows: [
    ["Market data sources", "Price sources and freshness", "market-data"],
    ["Habit settings", "Schedules, targets and history", "habits-settings"],
    ["Weekly review day", "The day Today offers your review", "habits-settings"],
    ["Health settings", "Your journal and targets", "health-settings"],
  ] },
  { title: "Help & diagnostics", rows: [
    ["Diagnostics & support", "Connection checks for this alpha", "diagnostics"],
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
          return <li key={target}>{target.startsWith("/") ? <Link href={target} aria-label={label}>{content}</Link> : <a href={`#${target}`} aria-label={label}>{content}</a>}</li>;
        })}
      </ul>
    </section>)}
  </nav>;
}
