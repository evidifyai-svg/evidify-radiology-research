// ---------------------------------------------------------------------------
// Competency Report Demo Data
// Study 4: Corporate Negligence & Physician Deskilling
// Periodic AI-free calibration sessions to document maintained competency
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalibrationSession {
  sessionId: string;
  date: string;
  casesEvaluated: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  averageReadingTime: number; // seconds
  confidenceRatings: number[]; // 0-100 for each case
}

export interface CompetencyReport {
  radiologist: {
    name: string;
    credentials: string;
    licenseNumber: string;
    institution: string;
  };
  reportPeriod: {
    start: string;
    end: string;
  };
  calibrationSessions: CalibrationSession[];
  aggregateMetrics: {
    totalSessions: number;
    totalCases: number;
    sensitivity: number;
    specificity: number;
    accuracy: number;
    averageConfidence: number;
    performanceTrend: 'improving' | 'stable' | 'declining';
    trendPValue?: number;
  };
  certification: {
    statement: string;
    generatedAt: string;
    verificationHash: string;
  };
}

// ---------------------------------------------------------------------------
// Helper: compute session-level metrics
// ---------------------------------------------------------------------------

function sessionSensitivity(s: CalibrationSession): number {
  const denom = s.truePositives + s.falseNegatives;
  return denom > 0 ? s.truePositives / denom : 0;
}

function sessionSpecificity(s: CalibrationSession): number {
  const denom = s.trueNegatives + s.falsePositives;
  return denom > 0 ? s.trueNegatives / denom : 0;
}

export { sessionSensitivity, sessionSpecificity };

// ---------------------------------------------------------------------------
// Demo data — 12 monthly calibration sessions across 2025
// ---------------------------------------------------------------------------

const DEMO_SESSIONS: CalibrationSession[] = [
  {
    sessionId: 'cal-001',
    date: '2025-01-15',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 8,
    falsePositives: 2,
    falseNegatives: 1,
    averageReadingTime: 45,
    confidenceRatings: [82, 78, 91, 65, 73, 88, 70, 84, 76, 80, 69, 85, 77, 90, 72, 81, 74, 86, 68, 79],
  },
  {
    sessionId: 'cal-002',
    date: '2025-02-12',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 9,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 42,
    confidenceRatings: [85, 80, 88, 72, 76, 91, 74, 83, 79, 87, 71, 89, 75, 82, 78, 84, 70, 86, 73, 81],
  },
  {
    sessionId: 'cal-003',
    date: '2025-03-18',
    casesEvaluated: 20,
    truePositives: 10,
    trueNegatives: 7,
    falsePositives: 2,
    falseNegatives: 1,
    averageReadingTime: 48,
    confidenceRatings: [79, 83, 90, 68, 75, 87, 72, 81, 77, 85, 66, 88, 74, 91, 70, 82, 76, 84, 69, 80],
  },
  {
    sessionId: 'cal-004',
    date: '2025-04-22',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 8,
    falsePositives: 2,
    falseNegatives: 1,
    averageReadingTime: 44,
    confidenceRatings: [81, 77, 89, 66, 74, 86, 71, 83, 78, 84, 68, 87, 73, 90, 69, 80, 75, 85, 67, 82],
  },
  {
    sessionId: 'cal-005',
    date: '2025-05-20',
    casesEvaluated: 20,
    truePositives: 10,
    trueNegatives: 8,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 41,
    confidenceRatings: [84, 79, 92, 70, 76, 89, 73, 85, 80, 88, 71, 90, 77, 83, 74, 86, 72, 87, 69, 81],
  },
  {
    sessionId: 'cal-006',
    date: '2025-06-17',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 9,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 43,
    confidenceRatings: [83, 78, 90, 69, 75, 88, 72, 84, 79, 86, 70, 89, 76, 82, 73, 85, 71, 87, 68, 80],
  },
  {
    sessionId: 'cal-007',
    date: '2025-07-15',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 8,
    falsePositives: 2,
    falseNegatives: 1,
    averageReadingTime: 46,
    confidenceRatings: [80, 76, 88, 67, 73, 86, 70, 82, 77, 83, 68, 87, 74, 89, 71, 81, 75, 84, 66, 79],
  },
  {
    sessionId: 'cal-008',
    date: '2025-08-19',
    casesEvaluated: 20,
    truePositives: 10,
    trueNegatives: 8,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 40,
    confidenceRatings: [86, 81, 93, 71, 77, 90, 74, 86, 81, 89, 72, 91, 78, 84, 75, 87, 73, 88, 70, 82],
  },
  {
    sessionId: 'cal-009',
    date: '2025-09-16',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 9,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 42,
    confidenceRatings: [84, 79, 91, 70, 76, 89, 73, 85, 80, 87, 71, 90, 77, 83, 74, 86, 72, 88, 69, 81],
  },
  {
    sessionId: 'cal-010',
    date: '2025-10-21',
    casesEvaluated: 20,
    truePositives: 10,
    trueNegatives: 7,
    falsePositives: 2,
    falseNegatives: 1,
    averageReadingTime: 47,
    confidenceRatings: [82, 77, 89, 68, 74, 87, 71, 83, 78, 85, 69, 88, 75, 90, 72, 81, 76, 84, 67, 80],
  },
  {
    sessionId: 'cal-011',
    date: '2025-11-18',
    casesEvaluated: 20,
    truePositives: 9,
    trueNegatives: 9,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 43,
    confidenceRatings: [85, 80, 92, 71, 77, 90, 74, 86, 81, 88, 72, 91, 78, 84, 75, 87, 73, 89, 70, 82],
  },
  {
    sessionId: 'cal-012',
    date: '2025-12-16',
    casesEvaluated: 20,
    truePositives: 10,
    trueNegatives: 8,
    falsePositives: 1,
    falseNegatives: 1,
    averageReadingTime: 41,
    confidenceRatings: [86, 81, 93, 72, 78, 91, 75, 87, 82, 89, 73, 92, 79, 85, 76, 88, 74, 90, 71, 83],
  },
];

// ---------------------------------------------------------------------------
// Exported demo report
// ---------------------------------------------------------------------------

export const DEMO_COMPETENCY_REPORT: CompetencyReport = {
  radiologist: {
    name: 'Dr. Sarah Chen',
    credentials: 'MD, Board Certified Diagnostic Radiology',
    licenseNumber: 'NY-12345',
    institution: 'University Medical Center',
  },
  reportPeriod: {
    start: '2025-01-01',
    end: '2025-12-31',
  },
  calibrationSessions: DEMO_SESSIONS,
  aggregateMetrics: {
    totalSessions: 12,
    totalCases: 240,
    sensitivity: 0.942,
    specificity: 0.871,
    accuracy: 0.908,
    averageConfidence: 76.3,
    performanceTrend: 'stable',
    trendPValue: 0.73,
  },
  certification: {
    statement: 'Maintains independent diagnostic competency',
    generatedAt: new Date().toISOString(),
    verificationHash: '7a3f8c2d9e1b4a6f0d3c7e5b2a8f1c4d6e9b3a7f0c2d5e8b1a4f7c0d3e6b9a',
  },
};
