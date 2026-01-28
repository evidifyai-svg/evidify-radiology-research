// ClaimDrawer.tsx - Shows claims with their citation status
// Part of Beta Blocker #4 - Promote-to-Claim UI

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================================================
// TYPES
// ============================================================================

interface Claim {
  id: string;
  section_id: string;
  claim_type: string;
  text: string;
  status: string;
  citations: string[];
  verified: boolean;
  override_attestation?: {
    rationale: string;
    attested_by: string;
    attested_at: string;
  };
}

interface ApiResult<T> {
  status: 'success' | 'error';
  data?: T;
  error?: { code: string; message: string };
}

// ============================================================================
// CLAIM TYPE STYLING
// ============================================================================

const CLAIM_TYPE_STYLES: Record<string, { icon: string; bg: string; border: string }> = {
  record_fact: { icon: '', bg: 'bg-blue-50', border: 'border-blue-300' },
  behavioral_observation: { icon: '', bg: 'bg-teal-50', border: 'border-teal-300' },
  test_result: { icon: '', bg: 'bg-purple-50', border: 'border-purple-300' },
  collateral_statement: { icon: '', bg: 'bg-green-50', border: 'border-green-300' },
  self_report: { icon: '', bg: 'bg-cyan-50', border: 'border-cyan-300' },
  clinical_inference: { icon: '', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  diagnostic_conclusion: { icon: '', bg: 'bg-rose-50', border: 'border-rose-300' },
  forensic_opinion: { icon: '', bg: 'bg-amber-50', border: 'border-amber-300' },
  ultimate_opinion: { icon: '', bg: 'bg-red-50', border: 'border-red-300' },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  supported: { label: 'Supported', bg: 'bg-green-100', text: 'text-green-700' },
  unsupported: { label: 'Unsupported', bg: 'bg-amber-100', text: 'text-amber-700' },
  needs_review: { label: 'Needs Review', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  overridden: { label: 'Overridden', bg: 'bg-blue-100', text: 'text-blue-700' },
  contradicted: { label: 'Contradicted', bg: 'bg-red-100', text: 'text-red-700' },
};

// ============================================================================
// CLAIM DRAWER COMPONENT
// ============================================================================

interface ClaimDrawerProps {
  reportId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onJumpToCitation?: (evidenceId: string, page: number) => void;
}

export function ClaimDrawer({ reportId, isOpen, onClose, onJumpToCitation }: ClaimDrawerProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'supported' | 'unsupported' | 'opinions'>('all');
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  // Load claims
  useEffect(() => {
    if (reportId && isOpen) {
      loadClaims();
    }
  }, [reportId, isOpen]);

  const loadClaims = async () => {
    if (!reportId) return;
    
    setLoading(true);
    try {
      const result = await invoke<ApiResult<Claim[]>>('forensic_list_claims', {
        reportId,
      });
      if (result.status === 'success' && result.data) {
        setClaims(result.data);
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter claims
  const filteredClaims = claims.filter(claim => {
    switch (filter) {
      case 'supported':
        return claim.status === 'supported';
      case 'unsupported':
        return claim.status === 'unsupported' || claim.status === 'needs_review';
      case 'opinions':
        return claim.claim_type === 'forensic_opinion' || 
               claim.claim_type === 'ultimate_opinion' ||
               claim.claim_type === 'diagnostic_conclusion';
      default:
        return true;
    }
  });

  // Stats
  const stats = {
    total: claims.length,
    supported: claims.filter(c => c.status === 'supported').length,
    unsupported: claims.filter(c => c.status === 'unsupported' || c.status === 'needs_review').length,
    opinions: claims.filter(c => 
      c.claim_type === 'forensic_opinion' || 
      c.claim_type === 'ultimate_opinion'
    ).length,
    orphanedOpinions: claims.filter(c => 
      (c.claim_type === 'forensic_opinion' || c.claim_type === 'ultimate_opinion') &&
      c.status !== 'supported' && !c.override_attestation
    ).length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl border-l z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Claim Ledger</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"></button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 bg-white rounded">
            <div className="text-lg font-bold text-slate-700">{stats.total}</div>
            <div className="text-slate-500">Total</div>
          </div>
          <div className="p-2 bg-white rounded">
            <div className="text-lg font-bold text-green-600">{stats.supported}</div>
            <div className="text-slate-500">Cited</div>
          </div>
          <div className="p-2 bg-white rounded">
            <div className="text-lg font-bold text-amber-600">{stats.unsupported}</div>
            <div className="text-slate-500">Uncited</div>
          </div>
          <div className="p-2 bg-white rounded">
            <div className={`text-lg font-bold ${stats.orphanedOpinions > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.orphanedOpinions}
            </div>
            <div className="text-slate-500">Orphaned</div>
          </div>
        </div>

        {/* Orphaned Opinion Warning */}
        {stats.orphanedOpinions > 0 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
             {stats.orphanedOpinions} opinion(s) without citation chain. Export will be blocked.
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-2 border-b flex gap-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'supported', label: 'Cited' },
          { id: 'unsupported', label: 'Uncited' },
          { id: 'opinions', label: 'Opinions' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`px-3 py-1 rounded text-xs ${
              filter === f.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Claims List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            {filter === 'all' ? 'No claims yet' : 'No matching claims'}
          </div>
        ) : (
          filteredClaims.map(claim => {
            const typeStyle = CLAIM_TYPE_STYLES[claim.claim_type] || 
                             { icon: '', bg: 'bg-gray-50', border: 'border-gray-300' };
            const statusStyle = STATUS_STYLES[claim.status] || 
                               { label: claim.status, bg: 'bg-gray-100', text: 'text-gray-700' };
            const isExpanded = expandedClaim === claim.id;

            return (
              <div
                key={claim.id}
                className={`rounded-lg border ${typeStyle.border} ${typeStyle.bg} overflow-hidden`}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedClaim(isExpanded ? null : claim.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeStyle.icon}</span>
                      <span className="text-xs font-medium text-slate-600 capitalize">
                        {claim.claim_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 line-clamp-2">
                    {claim.text}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">
                      {claim.citations.length} citation(s)
                    </span>
                    <span className="text-xs text-slate-400">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-white p-3 space-y-3">
                    {/* Full Text */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Full Claim</p>
                      <p className="text-sm text-slate-700">{claim.text}</p>
                    </div>

                    {/* Citations */}
                    {claim.citations.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Citations</p>
                        <div className="space-y-1">
                          {claim.citations.map((cit, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                // Parse citation and jump (simplified)
                                // In production, would extract evidence_id and page
                              }}
                              className="w-full text-left text-xs p-2 bg-slate-50 rounded hover:bg-slate-100"
                            >
                              {cit}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Override Attestation */}
                    {claim.override_attestation && (
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-700 font-medium mb-1">Override Attestation</p>
                        <p className="text-xs text-blue-600">{claim.override_attestation.rationale}</p>
                        <p className="text-xs text-blue-500 mt-1">
                          — {claim.override_attestation.attested_by}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {claim.status !== 'supported' && !claim.override_attestation && (
                        <button
                          className="flex-1 text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Add Citation
                        </button>
                      )}
                      {(claim.claim_type === 'forensic_opinion' || claim.claim_type === 'ultimate_opinion') &&
                       claim.status !== 'supported' && !claim.override_attestation && (
                        <button
                          className="flex-1 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                        >
                          Override
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-slate-50">
        <button
          onClick={loadClaims}
          className="w-full py-2 text-sm text-purple-600 hover:text-purple-800"
        >
          ↻ Refresh Claims
        </button>
      </div>
    </div>
  );
}

export default ClaimDrawer;
