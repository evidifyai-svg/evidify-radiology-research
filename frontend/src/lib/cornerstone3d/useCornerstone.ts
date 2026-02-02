/**
 * useCornerstone Hook
 *
 * React hook for integrating Cornerstone3D with React components.
 * Handles initialization, cleanup, and provides a clean interface for
 * rendering medical images.
 *
 * @module cornerstone3d/useCornerstone
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  initCornerstone3D,
  getInitState,
  createRenderingEngine,
  destroyRenderingEngine,
  createViewports,
  createToolGroup,
  configureMammoTools,
  applyWLPreset,
  getViewportWL,
  cleanup,
  MAMMO_WL_PRESETS,
  TOOL_IDS,
  type CornerstoneInitState,
  type CornerstoneInitOptions,
  type ViewportConfig,
  type WLPreset,
} from './init';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCornerstoneOptions {
  /** Whether to auto-initialize on mount */
  autoInit?: boolean;
  /** Initialization options */
  initOptions?: Partial<CornerstoneInitOptions>;
}

export interface UseCornerstoneReturn {
  /** Current initialization state */
  initState: CornerstoneInitState;
  /** Whether the library is ready to use */
  isReady: boolean;
  /** Manually initialize if autoInit is false */
  initialize: () => Promise<void>;
  /** Clean up all resources */
  cleanup: () => Promise<void>;
}

export interface UseViewportOptions {
  /** Rendering engine ID */
  engineId: string;
  /** Viewport ID */
  viewportId: string;
  /** Viewport type */
  type?: 'stack' | 'volume' | 'orthographic';
  /** Tool group ID */
  toolGroupId?: string;
  /** Whether to configure mammography tools */
  useMammoTools?: boolean;
}

export interface UseViewportReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Whether the viewport is ready */
  isReady: boolean;
  /** Current window/level values */
  windowLevel: { window: number; level: number } | null;
  /** Apply a window/level preset */
  applyPreset: (preset: WLPreset) => Promise<void>;
  /** Set active tool */
  setActiveTool: (toolName: string, mouseButton?: number) => Promise<void>;
  /** Current active tool */
  activeTool: string | null;
  /** Error if any */
  error: Error | null;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Main hook for Cornerstone3D initialization
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isReady, initState } = useCornerstone({ autoInit: true });
 *
 *   if (!isReady) {
 *     return <div>Loading medical imaging engine...</div>;
 *   }
 *
 *   return <MammogramViewer />;
 * }
 * ```
 */
export function useCornerstone(options: UseCornerstoneOptions = {}): UseCornerstoneReturn {
  const { autoInit = true, initOptions = {} } = options;

  const [initState, setInitState] = useState<CornerstoneInitState>(getInitState());
  const initAttempted = useRef(false);

  const initialize = useCallback(async () => {
    if (initState.isInitialized || initState.isInitializing) {
      return;
    }

    const newState = await initCornerstone3D(initOptions);
    setInitState(newState);
  }, [initOptions, initState.isInitialized, initState.isInitializing]);

  const cleanupFn = useCallback(async () => {
    await cleanup();
    setInitState(getInitState());
  }, []);

  useEffect(() => {
    if (autoInit && !initAttempted.current) {
      initAttempted.current = true;
      initialize();
    }
  }, [autoInit, initialize]);

  return {
    initState,
    isReady: initState.isInitialized,
    initialize,
    cleanup: cleanupFn,
  };
}

/**
 * Hook for managing a single viewport
 *
 * @example
 * ```tsx
 * function MammogramView({ imageIds }: { imageIds: string[] }) {
 *   const { containerRef, isReady, applyPreset } = useViewport({
 *     engineId: 'mammo-engine',
 *     viewportId: 'viewport-RCC',
 *     useMammoTools: true,
 *   });
 *
 *   return (
 *     <div>
 *       <div ref={containerRef} style={{ width: 512, height: 512 }} />
 *       <button onClick={() => applyPreset(MAMMO_WL_PRESETS[1])}>
 *         Dense Breast
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useViewport(options: UseViewportOptions): UseViewportReturn {
  const {
    engineId,
    viewportId,
    type = 'stack',
    toolGroupId = `${engineId}-tools`,
    useMammoTools = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [windowLevel, setWindowLevel] = useState<{ window: number; level: number } | null>(null);
  const [activeTool, setActiveToolState] = useState<string | null>(TOOL_IDS.PAN);
  const [error, setError] = useState<Error | null>(null);

  const engineCreated = useRef(false);
  const viewportCreated = useRef(false);

  // Initialize viewport when container is available
  useEffect(() => {
    const initViewport = async () => {
      const currentState = getInitState();
      if (!currentState.isInitialized) {
        return;
      }

      const element = containerRef.current;
      if (!element) {
        return;
      }

      try {
        // Create rendering engine if needed
        if (!engineCreated.current) {
          await createRenderingEngine({ id: engineId, type: 'webgl' });
          engineCreated.current = true;
        }

        // Create viewport
        if (!viewportCreated.current) {
          const viewportConfig: ViewportConfig = {
            viewportId,
            type,
            element,
            defaultOptions: {
              background: [0, 0, 0],
            },
          };

          await createViewports(engineId, [viewportConfig]);

          // Create tool group and configure tools
          await createToolGroup(toolGroupId, [viewportId]);
          if (useMammoTools) {
            await configureMammoTools(toolGroupId);
          }

          viewportCreated.current = true;
        }

        setIsReady(true);
        setError(null);

        // Get initial window/level
        const wl = await getViewportWL(viewportId);
        setWindowLevel(wl);

      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error('[useViewport] Failed to initialize:', err);
      }
    };

    initViewport();
  }, [engineId, viewportId, type, toolGroupId, useMammoTools]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineCreated.current) {
        destroyRenderingEngine(engineId).catch(console.error);
        engineCreated.current = false;
        viewportCreated.current = false;
      }
    };
  }, [engineId]);

  // Apply preset callback
  const applyPreset = useCallback(async (preset: WLPreset) => {
    if (!isReady) return;
    try {
      await applyWLPreset(viewportId, preset);
      setWindowLevel({ window: preset.window, level: preset.level });
    } catch (err) {
      console.error('[useViewport] Failed to apply preset:', err);
    }
  }, [isReady, viewportId]);

  // Set active tool callback
  const setActiveTool = useCallback(async (toolName: string, mouseButton: number = 1) => {
    if (!isReady) return;
    try {
      const { ToolGroupManager } = await import('@cornerstonejs/tools');
      const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (toolGroup) {
        toolGroup.setToolActive(toolName, {
          bindings: [{ mouseButton }],
        });
        setActiveToolState(toolName);
      }
    } catch (err) {
      console.error('[useViewport] Failed to set active tool:', err);
    }
  }, [isReady, toolGroupId]);

  return {
    containerRef,
    isReady,
    windowLevel,
    applyPreset,
    setActiveTool,
    activeTool,
    error,
  };
}

