/**
 * ViewportAttentionTracker.tsx
 *
 * Wrapper component that integrates viewport attention tracking with
 * mammogram viewer. This component manages the tracking hook and
 * provides the attention data to child components.
 *
 * Usage:
 * ```tsx
 * <ViewportAttentionTracker
 *   caseId={caseId}
 *   viewKey="RCC"
 *   viewport={viewerState}
 *   containerSize={{ width: 800, height: 600 }}
 *   imageSize={{ width: 2000, height: 2500 }}
 *   onLogEvent={eventLogger.addEvent}
 *   showOverlay={isResearcherMode}
 * >
 *   <MammogramViewer ... />
 * </ViewportAttentionTracker>
 * ```
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useViewportTracking } from '../../hooks/useViewportTracking';
import { RegionOverlay } from './RegionOverlay';
import type { ViewportAttentionTrackerProps } from '../../types/viewportAttentionTypes';

/**
 * Extended props including children.
 */
interface ViewportAttentionTrackerExtendedProps extends ViewportAttentionTrackerProps {
  children?: React.ReactNode;
  /** Reference to get tracking methods */
  trackingRef?: React.MutableRefObject<{
    finalizeTracking: () => Promise<unknown>;
    getAttentionSummary: () => unknown;
  } | null>;
}

/**
 * ViewportAttentionTracker component.
 * Tracks viewport attention and optionally renders the region overlay.
 */
export const ViewportAttentionTracker: React.FC<ViewportAttentionTrackerExtendedProps> = ({
  caseId,
  viewKey,
  viewport,
  containerSize,
  imageSize,
  onLogEvent,
  showOverlay = false,
  children,
  trackingRef,
}) => {
  const lastViewportRef = useRef({ zoom: 0, panX: 0, panY: 0 });
  const isInitializedRef = useRef(false);

  const {
    updateViewport,
    getRegionsWithAttention,
    finalizeTracking,
    getAttentionSummary,
    startTracking,
    resetForNewCase,
    visibleRegions,
  } = useViewportTracking({
    caseId,
    viewKey,
    onLogEvent,
    enabled: true,
  });

  // Expose tracking methods via ref
  useEffect(() => {
    if (trackingRef) {
      trackingRef.current = {
        finalizeTracking,
        getAttentionSummary,
      };
    }
    return () => {
      if (trackingRef) {
        trackingRef.current = null;
      }
    };
  }, [trackingRef, finalizeTracking, getAttentionSummary]);

  // Initialize tracking when case changes
  useEffect(() => {
    resetForNewCase(caseId, viewKey);
    startTracking(viewport);
    isInitializedRef.current = true;
  }, [caseId, viewKey, resetForNewCase, startTracking]);

  // Update tracking on viewport changes
  useEffect(() => {
    if (!isInitializedRef.current) return;

    // Check if viewport actually changed
    const last = lastViewportRef.current;
    if (
      viewport.zoom === last.zoom &&
      viewport.panX === last.panX &&
      viewport.panY === last.panY
    ) {
      return;
    }

    lastViewportRef.current = { ...viewport };
    updateViewport(viewport, containerSize, imageSize);
  }, [viewport, containerSize, imageSize, updateViewport]);

  // Get regions for overlay
  const regionsWithAttention = showOverlay ? getRegionsWithAttention() : [];

  return (
    <div className="relative w-full h-full">
      {children}

      {/* Debug info for visible regions (development only) */}
      {showOverlay && visibleRegions.length > 0 && (
        <div className="absolute top-2 left-2 bg-black/70 text-xs text-white px-2 py-1 rounded z-50">
          Viewing: {visibleRegions.join(', ')}
        </div>
      )}

      {/* Region overlay */}
      {showOverlay && (
        <RegionOverlay
          regions={regionsWithAttention}
          visible={showOverlay}
          containerSize={containerSize}
          viewport={viewport}
        />
      )}
    </div>
  );
};

export default ViewportAttentionTracker;
