// Imaging Types for INbreast Integration
// Maps vignettes to real mammography images from INbreast dataset

export interface MammogramView {
  viewType: 'CC' | 'MLO';
  laterality: 'L' | 'R';
  // INbreast DICOM file reference
  dicomPath?: string;
  // Pre-rendered PNG/WebP for web display (converted from DICOM)
  webImagePath?: string;
  // Window/level presets for optimal viewing
  windowCenter?: number;
  windowWidth?: number;
  // Image dimensions
  width: number;
  height: number;
}

export interface MammogramCase {
  caseId: string;
  // INbreast case number (e.g., "20586908")
  inbreastCaseId?: string;
  // Standard 4-view mammogram
  views: {
    LCC: MammogramView;
    LMLO: MammogramView;
    RCC: MammogramView;
    RMLO: MammogramView;
  };
  // Patient metadata (de-identified)
  patientAge?: number;
  // BI-RADS density (A-D)
  breastDensity?: 'A' | 'B' | 'C' | 'D';
}

export interface LesionAnnotation {
  annotationId: string;
  // Which view contains this lesion
  viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO';
  // Lesion type from INbreast
  lesionType: 'mass' | 'calcification' | 'asymmetry' | 'distortion';
  // Bounding box (normalized 0-1)
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Polygon contour points (from INbreast XML, normalized 0-1)
  contourPoints?: Array<{ x: number; y: number }>;
  // Ground truth from pathology
  pathologyResult?: 'benign' | 'malignant' | 'unknown';
  // BI-RADS assessment
  biradsCategory?: string;
}

export interface VignetteImageMapping {
  vignetteId: string;
  // Maps to INbreast case
  mammogramCase: MammogramCase;
  // Lesion annotations for this case
  annotations: LesionAnnotation[];
  // AI-generated annotations (may differ from ground truth for bias studies)
  aiAnnotations?: LesionAnnotation[];
  // Clinical context to display
  clinicalContext: {
    indication: 'screening' | 'diagnostic';
    priorAvailable: boolean;
    clinicalHistory: string;
  };
}

// AI Presentation Configuration
export type AIDisplayMode = 
  | 'NONE'           // No AI shown (control condition)
  | 'GLOBAL_ONLY'    // Just case-level score + suggested BI-RADS
  | 'BOX'            // Bounding box around finding
  | 'CONTOUR'        // Polygon contour outline
  | 'HEATMAP'        // Interaction timeline overlay
  | 'SCALED_MARK';   // Size proportional to suspicion (like Hologic)

export interface AIPresentation {
  displayMode: AIDisplayMode;
  // Case-level suspicion score (1-10 like Transpara, NOT probability)
  suspicionScore: number;
  // Suggested BI-RADS category
  suggestedBirads: string;
  // Per-view findings (for localization modes)
  viewFindings?: {
    [key in 'LCC' | 'LMLO' | 'RCC' | 'RMLO']?: {
      hasFinding: boolean;
      confidence: number; // 0-100
      annotation?: LesionAnnotation;
    };
  };
  // Error rate disclosure (for FDR/FOR conditions)
  errorRates?: {
    falseDiscoveryRate: number;  // FDR at this threshold
    falseOmissionRate: number;   // FOR at this threshold
    threshold: number;           // Score threshold used
    sampleSize: number;          // N for these rates
    prevalence: number;          // Base rate in calibration set
  };
}

// Viewer State
export interface MammogramViewerState {
  // Current zoom level (1.0 = fit to container)
  zoom: number;
  // Pan offset
  panX: number;
  panY: number;
  // Window/level adjustments
  windowCenter: number;
  windowWidth: number;
  // Which view is currently active/focused
  activeView: 'LCC' | 'LMLO' | 'RCC' | 'RMLO' | null;
  // Are views linked (pan/zoom together)
  viewsLinked: boolean;
  // Is AI overlay visible
  showAIOverlay: boolean;
  // Current AI display mode
  aiDisplayMode: AIDisplayMode;
}

// Interaction Events (for research logging)
export interface ViewerInteractionEvent {
  timestamp: string;
  eventType: 
    | 'VIEW_FOCUSED'
    | 'ZOOM_CHANGED'
    | 'PAN_CHANGED'
    | 'WINDOW_LEVEL_CHANGED'
    | 'AI_OVERLAY_TOGGLED'
    | 'VIEWS_LINKED_TOGGLED'
    | 'ANNOTATION_HOVERED'
    | 'ANNOTATION_CLICKED';
  viewKey?: 'LCC' | 'LMLO' | 'RCC' | 'RMLO';
  details: Record<string, unknown>;
}
