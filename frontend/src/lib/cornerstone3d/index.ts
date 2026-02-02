/**
 * Cornerstone3D Module
 *
 * Medical imaging library integration for Evidify radiology research platform.
 * Provides DICOM viewing, annotation tools, and mammography-specific features.
 *
 * @module cornerstone3d
 *
 * @example
 * ```tsx
 * import { useCornerstone, useViewport, MAMMO_WL_PRESETS } from '@/lib/cornerstone3d';
 *
 * function MammogramViewer() {
 *   const { isReady } = useCornerstone();
 *   const { containerRef, applyPreset } = useViewport({
 *     engineId: 'mammo',
 *     viewportId: 'rcc-view',
 *   });
 *
 *   if (!isReady) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <div ref={containerRef} style={{ width: 512, height: 512 }} />
 *       <button onClick={() => applyPreset(MAMMO_WL_PRESETS[1])}>
 *         Dense Breast Preset
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

// Core initialization and utilities
export {
  // Initialization
  initCornerstone3D,
  getInitState,
  isInitialized,
  cleanup,
  DEFAULT_INIT_OPTIONS,

  // Rendering engine management
  createRenderingEngine,
  getRenderingEngine,
  destroyRenderingEngine,
  destroyAllRenderingEngines,

  // Viewport management
  createViewports,

  // Tool management
  createToolGroup,
  configureMammoTools,

  // Image loading
  loadDicomImage,
  createImageIds,
  createLocalImageId,

  // Window/Level
  applyWLPreset,
  getViewportWL,

  // Hanging protocols
  applyHangingProtocol,
  MAMMO_4VIEW_PROTOCOL,

  // Constants
  MAMMO_WL_PRESETS,
  MAMMO_VIEWPORT_LAYOUTS,
  TOOL_IDS,
  MOUSE_BINDINGS,

  // Types
  type CornerstoneInitState,
  type CornerstoneInitOptions,
  type RenderingEngineConfig,
  type ViewportConfig,
  type ViewportDefaultOptions,
  type WLPreset,
  type ToolConfig,
  type HangingProtocol,
} from './init';

// Default export
export { default as cornerstone3d } from './init';

// React hooks
export {
  useCornerstone,
  useViewport,
  useMultiViewport,

  // Hook types
  type UseCornerstoneOptions,
  type UseCornerstoneReturn,
  type UseViewportOptions,
  type UseViewportReturn,
  type UseMultiViewportOptions,
  type UseMultiViewportReturn,
} from './useCornerstone';
