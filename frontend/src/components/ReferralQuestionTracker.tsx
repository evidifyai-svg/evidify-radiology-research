// ReferralQuestionTracker.tsx - Tracks coverage of referral questions
// Ensures evaluator stays on track and addresses all psycholegal questions

import { useMemo } from 'react';

// ============================================================================
// TYPES - Compatible with App.tsx types
// ============================================================================

interface Claim {
  id: string;
  claim_text?: string;
  text?: string;
  claim_type: string;
  section_id: string;
  citations: unknown[];  // Accept any citation format
}

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
}

interface ReportSection {
  id: string;
  title: string;
  section_type: string;
  content?: string;
}

interface ReferralQuestionStatus {
  question: string;
  index: number;
  status: 'not_addressed' | 'partially_addressed' | 'fully_addressed';
  evidence_count: number;
  claim_count: number;
  opinion_count: number;
  section_coverage: string[];
  gaps: string[];
  confidence: 'low' | 'medium' | 'high';
}

interface ReferralQuestionTrackerProps {
  questions: string[];
  claims: Claim[];
  evidence: EvidenceItem[];
  sections: ReportSection[];
  onQuestionClick?: (questionIndex: number) => void;
}

// ============================================================================
// QUESTION KEYWORDS FOR MATCHING
// ============================================================================

