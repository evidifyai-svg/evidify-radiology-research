/**
 * useViewportTracking.ts
 *
 * React hook for tracking viewport-based attention as a proxy for gaze.
 * Monitors zoom, pan, and viewport position to determine which anatomical
 * regions the radiologist is examining.
 *
 * This creates a software-only attention proxy that is legally defensible
 * for distinguishing search errors from recognition errors.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  AnatomicalRegion,
  RegionCoverage,
  AttentionSummary,
  ViewportEvent,
  RegionWithAttention,
  ViewportAttentionStartPayload,
  RegionViewedPayload,
  ViewportAttentionSummaryPayload,
} from '../types/viewportAttentionTypes';
import { DEFAULT_ATTENTION_THRESHOLDS } from '../types/viewportAttentionTypes';
import {
  getVisibleRegions,
  getRegionsForView,
  classifyAttentionLevel,
} from '../lib/anatomicalRegions';

/**
 * Configuration options for viewport tracking.
 */
export interface UseViewportTrackingOptions {
  /** Current case ID */
  caseId: string;
  /** Current mammogram view */
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  /** Debounce interval for viewport events (ms) */
  debounceMs?: number;
  /** Minimum visibility to count region as viewed (0-100) */
  minVisibilityPercent?: number;
  /** Callback for logging events */
  onLogEvent?: (type: string, payload: unknown) => Promise<void>;
  /** Whether tracking is active */
  enabled?: boolean;
}

/**
 * Return value from useViewportTracking hook.
 */
