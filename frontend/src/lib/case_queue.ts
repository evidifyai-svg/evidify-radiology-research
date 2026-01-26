/**
 * case_queue.ts
 * 
 * Multi-case sequencing with counterbalancing for BRPLL studies
 * Supports MRMC (Multi-Reader Multi-Case) study designs
 */

export interface CaseDefinition {
  caseId: string;
  inbreastId: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  groundTruth: {
    birads: number;
    pathology?: 'BENIGN' | 'MALIGNANT' | 'UNKNOWN';
    lesionType?: 'MASS' | 'CALC' | 'ASYMMETRY' | 'DISTORTION' | 'NONE';
  };
  aiSuggestion: {
    birads: number;
    confidence: number;
    finding: string;
  };
  images: {
    RCC: string;
    LCC: string;
    RMLO: string;
    LMLO: string;
  };
  metadata: {
    patientAge: number;
    breastDensity: 'A' | 'B' | 'C' | 'D';
    indication: 'SCREENING' | 'DIAGNOSTIC';
  };
  isAttentionCheck?: boolean;
  isCalibration?: boolean;
}

// Demo case library using INbreast images
export const CASE_LIBRARY: CaseDefinition[] = [
  {
    caseId: 'BRPLL-001',
    inbreastId: '20586908',
    difficulty: 'MEDIUM',
    groundTruth: { birads: 4, pathology: 'MALIGNANT', lesionType: 'MASS' },
    aiSuggestion: { birads: 4, confidence: 87, finding: 'Suspicious mass in upper outer quadrant' },
    images: {
      RCC: '/images/inbreast/20586908_6c613a14b80a8591_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20586934_6c613a14b80a8591_MG_L_CC_ANON.png',
      RMLO: '/images/inbreast/20586960_6c613a14b80a8591_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20586986_6c613a14b80a8591_MG_L_ML_ANON.png',
    },
    metadata: { patientAge: 52, breastDensity: 'B', indication: 'SCREENING' },
  },
  {
    caseId: 'BRPLL-002',
    inbreastId: '20587054',
    difficulty: 'EASY',
    groundTruth: { birads: 2, pathology: 'BENIGN', lesionType: 'NONE' },
    aiSuggestion: { birads: 2, confidence: 94, finding: 'No suspicious findings' },
    images: {
      RCC: '/images/inbreast/20587054_b6a4f750c6df4f90_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20587054_b6a4f750c6df4f90_MG_R_CC_ANON.png', // Using same for demo
      RMLO: '/images/inbreast/20587080_b6a4f750c6df4f90_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20587080_b6a4f750c6df4f90_MG_R_ML_ANON.png',
    },
    metadata: { patientAge: 45, breastDensity: 'A', indication: 'SCREENING' },
  },
  {
    caseId: 'BRPLL-003',
    inbreastId: '20587148',
    difficulty: 'HARD',
    groundTruth: { birads: 5, pathology: 'MALIGNANT', lesionType: 'MASS' },
    aiSuggestion: { birads: 3, confidence: 62, finding: 'Probably benign finding' }, // AI wrong here
    images: {
      RCC: '/images/inbreast/20587148_fd746d25eb40b3dc_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20587174_fd746d25eb40b3dc_MG_L_CC_ANON.png',
      RMLO: '/images/inbreast/20587200_fd746d25eb40b3dc_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20587226_fd746d25eb40b3dc_MG_L_ML_ANON.png',
    },
    metadata: { patientAge: 61, breastDensity: 'C', indication: 'DIAGNOSTIC' },
  },
  // Attention check case - obvious finding
  {
    caseId: 'BRPLL-ATN-001',
    inbreastId: '20587294',
    difficulty: 'EASY',
    groundTruth: { birads: 5, pathology: 'MALIGNANT', lesionType: 'MASS' },
    aiSuggestion: { birads: 5, confidence: 99, finding: 'Large obvious mass - attention check' },
    images: {
      RCC: '/images/inbreast/20587294_e634830794f5c1bd_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20587320_e634830794f5c1bd_MG_L_CC_ANON.png',
      RMLO: '/images/inbreast/20587346_e634830794f5c1bd_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20587372_e634830794f5c1bd_MG_L_ML_ANON.png',
    },
    metadata: { patientAge: 58, breastDensity: 'B', indication: 'DIAGNOSTIC' },
    isAttentionCheck: true,
  },
  // Calibration case with feedback
  {
    caseId: 'BRPLL-CAL-001',
    inbreastId: '20587466',
    difficulty: 'MEDIUM',
    groundTruth: { birads: 4, pathology: 'MALIGNANT', lesionType: 'CALC' },
    aiSuggestion: { birads: 4, confidence: 78, finding: 'Suspicious calcifications' },
    images: {
      RCC: '/images/inbreast/20587544_d571b5880ad2a016_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20587466_d571b5880ad2a016_MG_L_CC_ANON.png',
      RMLO: '/images/inbreast/20587492_d571b5880ad2a016_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20587518_d571b5880ad2a016_MG_L_ML_ANON.png',
    },
    metadata: { patientAge: 49, breastDensity: 'B', indication: 'SCREENING' },
    isCalibration: true,
  },
];

