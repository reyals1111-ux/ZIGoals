import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session AK (A20, under AJ's MO6 rule: every landing line is checked against the app). "New in the Alpha" names only
// what the Alpha ships; what still waits for the owner's switch says "being switched on"; estimates and models say so;
// no earnings, partnership or superlative words. The browser specs (landing-v5-*) keep layout, contrast and weight.
const read = file => readFileSync(new URL(`../landing/${file}`, import.meta.url), "utf8");
const html = read("index.html");
const text = fragment => fragment.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const section = text(html.match(/<section id="new"[\s\S]*?<\/section>/)[0]);
const cards = [...html.match(/<ul class="new-list[\s\S]*?<\/ul><p class="new-note/)[0].matchAll(/<li><span class="availability (\w+)">([^<]+)<\/span><h3>([^<]+)<\/h3>([\s\S]*?)<\/ul><\/li>/g)]
  .map(([, kind, label, title, body]) => ({ kind, label, title, body: text(body) }));

test("every card carries one honest status, and what waits for a switch says so", () => {
  expect(cards.map(card => card.title)).toEqual(["Goals", "Habits", "Food", "Insights", "Money, day to day", "Your Wealth plan", "Phone wallets", "Bring your history", "Focus and play"]);
  for (const card of cards) expect([["available", "IN THE ALPHA"], ["switching", "BEING SWITCHED ON"]]).toContainEqual([card.kind, card.label]);
  expect(cards.find(card => card.title === "Phone wallets").label).toBe("BEING SWITCHED ON");
  expect(cards.find(card => card.title === "Phone wallets").body).toContain("read-only");
  expect(cards.find(card => card.title === "Food").body).toContain("Barcode lookup. Being switched on.");
  expect(text(html.match(/<section id="install"[\s\S]*?<\/section>/)[0])).toContain("Notifications while it is closed are built and being switched on.");
});

test("estimates and models are named as such; no earnings, partnership or superlative words", () => {
  expect(cards.find(card => card.title === "Goals").body).toContain("An estimate, never a promise.");
  expect(cards.find(card => card.title === "Your Wealth plan").body).toMatch(/Financial freedom\..*A model, not advice\./);
  expect(cards.find(card => card.title === "Insights").body).toContain("Not medical advice.");
  expect(section).not.toMatch(/\b(earn(s|ed|ing|ings)?|APR|APY|TVL|yield(s|ing)?|rewards?|returns?|partner(s|ed|ship|ships)?|integrated|integration|guaranteed?|profit)\b/i);
  expect(text(html)).not.toMatch(/#1\b|\bnumber one\b|\bthe best\b|\bbest-in-class\b|\bworld's first\b/i);
});

test("the section numbers and the phone menu's numbers run in order", () => {
  const numbers = [...html.matchAll(/class="section-number">(\d+)</g)].map(match => Number(match[1]));
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  expect(new Set(numbers).size).toBe(numbers.length);
  const menu = [...html.match(/<nav id="mobile-menu"[\s\S]*?<\/nav>/)[0].matchAll(/<span>(\d\d)<\/span>/g)].map(match => Number(match[1]));
  expect(menu).toEqual(menu.map((_, i) => i + 1));
});

test("the privacy page names what the new pieces send, and the terms name the new models", () => {
  const privacy = text(read("privacy.html")), terms = text(read("terms.html"));
  for (const line of ["Phone wallets (WalletConnect, when it is switched on)", "Notifications while ZIGoals is closed (off by default; being switched on)", "Lichess (when you connect it to play)", "USDA FoodData Central", "a photo of a nutrition label", "Files you import"]) expect(privacy).toContain(line);
  expect(terms).toContain("the financial freedom model are information and models, never advice or a promise");
});
