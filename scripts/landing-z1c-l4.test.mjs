import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session AK, lane WB (WIRING_AUDIT_2.md Z1C-L4; security review Z1C_SECURITY.md L4): the landing's NOVA chapter never
// claims chats stay on the device. With a cloud key they go to that provider (docs/PRIVACY.md says so), so the corrected
// sentence says keys stay on the device and chats go only to the model the person chooses, none leaving with a local model.
const read = file => readFileSync(new URL(`../landing/${file}`, import.meta.url), "utf8");
const html = read("index.html");
const text = fragment => fragment.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/ ([,.:;?])/g, "$1").trim();
const chapter = text(html.match(/<section id="nova"[\s\S]*?<\/section>/)?.[0] ?? "");
const facts = [...(html.match(/<ul class="nv-facts">([\s\S]*?)<\/ul>/)?.[1] ?? "").matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match => text(match[1]));

test("Z1C-L4: the privacy fact says where chats go, never that they stay on the device", () => {
  const yours = facts.find(fact => fact.startsWith("Yours alone."));
  expect(yours).toBe("Yours alone. Your keys stay on your device, your chats go only to the model you choose (none leave it with a local model), nothing goes to a ZIGoals server, and NOVA never moves money: you confirm every change.");
});

test("Z1C-L4: no page of the landing says chats stay on the device", () => {
  for (const file of ["index.html", "privacy.html", "terms.html"]) {
    expect(text(read(file)), file).not.toMatch(/chats? (stay|stays|are kept|remain) (only )?on (your|this) device/i);
    expect(text(read(file)), file).not.toMatch(/Keys and chats stay/i);
  }
  expect(chapter).toContain("own API key");
});
