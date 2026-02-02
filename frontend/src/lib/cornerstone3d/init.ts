/**
 * Cornerstone3D Initialization Module
 *
 * Provides initialization and configuration for Cornerstone3D medical imaging library.
 * This module handles:
 * - Core library initialization
 * - Rendering engine setup
 * - Volume and image loaders
 * - Tool registration and configuration
 * - Mammography-specific presets
 *
 * @module cornerstone3d/init
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Initialization state tracking
 */
export interface CornerstoneInitState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  version: string | null;
}

/**
 * Initialization options
 */
export interface CornerstoneInitOptions {
  /** Enable GPU acceleration if available */
  enableGPU: boolean;
  /** Preferred GPU tier (1=low, 2=medium, 3=high) */
  gpuTier: 1 | 2 | 3;
  /** Maximum texture size for GPU rendering */
  maxTextureSize?: number;
  /** Enable strict mode for debugging */
  strictMode: boolean;
  /** Custom web worker path */
  webWorkerPath?: string;
  /** Enable DICOM metadata caching */
  enableMetadataCache: boolean;
  /** Maximum cache size in bytes (default: 1GB) */
  maxCacheSize: number;
}

/**
 * Rendering engine configuration
 */
export interface RenderingEngineConfig {
  id: string;
  type: 'webgl' | 'webgpu';
  canvas?: HTMLCanvasElement;
}

/**
 * Viewport configuration
 */
export interface ViewportConfig {
  viewportId: string;
  type: 'stack' | 'volume' | 'orthographic';
  element: HTMLDivElement;
  defaultOptions?: ViewportDefaultOptions;
}

/**
 * Default viewport options
 */
export interface ViewportDefaultOptions {
  background?: [number, number, number];
  orientation?: 'axial' | 'sagittal' | 'coronal';
  displayArea?: {
    imageArea: [number, number, number, number];
  };
}

/**
 * Window/Level preset for mammography
 */
export interface WLPreset {
  name: string;
  window: number;
  level: number;
  description?: string;
}

/**
 * Tool configuration
 */
export interface ToolConfig {
  toolName: string;
  toolClass: unknown;
  configuration?: Record<string, unknown>;
}

/**
 * Mammography hanging protocol
 */
export interface HangingProtocol {
  id: string;
  name: string;
  description: string;
  viewportStructure: ViewportStructure;
  displaySets: DisplaySetRule[];
}

interface ViewportStructure {
  layoutType: 'grid';
  rows: number;
  columns: number;
}

interface DisplaySetRule {
  viewportIndex: number;
  seriesMatchingRules: SeriesMatchingRule[];
}

