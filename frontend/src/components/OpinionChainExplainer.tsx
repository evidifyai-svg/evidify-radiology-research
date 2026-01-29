// OpinionChainExplainer.tsx - Generates claim chain narratives for opinions
// Short version for opinion section, long version for deposition prep

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Claim {
  id: string;
  claim_text?: string;
  text?: string;
  claim_type: string;
  section_id: string;
  citations: { evidence_id: string; quote?: string; page?: string }[];
  confidence?: string;
  supporting_claim_ids?: string[];
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
}

interface OpinionChain {
  opinion: Claim;
  supportingInferences: Claim[];
  supportingFacts: Claim[];
  supportingTestResults: Claim[];
  supportingObservations: Claim[];
  evidenceAnchors: { claim: Claim; evidence: EvidenceItem; quote?: string; page?: string }[];
  chainStrength: 'strong' | 'moderate' | 'weak';
  gaps: string[];
}

interface OpinionChainExplainerProps {
  claims: Claim[];
  evidence: EvidenceItem[];
  selectedOpinionId?: string;
  onSelectOpinion?: (opinionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OpinionChainExplainer({
  claims,
  evidence,
  selectedOpinionId,
  onSelectOpinion,
}: OpinionChainExplainerProps) {
  const [viewMode, setViewMode] = useState<'short' | 'long'>('short');
  const [selectedOpinion, setSelectedOpinion] = useState<string | null>(selectedOpinionId || null);
  
  // Get opinion claims
  const opinions = useMemo(() => {
    return claims.filter(c => 
      ['forensic_opinion', 'opinion', 'inference', 'ultimate_opinion'].includes(c.claim_type)
    );
  }, [claims]);
  
  // Build opinion chain
  const buildOpinionChain = (opinionId: string): OpinionChain | null => {
    const opinion = claims.find(c => c.id === opinionId);
    if (!opinion) return null;
    
    // Collect supporting claims (simplified - in full implementation, would trace links)
    const supportingClaimIds = opinion.supporting_claim_ids || 
      opinion.citations?.map(c => c.evidence_id) || [];
    
    const allSupportingClaims = claims.filter(c => 
      supportingClaimIds.includes(c.id) ||
      c.citations?.some(cit => opinion.citations?.some(ocit => ocit.evidence_id === cit.evidence_id))
    );
    
    const supportingInferences = allSupportingClaims.filter(c => c.claim_type === 'inference');
    const supportingFacts = allSupportingClaims.filter(c => c.claim_type === 'record_fact');
    const supportingTestResults = allSupportingClaims.filter(c => c.claim_type === 'test_result');
    const supportingObservations = allSupportingClaims.filter(c => c.claim_type === 'observation');
    
    // Build evidence anchors
    const evidenceAnchors: OpinionChain['evidenceAnchors'] = [];
    [...supportingFacts, ...supportingTestResults, ...supportingObservations].forEach(claim => {
      claim.citations?.forEach(cit => {
        const ev = evidence.find(e => e.id === cit.evidence_id);
        if (ev) {
          evidenceAnchors.push({ claim, evidence: ev, quote: cit.quote, page: cit.page });
        }
      });
    });
    
    // Calculate chain strength
    const gaps: string[] = [];
    if (supportingFacts.length === 0 && supportingTestResults.length === 0) {
      gaps.push('No factual claims or test results supporting this opinion');
    }
    if (evidenceAnchors.length === 0) {
      gaps.push('No direct evidence anchors in the chain');
    }
    if (supportingInferences.length > supportingFacts.length + supportingTestResults.length) {
      gaps.push('More inferences than factual support');
    }
    
    const chainStrength: 'strong' | 'moderate' | 'weak' = 
      gaps.length === 0 && evidenceAnchors.length >= 3 ? 'strong' :
      gaps.length <= 1 && evidenceAnchors.length >= 1 ? 'moderate' : 'weak';
    
    return {
      opinion,
      supportingInferences,
      supportingFacts,
      supportingTestResults,
      supportingObservations,
      evidenceAnchors,
      chainStrength,
      gaps,
    };
  };
  
  // Current chain
  const currentChain = selectedOpinion ? buildOpinionChain(selectedOpinion) : null;
  
  // Generate short narrative (for opinion section)
  const generateShortNarrative = (chain: OpinionChain): string => {
    const opinionText = chain.opinion.claim_text || chain.opinion.text || '';
    
    const parts: string[] = [];
    parts.push(`Opinion: ${opinionText}`);
    
    if (chain.supportingTestResults.length > 0) {
      const testSummary = chain.supportingTestResults.map(t => 
        (t.claim_text || t.text || '').slice(0, 50)
      ).join('; ');
      parts.push(`Based on test findings: ${testSummary}`);
    }
    
    if (chain.supportingFacts.length > 0) {
      const factSummary = chain.supportingFacts.slice(0, 2).map(f => 
        (f.claim_text || f.text || '').slice(0, 50)
      ).join('; ');
      parts.push(`Supported by records: ${factSummary}`);
    }
    
    if (chain.supportingObservations.length > 0) {
      parts.push(`Consistent with behavioral observations during evaluation`);
    }
    
    return parts.join('\n\n');
  };
  
  // Generate long narrative (for deposition prep)
  const generateLongNarrative = (chain: OpinionChain): string => {
    const lines: string[] = [];
    const opinionText = chain.opinion.claim_text || chain.opinion.text || '';
    
    lines.push('## OPINION CHAIN ANALYSIS\n');
    lines.push(`### Opinion Statement\n"${opinionText}"\n`);
    lines.push(`Confidence: ${chain.opinion.confidence || 'Not specified'}`);
    lines.push(`Chain Strength: ${chain.chainStrength.toUpperCase()}\n`);
    
    if (chain.gaps.length > 0) {
      lines.push('### Identified Gaps');
      chain.gaps.forEach(gap => lines.push(`- ${gap}`));
      lines.push('');
    }
    
    lines.push('### Supporting Evidence Chain\n');
    
    if (chain.supportingTestResults.length > 0) {
      lines.push('#### Test Results');
      chain.supportingTestResults.forEach((claim, i) => {
        lines.push(`${i + 1}. ${claim.claim_text || claim.text}`);
        if (claim.citations?.length) {
          claim.citations.forEach(cit => {
            const ev = evidence.find(e => e.id === cit.evidence_id);
            if (ev) {
              lines.push(`   - Source: ${ev.filename}${cit.page ? `, p. ${cit.page}` : ''}`);
              if (cit.quote) lines.push(`   - Quote: "${cit.quote}"`);
            }
          });
        }
      });
      lines.push('');
    }
    
    if (chain.supportingFacts.length > 0) {
      lines.push('#### Record Facts');
      chain.supportingFacts.forEach((claim, i) => {
        lines.push(`${i + 1}. ${claim.claim_text || claim.text}`);
        if (claim.citations?.length) {
          claim.citations.forEach(cit => {
            const ev = evidence.find(e => e.id === cit.evidence_id);
            if (ev) {
              lines.push(`   - Source: ${ev.filename}${cit.page ? `, p. ${cit.page}` : ''}`);
              if (cit.quote) lines.push(`   - Quote: "${cit.quote}"`);
            }
          });
        }
      });
      lines.push('');
    }
    
    if (chain.supportingObservations.length > 0) {
      lines.push('#### Behavioral Observations');
      chain.supportingObservations.forEach((claim, i) => {
        lines.push(`${i + 1}. ${claim.claim_text || claim.text}`);
      });
      lines.push('');
    }
    
    if (chain.supportingInferences.length > 0) {
      lines.push('#### Clinical Inferences');
      chain.supportingInferences.forEach((claim, i) => {
        lines.push(`${i + 1}. ${claim.claim_text || claim.text}`);
      });
      lines.push('');
    }
    
    lines.push('### Deposition Preparation Notes\n');
    lines.push('If asked about the basis for this opinion:');
    lines.push('1. Start with the factual/test result foundation');
    lines.push('2. Explain how observations corroborate');
    lines.push('3. Describe the inferential reasoning');
    lines.push('4. Acknowledge any limitations proactively');
    
    return lines.join('\n');
  };
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-white">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          Opinion Chain Explainer
        </h2>
        <p className="text-sm text-slate-500">
          Trace the reasoning from evidence to opinion
        </p>
      </div>
      
      {/* Opinion Selector */}
      <div className="p-3 border-b bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Select Opinion:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('short')}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'short' ? 'bg-orange-600 text-white' : 'bg-white border'
              }`}
            >
              Short (Report)
            </button>
            <button
              onClick={() => setViewMode('long')}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'long' ? 'bg-orange-600 text-white' : 'bg-white border'
              }`}
            >
              Long (Deposition)
            </button>
          </div>
        </div>
        <select
          value={selectedOpinion || ''}
          onChange={(e) => {
            setSelectedOpinion(e.target.value || null);
            onSelectOpinion?.(e.target.value);
          }}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">-- Select an opinion --</option>
          {opinions.map(opinion => (
            <option key={opinion.id} value={opinion.id}>
              {(opinion.claim_text || opinion.text || '').slice(0, 80)}...
            </option>
          ))}
        </select>
      </div>
      
