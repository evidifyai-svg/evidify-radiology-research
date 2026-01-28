#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
}
function safe(fn, fallback = "UNKNOWN") {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const pkgPath = path.resolve(process.cwd(), "package.json");
const pkg = safe(() => JSON.parse(readFileSync(pkgPath, "utf8")), {});
const appVersion = pkg?.version ?? "UNKNOWN";

// Repo identity
const repoRoot = safe(() => sh("git rev-parse --show-toplevel"));
const gitBranch = safe(() => sh("git branch --show-current"));
const gitCommitFull = safe(() => sh("git rev-parse HEAD"));
const gitCommitShort = safe(() => sh("git rev-parse --short HEAD"));
const gitDescribe = safe(() => sh("git describe --tags --always"));

// Clean/dirty working tree
const gitDirty = safe(() => sh("git status --porcelain")).length ? "dirty" : "clean";

// Ahead/behind (handles cases where upstream is missing)
const upstream = safe(() => sh("git rev-parse --abbrev-ref --symbolic-full-name @{upstream}"), "");
let gitAhead = "0";
let gitBehind = "0";
if (upstream && upstream !== "UNKNOWN") {
  const ab = safe(
    () => sh("git rev-list --left-right --count @{upstream}...HEAD"),
    "0 0"
  );
  const parts = ab.split(/\s+/);
  // Output format: "<behind> <ahead>"
  gitBehind = parts[0] ?? "0";
  gitAhead = parts[1] ?? "0";
}

// Runtime identity
const nodeVersion = process.version;
const platform = `${process.platform} ${process.arch}`;

const buildUTC = new Date().toISOString();

// Wire these to real constants later; env keeps it simple for now.
const protocol = process.env.EVIDIFY_PROTOCOL ?? "BRPLL-MAMMO-v1.0";
const exportContract = process.env.EVIDIFY_EXPORT_CONTRACT ?? "1.0.0";
const verifierVersion = process.env.EVIDIFY_VERIFIER_VERSION ?? "0.0.0";

// Output (flat, copy/paste friendly)
console.log("Evidify Research Platform");
console.log(`app_version: ${appVersion}`);
console.log(`repo_root: ${repoRoot}`);
console.log(`git_branch: ${gitBranch}`);
console.log(`git_commit: ${gitCommitShort}`);
console.log(`git_commit_full: ${gitCommitFull}`);
console.log(`git_describe: ${gitDescribe}`);
console.log(`git_upstream: ${upstream || "NONE"}`);
console.log(`git_ahead: ${gitAhead}`);
console.log(`git_behind: ${gitBehind}`);
console.log(`git_status: ${gitDirty}`);
console.log(`build_utc: ${buildUTC}`);
console.log(`node: ${nodeVersion}`);
console.log(`platform: ${platform}`);
console.log(`protocol: ${protocol}`);
console.log(`export_contract: ${exportContract}`);
console.log(`verifier: ${verifierVersion}`);