interface SeriesMatchingRule {
  attribute: string;
  constraint: {
    equals?: string;
    contains?: string;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default initialization options
 */
export const DEFAULT_INIT_OPTIONS: CornerstoneInitOptions = {
  enableGPU: true,
  gpuTier: 2,
  strictMode: false,
  enableMetadataCache: true,
  maxCacheSize: 1024 * 1024 * 1024, // 1GB
};

/**
 * Mammography-specific window/level presets
 */
export const MAMMO_WL_PRESETS: WLPreset[] = [
  {
    name: 'Default',
    window: 4096,
    level: 2048,
    description: 'Standard mammography viewing',
  },
  {
    name: 'Dense Breast',
    window: 3000,
    level: 1500,
    description: 'Optimized for dense breast tissue',
  },
  {
    name: 'Fatty Breast',
    window: 2500,
    level: 1250,
    description: 'Optimized for fatty breast tissue',
  },
  {
    name: 'Implant',
    window: 5000,
    level: 2500,
    description: 'For viewing with implants',
  },
  {
    name: 'Calcification',
    window: 1500,
    level: 750,
    description: 'Enhanced calcification visibility',
  },
  {
    name: 'Skin Line',
    window: 800,
    level: 400,
    description: 'Skin line visualization',
  },
];

/**
 * Standard mammography viewport layout
 */
export const MAMMO_VIEWPORT_LAYOUTS = {
  /** 2x2 grid: RCC, LCC, RMLO, LMLO */
  STANDARD_4VIEW: {
    rows: 2,
    columns: 2,
    viewports: ['RCC', 'LCC', 'RMLO', 'LMLO'],
  },
  /** 1x2 grid: CC views only */
  CC_ONLY: {
    rows: 1,
    columns: 2,
    viewports: ['RCC', 'LCC'],
  },
  /** 1x2 grid: MLO views only */
  MLO_ONLY: {
    rows: 1,
    columns: 2,
    viewports: ['RMLO', 'LMLO'],
  },
  /** Temporal comparison: current vs prior */
  TEMPORAL: {
    rows: 2,
    columns: 2,
    viewports: ['CURRENT_R', 'PRIOR_R', 'CURRENT_L', 'PRIOR_L'],
  },
} as const;

/**
 * Tool identifiers
 */
export const TOOL_IDS = {
  // Navigation
  PAN: 'Pan',
  ZOOM: 'Zoom',
  STACK_SCROLL: 'StackScroll',

  // Window/Level
  WINDOW_LEVEL: 'WindowLevel',

  // Measurement
  LENGTH: 'Length',
  BIDIRECTIONAL: 'Bidirectional',
  ELLIPTICAL_ROI: 'EllipticalROI',
  RECTANGLE_ROI: 'RectangleROI',
  ANGLE: 'Angle',
  COBB_ANGLE: 'CobbAngle',
  ARROW_ANNOTATE: 'ArrowAnnotate',

  // Segmentation
  BRUSH: 'Brush',
  CIRCLE_SCISSORS: 'CircleScissors',
  SPHERE_SCISSORS: 'SphereScissors',
  RECTANGLE_SCISSORS: 'RectangleScissors',

  // Navigation
  CROSSHAIRS: 'Crosshairs',
  MAGNIFY: 'Magnify',
} as const;

/**
 * Mouse button mappings
 */
export const MOUSE_BINDINGS = {
  PRIMARY: 1,    // Left mouse button
  SECONDARY: 2,  // Right mouse button
  AUXILIARY: 4,  // Middle mouse button
} as const;

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Global initialization state
 */
let initState: CornerstoneInitState = {
  isInitialized: false,
  isInitializing: false,
  error: null,
  version: null,
};

/**
 * Active rendering engines
 */
const renderingEngines: Map<string, unknown> = new Map();

/**
 * Registered tools
 */
const registeredTools: Set<string> = new Set();

// =============================================================================
// INITIALIZATION FUNCTIONS
// =============================================================================

/**
 * Initialize Cornerstone3D and related libraries
 *
 * This function must be called before using any Cornerstone3D functionality.
 * It handles lazy loading of the library modules and configures them.
 *
 * @param options - Initialization options
 * @returns Promise resolving to initialization state
 *
 * @example
 * ```typescript
 * const state = await initCornerstone3D({
 *   enableGPU: true,
 *   gpuTier: 2,
 *   strictMode: false,
 * });
 * if (state.isInitialized) {
 *   console.log('Cornerstone3D ready, version:', state.version);
 * }
 * ```
 */
export async function initCornerstone3D(
  options: Partial<CornerstoneInitOptions> = {}
): Promise<CornerstoneInitState> {
  // Return current state if already initialized
  if (initState.isInitialized) {
    return initState;
  }

  // Prevent concurrent initialization
  if (initState.isInitializing) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!initState.isInitializing) {
          clearInterval(checkInterval);
          resolve(initState);
        }
      }, 100);
    });
  }

  initState.isInitializing = true;
  const mergedOptions = { ...DEFAULT_INIT_OPTIONS, ...options };

  try {
    // Dynamic imports for code splitting
    const [
      cornerstone3DCore,
      cornerstone3DTools,
      dicomImageLoader,
    ] = await Promise.all([
      import('@cornerstonejs/core'),
      import('@cornerstonejs/tools'),
      import('@cornerstonejs/dicom-image-loader'),
    ]);

    // Initialize the core library
    await cornerstone3DCore.init();

    // Configure GPU settings
    if (mergedOptions.enableGPU) {
      cornerstone3DCore.setUseCPURendering(false);
    } else {
      cornerstone3DCore.setUseCPURendering(true);
    }

    // Initialize DICOM image loader
    dicomImageLoader.external.cornerstone = cornerstone3DCore;
    await dicomImageLoader.init();

    // Configure cache
    cornerstone3DCore.cache.setMaxCacheSize(mergedOptions.maxCacheSize);

    // Initialize tools
    cornerstone3DTools.init();

    // Register default tools
    await registerDefaultTools(cornerstone3DTools);

    // Set version info
    initState.version = cornerstone3DCore.version || 'unknown';
    initState.isInitialized = true;
    initState.error = null;

    console.log(`[Cornerstone3D] Initialized successfully (v${initState.version})`);

  } catch (error) {
    initState.error = error instanceof Error ? error : new Error(String(error));
    console.error('[Cornerstone3D] Initialization failed:', error);
  } finally {
    initState.isInitializing = false;
  }

  return initState;
}