      {/* Chain Visualization */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {!currentChain ? (
          <div className="text-center py-8 text-slate-500">
            <p>Select an opinion to see its supporting chain</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chain Strength Indicator */}
            <div className={`p-3 rounded-lg ${
              currentChain.chainStrength === 'strong' ? 'bg-green-50 border border-green-200' :
              currentChain.chainStrength === 'moderate' ? 'bg-amber-50 border border-amber-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Chain Strength</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  currentChain.chainStrength === 'strong' ? 'bg-green-200 text-green-800' :
                  currentChain.chainStrength === 'moderate' ? 'bg-amber-200 text-amber-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {currentChain.chainStrength.toUpperCase()}
                </span>
              </div>
              
              {currentChain.gaps.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  <p className="font-medium">Gaps:</p>
                  <ul className="list-disc list-inside">
                    {currentChain.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Visual Chain */}
            <div className="space-y-3">
              {/* Opinion */}
              <div className="p-3 bg-orange-100 border border-orange-300 rounded-lg">
                <div className="text-xs text-orange-600 font-medium mb-1">OPINION</div>
                <p className="text-sm text-slate-700">
                  {currentChain.opinion.claim_text || currentChain.opinion.text}
                </p>
              </div>
              
              {/* Arrow */}
              <div className="text-center text-slate-400">↑ supported by</div>
              
              {/* Inferences */}
              {currentChain.supportingInferences.length > 0 && (
                <>
                  <div className="grid gap-2">
                    {currentChain.supportingInferences.map(inference => (
                      <div key={inference.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-xs text-purple-600 font-medium mb-1">INFERENCE</div>
                        <p className="text-sm text-slate-700">
                          {inference.claim_text || inference.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-slate-400">↑ derived from</div>
                </>
              )}
              
              {/* Facts and Test Results */}
              <div className="grid gap-2">
                {currentChain.supportingTestResults.map(claim => (
                  <div key={claim.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-600 font-medium mb-1">TEST RESULT</div>
                    <p className="text-sm text-slate-700">
                      {claim.claim_text || claim.text}
                    </p>
                  </div>
                ))}
                {currentChain.supportingFacts.map(claim => (
                  <div key={claim.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-xs text-green-600 font-medium mb-1">RECORD FACT</div>
                    <p className="text-sm text-slate-700">
                      {claim.claim_text || claim.text}
                    </p>
                  </div>
                ))}
                {currentChain.supportingObservations.map(claim => (
                  <div key={claim.id} className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="text-xs text-teal-600 font-medium mb-1">OBSERVATION</div>
                    <p className="text-sm text-slate-700">
                      {claim.claim_text || claim.text}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Arrow */}
              <div className="text-center text-slate-400">↑ anchored to</div>
              
              {/* Evidence Anchors */}
              <div className="grid gap-2">
                {currentChain.evidenceAnchors.slice(0, 5).map((anchor, i) => (
                  <div key={i} className="p-3 bg-slate-100 border border-slate-300 rounded-lg">
                    <div className="text-xs text-slate-600 font-medium mb-1">EVIDENCE</div>
                    <p className="text-sm font-medium text-slate-700">
                      {anchor.evidence.filename}
                      {anchor.page && <span className="text-slate-500"> (p. {anchor.page})</span>}
                    </p>
                    {anchor.quote && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        "{anchor.quote.slice(0, 100)}..."
                      </p>
                    )}
                  </div>
                ))}
                {currentChain.evidenceAnchors.length > 5 && (
                  <p className="text-xs text-slate-500 text-center">
                    +{currentChain.evidenceAnchors.length - 5} more evidence anchors
                  </p>
                )}
              </div>
            </div>
            
            {/* Generated Narrative */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-700">
                  {viewMode === 'short' ? 'Report Narrative' : 'Deposition Prep Narrative'}
                </h3>
                <button
                  onClick={() => {
                    const text = viewMode === 'short' 
                      ? generateShortNarrative(currentChain)
                      : generateLongNarrative(currentChain);
                    navigator.clipboard.writeText(text);
                  }}
                  className="text-xs text-orange-600 hover:text-orange-800"
                >
                  Copy
                </button>
              </div>
              <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                {viewMode === 'short' 
                  ? generateShortNarrative(currentChain)
                  : generateLongNarrative(currentChain)
                }
              </pre>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t bg-orange-50">
        <p className="text-xs text-orange-700">
          A strong opinion chain has multiple evidence anchors and more facts than inferences.
        </p>
      </div>
    </div>
  );
}
