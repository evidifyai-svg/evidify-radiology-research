// ReaderPackPreview.tsx - Court-facing report preview with export
// Shows how the final Reader Pack will look to attorneys/judges

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================================================
// TYPES
// ============================================================================

interface Report {
  id: string;
  case_id: string;
  title: string;
  status: string;
  sections: ReportSection[];
  finalized_at?: string;
  created_at: string;
}

interface ReportSection {
  id: string;
  title: string;
  order: number;
  content?: string;
}

interface Claim {
  id: string;
  section_id: string;
  claim_type: string;
  text: string;
  status: string;
  citations: Citation[];
  verified: boolean;
}

interface Citation {
  id: string;
  evidence_id: string;
  excerpt: string;
  page?: number;
  citation_string: string;
}

interface Evidence {
  id: string;
  filename: string;
  evidence_type: string;
  bates_start?: string;
  bates_end?: string;
  relied_upon: boolean;
}

interface ValidationResult {
  court_ready: boolean;
  readiness_score: number;
  blockers: string[];
  warnings: string[];
  total_claims: number;
  supported_claims: number;
  unsupported_claims: number;
}

interface ApiResult<T> {
  status: 'success' | 'error';
  data?: T;
  error?: { code: string; message: string };
}

// ============================================================================
// CLAIM TYPE FORMATTING
// ============================================================================

const CLAIM_TYPE_LABELS: Record<string, string> = {
  record_fact: 'Record Fact',
  behavioral_observation: 'Behavioral Observation',
  test_result: 'Test Result',
  collateral_statement: 'Collateral Statement',
  self_report: 'Self Report',
  clinical_inference: 'Clinical Inference',
  diagnostic_conclusion: 'Diagnostic Conclusion',
  forensic_opinion: 'Forensic Opinion',
};

// ============================================================================
// READER PACK PREVIEW COMPONENT
// ============================================================================

interface ReaderPackPreviewProps {
  caseId: string;
  reportId: string;
  onClose: () => void;
  onExport?: () => void;
}

