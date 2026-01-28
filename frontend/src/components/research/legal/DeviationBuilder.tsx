/**
 * DeviationBuilder.tsx
 * 
 * Structured documentation component for when radiologist disagrees with AI.
 * Creates court-defensible rationale following defense attorney recommendations:
 * 
 * 1. Acknowledge AI finding (shows awareness)
 * 2. Document independent review
 * 3. Provide specific clinical rationale
 * 4. State professional conclusion
 * 
 * Key insight from liability research: "document that the clinician in his or her 
 * professional judgment disagrees with the AI analysis due to X, Y, and Z reasons"
 */

import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AIFindingForDeviation {
  id: string;
  score: number;
  flagged: boolean;
  region?: string; // e.g., "Upper outer quadrant, right breast"
  aiSuggestion?: string; // e.g., "BI-RADS 4"
}

export interface DeviationReasonCode {
  code: string;
  label: string;
  description: string;
  category: 'anatomical' | 'temporal' | 'clinical' | 'technical' | 'interpretive';
}

export const DEVIATION_REASON_CODES: DeviationReasonCode[] = [
  // Anatomical
  {
    code: 'NORMAL_VARIANT',
    label: 'Normal anatomical variant',
    description: 'Finding represents normal anatomical variation',
    category: 'anatomical',
  },
  {
    code: 'BENIGN_CALCIFICATION',
    label: 'Benign calcification pattern',
    description: 'Calcification morphology consistent with benign etiology',
    category: 'anatomical',
  },
  {
    code: 'LYMPH_NODE',
    label: 'Intramammary lymph node',
    description: 'Finding consistent with normal intramammary lymph node',
    category: 'anatomical',
  },
  
  // Temporal/Prior imaging
  {
    code: 'STABLE_PRIOR',
    label: 'Unchanged from prior imaging',
    description: 'Finding stable compared to previous examination',
    category: 'temporal',
  },
  {
    code: 'DECREASING',
    label: 'Decreasing in size',
    description: 'Finding demonstrates interval decrease compared to prior',
    category: 'temporal',
  },
  {
    code: 'KNOWN_BENIGN',
    label: 'Previously biopsied benign',
    description: 'Finding at site of prior benign biopsy result',
    category: 'temporal',
  },
  
  // Clinical history
  {
    code: 'CLINICAL_HISTORY',
    label: 'Clinical history contradicts',
    description: 'Clinical history does not support AI interpretation',
    category: 'clinical',
  },
  {
    code: 'SURGICAL_SITE',
    label: 'Post-surgical change',
    description: 'Finding at expected post-surgical location',
    category: 'clinical',
  },
  {
    code: 'FAT_NECROSIS',
    label: 'Fat necrosis',
    description: 'Appearance consistent with fat necrosis at trauma/surgical site',
    category: 'clinical',
  },
  
  // Technical factors
  {
    code: 'ARTIFACT',
    label: 'Technical artifact',
    description: 'Finding represents imaging artifact, not true abnormality',
    category: 'technical',
  },
  {
    code: 'POSITIONING',
    label: 'Positioning-related',
    description: 'Apparent finding due to patient positioning',
    category: 'technical',
  },
  {
    code: 'SKIN_MARKER',
    label: 'Skin marker/lesion',
    description: 'Finding corresponds to skin marker or cutaneous lesion',
    category: 'technical',
  },
  
  // Interpretive
  {
    code: 'NO_CORRELATE',
    label: 'No imaging correlate',
    description: 'AI-flagged area does not contain visible abnormality',
    category: 'interpretive',
  },
  {
    code: 'OVERCALL',
    label: 'AI sensitivity overcall',
    description: 'AI flagged normal tissue as suspicious',
    category: 'interpretive',
  },
  {
    code: 'OTHER',
    label: 'Other clinical reasoning',
    description: 'See supporting evidence for detailed explanation',
    category: 'interpretive',
  },
];

export interface FollowupRecommendation {
  code: string;
  label: string;
  timeframe?: string;
}

