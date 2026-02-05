// ---------------------------------------------------------------------------
// Counterfactual Simulator — Demo Data
// Realistic missed lung nodule case for litigation "what if" analysis
// ---------------------------------------------------------------------------

export interface CounterfactualEvent {
  id: string;
  timestamp: string;
  relativeMs: number;
  eventType: string;
  label: string;
  decision?: string;
  confidence?: number;
  isDivergence?: boolean;
}

export interface OutcomeMetric {
  metric: string;
  actual: string;
  counterfactual: string;
  favorsSide: 'plaintiff' | 'defense' | 'neutral';
}

export interface LegalFrame {
  side: 'plaintiff' | 'defense';
  title: string;
  summary: string;
  keyPoints: string[];
}

export type ScenarioId = 'actual' | 'with-ai' | 'without-ai' | 'ai-only';

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  timeline: CounterfactualEvent[];
  outcomes: OutcomeMetric[];
  legalFrames: LegalFrame[];
}

export interface CounterfactualCase {
  caseId: string;
  modality: string;
  studyDate: string;
  patientSummary: string;
  actualOutcome: string;
  keyTimestamps: { label: string; date: string }[];
  scenarios: Scenario[];
}

// ---------------------------------------------------------------------------
// Timeline construction helpers
// ---------------------------------------------------------------------------

const T0 = new Date('2024-11-15T08:30:00.000Z').getTime();
const ts = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

// ---------------------------------------------------------------------------
// Actual workflow timeline (no AI, missed nodule)
// ---------------------------------------------------------------------------

const ACTUAL_TIMELINE: CounterfactualEvent[] = [
  {
    id: 'a01',
    timestamp: ts(0),
    relativeMs: 0,
    eventType: 'CASE_OPENED',
    label: 'Case opened by radiologist',
  },
  {
    id: 'a02',
    timestamp: ts(15_000),
    relativeMs: 15_000,
    eventType: 'SERIES_LOADED',
    label: 'CT Chest loaded (1.25mm axial)',
  },
  {
    id: 'a03',
    timestamp: ts(45_000),
    relativeMs: 45_000,
    eventType: 'SCROLL_REVIEW',
    label: 'Scroll-through review began',
  },
  {
    id: 'a04',
    timestamp: ts(120_000),
    relativeMs: 120_000,
    eventType: 'REGION_VIEWED',
    label: 'RUL viewed (nodule location)',
    decision: 'No finding noted',
  },
  {
    id: 'a05',
    timestamp: ts(180_000),
    relativeMs: 180_000,
    eventType: 'FIRST_IMPRESSION',
    label: 'Initial impression formed',
    decision: 'No acute findings',
    confidence: 85,
  },
  {
    id: 'a06',
    timestamp: ts(210_000),
    relativeMs: 210_000,
    eventType: 'REPORT_DICTATED',
    label: 'Report dictated',
    decision: 'No acute cardiopulmonary process',
  },
  {
    id: 'a07',
    timestamp: ts(240_000),
    relativeMs: 240_000,
    eventType: 'REPORT_SIGNED',
    label: 'Report signed and finalized',
    decision: 'Clean read — no follow-up recommended',
  },
  {
    id: 'a08',
    timestamp: ts(300_000),
    relativeMs: 300_000,
    eventType: 'CASE_CLOSED',
    label: 'Case closed',
  },
];

// ---------------------------------------------------------------------------
// With-AI consultation timeline (AI catches nodule)
// ---------------------------------------------------------------------------

