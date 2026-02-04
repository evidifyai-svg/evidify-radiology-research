import type { WorkloadMetrics } from '../types/workloadTypes';
import type { CohortComparison } from '../components/research/WorkloadDashboard';
import { DEFAULT_WORKLOAD_THRESHOLDS } from '../types/workloadTypes';

export const DEMO_WORKLOAD_SESSION: WorkloadMetrics = {
  sessionId: 'SES-demo-workload',
  sessionStartTime: '2026-02-04T09:00:00.000Z',
  casesCompleted: 12,
  totalReadingTimeMs: 28 * 60 * 1000, // 28 minutes
  averageTimePerCaseMs: 140000, // 2:20 per case
  casesPerHour: 25.7,
  workloadStatus: 'GREEN',
  sessionDurationIndex: 22,
  thresholds: DEFAULT_WORKLOAD_THRESHOLDS,
};

export const DEMO_COHORT_DATA: CohortComparison = {
  practiceName: 'Regional Breast Imaging Center',
  practiceSize: 14,
  periodLabel: 'Jan 2025 – Jan 2026',
  metrics: {
    avgCasesPerHour: 27.3,
    medianCasesPerHour: 26.1,
    avgTimePerCaseMs: 132000,
    medianTimePerCaseMs: 138000,
    avgSessionDurationMin: 95,
    p25CasesPerHour: 21.4,
    p75CasesPerHour: 32.8,
    p25TimePerCaseMs: 110000,
    p75TimePerCaseMs: 168000,
  },
};
