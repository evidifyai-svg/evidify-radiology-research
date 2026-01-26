// DiscoverabilityPanel.tsx - Shows what exists and what can be produced
// Part of Beta Blocker #4 - Discoverability UI

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================================================
// TYPES
// ============================================================================

interface LedgerEntry {
  id: string;
  case_id: string;
  report_id?: string;
  artifact_type: string;
  description: string;
  content_hash?: string;
  size_bytes?: number;
  discoverability: string;
  retention_status: string;
  retention_policy: string;
  purge_after?: string;
  created_at: string;
}

interface PurgeTombstone {
  id: string;
  ledger_entry_id: string;
  artifact_type: string;
  content_hash: string;
  purge_reason: string;
  purged_by: string;
  purged_at: string;
  tombstone_hash: string;
}

interface DiscoverabilityLedger {
  case_id: string;
  report_id?: string;
  provenance_mode: string;
  provenance_locked: boolean;
  entries: LedgerEntry[];
  tombstones: PurgeTombstone[];
  generated_at: string;
  ledger_hash: string;
}

interface ApiResult<T> {
  status: 'success' | 'error';
  data?: T;
  error?: { code: string; message: string };
}

// ============================================================================
// ARTIFACT TYPE STYLING
// ============================================================================

const ARTIFACT_STYLES: Record<string, { icon: string; label: string }> = {
  FinalReport: { icon: '📄', label: 'Final Report' },
  Draft: { icon: '📝', label: 'Draft' },
  GenerationRun: { icon: '🤖', label: 'Generation Run' },
  Prompt: { icon: '💬', label: 'AI Prompt' },
  Response: { icon: '💭', label: 'AI Response' },
  Annotation: { icon: '📌', label: 'Annotation' },
  Claim: { icon: '📋', label: 'Claim' },
  ClaimGraph: { icon: '🕸️', label: 'Claim Graph' },
  AttackSurface: { icon: '🛡️', label: 'Attack Surface' },
  Evidence: { icon: '📎', label: 'Evidence' },
  ChainOfCustody: { icon: '🔗', label: 'Chain of Custody' },
  AuditLog: { icon: '📊', label: 'Audit Log' },
  NetworkSession: { icon: '🌐', label: 'Network Session' },
  OverrideAttestation: { icon: '✍️', label: 'Override Attestation' },
};

const DISCOVERABILITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  discoverable: { bg: 'bg-green-100', text: 'text-green-700', label: 'Discoverable' },
  work_product: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Work Product' },
  privileged: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Privileged' },
  internal: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Internal' },
  not_available: { bg: 'bg-red-100', text: 'text-red-700', label: 'Purged' },
};

