/**
 * ViewportAttentionTracker.tsx
 *
 * Main tracking component for viewport-based attention proxy.
 * Wraps the MammogramViewer and tracks attention patterns without eye-tracking hardware.
 *
 * Based on Dr. Jeremy Wolfe's visual attention research:
 * - Wolfe, J. M. (2020). "Visual Search" in Attention (2nd ed.)
 * - Drew, T., Vo, M. L. H., & Wolfe, J. M. (2013). "The invisible gorilla strikes again."
 *   Psychological Science, 24(9), 1848-1853.
 *
 * This component provides a software-only attention proxy that:
 * 1. Tracks zoom, pan, and viewport position
 * 2. Maps viewport to anatomical regions
 * 3. Calculates dwell time per region
 * 4. Enables post-hoc error classification (search vs recognition)
 */

import React, { useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useViewportTracking, ViewportEvent, AttentionSummary, RegionCoverage } from '../../lib/useViewportTracking';
import { AnatomicalRegion } from '../../lib/anatomicalRegions';

// ============================================================================
// TYPES
// ============================================================================

export interface ViewportAttentionTrackerProps {
  /** Current case ID */
  caseId: string;
  /** Callback when viewport events occur */
  onViewportEvent?: (event: ViewportEvent) => void;
  /** Callback when attention summary is updated */
  onAttentionUpdate?: (summaries: Map<string, AttentionSummary>) => void;
  /** Whether tracking is enabled */
  enabled?: boolean;
  /** Configuration options */
  config?: {
    minDwellThreshold?: number;
    debounceMs?: number;
    minVisibilityThreshold?: number;
    updateIntervalMs?: number;
  };
  /** Children (typically MammogramViewer) */
  children?: React.ReactNode;
}

/**
 * Imperative handle for controlling the tracker from parent components.
 */
export interface ViewportAttentionTrackerHandle {
  startTracking: () => void;
  stopTracking: () => Map<string, AttentionSummary>;
  resetTracking: () => void;
  recordViewportChange: (
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    zoom: number,
    panX: number,
    panY: number
  ) => void;
  getAttentionSummary: () => Map<string, AttentionSummary>;
  getAllEvents: () => ViewportEvent[];
  getAllCoverage: () => Map<string, Map<AnatomicalRegion, RegionCoverage>>;
  setContainerDimensions: (
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    width: number,
    height: number
  ) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ViewportAttentionTracker wraps a mammogram viewer and tracks attention patterns.
 *
 * Usage:
 * ```tsx
 * const trackerRef = useRef<ViewportAttentionTrackerHandle>(null);
 *
 * <ViewportAttentionTracker
 *   ref={trackerRef}
 *   caseId={currentCase.id}
 *   onAttentionUpdate={(summaries) => console.log(summaries)}
 * >
 *   <MammogramViewer
 *     images={images}
 *     onInteraction={(interaction) => {
 *       if (interaction.type === 'ZOOM_CHANGED' || interaction.type === 'PAN_CHANGED') {
 *         trackerRef.current?.recordViewportChange(
 *           interaction.viewKey,
 *           interaction.state.zoom,
 *           interaction.state.panX,
 *           interaction.state.panY
 *         );
 *       }
 *     }}
 *   />
 * </ViewportAttentionTracker>
 * ```
 */
export const ViewportAttentionTracker = forwardRef<
  ViewportAttentionTrackerHandle,
  ViewportAttentionTrackerProps
>(({
  caseId,
  onViewportEvent,
  onAttentionUpdate,
  enabled = true,
  config = {},
  children,
}, ref) => {
  const {
    minDwellThreshold = 200,
    debounceMs = 100,
    minVisibilityThreshold = 15,
    updateIntervalMs = 1000,
  } = config;

  // Use the viewport tracking hook
  const {
    isTracking,
    startTracking,
    stopTracking,
    resetTracking,
    recordViewportUpdate,
    getAttentionSummary,
    getAllEvents,
    getAllCoverage,
    setContainerDimensions,
  } = useViewportTracking({
    minDwellThreshold,
    debounceMs,
    minVisibilityThreshold,
    autoStart: enabled,
  });

  // Track previous case ID to detect changes
  const prevCaseIdRef = useRef<string | null>(null);

  // Interval for periodic summary updates
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Last events count for change detection
  const lastEventsCountRef = useRef<number>(0);

  /**
   * Handle case change - reset tracking for new case.
   */
  useEffect(() => {
    if (prevCaseIdRef.current !== caseId) {
      if (prevCaseIdRef.current !== null) {
        // Stop previous tracking
        const previousSummary = stopTracking();
        if (onAttentionUpdate) {
          onAttentionUpdate(previousSummary);
        }
      }

      // Start new tracking
      if (enabled) {
        resetTracking();
        startTracking(caseId);
      }

      prevCaseIdRef.current = caseId;
    }
  }, [caseId, enabled, startTracking, stopTracking, resetTracking, onAttentionUpdate]);

  /**
   * Enable/disable tracking based on prop.
   */
  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking(caseId);
    } else if (!enabled && isTracking) {
      stopTracking();
    }
  }, [enabled, isTracking, caseId, startTracking, stopTracking]);

  /**
   * Set up periodic summary updates.
   */
  useEffect(() => {
    if (!enabled || !onAttentionUpdate) return;

    updateIntervalRef.current = setInterval(() => {
      const events = getAllEvents();
      if (events.length !== lastEventsCountRef.current) {
        lastEventsCountRef.current = events.length;
        const summaries = getAttentionSummary();
        onAttentionUpdate(summaries);
      }
    }, updateIntervalMs);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [enabled, updateIntervalMs, onAttentionUpdate, getAllEvents, getAttentionSummary]);

  /**
   * Forward viewport events to callback.
   */
  const handleViewportUpdate = useCallback((
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    zoom: number,
    panX: number,
    panY: number
  ) => {
    recordViewportUpdate(viewKey, zoom, panX, panY);

    // Get the latest event to forward
    if (onViewportEvent) {
      const events = getAllEvents();
      const latestEvent = events[events.length - 1];
      if (latestEvent) {
        onViewportEvent(latestEvent);
      }
    }
  }, [recordViewportUpdate, getAllEvents, onViewportEvent]);

  /**
   * Expose imperative handle for parent control.
   */
  useImperativeHandle(ref, () => ({
    startTracking: () => startTracking(caseId),
    stopTracking,
    resetTracking,
    recordViewportChange: handleViewportUpdate,
    getAttentionSummary,
    getAllEvents,
    getAllCoverage,
    setContainerDimensions,
  }), [
    caseId,
    startTracking,
    stopTracking,
    resetTracking,
    handleViewportUpdate,
    getAttentionSummary,
    getAllEvents,
    getAllCoverage,
    setContainerDimensions,
  ]);

  // Render children directly - this is a headless component
  return <>{children}</>;
});

