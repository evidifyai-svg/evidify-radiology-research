/**
 * useViewportTracking.ts
 *
 * React hook for tracking viewport attention in mammogram viewer.
 * Implements software-only gaze approximation based on Wolfe's visual attention research.
 *
 * Reference: Wolfe, J. M., & Van Wert, M. J. (2010). "Varying Target Prevalence
 * Reveals Two Dissociable Decision Criteria in Visual Search." Current Biology.
 *
 * This hook tracks:
 * - Viewport position changes (zoom, pan)
 * - Which anatomical regions are visible
 * - Dwell time per region
 * - Region entry/exit events
 *
 * The data enables post-hoc classification of errors as:
 * - Search errors (region never viewed)
 * - Recognition errors (region viewed but finding missed)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  AnatomicalRegion,
  REGION_DEFINITIONS,
  calculateViewportBounds,
  getVisibleRegions,
  calculateClinicalCoverageScore,
  HIGH_PRIORITY_REGIONS,
} from './anatomicalRegions';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Viewport event types for attention tracking.
 */
export type ViewportEventType =
  | 'VIEWPORT_CHANGE'
  | 'ZOOM_CHANGE'
  | 'REGION_ENTER'
  | 'REGION_EXIT';

/**
 * A single viewport event for logging.
 */
export interface ViewportEvent {
  timestamp: string;
  eventType: ViewportEventType;
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  zoomLevel: number;
  panPosition: { x: number; y: number };
  viewportBounds: { top: number; left: number; width: number; height: number };
  visibleRegions: AnatomicalRegion[];
  dwellTimeMs?: number; // For REGION_EXIT events
  region?: AnatomicalRegion; // For REGION_ENTER/EXIT events
}

/**
 * Coverage data for a single region.
 */
export interface RegionCoverage {
  region: AnatomicalRegion;
  totalDwellTimeMs: number;
  viewCount: number;
  maxZoomLevel: number;
  percentageViewed: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
}

/**
 * Summary of attention coverage across all regions.
 */
export interface AttentionSummary {
  totalRegions: number;
  regionsViewed: number;
  coveragePercent: number;
  regionsNeverViewed: AnatomicalRegion[];
  averageDwellTimeMs: number;
  hotspots: AnatomicalRegion[];
  clinicalCoverageScore: number;
  highPriorityRegionsViewed: number;
  highPriorityRegionsTotal: number;
}

/**
 * State for a single view's tracking.
 */
interface ViewTrackingState {
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  coverage: Map<AnatomicalRegion, RegionCoverage>;
  currentlyVisibleRegions: Set<AnatomicalRegion>;
  regionEnterTimes: Map<AnatomicalRegion, number>;
  events: ViewportEvent[];
}

/**
 * Configuration for the tracking hook.
 */
export interface ViewportTrackingConfig {
  /** Minimum dwell time (ms) to count as "viewed" */
  minDwellThreshold: number;
  /** Debounce interval for viewport events (ms) */
  debounceMs: number;
  /** Minimum visibility % for a region to count as visible */
  minVisibilityThreshold: number;
  /** Whether to auto-start tracking */
  autoStart: boolean;
  /** Enable debug logging */
  debug: boolean;
}