export interface UseViewportTrackingReturn {
  /** Update viewport position (call on zoom/pan changes) */
  updateViewport: (
    viewport: { zoom: number; panX: number; panY: number },
    containerSize: { width: number; height: number },
    imageSize: { width: number; height: number }
  ) => void;
  /** Get current region coverage data */
  getRegionCoverage: () => RegionCoverage[];
  /** Get complete attention summary */
  getAttentionSummary: () => AttentionSummary;
  /** Get regions with attention status for overlay */
  getRegionsWithAttention: () => RegionWithAttention[];
  /** Currently visible regions */
  visibleRegions: AnatomicalRegion[];
  /** Reset tracking for new case */
  resetForNewCase: (newCaseId: string, newViewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO') => void;
  /** Finalize tracking and log summary */
  finalizeTracking: () => Promise<AttentionSummary>;
  /** Start tracking for a case */
  startTracking: (initialViewport: { zoom: number; panX: number; panY: number }) => void;
}

/**
 * Internal tracking state for a single region.
 */
interface RegionTrackingState {
  region: AnatomicalRegion;
  totalDwellTimeMs: number;
  viewCount: number;
  maxZoomLevel: number;
  maxPercentageViewed: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  currentlyVisible: boolean;
  visibilityStartTime: number | null;
}

/**
 * Calculate viewport bounds from pan, zoom, and container/image sizes.
 * Returns bounds in normalized image coordinates (0-1).
 */
function calculateViewportBounds(
  viewport: { zoom: number; panX: number; panY: number },
  containerSize: { width: number; height: number },
  imageSize: { width: number; height: number }
): { top: number; left: number; width: number; height: number } {
  // At zoom = 1, the image fits the container
  // panX/panY are offsets from center in pixels

  // Visible portion of image at current zoom
  const visibleWidth = containerSize.width / viewport.zoom;
  const visibleHeight = containerSize.height / viewport.zoom;

  // Calculate normalized bounds (0-1 relative to image)
  const normalizedWidth = visibleWidth / imageSize.width;
  const normalizedHeight = visibleHeight / imageSize.height;

  // Pan offset converts to normalized coordinates
  // panX > 0 means we're looking at the right side (left bound increases)
  const normalizedPanX = viewport.panX / imageSize.width;
  const normalizedPanY = viewport.panY / imageSize.height;

  // Center of viewport in normalized coords
  const centerX = 0.5 + normalizedPanX;
  const centerY = 0.5 + normalizedPanY;

  return {
    left: Math.max(0, centerX - normalizedWidth / 2),
    top: Math.max(0, centerY - normalizedHeight / 2),
    width: Math.min(1, normalizedWidth),
    height: Math.min(1, normalizedHeight),
  };
}

/**
 * Hook for tracking viewport-based attention.
 */
export function useViewportTracking(
  options: UseViewportTrackingOptions
): UseViewportTrackingReturn {
  const {
    caseId,
    viewKey,
    debounceMs = 100,
    minVisibilityPercent = 10,
    onLogEvent,
    enabled = true,
  } = options;

  // Tracking state
  const [visibleRegions, setVisibleRegions] = useState<AnatomicalRegion[]>([]);
  const trackingStartTimeRef = useRef<number>(Date.now());
  const lastUpdateTimeRef = useRef<number>(0);
  const isTrackingRef = useRef<boolean>(false);

  // Per-region tracking state
  const regionStatesRef = useRef<Map<AnatomicalRegion, RegionTrackingState>>(new Map());

  // Initialize region states for current view
  const initializeRegionStates = useCallback(
    (viewKeyToInit: 'RCC' | 'LCC' | 'RMLO' | 'LMLO') => {
      const regions = getRegionsForView(viewKeyToInit);
      const newStates = new Map<AnatomicalRegion, RegionTrackingState>();

      for (const region of regions) {
        newStates.set(region.id, {
          region: region.id,
          totalDwellTimeMs: 0,
          viewCount: 0,
          maxZoomLevel: 0,
          maxPercentageViewed: 0,
          firstViewedAt: null,
          lastViewedAt: null,
          currentlyVisible: false,
          visibilityStartTime: null,
        });
      }

      regionStatesRef.current = newStates;
    },
    []
  );

  // Initialize on mount and view change
  useEffect(() => {
    initializeRegionStates(viewKey);
  }, [viewKey, initializeRegionStates]);

  /**
   * Start tracking for a case.
   */
  const startTracking = useCallback(
    (initialViewport: { zoom: number; panX: number; panY: number }) => {
      trackingStartTimeRef.current = Date.now();
      isTrackingRef.current = true;

      if (onLogEvent) {
        const payload: ViewportAttentionStartPayload = {
          caseId,
          timestamp: new Date().toISOString(),
          initialViewport: {
            zoomLevel: initialViewport.zoom,
            panPosition: { x: initialViewport.panX, y: initialViewport.panY },
          },
        };
        onLogEvent('VIEWPORT_ATTENTION_START', payload);
      }
    },
    [caseId, onLogEvent]
  );

  /**
   * Update viewport position - call this on every zoom/pan change.
   */
  const updateViewport = useCallback(
    (
      viewport: { zoom: number; panX: number; panY: number },
      containerSize: { width: number; height: number },
      imageSize: { width: number; height: number }
    ) => {
      if (!enabled || !isTrackingRef.current) return;

      const now = Date.now();

      // Debounce updates
      if (now - lastUpdateTimeRef.current < debounceMs) {
        return;
      }
      lastUpdateTimeRef.current = now;

      // Calculate current viewport bounds
      const viewportBounds = calculateViewportBounds(viewport, containerSize, imageSize);

      // Find visible regions
      const visible = getVisibleRegions(viewKey, viewportBounds, minVisibilityPercent);
      const visibleIds = visible.map((v) => v.region);

      // Update region states
      const timestamp = new Date().toISOString();

      for (const [regionId, state] of regionStatesRef.current) {
        const visibilityInfo = visible.find((v) => v.region === regionId);
        const isVisible = !!visibilityInfo;

        if (isVisible && !state.currentlyVisible) {
          // Region just became visible
          state.currentlyVisible = true;
          state.visibilityStartTime = now;
          state.viewCount++;
          state.maxZoomLevel = Math.max(state.maxZoomLevel, viewport.zoom);
          state.maxPercentageViewed = Math.max(
            state.maxPercentageViewed,
            visibilityInfo.visibility
          );

          if (!state.firstViewedAt) {
            state.firstViewedAt = timestamp;
          }
          state.lastViewedAt = timestamp;

          // Log region viewed event
          if (onLogEvent) {
            const payload: RegionViewedPayload = {
              caseId,
              region: regionId,
              zoomLevel: viewport.zoom,
              enteredAt: timestamp,
            };
            onLogEvent('REGION_VIEWED', payload);
          }
        } else if (!isVisible && state.currentlyVisible) {
          // Region just became invisible - accumulate dwell time
          if (state.visibilityStartTime !== null) {
            const dwellTime = now - state.visibilityStartTime;
            state.totalDwellTimeMs += dwellTime;
          }
          state.currentlyVisible = false;
          state.visibilityStartTime = null;
        } else if (isVisible && state.currentlyVisible) {
          // Region still visible - update max values
          state.maxZoomLevel = Math.max(state.maxZoomLevel, viewport.zoom);
          state.maxPercentageViewed = Math.max(
            state.maxPercentageViewed,
            visibilityInfo.visibility
          );
        }
      }

      setVisibleRegions(visibleIds);
    },
    [enabled, debounceMs, viewKey, minVisibilityPercent, caseId, onLogEvent]
  );

  /**
   * Get current region coverage data.
   */
  const getRegionCoverage = useCallback((): RegionCoverage[] => {
    const now = Date.now();
    const coverage: RegionCoverage[] = [];

    for (const state of regionStatesRef.current.values()) {
      // Include any ongoing visibility in dwell time
      let totalDwell = state.totalDwellTimeMs;
      if (state.currentlyVisible && state.visibilityStartTime !== null) {
        totalDwell += now - state.visibilityStartTime;
      }

      coverage.push({
        region: state.region,
        totalDwellTimeMs: totalDwell,
        viewCount: state.viewCount,
        maxZoomLevel: state.maxZoomLevel,
        percentageViewed: state.maxPercentageViewed,
        firstViewedAt: state.firstViewedAt,
        lastViewedAt: state.lastViewedAt,
      });
    }

    return coverage;
  }, []);

  /**
   * Get complete attention summary.
   */
  const getAttentionSummary = useCallback((): AttentionSummary => {
    const coverage = getRegionCoverage();
    const totalReadingTimeMs = Date.now() - trackingStartTimeRef.current;

    const viewedRegions = coverage.filter((c) => c.viewCount > 0);
    const neverViewed = coverage
      .filter((c) => c.viewCount === 0)
      .map((c) => c.region);

    const totalDwellTime = viewedRegions.reduce(
      (sum, r) => sum + r.totalDwellTimeMs,
      0
    );
    const averageDwellTime =
      viewedRegions.length > 0 ? totalDwellTime / viewedRegions.length : 0;

    // Find hotspots (top 3 by dwell time)
    const sortedByDwell = [...viewedRegions].sort(
      (a, b) => b.totalDwellTimeMs - a.totalDwellTimeMs
    );
    const hotspots = sortedByDwell.slice(0, 3).map((r) => r.region);

    return {
      caseId,
      totalRegions: coverage.length,
      regionsViewed: viewedRegions.length,
      coveragePercent:
        coverage.length > 0
          ? Math.round((viewedRegions.length / coverage.length) * 100)
          : 0,
      regionsNeverViewed: neverViewed,
      averageDwellTimeMs: Math.round(averageDwellTime),
      hotspots,
      regionCoverage: coverage,
      totalReadingTimeMs,
    };
  }, [caseId, getRegionCoverage]);

  /**
   * Get regions with attention status for overlay display.
   */
  const getRegionsWithAttention = useCallback((): RegionWithAttention[] => {
    const coverage = getRegionCoverage();
    const regions = getRegionsForView(viewKey);
    const result: RegionWithAttention[] = [];

    for (const regionDef of regions) {
      const coverageData = coverage.find((c) => c.region === regionDef.id);
      const dwellTimeMs = coverageData?.totalDwellTimeMs || 0;
      const viewCount = coverageData?.viewCount || 0;

      result.push({
        definition: regionDef,
        attentionLevel: classifyAttentionLevel(dwellTimeMs, DEFAULT_ATTENTION_THRESHOLDS),
        dwellTimeMs,
        viewCount,
      });
    }

    return result;
  }, [viewKey, getRegionCoverage]);

  /**
   * Reset tracking for new case.
   */
  const resetForNewCase = useCallback(
    (newCaseId: string, newViewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO') => {
      initializeRegionStates(newViewKey);
      trackingStartTimeRef.current = Date.now();
      isTrackingRef.current = false;
      setVisibleRegions([]);
    },
    [initializeRegionStates]
  );

  /**
   * Finalize tracking and log summary.
   */
  const finalizeTracking = useCallback(async (): Promise<AttentionSummary> => {
    // Finalize any currently visible regions
    const now = Date.now();
    for (const state of regionStatesRef.current.values()) {
      if (state.currentlyVisible && state.visibilityStartTime !== null) {
        state.totalDwellTimeMs += now - state.visibilityStartTime;
        state.currentlyVisible = false;
        state.visibilityStartTime = null;
      }
    }

    const summary = getAttentionSummary();
    isTrackingRef.current = false;

    // Log the summary
    if (onLogEvent) {
      const payload: ViewportAttentionSummaryPayload = {
        caseId,
        summary,
        timestamp: new Date().toISOString(),
      };
      await onLogEvent('VIEWPORT_ATTENTION_SUMMARY', payload);
    }

    return summary;
  }, [caseId, getAttentionSummary, onLogEvent]);

  return {
    updateViewport,
    getRegionCoverage,
    getAttentionSummary,
    getRegionsWithAttention,
    visibleRegions,
    resetForNewCase,
    finalizeTracking,
    startTracking,
  };
}

export default useViewportTracking;
