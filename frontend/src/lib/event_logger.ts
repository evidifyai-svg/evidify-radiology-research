/**
 * event_logger.ts
 * 
 * FRIDAY DEMO VERSION - Enhanced event logging for BRPLL
 * Includes eye-tracking proxy events (P1-3)
 * 
 * Full event coverage per AGI panel requirements:
 * - SESSION_STARTED, SESSION_ENDED
 * - RANDOMIZATION_ASSIGNED
 * - CASE_LOADED, CASE_COMPLETED
 * - IMAGE_VIEWED (periodic)
 * - FIRST_IMPRESSION_LOCKED
 * - READ_EPISODE_STARTED, READ_EPISODE_ENDED
 * - AI_REVEALED
 * - DISCLOSURE_PRESENTED
 * - DISCLOSURE_COMPREHENSION_RESPONSE
 * - FINAL_ASSESSMENT
 * - DEVIATION_STARTED, DEVIATION_SUBMITTED, DEVIATION_SKIPPED
 * - CALIBRATION_STARTED, CALIBRATION_RESPONSE, CALIBRATION_FEEDBACK_SHOWN
 * - GAZE_ENTERED_ROI, DWELL_TIME_ROI, ATTENTION_COVERAGE_PROXY (P1-3)
 */

import { ExportPackZip, LedgerEntry } from './ExportPackZip';

// ============================================================================
// EVENT TYPE DEFINITIONS
// ============================================================================

export type SessionEventType =
  | 'SESSION_STARTED'
  | 'RANDOMIZATION_ASSIGNED'
  | 'SESSION_ENDED'
  | 'EXPORT_GENERATED';

export type CaseEventType =
  | 'CASE_LOADED'
  | 'CASE_COMPLETED'
  | 'IMAGE_VIEWED'
  | 'VIEWPORT_CHANGED'
  | 'FIRST_IMPRESSION_LOCKED'
  | 'READ_EPISODE_STARTED'
  | 'READ_EPISODE_ENDED'
  | 'AI_REVEALED'
  | 'DISCLOSURE_PRESENTED'
  | 'DISCLOSURE_COMPREHENSION_RESPONSE'
  | 'DEVIATION_STARTED'
  | 'DEVIATION_SUBMITTED'
  | 'DEVIATION_SKIPPED'
  | 'FINAL_ASSESSMENT';

export type CalibrationEventType =
  | 'CALIBRATION_STARTED'
  | 'CALIBRATION_RESPONSE'
  | 'CALIBRATION_FEEDBACK_SHOWN';

export type AttentionEventType =
  | 'ATTENTION_CHECK_PRESENTED'
  | 'ATTENTION_CHECK_RESPONSE';

// P1-3: Eye-tracking proxy events
export type EyeTrackingProxyEventType =
  | 'GAZE_ENTERED_ROI'
  | 'GAZE_EXITED_ROI'
  | 'DWELL_TIME_ROI'
  | 'ATTENTION_COVERAGE_PROXY'
  | 'SACCADE_DETECTED';

export type ViewerEventType =
  | 'VIEW_FOCUSED'
  | 'ZOOM_CHANGED'
  | 'PAN_CHANGED'
  | 'WINDOW_LEVEL_CHANGED'
  | 'AI_OVERLAY_TOGGLED'
  | 'VIEWS_LINKED_TOGGLED';

export type AllEventTypes = 
  | SessionEventType 
  | CaseEventType 
  | CalibrationEventType 
  | AttentionEventType
  | EyeTrackingProxyEventType
  | ViewerEventType;

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export interface SessionStartedPayload {
  participantId: string;
  siteId: string;
  studyId: string;
  protocolVersion: string;
  browserInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    pixelRatio: number;
  };
}

export interface RandomizationAssignedPayload {
  seed: string;
  condition: string;
  disclosureFormat: string;
  assignmentMethod: string;
  conditionMatrixHash: string;
}

export interface CaseLoadedPayload {
  caseId: string;
  caseIndex: number;
  totalCases: number;
  isCalibration: boolean;
  isAttentionCheck: boolean;
  metadata: {
    patientAge?: number;
    breastDensity?: string;
    indication?: string;
  };
}

export interface ImageViewedPayload {
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  viewportState: {
    zoom: number;
    panX: number;
    panY: number;
    windowCenter: number;
    windowWidth: number;
  };
  dwellTimeMs?: number;
}

export interface ViewportChangedPayload {
  viewKey: string;
  changeType: 'ZOOM' | 'PAN' | 'WINDOW_LEVEL';
  previousState: {
    zoom: number;
    panX: number;
    panY: number;
    windowCenter: number;
    windowWidth: number;
  };
  newState: {
    zoom: number;
    panX: number;
    panY: number;
    windowCenter: number;
    windowWidth: number;
  };
}

