#!/usr/bin/env node
/**
 * verify-export-v2.ts
 * 
 * CLI tool to verify Evidify export integrity
 * 
 * UPDATES (Grayson P0 feedback):
 * - Canonical JSON verification (RFC 8785 compliant)
 * - Structured encoding with seq, eventId in chain hash
 * - Fixed-length hash input (128 bytes, no delimiter ambiguity)
 * - File-level checksums verification
 * 
 * Usage:
 *   npx ts-node verify-export-v2.ts path/to/export/
 *   npm run verify -- path/to/export/
 * 
 * Exit codes:
 *   0 = PASS (all checks passed)
 *   1 = FAIL (one or more checks failed)
 *   2 = ERROR (could not read files)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// CANONICAL JSON (imported logic from CanonicalHash.ts)
// ============================================================================

function canonicalJSON(value: unknown): string {
  return serializeValue(value);
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return serializeNumber(value);
  if (typeof value === 'string') return serializeString(value);
  if (Array.isArray(value)) return serializeArray(value);
  if (typeof value === 'object') return serializeObject(value as Record<string, unknown>);
  return 'null';
}

function serializeNumber(num: number): string {
  if (!Number.isFinite(num)) return 'null';
  if (Object.is(num, -0)) return '0';
  return String(num);
}

function serializeString(str: string): string {
  let result = '"';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    if (char === '"') result += '\\"';
    else if (char === '\\') result += '\\\\';
    else if (code < 0x20) {
      switch (code) {
        case 0x08: result += '\\b'; break;
        case 0x09: result += '\\t'; break;
        case 0x0a: result += '\\n'; break;
        case 0x0c: result += '\\f'; break;
        case 0x0d: result += '\\r'; break;
        default: result += '\\u' + code.toString(16).padStart(4, '0');
      }
    } else result += char;
  }
  return result + '"';
}

function serializeArray(arr: unknown[]): string {
  return '[' + arr.map(v => serializeValue(v)).join(',') + ']';
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj)
    .filter(k => obj[k] !== undefined)
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = a.charCodeAt(i) - b.charCodeAt(i);
        if (diff !== 0) return diff;
      }
      return a.length - b.length;
    });
  return '{' + keys.map(k => serializeString(k) + ':' + serializeValue(obj[k])).join(',') + '}';
}

// ============================================================================
// HASH FUNCTIONS
// ============================================================================

const GENESIS_HASH = '0'.repeat(64);

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function sha256Bytes(input: Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function computeContentHash(payload: Record<string, unknown>): string {
  return sha256Hex(canonicalJSON(payload));
}

/**
 * Compute chain hash with structured encoding (128 bytes fixed)
 */
function computeChainHash(
  seq: number,
  prevHash: string,
  eventId: string,
  timestamp: string,
  contentHash: string
): string {
  const buffer = Buffer.alloc(128);
  let offset = 0;

  // seq: 4 bytes, big-endian
  buffer.writeUInt32BE(seq, offset);
  offset += 4;

  // prevHash: 32 bytes
  Buffer.from(prevHash, 'hex').copy(buffer, offset);
  offset += 32;

  // eventId: 36 bytes
  Buffer.from(eventId.padEnd(36, '\0').slice(0, 36), 'utf8').copy(buffer, offset);
  offset += 36;

  // timestamp: 24 bytes
  Buffer.from(timestamp.padEnd(24, '\0').slice(0, 24), 'utf8').copy(buffer, offset);
  offset += 24;

  // contentHash: 32 bytes
  Buffer.from(contentHash, 'hex').copy(buffer, offset);

  return sha256Bytes(buffer);
}

// ============================================================================
// TYPES
// ============================================================================

interface TrialManifest {
  exportVersion: string;
  schemaVersion: string;
  exportTimestamp: string;
  integrity: {
    eventCount: number;
    finalHash: string;
    chainValid: boolean;
  };
  protocol: {
    deviationEnforcement: string;
  };
  timestampTrustModel?: string;
  fileChecksums?: {
    events: string;
    ledger: string;
    metrics: string;
  };
}

