// ClaimLedgerView.tsx - The forensic claim ledger
// Shows every claim with its type, citations, corroboration, contradictions, and vulnerabilities
// This is the "single most forensic-native object in the system"

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES - Compatible with App.tsx types
// ============================================================================

interface Citation {
  evidence_id: string;
  excerpt: string;
  page?: number;
  verified?: boolean;
}

interface Claim {
  id: string;
  claim_text?: string;  // New style
  text?: string;        // Old style
  claim_type: string;
  section_id: string;
  citations: Citation[] | string[];  // Accept both formats
  confidence?: 'low' | 'medium' | 'high';
  created_at?: string;
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
}

interface Contradiction {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  type: string;
  resolution_status: 'unresolved' | 'resolved' | 'partially_resolved';
  description?: string;
}

interface ReportSection {
  id: string;
  title: string;
}

interface ClaimLedgerViewProps {
  claims: Claim[];
  evidence: EvidenceItem[];
  sections: ReportSection[];
  contradictions?: Contradiction[];
  onClaimClick?: (claim: Claim) => void;
  onAddCitation?: (claimId: string) => void;
}

// ============================================================================
// CLAIM TYPE STYLING
// ============================================================================

const CLAIM_TYPE_STYLES: Record<string, { label: string; icon: string; color: string }> = {
  record_fact: { 
    label: 'Record Fact', 
    icon: '📄', 
    color: 'bg-blue-100 text-blue-700 border-blue-200' 
  },
  self_report: { 
    label: 'Self-Report', 
    icon: '💬', 
    color: 'bg-amber-100 text-amber-700 border-amber-200' 
  },
  collateral: { 
    label: 'Collateral', 
    icon: '👥', 
    color: 'bg-purple-100 text-purple-700 border-purple-200' 
  },
  observation: { 
    label: 'Observation', 
    icon: '👁️', 
    color: 'bg-teal-100 text-teal-700 border-teal-200' 
  },
  test_result: { 
    label: 'Test Result', 
    icon: '📊', 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200' 
  },
  inference: { 
    label: 'Inference', 
    icon: '🔍', 
    color: 'bg-orange-100 text-orange-700 border-orange-200' 
  },
  forensic_opinion: { 
    label: 'Opinion', 
    icon: '⚖️', 
    color: 'bg-red-100 text-red-700 border-red-200' 
  },
  limitation: { 
    label: 'Limitation', 
    icon: '⚠️', 
    color: 'bg-gray-100 text-gray-700 border-gray-200' 
  },
  method: { 
    label: 'Method', 
    icon: '🔬', 
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200' 
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ClaimLedgerView({
  claims,
  evidence,
  sections,
  contradictions = [],
  onClaimClick,
  onAddCitation,
}: ClaimLedgerViewProps) {
  const [filter, setFilter] = useState<'all' | 'cited' | 'uncited' | 'contradicted'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'type' | 'section' | 'citations'>('section');
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
  
  // Helper to get claim text (supports both formats)
  // NOTE: previously this function called itself recursively, which would hang the UI.
  const getClaimText = (claim: Claim): string => {
    // claim_text is the canonical field used across forensic components
    // text exists in some older/demo shapes
    return (claim.claim_text || claim.text || '').toString();
  };
  
  // Helper to get citations count (supports both formats)
  // NOTE: previously this function called itself recursively, which would hang the UI.
  const getCitationsCount = (claim: Claim): number => {
    if (!claim.citations) return 0;
    return claim.citations.length || 0;
  };
  
  // Helper to check if citations is object array
  const getCitationsAsObjects = (claim: Claim): Citation[] => {
    if (!claim.citations || getCitationsCount(claim) === 0) return [];
    if (typeof claim.citations[0] === 'string') {
      // Convert string array to object array
      return (claim.citations as string[]).map(id => ({
        evidence_id: id,
        excerpt: '',
      }));
    }
    return claim.citations as Citation[];
  };
  
  // Get evidence filename by ID
  const getEvidenceName = (evidenceId: string): string => {
    return evidence.find(e => e.id === evidenceId)?.filename || 'Unknown';
  };
  
  // Get section title by ID
  const getSectionName = (sectionId: string): string => {
    return sections.find(s => s.id === sectionId)?.title || 'Unassigned';
  };
  
  // Check if claim has contradictions
  const getClaimContradictions = (claimId: string): Contradiction[] => {
    return contradictions.filter(c => 
      c.claim_a_id === claimId || c.claim_b_id === claimId
    );
  };
  
  // Filter and sort claims
  const filteredClaims = useMemo(() => {
    let result = [...claims];
    
    // Apply status filter
    switch (filter) {
      case 'cited':
        result = result.filter(c => c.citations.length > 0);
        break;
      case 'uncited':
        result = result.filter(c => c.citations.length === 0);
        break;
      case 'contradicted':
        result = result.filter(c => getClaimContradictions(c.id).length > 0);
        break;
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(c => c.claim_type === typeFilter);
    }
    
    // Sort
    switch (sortBy) {
      case 'type':
        result.sort((a, b) => a.claim_type.localeCompare(b.claim_type));
        break;
      case 'section':
        result.sort((a, b) => getSectionName(a.section_id).localeCompare(getSectionName(b.section_id)));
        break;
      case 'citations':
        result.sort((a, b) => b.citations.length - a.citations.length);
        break;
    }
    
    return result;
  }, [claims, filter, typeFilter, sortBy, contradictions]);
  
  // Summary stats
  const stats = useMemo(() => ({
    total: claims.length,
    cited: claims.filter(c => c.citations.length > 0).length,
    uncited: claims.filter(c => c.citations.length === 0).length,
    contradicted: claims.filter(c => getClaimContradictions(c.id).length > 0).length,
    opinions: claims.filter(c => c.claim_type === 'forensic_opinion').length,
  }), [claims, contradictions]);
  
  // Unique claim types for filter
  const claimTypes = useMemo(() => {
    const types = new Set(claims.map(c => c.claim_type));
    return Array.from(types).sort();
  }, [claims]);
  
  const toggleExpanded = (claimId: string) => {
    const newExpanded = new Set(expandedClaims);
    if (newExpanded.has(claimId)) {
      newExpanded.delete(claimId);
    } else {
      newExpanded.add(claimId);
    }
    setExpandedClaims(newExpanded);
  };
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            📋 Claim Ledger
            <span className="text-sm font-normal text-slate-500">
              ({stats.total} claims)
            </span>
          </h2>
        </div>
        
        {/* Stats Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-slate-700 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('cited')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'cited' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            ✓ Cited ({stats.cited})
          </button>
          <button
            onClick={() => setFilter('uncited')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'uncited' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            ⚠ Uncited ({stats.uncited})
          </button>
          <button
            onClick={() => setFilter('contradicted')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'contradicted' 
                ? 'bg-amber-600 text-white' 
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            ⚡ Contradicted ({stats.contradicted})
          </button>
        </div>
        
        {/* Filters Row */}
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-slate-500">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="all">All Types</option>
              {claimTypes.map(type => (
                <option key={type} value={type}>
                  {CLAIM_TYPE_STYLES[type]?.label || type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="section">By Section</option>
              <option value="type">By Type</option>
              <option value="citations">By Citations</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Claims Table */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredClaims.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-lg mb-2">No claims match your filters</p>
            <p className="text-sm">Try adjusting your filter criteria</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Claim</th>
                <th className="px-4 py-2 font-medium">Section</th>
                <th className="px-4 py-2 font-medium text-center">Citations</th>
                <th className="px-4 py-2 font-medium text-center">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClaims.map((claim) => {
                const claimContradictions = getClaimContradictions(claim.id);
                const style = CLAIM_TYPE_STYLES[claim.claim_type] || {
                  label: claim.claim_type,
                  icon: '📝',
                  color: 'bg-gray-100 text-gray-700 border-gray-200'
                };
                const isExpanded = expandedClaims.has(claim.id);
                
                return (
                  <tr 
                    key={claim.id}
                    className={`hover:bg-slate-50 cursor-pointer ${
                      getCitationsCount(claim) === 0 ? 'bg-red-50/30' : ''
                    } ${
                      claimContradictions.length > 0 ? 'bg-amber-50/30' : ''
                    }`}
                    onClick={() => toggleExpanded(claim.id)}
                  >
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${style.color}`}>
                        <span>{style.icon}</span>
                        <span className="hidden sm:inline">{style.label}</span>
                      </span>
                    </td>
                    
                    {/* Claim Text */}
                    <td className="px-4 py-3">
                      <p className={`text-sm text-slate-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {getClaimText(claim)}
                      </p>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {/* Citations */}
                          {getCitationsCount(claim) > 0 && (
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-xs font-medium text-green-700 mb-1">
                                📎 Citations ({getCitationsCount(claim)})
                              </p>
                              {getCitationsAsObjects(claim).map((cit, i) => (
                                <div key={i} className="text-xs text-green-600 ml-2">
                                  • {getEvidenceName(cit.evidence_id)}
                                  {cit.page && ` (p. ${cit.page})`}
                                  {cit.excerpt && (
                                    <span className="text-green-500 italic ml-1">
                                      "{cit.excerpt.slice(0, 50)}..."
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Contradictions */}
                          {claimContradictions.length > 0 && (
                            <div className="bg-amber-50 rounded p-2">
                              <p className="text-xs font-medium text-amber-700 mb-1">
                                ⚡ Contradictions ({claimContradictions.length})
                              </p>
                              {claimContradictions.map((cont) => (
                                <div key={cont.id} className="text-xs text-amber-600 ml-2">
                                  • {cont.type} ({cont.resolution_status})
                                  {cont.description && `: ${cont.description}`}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Confidence */}
                          {claim.confidence && (
                            <div className="text-xs">
                              <span className="text-slate-500">Confidence:</span>{' '}
                              <span className={`font-medium ${
                                claim.confidence === 'high' ? 'text-green-600' :
                                claim.confidence === 'medium' ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {claim.confidence.charAt(0).toUpperCase() + claim.confidence.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    {/* Section */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {getSectionName(claim.section_id)}
                      </span>
                    </td>
                    
                    {/* Citations Count */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        getCitationsCount(claim) > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {getCitationsCount(claim)}
                      </span>
                    </td>
                    
                    {/* Status Icons */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getCitationsCount(claim) === 0 && (
                          <span className="text-red-500" title="Uncited - needs citation">
                            ⚠️
                          </span>
                        )}
                        {claimContradictions.length > 0 && (
                          <span className="text-amber-500" title="Has contradictions">
                            ⚡
                          </span>
                        )}
                        {getCitationsCount(claim) > 0 && claimContradictions.length === 0 && (
                          <span className="text-green-500" title="Cited and clear">
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {getCitationsCount(claim) === 0 && onAddCitation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddCitation(claim.id);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            + Add Citation
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClaimClick?.(claim);
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Footer */}
      {stats.uncited > 0 && (
        <div className="p-3 bg-red-50 border-t">
          <p className="text-xs text-red-700">
            ⚠️ <strong>{stats.uncited} claim{stats.uncited > 1 ? 's' : ''}</strong> without citations. 
            Factual claims require citation anchors for court defensibility.
          </p>
        </div>
      )}
    </div>
  );
}
