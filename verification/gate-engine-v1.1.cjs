#!/usr/bin/env node
/**
 * gate-engine-v1.1.cjs - Canonical Gate Evaluation Engine
 * 
 * Version: 1.1
 * 
 * CHANGES FROM v1.0:
 * - FIX A: Canonical hash uses sentinel-based preimage (no self-reference)
 * - FIX B: Stable IDs exclude message (structural fields only)
 * - FIX C: RFC8785-aware canonicalization notes
 * 
 * Outputs:
 *   gate_report.canon.json - Deterministic, verifiable
 *   gate_report.meta.json  - Runtime metadata
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GATE_VERSION = '1.1';
const SCHEMA_VERSION = 'evidify.forensic.gate_report.v1';

// Sentinel for canonical hash computation (FIX A)
const HASH_SENTINEL = '0'.repeat(64);

// UUIDv5 namespace
const EVIDIFY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate UUIDv5 from namespace and name
 */
function uuidv5(namespace, name) {
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
 * Generate stable finding ID from STRUCTURAL fields only (FIX B)
 * 
 * v1.1: Does NOT include message - only structural identity
 */
function generateFindingId(finding) {
  const parts = [
    finding.gate_id || '',
    finding.code || '',
    finding.sub_code || '',
    finding.severity || '',
    finding.object?.type || '',
    finding.object?.id || ''
    // NOTE: message intentionally excluded (v1.1 fix)
  ];
  return uuidv5(EVIDIFY_NAMESPACE, parts.join('|'));
}

// ============================================================================
// CANONICALIZATION (RFC8785-aware for future-proofing)
// ============================================================================

/**
 * Recursively sort object keys and canonicalize
 * 
 * NOTE: This implementation handles strings and integers correctly.
 * For floats, RFC8785 requires specific formatting. Gate reports
 * should avoid floats; if needed, upgrade to full RFC8785.
 */
function canonicalizeJson(v) {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(canonicalizeJson);
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    const out = {};
    for (const k of keys) {
      out[k] = canonicalizeJson(v[k]);
    }
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

/**
 * Compute canonical hash using sentinel-based preimage (FIX A)
 */
function computeCanonicalHash(report) {
  // Deep clone
  const preimage = JSON.parse(JSON.stringify(report));
  
  // Set sentinel value
  preimage.inputs_digest.canonical_sha256 = HASH_SENTINEL;
  
  // Compute hash of preimage
  return canonicalSha256(preimage);
}

// ============================================================================
// FINDING SORTING
// ============================================================================

const SEVERITY_RANK = { 'BLOCK': 0, 'WARN': 1, 'INFO': 2 };

function compareFinding(a, b) {
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
  
  return a.id.localeCompare(b.id);
}

// ============================================================================
// FILE LOADERS
// ============================================================================

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
// GATE EVALUATORS
// ============================================================================

function evaluateGate001(canonical, auditLog) {
  const result = { pass: true, checked: 0, findings: [] };
  const opinions = canonical.opinions || [];
  result.checked = opinions.length;
  
  for (const opinion of opinions) {
    const opinionId = opinion.opinion_id || opinion.id || 'unknown';
    
    if (!opinion.supporting_anchors || opinion.supporting_anchors.length === 0) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-001',
        code: 'OPINION_NO_BASIS',
        sub_code: 'NO_SUPPORTING_ANCHORS',
        severity: 'BLOCK',
        message: `Opinion ${opinionId} has no supporting anchors`,
        remediation_hint: 'Link opinion to at least one supporting claim',
        spec_reference: 'GATES_SPEC_v1.md#gate-001',
        object: { type: 'opinion', id: opinionId }
      });
    }
    
    if (opinion.contradictory_anchors === undefined && !opinion.none_found_assertion) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-001',
        code: 'OPINION_NO_BASIS',
        sub_code: 'NO_CONTRADICTORY_CHECK',
        severity: 'BLOCK',
        message: `Opinion ${opinionId} missing contradictory anchors field`,
        remediation_hint: 'Add contradictory_anchors[] or set none_found_assertion=true',
        spec_reference: 'GATES_SPEC_v1.md#gate-001',
        object: { type: 'opinion', id: opinionId }
      });
    }
    
    if (!opinion.reasoning_narrative) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-001',
        code: 'OPINION_NO_BASIS',
        sub_code: 'NO_REASONING',
        severity: 'BLOCK',
        message: `Opinion ${opinionId} missing reasoning narrative`,
        remediation_hint: 'Provide reasoning explaining how evidence supports opinion',
        spec_reference: 'GATES_SPEC_v1.md#gate-001',
        object: { type: 'opinion', id: opinionId }
      });
    }
    
    if (!opinion.what_would_change) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-001',
        code: 'OPINION_NO_BASIS',
        sub_code: 'NO_CHANGE_CONDITION',
        severity: 'BLOCK',
        message: `Opinion ${opinionId} missing what_would_change field`,
        remediation_hint: 'State what evidence would change this opinion',
        spec_reference: 'GATES_SPEC_v1.md#gate-001',
        object: { type: 'opinion', id: opinionId }
      });
    }
  }
  
  // Check audit log if no opinions in canonical
  if (opinions.length === 0) {
    const opinionEvents = auditLog.filter(e => e.action === 'OPINION_DRAFTED');
    result.checked = opinionEvents.length;
    
    for (const event of opinionEvents) {
      const opinionId = event.details?.opinion_id || 'unknown';
      if (!event.details?.supporting_anchors || event.details.supporting_anchors.length === 0) {
        result.pass = false;
        result.findings.push({
          gate_id: 'GATE-001',
          code: 'OPINION_NO_BASIS',
          sub_code: 'NO_SUPPORTING_ANCHORS',
          severity: 'BLOCK',
          message: `Opinion ${opinionId} has no supporting anchors in audit log`,
          remediation_hint: 'Link opinion to at least one supporting claim',
          spec_reference: 'GATES_SPEC_v1.md#gate-001',
          object: { type: 'opinion', id: opinionId }
        });
      }
    }
  }
  
  return result;
}