export interface CaseQueueConfig {
  includeCalibration: boolean;
  includeAttentionChecks: boolean;
  casesPerSession: number;
  randomizeOrder: boolean;
  seed?: string;
}

export interface CaseQueueState {
  queueId: string;
  cases: CaseDefinition[];
  currentIndex: number;
  completedCases: string[];
  startTime: string;
  config: CaseQueueConfig;
}

/**
 * Generate a case queue based on configuration
 */
export function generateCaseQueue(
  config: CaseQueueConfig,
  seed?: string
): CaseQueueState {
  let cases: CaseDefinition[] = [];
  
  // Add calibration case first if enabled
  if (config.includeCalibration) {
    const calibrationCases = CASE_LIBRARY.filter(c => c.isCalibration);
    cases.push(...calibrationCases);
  }
  
  // Get regular cases
  const regularCases = CASE_LIBRARY.filter(c => !c.isCalibration && !c.isAttentionCheck);
  
  // Shuffle if randomized
  let selectedCases = [...regularCases];
  if (config.randomizeOrder && seed) {
    selectedCases = seededShuffle(selectedCases, seed);
  }
  
  // Take requested number of cases
  selectedCases = selectedCases.slice(0, config.casesPerSession);
  
  // Insert attention check at random position (if enabled)
  if (config.includeAttentionChecks && selectedCases.length >= 2) {
    const attentionCase = CASE_LIBRARY.find(c => c.isAttentionCheck);
    if (attentionCase) {
      const insertPosition = Math.floor(selectedCases.length / 2);
      selectedCases.splice(insertPosition, 0, attentionCase);
    }
  }
  
  cases.push(...selectedCases);
  
  return {
    queueId: `Q-${Date.now().toString(36)}`,
    cases,
    currentIndex: 0,
    completedCases: [],
    startTime: new Date().toISOString(),
    config,
  };
}

/**
 * Seeded shuffle for reproducibility
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let seedInt = 0;
  for (let i = 0; i < seed.length; i++) {
    seedInt = ((seedInt << 5) - seedInt + seed.charCodeAt(i)) | 0;
  }
  
  for (let i = result.length - 1; i > 0; i--) {
    seedInt = (seedInt * 1103515245 + 12345) & 0x7fffffff;
    const j = seedInt % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Get current case from queue
 */
export function getCurrentCase(queue: CaseQueueState): CaseDefinition | null {
  if (queue.currentIndex >= queue.cases.length) {
    return null;
  }
  return queue.cases[queue.currentIndex];
}

/**
 * Advance to next case
 */
export function advanceQueue(queue: CaseQueueState): CaseQueueState {
  const currentCase = getCurrentCase(queue);
  return {
    ...queue,
    currentIndex: queue.currentIndex + 1,
    completedCases: currentCase 
      ? [...queue.completedCases, currentCase.caseId]
      : queue.completedCases,
  };
}

/**
 * Check if queue is complete
 */
export function isQueueComplete(queue: CaseQueueState): boolean {
  return queue.currentIndex >= queue.cases.length;
}

/**
 * Get progress info
 */
export function getQueueProgress(queue: CaseQueueState): {
  current: number;
  total: number;
  percentComplete: number;
  isCalibrationPhase: boolean;
} {
  const currentCase = getCurrentCase(queue);
  return {
    current: queue.currentIndex + 1,
    total: queue.cases.length,
    percentComplete: Math.round((queue.currentIndex / queue.cases.length) * 100),
    isCalibrationPhase: currentCase?.isCalibration ?? false,
  };
}
