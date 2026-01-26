/**
 * Evidify Gate Engine v0.1.0
 * Policy-as-Code Enforcement System
 * 
 * Gates enforce method integrity and reduce confounds:
 * - "Human-first lock" in radiology
 * - "Opinion basis required" in forensics
 * - "Disagreement rationale required" across domains
 */

// =============================================================================
// GATE TYPES
// =============================================================================
export type GateType =
  | 'require_preliminary_read'
  | 'require_disagreement_reason'
  | 'require_min_time_on_case'
  | 'require_measurement_before_submit'
  | 'require_disclosure_comprehension'
  | 'require_trust_calibration'
  | 'block_ai_before_prelim'
  | 'custom';

export type GateSeverity = 'BLOCK' | 'WARN';

export type GateDecision = 'ALLOW' | 'BLOCK' | 'WARN';

// =============================================================================
// GATE CONFIGURATION
// =============================================================================
export interface GateConfig {
  gate_id: string;
  type: GateType;
  severity: GateSeverity;
  label: string;
  description: string;
  params?: Record<string, unknown>;
  
  // When does this gate apply?
  trigger: GateTrigger;
  
  // What evidence is required to satisfy?
  required_events?: string[];
  required_fields?: string[];
}

export interface GateTrigger {
  // Apply at specific phase transitions
  on_phase_enter?: string;
  on_phase_exit?: string;
  
  // Apply before specific actions
  before_action?: string[];
  
  // Apply based on condition
  when?: GateCondition;
}

export interface GateCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: unknown;
}

// =============================================================================
// GATE STATE
// =============================================================================
export interface GateState {
  gate_id: string;
  status: 'PENDING' | 'SATISFIED' | 'BLOCKED' | 'BYPASSED';
  blocked_at?: string; // ISO timestamp
  satisfied_at?: string;
  satisfied_by_event_seq?: number;
  block_count: number;
  attempts: GateAttempt[];
}

export interface GateAttempt {
  timestamp: string;
  action_attempted: string;
  decision: GateDecision;
  reason?: string;
}

// =============================================================================
// GATE ENGINE
// =============================================================================
export class GateEngine {
  private gates: Map<string, GateConfig> = new Map();
  private states: Map<string, GateState> = new Map();
  private eventLog: GateEvent[] = [];
  
  constructor(private onGateEvent?: (event: GateEvent) => void) {}
  
  /**
   * Register a gate configuration
   */
  registerGate(config: GateConfig): void {
    this.gates.set(config.gate_id, config);
    this.states.set(config.gate_id, {
      gate_id: config.gate_id,
      status: 'PENDING',
      block_count: 0,
      attempts: [],
    });
  }
  
  /**
   * Evaluate gate before an action
   */
  evaluate(gateId: string, context: GateContext): GateDecision {
    const config = this.gates.get(gateId);
    const state = this.states.get(gateId);
    
    if (!config || !state) {
      console.warn(`Gate ${gateId} not found`);
      return 'ALLOW';
    }
    
    // Already satisfied?
    if (state.status === 'SATISFIED') {
      return 'ALLOW';
    }
    
    // Check if requirements are met
    const decision = this.checkRequirements(config, context);
    
    // Record attempt
    const attempt: GateAttempt = {
      timestamp: new Date().toISOString(),
      action_attempted: context.action,
      decision,
      reason: decision === 'ALLOW' ? undefined : this.getBlockReason(config, context),
    };
    state.attempts.push(attempt);
    
    // Emit event
    const event = this.createGateEvent(config, state, decision, context);
    this.eventLog.push(event);
    this.onGateEvent?.(event);
    
    // Update state
    if (decision === 'ALLOW') {
      state.status = 'SATISFIED';
      state.satisfied_at = new Date().toISOString();
      state.satisfied_by_event_seq = context.currentSeq;
    } else if (decision === 'BLOCK') {
      state.status = 'BLOCKED';
      state.blocked_at = new Date().toISOString();
      state.block_count++;
    }
    
    return decision;
  }
  
  /**
   * Mark a gate as satisfied by an external event
   */
  satisfy(gateId: string, eventSeq: number): void {
    const state = this.states.get(gateId);
    if (state) {
      state.status = 'SATISFIED';
      state.satisfied_at = new Date().toISOString();
      state.satisfied_by_event_seq = eventSeq;
    }
  }
  
  /**
   * Reset all gates for new case
   */
  resetForCase(): void {
    for (const state of this.states.values()) {
      state.status = 'PENDING';
      state.blocked_at = undefined;
      state.satisfied_at = undefined;
      state.satisfied_by_event_seq = undefined;
      state.block_count = 0;
      state.attempts = [];
    }
  }
  
