import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The apex upload is deny-by-default: `.assetsignore` starts with `*`, and only
// these negations may put a path back. Anything else — a config, a review
// package, a capture source tree, a build tool — stays out of the public site.
const publishableAssetPatterns = new Set([
  "!index.html",
  "!favicon.ico",
  "!styles",
  "!styles/*.css",
  "!scripts",
  "!scripts/*.js",
  "!scripts/*.mjs",
  "!assets",
  "!assets/**",
  // Only inside the final block below (Session U Part 6, FIX_PLAN F4).
  "!assets/**/",
  "!assets/**/*.webp",
  "!assets/**/*.png",
  "!assets/**/*.svg",
  "!assets/**/*.mp4",
]);

// Session U Part 6 (FIX_PLAN F4, FINDINGS Q-WEB-02): the file ends with exactly this block. Wrangler applies
// `.assetsignore` with gitignore rules (the `ignore` package; a later line wins, and a file inside an ignored folder
// stays ignored), so under assets/ only the reviewed media types are published, and no dotfile anywhere. A stray
// note, draft, `.DS_Store` or `.git` folder left in the tree is not uploaded.
const finalAssetRules = [
  "assets/**/*",
  "!assets/**/",
  "!assets/**/*.webp",
  "!assets/**/*.png",
  "!assets/**/*.svg",
  "!assets/**/*.mp4",
  ".*",
];

// Kept after the negations so a file added later under an allowed directory is
// still denied by type rather than silently published. `_headers` is denied on
// purpose: Wrangler still parses it into response headers ("Parsed 1 valid
// header rule") while leaving it out of the upload, so the policy applies
// without the file itself being fetchable.
const requiredAssetDenials = [
  "_headers",
  "wrangler.jsonc",
  "*.md",
  "*.json",
  "*.jsonc",
  "*.test.js",
  "*.test.mjs",
  "*.py",
  "*.sh",
];

// `.wrangler` is here because `wrangler dev` writes its Miniflare state into
// the assets directory; the sqlite files are denied by `*` but must not sit in
// a deployable tree at all.
const nonPublicLandingDirectories = new Set([
  ".wrangler",
  "backups",
  "docs",
  "node_modules",
  "review",
  "source",
  "tools",
]);

const nonPublicLandingFile = (name) =>
  name !== "wrangler.jsonc" &&
  (/\.(md|json|jsonc|py|sh|zip|mov|prores)$/i.test(name) ||
    /\.test\.(js|mjs|ts)$/i.test(name) ||
    name.startsWith(".env"));

/**
 * Session U Part 6 (FIX_PLAN F4): in a git checkout, every file under landing/ must be tracked, so a deploy publishes only
 * reviewed bytes. Untracked folders are listed once; empty ones (nothing to upload) are not. Returns null outside a checkout of this root (the test fixtures),
 * where there is nothing to compare against.
 */