ViewportAttentionTracker.displayName = 'ViewportAttentionTracker';

// ============================================================================
// CONTEXT PROVIDER (Optional higher-level integration)
// ============================================================================

interface ViewportAttentionContextValue {
  isTracking: boolean;
  recordViewportChange: (
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    zoom: number,
    panX: number,
    panY: number
  ) => void;
  getAttentionSummary: () => Map<string, AttentionSummary>;
  getAllCoverage: () => Map<string, Map<AnatomicalRegion, RegionCoverage>>;
  setContainerDimensions: (
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
    width: number,
    height: number
  ) => void;
}

const ViewportAttentionContext = React.createContext<ViewportAttentionContextValue | null>(null);

/**
 * Hook to access viewport attention tracking from child components.
 */
export function useViewportAttention(): ViewportAttentionContextValue {
  const context = React.useContext(ViewportAttentionContext);
  if (!context) {
    throw new Error('useViewportAttention must be used within a ViewportAttentionProvider');
  }
  return context;
}

/**
 * Provider component that enables attention tracking throughout a component tree.
 */
export const ViewportAttentionProvider: React.FC<{
  caseId: string;
  enabled?: boolean;
  onAttentionUpdate?: (summaries: Map<string, AttentionSummary>) => void;
  children: React.ReactNode;
}> = ({ caseId, enabled = true, onAttentionUpdate, children }) => {
  const trackerRef = useRef<ViewportAttentionTrackerHandle>(null);

  const contextValue: ViewportAttentionContextValue = {
    isTracking: enabled,
    recordViewportChange: (viewKey, zoom, panX, panY) => {
      trackerRef.current?.recordViewportChange(viewKey, zoom, panX, panY);
    },
    getAttentionSummary: () => {
      return trackerRef.current?.getAttentionSummary() || new Map();
    },
    getAllCoverage: () => {
      return trackerRef.current?.getAllCoverage() || new Map();
    },
    setContainerDimensions: (viewKey, width, height) => {
      trackerRef.current?.setContainerDimensions(viewKey, width, height);
    },
  };

  return (
    <ViewportAttentionContext.Provider value={contextValue}>
      <ViewportAttentionTracker
        ref={trackerRef}
        caseId={caseId}
        enabled={enabled}
        onAttentionUpdate={onAttentionUpdate}
      >
        {children}
      </ViewportAttentionTracker>
    </ViewportAttentionContext.Provider>
  );
};

export default ViewportAttentionTracker;
