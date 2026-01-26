// ContradictionIntelligence.tsx - Cross-Exam Radar
// Forensic taxonomy for contradictions aligned to litigation

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Claim {
  id: string;
  text?: string;
  claim_text?: string;
  claim_type: string;
  section_id: string;
  citations: unknown[];
}

interface Contradiction {
  id: string;
  claim_a_id: string;
  claim_b_id: string;
  claim_a_text?: string;
  claim_b_text?: string;
  type: ContradictionType;
  description?: string;
  resolution_status: 'unresolved' | 'resolved' | 'partially_resolved';
  resolution_note?: string;
  impacts_opinion: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  discovered_at?: string;
  what_would_resolve?: string;
}

type ContradictionType = 
  | 'direct'           // Explicit factual conflict
  | 'omission'         // Key detail absent from one source
  | 'temporal_drift'   // Story changes over time
  | 'contextual_drift' // Setting-dependent presentation
  | 'method_result'    // Test vs report vs observation conflict
  | 'document_chain';  // Later document contradicts earlier

interface ReportSection {
  id: string;
  title: string;
  section_type?: string;
  content?: string;
}

interface ContradictionIntelligenceProps {
  contradictions: Contradiction[];
  claims: Claim[];
  sections: ReportSection[];
  onAddContradiction?: () => void;
  onResolveContradiction?: (id: string, resolution: string) => void;
  onUpdateContradiction?: (contradiction: Contradiction) => void;
}

// ============================================================================
// CONTRADICTION TYPE DEFINITIONS
// ============================================================================