function evaluateGate002(canonical, auditLog) {
  const result = { pass: true, checked: 0, findings: [] };
  const limitations = canonical.limitations || [];
  result.checked = limitations.length;
  
  for (const lim of limitations) {
    const limId = lim.limitation_id || lim.id || 'unknown';
    
    if (!lim.addressed_status) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-002',
        code: 'LIMITATIONS_INCOMPLETE',
        sub_code: 'LIMITATIONS_NO_STATUS',
        severity: 'BLOCK',
        message: `Limitation ${limId} has no addressed_status`,
        remediation_hint: 'Set addressed_status to "addressed", "acknowledged", or "mitigated"',
        spec_reference: 'GATES_SPEC_v1.md#gate-002',
        object: { type: 'limitation', id: limId }
      });
    }
    
    if (!lim.impact && !lim.text) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-002',
        code: 'LIMITATIONS_INCOMPLETE',
        sub_code: 'LIMITATIONS_NO_IMPACT',
        severity: 'BLOCK',
        message: `Limitation ${limId} has no impact statement`,
        remediation_hint: 'Document how this limitation affects conclusions',
        spec_reference: 'GATES_SPEC_v1.md#gate-002',
        object: { type: 'limitation', id: limId }
      });
    }
  }
  
  return result;
}

function evaluateGate003(canonical, auditLog) {
  const result = { pass: true, checked: 0, findings: [] };
  
  const aiGenerations = auditLog.filter(e => e.action === 'AI_GENERATION');
  const humanReviews = auditLog.filter(e => e.action === 'HUMAN_REVIEW');
  
  result.checked = aiGenerations.length;
  
  for (const gen of aiGenerations) {
    const genId = gen.details?.generation_id || 'unknown';
    const review = humanReviews.find(r => r.details?.generation_id === genId);
    
    if (!review) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-003',
        code: 'AI_RELIANCE_NO_APPROVAL',
        sub_code: 'AI_NO_HUMAN_REVIEW',
        severity: 'BLOCK',
        message: `AI generation ${genId} has no human review event`,
        remediation_hint: 'Review and approve/reject AI generation before export',
        spec_reference: 'GATES_SPEC_v1.md#gate-003',
        object: { type: 'ai_generation', id: genId }
      });
    } else if (!['approve', 'approve_with_edits', 'partial_accept', 'reject'].includes(review.details?.action)) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-003',
        code: 'AI_RELIANCE_NO_APPROVAL',
        sub_code: 'AI_REVIEW_INCOMPLETE',
        severity: 'BLOCK',
        message: `AI generation ${genId} review action "${review.details?.action}" is not valid`,
        remediation_hint: 'Complete review with approve, approve_with_edits, or reject',
        spec_reference: 'GATES_SPEC_v1.md#gate-003',
        object: { type: 'ai_generation', id: genId }
      });
    }
  }
  
  return result;
}

