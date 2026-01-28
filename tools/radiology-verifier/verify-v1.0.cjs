#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const packDir = args.find(arg => !arg.startsWith('-'));

if (!packDir) {
  console.error('Usage: node tools/radiology-verifier/verify-v1.0.cjs <pack-dir> [--json]');
  process.exit(2);
}

const resolvedPack = path.resolve(process.cwd(), packDir);

const requiredFiles = [
  'export_manifest.json',
  'ledger.json',
  'events.jsonl',
];

const optionalFiles = [
  'derived_metrics.csv',
  'codebook.md',
  'trial_manifest.json',
  'verifier_output.json',
  '_DEBUG_SENTINEL.txt',
];

const checks = [];
let manifest = null;
let ledger = null;

function addCheck(name, status, message, details) {
  const entry = { name, status, message };
  if (details) entry.details = details;
  checks.push(entry);
}

function resolveFile(fileName) {
  return path.join(resolvedPack, fileName);
}

function fileExists(fileName) {
  return fs.existsSync(resolveFile(fileName));
}

function readFirstLine(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    if (bytesRead === 0) return null;
    const chunk = buffer.slice(0, bytesRead).toString('utf8');
    const newlineIndex = chunk.indexOf('\n');
    return newlineIndex === -1 ? chunk : chunk.slice(0, newlineIndex);
  } finally {
    fs.closeSync(fd);
  }
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasStringKeys(obj, keys) {
  return keys.every(key => typeof obj[key] === 'string');
}

for (const fileName of requiredFiles) {
  if (fileExists(fileName)) {
    addCheck(`REQUIRED_FILE:${fileName}`, 'PASS', 'Present');
  } else {
    addCheck(`REQUIRED_FILE:${fileName}`, 'FAIL', 'Missing');
  }
}

for (const fileName of optionalFiles) {
  if (fileExists(fileName)) {
    addCheck(`OPTIONAL_FILE:${fileName}`, 'PASS', 'Present');
  } else {
    addCheck(`OPTIONAL_FILE:${fileName}`, 'WARN', 'Missing');
  }
}

if (fileExists('export_manifest.json')) {
  try {
    const manifestRaw = fs.readFileSync(resolveFile('export_manifest.json'), 'utf8');
    manifest = JSON.parse(manifestRaw);
    if (!isPlainObject(manifest) || !Array.isArray(manifest.entries)) {
      addCheck('EXPORT_MANIFEST_PARSE', 'FAIL', 'Invalid manifest shape');
    } else {
      addCheck('EXPORT_MANIFEST_PARSE', 'PASS', `Parsed ${manifest.entries.length} entries`);
    }
  } catch (error) {
    addCheck('EXPORT_MANIFEST_PARSE', 'FAIL', 'Unable to parse export_manifest.json', {
      error: error.message,
    });
  }
}

if (fileExists('ledger.json')) {
  try {
    const ledgerRaw = fs.readFileSync(resolveFile('ledger.json'), 'utf8');
    ledger = JSON.parse(ledgerRaw);
    if (!Array.isArray(ledger)) {
      addCheck('LEDGER_PARSE', 'FAIL', 'ledger.json is not an array');
    } else {
      addCheck('LEDGER_PARSE', 'PASS', `Parsed ${ledger.length} entries`);
    }
  } catch (error) {
    addCheck('LEDGER_PARSE', 'FAIL', 'Unable to parse ledger.json', {
      error: error.message,
    });
  }
}

if (fileExists('events.jsonl')) {
  try {
    const firstLine = readFirstLine(resolveFile('events.jsonl'));
    if (firstLine === null) {
      addCheck('EVENTS_JSONL_READ', 'FAIL', 'events.jsonl is empty');
    } else {
      JSON.parse(firstLine);
      addCheck('EVENTS_JSONL_READ', 'PASS', 'Readable JSONL');
    }
  } catch (error) {
    addCheck('EVENTS_JSONL_READ', 'FAIL', 'Unable to read events.jsonl', {
      error: error.message,
    });
  }
}

