/**
 * AIValidationDetails.tsx
 *
 * Expandable modal showing detailed validation evidence for AI systems.
 *
 * SPIEGELHALTER'S FRAMEWORK (The Art of Statistics, 2019):
 * This component allows clinicians to drill into the actual evidence
 * supporting an AI's validation claims. Key transparency principles:
 *
 * 1. Show the actual datasets used for testing
 * 2. Show which experts the AI was compared to
 * 3. Show whether patient outcomes were measured
 * 4. Show real-world implementation experience
 *
 * Per Topol (Deep Medicine, 2019): "The medical profession should demand
 * transparency about AI validation before adopting these tools."
 *
 * LEGAL SIGNIFICANCE:
 * By providing detailed evidence, we document that the clinician had
 * access to complete validation information before relying on the AI.
 * This creates a stronger informed consent defense.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AIValidationStatus,
  ValidationPhase,
  ValidationEvidence,
  Phase1Evidence,
  Phase2Evidence,
  Phase3Evidence,
  Phase4Evidence,
  RegulatoryStatus,
} from '../../../lib/aiValidationTypes';
import {
  PHASE_NAMES,
  PHASE_COLORS,
  PHASE_DESCRIPTIONS,
  PHASE_RECOMMENDATIONS,
} from '../../../lib/aiValidationTypes';

// ============================================================================
// TYPES
// ============================================================================

interface AIValidationDetailsProps {
  /** The validation status to display */
  validation: AIValidationStatus;

  /** AI system identification */
  systemId: string;
  systemName: string;
  vendor: string;
  version: string;

  /** Whether the modal is open */
  isOpen: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Callback when sections are viewed (for logging) */
  onSectionViewed?: (sectionId: string, timestamp: string) => void;

  /** Callback when modal is closed with viewing stats */
  onDetailsClosed?: (viewDurationMs: number, sectionsViewed: string[]) => void;
}

