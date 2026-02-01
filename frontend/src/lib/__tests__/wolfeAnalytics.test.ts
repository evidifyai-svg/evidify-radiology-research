/**
 * Unit Tests for Wolfe Error Analytics
 *
 * Tests the analytics computation and reporting functions.
 * Run with: npx tsx frontend/src/lib/__tests__/wolfeAnalytics.test.ts
 */

import {
  computeWolfeAnalytics,
  computeRadiologistAnalytics,
  computeSessionAnalytics,
  generateAnalyticsSummary,
  generateVisualizationData,
} from '../wolfeAnalytics';

import type { WolfeErrorClassification, WolfeErrorType } from '../wolfeErrorTypes';

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
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
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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
    toBeCloseTo(expected: number, tolerance: number = 0.01) {
      if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance) {
        throw new Error(`Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`);
      }
    },
  };
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockClassification(
  errorType: WolfeErrorType,
  overrides: Partial<WolfeErrorClassification> = {}
): WolfeErrorClassification {
  return {
    caseId: `case-${Math.random().toString(36).substr(2, 9)}`,
    findingId: `finding-${Math.random().toString(36).substr(2, 9)}`,
    errorType,
    confidence: 0.85,
    evidence: {
      viewportData: {
        regionViewed: errorType !== 'SEARCH_ERROR',
        dwellTimeMs: errorType === 'SEARCH_ERROR' ? 0 : 3000,
        zoomLevel: 2.0,
        visitCount: 1,
        coveragePercent: 80,
      },
      decisionData: {
        initialAssessment: 1,
        finalAssessment: 1,
        groundTruth: 4,
        deviationDocumented: false,
        abnormalityNoted: errorType === 'DECISION_ERROR',
      },
      contextData: {
        prevalenceInStudy: 0.05,
        findingsAlreadyFound: 0,
        findingTypical: true,
      },
    },
    scientificBasis: {
      citation: 'Wolfe (2022)',
      expectedMissRate: 0.3,
    },
    liabilityAssessment: {
      level: errorType === 'DECISION_ERROR' ? 'HIGH' : errorType === 'RECOGNITION_ERROR' ? 'MODERATE' : 'LOW',
      reasoning: 'Test reasoning',
      mitigatingFactors: ['Test factor'],
      aggravatingFactors: [],
    },
    explanation: 'Test explanation',
    expertWitnessStatement: 'Test statement',
    classifiedAt: new Date().toISOString(),
    classifierVersion: '1.0.0',
    ...overrides,
  };
}

function createMixedClassifications(): WolfeErrorClassification[] {
  return [
    createMockClassification('SEARCH_ERROR'),
    createMockClassification('SEARCH_ERROR'),
    createMockClassification('SEARCH_ERROR'),
    createMockClassification('RECOGNITION_ERROR'),
    createMockClassification('RECOGNITION_ERROR'),
    createMockClassification('RECOGNITION_ERROR'),
    createMockClassification('RECOGNITION_ERROR'),
    createMockClassification('RECOGNITION_ERROR'),
    createMockClassification('DECISION_ERROR'),
    createMockClassification('DECISION_ERROR'),
    createMockClassification('CORRECT'),
    createMockClassification('CORRECT'),
    createMockClassification('CORRECT'),
    createMockClassification('CORRECT'),
    createMockClassification('CORRECT'),
  ];
}

// ============================================================================
// computeWolfeAnalytics Tests
// ============================================================================

test('computeWolfeAnalytics counts errors correctly', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.totalErrors).toBe(10); // 3 + 5 + 2
  expect(analytics.totalCorrect).toBe(5);
  expect(analytics.byType.SEARCH_ERROR).toBe(3);
  expect(analytics.byType.RECOGNITION_ERROR).toBe(5);
  expect(analytics.byType.DECISION_ERROR).toBe(2);
  expect(analytics.byType.CORRECT).toBe(5);
});

