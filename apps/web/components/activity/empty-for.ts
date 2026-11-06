// CI14 (weights): moved here from components/activity-feed.tsx so the feed's stand-in (activity-feed-lazy.tsx) shows the
// same empty view without loading the feed.
/** Session AL (DV-117, P-DV-80): each filter's empty view says what belongs there and where to start it. */
export function emptyFor(category: string): {title: string; body: string; href?: string; link?: string} {
  switch (category) {
    case "GOAL": return {title: "No goal steps yet.", body: "Creating a goal, funding it and ticking its milestones show here.", href: "/app/goals", link: "Go to Goals →"};
    case "WEALTH": return {title: "No wealth records yet.", body: "Assets you add, balances and payments you enter show here.", href: "/app/wealth", link: "Go to Wealth →"};
    case "HABIT": return {title: "No habit check-ins yet.", body: "Each day you check in a habit shows here.", href: "/app/habits", link: "Log one on Habits →"};
    case "HEALTH": return {title: "No health logs yet.", body: "Water, weight and workouts you log show here.", href: "/app/health", link: "Log one on Health →"};
    case "ZIGI": return {title: "Nothing from ZIGi yet.", body: "What you confirm from a ZIGi card shows here."};
    default: return {title: "Your next step belongs here.", body: "Goal actions, habit check-ins and health logs will build your story."};
  }
}
