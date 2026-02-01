/**
 * anatomicalRegions.ts
 *
 * Anatomical region definitions for mammography viewport attention tracking.
 * Based on standard breast quadrant divisions used in radiology practice.
 *
 * Reference: Wolfe, J. M. (2020). "Visual Search" in Attention (2nd ed.)
 * The viewport attention proxy approximates gaze behavior by tracking which
 * anatomical regions are visible during zoom/pan operations.
 *
 * Region Layout (for each breast):
 * ┌─────────────┬─────────────┐
 * │     UOQ     │     UIQ     │
 * │  (Upper     │   (Upper    │
 * │   Outer)    │    Inner)   │
 * ├─────────────┼─────────────┤
 * │     LOQ     │     LIQ     │
 * │  (Lower     │   (Lower    │
 * │   Outer)    │    Inner)   │
 * └─────────────┴─────────────┘
 *        ┌─────┐
 *        │NIPPLE│ (Retroareolar)
 *        └─────┘
 *    ┌───────┐
 *    │AXILLA │ (Axillary tail)
 *    └───────┘
 */

// ============================================================================
// ANATOMICAL REGION TYPES
// ============================================================================

/**
 * Standard anatomical regions for mammography.
 * Follows ACR BI-RADS Atlas breast location nomenclature.
 *
 * Naming convention:
 * - U = Upper, L = Lower
 * - O = Outer, I = Inner
 * - Q = Quadrant
 * - _R = Right breast, _L = Left breast
 */
export type AnatomicalRegion =
  // Right breast quadrants
  | 'UOQ_R'    // Upper Outer Quadrant - Right
  | 'UIQ_R'    // Upper Inner Quadrant - Right
  | 'LOQ_R'    // Lower Outer Quadrant - Right
  | 'LIQ_R'    // Lower Inner Quadrant - Right
  | 'AXILLA_R' // Axillary tail - Right
  | 'NIPPLE_R' // Retroareolar region - Right
  | 'RETRO_R'  // Retroareolar (alternate) - Right
  // Left breast quadrants
  | 'UOQ_L'    // Upper Outer Quadrant - Left
  | 'UIQ_L'    // Upper Inner Quadrant - Left
  | 'LOQ_L'    // Lower Outer Quadrant - Left
  | 'LIQ_L'    // Lower Inner Quadrant - Left
  | 'AXILLA_L' // Axillary tail - Left
  | 'NIPPLE_L' // Retroareolar region - Left
  | 'RETRO_L'; // Retroareolar (alternate) - Left

/**
 * Region bounds as percentages of image dimensions.
 * Stored as percentages for resolution independence.
 */
export interface RegionBounds {
  /** Percentage from left edge (0-100) */
  left: number;
  /** Percentage from top edge (0-100) */
  top: number;
  /** Width as percentage of image width (0-100) */
  width: number;
  /** Height as percentage of image height (0-100) */
  height: number;
}

/**
 * Complete region definition with metadata.
 */
export interface AnatomicalRegionDefinition {
  id: AnatomicalRegion;
  name: string;
  description: string;
  laterality: 'R' | 'L';
  /** Which mammogram views this region appears in */
  applicableViews: Array<'CC' | 'MLO'>;
  /** Region bounds (percentages, 0-100) */
  bounds: RegionBounds;
  /** Clinical significance weighting (higher = more critical to examine) */
  clinicalWeight: number;
  /** Whether this region is prone to missed findings per literature */
  isHighRiskArea: boolean;
}

// ============================================================================
// REGION DEFINITIONS
// ============================================================================

/**
 * Standard region definitions for CC (Craniocaudal) view.
 * CC view shows superior-inferior projection with lateral orientation.
 *
 * Note: In CC view, the outer quadrants are on the lateral side,
 * inner quadrants are medial. For right breast, outer = left side of image.
 */
