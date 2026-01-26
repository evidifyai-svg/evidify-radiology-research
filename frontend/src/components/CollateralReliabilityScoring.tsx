// CollateralReliabilityScoring.tsx - Transparent collateral source evaluation
// Prevents "hearsay treated as truth" and improves fairness

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface CollateralSource {
  id: string;
  name: string;
  relationship: string;
  relationshipCategory: 'family' | 'professional' | 'friend' | 'legal' | 'other';
  contactDate: string;
  contactMethod: 'phone' | 'in_person' | 'written' | 'video';
  duration?: string;
  
  // Reliability Factors
  accessToFacts: 'direct' | 'indirect' | 'limited' | 'unknown';
  frequencyOfContact: 'daily' | 'weekly' | 'monthly' | 'occasional' | 'rare';
  recencyOfContact: 'current' | 'recent' | 'historical' | 'distant';
  
  // Bias Assessment
  potentialBiasIncentives: string[];
  biasDirection: 'favorable' | 'unfavorable' | 'neutral' | 'mixed';
  biasStrength: 'strong' | 'moderate' | 'weak' | 'none';
  
  // Corroboration
  statementsCorroborated: number;
  statementsContradicted: number;
  statementsUncorroborated: number;
  
  // Overall
  reliabilityScore: number; // 0-100
  reliabilityRationale: string;
  limitations: string[];
  keyStatements: string[];
}

interface CollateralReliabilityScoringProps {
  sources: CollateralSource[];
  onAddSource?: () => void;
  onUpdateSource?: (id: string, updates: Partial<CollateralSource>) => void;
  onViewStatements?: (sourceId: string) => void;
}

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

const RELATIONSHIP_CATEGORIES = {
  family: { label: 'Family Member', icon: '👨‍👩‍👧', biasRisk: 'high' },
  professional: { label: 'Professional', icon: '👔', biasRisk: 'low' },
  friend: { label: 'Friend/Acquaintance', icon: '🤝', biasRisk: 'moderate' },
  legal: { label: 'Legal Party', icon: '⚖️', biasRisk: 'high' },
  other: { label: 'Other', icon: '👤', biasRisk: 'unknown' },
};

// ============================================================================
// BIAS INCENTIVES
// ============================================================================

