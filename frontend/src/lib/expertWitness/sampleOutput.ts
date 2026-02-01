/**
 * Sample Expert Witness Packet Output
 *
 * This file demonstrates a complete enhanced expert witness packet
 * with all sections populated with realistic sample data.
 *
 * Use this as a reference for:
 * - Understanding the complete packet structure
 * - Testing the PDF generator
 * - Demonstrating capabilities to stakeholders
 */

import {
  EnhancedExpertWitnessPacket,
  SessionData,
  STANDARD_CITATIONS,
  STANDARD_GLOSSARY,
} from './expertWitnessTypes';
import { ExpertWitnessPacketGenerator } from './ExpertWitnessPacketGenerator';
import { WorkloadInput } from './workloadMetrics';
import { CDIInput } from './caseDifficultyIndex';

// =============================================================================
// SAMPLE SESSION DATA
// =============================================================================

export const SAMPLE_SESSION_DATA: SessionData = {
  sessionId: 'SESSION-2026-01-31-143200-ABC123',
  caseId: 'CASE-2026-0131-001',
  clinicianId: 'RAD-00042',
  protocolId: 'MAMMO-SCREEN-V2',

  sessionStart: '2026-01-31T12:15:00.000Z',
  sessionEnd: '2026-01-31T14:45:00.000Z',

  initialAssessment: {
    birads: 2,
    confidence: 85,
    timestamp: '2026-01-31T14:32:07.123Z',
    hash: 'a7b3c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0'
  },

  finalAssessment: {
    birads: 2,
    confidence: 90,
    timestamp: '2026-01-31T14:33:21.456Z',
    hash: 'b8c4d0e2f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2'
  },

  aiResult: {
    score: 78,
    flagged: true,
    revealTimestamp: '2026-01-31T14:32:12.456Z',
    findings: [
      {
        findingId: 'FIND-001',
        location: 'UOQ-R',
        confidence: 78,
        type: 'architectural_distortion'
      }
    ]
  },

  deviation: {
    documented: true,
    reasonCodes: ['BENIGN_CALCIFICATION', 'STABLE_PRIOR'],
    rationale: 'Finding appears to represent stable benign calcification cluster noted on prior study from 2024. No significant interval change. Architectural pattern consistent with prior surgical site.',
    timestamp: '2026-01-31T14:33:15.000Z'
  },

  events: [
    { type: 'SESSION_START', timestamp: '2026-01-31T12:15:00.000Z' },
    { type: 'CASE_LOADED', timestamp: '2026-01-31T14:31:45.000Z', caseId: 'CASE-2026-0131-001' },
    { type: 'FIRST_IMPRESSION_LOCKED', timestamp: '2026-01-31T14:32:07.123Z', birads: 2 },
    { type: 'AI_REVEALED', timestamp: '2026-01-31T14:32:12.456Z', aiScore: 78 },
    { type: 'DISCLOSURE_PRESENTED', timestamp: '2026-01-31T14:32:12.500Z', format: 'natural_frequency' },
    { type: 'DISCLOSURE_COMPREHENSION_RESPONSE', timestamp: '2026-01-31T14:32:25.000Z', answer: 85 },
    { type: 'DEVIATION_SUBMITTED', timestamp: '2026-01-31T14:33:15.000Z' },
    { type: 'FINAL_ASSESSMENT', timestamp: '2026-01-31T14:33:21.456Z', birads: 2 },
    { type: 'SESSION_END', timestamp: '2026-01-31T14:45:00.000Z' }
  ],

  ledgerEntries: [
    { sequenceNumber: 1, type: 'HUMAN_FIRST_IMPRESSION', hash: 'hash1' },
    { sequenceNumber: 2, type: 'AI_OUTPUT_EXPOSURE', hash: 'hash2' },
    { sequenceNumber: 3, type: 'RECONCILIATION', hash: 'hash3' }
  ],

  hashChain: {
    genesisHash: '0000000000000000000000000000000000000000000000000000000000000000',
    finalHash: 'b8c4d0e2f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2',
    totalEntries: 47,
    verified: true
  }
};

