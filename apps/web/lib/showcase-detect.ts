/**
 * Showcase demo data, recognised without any change to the backup format (QA-17). Showcase records carry fixed ids and
 * labels that ordinary use never produces (lib/showcase-data.ts): positions `showcase-*` in the account
 * `showcase-fictional`, habits `92000000-0000-4000-8000-*` noted "SHOWCASE DATA", and foods `health_food-000N` from the
 * "Showcase kitchen" or activities "Showcase walk". A file with any of them is treated as demo data.
 */
export type ShowcaseModule = "platform" | "habits" | "health";

type Records = { [key: string]: unknown };
const list = (value: unknown): Records[] => Array.isArray(value) ? value.filter((item): item is Records => !!item && typeof item === "object") : [];

export function isShowcaseBackup(module: ShowcaseModule, data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const records = data as Records;
  if (module === "platform") return list(records.positions).some(p => typeof p.id === "string" && p.id.startsWith("showcase-") && p.account === "showcase-fictional");
  if (module === "habits") return list(records.habits).some(h => typeof h.id === "string" && h.id.startsWith("92000000-0000-4000-8000-") && h.notes === "SHOWCASE DATA · fictional 30-day history");
  return list(records.foods).some(f => typeof f.id === "string" && /^health_food-000\d$/.test(f.id) && f.brand === "Showcase kitchen")
    || list(records.activity).some(a => typeof a.id === "string" && /^health_activity-\d{3}$/.test(a.id) && a.name === "Showcase walk");
}

/** A private export's download name; in Showcase it says "showcase-demo", so the file is never taken for a real backup. */
export function exportFileName(name: string, showcase: boolean): string {
  return showcase ? name.replace(/^zigoals-/, "zigoals-showcase-demo-") : name;
}