export interface FirstImpressionLockedPayload {
  birads: number;
  confidence: number;
  timeToLockMs: number;
  viewerInteractions: {
    zoomCount: number;
    panCount: number;
    windowLevelCount: number;
    viewsFocused: string[];
  };
}

export interface ReadEpisodePayload {
  caseId: string;
  episodeType: 'PRE_AI' | 'POST_AI';
  tStartIso?: string;
  tEndIso?: string;
  reason?: string;
}

export interface AIRevealedPayload {
  suggestedBirads: number;
  aiConfidence: number;
  finding: string;
  displayMode: string;
}

export interface DisclosurePresentedPayload {
  format: string;
  fdrValue?: number;  // False Discovery Rate
  forValue?: number;  // False Omission Rate
  naturalFrequencyText?: string;
}

export interface ComprehensionResponsePayload {
  caseId: string;
  itemId: string;
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTimeMs?: number | null;
  phase?: string;
}

export interface DeviationPayload {
  previousBirads: number;
  newBirads: number;
  rationale?: string;
  rationaleWordCount?: number;
  skipped?: boolean;
  attestation?: string;
}

export interface FinalAssessmentPayload {
  caseId: string;
  birads: number;
  confidence: number;
  changeFromInitial: boolean;
  changeDirection: 'TOWARD_AI' | 'AWAY_FROM_AI' | 'NO_CHANGE';
  postAiTimeMs: number;
}

export interface AttentionCheckPayload {
  caseId: string;
  expectedResponse: number;
  actualResponse: number;
  passed: boolean;
}

// P1-3: Eye-tracking proxy payloads
export interface GazeEnteredROIPayload {
  roiId: string;
  roiType: 'MAMMOGRAM_VIEW' | 'AI_OVERLAY' | 'DISCLOSURE_PANEL' | 'BIRADS_SELECTOR' | 'OTHER';
  caseId: string;
  timestamp: string;
}

export interface DwellTimeROIPayload {
  roiId: string;
  roiType: 'MAMMOGRAM_VIEW' | 'AI_OVERLAY' | 'DISCLOSURE_PANEL' | 'BIRADS_SELECTOR' | 'OTHER';
  dwellMs: number;
  caseId: string;
}

export interface AttentionCoverageProxyPayload {
  caseId: string;
  totalROIDwellMs: number;
  roiDwellBreakdown: Record<string, number>;
  viewsExamined: string[];
  interactionCounts: {
    zooms: number;
    pans: number;
    windowLevelChanges: number;
  };
}

export interface CaseContextPayload {
  caseId?: string;
  sessionId?: string;
  condition?: unknown;
  viewMode?: string;
}

// ============================================================================
// EVENT LOGGER CLASS
// ============================================================================

type ExportPackLike = {
  addEvent(type: string, payload: unknown): Promise<LedgerEntry>;
};

export class EventLogger {
  private exportPack: ExportPackLike;
  private interactionCounts: {
    zoom: number;
    pan: number;
    windowLevel: number;
    viewsFocused: Set<string>;
  };
  private caseStartTime: number = 0;
  private aiRevealTime: number = 0;
  
  // P1-3: ROI tracking
  private roiDwellTimes: Map<string, number> = new Map();
  private currentROI: string | null = null;
  private roiEnterTime: number = 0;

  constructor(exportPack: ExportPackZip) {
    this.exportPack = exportPack;
    this.interactionCounts = {
      zoom: 0,
      pan: 0,
      windowLevel: 0,
      viewsFocused: new Set(),
    };
  }

  /**
   * Reset interaction counts for new case
   */
  resetForNewCase(): void {
    this.interactionCounts = {
      zoom: 0,
      pan: 0,
      windowLevel: 0,
      viewsFocused: new Set(),
    };
    this.roiDwellTimes.clear();
    this.currentROI = null;
    this.caseStartTime = Date.now();
    this.aiRevealTime = 0;
  }

  /**
   * Generic event adder (for custom events)
   */
  async addEvent(type: string, payload: unknown): Promise<LedgerEntry> {
    return this.exportPack.addEvent(type, payload);
  }

  /**
   * Log session start
   */
  async logSessionStarted(payload: SessionStartedPayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('SESSION_STARTED', payload);
  }

  /**
   * Log randomization assignment
   */
  async logRandomizationAssigned(payload: RandomizationAssignedPayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('RANDOMIZATION_ASSIGNED', payload);
  }

  /**
   * Log case loaded
   */
  async logCaseLoaded(payload: CaseLoadedPayload): Promise<LedgerEntry> {
    this.resetForNewCase();
    return this.exportPack.addEvent('CASE_LOADED', payload);
  }