const WITH_AI_TIMELINE: CounterfactualEvent[] = [
  {
    id: 'w01',
    timestamp: ts(0),
    relativeMs: 0,
    eventType: 'CASE_OPENED',
    label: 'Case opened by radiologist',
  },
  {
    id: 'w02',
    timestamp: ts(15_000),
    relativeMs: 15_000,
    eventType: 'SERIES_LOADED',
    label: 'CT Chest loaded (1.25mm axial)',
  },
  {
    id: 'w03',
    timestamp: ts(45_000),
    relativeMs: 45_000,
    eventType: 'SCROLL_REVIEW',
    label: 'Scroll-through review began',
  },
  {
    id: 'w04',
    timestamp: ts(120_000),
    relativeMs: 120_000,
    eventType: 'REGION_VIEWED',
    label: 'RUL viewed (nodule location)',
    decision: 'No finding noted',
  },
  {
    id: 'w05',
    timestamp: ts(180_000),
    relativeMs: 180_000,
    eventType: 'FIRST_IMPRESSION',
    label: 'Initial impression formed (pre-AI)',
    decision: 'No acute findings',
    confidence: 85,
  },
  {
    id: 'w06',
    timestamp: ts(185_000),
    relativeMs: 185_000,
    eventType: 'AI_REVEALED',
    label: 'AI results revealed',
    decision: 'AI flagged 8mm RUL nodule',
    confidence: 78,
    isDivergence: true,
  },
  {
    id: 'w07',
    timestamp: ts(190_000),
    relativeMs: 190_000,
    eventType: 'DISCLOSURE_PRESENTED',
    label: 'Error rate disclosure shown',
    decision: 'FDR: 12%, FOR: 6%',
  },
  {
    id: 'w08',
    timestamp: ts(220_000),
    relativeMs: 220_000,
    eventType: 'SECOND_LOOK',
    label: 'Radiologist re-examines RUL',
    decision: 'Confirms subtle density',
    isDivergence: true,
  },
  {
    id: 'w09',
    timestamp: ts(260_000),
    relativeMs: 260_000,
    eventType: 'REVISED_IMPRESSION',
    label: 'Impression revised',
    decision: '8mm RUL nodule — recommend 3-month f/u CT',
    confidence: 72,
    isDivergence: true,
  },
  {
    id: 'w10',
    timestamp: ts(290_000),
    relativeMs: 290_000,
    eventType: 'REPORT_DICTATED',
    label: 'Addendum dictated with AI-assisted finding',
    decision: 'Indeterminate 8mm nodule RUL, Lung-RADS 3',
  },
  {
    id: 'w11',
    timestamp: ts(310_000),
    relativeMs: 310_000,
    eventType: 'REPORT_SIGNED',
    label: 'Report signed with recommendation',
    decision: '3-month follow-up CT recommended',
    isDivergence: true,
  },
  {
    id: 'w12',
    timestamp: ts(330_000),
    relativeMs: 330_000,
    eventType: 'CASE_CLOSED',
    label: 'Case closed',
  },
];

// ---------------------------------------------------------------------------
// AI-Only timeline (automated, no human in the loop)
// ---------------------------------------------------------------------------

const AI_ONLY_TIMELINE: CounterfactualEvent[] = [
  {
    id: 'o01',
    timestamp: ts(0),
    relativeMs: 0,
    eventType: 'CASE_INGESTED',
    label: 'DICOM ingested by AI pipeline',
  },
  {
    id: 'o02',
    timestamp: ts(3_000),
    relativeMs: 3_000,
    eventType: 'PREPROCESSING',
    label: 'Image preprocessing and QA',
  },
  {
    id: 'o03',
    timestamp: ts(8_000),
    relativeMs: 8_000,
    eventType: 'AI_INFERENCE',
    label: 'Model inference completed',
    decision: '3 candidate detections',
  },
  {
    id: 'o04',
    timestamp: ts(9_000),
    relativeMs: 9_000,
    eventType: 'AI_FINDING',
    label: 'RUL nodule detected — 8mm',
    decision: 'Confidence: 78%, Lung-RADS 3',
    confidence: 78,
    isDivergence: true,
  },
  {
    id: 'o05',
    timestamp: ts(9_500),
    relativeMs: 9_500,
    eventType: 'AI_FINDING',
    label: 'LLL ground-glass opacity (6mm)',
    decision: 'Confidence: 34%, likely artifact',
    confidence: 34,
  },
  {
    id: 'o06',
    timestamp: ts(10_000),
    relativeMs: 10_000,
    eventType: 'AI_FINDING',
    label: 'Mediastinal lymph node (12mm)',
    decision: 'Confidence: 41%, borderline',
    confidence: 41,
  },
  {
    id: 'o07',
    timestamp: ts(11_000),
    relativeMs: 11_000,
    eventType: 'AI_REPORT',
    label: 'Automated report generated',
    decision: '1 actionable finding, 2 low-confidence',
  },
  {
    id: 'o08',
    timestamp: ts(12_000),
    relativeMs: 12_000,
    eventType: 'WORKLIST_FLAG',
    label: 'Case flagged for priority review',
    decision: 'Nodule > 6mm with confidence > 70%',
    isDivergence: true,
  },
];

// ---------------------------------------------------------------------------
// Outcome comparisons
// ---------------------------------------------------------------------------

