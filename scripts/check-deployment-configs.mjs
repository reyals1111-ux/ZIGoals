import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
        .filter(Boolean)
    : [];
  if (
    assetsIgnorePatterns.length !== 2 ||
    assetsIgnorePatterns[0] !== "*" ||
    assetsIgnorePatterns[1] !== "!index.html"
  ) {
    errors.push('landing/.assetsignore must allow only "index.html"');
  }
  if (!existsSync(resolve(root, "landing/index.html"))) {
    errors.push("landing/index.html must exist");
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
