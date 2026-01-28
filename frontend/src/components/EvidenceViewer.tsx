// EvidenceViewer.tsx - PDF viewer with annotation and promote-to-claim workflow
// This is the "killer workflow" that makes Evidify different

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// CRITICAL: PDF worker MUST be local to maintain "Network Silent" guarantee
// Never use CDN - this would break defensibility claims
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceItem {
  id: string;
  case_id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;  // Can be string or object from backend
  review_status: string | Record<string, unknown>;  // Can be string or object from backend
  relied_upon: boolean;
  content_hash: string;
  bates_start?: string;
  bates_end?: string;
  page_count?: number;
}

// Helper to format evidence_type for display
const formatEvidenceType = (evidenceType: string | Record<string, unknown> | undefined | null): string => {
  if (!evidenceType) return 'Unknown';
  if (typeof evidenceType === 'string') {
    return evidenceType.replace(/_/g, ' ');
  }
  if (typeof evidenceType === 'object') {
    const keys = Object.keys(evidenceType);
    if (keys.length > 0) {
      return keys[0].replace(/([A-Z])/g, ' $1').trim();
    }
  }
  return 'Unknown';
};

// Helper to get evidence_type as normalized string for comparison
const normalizeEvidenceType = (evidenceType: string | Record<string, unknown> | undefined | null): string => {
  if (!evidenceType) return 'other';
  if (typeof evidenceType === 'string') {
    return evidenceType.toLowerCase().replace(/[_\s]/g, '');
  }
  if (typeof evidenceType === 'object') {
    const keys = Object.keys(evidenceType);
    if (keys.length > 0) {
      return keys[0].toLowerCase().replace(/[_\s]/g, '');
    }
  }
  return 'other';
};

// Helper to get review_status as string
const getReviewStatus = (status: string | Record<string, unknown> | undefined | null): string => {
  if (!status) return 'pending';
  if (typeof status === 'string') return status;
  if (typeof status === 'object') {
    const keys = Object.keys(status);
    if (keys.length > 0) return keys[0].toLowerCase();
  }
  return 'pending';
};

interface Annotation {
  id: string;
  evidence_id: string;
  annotation_type: string;
  page: number;
  start_offset: number;
  end_offset: number;
  excerpt: string;
  excerpt_hash: string;
  note?: string;
  tags: string[];
  reliability_rating?: string;
  relied_upon: boolean;
  linked_claim_id?: string;
  created_at: string;
}

interface TextSelection {
  text: string;
  page: number;
  startOffset: number;
  endOffset: number;
  rects: DOMRect[];
}

interface PromoteToClaimResult {
  claim_id: string;
  citation_anchor: {
    id: string;
    evidence_id: string;
    page: number;
    excerpt: string;
    excerpt_hash: string;
    citation_string: string;
  };
  annotation_updated: boolean;
}

interface ApiResult<T> {
  status: 'success' | 'error';
  data?: T;
  error?: { code: string; message: string };
}

// ============================================================================
// ANNOTATION TYPES
// ============================================================================

const ANNOTATION_TYPES = [
  { id: 'key_fact', label: 'Key Fact', icon: '', color: 'bg-blue-100 border-blue-500' },
  { id: 'test_result', label: 'Test Result', icon: '', color: 'bg-purple-100 border-purple-500' },
  { id: 'collateral_statement', label: 'Collateral Statement', icon: '', color: 'bg-green-100 border-green-500' },
  { id: 'self_report', label: 'Self Report', icon: '', color: 'bg-teal-100 border-teal-500' },
  { id: 'timeline_event', label: 'Timeline Event', icon: '', color: 'bg-orange-100 border-orange-500' },
  { id: 'contradiction', label: 'Contradiction', icon: '', color: 'bg-red-100 border-red-500' },
  { id: 'limitation', label: 'Limitation', icon: '', color: 'bg-yellow-100 border-yellow-500' },
  { id: 'methodology_concern', label: 'Methodology Concern', icon: '', color: 'bg-amber-100 border-amber-500' },
  { id: 'hearsay_flag', label: 'Hearsay', icon: '', color: 'bg-rose-100 border-rose-500' },
  { id: 'highlight', label: 'Highlight', icon: '', color: 'bg-gray-100 border-gray-500' },
];