const COMMON_BIAS_INCENTIVES = [
  'Custody/visitation outcome',
  'Financial interest',
  'Romantic relationship with evaluee',
  'History of conflict with evaluee',
  'Protective of evaluee',
  'Legal exposure',
  'Professional relationship at stake',
  'Immigration status',
  'Witness in same proceeding',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CollateralReliabilityScoring({
  sources,
  onAddSource,
  onUpdateSource,
  onViewStatements,
}: CollateralReliabilityScoringProps) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  
  // Sort sources by reliability score
  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  }, [sources]);
  
  // Calculate overall stats
  const stats = useMemo(() => {
    const totalCorroborated = sources.reduce((sum, s) => sum + s.statementsCorroborated, 0);
    const totalContradicted = sources.reduce((sum, s) => sum + s.statementsContradicted, 0);
    const avgReliability = sources.length > 0 
      ? Math.round(sources.reduce((sum, s) => sum + s.reliabilityScore, 0) / sources.length)
      : 0;
    const highBiasSources = sources.filter(s => s.biasStrength === 'strong').length;
    
    return { totalCorroborated, totalContradicted, avgReliability, highBiasSources };
  }, [sources]);
  
  // Get reliability color
  const getReliabilityColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
    if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' };
    if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  };
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              👥 Collateral Reliability Scoring
            </h2>
            <p className="text-sm text-slate-500">
              Transparent assessment of collateral source reliability
            </p>
          </div>
          <button
            onClick={onAddSource}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            + Add Source
          </button>
        </div>
        
        {/* Stats Bar */}
        <div className="flex gap-4 text-sm">
          <span className="px-2 py-1 bg-slate-100 rounded">
            {sources.length} collateral source(s)
          </span>
          <span className={`px-2 py-1 rounded ${
            stats.avgReliability >= 60 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            Avg reliability: {stats.avgReliability}%
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
            {stats.totalCorroborated} corroborated
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
            {stats.totalContradicted} contradicted
          </span>
          {stats.highBiasSources > 0 && (
            <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded">
              ⚠️ {stats.highBiasSources} high-bias source(s)
            </span>
          )}
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="p-2 border-b bg-slate-50 flex gap-2">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-3 py-1 rounded text-sm ${
            viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'bg-white border'
          }`}
        >
          📋 Cards
        </button>
        <button
          onClick={() => setViewMode('matrix')}
          className={`px-3 py-1 rounded text-sm ${
            viewMode === 'matrix' ? 'bg-indigo-600 text-white' : 'bg-white border'
          }`}
        >
          📊 Matrix
        </button>
      </div>
      
      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {sources.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="mb-2">No collateral sources documented</p>
            <button
              onClick={onAddSource}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              + Add your first collateral source
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-4 space-y-4">
            {sortedSources.map(source => {
              const isExpanded = expandedSource === source.id;
              const colors = getReliabilityColor(source.reliabilityScore);
              const category = RELATIONSHIP_CATEGORIES[source.relationshipCategory];
              
              return (
                <div 
                  key={source.id}
                  className={`border rounded-lg overflow-hidden ${
                    source.biasStrength === 'strong' ? 'border-amber-300' : ''
                  }`}
                >
                  {/* Header */}
                  <div 
                    className={`p-4 cursor-pointer ${colors.bg}`}
                    onClick={() => setExpandedSource(isExpanded ? null : source.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{source.name}</span>
                            {source.biasStrength === 'strong' && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                                ⚠️ High Bias Risk
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {source.relationship} • {category.label}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${colors.text}`}>
                          {source.reliabilityScore}%
                        </div>
                        <div className="text-xs text-slate-500">reliability</div>
                      </div>
                    </div>
                    
                    {/* Reliability Bar */}
                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors.bar}`}
                        style={{ width: `${source.reliabilityScore}%` }}
                      />
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="mt-3 flex gap-4 text-xs">
                      <span className="text-green-600">
                        ✓ {source.statementsCorroborated} corroborated
                      </span>
                      <span className="text-red-600">
                        ✗ {source.statementsContradicted} contradicted
                      </span>
                      <span className="text-slate-500">
                        ? {source.statementsUncorroborated} uncorroborated
                      </span>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 border-t space-y-4">
                      {/* Contact Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Contact Method</p>
                          <p className="text-slate-700 capitalize">{source.contactMethod}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Contact Date</p>
                          <p className="text-slate-700">{source.contactDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Access to Facts</p>
                          <p className="text-slate-700 capitalize">{source.accessToFacts}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Contact Frequency</p>
                          <p className="text-slate-700 capitalize">{source.frequencyOfContact}</p>
                        </div>
                      </div>
                      
                      {/* Bias Assessment */}
                      <div className={`p-3 rounded-lg ${
                        source.biasStrength === 'strong' ? 'bg-amber-50' :
                        source.biasStrength === 'moderate' ? 'bg-yellow-50' :
                        'bg-slate-50'
                      }`}>
                        <p className="text-xs font-medium text-slate-700 mb-2">Bias Assessment</p>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            source.biasDirection === 'favorable' ? 'bg-green-100 text-green-700' :
                            source.biasDirection === 'unfavorable' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {source.biasDirection} toward evaluee
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            source.biasStrength === 'strong' ? 'bg-amber-200 text-amber-800' :
                            source.biasStrength === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                            source.biasStrength === 'weak' ? 'bg-slate-200 text-slate-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {source.biasStrength} bias
                          </span>
                        </div>
                        
                        {source.potentialBiasIncentives.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Potential Bias Incentives:</p>
                            <ul className="text-xs text-slate-600 space-y-0.5">
                              {source.potentialBiasIncentives.map((incentive, i) => (
                                <li key={i}>• {incentive}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {/* Reliability Rationale */}
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1">Reliability Rationale</p>
                        <p className="text-sm text-slate-600">{source.reliabilityRationale}</p>
                      </div>
                      
                      {/* Limitations */}
                      {source.limitations.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-700 mb-1">Limitations</p>
                          <ul className="text-sm text-slate-600 space-y-1">
                            {source.limitations.map((limitation, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-500">•</span>
                                {limitation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Key Statements */}
                      {source.keyStatements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-700 mb-1">Key Statements</p>
                          <div className="space-y-2">
                            {source.keyStatements.slice(0, 3).map((statement, i) => (
                              <p key={i} className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded">
                                "{statement}"
                              </p>
                            ))}
                            {source.keyStatements.length > 3 && (
                              <button
                                onClick={() => onViewStatements?.(source.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                View all {source.keyStatements.length} statements →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <button className="text-xs text-indigo-600 hover:text-indigo-800">
                          Edit Source
                        </button>
                        <button 
                          onClick={() => onViewStatements?.(source.id)}
                          className="text-xs text-purple-600 hover:text-purple-800"
                        >
                          View All Statements
                        </button>
                        <button className="text-xs text-slate-500 hover:text-slate-700">
                          Add Statement
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Matrix View */
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Relationship</th>
                  <th className="px-3 py-2 text-center">Access</th>
                  <th className="px-3 py-2 text-center">Bias</th>
                  <th className="px-3 py-2 text-center">Corroboration</th>
                  <th className="px-3 py-2 text-center">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedSources.map(source => {
                  const colors = getReliabilityColor(source.reliabilityScore);
                  
                  return (
                    <tr key={source.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">{source.name}</td>
                      <td className="px-3 py-3 text-slate-600">{source.relationship}</td>
                      <td className="px-3 py-3 text-center capitalize">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          source.accessToFacts === 'direct' ? 'bg-green-100 text-green-700' :
                          source.accessToFacts === 'indirect' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {source.accessToFacts}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          source.biasStrength === 'strong' ? 'bg-red-100 text-red-700' :
                          source.biasStrength === 'moderate' ? 'bg-amber-100 text-amber-700' :
                          source.biasStrength === 'weak' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {source.biasStrength}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-green-600">{source.statementsCorroborated}</span>
                        /
                        <span className="text-red-600">{source.statementsContradicted}</span>
                        /
                        <span className="text-slate-400">{source.statementsUncorroborated}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded font-medium ${colors.bg} ${colors.text}`}>
                          {source.reliabilityScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t bg-indigo-50">
        <p className="text-xs text-indigo-700">
          💡 High-bias sources may still provide valuable information when corroborated by other sources. 
          Document bias factors to anticipate cross-examination.
        </p>
      </div>
    </div>
  );
}
