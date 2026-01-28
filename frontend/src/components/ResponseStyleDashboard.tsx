// ResponseStyleDashboard.tsx - Validity, Response Style, and Bias Handling
// Never "diagnoses malingering" but forces structured documentation

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ValidityIndicator {
  id: string;
  name: string;
  source: string; // test name or observation type
  value: number | string;
  interpretation: 'valid' | 'elevated' | 'invalid' | 'indeterminate';
  cutoff?: string;
  notes?: string;
}

interface ResponseStyleConcern {
  id: string;
  type: 'overreporting' | 'underreporting' | 'inconsistency' | 'impression_management' | 'random_responding';
  indicators: string[];
  supports_concern: string[];
  contradicts_concern: string[];
  additional_data_needed: string[];
  clinical_judgment: string;
  confidence: 'high' | 'medium' | 'low';
}

interface BehaviorTestReportConcordance {
  domain: string;
  self_report: string;
  test_findings: string;
  behavioral_observation: string;
  collateral_report?: string;
  concordance: 'consistent' | 'partially_consistent' | 'inconsistent';
  notes?: string;
}

interface ExternalIncentive {
  id: string;
  type: 'litigation' | 'disability' | 'custody' | 'criminal' | 'other';
  description: string;
  direction: 'overreport' | 'underreport' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
}

interface ResponseStyleDashboardProps {
  validityIndicators: ValidityIndicator[];
  concerns: ResponseStyleConcern[];
  concordance: BehaviorTestReportConcordance[];
  incentives: ExternalIncentive[];
  onAddIndicator?: () => void;
  onAddConcern?: () => void;
  onUpdateConcern?: (id: string, updates: Partial<ResponseStyleConcern>) => void;
}

// ============================================================================
// COMMON VALIDITY MEASURES
// ============================================================================

