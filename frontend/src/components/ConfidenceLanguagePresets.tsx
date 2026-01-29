// ConfidenceLanguagePresets.tsx - Forensic confidence language helper
// Provides standard forensic phrasing based on confidence level

import { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ConfidencePreset {
  id: string;
  level: 'high' | 'medium' | 'low';
  category: string;
  phrase: string;
  usage: string;
}

interface ConfidenceLanguagePresetsProps {
  onInsert: (phrase: string) => void;
  compact?: boolean;
}

// ============================================================================
// FORENSIC LANGUAGE PRESETS
// ============================================================================

const CONFIDENCE_PRESETS: ConfidencePreset[] = [
  // HIGH CONFIDENCE - Strong evidentiary support
  {
    id: 'high-consistent',
    level: 'high',
    category: 'Agreement',
    phrase: 'is consistent with',
    usage: 'When evidence strongly aligns with a conclusion',
  },
  {
    id: 'high-supports',
    level: 'high',
    category: 'Agreement',
    phrase: 'strongly supports',
    usage: 'When multiple sources corroborate',
  },
  {
    id: 'high-demonstrates',
    level: 'high',
    category: 'Agreement',
    phrase: 'demonstrates',
    usage: 'When direct evidence establishes a fact',
  },
  {
    id: 'high-establishes',
    level: 'high',
    category: 'Agreement',
    phrase: 'establishes',
    usage: 'When evidence is definitive',
  },
  {
    id: 'high-corroborated',
    level: 'high',
    category: 'Source',
    phrase: 'corroborated by multiple sources',
    usage: 'When independent sources agree',
  },
  
  // MEDIUM CONFIDENCE - Probable but not certain
  {
    id: 'med-suggests',
    level: 'medium',
    category: 'Agreement',
    phrase: 'suggests',
    usage: 'When evidence points toward but does not prove',
  },
  {
    id: 'med-appears',
    level: 'medium',
    category: 'Agreement',
    phrase: 'appears consistent with',
    usage: 'When evidence is supportive but limited',
  },
  {
    id: 'med-indicates',
    level: 'medium',
    category: 'Agreement',
    phrase: 'indicates',
    usage: 'When evidence points in a direction',
  },
  {
    id: 'med-likely',
    level: 'medium',
    category: 'Probability',
    phrase: 'more likely than not',
    usage: 'Legal standard for civil matters',
  },
  {
    id: 'med-probably',
    level: 'medium',
    category: 'Probability',
    phrase: 'probably',
    usage: 'When probability exceeds 50%',
  },
  {
    id: 'med-reasonable',
    level: 'medium',
    category: 'Professional',
    phrase: 'to a reasonable degree of psychological certainty',
    usage: 'Standard forensic opinion qualifier',
  },
  
  // LOW CONFIDENCE - Possible but uncertain
  {
    id: 'low-may',
    level: 'low',
    category: 'Possibility',
    phrase: 'may be consistent with',
    usage: 'When evidence permits but does not confirm',
  },
  {
    id: 'low-possible',
    level: 'low',
    category: 'Possibility',
    phrase: 'it is possible that',
    usage: 'When a conclusion cannot be ruled out',
  },
  {
    id: 'low-insufficient',
    level: 'low',
    category: 'Limitation',
    phrase: 'insufficient data to conclude',
    usage: 'When evidence is lacking',
  },
  {
    id: 'low-cannot-determine',
    level: 'low',
    category: 'Limitation',
    phrase: 'cannot be determined with confidence',
    usage: 'When certainty is not achievable',
  },
  {
    id: 'low-unclear',
    level: 'low',
    category: 'Limitation',
    phrase: 'remains unclear',
    usage: 'When evidence is ambiguous',
  },
  
  // ATTRIBUTION PHRASES
  {
    id: 'attr-reported',
    level: 'medium',
    category: 'Attribution',
    phrase: 'the evaluee reported that',
    usage: 'Self-report attribution',
  },
  {
    id: 'attr-record',
    level: 'high',
    category: 'Attribution',
    phrase: 'according to records reviewed',
    usage: 'Record-based attribution',
  },
  {
    id: 'attr-collateral',
    level: 'medium',
    category: 'Attribution',
    phrase: 'collateral sources indicated that',
    usage: 'Third-party attribution',
  },
  {
    id: 'attr-observed',
    level: 'high',
    category: 'Attribution',
    phrase: 'behavioral observation revealed',
    usage: 'Direct observation attribution',
  },
  
  // LIMITATION PHRASES
  {
    id: 'lim-however',
    level: 'medium',
    category: 'Caveat',
    phrase: 'however, it should be noted that',
    usage: 'Introducing a caveat or limitation',
  },
  {
    id: 'lim-alternative',
    level: 'medium',
    category: 'Caveat',
    phrase: 'an alternative explanation is',
    usage: 'Presenting alternative hypothesis',
  },
  {
    id: 'lim-beyond-scope',
    level: 'low',
    category: 'Limitation',
    phrase: 'beyond the scope of this evaluation',
    usage: 'Defining boundaries',
  },
  {
    id: 'lim-unable',
    level: 'low',
    category: 'Limitation',
    phrase: 'this evaluator was unable to',
    usage: 'Documenting constraints',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ConfidenceLanguagePresets({ 
  onInsert, 
  compact = false 
}: ConfidenceLanguagePresetsProps) {
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Get unique categories
  const categories = Array.from(new Set(CONFIDENCE_PRESETS.map(p => p.category)));
  
  // Filter presets
  const filteredPresets = CONFIDENCE_PRESETS.filter(preset => {
    if (selectedLevel !== 'all' && preset.level !== selectedLevel) return false;
    if (selectedCategory !== 'all' && preset.category !== selectedCategory) return false;
    return true;
  });
  
  // Group by level for display
  const groupedByLevel = {
    high: filteredPresets.filter(p => p.level === 'high'),
    medium: filteredPresets.filter(p => p.level === 'medium'),
    low: filteredPresets.filter(p => p.level === 'low'),
  };
  
  if (compact) {
    // Compact dropdown mode
    return (
      <div className="relative inline-block">
        <select
          onChange={(e) => {
            if (e.target.value) {
              const preset = CONFIDENCE_PRESETS.find(p => p.id === e.target.value);
              if (preset) {
                onInsert(preset.phrase);
              }
              e.target.value = '';
            }
          }}
          className="text-xs border rounded px-2 py-1 bg-white text-slate-600 cursor-pointer hover:border-purple-400"
          defaultValue=""
        >
          <option value="" disabled>Insert phrase...</option>
          <optgroup label="High Confidence">
            {CONFIDENCE_PRESETS.filter(p => p.level === 'high').map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.phrase}
              </option>
            ))}
          </optgroup>
          <optgroup label="Medium Confidence">
            {CONFIDENCE_PRESETS.filter(p => p.level === 'medium').map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.phrase}
              </option>
            ))}
          </optgroup>
          <optgroup label="Low Confidence / Limitations">
            {CONFIDENCE_PRESETS.filter(p => p.level === 'low').map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.phrase}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    );
  }
  
  // Full panel mode
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-3 border-b bg-gradient-to-r from-purple-50 to-white">
        <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
          Forensic Language Presets
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Click to insert standard forensic phrasing
        </p>
      </div>
      
      {/* Filters */}
      <div className="p-2 border-b bg-slate-50 flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(['all', 'high', 'medium', 'low'] as const).map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                selectedLevel === level
                  ? level === 'high' ? 'bg-green-600 text-white' :
                    level === 'medium' ? 'bg-amber-500 text-white' :
                    level === 'low' ? 'bg-red-500 text-white' :
                    'bg-slate-600 text-white'
                  : 'bg-white text-slate-600 border hover:bg-slate-100'
              }`}
            >
              {level === 'all' ? 'All' :
               level === 'high' ? 'High' :
               level === 'medium' ? 'Medium' : 'Low'}
            </button>
          ))}
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs border rounded px-2 py-0.5"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      
      {/* Preset List */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-3">
        {/* High Confidence */}
        {groupedByLevel.high.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-700 mb-1 px-1">
              High Confidence
            </p>
            <div className="flex flex-wrap gap-1">
              {groupedByLevel.high.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onInsert(preset.phrase)}
                  onMouseEnter={() => setShowTooltip(preset.id)}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="relative px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 hover:bg-green-100 transition-colors"
                >
                  {preset.phrase}
                  {showTooltip === preset.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                      {preset.usage}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Medium Confidence */}
        {groupedByLevel.medium.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1 px-1">
              Medium Confidence
            </p>
            <div className="flex flex-wrap gap-1">
              {groupedByLevel.medium.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onInsert(preset.phrase)}
                  onMouseEnter={() => setShowTooltip(preset.id)}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="relative px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  {preset.phrase}
                  {showTooltip === preset.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                      {preset.usage}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Low Confidence */}
        {groupedByLevel.low.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-700 mb-1 px-1">
              Low Confidence / Limitations
            </p>
            <div className="flex flex-wrap gap-1">
              {groupedByLevel.low.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onInsert(preset.phrase)}
                  onMouseEnter={() => setShowTooltip(preset.id)}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="relative px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 hover:bg-red-100 transition-colors"
                >
                  {preset.phrase}
                  {showTooltip === preset.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                      {preset.usage}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {filteredPresets.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-4">
            No presets match your filters
          </p>
        )}
      </div>
      
      {/* Usage Guide */}
      <div className="p-2 border-t bg-slate-50">
        <p className="text-xs text-slate-500">
          <strong>Tip:</strong> Match confidence level to evidence strength. 
          Use high confidence only with corroborated facts.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK INSERT TOOLBAR (for section editor)
// ============================================================================

interface QuickInsertToolbarProps {
  onInsert: (phrase: string) => void;
}

export function QuickInsertToolbar({ onInsert }: QuickInsertToolbarProps) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 bg-slate-50 rounded border text-xs">
      <span className="text-slate-500">Insert:</span>
      <button
        onClick={() => onInsert('is consistent with ')}
        className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
        title="High confidence"
      >
        consistent with
      </button>
      <button
        onClick={() => onInsert('suggests ')}
        className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
        title="Medium confidence"
      >
        suggests
      </button>
      <button
        onClick={() => onInsert('may be consistent with ')}
        className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
        title="Low confidence"
      >
        may be
      </button>
      <button
        onClick={() => onInsert('the evaluee reported that ')}
        className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        title="Self-report attribution"
      >
        reported
      </button>
      <ConfidenceLanguagePresets onInsert={onInsert} compact />
    </div>
  );
}
