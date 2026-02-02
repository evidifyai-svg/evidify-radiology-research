/**
 * anatomicalRegions.ts
 *
 * Defines anatomical regions for mammography images and provides
 * utilities for region-based attention tracking.
 *
 * Region Layout (CC View - Cranio-Caudal):
 * The breast is divided into quadrants with the nipple as the reference.
 * - UIQ (Upper Inner Quadrant): Medial/inner side, superior
 * - UOQ (Upper Outer Quadrant): Lateral/outer side, superior
 * - LIQ (Lower Inner Quadrant): Medial/inner side, inferior
 * - LOQ (Lower Outer Quadrant): Lateral/outer side, inferior
 *
 * Additional regions:
 * - NIPPLE: Nipple/areolar complex (central)
 * - AXILLA: Axillary tail (lateral extension)
 * - RETRO: Retroareolar region (behind nipple)
 *
 * Coordinates are normalized (0-1) for resolution independence.
 */

import type {
  AnatomicalRegion,
  RegionDefinition,
  AttentionLevel,
  AttentionThresholds,
} from '../types/viewportAttentionTypes';
import { DEFAULT_ATTENTION_THRESHOLDS } from '../types/viewportAttentionTypes';

/**
 * Generate region definitions for a CC (Cranio-Caudal) view.
 * CC view shows the breast from above, looking down.
 *
 * For RIGHT breast (RCC): Outer = left side of image, Inner = right side
 * For LEFT breast (LCC): Outer = right side of image, Inner = left side
 */
function generateCCRegions(
  laterality: 'R' | 'L',
  viewKey: 'RCC' | 'LCC'
): RegionDefinition[] {
  const suffix = `_${laterality}` as '_R' | '_L';

  // For RCC, outer is on the left; for LCC, outer is on the right
  const outerX = laterality === 'R' ? 0 : 0.5;
  const innerX = laterality === 'R' ? 0.5 : 0;

  return [
    // Upper Outer Quadrant
    {
      id: `UOQ${suffix}` as AnatomicalRegion,
      label: 'Upper Outer',
      polygon: [
        { x: outerX, y: 0 },
        { x: outerX + 0.35, y: 0 },
        { x: outerX + 0.35, y: 0.4 },
        { x: outerX, y: 0.4 },
      ],
      center: { x: outerX + 0.175, y: 0.2 },
      viewKey,
    },
    // Upper Inner Quadrant
    {
      id: `UIQ${suffix}` as AnatomicalRegion,
      label: 'Upper Inner',
      polygon: [
        { x: innerX + 0.15, y: 0 },
        { x: innerX + 0.5, y: 0 },
        { x: innerX + 0.5, y: 0.4 },
        { x: innerX + 0.15, y: 0.4 },
      ],
      center: { x: innerX + 0.325, y: 0.2 },
      viewKey,
    },
    // Lower Outer Quadrant
    {
      id: `LOQ${suffix}` as AnatomicalRegion,
      label: 'Lower Outer',
      polygon: [
        { x: outerX, y: 0.4 },
        { x: outerX + 0.35, y: 0.4 },
        { x: outerX + 0.35, y: 0.85 },
        { x: outerX, y: 0.85 },
      ],
      center: { x: outerX + 0.175, y: 0.625 },
      viewKey,
    },
    // Lower Inner Quadrant
    {
      id: `LIQ${suffix}` as AnatomicalRegion,
      label: 'Lower Inner',
      polygon: [
        { x: innerX + 0.15, y: 0.4 },
        { x: innerX + 0.5, y: 0.4 },
        { x: innerX + 0.5, y: 0.85 },
        { x: innerX + 0.15, y: 0.85 },
      ],
      center: { x: innerX + 0.325, y: 0.625 },
      viewKey,
    },
    // Nipple region (central)
    {
      id: `NIPPLE${suffix}` as AnatomicalRegion,
      label: 'Nipple',
      polygon: [
        { x: 0.35, y: 0.35 },
        { x: 0.65, y: 0.35 },
        { x: 0.65, y: 0.55 },
        { x: 0.35, y: 0.55 },
      ],
      center: { x: 0.5, y: 0.45 },
      viewKey,
    },
    // Axillary region
    {
      id: `AXILLA${suffix}` as AnatomicalRegion,
      label: 'Axilla',
      polygon:
        laterality === 'R'
          ? [
              { x: 0, y: 0 },
              { x: 0.15, y: 0 },
              { x: 0.15, y: 0.3 },
              { x: 0, y: 0.3 },
            ]
          : [
              { x: 0.85, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 0.3 },
              { x: 0.85, y: 0.3 },
            ],
      center: laterality === 'R' ? { x: 0.075, y: 0.15 } : { x: 0.925, y: 0.15 },
      viewKey,
    },
    // Retroareolar region
    {
      id: `RETRO${suffix}` as AnatomicalRegion,
      label: 'Retroareolar',
      polygon: [
        { x: 0.3, y: 0.55 },
        { x: 0.7, y: 0.55 },
        { x: 0.7, y: 0.75 },
        { x: 0.3, y: 0.75 },
      ],
      center: { x: 0.5, y: 0.65 },
      viewKey,
    },
  ];
}

