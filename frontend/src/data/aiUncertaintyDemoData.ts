/**
 * aiUncertaintyDemoData.ts
 *
 * Demo AI recommendations for uncertainty display mode research.
 * Each case includes the full set of metrics; the AIRecommendationDisplay
 * component decides what to reveal based on the active display mode.
 */

// Re-export the shared type so consumers can import from one place
export type { AIRecommendation } from '../components/research/AIRecommendationDisplay';

import type { AIRecommendation } from '../components/research/AIRecommendationDisplay';

export const DEMO_AI_RECOMMENDATIONS: Record<string, AIRecommendation> = {
  case_001: {
    recommendation: 'ABNORMAL',
    finding: 'Suspicious mass, right upper quadrant',
    location: 'RUQ',
    confidence: 78,
    falseDiscoveryRate: 12,
    falseOmissionRate: 8,
    cohortPrevalence: 23,
    calibrationNote: 'Well-calibrated at this confidence level',
  },
  case_002: {
    recommendation: 'NORMAL',
    finding: undefined,
    confidence: 92,
    falseDiscoveryRate: 12,
    falseOmissionRate: 8,
    cohortPrevalence: 77,
  },
  case_003: {
    recommendation: 'ABNORMAL',
    finding: 'Possible nodule, left lower lobe',
    location: 'LLL',
    confidence: 54,
    falseDiscoveryRate: 12,
    falseOmissionRate: 8,
    cohortPrevalence: 15,
    calibrationNote: 'Lower confidence - consider clinical correlation',
  },
};
