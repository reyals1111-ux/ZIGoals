import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterAll, expect, test } from "vitest";
import { readDeploymentConfigs, untrackedLandingFiles, validateDeploymentConfigs } from "./check-deployment-configs.mjs";

// Session U Part 6 (FIX_PLAN F4, FINDINGS Q-WEB-02): a stray file left in landing/ is never uploaded. Wrangler is asked
// what it would upload (a dry run, the same path a deploy takes), and the checker fails on untracked files.
const root = resolve(import.meta.dirname, "..");
const wrangler = resolve(root, "apps/web/node_modules/.bin/wrangler");
const temporary = [];
const scratch = prefix => { const dir = mkdtempSync(join(tmpdir(), prefix)); temporary.push(dir); return dir; };
afterAll(() => { for (const dir of temporary) rmSync(dir, { recursive: true, force: true }); });

const finalBlock = ["assets/**/*", "!assets/**/", "!assets/**/*.webp", "!assets/**/*.png", "!assets/**/*.svg", "!assets/**/*.mp4", ".*"];
const assetsIgnore = readFileSync(resolve(root, "landing/.assetsignore"), "utf8");
const errorsFor = text => {
  const dir = scratch("landing-assets-rules-");
  mkdirSync(join(dir, "landing"));
  writeFileSync(join(dir, "landing/index.html"), "<!doctype html>");
  writeFileSync(join(dir, "landing/.assetsignore"), text);
  return validateDeploymentConfigs({ ...readDeploymentConfigs(root), root: dir });
};
const RULE = "landing/.assetsignore must end with the reviewed assets/ media types and the dotfile denial";

test("the reviewed file ends with the media-type block and the dotfile denial; the checker holds it there", () => {
  const lines = assetsIgnore.split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  expect(lines.slice(-finalBlock.length)).toEqual(finalBlock);
  expect(errorsFor(assetsIgnore)).not.toContain(RULE);
  const without = assetsIgnore.replace(/\.\*\n$/, "");
  expect(errorsFor(without)).toContain(RULE);
  expect(errorsFor(assetsIgnore.replace("!assets/**/*.mp4\n.*\n", ".*\n!assets/**/*.mp4\n"))).toContain(RULE);
  // A media negation before the block would be undone by it; one after it is not allowed either.
  expect(errorsFor(assetsIgnore.replace("!assets/**\n", "!assets/**\n!assets/**/*.webp\n"))).toContain(RULE);
  expect(errorsFor(`${assetsIgnore}!assets/**/*.webp\n`)).toContain(RULE);
  expect(errorsFor(`${assetsIgnore}!assets/**/*.txt\n`)).toContain("landing/.assetsignore must not republish assets/**/*.txt");
});

/** What `wrangler deploy --dry-run` would upload from this landing folder: every entry it read, minus the ones it ignored. */
function uploaded(landing) {
  const result = spawnSync(wrangler, ["deploy", "--config", join(landing, "wrangler.jsonc"), "--name", "zigoals", "--dry-run"], {
    cwd: resolve(root, "apps/web"), encoding: "utf8", timeout: 120000,
    env: { ...process.env, WRANGLER_LOG: "debug", WRANGLER_SEND_METRICS: "false", WRANGLER_WRITE_LOGS: "false" },
  });
  const output = result.stdout + result.stderr;
  expect(result.status, output.slice(-2000)).toBe(0);
  // The list wrangler prints right after "Read N files from the assets directory", one "/path" per line.
  const lines = output.split("\n"), start = lines.findIndex(line => line.includes("files from the assets directory"));
  expect(start).toBeGreaterThanOrEqual(0);
  const read = [];
  for (const line of lines.slice(start + 1)) { if (!line.startsWith("/")) break; read.push(line.slice(1).trim()); }
  expect(read.length).toBe(Number(lines[start].match(/Read (\d+) files?/)[1]));
  const ignored = new Set(output.split("\n").filter(line => line.includes("Ignoring asset:")).map(line => line.split("Ignoring asset:")[1].trim()));
  return read.filter(path => !ignored.has(path) && statSync(join(landing, path)).isFile()).sort();
}
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);

test("Wrangler uploads every reviewed landing file and none of the strays a working tree can collect", () => {
  const landing = join(scratch("landing-assets-upload-"), "landing");
  cpSync(resolve(root, "landing"), landing, { recursive: true });
  const reviewed = files(landing).map(file => relative(landing, file)).filter(file => ![".assetsignore", "_headers", "wrangler.jsonc"].includes(file)).sort();
  const strays = ["assets/.DS_Store", "assets/art/.DS_Store", "assets/art/notes.txt", "assets/art/draft.psd", "assets/art/README", "assets/art/.hidden.webp", "assets/art/.git/config", "scripts/.hidden.js", "styles/.DS_Store", ".env.local"];
  for (const stray of strays) { mkdirSync(join(landing, stray, ".."), { recursive: true }); writeFileSync(join(landing, stray), "stray"); }
  const published = uploaded(landing);
  expect(published).toEqual(reviewed);
  expect(published.filter(path => strays.includes(path))).toEqual([]);
}, 120000);

test("in a git checkout, an untracked file under landing/ fails the check; outside one, the check is skipped", () => {
  const repo = scratch("landing-assets-git-");
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  mkdirSync(join(repo, "landing/assets"), { recursive: true });
  writeFileSync(join(repo, "landing/index.html"), "<!doctype html>");
  writeFileSync(join(repo, "landing/assets/kept.webp"), "x");
  git("add", "landing/index.html", "landing/assets/kept.webp");
  git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-q", "-m", "fixture");
  expect(untrackedLandingFiles(repo)).toEqual([]);
  writeFileSync(join(repo, "landing/assets/draft.webp"), "x");
  mkdirSync(join(repo, "landing/.wrangler/state"), { recursive: true });
  writeFileSync(join(repo, "landing/.wrangler/state/db.sqlite"), "x");
  expect(untrackedLandingFiles(repo)).toEqual(["landing/.wrangler/", "landing/assets/draft.webp"]);
  expect(validateDeploymentConfigs({ ...readDeploymentConfigs(root), root: repo })).toContain("landing must contain only tracked files; untracked: landing/assets/draft.webp");
  // A folder that is not the top of a checkout (here, inside one) is not compared.
  expect(untrackedLandingFiles(join(repo, "landing"))).toBeNull();
  expect(untrackedLandingFiles(scratch("landing-assets-plain-"))).toBeNull();
  // The repository itself: nothing untracked under landing/.
  expect(untrackedLandingFiles(root)).toEqual([]);
});