/**
 * Generate region definitions for an MLO (Medio-Lateral Oblique) view.
 * MLO view shows the breast from an angled side view.
 *
 * In MLO, "upper" corresponds to superior/towards chest wall,
 * "lower" corresponds to inferior/towards nipple.
 */
function generateMLORegions(
  laterality: 'R' | 'L',
  viewKey: 'RMLO' | 'LMLO'
): RegionDefinition[] {
  const suffix = `_${laterality}` as '_R' | '_L';

  return [
    // Upper Outer Quadrant (superior-lateral)
    {
      id: `UOQ${suffix}` as AnatomicalRegion,
      label: 'Upper Outer',
      polygon: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0.5, y: 0.35 },
        { x: 0, y: 0.35 },
      ],
      center: { x: 0.25, y: 0.175 },
      viewKey,
    },
    // Upper Inner Quadrant (superior-medial)
    {
      id: `UIQ${suffix}` as AnatomicalRegion,
      label: 'Upper Inner',
      polygon: [
        { x: 0.5, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0.35 },
        { x: 0.5, y: 0.35 },
      ],
      center: { x: 0.75, y: 0.175 },
      viewKey,
    },
    // Lower Outer Quadrant (inferior-lateral)
    {
      id: `LOQ${suffix}` as AnatomicalRegion,
      label: 'Lower Outer',
      polygon: [
        { x: 0, y: 0.35 },
        { x: 0.5, y: 0.35 },
        { x: 0.5, y: 0.7 },
        { x: 0, y: 0.7 },
      ],
      center: { x: 0.25, y: 0.525 },
      viewKey,
    },
    // Lower Inner Quadrant (inferior-medial)
    {
      id: `LIQ${suffix}` as AnatomicalRegion,
      label: 'Lower Inner',
      polygon: [
        { x: 0.5, y: 0.35 },
        { x: 1, y: 0.35 },
        { x: 1, y: 0.7 },
        { x: 0.5, y: 0.7 },
      ],
      center: { x: 0.75, y: 0.525 },
      viewKey,
    },
    // Nipple region
    {
      id: `NIPPLE${suffix}` as AnatomicalRegion,
      label: 'Nipple',
      polygon: [
        { x: 0.3, y: 0.7 },
        { x: 0.7, y: 0.7 },
        { x: 0.7, y: 0.85 },
        { x: 0.3, y: 0.85 },
      ],
      center: { x: 0.5, y: 0.775 },
      viewKey,
    },
    // Axillary region (top of MLO view)
    {
      id: `AXILLA${suffix}` as AnatomicalRegion,
      label: 'Axilla',
      polygon: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0 },
        { x: 0.15, y: 0.2 },
        { x: 0, y: 0.2 },
      ],
      center: { x: 0.1, y: 0.1 },
      viewKey,
    },
    // Retroareolar region
    {
      id: `RETRO${suffix}` as AnatomicalRegion,
      label: 'Retroareolar',
      polygon: [
        { x: 0.2, y: 0.55 },
        { x: 0.8, y: 0.55 },
        { x: 0.8, y: 0.7 },
        { x: 0.2, y: 0.7 },
      ],
      center: { x: 0.5, y: 0.625 },
      viewKey,
    },
  ];
}

/**
 * All region definitions for standard mammography views.
 */
export const MAMMOGRAM_REGIONS: Record<'RCC' | 'LCC' | 'RMLO' | 'LMLO', RegionDefinition[]> = {
  RCC: generateCCRegions('R', 'RCC'),
  LCC: generateCCRegions('L', 'LCC'),
  RMLO: generateMLORegions('R', 'RMLO'),
  LMLO: generateMLORegions('L', 'LMLO'),
};

/**
 * Get regions for a specific view.
 */
export function getRegionsForView(
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO'
): RegionDefinition[] {
  return MAMMOGRAM_REGIONS[viewKey];
}

/**
 * Get all unique region IDs.
 */
export function getAllRegionIds(): AnatomicalRegion[] {
  return [
    'UOQ_R', 'UIQ_R', 'LOQ_R', 'LIQ_R', 'AXILLA_R', 'NIPPLE_R', 'RETRO_R',
    'UOQ_L', 'UIQ_L', 'LOQ_L', 'LIQ_L', 'AXILLA_L', 'NIPPLE_L', 'RETRO_L',
  ];
}

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 * @param point - Point to test (normalized coordinates)
 * @param polygon - Polygon vertices (normalized coordinates)
 * @returns True if point is inside polygon
 */