interface TrialEvent {
  id: string;
  seq: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface LedgerEntry {
  seq: number;
  eventId: string;
  eventType: string;
  timestamp: string;
  contentHash: string;
  previousHash: string;
  chainHash: string;
}

interface VerifierCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

// ============================================================================
// COLORS
// ============================================================================

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const pass = (msg: string) => console.log(`${c.green}✓ PASS:${c.reset} ${msg}`);
const fail = (msg: string) => console.log(`${c.red}✗ FAIL:${c.reset} ${msg}`);
const warn = (msg: string) => console.log(`${c.yellow}⚠ WARN:${c.reset} ${msg}`);

// ============================================================================
// VERIFIER
// ============================================================================

async function verifyExport(exportPath: string): Promise<{ passed: boolean; checks: VerifierCheck[] }> {
  const checks: VerifierCheck[] = [];

  // Read files
  let manifest: TrialManifest;
  let events: TrialEvent[];
  let ledger: LedgerEntry[];
  let eventsRaw: string;
  let ledgerRaw: string;
  let metricsRaw: string | undefined;

  try {
    const manifestPath = path.join(exportPath, 'trial_manifest.json');
    const eventsPath = path.join(exportPath, 'events.jsonl');
    const ledgerPath = path.join(exportPath, 'ledger.json');
    const metricsPath = path.join(exportPath, 'derived_metrics.csv');

    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    eventsRaw = fs.readFileSync(eventsPath, 'utf-8');
    events = eventsRaw
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    ledgerRaw = fs.readFileSync(ledgerPath, 'utf-8');
    ledger = JSON.parse(ledgerRaw);

    if (fs.existsSync(metricsPath)) {
      metricsRaw = fs.readFileSync(metricsPath, 'utf-8');
    }
  } catch (err) {
    console.error(`${c.red}ERROR:${c.reset} Could not read export files`);
    console.error(err);
    process.exit(2);
  }

  // ========== Check 1: Schema Version ==========
  const schemaOk = manifest.schemaVersion === '2.0.0' || manifest.schemaVersion === '1.0.0';
  checks.push({
    name: 'SCHEMA_VERSION',
    status: schemaOk ? 'PASS' : 'FAIL',
    message: schemaOk ? manifest.schemaVersion : `Unexpected: ${manifest.schemaVersion}`,
  });

  // ========== Check 2: Event Count ==========
  const eventCountOk = events.length === manifest.integrity.eventCount;
  checks.push({
    name: 'EVENT_COUNT',
    status: eventCountOk ? 'PASS' : 'FAIL',
    message: eventCountOk
      ? `${events.length} events`
      : `Manifest: ${manifest.integrity.eventCount}, Found: ${events.length}`,
  });

  // ========== Check 3: Ledger Count ==========
  const ledgerCountOk = ledger.length === events.length;
  checks.push({
    name: 'LEDGER_COUNT',
    status: ledgerCountOk ? 'PASS' : 'FAIL',
    message: ledgerCountOk
      ? `${ledger.length} entries`
      : `Ledger: ${ledger.length}, Events: ${events.length}`,
  });

  // ========== Check 4: Sequence Numbers ==========
  let seqOk = true;
  let seqError = '';
  for (let i = 0; i < events.length; i++) {
    if (events[i].seq !== i || ledger[i].seq !== i) {
      seqOk = false;
      seqError = `Event ${i}: expected seq=${i}, got event.seq=${events[i].seq}, ledger.seq=${ledger[i].seq}`;
      break;
    }
  }
  checks.push({
    name: 'SEQUENCE_NUMBERS',
    status: seqOk ? 'PASS' : 'FAIL',
    message: seqOk ? 'monotonic 0..n-1' : seqError,
  });

  // ========== Check 5: Event ID Consistency ==========
  let idOk = true;
  let idError = '';
  for (let i = 0; i < events.length; i++) {
    if (events[i].id !== ledger[i].eventId) {
      idOk = false;
      idError = `Event ${i}: ID mismatch`;
      break;
    }
  }
  checks.push({
    name: 'EVENT_ID_CONSISTENCY',
    status: idOk ? 'PASS' : 'FAIL',
    message: idOk ? 'all match' : idError,
  });

  // ========== Check 6: Chain Integrity (Canonical JSON + Structured Encoding) ==========
  let chainValid = true;
  let chainError = '';

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const entry = ledger[i];

    // Check previous hash
    const expectedPrevious = i === 0 ? GENESIS_HASH : ledger[i - 1].chainHash;
    if (entry.previousHash !== expectedPrevious) {
      chainValid = false;
      chainError = `Event ${i}: previousHash mismatch (expected ${expectedPrevious.slice(0, 12)}..., got ${entry.previousHash.slice(0, 12)}...)`;
      break;
    }

    // Recompute content hash with CANONICAL JSON
    const computedContentHash = computeContentHash(event.payload);
    if (entry.contentHash !== computedContentHash) {
      chainValid = false;
      chainError = `Event ${i} (${event.type}): CONTENT_TAMPERED\n         Expected: ${computedContentHash.slice(0, 16)}...\n         Got:      ${entry.contentHash.slice(0, 16)}...`;
      break;
    }

    // Recompute chain hash with STRUCTURED ENCODING
    const computedChainHash = computeChainHash(
      entry.seq,
      entry.previousHash,
      entry.eventId,
      event.timestamp,
      entry.contentHash
    );
    if (entry.chainHash !== computedChainHash) {
      chainValid = false;
      chainError = `Event ${i} (${event.type}): CHAIN_BROKEN\n         Expected: ${computedChainHash.slice(0, 16)}...\n         Got:      ${entry.chainHash.slice(0, 16)}...`;
      break;
    }
  }

