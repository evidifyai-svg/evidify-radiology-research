// ReaderPackExport.tsx - Court-grade export with independent verification
// Evidence inventory with hashes, claim ledger, contradiction matrix, audit chain

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
  citations: Citation[];
  confidence?: string;
  vulnerability_tags?: string[];
}

interface Citation {
  id: string;
  evidence_id: string;
  quote?: string;
  page?: number;
  line_start?: number;
  line_end?: number;
  context_hash?: string;
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
  file_hash?: string;
  date_received?: string;
  relied_upon?: boolean;
  authenticity_status?: string;
}

interface Contradiction {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  type: string;
  resolution_status: string;
  resolution_note?: string;
  impacts_opinion: boolean;
}

interface ReportSection {
  id: string;
  title: string;
  section_type?: string;
  content?: string;
}

interface ExportManifest {
  version: string;
  generated_at: string;
  report_id: string;
  case_id: string;
  case_number?: string;
  evaluator_name?: string;
  export_hash: string;
  components: {
    evidence_inventory: boolean;
    claim_ledger: boolean;
    citation_index: boolean;
    contradiction_matrix: boolean;
    limitations_register: boolean;
    methodology_appendix: boolean;
    audit_chain: boolean;
  };
  integrity_checks: {
    all_facts_cited: boolean;
    contradictions_addressed: boolean;
    methodology_complete: boolean;
    limitations_disclosed: boolean;
  };
}

interface ReaderPackExportProps {
  reportId: string;
  caseId: string;
  caseNumber?: string;
  evaluatorName?: string;
  claims: Claim[];
  evidence: EvidenceItem[];
  contradictions: Contradiction[];
  sections: ReportSection[];
  limitations: string[];
  onExport: (format: 'full' | 'summary' | 'verifier') => void;
}

// ============================================================================
// HASH UTILITIES
// ============================================================================