const CLAIM_TYPES = [
  { id: 'record_fact', label: 'Record Fact' },
  { id: 'behavioral_observation', label: 'Behavioral Observation' },
  { id: 'test_result', label: 'Test Result' },
  { id: 'collateral_statement', label: 'Collateral Statement' },
  { id: 'self_report', label: 'Self Report' },
  { id: 'clinical_inference', label: 'Clinical Inference' },
  { id: 'diagnostic_conclusion', label: 'Diagnostic Conclusion' },
  { id: 'forensic_opinion', label: 'Forensic Opinion' },
];

// ============================================================================
// SAMPLE CONTENT GENERATOR (for demo/testing)
// ============================================================================

const generateSampleContent = (evidence: EvidenceItem): string => {
  const filename = evidence.filename.toLowerCase();
  const evidenceType = normalizeEvidenceType(evidence.evidence_type);
  
  // Generate realistic content based on evidence type
  if (evidenceType === 'clinicalinterview' || evidenceType.includes('interview') || filename.includes('interview')) {
    return `CLINICAL INTERVIEW SUMMARY

Patient/Evaluee: [Name Redacted]
Date of Interview: [Date]
Evaluator: [Clinician Name], Ph.D.

PRESENTING CONCERNS:

The evaluee was referred for psychological evaluation to assess current functioning and diagnostic considerations. During the clinical interview, the evaluee presented as cooperative and engaged throughout the assessment process.

The evaluee reported experiencing persistent anxiety symptoms for approximately six months, describing worry that occurs "nearly every day" and interferes with occupational functioning. Specific concerns include difficulty concentrating at work, sleep disturbance with approximately 5 hours of sleep per night, and somatic symptoms including tension headaches.

BEHAVIORAL OBSERVATIONS:

The evaluee arrived on time for the appointment and was appropriately groomed. Eye contact was maintained throughout the interview. Speech was clear and coherent with normal rate and volume. Mood was described as "tense" with congruent affect. No psychomotor agitation or retardation was observed.

The evaluee demonstrated good insight into presenting concerns and acknowledged the need for intervention. Judgment appeared intact based on responses to hypothetical scenarios. No evidence of thought disorder, delusions, or perceptual disturbances was noted.

RELEVANT HISTORY:

The evaluee reported a supportive upbringing with no significant trauma history. Educational history includes completion of a bachelor's degree. Current employment is stable with reported job satisfaction despite anxiety-related challenges.

The evaluee denied any history of substance use, legal involvement, or domestic violence. Family psychiatric history is notable for anxiety in a first-degree relative.

DIAGNOSTIC IMPRESSIONS:

Based on the clinical interview, behavioral observations, and reported symptom presentation, the evaluee's presentation is consistent with Generalized Anxiety Disorder as characterized by excessive worry, sleep disturbance, and functional impairment.`;
  }
  
  if (evidenceType === 'medicalrecord' || evidenceType === 'medicalrecords' || filename.includes('medical')) {
    return `MEDICAL RECORD SUMMARY

Patient: [Name Redacted]
Date of Birth: [DOB]
Medical Record Number: [MRN]
Primary Care Provider: [Provider Name], MD

CHIEF COMPLAINT:
Routine physical examination and management of chronic conditions.

HISTORY OF PRESENT ILLNESS:
Patient presents for annual wellness visit. Reports generally good health with well-controlled asthma. Denies chest pain, shortness of breath at rest, or recent exacerbations. Seasonal allergies managed with over-the-counter antihistamines.

Patient reports history of depression diagnosed in early adulthood, treated with cognitive behavioral therapy. Currently not taking psychotropic medications. Denies current depressive symptoms.

MEDICATIONS:
1. Albuterol inhaler 90 mcg - 2 puffs as needed for wheezing
2. Cetirizine 10 mg - once daily during allergy season

VITAL SIGNS:
Blood Pressure: 118/72 mmHg
Heart Rate: 68 bpm
Respiratory Rate: 14 breaths/minute
Temperature: 98.4°F
Oxygen Saturation: 98% on room air

PHYSICAL EXAMINATION:
General: Well-appearing, alert and oriented, in no acute distress
HEENT: Normocephalic, pupils equal and reactive, oropharynx clear
Cardiovascular: Regular rate and rhythm, no murmurs
Respiratory: Clear to auscultation bilaterally, no wheezes or crackles
Neurological: Grossly intact

ASSESSMENT:
1. Mild intermittent asthma - stable, continue current management
2. Seasonal allergic rhinitis - controlled
3. History of depression - in remission

PLAN:
Continue current medications. Annual flu vaccination recommended. Follow up in one year or sooner if symptoms worsen.`;
  }
  
  if (evidenceType === 'legaldocument' || evidenceType === 'legaldocuments' || filename.includes('legal') || filename.includes('court') || filename.includes('custody')) {
    return `COURT ORDER: TEMPORARY CUSTODY ARRANGEMENT

SUPERIOR COURT OF [STATE], FAMILY DIVISION
Case Number: [CASE-NUMBER]
Date of Order: [DATE]

IN THE MATTER OF:
Petitioner: [Parent A]
Respondent: [Parent B]
Minor Child: [Child Initials], age [X]

FINDINGS OF FACT:

After reviewing the petition, responses, and the report submitted by the court-appointed evaluator, and considering the best interests of the child, the Court makes the following findings:

1. Both parents have been actively involved in the minor child's life and demonstrate a genuine interest in the child's welfare.

2. The evaluator's report indicates that the child has a strong emotional bond with both parents and benefits from regular contact with each.

3. The primary residence is located within the child's school district, promoting educational stability.

4. There are no findings of abuse, neglect, or domestic violence by either party.

5. Both parents are capable of providing appropriate care and supervision.

ORDER:

IT IS HEREBY ORDERED that the following temporary custody arrangement shall be in effect pending final adjudication:

1. LEGAL CUSTODY: The parties shall share joint legal custody, with both parents responsible for major decisions regarding education, healthcare, and religious upbringing.

2. PHYSICAL CUSTODY: The minor child shall reside primarily with [Parent A]. [Parent B] shall have parenting time as follows:
   - Weekday: Every Wednesday from 3:00 PM until 8:00 PM
   - Weekend: First and third weekends of each month, Friday 3:00 PM to Sunday 6:00 PM

3. HOLIDAYS: The parties shall alternate major holidays according to the standard schedule.

4. COMMUNICATION: Both parties shall facilitate reasonable communication between the child and the other parent.

This order shall remain in effect until the final custody hearing scheduled for [DATE].

IT IS SO ORDERED.

[Judge Name]
Superior Court Judge`;
  }
  
  if (evidenceType === 'collateralcontact' || evidenceType === 'collateralstatement' || filename.includes('collateral')) {
    return `COLLATERAL CONTACT SUMMARY

Contact Type: Telephone Interview
Date: [DATE]
Collateral Source: [Relationship to Evaluee]
Interviewer: [Clinician Name], Ph.D.

PURPOSE OF CONTACT:
To obtain collateral information regarding the evaluee's functioning, behavior, and relevant history from an independent source.

INFORMATION PROVIDED:

The collateral source has known the evaluee for approximately [X] years in the capacity of [relationship]. The source described the evaluee as generally responsible and caring.

Regarding current functioning, the source noted that the evaluee appears to manage daily responsibilities appropriately. The source has observed the evaluee interacting with others and described these interactions as appropriate and positive.

The source reported no concerns regarding substance use, safety issues, or significant behavioral problems. The source described the evaluee's mood as generally stable, though noted occasional stress related to current circumstances.

When asked about specific observations, the source provided the following information:
- The evaluee maintains regular contact and follows through on commitments
- No history of aggressive or concerning behavior has been observed
- The evaluee demonstrates appropriate judgment in decision-making

RELIABILITY ASSESSMENT:
The collateral source appeared forthcoming and consistent in responses. Information provided was generally consistent with other available data.`;
  }
  
  // Default content for other types
  return `EVIDENCE DOCUMENT

Document Type: ${formatEvidenceType(evidence.evidence_type)}
Filename: ${evidence.filename}
Status: ${getReviewStatus(evidence.review_status)}

DOCUMENT CONTENT:

This document has been ingested into the case file for review. The content below represents the extracted text from the original document.

[Document content would appear here with full text extraction in production. For testing purposes, this placeholder demonstrates the annotation workflow.]

The evaluator reviewed this document as part of the comprehensive evaluation process. Relevant information has been noted and incorporated into the overall assessment.

Key points from this document include observations, findings, or statements that may be relevant to the referral questions. The evaluator will indicate which portions of this document were relied upon in forming opinions.

ANNOTATION INSTRUCTIONS:
Select any text above to create an annotation. Annotations can then be promoted to claims with automatic citation anchoring.`;
};

