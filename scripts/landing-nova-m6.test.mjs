import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

// Session AK M6 (owner follow-up 2, under AJ's MO6 rule): the landing's NOVA chapter says only what the app does. NOVA
// works with a local model or the person's own key (and answers from their records on the device until then); a consumer
// subscription is never implied to work; Hermes Agent carries its official name and link and no partnership; the example
// dashboard is labelled; its opening plays once (a button replays it) and never under reduced motion or ?motion=off; the
// What's new cards form a bento; every motion in final-v7.css is finite and inside the no-preference block.
const read = file => readFileSync(new URL(`../landing/${file}`, import.meta.url), "utf8");
const html = read("index.html");
const css = read("styles/final-v7.css");
const js = read("scripts/motion.js");
const text = fragment => fragment.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/ ([,.:;?])/g, "$1").trim();
const chapter = html.match(/<section id="nova"[\s\S]*?<\/section>/)?.[0] ?? "";
const words = text(chapter);

test("the NOVA chapter carries the owner's two lines and sits among the chapters, before the ecosystem", () => {
  expect(chapter).not.toBe("");
  expect(words).toContain("Your life data and your own AI, in one private place.");
  expect(words).toContain("Build your own AI command center, with a real life to run.");
  expect(html.indexOf('<section id="wealth"')).toBeLessThan(html.indexOf('<section id="nova"'));
  expect(html.indexOf('<section id="nova"')).toBeLessThan(html.indexOf('<section id="ecosystem"'));
  expect(chapter).toMatch(/aria-labelledby="nova-title"/);
  expect(html.match(/id="nova-title"/g)).toHaveLength(1);
});

test("OD-1: no public copy names a third-party AI character; NOVA is your own AI command center or personal AI assistant", () => {
  // The landing, its legal pages and scripts, and the app's Help, What's new, search mirror and every NOVA surface.
  const web = path => new URL(`../apps/web/${path}`, import.meta.url);
  const tree = dir => readdirSync(web(dir), { recursive: true }).filter(file => /\.(tsx?|css|md)$/.test(file) && !/\.test\.tsx?$/.test(file)).map(file => `${dir}/${file}`);
  const app = ["components/help/help-page.tsx", "lib/search/static.ts", "lib/whats-new.ts", ...tree("components/nova"), ...tree("lib/nova"), ...tree("app/app/nova")];
  const landing = ["index.html", "privacy.html", "terms.html", ...readdirSync(new URL("../landing/scripts", import.meta.url)).map(file => `scripts/${file}`)];
  expect(app.length).toBeGreaterThan(20);
  for (const file of landing) expect(read(file), file).not.toMatch(/jarvis/i);
  for (const file of app) expect(readFileSync(web(file), "utf8"), file).not.toMatch(/jarvis/i);
});

test("honest claims: local model or own key; a subscription is not an API key; nothing on a ZIGoals server; money never moves", () => {
  expect(words).toMatch(/model on your own computer \(Ollama, LM Studio or llama\.cpp\) or your own API key/);
  expect(words).toContain("NOVA answers from your records on your device");
  expect(words).toContain("A ChatGPT, Claude, Gemini or Grok plan is not an API key, so it does not work here.");
  expect(words).toContain("nothing goes to a ZIGoals server");
  expect(words).toContain("NOVA never moves money: you confirm every change.");
  // Never implies a subscription or a provider login works, never sells a plan, no superlatives.
  expect(words).not.toMatch(/sign in with (ChatGPT|Claude|Gemini|Google|OpenAI)|use your (ChatGPT|Claude|Gemini|Grok) (plan|subscription|account)|subscription (works|included)|free (AI|forever)|unlimited/i);
  expect(words).not.toMatch(/#1\b|\bnumber one\b|\bthe best\b|\bworld's first\b|guaranteed?|partner(s|ed|ship|ships)?\b|integrat\w*|official(ly)? (partner|integration)/i);
});

test("Hermes Agent: its official name, by Nous Research, its own link, and no affiliation", () => {
  const link = chapter.match(/<a [^>]*>Hermes Agent<\/a>/)?.[0] ?? "";
  expect(link).toContain('href="https://github.com/NousResearch/hermes-agent"');
  expect(link).toContain('rel="noopener noreferrer"');
  expect(words).toContain("Hermes Agent, the open-source agent by Nous Research");
  expect(words).toContain("ZIGoals is not affiliated with Nous Research.");
});

test("the example dashboard is labelled, hidden from assistive technology as a picture, and described in words", () => {
  const figure = chapter.match(/<figure[\s\S]*?<\/figure>/)[0];
  expect(figure).toContain('<span class="example-tag">Example data</span>');
  expect(figure).toMatch(/<div class="nv-screen" aria-hidden="true">/);
  expect(text(figure.match(/<figcaption>[\s\S]*?<\/figcaption>/)[0])).toContain("An example NOVA dashboard coming online.");
  // The replay is a real button, hidden until script can play it (no motion, no button).
  expect(figure).toMatch(/<button type="button" class="nv-replay" hidden>Play the opening again<\/button>/);
  expect(js).toMatch(/if \(stage && 'IntersectionObserver' in window && motionAllowed\(\)\)/);
  expect(js).toContain("replay.hidden = false");
});

test("every motion in final-v7.css plays once, waits for no-preference and stops under ?motion=off; drifts rest on low-end devices", () => {
  const block = css.match(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/)[1];
  expect(css.replace(block, "")).not.toMatch(/animation:/);
  for (const rule of block.match(/animation:[^;}]+/g)) expect(rule).not.toMatch(/infinite/);
  for (const line of block.split("\n").filter(l => l.includes("animation:"))) expect(line).toContain("html:not(.motion-off)");
  // The only repeated motion is the orb's breath, twice.
  expect(block).toMatch(/lv7-breathe 2\.4s ease-in-out \.6s 2 alternate/);
  for (const line of block.split("\n").filter(l => /star-field|nova-chapter:before/.test(l))) expect(line).toContain(":not(.lv7-still)");
  expect(js).toMatch(/hardwareConcurrency \|\| 8\) <= 4 \|\| \(n\.deviceMemory \|\| 8\) <= 4 \|\| \(n\.connection && n\.connection\.saveData\)/);
  // Scroll-linked motion only where the browser has view timelines.
  expect(block).toMatch(/@supports \(animation-timeline:view\(\)\)/);
  // The global kill switches still cover the new file.
  expect(read("styles/motion.css")).toMatch(/html\.motion-off \*,html\.motion-off \*:before,html\.motion-off \*:after\{animation:none!important/);
});

test("What's new is a bento on wide screens and the new stylesheet loads last", () => {
  expect(css).toMatch(/@media \(min-width:1100px\)\{\.new-list\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\);grid-auto-flow:dense\}/);
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="styles\/([^"?]+)/g)].map(m => m[1]);
  expect(sheets.at(-1)).toBe("final-v7.css");
});
