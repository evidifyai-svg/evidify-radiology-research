/**
 * shamAIDemoData.ts
 *
 * Demo sham AI manifest following the methodology of
 * Bernstein et al. (European Radiology, 2023) and Dratsch et al. (Radiology, 2023).
 *
 * 90 total cases, 12 sham (8 false positive, 4 false negative) → ~13% sham rate.
 * Target AUC 0.87 to match Bernstein's experimental parameters.
 */

import type { ShamAIManifest } from '../lib/shamAIManager';

export const DEMO_SHAM_MANIFEST: ShamAIManifest = {
  studyId: 'demo-sham-study',
  description: 'Demo sham AI manifest following Bernstein et al. methodology',
  totalCases: 90,
  shamCaseCount: 12,
  shamDistribution: {
    falsePositives: 8,
    falseNegatives: 4,
  },
  targetAUC: 0.87,
  cases: [
    // ========================================================================
    // CORRECT cases (78 total — showing representative subset)
    // ========================================================================
    { caseId: 'case-001', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-002', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-003', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-004', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-005', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-006', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-007', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-008', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-009', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-010', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-011', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-012', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-013', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-014', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },

    // ========================================================================
    // FALSE POSITIVE sham cases (8) — AI says ABNORMAL, actually NORMAL
    // ========================================================================
    {
      caseId: 'case-015',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Suspicious opacity, right lower lobe',
      shamConfidence: 82,
    },
    {
      caseId: 'case-028',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Possible nodule, left apex',
      shamConfidence: 76,
    },
    {
      caseId: 'case-034',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Architectural distortion, upper outer quadrant',
      shamConfidence: 79,
    },
    {
      caseId: 'case-039',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Asymmetric density, retroareolar region',
      shamConfidence: 71,
    },
    {
      caseId: 'case-051',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Indeterminate calcifications, left breast',
      shamConfidence: 84,
    },
    {
      caseId: 'case-058',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Focal asymmetry, right upper quadrant',
      shamConfidence: 73,
    },
    {
      caseId: 'case-070',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Possible mass, left lower quadrant',
      shamConfidence: 80,
    },
    {
      caseId: 'case-083',
      groundTruth: 'NORMAL',
      shamAIRecommendation: 'ABNORMAL',
      shamType: 'FALSE_POSITIVE',
      shamFinding: 'Suspicious microcalcifications, right breast',
      shamConfidence: 77,
    },

    // ========================================================================
    // FALSE NEGATIVE sham cases (4) — AI says NORMAL, actually ABNORMAL
    // ========================================================================
    {
      caseId: 'case-042',
      groundTruth: 'ABNORMAL',
      shamAIRecommendation: 'NORMAL',
      shamType: 'FALSE_NEGATIVE',
      shamConfidence: 88,
    },
    {
      caseId: 'case-067',
      groundTruth: 'ABNORMAL',
      shamAIRecommendation: 'NORMAL',
      shamType: 'FALSE_NEGATIVE',
      shamConfidence: 91,
    },
    {
      caseId: 'case-076',
      groundTruth: 'ABNORMAL',
      shamAIRecommendation: 'NORMAL',
      shamType: 'FALSE_NEGATIVE',
      shamConfidence: 86,
    },
    {
      caseId: 'case-089',
      groundTruth: 'ABNORMAL',
      shamAIRecommendation: 'NORMAL',
      shamType: 'FALSE_NEGATIVE',
      shamConfidence: 90,
    },

    // ========================================================================
    // Remaining CORRECT cases (64 more in a real study)
    // ========================================================================
    { caseId: 'case-016', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-017', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-018', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-019', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-020', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-021', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-022', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-023', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-024', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-025', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-026', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-027', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-029', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-030', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-031', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-032', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-033', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-035', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-036', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-037', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-038', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-040', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-041', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-043', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-044', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-045', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-046', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-047', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-048', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-049', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-050', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-052', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-053', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-054', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-055', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-056', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-057', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-059', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-060', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-061', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-062', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-063', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-064', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-065', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-066', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-068', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-069', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-071', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-072', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-073', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-074', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-075', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-077', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-078', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-079', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-080', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-081', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-082', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-084', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-085', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-086', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-087', groundTruth: 'ABNORMAL', shamAIRecommendation: 'ABNORMAL', shamType: 'CORRECT' },
    { caseId: 'case-088', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
    { caseId: 'case-090', groundTruth: 'NORMAL', shamAIRecommendation: 'NORMAL', shamType: 'CORRECT' },
  ],
};