const RETENTION_STYLES: Record<string, { bg: string; text: string }> = {
  retained: { bg: 'bg-green-100', text: 'text-green-700' },
  pending_purge: { bg: 'bg-amber-100', text: 'text-amber-700' },
  purged: { bg: 'bg-red-100', text: 'text-red-700' },
  locked: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

// ============================================================================
// DISCOVERABILITY PANEL COMPONENT
// ============================================================================

interface DiscoverabilityPanelProps {
  caseId: string;
  reportId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DiscoverabilityPanel({ caseId, reportId, isOpen, onClose }: DiscoverabilityPanelProps) {
  const [ledger, setLedger] = useState<DiscoverabilityLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'discoverable' | 'purged'>('all');
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeTypes, setPurgeTypes] = useState<string[]>([]);

  // Load ledger
  useEffect(() => {
    if (caseId && isOpen) {
      loadLedger();
    }
  }, [caseId, reportId, isOpen]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const result = await invoke<ApiResult<DiscoverabilityLedger>>('forensic_get_discoverability_ledger', {
        caseId,
        reportId: reportId || null,
      });
      if (result.status === 'success' && result.data) {
        setLedger(result.data);
      } else {
        setError(result.error?.message || 'Failed to load ledger');
      }
    } catch (err) {
      setError(`Failed to load ledger: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const executePurge = async () => {
    if (purgeTypes.length === 0) return;

    setLoading(true);
    try {
      const result = await invoke<ApiResult<{ id: string }>>('forensic_purge_artifacts', {
        input: {
          case_id: caseId,
          report_id: reportId || null,
          artifact_types: purgeTypes,
          purge_reason: 'Per retention policy',
          policy_reference: 'forensic_minimal',
        },
        userId: 'clinician-1',
      });

      if (result.status === 'success') {
        setShowPurgeModal(false);
        setPurgeTypes([]);
        loadLedger(); // Refresh
      } else {
        setError(result.error?.message || 'Failed to purge');
      }
    } catch (err) {
      setError(`Failed to purge: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter entries
  const filteredEntries = ledger?.entries.filter(entry => {
    switch (view) {
      case 'discoverable':
        return entry.discoverability === 'discoverable';
      case 'purged':
        return entry.retention_status === 'purged';
      default:
        return true;
    }
  }) || [];

  // Stats
  const stats = {
    total: ledger?.entries.length || 0,
    discoverable: ledger?.entries.filter(e => e.discoverability === 'discoverable').length || 0,
    workProduct: ledger?.entries.filter(e => e.discoverability === 'work_product').length || 0,
    purged: ledger?.tombstones.length || 0,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Discoverability Ledger</h2>
            <p className="text-sm text-slate-500">
              What exists, what can be produced, what was purged
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {/* Provenance Status */}
        {ledger && (
          <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  ledger.provenance_mode === 'Full' ? 'bg-blue-500' : 'bg-amber-500'
                }`} />
                <span className="text-sm text-slate-600">
                  Provenance: <span className="font-medium">{ledger.provenance_mode}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  ledger.provenance_locked ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-slate-600">
                  {ledger.provenance_locked ? 'Locked' : 'Unlocked'}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Hash: {ledger.ledger_hash.slice(0, 16)}...
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 py-3 border-b grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
            <div className="text-xs text-slate-500">Total Artifacts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.discoverable}</div>
            <div className="text-xs text-slate-500">Discoverable</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.workProduct}</div>
            <div className="text-xs text-slate-500">Work Product</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.purged}</div>
            <div className="text-xs text-slate-500">Purged</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Artifacts' },
              { id: 'discoverable', label: 'Discoverable Only' },
              { id: 'purged', label: 'Purged Items' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as typeof view)}
                className={`px-3 py-1 rounded text-sm ${
                  view === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {!ledger?.provenance_locked && (
            <button
              onClick={() => setShowPurgeModal(true)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              Purge Artifacts
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading ledger...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : view === 'purged' ? (
            // Purged Items (Tombstones)
            <div className="space-y-2">
              {ledger?.tombstones.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No items have been purged</p>
              ) : (
                ledger?.tombstones.map(tombstone => (
                  <div
                    key={tombstone.id}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {ARTIFACT_STYLES[tombstone.artifact_type]?.icon || '📦'}
                        </span>
                        <span className="font-medium text-slate-700">
                          {ARTIFACT_STYLES[tombstone.artifact_type]?.label || tombstone.artifact_type}
                        </span>
                      </div>
                      <span className="text-xs text-red-600">PURGED</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{tombstone.purge_reason}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>By: {tombstone.purged_by}</span>
                      <span>Hash: {tombstone.tombstone_hash.slice(0, 12)}...</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Active Entries
            <div className="space-y-2">
              {filteredEntries.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No artifacts found</p>
              ) : (
                filteredEntries.map(entry => {
                  const artifactStyle = ARTIFACT_STYLES[entry.artifact_type] || 
                                        { icon: '📦', label: entry.artifact_type };
                  const discStyle = DISCOVERABILITY_STYLES[entry.discoverability] || 
                                    { bg: 'bg-gray-100', text: 'text-gray-700', label: entry.discoverability };
                  const retStyle = RETENTION_STYLES[entry.retention_status] || 
                                   { bg: 'bg-gray-100', text: 'text-gray-700' };

                  return (
                    <div
                      key={entry.id}
                      className="p-3 bg-white border rounded-lg hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{artifactStyle.icon}</span>
                          <span className="font-medium text-slate-700">{artifactStyle.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${discStyle.bg} ${discStyle.text}`}>
                            {discStyle.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${retStyle.bg} ${retStyle.text}`}>
                            {entry.retention_status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{entry.description}</p>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Policy: {entry.retention_policy}</span>
                        {entry.content_hash && (
                          <span className="font-mono">#{entry.content_hash.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Generated: {ledger?.generated_at ? new Date(ledger.generated_at).toLocaleString() : '—'}
          </div>
          <button
            onClick={loadLedger}
            className="px-4 py-2 text-sm text-purple-600 hover:text-purple-800"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Purge Artifacts
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Select artifact types to purge. This action creates tombstones and cannot be undone.
            </p>

            <div className="space-y-2 mb-4">
              {['Draft', 'Prompt', 'Response', 'GenerationRun', 'Annotation'].map(type => (
                <label key={type} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={purgeTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPurgeTypes([...purgeTypes, type]);
                      } else {
                        setPurgeTypes(purgeTypes.filter(t => t !== type));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-lg">{ARTIFACT_STYLES[type]?.icon}</span>
                  <span className="text-sm text-slate-700">{ARTIFACT_STYLES[type]?.label || type}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeTypes([]);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={executePurge}
                disabled={purgeTypes.length === 0 || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300"
              >
                {loading ? 'Purging...' : `Purge ${purgeTypes.length} Type(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscoverabilityPanel;
