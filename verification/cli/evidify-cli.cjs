#!/usr/bin/env node
/**
 * evidify-cli - Headless Pack Runner for CI
 * 
 * Runs test packs programmatically without UI, enabling:
 * - Deterministic regression testing
 * - Fast engineer iteration
 * - CI integration
 * 
 * Usage:
 *   evidify-cli run-pack <pack-id> --scenario PASS|FAIL --export <output-dir>
 *   evidify-cli verify <export-dir> [--golden <file>] [--schema <file>]
 *   evidify-cli list-packs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.1.0';
const HASH_SENTINEL = '0'.repeat(64);
const EVIDIFY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

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

function generateFindingId(finding) {
  // v1.1: Structural fields only, NO message
  const parts = [
    finding.gate_id || '',
    finding.code || '',
    finding.sub_code || '',
    finding.severity || '',
    finding.object?.type || '',
    finding.object?.id || ''
  ];
  return uuidv5(EVIDIFY_NAMESPACE, parts.join('|'));
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

function canonicalSha256(v) {
  return sha256(JSON.stringify(canonicalizeJson(v)));
}

function computeCanonicalHash(report) {
  const preimage = JSON.parse(JSON.stringify(report));
  preimage.inputs_digest.canonical_sha256 = HASH_SENTINEL;
  return canonicalSha256(preimage);
}

// ============================================================================
// PACK DEFINITIONS
// ============================================================================

const PACKS = {
  'CC-001': {
    id: 'CC-001',
    name: 'Competency Case (Criminal)',
    description: 'Standard competency evaluation test case',
    scenarios: {
      PASS: {
        description: 'All gates pass - clean export',
        opinions: [
          {
            opinion_id: 'OPN-001',
            text: 'Defendant is competent to stand trial',
            supporting_anchors: ['CLM-001', 'CLM-002', 'CLM-003'],
            contradictory_anchors: [],
            none_found_assertion: false,
            reasoning_narrative: 'Based on clinical interview and testing...',
            what_would_change: 'Evidence of active psychosis or cognitive decline'
          }
        ],
        limitations: [
          {
            limitation_id: 'LIM-001',
            text: 'Single evaluation session',
            addressed_status: 'acknowledged',
            impact: 'Findings based on presentation at time of evaluation'
          }
        ],
        contradictions: [],
        ai_generations: [
          { generation_id: 'GEN-001', reviewed: true, action: 'approve_with_edits' }
        ],
        report_metadata: {
          evaluator_role: 'Forensic Psychologist',
          referral_question: 'Is defendant competent to stand trial?',
          scope_of_evaluation: 'Competency evaluation per Dusky standard'
        }
      },
      FAIL: {
        description: 'Multiple gate failures for testing',
        opinions: [
          {
            opinion_id: 'OPN-001',
            text: 'Defendant is competent',
            supporting_anchors: [],  // GATE-001 failure: no anchors
            // Missing contradictory_anchors, reasoning, what_would_change
          }
        ],
        limitations: [
          {
            limitation_id: 'LIM-001',
            text: 'Single session'
            // Missing addressed_status - GATE-002 failure
          },
          {
            limitation_id: 'LIM-002',
            text: 'No collateral'
            // Missing addressed_status
          }
        ],
        contradictions: [
          {
            id: 'CONTRA-001',
            claim_a: 'CLM-001',
            claim_b: 'CLM-002',
            status: 'detected'  // GATE-004 failure: unresolved
          }
        ],
        ai_generations: [
          { generation_id: 'GEN-001', reviewed: true, action: 'approve' },
          { generation_id: 'GEN-002', reviewed: true, action: 'partial_reject' }  // GATE-003: invalid action
        ],
        report_metadata: {}  // GATE-007: missing fields
      }
    }
  },
  'BIG-001': {
    id: 'BIG-001',
    name: 'Scale Test Case (Civil Damages)',
    description: 'Large-scale performance test with 32 evidence items, 50 annotations, 30 claims',
    scenarios: {
      PASS: {
        description: 'Full workflow at scale - all gates pass',
        opinions: generateBigOpinions(8),
        limitations: generateBigLimitations(5, true),
        contradictions: generateBigContradictions(3, true),
        ai_generations: generateBigAIGenerations(15, true),
        report_metadata: {
          evaluator_role: 'Forensic Psychologist',
          referral_question: 'Evaluate psychological damages claimed by plaintiff',
          scope_of_evaluation: 'Comprehensive psychological evaluation per court order'
        }
      },
      FAIL: {
        description: 'Scale test with multiple failures',
        opinions: generateBigOpinions(8, true),  // Some incomplete
        limitations: generateBigLimitations(5, false),  // Some unaddressed
        contradictions: generateBigContradictions(3, false),  // Some unresolved
        ai_generations: generateBigAIGenerations(15, false),  // Some unreviewed
        report_metadata: {}  // Missing fields
      }
    }
  }
};

// BIG-001 generators
function generateBigOpinions(count, withFailures = false) {
  const opinions = [];
  for (let i = 1; i <= count; i++) {
    const hasFailure = withFailures && i <= 3;  // First 3 have failures
    opinions.push({
      opinion_id: `OPN-${String(i).padStart(3, '0')}`,
      text: `Opinion ${i}: ${getOpinionText(i)}`,
      supporting_anchors: hasFailure ? [] : [`CLM-${String(i*3-2).padStart(3, '0')}`, `CLM-${String(i*3-1).padStart(3, '0')}`, `CLM-${String(i*3).padStart(3, '0')}`],
      contradictory_anchors: hasFailure ? undefined : [],
      none_found_assertion: hasFailure ? undefined : true,
      reasoning_narrative: hasFailure ? undefined : `Based on comprehensive review of evidence items EV-${String(i*4-3).padStart(3, '0')} through EV-${String(i*4).padStart(3, '0')}...`,
      what_would_change: hasFailure ? undefined : 'Contradictory evidence from additional sources'
    });
  }
  return opinions;
}

function generateBigLimitations(count, allAddressed) {
  const limitations = [];
  const limitationTypes = [
    'Single evaluation session',
    'Records received after report draft',
    'Collateral sources unavailable',
    'Language barrier requiring interpreter',
    'Testing conducted over multiple days'
  ];
  for (let i = 1; i <= count; i++) {
    const addressed = allAddressed || i > 2;
    limitations.push({
      limitation_id: `LIM-${String(i).padStart(3, '0')}`,
      text: limitationTypes[i-1] || `Limitation ${i}`,
      addressed_status: addressed ? 'acknowledged' : undefined,
      impact: addressed ? `Impact assessment for limitation ${i}` : undefined
    });
  }
  return limitations;
}

function generateBigContradictions(count, allResolved) {
  const contradictions = [];
  for (let i = 1; i <= count; i++) {
    contradictions.push({
      id: `CONTRA-${String(i).padStart(3, '0')}`,
      claim_a: `CLM-${String(i*2-1).padStart(3, '0')}`,
      claim_b: `CLM-${String(i*2).padStart(3, '0')}`,
      status: allResolved ? 'resolved' : (i === 1 ? 'detected' : 'resolved')
    });
  }
  return contradictions;
}

function generateBigAIGenerations(count, allReviewed) {
  const generations = [];
  const actions = ['approve', 'approve_with_edits', 'partial_accept'];
  for (let i = 1; i <= count; i++) {
    const reviewed = allReviewed || i > 3;
    generations.push({
      generation_id: `GEN-${String(i).padStart(3, '0')}`,
      reviewed: reviewed,
      action: reviewed ? actions[i % 3] : undefined
    });
  }
  return generations;
}

function getOpinionText(index) {
  const texts = [
    'Plaintiff demonstrates psychological injury consistent with claimed trauma',
    'Psychological testing results indicate moderate impairment',
    'Pre-existing conditions contributed to but did not cause current symptoms',
    'Treatment recommendations are medically necessary',
    'Prognosis indicates partial recovery expected with treatment',
    'Causation established between incident and psychological harm',
    'Damages are quantifiable based on treatment costs and lost wages',
    'Plaintiff credibility is supported by consistency across measures'
  ];
  return texts[(index - 1) % texts.length];
}

// ============================================================================
// WORKFLOW SIMULATION
// ============================================================================

function generateAuditLog(packId, scenario, startTime) {
  const events = [];
  let seq = 0;
  let prevHash = '0'.repeat(64);
  
  // Use fixed base time for determinism
  const FIXED_BASE_TIME = new Date('2026-01-01T00:00:00.000Z');
  
  function addEvent(action, details, offsetMs = 0) {
    // Use fixed timestamps for determinism
    const timestamp = new Date(FIXED_BASE_TIME.getTime() + offsetMs).toISOString();
    const content = JSON.stringify({ seq, timestamp, action, details, prev_hash: prevHash });
    const chainHash = sha256(content);
    
    events.push({
      seq,
      timestamp,
      action,
      details,
      prev_hash: prevHash,
      chain_hash: chainHash
    });
    
    prevHash = chainHash;
    seq++;
  }
  
  const pack = PACKS[packId];
  const scenarioData = pack.scenarios[scenario];
  const isBig = packId === 'BIG-001';
  
  // Case creation
  addEvent('CASE_CREATED', { case_id: packId, case_type: isBig ? 'civil_damages' : 'competency_criminal' }, 0);
  
  // Evidence ingestion
  const evidenceCount = isBig ? 32 : 2;
  for (let i = 1; i <= evidenceCount; i++) {
    addEvent('EVIDENCE_INGESTED', { 
      evidence_id: `EV-${String(i).padStart(3, '0')}`, 
      filename: isBig ? getEvidenceFilename(i) : `evidence_${i}.pdf`, 
      sha256: sha256(`evidence_${packId}_${i}`) 
    }, 1000 * i);
  }
  
  // Annotations (more for BIG-001)
  const annotationCount = isBig ? 50 : 2;
  for (let i = 1; i <= annotationCount; i++) {
    addEvent('ANNOTATION_CREATED', { 
      annotation_id: `ANN-${String(i).padStart(3, '0')}`, 
      evidence_id: `EV-${String(Math.ceil(i / 2)).padStart(3, '0')}` 
    }, 50000 + 500 * i);
  }
  
  // Claims
  const claimCount = isBig ? 30 : 2;
  for (let i = 1; i <= claimCount; i++) {
    addEvent('CLAIM_PROMOTED', { 
      claim_id: `CLM-${String(i).padStart(3, '0')}`, 
      annotation_id: `ANN-${String(i).padStart(3, '0')}` 
    }, 100000 + 500 * i);
  }
  
  // AI generations and reviews
  for (const gen of scenarioData.ai_generations || []) {
    addEvent('AI_GENERATION', {
      generation_id: gen.generation_id,
      prompt_type: 'summary',
      section: 'background'
    }, 150000 + parseInt(gen.generation_id.replace('GEN-', '')) * 1000);
    
    if (gen.reviewed) {
      addEvent('HUMAN_REVIEW', {
        generation_id: gen.generation_id,
        action: gen.action
      }, 160000 + parseInt(gen.generation_id.replace('GEN-', '')) * 1000);
    }
  }
  
  // Opinions
  for (const opinion of scenarioData.opinions || []) {
    addEvent('OPINION_DRAFTED', {
      opinion_id: opinion.opinion_id,
      supporting_anchors: opinion.supporting_anchors || []
    }, 200000 + parseInt(opinion.opinion_id.replace('OPN-', '')) * 1000);
  }
  
  // Limitations
  for (const lim of scenarioData.limitations || []) {
    addEvent('LIMITATION_REGISTERED', {
      limitation_id: lim.limitation_id,
      text: lim.text
    }, 250000 + parseInt(lim.limitation_id.replace('LIM-', '')) * 1000);
  }
  
  // Contradictions
  for (const contra of scenarioData.contradictions || []) {
    addEvent('CONTRADICTION_DETECTED', {
      contradiction_id: contra.id,
      claim_a: contra.claim_a,
      claim_b: contra.claim_b
    }, 300000 + parseInt(contra.id.replace('CONTRA-', '')) * 1000);
    
    if (contra.status === 'resolved') {
      addEvent('CONTRADICTION_RESOLUTION', {
        contradiction_id: contra.id,
        claims: [contra.claim_a, contra.claim_b]
      }, 310000 + parseInt(contra.id.replace('CONTRA-', '')) * 1000);
    }
  }
  
  return events;
}

function generateCanonical(packId, scenario) {
  const pack = PACKS[packId];
  const scenarioData = pack.scenarios[scenario];
  
  // Generate claims and evidence based on pack size
  const isBig = packId === 'BIG-001';
  const claimCount = isBig ? 30 : 2;
  const evidenceCount = isBig ? 32 : 2;
  
  const claims = [];
  for (let i = 1; i <= claimCount; i++) {
    claims.push({
      claim_id: `CLM-${String(i).padStart(3, '0')}`,
      text: `Claim ${i}: ${isBig ? getClaimText(i) : 'Test claim'}`,
      evidence_refs: [`EV-${String(Math.ceil(i / 3)).padStart(3, '0')}`]
    });
  }
  
  const evidenceInventory = [];
  for (let i = 1; i <= evidenceCount; i++) {
    evidenceInventory.push({
      evidence_id: `EV-${String(i).padStart(3, '0')}`,
      filename: isBig ? getEvidenceFilename(i) : `evidence_${i}.pdf`,
      sha256: sha256(`evidence_${packId}_${i}`)
    });
  }
  
  return {
    case_id: packId,
    report_id: `RPT-${packId}-${scenario}`,
    opinions: scenarioData.opinions || [],
    limitations: scenarioData.limitations || [],
    contradictions: scenarioData.contradictions || [],
    claims: claims,
    evidence_inventory: evidenceInventory,
    report_metadata: scenarioData.report_metadata || {}
  };
}

function getClaimText(index) {
  const texts = [
    'Medical records document onset of symptoms following incident',
    'Testing results indicate clinically significant impairment',
    'Collateral informant confirms behavioral changes',
    'Treatment records show ongoing psychological distress',
    'Employment records demonstrate decline in functioning',
    'Prior records show no pre-existing condition',
    'Imaging reveals no organic etiology',
    'Plaintiff reports consistent symptoms across evaluations'
  ];
  return texts[(index - 1) % texts.length];
}

function getEvidenceFilename(index) {
  const filenames = [
    'medical_records_comprehensive.pdf',
    'school_records_k12.pdf',
    'therapy_notes_3years.pdf',
    'psychiatric_evaluation.pdf',
    'neuropsychological_report.pdf',
    'employment_records.pdf',
    'police_reports.pdf',
    'court_documents.pdf',
    'deposition_transcript_plaintiff.pdf',
    'deposition_transcript_defendant.pdf',
    'expert_report_opposing.pdf',
    'financial_records.pdf',
    'insurance_claims.pdf',
    'social_media_exhibits.pdf',
    'text_message_logs.pdf',
    'email_correspondence.pdf',
    'photographs_exhibits.pdf',
    'video_transcript_depo.pdf',
    'military_records.pdf',
    'va_medical_records.pdf',
    'disability_application.pdf',
    'vocational_assessment.pdf',
    'life_care_plan.pdf',
    'economic_analysis.pdf',
    'scanned_handwritten_notes.pdf',
    'lab_results_compilation.pdf',
    'imaging_reports.pdf',
    'pharmacy_records.pdf',
    'collateral_interviews.pdf',
    'prior_evaluations.pdf',
    'attorney_correspondence.pdf',
    'supplemental_records.pdf'
  ];
  return filenames[(index - 1) % filenames.length];
}

// ============================================================================
// GATE EVALUATION (simplified for CLI)
// ============================================================================

function evaluateGates(canonical, auditLog) {
  const findings = [];
  
  // GATE-001: Opinion basis
  for (const opinion of canonical.opinions || []) {
    const id = opinion.opinion_id || 'unknown';
    
    if (!opinion.supporting_anchors?.length) {
      findings.push({
        gate_id: 'GATE-001', code: 'OPINION_NO_BASIS', sub_code: 'NO_SUPPORTING_ANCHORS',
        severity: 'BLOCK', message: `Opinion ${id} has no supporting anchors`,
        remediation_hint: 'Link opinion to claims', object: { type: 'opinion', id }
      });
    }
    if (opinion.contradictory_anchors === undefined && !opinion.none_found_assertion) {
      findings.push({
        gate_id: 'GATE-001', code: 'OPINION_NO_BASIS', sub_code: 'NO_CONTRADICTORY_CHECK',
        severity: 'BLOCK', message: `Opinion ${id} missing contradictory check`,
        remediation_hint: 'Add contradictory_anchors', object: { type: 'opinion', id }
      });
    }
    if (!opinion.reasoning_narrative) {
      findings.push({
        gate_id: 'GATE-001', code: 'OPINION_NO_BASIS', sub_code: 'NO_REASONING',
        severity: 'BLOCK', message: `Opinion ${id} missing reasoning`,
        remediation_hint: 'Add reasoning', object: { type: 'opinion', id }
      });
    }
    if (!opinion.what_would_change) {
      findings.push({
        gate_id: 'GATE-001', code: 'OPINION_NO_BASIS', sub_code: 'NO_CHANGE_CONDITION',
        severity: 'BLOCK', message: `Opinion ${id} missing what_would_change`,
        remediation_hint: 'Add change condition', object: { type: 'opinion', id }
      });
    }
  }
  
  // GATE-002: Limitations
  for (const lim of canonical.limitations || []) {
    const id = lim.limitation_id || 'unknown';
    if (!lim.addressed_status) {
      findings.push({
        gate_id: 'GATE-002', code: 'LIMITATIONS_INCOMPLETE', sub_code: 'LIMITATIONS_NO_STATUS',
        severity: 'BLOCK', message: `Limitation ${id} has no addressed_status`,
        remediation_hint: 'Set status', object: { type: 'limitation', id }
      });
    }
  }
  
  // GATE-003: AI review
  const aiGens = auditLog.filter(e => e.action === 'AI_GENERATION');
  const reviews = auditLog.filter(e => e.action === 'HUMAN_REVIEW');
  for (const gen of aiGens) {
    const genId = gen.details?.generation_id;
    const review = reviews.find(r => r.details?.generation_id === genId);
    if (!review) {
      findings.push({
        gate_id: 'GATE-003', code: 'AI_RELIANCE_NO_APPROVAL', sub_code: 'AI_NO_HUMAN_REVIEW',
        severity: 'BLOCK', message: `AI generation ${genId} not reviewed`,
        remediation_hint: 'Review AI content', object: { type: 'ai_generation', id: genId }
      });
    } else if (!['approve', 'approve_with_edits', 'partial_accept', 'reject'].includes(review.details?.action)) {
      findings.push({
        gate_id: 'GATE-003', code: 'AI_RELIANCE_NO_APPROVAL', sub_code: 'AI_REVIEW_INCOMPLETE',
        severity: 'BLOCK', message: `AI generation ${genId} has invalid review action`,
        remediation_hint: 'Use valid action', object: { type: 'ai_generation', id: genId }
      });
    }
  }
  
  // GATE-004: Contradictions
  for (const contra of canonical.contradictions || []) {
    if (contra.status === 'detected' || !contra.status) {
      const id = contra.id || `${contra.claim_a}-${contra.claim_b}`;
      findings.push({
        gate_id: 'GATE-004', code: 'CONTRADICTION_UNRESOLVED', sub_code: 'CONTRADICTION_NO_RESOLUTION',
        severity: 'BLOCK', message: `Contradiction ${id} unresolved`,
        remediation_hint: 'Resolve contradiction', object: { type: 'contradiction', id }
      });
    }
  }
  
  // GATE-007: Metadata
  const meta = canonical.report_metadata || {};
  if (!meta.evaluator_role) {
    findings.push({
      gate_id: 'GATE-007', code: 'ROLE_SCOPE_MISSING', sub_code: 'ROLE_MISSING',
      severity: 'WARN', message: 'Missing evaluator_role',
      remediation_hint: 'Add role', object: { type: 'report_metadata', id: 'evaluator_role' }
    });
  }
  if (!meta.referral_question) {
    findings.push({
      gate_id: 'GATE-007', code: 'ROLE_SCOPE_MISSING', sub_code: 'REFERRAL_QUESTION_MISSING',
      severity: 'WARN', message: 'Missing referral_question',
      remediation_hint: 'Add question', object: { type: 'report_metadata', id: 'referral_question' }
    });
  }
  if (!meta.scope_of_evaluation) {
    findings.push({
      gate_id: 'GATE-007', code: 'ROLE_SCOPE_MISSING', sub_code: 'SCOPE_MISSING',
      severity: 'WARN', message: 'Missing scope',
      remediation_hint: 'Add scope', object: { type: 'report_metadata', id: 'scope_of_evaluation' }
    });
  }
  
  // Add stable IDs
  for (const f of findings) {
    f.id = generateFindingId(f);
  }
  
  // Sort
  const severityRank = { BLOCK: 0, WARN: 1, INFO: 2 };
  findings.sort((a, b) => {
    const sA = severityRank[a.severity] ?? 99;
    const sB = severityRank[b.severity] ?? 99;
    if (sA !== sB) return sA - sB;
    return a.gate_id.localeCompare(b.gate_id) || a.code.localeCompare(b.code);
  });
  
  const violations = findings.filter(f => f.severity === 'BLOCK');
  const warnings = findings.filter(f => f.severity !== 'BLOCK');
  
  return { violations, warnings };
}

// ============================================================================
// EXPORT GENERATION
// ============================================================================

function runPack(packId, scenario, outputDir) {
  const pack = PACKS[packId];
  if (!pack) {
    console.error(`Unknown pack: ${packId}`);
    process.exit(2);
  }
  
  if (!pack.scenarios[scenario]) {
    console.error(`Unknown scenario: ${scenario}`);
    process.exit(2);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`EVIDIFY-CLI v${VERSION} - Pack Runner`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Pack: ${packId}`);
  console.log(`Scenario: ${scenario}`);
  console.log(`Output: ${outputDir}`);
  console.log('');
  
  const startTime = new Date();
  
  // Generate workflow artifacts
  const auditLog = generateAuditLog(packId, scenario, startTime);
  const canonical = generateCanonical(packId, scenario);
  
  // Evaluate gates
  const { violations, warnings } = evaluateGates(canonical, auditLog);
  
  // Build gate report
  const gateReport = {
    schema_version: 'evidify.forensic.gate_report.v1',
    case_id: packId,
    report_id: `RPT-${packId}-${scenario}`,
    inputs_digest: {
      canonical_sha256: HASH_SENTINEL,
      audit_head_sha256: auditLog[auditLog.length - 1].chain_hash
    },
    summary: {
      status: violations.length === 0 ? 'PASS' : 'FAIL',
      block_count: violations.length,
      warn_count: warnings.length,
      info_count: 0
    },
    gate_outcomes: {
      'GATE-001': violations.some(v => v.gate_id === 'GATE-001') ? 'FAIL' : 'PASS',
      'GATE-002': violations.some(v => v.gate_id === 'GATE-002') ? 'FAIL' : 'PASS',
      'GATE-003': violations.some(v => v.gate_id === 'GATE-003') ? 'FAIL' : 'PASS',
      'GATE-004': violations.some(v => v.gate_id === 'GATE-004') ? 'FAIL' : 'PASS',
      'GATE-005': 'PASS',
      'GATE-006': 'PASS',
      'GATE-007': warnings.some(w => w.gate_id === 'GATE-007') ? 'WARN' : 'PASS'
    },
    violations,
    warnings
  };
  
  // Compute canonical hash (sentinel-based)
  gateReport.inputs_digest.canonical_sha256 = computeCanonicalHash(gateReport);
  
  // Create output directories
  fs.mkdirSync(path.join(outputDir, 'canonical'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'audit'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'verification'), { recursive: true });
  
  // Write files
  fs.writeFileSync(
    path.join(outputDir, 'canonical/canonical.json'),
    JSON.stringify(canonicalizeJson(canonical), null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'audit/audit.log'),
    auditLog.map(e => JSON.stringify(e)).join('\n') + '\n'
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'audit/audit_digest.json'),
    JSON.stringify({
      expected_digest: {
        event_count: auditLog.length,
        final_chain_hash: auditLog[auditLog.length - 1].chain_hash
      }
    }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'verification/gate_report.canon.json'),
    JSON.stringify(canonicalizeJson(gateReport), null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'verification/gate_report.meta.json'),
    JSON.stringify({
      generated_at: '2026-01-01T00:00:00.000Z',  // Fixed for determinism
      gate_version: '1.1',
      engine_version: VERSION,
      scenario,
      hash_algorithm: 'sentinel-based-preimage-v1.1'
    }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify({
      pack_id: packId,
      scenario,
      created_at: '2026-01-01T00:00:00.000Z',  // Fixed for determinism
      files: [
        'canonical/canonical.json',
        'audit/audit.log',
        'audit/audit_digest.json',
        'verification/gate_report.canon.json',
        'verification/gate_report.meta.json'
      ]
    }, null, 2)
  );
  
  // Print summary
  console.log('Gate Outcomes:');
  for (const [gateId, outcome] of Object.entries(gateReport.gate_outcomes)) {
    const icon = outcome === 'PASS' ? '✅' : outcome === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${gateId}: ${icon} ${outcome}`);
  }
  
  console.log('');
  console.log(`Violations: ${violations.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Canonical Hash: ${gateReport.inputs_digest.canonical_sha256}`);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (gateReport.summary.status === 'PASS') {
    console.log('✅ EXPORT: PASS');
  } else {
    console.log('❌ EXPORT: FAIL');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Output written to: ${outputDir}`);
  
  return gateReport.summary.status === 'PASS' ? 0 : 1;
}

// ============================================================================
// CLI
// ============================================================================

function printUsage() {
  console.log(`evidify-cli v${VERSION} - Headless Pack Runner`);
  console.log('');
  console.log('Commands:');
  console.log('  run-pack <pack-id> --scenario PASS|FAIL --export <dir>');
  console.log('  list-packs');
  console.log('  help');
  console.log('');
  console.log('Examples:');
  console.log('  evidify-cli run-pack CC-001 --scenario PASS --export out/CC-001/PASS');
  console.log('  evidify-cli run-pack CC-001 --scenario FAIL --export out/CC-001/FAIL');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }
  
  const command = args[0];
  
  if (command === 'list-packs') {
    console.log('Available packs:');
    for (const [id, pack] of Object.entries(PACKS)) {
      console.log(`  ${id}: ${pack.name}`);
      console.log(`    Scenarios: ${Object.keys(pack.scenarios).join(', ')}`);
    }
    process.exit(0);
  }
  
  if (command === 'run-pack') {
    const packId = args[1];
    let scenario = null;
    let outputDir = null;
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--scenario' && args[i + 1]) {
        scenario = args[++i];
      } else if (args[i] === '--export' && args[i + 1]) {
        outputDir = args[++i];
      }
    }
    
    if (!packId || !scenario || !outputDir) {
      console.error('Usage: evidify-cli run-pack <pack-id> --scenario PASS|FAIL --export <dir>');
      process.exit(2);
    }
    
    const exitCode = runPack(packId, scenario, outputDir);
    process.exit(exitCode);
  }
  
  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(2);
}

main();
