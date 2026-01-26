/**
 * StudyProtocol.tsx
 * 
 * Configures Evidify as a research instrument with:
 * - Manipulable study factors (AI present, disclosure format, timing, etc.)
 * - Randomization and counterbalancing
 * - Reproducible seeds for replication
 * - Protocol export for IRB and publication
 * 
 * This transforms Evidify from a demo to a research apparatus that produces
 * standardized, reproducible, publishable data.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DisclosureConfig, DISCLOSURE_CONDITIONS } from './DisclosureConfig';

// ============================================================================
// TYPES
// ============================================================================

export type AIPresence = 'present' | 'absent';
export type AIAccuracy = 'correct' | 'incorrect' | 'mixed';
export type ReadingParadigm = 'pre_ai_read' | 'ai_first' | 'concurrent' | 'second_reader';
export type TimePressure = 'none' | 'moderate' | 'high';

export interface StudyFactor {
  factorId: string;
  factorName: string;
  description: string;
  levels: FactorLevel[];
  withinSubject: boolean;  // true = each participant sees all levels
}

export interface FactorLevel {
  levelId: string;
  levelLabel: string;
  config: Record<string, any>;
}

export interface StudyArm {
  armId: string;
  armLabel: string;
  factors: Record<string, string>;  // factorId -> levelId
  participantCount: number;
}

export interface CaseAssignment {
  caseId: string;
  armId: string;
  orderPosition: number;
  aiPresent: boolean;
  aiCorrect: boolean | null;
  disclosureCondition: string;
}

export interface ParticipantAssignment {
  participantId: string;
  armId: string;
  caseOrder: string[];  // Ordered list of case IDs
  assignments: CaseAssignment[];
  randomizationSeed: number;
}

export interface StudyProtocolConfig {
  // Study identification
  protocolId: string;
  protocolName: string;
  protocolVersion: string;
  description: string;
  
  // IRB info
  irbNumber?: string;
  piName?: string;
  institution?: string;
  
  // Study design
  factors: StudyFactor[];
  arms: StudyArm[];
  
  // Cases
  casePool: CasePoolItem[];
  casesPerParticipant: number;
  
  // Randomization
  randomizationMethod: 'simple' | 'block' | 'latin_square' | 'stratified';
  counterbalanceOrder: boolean;
  masterSeed: number;
  
  // Timing constraints
  readingParadigm: ReadingParadigm;
  minPreAITimeSeconds: number;
  maxTotalTimeSeconds: number | null;
  timePressureCondition: TimePressure;
  
  // Training requirements
  trainingCasesRequired: number;
  comprehensionCheckRequired: boolean;
  
  // Data collection
  collectEnvironmentData: boolean;
  collectConfidenceRatings: boolean;
  requireDeviationDocumentation: boolean;
}

export interface CasePoolItem {
  caseId: string;
  groundTruth: 'positive' | 'negative';
  difficulty?: 'easy' | 'medium' | 'hard';
  aiScore: number;
  aiFlagged: boolean;
  aiCorrect: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// DEFAULT FACTORS
// ============================================================================

export const DEFAULT_FACTORS: StudyFactor[] = [
  {
    factorId: 'ai_presence',
    factorName: 'AI Presence',
    description: 'Whether AI output is shown to the reader',
    withinSubject: true,
    levels: [
      { levelId: 'present', levelLabel: 'AI Present', config: { aiPresent: true } },
      { levelId: 'absent', levelLabel: 'AI Absent (Control)', config: { aiPresent: false } },
    ],
  },
  {
    factorId: 'ai_accuracy',
    factorName: 'AI Accuracy',
    description: 'Whether AI is correct for this case',
    withinSubject: true,
    levels: [
      { levelId: 'correct', levelLabel: 'AI Correct', config: { aiCorrect: true } },
      { levelId: 'incorrect', levelLabel: 'AI Incorrect', config: { aiCorrect: false } },
    ],
  },
  {
    factorId: 'disclosure_format',
    factorName: 'Disclosure Format',
    description: 'How AI performance information is presented',
    withinSubject: false,  // Between-subjects
    levels: [
      { levelId: 'none', levelLabel: 'No Disclosure', config: { disclosure: 'score_only' } },
      { levelId: 'numeric', levelLabel: 'Numeric FDR/FOR', config: { disclosure: 'numeric_fdr_for' } },
      { levelId: 'sentence', levelLabel: 'Sentence Format', config: { disclosure: 'sentence_fdr_for' } },
      { levelId: 'natural', levelLabel: 'Natural Frequency', config: { disclosure: 'natural_frequency' } },
    ],
  },
  {
    factorId: 'time_pressure',
    factorName: 'Time Pressure',
    description: 'Time constraints on reading',
    withinSubject: false,
    levels: [
      { levelId: 'none', levelLabel: 'No Time Limit', config: { maxTime: null } },
      { levelId: 'moderate', levelLabel: 'Moderate (90s)', config: { maxTime: 90 } },
      { levelId: 'high', levelLabel: 'High (45s)', config: { maxTime: 45 } },
    ],
  },
];

// ============================================================================
// RANDOMIZATION UTILITIES
// ============================================================================

// Seeded random number generator (Mulberry32)
function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seed
function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate Latin Square for counterbalancing
function generateLatinSquare(n: number): number[][] {
  const square: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push((i + j) % n);
    }
    square.push(row);
  }
  return square;
}

// ============================================================================
// ASSIGNMENT GENERATOR
// ============================================================================

export function generateParticipantAssignment(
  protocol: StudyProtocolConfig,
  participantId: string,
  participantIndex: number
): ParticipantAssignment {
  const seed = protocol.masterSeed + participantIndex;
  const random = seededRandom(seed);
  
  // Determine arm assignment for between-subjects factors
  const armIndex = Math.floor(random() * protocol.arms.length);
  const arm = protocol.arms[armIndex];
  
  // Select cases
  let selectedCases = [...protocol.casePool];
  
  // If we need specific AI accuracy conditions, filter appropriately
  const aiAccuracyLevel = arm.factors['ai_accuracy'];
  if (aiAccuracyLevel === 'correct') {
    selectedCases = selectedCases.filter(c => c.aiCorrect);
  } else if (aiAccuracyLevel === 'incorrect') {
    selectedCases = selectedCases.filter(c => !c.aiCorrect);
  }
  
  // Shuffle and select
  selectedCases = shuffleArray(selectedCases, seed);
  selectedCases = selectedCases.slice(0, protocol.casesPerParticipant);
  
  // Generate case order (with counterbalancing if needed)
  let caseOrder: string[];
  if (protocol.counterbalanceOrder) {
    const latinSquare = generateLatinSquare(protocol.casesPerParticipant);
    const orderRow = latinSquare[participantIndex % protocol.casesPerParticipant];
    caseOrder = orderRow.map(i => selectedCases[i].caseId);
  } else {
    caseOrder = selectedCases.map(c => c.caseId);
  }
  
  // Generate case assignments
  const assignments: CaseAssignment[] = caseOrder.map((caseId, orderPosition) => {
    const caseData = selectedCases.find(c => c.caseId === caseId)!;
    
    // Determine AI presence for this case
    const aiPresent = arm.factors['ai_presence'] !== 'absent';
    
    // Get disclosure condition
    const disclosureCondition = arm.factors['disclosure_format'] || 'score_only';
    
    return {
      caseId,
      armId: arm.armId,
      orderPosition,
      aiPresent,
      aiCorrect: aiPresent ? caseData.aiCorrect : null,
      disclosureCondition,
    };
  });
  
  return {
    participantId,
    armId: arm.armId,
    caseOrder,
    assignments,
    randomizationSeed: seed,
  };
}

// ============================================================================
// CONTEXT
// ============================================================================

interface StudyProtocolContextValue {
  protocol: StudyProtocolConfig | null;
  setProtocol: (protocol: StudyProtocolConfig) => void;
  currentParticipant: ParticipantAssignment | null;
  assignParticipant: (participantId: string, index: number) => ParticipantAssignment;
  getCurrentCaseConfig: (caseIndex: number) => CaseAssignment | null;
  exportProtocol: () => StudyProtocolExport;
}

const StudyProtocolContext = createContext<StudyProtocolContextValue | null>(null);

export function useStudyProtocol(): StudyProtocolContextValue {
  const context = useContext(StudyProtocolContext);
  if (!context) {
    throw new Error('useStudyProtocol must be used within StudyProtocolProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export const StudyProtocolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [protocol, setProtocol] = useState<StudyProtocolConfig | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<ParticipantAssignment | null>(null);

  const assignParticipant = useCallback((participantId: string, index: number): ParticipantAssignment => {
    if (!protocol) throw new Error('No protocol configured');
    const assignment = generateParticipantAssignment(protocol, participantId, index);
    setCurrentParticipant(assignment);
    return assignment;
  }, [protocol]);

  const getCurrentCaseConfig = useCallback((caseIndex: number): CaseAssignment | null => {
    if (!currentParticipant) return null;
    return currentParticipant.assignments[caseIndex] || null;
  }, [currentParticipant]);

  const exportProtocol = useCallback((): StudyProtocolExport => {
    if (!protocol) throw new Error('No protocol configured');
    return {
      protocol,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      arms: protocol.arms.map(arm => ({
        ...arm,
        sampleAssignment: generateParticipantAssignment(protocol, 'sample', 0),
      })),
    };
  }, [protocol]);

  return (
    <StudyProtocolContext.Provider value={{
      protocol,
      setProtocol,
      currentParticipant,
      assignParticipant,
      getCurrentCaseConfig,
      exportProtocol,
    }}>
      {children}
    </StudyProtocolContext.Provider>
  );
};

// ============================================================================
// EXPORT FORMAT
// ============================================================================

export interface StudyProtocolExport {
  protocol: StudyProtocolConfig;
  exportedAt: string;
  version: string;
  arms: Array<StudyArm & { sampleAssignment: ParticipantAssignment }>;
}

// ============================================================================
// PROTOCOL BUILDER UI
// ============================================================================

interface ProtocolBuilderProps {
  initialProtocol?: Partial<StudyProtocolConfig>;
  onSave: (protocol: StudyProtocolConfig) => void;
}

export const ProtocolBuilder: React.FC<ProtocolBuilderProps> = ({
  initialProtocol,
  onSave,
}) => {
  const [protocol, setProtocol] = useState<Partial<StudyProtocolConfig>>({
    protocolId: `protocol_${Date.now()}`,
    protocolName: '',
    protocolVersion: '1.0',
    description: '',
    factors: DEFAULT_FACTORS,
    arms: [],
    casePool: [],
    casesPerParticipant: 20,
    randomizationMethod: 'block',
    counterbalanceOrder: true,
    masterSeed: Math.floor(Math.random() * 1000000),
    readingParadigm: 'pre_ai_read',
    minPreAITimeSeconds: 15,
    maxTotalTimeSeconds: null,
    timePressureCondition: 'none',
    trainingCasesRequired: 5,
    comprehensionCheckRequired: true,
    collectEnvironmentData: true,
    collectConfidenceRatings: true,
    requireDeviationDocumentation: true,
    ...initialProtocol,
  });

  const updateField = <K extends keyof StudyProtocolConfig>(
    field: K,
    value: StudyProtocolConfig[K]
  ) => {
    setProtocol(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!protocol.protocolName) {
      alert('Protocol name is required');
      return;
    }
    onSave(protocol as StudyProtocolConfig);
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-lg">
      <h2 className="text-xl font-semibold text-white">Study Protocol Builder</h2>

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Study Information
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Protocol Name</label>
            <input
              type="text"
              value={protocol.protocolName || ''}
              onChange={(e) => updateField('protocolName', e.target.value)}
              placeholder="e.g., AI Disclosure Format Study v1"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Version</label>
            <input
              type="text"
              value={protocol.protocolVersion || '1.0'}
              onChange={(e) => updateField('protocolVersion', e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <textarea
            value={protocol.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">IRB Number</label>
            <input
              type="text"
              value={protocol.irbNumber || ''}
              onChange={(e) => updateField('irbNumber', e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">PI Name</label>
            <input
              type="text"
              value={protocol.piName || ''}
              onChange={(e) => updateField('piName', e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Institution</label>
            <input
              type="text"
              value={protocol.institution || ''}
              onChange={(e) => updateField('institution', e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Study Design */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Study Design
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Reading Paradigm</label>
            <select
              value={protocol.readingParadigm || 'pre_ai_read'}
              onChange={(e) => updateField('readingParadigm', e.target.value as ReadingParadigm)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            >
              <option value="pre_ai_read">Pre-AI Read (Independent first)</option>
              <option value="ai_first">AI First</option>
              <option value="concurrent">Concurrent</option>
              <option value="second_reader">Second Reader</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Randomization Method</label>
            <select
              value={protocol.randomizationMethod || 'block'}
              onChange={(e) => updateField('randomizationMethod', e.target.value as any)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            >
              <option value="simple">Simple Random</option>
              <option value="block">Block Randomization</option>
              <option value="latin_square">Latin Square</option>
              <option value="stratified">Stratified</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Cases per Participant</label>
            <input
              type="number"
              value={protocol.casesPerParticipant || 20}
              onChange={(e) => updateField('casesPerParticipant', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Training Cases</label>
            <input
              type="number"
              value={protocol.trainingCasesRequired || 5}
              onChange={(e) => updateField('trainingCasesRequired', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Min Pre-AI Time (s)</label>
            <input
              type="number"
              value={protocol.minPreAITimeSeconds || 15}
              onChange={(e) => updateField('minPreAITimeSeconds', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Master Seed (for replication)</label>
            <input
              type="number"
              value={protocol.masterSeed || 0}
              onChange={(e) => updateField('masterSeed', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => updateField('masterSeed', Math.floor(Math.random() * 1000000))}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
            >
              Generate New Seed
            </button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Data Collection Options
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={protocol.counterbalanceOrder ?? true}
              onChange={(e) => updateField('counterbalanceOrder', e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 text-purple-500"
            />
            <span className="text-slate-300">Counterbalance case order</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={protocol.comprehensionCheckRequired ?? true}
              onChange={(e) => updateField('comprehensionCheckRequired', e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 text-purple-500"
            />
            <span className="text-slate-300">Require comprehension check</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={protocol.collectEnvironmentData ?? true}
              onChange={(e) => updateField('collectEnvironmentData', e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 text-purple-500"
            />
            <span className="text-slate-300">Collect environment data</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={protocol.collectConfidenceRatings ?? true}
              onChange={(e) => updateField('collectConfidenceRatings', e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 text-purple-500"
            />
            <span className="text-slate-300">Collect confidence ratings</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={protocol.requireDeviationDocumentation ?? true}
              onChange={(e) => updateField('requireDeviationDocumentation', e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 text-purple-500"
            />
            <span className="text-slate-300">Require deviation documentation</span>
          </label>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button
          onClick={handleSave}
          className="px-6 py-2 rounded bg-purple-500 hover:bg-purple-600 text-white font-medium"
        >
          Save Protocol
        </button>
      </div>
    </div>
  );
};

export default StudyProtocolProvider;