export function ReaderPackPreview({ caseId, reportId, onClose, onExport }: ReaderPackPreviewProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState(true);

  // Load report data
  useEffect(() => {
    loadReportData();
  }, [reportId]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load report
      const reportResult = await invoke<ApiResult<Report>>('forensic_get_report', {
        reportId,
      });
      if (reportResult.status === 'success' && reportResult.data) {
        setReport(reportResult.data);
      }

      // Load claims
      const claimsResult = await invoke<ApiResult<Claim[]>>('forensic_list_claims', {
        reportId,
      });
      if (claimsResult.status === 'success' && claimsResult.data) {
        setClaims(claimsResult.data);
      }

      // Load evidence
      const evidenceResult = await invoke<ApiResult<Evidence[]>>('forensic_list_evidence', {
        caseId,
      });
      if (evidenceResult.status === 'success' && evidenceResult.data) {
        setEvidence(evidenceResult.data);
      }

      // Validate report
      const validationResult = await invoke<ApiResult<ValidationResult>>('forensic_validate_report', {
        reportId,
      });
      if (validationResult.status === 'success' && validationResult.data) {
        setValidation(validationResult.data);
      }
    } catch (err) {
      setError(`Failed to load report data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await invoke<ApiResult<{ pack_path: string; zip_path?: string }>>('forensic_export_daubert_pack', {
        caseId,
        reportId,
        outputDir: '', // Use default
        packName: `reader-pack-${reportId}`,
        createZip: true,
      });

      if (result.status === 'success' && result.data) {
        alert(`✓ Reader Pack exported!\n\nLocation: ${result.data.zip_path || result.data.pack_path}`);
        onExport?.();
      } else {
        setError(result.error?.message || 'Export failed');
      }
    } catch (err) {
      setError(`Export failed: ${err}`);
    } finally {
      setExporting(false);
    }
  };

  // Get claims for a section
  const getSectionClaims = (sectionId: string) => {
    return claims.filter(c => c.section_id === sectionId);
  };

  // Get evidence by ID
  const getEvidence = (evidenceId: string) => {
    return evidence.find(e => e.id === evidenceId);
  };

  // Format citation for display
  const formatCitation = (citation: Citation): string => {
    const ev = getEvidence(citation.evidence_id);
    if (!ev) return citation.citation_string;
    
    if (ev.bates_start && citation.page) {
      return `${ev.bates_start}-${citation.page}`;
    }
    return `${ev.filename}${citation.page ? `, p. ${citation.page}` : ''}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Reader Pack preview...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-red-600 mb-4">Report not found</p>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-800">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex">
      {/* Preview Panel */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-white hover:text-gray-300">
              ← Back
            </button>
            <div>
              <h2 className="text-white font-semibold">Reader Pack Preview</h2>
              <p className="text-slate-400 text-sm">
                Court-facing report • {report.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white text-sm">
              <input
                type="checkbox"
                checked={showCitations}
                onChange={(e) => setShowCitations(e.target.checked)}
                className="rounded"
              />
              Show Citations
            </label>

            <button
              onClick={handleExport}
              disabled={exporting || !validation?.court_ready}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Exporting...
                </>
              ) : (
                <>📦 Export Reader Pack</>
              )}
            </button>
          </div>
        </div>

        {/* Validation Banner */}
        {validation && (
          <div className={`px-6 py-3 ${validation.court_ready ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`text-2xl ${validation.court_ready ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.court_ready ? '✓' : '✗'}
                </span>
                <div>
                  <p className={`font-medium ${validation.court_ready ? 'text-green-800' : 'text-red-800'}`}>
                    {validation.court_ready ? 'Court Ready' : 'Not Court Ready'}
                  </p>
                  <p className={`text-sm ${validation.court_ready ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.supported_claims}/{validation.total_claims} claims supported • 
                    {Math.round(validation.readiness_score)}% readiness score
                  </p>
                </div>
              </div>

              {validation.blockers.length > 0 && (
                <div className="text-sm text-red-700">
                  <strong>Blockers:</strong> {validation.blockers.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg border">
            {/* Report Header */}
            <div className="p-8 border-b">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">{report.title}</h1>
              <div className="text-sm text-slate-500 space-y-1">
                <p>Report ID: {report.id}</p>
                <p>Status: {report.status}</p>
                {report.finalized_at && <p>Finalized: {new Date(report.finalized_at).toLocaleDateString()}</p>}
              </div>
            </div>

            {/* Report Sections */}
            <div className="divide-y">
              {report.sections
                .sort((a, b) => a.order - b.order)
                .map(section => {
                  const sectionClaims = getSectionClaims(section.id);
                  
                  return (
                    <div key={section.id} className="p-8">
                      <h2 className="text-lg font-semibold text-slate-800 mb-4">{section.title}</h2>
                      
                      {section.content && (
                        <div className="prose prose-slate max-w-none mb-4">
                          {section.content.split('\n').map((para, i) => (
                            <p key={i} className="text-slate-700 leading-relaxed mb-2">{para}</p>
                          ))}
                        </div>
                      )}

                      {/* Section Claims */}
                      {sectionClaims.length > 0 && (
                        <div className="space-y-3 mt-4">
                          {sectionClaims.map(claim => (
                            <div
                              key={claim.id}
                              className={`p-4 rounded-lg border-l-4 ${
                                claim.status === 'supported'
                                  ? 'bg-green-50 border-green-500'
                                  : claim.status === 'needs_review'
                                  ? 'bg-yellow-50 border-yellow-500'
                                  : 'bg-red-50 border-red-500'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500 uppercase">
                                  {CLAIM_TYPE_LABELS[claim.claim_type] || claim.claim_type}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  claim.status === 'supported'
                                    ? 'bg-green-200 text-green-800'
                                    : claim.status === 'needs_review'
                                    ? 'bg-yellow-200 text-yellow-800'
                                    : 'bg-red-200 text-red-800'
                                }`}>
                                  {claim.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              <p className="text-slate-700">{claim.text}</p>
                              
                              {showCitations && claim.citations.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {claim.citations.map((cit, i) => (
                                    <span
                                      key={i}
                                      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono"
                                      title={cit.excerpt}
                                    >
                                      [{formatCitation(cit)}]
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Evidence Inventory */}
            <div className="p-8 bg-slate-50 border-t">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Evidence Relied Upon</h2>
              <div className="space-y-2">
                {evidence
                  .filter(e => e.relied_upon)
                  .map(e => (
                    <div key={e.id} className="flex items-center gap-4 text-sm">
                      <span className="text-purple-600">✓</span>
                      <span className="font-medium">{e.filename}</span>
                      {e.bates_start && (
                        <span className="text-slate-500 font-mono text-xs">
                          Bates: {e.bates_start}{e.bates_end ? ` - ${e.bates_end}` : ''}
                        </span>
                      )}
                      <span className="text-slate-400">{e.evidence_type.replace('_', ' ')}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Methodology Disclosure */}
            <div className="p-8 bg-purple-50 border-t">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Methodology & AI Disclosure</h2>
              <div className="prose prose-sm prose-slate max-w-none">
                <p>
                  This evaluation report was prepared using Evidify Forensic Edition, a documentation 
                  platform that assists clinicians with evidence organization, citation verification, 
                  and claim validation.
                </p>
                <p>
                  <strong>AI Assistance:</strong> AI-powered tools were used to assist with evidence 
                  retrieval and draft generation. All AI-generated content was reviewed and approved 
                  by the evaluating clinician. Clinical opinions and conclusions represent the 
                  professional judgment of the evaluator.
                </p>
                <p>
                  <strong>Citation Methodology:</strong> All factual claims are supported by citations 
                  to specific evidence with page-level anchors where available. The claim ledger 
                  provides full traceability from opinions to supporting evidence.
                </p>
                {validation && (
                  <p>
                    <strong>Validation Summary:</strong> {validation.supported_claims} of {validation.total_claims} claims 
                    are fully supported with citations. Court readiness score: {Math.round(validation.readiness_score)}%.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-500">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReaderPackPreview;