const CONTRADICTION_TYPES: Record<ContradictionType, {
  label: string;
  icon: string;
  description: string;
  example: string;
  crossExamRisk: string;
}> = {
  direct: {
    label: 'Direct Contradiction',
    icon: '⚡',
    description: 'Explicit factual conflict between two sources',
    example: '"Miranda was read" vs "Miranda was not read"',
    crossExamRisk: 'Attorney will highlight the exact conflict and demand explanation',
  },
  omission: {
    label: 'Omission Contradiction',
    icon: '🕳️',
    description: 'Key detail absent from contemporaneous records but appears later',
    example: 'Trauma not mentioned in ER records but claimed in later interview',
    crossExamRisk: '"Why wasn\'t this documented at the time?"',
  },
  temporal_drift: {
    label: 'Temporal Drift',
    icon: '📅',
    description: 'Account changes across different time points',
    example: 'Initial statement differs from deposition differs from trial testimony',
    crossExamRisk: '"Your story has changed three times. Which version is true?"',
  },
  contextual_drift: {
    label: 'Contextual Drift',
    icon: '🎭',
    description: 'Presentation differs based on setting or audience',
    example: 'Presents differently in jail intake vs court interview vs family visit',
    crossExamRisk: '"Why did symptoms appear only when being evaluated?"',
  },
  method_result: {
    label: 'Method-Result Conflict',
    icon: '📊',
    description: 'Test results conflict with self-report or clinical observation',
    example: 'Claims severe impairment but validity indices suggest overreporting',
    crossExamRisk: '"The tests don\'t support what the evaluee claims"',
  },
  document_chain: {
    label: 'Document Chain Conflict',
    icon: '📄',
    description: 'Later document contradicts contemporaneous note',
    example: 'Attorney letter contradicts original police report',
    crossExamRisk: '"This letter was written after litigation began"',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ContradictionIntelligence({
  contradictions,
  claims,
  sections,
  onAddContradiction,
  onResolveContradiction,
  onUpdateContradiction,
}: ContradictionIntelligenceProps) {
  const [selectedType, setSelectedType] = useState<ContradictionType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Get claim text helper
  const getClaimText = (claimId: string): string => {
    const claim = claims.find(c => c.id === claimId);
    return claim?.claim_text || claim?.text || 'Unknown claim';
  };
  
  // Filter contradictions
  const filteredContradictions = useMemo(() => {
    return contradictions.filter(c => {
      if (selectedType !== 'all' && c.type !== selectedType) return false;
      if (selectedStatus === 'unresolved' && c.resolution_status !== 'unresolved') return false;
      if (selectedStatus === 'resolved' && c.resolution_status === 'unresolved') return false;
      return true;
    });
  }, [contradictions, selectedType, selectedStatus]);
  
  // Group by type for summary
  const typeGroups = useMemo(() => {
    const groups: Record<ContradictionType, Contradiction[]> = {
      direct: [],
      omission: [],
      temporal_drift: [],
      contextual_drift: [],
      method_result: [],
      document_chain: [],
    };
    contradictions.forEach(c => {
      if (groups[c.type]) {
        groups[c.type].push(c);
      }
    });
    return groups;
  }, [contradictions]);
  
  // Stats
  const stats = useMemo(() => ({
    total: contradictions.length,
    unresolved: contradictions.filter(c => c.resolution_status === 'unresolved').length,
    impactingOpinions: contradictions.filter(c => c.impacts_opinion && c.resolution_status === 'unresolved').length,
    critical: contradictions.filter(c => c.severity === 'critical').length,
  }), [contradictions]);
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-red-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              ⚡ Contradiction Intelligence
              <span className="text-sm font-normal text-slate-500">Cross-Exam Radar</span>
            </h2>
          </div>
          <button
            onClick={onAddContradiction}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            + Add Contradiction
          </button>
        </div>
        
        {/* Stats Bar */}
        <div className="flex gap-4 text-sm">
          <div className={`px-3 py-1 rounded-full ${stats.unresolved > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {stats.unresolved} unresolved
          </div>
          {stats.impactingOpinions > 0 && (
            <div className="px-3 py-1 rounded-full bg-red-200 text-red-800">
              ⚠️ {stats.impactingOpinions} affecting opinions
            </div>
          )}
          {stats.critical > 0 && (
            <div className="px-3 py-1 rounded-full bg-red-300 text-red-900">
              🚨 {stats.critical} critical
            </div>
          )}
        </div>
      </div>
      
      {/* Type Summary */}
      <div className="p-3 border-b bg-slate-50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedType === 'all' 
                ? 'bg-slate-700 text-white' 
                : 'bg-white text-slate-600 border hover:bg-slate-100'
            }`}
          >
            All ({stats.total})
          </button>
          {(Object.keys(CONTRADICTION_TYPES) as ContradictionType[]).map(type => {
            const count = typeGroups[type].length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedType === type 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-slate-600 border hover:bg-slate-100'
                }`}
              >
                {CONTRADICTION_TYPES[type].icon} {CONTRADICTION_TYPES[type].label.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
        
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-2 py-0.5 rounded text-xs ${selectedStatus === 'all' ? 'bg-slate-200' : ''}`}
          >
            All Status
          </button>
          <button
            onClick={() => setSelectedStatus('unresolved')}
            className={`px-2 py-0.5 rounded text-xs ${selectedStatus === 'unresolved' ? 'bg-red-200 text-red-700' : ''}`}
          >
            Unresolved Only
          </button>
          <button
            onClick={() => setSelectedStatus('resolved')}
            className={`px-2 py-0.5 rounded text-xs ${selectedStatus === 'resolved' ? 'bg-green-200 text-green-700' : ''}`}
          >
            Resolved
          </button>
        </div>
      </div>
      
      {/* Contradiction List */}
      <div className="max-h-[500px] overflow-y-auto divide-y">
        {filteredContradictions.length === 0 ? (
          <div className="p-8 text-center">
            {contradictions.length === 0 ? (
              <>
                <p className="text-slate-500 mb-2">No contradictions detected</p>
                <p className="text-xs text-slate-400">
                  Contradictions are identified during evidence review and claim extraction
                </p>
              </>
            ) : (
              <p className="text-slate-500">No contradictions match your filters</p>
            )}
          </div>
        ) : (
          filteredContradictions.map(contradiction => {
            const typeInfo = CONTRADICTION_TYPES[contradiction.type];
            const isExpanded = expandedId === contradiction.id;
            
            return (
              <div 
                key={contradiction.id}
                className={`p-4 hover:bg-slate-50 ${
                  contradiction.resolution_status === 'unresolved' && contradiction.impacts_opinion
                    ? 'bg-red-50/50'
                    : ''
                }`}
              >
                {/* Header Row */}
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : contradiction.id)}
                >
                  {/* Type Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                    contradiction.severity === 'critical' ? 'bg-red-200' :
                    contradiction.severity === 'high' ? 'bg-amber-200' :
                    'bg-slate-200'
                  }`}>
                    {typeInfo.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-700">{typeInfo.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        contradiction.resolution_status === 'unresolved' 
                          ? 'bg-red-100 text-red-700' 
                          : contradiction.resolution_status === 'partially_resolved'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {contradiction.resolution_status}
                      </span>
                      {contradiction.impacts_opinion && contradiction.resolution_status === 'unresolved' && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-red-200 text-red-800">
                          Affects Opinion
                        </span>
                      )}
                    </div>
                    
                    {/* Claims in Conflict */}
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-mono">A:</span>
                        <span className="line-clamp-1">
                          {contradiction.claim_a_text || getClaimText(contradiction.claim_a_id)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-blue-500 font-mono">B:</span>
                        <span className="line-clamp-1">
                          {contradiction.claim_b_text || getClaimText(contradiction.claim_b_id)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expand Icon */}
                  <span className="text-slate-400">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 ml-11 space-y-4">
                    {/* Description */}
                    {contradiction.description && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Description: </span>
                        {contradiction.description}
                      </div>
                    )}
                    
                    {/* Type Info */}
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <p className="text-sm text-slate-600">{typeInfo.description}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Example: </span>
                        {typeInfo.example}
                      </p>
                      <p className="text-xs text-red-600">
                        <span className="font-medium">Cross-exam risk: </span>
                        {typeInfo.crossExamRisk}
                      </p>
                    </div>
                    
                    {/* Resolution Prompts */}
                    <div className="bg-purple-50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium text-purple-700">Resolution Questions:</p>
                      <ul className="text-sm text-purple-600 space-y-1">
                        <li>• What would resolve this contradiction?</li>
                        <li>• Does this lower confidence in your opinions?</li>
                        <li>• Should this appear in Limitations?</li>
                      </ul>
                      
                      {contradiction.what_would_resolve && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-xs font-medium text-slate-500">What would resolve:</p>
                          <p className="text-sm text-slate-700">{contradiction.what_would_resolve}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Resolution Note */}
                    {contradiction.resolution_note && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-700">Resolution Note:</p>
                        <p className="text-sm text-green-600">{contradiction.resolution_note}</p>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      {contradiction.resolution_status === 'unresolved' && (
                        <>
                          <button
                            onClick={() => onResolveContradiction?.(contradiction.id, 'resolved')}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Mark Resolved
                          </button>
                          <button
                            onClick={() => onResolveContradiction?.(contradiction.id, 'addressed_in_limitations')}
                            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
                          >
                            Add to Limitations
                          </button>
                        </>
                      )}
                      <button
                        className="px-3 py-1.5 border text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer */}
      {stats.unresolved > 0 && (
        <div className="p-3 border-t bg-red-50">
          <p className="text-xs text-red-700">
            ⚠️ {stats.unresolved} unresolved contradiction(s) require attention before finalizing.
            {stats.impactingOpinions > 0 && (
              <span className="font-medium"> {stats.impactingOpinions} affect your opinions.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// IMPEACHMENT VIEW - What opposing counsel will attack
// ============================================================================

interface ImpeachmentViewProps {
  claims: Claim[];
  contradictions: Contradiction[];
  validation: {
    issues: { issue_type: string; message: string; claim_id?: string }[];
    attack_surface: { severity: string; category: string; description: string }[];
  } | null;
  sections: ReportSection[];
}

export function ImpeachmentView({
  claims,
  contradictions,
  validation,
  sections,
}: ImpeachmentViewProps) {
  
  const attacks = useMemo(() => {
    const result: {
      category: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      crossExamQuestion: string;
      claimIds?: string[];
    }[] = [];
    
    // 1. Unsupported claims
    const unsupportedClaims = claims.filter(c => 
      ['forensic_opinion', 'inference', 'record_fact'].includes(c.claim_type) &&
      (!c.citations || c.citations.length === 0)
    );
    if (unsupportedClaims.length > 0) {
      result.push({
        category: 'Unsupported Claims',
        severity: 'critical',
        title: `${unsupportedClaims.length} claim(s) without citations`,
        description: 'Factual claims and opinions without evidence anchors',
        crossExamQuestion: '"Doctor, where in the record does it say that?"',
        claimIds: unsupportedClaims.map(c => c.id),
      });
    }
    
    // 2. Unresolved contradictions
    const unresolvedContradictions = contradictions.filter(c => 
      c.resolution_status === 'unresolved'
    );
    if (unresolvedContradictions.length > 0) {
      result.push({
        category: 'Contradictions',
        severity: unresolvedContradictions.some(c => c.impacts_opinion) ? 'critical' : 'high',
        title: `${unresolvedContradictions.length} unresolved contradiction(s)`,
        description: 'Conflicting information not addressed in report',
        crossExamQuestion: '"How do you explain this discrepancy?"',
      });
    }
    
    // 3. Overconfident language (check for absolute statements)
    const opinionClaims = claims.filter(c => 
      ['forensic_opinion', 'inference'].includes(c.claim_type)
    );
    const overconfidentClaims = opinionClaims.filter(c => {
      const text = (c.claim_text || c.text || '').toLowerCase();
      return text.includes('clearly') || 
             text.includes('obviously') || 
             text.includes('certainly') ||
             text.includes('without doubt') ||
             text.includes('definitively');
    });
    if (overconfidentClaims.length > 0) {
      result.push({
        category: 'Overstatement',
        severity: 'high',
        title: `${overconfidentClaims.length} potentially overconfident statement(s)`,
        description: 'Language stronger than evidence may support',
        crossExamQuestion: '"You say \'clearly\' - is there any possibility you could be wrong?"',
        claimIds: overconfidentClaims.map(c => c.id),
      });
    }
    
    // 4. Missing methodology
    const hasMethodology = sections.some(s => 
      s.section_type === 'methods' || 
      s.title.toLowerCase().includes('method') ||
      s.title.toLowerCase().includes('procedure')
    );
    if (!hasMethodology) {
      result.push({
        category: 'Methodology',
        severity: 'critical',
        title: 'No methodology section',
        description: 'Methodology not documented for Daubert/Frye defense',
        crossExamQuestion: '"What methodology did you use? Where is it documented?"',
      });
    }
    
    // 5. Missing limitations
    const hasLimitations = sections.some(s => 
      s.section_type === 'limitations' || 
      s.title.toLowerCase().includes('limitation')
    );
    if (!hasLimitations) {
      result.push({
        category: 'Limitations',
        severity: 'high',
        title: 'No limitations section',
        description: 'Limitations not disclosed',
        crossExamQuestion: '"Did you consider any limitations to your evaluation?"',
      });
    }
    
    // 6. Add validation attack surface
    if (validation?.attack_surface) {
      validation.attack_surface.forEach(attack => {
        result.push({
          category: attack.category,
          severity: attack.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
          title: attack.category,
          description: attack.description,
          crossExamQuestion: `"Can you address ${attack.category.toLowerCase()}?"`,
        });
      });
    }
    
    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return result;
  }, [claims, contradictions, validation, sections]);
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-red-100 to-red-50">
        <h2 className="font-bold text-red-800 text-lg flex items-center gap-2">
          🎯 Impeachment View
          <span className="text-sm font-normal text-red-600">What opposing counsel will attack</span>
        </h2>
        <p className="text-sm text-red-600 mt-1">
          {attacks.filter(a => a.severity === 'critical').length} critical • 
          {attacks.filter(a => a.severity === 'high').length} high priority
        </p>
      </div>
      
      <div className="divide-y max-h-[400px] overflow-y-auto">
        {attacks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-green-600 font-medium">✓ No obvious attack vectors identified</p>
            <p className="text-xs text-slate-500 mt-1">Continue maintaining citation discipline</p>
          </div>
        ) : (
          attacks.map((attack, i) => (
            <div 
              key={i}
              className={`p-4 ${
                attack.severity === 'critical' ? 'bg-red-50' :
                attack.severity === 'high' ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  attack.severity === 'critical' ? 'bg-red-500' :
                  attack.severity === 'high' ? 'bg-amber-500' :
                  attack.severity === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-700">{attack.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      attack.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      attack.severity === 'high' ? 'bg-amber-200 text-amber-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {attack.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{attack.description}</p>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <p className="text-sm italic text-slate-700">
                      "{attack.crossExamQuestion}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