export function untrackedLandingFiles(root) {
  let top;
  try {
    top = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
  if (realpathSync(top) !== realpathSync(root)) return null;
  return execFileSync("git", ["-C", root, "ls-files", "--others", "--directory", "--no-empty-directory", "-z", "--", "landing"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .sort();
}

// Walks the real deployable directory. `.assetsignore` states the intent; this
// proves the tree itself carries nothing that must never reach zigoals.app.
export function unpublishableLandingFiles(landingRoot, prefix = "") {
  if (!existsSync(landingRoot)) return [];
  const found = [];
  for (const entry of readdirSync(landingRoot, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (nonPublicLandingDirectories.has(entry.name)) {
        found.push(`${relative}/`);
        continue;
      }
      found.push(...unpublishableLandingFiles(resolve(landingRoot, entry.name), relative));
    } else if (nonPublicLandingFile(entry.name)) {
      found.push(relative);
    }
  }
  return found.sort();
}

const staticLandingFields = new Set([
  "$schema",
  "name",
  "compatibility_date",
  "assets",
  "route",
  "routes",
  "workers_dev",
  "preview_urls",
  "observability",
]);

function inspectRoutes(config) {
  const routes = [];
  if (Object.hasOwn(config ?? {}, "route")) routes.push(config.route);
  if (Object.hasOwn(config ?? {}, "routes")) {
    if (!Array.isArray(config.routes)) return { malformed: true, patterns: [] };
    routes.push(...config.routes);
  }

  const patterns = routes.map((route) =>
    typeof route === "string" ? route : route?.pattern,
  );
  return {
    malformed: patterns.some((pattern) => typeof pattern !== "string" || pattern.length === 0),
    patterns,
  };
}

function routesStayOnHost(patterns, expectedHost) {
  return patterns.every((pattern) => {
    const withoutScheme = pattern.replace(/^https?:\/\//i, "");
    return withoutScheme.split("/", 1)[0].toLowerCase() === expectedHost;
  });
}

export function validateDeploymentConfigs({ landing, alpha, root = repositoryRoot }) {
  const errors = [];

  if (landing?.name !== "zigoals") {
    errors.push('landing Worker name must be "zigoals"');
  }
  if (alpha?.name !== "zigoals-alpha") {
    errors.push('Alpha Worker name must be "zigoals-alpha"');
  }
  if (landing?.assets?.directory !== ".") {
    errors.push('landing assets.directory must be "."');
  }
  // The apex is served only through its custom domain: a config that says nothing lets a deploy turn workers.dev back
  // on, as the Landing V5 deploy did on 2026-10-03.
  if (landing?.workers_dev !== false) {
    errors.push("landing workers_dev must be false");
  }
  if (landing?.preview_urls !== false) {
    errors.push("landing preview_urls must be false");
  }
  // Session W Part 23 (Session Q D2): the thin entry in front of OpenNext's generated Worker.
  if (alpha?.main !== "alpha/worker.mjs") {
    errors.push('Alpha main must be "alpha/worker.mjs"');
  }
  if (alpha?.assets?.directory !== ".open-next/assets") {
    errors.push('Alpha assets.directory must be ".open-next/assets"');
  }
  if (alpha?.assets?.binding !== "ASSETS") {
    errors.push('Alpha assets.binding must be "ASSETS"');
  }
  if (alpha?.assets?.run_worker_first !== false) {
    errors.push("Alpha assets.run_worker_first must be false");
  }
  if (alpha?.limits?.cpu_ms !== 2000) {
    errors.push("Alpha limits.cpu_ms must be the reviewed 2000ms guardrail");
  }
  const landingRoutes = inspectRoutes(landing);
  const alphaRoutes = inspectRoutes(alpha);
  if (landingRoutes.malformed) {
    errors.push("landing route/routes must be strings or objects with a pattern");
  } else if (!routesStayOnHost(landingRoutes.patterns, "zigoals.app")) {
    errors.push("landing routes may target only zigoals.app");
  }
  if (alphaRoutes.malformed) {
    errors.push("alpha route/routes must be strings or objects with a pattern");
  } else if (!routesStayOnHost(alphaRoutes.patterns, "alpha.zigoals.app")) {
    errors.push("alpha routes may target only alpha.zigoals.app");
  }

  // Exactly the reviewed service bindings: the self-reference, and (Session S) the market coordinator's QuoteService
  // entrypoint for live prices. Any other binding, service, entrypoint or field is refused.
  const alphaServices = Array.isArray(alpha?.services) ? alpha.services : [];
  const reviewedServices = [
    { binding: "WORKER_SELF_REFERENCE", service: "zigoals-alpha" },
    { binding: "MARKET_QUOTES", service: "zigoals-acctest-market-coordinator", entrypoint: "QuoteService" },
  ];
  const sameService = (actual, reviewed) =>
    actual !== null && typeof actual === "object" && !Array.isArray(actual) &&
    Object.keys(actual).length === Object.keys(reviewed).length &&
    Object.entries(reviewed).every(([key, value]) => actual[key] === value);
  if (!Array.isArray(alpha?.services) || alphaServices.length !== 2 || !sameService(alphaServices[0], reviewedServices[0])) {
    errors.push("Alpha WORKER_SELF_REFERENCE must target zigoals-alpha");
  }
  if (!Array.isArray(alpha?.services) || alphaServices.length !== 2 || !sameService(alphaServices[1], reviewedServices[1])) {
    errors.push("Alpha MARKET_QUOTES must target zigoals-acctest-market-coordinator's QuoteService, and no other binding is allowed");
  }
  const alphaVars = alpha?.vars;
  if (
    alphaVars === null || typeof alphaVars !== "object" || Array.isArray(alphaVars) ||
    Object.keys(alphaVars).length !== 1 || alphaVars.ZIGOALS_MARKET_QUOTES_MODE !== "durable-v1"
  ) {
    errors.push('Alpha vars must be exactly ZIGOALS_MARKET_QUOTES_MODE "durable-v1"');
  }

  for (const field of Object.keys(landing ?? {})) {
    if (!staticLandingFields.has(field)) {
      errors.push(`static landing config must not define ${field}`);
    }
  }
  for (const field of Object.keys(landing?.assets ?? {})) {
    if (field !== "directory") {
      errors.push(`static landing assets must not define ${field}`);
    }
  }

  const assetsIgnorePath = resolve(root, "landing/.assetsignore");
  const assetsIgnorePatterns = existsSync(assetsIgnorePath)
    ? readFileSync(assetsIgnorePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
    : [];
  if (assetsIgnorePatterns[0] !== "*") {
    errors.push('landing/.assetsignore must deny everything first with "*"');
  }
  for (const pattern of assetsIgnorePatterns.filter((line) => line.startsWith("!"))) {
    if (!publishableAssetPatterns.has(pattern)) {
      errors.push(`landing/.assetsignore must not republish ${pattern.slice(1)}`);
    }
  }
  for (const pattern of requiredAssetDenials) {
    if (!assetsIgnorePatterns.includes(pattern)) {
      errors.push(`landing/.assetsignore must keep denying ${pattern}`);
    }
  }
  const tail = assetsIgnorePatterns.slice(-finalAssetRules.length);
  if (tail.length !== finalAssetRules.length || tail.some((line, index) => line !== finalAssetRules[index]) ||
    assetsIgnorePatterns.slice(0, -finalAssetRules.length).some((line) => finalAssetRules.slice(1, -1).includes(line))) {
    errors.push("landing/.assetsignore must end with the reviewed assets/ media types and the dotfile denial");
  }
  if (!existsSync(resolve(root, "landing/index.html"))) {
    errors.push("landing/index.html must exist");
  }
  for (const file of unpublishableLandingFiles(resolve(root, "landing"))) {
    errors.push(`landing must not contain the non-public file ${file}`);
  }
  for (const file of untrackedLandingFiles(root) ?? []) {
    errors.push(`landing must contain only tracked files; untracked: ${file}`);
  }

  return errors;
}

export function readDeploymentConfigs(root = repositoryRoot) {
  return {
    landing: JSON.parse(readFileSync(resolve(root, "landing/wrangler.jsonc"), "utf8")),
    alpha: JSON.parse(readFileSync(resolve(root, "apps/web/wrangler.alpha.jsonc"), "utf8")),
  };
}

export function validateRepositoryDeploymentConfigs(root = repositoryRoot) {
  return validateDeploymentConfigs({ ...readDeploymentConfigs(root), root });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateRepositoryDeploymentConfigs();
  if (errors.length > 0) {
    for (const error of errors) console.error(`deployment config: ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Deployment configs are isolated and internally consistent.");
  }
}