function evaluateGate004(canonical, auditLog) {
  const result = { pass: true, checked: 0, findings: [] };
  
  const contradictions = canonical.contradictions || [];
  const resolutions = auditLog.filter(e => e.action === 'CONTRADICTION_RESOLUTION');
  
  const resolved = new Set();
  for (const res of resolutions) {
    (res.details?.claims || []).forEach(c => resolved.add(c));
    if (res.details?.contradiction_id) resolved.add(res.details.contradiction_id);
  }
  
  result.checked = contradictions.length;
  
  for (const contra of contradictions) {
    const contraId = contra.id || `${contra.claim_a}-${contra.claim_b}`;
    const status = contra.status || contra.resolution_status;
    
    if (status === 'detected' || status === 'under_review' || !status) {
      const isResolved = resolved.has(contra.claim_a) || resolved.has(contra.claim_b) || resolved.has(contraId);
      
      if (!isResolved) {
        result.pass = false;
        result.findings.push({
          gate_id: 'GATE-004',
          code: 'CONTRADICTION_UNRESOLVED',
          sub_code: 'CONTRADICTION_NO_RESOLUTION',
          severity: 'BLOCK',
          message: `Contradiction ${contraId} (${contra.claim_a} vs ${contra.claim_b}) is unresolved`,
          remediation_hint: 'Provide resolution narrative or mark as unresolved_disclosed with limitation entry',
          spec_reference: 'GATES_SPEC_v1.md#gate-004',
          object: { type: 'contradiction', id: contraId }
        });
      }
    }
  }
  
  return result;
}

function evaluateGate005(canonical, auditLog) {
  const result = { pass: true, checked: 0, findings: [] };
  
  const evidenceInventory = canonical.evidence_inventory || [];
  const claims = canonical.claims || [];
  const evidenceIds = new Set(evidenceInventory.map(e => e.evidence_id || e.id));
  
  result.checked = claims.length + evidenceInventory.length;
  
  for (const claim of claims) {
    const refs = claim.evidence_refs || [];
    for (const ref of refs) {
      if (!evidenceIds.has(ref)) {
        result.findings.push({
          gate_id: 'GATE-005',
          code: 'EVIDENCE_INVENTORY_GAP',
          sub_code: 'EVIDENCE_REF_NOT_FOUND',
          severity: 'WARN',
          message: `Claim ${claim.claim_id} references non-existent evidence ${ref}`,
          remediation_hint: 'Add missing evidence to inventory or update claim reference',
          object: { type: 'claim', id: claim.claim_id }
        });
      }
    }
  }
  
  for (const ev of evidenceInventory) {
    if (!ev.sha256) {
      result.findings.push({
        gate_id: 'GATE-005',
        code: 'EVIDENCE_INVENTORY_GAP',
        sub_code: 'EVIDENCE_NO_HASH',
        severity: 'WARN',
        message: `Evidence ${ev.evidence_id || ev.id} has no SHA-256 hash`,
        remediation_hint: 'Compute hash for evidence file',
        object: { type: 'evidence', id: ev.evidence_id || ev.id }
      });
    }
  }
  
  return result;
}

