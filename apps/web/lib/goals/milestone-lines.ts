/**
 * Session AL (L4; DV-016a/b, DV-019c/e-2, DV-040e, DV-109; P-DV-07, P-DV-58, P-DVR-25; L-024): the rules for a milestone's
 * name, the same in the wizard's "one per line" box, the milestone panel and its edit field. The stored record allows 100
 * characters (privateGoalSchema), so that is the limit everywhere; two milestones of one Goal never share a name (screen
 * readers announce each by its name).
 */
export const MILESTONE_MAX = 100;

const key = (title: string) => title.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

/** The sentence for one milestone name, or null. `others` are the Goal's other milestone names. */
export function milestoneNameIssue(title: string, others: readonly string[] = []): string | null {
 const text = title.replace(/\s+/g, ' ').trim();
 if (!text) return 'Give the milestone a name.';
 if (text.length > MILESTONE_MAX) return `A milestone can be at most ${MILESTONE_MAX} characters (this one has ${text.length}).`;
 if (others.some(o => key(o) === key(text))) return `This goal already has a milestone called “${text.slice(0, 60)}”. Give this one another name.`;
 return null;
}

/** The wizard's box: at least one line, each line fits, no line repeats another. Names the line that needs a change. */
export function milestoneLinesIssue(lines: string): string | null {
 const titles = lines.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
 if (!titles.length) return 'Add at least one milestone.';
 for (const [i, t] of titles.entries()) {
  if (t.length > MILESTONE_MAX) return `Milestone ${i + 1} is ${t.length} characters long; use at most ${MILESTONE_MAX}.`;
  const first = titles.findIndex(o => key(o) === key(t));
  if (first !== i) return `Milestones ${first + 1} and ${i + 1} have the same name. Give each step its own name.`;
 }
 return null;
}
