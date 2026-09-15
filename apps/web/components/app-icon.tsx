const paths: Record<string, string> = {
  today: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  goals: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 10v4m-2-2h4",
  habits: "M6 4v4m0 4v8M12 4v9m0 4v3M18 4v2m0 4v10M4 8h4m2 5h4m2-7h4",
  health: "M3 12h4l3-7 4 14 3-7h4",
  ecosystem: "m5 6 7 6 7-6M5 18l7-6 7 6M3 4h4v4H3zM17 4h4v4h-4zM3 16h4v4H3zM17 16h4v4h-4z",
  activity: "M4 19V9m5 10V4m5 15v-7m5 7V7",
  settings: "M9 4h6l1 3 3 1v8l-3 1-1 3H9l-1-3-3-1V8l3-1zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
};
export function AppIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] ?? paths.goals}/></svg>;
}