// ============================================================================
// EVIDENCE VIEWER COMPONENT
// ============================================================================

interface ReportSection {
  id: string;
  title: string;
  section_type: string;
}

interface EvidenceViewerProps {
  evidence: EvidenceItem;
  pdfData: Uint8Array | null;
  reportId?: string;
  sections?: ReportSection[];
  onClose: () => void;
  onClaimCreated?: (claimId: string) => void;
}

export function EvidenceViewer({ evidence, pdfData, reportId, sections, onClose, onClaimCreated }: EvidenceViewerProps) {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [pageText, setPageText] = useState<string>('');
  
  // Selection state
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteAnnotationId, setPromoteAnnotationId] = useState<string | null>(null);
  const [promoteSectionId, setPromoteSectionId] = useState('');
  const [promoteClaimType, setPromoteClaimType] = useState('record_fact');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(true);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // PDF LOADING
  // ============================================================================

  useEffect(() => {
    if (pdfData) {
      loadPdf(pdfData);
    }
    loadAnnotations();
  }, [pdfData, evidence.id]);

  const loadPdf = async (data: Uint8Array) => {
    try {
      setLoading(true);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError(`Failed to load PDF: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    try {
      const result = await invoke<ApiResult<Annotation[]>>('forensic_list_annotations', {
        evidenceId: evidence.id,
      });
      if (result.status === 'success' && result.data) {
        setAnnotations(result.data);
      }
    } catch (err) {
      console.error('Failed to load annotations:', err);
    }
  };

  // ============================================================================
  // PAGE RENDERING
  // ============================================================================

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale]);

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      // Extract text for selection
      const textContent = await page.getTextContent();
      const textItems = textContent.items as { str: string; transform: number[]; width: number; height: number }[];
      setPageText(textItems.map(item => item.str).join(' '));

      // Render proper text layer for selection
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
        textLayerRef.current.style.width = `${viewport.width}px`;
        textLayerRef.current.style.height = `${viewport.height}px`;
        
        // Render each text item at its actual position
        textItems.forEach((item, index) => {
          if (!item.str.trim()) return;
          
          const tx = item.transform;
          // PDF.js transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
          const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) * scale;
          const x = tx[4] * scale;
          const y = viewport.height - (tx[5] * scale) - fontSize;
          
          const span = document.createElement('span');
          span.textContent = item.str;
          span.style.position = 'absolute';
          span.style.left = `${x}px`;
          span.style.top = `${y}px`;
          span.style.fontSize = `${fontSize}px`;
          span.style.fontFamily = 'sans-serif';
          span.style.color = 'transparent';
          span.style.whiteSpace = 'pre';
          span.style.pointerEvents = 'auto';
          span.dataset.textIndex = String(index);
          
          // Calculate width based on transform
          const width = item.width * scale;
          span.style.width = `${width}px`;
          span.style.letterSpacing = `${(width - span.offsetWidth) / item.str.length}px`;
          
          textLayerRef.current!.appendChild(span);
        });
      }

      // Render annotation highlights
      renderAnnotationHighlights(pageNum, viewport);
    } catch (err) {
      setError(`Failed to render page: ${err}`);
    }
  };

  const renderAnnotationHighlights = (pageNum: number, viewport: { width: number; height: number }) => {
    // Render highlight overlays for annotations on this page
    const pageAnns = annotations.filter(a => a.page === pageNum);
    
    if (!textLayerRef.current || pageAnns.length === 0) return;
    
    // Add highlight divs for each annotation
    pageAnns.forEach(ann => {
      const annType = ANNOTATION_TYPES.find(t => t.id === ann.annotation_type);
      const color = annType?.color?.replace('bg-', '').replace('-100', '') || 'yellow';
      
      // Create highlight overlay
      const highlight = document.createElement('div');
      highlight.className = `absolute opacity-30 pointer-events-none`;
      highlight.style.backgroundColor = getHighlightColor(color);
      highlight.dataset.annotationId = ann.id;
      
      // Position will be calculated when we match text
      // For now, add a simple indicator
      const indicator = document.createElement('div');
      indicator.className = 'absolute right-0 top-0 bg-purple-600 text-white text-xs px-1 rounded-bl';
      indicator.textContent = annType?.icon || '';
      indicator.style.fontSize = '10px';
      textLayerRef.current!.appendChild(indicator);
    });
  };
  
  const getHighlightColor = (colorName: string): string => {
    const colors: Record<string, string> = {
      blue: 'rgba(59, 130, 246, 0.3)',
      purple: 'rgba(147, 51, 234, 0.3)',
      green: 'rgba(34, 197, 94, 0.3)',
      teal: 'rgba(20, 184, 166, 0.3)',
      orange: 'rgba(249, 115, 22, 0.3)',
      red: 'rgba(239, 68, 68, 0.3)',
      yellow: 'rgba(234, 179, 8, 0.3)',
      amber: 'rgba(245, 158, 11, 0.3)',
      rose: 'rgba(244, 63, 94, 0.3)',
      gray: 'rgba(156, 163, 175, 0.3)',
    };
    return colors[colorName] || colors.yellow;
  };

  // ============================================================================
  // TEXT SELECTION HANDLING
  // ============================================================================

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      setShowAnnotationMenu(false);
      return;
    }

    const selectedText = sel.toString().trim();
    if (selectedText.length < 3) {
      setSelection(null);
      return;
    }

    // Get selection position for menu
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (containerRect) {
      setMenuPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 10,
      });
    }

    // Calculate offsets (simplified for beta)
    const startOffset = pageText.indexOf(selectedText);
    const endOffset = startOffset + selectedText.length;

    setSelection({
      text: selectedText,
      page: currentPage,
      startOffset: Math.max(0, startOffset),
      endOffset: endOffset,
      rects: [rect],
    });

    setShowAnnotationMenu(true);
  }, [currentPage, pageText]);

  // ============================================================================
  // ANNOTATION CREATION
  // ============================================================================

 const createAnnotation = async (annotationType: string) => {
    if (!selection) return;

    setLoading(true);
    setShowAnnotationMenu(false);

    try {
      const result = await invoke<ApiResult<Annotation>>('forensic_create_annotation', {
        req: {
          evidence_id: evidence.id,
          annotation_type: annotationType,
          page: selection.page,
          start_offset: selection.startOffset,
          end_offset: selection.endOffset,
          excerpt: selection.text,
          note: null,
        },
      });

      if (result.status === 'success' && result.data) {
        setAnnotations(prev => [...prev, result.data!]);
        setSelectedAnnotation(result.data);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      } else {
        setError(result.error?.message || 'Failed to create annotation');
      }
    } catch (err) {
      setError(`Failed to create annotation: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // PROMOTE TO CLAIM
  // ============================================================================

  const openPromoteModal = (annotationId: string) => {
    setPromoteAnnotationId(annotationId);
    setShowPromoteModal(true);
  };

  const promoteToClaim = async () => {
    if (!promoteAnnotationId) return;
    
    if (!reportId) {
      setError('No active report. Create a report first from the Draft tab.');
      return;
    }

    setLoading(true);

try {
      const result = await invoke<ApiResult<PromoteToClaimResult>>('forensic_promote_to_claim', {
        input: {
          annotation_id: promoteAnnotationId,
          report_id: reportId,
          section_id: promoteSectionId || 'default-section',
          claim_type: promoteClaimType,
          claim_text: null, // Use excerpt
        },
        userId: 'clinician-1',
      });

      if (result.status === 'success' && result.data) {
        // Update annotation in list
        setAnnotations(prev =>
          prev.map(a =>
            a.id === promoteAnnotationId
              ? { ...a, linked_claim_id: result.data!.claim_id }
              : a
          )
        );

        setShowPromoteModal(false);
        setPromoteAnnotationId(null);

        // Notify parent
        onClaimCreated?.(result.data.claim_id);

        // Show success
 alert(` Claim created!\n\nCitation: ${result.data.citation_anchor.citation_string}\nHash: ${result.data.citation_anchor.excerpt_hash}`);
      } else {
        setError(result.error?.message || 'Failed to promote to claim');
      }
    } catch (err) {
      setError(`Failed to promote to claim: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const jumpToAnnotation = (annotation: Annotation) => {
    setCurrentPage(annotation.page);
    setSelectedAnnotation(annotation);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const pageAnnotations = annotations.filter(a => a.page === currentPage);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex">
      {/* Main Viewer */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-white hover:text-gray-300">
              ← Back
            </button>
            <div>
              <h2 className="text-white font-medium">{evidence.filename}</h2>
              <p className="text-slate-400 text-sm">
                {formatEvidenceType(evidence.evidence_type)} • {evidence.bates_start || 'No Bates'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                className="text-white hover:text-gray-300 px-2"
              >
                −
              </button>
              <span className="text-white text-sm">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(3, s + 0.2))}
                className="text-white hover:text-gray-300 px-2"
              >
                +
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="text-white hover:text-gray-300 disabled:text-gray-600 px-2"
              >
                ‹
              </button>
              <span className="text-white text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="text-white hover:text-gray-300 disabled:text-gray-600 px-2"
              >
                ›
              </button>
            </div>

            {/* Toggle Annotation Panel */}
            <button
              onClick={() => setShowAnnotationPanel(!showAnnotationPanel)}
              className={`px-3 py-1 rounded text-sm ${
                showAnnotationPanel ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Annotations ({annotations.length})
            </button>
          </div>
        </div>

        {/* PDF Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex justify-center p-4 relative"
          onMouseUp={handleMouseUp}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-white">Loading...</span>
            </div>
          )}

          {pdfData ? (
            <div className="relative">
              <canvas ref={canvasRef} className="shadow-lg" />
              <div
                ref={textLayerRef}
                className="pdf-text-layer absolute top-0 left-0"
                style={{ opacity: 1 }}
              />

              {/* Annotation Menu (appears on text selection) */}
              {showAnnotationMenu && selection && (
                <div
                  className="absolute bg-white rounded-lg shadow-xl border p-2 z-10"
                  style={{
                    left: menuPosition.x,
                    top: menuPosition.y,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="text-xs text-gray-500 mb-2 px-2">Create Annotation</div>
                  <div className="grid grid-cols-5 gap-1">
                    {ANNOTATION_TYPES.slice(0, 5).map(type => (
                      <button
                        key={type.id}
                        onClick={() => createAnnotation(type.id)}
                        className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs"
                        title={type.label}
                      >
                        <span className="text-lg">{type.icon}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                    {ANNOTATION_TYPES.slice(5).map(type => (
                      <button
                        key={type.id}
                        onClick={() => createAnnotation(type.id)}
                        className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs"
                        title={type.label}
                      >
                        <span className="text-lg">{type.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Annotation Indicators */}
              {pageAnnotations.length > 0 && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">
                  {pageAnnotations.length} annotation(s) on this page
                </div>
              )}
            </div>
          ) : (
            /* Text Content Fallback - for non-PDF evidence or when PDF not loaded */
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 select-text">
              <div className="mb-6 pb-4 border-b">
                <h2 className="text-xl font-semibold text-slate-800">{evidence.filename}</h2>
                <div className="flex gap-4 mt-2 text-sm text-slate-500">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">{formatEvidenceType(evidence.evidence_type)}</span>
                  <span>Status: {getReviewStatus(evidence.review_status)}</span>
                  {evidence.relied_upon && <span className="text-purple-600"> Relied Upon</span>}
                </div>
              </div>
              
              {/* Text Content Area */}
              <div className="prose prose-slate max-w-none">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 text-sm font-medium mb-2"> Ready for Annotation</p>
                  <p className="text-green-700 text-sm">
                    <strong>Select any text below</strong> to create an annotation, then promote it to a claim with automatic citation.
                  </p>
                </div>
                
                {/* Show pageText or generated sample content */}
                <div 
                  className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif"
                  style={{ minHeight: '400px' }}
                  onMouseUp={handleMouseUp}
                >
                  {pageText || generateSampleContent(evidence)}
                </div>
              </div>

              {/* Annotation Menu for text view */}
              {showAnnotationMenu && selection && (
                <div
                  className="fixed bg-white rounded-lg shadow-xl border p-2 z-50"
                  style={{
                    left: menuPosition.x + (containerRef.current?.getBoundingClientRect().left || 0),
                    top: menuPosition.y + (containerRef.current?.getBoundingClientRect().top || 0),
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="text-xs text-gray-500 mb-2 px-2">Create Annotation</div>
                  <div className="grid grid-cols-5 gap-1">
                    {ANNOTATION_TYPES.slice(0, 5).map(type => (
                      <button
                        key={type.id}
                        onClick={() => createAnnotation(type.id)}
                        className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs"
                        title={type.label}
                      >
                        <span className="text-lg">{type.icon}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                    {ANNOTATION_TYPES.slice(5).map(type => (
                      <button
                        key={type.id}
                        onClick={() => createAnnotation(type.id)}
                        className="p-2 hover:bg-gray-100 rounded flex flex-col items-center text-xs"
                        title={type.label}
                      >
                        <span className="text-lg">{type.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Annotation Panel */}
      {showAnnotationPanel && (
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-slate-700">Annotations</h3>
            <p className="text-xs text-slate-500">
              Select text in the document to create annotations
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {annotations.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                No annotations yet.<br />
                <span className="text-sm">Select text to annotate.</span>
              </p>
            ) : (
              annotations.map(ann => {
                const annType = ANNOTATION_TYPES.find(t => t.id === ann.annotation_type);
                return (
                  <div
                    key={ann.id}
                    onClick={() => jumpToAnnotation(ann)}
                    className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all ${
                      selectedAnnotation?.id === ann.id
                        ? 'ring-2 ring-purple-500 ' + (annType?.color || 'bg-gray-100 border-gray-500')
                        : annType?.color || 'bg-gray-100 border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{annType?.icon || ''}</span>
                        <span className="text-xs font-medium text-slate-600">
                          {annType?.label || ann.annotation_type}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">p. {ann.page}</span>
                    </div>

                    <p className="text-sm text-slate-700 mb-2 line-clamp-3">
                      "{ann.excerpt}"
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">
                        #{ann.excerpt_hash.slice(0, 8)}
                      </span>

                      {ann.linked_claim_id ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                           Claim linked
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPromoteModal(ann.id);
                          }}
                          className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          → Promote to Claim
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-t bg-slate-50">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-lg font-bold text-slate-700">{annotations.length}</div>
                <div className="text-slate-500">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {annotations.filter(a => a.linked_claim_id).length}
                </div>
                <div className="text-slate-500">Claimed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-600">
                  {annotations.filter(a => !a.linked_claim_id).length}
                </div>
                <div className="text-slate-500">Pending</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promote to Claim Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Promote to Claim
            </h3>

            {!reportId ? (
              <div className="text-center py-6">
                <p className="text-amber-600 mb-2"> No active report</p>
                <p className="text-sm text-slate-500">
                  Create a report from the Draft tab first, then come back to promote this annotation.
                </p>
                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Claim Type
                    </label>
                    <select
                      value={promoteClaimType}
                      onChange={(e) => setPromoteClaimType(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {CLAIM_TYPES.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Target Section
                    </label>
                    {sections && sections.length > 0 ? (
                      <select
                        value={promoteSectionId}
                        onChange={(e) => setPromoteSectionId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select a section...</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        No sections available. Add sections in the Draft tab.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Excerpt</p>
                    <p className="text-sm text-slate-700">
                      "{annotations.find(a => a.id === promoteAnnotationId)?.excerpt.slice(0, 100)}..."
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowPromoteModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={promoteToClaim}
                    disabled={loading || !promoteSectionId}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300"
                  >
                    {loading ? 'Creating...' : 'Create Claim with Citation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-500"></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EvidenceViewer;
