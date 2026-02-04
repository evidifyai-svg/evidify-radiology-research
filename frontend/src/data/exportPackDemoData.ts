import type { CanonicalEvent, CanonicalLedgerEntry } from '../lib/CanonicalHash';
import type { TrialManifest, DerivedMetrics, VerifierOutput } from '../components/PacketViewer';

const T0 = new Date('2026-02-04T10:00:00.000Z').getTime();
const ts = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

// Helper to generate fake hex hashes
const fakeHash = (seed: string) => {
  let h = '';
  for (let i = 0; i < 64; i++) {
    h += ((seed.charCodeAt(i % seed.length) * (i + 7)) % 16).toString(16);
  }
  return h;
};

export const DEMO_PACK_SESSION_ID = 'SES-demo-inspector';

export const DEMO_PACK_EVENTS: CanonicalEvent[] = [
  { id: 'evt-001', seq: 0, type: 'SESSION_START', timestamp: ts(0), payload: { participantId: 'P-demo', condition: 'HUMAN_FIRST' } },
  { id: 'evt-002', seq: 1, type: 'CASE_LOADED', timestamp: ts(500), payload: { caseId: 'BRPLL-001', condition: 'HUMAN_FIRST' } },
  { id: 'evt-003', seq: 2, type: 'READ_EPISODE_STARTED', timestamp: ts(1000), payload: { caseId: 'BRPLL-001', episodeType: 'PRE_AI' } },
  { id: 'evt-004', seq: 3, type: 'GAZE_ENTERED_ROI', timestamp: ts(8000), payload: { caseId: 'BRPLL-001', roiId: 'mass-upper-outer' } },
  { id: 'evt-005', seq: 4, type: 'DWELL_TIME_ROI', timestamp: ts(12000), payload: { caseId: 'BRPLL-001', roiId: 'mass-upper-outer', dwellMs: 3200 } },
  { id: 'evt-006', seq: 5, type: 'ATTENTION_COVERAGE_PROXY', timestamp: ts(15000), payload: { caseId: 'BRPLL-001', coveragePercent: 0.72 } },
  { id: 'evt-007', seq: 6, type: 'FIRST_IMPRESSION_LOCKED', timestamp: ts(18000), payload: { caseId: 'BRPLL-001', initialBirads: 2, confidence: 65 } },
  { id: 'evt-008', seq: 7, type: 'READ_EPISODE_ENDED', timestamp: ts(18200), payload: { caseId: 'BRPLL-001', episodeType: 'PRE_AI', reason: 'AI_REVEALED' } },
  { id: 'evt-009', seq: 8, type: 'AI_REVEALED', timestamp: ts(18200), payload: { caseId: 'BRPLL-001', suggestedBirads: 4, aiConfidence: 0.87 } },
  { id: 'evt-010', seq: 9, type: 'DISCLOSURE_PRESENTED', timestamp: ts(19000), payload: { caseId: 'BRPLL-001', format: 'FDR_FOR', fdr: 0.04, 'for': 0.12 } },
  { id: 'evt-011', seq: 10, type: 'READ_EPISODE_STARTED', timestamp: ts(19500), payload: { caseId: 'BRPLL-001', episodeType: 'POST_AI' } },
  { id: 'evt-012', seq: 11, type: 'READ_EPISODE_ENDED', timestamp: ts(28000), payload: { caseId: 'BRPLL-001', episodeType: 'POST_AI' } },
  { id: 'evt-013', seq: 12, type: 'FINAL_ASSESSMENT', timestamp: ts(28500), payload: { caseId: 'BRPLL-001', initialBirads: 2, finalBirads: 2, aiBirads: 4, changeOccurred: false } },
  { id: 'evt-014', seq: 13, type: 'CASE_COMPLETED', timestamp: ts(32000), payload: { caseId: 'BRPLL-001' } },
  { id: 'evt-015', seq: 14, type: 'SESSION_END', timestamp: ts(35000), payload: {} },
];