  /**
   * Get current state of all gates
   */
  getStates(): Map<string, GateState> {
    return new Map(this.states);
  }
  
  /**
   * Get event log
   */
  getEventLog(): GateEvent[] {
    return [...this.eventLog];
  }
  
  private checkRequirements(config: GateConfig, context: GateContext): GateDecision {
    // Check required events
    if (config.required_events) {
      const hasAllEvents = config.required_events.every(
        eventType => context.priorEvents.some(e => e.event_type === eventType)
      );
      if (!hasAllEvents) {
        return config.severity === 'BLOCK' ? 'BLOCK' : 'WARN';
      }
    }
    
    // Check required fields
    if (config.required_fields) {
      const hasAllFields = config.required_fields.every(
        field => context.currentState[field] !== undefined && context.currentState[field] !== null
      );
      if (!hasAllFields) {
        return config.severity === 'BLOCK' ? 'BLOCK' : 'WARN';
      }
    }
    
    // Type-specific checks
    switch (config.type) {
      case 'require_preliminary_read':
        return context.currentState.prelimCommitted ? 'ALLOW' : 
          (config.severity === 'BLOCK' ? 'BLOCK' : 'WARN');
        
      case 'require_min_time_on_case':
        const minTime = (config.params?.min_time_ms as number) || 3000;
        return context.timeOnCaseMs >= minTime ? 'ALLOW' :
          (config.severity === 'BLOCK' ? 'BLOCK' : 'WARN');
        
      case 'require_disagreement_reason':
        if (!context.currentState.scoreChanged) return 'ALLOW';
        return context.currentState.disagreementReason ? 'ALLOW' :
          (config.severity === 'BLOCK' ? 'BLOCK' : 'WARN');
        
      case 'require_disclosure_comprehension':
        return context.currentState.comprehensionPassed ? 'ALLOW' :
          (config.severity === 'BLOCK' ? 'BLOCK' : 'WARN');
        
      case 'block_ai_before_prelim':
        return context.currentState.prelimCommitted ? 'ALLOW' : 'BLOCK';
        
      default:
        return 'ALLOW';
    }
  }
  
  private getBlockReason(config: GateConfig, context: GateContext): string {
    switch (config.type) {
      case 'require_preliminary_read':
        return 'Must commit preliminary assessment before proceeding';
      case 'require_min_time_on_case':
        const minTime = (config.params?.min_time_ms as number) || 3000;
        return `Must spend at least ${minTime}ms on case (current: ${context.timeOnCaseMs}ms)`;
      case 'require_disagreement_reason':
        return 'Must provide reason for changing assessment';
      case 'require_disclosure_comprehension':
        return 'Must correctly answer comprehension check';
      case 'block_ai_before_prelim':
        return 'Cannot view AI until preliminary assessment is locked';
      default:
        return 'Gate requirements not met';
    }
  }
  
  private createGateEvent(
    config: GateConfig,
    state: GateState,
    decision: GateDecision,
    context: GateContext
  ): GateEvent {
    return {
      event_type: decision === 'ALLOW' ? 'GATE_SATISFIED' : 'GATE_BLOCKED',
      timestamp: new Date().toISOString(),
      gate_id: config.gate_id,
      gate_type: config.type,
      severity: config.severity,
      decision,
      block_count: state.block_count,
      action_attempted: context.action,
      case_id: context.caseId,
      reason: decision === 'ALLOW' ? undefined : this.getBlockReason(config, context),
    };
  }
}

// =============================================================================
// GATE CONTEXT (passed to evaluate)
// =============================================================================
export interface GateContext {
  action: string;
  caseId: string;
  currentSeq: number;
  timeOnCaseMs: number;
  priorEvents: Array<{ event_type: string; payload?: unknown }>;
  currentState: {
    prelimCommitted?: boolean;
    prelimScore?: number;
    aiExposed?: boolean;
    scoreChanged?: boolean;
    disagreementReason?: string;
    comprehensionPassed?: boolean;
    [key: string]: unknown;
  };
}

// =============================================================================
// GATE EVENT (for logging)
// =============================================================================
export interface GateEvent {
  event_type: 'GATE_BLOCKED' | 'GATE_SATISFIED';
  timestamp: string;
  gate_id: string;
  gate_type: GateType;
  severity: GateSeverity;
  decision: GateDecision;
  block_count: number;
  action_attempted: string;
  case_id: string;
  reason?: string;
}