function evaluateGate006(canonical, auditLog) {
  const result = { pass: true, checked: 0, findings: [] };
  
  const ultimateKeywords = ['ultimate', 'recommendation', 'custody', 'competency', 'diagnosis', 'disability'];
  const aiGenerations = auditLog.filter(e => e.action === 'AI_GENERATION');
  const humanReviews = auditLog.filter(e => e.action === 'HUMAN_REVIEW');
  const gateEvents = auditLog.filter(e => 
    e.action === 'WORKFLOW_GATE_TRIGGERED' && e.details?.gate === 'ultimate_issue_attempted'
  );
  
  for (const gen of aiGenerations) {
    const genId = gen.details?.generation_id;
    const promptType = gen.details?.prompt_type || '';
    const section = gen.details?.section || '';
    
    const isUltimate = promptType === 'opinion_draft' && 
      ultimateKeywords.some(kw => section.toLowerCase().includes(kw));
    
    if (isUltimate) {
      result.checked++;
      const review = humanReviews.find(r => r.details?.generation_id === genId);
      const gateFired = gateEvents.some(g => g.details?.generation_id === genId);
      
      if (!review || !['approve', 'reject'].includes(review.details?.action)) {
        if (!gateFired) {
          result.pass = false;
          result.findings.push({
            gate_id: 'GATE-006',
            code: 'ULTIMATE_ISSUE_AI_GENERATED',
            sub_code: 'NO_GATE_TRIGGER',
            severity: 'BLOCK',
            message: `AI generation ${genId} attempted ultimate issue without gate trigger`,
            remediation_hint: 'Ultimate issue opinions must be human-authored or explicitly approved',
            spec_reference: 'GATES_SPEC_v1.md#gate-006',
            object: { type: 'ai_generation', id: genId }
          });
        }
      }
    }
  }
  
  for (const gate of gateEvents) {
    result.checked++;
    const genId = gate.details?.generation_id;
    const review = humanReviews.find(r => r.details?.generation_id === genId);
    
    if (!review) {
      result.pass = false;
      result.findings.push({
        gate_id: 'GATE-006',
        code: 'ULTIMATE_ISSUE_AI_GENERATED',
        sub_code: 'NO_HUMAN_REVIEW',
        severity: 'BLOCK',
        message: `Ultimate issue gate triggered for ${genId} but no human review found`,
        remediation_hint: 'Review and explicitly approve or reject the AI-generated ultimate issue',
        spec_reference: 'GATES_SPEC_v1.md#gate-006',
        object: { type: 'ai_generation', id: genId }
      });
    }
  }
  
  return result;
}

function evaluateGate007(canonical, auditLog) {
  const result = { pass: true, checked: 1, findings: [] };
  const metadata = canonical.report_metadata || {};
  
  if (!metadata.evaluator_role) {
    result.findings.push({
      gate_id: 'GATE-007',
      code: 'ROLE_SCOPE_MISSING',
      sub_code: 'ROLE_MISSING',
      severity: 'WARN',
      message: 'Report metadata missing evaluator_role',
      remediation_hint: 'Add evaluator role statement to report',
      object: { type: 'report_metadata', id: 'evaluator_role' }
    });
  }
  
  if (!metadata.referral_question) {
    result.findings.push({
      gate_id: 'GATE-007',
      code: 'ROLE_SCOPE_MISSING',
      sub_code: 'REFERRAL_QUESTION_MISSING',
      severity: 'WARN',
      message: 'Report metadata missing referral_question',
      remediation_hint: 'Add referral question from requesting party',
      object: { type: 'report_metadata', id: 'referral_question' }
    });
  }
  
  if (!metadata.scope_of_evaluation) {
    result.findings.push({
      gate_id: 'GATE-007',
      code: 'ROLE_SCOPE_MISSING',
      sub_code: 'SCOPE_MISSING',
      severity: 'WARN',
      message: 'Report metadata missing scope_of_evaluation',
      remediation_hint: 'Define scope boundaries explicitly',
      object: { type: 'report_metadata', id: 'scope_of_evaluation' }
    });
  }
  
  return result;
}