const COMMON_VALIDITY_MEASURES = {
  ValidityIndicators: [
    { name: 'VRIN', description: 'Variable Response Inconsistency', elevated: '>80T' },
    { name: 'TRIN', description: 'True Response Inconsistency', elevated: '>80T' },
    { name: 'F', description: 'Infrequency', elevated: '>100T' },
    { name: 'Fb', description: 'Back Infrequency', elevated: '>100T' },
    { name: 'Fp', description: 'Infrequency-Psychopathology', elevated: '>100T' },
    { name: 'FBS', description: 'Fake Bad Scale', elevated: '>80T' },
    { name: 'L', description: 'Lie', elevated: '>65T' },
    { name: 'K', description: 'Defensiveness', elevated: '>65T' },
  ],
  PAI: [
    { name: 'ICN', description: 'Inconsistency', elevated: '>72T' },
    { name: 'INF', description: 'Infrequency', elevated: '>75T' },
    { name: 'NIM', description: 'Negative Impression Management', elevated: '>92T' },
    { name: 'PIM', description: 'Positive Impression Management', elevated: '>68T' },
    { name: 'MAL', description: 'Malingering Index', elevated: '>3' },
    { name: 'RDF', description: 'Rogers Discriminant Function', elevated: '>0' },
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ResponseStyleDashboard({
  validityIndicators,
  concerns,
  concordance,
  incentives,
  onAddIndicator,
  onAddConcern,
  onUpdateConcern,
}: ResponseStyleDashboardProps) {
  const [activeTab, setActiveTab] = useState<'validity' | 'concordance' | 'incentives' | 'summary'>('validity');
  const [expandedConcern, setExpandedConcern] = useState<string | null>(null);
  
  // Calculate overall validity status
  const validityStatus = useMemo(() => {
    const invalid = validityIndicators.filter(v => v.interpretation === 'invalid').length;
    const elevated = validityIndicators.filter(v => v.interpretation === 'elevated').length;
    const total = validityIndicators.length;
    
    if (invalid > 0) return { status: 'invalid', label: 'Validity Concerns Present', color: 'red' };
    if (elevated > 2) return { status: 'elevated', label: 'Multiple Elevated Indicators', color: 'amber' };
    if (elevated > 0) return { status: 'caution', label: 'Some Elevated Indicators', color: 'yellow' };
    if (total === 0) return { status: 'unknown', label: 'No Validity Data', color: 'slate' };
    return { status: 'valid', label: 'Valid Profile', color: 'green' };
  }, [validityIndicators]);
  
  // Calculate concordance summary
  const concordanceSummary = useMemo(() => {
    const consistent = concordance.filter(c => c.concordance === 'consistent').length;
    const inconsistent = concordance.filter(c => c.concordance === 'inconsistent').length;
    const total = concordance.length;
    
    return { consistent, inconsistent, total };
  }, [concordance]);
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
               Response Style Dashboard
            </h2>
            <p className="text-sm text-slate-500">
              Validity, credibility, and bias documentation
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            validityStatus.color === 'green' ? 'bg-green-100 text-green-700' :
            validityStatus.color === 'amber' ? 'bg-amber-100 text-amber-700' :
            validityStatus.color === 'red' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {validityStatus.label}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4 text-sm">
          <span className="px-2 py-1 bg-slate-100 rounded">
            {validityIndicators.length} validity indicators
          </span>
          <span className={`px-2 py-1 rounded ${
            concordanceSummary.inconsistent > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            {concordanceSummary.consistent}/{concordanceSummary.total} concordant
          </span>
          <span className={`px-2 py-1 rounded ${
            incentives.some(i => i.strength === 'strong') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'
          }`}>
            {incentives.length} external incentives
          </span>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b bg-slate-50">
        <div className="flex">
          {[
            { id: 'validity', label: ' Validity Indices' },
            { id: 'concordance', label: ' Concordance' },
            { id: 'incentives', label: ' Incentives' },
            { id: 'summary', label: ' Summary' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {/* Validity Indices Tab */}
        {activeTab === 'validity' && (
          <div className="p-4 space-y-4">
            {validityIndicators.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-2">No validity indicators documented</p>
                <button
                  onClick={onAddIndicator}
                  className="text-purple-600 hover:text-purple-800 text-sm"
                >
                  + Add Validity Indicator
                </button>
              </div>
            ) : (
              <>
                {/* Group by source */}
                {Object.entries(
                  validityIndicators.reduce((acc, ind) => {
                    if (!acc[ind.source]) acc[ind.source] = [];
                    acc[ind.source].push(ind);
                    return acc;
                  }, {} as Record<string, ValidityIndicator[]>)
                ).map(([source, indicators]) => (
                  <div key={source} className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 font-medium text-slate-700">
                      {source}
                    </div>
                    <div className="divide-y">
                      {indicators.map(indicator => (
                        <div 
                          key={indicator.id}
                          className={`px-4 py-3 flex items-center justify-between ${
                            indicator.interpretation === 'invalid' ? 'bg-red-50' :
                            indicator.interpretation === 'elevated' ? 'bg-amber-50' : ''
                          }`}
                        >
                          <div>
                            <span className="font-medium text-slate-700">{indicator.name}</span>
                            {indicator.cutoff && (
                              <span className="text-xs text-slate-500 ml-2">
                                (cutoff: {indicator.cutoff})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm">{indicator.value}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              indicator.interpretation === 'valid' ? 'bg-green-100 text-green-700' :
                              indicator.interpretation === 'elevated' ? 'bg-amber-100 text-amber-700' :
                              indicator.interpretation === 'invalid' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {indicator.interpretation}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={onAddIndicator}
                  className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
                >
                  + Add Validity Indicator
                </button>
              </>
            )}
            
            {/* Response Style Concerns */}
            {concerns.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-slate-700 mb-3">Response Style Concerns</h3>
                <div className="space-y-3">
                  {concerns.map(concern => {
                    const isExpanded = expandedConcern === concern.id;
                    
                    return (
                      <div 
                        key={concern.id}
                        className={`border rounded-lg ${
                          concern.confidence === 'high' ? 'border-red-300 bg-red-50' :
                          concern.confidence === 'medium' ? 'border-amber-300 bg-amber-50' :
                          'border-slate-300'
                        }`}
                      >
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => setExpandedConcern(isExpanded ? null : concern.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700 capitalize">
                                {concern.type.replace('_', ' ')}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                concern.confidence === 'high' ? 'bg-red-200 text-red-800' :
                                concern.confidence === 'medium' ? 'bg-amber-200 text-amber-800' :
                                'bg-slate-200 text-slate-700'
                              }`}>
                                {concern.confidence} confidence
                              </span>
                            </div>
                            <span className="text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                          
                          <p className="text-sm text-slate-600 mt-1">
                            {concern.indicators.length} indicator(s): {concern.indicators.join(', ')}
                          </p>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t pt-3">
                            {/* Supports Concern */}
                            <div>
                              <p className="text-xs font-medium text-red-700 mb-1">
                                What Supports Concern:
                              </p>
                              <ul className="text-sm text-slate-600 space-y-1">
                                {concern.supports_concern.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-red-400">+</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {/* Contradicts Concern */}
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-1">
                                What Contradicts Concern:
                              </p>
                              <ul className="text-sm text-slate-600 space-y-1">
                                {concern.contradicts_concern.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-400">−</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {/* Additional Data Needed */}
                            {concern.additional_data_needed.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-blue-700 mb-1">
                                  Additional Data Needed:
                                </p>
                                <ul className="text-sm text-slate-600 space-y-1">
                                  {concern.additional_data_needed.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-blue-400">?</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Clinical Judgment */}
                            <div className="p-3 bg-white rounded border">
                              <p className="text-xs font-medium text-slate-500 mb-1">
                                Clinical Judgment:
                              </p>
                              <p className="text-sm text-slate-700">
                                {concern.clinical_judgment}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Concordance Tab */}
        {activeTab === 'concordance' && (
          <div className="p-4">
            <p className="text-sm text-slate-500 mb-4">
              Behavior-Test-Report concordance across domains
            </p>
            
            {concordance.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No concordance data documented
              </div>
            ) : (
              <div className="space-y-3">
                {concordance.map(item => (
                  <div 
                    key={item.domain}
                    className={`p-4 border rounded-lg ${
                      item.concordance === 'inconsistent' ? 'border-red-300 bg-red-50' :
                      item.concordance === 'partially_consistent' ? 'border-amber-300 bg-amber-50' :
                      'border-green-300 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-700">{item.domain}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.concordance === 'consistent' ? 'bg-green-200 text-green-800' :
                        item.concordance === 'partially_consistent' ? 'bg-amber-200 text-amber-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {item.concordance.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Self-Report</p>
                        <p className="text-slate-700">{item.self_report}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Test Findings</p>
                        <p className="text-slate-700">{item.test_findings}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Behavioral Observation</p>
                        <p className="text-slate-700">{item.behavioral_observation}</p>
                      </div>
                      {item.collateral_report && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Collateral Report</p>
                          <p className="text-slate-700">{item.collateral_report}</p>
                        </div>
                      )}
                    </div>
                    
                    {item.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Incentives Tab */}
        {activeTab === 'incentives' && (
          <div className="p-4">
            <p className="text-sm text-slate-500 mb-4">
              External incentives that may influence presentation
            </p>
            
            {incentives.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No external incentives documented
              </div>
            ) : (
              <div className="space-y-3">
                {incentives.map(incentive => (
                  <div 
                    key={incentive.id}
                    className={`p-4 border rounded-lg ${
                      incentive.strength === 'strong' ? 'border-amber-300 bg-amber-50' :
                      incentive.strength === 'moderate' ? 'border-yellow-300 bg-yellow-50' :
                      'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 capitalize">
                          {incentive.type} Context
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          incentive.direction === 'overreport' ? 'bg-red-100 text-red-700' :
                          incentive.direction === 'underreport' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {incentive.direction === 'overreport' ? '↑ Overreport' :
                           incentive.direction === 'underreport' ? '↓ Underreport' : '→ Neutral'}
                        </span>
                      </div>
                      <span className={`text-xs ${
                        incentive.strength === 'strong' ? 'text-amber-700' :
                        incentive.strength === 'moderate' ? 'text-yellow-700' : 'text-slate-500'
                      }`}>
                        {incentive.strength} incentive
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{incentive.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="p-4 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-3">Response Style Summary</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {validityIndicators.length > 0 ? (
                  <>
                    Validity indicators from {
                      [...new Set(validityIndicators.map(v => v.source))].join(', ')
                    } were reviewed. {
                      validityStatus.status === 'valid' 
                        ? 'All validity indices fell within acceptable limits, suggesting a valid and interpretable profile.'
                        : validityStatus.status === 'elevated'
                        ? 'Several validity indicators were elevated, warranting cautious interpretation.'
                        : validityStatus.status === 'invalid'
                        ? 'One or more validity indices exceeded cutoffs, raising questions about profile interpretability.'
                        : 'Validity status could not be determined.'
                    }
                  </>
                ) : (
                  'No formal validity indices were administered.'
                )}
              </p>
              
              {concordance.length > 0 && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Behavior-test-report concordance analysis revealed{' '}
                  {concordanceSummary.inconsistent === 0 
                    ? 'generally consistent presentation across modalities.'
                    : `${concordanceSummary.inconsistent} domain(s) with notable inconsistencies.`
                  }
                </p>
              )}
              
              {incentives.length > 0 && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  External incentive analysis identified {incentives.length} contextual factor(s) 
                  that may influence presentation, including{' '}
                  {incentives.map(i => i.type).join(', ')} considerations.
                </p>
              )}
            </div>
            
            {/* Copy-ready text for report */}
            <div className="border rounded-lg">
              <div className="px-4 py-2 bg-slate-50 border-b flex justify-between items-center">
                <span className="font-medium text-slate-700 text-sm">Report-Ready Text</span>
                <button
                  onClick={() => {
                    // Would copy to clipboard
                  }}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  Copy to clipboard
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-600 font-mono whitespace-pre-wrap">
                  {generateReportText(validityIndicators, concerns, concordance, incentives)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Warning */}
      <div className="p-3 border-t bg-amber-50">
        <p className="text-xs text-amber-700">
           This dashboard documents response style concerns but does not diagnose malingering. 
          Conclusions about symptom validity require integration of multiple data sources.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Generate Report Text
// ============================================================================

function generateReportText(
  validityIndicators: ValidityIndicator[],
  concerns: ResponseStyleConcern[],
  concordance: BehaviorTestReportConcordance[],
  incentives: ExternalIncentive[]
): string {
  const lines: string[] = [];
  
  lines.push('RESPONSE STYLE AND VALIDITY CONSIDERATIONS\n');
  
  if (validityIndicators.length > 0) {
    const sources = [...new Set(validityIndicators.map(v => v.source))];
    lines.push(`Validity indicators from ${sources.join(' and ')} were examined.`);
    
    const elevated = validityIndicators.filter(v => v.interpretation === 'elevated');
    const invalid = validityIndicators.filter(v => v.interpretation === 'invalid');
    
    if (invalid.length > 0) {
      lines.push(`The following indices exceeded validity cutoffs: ${invalid.map(v => `${v.name} (${v.value})`).join(', ')}.`);
    } else if (elevated.length > 0) {
      lines.push(`The following indices were elevated but within interpretable range: ${elevated.map(v => `${v.name} (${v.value})`).join(', ')}.`);
    } else {
      lines.push('All validity indices fell within acceptable limits.');
    }
  }
  
  if (concordance.length > 0) {
    const inconsistent = concordance.filter(c => c.concordance === 'inconsistent');
    if (inconsistent.length > 0) {
      lines.push(`\nBehavior-test-report concordance analysis revealed inconsistencies in the following domains: ${inconsistent.map(c => c.domain).join(', ')}.`);
    } else {
      lines.push('\nPresentation was generally consistent across self-report, behavioral observation, and test findings.');
    }
  }
  
  if (incentives.length > 0) {
    const strong = incentives.filter(i => i.strength === 'strong');
    if (strong.length > 0) {
      lines.push(`\nExternal incentives were considered, including: ${strong.map(i => i.description).join('; ')}.`);
    }
  }
  
  return lines.join(' ');
}