// =============================================================================
// STANDARD GATE CONFIGURATIONS
// =============================================================================

/**
 * Human-First Lock Gate
 * Blocks AI exposure until preliminary assessment is committed
 */
export const GATE_HUMAN_FIRST_LOCK: GateConfig = {
  gate_id: 'GATE_HUMAN_FIRST_LOCK',
  type: 'block_ai_before_prelim',
  severity: 'BLOCK',
  label: 'Human-First Lock',
  description: 'Requires preliminary assessment before AI exposure to prevent anchoring bias',
  trigger: {
    before_action: ['AI_TOGGLE_ON', 'AI_EXPOSE'],
  },
  required_events: ['SCORE_PRELIM_COMMITTED'],
};

/**
 * Disagreement Rationale Gate
 * Requires explanation when changing assessment after AI exposure
 */
export const GATE_DISAGREEMENT_RATIONALE: GateConfig = {
  gate_id: 'GATE_DISAGREEMENT_RATIONALE',
  type: 'require_disagreement_reason',
  severity: 'BLOCK',
  label: 'Disagreement Rationale',
  description: 'Requires structured reason when final assessment differs from AI suggestion',
  trigger: {
    before_action: ['SUBMIT_FINAL'],
    when: { field: 'scoreChanged', operator: 'eq', value: true },
  },
  required_fields: ['disagreementReason'],
};

/**
 * Minimum Time Gate
 * Ensures reader spends minimum time on case before submission
 */
export const GATE_MIN_TIME: GateConfig = {
  gate_id: 'GATE_MIN_TIME',
  type: 'require_min_time_on_case',
  severity: 'WARN', // Warn but don't block
  label: 'Minimum Viewing Time',
  description: 'Flags cases with suspiciously fast reading times',
  params: { min_time_ms: 3000 },
  trigger: {
    before_action: ['SUBMIT_PRELIM', 'SUBMIT_FINAL'],
  },
};

/**
 * Disclosure Comprehension Gate
 * Requires correct understanding of FDR/FOR before proceeding
 */
export const GATE_DISCLOSURE_COMPREHENSION: GateConfig = {
  gate_id: 'GATE_DISCLOSURE_COMPREHENSION',
  type: 'require_disclosure_comprehension',
  severity: 'BLOCK',
  label: 'Disclosure Comprehension',
  description: 'Ensures reader understands AI performance metrics before final decision',
  trigger: {
    before_action: ['SUBMIT_FINAL'],
  },
  required_events: ['DISCLOSURE_COMPREHENSION_PASSED'],
};

/**
 * Standard gate set for BRPLL studies
 */
export const BRPLL_STANDARD_GATES: GateConfig[] = [
  GATE_HUMAN_FIRST_LOCK,
  GATE_DISAGREEMENT_RATIONALE,
  GATE_MIN_TIME,
  GATE_DISCLOSURE_COMPREHENSION,
];

// =============================================================================
// FORENSIC PSYCHOLOGY GATES (Future Module)
// =============================================================================

/**
 * Opinion Basis Gate (Forensic)
 * Requires documented basis for each opinion
 */
export const GATE_OPINION_BASIS: GateConfig = {
  gate_id: 'GATE_OPINION_BASIS',
  type: 'custom',
  severity: 'BLOCK',
  label: 'Opinion Basis Required',
  description: 'Each opinion must have documented evidentiary basis',
  trigger: {
    before_action: ['FINALIZE_REPORT_SECTION'],
  },
  required_fields: ['opinionBasis', 'basisSources', 'limitations'],
};

/**
 * Alternative Hypothesis Gate (Forensic)
 * Requires consideration of alternative explanations
 */
export const GATE_ALTERNATIVE_HYPOTHESIS: GateConfig = {
  gate_id: 'GATE_ALTERNATIVE_HYPOTHESIS',
  type: 'custom',
  severity: 'WARN',
  label: 'Alternative Hypotheses',
  description: 'Prompts consideration of alternative explanations for findings',
  trigger: {
    before_action: ['FINALIZE_OPINION'],
  },
  required_fields: ['alternativesConsidered'],
};

/**
 * Certainty Language Gate (Forensic)
 * Blocks prohibited absolute certainty phrases
 */
export const GATE_CERTAINTY_LANGUAGE: GateConfig = {
  gate_id: 'GATE_CERTAINTY_LANGUAGE',
  type: 'custom',
  severity: 'BLOCK',
  label: 'Calibrated Language',
  description: 'Prevents use of overconfident certainty language',
  trigger: {
    before_action: ['FINALIZE_REPORT'],
  },
};