// ============================================================================
// MAIN EVALUATOR
// ============================================================================

function evaluateGates(packDir) {
  // Load canonical.json
  const canonicalPaths = [
    path.join(packDir, 'canonical/canonical.json'),
    path.join(packDir, 'canonical.json'),
  ];
  
  let canonical = null;
  let canonicalPath = null;
  for (const cp of canonicalPaths) {
    canonical = loadJson(cp);
    if (canonical) { canonicalPath = cp; break; }
  }
  
  if (!canonical) {
    return { error: 'canonical.json not found' };
  }
  
  // Load audit log and digest
  const auditLogPath = path.join(packDir, 'audit/audit.log');
  const auditLog = loadNdjson(auditLogPath);
  const digestPath = path.join(packDir, 'audit/audit_digest.json');
  const digest = loadJson(digestPath);
  
  // Compute input digests
  const canonicalContent = fs.readFileSync(canonicalPath, 'utf8');
  const inputCanonicalSha256 = sha256(canonicalContent);
  const auditHeadSha256 = digest?.expected_digest?.final_chain_hash || 
    (auditLog.length > 0 ? auditLog[auditLog.length - 1].chain_hash : '0'.repeat(64));
  
  // Evaluate all gates
  const gate001 = evaluateGate001(canonical, auditLog);
  const gate002 = evaluateGate002(canonical, auditLog);
  const gate003 = evaluateGate003(canonical, auditLog);
  const gate004 = evaluateGate004(canonical, auditLog);
  const gate005 = evaluateGate005(canonical, auditLog);
  const gate006 = evaluateGate006(canonical, auditLog);
  const gate007 = evaluateGate007(canonical, auditLog);
  
  // Collect all findings
  const allFindings = [
    ...gate001.findings,
    ...gate002.findings,
    ...gate003.findings,
    ...gate004.findings,
    ...gate005.findings,
    ...gate006.findings,
    ...gate007.findings,
  ];
  
  // Add stable IDs to all findings (v1.1: without message)
  for (const f of allFindings) {
    f.id = generateFindingId(f);
  }
  
  // Split by severity
  const violations = allFindings.filter(f => f.severity === 'BLOCK');
  const warnings = allFindings.filter(f => f.severity === 'WARN' || f.severity === 'INFO');
  
  // Sort for determinism
  violations.sort(compareFinding);
  warnings.sort(compareFinding);
  
  // Determine gate outcomes
  const gateOutcomes = {
    'GATE-001': gate001.pass ? 'PASS' : 'FAIL',
    'GATE-002': gate002.pass ? 'PASS' : 'FAIL',
    'GATE-003': gate003.pass ? 'PASS' : 'FAIL',
    'GATE-004': gate004.pass ? 'PASS' : 'FAIL',
    'GATE-005': gate005.pass ? (gate005.findings.length > 0 ? 'WARN' : 'PASS') : 'FAIL',
    'GATE-006': gate006.pass ? 'PASS' : 'FAIL',
    'GATE-007': gate007.pass ? (gate007.findings.length > 0 ? 'WARN' : 'PASS') : 'FAIL',
  };
  
  // Build canonical report (FIX A: use sentinel for self-hash)
  const canonReport = {
    schema_version: SCHEMA_VERSION,
    case_id: canonical.case_id || 'unknown',
    report_id: canonical.report_id || 'unknown',
    inputs_digest: {
      canonical_sha256: HASH_SENTINEL,  // Placeholder - will be computed
      audit_head_sha256: auditHeadSha256
    },
    summary: {
      status: violations.length === 0 ? 'PASS' : 'FAIL',
      block_count: violations.length,
      warn_count: warnings.filter(w => w.severity === 'WARN').length,
      info_count: warnings.filter(w => w.severity === 'INFO').length
    },
    gate_outcomes: gateOutcomes,
    violations: violations,
    warnings: warnings
  };
  
  // Compute canonical hash using sentinel-based preimage (FIX A)
  const computedHash = computeCanonicalHash(canonReport);
  canonReport.inputs_digest.canonical_sha256 = computedHash;
  
  // Build meta report (volatile data)
  const metaReport = {
    generated_at: new Date().toISOString(),
    gate_version: GATE_VERSION,
    engine_version: '1.1.0',
    pack_dir: packDir,
    hash_algorithm: 'sentinel-based-preimage-v1.1',
    checks_performed: {
      'GATE-001': gate001.checked,
      'GATE-002': gate002.checked,
      'GATE-003': gate003.checked,
      'GATE-004': gate004.checked,
      'GATE-005': gate005.checked,
      'GATE-006': gate006.checked,
      'GATE-007': gate007.checked,
    }
  };
  
  return { canon: canonReport, meta: metaReport };
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node gate-engine-v1.1.cjs <pack-dir>');
    console.log('');
    console.log('v1.1 Changes:');
    console.log('  - Canonical hash uses sentinel-based preimage');
    console.log('  - Stable IDs exclude message (structural only)');
    process.exit(0);
  }
  
  const packDir = args[0];
  
  if (!fs.existsSync(packDir)) {
    console.error(`Error: Pack directory not found: ${packDir}`);
    process.exit(2);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('CANONICAL GATE EVALUATION ENGINE v1.1');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Pack: ${packDir}`);
  console.log('');
  
  const result = evaluateGates(packDir);
  
  if (result.error) {
    console.error(`Error: ${result.error}`);
    process.exit(2);
  }
  
  const { canon, meta } = result;
  
  // Print summary
  console.log('Gate Outcomes:');
  for (const [gateId, outcome] of Object.entries(canon.gate_outcomes)) {
    const icon = outcome === 'PASS' ? '✅' : outcome === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${gateId}: ${icon} ${outcome}`);
  }
  
  console.log('');
  console.log(`Violations: ${canon.summary.block_count}`);
  console.log(`Warnings: ${canon.summary.warn_count}`);
  
  if (canon.violations.length > 0) {
    console.log('');
    console.log('Blocking Violations:');
    for (const v of canon.violations) {
      console.log(`  - [${v.gate_id}] ${v.code}: ${v.message}`);
      console.log(`    ID: ${v.id}`);
    }
  }
  
  console.log('');
  if (canon.summary.status === 'PASS') {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ OVERALL: PASS - Export allowed');
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('❌ OVERALL: FAIL - Export BLOCKED');
    console.log('═══════════════════════════════════════════════════════════════');
  }
  
  console.log(`\nCanonical Report SHA-256: ${canon.inputs_digest.canonical_sha256}`);
  console.log(`(Computed using sentinel-based preimage)`);
  
  // Write outputs
  const verifyDir = path.join(packDir, 'verification');
  if (!fs.existsSync(verifyDir)) {
    fs.mkdirSync(verifyDir, { recursive: true });
  }
  
  const canonPath = path.join(verifyDir, 'gate_report.canon.json');
  const metaPath = path.join(verifyDir, 'gate_report.meta.json');
  
  fs.writeFileSync(canonPath, JSON.stringify(canonicalizeJson(canon), null, 2));
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  
  console.log(`\nCanonical report: ${canonPath}`);
  console.log(`Meta report: ${metaPath}`);
  
  process.exit(canon.summary.status === 'PASS' ? 0 : 1);
}

main();
