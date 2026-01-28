#!/usr/bin/env node
/**
 * Evidify Forensic Verifier v1.1
 * 
 * ENHANCEMENTS from v1.0:
 * 1. Hash verification: Recomputes canonical hash using sentinel rule
 * 2. Uniqueness check: Ensures no duplicate finding IDs
 * 3. Deep compare: Compares full finding objects, not just presence
 * 4. Baseline update: --baseline-update flag for CI
 * 
 * Usage:
 *   node verify-v1.1.cjs <pack-dir> [options]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.1.0';
const HASH_SENTINEL = '0'.repeat(64);

// ============================================================================
// UTILITIES
// ============================================================================

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function canonicalizeJson(v) {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(canonicalizeJson);
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    const out = {};
    for (const k of keys) out[k] = canonicalizeJson(v[k]);
    return out;
  }
  return v;
}

function canonicalStringify(v) {
  return JSON.stringify(canonicalizeJson(v));
}

function canonicalSha256(v) {
  return sha256(canonicalStringify(v));
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function loadNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return fs.readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (e) {
    return [];
  }
}

// ============================================================================
// FIX A: HASH VERIFICATION (sentinel-based preimage)
// ============================================================================

function verifyCanonicalHash(report) {
  const claimed = report.inputs_digest?.canonical_sha256;
  if (!claimed) {
    return { valid: false, error: 'Missing canonical_sha256' };
  }
  
  // Create preimage with sentinel
  const preimage = JSON.parse(JSON.stringify(report));
  preimage.inputs_digest.canonical_sha256 = HASH_SENTINEL;
  
  const computed = canonicalSha256(preimage);
  
  return {
    valid: claimed === computed,
    claimed,
    computed,
    error: claimed !== computed ? 'Hash mismatch' : null
  };
}

// ============================================================================
// UNIQUENESS CHECK
// ============================================================================

function checkIdUniqueness(report) {
  const result = { valid: true, duplicates: [] };
  
  const violationIds = (report.violations || []).map(v => v.id);
  const warningIds = (report.warnings || []).map(w => w.id);
  const allIds = [...violationIds, ...warningIds];
  
  const seen = new Set();
  for (const id of allIds) {
    if (seen.has(id)) {
      result.duplicates.push(id);
      result.valid = false;
    }
    seen.add(id);
  }
  
  return result;
}

// ============================================================================
// DEEP COMPARE BY ID
// ============================================================================

function deepCompareFinding(actual, expected) {
  const diffs = [];
  
  const fields = ['gate_id', 'code', 'sub_code', 'severity', 'message', 'remediation_hint', 'spec_reference'];
  for (const field of fields) {
    if (actual[field] !== expected[field]) {
      diffs.push({
        field,
        actual: actual[field],
        expected: expected[field]
      });
    }
  }
  
  // Compare object
  if (actual.object?.type !== expected.object?.type || actual.object?.id !== expected.object?.id) {
    diffs.push({
      field: 'object',
      actual: actual.object,
      expected: expected.object
    });
  }
  
  return diffs;
}

function deepCompareFindings(actual, golden) {
  const result = {
    added: [],      // In actual, not in golden
    removed: [],    // In golden, not in actual
    changed: [],    // Same ID, different content
    matched: 0,     // Identical
    rootFieldDiffs: []  // Differences in root fields
  };
  
  // Compare root fields
  const rootFields = ['case_id', 'report_id', 'schema_version'];
  for (const field of rootFields) {
    if (actual[field] !== golden[field]) {
      result.rootFieldDiffs.push({
        field,
        actual: actual[field],
        expected: golden[field]
      });
    }
  }
  
  // Compare summary
  if (actual.summary?.status !== golden.summary?.status) {
    result.rootFieldDiffs.push({
      field: 'summary.status',
      actual: actual.summary?.status,
      expected: golden.summary?.status
    });
  }
  if (actual.summary?.block_count !== golden.summary?.block_count) {
    result.rootFieldDiffs.push({
      field: 'summary.block_count',
      actual: actual.summary?.block_count,
      expected: golden.summary?.block_count
    });
  }
  
  // Compare gate outcomes
  const actualOutcomes = actual.gate_outcomes || {};
  const goldenOutcomes = golden.gate_outcomes || {};
  const allGates = new Set([...Object.keys(actualOutcomes), ...Object.keys(goldenOutcomes)]);
  for (const gate of allGates) {
    if (actualOutcomes[gate] !== goldenOutcomes[gate]) {
      result.rootFieldDiffs.push({
        field: `gate_outcomes.${gate}`,
        actual: actualOutcomes[gate],
        expected: goldenOutcomes[gate]
      });
    }
  }
  
  const actualMap = new Map();
  const goldenMap = new Map();
  
  for (const f of (actual.violations || [])) actualMap.set(f.id, { ...f, _type: 'violation' });
  for (const f of (actual.warnings || [])) actualMap.set(f.id, { ...f, _type: 'warning' });
  for (const f of (golden.violations || [])) goldenMap.set(f.id, { ...f, _type: 'violation' });
  for (const f of (golden.warnings || [])) goldenMap.set(f.id, { ...f, _type: 'warning' });
  
  // Check for added and changed
  for (const [id, af] of actualMap) {
    if (!goldenMap.has(id)) {
      result.added.push({ id, finding: af });
    } else {
      const gf = goldenMap.get(id);
      const diffs = deepCompareFinding(af, gf);
      if (diffs.length > 0) {
        result.changed.push({ id, diffs, actual: af, expected: gf });
      } else {
        result.matched++;
      }
    }
  }
  
  // Check for removed
  for (const [id, gf] of goldenMap) {
    if (!actualMap.has(id)) {
      result.removed.push({ id, finding: gf });
    }
  }
  
  return result;
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

function validateSchema(value, schema, path, defs) {
  const errors = [];
  
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/$defs/', '');
    if (defs[refPath]) {
      return validateSchema(value, defs[refPath], path, defs);
    }
    return [`${path}: unresolved $ref`];
  }
  
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected "${schema.const}"`);
    return errors;
  }
  
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: not in enum`);
    return errors;
  }
  
  if (schema.type === 'string') {
    if (typeof value !== 'string') errors.push(`${path}: expected string`);
    else if (schema.minLength && value.length < schema.minLength) errors.push(`${path}: too short`);
    else if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: pattern mismatch`);
  } else if (schema.type === 'integer' || schema.type === 'number') {
    if (typeof value !== 'number') errors.push(`${path}: expected number`);
    else if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path}: expected boolean`);
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) errors.push(`${path}: expected array`);
    else if (schema.items) {
      value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, `${path}[${i}]`, defs)));
    }
  } else if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path}: expected object`);
    } else {
      if (schema.required) {
        for (const req of schema.required) {
          if (!(req in value)) errors.push(`${path}: missing "${req}"`);
        }
      }
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in value) errors.push(...validateSchema(value[key], propSchema, `${path}.${key}`, defs));
        }
      }
      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(value)) {
          if (!allowed.has(key)) errors.push(`${path}: unexpected "${key}"`);
        }
      }
    }
  }
  
  return errors;
}

// ============================================================================
// AUDIT CHAIN VERIFICATION
// ============================================================================

function verifyAuditChain(auditLog) {
  const result = { valid: true, errors: [], events: auditLog.length };
  
  if (auditLog.length === 0) {
    result.errors.push('Audit log is empty');
    result.valid = false;
    return result;
  }
  
  let expectedPrevHash = '0'.repeat(64);
  
  for (let i = 0; i < auditLog.length; i++) {
    const event = auditLog[i];
    
    if (event.seq !== i) {
      result.errors.push(`Event ${i}: seq mismatch`);
      result.valid = false;
    }
    
    if (event.prev_hash !== expectedPrevHash) {
      result.errors.push(`Event ${i}: prev_hash mismatch`);
      result.valid = false;
    }
    
    const content = JSON.stringify({
      seq: event.seq,
      timestamp: event.timestamp,
      action: event.action,
      details: event.details,
      prev_hash: event.prev_hash
    });
    const computedHash = sha256(content);
    
    if (event.chain_hash !== computedHash) {
      result.errors.push(`Event ${i}: chain_hash mismatch`);
      result.valid = false;
    }
    
    expectedPrevHash = event.chain_hash;
  }
  
  result.finalHash = expectedPrevHash;
  return result;
}

// ============================================================================
// MAIN VERIFIER
// ============================================================================

function verifyPack(packDir, options = {}) {
  const result = {
    version: VERSION,
    pack: packDir,
    timestamp: new Date().toISOString(),
    checks: {},
    pass: true
  };
  
  if (!fs.existsSync(packDir)) {
    result.error = 'Pack directory not found';
    result.pass = false;
    return result;
  }
  
  // Find key files
  const canonicalPath = fs.existsSync(path.join(packDir, 'canonical/canonical.json'))
    ? path.join(packDir, 'canonical/canonical.json')
    : path.join(packDir, 'canonical.json');
  
  const auditLogPath = path.join(packDir, 'audit/audit.log');
  const gateReportPath = path.join(packDir, 'verification/gate_report.canon.json');
  
  // Check 1: Required files
  result.checks.files = { pass: true, missing: [] };
  if (!fs.existsSync(canonicalPath)) {
    result.checks.files.missing.push('canonical.json');
    result.checks.files.pass = false;
  }
  if (!result.checks.files.pass) result.pass = false;
  
  // Check 2: Audit chain
  if (fs.existsSync(auditLogPath)) {
    const auditLog = loadNdjson(auditLogPath);
    result.checks.auditChain = verifyAuditChain(auditLog);
    if (!result.checks.auditChain.valid) result.pass = false;
  }
  
  // Load gate report for remaining checks
  const gateReport = loadJson(gateReportPath);
  
  if (gateReport) {
    // Check 3: HASH VERIFICATION (FIX A - recompute and assert)
    const hashCheck = verifyCanonicalHash(gateReport);
    result.checks.canonicalHash = hashCheck;
    if (!hashCheck.valid) {
      result.pass = false;
    }
    
    // Check 4: ID UNIQUENESS
    const uniquenessCheck = checkIdUniqueness(gateReport);
    result.checks.idUniqueness = uniquenessCheck;
    if (!uniquenessCheck.valid) {
      result.pass = false;
    }
    
    // Check 5: Schema validation
    if (options.schema) {
      const schema = loadJson(options.schema);
      if (schema) {
        const errors = validateSchema(gateReport, schema, '$', schema.$defs || {});
        result.checks.schema = { pass: errors.length === 0, errors: errors.slice(0, 10) };
        if (errors.length > 0) result.pass = false;
      }
    }
    
    // Check 6: Gate status
    result.checks.gates = {
      status: gateReport.summary?.status || 'UNKNOWN',
      violations: gateReport.summary?.block_count || 0,
      warnings: gateReport.summary?.warn_count || 0
    };
    
    // Check 7: DEEP GOLDEN COMPARISON (enhanced)
    if (options.golden) {
      const golden = loadJson(options.golden);
      if (golden) {
        const comparison = deepCompareFindings(gateReport, golden);
        
        const hasRegressions = comparison.added.length > 0 || 
                               comparison.removed.length > 0 || 
                               comparison.changed.length > 0 ||
                               comparison.rootFieldDiffs.length > 0;
        
        result.checks.golden = {
          pass: !hasRegressions,
          matched: comparison.matched,
          added: comparison.added,
          removed: comparison.removed,
          changed: comparison.changed,
          rootFieldDiffs: comparison.rootFieldDiffs
        };
        
        if (hasRegressions && !options.baselineUpdate) {
          result.pass = false;
        }
        
        // Baseline update mode
        if (hasRegressions && options.baselineUpdate) {
          result.checks.golden.baselineUpdated = true;
          fs.writeFileSync(options.golden, JSON.stringify(canonicalizeJson(gateReport), null, 2));
          console.log(`\n⚠️  BASELINE UPDATED: ${options.golden}`);
        }
      }
    }
  }
  
  return result;
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('Evidify Forensic Verifier v' + VERSION);
    console.log('');
    console.log('Usage: node verify-v1.1.cjs <pack-dir> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --schema <file>       Validate against JSON Schema');
    console.log('  --golden <file>       Compare against golden (deep compare)');
    console.log('  --baseline-update     Update golden file if different (CI gated)');
    console.log('  --json                Output results as JSON');
    console.log('');
    console.log('v1.1 Enhancements:');
    console.log('  - Hash verification using sentinel-based preimage');
    console.log('  - ID uniqueness check');
    console.log('  - Deep comparison of finding objects');
    process.exit(0);
  }
  
  // Parse arguments
  let packDir = null;
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schema' && args[i + 1]) {
      options.schema = args[++i];
    } else if (args[i] === '--golden' && args[i + 1]) {
      options.golden = args[++i];
    } else if (args[i] === '--baseline-update') {
      options.baselineUpdate = true;
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (!args[i].startsWith('-')) {
      packDir = args[i];
    }
  }
  
  if (!packDir) {
    console.error('Error: No pack directory specified');
    process.exit(2);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('EVIDIFY FORENSIC VERIFIER v' + VERSION);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Pack: ${packDir}`);
  console.log('');
  
  const result = verifyPack(packDir, options);
  
  // Print results
  console.log('Checks:');
  
  if (result.checks.files) {
    const icon = result.checks.files.pass ? '✅' : '❌';
    console.log(`  ${icon} Required files`);
    if (!result.checks.files.pass) {
      console.log(`     Missing: ${result.checks.files.missing.join(', ')}`);
    }
  }
  
  if (result.checks.auditChain) {
    const icon = result.checks.auditChain.valid ? '✅' : '❌';
    console.log(`  ${icon} Audit chain (${result.checks.auditChain.events} events)`);
    if (!result.checks.auditChain.valid) {
      for (const err of result.checks.auditChain.errors.slice(0, 3)) {
        console.log(`     ${err}`);
      }
    }
  }
  
  if (result.checks.canonicalHash) {
    const icon = result.checks.canonicalHash.valid ? '✅' : '❌';
    console.log(`  ${icon} Canonical hash verification`);
    if (!result.checks.canonicalHash.valid) {
      console.log(`     Claimed:  ${result.checks.canonicalHash.claimed}`);
      console.log(`     Computed: ${result.checks.canonicalHash.computed}`);
    }
  }
  
  if (result.checks.idUniqueness) {
    const icon = result.checks.idUniqueness.valid ? '✅' : '❌';
    console.log(`  ${icon} ID uniqueness`);
    if (!result.checks.idUniqueness.valid) {
      console.log(`     Duplicates: ${result.checks.idUniqueness.duplicates.join(', ')}`);
    }
  }
  
  if (result.checks.schema) {
    const icon = result.checks.schema.pass ? '✅' : '❌';
    console.log(`  ${icon} Schema validation`);
    if (!result.checks.schema.pass) {
      for (const err of result.checks.schema.errors.slice(0, 3)) {
        console.log(`     ${err}`);
      }
    }
  }
  
  if (result.checks.gates) {
    const status = result.checks.gates.status;
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '⚠️' : '❓';
    console.log(`  ${icon} Gate evaluation: ${status}`);
    console.log(`     Violations: ${result.checks.gates.violations}, Warnings: ${result.checks.gates.warnings}`);
  }
  
  if (result.checks.golden) {
    const icon = result.checks.golden.pass ? '✅' : '❌';
    console.log(`  ${icon} Golden comparison (deep)`);
    
    // Improved messaging for empty findings case
    const actualTotal = (result.checks.golden.added?.length || 0) + 
                        (result.checks.golden.removed?.length || 0) + 
                        (result.checks.golden.changed?.length || 0) + 
                        result.checks.golden.matched;
    
    if (actualTotal === 0) {
      console.log(`     Findings arrays empty in both actual and golden`);
      console.log(`     Canonical root fields compared: case_id, report_id, summary, gate_outcomes`);
    } else {
      console.log(`     Matched: ${result.checks.golden.matched} finding(s)`);
    }
    
    if (result.checks.golden.added.length > 0) {
      console.log(`     Added (${result.checks.golden.added.length}):`);
      for (const a of result.checks.golden.added.slice(0, 3)) {
        console.log(`       + ${a.finding.code} on ${a.finding.object?.id}`);
      }
    }
    
    if (result.checks.golden.removed.length > 0) {
      console.log(`     Removed (${result.checks.golden.removed.length}):`);
      for (const r of result.checks.golden.removed.slice(0, 3)) {
        console.log(`       - ${r.finding.code} on ${r.finding.object?.id}`);
      }
    }
    
    if (result.checks.golden.changed.length > 0) {
      console.log(`     Changed (${result.checks.golden.changed.length}):`);
      for (const c of result.checks.golden.changed.slice(0, 3)) {
        console.log(`       ~ ${c.id}: ${c.diffs.map(d => d.field).join(', ')}`);
      }
    }
    
    if (result.checks.golden.rootFieldDiffs && result.checks.golden.rootFieldDiffs.length > 0) {
      console.log(`     Root field differences (${result.checks.golden.rootFieldDiffs.length}):`);
      for (const d of result.checks.golden.rootFieldDiffs.slice(0, 5)) {
        console.log(`       ${d.field}: "${d.actual}" vs "${d.expected}"`);
      }
    }
    
    if (result.checks.golden.baselineUpdated) {
      console.log(`     ⚠️  Baseline file updated`);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (result.pass) {
    console.log('✅ VERIFICATION: PASS');
  } else {
    console.log('❌ VERIFICATION: FAIL');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (options.json) {
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(result, null, 2));
  }
  
  process.exit(result.pass ? 0 : 1);
}

main();
