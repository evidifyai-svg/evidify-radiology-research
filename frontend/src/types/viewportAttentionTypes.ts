/**
 * viewportAttentionTypes.ts
 *
 * Type definitions for viewport-based attention tracking.
 * This module implements a software-only attention proxy that tracks
 * WHERE on the image the radiologist looked without requiring eye-tracking hardware.
 *
 * Research basis: Visual attention research distinguishes between different
 * error types based on whether a region was viewed:
 * - Search errors: Finding region was never viewed
 * - Recognition errors: Region was viewed but finding was missed
 * - Decision errors: Finding was recognized but incorrectly assessed
 */

/**
 * Standard anatomical regions for mammography.
 * Uses breast quadrant nomenclature:
 * - UOQ: Upper Outer Quadrant
 * - UIQ: Upper Inner Quadrant
 * - LOQ: Lower Outer Quadrant
 * - LIQ: Lower Inner Quadrant
 * - AXILLA: Axillary region
 * - NIPPLE: Nipple/areolar complex
 * - RETRO: Retroareolar region
 *
 * Suffix indicates laterality: _R (right) or _L (left)
 */
export type AnatomicalRegion =
  | 'UOQ_R' | 'UIQ_R' | 'LOQ_R' | 'LIQ_R' | 'AXILLA_R' | 'NIPPLE_R' | 'RETRO_R'
  | 'UOQ_L' | 'UIQ_L' | 'LOQ_L' | 'LIQ_L' | 'AXILLA_L' | 'NIPPLE_L' | 'RETRO_L';

/**
 * Viewport change event types.
 */
export type ViewportEventType =
  | 'VIEWPORT_CHANGE'  // Pan or zoom changed
  | 'ZOOM_CHANGE'      // Zoom level specifically changed
  | 'REGION_ENTER'     // New region came into viewport
  | 'REGION_EXIT';     // Region left viewport

/**
 * Single viewport event in the tracking stream.
 */
export interface ViewportEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Type of viewport event */
  eventType: ViewportEventType;
  /** Current zoom level (1.0 = fit to view) */
  zoomLevel: number;
  /** Pan position relative to image center */
  panPosition: { x: number; y: number };
  /** Viewport bounds in normalized coordinates (0-1) */
  viewportBounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** Regions currently visible in viewport */
  visibleRegions: AnatomicalRegion[];
  /** Dwell time in ms (for REGION_EXIT events) */
  dwellTimeMs?: number;
  /** Region that entered/exited (for REGION_ENTER/EXIT) */
  region?: AnatomicalRegion;
}

/**
 * Coverage metrics for a single anatomical region.
 */
export interface RegionCoverage {
  /** The anatomical region */
  region: AnatomicalRegion;
  /** Total time viewport included this region (ms) */
  totalDwellTimeMs: number;
  /** Number of separate viewing episodes */
  viewCount: number;
  /** Highest zoom level used when viewing this region */
  maxZoomLevel: number;
  /** What percentage of region pixels were in viewport */
  percentageViewed: number;
  /** ISO 8601 timestamp of first view */
  firstViewedAt: string | null;
  /** ISO 8601 timestamp of last view */
  lastViewedAt: string | null;
}

/**
 * Summary of attention coverage for a complete case.
 */
export interface AttentionSummary {
  /** Case identifier */
  caseId: string;
  /** Total anatomical regions defined for this view */
  totalRegions: number;
  /** Number of regions that were viewed at least once */
  regionsViewed: number;
  /** Overall coverage percentage (regionsViewed / totalRegions * 100) */
  coveragePercent: number;
  /** List of regions that were never viewed */
  regionsNeverViewed: AnatomicalRegion[];
  /** Average dwell time per viewed region (ms) */
  averageDwellTimeMs: number;
  /** Regions with highest cumulative attention (top 3) */
  hotspots: AnatomicalRegion[];
  /** Per-region coverage data */
  regionCoverage: RegionCoverage[];
  /** Total reading time for this case (ms) */
  totalReadingTimeMs: number;
}

/**
 * Error classification based on visual attention research.
 *
 * SEARCH_ERROR: The finding was in a region the radiologist never viewed.
 *   This indicates incomplete systematic search of the image.
 *
 * RECOGNITION_ERROR: The radiologist viewed the region containing the
 *   finding but did not detect it. This indicates a perceptual miss.
 *
 * DECISION_ERROR: The radiologist recognized something in the region
 *   but made an incorrect assessment (e.g., called benign when malignant).
 *
 * CORRECT: No error - finding was viewed and correctly assessed.
 */
export type ErrorType =
  | 'SEARCH_ERROR'
  | 'RECOGNITION_ERROR'
  | 'DECISION_ERROR'
  | 'CORRECT';

/**
 * Detailed error classification for a single finding.
 */
