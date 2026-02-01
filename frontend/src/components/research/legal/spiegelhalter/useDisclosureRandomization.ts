/**
 * useDisclosureRandomization.ts
 *
 * React hook for randomizing disclosure format assignment in research studies.
 *
 * Supports three randomization methods:
 * 1. SIMPLE: Pure random assignment
 * 2. BLOCK: Blocked randomization for balanced groups
 * 3. LATIN_SQUARE: Latin square counterbalancing
 *
 * All methods are seeded for reproducibility.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  SpiegelhalterDisclosureFormat,
  DisclosureRandomization,
  RandomizationMethod,
} from './disclosureTypes';

// ============================================================================
// TYPES
// ============================================================================

interface UseDisclosureRandomizationOptions {
  /** Random seed for reproducibility */
  seed?: string;

  /** Randomization method */
  method?: RandomizationMethod;

  /** Formats to randomize among */
  formats?: SpiegelhalterDisclosureFormat[];

  /** Participant index (for Latin square) */
  participantIndex?: number;

  /** Block size (for BLOCK method) */
  blockSize?: number;

  /** Whether to persist state across sessions */
  persistKey?: string;
}

interface UseDisclosureRandomizationResult {
  /** Current randomization state */
  state: DisclosureRandomization;

  /** Get the current format */
  currentFormat: SpiegelhalterDisclosureFormat;

  /** Advance to next format (for within-subject designs) */
  advanceFormat: () => SpiegelhalterDisclosureFormat;

  /** Reset randomization */
  reset: (newSeed?: string) => void;

  /** Get format for a specific case */
  getFormatForCase: (caseIndex: number) => SpiegelhalterDisclosureFormat;

  /** Check if formats are balanced */
  isBalanced: () => boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_FORMATS: SpiegelhalterDisclosureFormat[] = [
  'PERCENTAGE',
  'NATURAL_FREQUENCY',
  'ICON_ARRAY',
  'VERBAL_ONLY',
  'VERBAL_PLUS_NUMERIC',
  'ODDS',
  'COMPARATIVE',
];

const DEFAULT_OPTIONS: Required<UseDisclosureRandomizationOptions> = {
  seed: '',
  method: 'BLOCK',
  formats: DEFAULT_FORMATS,
  participantIndex: 0,
  blockSize: 7, // One of each format per block
  persistKey: '',
};

// ============================================================================
// HOOK
// ============================================================================

export function useDisclosureRandomization(
  options: UseDisclosureRandomizationOptions = {}
): UseDisclosureRandomizationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Generate seed if not provided
  const initialSeed = opts.seed || generateSeed();

