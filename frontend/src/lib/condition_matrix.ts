/**
 * condition_matrix.ts
 * 
 * Seed-logged randomization for BRPLL research conditions
 * Supports: AI_FIRST | HUMAN_FIRST | CONCURRENT paradigms
 */

export type RevealCondition = 'AI_FIRST' | 'HUMAN_FIRST' | 'CONCURRENT';
export type DisclosureFormat = 'FDR_FOR' | 'NATURAL_FREQUENCY' | 'NONE';

export interface ConditionAssignment {
  seed: string;
  condition: RevealCondition;
  disclosureFormat: DisclosureFormat;
  protocolVersion: string;
  assignmentMethod: 'SEEDED_RANDOM' | 'SEQUENTIAL' | 'MANUAL';
  conditionMatrixHash: string;
}

export interface StudyConfig {
  studyId: string;
  protocolVersion: string;
  conditions: RevealCondition[];
  disclosureFormats: DisclosureFormat[];
  counterbalanceMethod: 'LATIN_SQUARE' | 'FULL_FACTORIAL' | 'RANDOM';
}

// Default BRPLL study configuration
export const BRPLL_STUDY_CONFIG: StudyConfig = {
  studyId: 'BRPLL_RADAI_001',
  protocolVersion: '1.0.0',
  conditions: ['HUMAN_FIRST', 'AI_FIRST', 'CONCURRENT'],
  disclosureFormats: ['FDR_FOR', 'NATURAL_FREQUENCY', 'NONE'],
  counterbalanceMethod: 'LATIN_SQUARE',
};

// Latin square for 3x3 counterbalancing
const LATIN_SQUARE_3x3: number[][] = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
];

/**
 * Generate a cryptographic seed
 */
export function generateSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deterministic hash for reproducibility
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Assign condition based on seed (deterministic)
 */
export async function assignCondition(
  seed: string,
  participantIndex: number,
  config: StudyConfig = BRPLL_STUDY_CONFIG
): Promise<ConditionAssignment> {
  // Hash seed to get deterministic selection
  const seedHash = await hashString(seed + participantIndex.toString());
  const seedInt = parseInt(seedHash.slice(0, 8), 16);
  
  let conditionIndex: number;
  let disclosureIndex: number;
  
  if (config.counterbalanceMethod === 'LATIN_SQUARE') {
    const row = participantIndex % 3;
    const col = seedInt % 3;
    conditionIndex = LATIN_SQUARE_3x3[row][col];
    disclosureIndex = LATIN_SQUARE_3x3[(row + 1) % 3][col];
  } else if (config.counterbalanceMethod === 'RANDOM') {
    conditionIndex = seedInt % config.conditions.length;
    disclosureIndex = (seedInt >> 8) % config.disclosureFormats.length;
  } else {
    // FULL_FACTORIAL
    const totalCombinations = config.conditions.length * config.disclosureFormats.length;
    const combinationIndex = participantIndex % totalCombinations;
    conditionIndex = Math.floor(combinationIndex / config.disclosureFormats.length);
    disclosureIndex = combinationIndex % config.disclosureFormats.length;
  }
  
  // Hash the config for reproducibility verification
  const configHash = await hashString(JSON.stringify(config));
  
  return {
    seed,
    condition: config.conditions[conditionIndex],
    disclosureFormat: config.disclosureFormats[disclosureIndex],
    protocolVersion: config.protocolVersion,
    assignmentMethod: 'SEEDED_RANDOM',
    conditionMatrixHash: configHash.slice(0, 16),
  };
}

/**
 * Manual condition override (for demos)
 */
export function manualCondition(
  condition: RevealCondition,
  disclosureFormat: DisclosureFormat = 'FDR_FOR'
): ConditionAssignment {
  return {
    seed: 'MANUAL_OVERRIDE',
    condition,
    disclosureFormat,
    protocolVersion: BRPLL_STUDY_CONFIG.protocolVersion,
    assignmentMethod: 'MANUAL',
    conditionMatrixHash: 'MANUAL',
  };
}