export const DEMO_PACK_LEDGER: CanonicalLedgerEntry[] = DEMO_PACK_EVENTS.map((evt, i) => ({
  seq: evt.seq,
  eventId: evt.id,
  eventType: evt.type,
  timestamp: evt.timestamp,
  contentHash: fakeHash(`content-${evt.id}-${i}`),
  previousHash: i === 0 ? 'GENESIS' : fakeHash(`chain-${DEMO_PACK_EVENTS[i - 1].id}-${i - 1}`),
  chainHash: fakeHash(`chain-${evt.id}-${i}`),
}));

export const DEMO_PACK_MANIFEST: TrialManifest = {
  exportVersion: '2.1.0',
  schemaVersion: '1.4.0',
  exportTimestamp: ts(36000),
  sessionId: DEMO_PACK_SESSION_ID,
  participantId: 'P-demo',
  condition: 'HUMAN_FIRST',
  integrity: {
    eventCount: DEMO_PACK_EVENTS.length,
    finalHash: fakeHash('final-chain-hash-demo'),
    chainValid: true,
  },
  protocol: {
    revealTiming: 'HUMAN_FIRST',
    disclosureFormat: 'FDR_FOR',
    deviationEnforcement: 'DOCUMENT_OR_JUSTIFY',
  },
  timestampTrustModel: 'client_clock_untrusted',
  fileChecksums: {
    events: fakeHash('checksum-events'),
    ledger: fakeHash('checksum-ledger'),
    metrics: fakeHash('checksum-metrics'),
  },
  disclosureProvenance: {
    fdrValue: 0.04,
    forValue: 0.12,
    source: 'BRPLL_PROTOCOL_V1',
    thresholdHash: fakeHash('threshold-hash'),
  },
  randomization: {
    seed: 'brpll-demo-seed-2026',
    assignmentMethod: 'STRATIFIED_BLOCK',
    conditionMatrixHash: fakeHash('condition-matrix'),
  },
};

export const DEMO_PACK_METRICS: DerivedMetrics = {
  sessionId: DEMO_PACK_SESSION_ID,
  timestamp: ts(32000),
  initialBirads: 2,
  finalBirads: 2,
  aiBirads: 4,
  aiConfidence: 0.87,
  changeOccurred: false,
  aiConsistentChange: false,
  aiInconsistentChange: false,
  adda: false,
  addaDenominator: true,
  deviationDocumented: false,
  deviationSkipped: false,
  deviationRequired: false,
  comprehensionCorrect: null,
  totalTimeMs: 32000,
  lockToRevealMs: 18200,
  revealToFinalMs: 10300,
};

export const DEMO_PACK_VERIFIER: VerifierOutput = {
  result: 'PASS',
  timestamp: ts(36500),
  checks: [
    { name: 'Event Count Match', status: 'PASS', message: `Manifest declares ${DEMO_PACK_EVENTS.length} events, found ${DEMO_PACK_EVENTS.length}` },
    { name: 'Hash Chain Integrity', status: 'PASS', message: 'All chain links valid — no gaps or mismatches' },
    { name: 'Timestamp Monotonicity', status: 'PASS', message: 'All timestamps strictly increasing' },
    { name: 'Sequence Continuity', status: 'PASS', message: 'Sequence numbers 0–14 with no gaps' },
    { name: 'Pre-AI Lock Verified', status: 'PASS', message: 'FIRST_IMPRESSION_LOCKED precedes AI_REVEALED in chain' },
    { name: 'Disclosure Logged', status: 'PASS', message: 'FDR/FOR disclosure event present with values' },
    { name: 'Final Hash Match', status: 'PASS', message: 'Computed final hash matches manifest declaration' },
    { name: 'Schema Version', status: 'PASS', message: 'Schema version 1.4.0 is current' },
  ],
  summary: {
    passed: 8,
    failed: 0,
    warnings: 0,
  },
};