export const FOLLOWUP_RECOMMENDATIONS: FollowupRecommendation[] = [
  { code: 'ROUTINE', label: 'Routine screening interval', timeframe: '12 months' },
  { code: 'SHORT_6MO', label: 'Short-interval follow-up', timeframe: '6 months' },
  { code: 'SHORT_3MO', label: 'Short-interval follow-up', timeframe: '3 months' },
  { code: 'ADDITIONAL_VIEWS', label: 'Additional mammographic views', timeframe: 'Immediate' },
  { code: 'ULTRASOUND', label: 'Diagnostic ultrasound', timeframe: 'Immediate' },
  { code: 'MRI', label: 'Breast MRI recommended', timeframe: 'As scheduled' },
  { code: 'BIOPSY', label: 'Biopsy recommended', timeframe: 'As scheduled' },
  { code: 'CLINICAL_EXAM', label: 'Clinical breast examination', timeframe: 'As indicated' },
  { code: 'OTHER', label: 'Other (specify)', timeframe: undefined },
];

export interface DeviationDocumentation {
  // AI finding being addressed
  aiFindingId: string;
  aiScore: number;
  aiFlagged: boolean;
  aiRegion: string | null;
  
  // Acknowledgement (proves review)
  acknowledgedFinding: boolean;
  acknowledgedTimestamp: string;
  regionReviewed: boolean;
  regionReviewedTimestamp: string | null;
  
  // Rationale (structured reasons)
  selectedReasonCodes: string[];
  
  // Supporting evidence (optional free text)
  supportingEvidence: string;
  priorImagingReference?: string; // e.g., "Comparison with mammogram dated 2024-03-15"
  
  // Professional conclusion
  followupRecommendation: string;
  followupOther?: string;
  
  // Metadata
  completedAt: string;
  timeToCompleteMs: number;
}

// ============================================================================
// DEVIATION BUILDER COMPONENT
// ============================================================================

interface DeviationBuilderProps {
  aiFinding: AIFindingForDeviation;
  onComplete: (documentation: DeviationDocumentation) => void;
  onCancel?: () => void;
  readerAssessment: string; // What the reader said (e.g., "BI-RADS 2")
}

