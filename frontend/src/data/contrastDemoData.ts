import type { TrialEvent, DerivedMetrics } from '../lib/ExportPack';

export const DEMO_CASE_ID = 'BRPLL-001';

const T0 = new Date('2026-02-04T10:00:00.000Z').getTime();
const ts = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

export const DEMO_EVENTS: TrialEvent[] = [
  { id: 'e001', seq: 1, type: 'CASE_LOADED', timestamp: ts(0), payload: { caseId: 'BRPLL-001', condition: 'HUMAN_FIRST' } },
  { id: 'e002', seq: 2, type: 'READ_EPISODE_STARTED', timestamp: ts(1000), payload: { caseId: 'BRPLL-001', episodeType: 'PRE_AI' } },
  { id: 'e003', seq: 3, type: 'GAZE_ENTERED_ROI', timestamp: ts(8000), payload: { caseId: 'BRPLL-001', roiId: 'mass-upper-outer', roiType: 'AI_FINDING' } },
  { id: 'e004', seq: 4, type: 'DWELL_TIME_ROI', timestamp: ts(12000), payload: { caseId: 'BRPLL-001', roiId: 'mass-upper-outer', dwellMs: 3200 } },
  { id: 'e005', seq: 5, type: 'ATTENTION_COVERAGE_PROXY', timestamp: ts(15000), payload: { caseId: 'BRPLL-001', coveragePercent: 0.72, quadrantsCovered: 3, totalQuadrants: 4 } },
  { id: 'e006', seq: 6, type: 'FIRST_IMPRESSION_LOCKED', timestamp: ts(18000), payload: { caseId: 'BRPLL-001', initialBirads: 2, confidence: 65 } },
  { id: 'e007', seq: 7, type: 'FIRST_IMPRESSION_CONTEXT', timestamp: ts(18100), payload: { caseId: 'BRPLL-001' } },
  { id: 'e008', seq: 8, type: 'READ_EPISODE_ENDED', timestamp: ts(18200), payload: { caseId: 'BRPLL-001', episodeType: 'PRE_AI', reason: 'AI_REVEALED' } },
  { id: 'e009', seq: 9, type: 'AI_REVEALED', timestamp: ts(18200), payload: { caseId: 'BRPLL-001', suggestedBirads: 4, aiConfidence: 0.87 } },
  { id: 'e010', seq: 10, type: 'DISCLOSURE_PRESENTED', timestamp: ts(19000), payload: { caseId: 'BRPLL-001', format: 'FDR_FOR', fdr: 0.04, 'for': 0.12 } },
  { id: 'e011', seq: 11, type: 'READ_EPISODE_STARTED', timestamp: ts(19500), payload: { caseId: 'BRPLL-001', episodeType: 'POST_AI' } },
  { id: 'e012', seq: 12, type: 'KEYBOARD_SHORTCUT', timestamp: ts(24000), payload: { key: '2', step: 'AI_REVEALED', timestamp: T0 + 24000 } },
  { id: 'e013', seq: 13, type: 'READ_EPISODE_ENDED', timestamp: ts(28000), payload: { caseId: 'BRPLL-001', episodeType: 'POST_AI' } },
  { id: 'e014', seq: 14, type: 'FINAL_ASSESSMENT', timestamp: ts(28500), payload: { caseId: 'BRPLL-001', initialBirads: 2, finalBirads: 2, aiBirads: 4, aiConfidence: 0.87, changeOccurred: false } },
  { id: 'e015', seq: 15, type: 'TRUST_CALIBRATION', timestamp: ts(30000), payload: { caseId: 'BRPLL-001', preAiExpectation: 50, actualReliance: 30 } },
  { id: 'e016', seq: 16, type: 'CASE_COMPLETED', timestamp: ts(32000), payload: { caseId: 'BRPLL-001' } },
];

export const DEMO_DERIVED_METRICS: DerivedMetrics = {
  sessionId: 'SES-demo-contrast',
  timestamp: ts(32000),
  condition: 'HUMAN_FIRST',
  caseId: 'BRPLL-001',
  initialBirads: 2,
  finalBirads: 2,
  aiBirads: 4,
  aiConfidence: 0.87,
  changeOccurred: false,
  aiConsistentChange: false,
  aiInconsistentChange: false,
  adda: false,
  addaDenominator: true,
  deviationRequired: false,
  deviationDocumented: false,
  deviationSkipped: false,
  comprehensionCorrect: null,
  preAiReadMs: 18000,
  postAiReadMs: 10000,
  totalReadMs: 28000,
  aiExposureMs: 10000,
  timeRatio: 1.8,
  sessionMedianPreAITime: 18000,
  preAITimeVsMedian: 0,
  decisionChangeCount: 0,
  totalTimeMs: 32000,
  lockToRevealMs: 18200,
  revealToFinalMs: 10300,
  revealTiming: 'HUMAN_FIRST',
  disclosureFormat: 'FDR_FOR',
};
