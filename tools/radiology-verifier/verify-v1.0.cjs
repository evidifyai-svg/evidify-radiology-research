#!/usr/bin/env node
/**
 * Evidify Radiology Export Verifier v1.0
 *
 * Usage:
 *   node tools/radiology-verifier/verify-v1.0.cjs <pack-dir> [--json]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const VERSION = '1.0.0';
const REQUIRED_FILES = ['export_manifest.json', 'ledger.json', 'events.jsonl'];
const OPTIONAL_FILES = [
  'derived_metrics.csv',
  'codebook.md',
  'trial_manifest.json',
  'verifier_output.json',
];

function exists(fp) {
  try {
    fs.accessSync(fp, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function readJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function sha256Hex(input) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(input)) {
    hash.update(input);
  } else {
    hash.update(input, 'utf8');
  }
  return hash.digest('hex');
}

function sha256File(fp) {
  return crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
}

const GENESIS_HASH = '0'.repeat(64);

function computeChainHash(seq, prevHash, eventId, timestamp, contentHash) {
  const buffer = Buffer.alloc(128);
  let offset = 0;

  buffer.writeUInt32BE(seq, offset);
  offset += 4;

  const prevBytes = Buffer.from(prevHash, 'hex');
  if (prevBytes.length !== 32) {
    throw new Error(`previousHash must be 32 bytes, got ${prevBytes.length}`);
  }
  prevBytes.copy(buffer, offset);
  offset += 32;

  const eventIdBytes = Buffer.from(eventId.padEnd(36, '\0').slice(0, 36), 'utf8');
  eventIdBytes.copy(buffer, offset);
  offset += 36;

  const timestampBytes = Buffer.from(timestamp.padEnd(24, '\0').slice(0, 24), 'utf8');
  timestampBytes.copy(buffer, offset);
  offset += 24;

  const contentBytes = Buffer.from(contentHash, 'hex');
  if (contentBytes.length !== 32) {
    throw new Error(`contentHash must be 32 bytes, got ${contentBytes.length}`);
  }
  contentBytes.copy(buffer, offset);

  return sha256Hex(buffer);
}

function collectFileChecks(packDir, fail, warn) {
  const missingRequired = REQUIRED_FILES.filter((f) => !exists(path.join(packDir, f)));
  missingRequired.forEach((f) => fail(`Missing required file: ${f}`));

  OPTIONAL_FILES.forEach((f) => {
    if (!exists(path.join(packDir, f))) {
      warn(`Missing optional file (warn only): ${f}`);
    }
  });

  return {
    required: REQUIRED_FILES,
    optional: OPTIONAL_FILES,
    missing_required: missingRequired,
    pass: missingRequired.length === 0,
  };
}

function verifyManifest(packDir, fail) {
  const result = {
    pass: true,
    entries: 0,
    integrity: null,
  };
  try {
    const manifest = readJson(path.join(packDir, 'export_manifest.json'));
    if (!manifest || !Array.isArray(manifest.entries)) {
      result.pass = false;
      fail('export_manifest.json must include entries[]');
      return result;
    }
    result.entries = manifest.entries.length;
    const integrityEntries = [];
    let integrityOk = true;
    for (const entry of manifest.entries) {
      if (
        !entry ||
        typeof entry.path !== 'string' ||
        typeof entry.sha256 !== 'string' ||
        typeof entry.bytes !== 'number'
      ) {
        continue;
      }
      const fp = path.join(packDir, entry.path);
      const integrity = {
        path: entry.path,
        exists: exists(fp),
        bytes_ok: null,
        sha256_ok: null,
      };

      if (!integrity.exists) {
        integrity.bytes_ok = false;
        integrity.sha256_ok = false;
        integrityOk = false;
        integrityEntries.push(integrity);
        continue;
      }

      const stat = fs.statSync(fp);
      integrity.bytes_ok = stat.size === entry.bytes;
      integrity.sha256_ok = sha256File(fp) === entry.sha256;
      if (!integrity.bytes_ok || !integrity.sha256_ok) {
        integrityOk = false;
      }
      integrityEntries.push(integrity);
    }

    if (integrityEntries.length > 0) {
      result.integrity = {
        pass: integrityOk,
        entries_checked: integrityEntries.length,
        entries: integrityEntries,
      };
      if (!integrityOk) {
        result.pass = false;
        fail('Manifest integrity failed (bytes/sha256 mismatch)');
      }
    }
  } catch (err) {
    result.pass = false;
    fail(`export_manifest.json parse error: ${err.message}`);
  }
  return result;
}

function verifyLedger(packDir, fail) {
  const result = { pass: true, entries: 0, ledger: null };
  try {
    const ledger = readJson(path.join(packDir, 'ledger.json'));
    if (!Array.isArray(ledger)) {
      result.pass = false;
      fail('ledger.json must be an array');
      return result;
    }
    result.entries = ledger.length;
    result.ledger = ledger;
  } catch (err) {
    result.pass = false;
    fail(`ledger.json parse error: ${err.message}`);
  }
  return result;
}

function verifyLedgerChain(ledger, fail) {
  const result = { pass: true, entries: ledger.length, issues: [] };
  if (ledger.length === 0) {
    result.pass = false;
    fail('ledger.json must contain at least one entry for integrity checks');
    return result;
  }

  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i];
    const expectedSeq = i;
    const expectedPrev = i === 0 ? GENESIS_HASH : ledger[i - 1].chainHash;

    if (entry.seq !== expectedSeq) {
      result.pass = false;
      result.issues.push({ index: i, issue: 'SEQ', expected: expectedSeq, got: entry.seq });
    }

    if (entry.previousHash !== expectedPrev) {
      result.pass = false;
      result.issues.push({
        index: i,
        issue: 'PREVIOUS_HASH',
        expected: expectedPrev,
        got: entry.previousHash,
      });
    }

    try {
      const recomputed = computeChainHash(
        entry.seq,
        entry.previousHash,
        entry.eventId,
        entry.timestamp,
        entry.contentHash
      );
      if (entry.chainHash !== recomputed) {
        result.pass = false;
        result.issues.push({
          index: i,
          issue: 'CHAIN_HASH',
          expected: recomputed,
          got: entry.chainHash,
        });
      }
    } catch (err) {
      result.pass = false;
      result.issues.push({ index: i, issue: 'CHAIN_HASH_ERROR', error: err.message });
    }
  }

  if (!result.pass) {
    fail('Ledger chain integrity failed');
  }

  return result;
}

async function verifyEvents(packDir, fail) {
  const result = { pass: true, entries: 0 };
  const fp = path.join(packDir, 'events.jsonl');
  try {
    const input = fs.createReadStream(fp, 'utf8');
    const rl = readline.createInterface({ input, crlfDelay: Infinity });
    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber += 1;
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        JSON.parse(trimmed);
      } catch (err) {
        throw new Error(`Line ${lineNumber}: ${err.message}`);
      }
      result.entries += 1;
    }
  } catch (err) {
    result.pass = false;
    fail(`events.jsonl parse error: ${err.message}`);
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const packDir = args.find((arg) => !arg.startsWith('-'));

  const out = {
    version: VERSION,
    pack: packDir || null,
    timestamp: new Date().toISOString(),
    checks: {},
    warnings: [],
    errors: [],
    pass: true,
  };

  const fail = (msg) => {
    out.errors.push(msg);
    out.pass = false;
  };

  const warn = (msg) => {
    out.warnings.push(msg);
  };

  if (!packDir) {
    fail('Missing <pack-dir>');
    if (jsonMode) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.error('Usage: node tools/radiology-verifier/verify-v1.0.cjs <pack-dir> [--json]');
    }
    process.exit(2);
  }

  const pack = path.resolve(packDir);

  out.checks.files = collectFileChecks(pack, fail, warn);

  if (out.checks.files.pass) {
    out.checks.manifest = verifyManifest(pack, fail);
    out.checks.ledger = verifyLedger(pack, fail);
    out.checks.events = await verifyEvents(pack, fail);
    if (out.checks.ledger.pass && Array.isArray(out.checks.ledger.ledger)) {
      out.checks.ledger_integrity = verifyLedgerChain(out.checks.ledger.ledger, fail);
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`Evidify Radiology Export Verifier v${VERSION}`);
  console.log(`Pack: ${packDir}`);
  console.log('');
  console.log(`Files: ${out.checks.files.pass ? 'PASS' : 'FAIL'}`);
  if (out.checks.manifest) {
    console.log(`Manifest: ${out.checks.manifest.pass ? 'PASS' : 'FAIL'} (${out.checks.manifest.entries} entries)`);
    if (out.checks.manifest.integrity) {
      console.log(`Manifest integrity: ${out.checks.manifest.integrity.pass ? 'PASS' : 'FAIL'} (${out.checks.manifest.integrity.entries_checked} entries)`);
    }
  }
  if (out.checks.ledger) {
    console.log(`Ledger: ${out.checks.ledger.pass ? 'PASS' : 'FAIL'} (${out.checks.ledger.entries} entries)`);
  }
  if (out.checks.ledger_integrity) {
    console.log(`Ledger integrity: ${out.checks.ledger_integrity.pass ? 'PASS' : 'FAIL'} (${out.checks.ledger_integrity.entries} entries)`);
  }
  if (out.checks.events) {
    console.log(`Events: ${out.checks.events.pass ? 'PASS' : 'FAIL'} (${out.checks.events.entries} entries)`);
  }

  if (out.warnings.length) {
    console.log(`Warnings (${out.warnings.length}):`);
    out.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  if (!out.pass) {
    console.log(`Errors (${out.errors.length}):`);
    out.errors.forEach((e) => console.log(`  ❌ ${e}`));
    console.log('❌ VERIFICATION: FAIL');
    process.exit(1);
  }

  console.log('✅ VERIFICATION: PASS');
}

main();