  /**
   * Log image interaction
   */
  async logImageViewed(payload: ImageViewedPayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('IMAGE_VIEWED', payload);
  }

  /**
   * Log viewport change (throttled - call this on significant changes only)
   */
  async logViewportChanged(payload: ViewportChangedPayload): Promise<LedgerEntry> {
    if (payload.changeType === 'ZOOM') this.interactionCounts.zoom++;
    if (payload.changeType === 'PAN') this.interactionCounts.pan++;
    if (payload.changeType === 'WINDOW_LEVEL') this.interactionCounts.windowLevel++;
    this.interactionCounts.viewsFocused.add(payload.viewKey);
    
    return this.exportPack.addEvent('VIEWPORT_CHANGED', payload);
  }

  /**
   * Log first impression lock
   */
  async logFirstImpressionLocked(
    birads: number,
    confidence: number,
    context?: CaseContextPayload
  ): Promise<LedgerEntry> {
    const payload: FirstImpressionLockedPayload & CaseContextPayload = {
      ...context,
      birads,
      confidence,
      timeToLockMs: Date.now() - this.caseStartTime,
      viewerInteractions: {
        zoomCount: this.interactionCounts.zoom,
        panCount: this.interactionCounts.pan,
        windowLevelCount: this.interactionCounts.windowLevel,
        viewsFocused: Array.from(this.interactionCounts.viewsFocused),
      },
    };
    return this.exportPack.addEvent('FIRST_IMPRESSION_LOCKED', payload);
  }

  /**
   * Log read episode start
   */
  async logReadEpisodeStarted(caseId: string, episodeType: ReadEpisodePayload['episodeType']): Promise<LedgerEntry> {
    const payload: ReadEpisodePayload = {
      caseId,
      episodeType,
      tStartIso: new Date().toISOString(),
    };
    return this.exportPack.addEvent('READ_EPISODE_STARTED', payload);
  }

  /**
   * Log read episode end
   */
  async logReadEpisodeEnded(
    caseId: string,
    episodeType: ReadEpisodePayload['episodeType'],
    reason?: string
  ): Promise<LedgerEntry> {
    const payload: ReadEpisodePayload = {
      caseId,
      episodeType,
      tEndIso: new Date().toISOString(),
      reason,
    };
    return this.exportPack.addEvent('READ_EPISODE_ENDED', payload);
  }

  /**
   * Log AI reveal
   */
  async logAIRevealed(
    payload: AIRevealedPayload,
    context?: CaseContextPayload
  ): Promise<LedgerEntry> {
    this.aiRevealTime = Date.now();
    return this.exportPack.addEvent('AI_REVEALED', {
      ...context,
      ...payload,
    });
  }

  /**
   * Log disclosure presented
   */
  async logDisclosurePresented(
    payload: DisclosurePresentedPayload,
    context?: CaseContextPayload
  ): Promise<LedgerEntry> {
    return this.exportPack.addEvent('DISCLOSURE_PRESENTED', {
      ...context,
      ...payload,
    });
  }

  /**
   * Log comprehension check response
   */
  async logComprehensionResponse(payload: ComprehensionResponsePayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('DISCLOSURE_COMPREHENSION_RESPONSE', payload);
  }

  /**
   * Log deviation started
   */
  async logDeviationStarted(previousBirads: number): Promise<LedgerEntry> {
    return this.exportPack.addEvent('DEVIATION_STARTED', { previousBirads });
  }

  /**
   * Log deviation submitted with rationale
   */
  async logDeviationSubmitted(payload: DeviationPayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('DEVIATION_SUBMITTED', {
      ...payload,
      rationaleWordCount: payload.rationale?.split(/\s+/).length || 0,
    });
  }

  /**
   * Log deviation skipped
   */
  async logDeviationSkipped(payload: DeviationPayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('DEVIATION_SKIPPED', {
      ...payload,
      skipped: true,
    });
  }

  /**
   * Log final assessment
   */
  async logFinalAssessment(
    caseId: string,
    birads: number, 
    confidence: number, 
    initialBirads: number,
    aiBirads: number,
    context?: CaseContextPayload
  ): Promise<LedgerEntry> {
    const changeFromInitial = birads !== initialBirads;
    let changeDirection: 'TOWARD_AI' | 'AWAY_FROM_AI' | 'NO_CHANGE' = 'NO_CHANGE';
    
    if (changeFromInitial) {
      const initialDiff = Math.abs(initialBirads - aiBirads);
      const finalDiff = Math.abs(birads - aiBirads);
      changeDirection = finalDiff < initialDiff ? 'TOWARD_AI' : 'AWAY_FROM_AI';
    }
    
    const payload: FinalAssessmentPayload & CaseContextPayload = {
      ...context,
      caseId,
      birads,
      confidence,
      changeFromInitial,
      changeDirection,
      postAiTimeMs: this.aiRevealTime > 0 ? Date.now() - this.aiRevealTime : 0,
    };
    
    return this.exportPack.addEvent('FINAL_ASSESSMENT', payload);
  }