/**
 * Hook for managing multiple linked viewports (e.g., 4-view mammography)
 */
export interface UseMultiViewportOptions {
  /** Rendering engine ID */
  engineId: string;
  /** Viewport configurations */
  viewports: Array<{
    id: string;
    label: string;
    ref: React.RefObject<HTMLDivElement>;
  }>;
  /** Whether viewports should be linked for synchronized viewing */
  linked?: boolean;
  /** Tool group ID */
  toolGroupId?: string;
}

export interface UseMultiViewportReturn {
  /** Whether all viewports are ready */
  isReady: boolean;
  /** Apply window/level preset to all viewports */
  applyPresetToAll: (preset: WLPreset) => Promise<void>;
  /** Reset all viewports to default state */
  resetAll: () => Promise<void>;
  /** Set active tool for all viewports */
  setActiveTool: (toolName: string) => Promise<void>;
  /** Current active tool */
  activeTool: string | null;
  /** Error if any */
  error: Error | null;
}

export function useMultiViewport(options: UseMultiViewportOptions): UseMultiViewportReturn {
  const {
    engineId,
    viewports,
    linked = true,
    toolGroupId = `${engineId}-tools`,
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [activeTool, setActiveToolState] = useState<string | null>(TOOL_IDS.PAN);
  const [error, setError] = useState<Error | null>(null);

  const engineCreated = useRef(false);
  const viewportsCreated = useRef(false);

  // Initialize all viewports
  useEffect(() => {
    const initViewports = async () => {
      const currentState = getInitState();
      if (!currentState.isInitialized) {
        return;
      }

      // Check all refs are available
      const allRefsReady = viewports.every(vp => vp.ref.current !== null);
      if (!allRefsReady) {
        return;
      }

      try {
        // Create rendering engine if needed
        if (!engineCreated.current) {
          await createRenderingEngine({ id: engineId, type: 'webgl' });
          engineCreated.current = true;
        }

        // Create all viewports
        if (!viewportsCreated.current) {
          const viewportConfigs: ViewportConfig[] = viewports.map(vp => ({
            viewportId: vp.id,
            type: 'stack',
            element: vp.ref.current!,
            defaultOptions: {
              background: [0, 0, 0],
            },
          }));

          await createViewports(engineId, viewportConfigs);

          // Create shared tool group
          await createToolGroup(
            toolGroupId,
            viewports.map(vp => vp.id)
          );
          await configureMammoTools(toolGroupId);

          viewportsCreated.current = true;
        }

        setIsReady(true);
        setError(null);

      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error('[useMultiViewport] Failed to initialize:', err);
      }
    };

    initViewports();
  }, [engineId, viewports, toolGroupId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineCreated.current) {
        destroyRenderingEngine(engineId).catch(console.error);
        engineCreated.current = false;
        viewportsCreated.current = false;
      }
    };
  }, [engineId]);

  const applyPresetToAll = useCallback(async (preset: WLPreset) => {
    if (!isReady) return;
    try {
      await Promise.all(
        viewports.map(vp => applyWLPreset(vp.id, preset))
      );
    } catch (err) {
      console.error('[useMultiViewport] Failed to apply preset:', err);
    }
  }, [isReady, viewports]);

  const resetAll = useCallback(async () => {
    if (!isReady) return;
    await applyPresetToAll(MAMMO_WL_PRESETS[0]); // Default preset
  }, [isReady, applyPresetToAll]);

  const setActiveTool = useCallback(async (toolName: string) => {
    if (!isReady) return;
    try {
      const { ToolGroupManager } = await import('@cornerstonejs/tools');
      const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (toolGroup) {
        toolGroup.setToolActive(toolName, {
          bindings: [{ mouseButton: 1 }],
        });
        setActiveToolState(toolName);
      }
    } catch (err) {
      console.error('[useMultiViewport] Failed to set active tool:', err);
    }
  }, [isReady, toolGroupId]);

  return {
    isReady,
    applyPresetToAll,
    resetAll,
    setActiveTool,
    activeTool,
    error,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MAMMO_WL_PRESETS, TOOL_IDS };