  checks.push({
    name: 'CHAIN_INTEGRITY',
    status: chainValid ? 'PASS' : 'FAIL',
    message: chainValid ? 'verified (canonical JSON + structured encoding)' : `CHAIN_BROKEN / CONTENT_TAMPERED\n         ${chainError}`,
  });

  // ========== Check 7: Final Hash ==========
  const computedFinalHash = ledger.length > 0 ? ledger[ledger.length - 1].chainHash : GENESIS_HASH;
  const hashOk = computedFinalHash === manifest.integrity.finalHash;
  checks.push({
    name: 'FINAL_HASH',
    status: hashOk ? 'PASS' : 'FAIL',
    message: hashOk
      ? 'matches manifest'
      : `Computed: ${computedFinalHash.slice(0, 16)}...\n         Expected: ${manifest.integrity.finalHash.slice(0, 16)}...`,
  });

  // ========== Check 8: File Checksums (if present) ==========
  if (manifest.fileChecksums) {
    const eventsChecksum = sha256Hex(eventsRaw);
    const ledgerChecksum = sha256Hex(ledgerRaw);
    
    const eventsOk = eventsChecksum === manifest.fileChecksums.events;
    const ledgerOk = ledgerChecksum === manifest.fileChecksums.ledger;

    checks.push({
      name: 'FILE_CHECKSUMS',
      status: eventsOk && ledgerOk ? 'PASS' : 'FAIL',
      message: eventsOk && ledgerOk
        ? 'events.jsonl + ledger.json verified'
        : `${!eventsOk ? 'events.jsonl MISMATCH ' : ''}${!ledgerOk ? 'ledger.json MISMATCH' : ''}`,
    });
  }

  // ========== Check 9: Required Events ==========
  const requiredTypes = ['SESSION_STARTED', 'FIRST_IMPRESSION_LOCKED', 'FINAL_ASSESSMENT'];
  const eventTypes = new Set(events.map(e => e.type));
  const missingEvents = requiredTypes.filter(t => !eventTypes.has(t));
  checks.push({
    name: 'REQUIRED_EVENTS',
    status: missingEvents.length === 0 ? 'PASS' : 'FAIL',
    message: missingEvents.length === 0
      ? 'all present'
      : `Missing: ${missingEvents.join(', ')}`,
  });

  // ========== Check 10: Timestamp Sequence ==========
  let timestampsOk = true;
  let timestampNote = '';
  for (let i = 1; i < events.length; i++) {
    if (new Date(events[i].timestamp) < new Date(events[i - 1].timestamp)) {
      timestampsOk = false;
      timestampNote = ` (non-sequential at event ${i})`;
      break;
    }
  }
  
  // Check trust model
  const trustModel = manifest.timestampTrustModel || 'unspecified';
  const isTrusted = trustModel === 'server_attested';

  checks.push({
    name: 'TIMESTAMP_SEQUENCE',
    status: timestampsOk ? 'PASS' : 'WARN',
    message: timestampsOk
      ? `sequential, trust_model=${trustModel}`
      : `non-sequential${timestampNote}, trust_model=${trustModel}`,
  });

  // ========== Check 11: Deviation Documentation ==========
  const hasAI = eventTypes.has('AI_REVEALED');
  const hasDeviationSubmitted = eventTypes.has('DEVIATION_SUBMITTED');
  const hasDeviationSkipped = eventTypes.has('DEVIATION_SKIPPED');

  // Find assessment events to check if deviation was required
  const firstImpression = events.find(e => e.type === 'FIRST_IMPRESSION_LOCKED');
  const finalAssessment = events.find(e => e.type === 'FINAL_ASSESSMENT');
  const aiRevealed = events.find(e => e.type === 'AI_REVEALED');

  let deviationRequired = false;
  if (firstImpression && finalAssessment) {
    const initialBirads = (firstImpression.payload as any).birads;
    const finalBirads = (finalAssessment.payload as any).birads;
    deviationRequired = initialBirads !== finalBirads;
  }

