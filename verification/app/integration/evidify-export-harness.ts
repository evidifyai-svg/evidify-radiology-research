/**
 * evidify-export-harness.ts
 * 
 * Integration module for Evidify Forensic app
 * Implements v1.1 canonical export requirements
 * 
 * Usage:
 *   import { ExportHarness } from './evidify-export-harness';
 *   const harness = new ExportHarness(caseData, auditLog);
 *   const result = await harness.exportAndVerify(outputDir);
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// CONSTANTS
// ============================================================================

const SCHEMA_VERSION = 'evidify.forensic.gate_report.v1';
const HASH_SENTINEL = '0'.repeat(64);
const EVIDIFY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const SEVERITY_RANK: Record<string, number> = { 
  'BLOCK': 0, 
  'WARN': 1, 
  'INFO': 2 
};

// ============================================================================
// TYPES
// ============================================================================

interface Finding {
  id?: string;
  gate_id: string;
  code: string;
  sub_code: string;
  severity: 'BLOCK' | 'WARN' | 'INFO';
  message: string;
  remediation_hint?: string;
  spec_reference?: string;
  object: {
    type: string;
    id: string;
  };
}

interface GateReport {
  schema_version: string;
  case_id: string;
  report_id: string;
  inputs_digest: {
    canonical_sha256: string;
    audit_head_sha256: string;
  };
  summary: {
    status: 'PASS' | 'FAIL';
    block_count: number;
    warn_count: number;
    info_count: number;
  };
  gate_outcomes: Record<string, 'PASS' | 'FAIL' | 'WARN'>;
  violations: Finding[];
  warnings: Finding[];
}

interface ExportResult {
  success: boolean;
  gateReport: GateReport;
  verificationPassed: boolean;
  errors: string[];
  outputPath: string;
}

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate UUIDv5 from namespace and name
 */