// =============================================================================
// SAMPLE WORKLOAD INPUT
// =============================================================================

export const SAMPLE_WORKLOAD_INPUT: WorkloadInput = {
  sessionStartTimestamp: '2026-01-31T12:15:00.000Z',
  currentTimestamp: '2026-01-31T14:33:21.000Z',
  casesCompletedInSession: 34,
  totalSessionCases: 50,
  currentCaseIndex: 33,

  nasaTlxData: {
    mentalDemand: 55,
    physicalDemand: 20,
    temporalDemand: 45,
    performance: 25,
    effort: 50,
    frustration: 30
  },

  breaks: [
    {
      startTimestamp: '2026-01-31T13:15:00.000Z',
      endTimestamp: '2026-01-31T13:25:00.000Z',
      durationMinutes: 10
    }
  ]
};

// =============================================================================
// SAMPLE CDI INPUT
// =============================================================================

export const SAMPLE_CDI_INPUT: CDIInput = {
  breastDensity: 'D',

  finding: {
    type: 'subtle_architectural_distortion',
    sizeMm: 8,
    location: 'posterior',
    conspicuity: 'SUBTLE'
  },

  distractors: {
    count: 2,
    types: ['benign_calcification', 'cyst']
  },

  priorComparison: {
    available: true,
    yearsAgo: 2
  },

  technicalQuality: {
    issues: []
  }
};

// =============================================================================
// SAMPLE AI DISCLOSURE
// =============================================================================

export const SAMPLE_AI_DISCLOSURE = {
  format: 'natural_frequency' as const,
  validationPhase: 2 as const,

  metrics: {
    sensitivity: 0.92,
    specificity: 0.85,
    ppv: 0.85,
    npv: 0.97,
    fdr: 0.15,
    for: 0.03
  },

  displayText: `Out of 100 cases the AI flags as suspicious:
  - About 85 will have cancer
  - About 15 will NOT have cancer (false positives)`,

  validationWarning: `This AI has Phase 2 validation only. It has not been shown to
improve patient outcomes.`,

  exposureTimestamp: '2026-01-31T14:32:12.500Z',
  exposureDurationMs: 12000,
  acknowledged: true,
  acknowledgedTimestamp: '2026-01-31T14:32:24.500Z',

  comprehensionCheck: {
    question: 'Out of 100 flagged cases, how many have cancer?',
    userAnswer: 85,
    correctAnswer: 85,
    passed: true
  }
};

// =============================================================================
// SAMPLE VIEWPORT DATA
// =============================================================================

export const SAMPLE_VIEWPORT_DATA = {
  totalViewingTimeMs: 70000,
  preAIViewingTimeMs: 47000,
  imageCoveragePercent: 94,

  regionData: [
    { regionId: 'UOQ-R', regionName: 'Right Upper Outer Quadrant', dwellTimeMs: 4200, zoomLevel: 2.1, viewingEpisodes: 3, visited: true },
    { regionId: 'UIQ-R', regionName: 'Right Upper Inner Quadrant', dwellTimeMs: 2800, zoomLevel: 1.5, viewingEpisodes: 2, visited: true },
    { regionId: 'LOQ-R', regionName: 'Right Lower Outer Quadrant', dwellTimeMs: 3100, zoomLevel: 1.8, viewingEpisodes: 2, visited: true },
    { regionId: 'LIQ-R', regionName: 'Right Lower Inner Quadrant', dwellTimeMs: 2400, zoomLevel: 1.5, viewingEpisodes: 1, visited: true },
    { regionId: 'UOQ-L', regionName: 'Left Upper Outer Quadrant', dwellTimeMs: 3700, zoomLevel: 1.5, viewingEpisodes: 2, visited: true },
    { regionId: 'UIQ-L', regionName: 'Left Upper Inner Quadrant', dwellTimeMs: 2500, zoomLevel: 1.4, viewingEpisodes: 1, visited: true },
    { regionId: 'LOQ-L', regionName: 'Left Lower Outer Quadrant', dwellTimeMs: 2900, zoomLevel: 1.6, viewingEpisodes: 2, visited: true },
    { regionId: 'LIQ-L', regionName: 'Left Lower Inner Quadrant', dwellTimeMs: 2100, zoomLevel: 1.4, viewingEpisodes: 1, visited: true },
    { regionId: 'AX-R', regionName: 'Right Axillary', dwellTimeMs: 1800, zoomLevel: 1.3, viewingEpisodes: 1, visited: true },
    { regionId: 'AX-L', regionName: 'Left Axillary', dwellTimeMs: 1500, zoomLevel: 1.3, viewingEpisodes: 1, visited: true },
  ]
};