const CC_REGION_TEMPLATE: Record<string, Omit<AnatomicalRegionDefinition, 'id' | 'laterality'>> = {
  UOQ: {
    name: 'Upper Outer Quadrant',
    description: 'Most common site of breast cancer (50% of cases)',
    applicableViews: ['CC'],
    bounds: { left: 0, top: 10, width: 50, height: 40 },
    clinicalWeight: 1.5,
    isHighRiskArea: true,
  },
  UIQ: {
    name: 'Upper Inner Quadrant',
    description: 'Upper medial breast tissue',
    applicableViews: ['CC'],
    bounds: { left: 50, top: 10, width: 50, height: 40 },
    clinicalWeight: 1.0,
    isHighRiskArea: false,
  },
  LOQ: {
    name: 'Lower Outer Quadrant',
    description: 'Lower lateral breast tissue',
    applicableViews: ['CC'],
    bounds: { left: 0, top: 50, width: 50, height: 35 },
    clinicalWeight: 1.0,
    isHighRiskArea: false,
  },
  LIQ: {
    name: 'Lower Inner Quadrant',
    description: 'Lower medial breast tissue',
    applicableViews: ['CC'],
    bounds: { left: 50, top: 50, width: 50, height: 35 },
    clinicalWeight: 1.0,
    isHighRiskArea: false,
  },
  NIPPLE: {
    name: 'Retroareolar Region',
    description: 'Nipple and immediately surrounding tissue',
    applicableViews: ['CC', 'MLO'],
    bounds: { left: 35, top: 80, width: 30, height: 15 },
    clinicalWeight: 1.2,
    isHighRiskArea: true,
  },
};

/**
 * Standard region definitions for MLO (Mediolateral Oblique) view.
 * MLO view shows oblique projection including axillary tail.
 */
const MLO_REGION_TEMPLATE: Record<string, Omit<AnatomicalRegionDefinition, 'id' | 'laterality'>> = {
  UOQ: {
    name: 'Upper Outer Quadrant',
    description: 'Most common site of breast cancer (50% of cases)',
    applicableViews: ['MLO'],
    bounds: { left: 10, top: 25, width: 45, height: 30 },
    clinicalWeight: 1.5,
    isHighRiskArea: true,
  },
  UIQ: {
    name: 'Upper Inner Quadrant',
    description: 'Upper medial breast tissue',
    applicableViews: ['MLO'],
    bounds: { left: 55, top: 25, width: 35, height: 30 },
    clinicalWeight: 1.0,
    isHighRiskArea: false,
  },
  LOQ: {
    name: 'Lower Outer Quadrant',
    description: 'Lower lateral breast tissue',
    applicableViews: ['MLO'],
    bounds: { left: 10, top: 55, width: 45, height: 25 },
    clinicalWeight: 1.0,
    isHighRiskArea: false,
  },
  LIQ: {
    name: 'Lower Inner Quadrant',
    description: 'Lower medial breast tissue',
    applicableViews: ['MLO'],
    bounds: { left: 55, top: 55, width: 35, height: 25 },
    clinicalWeight: 1.0,
    isHighRiskArea: false,
  },
  AXILLA: {
    name: 'Axillary Tail',
    description: 'Extension of breast tissue toward axilla (armpit)',
    applicableViews: ['MLO'],
    bounds: { left: 0, top: 0, width: 40, height: 25 },
    clinicalWeight: 1.3,
    isHighRiskArea: true,
  },
  NIPPLE: {
    name: 'Retroareolar Region',
    description: 'Nipple and immediately surrounding tissue',
    applicableViews: ['CC', 'MLO'],
    bounds: { left: 30, top: 75, width: 40, height: 20 },
    clinicalWeight: 1.2,
    isHighRiskArea: true,
  },
};

/**
 * Generate complete region definitions for a given laterality.
 */
function generateRegionsForLaterality(
  laterality: 'R' | 'L',
  viewType: 'CC' | 'MLO'
): AnatomicalRegionDefinition[] {
  const template = viewType === 'CC' ? CC_REGION_TEMPLATE : MLO_REGION_TEMPLATE;
  const suffix = `_${laterality}` as '_R' | '_L';

  return Object.entries(template).map(([key, def]) => ({
    ...def,
    id: `${key}${suffix}` as AnatomicalRegion,
    laterality,
  }));
}

/**
 * All anatomical region definitions, indexed by view.
 */
export const REGION_DEFINITIONS: Record<'RCC' | 'LCC' | 'RMLO' | 'LMLO', AnatomicalRegionDefinition[]> = {
  RCC: generateRegionsForLaterality('R', 'CC'),
  LCC: generateRegionsForLaterality('L', 'CC'),
  RMLO: generateRegionsForLaterality('R', 'MLO'),
  LMLO: generateRegionsForLaterality('L', 'MLO'),
};