  /**
   * Log case completed
   */
  async logCaseCompleted(caseId: string, summary: Record<string, unknown>): Promise<LedgerEntry> {
    return this.exportPack.addEvent('CASE_COMPLETED', {
      caseId,
      totalTimeMs: Date.now() - this.caseStartTime,
      ...summary,
    });
  }

  /**
   * Log attention check
   */
  async logAttentionCheck(payload: AttentionCheckPayload): Promise<LedgerEntry> {
    return this.exportPack.addEvent('ATTENTION_CHECK_RESPONSE', payload);
  }

  /**
   * Log calibration events
   */
  async logCalibrationStarted(caseId: string): Promise<LedgerEntry> {
    return this.exportPack.addEvent('CALIBRATION_STARTED', { caseId });
  }

  async logCalibrationResponse(caseId: string, response: Record<string, unknown>): Promise<LedgerEntry> {
    return this.exportPack.addEvent('CALIBRATION_RESPONSE', { caseId, ...response });
  }

  async logCalibrationFeedback(caseId: string, feedback: Record<string, unknown>): Promise<LedgerEntry> {
    return this.exportPack.addEvent('CALIBRATION_FEEDBACK_SHOWN', { caseId, ...feedback });
  }

  /**
   * Log session ended
   */
  async logSessionEnded(summary: Record<string, unknown>): Promise<LedgerEntry> {
    return this.exportPack.addEvent('SESSION_ENDED', summary);
  }

  /**
   * Log export generated
   */
  async logExportGenerated(exportInfo: Record<string, unknown>): Promise<LedgerEntry> {
    return this.exportPack.addEvent('EXPORT_GENERATED', exportInfo);
  }

  // ==========================================================================
  // P1-3: Eye-tracking proxy events
  // ==========================================================================

  /**
   * Log gaze entering ROI (mouse enter as proxy)
   */
  async logGazeEnteredROI(
    roiId: string, 
    roiType: GazeEnteredROIPayload['roiType'],
    caseId: string
  ): Promise<LedgerEntry> {
    this.currentROI = roiId;
    this.roiEnterTime = Date.now();
    
    return this.exportPack.addEvent('GAZE_ENTERED_ROI', {
      roiId,
      roiType,
      caseId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log gaze exiting ROI and compute dwell time
   */
  async logGazeExitedROI(roiId: string, caseId: string): Promise<LedgerEntry | null> {
    if (this.currentROI !== roiId || this.roiEnterTime === 0) {
      return null;
    }
    
    const dwellMs = Date.now() - this.roiEnterTime;
    
    // Accumulate dwell time
    const existing = this.roiDwellTimes.get(roiId) || 0;
    this.roiDwellTimes.set(roiId, existing + dwellMs);
    
    this.currentROI = null;
    this.roiEnterTime = 0;
    
    // Only log if meaningful dwell (>100ms)
    if (dwellMs > 100) {
      return this.exportPack.addEvent('DWELL_TIME_ROI', {
        roiId,
        dwellMs,
        caseId,
      });
    }
    
    return null;
  }

  /**
   * Log attention coverage proxy at key moments (e.g., before locking impression)
   */
  async logAttentionCoverageProxy(caseId: string): Promise<LedgerEntry> {
    const roiDwellBreakdown: Record<string, number> = {};
    let totalDwell = 0;
    
    for (const [roi, dwell] of this.roiDwellTimes) {
      roiDwellBreakdown[roi] = dwell;
      totalDwell += dwell;
    }
    
    return this.exportPack.addEvent('ATTENTION_COVERAGE_PROXY', {
      caseId,
      totalROIDwellMs: totalDwell,
      roiDwellBreakdown,
      viewsExamined: Array.from(this.interactionCounts.viewsFocused),
      interactionCounts: {
        zooms: this.interactionCounts.zoom,
        pans: this.interactionCounts.pan,
        windowLevelChanges: this.interactionCounts.windowLevel,
      },
    });
  }

  /**
   * Get current ROI dwell times
   */
  getROIDwellTimes(): Map<string, number> {
    return new Map(this.roiDwellTimes);
  }

  /**
   * Get interaction counts
   */
  getInteractionCounts(): { zoom: number; pan: number; windowLevel: number } {
    return {
      zoom: this.interactionCounts.zoom,
      pan: this.interactionCounts.pan,
      windowLevel: this.interactionCounts.windowLevel,
    };
  }

  /**
   * Get the export pack for generating ZIP
   */
  getExportPack(): ExportPackLike {
    return this.exportPack;
  }
}

export default EventLogger;
