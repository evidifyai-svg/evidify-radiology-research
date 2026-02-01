/**
 * aiValidationConfig.ts
 *
 * Per-AI-system configuration including validation status.
 *
 * SPIEGELHALTER'S FRAMEWORK APPLICATION:
 * This file contains configurations for AI systems with their validation status
 * per the 4-phase framework. Each system is rated based on available evidence.
 *
 * IMPORTANT NOTES:
 * 1. These configurations should be updated as new evidence emerges
 * 2. The assessor should document when and how the assessment was made
 * 3. Simulated phases can be used for study conditions
 *
 * EXAMPLE AI SYSTEMS INCLUDED:
 * - Phase 1 example: Experimental CAD (lab testing only)
 * - Phase 2 example: Commercial CAD like Transpara (expert comparison)
 * - Phase 3 example: Hypothetical AI with outcome data
 * - Phase 4 example: Hypothetical AI with broad implementation
 *
 * Per Liu et al. (2019, JAMA): "The medical profession should demand transparency
 * about AI validation before adopting these tools."
 */

import type {
  AISystemConfig,
  AIValidationStatus,
  ValidationPhase,
  ValidationEvidence,
} from './aiValidationTypes';
import {
  PHASE_NAMES,
  PHASE_EVIDENCE_QUALITY,
  PHASE_DESCRIPTIONS,
  PHASE_RECOMMENDATIONS,
} from './aiValidationTypes';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a complete AIValidationStatus from a phase number.
 * Uses default values from the framework for consistency.
 */
export function createValidationStatus(
  phase: ValidationPhase,
  overrides: Partial<AIValidationStatus> = {}
): AIValidationStatus {
  const baseStatus: AIValidationStatus = {
    phase,
    phaseName: PHASE_NAMES[phase],
    description: PHASE_DESCRIPTIONS[phase].long,
    evidenceQuality: PHASE_EVIDENCE_QUALITY[phase],
    evidence: {},
    limitations: [],
    lastValidated: new Date().toISOString().split('T')[0],
    regulatory: {
      fdaCleared: false,
      ceMarked: false,
      otherApprovals: [],
    },
    recommendation: PHASE_RECOMMENDATIONS[phase],
    requiresHumanOversight: true,
  };

  return { ...baseStatus, ...overrides };
}

// ============================================================================
// SAMPLE AI SYSTEM CONFIGURATIONS
// ============================================================================

/**
 * Phase 1 Example: Experimental CAD System
 * Represents a typical research-stage AI with only dataset validation.
 */
export const EXPERIMENTAL_CAD_CONFIG: AISystemConfig = {
  systemId: 'experimental-cad-v1',
  name: 'ExperimentalCAD Research',
  vendor: 'Research Lab',
  version: '0.9.0',
  type: 'CAD',
  domain: 'Mammography',
  showValidationByDefault: true,
  requireAcknowledgment: true,
  minimumViewingTimeMs: 8000,
  validation: createValidationStatus(1, {
    evidence: {
      datasets: ['INbreast', 'CBIS-DDSM'],
    },
    detailedEvidence: {
      phase1: {
        datasets: [
          {
            name: 'INbreast',
            size: 410,
            year: 2012,
            performance: { auc: 0.89, sensitivity: 0.91, specificity: 0.85 },
            limitations: [
              'Single-center Portuguese dataset',
              'High-quality digital mammography only',
              'May not generalize to older equipment',
            ],
          },
          {
            name: 'CBIS-DDSM',
            size: 2620,
            year: 2017,
            performance: { auc: 0.86, sensitivity: 0.88, specificity: 0.82 },
            limitations: [
              'Converted from film mammography',
              'Cases selected for clear pathology',
              'Does not represent screening population',
            ],
          },
        ],
      },
    },
    limitations: [
      'Only tested on curated research datasets',
      'No prospective clinical validation',
      'Performance in clinical workflow unknown',
      'No comparison to radiologist performance',
      'May not generalize to your patient population',
    ],
    regulatory: {
      fdaCleared: false,
      ceMarked: false,
      otherApprovals: [],
    },
  }),
};

/**
 * Phase 2 Example: Commercial CAD System (Transpara-like)
 * Represents commercial CAD with expert comparison studies.
 *
 * Note: This is a hypothetical configuration based on publicly available
 * information about commercial CAD systems. Actual systems should be
 * configured based on their specific validation evidence.
 */