  // Initialize state
  const [state, setState] = useState<DisclosureRandomization>(() => {
    // Try to restore from persistence
    if (opts.persistKey) {
      const stored = localStorage.getItem(`disclosure_rand_${opts.persistKey}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Fall through to create new state
        }
      }
    }

    return createInitialState(initialSeed, opts);
  });

  // RNG reference for deterministic sequencing
  const rngRef = useRef(createSeededRNG(state.seed));

  // Persist state changes
  useEffect(() => {
    if (opts.persistKey) {
      localStorage.setItem(`disclosure_rand_${opts.persistKey}`, JSON.stringify(state));
    }
  }, [state, opts.persistKey]);

  // Get format for a specific case index
  const getFormatForCase = useCallback((caseIndex: number): SpiegelhalterDisclosureFormat => {
    const { method, formats, participantIndex, blockSize } = state;

    switch (method) {
      case 'SIMPLE':
        return getSimpleRandomFormat(state.seed, caseIndex, formats);

      case 'BLOCK':
        return getBlockRandomFormat(state.seed, caseIndex, formats, blockSize || formats.length);

      case 'LATIN_SQUARE':
        return getLatinSquareFormat(participantIndex, caseIndex, formats);

      default:
        return formats[0];
    }
  }, [state]);

  // Advance to next format
  const advanceFormat = useCallback((): SpiegelhalterDisclosureFormat => {
    setState(prev => {
      const nextPosition = (prev.blockPosition ?? 0) + 1;
      const nextFormat = getFormatForCase(nextPosition);

      const newCounts = { ...prev.formatCounts };
      newCounts[nextFormat] = (newCounts[nextFormat] || 0) + 1;

      return {
        ...prev,
        currentFormat: nextFormat,
        blockPosition: nextPosition,
        formatCounts: newCounts,
      };
    });

    return state.currentFormat;
  }, [getFormatForCase, state.currentFormat]);

  // Reset randomization
  const reset = useCallback((newSeed?: string) => {
    const seed = newSeed || generateSeed();
    rngRef.current = createSeededRNG(seed);
    setState(createInitialState(seed, opts));
  }, [opts]);

  // Check if formats are balanced
  const isBalanced = useCallback((): boolean => {
    const counts = Object.values(state.formatCounts);
    if (counts.length === 0) return true;

    const max = Math.max(...counts);
    const min = Math.min(...counts);
    return max - min <= 1;
  }, [state.formatCounts]);

  return {
    state,
    currentFormat: state.currentFormat,
    advanceFormat,
    reset,
    getFormatForCase,
    isBalanced,
  };
}

// ============================================================================
// RANDOMIZATION ALGORITHMS
// ============================================================================

/**
 * Simple random assignment based on seed and case index.
 */
function getSimpleRandomFormat(
  seed: string,
  caseIndex: number,
  formats: SpiegelhalterDisclosureFormat[]
): SpiegelhalterDisclosureFormat {
  const rng = createSeededRNG(`${seed}_${caseIndex}`);
  const index = Math.floor(rng() * formats.length);
  return formats[index];
}

/**
 * Block randomization - ensures each format appears once per block.
 */
function getBlockRandomFormat(
  seed: string,
  caseIndex: number,
  formats: SpiegelhalterDisclosureFormat[],
  blockSize: number
): SpiegelhalterDisclosureFormat {
  const blockIndex = Math.floor(caseIndex / blockSize);
  const positionInBlock = caseIndex % blockSize;

  // Generate shuffled block for this block index
  const rng = createSeededRNG(`${seed}_block_${blockIndex}`);
  const shuffled = shuffleArray([...formats], rng);

  return shuffled[positionInBlock % shuffled.length];
}

/**
 * Latin square counterbalancing.
 * Each participant sees formats in a different order.
 */
function getLatinSquareFormat(
  participantIndex: number,
  caseIndex: number,
  formats: SpiegelhalterDisclosureFormat[]
): SpiegelhalterDisclosureFormat {
  const n = formats.length;

  // Generate Latin square order for this participant
  const row = participantIndex % n;
  const col = caseIndex % n;

  // Latin square formula: element at (row, col) = (row + col) mod n
  const formatIndex = (row + col) % n;
  return formats[formatIndex];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create initial randomization state.
 */
function createInitialState(
  seed: string,
  opts: Required<UseDisclosureRandomizationOptions>
): DisclosureRandomization {
  const rng = createSeededRNG(seed);
  const formats = opts.formats;

  // Initial format depends on method
  let initialFormat: SpiegelhalterDisclosureFormat;
  switch (opts.method) {
    case 'SIMPLE':
      initialFormat = formats[Math.floor(rng() * formats.length)];
      break;
    case 'BLOCK':
      initialFormat = shuffleArray([...formats], rng)[0];
      break;
    case 'LATIN_SQUARE':
      initialFormat = formats[opts.participantIndex % formats.length];
      break;
    default:
      initialFormat = formats[0];
  }

  // Initialize counts
  const formatCounts: Record<SpiegelhalterDisclosureFormat, number> = {} as Record<SpiegelhalterDisclosureFormat, number>;
  for (const format of formats) {
    formatCounts[format] = 0;
  }
  formatCounts[initialFormat] = 1;

  return {
    seed,
    method: opts.method,
    formats,
    currentFormat: initialFormat,
    formatCounts,
    participantIndex: opts.participantIndex,
    blockSize: opts.blockSize,
    blockPosition: 0,
  };
}

/**
 * Generate a random seed.
 */
function generateSeed(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a seeded pseudo-random number generator.
 * Uses mulberry32 algorithm.
 */
function createSeededRNG(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Ensure positive
  let a = Math.abs(hash);

  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array using Fisher-Yates with provided RNG.
 */
function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const RANDOMIZATION_PRESETS = {
  /** Between-subject: Each participant sees one format for all cases */
  betweenSubject: (seed: string, participantIndex: number): UseDisclosureRandomizationOptions => ({
    seed,
    method: 'SIMPLE',
    participantIndex,
  }),

  /** Within-subject: Each participant sees all formats in counterbalanced order */
  withinSubject: (seed: string, participantIndex: number): UseDisclosureRandomizationOptions => ({
    seed,
    method: 'LATIN_SQUARE',
    participantIndex,
  }),

  /** Mixed: Block randomization for balanced exposure */
  mixed: (seed: string): UseDisclosureRandomizationOptions => ({
    seed,
    method: 'BLOCK',
    blockSize: 7,
  }),

  /** Control condition: Always show NONE */
  control: (): UseDisclosureRandomizationOptions => ({
    formats: ['NONE'],
    method: 'SIMPLE',
  }),

  /** Spiegelhalter recommended: Focus on natural frequency and verbal+numeric */
  spiegelhalterRecommended: (seed: string): UseDisclosureRandomizationOptions => ({
    seed,
    method: 'BLOCK',
    formats: ['NATURAL_FREQUENCY', 'VERBAL_PLUS_NUMERIC', 'ICON_ARRAY'],
    blockSize: 3,
  }),
};

export default useDisclosureRandomization;