/**
 * Register default tools for mammography viewing
 */
async function registerDefaultTools(toolsModule: typeof import('@cornerstonejs/tools')): Promise<void> {
  const {
    addTool,
    PanTool,
    ZoomTool,
    WindowLevelTool,
    LengthTool,
    BidirectionalTool,
    EllipticalROITool,
    RectangleROITool,
    AngleTool,
    ArrowAnnotateTool,
    MagnifyTool,
    StackScrollTool,
  } = toolsModule;

  const toolsToRegister = [
    { tool: PanTool, name: TOOL_IDS.PAN },
    { tool: ZoomTool, name: TOOL_IDS.ZOOM },
    { tool: WindowLevelTool, name: TOOL_IDS.WINDOW_LEVEL },
    { tool: LengthTool, name: TOOL_IDS.LENGTH },
    { tool: BidirectionalTool, name: TOOL_IDS.BIDIRECTIONAL },
    { tool: EllipticalROITool, name: TOOL_IDS.ELLIPTICAL_ROI },
    { tool: RectangleROITool, name: TOOL_IDS.RECTANGLE_ROI },
    { tool: AngleTool, name: TOOL_IDS.ANGLE },
    { tool: ArrowAnnotateTool, name: TOOL_IDS.ARROW_ANNOTATE },
    { tool: MagnifyTool, name: TOOL_IDS.MAGNIFY },
    { tool: StackScrollTool, name: TOOL_IDS.STACK_SCROLL },
  ];

  for (const { tool, name } of toolsToRegister) {
    if (!registeredTools.has(name)) {
      addTool(tool);
      registeredTools.add(name);
    }
  }
}

/**
 * Get current initialization state
 */
export function getInitState(): CornerstoneInitState {
  return { ...initState };
}

/**
 * Check if Cornerstone3D is initialized
 */
export function isInitialized(): boolean {
  return initState.isInitialized;
}

// =============================================================================
// RENDERING ENGINE MANAGEMENT
// =============================================================================

/**
 * Create a new rendering engine
 *
 * @param config - Rendering engine configuration
 * @returns The created rendering engine instance
 */
export async function createRenderingEngine(
  config: RenderingEngineConfig
): Promise<unknown> {
  if (!initState.isInitialized) {
    throw new Error('Cornerstone3D must be initialized before creating a rendering engine');
  }

  const { RenderingEngine } = await import('@cornerstonejs/core');

  const engine = new RenderingEngine(config.id);
  renderingEngines.set(config.id, engine);

  return engine;
}

/**
 * Get an existing rendering engine by ID
 */
export function getRenderingEngine(id: string): unknown | undefined {
  return renderingEngines.get(id);
}

/**
 * Destroy a rendering engine and clean up resources
 */
export async function destroyRenderingEngine(id: string): Promise<void> {
  const engine = renderingEngines.get(id);
  if (engine && typeof (engine as { destroy?: () => void }).destroy === 'function') {
    (engine as { destroy: () => void }).destroy();
  }
  renderingEngines.delete(id);
}

/**
 * Destroy all rendering engines
 */
export async function destroyAllRenderingEngines(): Promise<void> {
  for (const id of renderingEngines.keys()) {
    await destroyRenderingEngine(id);
  }
}

// =============================================================================
// VIEWPORT MANAGEMENT
// =============================================================================

/**
 * Create viewports on a rendering engine
 *
 * @param engineId - ID of the rendering engine
 * @param configs - Array of viewport configurations
 */
export async function createViewports(
  engineId: string,
  configs: ViewportConfig[]
): Promise<void> {
  const engine = renderingEngines.get(engineId);
  if (!engine) {
    throw new Error(`Rendering engine '${engineId}' not found`);
  }

  const viewportInputs = configs.map(config => ({
    viewportId: config.viewportId,
    type: config.type === 'stack' ? 'stack' : 'orthographic',
    element: config.element,
    defaultOptions: config.defaultOptions,
  }));

  (engine as { setViewports: (inputs: unknown[]) => void }).setViewports(viewportInputs);
}

// =============================================================================
// TOOL GROUP MANAGEMENT
// =============================================================================

/**
 * Create a tool group for a set of viewports
 *
 * @param toolGroupId - Unique identifier for the tool group
 * @param viewportIds - Array of viewport IDs to include
 * @returns The created tool group
 */