export const COMMERCIAL_CAD_CONFIG: AISystemConfig = {
  systemId: 'commercial-cad-v2',
  name: 'CommercialCAD Pro',
  vendor: 'Medical AI Corp',
  version: '3.2.1',
  type: 'CAD',
  domain: 'Mammography',
  showValidationByDefault: true,
  requireAcknowledgment: true,
  minimumViewingTimeMs: 5000,
  validation: createValidationStatus(2, {
    evidence: {
      datasets: ['INbreast', 'VinDr-Mammo', 'Private Clinical Dataset'],
      comparisonStudies: [
        'Smith et al. 2023 - AI vs 5 breast radiologists',
        'Johnson et al. 2022 - Multi-reader comparison',
      ],
    },
    detailedEvidence: {
      phase1: {
        datasets: [
          {
            name: 'Private Clinical Dataset',
            size: 15000,
            year: 2022,
            performance: { auc: 0.91, sensitivity: 0.93, specificity: 0.88 },
            limitations: ['Proprietary dataset, not independently verified'],
          },
        ],
      },
      phase2: {
        studies: [
          {
            citation:
              'Smith J, et al. (2023). Comparison of AI-assisted mammography reading with expert radiologists. Radiology, 305(2), 412-420.',
            doi: '10.1148/radiol.2023example',
            nExperts: 5,
            expertLevel: 'SUBSPECIALIST',
            aiVsHuman: 'EQUIVALENT',
            metrics: {
              aiAuc: 0.91,
              humanAuc: 0.89,
              aiSensitivity: 0.93,
              humanSensitivity: 0.91,
            },
            limitations: [
              'Retrospective reader study',
              'Selected cases, not consecutive screening',
              'Experts knew they were being compared to AI',
            ],
          },
          {
            citation:
              'Johnson M, et al. (2022). Multi-reader multi-case evaluation of AI in screening mammography. JAMA Network Open, 5(8), e2228712.',
            pubmedId: '35900000',
            nExperts: 12,
            expertLevel: 'ATTENDING',
            aiVsHuman: 'AI_BETTER',
            metrics: {
              aiAuc: 0.92,
              humanAuc: 0.87,
            },
            limitations: [
              'Enriched case set with high cancer prevalence',
              'Does not reflect true screening workflow',
            ],
          },
        ],
      },
    },
    limitations: [
      'No randomized trial showing improved patient outcomes',
      'Expert comparison studies use enriched case sets',
      'Performance may differ in real screening workflow',
      'No long-term outcome data available',
      'Not validated for all breast density categories',
    ],
    excludedPopulations: [
      'Patients with breast implants',
      'Male patients',
      'Post-surgical breasts',
    ],
    contraindications: [
      'Not for standalone diagnosis',
      'Not for symptomatic patients',
    ],
    regulatory: {
      fdaCleared: true,
      fdaClearanceType: '510k',
      fdaNumber: 'K201234',
      fdaClearanceDate: '2022-03-15',
      ceMarked: true,
      ceClass: 'IIa',
      otherApprovals: ['Health Canada', 'TGA Australia'],
    },
  }),
};

/**
 * Phase 3 Example: AI with Clinical Outcome Evidence
 * Represents hypothetical AI that has shown improved patient outcomes.
 *
 * Note: Very few AI systems have achieved Phase 3 validation.
 * This is included as a reference example.
 */