const ACTUAL_VS_WITH_AI_OUTCOMES: OutcomeMetric[] = [
  {
    metric: 'Finding detected',
    actual: 'No',
    counterfactual: 'Yes (AI flagged)',
    favorsSide: 'plaintiff',
  },
  {
    metric: 'Time to detection',
    actual: '14 months (incidental)',
    counterfactual: '+0 days (same study)',
    favorsSide: 'plaintiff',
  },
  {
    metric: 'AI confidence',
    actual: 'N/A — not used',
    counterfactual: '78%',
    favorsSide: 'neutral',
  },
  {
    metric: 'False discovery rate',
    actual: 'N/A',
    counterfactual: '12% FDR',
    favorsSide: 'defense',
  },
  {
    metric: 'Lung-RADS at detection',
    actual: 'N/A',
    counterfactual: 'Lung-RADS 3 (probably benign)',
    favorsSide: 'defense',
  },
  {
    metric: 'Stage at diagnosis',
    actual: 'Stage IIIA (14 months later)',
    counterfactual: 'Indeterminate (8mm nodule)',
    favorsSide: 'plaintiff',
  },
  {
    metric: 'Follow-up recommended',
    actual: 'None',
    counterfactual: '3-month follow-up CT',
    favorsSide: 'plaintiff',
  },
  {
    metric: 'Additional AI false positives',
    actual: 'N/A',
    counterfactual: '2 low-confidence findings',
    favorsSide: 'defense',
  },
];

const AI_ONLY_OUTCOMES: OutcomeMetric[] = [
  {
    metric: 'Finding detected',
    actual: 'No',
    counterfactual: 'Yes (automated)',
    favorsSide: 'plaintiff',
  },
  {
    metric: 'Processing time',
    actual: '~5 minutes (human read)',
    counterfactual: '12 seconds (inference)',
    favorsSide: 'neutral',
  },
  {
    metric: 'AI confidence on nodule',
    actual: 'N/A',
    counterfactual: '78%',
    favorsSide: 'neutral',
  },
  {
    metric: 'Total detections reported',
    actual: '0',
    counterfactual: '3 (1 actionable, 2 low-confidence)',
    favorsSide: 'defense',
  },
  {
    metric: 'False positive burden',
    actual: '0',
    counterfactual: '2 likely false positives',
    favorsSide: 'defense',
  },
  {
    metric: 'Clinical context considered',
    actual: 'Yes (smoking history noted)',
    counterfactual: 'No (image-only analysis)',
    favorsSide: 'defense',
  },
];

// ---------------------------------------------------------------------------
// Legal framing narratives
// ---------------------------------------------------------------------------

const PLAINTIFF_FRAME_WITH_AI: LegalFrame = {
  side: 'plaintiff',
  title: 'Plaintiff Analysis: Failure to Utilize Available Technology',
  summary:
    'Had AI-assisted detection been utilized during the November 2024 chest CT, the 8mm right upper lobe nodule would have been identified with 78% confidence — a level exceeding the threshold for clinical action under Lung-RADS guidelines.',
  keyPoints: [
    'The AI system detects nodules of this size and morphology with 78% confidence, well above the clinical action threshold.',
    'Under the T.J. Hooper doctrine, failure to adopt available safety technology that is in reasonable use within the profession may constitute negligence.',
    'A 3-month follow-up CT would have been recommended, potentially detecting malignancy at Stage I rather than Stage IIIA.',
    'The 14-month delay resulted in progression from an 8mm indeterminate nodule to a 2.1cm mass with lymph node involvement.',
    'Five-year survival rates differ substantially between Stage I (~80%) and Stage IIIA (~36%) NSCLC.',
  ],
};

const DEFENSE_FRAME_WITH_AI: LegalFrame = {
  side: 'defense',
  title: 'Defense Analysis: Clinical Judgment Within Standard of Care',
  summary:
    'The AI system\'s 12% false discovery rate means approximately 1 in 8 flagged findings are false positives. The radiologist\'s clinical judgment to not over-call was consistent with prevailing standard of care, which does not yet mandate AI-assisted detection.',
  keyPoints: [
    'AI-assisted lung nodule detection is not yet mandated by ACR guidelines or standard-of-care requirements in this jurisdiction.',
    'The 12% false discovery rate means substantial additional patient burden from unnecessary follow-up imaging and biopsies.',
    'The AI also flagged 2 additional low-confidence findings (34% and 41%) that were likely false positives, demonstrating over-detection tendency.',
    'At 8mm with Lung-RADS 3 classification, the nodule was categorized as "probably benign" — even the AI did not classify it as suspicious.',
    'The radiologist\'s read time and coverage were within practice norms. The miss reflects a known limitation of human perception for sub-centimeter nodules, not negligence.',
    'Hindsight bias: knowing the outcome was malignant does not establish that the finding was detectable at the standard expected at the time of reading.',
  ],
};