// =============================================================================
// SAMPLE TSA CHECKPOINTS
// =============================================================================

export const SAMPLE_TSA_CHECKPOINTS = [
  {
    checkpointId: 'TSA-001',
    timestamp: '2026-01-31T14:31:00.000Z',
    eventHash: 'hash1',
    tsaProvider: 'DigiCert',
    tsaSignature: 'sig1...',
    certificateChain: ['cert1'],
    verified: true
  },
  {
    checkpointId: 'TSA-002',
    timestamp: '2026-01-31T14:35:00.000Z',
    eventHash: 'hash2',
    tsaProvider: 'DigiCert',
    tsaSignature: 'sig2...',
    certificateChain: ['cert1'],
    verified: true
  },
  {
    checkpointId: 'TSA-003',
    timestamp: '2026-01-31T14:45:00.000Z',
    eventHash: 'hash3',
    tsaProvider: 'DigiCert',
    tsaSignature: 'sig3...',
    certificateChain: ['cert1'],
    verified: true
  }
];

// =============================================================================
// GENERATE SAMPLE PACKET
// =============================================================================

/**
 * Generate a complete sample expert witness packet
 */
export function generateSamplePacket(): EnhancedExpertWitnessPacket {
  const generator = new ExpertWitnessPacketGenerator(SAMPLE_SESSION_DATA, {
    workloadInput: SAMPLE_WORKLOAD_INPUT,
    cdiInput: SAMPLE_CDI_INPUT,
    aiDisclosure: SAMPLE_AI_DISCLOSURE,
    viewportData: SAMPLE_VIEWPORT_DATA,
    tsaCheckpoints: SAMPLE_TSA_CHECKPOINTS,
    groundTruth: {
      abnormal: true,
      findingLocation: 'UOQ-R',
      findingType: 'architectural_distortion',
      findingConspicuity: 'SUBTLE'
    }
  });

  return generator.generate();
}

/**
 * Generate sample HTML output
 */
export function generateSampleHTML(): string {
  const generator = new ExpertWitnessPacketGenerator(SAMPLE_SESSION_DATA, {
    workloadInput: SAMPLE_WORKLOAD_INPUT,
    cdiInput: SAMPLE_CDI_INPUT,
    aiDisclosure: SAMPLE_AI_DISCLOSURE,
    viewportData: SAMPLE_VIEWPORT_DATA,
    tsaCheckpoints: SAMPLE_TSA_CHECKPOINTS,
    groundTruth: {
      abnormal: true,
      findingLocation: 'UOQ-R',
      findingType: 'architectural_distortion',
      findingConspicuity: 'SUBTLE'
    }
  });

  return generator.toHTML();
}

// =============================================================================
// SAMPLE PLAIN TEXT OUTPUT (for reference)
// =============================================================================

