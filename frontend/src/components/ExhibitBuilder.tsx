// ExhibitBuilder.tsx - Auto-generates court exhibits
// Chronology, claim-to-evidence table, contradictions table, opinion-to-basis table

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
  citations: { evidence_id: string; quote?: string; page?: number }[];
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
  date_of_document?: string;
}

interface Contradiction {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  type: string;
  resolution_status: string;
  resolution_note?: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  description: string;
  source_ids: string[];
  status: string;
}

interface ReportSection {
  id: string;
  title: string;
  section_type?: string;
}

type ExhibitType = 
  | 'chronology'
  | 'claim_evidence'
  | 'contradictions'
  | 'opinion_basis'
  | 'limitations_impact'
  | 'source_summary';

interface ExhibitBuilderProps {
  claims: Claim[];
  evidence: EvidenceItem[];
  contradictions: Contradiction[];
  timeline: TimelineEvent[];
  sections: ReportSection[];
  limitations: string[];
  referralQuestions: string[];
  onExportExhibit: (type: ExhibitType, format: 'pdf' | 'docx' | 'csv') => void;
}

// ============================================================================
// EXHIBIT DEFINITIONS
// ============================================================================

const EXHIBIT_TYPES: Record<ExhibitType, {
  label: string;
  icon: string;
  description: string;
  columns: string[];
}> = {
  chronology: {
    label: 'Chronology Exhibit',
    icon: '📅',
    description: 'Timeline of events with source citations',
    columns: ['Date', 'Event', 'Sources', 'Corroboration Status'],
  },
  claim_evidence: {
    label: 'Claim-to-Evidence Table',
    icon: '📎',
    description: 'Every factual claim mapped to supporting evidence',
    columns: ['Claim', 'Type', 'Evidence Source', 'Page/Quote'],
  },
  contradictions: {
    label: 'Contradictions Table',
    icon: '⚡',
    description: 'All identified contradictions with resolutions',
    columns: ['Claim A', 'Claim B', 'Type', 'Status', 'Resolution'],
  },
  opinion_basis: {
    label: 'Opinion-to-Basis Table',
    icon: '💭',
    description: 'Each opinion with its supporting foundation',
    columns: ['Opinion', 'Supporting Claims', 'Evidence Chain', 'Confidence'],
  },
  limitations_impact: {
    label: 'Limitations Impact Table',
    icon: '⚠️',
    description: 'Disclosed limitations and their impact on opinions',
    columns: ['Limitation', 'Affected Opinions', 'Mitigation', 'Residual Risk'],
  },
  source_summary: {
    label: 'Source Summary',
    icon: '📚',
    description: 'All evidence sources with key information',
    columns: ['Source', 'Type', 'Date', 'Key Facts Cited', 'Relied Upon'],
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ExhibitBuilder({
  claims,
  evidence,
  contradictions,
  timeline,
  sections,
  limitations,
  referralQuestions,
  onExportExhibit,
}: ExhibitBuilderProps) {
  const [selectedExhibit, setSelectedExhibit] = useState<ExhibitType>('chronology');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'csv'>('pdf');
  
  // Helper functions
  const getClaimText = (claimId: string): string => {
    const claim = claims.find(c => c.id === claimId);
    return claim?.claim_text || claim?.text || 'Unknown claim';
  };
  
  const getEvidenceName = (evidenceId: string): string => {
    const ev = evidence.find(e => e.id === evidenceId);
    return ev?.filename || 'Unknown source';
  };
  
  // Generate exhibit data
  const exhibitData = useMemo(() => {
    switch (selectedExhibit) {
      case 'chronology':
        return timeline.map(event => ({
          date: new Date(event.date).toLocaleDateString(),
          event: event.description,
          sources: event.source_ids.map(getEvidenceName).join('; '),
          status: event.status,
        }));
      
      case 'claim_evidence':
        return claims
          .filter(c => ['record_fact', 'test_result', 'observation'].includes(c.claim_type))
          .map(claim => ({
            claim: (claim.claim_text || claim.text || '').substring(0, 100),
            type: claim.claim_type,
            evidence: claim.citations?.map(cit => getEvidenceName(cit.evidence_id)).join('; ') || 'None',
            reference: claim.citations?.map(cit => 
              cit.page ? `p.${cit.page}` : cit.quote?.substring(0, 30) || ''
            ).join('; ') || '',
          }));
      
      case 'contradictions':
        return contradictions.map(c => ({
          claim_a: getClaimText(c.claim_a_id).substring(0, 60),
          claim_b: getClaimText(c.claim_b_id).substring(0, 60),
          type: c.type,
          status: c.resolution_status,
          resolution: c.resolution_note || '—',
        }));
      
      case 'opinion_basis':
        return claims
          .filter(c => ['forensic_opinion', 'opinion', 'inference'].includes(c.claim_type))
          .map(opinion => {
            const supportingClaims = claims.filter(c => 
              c.claim_type !== 'forensic_opinion' && 
              c.section_id === opinion.section_id
            );
            return {
              opinion: (opinion.claim_text || opinion.text || '').substring(0, 100),
              supporting: supportingClaims.length,
              evidence_chain: opinion.citations?.length || 0,
              confidence: 'Standard', // Would come from claim data
            };
          });
      
      case 'limitations_impact':
        const opinionClaims = claims.filter(c => 
          ['forensic_opinion', 'opinion'].includes(c.claim_type)
        );
        return limitations.map(limitation => ({
          limitation,
          affected: opinionClaims.length, // Simplified - would need more sophisticated mapping
          mitigation: 'Documented in report',
          risk: 'Low',
        }));
      
      case 'source_summary':
        return evidence.map(e => ({
          source: e.filename,
          type: typeof e.evidence_type === 'string' ? e.evidence_type : 'document',
          date: e.date_of_document || '—',
          facts_cited: claims.filter(c => 
            c.citations?.some(cit => cit.evidence_id === e.id)
          ).length,
          relied_upon: 'Yes',
        }));
      
      default:
        return [];
    }
  }, [selectedExhibit, claims, evidence, contradictions, timeline, limitations]);
  
  const exhibitInfo = EXHIBIT_TYPES[selectedExhibit];
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-white">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          📊 Exhibit Builder
        </h2>
        <p className="text-sm text-slate-500">
          Auto-generate court-ready exhibits and tables
        </p>
      </div>
      
      {/* Exhibit Type Selector */}
      <div className="p-3 border-b bg-slate-50">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(EXHIBIT_TYPES) as [ExhibitType, typeof EXHIBIT_TYPES[ExhibitType]][]).map(
            ([type, info]) => (
              <button
                key={type}
                onClick={() => setSelectedExhibit(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedExhibit === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border hover:bg-slate-100'
                }`}
              >
                {info.icon} {info.label}
              </button>
            )
          )}
        </div>
      </div>
      
      {/* Exhibit Info */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-slate-700">
              {exhibitInfo.icon} {exhibitInfo.label}
            </h3>
            <p className="text-sm text-slate-500">{exhibitInfo.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{exhibitData.length} rows</span>
          </div>
        </div>
      </div>
      
      {/* Preview Table */}
      <div className="max-h-80 overflow-auto">
        {exhibitData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No data available for this exhibit</p>
            <p className="text-sm mt-1">Add relevant content to your report first</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {exhibitInfo.columns.map(col => (
                  <th key={col} className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {exhibitData.slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {Object.values(row).map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-slate-700">
                      {typeof cell === 'number' ? cell : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {exhibitData.length > 10 && (
          <div className="p-2 text-center text-sm text-slate-500 bg-slate-50">
            Showing 10 of {exhibitData.length} rows
          </div>
        )}
      </div>
      
      {/* Export Actions */}
      <div className="p-4 border-t bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['pdf', 'docx', 'csv'] as const).map(format => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`px-3 py-1 rounded text-sm ${
                  exportFormat === format
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-white border hover:bg-slate-100'
                }`}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => onExportExhibit(selectedExhibit, exportFormat)}
            disabled={exhibitData.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300"
          >
            📥 Export {exhibitInfo.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK EXHIBIT CARDS
// ============================================================================

interface QuickExhibitCardsProps {
  claims: Claim[];
  evidence: EvidenceItem[];
  contradictions: Contradiction[];
  onGenerateExhibit: (type: ExhibitType) => void;
}

export function QuickExhibitCards({
  claims,
  evidence,
  contradictions,
  onGenerateExhibit,
}: QuickExhibitCardsProps) {
  const stats = useMemo(() => ({
    factualClaims: claims.filter(c => 
      ['record_fact', 'test_result', 'observation'].includes(c.claim_type)
    ).length,
    opinions: claims.filter(c => 
      ['forensic_opinion', 'opinion'].includes(c.claim_type)
    ).length,
    sources: evidence.length,
    contradictions: contradictions.length,
  }), [claims, evidence, contradictions]);
  
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onGenerateExhibit('claim_evidence')}
        className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100"
      >
        <div className="flex items-center gap-2 mb-1">
          <span>📎</span>
          <span className="font-medium text-blue-700">Claim-Evidence Table</span>
        </div>
        <p className="text-xs text-blue-600">
          {stats.factualClaims} claims • {stats.sources} sources
        </p>
      </button>
      
      <button
        onClick={() => onGenerateExhibit('opinion_basis')}
        className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100"
      >
        <div className="flex items-center gap-2 mb-1">
          <span>💭</span>
          <span className="font-medium text-purple-700">Opinion-Basis Table</span>
        </div>
        <p className="text-xs text-purple-600">
          {stats.opinions} opinions with foundation chains
        </p>
      </button>
      
      <button
        onClick={() => onGenerateExhibit('contradictions')}
        className="p-3 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100"
      >
        <div className="flex items-center gap-2 mb-1">
          <span>⚡</span>
          <span className="font-medium text-red-700">Contradictions Table</span>
        </div>
        <p className="text-xs text-red-600">
          {stats.contradictions} contradictions documented
        </p>
      </button>
      
      <button
        onClick={() => onGenerateExhibit('source_summary')}
        className="p-3 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100"
      >
        <div className="flex items-center gap-2 mb-1">
          <span>📚</span>
          <span className="font-medium text-green-700">Source Summary</span>
        </div>
        <p className="text-xs text-green-600">
          {stats.sources} sources inventoried
        </p>
      </button>
    </div>
  );
}