/**
 * Flat list of all regions across all views.
 */
export const ALL_REGIONS: AnatomicalRegion[] = [
  'UOQ_R', 'UIQ_R', 'LOQ_R', 'LIQ_R', 'AXILLA_R', 'NIPPLE_R', 'RETRO_R',
  'UOQ_L', 'UIQ_L', 'LOQ_L', 'LIQ_L', 'AXILLA_L', 'NIPPLE_L', 'RETRO_L',
];

/**
 * Regions that should be given extra scrutiny (per Wolfe research on visual search).
 */
export const HIGH_PRIORITY_REGIONS: AnatomicalRegion[] = [
  'UOQ_R', 'UOQ_L', // Upper outer quadrant - 50% of breast cancers
  'AXILLA_R', 'AXILLA_L', // Axillary tail - often missed
  'NIPPLE_R', 'NIPPLE_L', // Retroareolar - technically challenging
];

// ============================================================================
// REGION UTILITIES
// ============================================================================

/**
 * Get human-readable name for a region.
 */
export function getRegionDisplayName(region: AnatomicalRegion): string {
  const parts = region.split('_');
  const laterality = parts[parts.length - 1];
  const base = parts.slice(0, -1).join('_');

  const names: Record<string, string> = {
    UOQ: 'Upper Outer Quadrant',
    UIQ: 'Upper Inner Quadrant',
    LOQ: 'Lower Outer Quadrant',
    LIQ: 'Lower Inner Quadrant',
    AXILLA: 'Axillary Tail',
    NIPPLE: 'Retroareolar',
    RETRO: 'Retroareolar',
  };

  return `${names[base] || base} (${laterality === 'R' ? 'Right' : 'Left'})`;
}

/**
 * Get short display code for a region (e.g., "UOQ-R").
 */
export function getRegionCode(region: AnatomicalRegion): string {
  return region.replace('_', '-');
}

/**
 * Convert pixel bounds to percentage bounds.
 */
export function pixelToPercentBounds(
  pixelBounds: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): RegionBounds {
  return {
    left: (pixelBounds.x / imageWidth) * 100,
    top: (pixelBounds.y / imageHeight) * 100,
    width: (pixelBounds.width / imageWidth) * 100,
    height: (pixelBounds.height / imageHeight) * 100,
  };
}

/**
 * Convert percentage bounds to pixel bounds.
 */
export function percentToPixelBounds(
  percentBounds: RegionBounds,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: (percentBounds.left / 100) * imageWidth,
    y: (percentBounds.top / 100) * imageHeight,
    width: (percentBounds.width / 100) * imageWidth,
    height: (percentBounds.height / 100) * imageHeight,
  };
}

/**
 * Calculate intersection area between two rectangles (as percentage 0-100).
 * Returns percentage of region that overlaps with viewport.
 */
export function calculateRegionViewportIntersection(
  regionBounds: RegionBounds,
  viewportBounds: { top: number; left: number; width: number; height: number }
): number {
  // Convert viewport bounds to same coordinate system
  const regionRight = regionBounds.left + regionBounds.width;
  const regionBottom = regionBounds.top + regionBounds.height;
  const viewportRight = viewportBounds.left + viewportBounds.width;
  const viewportBottom = viewportBounds.top + viewportBounds.height;

  // Calculate intersection
  const intersectLeft = Math.max(regionBounds.left, viewportBounds.left);
  const intersectTop = Math.max(regionBounds.top, viewportBounds.top);
  const intersectRight = Math.min(regionRight, viewportRight);
  const intersectBottom = Math.min(regionBottom, viewportBottom);

  // Check if there's an intersection
  if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) {
    return 0;
  }

  // Calculate areas
  const intersectionArea = (intersectRight - intersectLeft) * (intersectBottom - intersectTop);
  const regionArea = regionBounds.width * regionBounds.height;

  return regionArea > 0 ? (intersectionArea / regionArea) * 100 : 0;
}

/**
 * Determine which regions are visible in a given viewport.
 * Returns regions with their visibility percentage.
 */
