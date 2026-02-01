/**
 * Viewport Attention Proxy (Wolfe)
 *
 * Software-only attention tracking based on Dr. Jeremy Wolfe's visual attention research.
 * Approximates gaze behavior by tracking viewport position, zoom, and pan.
 *
 * This module provides:
 * - Anatomical region definitions (breast quadrants)
 * - Viewport tracking hook
 * - Wolfe error classification
 * - Export utilities for attention heatmaps
 *
 * Key References:
 * - Wolfe, J. M. (2020). "Visual Search" in Attention (2nd ed.)
 * - Drew, T., Vo, M. L. H., & Wolfe, J. M. (2013). "The invisible gorilla strikes again."
 * - Kundel, H. L., & Nodine, C. F. (1975). "Interpreting chest radiographs without visual search."
 */

// Anatomical region definitions
export {
  type AnatomicalRegion,
  type RegionBounds,
  type AnatomicalRegionDefinition,
  REGION_DEFINITIONS,
  ALL_REGIONS,
  HIGH_PRIORITY_REGIONS,
  getRegionDisplayName,
  getRegionCode,
  getVisibleRegions,
  calculateViewportBounds,
  calculateRegionViewportIntersection,
  mapLocationToRegions,
  calculateClinicalCoverageScore,
  pixelToPercentBounds,
  percentToPixelBounds,
  getRegionsForLaterality,
  getLateralityFromView,
  getViewTypeFromKey,
  getRegionDefinition,
} from '../anatomicalRegions';

// Viewport tracking hook
export {
  useViewportTracking,
  type ViewportEvent,
  type ViewportEventType,
  type RegionCoverage,
  type AttentionSummary,
  type ViewportTrackingConfig,
} from '../useViewportTracking';

// Wolfe error classification
export {
  type WolfeErrorType,
  type GroundTruthFinding,
  type ReaderAssessment,
  type ErrorClassification,
  type WolfeClassificationSummary,
  type ClassificationThresholds,
  type AttentionHeatmapExport,
  type WolfeClassificationExport,
  classifyFinding,
  classifyCase,
  exportAttentionHeatmap,
  exportWolfeClassification,
} from '../wolfeClassification';

// Event logger types
export type {
  ViewportAttentionStartPayload,
  RegionViewedPayload,
  ViewportAttentionSummaryPayload,
  WolfeErrorClassificationPayload,
} from '../event_logger';