async function runIntegrityChecks() {
  if (manifest && Array.isArray(manifest.entries)) {
    let manifestFailures = 0;
    for (const entry of manifest.entries) {
      if (!isPlainObject(entry) || !hasStringKeys(entry, ['path', 'sha256']) || typeof entry.bytes !== 'number') {
        addCheck('MANIFEST_ENTRY', 'FAIL', 'Invalid manifest entry shape', { entry });
        manifestFailures += 1;
        continue;
      }
      const entryPath = resolveFile(entry.path);
      if (!fs.existsSync(entryPath)) {
        addCheck('MANIFEST_ENTRY', 'FAIL', `Missing file: ${entry.path}`);
        manifestFailures += 1;
        continue;
      }
      const stats = fs.statSync(entryPath);
      if (stats.size !== entry.bytes) {
        addCheck('MANIFEST_ENTRY', 'FAIL', `Size mismatch: ${entry.path}`, {
          expected: entry.bytes,
          actual: stats.size,
        });
        manifestFailures += 1;
      }
      const actualHash = await hashFile(entryPath);
      if (actualHash !== entry.sha256) {
        addCheck('MANIFEST_ENTRY', 'FAIL', `SHA-256 mismatch: ${entry.path}`, {
          expected: entry.sha256,
          actual: actualHash,
        });
        manifestFailures += 1;
      }
    }
    if (manifestFailures === 0) {
      addCheck('MANIFEST_INTEGRITY', 'PASS', 'All manifest entries verified');
    } else {
      addCheck('MANIFEST_INTEGRITY', 'FAIL', `${manifestFailures} manifest entry issue(s)`);
    }
  }

  if (Array.isArray(ledger)) {
    let chainFailures = 0;
    let legacyMatches = 0;

    for (let i = 0; i < ledger.length; i += 1) {
      const entry = ledger[i];
      const expectedSeq = i + 1;
      if (!entry || typeof entry !== 'object') {
        addCheck('LEDGER_CHAIN', 'FAIL', `Invalid ledger entry at index ${i}`);
        chainFailures += 1;
        continue;
      }
      if (entry.seq !== expectedSeq) {
        addCheck('LEDGER_CHAIN', 'FAIL', `Sequence mismatch at index ${i}`, {
          expected: expectedSeq,
          actual: entry.seq,
        });
        chainFailures += 1;
        continue;
      }
      const expectedPrev = i === 0 ? '0'.repeat(64) : ledger[i - 1].chainHash;
      if (entry.previousHash !== expectedPrev) {
        addCheck('LEDGER_CHAIN', 'FAIL', `previousHash mismatch at seq ${entry.seq}`, {
          expected: expectedPrev,
          actual: entry.previousHash,
        });
        chainFailures += 1;
        continue;
      }

      const requiredPreimage = [
        entry.seq,
        entry.eventId,
        entry.eventType,
        entry.timestamp,
        entry.contentHash,
        entry.previousHash,
      ].join('|');
      const requiredHash = crypto.createHash('sha256').update(requiredPreimage, 'utf8').digest('hex');

      if (entry.chainHash !== requiredHash) {
        const legacyPreimage = [
          entry.previousHash,
          entry.contentHash,
          entry.timestamp,
        ].join('|');
        const legacyHash = crypto.createHash('sha256').update(legacyPreimage, 'utf8').digest('hex');
        if (entry.chainHash === legacyHash) {
          legacyMatches += 1;
        } else {
          addCheck('LEDGER_CHAIN', 'FAIL', `chainHash mismatch at seq ${entry.seq}`, {
            expected: requiredHash,
            actual: entry.chainHash,
          });
          chainFailures += 1;
        }
      }
    }

    if (chainFailures === 0) {
      addCheck('LEDGER_CHAIN', 'PASS', `Validated ${ledger.length} chain links`);
    }
    if (legacyMatches > 0) {
      addCheck('LEDGER_CHAIN_LEGACY', 'WARN', `Legacy chain preimage detected for ${legacyMatches} entries`);
    }
  }

  if (fileExists('verifier_output.json')) {
    try {
      const verifierRaw = fs.readFileSync(resolveFile('verifier_output.json'), 'utf8');
      const verifierOutput = JSON.parse(verifierRaw);
      const hasKeys = isPlainObject(verifierOutput)
        && hasStringKeys(verifierOutput, ['result', 'timestamp', 'verifierVersion'])
        && Array.isArray(verifierOutput.checks);
      if (!hasKeys) {
        addCheck('VERIFIER_OUTPUT_SHAPE', 'WARN', 'verifier_output.json is missing expected keys');
      } else {
        addCheck('VERIFIER_OUTPUT_SHAPE', 'PASS', 'verifier_output.json shape looks valid');
      }
    } catch (error) {
      addCheck('VERIFIER_OUTPUT_SHAPE', 'WARN', 'Unable to parse verifier_output.json', {
        error: error.message,
      });
    }
  }
}

async function main() {
  await runIntegrityChecks();

  const pass = !checks.some(check => check.status === 'FAIL');

  if (jsonOutput) {
    const output = {
      version: 'radiology-verifier-v1.0',
      pack: resolvedPack,
      pass,
      checks,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('Radiology Export Verifier v1.0');
    console.log(`Pack: ${resolvedPack}`);
    console.log(pass ? 'Result: PASS' : 'Result: FAIL');
    console.log('');
    for (const check of checks) {
      console.log(`[${check.status}] ${check.name} - ${check.message}`);
    }
  }

  process.exit(pass ? 0 : 1);
}

main();