// Keywords that help match evidence/claims to referral questions
const QUESTION_KEYWORD_PATTERNS: Record<string, string[]> = {
  // Custody-related
  'best interest': ['custody', 'arrangement', 'placement', 'welfare', 'child', 'parenting'],
  'strengths': ['strength', 'capacity', 'ability', 'competent', 'skill', 'positive'],
  'limitations': ['limitation', 'weakness', 'concern', 'deficit', 'difficulty', 'challenge'],
  'safety': ['safety', 'risk', 'harm', 'abuse', 'neglect', 'danger', 'violence', 'substance'],
  
  // Competency-related
  'factual understanding': ['understand', 'comprehend', 'knowledge', 'aware', 'charge', 'proceeding'],
  'rational understanding': ['rational', 'appreciate', 'reasoning', 'consequence'],
  'assist counsel': ['assist', 'counsel', 'attorney', 'lawyer', 'defense', 'cooperate', 'communicate'],
  
  // Disability-related
  'functional limitation': ['function', 'limitation', 'restrict', 'impair', 'work', 'activity'],
  'work capacity': ['work', 'employ', 'job', 'occupation', 'gainful', 'capacity'],
  'duration': ['duration', 'prognosis', 'long-term', 'permanent', 'temporary', 'expected'],
  'diagnosis': ['diagnos', 'disorder', 'condition', 'mental health', 'psychiatric'],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ReferralQuestionTracker({
  questions,
  claims,
  evidence,
  sections,
  onQuestionClick,
}: ReferralQuestionTrackerProps) {
  
  // Analyze coverage for each question
  const questionStatuses = useMemo((): ReferralQuestionStatus[] => {
    return questions.map((question, index) => {
      const questionLower = question.toLowerCase();
      
      // Find matching keywords for this question
      const relevantKeywords: string[] = [];
      for (const [pattern, keywords] of Object.entries(QUESTION_KEYWORD_PATTERNS)) {
        if (questionLower.includes(pattern) || keywords.some(k => questionLower.includes(k))) {
          relevantKeywords.push(...keywords);
        }
      }
      
      // If no specific keywords found, extract words from the question
      if (relevantKeywords.length === 0) {
        const words = questionLower.split(/\s+/).filter(w => w.length > 4);
        relevantKeywords.push(...words);
      }
      
      // Count evidence that might relate to this question
      const relatedEvidence = evidence.filter(e => {
        const nameAndType = `${e.filename} ${e.evidence_type}`.toLowerCase();
        return relevantKeywords.some(k => nameAndType.includes(k));
      });
      
      // Count claims that might relate to this question
      const relatedClaims = claims.filter(c => {
        const claimText = (c.claim_text || c.text || '').toLowerCase();
        return relevantKeywords.some(k => claimText.includes(k));
      });
      
      // Count opinion claims specifically
      const opinionClaims = relatedClaims.filter(c => 
        c.claim_type === 'forensic_opinion' || 
        c.claim_type === 'opinion' ||
        c.claim_type === 'ultimate_opinion'
      );
      
      // Find sections that address this question
      const coveringSections = sections.filter(s => {
        const sectionText = `${s.title} ${s.content || ''}`.toLowerCase();
        return relevantKeywords.some(k => sectionText.includes(k));
      });
      
      // Determine gaps
      const gaps: string[] = [];
      if (relatedEvidence.length === 0) {
        gaps.push('No evidence linked');
      }
      if (relatedClaims.length === 0) {
        gaps.push('No claims address this');
      }
      if (opinionClaims.length === 0) {
        gaps.push('No opinion rendered');
      }
      if (coveringSections.length === 0) {
        gaps.push('No section coverage');
      }
      
      // Determine overall status
      let status: 'not_addressed' | 'partially_addressed' | 'fully_addressed';
      let confidence: 'low' | 'medium' | 'high';
      
      if (opinionClaims.length > 0 && relatedClaims.length >= 2 && relatedEvidence.length >= 1) {
        status = 'fully_addressed';
        confidence = 'high';
      } else if (relatedClaims.length > 0 || relatedEvidence.length > 0) {
        status = 'partially_addressed';
        confidence = opinionClaims.length > 0 ? 'medium' : 'low';
      } else {
        status = 'not_addressed';
        confidence = 'low';
      }
      
      return {
        question,
        index,
        status,
        evidence_count: relatedEvidence.length,
        claim_count: relatedClaims.length,
        opinion_count: opinionClaims.length,
        section_coverage: coveringSections.map(s => s.title),
        gaps,
        confidence,
      };
    });
  }, [questions, claims, evidence, sections]);
  
  // Summary stats
  const summary = useMemo(() => {
    const total = questionStatuses.length;
    const fullyAddressed = questionStatuses.filter(q => q.status === 'fully_addressed').length;
    const partiallyAddressed = questionStatuses.filter(q => q.status === 'partially_addressed').length;
    const notAddressed = questionStatuses.filter(q => q.status === 'not_addressed').length;
    const completionPercent = total > 0 ? Math.round((fullyAddressed / total) * 100) : 0;
    
    return { total, fullyAddressed, partiallyAddressed, notAddressed, completionPercent };
  }, [questionStatuses]);
  
  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-slate-700 mb-2">📋 Referral Questions</h3>
        <p className="text-sm text-slate-500 italic">No referral questions defined for this case.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Header with Summary */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700">📋 Referral Questions</h3>
          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
            summary.completionPercent === 100 ? 'bg-green-100 text-green-700' :
            summary.completionPercent >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {summary.completionPercent}% Complete
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div 
              className="bg-green-500 transition-all" 
              style={{ width: `${(summary.fullyAddressed / summary.total) * 100}%` }}
            />
            <div 
              className="bg-amber-400 transition-all" 
              style={{ width: `${(summary.partiallyAddressed / summary.total) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Addressed ({summary.fullyAddressed})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Partial ({summary.partiallyAddressed})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Not Addressed ({summary.notAddressed})
          </span>
        </div>
      </div>
      
      {/* Question List */}
      <div className="divide-y max-h-96 overflow-y-auto">
        {questionStatuses.map((qs) => (
          <div 
            key={qs.index}
            className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
              qs.status === 'not_addressed' ? 'bg-red-50/50' : ''
            }`}
            onClick={() => onQuestionClick?.(qs.index)}
          >
            <div className="flex items-start gap-3">
              {/* Status Icon */}
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                qs.status === 'fully_addressed' ? 'bg-green-500 text-white' :
                qs.status === 'partially_addressed' ? 'bg-amber-400 text-white' :
                'bg-slate-300 text-slate-600'
              }`}>
                {qs.status === 'fully_addressed' ? '✓' :
                 qs.status === 'partially_addressed' ? '◐' : '○'}
              </div>
              
              {/* Question Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Q{qs.index + 1}: {qs.question}
                </p>
                
                {/* Stats Row */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded ${
                    qs.claim_count > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {qs.claim_count} claim{qs.claim_count !== 1 ? 's' : ''}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${
                    qs.evidence_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {qs.evidence_count} evidence
                  </span>
                  {qs.opinion_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      Opinion ✓
                    </span>
                  )}
                </div>
                
                {/* Gaps */}
                {qs.gaps.length > 0 && qs.status !== 'fully_addressed' && (
                  <div className="mt-2 text-xs text-red-600">
                    <span className="font-medium">Needs:</span>{' '}
                    {qs.gaps.join(' • ')}
                  </div>
                )}
                
                {/* Section Coverage */}
                {qs.section_coverage.length > 0 && (
                  <div className="mt-1 text-xs text-slate-500">
                    Sections: {qs.section_coverage.slice(0, 3).join(', ')}
                    {qs.section_coverage.length > 3 && ` +${qs.section_coverage.length - 3} more`}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer Warning */}
      {summary.notAddressed > 0 && (
        <div className="p-3 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-700">
            ⚠️ <strong>{summary.notAddressed} question{summary.notAddressed > 1 ? 's' : ''}</strong> not yet addressed. 
            Report cannot be finalized until all referral questions have opinions.
          </p>
        </div>
      )}
    </div>
  );
}
