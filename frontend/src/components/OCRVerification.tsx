// OCRVerification.tsx - OCR confidence tracking and verification
// Attack #12: "Your app uses OCR. How do you know OCR errors didn't corrupt your 'facts'?"

import React, { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface OCRResult {
  id: string;
  evidence_id: string;
  page_number: number;
  
  // OCR output
  extracted_text: string;
  confidence: number;  // 0-100
  
  // Verification
  needs_verification: boolean;  // True if confidence < threshold
  human_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  verified_text?: string;  // Corrected text if different from extracted
  verification_notes?: string;
  
  // Source image reference
  page_image_hash: string;
  page_image_available: boolean;
  
  // Metadata
  ocr_engine: string;  // e.g., "Tesseract 5.3"
  ocr_settings: Record<string, unknown>;
  processing_timestamp: string;
}

export interface OCRCitation {
  citation_id: string;
  claim_id: string;
  evidence_id: string;
  page_number: number;
  
  // Citation details
  quote: string;
  start_offset: number;
  end_offset: number;
  
  // OCR source info
  ocr_source: boolean;
  ocr_result_id?: string;
  ocr_confidence?: number;
  ocr_verified: boolean;
  
  // Verification status
  requires_verification: boolean;
  verification_status: 'not_required' | 'pending' | 'verified' | 'corrected' | 'flagged';
}

interface OCRVerificationDashboardProps {
  ocrResults: OCRResult[];
  citations: OCRCitation[];
  onVerifyResult: (resultId: string, verifiedText: string, notes?: string) => void;
  onViewPageImage: (evidenceId: string, pageNumber: number) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIDENCE_THRESHOLD = 85;  // Below this requires verification
const HIGH_CONFIDENCE_THRESHOLD = 95;

// ============================================================================
// COMPONENT
// ============================================================================

export function OCRVerificationDashboard({
  ocrResults,
  citations,
  onVerifyResult,
  onViewPageImage,
}: OCRVerificationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'all'>('overview');
  const [selectedResult, setSelectedResult] = useState<OCRResult | null>(null);
  const [verificationText, setVerificationText] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  
  // Calculate stats
  const stats = useMemo(() => {
    const total = ocrResults.length;
    const highConfidence = ocrResults.filter(r => r.confidence >= HIGH_CONFIDENCE_THRESHOLD).length;
    const mediumConfidence = ocrResults.filter(r => r.confidence >= CONFIDENCE_THRESHOLD && r.confidence < HIGH_CONFIDENCE_THRESHOLD).length;
    const lowConfidence = ocrResults.filter(r => r.confidence < CONFIDENCE_THRESHOLD).length;
    const verified = ocrResults.filter(r => r.human_verified).length;
    const pendingVerification = ocrResults.filter(r => r.needs_verification && !r.human_verified).length;
    
    // Citations using low-confidence OCR
    const lowConfidenceCitations = citations.filter(c => 
      c.ocr_source && c.ocr_confidence && c.ocr_confidence < CONFIDENCE_THRESHOLD && !c.ocr_verified
    );
    
    return {
      total,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      verified,
      pendingVerification,
      lowConfidenceCitations: lowConfidenceCitations.length,
      avgConfidence: total > 0 ? Math.round(ocrResults.reduce((sum, r) => sum + r.confidence, 0) / total) : 0,
    };
  }, [ocrResults, citations]);
  
  // Filter results based on tab
  const filteredResults = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return ocrResults.filter(r => r.needs_verification && !r.human_verified);
      case 'all':
        return ocrResults;
      default:
        return [];
    }
  }, [ocrResults, activeTab]);
  
  // Handle verification submit
  const handleVerify = () => {
    if (selectedResult) {
      onVerifyResult(selectedResult.id, verificationText || selectedResult.extracted_text, verificationNotes);
      setSelectedResult(null);
      setVerificationText('');
      setVerificationNotes('');
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
    if (confidence >= CONFIDENCE_THRESHOLD) return { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' };
    if (confidence >= 70) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  };
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-cyan-50 to-white">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          OCR Verification Dashboard
        </h2>
        <p className="text-sm text-slate-500">
          Track and verify OCR-extracted text accuracy
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="p-4 border-b bg-slate-50">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">{stats.avgConfidence}%</div>
            <div className="text-xs text-slate-500">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-xs text-slate-500">Verified</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.pendingVerification > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {stats.pendingVerification}
            </div>
            <div className="text-xs text-slate-500">Pending Verification</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.lowConfidenceCitations > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.lowConfidenceCitations}
            </div>
            <div className="text-xs text-slate-500">Unverified Citations</div>
          </div>
        </div>
        
        {/* Confidence Distribution */}
        <div className="mt-4">
          <div className="text-xs text-slate-500 mb-1">Confidence Distribution</div>
          <div className="h-4 rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500" 
              style={{ width: `${(stats.highConfidence / stats.total) * 100}%` }}
              title={`High (≥95%): ${stats.highConfidence}`}
            />
            <div 
              className="bg-blue-500" 
              style={{ width: `${(stats.mediumConfidence / stats.total) * 100}%` }}
              title={`Medium (85-94%): ${stats.mediumConfidence}`}
            />
            <div 
              className="bg-red-500" 
              style={{ width: `${(stats.lowConfidence / stats.total) * 100}%` }}
              title={`Low (<85%): ${stats.lowConfidence}`}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>High: {stats.highConfidence}</span>
            <span>Medium: {stats.mediumConfidence}</span>
            <span>Low: {stats.lowConfidence}</span>
          </div>
        </div>
      </div>
      
      {/* Warning Banner */}
      {stats.lowConfidenceCitations > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-700">
            Warning: <strong>{stats.lowConfidenceCitations} citation(s)</strong> use low-confidence OCR text 
            that has not been verified. These should be verified against source images before export.
          </p>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'pending', label: `⏳ Pending (${stats.pendingVerification})` },
            { id: 'all', label: 'All Results' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-cyan-600 text-cyan-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex max-h-[400px]">
        {/* Results List */}
        <div className={`${selectedResult ? 'w-1/2' : 'w-full'} overflow-y-auto border-r`}>
          {activeTab === 'overview' ? (
            <div className="p-4 space-y-4">
              {/* Citations needing attention */}
              {stats.lowConfidenceCitations > 0 && (
                <div>
                  <h3 className="font-medium text-slate-700 mb-2">Citations Needing Verification</h3>
                  <div className="space-y-2">
                    {citations
                      .filter(c => c.ocr_source && c.ocr_confidence && c.ocr_confidence < CONFIDENCE_THRESHOLD && !c.ocr_verified)
                      .slice(0, 5)
                      .map(citation => {
                        const colors = getConfidenceColor(citation.ocr_confidence!);
                        return (
                          <div 
                            key={citation.citation_id}
                            className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              const result = ocrResults.find(r => r.id === citation.ocr_result_id);
                              if (result) {
                                setSelectedResult(result);
                                setVerificationText(result.extracted_text);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                {citation.ocr_confidence}% confidence
                              </span>
                              <span className="text-xs text-slate-400">
                                Page {citation.page_number}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 italic">
                              "{citation.quote.slice(0, 80)}..."
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {stats.lowConfidenceCitations === 0 && stats.pendingVerification === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-green-600 font-medium">All OCR content verified or high-confidence</p>
                  <p className="text-sm mt-1">No verification actions required</p>
                </div>
              )}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No results to display
            </div>
          ) : (
            <div className="divide-y">
              {filteredResults.map(result => {
                const colors = getConfidenceColor(result.confidence);
                
                return (
                  <div
                    key={result.id}
                    className={`p-3 cursor-pointer hover:bg-slate-50 ${
                      selectedResult?.id === result.id ? 'bg-cyan-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedResult(result);
                      setVerificationText(result.verified_text || result.extracted_text);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                          {result.confidence}%
                        </span>
                        {result.human_verified && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                            Verified
                          </span>
                        )}
                        {result.needs_verification && !result.human_verified && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        Page {result.page_number}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {result.extracted_text.slice(0, 150)}...
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Verification Panel */}
        {selectedResult && (
          <div className="w-1/2 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-700">Verify OCR Text</h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            
            {/* Source Info */}
            <div className="mb-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Page {selectedResult.page_number}</span>
                <span className={getConfidenceColor(selectedResult.confidence).text}>
                  {selectedResult.confidence}% confidence
                </span>
              </div>
              <button
                onClick={() => onViewPageImage(selectedResult.evidence_id, selectedResult.page_number)}
                className="text-cyan-600 hover:text-cyan-800 text-sm mt-1"
              >
                View Original Page Image →
              </button>
            </div>
            
            {/* OCR Text */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1 block">OCR Extracted Text</label>
              <div className="p-2 bg-slate-100 rounded text-sm max-h-32 overflow-y-auto">
                {selectedResult.extracted_text}
              </div>
            </div>
            
            {/* Verification Input */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1 block">
                Verified Text (edit if OCR has errors)
              </label>
              <textarea
                value={verificationText}
                onChange={(e) => setVerificationText(e.target.value)}
                className="w-full p-2 border rounded text-sm h-32"
                placeholder="Correct any OCR errors..."
              />
            </div>
            
            {/* Notes */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1 block">Verification Notes (optional)</label>
              <input
                type="text"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                placeholder="e.g., 'Corrected handwritten date'"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Verified
              </button>
              <button
                onClick={() => {
                  setVerificationText(selectedResult.extracted_text);
                }}
                className="px-4 py-2 border rounded hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
            
            {/* Warning about changes */}
            {verificationText !== selectedResult.extracted_text && (
              <p className="text-xs text-amber-600 mt-2">
                Warning: Text has been modified from OCR output. Changes will be logged.
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t bg-cyan-50">
        <p className="text-xs text-cyan-700">
          Note: Low-confidence OCR (below {CONFIDENCE_THRESHOLD}%) requires human verification 
          against the source image before it can be cited as fact.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// FINALIZE GATE
// ============================================================================

export const OCR_VERIFICATION_GATE = {
  id: 'ocr_verification',
  name: 'OCR Verification',
  description: 'All low-confidence OCR citations must be verified',
  blocking: true,
  
  check: (citations: OCRCitation[]): { passed: boolean; issues: string[] } => {
    const unverified = citations.filter(c => 
      c.ocr_source && 
      c.ocr_confidence !== undefined && 
      c.ocr_confidence < CONFIDENCE_THRESHOLD && 
      !c.ocr_verified
    );
    
    if (unverified.length === 0) {
      return { passed: true, issues: [] };
    }
    
    return {
      passed: false,
      issues: unverified.map(c => 
        `Citation on page ${c.page_number} uses unverified low-confidence OCR (${c.ocr_confidence}%)`
      ),
    };
  },
  
  message: 'Citations using low-confidence OCR must be verified against source images before export',
};

// ============================================================================
// EXPORT METADATA
// ============================================================================

export function generateOCRMetadataForExport(
  ocrResults: OCRResult[],
  citations: OCRCitation[]
): {
  summary: Record<string, unknown>;
  citationDetails: Record<string, unknown>[];
} {
  const ocrCitations = citations.filter(c => c.ocr_source);
  
  return {
    summary: {
      total_ocr_pages: ocrResults.length,
      average_confidence: ocrResults.length > 0 
        ? Math.round(ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length)
        : null,
      pages_verified: ocrResults.filter(r => r.human_verified).length,
      citations_from_ocr: ocrCitations.length,
      citations_verified: ocrCitations.filter(c => c.ocr_verified).length,
      ocr_engine: ocrResults[0]?.ocr_engine || 'Unknown',
    },
    citationDetails: ocrCitations.map(c => ({
      citation_id: c.citation_id,
      page: c.page_number,
      confidence: c.ocr_confidence,
      verified: c.ocr_verified,
      verification_status: c.verification_status,
    })),
  };
}
