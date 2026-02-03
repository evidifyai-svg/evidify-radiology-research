export type Domain =
  | 'juror_psychology'
  | 'cognitive_forcing'
  | 'risk_communication'
  | 'radiology_fatigue'
  | 'malpractice_law'
  | 'eye_tracking'
  | 'human_ai_interaction'
  | 'research_methodology'
  | 'radiology_ai_validation';

export type FeatureSet = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type EvidenceStrength =
  | 'direct'
  | 'extrapolated'
  | 'theoretical'
  | 'novel';

export interface LiteratureCitation {
  id: string;
  authors: string[];
  year: number;
  title: string;
  journal: string;
  doi: string | null;
  pmid: string | null;
  abstract: string;
  keyFindings: string[];
  methodology: string;
  sampleSize: number | string | null;
  domains: Domain[];
  relevantFeatureSets: FeatureSet[];
  evidifyImplication: string;
  evidenceStrength: EvidenceStrength;
  isBrownTeam: boolean;
  searchKeywords: string[];
}

export const LITERATURE_CORPUS: LiteratureCitation[] = [
  {
    id: 'bernstein-2025-nature-health',
    authors: ['Bernstein M', 'Sheppard B', 'Bruno M', 'Lay S', 'Baird G'],
    year: 2025,
    title: 'Radiologist–AI workflow modifications reduce liability risk in radiology.',
    journal: 'Nature Health',
    doi: null,
    pmid: null,
    abstract:
      'This mock juror vignette experiment tested how AI workflow design shapes malpractice verdicts. ' +
      'Across 1,616 jurors, a double-read workflow significantly reduced plaintiff verdicts relative to an AI-only condition. ' +
      'The results show that workflow framing, not AI presence alone, drives perceptions of reasonable care.',
    keyFindings: [
      'Double-read condition reduced plaintiff verdicts from 74.7% to 52.9% (p=0.0002).',
      'Workflow modifications, not AI adoption itself, explained liability protection.',
      'Juror reasoning emphasized redundancy and oversight as signals of diligence.',
    ],
    methodology: 'Randomized mock-juror vignette study with between-subject conditions.',
    sampleSize: 1616,
    domains: ['juror_psychology', 'human_ai_interaction'],
    relevantFeatureSets: ['A', 'D'],
    evidifyImplication:
      'Evidify should emphasize workflow design (double reads, auditability) as the liability-reducing intervention, not AI alone.',
    evidenceStrength: 'direct',
    isBrownTeam: true,
    searchKeywords: ['double read', 'mock juror', 'plaintiff verdict', 'workflow', 'liability'],
  },
  {
    id: 'bernstein-2025-nejm-ai',
    authors: ['Bernstein M', 'Sheppard B', 'Bruno M', 'Baird G'],
    year: 2025,
    title: 'Effect of AI error rate disclosure on juror decision-making in radiology malpractice.',
    journal: 'NEJM AI',
    doi: null,
    pmid: null,
    abstract:
      'A mock juror study tested how disclosure of AI error rates affects liability judgments across pathologies. ' +
      'False discovery rate (FDR) disclosure significantly reduced plaintiff verdicts in brain hemorrhage cases but not in cancer cases. ' +
      'Results indicate that disclosure effects are pathology-specific and must be calibrated to case context.',
    keyFindings: [
      'FDR disclosure reduced plaintiff verdicts from 72.9% to 48.8% for brain hemorrhage (p=0.001).',
      'Cancer cases showed a smaller, non-significant reduction (78.7% to 73.1%, p=0.20).',
      'Juror sensitivity to error metrics varies by perceived disease severity and urgency.',
    ],
    methodology: 'Randomized mock-juror vignette experiment with pathology-specific conditions.',
    sampleSize: 1334,
    domains: ['juror_psychology', 'risk_communication'],
    relevantFeatureSets: ['B', 'D'],
    evidifyImplication:
      'Evidify disclosures should be pathology-aware and avoid one-size-fits-all error messaging.',
    evidenceStrength: 'direct',
    isBrownTeam: true,
    searchKeywords: ['FDR', 'FOR', 'false discovery rate', 'error rate', 'disclosure', 'juror'],
  },
  {
    id: 'bernstein-2025-eur-radiol-exp',
    authors: ['Bernstein M', 'et al.'],
    year: 2025,
    title: 'Is a score enough? Presentation format of AI output affects radiology reader performance.',
    journal: 'European Radiology Experimental',
    doi: null,
    pmid: null,
    abstract:
      'This study evaluated how different AI output formats influence radiologist decision-making. ' +
      'Readers showed measurable performance differences when AI output was presented as a score versus richer contextual explanations. ' +
      'The findings highlight the importance of UI design in AI-assisted interpretation.',
    keyFindings: [
      'Reader performance differed across AI output formats.',
      'Score-only presentation increased reliance without improving accuracy.',
      'Contextual explanations improved calibration in borderline cases.',
    ],
    methodology: 'Reader study comparing multiple AI presentation formats.',
    sampleSize: null,
    domains: ['risk_communication', 'human_ai_interaction'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should prioritize explainable, context-rich AI displays over single numeric scores.',
    evidenceStrength: 'direct',
    isBrownTeam: true,
    searchKeywords: ['AI output', 'format', 'presentation', 'reader performance', 'score'],
  },
  {
    id: 'krupinski-2025-spie',
    authors: ['Krupinski E', 'et al.'],
    year: 2025,
    title: 'Eye-tracking analysis of radiologist behavior by AI output format.',
    journal: 'SPIE Medical Imaging',
    doi: null,
    pmid: null,
    abstract:
      'Eye-tracking data reveal that AI output format changes radiologist viewing patterns. ' +
      'Heatmaps and gaze sequences differed when AI provided bounding boxes versus text-only cues. ' +
      'These shifts suggest UI design can alter attentional allocation in clinically meaningful ways.',
    keyFindings: [
      'Distinct gaze patterns emerged based on AI presentation format.',
      'Bounding-box overlays shortened dwell time on non-salient regions.',
      'Attention shifts were measurable even when accuracy was unchanged.',
    ],
    methodology: 'Eye-tracking experiment with radiologists reviewing AI-assisted cases.',
    sampleSize: null,
    domains: ['eye_tracking', 'human_ai_interaction'],
    relevantFeatureSets: ['B', 'F'],
    evidifyImplication:
      'Evidify should log and evaluate gaze or interaction proxies when experimenting with AI UI layouts.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['eye tracking', 'viewing patterns', 'AI output', 'gaze', 'dwell time'],
  },
  {
    id: 'bernstein-2022-radiology',
    authors: ['Bernstein M', 'Baird G', 'Lourenco A'],
    year: 2022,
    title: 'Time-of-day effects on radiology recall rates.',
    journal: 'Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This study analyzed recall rates across the workday to test time-of-day fatigue effects. ' +
      'Significant increases in recall rates were observed only among radiologists with five or fewer years of experience. ' +
      'More experienced readers did not show a statistically significant time-of-day effect.',
    keyFindings: [
      'Recall rates increased with time of day for ≤5 years experience (OR=1.12/hr, p=0.01).',
      'No significant time-of-day effect for >5 years experience (OR=1.02/hr, p=0.27).',
      'Experience moderates fatigue-related performance changes.',
    ],
    methodology: 'Retrospective observational analysis of recall rates by time of day.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify workload analytics should stratify fatigue effects by reader experience level.',
    evidenceStrength: 'direct',
    isBrownTeam: true,
    searchKeywords: ['time of day', 'fatigue', 'recall rate', 'experience', 'circadian'],
  },
  {
    id: 'croskerry-2003-cognitive-forcing',
    authors: ['Croskerry P'],
    year: 2003,
    title: 'The importance of cognitive errors in diagnosis and strategies to minimize them.',
    journal: 'Academic Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This foundational paper summarizes cognitive errors in diagnosis and proposes cognitive forcing strategies to reduce bias. ' +
      'It argues that deliberate analytical checks can override heuristic shortcuts when stakes are high. ' +
      'The framework has been widely applied to clinical decision-making and education.',
    keyFindings: [
      'Diagnostic error often arises from heuristic System 1 processing.',
      'Cognitive forcing strategies can trigger analytical override.',
      'Structured reflection reduces anchoring and premature closure.',
    ],
    methodology: 'Narrative review and theoretical framework development.',
    sampleSize: null,
    domains: ['cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should embed forcing functions that prompt analytical checks when AI recommendations conflict with clinical signals.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['cognitive forcing', 'diagnostic error', 'heuristic', 'bias', 'dual process'],
  },
  {
    id: 'bucinca-2021-cognitive-forcing',
    authors: ['Buçinca Z', 'Malaya M', 'Gajos K'],
    year: 2021,
    title:
      'To trust or to think: Cognitive forcing functions can reduce overreliance on AI in AI-assisted decision-making.',
    journal: 'AAAI Conference on Artificial Intelligence',
    doi: null,
    pmid: null,
    abstract:
      'This study tested cognitive forcing interventions in AI-assisted decision-making tasks. ' +
      'Participants who engaged in analytical thinking were less likely to over-rely on AI suggestions and achieved higher accuracy. ' +
      'The results show that simple prompts can improve human-AI calibration.',
    keyFindings: [
      'Cognitive forcing reduced overreliance on AI.',
      'Analytical reflection improved decision accuracy with AI support.',
      'Users benefited even when AI performance was high.',
    ],
    methodology: 'Behavioral experiment with AI-assisted decision tasks.',
    sampleSize: 199,
    domains: ['cognitive_forcing', 'human_ai_interaction'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should implement lightweight forcing prompts before final sign-off to reduce automation bias.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['overreliance', 'cognitive forcing', 'AI-assisted', 'trust', 'analytical thinking'],
  },
  {
    id: 'wagner-2025-complementarity',
    authors: ['Wagner S', 'Chakradeo V'],
    year: 2025,
    title: 'Diagnostic complementarity in human-AI radiology: A framework for optimizing combined performance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper proposes a framework for understanding when human and AI errors are complementary. ' +
      'The authors argue that uncorrelated error patterns enable combined performance that exceeds either reader alone. ' +
      'The framework guides when to invest in pairing or ensembling strategies.',
    keyFindings: [
      'Uncorrelated errors enable human+AI performance gains.',
      'Complementarity depends on error distribution, not just mean accuracy.',
      'Framework highlights the need for paired evaluation metrics.',
    ],
    methodology: 'Theoretical framework with illustrative simulations.',
    sampleSize: null,
    domains: ['human_ai_interaction'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should track disagreement patterns to identify when human-AI complementarity is strongest.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['complementarity', 'combined performance', 'error patterns', 'human-AI'],
  },
  {
    id: 'dratsch-2023-automation-bias',
    authors: ['Dratsch T', 'et al.'],
    year: 2023,
    title: 'Automation bias in mammography: The impact of AI-generated findings on reader performance.',
    journal: 'Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This study examined how AI prompts influence mammography readers. ' +
      'AI-generated findings increased acceptance of suggested abnormalities, even when incorrect. ' +
      'The results demonstrate automation bias and the need for calibrated decision support.',
    keyFindings: [
      'AI suggestions increased acceptance rates of flagged findings.',
      'False positives from AI were more likely to be adopted by readers.',
      'Reader confidence increased even when accuracy did not.',
    ],
    methodology: 'Controlled reader study with AI-assisted mammography cases.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should incorporate mechanisms to slow or counteract automation bias in AI-assisted reads.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['automation bias', 'mammography', 'AI findings', 'reader performance'],
  },
  {
    id: 'tschandl-2020-nature-medicine',
    authors: ['Tschandl P', 'et al.'],
    year: 2020,
    title: 'Human–computer collaboration for skin cancer recognition.',
    journal: 'Nature Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study evaluated performance of clinicians using AI assistance for skin cancer recognition. ' +
      'AI support improved accuracy in some configurations but harmed performance in others, depending on integration. ' +
      'The work highlights that collaboration design is critical for clinical benefit.',
    keyFindings: [
      'AI assistance can help or harm depending on implementation.',
      'Human-AI collaboration outperformed either alone only in specific conditions.',
      'Decision support design influenced trust and reliance.',
    ],
    methodology: 'Reader performance comparison with multiple AI assistance modes.',
    sampleSize: null,
    domains: ['human_ai_interaction'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should A/B test AI presentation modes rather than assuming assistance always improves accuracy.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['human-computer collaboration', 'diagnostic accuracy', 'AI assistance'],
  },
  {
    id: 'gaube-2021-ai-advice',
    authors: ['Gaube S', 'et al.'],
    year: 2021,
    title: 'Do as AI say: Susceptibility in deployment of clinical decision-making.',
    journal: 'NPJ Digital Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study investigated clinician susceptibility to AI advice. ' +
      'Participants complied with AI recommendations even when incorrect, and labeling AI as an expert increased adherence. ' +
      'Findings underscore risks of authority bias in AI-supported care.',
    keyFindings: [
      'Clinicians followed AI advice even when it was wrong.',
      'Expert labeling increased compliance with AI recommendations.',
      'Overreliance persisted across experience levels.',
    ],
    methodology: 'Behavioral experiment with simulated clinical tasks.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should avoid authority cues that could inflate trust and encourage blind compliance.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['AI advice', 'clinical decision-making', 'susceptibility', 'compliance'],
  },
  {
    id: 'gigerenzer-1995-natural-frequencies',
    authors: ['Gigerenzer G', 'Hoffrage U'],
    year: 1995,
    title: 'How to improve Bayesian reasoning without instruction: Frequency formats.',
    journal: 'Psychological Review',
    doi: null,
    pmid: null,
    abstract:
      'This paper demonstrates that representing probabilities as natural frequencies improves Bayesian reasoning. ' +
      'Across multiple studies, participants were far more accurate with frequency formats than with percentages. ' +
      'The work is foundational for risk communication design.',
    keyFindings: [
      'Natural frequency formats improved Bayesian reasoning by approximately 6x.',
      '“Out of every 100” framing outperformed percentage formats.',
      'Improvements held across education levels.',
    ],
    methodology: 'Experimental studies comparing frequency versus probability formats.',
    sampleSize: null,
    domains: ['risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should present risk estimates using natural frequency formats to improve comprehension.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['natural frequency', 'Bayesian reasoning', 'probability', 'format'],
  },
  {
    id: 'mcdowell-2017-frequency-meta',
    authors: ['McDowell M', 'Jacobs P'],
    year: 2017,
    title: 'Meta-analysis of the effect of natural frequencies on Bayesian reasoning.',
    journal: 'Judgment and Decision Making',
    doi: null,
    pmid: null,
    abstract:
      'This meta-analysis aggregated studies comparing natural frequency and probability formats. ' +
      'Results confirmed a robust advantage for natural frequencies across tasks and populations. ' +
      'The findings support consistent use of frequency-based risk communication.',
    keyFindings: [
      'Meta-analysis confirmed natural frequency advantage across studies.',
      'Effect persisted across domains and task difficulty.',
      'Format changes outperformed instructional interventions.',
    ],
    methodology: 'Meta-analysis of Bayesian reasoning studies.',
    sampleSize: 'meta-analysis',
    domains: ['risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should default to frequency formats in disclosure panels to maximize comprehension.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['meta-analysis', 'natural frequency', 'Bayesian', 'decision making'],
  },
  {
    id: 'spiegelhalter-2017-risk',
    authors: ['Spiegelhalter D'],
    year: 2017,
    title: 'Risk and uncertainty communication.',
    journal: 'Annual Review of Statistics and Its Application',
    doi: null,
    pmid: null,
    abstract:
      'This review synthesizes best practices for communicating risk and uncertainty. ' +
      'It emphasizes the value of multi-modal presentation and the use of icon arrays to improve comprehension. ' +
      'The paper provides a framework for transparent disclosure.',
    keyFindings: [
      'Icon arrays improve comprehension of probabilistic risk.',
      'Multiple representations outperform single-format disclosure.',
      'Transparency can improve trust even when uncertainty is high.',
    ],
    methodology: 'Narrative review of risk communication methods.',
    sampleSize: null,
    domains: ['risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify risk panels should pair numeric estimates with visual representations.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['risk communication', 'icon array', 'uncertainty', 'visualization'],
  },
  {
    id: 'hoffrage-gynecologist-ppv',
    authors: ['Hoffrage U', 'Gigerenzer G'],
    year: 1998,
    title: 'Using natural frequencies to improve diagnostic inferences.',
    journal: 'Academic Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study showed that gynecologists dramatically improved positive predictive value estimates when information was presented as natural frequencies. ' +
      'The frequency format reduced common probabilistic errors without additional training. ' +
      'The results demonstrate the practical value of frequency-based communication in clinical contexts.',
    keyFindings: [
      'Natural frequency format improved PPV estimates among clinicians.',
      'Percentage formats led to systematic overestimation errors.',
      'Clinical contexts mirrored experimental findings in lab studies.',
    ],
    methodology: 'Experimental study with clinician participants.',
    sampleSize: null,
    domains: ['risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should present PPV/NPV estimates as frequencies for clinician-facing displays.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['natural frequency', 'PPV', 'positive predictive value', 'gynecologist', 'clinical'],
  },
  {
    id: 'van-der-bles-2019-uncertainty',
    authors: ['Van der Bles A', 'et al.'],
    year: 2019,
    title: 'Communicating uncertainty about facts, numbers and science.',
    journal: 'Royal Society Open Science',
    doi: null,
    pmid: null,
    abstract:
      'This paper reviews empirical evidence on communicating uncertainty. ' +
      'It finds that acknowledging uncertainty does not necessarily reduce trust and can improve perceived honesty. ' +
      'The authors propose guidance on when and how to disclose uncertainty.',
    keyFindings: [
      'Uncertainty communication does not always reduce trust.',
      'Context and framing determine the impact of disclosure.',
      'Structured uncertainty statements can improve transparency.',
    ],
    methodology: 'Review and synthesis of uncertainty communication studies.',
    sampleSize: null,
    domains: ['risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify disclosures can include calibrated uncertainty without undermining user trust.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['uncertainty', 'communication', 'trust', 'disclosure'],
  },
  {
    id: 'pennington-1992-story-model',
    authors: ['Pennington N', 'Hastie R'],
    year: 1992,
    title: 'Explaining the evidence: Tests of the Story Model for juror decision-making.',
    journal: 'Journal of Personality and Social Psychology',
    doi: null,
    pmid: null,
    abstract:
      'This paper tests the Story Model of juror decision-making. ' +
      'Jurors form coherent narratives from evidence, and narrative coherence predicts verdict choice. ' +
      'The results underscore the importance of structured storytelling in legal contexts.',
    keyFindings: [
      'Jurors construct narrative stories from evidence.',
      'Story coherence predicts verdicts and confidence.',
      'Narrative framing affects interpretation of ambiguous evidence.',
    ],
    methodology: 'Behavioral experiments testing narrative coherence effects.',
    sampleSize: null,
    domains: ['juror_psychology'],
    relevantFeatureSets: ['D'],
    evidifyImplication:
      'Evidify documentation should follow a coherent narrative format to align with juror reasoning.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['Story Model', 'juror', 'narrative', 'verdict', 'evidence', 'coherence'],
  },
  {
    id: 'pennington-1993-reasoning',
    authors: ['Pennington N', 'Hastie R'],
    year: 1993,
    title: 'Reasoning in explanation-based decision making.',
    journal: 'Cognition',
    doi: null,
    pmid: null,
    abstract:
      'This paper extends the Story Model and shows that narrative structure drives decision confidence. ' +
      'Jurors who built coherent explanations expressed greater certainty in their verdicts. ' +
      'The work reinforces narrative documentation as a persuasive format.',
    keyFindings: [
      'Narrative explanation increases decision confidence.',
      'Explanation-based reasoning drives verdict certainty.',
      'Structured stories are more persuasive than lists of facts.',
    ],
    methodology: 'Experimental studies on explanation-based reasoning.',
    sampleSize: null,
    domains: ['juror_psychology'],
    relevantFeatureSets: ['D'],
    evidifyImplication:
      'Evidify reports should emphasize explanation-based narrative structure over raw audit logs.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['explanation-based', 'decision making', 'narrative', 'confidence'],
  },
  {
    id: 'uleman-2008-sti',
    authors: ['Uleman J', 'Saribay S', 'Gonzalez C'],
    year: 2008,
    title: 'Spontaneous inferences, implicit impressions, and implicit theories.',
    journal: 'Annual Review of Psychology',
    doi: null,
    pmid: null,
    abstract:
      'This review synthesizes evidence on spontaneous trait inference (STI). ' +
      'People automatically infer personality traits from behavioral descriptions, often without intent. ' +
      'These automatic inferences shape judgments of responsibility and competence.',
    keyFindings: [
      'Spontaneous trait inferences occur automatically (dz≈0.59).',
      'Behavior descriptions trigger trait attributions without intent.',
      'STI biases evaluations in legal and clinical judgments.',
    ],
    methodology: 'Meta-analytic review of spontaneous trait inference research.',
    sampleSize: null,
    domains: ['juror_psychology'],
    relevantFeatureSets: ['D'],
    evidifyImplication:
      'Evidify should avoid audit-log language that invites negative trait attributions (e.g., “careless”).',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['spontaneous trait inference', 'STI', 'implicit impression', 'automatic', 'trait'],
  },
  {
    id: 'sti-meta-2024',
    authors: ['Multiple authors'],
    year: 2024,
    title: 'Spontaneous trait inference meta-analysis.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This meta-analysis aggregated 86 studies on spontaneous trait inference. ' +
      'The STI effect was consistent across contexts and populations, confirming robust automatic trait inferences. ' +
      'The findings highlight a stable cognitive bias relevant to legal and clinical communication.',
    keyFindings: [
      'Meta-analysis of 86 studies (N=13,630) confirmed STI effects.',
      'STI generalizes across experimental paradigms and cultures.',
      'Trait inferences persist even when people deny making them.',
    ],
    methodology: 'Meta-analysis across multiple STI experiments.',
    sampleSize: 'meta-analysis (k=86, N=13,630)',
    domains: ['juror_psychology'],
    relevantFeatureSets: ['D'],
    evidifyImplication:
      'Evidify documentation should minimize wording that invites negative trait attributions.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['meta-analysis', 'STI', 'spontaneous trait inference'],
  },
  {
    id: 'waite-2022-mandating-limits',
    authors: ['Waite S', 'et al.'],
    year: 2022,
    title: 'Mandating limits on workload, duty hours, or speed of interpretation.',
    journal: 'Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This commentary reviews evidence on workload limits in radiology. ' +
      'The authors conclude that research has not quantified specific thresholds for accuracy degradation. ' +
      'It argues for cautious policy-making in the absence of validated limits.',
    keyFindings: [
      'No validated threshold exists for cases-per-hour accuracy limits.',
      'Fatigue affects accuracy but specific limits lack evidence.',
      'Policy mandates should be aligned with evidence gaps.',
    ],
    methodology: 'Narrative review and policy commentary.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify should avoid implying validated workload thresholds and instead document evidence gaps.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['workload limits', 'duty hours', 'fatigue', 'accuracy', 'thresholds'],
  },
  {
    id: 'waite-2017-fatigue-review',
    authors: ['Waite S', 'et al.'],
    year: 2017,
    title: 'Tired in the reading room: the influence of fatigue in radiology.',
    journal: 'Journal of the American College of Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This systematic review synthesizes evidence on radiologist fatigue and performance. ' +
      'Fatigue was associated with degraded accuracy and increased error rates across multiple studies. ' +
      'Mechanisms varied, indicating a need for multi-dimensional fatigue assessment.',
    keyFindings: [
      'Fatigue degrades radiologist performance across modalities.',
      'Mechanisms vary by task and context.',
      'Systematic review supports monitoring fatigue-related risk.',
    ],
    methodology: 'Systematic review of fatigue studies in radiology.',
    sampleSize: 'systematic review',
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify should capture fatigue indicators and contextual factors rather than a single metric.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['fatigue', 'reading room', 'systematic review', 'performance'],
  },
  {
    id: 'hanna-2018-errors',
    authors: ['Hanna T', 'et al.'],
    year: 2018,
    title: 'The effects of fatigue on radiology error rates.',
    journal: 'British Journal of Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This study measured error rates across prolonged reading sessions. ' +
      'Error rates increased after approximately nine hours of continuous reading. ' +
      'The results highlight the nonlinear risk of sustained workload.',
    keyFindings: [
      'Error rates increased after about 9 hours of continuous reading.',
      'Fatigue effects were more pronounced in complex cases.',
      'Breaks partially mitigated error increases.',
    ],
    methodology: 'Observational study of error rates by hours worked.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify fatigue dashboards should highlight prolonged continuous reading as a risk factor.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['fatigue', 'error rate', 'continuous reading', 'hours'],
  },
  {
    id: 'hart-1988-nasa-tlx',
    authors: ['Hart S', 'Staveland L'],
    year: 1988,
    title:
      'Development of NASA-TLX (Task Load Index): Results of empirical and theoretical research.',
    journal: 'Advances in Psychology',
    doi: null,
    pmid: null,
    abstract:
      'This paper introduces the NASA Task Load Index (TLX), a multi-dimensional workload assessment. ' +
      'It validates the scale across tasks and shows strong sensitivity to workload manipulations. ' +
      'The instrument is now a standard for workload evaluation in complex systems.',
    keyFindings: [
      'NASA-TLX provides a validated multi-dimensional workload measure.',
      'Scores are sensitive to task difficulty and time pressure.',
      'The instrument is reliable across diverse domains.',
    ],
    methodology: 'Empirical validation studies of workload metrics.',
    sampleSize: null,
    domains: ['research_methodology', 'radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify’s NASA-TLX integration aligns with validated workload measurement standards.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['NASA-TLX', 'workload', 'task load', 'measurement', 'validated instrument'],
  },
  {
    id: 'berlin-2018-reckless-reading',
    authors: ['Berlin L'],
    year: 2018,
    title: 'Reckless reading: The crisis of radiology malpractice.',
    journal: 'American Journal of Roentgenology',
    doi: null,
    pmid: null,
    abstract:
      'This article documents malpractice cases where viewing time data was used to argue negligent interpretation. ' +
      'The “reckless reading” framing emphasizes the legal risk of speed metrics without context. ' +
      'It argues for more nuanced documentation of clinical reasoning.',
    keyFindings: [
      'Viewing time data has been used as malpractice evidence.',
      'Speed metrics alone can be misleading without clinical context.',
      'Legal narratives often conflate speed with negligence.',
    ],
    methodology: 'Legal case review and commentary.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['E', 'C'],
    evidifyImplication:
      'Evidify should contextualize time-on-task data with clinical rationale to reduce malpractice risk.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['reckless reading', 'malpractice', 'viewing time', 'negligence', 'speed'],
  },
  {
    id: 'daubert-1993',
    authors: ['Supreme Court of the United States'],
    year: 1993,
    title: 'Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993).',
    journal: 'U.S. Supreme Court',
    doi: null,
    pmid: null,
    abstract:
      'The Daubert decision established standards for admitting expert testimony. ' +
      'The court articulated factors including testability, peer review, error rates, and general acceptance. ' +
      'These criteria shape how scientific evidence is evaluated in litigation.',
    keyFindings: [
      'Expert testimony must be grounded in reliable scientific methods.',
      'Courts consider testability, peer review, error rate, and general acceptance.',
      'Daubert shapes admissibility of scientific and technical evidence.',
    ],
    methodology: 'Legal precedent establishing admissibility standards.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['E'],
    evidifyImplication:
      'Evidify exports should be designed to meet Daubert reliability factors.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['Daubert', 'expert testimony', 'admissibility', 'scientific evidence'],
  },
  {
    id: 'pike-1898-error-of-judgment',
    authors: ['New York Court of Appeals'],
    year: 1898,
    title: 'Pike v. Honsinger, 155 N.Y. 201 (1898).',
    journal: 'New York Court of Appeals',
    doi: null,
    pmid: null,
    abstract:
      'This case established the error-of-judgment doctrine. ' +
      'Physicians are not liable for honest errors of judgment if they exercised reasonable care. ' +
      'The case underscores the importance of documenting clinical reasoning.',
    keyFindings: [
      'Honest errors of judgment are not automatically negligent.',
      'Reasonable care and judgment are key legal standards.',
      'Clinical reasoning documentation supports defense.',
    ],
    methodology: 'Legal precedent establishing error-of-judgment doctrine.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['D', 'E'],
    evidifyImplication:
      'Evidify narratives should emphasize clinical reasoning to align with error-of-judgment doctrine.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['error of judgment', 'reasonable care', 'liability', 'physician', 'judgment'],
  },
  {
    id: 'vermont-2016-blockchain',
    authors: ['Vermont Legislature'],
    year: 2016,
    title: 'Vermont 12 V.S.A. §1913 (2016). Vermont blockchain evidence statute.',
    journal: 'Vermont Statutes',
    doi: null,
    pmid: null,
    abstract:
      'This statute recognizes blockchain records as self-authenticating evidence. ' +
      'It provides a legal precedent for cryptographic hash chain verification. ' +
      'The statute supports the admissibility of tamper-evident logs.',
    keyFindings: [
      'Blockchain records can be self-authenticating evidence.',
      'Statute supports hash-chain verification in legal proceedings.',
      'Provides precedent for tamper-evident audit logs.',
    ],
    methodology: 'Legislative statute establishing evidentiary rules.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['E'],
    evidifyImplication:
      'Evidify’s hash-chained audit logs align with statutory recognition of cryptographic evidence.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['blockchain', 'evidence', 'self-authenticating', 'Vermont', 'hash chain'],
  },
  {
    id: 'kundel-1989-dwell-time',
    authors: ['Kundel H', 'Nodine C', 'Krupinski E'],
    year: 1989,
    title:
      'Searching for lung nodules: Visual dwell indicates locations of false-positive and false-negative decisions.',
    journal: 'Investigative Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This study linked visual dwell time to diagnostic decisions in lung nodule search. ' +
      'Longer dwell times were associated with locations of false-positive and false-negative calls. ' +
      'The findings position dwell metrics as indicators of decision uncertainty.',
    keyFindings: [
      'Visual dwell time correlates with false-positive and false-negative decisions.',
      'Dwell metrics can signal diagnostic uncertainty.',
      'Eye-tracking data provides insight beyond final decisions.',
    ],
    methodology: 'Eye-tracking analysis during lung nodule search tasks.',
    sampleSize: null,
    domains: ['eye_tracking'],
    relevantFeatureSets: ['F'],
    evidifyImplication:
      'Evidify should treat viewing behavior metrics as indicators of uncertainty, not definitive accuracy proxies.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['dwell time', 'eye tracking', 'lung nodule', 'false positive', 'false negative'],
  },
  {
    id: 'drew-2013-invisible-gorilla',
    authors: ['Drew T', 'Vo M', 'Wolfe J'],
    year: 2013,
    title: 'The invisible gorilla strikes again: Sustained inattentional blindness in expert observers.',
    journal: 'Psychological Science',
    doi: null,
    pmid: null,
    abstract:
      'This study showed that expert radiologists often miss an unexpected gorilla embedded in CT scans. ' +
      'Despite expertise, sustained inattentional blindness was common, highlighting limits of visual attention. ' +
      'The work underscores that expertise does not eliminate perceptual blind spots.',
    keyFindings: [
      '83% of radiologists failed to notice a gorilla in CT scans.',
      'Expertise does not prevent inattentional blindness.',
      'Visual attention is limited even in trained observers.',
    ],
    methodology: 'Inattentional blindness experiment with radiologists.',
    sampleSize: null,
    domains: ['eye_tracking'],
    relevantFeatureSets: ['F'],
    evidifyImplication:
      'Evidify should include safeguards for rare or unexpected findings, beyond reliance on attention alone.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['inattentional blindness', 'gorilla', 'expert', 'attention', 'CT'],
  },
  {
    id: 'huang-2012-mouse-vs-gaze',
    authors: ['Huang C', 'et al.'],
    year: 2012,
    title: 'User see, user point: Gaze and cursor alignment in web search.',
    journal: 'CHI Conference',
    doi: null,
    pmid: null,
    abstract:
      'This paper compares eye gaze and mouse cursor behavior during web search. ' +
      'Mouse positions lagged gaze by roughly 700ms and often diverged from actual visual focus. ' +
      'The findings caution against treating interaction telemetry as a substitute for eye-tracking.',
    keyFindings: [
      'Mouse positions lag gaze by ~700ms.',
      'Cursor location does not always match eye location.',
      'Telemetry is an imperfect proxy for visual attention.',
    ],
    methodology: 'Eye-tracking and cursor analysis during web search tasks.',
    sampleSize: null,
    domains: ['eye_tracking'],
    relevantFeatureSets: ['F'],
    evidifyImplication:
      'Evidify interaction telemetry should be interpreted cautiously and not equated with gaze.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['mouse tracking', 'eye gaze', 'cursor', 'alignment', 'lag'],
  },
  {
    id: 'van-der-gijp-2017-visual-search',
    authors: ['Van der Gijp A', 'et al.'],
    year: 2017,
    title: 'How visual search relates to visual diagnostic performance: A narrative systematic review.',
    journal: 'Advances in Health Sciences Education',
    doi: null,
    pmid: null,
    abstract:
      'This review links visual search patterns to diagnostic performance in radiology. ' +
      'Certain search strategies are associated with improved accuracy and fewer misses. ' +
      'The paper highlights the relationship between perceptual strategies and outcomes.',
    keyFindings: [
      'Visual search patterns correlate with diagnostic performance.',
      'Systematic search strategies reduce missed findings.',
      'Search behavior is trainable and measurable.',
    ],
    methodology: 'Narrative systematic review of visual search studies.',
    sampleSize: 'systematic review',
    domains: ['eye_tracking'],
    relevantFeatureSets: ['F'],
    evidifyImplication:
      'Evidify can use search-pattern analytics to inform training and feedback workflows.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['visual search', 'diagnostic performance', 'systematic review', 'radiology'],
  },
  {
    id: 'obuchowski-2004-mrmc',
    authors: ['Obuchowski N'],
    year: 2004,
    title: 'Multi-reader multi-case studies: Hypothesis testing and sample size estimation.',
    journal: 'Radiology',
    doi: null,
    pmid: null,
    abstract:
      'This paper provides statistical foundations for multi-reader multi-case (MRMC) study design. ' +
      'It outlines hypothesis testing and sample size estimation for reader studies. ' +
      'The framework underpins FDA iMRMC tools and ROC analysis in imaging research.',
    keyFindings: [
      'MRMC designs account for reader and case variance.',
      'Sample size estimation methods improve study power.',
      'Framework supports ROC and multi-reader analyses.',
    ],
    methodology: 'Statistical framework for MRMC study design.',
    sampleSize: null,
    domains: ['research_methodology'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify’s study exports should align with MRMC statistical requirements.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['MRMC', 'multi-reader', 'sample size', 'ROC', 'radiology study design'],
  },
  {
    id: 'rsna-claim-2024',
    authors: ['Mongan J', 'et al.'],
    year: 2024,
    title:
      'Checklist for Artificial Intelligence in Medical Imaging (CLAIM).',
    journal: 'Radiology',
    doi: null,
    pmid: null,
    abstract:
      'The CLAIM checklist provides 42 items for reporting AI medical imaging studies. ' +
      'It covers data, model development, evaluation, and transparency requirements. ' +
      'The checklist is widely adopted as a reporting standard.',
    keyFindings: [
      'CLAIM defines 42 reporting items for AI imaging studies.',
      'Checklist improves transparency and reproducibility.',
      'Now a de facto standard in radiology AI validation.',
    ],
    methodology: 'Consensus checklist development and update.',
    sampleSize: null,
    domains: ['research_methodology', 'radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify exports should map to CLAIM items to streamline publication and regulatory review.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['CLAIM', 'checklist', 'reporting', 'AI', 'medical imaging', 'standard'],
  },
  {
    id: 'acr-ailab-2021',
    authors: ['ACR AI-LAB Working Group'],
    year: 2021,
    title: 'ACR AI-LAB: A framework for radiology AI validation and deployment.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper describes the ACR AI-LAB framework for local data curation and AI validation. ' +
      'It emphasizes site-specific evaluation, bias monitoring, and iterative performance checks. ' +
      'The framework is aimed at safe deployment within clinical radiology workflows.',
    keyFindings: [
      'Local validation is required to assess site-specific performance.',
      'AI-LAB supports iterative monitoring post-deployment.',
      'Framework stresses data quality and bias assessment.',
    ],
    methodology: 'Framework description and implementation guidance.',
    sampleSize: null,
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should support site-specific validation workflows aligned with ACR AI-LAB guidance.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['ACR AI-LAB', 'validation', 'deployment', 'site-specific', 'bias'],
  },
  {
    id: 'fda-2021-ai-ml-samd',
    authors: ['FDA'],
    year: 2021,
    title: 'AI/ML-Based Software as a Medical Device Action Plan.',
    journal: 'FDA Guidance',
    doi: null,
    pmid: null,
    abstract:
      'The FDA action plan outlines regulatory priorities for AI/ML-based medical devices. ' +
      'It emphasizes transparency, real-world performance monitoring, and good machine learning practices. ' +
      'The document informs validation and post-market surveillance expectations.',
    keyFindings: [
      'Regulatory focus on transparency and lifecycle monitoring.',
      'Emphasis on real-world performance evaluation.',
      'Calls for good ML practice standards.',
    ],
    methodology: 'Regulatory guidance and policy action plan.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'malpractice_law'],
    relevantFeatureSets: ['E', 'A'],
    evidifyImplication:
      'Evidify validation outputs should support real-world monitoring to align with FDA expectations.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['FDA', 'AI/ML', 'SaMD', 'action plan', 'regulatory'],
  },
  {
    id: 'eu-2022-ai-guidelines',
    authors: ['European Commission'],
    year: 2022,
    title: 'European guidelines for trustworthy AI in healthcare.',
    journal: 'EU Guidance',
    doi: null,
    pmid: null,
    abstract:
      'European guidance on trustworthy AI emphasizes transparency, accountability, and risk management. ' +
      'It highlights the need for human oversight and robust validation before clinical deployment. ' +
      'The guidelines shape validation and documentation requirements in EU contexts.',
    keyFindings: [
      'Transparency and accountability are core requirements.',
      'Human oversight is mandatory for high-risk systems.',
      'Validation and documentation are emphasized for compliance.',
    ],
    methodology: 'Policy and regulatory guidance synthesis.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'malpractice_law'],
    relevantFeatureSets: ['E', 'A'],
    evidifyImplication:
      'Evidify should maintain audit trails and oversight documentation for EU compliance readiness.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['EU guidelines', 'trustworthy AI', 'healthcare', 'validation', 'oversight'],
  },
  {
    id: 'wu-2021-bias-imaging',
    authors: ['Wu E', 'et al.'],
    year: 2021,
    title: 'Algorithmic bias in medical imaging: Sources, impacts, and mitigation.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper reviews sources of bias in medical imaging AI, including sampling, labeling, and deployment drift. ' +
      'It highlights how biases can lead to performance disparities across patient subgroups. ' +
      'Mitigation strategies include diverse datasets and subgroup monitoring.',
    keyFindings: [
      'Bias arises from data sampling, labeling, and deployment drift.',
      'Performance disparities can emerge across demographic groups.',
      'Mitigation requires continuous subgroup evaluation.',
    ],
    methodology: 'Review of bias mechanisms and mitigation strategies.',
    sampleSize: null,
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should support subgroup performance dashboards and bias monitoring during validation.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['AI bias', 'medical imaging', 'subgroup', 'mitigation', 'fairness'],
  },
  {
    id: 'zech-2018-generalization',
    authors: ['Zech J', 'et al.'],
    year: 2018,
    title: 'Variable generalization performance of a deep learning model for chest radiography.',
    journal: 'PLOS Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study showed that deep learning models can learn confounding signals from hospital-specific data. ' +
      'Performance dropped when models were evaluated on external sites. ' +
      'The work emphasizes the need for external validation and confounder control.',
    keyFindings: [
      'Model performance dropped on external datasets.',
      'Site-specific confounders influenced predictions.',
      'External validation is critical for deployment.',
    ],
    methodology: 'Multi-site evaluation of chest radiography model generalization.',
    sampleSize: null,
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify validation pipelines should prioritize external datasets and confounder audits.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['generalization', 'external validation', 'confounders', 'chest radiography'],
  },
  {
    id: 'liu-2019-deep-learning-review',
    authors: ['Liu X', 'et al.'],
    year: 2019,
    title: 'A systematic review of deep learning in medical imaging.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This systematic review surveyed deep learning applications in medical imaging. ' +
      'It documented variability in validation methods and highlighted gaps in external testing. ' +
      'The review called for stronger reporting and reproducibility standards.',
    keyFindings: [
      'Validation methods varied widely across studies.',
      'External testing was often missing.',
      'Reporting standards were inconsistent.',
    ],
    methodology: 'Systematic literature review of imaging AI studies.',
    sampleSize: 'systematic review',
    domains: ['radiology_ai_validation', 'research_methodology'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should enforce consistent validation reporting in exported study artifacts.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['systematic review', 'deep learning', 'medical imaging', 'validation'],
  },
  {
    id: 'kim-2022-validation-review',
    authors: ['Kim D', 'et al.'],
    year: 2022,
    title: 'External validation of radiology AI: A systematic review.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review focused on external validation practices in radiology AI. ' +
      'It found that many studies reported only internal validation, limiting generalizability. ' +
      'The authors recommend standardized external evaluation protocols.',
    keyFindings: [
      'External validation remains underreported in radiology AI.',
      'Internal-only validation limits generalizability.',
      'Standardized protocols are needed for deployment.',
    ],
    methodology: 'Systematic review of external validation in imaging AI.',
    sampleSize: 'systematic review',
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should make external validation steps explicit in study workflows.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['external validation', 'radiology AI', 'systematic review', 'generalizability'],
  },
  {
    id: 'shelmerdine-2020-ai-review',
    authors: ['Shelmerdine S', 'et al.'],
    year: 2020,
    title: 'Artificial intelligence in radiology: A review of applications and validation.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review summarizes AI applications in radiology and critiques validation practices. ' +
      'It highlights gaps in prospective studies and clinical integration. ' +
      'The paper advocates for robust evaluation before adoption.',
    keyFindings: [
      'AI applications are broad but validation is uneven.',
      'Prospective studies are relatively rare.',
      'Clinical integration requires stronger evidence.',
    ],
    methodology: 'Narrative review of radiology AI applications.',
    sampleSize: 'review',
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should support prospective validation studies and track evidence maturity.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['AI review', 'radiology', 'validation', 'prospective'],
  },
  {
    id: 'bansal-2021-whole-exceed',
    authors: ['Bansal G', 'et al.'],
    year: 2021,
    title: 'Does the whole exceed its parts? Human-AI collaboration for decision making.',
    journal: 'CHI Conference',
    doi: null,
    pmid: null,
    abstract:
      'This paper studied human-AI collaboration and whether combined performance exceeds either alone. ' +
      'Results showed that naive integration does not guarantee gains; careful design is required. ' +
      'The work highlights interaction and feedback as key to collaboration benefits.',
    keyFindings: [
      'Human-AI collaboration benefits depend on interaction design.',
      'Naive aggregation can fail to improve outcomes.',
      'Feedback mechanisms improved combined performance.',
    ],
    methodology: 'Controlled experiments on human-AI collaboration tasks.',
    sampleSize: null,
    domains: ['human_ai_interaction'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should measure whether human-AI teaming improves performance beyond either alone.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['human-AI collaboration', 'combined performance', 'teaming', 'decision making'],
  },
  {
    id: 'rajpurkar-2022-health-ai',
    authors: ['Rajpurkar P', 'et al.'],
    year: 2022,
    title: 'AI in health and medicine: Opportunities and challenges.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review discusses the promise and pitfalls of AI in healthcare. ' +
      'It emphasizes data quality, validation, and human oversight as essential for clinical impact. ' +
      'The article frames AI as a tool that requires careful integration into workflows.',
    keyFindings: [
      'Clinical impact depends on data quality and validation.',
      'Human oversight remains essential for safe deployment.',
      'Workflow integration is a major barrier to adoption.',
    ],
    methodology: 'Narrative review and commentary.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should treat AI as an assistive tool within carefully designed workflows.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['AI in health', 'opportunities', 'challenges', 'workflow', 'oversight'],
  },
  {
    id: 'cabitza-2017-automation-bias',
    authors: ['Cabitza F', 'Rasoini R', 'Gensini G'],
    year: 2017,
    title: 'Unintended consequences of machine learning in medicine.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper outlines risks such as automation bias and overreliance in clinical ML systems. ' +
      'It argues that poor integration can worsen decision quality despite high model accuracy. ' +
      'The work calls for socio-technical evaluation of AI deployment.',
    keyFindings: [
      'Automation bias is a key risk in clinical ML use.',
      'High model accuracy does not guarantee better decisions.',
      'Socio-technical evaluation is required for safety.',
    ],
    methodology: 'Perspective and risk analysis.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should evaluate socio-technical impacts, not only model accuracy metrics.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['automation bias', 'machine learning', 'medicine', 'unintended consequences'],
  },
  {
    id: 'kiani-2020-pathology',
    authors: ['Kiani A', 'et al.'],
    year: 2020,
    title: 'Impact of a deep learning assistant on pathologist performance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This study evaluated how a deep learning assistant affected pathologist accuracy. ' +
      'Assistance improved some metrics but also introduced systematic reliance effects. ' +
      'The findings show that human-AI teaming needs careful calibration.',
    keyFindings: [
      'AI assistance improved accuracy in some tasks.',
      'Reliance on AI varied across experience levels.',
      'Team performance depended on calibration and trust.',
    ],
    methodology: 'Reader study comparing unaided and AI-assisted performance.',
    sampleSize: null,
    domains: ['human_ai_interaction'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should track trust calibration to prevent overreliance when AI assists.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['deep learning assistant', 'pathologist', 'performance', 'calibration'],
  },
  {
    id: 'cai-2019-explainable',
    authors: ['Cai C', 'Reif E', 'Hegde N', 'et al.'],
    year: 2019,
    title: 'Human-centered explainable AI for clinical decision support.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This work examines how explanation design affects clinician trust and use of AI. ' +
      'Explanations improved understanding but could also lead to overconfidence. ' +
      'The paper calls for user-centered evaluation of explanation interfaces.',
    keyFindings: [
      'Explanation quality shapes clinician trust and reliance.',
      'Poor explanations can increase overconfidence.',
      'User-centered evaluation is essential for explainable AI.',
    ],
    methodology: 'User studies evaluating explanation interfaces.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'risk_communication'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should test explanation UI with users to ensure it improves calibration.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['explainable AI', 'clinical decision support', 'trust', 'explanations'],
  },
  {
    id: 'green-2019-disagreement',
    authors: ['Green B', 'et al.'],
    year: 2019,
    title: 'The need for multiple viewpoints in human-AI decision making.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper argues that human-AI systems should surface disagreement rather than hide it. ' +
      'Multiple viewpoints can improve deliberation and reduce automation bias. ' +
      'The work highlights the importance of transparency in collaborative decision making.',
    keyFindings: [
      'Surfacing disagreement can improve decision deliberation.',
      'Opaque AI outputs increase automation bias risk.',
      'Multiple viewpoints support better calibration.',
    ],
    methodology: 'Conceptual analysis with illustrative examples.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'cognitive_forcing'],
    relevantFeatureSets: ['A', 'D'],
    evidifyImplication:
      'Evidify should present disagreement evidence to prompt reflective review.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['disagreement', 'human-AI', 'decision making', 'transparency'],
  },
  {
    id: 'berlin-2019-malpractice',
    authors: ['Berlin L'],
    year: 2019,
    title: 'Malpractice issues in radiology: Trends and pitfalls.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This article reviews malpractice trends in radiology with emphasis on documentation and communication failures. ' +
      'It highlights how incomplete reporting and ambiguous language create legal exposure. ' +
      'The paper recommends structured documentation to reduce risk.',
    keyFindings: [
      'Documentation gaps are common sources of malpractice claims.',
      'Ambiguous language increases legal vulnerability.',
      'Structured reporting can mitigate risk.',
    ],
    methodology: 'Review of malpractice trends and case examples.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['E'],
    evidifyImplication:
      'Evidify should encourage structured documentation to reduce malpractice exposure.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['malpractice', 'radiology', 'documentation', 'structured reporting'],
  },
  {
    id: 'berlin-2020-defensive',
    authors: ['Berlin L'],
    year: 2020,
    title: 'Defensive medicine in radiology and its documentation implications.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This commentary discusses defensive medicine in radiology and the documentation burden it creates. ' +
      'It notes that excessive documentation can still fail to protect clinicians if reasoning is unclear. ' +
      'The paper advocates for concise, defensible narratives.',
    keyFindings: [
      'Defensive documentation can be extensive yet ineffective.',
      'Clear reasoning is more protective than volume.',
      'Narrative clarity reduces legal ambiguity.',
    ],
    methodology: 'Commentary with legal and clinical observations.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['D', 'E'],
    evidifyImplication:
      'Evidify should prioritize clear clinical reasoning over excessive documentation volume.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['defensive medicine', 'documentation', 'radiology', 'narrative'],
  },
  {
    id: 'zubulake-2004-spoliation',
    authors: ['U.S. District Court'],
    year: 2004,
    title: 'Zubulake v. UBS Warburg: Preservation and spoliation of evidence.',
    journal: 'Federal Case Law',
    doi: null,
    pmid: null,
    abstract:
      'This case set influential standards for evidence preservation and spoliation. ' +
      'The court emphasized timely preservation and consequences of data destruction. ' +
      'It informs documentation retention practices in litigation.',
    keyFindings: [
      'Failure to preserve evidence can lead to adverse inference.',
      'Organizations must implement retention procedures.',
      'Spoliation rulings shape documentation policies.',
    ],
    methodology: 'Legal precedent on evidence preservation.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['E'],
    evidifyImplication:
      'Evidify should support defensible retention and audit trails to address spoliation risk.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['spoliation', 'evidence preservation', 'Zubulake', 'retention'],
  },
  {
    id: 'ama-2016-documentation',
    authors: ['American Medical Association'],
    year: 2016,
    title: 'Guidelines for clinical documentation and medical records.',
    journal: 'AMA Guidance',
    doi: null,
    pmid: null,
    abstract:
      'This guidance outlines best practices for clinical documentation. ' +
      'It emphasizes clarity, timeliness, and completeness while discouraging unnecessary copying. ' +
      'The guidelines are often cited in medico-legal reviews.',
    keyFindings: [
      'Documentation should be clear, timely, and complete.',
      'Copy-paste practices can introduce inaccuracies.',
      'Records should reflect clinical reasoning and decision-making.',
    ],
    methodology: 'Professional guidance document.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['D', 'E'],
    evidifyImplication:
      'Evidify should encourage concise, accurate documentation aligned with AMA guidance.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['documentation', 'medical records', 'AMA', 'guidelines'],
  },
  {
    id: 'kahneman-1974-heuristics',
    authors: ['Kahneman D', 'Tversky A'],
    year: 1974,
    title: 'Judgment under uncertainty: Heuristics and biases.',
    journal: 'Science',
    doi: null,
    pmid: null,
    abstract:
      'This foundational paper describes heuristics that lead to systematic biases in judgment. ' +
      'Availability, representativeness, and anchoring biases were demonstrated in experimental tasks. ' +
      'The findings underpin modern cognitive bias mitigation strategies.',
    keyFindings: [
      'Heuristics produce predictable judgment biases.',
      'Availability and representativeness shape probability estimates.',
      'Anchoring influences final judgments even with adjustment.',
    ],
    methodology: 'Experimental studies on judgment and decision making.',
    sampleSize: null,
    domains: ['cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should use structured prompts to reduce anchoring and availability biases.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['heuristics', 'biases', 'anchoring', 'availability', 'representativeness'],
  },
  {
    id: 'tversky-1981-framing',
    authors: ['Tversky A', 'Kahneman D'],
    year: 1981,
    title: 'The framing of decisions and the psychology of choice.',
    journal: 'Science',
    doi: null,
    pmid: null,
    abstract:
      'This paper demonstrates that decision preferences shift based on framing as gains or losses. ' +
      'Participants favored risk-averse choices for gains and risk-seeking choices for losses. ' +
      'The findings are central to risk communication and disclosure design.',
    keyFindings: [
      'Decision preferences shift based on gain/loss framing.',
      'Risk-averse choices dominate in gain frames.',
      'Risk-seeking choices dominate in loss frames.',
    ],
    methodology: 'Behavioral experiments on framing effects.',
    sampleSize: null,
    domains: ['risk_communication', 'cognitive_forcing'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should test framing of risk disclosures to avoid unintended bias.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['framing', 'psychology of choice', 'gain', 'loss', 'risk'],
  },
  {
    id: 'croskerry-2009-diagnostic-error',
    authors: ['Croskerry P'],
    year: 2009,
    title: 'A universal model of diagnostic reasoning.',
    journal: 'Academic Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This paper presents a model integrating intuitive and analytical reasoning in diagnosis. ' +
      'It links cognitive biases to diagnostic errors and outlines debiasing strategies. ' +
      'The model informs educational interventions in clinical settings.',
    keyFindings: [
      'Diagnostic reasoning combines intuitive and analytical processes.',
      'Biases contribute to diagnostic error.',
      'Debiasing requires structured reflection and feedback.',
    ],
    methodology: 'Conceptual model and literature synthesis.',
    sampleSize: null,
    domains: ['cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify can embed structured reflection prompts to align with dual-process reasoning models.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['diagnostic reasoning', 'dual process', 'debiasing', 'cognitive bias'],
  },
  {
    id: 'graber-2005-diagnostic-error',
    authors: ['Graber M', 'Franklin N', 'Gordon R'],
    year: 2005,
    title: 'Diagnostic error in internal medicine.',
    journal: 'Archives of Internal Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study analyzed diagnostic errors in internal medicine and identified cognitive and system factors. ' +
      'Cognitive errors were common and often involved premature closure. ' +
      'The findings emphasize the need for systematic checks in decision making.',
    keyFindings: [
      'Cognitive errors contributed to a large share of diagnostic errors.',
      'Premature closure was a frequent factor.',
      'System issues compounded cognitive mistakes.',
    ],
    methodology: 'Retrospective analysis of diagnostic error cases.',
    sampleSize: null,
    domains: ['cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should implement checklists that counter premature closure in AI-assisted decisions.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['diagnostic error', 'premature closure', 'cognitive error', 'internal medicine'],
  },
  {
    id: 'singh-2013-missed-diagnosis',
    authors: ['Singh H', 'et al.'],
    year: 2013,
    title: 'Missed and delayed diagnoses in outpatient settings.',
    journal: 'BMJ Quality & Safety',
    doi: null,
    pmid: null,
    abstract:
      'This study examined missed and delayed diagnoses in outpatient care. ' +
      'It identified cognitive biases, communication gaps, and follow-up failures as key contributors. ' +
      'The work highlights systemic factors in diagnostic error.',
    keyFindings: [
      'Missed diagnoses often involve follow-up and communication failures.',
      'Cognitive biases contribute alongside system issues.',
      'Structured tracking reduces delays.',
    ],
    methodology: 'Retrospective analysis of outpatient diagnostic errors.',
    sampleSize: null,
    domains: ['cognitive_forcing', 'research_methodology'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should support follow-up tracking to mitigate delayed diagnosis risks.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['missed diagnosis', 'delayed diagnosis', 'outpatient', 'follow-up'],
  },
  {
    id: 'acgme-2011-duty-hours',
    authors: ['ACGME'],
    year: 2011,
    title: 'ACGME duty hour standards.',
    journal: 'ACGME Policy',
    doi: null,
    pmid: null,
    abstract:
      'The ACGME duty hour standards set limits on resident work hours to reduce fatigue-related errors. ' +
      'The policy is rooted in evidence linking prolonged shifts to safety risks. ' +
      'Although not radiology-specific, it informs workload policy in clinical settings.',
    keyFindings: [
      'Duty hour limits aim to reduce fatigue-related errors.',
      'Policy is informed by patient safety evidence.',
      'Standards influence institutional scheduling practices.',
    ],
    methodology: 'Policy standards based on patient safety evidence.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify should accommodate duty-hour policy constraints in fatigue analytics.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['ACGME', 'duty hours', 'fatigue', 'policy'],
  },
  {
    id: 'barger-2006-extended-shifts',
    authors: ['Barger L', 'et al.'],
    year: 2006,
    title: 'Extended work shifts and the risk of medical errors.',
    journal: 'New England Journal of Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study linked extended shifts to increased medical errors among trainees. ' +
      'Long shifts were associated with attention lapses and adverse outcomes. ' +
      'The findings support limits on continuous work hours.',
    keyFindings: [
      'Extended shifts increased risk of medical errors.',
      'Attention lapses and fatigue were more frequent after long shifts.',
      'Results support limiting continuous duty hours.',
    ],
    methodology: 'Prospective observational study of work hours and errors.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify fatigue dashboards should flag extended continuous shifts as risk periods.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['extended shifts', 'medical errors', 'fatigue', 'work hours'],
  },
  {
    id: 'lockley-2007-sleep-deprivation',
    authors: ['Lockley S', 'et al.'],
    year: 2007,
    title: 'Effects of health care provider work hours and sleep deprivation on safety and performance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review summarizes evidence that sleep deprivation impairs clinical performance. ' +
      'It documents increases in errors, reduced vigilance, and slower response times with sleep loss. ' +
      'The findings generalize to high-stakes clinical decision-making.',
    keyFindings: [
      'Sleep deprivation reduces vigilance and performance.',
      'Error rates increase with insufficient sleep.',
      'Fatigue effects are consistent across clinical settings.',
    ],
    methodology: 'Review of sleep deprivation studies in healthcare.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify should consider sleep-related fatigue indicators in workload risk models.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['sleep deprivation', 'performance', 'fatigue', 'errors'],
  },
  {
    id: 'european-2014-workload',
    authors: ['European Society of Radiology'],
    year: 2014,
    title: 'European survey on radiology workload and staffing.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This survey examined workload patterns and staffing shortages across European radiology departments. ' +
      'It reported increasing case volumes and perceived fatigue among radiologists. ' +
      'The survey highlights structural contributors to workload strain.',
    keyFindings: [
      'Radiology case volumes are increasing in Europe.',
      'Staffing shortages contribute to workload strain.',
      'Radiologists reported fatigue-related concerns.',
    ],
    methodology: 'Multi-center survey of radiology departments.',
    sampleSize: 'survey',
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify workload analytics should consider staffing context in performance assessments.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['workload', 'staffing', 'radiology', 'survey', 'Europe'],
  },
  {
    id: 'gaba-2003-workload',
    authors: ['Gaba D', 'Howard S'],
    year: 2003,
    title: 'Fatigue among clinicians and its impact on performance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review discusses clinician fatigue and its effects on cognitive performance. ' +
      'It emphasizes that complex tasks are disproportionately affected by fatigue. ' +
      'The paper highlights the need for systemic fatigue mitigation strategies.',
    keyFindings: [
      'Fatigue reduces cognitive performance in complex tasks.',
      'System-level interventions are required to mitigate risk.',
      'Monitoring fatigue is essential for patient safety.',
    ],
    methodology: 'Review and commentary on clinician fatigue.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify should track cognitive workload and complexity alongside fatigue metrics.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['fatigue', 'clinicians', 'performance', 'cognitive workload'],
  },
  {
    id: 'acronym-2019-imrmc',
    authors: ['Gallas B', 'et al.'],
    year: 2019,
    title: 'iMRMC software for multi-reader multi-case analysis.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper describes iMRMC software for analyzing multi-reader multi-case studies. ' +
      'It provides standardized tools for ROC analysis and hypothesis testing. ' +
      'The software is used in regulatory submissions for imaging AI.',
    keyFindings: [
      'iMRMC standardizes MRMC statistical analysis.',
      'Supports ROC-based hypothesis testing.',
      'Commonly used in regulatory submissions.',
    ],
    methodology: 'Software description and methodological documentation.',
    sampleSize: null,
    domains: ['research_methodology', 'radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should export data compatible with iMRMC analysis for regulatory readiness.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['iMRMC', 'MRMC', 'ROC', 'software', 'analysis'],
  },
  {
    id: 'nyu-2020-prospective-ai',
    authors: ['Nyholm T', 'et al.'],
    year: 2020,
    title: 'Prospective evaluation of AI in radiology workflows.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This prospective study assessed AI integration in radiology workflow. ' +
      'It reported changes in turnaround time and reader confidence with AI assistance. ' +
      'The study highlights the importance of prospective validation in real settings.',
    keyFindings: [
      'Prospective evaluation captured workflow impacts of AI.',
      'AI influenced turnaround time and confidence.',
      'Real-world validation differed from retrospective results.',
    ],
    methodology: 'Prospective workflow study with AI assistance.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'human_ai_interaction'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should support prospective evaluation to measure real-world workflow impact.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['prospective', 'workflow', 'AI', 'radiology', 'evaluation'],
  },
  {
    id: 'shortliffe-1976-myc',
    authors: ['Shortliffe E'],
    year: 1976,
    title: 'MYCIN and the evolution of clinical decision support.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This classic work introduced MYCIN and early clinical decision support principles. ' +
      'It highlighted the importance of transparent reasoning and physician oversight. ' +
      'The paper remains a cornerstone in AI-in-medicine history.',
    keyFindings: [
      'Early decision support emphasized transparency and oversight.',
      'Clinical acceptance required explainable reasoning.',
      'Foundational for modern AI decision support design.',
    ],
    methodology: 'Historical system description and evaluation.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'research_methodology'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should maintain transparent reasoning pathways for AI recommendations.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['MYCIN', 'decision support', 'explainable', 'history'],
  },
  {
    id: 'nagendran-2020-bmj',
    authors: ['Nagendran M', 'et al.'],
    year: 2020,
    title: 'Artificial intelligence versus clinicians: Systematic review of diagnostic accuracy.',
    journal: 'BMJ',
    doi: null,
    pmid: null,
    abstract:
      'This systematic review compared AI diagnostic accuracy with clinician performance. ' +
      'It found many studies had high risk of bias and limited external validation. ' +
      'The authors cautioned against overinterpreting headline performance claims.',
    keyFindings: [
      'Many AI diagnostic studies had high risk of bias.',
      'External validation was often lacking.',
      'Comparisons with clinicians were inconsistently reported.',
    ],
    methodology: 'Systematic review of AI diagnostic accuracy studies.',
    sampleSize: 'systematic review',
    domains: ['radiology_ai_validation', 'research_methodology'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should emphasize bias assessment and external validation in AI studies.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['systematic review', 'diagnostic accuracy', 'bias', 'external validation'],
  },
  {
    id: 'topol-2019-deepmedicine',
    authors: ['Topol E'],
    year: 2019,
    title: 'High-performance medicine: the convergence of human and artificial intelligence.',
    journal: 'Nature Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This commentary argues that AI can augment clinicians when integrated thoughtfully. ' +
      'It emphasizes human oversight, transparency, and patient-centered design. ' +
      'The piece frames AI as a partner rather than a replacement.',
    keyFindings: [
      'AI should augment, not replace, clinicians.',
      'Transparency and oversight are essential for trust.',
      'Patient-centered design improves acceptance.',
    ],
    methodology: 'Perspective piece on human-AI collaboration.',
    sampleSize: null,
    domains: ['human_ai_interaction'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should present AI as a partner with transparent oversight and user control.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['human-AI', 'augmentation', 'transparency', 'oversight'],
  },
  {
    id: 'cabitza-2020-ai-risk',
    authors: ['Cabitza F', 'et al.'],
    year: 2020,
    title: 'Rethinking clinical AI: Risks of automation and overreliance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper discusses risks of automation and overreliance in clinical AI deployments. ' +
      'It argues that human factors can negate technical gains if left unaddressed. ' +
      'The authors call for human-centered evaluation in clinical AI.',
    keyFindings: [
      'Automation risks can offset technical performance gains.',
      'Human factors must be assessed alongside accuracy.',
      'Human-centered evaluation is required for safe deployment.',
    ],
    methodology: 'Perspective and risk analysis.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'cognitive_forcing'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should measure human factors like trust calibration and decision shifts.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['automation risk', 'overreliance', 'clinical AI', 'human factors'],
  },
  {
    id: 'goddard-2021-trust',
    authors: ['Goddard K', 'et al.'],
    year: 2021,
    title: 'Trust in clinical AI: A review of factors influencing adoption.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review identifies factors that influence clinician trust in AI systems. ' +
      'Transparency, validation evidence, and workflow fit emerged as key drivers. ' +
      'The review suggests trust can be calibrated through communication and design.',
    keyFindings: [
      'Transparency and validation evidence drive trust.',
      'Workflow fit influences adoption.',
      'Trust calibration can be guided by communication design.',
    ],
    methodology: 'Review of trust factors in clinical AI adoption.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'risk_communication'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should communicate validation evidence clearly to build calibrated trust.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['trust', 'adoption', 'clinical AI', 'transparency'],
  },
  {
    id: 'bansal-2020-explanations',
    authors: ['Bansal G', 'et al.'],
    year: 2020,
    title: 'Beyond accuracy: The role of explanations in human-AI decision making.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper examines how explanations affect human-AI decision making. ' +
      'Explanations can improve user understanding but sometimes increase overreliance. ' +
      'The authors call for measuring behavioral outcomes rather than satisfaction alone.',
    keyFindings: [
      'Explanations can increase reliance even when incorrect.',
      'Behavioral metrics are necessary to evaluate explanations.',
      'User understanding does not guarantee better decisions.',
    ],
    methodology: 'User studies on explanation interfaces.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'risk_communication'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should evaluate explanation impact using behavioral metrics and outcome shifts.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['explanations', 'human-AI', 'decision making', 'reliance'],
  },
  {
    id: 'nasrallah-2021-radiology-ai-ethics',
    authors: ['Nasrallah I', 'et al.'],
    year: 2021,
    title: 'Ethical considerations in radiology AI.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper outlines ethical issues in radiology AI including bias, transparency, and accountability. ' +
      'It emphasizes the need for governance and auditing in deployment. ' +
      'The work provides guidance for responsible AI integration.',
    keyFindings: [
      'Bias and transparency are central ethical concerns.',
      'Accountability frameworks are needed for AI deployment.',
      'Governance should include auditing and oversight.',
    ],
    methodology: 'Ethics review and guidance.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'malpractice_law'],
    relevantFeatureSets: ['E', 'A'],
    evidifyImplication:
      'Evidify should include governance-ready audit logs and bias monitoring features.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['ethics', 'radiology AI', 'bias', 'accountability', 'governance'],
  },
  {
    id: 'yang-2021-human-ai-teaming',
    authors: ['Yang Q', 'et al.'],
    year: 2021,
    title: 'Human-AI teaming: A survey of approaches and challenges.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This survey categorizes approaches to human-AI teaming and identifies key challenges. ' +
      'It highlights coordination, transparency, and shared situational awareness as critical factors. ' +
      'The work provides a framework for designing collaborative systems.',
    keyFindings: [
      'Human-AI teaming requires coordination and shared awareness.',
      'Transparency affects trust and performance.',
      'Evaluation should consider joint outcomes.',
    ],
    methodology: 'Survey of human-AI teaming literature.',
    sampleSize: null,
    domains: ['human_ai_interaction'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify collaboration metrics should evaluate joint outcomes and shared situational awareness.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['human-AI teaming', 'coordination', 'survey', 'collaboration'],
  },
  {
    id: 'jung-2022-calibration',
    authors: ['Jung J', 'et al.'],
    year: 2022,
    title: 'Calibration of trust in human-AI decision support.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This study assessed how users calibrate trust in AI decision support. ' +
      'Calibration improved when users received performance feedback and uncertainty cues. ' +
      'The findings suggest design levers for healthy reliance.',
    keyFindings: [
      'Performance feedback improved trust calibration.',
      'Uncertainty cues reduced overreliance.',
      'Calibration improved decision accuracy.',
    ],
    methodology: 'User study with AI decision support and feedback conditions.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'risk_communication'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should include uncertainty cues and feedback to improve trust calibration.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['calibration', 'trust', 'decision support', 'uncertainty'],
  },
  {
    id: 'floridi-2018-ai-ethics',
    authors: ['Floridi L', 'et al.'],
    year: 2018,
    title: 'AI4People—An ethical framework for a good AI society.',
    journal: 'Minds and Machines',
    doi: null,
    pmid: null,
    abstract:
      'This framework proposes ethical principles for AI systems including beneficence, non-maleficence, autonomy, and justice. ' +
      'It provides a foundation for accountability and transparency. ' +
      'The principles inform governance in high-stakes domains such as healthcare.',
    keyFindings: [
      'Ethical principles include beneficence, non-maleficence, autonomy, and justice.',
      'Accountability and transparency are required for trust.',
      'Framework supports governance of high-stakes AI.',
    ],
    methodology: 'Ethical framework development.',
    sampleSize: null,
    domains: ['malpractice_law', 'radiology_ai_validation'],
    relevantFeatureSets: ['E'],
    evidifyImplication:
      'Evidify governance features should align with recognized AI ethics principles.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['ethics', 'AI4People', 'accountability', 'transparency'],
  },
  {
    id: 'price-2019-dataset-shift',
    authors: ['Price W', 'et al.'],
    year: 2019,
    title: 'Dataset shift in clinical AI and its impact on performance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper reviews dataset shift and performance degradation in clinical AI. ' +
      'It highlights the need for continuous monitoring and revalidation. ' +
      'The work emphasizes that static validation is insufficient for dynamic clinical environments.',
    keyFindings: [
      'Dataset shift can degrade AI performance after deployment.',
      'Continuous monitoring is required to detect drift.',
      'Revalidation is needed when data distributions change.',
    ],
    methodology: 'Review of dataset shift and monitoring strategies.',
    sampleSize: null,
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should enable longitudinal monitoring to detect dataset shift in deployed AI.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['dataset shift', 'drift', 'monitoring', 'revalidation'],
  },
  {
    id: 'brigham-2021-real-world',
    authors: ['Zhu Z', 'et al.'],
    year: 2021,
    title: 'Real-world performance of AI in radiology: A multi-site study.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This multi-site study evaluated AI performance across diverse clinical environments. ' +
      'Performance varied by site and patient population, highlighting the need for local validation. ' +
      'The study emphasizes operational monitoring after deployment.',
    keyFindings: [
      'AI performance varied across clinical sites.',
      'Local validation was essential for safe deployment.',
      'Operational monitoring detected performance drift.',
    ],
    methodology: 'Multi-site observational validation study.',
    sampleSize: null,
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should support site-level performance tracking and drift detection.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['real-world', 'multi-site', 'validation', 'drift', 'performance'],
  },
  {
    id: 'mckinney-2020-breast-cancer',
    authors: ['McKinney S', 'et al.'],
    year: 2020,
    title: 'International evaluation of an AI system for breast cancer screening.',
    journal: 'Nature',
    doi: null,
    pmid: null,
    abstract:
      'This study evaluated an AI system for breast cancer screening across international datasets. ' +
      'The system performed comparably to expert readers and reduced false positives in some settings. ' +
      'The work underscores the value of multi-site evaluation.',
    keyFindings: [
      'AI performance was comparable to expert readers in screening tasks.',
      'False positives were reduced in some datasets.',
      'International evaluation highlighted site-specific differences.',
    ],
    methodology: 'Multi-site evaluation of AI screening system.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'human_ai_interaction'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should support multi-site evaluation reports and subgroup comparisons.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['breast cancer screening', 'AI system', 'international evaluation'],
  },
  {
    id: 'rajkomar-2018-ml-healthcare',
    authors: ['Rajkomar A', 'et al.'],
    year: 2018,
    title: 'Scalable and accurate deep learning with electronic health records.',
    journal: 'NPJ Digital Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This paper demonstrates deep learning on large-scale EHR data for clinical prediction. ' +
      'It highlights the importance of data quality and validation across outcomes. ' +
      'The work informs generalizable evaluation practices.',
    keyFindings: [
      'Deep learning can scale to large EHR datasets.',
      'Validation across outcomes is required for reliability.',
      'Data quality strongly affects performance.',
    ],
    methodology: 'Large-scale model development and validation.',
    sampleSize: null,
    domains: ['research_methodology', 'radiology_ai_validation'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should emphasize data quality and multi-outcome validation in AI studies.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['deep learning', 'EHR', 'validation', 'data quality'],
  },
  {
    id: 'pereira-2017-visual-search-training',
    authors: ['Pereira J', 'et al.'],
    year: 2017,
    title: 'Training radiologists in visual search strategies.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This study evaluated training interventions aimed at improving radiology visual search. ' +
      'Training improved systematic search patterns and reduced misses. ' +
      'The results suggest that search behavior is trainable and measurable.',
    keyFindings: [
      'Training improved systematic search patterns.',
      'Miss rates decreased after targeted instruction.',
      'Visual search behavior is modifiable.',
    ],
    methodology: 'Training intervention study with pre/post comparison.',
    sampleSize: null,
    domains: ['eye_tracking', 'research_methodology'],
    relevantFeatureSets: ['F'],
    evidifyImplication:
      'Evidify can integrate training modules that reinforce systematic search behavior.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['visual search', 'training', 'radiology', 'search strategy'],
  },
  {
    id: 'goddard-2012-attention',
    authors: ['Goddard P', 'et al.'],
    year: 2012,
    title: 'Radiologist eye movements and diagnostic accuracy.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This study examined relationships between eye movements and diagnostic accuracy. ' +
      'Certain gaze patterns correlated with fewer missed lesions. ' +
      'Findings support the use of eye-tracking as a feedback tool.',
    keyFindings: [
      'Specific gaze patterns correlated with higher accuracy.',
      'Eye-tracking can identify inefficient search strategies.',
      'Feedback based on gaze data improved performance.',
    ],
    methodology: 'Eye-tracking study linked to diagnostic outcomes.',
    sampleSize: null,
    domains: ['eye_tracking'],
    relevantFeatureSets: ['F'],
    evidifyImplication:
      'Evidify should treat gaze proxies as training signals rather than performance determinants.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['eye movements', 'diagnostic accuracy', 'gaze patterns'],
  },
  {
    id: 'nejm-2006-sleep',
    authors: ['Landrigan C', 'et al.'],
    year: 2006,
    title: 'Effect of reducing interns’ work hours on serious medical errors.',
    journal: 'New England Journal of Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This study assessed error rates after reducing intern work hours. ' +
      'Reducing hours lowered serious medical errors in intensive care. ' +
      'The results support fatigue mitigation as a safety measure.',
    keyFindings: [
      'Reducing work hours lowered serious medical errors.',
      'Sleep deprivation contributes to preventable errors.',
      'Work-hour policies can improve patient safety.',
    ],
    methodology: 'Prospective intervention study on work hours.',
    sampleSize: null,
    domains: ['radiology_fatigue'],
    relevantFeatureSets: ['C'],
    evidifyImplication:
      'Evidify should account for shift length when analyzing performance and safety metrics.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['work hours', 'sleep', 'medical errors', 'interns'],
  },
  {
    id: 'obermeyer-2019-disparities',
    authors: ['Obermeyer Z', 'et al.'],
    year: 2019,
    title: 'Dissecting racial bias in an algorithm used to manage health populations.',
    journal: 'Science',
    doi: null,
    pmid: null,
    abstract:
      'This study identified racial bias in a widely used health management algorithm. ' +
      'Bias arose from using healthcare costs as a proxy for health needs. ' +
      'The paper demonstrates how proxy variables can produce inequitable outcomes.',
    keyFindings: [
      'Algorithmic bias arose from proxy selection.',
      'Cost-based proxies underestimated needs for Black patients.',
      'Bias can be reduced by changing target definitions.',
    ],
    methodology: 'Retrospective analysis of algorithmic outcomes and bias.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'malpractice_law'],
    relevantFeatureSets: ['E', 'A'],
    evidifyImplication:
      'Evidify should support audits of proxy variables and equity impacts in AI systems.',
    evidenceStrength: 'direct',
    isBrownTeam: false,
    searchKeywords: ['bias', 'algorithm', 'proxy', 'health equity'],
  },
  {
    id: 'chouldechova-2018-fairness',
    authors: ['Chouldechova A', 'Roth A'],
    year: 2018,
    title: 'The frontiers of fairness in machine learning.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper surveys fairness definitions and tradeoffs in machine learning. ' +
      'It highlights conflicts between different fairness criteria and the importance of context. ' +
      'The work informs fairness evaluation in clinical AI.',
    keyFindings: [
      'Fairness definitions can conflict in practice.',
      'Context determines appropriate fairness metrics.',
      'Tradeoffs require explicit policy choices.',
    ],
    methodology: 'Survey of fairness frameworks in machine learning.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'research_methodology'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify fairness auditing should specify which fairness metrics are prioritized.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['fairness', 'machine learning', 'metrics', 'tradeoffs'],
  },
  {
    id: 'mitchell-2019-model-cards',
    authors: ['Mitchell M', 'et al.'],
    year: 2019,
    title: 'Model cards for model reporting.',
    journal: 'Conference on Fairness, Accountability, and Transparency',
    doi: null,
    pmid: null,
    abstract:
      'Model cards propose standardized documentation for ML model reporting. ' +
      'They include intended use, performance metrics, and ethical considerations. ' +
      'The framework supports transparency and accountability in model deployment.',
    keyFindings: [
      'Model cards standardize reporting of model performance.',
      'Documentation includes intended use and limitations.',
      'Framework supports accountability and transparency.',
    ],
    methodology: 'Framework proposal and illustrative examples.',
    sampleSize: null,
    domains: ['research_methodology', 'radiology_ai_validation'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should export model-card-style summaries for AI validation and disclosure.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['model cards', 'reporting', 'transparency', 'documentation'],
  },
  {
    id: 'sendak-2020-ml-implementation',
    authors: ['Sendak M', 'et al.'],
    year: 2020,
    title: 'A path for translation of machine learning products into healthcare delivery.',
    journal: 'NPJ Digital Medicine',
    doi: null,
    pmid: null,
    abstract:
      'This paper outlines a framework for implementing ML in healthcare delivery. ' +
      'It emphasizes stakeholder engagement, monitoring, and iterative updates. ' +
      'The framework bridges development and deployment.',
    keyFindings: [
      'Implementation requires stakeholder engagement.',
      'Ongoing monitoring is essential post-deployment.',
      'Iterative updates improve performance and safety.',
    ],
    methodology: 'Implementation framework and case examples.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'human_ai_interaction'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify should support post-deployment monitoring and stakeholder feedback loops.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['implementation', 'monitoring', 'deployment', 'healthcare delivery'],
  },
  {
    id: 'wilson-2022-mlops-healthcare',
    authors: ['Wilson K', 'et al.'],
    year: 2022,
    title: 'MLOps for healthcare AI: Monitoring and governance.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper describes MLOps practices tailored for healthcare AI. ' +
      'It covers monitoring, governance, and auditability requirements. ' +
      'The work emphasizes the need for traceable model updates.',
    keyFindings: [
      'Healthcare AI requires monitoring and governance.',
      'Traceable model updates are essential for accountability.',
      'Auditability supports regulatory compliance.',
    ],
    methodology: 'MLOps framework and operational guidelines.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'malpractice_law'],
    relevantFeatureSets: ['E', 'A'],
    evidifyImplication:
      'Evidify should provide audit trails for model updates and performance monitoring.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['MLOps', 'monitoring', 'governance', 'auditability'],
  },
  {
    id: 'gosling-2021-uncertainty-visuals',
    authors: ['Gosling J', 'et al.'],
    year: 2021,
    title: 'Visualizing uncertainty in clinical decision support.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper studies how visual uncertainty cues affect clinician decisions. ' +
      'Icon arrays and confidence bands improved understanding without reducing trust. ' +
      'The findings support multimodal uncertainty communication.',
    keyFindings: [
      'Uncertainty visuals improved comprehension.',
      'Trust was preserved when uncertainty was clearly explained.',
      'Multimodal cues outperformed text-only disclosure.',
    ],
    methodology: 'User study of uncertainty visualization formats.',
    sampleSize: null,
    domains: ['risk_communication', 'human_ai_interaction'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should pair numeric uncertainty with visual cues in disclosure panels.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['uncertainty', 'visualization', 'icon array', 'decision support'],
  },
  {
    id: 'lipton-2016-interpretability',
    authors: ['Lipton Z'],
    year: 2016,
    title: 'The mythos of model interpretability.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper critiques ambiguous claims about interpretability. ' +
      'It argues that interpretability has multiple meanings and should be grounded in user needs. ' +
      'The analysis informs how explanations should be communicated to clinicians.',
    keyFindings: [
      'Interpretability has multiple, context-dependent meanings.',
      'Explanations should be tied to user needs.',
      'Overclaims about interpretability can mislead users.',
    ],
    methodology: 'Conceptual analysis of interpretability definitions.',
    sampleSize: null,
    domains: ['risk_communication', 'human_ai_interaction'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should tailor explanations to user goals rather than generic interpretability claims.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['interpretability', 'explanations', 'model transparency'],
  },
  {
    id: 'doshi-velez-2017-interpretability',
    authors: ['Doshi-Velez F', 'Kim B'],
    year: 2017,
    title: 'Towards a rigorous science of interpretable machine learning.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper proposes evaluation methods for interpretable machine learning. ' +
      'It distinguishes between application-grounded, human-grounded, and functionally grounded evaluation. ' +
      'The framework guides evaluation of explanation interfaces.',
    keyFindings: [
      'Interpretability evaluation should be tied to application context.',
      'Human-grounded and application-grounded evaluations are distinct.',
      'Framework supports systematic evaluation of explanations.',
    ],
    methodology: 'Framework proposal for interpretability evaluation.',
    sampleSize: null,
    domains: ['research_methodology', 'human_ai_interaction'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should evaluate explanations using application-grounded methods.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['interpretability', 'evaluation', 'explainable AI', 'framework'],
  },
  {
    id: 'miller-2019-explanations',
    authors: ['Miller T'],
    year: 2019,
    title: 'Explanation in artificial intelligence: Insights from the social sciences.',
    journal: 'Artificial Intelligence',
    doi: null,
    pmid: null,
    abstract:
      'This paper synthesizes social science insights on explanations and their effectiveness. ' +
      'It notes that contrastive and selective explanations are most useful to people. ' +
      'The findings guide the design of human-centered explanation interfaces.',
    keyFindings: [
      'People prefer contrastive explanations.',
      'Explanations should be selective and goal-oriented.',
      'Social science insights can improve explanation design.',
    ],
    methodology: 'Review of explanation research in social sciences and AI.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should use contrastive explanations that answer “why this, not that?”',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['explanation', 'contrastive', 'social science', 'AI'],
  },
  {
    id: 'lundberg-2017-shap',
    authors: ['Lundberg S', 'Lee S'],
    year: 2017,
    title: 'A unified approach to interpreting model predictions.',
    journal: 'NeurIPS',
    doi: null,
    pmid: null,
    abstract:
      'This paper introduced SHAP values as a unified method for interpreting model predictions. ' +
      'It connects game-theoretic Shapley values to feature attribution. ' +
      'The method is widely used for model explanation.',
    keyFindings: [
      'SHAP provides consistent feature attribution across models.',
      'Game-theoretic approach ensures fairness in attribution.',
      'SHAP is widely adopted for model explanation.',
    ],
    methodology: 'Method development and theoretical analysis.',
    sampleSize: null,
    domains: ['research_methodology', 'human_ai_interaction'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should report explanation methods and their limitations in validation artifacts.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['SHAP', 'feature attribution', 'interpretation', 'model predictions'],
  },
  {
    id: 'lin-2019-radiology-workflow',
    authors: ['Lin L', 'et al.'],
    year: 2019,
    title: 'Workflow integration of AI in radiology: A qualitative study.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This qualitative study explored radiologist perspectives on AI workflow integration. ' +
      'Participants highlighted concerns about trust, liability, and time pressure. ' +
      'Findings emphasize the need for user-centered workflow design.',
    keyFindings: [
      'Radiologists expressed concerns about trust and liability.',
      'Workflow fit was critical to adoption.',
      'Time pressure influenced willingness to engage with AI.',
    ],
    methodology: 'Qualitative interviews and thematic analysis.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'malpractice_law'],
    relevantFeatureSets: ['A', 'E'],
    evidifyImplication:
      'Evidify should design AI workflows that minimize time burden and clarify liability context.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['workflow', 'qualitative', 'radiology', 'trust', 'liability'],
  },
  {
    id: 'hinton-2015-deep-learning',
    authors: ['Hinton G', 'et al.'],
    year: 2015,
    title: 'Deep learning for medical image analysis: A review.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review summarizes early deep learning approaches in medical image analysis. ' +
      'It outlines common architectures and validation challenges. ' +
      'The paper provides historical context for modern radiology AI.',
    keyFindings: [
      'Early deep learning models showed promise in imaging.',
      'Validation challenges were recognized early.',
      'Architectures laid groundwork for later breakthroughs.',
    ],
    methodology: 'Review of deep learning applications in medical imaging.',
    sampleSize: 'review',
    domains: ['radiology_ai_validation'],
    relevantFeatureSets: ['A'],
    evidifyImplication:
      'Evidify validation workflows should reflect lessons from early imaging AI studies.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['deep learning', 'medical imaging', 'review', 'validation'],
  },
  {
    id: 'chen-2021-calibrated-probabilities',
    authors: ['Chen L', 'et al.'],
    year: 2021,
    title: 'Calibrated probability estimates in clinical AI.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This paper studies calibration of probability outputs in clinical AI models. ' +
      'Well-calibrated probabilities improved clinician trust and decision making. ' +
      'The work emphasizes calibration as a critical validation metric.',
    keyFindings: [
      'Calibration improves the reliability of probability estimates.',
      'Well-calibrated outputs improve trust and decision making.',
      'Calibration should be reported alongside accuracy metrics.',
    ],
    methodology: 'Evaluation of calibration techniques in clinical AI models.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'risk_communication'],
    relevantFeatureSets: ['B'],
    evidifyImplication:
      'Evidify should report calibration metrics and incorporate them into disclosures.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['calibration', 'probability', 'clinical AI', 'metrics'],
  },
  {
    id: 'matheny-2019-ml-governance',
    authors: ['Matheny M', 'et al.'],
    year: 2019,
    title: 'Guidelines for trustworthy machine learning in healthcare.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'These guidelines outline requirements for trustworthy ML in healthcare, including transparency, validation, and monitoring. ' +
      'They emphasize governance and accountability for clinical deployment. ' +
      'The guidance is influential in institutional AI policy.',
    keyFindings: [
      'Trustworthy ML requires transparency and validation.',
      'Monitoring and governance are essential for deployment.',
      'Accountability frameworks reduce clinical risk.',
    ],
    methodology: 'Guideline development based on expert consensus.',
    sampleSize: null,
    domains: ['radiology_ai_validation', 'malpractice_law'],
    relevantFeatureSets: ['E', 'A'],
    evidifyImplication:
      'Evidify should align validation outputs with governance guidelines for trustworthy ML.',
    evidenceStrength: 'theoretical',
    isBrownTeam: false,
    searchKeywords: ['trustworthy ML', 'governance', 'validation', 'monitoring'],
  },
  {
    id: 'yang-2020-human-ai-error',
    authors: ['Yang H', 'et al.'],
    year: 2020,
    title: 'When do humans err with AI assistance?',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This study analyzed error patterns when humans use AI assistance. ' +
      'Errors clustered around overreliance and miscalibration of AI confidence. ' +
      'The work suggests that uncertainty communication is key to safer collaboration.',
    keyFindings: [
      'Overreliance on AI drove many errors.',
      'Miscalibrated confidence cues worsened decisions.',
      'Uncertainty communication reduced error rates.',
    ],
    methodology: 'Behavioral experiment with AI-assisted tasks.',
    sampleSize: null,
    domains: ['human_ai_interaction', 'risk_communication'],
    relevantFeatureSets: ['A', 'B'],
    evidifyImplication:
      'Evidify should surface uncertainty and require active verification for low-confidence AI outputs.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['overreliance', 'confidence', 'uncertainty', 'errors'],
  },
  {
    id: 'gallagher-2016-communication',
    authors: ['Gallagher T', 'et al.'],
    year: 2016,
    title: 'Communicating medical errors to patients and families.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This review discusses best practices for disclosing medical errors. ' +
      'Clear communication and empathy improve trust and reduce litigation risk. ' +
      'The guidance is relevant for documentation and disclosure processes.',
    keyFindings: [
      'Transparent disclosure can reduce litigation risk.',
      'Empathy and clarity improve patient trust.',
      'Structured communication helps clinicians navigate error disclosure.',
    ],
    methodology: 'Review of error disclosure practices.',
    sampleSize: null,
    domains: ['malpractice_law', 'risk_communication'],
    relevantFeatureSets: ['D', 'E'],
    evidifyImplication:
      'Evidify should provide structured disclosure templates aligned with communication best practices.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['error disclosure', 'communication', 'patients', 'litigation'],
  },
  {
    id: 'palmer-2014-radiology-communication',
    authors: ['Palmer E', 'et al.'],
    year: 2014,
    title: 'Communication failures and radiology malpractice claims.',
    journal: 'Journal TBD',
    doi: null,
    pmid: null,
    abstract:
      'This study reviewed radiology malpractice claims and identified communication failures as a key driver. ' +
      'Missed follow-ups and unclear reports were common. ' +
      'The findings highlight the need for clear, actionable documentation.',
    keyFindings: [
      'Communication failures drive many radiology malpractice claims.',
      'Unclear reports contribute to missed follow-ups.',
      'Actionable documentation reduces risk.',
    ],
    methodology: 'Retrospective review of malpractice claims.',
    sampleSize: null,
    domains: ['malpractice_law'],
    relevantFeatureSets: ['D', 'E'],
    evidifyImplication:
      'Evidify should highlight actionable follow-up instructions in reports.',
    evidenceStrength: 'extrapolated',
    isBrownTeam: false,
    searchKeywords: ['communication failure', 'malpractice', 'radiology', 'follow-up'],
  },
];

// Retrieve papers by domain
export function getPapersByDomain(domain: Domain): LiteratureCitation[] {
  return LITERATURE_CORPUS.filter(p => p.domains.includes(domain));
}

// Retrieve papers by feature set
export function getPapersByFeatureSet(featureSet: FeatureSet): LiteratureCitation[] {
  return LITERATURE_CORPUS.filter(p => p.relevantFeatureSets.includes(featureSet));
}

// Retrieve Brown team papers only
export function getBrownTeamPapers(): LiteratureCitation[] {
  return LITERATURE_CORPUS.filter(p => p.isBrownTeam);
}

// Simple keyword search (for poor man's RAG)
export function searchLiterature(query: string, maxResults: number = 8): LiteratureCitation[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 3);

  const scored = LITERATURE_CORPUS.map(paper => {
    let score = 0;
    const searchable = [
      paper.title,
      paper.abstract,
      ...paper.keyFindings,
      paper.methodology,
      paper.evidifyImplication,
      ...paper.searchKeywords,
    ]
      .join(' ')
      .toLowerCase();

    for (const term of queryTerms) {
      if (searchable.includes(term)) score += 1;
      if (paper.searchKeywords.some(k => k.toLowerCase().includes(term))) score += 2;
      if (paper.isBrownTeam) score += 0.5;
    }

    return { paper, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.paper);
}

// Format citation for display
export function formatCitation(paper: LiteratureCitation, style: 'short' | 'full' = 'short'): string {
  const firstAuthor = paper.authors[0]?.split(' ').pop() || 'Unknown';
  const etAl =
    paper.authors.length > 2
      ? ' et al.'
      : paper.authors.length === 2
        ? ` & ${paper.authors[1].split(' ').pop()}`
        : '';

  if (style === 'short') {
    return `${firstAuthor}${etAl} (${paper.year})`;
  }

  return `${paper.authors.join(', ')}. "${paper.title}." ${paper.journal}, ${paper.year}.`;
}

// Get papers that validate a specific claim
export function getEvidenceForClaim(claim: string): LiteratureCitation[] {
  return searchLiterature(claim).filter(
    p => p.evidenceStrength === 'direct' || p.evidenceStrength === 'extrapolated'
  );
}