export const OUTCOME_VALIDATED_CAD_CONFIG: AISystemConfig = {
  systemId: 'outcome-cad-v1',
  name: 'OutcomeValidatedCAD',
  vendor: 'Clinical AI Research',
  version: '4.0.0',
  type: 'CAD',
  domain: 'Mammography',
  showValidationByDefault: true,
  requireAcknowledgment: false,
  minimumViewingTimeMs: 3000,
  validation: createValidationStatus(3, {
    evidence: {
      datasets: ['Large multi-center dataset'],
      comparisonStudies: ['Multiple expert comparison studies'],
      outcomeTrials: ['ScreenSuccess RCT (2024)', 'CAMELYON-C3 Observational (2023)'],
    },
    detailedEvidence: {
      phase1: {
        datasets: [
          {
            name: 'Multi-center Screening Dataset',
            size: 250000,
            year: 2023,
            performance: { auc: 0.94, sensitivity: 0.95, specificity: 0.91 },
            limitations: ['Primarily European population'],
          },
        ],
      },
      phase2: {
        studies: [
          {
            citation:
              'European Consortium (2023). Prospective comparison of AI-assisted screening. Lancet Digital Health.',
            nExperts: 45,
            expertLevel: 'SUBSPECIALIST',
            aiVsHuman: 'AI_BETTER',
            metrics: { aiAuc: 0.94, humanAuc: 0.90 },
            limitations: ['European screening programs only'],
          },
        ],
      },
      phase3: {
        trials: [
          {
            citation:
              'ScreenSuccess Investigators (2024). AI-assisted mammography screening: A cluster randomized trial. NEJM, 390(15), 1402-1415.',
            clinicalTrialId: 'NCT04000000',
            design: 'CLUSTER_RCT',
            nPatients: 80000,
            primaryOutcome: 'Interval cancer rate',
            outcomeImprovement: true,
            effectSize: 0.23,
            confidenceInterval: { lower: 0.12, upper: 0.34 },
            pValue: 0.001,
            nnt: 1250,
            followUpDuration: '24 months',
            limitations: [
              'Nordic screening context may not generalize',
              'Double reading comparator differs from US practice',
              '24-month follow-up, longer-term effects unknown',
            ],
          },
          {
            citation:
              'CAMELYON-C3 Investigators (2023). Observational study of AI implementation. Ann Intern Med.',
            design: 'OBSERVATIONAL',
            nPatients: 45000,
            primaryOutcome: 'Cancer detection rate',
            outcomeImprovement: true,
            effectSize: 0.18,
            followUpDuration: '18 months',
            limitations: [
              'Observational design limits causal inference',
              'Selection bias in implementation sites',
            ],
          },
        ],
      },
    },
    limitations: [
      'Trial conducted in European screening context',
      'May not generalize to US opportunistic screening',
      'Long-term survival benefit not yet demonstrated',
      'Implementation challenges not fully characterized',
    ],
    regulatory: {
      fdaCleared: true,
      fdaClearanceType: 'DeNovo',
      fdaNumber: 'DEN220001',
      fdaClearanceDate: '2024-01-15',
      ceMarked: true,
      ceClass: 'IIb',
      otherApprovals: ['Health Canada', 'TGA Australia', 'PMDA Japan'],
    },
  }),
};

/**
 * Phase 4 Example: Broadly Implemented AI
 * Represents hypothetical AI with sustained real-world implementation.
 *
 * Note: Almost no AI systems have achieved Phase 4 validation.
 * This is included as a reference example of what ideal validation looks like.
 */
export const BROADLY_IMPLEMENTED_CAD_CONFIG: AISystemConfig = {
  systemId: 'broad-impl-cad-v1',
  name: 'BroadImplementedCAD',
  vendor: 'Global Medical AI',
  version: '5.0.0',
  type: 'CAD',
  domain: 'Mammography',
  showValidationByDefault: true,
  requireAcknowledgment: false,
  minimumViewingTimeMs: 2000,
  validation: createValidationStatus(4, {
    evidence: {
      datasets: ['Global multi-center dataset (500k+ cases)'],
      comparisonStudies: ['50+ expert comparison publications'],
      outcomeTrials: ['5 RCTs across 3 continents'],
      implementationStudies: [
        '3-year Nordic implementation',
        'US community hospital network (2 years)',
        'Asian screening program (18 months)',
      ],
    },
    detailedEvidence: {
      phase4: {
        implementations: [
          {
            setting: 'Nordic National Screening Programs',
            region: 'Sweden, Norway, Finland',
            institutionType: 'MIXED',
            duration: '3 years',
            nPatients: 1200000,
            sustainedBenefit: true,
            performanceDrift: false,
            keyFindings: [
              '15% reduction in interval cancers maintained',
              '20% reduction in radiologist workload',
              'Consistent performance across age groups',
            ],
            challenges: [
              'Initial integration required workflow redesign',
              'Training period for radiologist confidence',
            ],
          },
          {
            setting: 'US Community Hospital Network',
            region: 'Midwest United States',
            institutionType: 'COMMUNITY',
            duration: '2 years',
            nPatients: 85000,
            sustainedBenefit: true,
            performanceDrift: false,
            keyFindings: [
              'Successful integration in non-academic setting',
              'Maintained performance with diverse patient population',
            ],
            challenges: [
              'Required IT infrastructure upgrades',
              'Different workflow from European model',
            ],
          },
          {
            setting: 'Asian Urban Screening Program',
            region: 'South Korea, Taiwan',
            institutionType: 'URBAN',
            duration: '18 months',
            nPatients: 150000,
            sustainedBenefit: true,
            performanceDrift: false,
            keyFindings: [
              'Validated in dense breast population',
              'Performance consistent with original trials',
            ],
            challenges: ['Higher baseline density required calibration'],
          },
        ],
      },
    },
    limitations: [
      'Implementation experience still accumulating',
      'Rare presentations may be underrepresented',
      '5+ year outcome data not yet available',
    ],
    regulatory: {
      fdaCleared: true,
      fdaClearanceType: 'PMA',
      fdaNumber: 'P240001',
      fdaClearanceDate: '2024-06-01',
      ceMarked: true,
      ceClass: 'III',
      otherApprovals: [
        'Health Canada',
        'TGA Australia',
        'PMDA Japan',
        'CFDA China',
        'ANVISA Brazil',
      ],
    },
  }),
};

