/**
 * studyConfig.ts
 *
 * Centralized study configuration data for demo/research flows.
 * Re-exports the core StudyConfig type from condition_matrix and provides
 * a convenience accessor for sham AI status.
 */

export type { StudyConfig } from '../lib/condition_matrix';
export { BRPLL_STUDY_CONFIG } from '../lib/condition_matrix';

import { shamAIManager } from '../lib/shamAIManager';

/**
 * Check whether sham AI mode is currently enabled and active.
 * This is a convenience function that wraps the shamAIManager singleton.
 */
export function isShamAIActive(): boolean {
  return shamAIManager.isActive();
}

/**
 * Get the sham AI manifest ID if active, otherwise null.
 */
export function getShamAIManifestId(): string | null {
  return shamAIManager.getManifest()?.studyId ?? null;
}