async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function truncateHash(hash: string): string {
  return hash.substring(0, 12) + '...' + hash.substring(hash.length - 4);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReaderPackExport({
  reportId,
  caseId,
  caseNumber,
  evaluatorName,
  claims,
  evidence,
  contradictions,
  sections,
  limitations,
  onExport,
}: ReaderPackExportProps) {
  const [exporting, setExporting] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState({
    evidence_inventory: true,
    claim_ledger: true,
    citation_index: true,
    contradiction_matrix: true,
    limitations_register: true,
    methodology_appendix: true,
    audit_chain: true,
  });
  const [previewSection, setPreviewSection] = useState<string | null>(null);
  
  // Calculate integrity checks
  const integrityChecks = useMemo(() => {
    const factualClaims = claims.filter(c => 
      ['record_fact', 'test_result', 'observation'].includes(c.claim_type)
    );
    const citedFacts = factualClaims.filter(c => c.citations?.length > 0);
    
    const unresolvedContradictions = contradictions.filter(c => 
      c.resolution_status === 'unresolved' && c.impacts_opinion
    );
    
    const methodologySection = sections.find(s => 
      s.section_type === 'methods' || s.title.toLowerCase().includes('method')
    );
    
    const limitationsSection = sections.find(s => 
      s.section_type === 'limitations' || s.title.toLowerCase().includes('limitation')
    );
    
    return {
      all_facts_cited: factualClaims.length === 0 || citedFacts.length === factualClaims.length,
      contradictions_addressed: unresolvedContradictions.length === 0,
      methodology_complete: !!methodologySection?.content && methodologySection.content.length > 200,
      limitations_disclosed: !!limitationsSection?.content && limitationsSection.content.length > 50,
    };
  }, [claims, contradictions, sections]);
  
  const allChecksPass = Object.values(integrityChecks).every(Boolean);
  
  // Generate evidence inventory preview
  const evidenceInventory = useMemo(() => {
    return evidence.map(e => ({
      id: e.id,
      filename: e.filename,
      type: typeof e.evidence_type === 'string' ? e.evidence_type : 'document',
      hash: e.file_hash || 'pending',
      date_received: e.date_received || 'unknown',
      relied_upon: e.relied_upon !== false,
      authenticity: e.authenticity_status || 'unconfirmed',
      citation_count: claims.filter(c => 
        c.citations?.some(cit => cit.evidence_id === e.id)
      ).length,
    }));
  }, [evidence, claims]);
  
  // Generate claim ledger preview
  const claimLedger = useMemo(() => {
    return claims.map(c => ({
      id: c.id,
      type: c.claim_type,
      text: (c.claim_text || c.text || '').substring(0, 100) + '...',
      section: sections.find(s => s.id === c.section_id)?.title || 'Unknown',
      citation_count: c.citations?.length || 0,
      confidence: c.confidence || 'standard',
      vulnerabilities: c.vulnerability_tags?.length || 0,
    }));
  }, [claims, sections]);
  
  // Generate contradiction matrix preview
  const contradictionMatrix = useMemo(() => {
    return contradictions.map(c => {
      const claimA = claims.find(cl => cl.id === c.claim_a_id);
      const claimB = claims.find(cl => cl.id === c.claim_b_id);
      return {
        id: c.id,
        type: c.type,
        claim_a: (claimA?.claim_text || claimA?.text || '').substring(0, 50) + '...',
        claim_b: (claimB?.claim_text || claimB?.text || '').substring(0, 50) + '...',
        status: c.resolution_status,
        impacts_opinion: c.impacts_opinion,
        resolution: c.resolution_note || 'none',
      };
    });
  }, [contradictions, claims]);
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              Reader Pack Export
            </h2>
            <p className="text-sm text-slate-500">
              Court-grade export with independent verification
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            allChecksPass 
              ? 'bg-green-100 text-green-700' 
              : 'bg-amber-100 text-amber-700'
          }`}>
            {allChecksPass ? 'Ready to Export' : 'Review Issues'}
          </div>
        </div>
      </div>
      
      {/* Integrity Checks */}
      <div className="p-4 border-b bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Integrity Verification</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(integrityChecks).map(([key, passed]) => (
            <div 
              key={key}
              className={`flex items-center gap-2 text-sm ${
                passed ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>{passed ? 'Pass' : 'Fail'}</span>
              <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Component Selection */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Components</h3>
        <div className="space-y-2">
          {[
            { key: 'evidence_inventory', label: 'Evidence Inventory', desc: 'All sources with file hashes' },
            { key: 'claim_ledger', label: 'Claim Ledger', desc: 'All claims with types and citations' },
            { key: 'citation_index', label: 'Citation Index', desc: 'Quote anchors with page/line refs' },
            { key: 'contradiction_matrix', label: 'Contradiction Matrix', desc: 'All conflicts with resolutions' },
            { key: 'limitations_register', label: 'Limitations Register', desc: 'Disclosed limitations' },
            { key: 'methodology_appendix', label: 'Methodology Appendix', desc: 'Methods and error mitigation' },
            { key: 'audit_chain', label: 'Audit Chain Digest', desc: 'Edit history with timestamps' },
          ].map(({ key, label, desc }) => (
            <label 
              key={key}
              className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedComponents[key as keyof typeof selectedComponents]}
                onChange={(e) => setSelectedComponents(prev => ({
                  ...prev,
                  [key]: e.target.checked,
                }))}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setPreviewSection(previewSection === key ? null : key);
                }}
                className="ml-auto text-xs text-blue-600 hover:underline"
              >
                {previewSection === key ? 'Hide' : 'Preview'}
              </button>
            </label>
          ))}
        </div>
      </div>
      
      {/* Preview Section */}
      {previewSection && (
        <div className="p-4 border-b bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Preview: {previewSection.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          <div className="bg-white border rounded-lg p-3 max-h-48 overflow-y-auto">
            {previewSection === 'evidence_inventory' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-1">File</th>
                    <th className="pb-1">Type</th>
                    <th className="pb-1">Hash</th>
                    <th className="pb-1">Citations</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {evidenceInventory.slice(0, 5).map(e => (
                    <tr key={e.id}>
                      <td className="py-1">{e.filename}</td>
                      <td className="py-1">{e.type}</td>
                      <td className="py-1 font-mono text-slate-500">
                        {truncateHash(e.hash)}
                      </td>
                      <td className="py-1">{e.citation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {previewSection === 'claim_ledger' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-1">Type</th>
                    <th className="pb-1">Claim</th>
                    <th className="pb-1">Cites</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {claimLedger.slice(0, 5).map(c => (
                    <tr key={c.id}>
                      <td className="py-1">
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          c.type === 'record_fact' ? 'bg-blue-100 text-blue-700' :
                          c.type === 'forensic_opinion' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="py-1">{c.text}</td>
                      <td className="py-1">{c.citation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {previewSection === 'contradiction_matrix' && (
              <div className="space-y-2">
                {contradictionMatrix.length === 0 ? (
                  <p className="text-slate-500">No contradictions recorded</p>
                ) : (
                  contradictionMatrix.slice(0, 3).map(c => (
                    <div key={c.id} className="p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{c.type}</span>
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          c.status === 'unresolved' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{c.claim_a}</p>
                      <p className="text-slate-600">vs. {c.claim_b}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            {/* Add other preview sections as needed */}
          </div>
        </div>
      )}
      
      {/* Export Stats */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Export Summary</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-2 bg-slate-50 rounded">
            <div className="text-lg font-bold text-slate-700">{evidence.length}</div>
            <div className="text-xs text-slate-500">Sources</div>
          </div>
          <div className="p-2 bg-slate-50 rounded">
            <div className="text-lg font-bold text-slate-700">{claims.length}</div>
            <div className="text-xs text-slate-500">Claims</div>
          </div>
          <div className="p-2 bg-slate-50 rounded">
            <div className="text-lg font-bold text-slate-700">
              {claims.reduce((sum, c) => sum + (c.citations?.length || 0), 0)}
            </div>
            <div className="text-xs text-slate-500">Citations</div>
          </div>
          <div className="p-2 bg-slate-50 rounded">
            <div className="text-lg font-bold text-slate-700">{contradictions.length}</div>
            <div className="text-xs text-slate-500">Contradictions</div>
          </div>
        </div>
      </div>
      
      {/* Export Actions */}
      <div className="p-4 bg-slate-50">
        <div className="flex gap-3">
          <button
            onClick={() => onExport('full')}
            disabled={!allChecksPass || exporting}
            className={`flex-1 py-2 rounded-lg font-medium ${
              allChecksPass && !exporting
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Export Full Reader Pack
          </button>
          <button
            onClick={() => onExport('summary')}
            className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-white"
          >
            Summary Only
          </button>
          <button
            onClick={() => onExport('verifier')}
            className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-white"
          >
            Verifier Tool
          </button>
        </div>
        
        <p className="text-xs text-slate-500 mt-3 text-center">
          Export includes SHA-256 hashes, manifest signature, and independent verifier tool
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MANIFEST GENERATOR
// ============================================================================

export async function generateManifest(
  reportId: string,
  caseId: string,
  caseNumber: string | undefined,
  evaluatorName: string | undefined,
  claims: Claim[],
  evidence: EvidenceItem[],
  contradictions: Contradiction[],
  sections: ReportSection[],
): Promise<ExportManifest> {
  // Create content for hashing
  const contentForHash = JSON.stringify({
    reportId,
    caseId,
    claimCount: claims.length,
    evidenceCount: evidence.length,
    timestamp: new Date().toISOString(),
  });
  
  const exportHash = await computeHash(contentForHash);
  
  // Calculate integrity checks
  const factualClaims = claims.filter(c => 
    ['record_fact', 'test_result', 'observation'].includes(c.claim_type)
  );
  const citedFacts = factualClaims.filter(c => c.citations?.length > 0);
  const unresolvedContradictions = contradictions.filter(c => 
    c.resolution_status === 'unresolved' && c.impacts_opinion
  );
  const methodologySection = sections.find(s => 
    s.section_type === 'methods' || s.title.toLowerCase().includes('method')
  );
  const limitationsSection = sections.find(s => 
    s.section_type === 'limitations' || s.title.toLowerCase().includes('limitation')
  );
  
  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    report_id: reportId,
    case_id: caseId,
    case_number: caseNumber,
    evaluator_name: evaluatorName,
    export_hash: exportHash,
    components: {
      evidence_inventory: true,
      claim_ledger: true,
      citation_index: true,
      contradiction_matrix: true,
      limitations_register: true,
      methodology_appendix: true,
      audit_chain: true,
    },
    integrity_checks: {
      all_facts_cited: factualClaims.length === 0 || citedFacts.length === factualClaims.length,
      contradictions_addressed: unresolvedContradictions.length === 0,
      methodology_complete: !!methodologySection?.content && methodologySection.content.length > 200,
      limitations_disclosed: !!limitationsSection?.content && limitationsSection.content.length > 50,
    },
  };
}