function uuidv5(namespace: string, name: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  
  const combined = Buffer.concat([namespaceBytes, nameBytes]);
  const hash = crypto.createHash('sha1').update(combined).digest();
  
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  
  const hex = hash.slice(0, 16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

/**
 * Generate stable finding ID from STRUCTURAL fields only (v1.1)
 * Does NOT include message - prevents ID churn on text changes
 */
function generateFindingId(finding: Finding): string {
  const parts = [
    finding.gate_id || '',
    finding.code || '',
    finding.sub_code || '',
    finding.severity || '',
    finding.object?.type || '',
    finding.object?.id || ''
    // NOTE: message intentionally excluded (v1.1)
  ];
  return uuidv5(EVIDIFY_NAMESPACE, parts.join('|'));
}

// ============================================================================
// CANONICALIZATION
// ============================================================================

/**
 * Recursively sort object keys for canonical JSON
 */
function canonicalizeJson(v: any): any {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(canonicalizeJson);
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    const out: Record<string, any> = {};
    for (const k of keys) {
      out[k] = canonicalizeJson(v[k]);
    }
    return out;
  }
  return v;
}

function canonicalStringify(v: any): string {
  return JSON.stringify(canonicalizeJson(v));
}

function canonicalSha256(v: any): string {
  return sha256(canonicalStringify(v));
}

/**
 * Compute canonical hash using sentinel-based preimage (v1.1)
 * 
 * Algorithm:
 * 1. Set inputs_digest.canonical_sha256 to 64 zeros
 * 2. Canonicalize and hash
 * 3. Return the hash (caller replaces sentinel)
 */
function computeCanonicalHash(report: GateReport): string {
  const preimage = JSON.parse(JSON.stringify(report));
  preimage.inputs_digest.canonical_sha256 = HASH_SENTINEL;
  return canonicalSha256(preimage);
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Sort findings deterministically
 * Order: severity → gate_id → code → sub_code → object.type → object.id → id
 */
function compareFinding(a: Finding, b: Finding): number {
  const sevA = SEVERITY_RANK[a.severity] ?? 99;
  const sevB = SEVERITY_RANK[b.severity] ?? 99;
  if (sevA !== sevB) return sevA - sevB;
  
  if (a.gate_id !== b.gate_id) return a.gate_id.localeCompare(b.gate_id);
  if (a.code !== b.code) return a.code.localeCompare(b.code);
  if (a.sub_code !== b.sub_code) return (a.sub_code || '').localeCompare(b.sub_code || '');
  
  const objTypeA = a.object?.type || '';
  const objTypeB = b.object?.type || '';
  if (objTypeA !== objTypeB) return objTypeA.localeCompare(objTypeB);
  
  const objIdA = a.object?.id || '';
  const objIdB = b.object?.id || '';
  if (objIdA !== objIdB) return objIdA.localeCompare(objIdB);
  
  return (a.id || '').localeCompare(b.id || '');
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(compareFinding);
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

/**
 * Validate gate report against schema
 * Returns array of error messages (empty = valid)
 */
function validateGateReport(report: GateReport): string[] {
  const errors: string[] = [];
  
  // Required fields
  if (report.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be "${SCHEMA_VERSION}"`);
  }
  if (!report.case_id) errors.push('case_id is required');
  if (!report.report_id) errors.push('report_id is required');
  
  // inputs_digest
  if (!report.inputs_digest) {
    errors.push('inputs_digest is required');
  } else {
    if (!report.inputs_digest.canonical_sha256?.match(/^[a-f0-9]{64}$/)) {
      errors.push('inputs_digest.canonical_sha256 must be 64-char hex');
    }
    if (!report.inputs_digest.audit_head_sha256?.match(/^[a-f0-9]{64}$/)) {
      errors.push('inputs_digest.audit_head_sha256 must be 64-char hex');
    }
  }
  
  // summary
  if (!report.summary) {
    errors.push('summary is required');
  } else {
    if (!['PASS', 'FAIL'].includes(report.summary.status)) {
      errors.push('summary.status must be PASS or FAIL');
    }
    if (typeof report.summary.block_count !== 'number') {
      errors.push('summary.block_count must be a number');
    }
  }
  
  // gate_outcomes
  if (!report.gate_outcomes || typeof report.gate_outcomes !== 'object') {
    errors.push('gate_outcomes is required');
  }
  
  // violations and warnings arrays
  if (!Array.isArray(report.violations)) {
    errors.push('violations must be an array');
  }
  if (!Array.isArray(report.warnings)) {
    errors.push('warnings must be an array');
  }
  
  // Validate each finding
  const validateFinding = (f: Finding, index: number, type: string) => {
    if (!f.id?.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)) {
      errors.push(`${type}[${index}].id must be valid UUID`);
    }
    if (!f.gate_id) errors.push(`${type}[${index}].gate_id is required`);
    if (!f.code) errors.push(`${type}[${index}].code is required`);
    if (!f.severity) errors.push(`${type}[${index}].severity is required`);
    if (!f.object?.type) errors.push(`${type}[${index}].object.type is required`);
    if (!f.object?.id) errors.push(`${type}[${index}].object.id is required`);
  };
  
  report.violations?.forEach((f, i) => validateFinding(f, i, 'violations'));
  report.warnings?.forEach((f, i) => validateFinding(f, i, 'warnings'));
  
  // Check for duplicate IDs
  const allIds = [
    ...(report.violations || []).map(f => f.id),
    ...(report.warnings || []).map(f => f.id)
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (id && seen.has(id)) {
      errors.push(`Duplicate finding ID: ${id}`);
    }
    if (id) seen.add(id);
  }
  
  return errors;
}

// ============================================================================
// EXPORT HARNESS CLASS
// ============================================================================

export class ExportHarness {
  private caseId: string;
  private reportId: string;
  private violations: Finding[] = [];
  private warnings: Finding[] = [];
  private gateOutcomes: Record<string, 'PASS' | 'FAIL' | 'WARN'> = {};
  private auditHeadHash: string;
  
  constructor(
    caseId: string,
    reportId: string,
    auditHeadHash: string
  ) {
    this.caseId = caseId;
    this.reportId = reportId;
    this.auditHeadHash = auditHeadHash;
  }
  
  /**
   * Add a finding (violation or warning)
   * ID is generated automatically from structural fields
   */
  addFinding(finding: Omit<Finding, 'id'>): void {
    const withId: Finding = {
      ...finding,
      id: generateFindingId(finding as Finding)
    };
    
    if (finding.severity === 'BLOCK') {
      this.violations.push(withId);
    } else {
      this.warnings.push(withId);
    }
  }
  
  /**
   * Set gate outcome
   */
  setGateOutcome(gateId: string, outcome: 'PASS' | 'FAIL' | 'WARN'): void {
    this.gateOutcomes[gateId] = outcome;
  }
  
  /**
   * Build the canonical gate report
   */
  buildReport(): GateReport {
    // Sort findings for determinism
    const sortedViolations = sortFindings(this.violations);
    const sortedWarnings = sortFindings(this.warnings);
    
    // Build report with sentinel
    const report: GateReport = {
      schema_version: SCHEMA_VERSION,
      case_id: this.caseId,
      report_id: this.reportId,
      inputs_digest: {
        canonical_sha256: HASH_SENTINEL,
        audit_head_sha256: this.auditHeadHash
      },
      summary: {
        status: sortedViolations.length === 0 ? 'PASS' : 'FAIL',
        block_count: sortedViolations.length,
        warn_count: sortedWarnings.filter(w => w.severity === 'WARN').length,
        info_count: sortedWarnings.filter(w => w.severity === 'INFO').length
      },
      gate_outcomes: this.gateOutcomes,
      violations: sortedViolations,
      warnings: sortedWarnings
    };
    
    // Compute and set canonical hash
    const hash = computeCanonicalHash(report);
    report.inputs_digest.canonical_sha256 = hash;
    
    return report;
  }
  
  /**
   * Export gate report to directory
   */
  export(outputDir: string): ExportResult {
    const errors: string[] = [];
    
    // Build report
    const report = this.buildReport();
    
    // Validate before writing
    const validationErrors = validateGateReport(report);
    if (validationErrors.length > 0) {
      return {
        success: false,
        gateReport: report,
        verificationPassed: false,
        errors: validationErrors,
        outputPath: outputDir
      };
    }
    
    // Create directories
    const verificationDir = path.join(outputDir, 'verification');
    fs.mkdirSync(verificationDir, { recursive: true });
    
    // Write canonical report
    const canonPath = path.join(verificationDir, 'gate_report.canon.json');
    fs.writeFileSync(
      canonPath,
      JSON.stringify(canonicalizeJson(report), null, 2)
    );
    
    // Write meta report
    const metaPath = path.join(verificationDir, 'gate_report.meta.json');
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        generated_at: new Date().toISOString(),
        gate_version: '1.1',
        engine_version: '1.1.0',
        hash_algorithm: 'sentinel-based-preimage-v1.1'
      }, null, 2)
    );
    
    return {
      success: true,
      gateReport: report,
      verificationPassed: true,
      errors: [],
      outputPath: outputDir
    };
  }
  
  /**
   * Export and verify in one step
   */
  exportAndVerify(outputDir: string): ExportResult {
    const result = this.export(outputDir);
    
    if (!result.success) {
      return result;
    }
    
    // Verify the exported report
    const canonPath = path.join(outputDir, 'verification', 'gate_report.canon.json');
    const loaded = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
    
    // Verify hash
    const claimedHash = loaded.inputs_digest.canonical_sha256;
    const computedHash = computeCanonicalHash(loaded);
    
    if (claimedHash !== computedHash) {
      result.verificationPassed = false;
      result.errors.push(`Hash mismatch: claimed ${claimedHash}, computed ${computedHash}`);
    }
    
    return result;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick export from raw gate evaluation results
 */
export function quickExport(
  caseId: string,
  reportId: string,
  auditHeadHash: string,
  violations: Omit<Finding, 'id'>[],
  warnings: Omit<Finding, 'id'>[],
  gateOutcomes: Record<string, 'PASS' | 'FAIL' | 'WARN'>,
  outputDir: string
): ExportResult {
  const harness = new ExportHarness(caseId, reportId, auditHeadHash);
  
  for (const v of violations) harness.addFinding(v);
  for (const w of warnings) harness.addFinding(w);
  for (const [gate, outcome] of Object.entries(gateOutcomes)) {
    harness.setGateOutcome(gate, outcome);
  }
  
  return harness.exportAndVerify(outputDir);
}

/**
 * Verify an existing export directory
 */
export function verifyExport(exportDir: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  const canonPath = path.join(exportDir, 'verification', 'gate_report.canon.json');
  
  if (!fs.existsSync(canonPath)) {
    return { valid: false, errors: ['gate_report.canon.json not found'] };
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
    
    // Schema validation
    const schemaErrors = validateGateReport(report);
    errors.push(...schemaErrors);
    
    // Hash verification
    const claimedHash = report.inputs_digest?.canonical_sha256;
    const computedHash = computeCanonicalHash(report);
    
    if (claimedHash !== computedHash) {
      errors.push(`Hash mismatch: claimed ${claimedHash}, computed ${computedHash}`);
    }
    
    // ID uniqueness
    const allIds = [
      ...(report.violations || []).map((f: Finding) => f.id),
      ...(report.warnings || []).map((f: Finding) => f.id)
    ];
    const seen = new Set<string>();
    for (const id of allIds) {
      if (seen.has(id)) {
        errors.push(`Duplicate ID: ${id}`);
      }
      seen.add(id);
    }
    
  } catch (e) {
    errors.push(`Failed to parse: ${e}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  generateFindingId,
  computeCanonicalHash,
  canonicalizeJson,
  canonicalStringify,
  validateGateReport,
  sortFindings,
  SCHEMA_VERSION,
  HASH_SENTINEL,
  EVIDIFY_NAMESPACE
};

export type { Finding, GateReport, ExportResult };
