/**
 * contrastDemoData.ts
 *
 * Realistic mock data for a single HUMAN_FIRST mammography reading session
 * (case BRPLL-001). Used to wire TheContrast component into the StudySelector
 * demo flow with representative event sequences and derived metrics.
 */

import type { TrialEvent, DerivedMetrics } from '../lib/ExportPack';
import type { LedgerEntry } from '../components/research/legal/ImpressionLedger';

// ============================================================================
// CASE IDENTITY
// ============================================================================

export const DEMO_CASE_ID = 'BRPLL-001';

// ============================================================================
// HELPER: timestamp offset from base
// ============================================================================

const BASE_ISO = '2026-02-04T10:00:00.000Z';
const BASE_MS = new Date(BASE_ISO).getTime();

function ts(offsetSeconds: number): string {
  return new Date(BASE_MS + offsetSeconds * 1000).toISOString();
}

// ============================================================================
// EVENTS
// ============================================================================

export const DEMO_EVENTS: TrialEvent[] = [
  {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    seq: 0,
    type: 'CASE_LOADED',
    timestamp: ts(0),
    payload: {
      caseId: DEMO_CASE_ID,
      condition: 'HUMAN_FIRST',
      breastDensity: 'heterogeneously dense',
      viewCount: 4,
    },
  },
  {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    seq: 1,
    type: 'READ_EPISODE_STARTED',
    timestamp: ts(1),
    payload: { episodeType: 'PRE_AI', caseId: DEMO_CASE_ID },
  },
  {
    id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    seq: 2,
    type: 'GAZE_ENTERED_ROI',
    timestamp: ts(8),
    payload: { roiId: 'upper-outer-left', regionLabel: 'Left breast upper outer quadrant' },
  },
  {
    id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
    seq: 3,
    type: 'DWELL_TIME_ROI',
    timestamp: ts(12),
    payload: { roiId: 'upper-outer-left', dwellMs: 3200 },
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
    seq: 4,
    type: 'ATTENTION_COVERAGE_PROXY',
    timestamp: ts(15),
    payload: { coveragePercent: 0.72, regionsViewed: 5, totalRegions: 7 },
  },
  {
    id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102',
    seq: 5,
    type: 'FIRST_IMPRESSION_LOCKED',
    timestamp: ts(18),
    payload: {
      birads: 2,
      initialBirads: 2,
      confidence: 65,
      timeOnCaseMs: 18000,
      caseId: DEMO_CASE_ID,
    },
  },
  {
    id: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f80910213',
    seq: 6,
    type: 'FIRST_IMPRESSION_CONTEXT',
    timestamp: ts(18),
    payload: {
      caseId: DEMO_CASE_ID,
      impression: 'Benign finding. Scattered fibroglandular densities with no suspicious masses or calcifications.',
    },
  },
  {
    id: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324',
    seq: 7,
    type: 'READ_EPISODE_ENDED',
    timestamp: ts(18),
    payload: { episodeType: 'PRE_AI', reason: 'AI_REVEALED', durationMs: 17000 },
  },
  {
    id: 'c9d0e1f2-a3b4-4c5d-6e7f-809102132435',
    seq: 8,
    type: 'AI_REVEALED',
    timestamp: ts(18),
    payload: {
      aiBirads: 4,
      suggestedBirads: 4,
      aiConfidence: 0.87,
      flaggedRegions: 1,
      caseId: DEMO_CASE_ID,
    },
  },
  {
    id: 'd0e1f2a3-b4c5-4d6e-7f80-910213243546',
    seq: 9,
    type: 'DISCLOSURE_PRESENTED',
    timestamp: ts(19),
    payload: {
      format: 'FDR_FOR',
      fdr: 0.04,
      for: 0.12,
      displayedText: 'False Discovery Rate: 4% | False Omission Rate: 12%',
    },
  },
  {
    id: 'e1f2a3b4-c5d6-4e7f-8091-021324354657',
    seq: 10,
    type: 'READ_EPISODE_STARTED',
    timestamp: ts(19),
    payload: { episodeType: 'POST_AI', caseId: DEMO_CASE_ID },
  },
  {
    id: 'f2a3b4c5-d6e7-4f80-9102-132435465768',
    seq: 11,
    type: 'KEYBOARD_SHORTCUT',
    timestamp: ts(24),
    payload: { key: '2', step: 'AI_REVEALED', action: 'maintain_assessment' },
  },
  {
    id: 'a3b4c5d6-e7f8-4091-0213-243546576879',
    seq: 12,
    type: 'READ_EPISODE_ENDED',
    timestamp: ts(28),
    payload: { episodeType: 'POST_AI', reason: 'FINAL_SUBMITTED', durationMs: 9000 },
  },
  {
    id: 'b4c5d6e7-f809-4102-1324-35465768798a',
    seq: 13,
    type: 'FINAL_ASSESSMENT',
    timestamp: ts(28),
    payload: {
      birads: 2,
      initialBirads: 2,
      finalBirads: 2,
      aiBirads: 4,
      changeOccurred: false,
      confidence: 70,
      timeOnCaseMs: 28000,
    },
  },
  {
    id: 'c5d6e7f8-0910-4213-2435-46576879809b',
    seq: 14,
    type: 'TRUST_CALIBRATION',
    timestamp: ts(30),
    payload: { preAiExpectation: 50, actualReliance: 30, caseId: DEMO_CASE_ID },
  },
  {
    id: 'd6e7f809-1021-4324-3546-5768798a90bc',
    seq: 15,
    type: 'CASE_COMPLETED',
    timestamp: ts(32),
    payload: { caseId: DEMO_CASE_ID, totalDurationMs: 32000 },
  },
];

