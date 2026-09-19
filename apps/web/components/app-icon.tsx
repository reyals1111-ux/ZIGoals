import { useId } from "react";
const paths: Record<string, string> = {
  home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-8h6v8",
  star: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  today: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  goals: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 10v4m-2-2h4",
  habits: "M6 4v4m0 4v8M12 4v9m0 4v3M18 4v2m0 4v10M4 8h4m2 5h4m2-7h4",
  health: "M3 12h4l3-7 4 14 3-7h4",
  ecosystem: "m5 6 7 6 7-6M5 18l7-6 7 6M3 4h4v4H3zM17 4h4v4h-4zM3 16h4v4H3zM17 16h4v4h-4z",
  activity: "M4 19V9m5 10V4m5 15v-7m5 7V7",
  settings: "M9 4h6l1 3 3 1v8l-3 1-1 3H9l-1-3-3-1V8l3-1zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  wallet: "M19 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7m18 6h-6v4h6m-3-2h.01",
  play: "m9 6 9 6-9 6z",
  future: "m12 2 10 6v10l-10 5-10-5V8zm0 10 10-4M12 12 2 8m10 4v11m-5-9 5 3 5-3",
  chain: "m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1",
  chevron: "m6 9 6 6 6-6",
  refresh: "M20 7v5h-5M4 17v-5h5m10-2a7 7 0 0 0-12-5M5 14a7 7 0 0 0 12 5",
  plus: "M12 5v14M5 12h14",
};
export function AppIcon({ name, size = 20, luminous = false }: { name: string; size?: number; luminous?: boolean }) {
  const id = useId();
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={luminous ? `url(#${id})` : "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {luminous && <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--brand-cyan)"/><stop offset=".4" stopColor="var(--brand-blue)"/><stop offset=".72" stopColor="var(--brand-violet)"/><stop offset="1" stopColor="var(--brand-magenta)"/></linearGradient></defs>}
    <path d={paths[name] ?? paths.goals}/>
  </svg>;
}