export function getVisibleRegions(
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
  viewportBounds: { top: number; left: number; width: number; height: number },
  minVisibilityThreshold: number = 10 // Minimum % visible to count
): Array<{ region: AnatomicalRegion; visibilityPercent: number }> {
  const regions = REGION_DEFINITIONS[viewKey];
  const visible: Array<{ region: AnatomicalRegion; visibilityPercent: number }> = [];

  for (const regionDef of regions) {
    const visibility = calculateRegionViewportIntersection(regionDef.bounds, viewportBounds);
    if (visibility >= minVisibilityThreshold) {
      visible.push({
        region: regionDef.id,
        visibilityPercent: visibility,
      });
    }
  }

  return visible;
}

/**
 * Calculate viewport bounds from zoom and pan state.
 * Returns bounds as percentages of original image (0-100).
 */
export function calculateViewportBounds(
  zoom: number,
  panX: number,
  panY: number,
  containerWidth: number,
  containerHeight: number
): { top: number; left: number; width: number; height: number } {
  // The visible area at zoom 1.0 is 100% of the image
  // At zoom 2.0, we see 50% width and 50% height
  const visibleWidthPercent = (100 / zoom);
  const visibleHeightPercent = (100 / zoom);

  // Pan is in pixels, convert to percentage offset
  // Pan values are relative to container, not image
  const panXPercent = (panX / containerWidth) * visibleWidthPercent;
  const panYPercent = (panY / containerHeight) * visibleHeightPercent;

  // Center position offset (at no pan, viewport is centered)
  const centerOffsetX = (100 - visibleWidthPercent) / 2;
  const centerOffsetY = (100 - visibleHeightPercent) / 2;

  // Calculate bounds with pan offset
  const left = Math.max(0, Math.min(100 - visibleWidthPercent, centerOffsetX - panXPercent));
  const top = Math.max(0, Math.min(100 - visibleHeightPercent, centerOffsetY - panYPercent));

  return {
    top,
    left,
    width: Math.min(100, visibleWidthPercent),
    height: Math.min(100, visibleHeightPercent),
  };
}

/**
 * Get regions for a specific laterality.
 */
export function getRegionsForLaterality(laterality: 'R' | 'L'): AnatomicalRegion[] {
  return ALL_REGIONS.filter(r => r.endsWith(`_${laterality}`));
}

/**
 * Get the laterality from a view key.
 */
export function getLateralityFromView(viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO'): 'R' | 'L' {
  return viewKey.startsWith('R') ? 'R' : 'L';
}

/**
 * Get the view type from a view key.
 */
export function getViewTypeFromKey(viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO'): 'CC' | 'MLO' {
  return viewKey.includes('CC') ? 'CC' : 'MLO';
}

/**
 * Map a finding location (normalized 0-1 coordinates) to anatomical regions.
 */
export function mapLocationToRegions(
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
  location: { x: number; y: number }
): AnatomicalRegion[] {
  const regions = REGION_DEFINITIONS[viewKey];
  const matchingRegions: AnatomicalRegion[] = [];

  // Convert normalized (0-1) to percentage (0-100)
  const xPercent = location.x * 100;
  const yPercent = location.y * 100;

  for (const regionDef of regions) {
    const bounds = regionDef.bounds;
    if (
      xPercent >= bounds.left &&
      xPercent <= bounds.left + bounds.width &&
      yPercent >= bounds.top &&
      yPercent <= bounds.top + bounds.height
    ) {
      matchingRegions.push(regionDef.id);
    }
  }

  return matchingRegions;
}

/**
 * Get region definition by ID.
 */
export function getRegionDefinition(
  region: AnatomicalRegion,
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO'
): AnatomicalRegionDefinition | undefined {
  return REGION_DEFINITIONS[viewKey].find(r => r.id === region);
}

/**
 * Calculate clinical risk score based on which regions were examined.
 * Higher score = better coverage of high-risk areas.
 */
export function calculateClinicalCoverageScore(
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
  viewedRegions: Set<AnatomicalRegion>
): number {
  const regions = REGION_DEFINITIONS[viewKey];
  let totalWeight = 0;
  let coveredWeight = 0;

  for (const regionDef of regions) {
    totalWeight += regionDef.clinicalWeight;
    if (viewedRegions.has(regionDef.id)) {
      coveredWeight += regionDef.clinicalWeight;
    }
  }

  return totalWeight > 0 ? (coveredWeight / totalWeight) * 100 : 0;
}

export default {
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
};