// ============================================================================
// LEDGER ENTRIES (ImpressionLedger format used by TheContrast)
// ============================================================================

export const DEMO_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    entryId: 'ledger-001-human-first',
    entryType: 'HUMAN_FIRST_IMPRESSION',
    sequenceNumber: 0,
    timestamp: ts(18),
    timeOnTaskMs: 18000,
    assessment: { category: 2, confidence: 3 },
    aiVisible: false,
    caseId: DEMO_CASE_ID,
    readerId: 'reader-demo-001',
    previousHash: null,
    hash: 'a4f8c2e1d7b39056ef12ca8d7e6b5a4f3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
    locked: true,
  },
  {
    entryId: 'ledger-002-ai-exposure',
    entryType: 'AI_OUTPUT_EXPOSURE',
    sequenceNumber: 1,
    timestamp: ts(19),
    timeOnTaskMs: 19000,
    disclosure: {
      shown: true,
      format: 'numeric',
      metrics: { fdr: 0.04, for_: 0.12, sensitivity: 0.91, specificity: 0.86 },
      displayedText: 'FDR: 4% | FOR: 12%',
    },
    aiVisible: true,
    caseId: DEMO_CASE_ID,
    readerId: 'reader-demo-001',
    previousHash: 'a4f8c2e1d7b39056ef12ca8d7e6b5a4f3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
    hash: 'b5e9d3f2c8a40167fa23db9e8f7c6b5a4e3d2f1a0b9c8d7e6f5a4b3c2d1e0f9a',
    locked: true,
  },
  {
    entryId: 'ledger-003-reconciliation',
    entryType: 'RECONCILIATION',
    sequenceNumber: 2,
    timestamp: ts(28),
    timeOnTaskMs: 28000,
    assessment: { category: 2, confidence: 4 },
    aiVisible: true,
    caseId: DEMO_CASE_ID,
    readerId: 'reader-demo-001',
    previousHash: 'b5e9d3f2c8a40167fa23db9e8f7c6b5a4e3d2f1a0b9c8d7e6f5a4b3c2d1e0f9a',
    hash: 'c6fa04a3d9b51278ab34ec0f9a8d7c6b5f4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    locked: true,
  },
];

// ============================================================================
// DERIVED METRICS
// ============================================================================

export const DEMO_DERIVED_METRICS: DerivedMetrics = {
  sessionId: 'SES-demo-contrast',
  timestamp: '2026-02-04T10:00:32.000Z',
  condition: 'HUMAN_FIRST',
  caseId: DEMO_CASE_ID,

  // Assessment values
  initialBirads: 2,
  finalBirads: 2,
  aiBirads: 4,
  aiConfidence: 0.87,

  // Change analysis
  changeOccurred: false,
  aiConsistentChange: false,
  aiInconsistentChange: false,

  // ADDA: initial ≠ AI (denominator=true), but no change occurred → adda=null not applicable
  adda: null,
  addaDenominator: true,

  // Documentation
  deviationRequired: false,
  deviationDocumented: false,
  deviationSkipped: false,

  // Comprehension
  comprehensionCorrect: null,

  // Timing (ms)
  preAiReadMs: 18000,
  postAiReadMs: 10000,
  totalReadMs: 28000,
  aiExposureMs: 10000,
  totalTimeMs: 32000,
  lockToRevealMs: 0,
  revealToFinalMs: 10000,

  // Protocol
  revealTiming: 'human_first',
  disclosureFormat: 'fdr_for',
};
