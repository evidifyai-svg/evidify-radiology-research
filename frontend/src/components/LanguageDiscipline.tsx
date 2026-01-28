// LanguageDiscipline.tsx - Forensic writing assistant
// Flags absolute statements, clinical jargon, ultimate issue language
// Offers conservative, balanced, and assertive rewrites

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface LanguageIssue {
  id: string;
  type: 'absolute_statement' | 'clinical_jargon' | 'ultimate_issue' | 'unattributed' | 'overconfident';
  original: string;
  position: { start: number; end: number };
  severity: 'high' | 'medium' | 'low';
  description: string;
  rewrites: {
    conservative: string;
    balanced: string;
    assertive: string;
  };
}

interface LanguageDisciplineProps {
  content: string;
  jurisdiction?: string;
  evaluationType?: string;
  onApplyRewrite: (position: { start: number; end: number }, newText: string) => void;
}

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

const ABSOLUTE_PATTERNS = [
  { pattern: /\bclearly\b/gi, suggestion: 'the evidence suggests' },
  { pattern: /\bobviously\b/gi, suggestion: 'appears to' },
  { pattern: /\bcertainly\b/gi, suggestion: 'likely' },
  { pattern: /\bwithout (a )?doubt\b/gi, suggestion: 'with reasonable confidence' },
  { pattern: /\bdefinitively\b/gi, suggestion: 'strongly' },
  { pattern: /\bunquestionably\b/gi, suggestion: 'the data support' },
  { pattern: /\babsolutely\b/gi, suggestion: 'strongly' },
  { pattern: /\bproves?\b/gi, suggestion: 'supports' },
  { pattern: /\bestablishes beyond\b/gi, suggestion: 'is consistent with' },
  { pattern: /\bno doubt\b/gi, suggestion: 'it appears' },
  { pattern: /\balways\b/gi, suggestion: 'typically' },
  { pattern: /\bnever\b/gi, suggestion: 'rarely' },
];

const CLINICAL_JARGON_PATTERNS = [
  { pattern: /\bpresenting problem\b/gi, replacement: 'referral question', context: 'forensic' },
  { pattern: /\bpatient\b/gi, replacement: 'evaluee', context: 'forensic' },
  { pattern: /\bclient\b/gi, replacement: 'evaluee', context: 'forensic' },
  { pattern: /\btherapeutic\b/gi, replacement: 'clinical', context: 'forensic' },
  { pattern: /\btreatment (plan|goal)\b/gi, replacement: 'recommendation', context: 'forensic' },
  { pattern: /\bprognosis\b/gi, replacement: 'expected course', context: 'depends' },
];

const ULTIMATE_ISSUE_PATTERNS = [
  { pattern: /\b(is|was) competent to\b/gi, warning: 'Ultimate issue - check jurisdiction' },
  { pattern: /\b(is|was) not competent\b/gi, warning: 'Ultimate issue - check jurisdiction' },
  { pattern: /\bshould (have|be awarded) custody\b/gi, warning: 'Ultimate issue - typically avoided' },
  { pattern: /\b(is|was) (criminally )?responsible\b/gi, warning: 'Ultimate issue - check jurisdiction' },
  { pattern: /\b(is|was) insane\b/gi, warning: 'Ultimate issue - use clinical language' },
  { pattern: /\b(is|was) malingering\b/gi, warning: 'Avoid definitive malingering conclusion' },
  { pattern: /\bis (a )?danger(ous)?\b/gi, warning: 'Ultimate issue in some contexts' },
];

const UNATTRIBUTED_PATTERNS = [
  { pattern: /\b(he|she|they) (said|stated|reported|indicated)\b/gi, check: 'self_report_attribution' },
  { pattern: /\baccording to\b/gi, check: 'needs_source' },
  { pattern: /\brecords (show|indicate|reveal)\b/gi, check: 'needs_citation' },
];

// ============================================================================
// ANALYSIS FUNCTION
// ============================================================================