  if (hasDeviationSkipped) {
    checks.push({
      name: 'DEVIATION_DOCUMENTATION',
      status: 'WARN',
      message: 'skipped with attestation (higher-risk documentation pattern)',
    });
  } else if (deviationRequired && hasDeviationSubmitted) {
    checks.push({
      name: 'DEVIATION_DOCUMENTATION',
      status: 'PASS',
      message: 'properly documented',
    });
  } else if (deviationRequired && !hasDeviationSubmitted) {
    checks.push({
      name: 'DEVIATION_DOCUMENTATION',
      status: 'WARN',
      message: 'change occurred but no documentation found',
    });
  } else {
    checks.push({
      name: 'DEVIATION_DOCUMENTATION',
      status: 'PASS',
      message: 'no deviation required (no change)',
    });
  }

  // ========== Check 12: ADDA Calculation Verification ==========
  if (firstImpression && finalAssessment && aiRevealed) {
    const initialBirads = (firstImpression.payload as any).birads;
    const finalBirads = (finalAssessment.payload as any).birads;
    const aiBirads = (aiRevealed.payload as any).aiBirads;

    const inDenominator = initialBirads !== aiBirads;
    const changed = initialBirads !== finalBirads;
    const changedTowardAI = changed && finalBirads === aiBirads;

    let addaStatus: 'PASS' | 'WARN' = 'PASS';
    let addaMessage = '';

    if (!inDenominator) {
      addaMessage = `ADDA=N/A (initial=${initialBirads} already matched AI=${aiBirads})`;
    } else if (changedTowardAI) {
      addaStatus = 'WARN';
      addaMessage = `ADDA=TRUE (${initialBirads}→${finalBirads}, matched AI=${aiBirads})`;
    } else if (changed) {
      addaMessage = `ADDA=FALSE (changed ${initialBirads}→${finalBirads}, AI was ${aiBirads})`;
    } else {
      addaMessage = `ADDA=FALSE (maintained ${initialBirads}, AI was ${aiBirads})`;
    }

    checks.push({
      name: 'ADDA_VERIFICATION',
      status: addaStatus,
      message: addaMessage,
    });
  }

  const passed = checks.filter(c => c.status === 'FAIL').length === 0;
  return { passed, checks };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
${c.bold}EVIDIFY EXPORT VERIFIER v2.0${c.reset}

${c.dim}Features:${c.reset}
  • Canonical JSON verification (RFC 8785)
  • Structured encoding (128-byte fixed input)
  • seq + eventId in chain hash
  • File-level checksums

${c.bold}Usage:${c.reset}
  npx ts-node verify-export-v2.ts <export-directory>
  npm run verify -- <export-directory>

${c.bold}Example:${c.reset}
  npm run verify -- ./exports/session_001/

${c.bold}Exit Codes:${c.reset}
  0 = PASS (all checks passed)
  1 = FAIL (integrity violation detected)
  2 = ERROR (could not read files)
`);
    process.exit(0);
  }

  const exportPath = args[0];

  if (!fs.existsSync(exportPath)) {
    console.error(`${c.red}ERROR:${c.reset} Path not found: ${exportPath}`);
    process.exit(2);
  }

  console.log(`
${c.cyan}════════════════════════════════════════════${c.reset}
${c.bold}  EVIDIFY EXPORT VERIFIER v2.0${c.reset}
${c.cyan}════════════════════════════════════════════${c.reset}

Verifying: ${exportPath}
`);

  const { passed, checks } = await verifyExport(exportPath);

  // Print results
  for (const check of checks) {
    if (check.status === 'PASS') {
      pass(`${check.name} (${check.message})`);
    } else if (check.status === 'FAIL') {
      fail(`${check.name}\n         ${check.message}`);
    } else {
      warn(`${check.name} (${check.message})`);
    }
  }

  const passCount = checks.filter(c => c.status === 'PASS').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;
  const warnCount = checks.filter(c => c.status === 'WARN').length;

  console.log(`
${c.cyan}════════════════════════════════════════════${c.reset}
  ${c.bold}RESULT: ${passed ? c.green + 'PASS' : c.red + 'FAIL'}${c.reset}
  ${passCount}/${checks.length} checks passed${warnCount > 0 ? `, ${warnCount} warnings` : ''}
${failCount > 0 ? `  ${c.red}ERRORS: CHAIN_BROKEN / CONTENT_TAMPERED${c.reset}` : ''}
${c.cyan}════════════════════════════════════════════${c.reset}

${c.dim}This verifier is reproducible by any party.${c.reset}
`);

  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