// ============================================================================
// AI SYSTEM REGISTRY
// ============================================================================

/**
 * Registry of all configured AI systems.
 * Use this to look up configuration by system ID.
 */
export const AI_SYSTEM_REGISTRY: Record<string, AISystemConfig> = {
  'experimental-cad-v1': EXPERIMENTAL_CAD_CONFIG,
  'commercial-cad-v2': COMMERCIAL_CAD_CONFIG,
  'outcome-cad-v1': OUTCOME_VALIDATED_CAD_CONFIG,
  'broad-impl-cad-v1': BROADLY_IMPLEMENTED_CAD_CONFIG,
};

/**
 * Get AI system configuration by ID.
 * Returns undefined if system not found.
 */
export function getAISystemConfig(systemId: string): AISystemConfig | undefined {
  return AI_SYSTEM_REGISTRY[systemId];
}

/**
 * Get all registered AI systems.
 */
export function getAllAISystems(): AISystemConfig[] {
  return Object.values(AI_SYSTEM_REGISTRY);
}

/**
 * Get AI systems by validation phase.
 */
export function getAISystemsByPhase(phase: ValidationPhase): AISystemConfig[] {
  return Object.values(AI_SYSTEM_REGISTRY).filter(
    (system) => (system.simulatedPhase ?? system.validation.phase) === phase
  );
}

// ============================================================================
// STUDY CONDITION HELPERS
// ============================================================================

/**
 * Creates a study condition configuration with simulated validation phase.
 * Used for research comparing clinician behavior across validation levels.
 */
export function createStudyConditionConfig(
  baseConfig: AISystemConfig,
  simulatedPhase: ValidationPhase,
  conditionId: string
): AISystemConfig {
  return {
    ...baseConfig,
    systemId: `${baseConfig.systemId}-condition-${conditionId}`,
    simulatedPhase,
    validation: createValidationStatus(simulatedPhase, {
      // Keep regulatory status from base
      regulatory: baseConfig.validation.regulatory,
      // Keep evidence from base (for realism)
      evidence: baseConfig.validation.evidence,
      detailedEvidence: baseConfig.validation.detailedEvidence,
    }),
  };
}

/**
 * Study conditions for validation disclosure research.
 * Maps condition IDs to configurations.
 */
export interface ValidationStudyConditions {
  /** Control: No validation info shown */
  noValidation: { showValidation: false };
  /** Phase 1 disclosure */
  phase1: AISystemConfig;
  /** Phase 2 disclosure */
  phase2: AISystemConfig;
  /** Phase 3 disclosure */
  phase3: AISystemConfig;
  /** Phase 4 disclosure */
  phase4: AISystemConfig;
}

/**
 * Creates study conditions for a base AI system.
 */
export function createValidationStudyConditions(
  baseConfig: AISystemConfig
): ValidationStudyConditions {
  return {
    noValidation: { showValidation: false },
    phase1: createStudyConditionConfig(baseConfig, 1, 'p1'),
    phase2: createStudyConditionConfig(baseConfig, 2, 'p2'),
    phase3: createStudyConditionConfig(baseConfig, 3, 'p3'),
    phase4: createStudyConditionConfig(baseConfig, 4, 'p4'),
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default AI_SYSTEM_REGISTRY;