export interface ErrorClassification {
  /** Unique identifier for the finding */
  findingId: string;
  /** Anatomical region containing the finding */
  findingRegion: AnatomicalRegion;
  /** Ground truth pathology/diagnosis */
  groundTruth: string;
  /** Radiologist's assessment */
  radiologistAssessment: string;
  /** Whether the finding region was ever viewed */
  regionWasViewed: boolean;
  /** Total dwell time on the finding's region (ms) */
  dwellTimeOnRegion: number;
  /** Maximum zoom level used on this region */
  zoomLevelUsed: number;
  /** Classified error type */
  errorType: ErrorType;
  /** Human-readable explanation of the classification */
  explanation: string;
}

/**
 * Complete error analysis for a case.
 */
export interface CaseErrorAnalysis {
  /** Case identifier */
  caseId: string;
  /** Total findings in ground truth */
  totalFindings: number;
  /** Number of findings correctly identified */
  correctFindings: number;
  /** Number of search errors (never viewed) */
  searchErrors: number;
  /** Number of recognition errors (viewed but missed) */
  recognitionErrors: number;
  /** Number of decision errors (recognized incorrectly) */
  decisionErrors: number;
  /** Per-finding classification */
  classifications: ErrorClassification[];
  /** ISO 8601 timestamp of analysis */
  analysisTimestamp: string;
}

/**
 * Payload for VIEWPORT_ATTENTION_START event.
 */
export interface ViewportAttentionStartPayload {
  /** Case being read */
  caseId: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Initial viewport state */
  initialViewport: {
    zoomLevel: number;
    panPosition: { x: number; y: number };
  };
}

/**
 * Payload for REGION_VIEWED event (debounced).
 */
export interface RegionViewedPayload {
  /** Case being read */
  caseId: string;
  /** Region that was viewed */
  region: AnatomicalRegion;
  /** Zoom level when region was viewed */
  zoomLevel: number;
  /** ISO 8601 timestamp of entry */
  enteredAt: string;
  /** View duration (for exit events) */
  dwellTimeMs?: number;
}

/**
 * Payload for VIEWPORT_ATTENTION_SUMMARY event.
 */
export interface ViewportAttentionSummaryPayload {
  /** Case being read */
  caseId: string;
  /** Complete attention summary */
  summary: AttentionSummary;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Payload for ERROR_CLASSIFICATION event.
 */
export interface ErrorClassificationPayload {
  /** Case being read */
  caseId: string;
  /** Complete error analysis */
  analysis: CaseErrorAnalysis;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Region definition with polygon coordinates.
 * Coordinates are normalized (0-1) relative to image dimensions.
 */
export interface RegionDefinition {
  /** Region identifier */
  id: AnatomicalRegion;
  /** Display label */
  label: string;
  /** Polygon vertices (normalized 0-1) */
  polygon: Array<{ x: number; y: number }>;
  /** Center point (for label placement) */
  center: { x: number; y: number };
  /** Which mammogram view this region applies to */
  viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO';
}

/**
 * Attention status for display purposes.
 */
export type AttentionLevel = 'NOT_VIEWED' | 'BRIEF' | 'ADEQUATE' | 'EXTENDED';

/**
 * Region with current attention status for overlay display.
 */
export interface RegionWithAttention {
  /** Region definition */
  definition: RegionDefinition;
  /** Current attention level */
  attentionLevel: AttentionLevel;
  /** Total dwell time (ms) */
  dwellTimeMs: number;
  /** Number of times viewed */
  viewCount: number;
}

/**
 * Props for ViewportAttentionTracker component.
 */
export interface ViewportAttentionTrackerProps {
  /** Current case ID */
  caseId: string;
  /** Current view key */
  viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO';
  /** Current viewport state */
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  /** Container dimensions */
  containerSize: { width: number; height: number };
  /** Image dimensions */
  imageSize: { width: number; height: number };
  /** Callback for logging events */
  onLogEvent?: (type: string, payload: unknown) => Promise<void>;
  /** Whether to show the overlay (researcher mode) */
  showOverlay?: boolean;
}

/**
 * Props for RegionOverlay component.
 */
export interface RegionOverlayProps {
  /** Regions with attention data */
  regions: RegionWithAttention[];
  /** Whether overlay is visible */
  visible: boolean;
  /** Container dimensions */
  containerSize: { width: number; height: number };
  /** Current viewport transform */
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
}

/**
 * Props for AttentionSummary display component.
 */
export interface AttentionSummaryDisplayProps {
  /** Attention summary data */
  summary: AttentionSummary | null;
  /** Optional compact mode */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Thresholds for attention level classification.
 */
export interface AttentionThresholds {
  /** Minimum dwell time (ms) for BRIEF classification */
  briefThresholdMs: number;
  /** Minimum dwell time (ms) for ADEQUATE classification */
  adequateThresholdMs: number;
  /** Minimum dwell time (ms) for EXTENDED classification */
  extendedThresholdMs: number;
}

/**
 * Default attention thresholds based on reading research.
 */
export const DEFAULT_ATTENTION_THRESHOLDS: AttentionThresholds = {
  briefThresholdMs: 500,      // 0.5 seconds
  adequateThresholdMs: 2000,  // 2 seconds
  extendedThresholdMs: 5000,  // 5 seconds
};