const DEFAULT_CONFIG: ViewportTrackingConfig = {
  minDwellThreshold: 200, // 200ms minimum to count as "looked at"
  debounceMs: 100, // 100ms debounce for events
  minVisibilityThreshold: 15, // 15% visible to count
  autoStart: true,
  debug: false,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useViewportTracking(
  config: Partial<ViewportTrackingConfig> = {}
) {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Tracking state for all views
  const [trackingState, setTrackingState] = useState<Map<string, ViewTrackingState>>(() => new Map());

  // Whether tracking is active
  const [isTracking, setIsTracking] = useState(finalConfig.autoStart);

  // Start time for the session
  const sessionStartTime = useRef<number>(Date.now());

  // Debounce timers
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // RAF handle for smooth updates
  const rafHandle = useRef<number | null>(null);

  // Container dimensions per view
  const containerDimensions = useRef<Map<string, { width: number; height: number }>>(new Map());

  /**
   * Initialize tracking state for a view.
   */
  const initializeView = useCallback((viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO') => {
    const regions = REGION_DEFINITIONS[viewKey];
    const coverage = new Map<AnatomicalRegion, RegionCoverage>();

    for (const regionDef of regions) {
      coverage.set(regionDef.id, {
        region: regionDef.id,
        totalDwellTimeMs: 0,
        viewCount: 0,
        maxZoomLevel: 0,
        percentageViewed: 0,
        firstViewedAt: null,
        lastViewedAt: null,
      });
    }

    const state: ViewTrackingState = {
      viewKey,
      coverage,
      currentlyVisibleRegions: new Set(),
      regionEnterTimes: new Map(),
      events: [],
    };

    setTrackingState(prev => {
      const next = new Map(prev);
      next.set(viewKey, state);
      return next;
    });

    return state;
  }, []);

  /**
   * Start tracking.
   */
  const startTracking = useCallback((caseId?: string) => {
    setIsTracking(true);
    sessionStartTime.current = Date.now();

    // Initialize all views
    const views: Array<'RCC' | 'LCC' | 'RMLO' | 'LMLO'> = ['RCC', 'LCC', 'RMLO', 'LMLO'];
    views.forEach(initializeView);

    if (finalConfig.debug) {
      console.log(`[ViewportTracking] Started tracking for case: ${caseId || 'unknown'}`);
    }
  }, [initializeView, finalConfig.debug]);

  /**
   * Stop tracking and return summary.
   */
  const stopTracking = useCallback((): Map<string, AttentionSummary> => {
    setIsTracking(false);

    // Cancel any pending debounce timers
    debounceTimers.current.forEach(timer => clearTimeout(timer));
    debounceTimers.current.clear();

    // Cancel RAF
    if (rafHandle.current !== null) {
      cancelAnimationFrame(rafHandle.current);
      rafHandle.current = null;
    }

    // Process any remaining open regions (compute final dwell times)
    const summaries = new Map<string, AttentionSummary>();
    const now = Date.now();

    trackingState.forEach((state, viewKey) => {
      // Close any open regions
      state.regionEnterTimes.forEach((enterTime, region) => {
        const dwellMs = now - enterTime;
        const coverage = state.coverage.get(region);
        if (coverage && dwellMs >= finalConfig.minDwellThreshold) {
          coverage.totalDwellTimeMs += dwellMs;
          coverage.lastViewedAt = new Date().toISOString();
        }
      });

      // Calculate summary
      summaries.set(viewKey, calculateSummaryForView(state));
    });

    if (finalConfig.debug) {
      console.log('[ViewportTracking] Stopped tracking. Summaries:', summaries);
    }

    return summaries;
  }, [trackingState, finalConfig.minDwellThreshold, finalConfig.debug]);

  /**
   * Reset tracking state.
   */
  const resetTracking = useCallback(() => {
    setTrackingState(new Map());
    sessionStartTime.current = Date.now();
    debounceTimers.current.forEach(timer => clearTimeout(timer));
    debounceTimers.current.clear();
  }, []);

  /**
   * Set container dimensions for a view.
   */
  const setContainerDimensions = useCallback((
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    width: number,
    height: number
  ) => {
    containerDimensions.current.set(viewKey, { width, height });
  }, []);

  /**
   * Record a viewport update.
   */
  const recordViewportUpdate = useCallback((
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    zoom: number,
    panX: number,
    panY: number,
    eventType: 'VIEWPORT_CHANGE' | 'ZOOM_CHANGE' = 'VIEWPORT_CHANGE'
  ) => {
    if (!isTracking) return;

    // Get container dimensions (default to standard mammogram aspect ratio)
    const dims = containerDimensions.current.get(viewKey) || { width: 300, height: 400 };

    // Calculate viewport bounds
    const viewportBounds = calculateViewportBounds(zoom, panX, panY, dims.width, dims.height);

    // Get visible regions
    const visibleRegionsData = getVisibleRegions(viewKey, viewportBounds, finalConfig.minVisibilityThreshold);
    const visibleRegions = new Set(visibleRegionsData.map(r => r.region));

    // Debounce the state update
    const timerKey = `${viewKey}-viewport`;
    const existingTimer = debounceTimers.current.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      setTrackingState(prev => {
        const state = prev.get(viewKey);
        if (!state) return prev;

        const now = Date.now();
        const timestamp = new Date().toISOString();
        const updatedCoverage = new Map(state.coverage);
        const newEvents: ViewportEvent[] = [...state.events];

        // Process region exits (were visible, now not)
        state.currentlyVisibleRegions.forEach(region => {
          if (!visibleRegions.has(region)) {
            // Region exited
            const enterTime = state.regionEnterTimes.get(region);
            const dwellMs = enterTime ? now - enterTime : 0;

            if (dwellMs >= finalConfig.minDwellThreshold) {
              const coverage = updatedCoverage.get(region);
              if (coverage) {
                coverage.totalDwellTimeMs += dwellMs;
                coverage.lastViewedAt = timestamp;
              }
            }

            // Log exit event
            newEvents.push({
              timestamp,
              eventType: 'REGION_EXIT',
              viewKey,
              zoomLevel: zoom,
              panPosition: { x: panX, y: panY },
              viewportBounds,
              visibleRegions: Array.from(visibleRegions),
              dwellTimeMs: dwellMs,
              region,
            });
          }
        });

        // Process region entries (not visible before, now visible)
        visibleRegions.forEach(region => {
          if (!state.currentlyVisibleRegions.has(region)) {
            // Region entered
            const coverage = updatedCoverage.get(region);
            if (coverage) {
              coverage.viewCount++;
              coverage.maxZoomLevel = Math.max(coverage.maxZoomLevel, zoom);
              if (!coverage.firstViewedAt) {
                coverage.firstViewedAt = timestamp;
              }
            }

            // Log enter event
            newEvents.push({
              timestamp,
              eventType: 'REGION_ENTER',
              viewKey,
              zoomLevel: zoom,
              panPosition: { x: panX, y: panY },
              viewportBounds,
              visibleRegions: Array.from(visibleRegions),
              region,
            });
          }
        });

        // Update max zoom and visibility for currently visible regions
        visibleRegionsData.forEach(({ region, visibilityPercent }) => {
          const coverage = updatedCoverage.get(region);
          if (coverage) {
            coverage.maxZoomLevel = Math.max(coverage.maxZoomLevel, zoom);
            coverage.percentageViewed = Math.max(coverage.percentageViewed, visibilityPercent);
          }
        });

        // Log viewport change event
        newEvents.push({
          timestamp,
          eventType,
          viewKey,
          zoomLevel: zoom,
          panPosition: { x: panX, y: panY },
          viewportBounds,
          visibleRegions: Array.from(visibleRegions),
        });

        // Update enter times for new regions
        const newEnterTimes = new Map(state.regionEnterTimes);
        state.currentlyVisibleRegions.forEach(region => {
          if (!visibleRegions.has(region)) {
            newEnterTimes.delete(region);
          }
        });
        visibleRegions.forEach(region => {
          if (!state.currentlyVisibleRegions.has(region)) {
            newEnterTimes.set(region, now);
          }
        });

        const nextState: ViewTrackingState = {
          ...state,
          coverage: updatedCoverage,
          currentlyVisibleRegions: visibleRegions,
          regionEnterTimes: newEnterTimes,
          events: newEvents,
        };

        const next = new Map(prev);
        next.set(viewKey, nextState);
        return next;
      });

      debounceTimers.current.delete(timerKey);
    }, finalConfig.debounceMs);

    debounceTimers.current.set(timerKey, timer);
  }, [isTracking, finalConfig]);

  /**
   * Calculate attention summary for a view.
   */
  const calculateSummaryForView = useCallback((state: ViewTrackingState): AttentionSummary => {
    const coverageArray = Array.from(state.coverage.values());
    const totalRegions = coverageArray.length;
    const viewedRegions = coverageArray.filter(c => c.totalDwellTimeMs >= finalConfig.minDwellThreshold);
    const regionsViewed = viewedRegions.length;

    const regionsNeverViewed = coverageArray
      .filter(c => c.viewCount === 0)
      .map(c => c.region);

    const totalDwellTime = coverageArray.reduce((sum, c) => sum + c.totalDwellTimeMs, 0);
    const averageDwellTimeMs = regionsViewed > 0 ? totalDwellTime / regionsViewed : 0;

    // Hotspots: regions with highest dwell time (top 3)
    const hotspots = [...coverageArray]
      .sort((a, b) => b.totalDwellTimeMs - a.totalDwellTimeMs)
      .slice(0, 3)
      .filter(c => c.totalDwellTimeMs > 0)
      .map(c => c.region);

    // Clinical coverage score
    const viewedSet = new Set(viewedRegions.map(c => c.region));
    const clinicalCoverageScore = calculateClinicalCoverageScore(state.viewKey, viewedSet);

    // High priority regions
    const laterality = state.viewKey.startsWith('R') ? 'R' : 'L';
    const applicableHighPriority = HIGH_PRIORITY_REGIONS.filter(r => r.endsWith(`_${laterality}`));
    const highPriorityViewed = applicableHighPriority.filter(r => viewedSet.has(r)).length;

    return {
      totalRegions,
      regionsViewed,
      coveragePercent: totalRegions > 0 ? (regionsViewed / totalRegions) * 100 : 0,
      regionsNeverViewed,
      averageDwellTimeMs,
      hotspots,
      clinicalCoverageScore,
      highPriorityRegionsViewed: highPriorityViewed,
      highPriorityRegionsTotal: applicableHighPriority.length,
    };
  }, [finalConfig.minDwellThreshold]);

  /**
   * Get current attention summary for all views.
   */
  const getAttentionSummary = useCallback((): Map<string, AttentionSummary> => {
    const summaries = new Map<string, AttentionSummary>();

    trackingState.forEach((state, viewKey) => {
      summaries.set(viewKey, calculateSummaryForView(state));
    });

    return summaries;
  }, [trackingState, calculateSummaryForView]);

  /**
   * Get coverage data for a specific region.
   */
  const getRegionCoverage = useCallback((
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    region: AnatomicalRegion
  ): RegionCoverage | undefined => {
    const state = trackingState.get(viewKey);
    return state?.coverage.get(region);
  }, [trackingState]);

  /**
   * Get all events for export.
   */
  const getAllEvents = useCallback((): ViewportEvent[] => {
    const allEvents: ViewportEvent[] = [];
    trackingState.forEach(state => {
      allEvents.push(...state.events);
    });
    return allEvents.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [trackingState]);

  /**
   * Get coverage map for all views.
   */
  const getAllCoverage = useCallback((): Map<string, Map<AnatomicalRegion, RegionCoverage>> => {
    const result = new Map<string, Map<AnatomicalRegion, RegionCoverage>>();
    trackingState.forEach((state, viewKey) => {
      result.set(viewKey, new Map(state.coverage));
    });
    return result;
  }, [trackingState]);

  /**
   * Check if a specific region was adequately examined.
   * "Adequate" means sufficient dwell time at sufficient zoom.
   */
  const wasRegionAdequatelyExamined = useCallback((
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    region: AnatomicalRegion,
    options: { minDwellMs?: number; minZoom?: number } = {}
  ): boolean => {
    const { minDwellMs = 500, minZoom = 1.5 } = options;
    const coverage = getRegionCoverage(viewKey, region);
    if (!coverage) return false;

    return coverage.totalDwellTimeMs >= minDwellMs && coverage.maxZoomLevel >= minZoom;
  }, [getRegionCoverage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      if (rafHandle.current !== null) {
        cancelAnimationFrame(rafHandle.current);
      }
    };
  }, []);

  return {
    // State
    isTracking,
    trackingState,

    // Controls
    startTracking,
    stopTracking,
    resetTracking,
    setContainerDimensions,

    // Event recording
    recordViewportUpdate,

    // Data access
    getAttentionSummary,
    getRegionCoverage,
    getAllEvents,
    getAllCoverage,
    wasRegionAdequatelyExamined,

    // Utilities
    calculateSummaryForView,
  };
}

export default useViewportTracking;
