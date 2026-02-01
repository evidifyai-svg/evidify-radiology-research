/**
 * Unit Tests for Wolfe Error Taxonomy Classifier
 *
 * Tests the classification algorithm with example cases for each error type.
 * Run with: npx tsx frontend/src/lib/__tests__/wolfeClassifier.test.ts
 */

import { classifyError, generateEvidenceChecks } from '../wolfeClassifier';
import type {
  CaseData,
  ViewportEvent,
  DecisionHistoryEntry,
  StudyContext,
} from '../wolfeErrorTypes';

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  expected?: string;
  actual?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toContain(expected: string) {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected defined value, got undefined`);
      }
    },
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createBaseCaseData(overrides: Partial<CaseData> = {}): CaseData {
  return {
    caseId: 'test-case-001',
    findingId: 'finding-001',
    findingLocation: {
      name: 'UOQ',
      laterality: 'right',
      boundingBox: { x: 0.6, y: 0.0, width: 0.2, height: 0.2 }, // Matches REGION_BOUNDING_BOXES.UOQ
    },
    findingCharacteristics: {
      sizeMm: 8,
      conspicuityIndex: 50,
      type: 'spiculated mass',
    },
    ...overrides,
  };
}

function createStudyContext(overrides: Partial<StudyContext> = {}): StudyContext {
  return {
    totalCases: 1000,
    positiveCases: 50,
    findingTypePrevalence: {
      'spiculated mass': 0.03,
      calcification: 0.08,
      distortion: 0.02,
    },
    ...overrides,
  };
}

// Different bounding boxes for different anatomical regions
// These are carefully positioned to NOT overlap with each other
const REGION_BOUNDING_BOXES: Record<string, { x: number; y: number; width: number; height: number }> = {
  UOQ: { x: 0.6, y: 0.0, width: 0.2, height: 0.2 },      // Upper outer quadrant (right side, top)
  UIQ: { x: 0.0, y: 0.0, width: 0.2, height: 0.2 },      // Upper inner quadrant (left side, top)
  LOQ: { x: 0.6, y: 0.5, width: 0.2, height: 0.2 },      // Lower outer quadrant (right side, bottom)
  LIQ: { x: 0.0, y: 0.5, width: 0.2, height: 0.2 },      // Lower inner quadrant (left side, bottom)
  Central: { x: 0.3, y: 0.3, width: 0.15, height: 0.15 }, // Central region (middle)
  Axilla: { x: 0.85, y: 0.25, width: 0.1, height: 0.1 },  // Axilla (far right, middle)
};

function createViewportEvent(
  timestampMs: number,
  regionName: string,
  durationMs: number = 500,
  zoomLevel: number = 1.5
): ViewportEvent {
  const boundingBox = REGION_BOUNDING_BOXES[regionName] ?? { x: 0.5, y: 0.5, width: 0.1, height: 0.1 };
  return {
    timestampMs,
    type: 'fixation',
    region: {
      name: regionName,
      laterality: 'right',
      boundingBox,
    },
    durationMs,
    zoomLevel,
  };
}

function createDecision(
  assessment: number,
  source: 'initial' | 'ai_suggested' | 'final',
  timestampMs: number = 0
): DecisionHistoryEntry {
  return {
    timestampMs,
    assessment,
    source,
    region: { name: 'UOQ', laterality: 'right' },
  };
}

// ============================================================================
// SEARCH_ERROR Tests
// ============================================================================

test('classifies SEARCH_ERROR when region never viewed', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  // Viewport events that don't include the finding region
  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'Central', 2000),
    createViewportEvent(2500, 'LIQ', 1500),
    createViewportEvent(4000, 'Axilla', 1000),
  ];

  // No decision about this region
  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4 // Ground truth: BI-RADS 4
  );

  expect(classification.errorType).toBe('SEARCH_ERROR');
  expect(classification.evidence.viewportData?.regionViewed).toBe(false);
  expect(classification.liabilityAssessment.level).toBe('LOW');
});

test('classifies SEARCH_ERROR when dwell time insufficient', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  // Brief glance at the region (under minimum dwell)
  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'Central', 2000),
    createViewportEvent(2500, 'UOQ', 150), // Only 150ms - below 200ms threshold
    createViewportEvent(2800, 'LIQ', 1500),
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  expect(classification.errorType).toBe('SEARCH_ERROR');
});

// ============================================================================
// RECOGNITION_ERROR Tests
// ============================================================================

test('classifies RECOGNITION_ERROR when region viewed but not identified', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  // Adequate viewing of the region
  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'Central', 1500),
    createViewportEvent(2000, 'UOQ', 3000, 2.0), // 3 seconds at 2x zoom
    createViewportEvent(5500, 'LIQ', 1000),
  ];

  // No abnormality noted (BI-RADS 1)
  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4 // Ground truth positive
  );

  expect(classification.errorType).toBe('RECOGNITION_ERROR');
  expect(classification.evidence.viewportData?.regionViewed).toBe(true);
  expect(classification.evidence.viewportData?.dwellTimeMs).toBeGreaterThan(2000);
  expect(classification.liabilityAssessment.level).toBe('MODERATE');
});

test('RECOGNITION_ERROR includes adequate viewing evidence', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 4000, 2.5), // 4 seconds at 2.5x zoom
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  expect(classification.errorType).toBe('RECOGNITION_ERROR');
  expect(classification.explanation).toContain('4.0 seconds');
  expect(classification.expertWitnessStatement).toContain('Recognition');
});

// ============================================================================
// DECISION_ERROR Tests
// ============================================================================

test('classifies DECISION_ERROR when abnormality noted but wrong assessment', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 5000, 2.0),
  ];

  // Abnormality noted (BI-RADS 3) but incorrect - ground truth is 4
  const decisions: DecisionHistoryEntry[] = [
    createDecision(2, 'initial'), // Noted something
    createDecision(3, 'final'), // Decided it was probably benign
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4 // Ground truth requires biopsy
  );

  expect(classification.errorType).toBe('DECISION_ERROR');
  expect(classification.evidence.decisionData?.abnormalityNoted).toBe(true);
  expect(classification.liabilityAssessment.level).toBe('HIGH');
});

test('DECISION_ERROR has higher liability without documentation', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 5000, 2.0),
  ];

  // AI suggested 4, radiologist chose 3 without documentation
  const decisions: DecisionHistoryEntry[] = [
    createDecision(3, 'initial'),
    createDecision(4, 'ai_suggested'),
    createDecision(3, 'final'),
    // No notes provided
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  expect(classification.errorType).toBe('DECISION_ERROR');
  const hasNoDocumentation = classification.liabilityAssessment.aggravatingFactors.some(
    (f) => f.toLowerCase().includes('documentation') || f.toLowerCase().includes('reasoning')
  );
  expect(hasNoDocumentation).toBeTruthy();
});

// ============================================================================
// CORRECT Classification Tests
// ============================================================================

test('classifies CORRECT when assessment matches ground truth', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 5000, 2.0),
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(4, 'initial'),
    createDecision(4, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4 // Matches final assessment
  );

  expect(classification.errorType).toBe('CORRECT');
  expect(classification.liabilityAssessment.level).toBe('LOW');
});

test('classifies CORRECT when BI-RADS 0 for positive finding', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 5000, 2.0),
  ];

  // Radiologist recommends additional imaging (BI-RADS 0)
  const decisions: DecisionHistoryEntry[] = [
    createDecision(2, 'initial'),
    createDecision(0, 'final'), // Need additional imaging
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4 // Ground truth positive - but BI-RADS 0 is acceptable
  );

  expect(classification.errorType).toBe('CORRECT');
});

// ============================================================================
// PREVALENCE_EFFECT Tests
// ============================================================================

test('considers PREVALENCE_EFFECT for low prevalence findings', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext({
    totalCases: 10000,
    positiveCases: 50, // 0.5% prevalence - very low
  });

  // Brief but present viewing
  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 800, 1.2), // Not adequate but viewed
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  // Could be classified as PREVALENCE_EFFECT or SEARCH_ERROR
  expect(['PREVALENCE_EFFECT', 'SEARCH_ERROR'].includes(classification.errorType)).toBeTruthy();

  if (classification.errorType === 'PREVALENCE_EFFECT') {
    expect(classification.liabilityAssessment.level).toBe('LOW');
    expect(classification.scientificBasis.citation).toContain('Wolfe');
  }
});

// ============================================================================
// Evidence Generation Tests
// ============================================================================

test('generateEvidenceChecks produces correct checks', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 3200, 2.1),
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  const checks = generateEvidenceChecks(classification);

  expect(checks.length).toBeGreaterThan(0);

  const regionCheck = checks.find((c) => c.label === 'Region was viewed');
  expect(regionCheck).toBeDefined();
  expect(regionCheck?.passed).toBe(true);

  const dwellCheck = checks.find((c) => c.label === 'Adequate dwell time');
  expect(dwellCheck).toBeDefined();
});

// ============================================================================
// Expert Witness Statement Tests
// ============================================================================

test('expert witness statement includes required sections', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 3200, 2.1),
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  const statement = classification.expertWitnessStatement;

  expect(statement).toContain('WOLFE ERROR CLASSIFICATION REPORT');
  expect(statement).toContain('ANALYSIS');
  expect(statement).toContain('SCIENTIFIC CONTEXT');
  expect(statement).toContain('LIABILITY IMPLICATIONS');
  expect(statement).toContain('CONCLUSION');
});

// ============================================================================
// Confidence Calculation Tests
// ============================================================================

test('confidence increases with corroborating evidence', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext();

  // Multiple long views with high zoom
  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 3000, 2.5),
    createViewportEvent(4000, 'Central', 1000),
    createViewportEvent(5500, 'UOQ', 2500, 2.0), // Second look
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  expect(classification.confidence).toBeGreaterThan(0.7);
});

test('confidence is lower with missing data compared to complete data', () => {
  const caseData = createBaseCaseData();
  const studyContext = createStudyContext({
    totalCases: 0, // Missing context data
    positiveCases: 0,
    findingTypePrevalence: {},
  });

  // No viewport events
  const viewportHistory: ViewportEvent[] = [];

  // Minimal decision data
  const decisions: DecisionHistoryEntry[] = [];

  const classificationMissing = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  // Compare with complete data
  const completeContext = createStudyContext();
  const completeViewport = [createViewportEvent(0, 'UOQ', 5000, 2.5)];
  const completeDecisions = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classificationComplete = classifyError(
    caseData,
    completeViewport,
    completeDecisions,
    completeContext,
    4
  );

  // Missing data should have lower confidence than complete data
  expect(classificationMissing.confidence).toBeLessThan(classificationComplete.confidence);
});

// ============================================================================
// Liability Assessment Tests
// ============================================================================

test('liability increases for obvious findings', () => {
  const caseData = createBaseCaseData({
    findingCharacteristics: {
      sizeMm: 15,
      conspicuityIndex: 85, // High conspicuity
      type: 'spiculated mass',
    },
  });
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 4000, 2.0),
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  expect(classification.liabilityAssessment.level).toBe('HIGH');
  const hasObviousFactor = classification.liabilityAssessment.aggravatingFactors.some(
    (f) => f.toLowerCase().includes('obvious') || f.toLowerCase().includes('conspicuity')
  );
  expect(hasObviousFactor).toBeTruthy();
});

test('liability decreases for subtle findings', () => {
  const caseData = createBaseCaseData({
    findingCharacteristics: {
      sizeMm: 5,
      conspicuityIndex: 25, // Low conspicuity
      type: 'subtle distortion',
      surroundingDensity: 'dense',
    },
  });
  const studyContext = createStudyContext();

  const viewportHistory: ViewportEvent[] = [
    createViewportEvent(0, 'UOQ', 4000, 2.0),
  ];

  const decisions: DecisionHistoryEntry[] = [
    createDecision(1, 'initial'),
    createDecision(1, 'final'),
  ];

  const classification = classifyError(
    caseData,
    viewportHistory,
    decisions,
    studyContext,
    4
  );

  const hasSubtleFactor = classification.liabilityAssessment.mitigatingFactors.some(
    (f) => f.toLowerCase().includes('subtle') || f.toLowerCase().includes('conspicuity')
  );
  expect(hasSubtleFactor).toBeTruthy();
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n🧪 Running Wolfe Error Taxonomy Tests\n');
console.log('═'.repeat(60));

// Output results
let passed = 0;
let failed = 0;

results.forEach((result) => {
  if (result.passed) {
    console.log(`✅ ${result.name}`);
    passed++;
  } else {
    console.log(`❌ ${result.name}`);
    console.log(`   Error: ${result.error}`);
    failed++;
  }
});

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
