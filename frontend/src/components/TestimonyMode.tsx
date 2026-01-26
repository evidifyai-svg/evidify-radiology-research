// TestimonyMode.tsx - Hotkey interface during testimony
// Quickly find supporting records, quote anchors, reasoning chains, limitations

import { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Claim {
  id: string;
  claim_text?: string;
  text?: string;
  claim_type: string;
  section_id: string;
  citations: { evidence_id: string; quote?: string; page?: string; line?: string }[];
  confidence?: string;
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
}

interface ReportSection {
  id: string;
  title: string;
  section_type?: string;
  content?: string;
}

interface SearchResult {
  type: 'claim' | 'evidence' | 'quote' | 'limitation' | 'opinion';
  claim?: Claim;
  evidence?: EvidenceItem;
  quote?: string;
  page?: string;
  section?: ReportSection;
  relevance: number;
}

interface TestimonyModeProps {
  claims: Claim[];
  evidence: EvidenceItem[];
  sections: ReportSection[];
  limitations: string[];
  isActive: boolean;
  onClose: () => void;
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

const SHORTCUTS = [
  { key: '/', description: 'Search claims, evidence, quotes' },
  { key: 'f', description: 'Find supporting record' },
  { key: 'q', description: 'Show quote anchor' },
  { key: 'r', description: 'Show reasoning chain' },
  { key: 'l', description: 'Show limitations' },
  { key: 'o', description: 'Jump to opinion' },
  { key: 'Esc', description: 'Close testimony mode' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TestimonyMode({
  claims,
  evidence,
  sections,
  limitations,
  isActive,
  onClose,
}: TestimonyModeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'claims' | 'evidence' | 'quotes' | 'limitations'>('all');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Get claim text helper
  const getClaimText = (claim: Claim): string => claim.claim_text || claim.text || '';
  
  // Search function
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    
    // Search claims
    if (searchMode === 'all' || searchMode === 'claims') {
      claims.forEach(claim => {
        const text = getClaimText(claim).toLowerCase();
        if (text.includes(query)) {
          const relevance = text.startsWith(query) ? 100 : 
                           text.includes(` ${query}`) ? 80 : 50;
          results.push({
            type: claim.claim_type.includes('opinion') ? 'opinion' : 'claim',
            claim,
            relevance,
          });
        }
      });
    }
    
    // Search evidence
    if (searchMode === 'all' || searchMode === 'evidence') {
      evidence.forEach(ev => {
        if (ev.filename.toLowerCase().includes(query)) {
          results.push({
            type: 'evidence',
            evidence: ev,
            relevance: 70,
          });
        }
      });
    }
    
    // Search quotes
    if (searchMode === 'all' || searchMode === 'quotes') {
      claims.forEach(claim => {
        claim.citations?.forEach(cit => {
          if (cit.quote?.toLowerCase().includes(query)) {
            const ev = evidence.find(e => e.id === cit.evidence_id);
            results.push({
              type: 'quote',
              claim,
              evidence: ev,
              quote: cit.quote,
              page: cit.page,
              relevance: 90,
            });
          }
        });
      });
    }
    
    // Search limitations
    if (searchMode === 'all' || searchMode === 'limitations') {
      limitations.forEach(limitation => {
        if (limitation.toLowerCase().includes(query)) {
          results.push({
            type: 'limitation',
            quote: limitation,
            relevance: 85,
          });
        }
      });
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
  }, [searchQuery, searchMode, claims, evidence, limitations]);
  
  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive) return;
    
    // Don't intercept if typing in input
    if (e.target instanceof HTMLInputElement) {
      if (e.key === 'Escape') {
        (e.target as HTMLInputElement).blur();
      }
      return;
    }
    
    switch (e.key) {
      case '/':
        e.preventDefault();
        document.getElementById('testimony-search')?.focus();
        break;
      case 'f':
        e.preventDefault();
        setSearchMode('evidence');
        document.getElementById('testimony-search')?.focus();
        break;
      case 'q':
        e.preventDefault();
        setSearchMode('quotes');
        document.getElementById('testimony-search')?.focus();
        break;
      case 'l':
        e.preventDefault();
        setSearchMode('limitations');
        setSearchQuery('');
        break;
      case 'o':
        e.preventDefault();
        setSearchMode('claims');
        setSearchQuery('opinion');
        break;
      case '?':
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
        break;
      case 'Escape':
        if (selectedResult) {
          setSelectedResult(null);
        } else if (searchQuery) {
          setSearchQuery('');
        } else {
          onClose();
        }
        break;
    }
  }, [isActive, selectedResult, searchQuery, showShortcuts, onClose]);
  
  // Register keyboard handler
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Get opinions
  const opinions = useMemo(() => {
    return claims.filter(c => 
      ['forensic_opinion', 'opinion', 'ultimate_opinion'].includes(c.claim_type)
    );
  }, [claims]);
  
  if (!isActive) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/50 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            ⚖️ Testimony Mode
          </h1>
          <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-sm">
            ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="text-slate-400 hover:text-white text-sm"
          >
            ? Shortcuts
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕ Exit (Esc)
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="px-6 py-4 bg-slate-800">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 mb-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'claims', label: 'Claims' },
              { id: 'evidence', label: 'Evidence' },
              { id: 'quotes', label: 'Quotes' },
              { id: 'limitations', label: 'Limitations' },
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setSearchMode(mode.id as any)}
                className={`px-3 py-1 rounded text-sm ${
                  searchMode === mode.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <input
            id="testimony-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claims, evidence, quotes... (press / to focus)"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-lg placeholder-slate-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Show limitations if that mode is selected */}
            {searchMode === 'limitations' && !searchQuery && (
              <>
                <h2 className="text-slate-400 text-sm font-medium mb-3">
                  DISCLOSED LIMITATIONS ({limitations.length})
                </h2>
                {limitations.map((limitation, i) => (
                  <div
                    key={i}
                    className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg cursor-pointer hover:bg-amber-900/50"
                    onClick={() => setSelectedResult({ type: 'limitation', quote: limitation, relevance: 100 })}
                  >
                    <div className="text-amber-400 text-sm font-medium mb-1">⚠️ Limitation #{i + 1}</div>
                    <p className="text-white">{limitation}</p>
                  </div>
                ))}
              </>
            )}
            
            {/* Show opinions quick access */}
            {searchMode === 'claims' && searchQuery === 'opinion' && (
              <>
                <h2 className="text-slate-400 text-sm font-medium mb-3">
                  YOUR OPINIONS ({opinions.length})
                </h2>
                {opinions.map(opinion => (
                  <div
                    key={opinion.id}
                    className="p-4 bg-orange-900/30 border border-orange-700/50 rounded-lg cursor-pointer hover:bg-orange-900/50"
                    onClick={() => setSelectedResult({ type: 'opinion', claim: opinion, relevance: 100 })}
                  >
                    <div className="text-orange-400 text-sm font-medium mb-1">
                      🎯 {opinion.claim_type.replace('_', ' ').toUpperCase()}
                    </div>
                    <p className="text-white">{getClaimText(opinion)}</p>
                    <div className="text-slate-400 text-sm mt-2">
                      {opinion.citations?.length || 0} supporting citations
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* Search Results */}
            {searchQuery && searchQuery !== 'opinion' && (
              <>
                <h2 className="text-slate-400 text-sm font-medium mb-3">
                  RESULTS ({searchResults.length})
                </h2>
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No results found
                  </div>
                ) : (
                  searchResults.map((result, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg cursor-pointer ${
                        result.type === 'evidence' ? 'bg-blue-900/30 border border-blue-700/50 hover:bg-blue-900/50' :
                        result.type === 'quote' ? 'bg-green-900/30 border border-green-700/50 hover:bg-green-900/50' :
                        result.type === 'limitation' ? 'bg-amber-900/30 border border-amber-700/50 hover:bg-amber-900/50' :
                        result.type === 'opinion' ? 'bg-orange-900/30 border border-orange-700/50 hover:bg-orange-900/50' :
                        'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                      }`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        result.type === 'evidence' ? 'text-blue-400' :
                        result.type === 'quote' ? 'text-green-400' :
                        result.type === 'limitation' ? 'text-amber-400' :
                        result.type === 'opinion' ? 'text-orange-400' :
                        'text-slate-400'
                      }`}>
                        {result.type === 'evidence' ? '📄 EVIDENCE' :
                         result.type === 'quote' ? '💬 QUOTE' :
                         result.type === 'limitation' ? '⚠️ LIMITATION' :
                         result.type === 'opinion' ? '🎯 OPINION' :
                         '📋 CLAIM'}
                      </div>
                      
                      {result.type === 'evidence' && result.evidence && (
                        <p className="text-white">{result.evidence.filename}</p>
                      )}
                      
                      {result.type === 'quote' && (
                        <>
                          <p className="text-white italic">"{result.quote}"</p>
                          <p className="text-slate-400 text-sm mt-1">
                            {result.evidence?.filename}{result.page && `, p. ${result.page}`}
                          </p>
                        </>
                      )}
                      
                      {result.type === 'limitation' && (
                        <p className="text-white">{result.quote}</p>
                      )}
                      
                      {(result.type === 'claim' || result.type === 'opinion') && result.claim && (
                        <>
                          <p className="text-white">{getClaimText(result.claim)}</p>
                          <p className="text-slate-400 text-sm mt-1">
                            {result.claim.claim_type.replace('_', ' ')} • 
                            {result.claim.citations?.length || 0} citations
                          </p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Detail Panel */}
        {selectedResult && (
          <div className="w-96 bg-slate-800 border-l border-slate-700 p-6 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-white">Detail View</h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {selectedResult.type === 'quote' && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-green-400 mb-1">Quote</div>
                  <p className="text-white text-lg italic">"{selectedResult.quote}"</p>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Source</div>
                  <p className="text-white">{selectedResult.evidence?.filename}</p>
                  {selectedResult.page && (
                    <p className="text-slate-400">Page {selectedResult.page}</p>
                  )}
                </div>
                {selectedResult.claim && (
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Supporting Claim</div>
                    <p className="text-slate-300">{getClaimText(selectedResult.claim)}</p>
                  </div>
                )}
              </div>
            )}
            
            {(selectedResult.type === 'claim' || selectedResult.type === 'opinion') && selectedResult.claim && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-orange-400 mb-1">
                    {selectedResult.claim.claim_type.replace('_', ' ').toUpperCase()}
                  </div>
                  <p className="text-white text-lg">{getClaimText(selectedResult.claim)}</p>
                </div>
                
                {selectedResult.claim.citations && selectedResult.claim.citations.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Citations ({selectedResult.claim.citations.length})</div>
                    <div className="space-y-2">
                      {selectedResult.claim.citations.map((cit, i) => {
                        const ev = evidence.find(e => e.id === cit.evidence_id);
                        return (
                          <div key={i} className="p-2 bg-slate-900 rounded">
                            <p className="text-slate-300 text-sm">{ev?.filename}</p>
                            {cit.page && <p className="text-slate-500 text-xs">Page {cit.page}</p>}
                            {cit.quote && (
                              <p className="text-green-400 text-sm mt-1 italic">
                                "{cit.quote.slice(0, 100)}..."
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {selectedResult.claim.confidence && (
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Confidence</div>
                    <p className="text-white">{selectedResult.claim.confidence}</p>
                  </div>
                )}
              </div>
            )}
            
            {selectedResult.type === 'evidence' && selectedResult.evidence && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-blue-400 mb-1">Document</div>
                  <p className="text-white text-lg">{selectedResult.evidence.filename}</p>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Type</div>
                  <p className="text-white">
                    {typeof selectedResult.evidence.evidence_type === 'string' 
                      ? selectedResult.evidence.evidence_type 
                      : 'Document'}
                  </p>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-2">Claims citing this evidence</div>
                  <div className="space-y-2">
                    {claims
                      .filter(c => c.citations?.some(cit => cit.evidence_id === selectedResult.evidence?.id))
                      .slice(0, 5)
                      .map(claim => (
                        <div key={claim.id} className="p-2 bg-slate-900 rounded">
                          <p className="text-slate-300 text-sm">{getClaimText(claim).slice(0, 80)}...</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
            
            {selectedResult.type === 'limitation' && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-amber-400 mb-1">Limitation</div>
                  <p className="text-white text-lg">{selectedResult.quote}</p>
                </div>
                <div className="p-3 bg-amber-900/30 rounded">
                  <p className="text-amber-300 text-sm">
                    ⚠️ This limitation was disclosed in your report. 
                    Reference it if asked about the scope or certainty of your conclusions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-white mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2">
              {SHORTCUTS.map(shortcut => (
                <div key={shortcut.key} className="flex items-center gap-4">
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 font-mono text-sm min-w-[40px] text-center">
                    {shortcut.key}
                  </kbd>
                  <span className="text-slate-400">{shortcut.description}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-6 w-full py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="bg-black/50 border-t border-slate-700 px-6 py-2 flex items-center justify-between text-sm text-slate-500">
        <span>Press ? for keyboard shortcuts</span>
        <span>
          {claims.length} claims • {evidence.length} evidence items • {limitations.length} limitations
        </span>
      </div>
    </div>
  );
}
