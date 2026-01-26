#!/usr/bin/env node
'use strict';

// Minimal smoke tests for Evidify verification assets.
// IMPORTANT: This script is READ-ONLY. It must not write to verification packs, fixtures, or goldens.
// Usage: node verification/run-smoke-tests.cjs

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function ok(msg) { console.log(`OK: ${msg}`); }
function fail(msg) { console.error(`FAIL: ${msg}`); process.exit(1); }

function exists(p) {
  try { fs.accessSync(p, fs.constants.R_OK); return true; } catch { return false; }
}

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function runNode(scriptPath, args = []) {
  const res = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  if (res.status !== 0) fail(`Script failed: ${scriptPath}`);
}

(function main() {
  const root = process.cwd();

  // 1) Key files exist (read-only checks)
  const schema = path.join(root, 'verification', 'schemas', 'evidify.forensic.gate_report.v1.schema.json');
  if (!exists(schema)) fail(`Missing schema: ${schema}`);
  readJson(schema);
  ok('Schema JSON parses');

  const gateEngine = path.join(root, 'verification', 'gate-engine-v1.1.cjs');
  if (!exists(gateEngine)) fail(`Missing gate engine: ${gateEngine}`);
  ok('Gate engine exists');

  const verifier = path.join(root, 'verification', 'verifier', 'verify-v1.1.cjs');
  if (!exists(verifier)) fail(`Missing verifier: ${verifier}`);
  ok('Verifier exists');

  // 2) Canonicalization vectors (read-only, deterministic)
  const canonTest = path.join(root, 'verification', 'canonicalization', 'test_vectors', 'run_tests.cjs');
  if (exists(canonTest)) {
    ok('Running canonicalization test vectors');
    runNode(canonTest);
    ok('Canonicalization vectors passed');
  } else {
    ok('Canonicalization test vectors not found (skipping)');
  }

  // 3) Existence checks for golden packs / fixtures (no mutation)
  const packsDir = path.join(root, 'verification', 'packs');
  if (!exists(packsDir)) fail(`Missing packs dir: ${packsDir}`);
  ok('Packs dir exists');

  const fixturesDir = path.join(root, 'verification', 'fixtures');
  if (!exists(fixturesDir)) fail(`Missing fixtures dir: ${fixturesDir}`);
  ok('Fixtures dir exists');

  console.log('SMOKE PASS');
  process.exit(0);
})();