test('computeWolfeAnalytics calculates percentages correctly', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);

  const total = classifications.length;
  expect(analytics.byTypePercent.SEARCH_ERROR).toBeCloseTo((3 / total) * 100, 0.1);
  expect(analytics.byTypePercent.RECOGNITION_ERROR).toBeCloseTo((5 / total) * 100, 0.1);
  expect(analytics.byTypePercent.CORRECT).toBeCloseTo((5 / total) * 100, 0.1);
});

test('computeWolfeAnalytics calculates average confidence', () => {
  const classifications = [
    createMockClassification('SEARCH_ERROR', { confidence: 0.8 }),
    createMockClassification('RECOGNITION_ERROR', { confidence: 0.9 }),
    createMockClassification('DECISION_ERROR', { confidence: 0.7 }),
  ];

  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.averageConfidence).toBeCloseTo(0.8, 0.01);
});

test('computeWolfeAnalytics tracks liability distribution', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.byLiability.LOW).toBeGreaterThan(0);
  expect(analytics.byLiability.MODERATE).toBeGreaterThan(0);
  expect(analytics.byLiability.HIGH).toBeGreaterThan(0);

  const totalLiability =
    analytics.byLiability.LOW +
    analytics.byLiability.MODERATE +
    analytics.byLiability.HIGH;
  expect(totalLiability).toBe(classifications.length);
});

test('computeWolfeAnalytics handles empty array', () => {
  const analytics = computeWolfeAnalytics([]);

  expect(analytics.totalErrors).toBe(0);
  expect(analytics.totalCorrect).toBe(0);
  expect(analytics.averageConfidence).toBe(0);
});

test('computeWolfeAnalytics compares to expected rates', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.comparisonToExpected).toBeDefined();
  expect(['HIGH', 'MODERATE', 'LOW'].includes(analytics.comparisonToExpected.overallAlignment)).toBeTruthy();
});

test('computeWolfeAnalytics tracks confidence distribution', () => {
  const classifications = [
    createMockClassification('SEARCH_ERROR', { confidence: 0.5 }), // low
    createMockClassification('RECOGNITION_ERROR', { confidence: 0.7 }), // moderate
    createMockClassification('DECISION_ERROR', { confidence: 0.9 }), // high
  ];

  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.confidenceDistribution.low).toBe(1);
  expect(analytics.confidenceDistribution.moderate).toBe(1);
  expect(analytics.confidenceDistribution.high).toBe(1);
});

// ============================================================================
// computeRadiologistAnalytics Tests
// ============================================================================

test('computeRadiologistAnalytics calculates error rate', () => {
  const classifications = createMixedClassifications();
  const analytics = computeRadiologistAnalytics(classifications, 'rad-001');

  expect(analytics.errorRate).toBeCloseTo(10 / 15, 0.01);
  expect(analytics.totalCases).toBe(15);
  expect(analytics.totalErrors).toBe(10);
});

test('computeRadiologistAnalytics identifies primary error type', () => {
  const classifications = createMixedClassifications();
  const analytics = computeRadiologistAnalytics(classifications, 'rad-001');

  expect(analytics.primaryErrorType).toBe('RECOGNITION_ERROR'); // 5 is highest
});

test('computeRadiologistAnalytics determines overall risk', () => {
  const classifications = createMixedClassifications();
  const analytics = computeRadiologistAnalytics(classifications, 'rad-001');

  expect(['LOW', 'MODERATE', 'HIGH'].includes(analytics.liabilityProfile.overallRisk)).toBeTruthy();
});

// ============================================================================
// computeSessionAnalytics Tests
// ============================================================================

test('computeSessionAnalytics calculates accuracy rate', () => {
  const classifications = createMixedClassifications();
  const analytics = computeSessionAnalytics(classifications, 'session-001');

  expect(analytics.metrics.accuracyRate).toBeCloseTo(5 / 15, 0.01);
  expect(analytics.correctlyIdentified).toBe(5);
  expect(analytics.missedFindings).toBe(10);
});

