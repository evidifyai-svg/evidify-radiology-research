#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
}
function safe(fn, fallback = "UNKNOWN") {
  try { return fn(); } catch { return fallback; }
}

const pkgPath = path.resolve(process.cwd(), "package.json");
const pkg = safe(() => JSON.parse(readFileSync(pkgPath, "utf8")), {});
const appVersion = pkg?.version ?? "UNKNOWN";

const gitCommitFull  = safe(() => sh("git rev-parse HEAD"));
const gitCommitShort = safe(() => sh("git rev-parse --short HEAD"));
const gitDescribe    = safe(() => sh("git describe --tags --always"));
const gitDirty       = safe(() => sh("git status --porcelain")).length ? "dirty" : "clean";

const buildUTC = new Date().toISOString();

// If you already have these defined elsewhere, we can wire them in next.
const protocol        = process.env.EVIDIFY_PROTOCOL ?? "BRPLL-MAMMO-v1.0";
const exportContract  = process.env.EVIDIFY_EXPORT_CONTRACT ?? "1.0.0";
const verifierVersion = process.env.EVIDIFY_VERIFIER_VERSION ?? "0.0.0";

console.log("Evidify Research Platform");
console.log(`app_version: ${appVersion}`);
console.log(`git_commit: ${gitCommitShort}`);
console.log(`git_commit_full: ${gitCommitFull}`);
console.log(`git_describe: ${gitDescribe}`);
console.log(`git_status: ${gitDirty}`);
console.log(`build_utc: ${buildUTC}`);
console.log(`protocol: ${protocol}`);
console.log(`export_contract: ${exportContract}`);
console.log(`verifier: ${verifierVersion}`);