export function isPointInPolygon(
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate the intersection area between a rectangle (viewport) and a polygon (region).
 * Uses a simplified approach: samples points in the polygon and counts how many are in the viewport.
 *
 * @param viewportBounds - Viewport bounds in normalized coordinates
 * @param polygon - Region polygon vertices
 * @returns Approximate percentage of polygon visible in viewport (0-100)
 */
export function calculateRegionVisibility(
  viewportBounds: { top: number; left: number; width: number; height: number },
  polygon: Array<{ x: number; y: number }>
): number {
  // Sample grid resolution
  const gridSize = 10;
  let totalPoints = 0;
  let visiblePoints = 0;

  // Get polygon bounding box
  const minX = Math.min(...polygon.map((p) => p.x));
  const maxX = Math.max(...polygon.map((p) => p.x));
  const minY = Math.min(...polygon.map((p) => p.y));
  const maxY = Math.max(...polygon.map((p) => p.y));

  // Viewport bounds
  const vpLeft = viewportBounds.left;
  const vpRight = viewportBounds.left + viewportBounds.width;
  const vpTop = viewportBounds.top;
  const vpBottom = viewportBounds.top + viewportBounds.height;

  // Sample points within polygon bounding box
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = minX + ((maxX - minX) * i) / gridSize;
      const y = minY + ((maxY - minY) * j) / gridSize;

      if (isPointInPolygon({ x, y }, polygon)) {
        totalPoints++;
        // Check if point is in viewport
        if (x >= vpLeft && x <= vpRight && y >= vpTop && y <= vpBottom) {
          visiblePoints++;
        }
      }
    }
  }

  if (totalPoints === 0) return 0;
  return (visiblePoints / totalPoints) * 100;
}

/**
 * Find which regions are currently visible in the viewport.
 *
 * @param viewKey - Current mammogram view
 * @param viewportBounds - Current viewport bounds (normalized)
 * @param minVisibilityPercent - Minimum visibility to count as "visible" (default 10%)
 * @returns Array of visible region IDs with their visibility percentages
 */
export function getVisibleRegions(
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
  viewportBounds: { top: number; left: number; width: number; height: number },
  minVisibilityPercent: number = 10
): Array<{ region: AnatomicalRegion; visibility: number }> {
  const regions = getRegionsForView(viewKey);
  const visible: Array<{ region: AnatomicalRegion; visibility: number }> = [];

  for (const region of regions) {
    const visibility = calculateRegionVisibility(viewportBounds, region.polygon);
    if (visibility >= minVisibilityPercent) {
      visible.push({ region: region.id, visibility });
    }
  }

  return visible;
}

/**
 * Classify attention level based on dwell time.
 */
export function classifyAttentionLevel(
  dwellTimeMs: number,
  thresholds: AttentionThresholds = DEFAULT_ATTENTION_THRESHOLDS
): AttentionLevel {
  if (dwellTimeMs >= thresholds.extendedThresholdMs) {
    return 'EXTENDED';
  }
  if (dwellTimeMs >= thresholds.adequateThresholdMs) {
    return 'ADEQUATE';
  }
  if (dwellTimeMs >= thresholds.briefThresholdMs) {
    return 'BRIEF';
  }
  return 'NOT_VIEWED';
}

/**
 * Get display color for attention level.
 */
export function getAttentionLevelColor(level: AttentionLevel): string {
  switch (level) {
    case 'EXTENDED':
      return 'rgba(34, 197, 94, 0.4)';  // green-500
    case 'ADEQUATE':
      return 'rgba(34, 197, 94, 0.25)'; // green-500 lighter
    case 'BRIEF':
      return 'rgba(250, 204, 21, 0.3)'; // yellow-400
    case 'NOT_VIEWED':
      return 'rgba(148, 163, 184, 0.2)'; // slate-400
  }
}

/**
 * Get border color for attention level overlay.
 */
export function getAttentionLevelBorderColor(level: AttentionLevel): string {
  switch (level) {
    case 'EXTENDED':
      return 'rgba(34, 197, 94, 0.8)';
    case 'ADEQUATE':
      return 'rgba(34, 197, 94, 0.5)';
    case 'BRIEF':
      return 'rgba(250, 204, 21, 0.6)';
    case 'NOT_VIEWED':
      return 'rgba(148, 163, 184, 0.4)';
  }
}

/**
 * Parse region ID to get laterality and quadrant.
 */
export function parseRegionId(
  regionId: AnatomicalRegion
): { quadrant: string; laterality: 'R' | 'L' } {
  const parts = regionId.split('_');
  return {
    quadrant: parts[0],
    laterality: parts[1] as 'R' | 'L',
  };
}

/**
 * Get human-readable region name.
 */
export function getRegionDisplayName(regionId: AnatomicalRegion): string {
  const { quadrant, laterality } = parseRegionId(regionId);
  const side = laterality === 'R' ? 'Right' : 'Left';

  const quadrantNames: Record<string, string> = {
    UOQ: 'Upper Outer Quadrant',
    UIQ: 'Upper Inner Quadrant',
    LOQ: 'Lower Outer Quadrant',
    LIQ: 'Lower Inner Quadrant',
    AXILLA: 'Axilla',
    NIPPLE: 'Nipple',
    RETRO: 'Retroareolar',
  };

  return `${quadrantNames[quadrant] || quadrant} (${side})`;
}