function analyzeContent(content: string, jurisdiction?: string): LanguageIssue[] {
  const issues: LanguageIssue[] = [];
  let issueId = 0;
  
  // Check absolute statements
  ABSOLUTE_PATTERNS.forEach(({ pattern, suggestion }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const original = match[0];
      const position = { start: match.index, end: match.index + original.length };
      
      // Get surrounding context
      const contextStart = Math.max(0, match.index - 30);
      const contextEnd = Math.min(content.length, match.index + original.length + 30);
      const context = content.slice(contextStart, contextEnd);
      
      issues.push({
        id: `abs-${issueId++}`,
        type: 'absolute_statement',
        original,
        position,
        severity: 'high',
        description: `Absolute language "${original}" may be stronger than evidence supports`,
        rewrites: {
          conservative: suggestion,
          balanced: original.toLowerCase().replace(pattern, suggestion),
          assertive: original,
        },
      });
    }
  });
  
  // Check clinical jargon
  CLINICAL_JARGON_PATTERNS.forEach(({ pattern, replacement }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const original = match[0];
      const position = { start: match.index, end: match.index + original.length };
      
      issues.push({
        id: `jargon-${issueId++}`,
        type: 'clinical_jargon',
        original,
        position,
        severity: 'medium',
        description: `Clinical term "${original}" - consider forensic alternative`,
        rewrites: {
          conservative: replacement,
          balanced: replacement,
          assertive: original,
        },
      });
    }
  });
  
  // Check ultimate issue language
  ULTIMATE_ISSUE_PATTERNS.forEach(({ pattern, warning }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const original = match[0];
      const position = { start: match.index, end: match.index + original.length };
      
      issues.push({
        id: `ultimate-${issueId++}`,
        type: 'ultimate_issue',
        original,
        position,
        severity: 'high',
        description: warning,
        rewrites: {
          conservative: `meets/does not meet the criteria for ${original.replace(/is |was /i, '')}`,
          balanced: original,
          assertive: original,
        },
      });
    }
  });
  
  // Check for overconfident patterns in opinions
  const overconfidentPatterns = [
    /\bI (am )?(certain|confident|sure)\b/gi,
    /\bthere is no (other |alternative )?explanation\b/gi,
    /\bthe only (possible |logical )?conclusion\b/gi,
  ];
  
  overconfidentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const original = match[0];
      const position = { start: match.index, end: match.index + original.length };
      
      issues.push({
        id: `overconf-${issueId++}`,
        type: 'overconfident',
        original,
        position,
        severity: 'high',
        description: 'Overconfident language invites cross-examination challenge',
        rewrites: {
          conservative: 'the data support',
          balanced: 'to a reasonable degree of psychological certainty',
          assertive: original,
        },
      });
    }
  });
  
  return issues;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LanguageDiscipline({
  content,
  jurisdiction,
  evaluationType,
  onApplyRewrite,
}: LanguageDisciplineProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Analyze content
  const issues = useMemo(() => analyzeContent(content, jurisdiction), [content, jurisdiction]);
  
  // Filter issues
  const filteredIssues = useMemo(() => {
    if (filterType === 'all') return issues;
    return issues.filter(i => i.type === filterType);
  }, [issues, filterType]);
  
  // Group by type for summary
  const summary = useMemo(() => ({
    absolute: issues.filter(i => i.type === 'absolute_statement').length,
    jargon: issues.filter(i => i.type === 'clinical_jargon').length,
    ultimate: issues.filter(i => i.type === 'ultimate_issue').length,
    overconfident: issues.filter(i => i.type === 'overconfident').length,
    unattributed: issues.filter(i => i.type === 'unattributed').length,
  }), [issues]);
  
  const totalHigh = issues.filter(i => i.severity === 'high').length;
  
  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 font-medium flex items-center gap-2">
          <span></span> No language discipline issues detected
        </p>
        <p className="text-green-600 text-sm mt-1">
          Content follows forensic writing best practices
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b ${totalHigh > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
             Language Discipline
          </h2>
          <span className={`px-2 py-1 rounded text-sm ${
            totalHigh > 0 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
          }`}>
            {issues.length} issue{issues.length !== 1 ? 's' : ''} found
          </span>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-1 rounded text-xs ${
              filterType === 'all' ? 'bg-slate-700 text-white' : 'bg-white border'
            }`}
          >
            All ({issues.length})
          </button>
          {summary.absolute > 0 && (
            <button
              onClick={() => setFilterType('absolute_statement')}
              className={`px-2 py-1 rounded text-xs ${
                filterType === 'absolute_statement' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
              }`}
            >
              Absolute ({summary.absolute})
            </button>
          )}
          {summary.ultimate > 0 && (
            <button
              onClick={() => setFilterType('ultimate_issue')}
              className={`px-2 py-1 rounded text-xs ${
                filterType === 'ultimate_issue' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
              }`}
            >
              Ultimate Issue ({summary.ultimate})
            </button>
          )}
          {summary.jargon > 0 && (
            <button
              onClick={() => setFilterType('clinical_jargon')}
              className={`px-2 py-1 rounded text-xs ${
                filterType === 'clinical_jargon' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
              }`}
            >
              Jargon ({summary.jargon})
            </button>
          )}
          {summary.overconfident > 0 && (
            <button
              onClick={() => setFilterType('overconfident')}
              className={`px-2 py-1 rounded text-xs ${
                filterType === 'overconfident' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
              }`}
            >
              Overconfident ({summary.overconfident})
            </button>
          )}
        </div>
      </div>
      
      {/* Issues List */}
      <div className="max-h-96 overflow-y-auto divide-y">
        {filteredIssues.map(issue => {
          const isSelected = selectedIssue === issue.id;
          
          return (
            <div 
              key={issue.id}
              className={`p-3 hover:bg-slate-50 ${
                issue.severity === 'high' ? 'border-l-4 border-red-400' :
                issue.severity === 'medium' ? 'border-l-4 border-amber-400' :
                'border-l-4 border-slate-200'
              }`}
            >
              <div 
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setSelectedIssue(isSelected ? null : issue.id)}
              >
                {/* Type Icon */}
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                  issue.type === 'absolute_statement' ? 'bg-red-100 text-red-600' :
                  issue.type === 'ultimate_issue' ? 'bg-amber-100 text-amber-600' :
                  issue.type === 'clinical_jargon' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {issue.type === 'absolute_statement' ? '!' :
                   issue.type === 'ultimate_issue' ? '' :
                   issue.type === 'clinical_jargon' ? '' : ''}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm text-red-600">
                      {issue.original}
                    </code>
                    <span className={`text-xs ${
                      issue.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{issue.description}</p>
                </div>
                
                <span className="text-slate-400">{isSelected ? '▲' : '▼'}</span>
              </div>
              
              {/* Rewrite Options */}
              {isSelected && (
                <div className="mt-3 ml-9 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase">Suggested Rewrites:</p>
                  
                  <div className="space-y-1">
                    <button
                      onClick={() => onApplyRewrite(issue.position, issue.rewrites.conservative)}
                      className="w-full text-left p-2 rounded bg-green-50 hover:bg-green-100 border border-green-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-700 uppercase">Conservative</span>
                        <span className="text-xs text-green-600">(safest)</span>
                      </div>
                      <code className="text-sm text-green-800">{issue.rewrites.conservative}</code>
                    </button>
                    
                    <button
                      onClick={() => onApplyRewrite(issue.position, issue.rewrites.balanced)}
                      className="w-full text-left p-2 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-700 uppercase">Balanced</span>
                        <span className="text-xs text-blue-600">(recommended)</span>
                      </div>
                      <code className="text-sm text-blue-800">{issue.rewrites.balanced}</code>
                    </button>
                    
                    <button
                      onClick={() => onApplyRewrite(issue.position, issue.rewrites.assertive)}
                      className="w-full text-left p-2 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-amber-700 uppercase">Assertive</span>
                        <span className="text-xs text-amber-600">(only if strongly supported)</span>
                      </div>
                      <code className="text-sm text-amber-800">{issue.rewrites.assertive}</code>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Dismiss (keep original)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t bg-slate-50">
        <p className="text-xs text-slate-500">
           Forensic writing should be defensible under cross-examination. 
          When in doubt, choose conservative language.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// INLINE CHECKER FOR TEXTAREA
// ============================================================================

interface InlineLanguageCheckerProps {
  content: string;
  onIssueClick: (issue: LanguageIssue) => void;
}

export function InlineLanguageChecker({ content, onIssueClick }: InlineLanguageCheckerProps) {
  const issues = useMemo(() => analyzeContent(content), [content]);
  const highPriority = issues.filter(i => i.severity === 'high');
  
  if (highPriority.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border-t border-amber-200">
      <span className="text-amber-600 text-xs font-medium">
         {highPriority.length} language issue{highPriority.length > 1 ? 's' : ''}
      </span>
      <div className="flex gap-1">
        {highPriority.slice(0, 3).map(issue => (
          <button
            key={issue.id}
            onClick={() => onIssueClick(issue)}
            className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200"
          >
            "{issue.original}"
          </button>
        ))}
        {highPriority.length > 3 && (
          <span className="text-xs text-amber-500">+{highPriority.length - 3} more</span>
        )}
      </div>
    </div>
  );
}
