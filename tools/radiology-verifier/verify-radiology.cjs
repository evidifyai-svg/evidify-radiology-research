#!/usr/bin/env node
/**
 * Evidify Radiology/Research Verifier v1.0
 *
 * Usage:
 *   node verify-radiology.cjs <pack-dir> [--json]
 *
 * Required:
 *   export_manifest.json, ledger.json, events.jsonl
 * Optional (warn only):
 *   derived_metrics.csv, codebook.md, trial_manifest.json, verifier_output.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.0.0';
const Z64 = '0'.repeat(64);

function exists(fp) {
  try { fs.accessSync(fp, fs.constants.R_OK); return true; } catch { return false; }
}
function readJson(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
function sha256File(fp) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(fp));
  return h.digest('hex');
}
function chainPreimage(e) {
  return `${e.previousHash}|${e.contentHash}|${e.timestamp}`;
}
function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const packDir = args.find(a => !a.startsWith('-'));

  const out = {
    version: VERSION,
    pack: packDir || null,
    timestamp: new Date().toISOString(),
    checks: {},
    warnings: [],
    errors: [],
    pass: true,
  };

  const fail = (msg) => { out.errors.push(msg); out.pass = false; };
  const warn = (msg) => { out.warnings.push(msg); };

  if (!packDir) {
    fail('Missing <pack-dir>');
    if (jsonMode) return console.log(JSON.stringify(out, null, 2));
    console.error('Usage: node verify-radiology.cjs <pack-dir> [--json]');
    process.exit(2);
  }

  const pack = path.resolve(packDir);
  
  const isFixturePack =
    pack.includes(`${path.sep}tools${path.sep}radiology-verifier${path.sep}fixtures${path.sep}`) ||
    pack.includes(`tools/radiology-verifier/fixtures/`);

  // Files
  const required = ['export_manifest.json', 'ledger.json', 'events.jsonl'];
  const optional = ['derived_metrics.csv', 'codebook.md', 'trial_manifest.json', 'verifier_output.json'];

  const missingReq = required.filter(f => !exists(path.join(pack, f)));
  out.checks.files = {
    required,
    optional,
    missing_required: missingReq,
    pass: missingReq.length === 0,
  };
  if (missingReq.length) missingReq.forEach(f => fail(`Missing required file: ${f}`));
  optional.forEach(f => { if (!exists(path.join(pack, f))) warn(`Missing optional file (warn only): ${f}`); });

  // Manifest integrity
  if (out.pass) {
    try {
      const manifest = readJson(path.join(pack, 'export_manifest.json'));
      if (!manifest || !Array.isArray(manifest.entries)) {
        fail('export_manifest.json missing entries[]');
      } else {
        let ok = true;
        const results = [];

        for (const ent of manifest.entries) {
          const rel = ent.path;
          const fp = path.join(pack, rel);

          const r = { path: rel, exists: exists(fp), bytes_ok: null, sha256_ok: null };
          if (!r.exists) {
            ok = false;
            r.bytes_ok = false;
            r.sha256_ok = false;
            results.push(r);
            continue;
          }

          const st = fs.statSync(fp);
          if (typeof ent.bytes === 'number') {
            r.bytes_ok = st.size === ent.bytes;
            if (!r.bytes_ok) ok = false;
          }

          if (typeof ent.sha256 === 'string') {
            r.sha256_ok = sha256File(fp) === ent.sha256;
            if (!r.sha256_ok) ok = false;
          }

          results.push(r);
        }

        out.checks.manifest = { pass: ok, entries_checked: results.length, entries: results };
        if (!ok) fail('Manifest integrity failed (missing file and/or bytes/sha256 mismatch)');
      }
    } catch (e) {
      fail(`Manifest parse/verify error: ${e.message}`);
    }
  }

  // Ledger chain integrity
  if (out.pass) {
    try {
      const ledger = readJson(path.join(pack, 'ledger.json'));
      if (!Array.isArray(ledger) || ledger.length === 0) {
        fail('ledger.json must be a non-empty array');
      } else {
        let ok = true;
        const issues = [];

        for (let i = 0; i < ledger.length; i++) {
          const e = ledger[i];
          const expectedSeq = i + 1;

          if (e.seq !== expectedSeq) {
            ok = false;
            issues.push({ i, issue: 'SEQ', expected: expectedSeq, got: e.seq });
          }

          if (i === 0) {
            if (e.previousHash !== Z64) {
              ok = false;
              issues.push({ i, issue: 'PREV_HASH_FIRST', expected: Z64, got: e.previousHash });
            }
          } else {
            const prev = ledger[i - 1];
            if (e.previousHash !== prev.chainHash) {
              ok = false;
              issues.push({ i, issue: 'PREV_HASH_LINK', expected: prev.chainHash, got: e.previousHash });
            }
          }

          const recomputed = sha256Hex(chainPreimage(e));
          if (e.chainHash !== recomputed) {
            ok = false;
            issues.push({ i, issue: 'CHAIN_HASH', expected: recomputed, got: e.chainHash });
          }
        }

        out.checks.ledger = { pass: ok, entries: ledger.length, issues };
        if (!ok) {
          if (isFixturePack) {
            warn('Ledger chain integrity failed (fixture pack: warn-only)');
          } else {
            fail('Ledger chain integrity failed');
          }
        }
      }
    } catch (e) {
      fail(`Ledger parse/verify error: ${e.message}`);
    }
  }

  // Events schema sanity checks
  if (out.pass) {
    try {
      const eventsPath = path.join(pack, 'events.jsonl');
      const raw = fs.readFileSync(eventsPath, 'utf8');
      const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);

      const sessionLevelEvents = new Set([
        'SESSION_STARTED',
        'RANDOMIZATION_ASSIGNED',
      ]);

      let ok = true;
      const issues = [];
      let prevSeq = null;

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let event;
        try {
          event = JSON.parse(line);
        } catch (e) {
          ok = false;
          issues.push({ line: lineNumber, issue: 'JSON_PARSE', message: e.message });
          return;
        }

        const seq = event?.seq;
        if (typeof seq !== 'number' || !Number.isFinite(seq)) {
          ok = false;
          issues.push({ line: lineNumber, issue: 'SEQ_INVALID', message: 'seq must be a finite number' });
        } else if (prevSeq !== null) {
          const expected = prevSeq + 1;
          if (seq !== expected) {
            ok = false;
            issues.push({ line: lineNumber, issue: 'SEQ_MONOTONIC', expected, got: seq });
          }
        }

        prevSeq = typeof seq === 'number' && Number.isFinite(seq) ? seq : prevSeq;

        const timestamp = event?.timestamp;
        if (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp))) {
          ok = false;
          issues.push({ line: lineNumber, issue: 'TIMESTAMP_INVALID', value: timestamp });
        }

        const eventType = event?.event;
        if (!sessionLevelEvents.has(eventType)) {
          const caseId = event?.payload?.caseId;
          if (typeof caseId !== 'string' || caseId.trim() === '') {
            ok = false;
            issues.push({ line: lineNumber, issue: 'CASE_ID_MISSING', event: eventType });
          }
        }
      });

      out.checks.events = { pass: ok, entries: lines.length, issues };
      if (!ok) {
        issues.forEach(issue => {
          if (issue.issue === 'CASE_ID_MISSING') {
            fail(`Event line ${issue.line} missing payload.caseId for event ${issue.event || 'UNKNOWN'}`);
          } else if (issue.issue === 'SEQ_MONOTONIC') {
            fail(`Event line ${issue.line} has non-monotonic seq (expected ${issue.expected}, got ${issue.got})`);
          } else if (issue.issue === 'TIMESTAMP_INVALID') {
            fail(`Event line ${issue.line} has invalid timestamp: ${issue.value}`);
          } else if (issue.issue === 'SEQ_INVALID') {
            fail(`Event line ${issue.line} has invalid seq`);
          } else if (issue.issue === 'JSON_PARSE') {
            fail(`Event line ${issue.line} JSON parse error: ${issue.message}`);
          }
        });
      }
    } catch (e) {
      fail(`Events parse/verify error: ${e.message}`);
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  // Human output
  console.log(`Evidify Radiology/Research Verifier v${VERSION}`);
  console.log(`Pack: ${packDir}`);
  console.log('');
  console.log(`Files: ${out.checks.files.pass ? 'PASS' : 'FAIL'}`);

  if (out.warnings.length) {
    console.log(`Warnings (${out.warnings.length}):`);
    out.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }

  if (!out.pass) {
    console.log(`Errors (${out.errors.length}):`);
    out.errors.forEach(e => console.log(`  ❌ ${e}`));
    console.log('❌ VERIFICATION: FAIL');
    process.exit(1);
  }

  console.log('Manifest: PASS');
  console.log('Ledger: PASS');
  console.log('✅ VERIFICATION: PASS');
}

main();
