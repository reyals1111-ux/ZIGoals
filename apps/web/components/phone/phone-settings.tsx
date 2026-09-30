"use client";
import "./phone-settings.css";
import { AppIcon } from "../app-icon";
import { usePhoneChrome } from "./use-phone-layout";

/**
 * Settings on a phone (Session E): a grouped list under the title, like the system settings app, that takes the place of
 * the section chips. Each row goes to the existing section (same ids, same content and order below it). Server-rendered
 * for phones, removed after hydration elsewhere; phone-settings.css keeps it hidden on larger screens until then.
 */
// Row and group names are distinct from every other name on the page and in the phone chrome (the "Habits" and "Health"
// tabs, the section headings), so a link or text lookup by name still finds exactly one element.
const GROUPS: { title: string; rows: [label: string, note: string, id: string][] }[] = [
  { title: "Data & backups", rows: [
    ["Backups & restore", "Encrypted download and module copies", "private-vault"],
    ["Privacy & storage", "What stays in this browser", "privacy"],
    ["Account & sync", "Email sign-in and encrypted vault", "encrypted-sync"],
  ] },
  { title: "Try & display", rows: [
    ["Showcase tour", "Fictional demo data in separate storage", "showcase"],
    ["Motion & display", "Follow device preference, or Off", "appearance"],
  ] },
  { title: "Wallet & network", rows: [
    ["Wallet account", "Local Demo or Keplr", "account"],
    ["Testnet network", "Chain and wallet connection", "network"],
    ["Contract status", "Deployment status", "contract"],
  ] },
  { title: "Sources & modules", rows: [
    ["Market data sources", "Price sources and freshness", "market-data"],
    ["Habit settings", "Schedules, targets and history", "habits-settings"],
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
        {group.rows.map(([label, note, id]) => <li key={id}><a href={`#${id}`} aria-label={label}>
          <span className="phone-settings-copy"><strong>{label}</strong><small>{note}</small></span>
          <span className="phone-settings-chevron" aria-hidden="true"><AppIcon name="back" size={18} /></span>
        </a></li>)}
      </ul>
    </section>)}
  </nav>;
}
