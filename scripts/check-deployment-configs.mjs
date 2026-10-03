import { existsSync, readFileSync, readdirSync } from "node:fs";
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
]);

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
  if (alpha?.main !== ".open-next/worker.js") {
    errors.push('Alpha main must be ".open-next/worker.js"');
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

  const alphaServices = Array.isArray(alpha?.services) ? alpha.services : [];
  if (
    alphaServices.length !== 1 ||
    alphaServices[0]?.binding !== "WORKER_SELF_REFERENCE" ||
    alphaServices[0]?.service !== "zigoals-alpha"
  ) {
    errors.push("Alpha WORKER_SELF_REFERENCE must target zigoals-alpha");
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
  if (!existsSync(resolve(root, "landing/index.html"))) {
    errors.push("landing/index.html must exist");
  }
  for (const file of unpublishableLandingFiles(resolve(root, "landing"))) {
    errors.push(`landing must not contain the non-public file ${file}`);
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