const PLAINTIFF_FRAME_AI_ONLY: LegalFrame = {
  side: 'plaintiff',
  title: 'Plaintiff Analysis: Automated Detection Capability',
  summary:
    'A fully automated AI pipeline would have flagged the nodule in 9 seconds and routed the case for priority review, preventing the 14-month diagnostic delay.',
  keyPoints: [
    'AI detected the nodule in under 10 seconds with 78% confidence.',
    'The case would have been automatically flagged for priority radiologist review.',
    'Automated triage systems are increasingly available and reduce the risk of findings lost to volume pressure.',
  ],
};

const DEFENSE_FRAME_AI_ONLY: LegalFrame = {
  side: 'defense',
  title: 'Defense Analysis: Limitations of Fully Automated Analysis',
  summary:
    'The AI-only analysis generated 3 findings from a single study — 2 of which were likely false positives. Without clinical context or patient history, the automated system cannot distinguish clinically significant findings from noise.',
  keyPoints: [
    'The AI produced 2 likely false positive findings alongside the true positive, demonstrating poor specificity in isolation.',
    'Automated analysis had no access to clinical history (smoking status, prior imaging, symptoms), which is essential context.',
    'Fully autonomous AI diagnosis is not FDA-approved for primary interpretation — these tools are cleared as decision support only.',
    'The "priority flag" mechanism would add workflow burden across all cases, potentially causing alert fatigue and paradoxically increasing miss rates.',
  ],
};

// ---------------------------------------------------------------------------
// Assembled case
// ---------------------------------------------------------------------------

export const DEMO_COUNTERFACTUAL_CASE: CounterfactualCase = {
  caseId: 'LN-CF-2024-0847',
  modality: 'CT Chest (non-contrast)',
  studyDate: '2024-11-15',
  patientSummary: '58-year-old male, 30 pack-year smoking history, routine chest CT ordered by PCP for chronic cough',
  actualOutcome:
    'Radiologist read without AI assistance. Reported "no acute cardiopulmonary findings." 14 months later (January 2026), follow-up CT for persistent symptoms revealed a 2.1cm mass in the right upper lobe with mediastinal lymphadenopathy. Biopsy confirmed Stage IIIA non-small cell lung carcinoma (NSCLC). Retrospective review identified an 8mm nodule at the same location on the original November 2024 study.',
  keyTimestamps: [
    { label: 'Original CT study', date: '2024-11-15' },
    { label: 'Report signed (no findings)', date: '2024-11-15' },
    { label: 'Follow-up CT (symptoms persist)', date: '2026-01-20' },
    { label: '2.1cm mass identified', date: '2026-01-20' },
    { label: 'Biopsy: Stage IIIA NSCLC', date: '2026-02-03' },
    { label: 'Retrospective review: 8mm nodule visible on original', date: '2026-02-04' },
  ],
  scenarios: [
    {
      id: 'actual',
      label: 'Actual Workflow',
      description: 'What happened: Radiologist read without AI assistance. No AI consultation was available or used.',
      timeline: ACTUAL_TIMELINE,
      outcomes: [],
      legalFrames: [],
    },
    {
      id: 'with-ai',
      label: 'With AI Consultation',
      description: 'Counterfactual: What if the radiologist had AI-assisted detection available during the read?',
      timeline: WITH_AI_TIMELINE,
      outcomes: ACTUAL_VS_WITH_AI_OUTCOMES,
      legalFrames: [PLAINTIFF_FRAME_WITH_AI, DEFENSE_FRAME_WITH_AI],
    },
    {
      id: 'without-ai',
      label: 'Without AI Consultation',
      description: 'Not applicable for this case — AI was not used in the actual workflow. This scenario applies when AI was used and you want to simulate its absence.',
      timeline: ACTUAL_TIMELINE,
      outcomes: [],
      legalFrames: [],
    },
    {
      id: 'ai-only',
      label: 'AI-Only Analysis',
      description: 'Counterfactual: What would a fully automated AI pipeline have reported with no human radiologist input?',
      timeline: AI_ONLY_TIMELINE,
      outcomes: AI_ONLY_OUTCOMES,
      legalFrames: [PLAINTIFF_FRAME_AI_ONLY, DEFENSE_FRAME_AI_ONLY],
    },
  ],
};