interface TabConfig {
  id: string;
  label: string;
  phase: ValidationPhase;
  available: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CloseIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// ============================================================================
// PHASE 1: LABORATORY VALIDATION DETAILS
// ============================================================================

const Phase1Details: React.FC<{ evidence?: Phase1Evidence }> = ({ evidence }) => {
  if (!evidence || !evidence.datasets || evidence.datasets.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No Phase 1 evidence available.</p>
        <p className="text-sm mt-2">
          Phase 1 requires testing on at least one validation dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
        <p className="text-sm text-red-300">
          <strong>Spiegelhalter Warning:</strong> "Performance on test sets tells us nothing
          about real-world clinical utility. These metrics were obtained on curated datasets
          that may not represent your patient population."
        </p>
      </div>

      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Validation Datasets ({evidence.datasets.length})
      </h4>

      <div className="space-y-3">
        {evidence.datasets.map((dataset, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-medium text-white">{dataset.name}</h5>
                <p className="text-sm text-slate-400">
                  {dataset.size.toLocaleString()} samples
                  {dataset.year && ` (${dataset.year})`}
                </p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {dataset.performance.auc !== undefined && (
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="text-xs text-slate-400">AUC</div>
                  <div className="text-lg font-semibold text-white">
                    {(dataset.performance.auc * 100).toFixed(1)}%
                  </div>
                </div>
              )}
              {dataset.performance.sensitivity !== undefined && (
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="text-xs text-slate-400">Sensitivity</div>
                  <div className="text-lg font-semibold text-white">
                    {(dataset.performance.sensitivity * 100).toFixed(1)}%
                  </div>
                </div>
              )}
              {dataset.performance.specificity !== undefined && (
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="text-xs text-slate-400">Specificity</div>
                  <div className="text-lg font-semibold text-white">
                    {(dataset.performance.specificity * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Limitations */}
            {dataset.limitations && dataset.limitations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Known Limitations:</div>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {dataset.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// PHASE 2: EXPERT COMPARISON DETAILS
// ============================================================================

const Phase2Details: React.FC<{ evidence?: Phase2Evidence }> = ({ evidence }) => {
  if (!evidence || !evidence.studies || evidence.studies.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No Phase 2 evidence available.</p>
        <p className="text-sm mt-2">
          Phase 2 requires comparison studies against human experts.
        </p>
      </div>
    );
  }

  const getComparisonBadge = (result: string) => {
    switch (result) {
      case 'AI_BETTER':
        return (
          <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-400 text-xs">
            AI Better
          </span>
        );
      case 'EQUIVALENT':
        return (
          <span className="px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-400 text-xs">
            Equivalent
          </span>
        );
      case 'HUMAN_BETTER':
        return (
          <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-400 text-xs">
            Human Better
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 text-xs">
            Mixed
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
        <p className="text-sm text-orange-300">
          <strong>Spiegelhalter Warning:</strong> "Showing AI matches or exceeds human experts
          is impressive but does not prove clinical utility. Experts may also be wrong, and
          being as good as an expert does not mean patients will benefit."
        </p>
      </div>

      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Expert Comparison Studies ({evidence.studies.length})
      </h4>

      <div className="space-y-3">
        {evidence.studies.map((study, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{study.citation}</p>
                {(study.doi || study.pubmedId) && (
                  <div className="flex gap-2 mt-1">
                    {study.doi && (
                      <a
                        href={`https://doi.org/${study.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        DOI <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    )}
                    {study.pubmedId && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${study.pubmedId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        PubMed <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              {getComparisonBadge(study.aiVsHuman)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Experts Compared</div>
                <div className="text-white">
                  {study.nExperts} {study.expertLevel?.toLowerCase() || 'radiologists'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">AI vs Human AUC</div>
                <div className="text-white">
                  {study.metrics.aiAuc !== undefined
                    ? `${(study.metrics.aiAuc * 100).toFixed(1)}%`
                    : '—'}{' '}
                  vs{' '}
                  {study.metrics.humanAuc !== undefined
                    ? `${(study.metrics.humanAuc * 100).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>

            {study.limitations && study.limitations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Study Limitations:</div>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {study.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// PHASE 3: PATIENT OUTCOME DETAILS
// ============================================================================

const Phase3Details: React.FC<{ evidence?: Phase3Evidence }> = ({ evidence }) => {
  if (!evidence || !evidence.trials || evidence.trials.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No Phase 3 evidence available.</p>
        <p className="text-sm mt-2">
          Phase 3 requires clinical trials demonstrating improved patient outcomes.
        </p>
      </div>
    );
  }

  const getDesignBadge = (design: string) => {
    const isRCT = design.includes('RCT');
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs ${
          isRCT ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'
        }`}
      >
        {design.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
        <p className="text-sm text-yellow-300">
          <strong>Spiegelhalter Insight:</strong> "The critical question is: Do patients
          actually do better when this AI is used? Very few AI tools have evidence at this
          level. Presence of outcome data is significant."
        </p>
      </div>

      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Clinical Outcome Trials ({evidence.trials.length})
      </h4>

      <div className="space-y-3">
        {evidence.trials.map((trial, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{trial.citation}</p>
                <div className="flex gap-2 mt-1">
                  {trial.clinicalTrialId && (
                    <a
                      href={`https://clinicaltrials.gov/show/${trial.clinicalTrialId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      {trial.clinicalTrialId} <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  )}
                  {trial.doi && (
                    <a
                      href={`https://doi.org/${trial.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      DOI <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              {getDesignBadge(trial.design)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Patients</div>
                <div className="text-white">{trial.nPatients.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Primary Outcome</div>
                <div className="text-white">{trial.primaryOutcome}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-400">Improved Outcomes</div>
                <div className="flex items-center gap-1">
                  {trial.outcomeImprovement ? (
                    <CheckIcon className="w-5 h-5 text-green-400" />
                  ) : (
                    <XIcon className="w-5 h-5 text-red-400" />
                  )}
                  <span className={trial.outcomeImprovement ? 'text-green-400' : 'text-red-400'}>
                    {trial.outcomeImprovement ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {trial.effectSize !== undefined && (
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="text-xs text-slate-400">Effect Size</div>
                  <div className="text-lg font-semibold text-white">
                    {trial.effectSize.toFixed(2)}
                  </div>
                </div>
              )}

              {trial.nnt !== undefined && (
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="text-xs text-slate-400">NNT/NNS</div>
                  <div className="text-lg font-semibold text-white">{trial.nnt}</div>
                </div>
              )}
            </div>

            {trial.confidenceInterval && (
              <div className="text-sm text-slate-400 mb-2">
                95% CI: [{trial.confidenceInterval.lower.toFixed(2)},{' '}
                {trial.confidenceInterval.upper.toFixed(2)}]
                {trial.pValue !== undefined && ` (p = ${trial.pValue.toFixed(4)})`}
              </div>
            )}

            {trial.followUpDuration && (
              <div className="text-sm text-slate-400">
                Follow-up: {trial.followUpDuration}
              </div>
            )}

            {trial.limitations && trial.limitations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Trial Limitations:</div>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {trial.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// PHASE 4: BROAD IMPLEMENTATION DETAILS
// ============================================================================

const Phase4Details: React.FC<{ evidence?: Phase4Evidence }> = ({ evidence }) => {
  if (!evidence || !evidence.implementations || evidence.implementations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No Phase 4 evidence available.</p>
        <p className="text-sm mt-2">
          Phase 4 requires sustained real-world implementation data across diverse settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
        <p className="text-sm text-green-300">
          <strong>Spiegelhalter Insight:</strong> "Even if AI improves outcomes in a trial,
          does it work in diverse real-world settings over time? This is the ultimate test
          that very few AI systems have passed."
        </p>
      </div>

      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Real-World Implementations ({evidence.implementations.length})
      </h4>

      <div className="space-y-3">
        {evidence.implementations.map((impl, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-medium text-white">{impl.setting}</h5>
                {impl.region && (
                  <p className="text-sm text-slate-400">{impl.region}</p>
                )}
              </div>
              {impl.institutionType && (
                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                  {impl.institutionType}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-400">Duration</div>
                <div className="text-white font-medium">{impl.duration}</div>
              </div>

              {impl.nPatients !== undefined && (
                <div className="bg-slate-900/50 rounded p-2">
                  <div className="text-xs text-slate-400">Patients</div>
                  <div className="text-white font-medium">
                    {impl.nPatients.toLocaleString()}
                  </div>
                </div>
              )}

              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-400">Sustained Benefit</div>
                <div className="flex items-center gap-1">
                  {impl.sustainedBenefit ? (
                    <CheckIcon className="w-5 h-5 text-green-400" />
                  ) : (
                    <XIcon className="w-5 h-5 text-red-400" />
                  )}
                  <span className={impl.sustainedBenefit ? 'text-green-400' : 'text-red-400'}>
                    {impl.sustainedBenefit ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {impl.performanceDrift !== undefined && impl.performanceDrift && (
              <div className="text-sm text-orange-400 mb-2">
                Performance drift detected over time
              </div>
            )}

            {impl.keyFindings && impl.keyFindings.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-400 mb-1">Key Findings:</div>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {impl.keyFindings.map((finding, i) => (
                    <li key={i}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {impl.challenges && impl.challenges.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Implementation Challenges:</div>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {impl.challenges.map((challenge, i) => (
                    <li key={i}>{challenge}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// REGULATORY STATUS SECTION
// ============================================================================

const RegulatorySection: React.FC<{ regulatory: RegulatoryStatus }> = ({ regulatory }) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Important Note:</strong> FDA clearance (especially 510(k)) does NOT mean
          clinical validation per Spiegelhalter's framework. 510(k) only requires "substantial
          equivalence" to a predicate device, not clinical outcome evidence.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* FDA Status */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h5 className="font-medium text-white mb-3">FDA Status</h5>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {regulatory.fdaCleared ? (
                <CheckIcon className="w-5 h-5 text-green-400" />
              ) : (
                <XIcon className="w-5 h-5 text-slate-500" />
              )}
              <span className={regulatory.fdaCleared ? 'text-green-400' : 'text-slate-400'}>
                {regulatory.fdaCleared ? 'FDA Cleared' : 'Not FDA Cleared'}
              </span>
            </div>

            {regulatory.fdaCleared && (
              <>
                {regulatory.fdaClearanceType && (
                  <div className="text-sm text-slate-300">
                    Clearance Type: {regulatory.fdaClearanceType}
                  </div>
                )}
                {regulatory.fdaNumber && (
                  <div className="text-sm text-slate-300">
                    Number: {regulatory.fdaNumber}
                  </div>
                )}
                {regulatory.fdaClearanceDate && (
                  <div className="text-sm text-slate-300">
                    Date: {regulatory.fdaClearanceDate}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CE Marking */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h5 className="font-medium text-white mb-3">CE Marking (EU)</h5>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {regulatory.ceMarked ? (
                <CheckIcon className="w-5 h-5 text-green-400" />
              ) : (
                <XIcon className="w-5 h-5 text-slate-500" />
              )}
              <span className={regulatory.ceMarked ? 'text-green-400' : 'text-slate-400'}>
                {regulatory.ceMarked ? 'CE Marked' : 'Not CE Marked'}
              </span>
            </div>

            {regulatory.ceMarked && regulatory.ceClass && (
              <div className="text-sm text-slate-300">Class: {regulatory.ceClass}</div>
            )}
          </div>
        </div>
      </div>

      {/* Other Approvals */}
      {regulatory.otherApprovals.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h5 className="font-medium text-white mb-2">Other Regulatory Approvals</h5>
          <div className="flex flex-wrap gap-2">
            {regulatory.otherApprovals.map((approval, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-sm"
              >
                {approval}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {regulatory.warnings && regulatory.warnings.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <h5 className="font-medium text-red-400 mb-2">FDA Warnings/Recalls</h5>
          <ul className="text-sm text-red-300 list-disc list-inside">
            {regulatory.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export const AIValidationDetails: React.FC<AIValidationDetailsProps> = ({
  validation,
  systemId,
  systemName,
  vendor,
  version,
  isOpen,
  onClose,
  onSectionViewed,
  onDetailsClosed,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sectionsViewed, setSectionsViewed] = useState<Set<string>>(new Set(['overview']));
  const openTimeRef = useRef<number>(Date.now());

  // Track sections viewed
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (!sectionsViewed.has(tabId)) {
        setSectionsViewed((prev) => new Set(prev).add(tabId));
        onSectionViewed?.(tabId, new Date().toISOString());
      }
    },
    [sectionsViewed, onSectionViewed]
  );

  // Handle close with metrics
  const handleClose = useCallback(() => {
    const viewDurationMs = Date.now() - openTimeRef.current;
    onDetailsClosed?.(viewDurationMs, Array.from(sectionsViewed));
    onClose();
  }, [onClose, onDetailsClosed, sectionsViewed]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      setSectionsViewed(new Set(['overview']));
      setActiveTab('overview');
    }
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  const colors = PHASE_COLORS[validation.phase];
  const evidence = validation.detailedEvidence;

  // Tab configuration
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', phase: validation.phase, available: true },
    {
      id: 'phase1',
      label: 'Lab Validation',
      phase: 1,
      available: !!evidence?.phase1?.datasets?.length,
    },
    {
      id: 'phase2',
      label: 'Expert Comparison',
      phase: 2,
      available: !!evidence?.phase2?.studies?.length,
    },
    {
      id: 'phase3',
      label: 'Outcome Evidence',
      phase: 3,
      available: !!evidence?.phase3?.trials?.length,
    },
    {
      id: 'phase4',
      label: 'Implementation',
      phase: 4,
      available: !!evidence?.phase4?.implementations?.length,
    },
    { id: 'regulatory', label: 'Regulatory', phase: validation.phase, available: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            backgroundColor: `${colors.background}60`,
            borderColor: colors.border,
          }}
        >
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              AI Validation Evidence
            </div>
            <h2 className="text-xl font-semibold text-white">
              {systemName}
              <span className="text-sm font-normal text-slate-400 ml-2">
                v{version} by {vendor}
              </span>
            </h2>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Phase Summary Bar */}
        <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-4">
          <div
            className="px-3 py-1.5 rounded-lg font-semibold"
            style={{
              backgroundColor: `${colors.background}80`,
              color: colors.text,
              borderColor: colors.border,
            }}
          >
            Phase {validation.phase}: {validation.phaseName}
          </div>
          <div className="text-sm text-slate-400">
            Evidence Quality:{' '}
            <span style={{ color: colors.text }}>{validation.evidenceQuality}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/30 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={!tab.available}
              className={`
                px-4 py-3 text-sm font-medium transition-colors relative
                ${
                  activeTab === tab.id
                    ? 'text-white'
                    : tab.available
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 cursor-not-allowed'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: colors.primary }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  What Phase {validation.phase} Means
                </h3>
                <p className="text-slate-300 leading-relaxed">{validation.description}</p>
              </div>

              {/* Spiegelhalter Quote */}
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: `${colors.background}40`,
                  borderColor: `${colors.border}60`,
                }}
              >
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: colors.primary }}>
                  Spiegelhalter's Perspective
                </div>
                <blockquote className="text-slate-200 italic">
                  "{PHASE_DESCRIPTIONS[validation.phase].spiegelhalterQuote}"
                </blockquote>
              </div>

              {/* Clinical Recommendation */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Clinical Recommendation</h3>
                <p className="text-slate-300 leading-relaxed">{validation.recommendation}</p>
              </div>

              {/* Limitations */}
              {validation.limitations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Known Limitations</h3>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {validation.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Excluded Populations */}
              {validation.excludedPopulations && validation.excludedPopulations.length > 0 && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">Not Validated For:</h4>
                  <ul className="list-disc list-inside text-red-300 space-y-1">
                    {validation.excludedPopulations.map((pop, idx) => (
                      <li key={idx}>{pop}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contraindications */}
              {validation.contraindications && validation.contraindications.length > 0 && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">Contraindications:</h4>
                  <ul className="list-disc list-inside text-red-300 space-y-1">
                    {validation.contraindications.map((contra, idx) => (
                      <li key={idx}>{contra}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'phase1' && <Phase1Details evidence={evidence?.phase1} />}
          {activeTab === 'phase2' && <Phase2Details evidence={evidence?.phase2} />}
          {activeTab === 'phase3' && <Phase3Details evidence={evidence?.phase3} />}
          {activeTab === 'phase4' && <Phase4Details evidence={evidence?.phase4} />}
          {activeTab === 'regulatory' && <RegulatorySection regulatory={validation.regulatory} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Last validated: {validation.lastValidated}
            {validation.assessedBy && ` by ${validation.assessedBy}`}
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIValidationDetails;