export const DeviationBuilder: React.FC<DeviationBuilderProps> = ({
  aiFinding,
  onComplete,
  onCancel,
  readerAssessment,
}) => {
  const [startTime] = useState(Date.now());
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Step 1: Acknowledgement
  const [acknowledgedFinding, setAcknowledgedFinding] = useState(false);
  const [acknowledgedTimestamp, setAcknowledgedTimestamp] = useState<string | null>(null);
  const [regionReviewed, setRegionReviewed] = useState(false);
  const [regionReviewedTimestamp, setRegionReviewedTimestamp] = useState<string | null>(null);
  
  // Step 2: Reason codes
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  
  // Step 3: Supporting evidence
  const [supportingEvidence, setSupportingEvidence] = useState('');
  const [priorImagingReference, setPriorImagingReference] = useState('');
  
  // Step 4: Followup
  const [followupRecommendation, setFollowupRecommendation] = useState('');
  const [followupOther, setFollowupOther] = useState('');

  // Grouped reason codes by category
  const reasonsByCategory = useMemo(() => {
    return DEVIATION_REASON_CODES.reduce((acc, code) => {
      if (!acc[code.category]) acc[code.category] = [];
      acc[code.category].push(code);
      return acc;
    }, {} as Record<string, DeviationReasonCode[]>);
  }, []);

  const categoryLabels: Record<string, string> = {
    anatomical: 'Anatomical / Normal Variation',
    temporal: 'Comparison with Prior Imaging',
    clinical: 'Clinical History',
    technical: 'Technical Factors',
    interpretive: 'Interpretive Assessment',
  };

  // Handlers
  const handleAcknowledge = useCallback(() => {
    setAcknowledgedFinding(true);
    setAcknowledgedTimestamp(new Date().toISOString());
  }, []);

  const handleRegionReview = useCallback(() => {
    setRegionReviewed(true);
    setRegionReviewedTimestamp(new Date().toISOString());
  }, []);

  const toggleReason = useCallback((code: string) => {
    setSelectedReasons(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  }, []);

  const handleComplete = useCallback(() => {
    const documentation: DeviationDocumentation = {
      aiFindingId: aiFinding.id,
      aiScore: aiFinding.score,
      aiFlagged: aiFinding.flagged,
      aiRegion: aiFinding.region ?? null,
      
      acknowledgedFinding,
      acknowledgedTimestamp: acknowledgedTimestamp ?? new Date().toISOString(),
      regionReviewed,
      regionReviewedTimestamp,
      
      selectedReasonCodes: selectedReasons,
      supportingEvidence,
      priorImagingReference: priorImagingReference || undefined,
      
      followupRecommendation,
      followupOther: followupOther || undefined,
      
      completedAt: new Date().toISOString(),
      timeToCompleteMs: Date.now() - startTime,
    };
    
    onComplete(documentation);
  }, [
    aiFinding, acknowledgedFinding, acknowledgedTimestamp, regionReviewed,
    regionReviewedTimestamp, selectedReasons, supportingEvidence,
    priorImagingReference, followupRecommendation, followupOther,
    startTime, onComplete
  ]);

  // Validation
  const step1Valid = acknowledgedFinding && (aiFinding.region ? regionReviewed : true);
  const step2Valid = selectedReasons.length > 0;
  const step3Valid = true; // Optional step
  const step4Valid = followupRecommendation !== '' && (followupRecommendation !== 'OTHER' || followupOther !== '');

  const canComplete = step1Valid && step2Valid && step4Valid;

  return (
    <div className="bg-slate-900 rounded-lg border border-orange-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-orange-500/10 px-4 py-3 border-b border-orange-500/30">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-lg"></span>
          <h3 className="font-semibold text-white">Deviation Documentation Required</h3>
        </div>
        <p className="text-sm text-slate-300 mt-1">
          Your assessment differs from AI. Document your clinical reasoning.
        </p>
      </div>

      {/* AI Finding Summary */}
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">AI Finding</div>
            <div className="text-white">
              Score: {aiFinding.score} • {aiFinding.flagged ? ' Flagged as Suspicious' : 'Not flagged'}
            </div>
            {aiFinding.region && (
              <div className="text-sm text-slate-400 mt-1">
                Region: {aiFinding.region}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Your Assessment</div>
            <div className="text-white">{readerAssessment}</div>
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex border-b border-slate-700">
        {[1, 2, 3, 4].map((step) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step as 1 | 2 | 3 | 4)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              currentStep === step
                ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                : step < currentStep
                ? 'bg-green-500/10 text-green-400'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {step === 1 && (step1Valid ? ' ' : '')}
            {step === 2 && (step2Valid ? ' ' : '')}
            {step === 3 && ''}
            {step === 4 && (step4Valid ? ' ' : '')}
            {step === 1 && 'Acknowledge'}
            {step === 2 && 'Rationale'}
            {step === 3 && 'Evidence'}
            {step === 4 && 'Follow-up'}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="p-4 min-h-[300px]">
        {/* Step 1: Acknowledgement */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-300 mb-4">
              Confirm that you have reviewed the AI finding before documenting your deviation.
            </div>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 hover:border-purple-500/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={acknowledgedFinding}
                onChange={handleAcknowledge}
                className="mt-1 h-4 w-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
              />
              <div>
                <div className="text-white font-medium">
                  I have reviewed the AI finding
                </div>
                <div className="text-sm text-slate-400">
                  AI Score: {aiFinding.score}, {aiFinding.flagged ? 'Flagged' : 'Not flagged'}
                </div>
                {acknowledgedTimestamp && (
                  <div className="text-xs text-green-400 mt-1">
                     Acknowledged at {new Date(acknowledgedTimestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </label>

            {aiFinding.region && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 hover:border-purple-500/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={regionReviewed}
                  onChange={handleRegionReview}
                  className="mt-1 h-4 w-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                <div>
                  <div className="text-white font-medium">
                    I have examined the flagged region
                  </div>
                  <div className="text-sm text-slate-400">
                    Region: {aiFinding.region}
                  </div>
                  {regionReviewedTimestamp && (
                    <div className="text-xs text-green-400 mt-1">
                       Reviewed at {new Date(regionReviewedTimestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </label>
            )}

            <button
              onClick={() => setCurrentStep(2)}
              disabled={!step1Valid}
              className="w-full mt-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
            >
              Continue to Rationale
            </button>
          </div>
        )}

        {/* Step 2: Reason Codes */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-300 mb-4">
              Select all reasons that support your clinical judgment:
            </div>

            {Object.entries(reasonsByCategory).map(([category, codes]) => (
              <div key={category} className="space-y-2">
                <div className="text-sm font-medium text-slate-400">
                  {categoryLabels[category]}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {codes.map(code => (
                    <label
                      key={code.code}
                      className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedReasons.includes(code.code)
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReasons.includes(code.code)}
                        onChange={() => toggleReason(code.code)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                      />
                      <div>
                        <div className="text-white text-sm">{code.label}</div>
                        <div className="text-xs text-slate-400">{code.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!step2Valid}
                className="flex-1 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Supporting Evidence */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-300 mb-4">
              Optional: Provide additional supporting evidence for your assessment.
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Prior Imaging Reference
              </label>
              <input
                type="text"
                value={priorImagingReference}
                onChange={(e) => setPriorImagingReference(e.target.value)}
                placeholder="e.g., Comparison with mammogram dated 2024-03-15"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Supporting Evidence / Clinical Reasoning
              </label>
              <textarea
                value={supportingEvidence}
                onChange={(e) => setSupportingEvidence(e.target.value)}
                placeholder="Describe specific findings, clinical correlations, or other evidence supporting your assessment..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
              />
              <div className="text-xs text-slate-500 mt-1">
                This documentation may be used in legal proceedings. Be specific and professional.
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="flex-1 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
              >
                Continue to Follow-up
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Followup Recommendation */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-300 mb-4">
              Select your recommended follow-up:
            </div>

            <div className="space-y-2">
              {FOLLOWUP_RECOMMENDATIONS.map(rec => (
                <label
                  key={rec.code}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    followupRecommendation === rec.code
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="followup"
                    checked={followupRecommendation === rec.code}
                    onChange={() => setFollowupRecommendation(rec.code)}
                    className="h-4 w-4 border-slate-600 text-purple-500 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-white">{rec.label}</div>
                    {rec.timeframe && (
                      <div className="text-xs text-slate-400">{rec.timeframe}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {followupRecommendation === 'OTHER' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Specify follow-up recommendation
                </label>
                <input
                  type="text"
                  value={followupOther}
                  onChange={(e) => setFollowupOther(e.target.value)}
                  placeholder="Describe recommended follow-up..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!canComplete}
                className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
              >
                Complete Documentation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800/50 px-4 py-3 border-t border-slate-700 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Time documenting: {Math.round((Date.now() - startTime) / 1000)}s
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPACT DEVIATION SUMMARY (for display after completion)
// ============================================================================

interface DeviationSummaryProps {
  documentation: DeviationDocumentation;
}

export const DeviationSummary: React.FC<DeviationSummaryProps> = ({ documentation }) => {
  const reasons = documentation.selectedReasonCodes
    .map(code => DEVIATION_REASON_CODES.find(r => r.code === code)?.label)
    .filter(Boolean);

  const followup = FOLLOWUP_RECOMMENDATIONS.find(r => r.code === documentation.followupRecommendation);

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-orange-400"></span>
        <span className="font-medium text-white">Deviation Documented</span>
        <span className="text-xs text-slate-400 ml-auto">
          {new Date(documentation.completedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-slate-400">Reasons: </span>
          <span className="text-white">{reasons.join('; ')}</span>
        </div>
        
        {documentation.supportingEvidence && (
          <div>
            <span className="text-slate-400">Evidence: </span>
            <span className="text-white">{documentation.supportingEvidence}</span>
          </div>
        )}
        
        <div>
          <span className="text-slate-400">Follow-up: </span>
          <span className="text-white">
            {followup?.label || documentation.followupOther || 'Not specified'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-orange-500/20 flex items-center gap-4 text-xs text-slate-400">
        <span> AI finding acknowledged</span>
        {documentation.regionReviewed && <span> Region reviewed</span>}
        <span>Completed in {Math.round(documentation.timeToCompleteMs / 1000)}s</span>
      </div>
    </div>
  );
};

export default DeviationBuilder;
