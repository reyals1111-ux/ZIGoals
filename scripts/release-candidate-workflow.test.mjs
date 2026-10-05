import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session U Part 6 (FIX_PLAN F3, FINDINGS Q-SC-06): a release candidate can mint an attestation, so only the owner may
// start one: exact comparisons in the first job, before any other job (all of them need it) runs.
const workflow = readFileSync(new URL("../.github/workflows/release-candidate.yml", import.meta.url), "utf8");
test("the first job accepts only the owner's own dispatch of this repository's main", () => {
  const step = workflow.slice(workflow.indexOf("- name: Restrict issuance to exact reviewed main commit"), workflow.indexOf("  quality:"));
  for (const line of ['test "$GITHUB_EVENT_NAME" = workflow_dispatch', 'test "$GITHUB_REPOSITORY" = reyals1111-ux/ZIGoals', 'test "$GITHUB_ACTOR" = reyals1111-ux', 'test "$GITHUB_TRIGGERING_ACTOR" = reyals1111-ux', 'test "$GITHUB_REF" = refs/heads/main', 'test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'])
    expect(step).toContain(line);
  expect(step).not.toMatch(/\[bot\]|=~ \^?\(?reyals|\*/);
});
test("every other job waits for that check, directly or through the jobs it needs", () => {
  const jobs = new Map([...workflow.matchAll(/^  ([a-z-]+):\n([\s\S]*?)(?=^  [a-z-]+:\n|(?![\s\S]))/gm)].map(([, name, body]) => {
    const needs = body.match(/^    needs: (?:\[([^\]]*)\]|([a-z-]+))$/m);
    return [name, needs ? (needs[1] ?? needs[2]).split(",").map(n => n.trim()).filter(Boolean) : []];
  }));
  expect([...jobs.keys()][0]).toBe("authorize-source");
  expect(jobs.size).toBeGreaterThan(4);
  const reaches = (job, seen = new Set()) => job === "authorize-source" || (!seen.has(job) && (seen.add(job), (jobs.get(job) ?? []).some(next => reaches(next, seen))));
  for (const job of [...jobs.keys()].slice(1)) expect(reaches(job), job).toBe(true);
});