export const SAMPLE_PLAIN_TEXT_OUTPUT = `
================================================================================
                        EXPERT WITNESS PACKET
================================================================================

Packet ID: EWP-M2K9X7-ABC123
Generated: January 31, 2026, 2:45 PM EST
Version: 2.0

--------------------------------------------------------------------------------
1. EXECUTIVE SUMMARY
--------------------------------------------------------------------------------

Case ID:      CASE-2026-0131-001
Session ID:   SESSION-2026-01-31-143200-ABC123
Clinician ID: CLINICIAN-00042ABC (anonymized)

SUMMARY:
This case (ID: CASE-2026-0131-001) was reviewed during a session where the
clinician completed 34 cases over 128 minutes. The case had a difficulty score
of 73/100 (high difficulty, 73rd percentile). A recognition error occurred with
87% confidence classification. Workflow compliance was compliant with all
documentation requirements met. Overall liability assessment: LOW.

KEY FINDINGS:
┌─────────────────────────┬────────────────────────────────────────┐
│ Workflow Compliance     │ COMPLIANT                              │
│ Error Classification    │ RECOGNITION ERROR                      │
│ Case Difficulty         │ 73/100 (HIGH)                          │
│ AI Disclosure Score     │ 4/4 (FULL COMPLIANCE)                  │
│ Workload Status         │ GREEN                                  │
└─────────────────────────┴────────────────────────────────────────┘

LIABILITY ASSESSMENT: LOW RISK

Mitigating Factors:
  • High case difficulty (CDI: 73/100)
  • Workload within recommended limits
  • Error type (RECOGNITION_ERROR) reflects normal cognitive limitations
  • Complete cryptographic audit trail
  • Proper AI limitation disclosure documented

Aggravating Factors:
  (none)

Recommendation: Documentation supports standard of care. Strong defensible
position.

--------------------------------------------------------------------------------
2. WORKFLOW COMPLIANCE REPORT
--------------------------------------------------------------------------------

Overall Status: COMPLIANT

✓ Independent assessment was recorded before AI reveal
✓ Assessment was cryptographically locked with SHA-256 hash
✓ AI was revealed 5.3 seconds after lock
✓ Deviation from AI recommendation was documented with rationale
✓ Hash chain verified: 47 events intact

WORKFLOW TIMELINE:
┌────────────────────────┬──────────────────────────┬────────────────────┐
│ Stage                  │ Timestamp                │ Description        │
├────────────────────────┼──────────────────────────┼────────────────────┤
│ Initial Assessment     │ 2026-01-31T14:32:07.123Z │ BI-RADS 2 recorded │
│ Assessment Lock        │ 2026-01-31T14:32:07.123Z │ Hash: a7b3c9d2...  │
│ AI Reveal              │ 2026-01-31T14:32:12.456Z │ AI score: 78       │
│ Deviation Documentation│ 2026-01-31T14:33:15.000Z │ BENIGN_CALC...     │
│ Final Assessment       │ 2026-01-31T14:33:21.456Z │ BI-RADS 2 finalized│
└────────────────────────┴──────────────────────────┴────────────────────┘

WORKFLOW DIAGRAM:
[Initial Assessment] → [LOCK] → [AI Reveal] → [Review] → [Final Assessment]
     14:31:45          14:32:07   14:32:12     14:32:45      14:33:21

--------------------------------------------------------------------------------
3. CASE DIFFICULTY ANALYSIS
--------------------------------------------------------------------------------

Composite Difficulty Score: 73/100 (HIGH)
Percentile: 73rd (harder than 73% of comparison cases)
RADPEER Prediction: Score 2 - "Difficult diagnosis, not ordinarily expected"

DIFFICULTY FACTORS:
┌─────────────────────┬─────────────────────────────────┬───────┐
│ Factor              │ Value                           │ Score │
├─────────────────────┼─────────────────────────────────┼───────┤
│ Breast density      │ BI-RADS D (extremely dense)     │ 5/5   │
│ Finding conspicuity │ Subtle architectural distortion │ 5/5   │
│ Finding size        │ 8mm                             │ 4/5   │
│ Location            │ Posterior margin                │ 4/5   │
│ Distractors         │ 2 benign calcifications         │ 3/5   │
│ Prior comparison    │ Available (2 years ago)         │ 2/5   │
└─────────────────────┴─────────────────────────────────┴───────┘

SCIENTIFIC BASIS:
Per Macknik et al. (2022), cases with CDI > 70 have documented miss rates
2.3x higher than average difficulty cases, reflecting normal perceptual
limitations rather than substandard care. Extremely dense breast tissue
(BI-RADS D) reduces mammographic sensitivity by 10-20% per Sprague et al.
(2014). Subtle findings have documented miss rates of 12-30% even among
expert radiologists (Birdwell et al., 2001).

Expected miss rate: 12-25%. High miss rate expected for findings at this
difficulty level.

--------------------------------------------------------------------------------
4. WOLFE ERROR CLASSIFICATION
--------------------------------------------------------------------------------

Classification: RECOGNITION ERROR
Confidence: 87%

EVIDENCE SUPPORTING CLASSIFICATION:
  ✓ Viewport tracking confirms region was viewed
    Dwell time: 4.2 seconds (adequate)
    Zoom level: 2.1x (appropriate for finding size)
  ✗ Finding was not noted in initial assessment

SCIENTIFIC CONTEXT:
Recognition errors represent the largest category of diagnostic misses
(Wolfe, 2022). These occur when visual search successfully brings a target
to foveal vision, but pattern recognition fails to flag it as abnormal.
Expected rate for subtle findings: 12-30%.

Expected rate range: 12% - 30%

LIABILITY IMPLICATIONS:
This error type reflects limitations in human pattern recognition rather
than inadequate search strategy. The high case difficulty (CDI: 73) places
this case in the expected miss range for subtle findings.

--------------------------------------------------------------------------------
5. COGNITIVE LOAD ANALYSIS
--------------------------------------------------------------------------------

Session Workload at Time of Error:
  Cases completed:        34 of 50
  Session duration:       128 minutes (2h 8min)
  Average time per case:  3.5 minutes
  Cases per hour:         15.9

MACKNIK THRESHOLD STATUS: GREEN (within recommended limits)
Workload is within recommended limits (15.9 cases/hour, 128 minutes).

FATIGUE INDEX: 42/100 (Moderate)

SCIENTIFIC BASIS:
Macknik et al. (2022) established that radiologist performance degrades
significantly beyond 40 cases/hour. At 15.9 cases/hour, this session was
well within recommended workload limits.

CONCLUSION:
Cognitive fatigue was not a contributing factor to this error.

--------------------------------------------------------------------------------
6. AI DISCLOSURE COMPLIANCE (SPIEGELHALTER FRAMEWORK)
--------------------------------------------------------------------------------

Disclosure Format: Natural Frequency
AI Validation Phase: Phase 2 (Expert Comparison Only)

INTELLIGENT OPENNESS SCORE: 4/4 (FULL COMPLIANCE)

Four Pillars of Intelligent Openness:
  ✓ Accessible: Disclosure displayed for 12 seconds (adequate)
  ✓ Intelligible: Comprehension check passed (answered 85, correct was 85)
  ✓ Usable: Decision made 68 seconds after disclosure
  ✓ Assessable: AI reasoning logged in full

DISCLOSURE CONTENT:
┌─────────────────────────────────────────────────────────────────────────────┐
│ "Out of 100 cases the AI flags as suspicious:                               │
│   - About 85 will have cancer                                               │
│   - About 15 will NOT have cancer (false positives)"                        │
└─────────────────────────────────────────────────────────────────────────────┘

VALIDATION WARNING SHOWN:
┌─────────────────────────────────────────────────────────────────────────────┐
│ "This AI has Phase 2 validation only. It has not been shown to              │
│  improve patient outcomes."                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

CONCLUSION:
The clinician received complete, comprehensible information about AI
limitations per Spiegelhalter's intelligent openness framework.

--------------------------------------------------------------------------------
7. ATTENTION ANALYSIS
--------------------------------------------------------------------------------

Image Coverage: 94% of anatomical regions viewed
Total Viewing Time: 47 seconds (pre-AI) + 23 seconds (post-AI)

REGION COVERAGE:
┌────────┬──────────────────────────────────┬───────────┬───────┐
│ Status │ Region                           │ Dwell Time│ Zoom  │
├────────┼──────────────────────────────────┼───────────┼───────┤
│ ✓      │ Right Upper Outer Quadrant       │ 4.2s      │ 2.1x  │
│ ✓      │ Right Upper Inner Quadrant       │ 2.8s      │ 1.5x  │
│ ✓      │ Right Lower Outer Quadrant       │ 3.1s      │ 1.8x  │
│ ✓      │ Right Lower Inner Quadrant       │ 2.4s      │ 1.5x  │
│ ✓      │ Left Upper Outer Quadrant        │ 3.7s      │ 1.5x  │
│ ✓      │ Left Upper Inner Quadrant        │ 2.5s      │ 1.4x  │
│ ✓      │ Left Lower Outer Quadrant        │ 2.9s      │ 1.6x  │
│ ✓      │ Left Lower Inner Quadrant        │ 2.1s      │ 1.4x  │
│ ✓      │ Right Axillary                   │ 1.8s      │ 1.3x  │
│ ✓      │ Left Axillary                    │ 1.5s      │ 1.3x  │
└────────┴──────────────────────────────────┴───────────┴───────┘

FINDING LOCATION vs ATTENTION:
Finding was in Right Upper Outer Quadrant, which received:
  • 4.2 seconds of attention
  • 2.1x zoom magnification
  • 3 separate viewing episodes

CONCLUSION:
Visual search was thorough. The error was not due to inadequate coverage
of the image.

--------------------------------------------------------------------------------
8. CRYPTOGRAPHIC VERIFICATION
--------------------------------------------------------------------------------

Hash Chain Status: VERIFIED ✓
Total Events: 47
Chain Integrity: INTACT

VERIFICATION DETAILS:
┌───────────────────────────────┬─────────────────────────────────────────────┐
│ Genesis hash                  │ 0000...0000 (verified)                      │
│ Final hash                    │ b8c4...f1g2 (verified)                      │
│ All intermediate hashes       │ VALID                                       │
│ Tampering detected            │ No                                          │
└───────────────────────────────┴─────────────────────────────────────────────┘

TSA TIMESTAMP ATTESTATION:
  ✓ 3 checkpoints attested by DigiCert TSA
  ✓ Coverage: 100% of events
  ✓ Earliest attestation: 2026-01-31T14:31:00Z
  ✓ Latest attestation: 2026-01-31T14:45:00Z

This documentation is tamper-evident. Any modification to historical records
would invalidate the hash chain.

--------------------------------------------------------------------------------
9. APPENDICES
--------------------------------------------------------------------------------

A: Full Event Log
   47 events recorded. See JSON export for full details.

B: Viewport Attention Heatmap
   Heatmap data available in export.

C: Case Images
   Images not included for privacy/legal considerations.

D: AI System Specifications
┌────────────────────┬────────────────────────────────────────────────────────┐
│ Model Name         │ AI CAD System                                          │
│ Version            │ 1.0                                                    │
│ Validation Phase   │ 2                                                      │
│ Training Data      │ Trained on retrospective mammography dataset           │
└────────────────────┴────────────────────────────────────────────────────────┘

E: Research Citations
   1. Wolfe, J.M. & Horowitz, T.S. (2022). Five factors that guide attention
      in visual search. Nature Reviews Psychology, 1, 1-16.
   2. Macknik, S.L. & Martinez-Conde, S. (2022). Cognitive load and
      radiologist performance: workload thresholds. Radiology, 302, 512-520.
   3. Spiegelhalter, D. (2017). Risk and uncertainty communication. Annual
      Review of Statistics and Its Application, 4, 31-60.
   4. Birdwell, R.L. et al. (2001). Mammographic characteristics of 115
      missed cancers. AJR, 177, 1231-1236.
   5. Drew, T. et al. (2013). The invisible gorilla strikes again. Psych Sci,
      24, 1848-1853.

F: Glossary of Terms
   BI-RADS: Breast Imaging Reporting and Data System. A standardized
            classification system for mammography findings.
   CDI:     Case Difficulty Index. A composite score (0-100) measuring
            objective case difficulty.
   FDR:     False Discovery Rate. The proportion of positive AI predictions
            that are incorrect.
   FOR:     False Omission Rate. The proportion of negative AI predictions
            that are incorrect.

================================================================================
                    END OF EXPERT WITNESS PACKET
================================================================================

This document was generated by Evidify Clinical Decision Documentation Platform.
Case ID: CASE-2026-0131-001 | Session: SESSION-2026-01-31-143200-ABC123

CONFIDENTIAL - FOR LEGAL PURPOSES ONLY
`;