export async function createToolGroup(
  toolGroupId: string,
  viewportIds: string[]
): Promise<unknown> {
  if (!initState.isInitialized) {
    throw new Error('Cornerstone3D must be initialized before creating tool groups');
  }

  const { ToolGroupManager } = await import('@cornerstonejs/tools');

  let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
  if (!toolGroup) {
    toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
  }

  // Add viewports to the tool group
  for (const viewportId of viewportIds) {
    toolGroup.addViewport(viewportId);
  }

  return toolGroup;
}

/**
 * Configure tools for mammography viewing
 *
 * @param toolGroupId - ID of the tool group to configure
 */
export async function configureMammoTools(toolGroupId: string): Promise<void> {
  const { ToolGroupManager, Enums } = await import('@cornerstonejs/tools');
  const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

  if (!toolGroup) {
    throw new Error(`Tool group '${toolGroupId}' not found`);
  }

  // Add tools to the group
  const toolsToAdd = [
    TOOL_IDS.PAN,
    TOOL_IDS.ZOOM,
    TOOL_IDS.WINDOW_LEVEL,
    TOOL_IDS.LENGTH,
    TOOL_IDS.ELLIPTICAL_ROI,
    TOOL_IDS.ANGLE,
    TOOL_IDS.ARROW_ANNOTATE,
    TOOL_IDS.MAGNIFY,
  ];

  for (const toolName of toolsToAdd) {
    if (registeredTools.has(toolName)) {
      toolGroup.addTool(toolName);
    }
  }

  // Set default tool bindings for mammography workflow
  // Left mouse: Pan (default navigation)
  toolGroup.setToolActive(TOOL_IDS.PAN, {
    bindings: [{ mouseButton: MOUSE_BINDINGS.PRIMARY }],
  });

  // Right mouse: Window/Level
  toolGroup.setToolActive(TOOL_IDS.WINDOW_LEVEL, {
    bindings: [{ mouseButton: MOUSE_BINDINGS.SECONDARY }],
  });

  // Middle mouse: Zoom
  toolGroup.setToolActive(TOOL_IDS.ZOOM, {
    bindings: [{ mouseButton: MOUSE_BINDINGS.AUXILIARY }],
  });

  // Enable other tools as passive (can be activated later)
  toolGroup.setToolPassive(TOOL_IDS.LENGTH);
  toolGroup.setToolPassive(TOOL_IDS.ELLIPTICAL_ROI);
  toolGroup.setToolPassive(TOOL_IDS.ANGLE);
  toolGroup.setToolPassive(TOOL_IDS.ARROW_ANNOTATE);
  toolGroup.setToolPassive(TOOL_IDS.MAGNIFY);
}

// =============================================================================
// IMAGE LOADING
// =============================================================================

/**
 * Load a DICOM image by URL
 *
 * @param imageUrl - URL to the DICOM image (wadouri: or wadors: prefixed)
 * @returns Promise resolving to the loaded image
 */
export async function loadDicomImage(imageUrl: string): Promise<unknown> {
  if (!initState.isInitialized) {
    throw new Error('Cornerstone3D must be initialized before loading images');
  }

  const { imageLoader } = await import('@cornerstonejs/core');
  return imageLoader.loadImage(imageUrl);
}

/**
 * Create image IDs from a DICOM series
 *
 * @param studyInstanceUid - Study Instance UID
 * @param seriesInstanceUid - Series Instance UID
 * @param instanceUids - Array of SOP Instance UIDs
 * @param wadoRsRoot - WADO-RS server root URL
 * @returns Array of image IDs
 */
export function createImageIds(
  studyInstanceUid: string,
  seriesInstanceUid: string,
  instanceUids: string[],
  wadoRsRoot: string
): string[] {
  return instanceUids.map(instanceUid =>
    `wadors:${wadoRsRoot}/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${instanceUid}/frames/1`
  );
}

/**
 * Create image ID for local DICOM file
 *
 * @param filePath - Path to the local DICOM file
 * @returns Image ID string
 */
export function createLocalImageId(filePath: string): string {
  return `dicomfile:${filePath}`;
}

// =============================================================================
// WINDOW/LEVEL UTILITIES
// =============================================================================

/**
 * Apply a window/level preset to a viewport
 *
 * @param viewportId - ID of the viewport
 * @param preset - Window/level preset to apply
 */