test('computeSessionAnalytics identifies dominant error type', () => {
  const classifications = createMixedClassifications();
  const analytics = computeSessionAnalytics(classifications, 'session-001');

  // With the mixed classifications, RECOGNITION_ERROR has the most errors (5)
  // If no session-specific filtering is applied, we expect RECOGNITION_ERROR
  // The dominant type could be null if the filtering removed all error classifications
  if (analytics.errorClassifications.length > 0) {
    expect(analytics.metrics.dominantErrorType).toBe('RECOGNITION_ERROR');
  } else {
    // If session filtering resulted in no errors, dominantErrorType should be null
    expect(analytics.metrics.dominantErrorType).toBe(null);
  }
});

// ============================================================================
// generateAnalyticsSummary Tests
// ============================================================================

test('generateAnalyticsSummary produces formatted report', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);
  const summary = generateAnalyticsSummary(analytics);

  expect(summary).toContain('WOLFE ERROR TAXONOMY ANALYTICS SUMMARY');
  expect(summary).toContain('OVERVIEW');
  expect(summary).toContain('ERROR TYPE DISTRIBUTION');
  expect(summary).toContain('LIABILITY DISTRIBUTION');
  expect(summary).toContain('COMPARISON TO WOLFE RESEARCH');
});

test('generateAnalyticsSummary includes all error types', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);
  const summary = generateAnalyticsSummary(analytics);

  expect(summary).toContain('SEARCH_ERROR');
  expect(summary).toContain('RECOGNITION_ERROR');
  expect(summary).toContain('DECISION_ERROR');
});

// ============================================================================
// generateVisualizationData Tests
// ============================================================================

test('generateVisualizationData produces pie chart data', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);
  const vizData = generateVisualizationData(analytics);

  expect(vizData.pieChartData.length).toBeGreaterThan(0);
  expect(vizData.pieChartData.every(d => d.name && d.value >= 0 && d.color)).toBeTruthy();
});

test('generateVisualizationData produces bar chart data', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);
  const vizData = generateVisualizationData(analytics);

  expect(vizData.barChartData.length).toBe(4); // Search, Recognition, Decision, Other
  expect(vizData.barChartData.every(d =>
    d.type &&
    typeof d.actual === 'number' &&
    typeof d.expected === 'number'
  )).toBeTruthy();
});

test('generateVisualizationData produces liability data', () => {
  const classifications = createMixedClassifications();
  const analytics = computeWolfeAnalytics(classifications);
  const vizData = generateVisualizationData(analytics);

  expect(vizData.liabilityData.length).toBe(3);
  expect(vizData.liabilityData.map(d => d.level)).toEqual(['LOW', 'MODERATE', 'HIGH']);
});

// ============================================================================
// Edge Cases
// ============================================================================

test('handles single classification', () => {
  const classifications = [createMockClassification('SEARCH_ERROR')];
  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.totalErrors).toBe(1);
  expect(analytics.byType.SEARCH_ERROR).toBe(1);
});

test('handles all CORRECT classifications', () => {
  const classifications = [
    createMockClassification('CORRECT'),
    createMockClassification('CORRECT'),
    createMockClassification('CORRECT'),
  ];
  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.totalErrors).toBe(0);
  expect(analytics.totalCorrect).toBe(3);
});

test('handles all UNCLASSIFIABLE', () => {
  const classifications = [
    createMockClassification('UNCLASSIFIABLE'),
    createMockClassification('UNCLASSIFIABLE'),
  ];
  const analytics = computeWolfeAnalytics(classifications);

  expect(analytics.totalErrors).toBe(0);
  expect(analytics.byType.UNCLASSIFIABLE).toBe(2);
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n🧪 Running Wolfe Analytics Tests\n');
console.log('═'.repeat(60));

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