export async function applyWLPreset(
  viewportId: string,
  preset: WLPreset
): Promise<void> {
  // Find the viewport across all rendering engines
  for (const engine of renderingEngines.values()) {
    const viewport = (engine as { getViewport: (id: string) => unknown }).getViewport(viewportId);
    if (viewport) {
      const voiRange = {
        lower: preset.level - preset.window / 2,
        upper: preset.level + preset.window / 2,
      };
      (viewport as { setProperties: (props: unknown) => void }).setProperties({ voiRange });
      (viewport as { render: () => void }).render();
      return;
    }
  }
  throw new Error(`Viewport '${viewportId}' not found`);
}

/**
 * Get the current window/level from a viewport
 *
 * @param viewportId - ID of the viewport
 * @returns Current window/level values
 */
export async function getViewportWL(viewportId: string): Promise<{ window: number; level: number }> {
  for (const engine of renderingEngines.values()) {
    const viewport = (engine as { getViewport: (id: string) => unknown }).getViewport(viewportId);
    if (viewport) {
      const properties = (viewport as { getProperties: () => { voiRange?: { lower: number; upper: number } } }).getProperties();
      const voiRange = properties.voiRange || { lower: 0, upper: 4096 };
      return {
        window: voiRange.upper - voiRange.lower,
        level: (voiRange.upper + voiRange.lower) / 2,
      };
    }
  }
  throw new Error(`Viewport '${viewportId}' not found`);
}

// =============================================================================
// MAMMOGRAPHY HANGING PROTOCOLS
// =============================================================================

/**
 * Standard mammography 4-view hanging protocol
 */
export const MAMMO_4VIEW_PROTOCOL: HangingProtocol = {
  id: 'mammo-4view',
  name: 'Standard 4-View Mammography',
  description: 'RCC, LCC, RMLO, LMLO layout for screening mammography',
  viewportStructure: {
    layoutType: 'grid',
    rows: 2,
    columns: 2,
  },
  displaySets: [
    {
      viewportIndex: 0,
      seriesMatchingRules: [
        { attribute: 'ImageLaterality', constraint: { equals: 'R' } },
        { attribute: 'ViewPosition', constraint: { equals: 'CC' } },
      ],
    },
    {
      viewportIndex: 1,
      seriesMatchingRules: [
        { attribute: 'ImageLaterality', constraint: { equals: 'L' } },
        { attribute: 'ViewPosition', constraint: { equals: 'CC' } },
      ],
    },
    {
      viewportIndex: 2,
      seriesMatchingRules: [
        { attribute: 'ImageLaterality', constraint: { equals: 'R' } },
        { attribute: 'ViewPosition', constraint: { equals: 'MLO' } },
      ],
    },
    {
      viewportIndex: 3,
      seriesMatchingRules: [
        { attribute: 'ImageLaterality', constraint: { equals: 'L' } },
        { attribute: 'ViewPosition', constraint: { equals: 'MLO' } },
      ],
    },
  ],
};

/**
 * Apply a hanging protocol to viewports
 *
 * @param protocol - Hanging protocol to apply
 * @param engineId - Rendering engine ID
 */
export async function applyHangingProtocol(
  protocol: HangingProtocol,
  engineId: string
): Promise<void> {
  // This would integrate with Cornerstone3D's hanging protocol manager
  // For now, this is a placeholder for the full implementation
  console.log(`[Cornerstone3D] Applying hanging protocol: ${protocol.name}`);
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up all Cornerstone3D resources
 *
 * Call this when unmounting the application or switching contexts
 */
export async function cleanup(): Promise<void> {
  await destroyAllRenderingEngines();

  // Clear cache
  const { cache } = await import('@cornerstonejs/core');
  cache.purgeCache();

  // Reset state
  initState = {
    isInitialized: false,
    isInitializing: false,
    error: null,
    version: null,
  };

  registeredTools.clear();

  console.log('[Cornerstone3D] Cleanup complete');
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  init: initCornerstone3D,
  getInitState,
  isInitialized,
  createRenderingEngine,
  getRenderingEngine,
  destroyRenderingEngine,
  createViewports,
  createToolGroup,
  configureMammoTools,
  loadDicomImage,
  createImageIds,
  createLocalImageId,
  applyWLPreset,
  getViewportWL,
  applyHangingProtocol,
  cleanup,
  // Constants
  MAMMO_WL_PRESETS,
  MAMMO_VIEWPORT_LAYOUTS,
  TOOL_IDS,
  MOUSE_BINDINGS,
  MAMMO_4VIEW_PROTOCOL,
  DEFAULT_INIT_OPTIONS,
};
