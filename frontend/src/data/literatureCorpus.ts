/**
 * literatureCorpus.ts
 *
 * Searchable, typed literature corpus grounding Evidify's research claims
 * in published evidence. Referenced by UI components to display citation
 * support for methodology decisions.
 *
 * All citations are real, peer-reviewed publications or legal authorities.
 * DOIs and PMIDs are included where verified.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiteratureCitation {
  id: string;
  authors: string[];
  year: number;
  title: string;
  journal: string;
  doi?: string;
  pmid?: string;
  abstract?: string;
  tags: string[];
  evidifyRelevance: string;
  domain: string;
}

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

export const LITERATURE_CORPUS: LiteratureCitation[] = [
  // =========================================================================
  // RADIOLOGY AI LIABILITY (core)
  // =========================================================================
  {
    id: 'bernstein2025nejm',
    authors: [
      'Michael H. Bernstein',
      'Brian Sheppard',
      'Michael A. Bruno',
      'Parker S. Lay',
      'Grayson L. Baird',
    ],
    year: 2025,
    title:
      'Randomized Study of the Impact of AI on Perceived Legal Liability for Radiologists',
    journal: 'NEJM AI',
    doi: '10.1056/AIoa2400785',
    abstract:
      'Randomized clinical vignette trial demonstrating that AI-assisted radiology workflows significantly shift juror perceptions of liability. Part of the Brown Radiology, Psychology, and Law Lab program.',
    tags: ['liability', 'radiology-ai', 'juror-cognition', 'medical-malpractice'],
    evidifyRelevance:
      "Core study validating Evidify's thesis that workflow design — not AI accuracy alone — determines legal outcomes for radiologists.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'bernstein2025nature',
    authors: [
      'Michael H. Bernstein',
      'Brian Sheppard',
      'Michael A. Bruno',
      'Parker S. Lay',
      'Grayson L. Baird',
    ],
    year: 2025,
    title:
      'Radiologist-AI workflow can be modified to reduce the risk of medical malpractice claims',
    journal: 'Nature Health',
    abstract:
      'Showed that structured disclosure of AI involvement reduced plaintiff verdict rates from 74.7% to 52.9%, demonstrating that transparency protocols are legally protective.',
    tags: ['liability', 'radiology-ai', 'disclosure', 'medical-malpractice'],
    evidifyRelevance:
      "Provides the primary effect size (74.7% to 52.9% verdict reduction) that motivates Evidify's disclosure-first approach to AI liability management.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'bernstein2025ajr',
    authors: [
      'Michael H. Bernstein',
      'Brian Sheppard',
      'Michael A. Bruno',
      'Grayson L. Baird',
    ],
    year: 2025,
    title:
      'Minimizing Medical Malpractice Risk for Radiologists Using Artificial Intelligence',
    journal: 'American Journal of Roentgenology',
    doi: '10.2214/AJR.25.34048',
    pmid: '41222244',
    abstract:
      'Practical framework for radiologists to minimize malpractice exposure when integrating AI tools into clinical workflow.',
    tags: ['liability', 'radiology-ai', 'medical-malpractice'],
    evidifyRelevance:
      "Provides actionable malpractice-minimization strategies that inform Evidify's workflow design recommendations.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'mello2024',
    authors: ['Michelle M. Mello', 'Neel Guha'],
    year: 2024,
    title:
      'Understanding Liability Risk from Using Health Care Artificial Intelligence Tools',
    journal: 'New England Journal of Medicine',
    doi: '10.1056/NEJMhle2308901',
    pmid: '38231630',
    abstract:
      'Comprehensive framework analyzing liability exposure for clinicians using AI diagnostic tools, covering negligence, product liability, and informed consent theories.',
    tags: ['liability', 'radiology-ai', 'medical-malpractice', 'legal-framework'],
    evidifyRelevance:
      "Establishes the legal taxonomy of AI liability theories that Evidify's evidence architecture is designed to address.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'price2019',
    authors: ['W. Nicholson Price II', 'Sara Gerke', 'I. Glenn Cohen'],
    year: 2019,
    title: 'Potential Liability for Physicians Using Artificial Intelligence',
    journal: 'JAMA',
    doi: '10.1001/jama.2019.15064',
    pmid: '31584609',
    abstract:
      'Examines how existing malpractice law applies when physicians rely on AI recommendations, identifying gaps in current liability frameworks.',
    tags: ['liability', 'radiology-ai', 'medical-malpractice'],
    evidifyRelevance:
      "Identifies the standard-of-care uncertainty that Evidify resolves through contemporaneous documentation of AI interaction.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'price2024',
    authors: ['W. Nicholson Price II', 'I. Glenn Cohen'],
    year: 2024,
    title: 'Locating Liability for Medical AI',
    journal: 'DePaul Law Review',
    abstract:
      'Analyzes the distribution of liability between physicians, hospitals, and AI developers when AI-assisted diagnoses go wrong.',
    tags: ['liability', 'radiology-ai', 'medical-malpractice', 'legal-framework'],
    evidifyRelevance:
      "Maps the liability chain that Evidify's audit trail is designed to disambiguate across stakeholders.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'maliha2021',
    authors: ['George Maliha', 'Sara Gerke', 'I. Glenn Cohen', 'Ravi B. Parikh'],
    year: 2021,
    title:
      'Artificial Intelligence and Liability in Medicine: Balancing Safety and Innovation',
    journal: 'Milbank Quarterly',
    doi: '10.1111/1468-0009.12504',
    pmid: '33822422',
    abstract:
      'Proposes a balanced framework for AI medical liability that encourages innovation while protecting patient safety through appropriate accountability structures.',
    tags: ['liability', 'radiology-ai', 'medical-malpractice', 'legal-framework'],
    evidifyRelevance:
      "Provides the safety-innovation balance framework that guides Evidify's approach to protective documentation without chilling AI adoption.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'topol2019',
    authors: ['Eric J. Topol'],
    year: 2019,
    title:
      'High-performance medicine: the convergence of human and artificial intelligence',
    journal: 'Nature Medicine',
    doi: '10.1038/s41591-018-0300-7',
    abstract:
      'Comprehensive review of AI applications across medical specialties, with emphasis on radiology and pathology where AI performance approaches or exceeds human expert levels.',
    tags: ['radiology-ai', 'deep-learning', 'clinical-decision-making'],
    evidifyRelevance:
      "Establishes the clinical context for why AI-radiologist collaboration demands new accountability frameworks that Evidify provides.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'mckinney2020',
    authors: [
      'Scott Mayer McKinney',
      'Marcin Sieniek',
      'Varun Godbole',
      'Jonathan Godwin',
      'Natasha Antropova',
      'Hutan Ashrafian',
      'Trevor Back',
      'Mary Chesus',
      'Greg S. Corrado',
      'Ara Darzi',
      'Mozziyar Etemadi',
      'Florencia Garcia-Vicente',
      'Fiona J. Gilbert',
      'Mark Halling-Brown',
      'Demis Hassabis',
      'Sunny Jha',
      'Dominic King',
      'Jeffrey De Fauw',
      'Shravya Shetty',
    ],
    year: 2020,
    title:
      'International evaluation of an AI system for breast cancer screening',
    journal: 'Nature',
    doi: '10.1038/s41586-019-1799-6',
    abstract:
      'AI system surpassed radiologists in breast cancer detection across UK and US screening populations, reducing both false positives and false negatives.',
    tags: ['radiology-ai', 'breast-screening', 'deep-learning'],
    evidifyRelevance:
      "Demonstrates the clinical capability that makes AI-radiologist liability questions urgent — when AI outperforms humans, who bears responsibility for not using it?",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'liu2019',
    authors: [
      'Xiaoxuan Liu',
      'Livia Faes',
      'Aditya U. Kale',
      'Siegfried K. Wagner',
      'Dun Jack Fu',
      'Alice Bruber',
      'Reena Chopra',
      'Dawn A. Sim',
      'Pearse A. Keane',
    ],
    year: 2019,
    title:
      'A comparison of deep learning performance against health-care professionals in detecting diseases from medical imaging: a systematic review and meta-analysis',
    journal: 'The Lancet Digital Health',
    doi: '10.1016/S2589-7500(19)30123-2',
    abstract:
      'Meta-analysis showing deep learning diagnostic performance equivalent to health-care professionals across multiple imaging modalities and clinical conditions.',
    tags: ['radiology-ai', 'deep-learning', 'meta-analysis'],
    evidifyRelevance:
      "Provides the evidence base showing AI-human diagnostic parity that creates the liability ambiguity Evidify's platform addresses.",
    domain: 'radiology-ai-liability',
  },
  {
    id: 'rajpurkar2017',
    authors: [
      'Pranav Rajpurkar',
      'Jeremy Irvin',
      'Kaylie Zhu',
      'Brandon Yang',
      'Hershel Mehta',
      'Tony Duan',
      'Daisy Ding',
      'Aarti Bagul',
      'Curtis Langlotz',
      'Katie Shpanskaya',
      'Matthew P. Lungren',
      'Andrew Y. Ng',
    ],
    year: 2017,
    title:
      'CheXNet: Radiologist-Level Pneumonia Detection on Chest X-Rays with Deep Learning',
    journal: 'arXiv preprint',
    doi: '10.48550/arXiv.1711.05225',
    abstract:
      'Demonstrated a 121-layer convolutional neural network achieving radiologist-level pneumonia detection on chest X-rays using the ChestX-ray14 dataset.',
    tags: ['radiology-ai', 'deep-learning', 'chest-radiography'],
    evidifyRelevance:
      "Landmark demonstration of radiologist-level AI performance that initiated the clinical AI liability discussion Evidify addresses.",
    domain: 'radiology-ai-liability',
  },

  // =========================================================================
  // JUROR DECISION-MAKING
  // =========================================================================
  {
    id: 'pennington1992',
    authors: ['Nancy Pennington', 'Reid Hastie'],
    year: 1992,
    title:
      'Explaining the Evidence: Tests of the Story Model for Juror Decision Making',
    journal: 'Journal of Personality and Social Psychology',
    abstract:
      'Established the Story Model showing jurors construct narrative explanations of trial evidence and match stories to verdict categories, with narrative coherence driving decisions.',
    tags: ['juror-cognition', 'story-model', 'liability'],
    evidifyRelevance:
      "Foundational theory for Evidify's narrative-coherence approach — the platform generates documentation that supports defensible story construction at trial.",
    domain: 'juror-decision-making',
  },
  {
    id: 'winter1984',
    authors: ['Laraine Winter', 'James S. Uleman'],
    year: 1984,
    title:
      'When Are Social Judgments Made? Evidence for the Spontaneousness of Trait Inferences',
    journal: 'Journal of Personality and Social Psychology',
    abstract:
      'Demonstrated that people spontaneously infer personality traits from behavioral descriptions without intention or awareness, establishing the Spontaneous Trait Inference paradigm.',
    tags: ['juror-cognition', 'cognitive-bias', 'spontaneous-inference'],
    evidifyRelevance:
      "Explains why jurors automatically form negligence impressions from radiologist behavior — Evidify's disclosure protocols preempt negative spontaneous inferences.",
    domain: 'juror-decision-making',
  },
  {
    id: 'uleman2008',
    authors: ['James S. Uleman', 'S. Adil Saribay', 'Celia M. Gonzalez'],
    year: 2008,
    title:
      'Spontaneous Inferences, Implicit Impressions, and Implicit Theories',
    journal: 'Annual Review of Psychology',
    doi: '10.1146/annurev.psych.59.103006.093707',
    pmid: '17854284',
    abstract:
      'Comprehensive review showing that trait, goal, and causal inferences occur automatically during social perception, with implications for how jurors evaluate professional conduct.',
    tags: ['juror-cognition', 'cognitive-bias', 'spontaneous-inference'],
    evidifyRelevance:
      "Provides the theoretical framework for understanding how jurors automatically attribute negligence, informing Evidify's proactive disclosure strategy.",
    domain: 'juror-decision-making',
  },
  {
    id: 'tversky1974',
    authors: ['Amos Tversky', 'Daniel Kahneman'],
    year: 1974,
    title: 'Judgment under Uncertainty: Heuristics and Biases',
    journal: 'Science',
    doi: '10.1126/science.185.4157.1124',
    pmid: '17835457',
    abstract:
      'Identified three heuristics (representativeness, availability, anchoring) that systematically bias human judgment under uncertainty, with implications for all decision-making contexts.',
    tags: ['juror-cognition', 'cognitive-bias', 'heuristics'],
    evidifyRelevance:
      "Explains the cognitive biases jurors bring to malpractice deliberation — Evidify's evidence design accounts for anchoring and availability effects.",
    domain: 'juror-decision-making',
  },
  {
    id: 'tversky1981',
    authors: ['Amos Tversky', 'Daniel Kahneman'],
    year: 1981,
    title: 'The Framing of Decisions and the Psychology of Choice',
    journal: 'Science',
    doi: '10.1126/science.7455683',
    abstract:
      'Demonstrated that the way choices are framed (as gains vs. losses) systematically reverses preferences, violating rational choice axioms.',
    tags: ['juror-cognition', 'cognitive-bias', 'framing'],
    evidifyRelevance:
      "Informs how Evidify frames AI-assisted workflow documentation — liability framing significantly affects juror perception of radiologist conduct.",
    domain: 'juror-decision-making',
  },
  {
    id: 'kahneman2011',
    authors: ['Daniel Kahneman'],
    year: 2011,
    title: 'Thinking, Fast and Slow',
    journal: 'Farrar, Straus and Giroux',
    abstract:
      'Synthesizes decades of research on dual-process theory (System 1 intuitive vs. System 2 deliberative thinking) and its implications for judgment and decision-making.',
    tags: ['juror-cognition', 'cognitive-bias', 'heuristics', 'dual-process'],
    evidifyRelevance:
      "Provides the dual-process framework explaining why jurors rely on intuitive judgments about radiologist negligence unless given structured evidence to engage deliberative reasoning.",
    domain: 'juror-decision-making',
  },

  // =========================================================================
  // AUTOMATION BIAS / HUMAN-AI INTERACTION
  // =========================================================================
  {
    id: 'goddard2012',
    authors: ['Kate Goddard', 'Abdul Roudsari', 'Jeremy C. Wyatt'],
    year: 2012,
    title:
      'Automation Bias: A Systematic Review of Frequency, Effect Mediators, and Mitigators',
    journal: 'Journal of the American Medical Informatics Association',
    doi: '10.1136/amiajnl-2011-000089',
    pmid: '21685142',
    abstract:
      'Systematic review finding automation bias prevalent across clinical decision support systems, with errors of both commission (following incorrect AI advice) and omission (missing issues AI fails to flag).',
    tags: ['automation-bias', 'radiology-ai', 'clinical-decision-making'],
    evidifyRelevance:
      "Quantifies the automation bias risk that Evidify's workflow documentation captures — showing whether radiologists independently verified AI findings.",
    domain: 'automation-bias',
  },
  {
    id: 'gaube2021',
    authors: [
      'Susanne Gaube',
      'Harini Suresh',
      'Martina Raue',
      'Alexander Merritt',
      'Seth J. Berkowitz',
      'Eva Lermer',
      'Joseph F. Coughlin',
      'John V. Guttag',
      'Errol Colak',
      'Marzyeh Ghassemi',
    ],
    year: 2021,
    title: 'Do as AI say: susceptibility in deployment of clinical decision-aids',
    journal: 'npj Digital Medicine',
    doi: '10.1038/s41746-021-00385-9',
    pmid: '33608629',
    abstract:
      'Found that both radiologists and non-radiologists were susceptible to AI advice, with the effect modulated by perceived AI expertise and the clinical context.',
    tags: [
      'automation-bias',
      'radiology-ai',
      'clinical-decision-making',
      'trust-calibration',
    ],
    evidifyRelevance:
      "Demonstrates the susceptibility to AI advice that makes documented independent assessment critical — a core Evidify workflow requirement.",
    domain: 'automation-bias',
  },
  {
    id: 'parasuraman1997',
    authors: ['Raja Parasuraman', 'Victor Riley'],
    year: 1997,
    title: 'Humans and Automation: Use, Misuse, Disuse, Abuse',
    journal: 'Human Factors',
    doi: '10.1518/001872097778543886',
    abstract:
      'Seminal taxonomy of human-automation interaction failures: misuse (over-reliance), disuse (under-reliance), and abuse (inappropriate automation application by designers).',
    tags: ['automation-bias', 'human-factors', 'trust-calibration'],
    evidifyRelevance:
      "Provides the misuse/disuse/abuse framework that Evidify uses to categorize and document AI interaction patterns for legal defensibility.",
    domain: 'automation-bias',
  },
  {
    id: 'parasuraman2000',
    authors: [
      'Raja Parasuraman',
      'Thomas B. Sheridan',
      'Christopher D. Wickens',
    ],
    year: 2000,
    title:
      'A Model for Types and Levels of Human Interaction with Automation',
    journal:
      'IEEE Transactions on Systems, Man, and Cybernetics — Part A: Systems and Humans',
    doi: '10.1109/3468.844354',
    abstract:
      'Proposed a four-stage model of automation (information acquisition, analysis, decision, action) with ten levels ranging from full manual to full automation.',
    tags: ['automation-bias', 'human-factors', 'clinical-workflow'],
    evidifyRelevance:
      "Defines the automation level taxonomy that Evidify applies to classify radiologist-AI interaction stages in its audit trail.",
    domain: 'automation-bias',
  },
  {
    id: 'skitka1999',
    authors: ['Linda J. Skitka', 'Kathleen L. Mosier', 'Mark Burdick'],
    year: 1999,
    title: 'Does Automation Bias Decision-Making?',
    journal: 'International Journal of Human-Computer Studies',
    doi: '10.1006/ijhc.1999.0252',
    abstract:
      'Demonstrated that automated decision aids induce commission errors (acting on incorrect automated advice) and omission errors (failing to notice problems when automation is silent).',
    tags: ['automation-bias', 'clinical-decision-making', 'human-factors'],
    evidifyRelevance:
      "Establishes the commission/omission error taxonomy that Evidify's workflow captures to demonstrate radiologist vigilance despite AI availability.",
    domain: 'automation-bias',
  },
  {
    id: 'lyell2017',
    authors: ['David Lyell', 'Enrico Coiera'],
    year: 2017,
    title: 'Automation bias and verification complexity: a systematic review',
    journal: 'Journal of the American Medical Informatics Association',
    doi: '10.1093/jamia/ocw105',
    pmid: '27516495',
    abstract:
      'Systematic review finding that automation bias increases with verification complexity — the harder it is to check AI output, the more clinicians accept it uncritically.',
    tags: ['automation-bias', 'clinical-decision-making', 'radiology-ai'],
    evidifyRelevance:
      "Explains why radiologists are especially vulnerable to automation bias in complex imaging — motivating Evidify's structured verification documentation.",
    domain: 'automation-bias',
  },
  {
    id: 'fenton2007',
    authors: [
      'Joshua J. Fenton',
      'Susan H. Taplin',
      'Patricia A. Carney',
      'Linn Abraham',
      'Edward A. Sickles',
      "Carl D'Orsi",
      'Eric A. Berns',
      'Gary Cutter',
      'R. Edward Hendrick',
      'William E. Barlow',
      'Joann G. Elmore',
    ],
    year: 2007,
    title:
      'Influence of Computer-Aided Detection on Performance of Screening Mammography',
    journal: 'New England Journal of Medicine',
    doi: '10.1056/NEJMoa066099',
    pmid: '17409321',
    abstract:
      'Large-scale study showing computer-aided detection in mammography increased recall rates without improving cancer detection, raising concerns about automation-mediated overcalling.',
    tags: ['automation-bias', 'breast-screening', 'radiology-ai', 'cad'],
    evidifyRelevance:
      "Demonstrates automation bias in real clinical mammography — CAD increased false positives, supporting Evidify's emphasis on documenting independent radiologist judgment.",
    domain: 'automation-bias',
  },
  {
    id: 'lehman2015',
    authors: [
      'Constance D. Lehman',
      'Robert D. Wellman',
      'Diana S. M. Buist',
      'Karla Kerlikowske',
      'Anna N. A. Tosteson',
      'Diana L. Miglioretti',
    ],
    year: 2015,
    title:
      'Diagnostic Accuracy of Digital Screening Mammography With and Without Computer-Aided Detection',
    journal: 'JAMA Internal Medicine',
    doi: '10.1001/jamainternmed.2015.5231',
    pmid: '26414882',
    abstract:
      'Found that CAD did not improve diagnostic accuracy of digital mammography in a large screening population, challenging assumptions about AI-assisted reading benefit.',
    tags: ['automation-bias', 'breast-screening', 'radiology-ai', 'cad'],
    evidifyRelevance:
      "Provides evidence that AI assistance alone does not guarantee improved outcomes — reinforcing Evidify's focus on workflow quality over AI deployment alone.",
    domain: 'automation-bias',
  },

  // =========================================================================
  // RADIOLOGY WORKLOAD & PERFORMANCE
  // =========================================================================
  {
    id: 'taylor_phillips2024',
    authors: [
      'Sian Taylor-Phillips',
      'David Jenkinson',
      'Chris Stinton',
      'Melina A. Kunar',
      'Derrick G. Watson',
      'Karoline Freeman',
      'Alice Mansbridge',
      'Matthew G. Wallis',
      'Olive Kearins',
      'Sue Hudson',
      'Aileen Clarke',
    ],
    year: 2024,
    title:
      'Fatigue and vigilance in medical experts detecting breast cancer',
    journal: 'Proceedings of the National Academy of Sciences',
    doi: '10.1073/pnas.2309576121',
    pmid: '38437559',
    abstract:
      'Demonstrated measurable vigilance decrements in breast screening radiologists over reading sessions, with cancer detection accuracy declining as a function of time on task.',
    tags: ['workload', 'breast-screening', 'fatigue', 'radiology-ai'],
    evidifyRelevance:
      "Provides direct evidence for workload-dependent performance degradation that Evidify's workload monitoring system is designed to capture and document.",
    domain: 'radiology-workload',
  },
  {
    id: 'waite2017',
    authors: [
      'Stephen Waite',
      'Srinivas Kolla',
      'Jean Jeudy',
      'Alan Legasto',
      'Stephen L. Macknik',
      'Susana Martinez-Conde',
      'Elizabeth A. Krupinski',
      'Deborah L. Reede',
    ],
    year: 2017,
    title: 'Tired in the Reading Room: The Influence of Fatigue in Radiology',
    journal: 'Journal of the American College of Radiology',
    doi: '10.1016/j.jacr.2016.10.009',
    pmid: '27956140',
    abstract:
      'Review of fatigue effects on radiologist performance covering visual fatigue, cognitive fatigue, and circadian influences on diagnostic accuracy.',
    tags: ['workload', 'fatigue', 'radiology-ai', 'human-factors'],
    evidifyRelevance:
      "Establishes the scientific basis for Evidify's fatigue-aware workload monitoring — documenting conditions that affect radiologist performance.",
    domain: 'radiology-workload',
  },
  {
    id: 'krupinski2010',
    authors: [
      'Elizabeth A. Krupinski',
      'Kevin S. Berbaum',
      'Robert T. Caldwell',
      'Kevin M. Schartz',
      'Jeff Kim',
    ],
    year: 2010,
    title:
      'Long Radiology Workdays Reduce Detection and Accommodation Accuracy',
    journal: 'Journal of the American College of Radiology',
    doi: '10.1016/j.jacr.2010.03.004',
    abstract:
      'Found that extended radiology workdays produced measurable declines in both lesion detection accuracy and visual accommodation, providing objective fatigue metrics.',
    tags: ['workload', 'fatigue', 'radiology-ai'],
    evidifyRelevance:
      "Provides the detection-accuracy decline data that validates Evidify's throughput-based workload thresholds for advisory generation.",
    domain: 'radiology-workload',
  },
  {
    id: 'drew2013',
    authors: ['Trafton Drew', 'Melissa L.-H. Vo', 'Jeremy M. Wolfe'],
    year: 2013,
    title:
      'The Invisible Gorilla Strikes Again: Sustained Inattentional Blindness in Expert Observers',
    journal: 'Psychological Science',
    doi: '10.1177/0956797613479386',
    abstract:
      'Demonstrated that 83% of radiologists failed to notice a gorilla image embedded in a lung CT scan, illustrating inattentional blindness even among experts.',
    tags: ['workload', 'radiology-ai', 'cognitive-bias', 'inattentional-blindness'],
    evidifyRelevance:
      "Illustrates the attentional limitations Evidify's viewport tracking captures — even expert radiologists miss salient findings under task-focused attention.",
    domain: 'radiology-workload',
  },
  {
    id: 'elmore2015',
    authors: [
      'Joann G. Elmore',
      'Gary M. Longton',
      'Patricia A. Carney',
      'Berta M. Geller',
      'Tracy Onega',
      'Anna N. A. Tosteson',
      'Heidi D. Nelson',
      'Margaret S. Pepe',
      'Kimberly H. Allison',
      'Stuart J. Schnitt',
      "Frances P. O'Malley",
      'Donald L. Weaver',
    ],
    year: 2015,
    title:
      'Diagnostic Concordance Among Pathologists Interpreting Breast Biopsy Specimens',
    journal: 'JAMA',
    doi: '10.1001/jama.2015.1405',
    pmid: '25781441',
    abstract:
      'Found substantial inter-reader variability in breast biopsy interpretation, with overall concordance of only 75.3%, highlighting the challenge of defining a single correct diagnosis.',
    tags: ['workload', 'breast-screening', 'diagnostic-variability'],
    evidifyRelevance:
      "Quantifies baseline diagnostic disagreement rates that contextualize AI-assisted error rates in malpractice proceedings — Evidify documents this inherent uncertainty.",
    domain: 'radiology-workload',
  },

  // =========================================================================
  // CRYPTOGRAPHIC EVIDENCE / LEGAL
  // =========================================================================
  {
    id: 'daubert1993',
    authors: ['Supreme Court of the United States'],
    year: 1993,
    title: 'Daubert v. Merrell Dow Pharmaceuticals, Inc., 509 U.S. 579',
    journal: 'United States Reports',
    abstract:
      'Established the Daubert standard requiring trial judges to evaluate scientific evidence for reliability, testability, peer review, error rates, and general acceptance.',
    tags: ['daubert', 'cryptographic-evidence', 'expert-testimony', 'legal-framework'],
    evidifyRelevance:
      "Defines the admissibility standard Evidify's forensic evidence must satisfy — all cryptographic proofs are designed to meet Daubert reliability criteria.",
    domain: 'cryptographic-evidence',
  },
  {
    id: 'frye1923',
    authors: ['Court of Appeals of the District of Columbia'],
    year: 1923,
    title: 'Frye v. United States, 293 F. 1013 (D.C. Cir.)',
    journal: 'Federal Reporter',
    abstract:
      'Established the general acceptance test for admissibility of scientific evidence, requiring novel scientific methods to be generally accepted in the relevant scientific community.',
    tags: ['daubert', 'cryptographic-evidence', 'expert-testimony', 'legal-framework'],
    evidifyRelevance:
      "Predecessor standard to Daubert still used in some state courts — Evidify's evidence architecture satisfies both Frye general acceptance and Daubert reliability standards.",
    domain: 'cryptographic-evidence',
  },
  {
    id: 'vermont2016',
    authors: ['Vermont General Assembly'],
    year: 2016,
    title: '12 V.S.A. § 1913 — Blockchain Enabling',
    journal: 'Vermont Statutes Annotated, Title 12, Chapter 81',
    abstract:
      'First U.S. statute establishing self-authentication for blockchain-registered digital records, creating a rebuttable presumption of authenticity.',
    tags: [
      'cryptographic-evidence',
      'blockchain',
      'legal-framework',
      'self-authentication',
    ],
    evidifyRelevance:
      "Direct legal authority for Evidify's blockchain-anchored evidence model — Vermont's statute provides the self-authentication pathway for cryptographic audit trails.",
    domain: 'cryptographic-evidence',
  },
  {
    id: 'fre902_2017',
    authors: ['Advisory Committee on Federal Rules of Evidence'],
    year: 2017,
    title:
      'Federal Rules of Evidence 902(13) and 902(14) — Self-Authenticating Certified Records',
    journal: 'Federal Rules of Evidence, 28 U.S.C. Appendix',
    abstract:
      'Added self-authentication provisions for electronically generated records (902(13)) and data copied from electronic devices (902(14)), allowing certification without live testimony.',
    tags: [
      'cryptographic-evidence',
      'legal-framework',
      'self-authentication',
      'daubert',
    ],
    evidifyRelevance:
      "Provides the federal evidentiary basis for Evidify's self-authenticating hash chains — FRE 902(14) enables admission of cryptographic evidence without expert testimony at trial.",
    domain: 'cryptographic-evidence',
  },

  // =========================================================================
  // DISCLOSURE & TRUST CALIBRATION
  // =========================================================================
  {
    id: 'lee2004',
    authors: ['John D. Lee', 'Katrina A. See'],
    year: 2004,
    title: 'Trust in Automation: Designing for Appropriate Reliance',
    journal: 'Human Factors',
    doi: '10.1518/hfes.46.1.50_30392',
    abstract:
      'Comprehensive framework for trust in automation covering trust formation, calibration, and factors leading to appropriate reliance versus misuse and disuse.',
    tags: ['trust-calibration', 'automation-bias', 'human-factors', 'disclosure'],
    evidifyRelevance:
      "Provides the trust calibration theory underlying Evidify's disclosure design — appropriate reliance on AI requires calibrated trust through transparent performance information.",
    domain: 'disclosure-trust',
  },
  {
    id: 'dietvorst2015',
    authors: ['Berkeley J. Dietvorst', 'Joseph P. Simmons', 'Cade Massey'],
    year: 2015,
    title:
      'Algorithm Aversion: People Erroneously Avoid Algorithms After Seeing Them Err',
    journal: 'Journal of Experimental Psychology: General',
    doi: '10.1037/xge0000033',
    abstract:
      'Demonstrated that people lose confidence in algorithms more rapidly than in humans after observing equivalent errors, leading to suboptimal avoidance of algorithmic advice.',
    tags: [
      'trust-calibration',
      'automation-bias',
      'disclosure',
      'algorithm-aversion',
    ],
    evidifyRelevance:
      "Explains the algorithm aversion dynamic that Evidify's disclosure protocols must navigate — transparent AI error reporting requires careful framing to maintain appropriate adoption.",
    domain: 'disclosure-trust',
  },
  {
    id: 'logg2019',
    authors: ['Jason M. Logg', 'Julia A. Minson', 'Don A. Moore'],
    year: 2019,
    title:
      'Algorithm Appreciation: People Prefer Algorithmic to Human Judgment',
    journal: 'Organizational Behavior and Human Decision Processes',
    doi: '10.1016/j.obhdp.2018.12.005',
    abstract:
      'Found that laypeople often exhibit algorithm appreciation rather than aversion, preferring algorithmic over human judgment — contrasting with the algorithm aversion literature.',
    tags: ['trust-calibration', 'disclosure', 'juror-cognition'],
    evidifyRelevance:
      "Reveals that jurors may favor AI-assisted diagnoses, making documented AI use potentially protective — supporting Evidify's transparency-as-defense approach.",
    domain: 'disclosure-trust',
  },
  {
    id: 'yin2019',
    authors: ['Ming Yin', 'Jennifer Wortman Vaughan', 'Hanna Wallach'],
    year: 2019,
    title:
      'Understanding the Effect of Accuracy on Trust in Machine Learning Models',
    journal:
      'Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems',
    doi: '10.1145/3290605.3300509',
    abstract:
      'Showed that stated AI accuracy levels affect user trust and reliance, but users do not update trust appropriately when observing actual performance differing from stated accuracy.',
    tags: ['trust-calibration', 'disclosure', 'automation-bias'],
    evidifyRelevance:
      "Informs how Evidify communicates AI performance metrics — accuracy disclosure affects radiologist trust calibration and must promote appropriate reliance.",
    domain: 'disclosure-trust',
  },
  {
    id: 'zhang2020',
    authors: ['Yunfeng Zhang', 'Q. Vera Liao', 'Rachel K. E. Bellamy'],
    year: 2020,
    title:
      'Effect of Confidence and Explanation on Accuracy and Trust Calibration in AI-Assisted Decision Making',
    journal:
      'Proceedings of the 2020 Conference on Fairness, Accountability, and Transparency',
    doi: '10.1145/3351095.3372852',
    abstract:
      'Found that AI confidence scores improved human decision accuracy but explanations alone did not, with trust calibration depending on how AI uncertainty is communicated.',
    tags: ['trust-calibration', 'disclosure', 'clinical-decision-making'],
    evidifyRelevance:
      "Demonstrates that confidence calibration — not just explanation — drives appropriate AI reliance, informing Evidify's approach to presenting AI certainty in workflows.",
    domain: 'disclosure-trust',
  },
  {
    id: 'cabitza2017',
    authors: ['Federico Cabitza', 'Raffaele Rasoini', 'Gian Franco Gensini'],
    year: 2017,
    title: 'Unintended Consequences of Machine Learning in Medicine',
    journal: 'JAMA',
    doi: '10.1001/jama.2017.7797',
    abstract:
      'Warned of unintended consequences from clinical ML deployment including automation bias, deskilling, and overreliance, calling for systematic monitoring of AI-clinician interaction.',
    tags: [
      'automation-bias',
      'disclosure',
      'radiology-ai',
      'clinical-decision-making',
    ],
    evidifyRelevance:
      "Identifies the unintended consequence risks that Evidify's monitoring and documentation system is specifically designed to detect and record.",
    domain: 'disclosure-trust',
  },
  {
    id: 'grote2020',
    authors: ['Thomas Grote', 'Philipp Berens'],
    year: 2020,
    title: 'On the Ethics of Algorithmic Decision-Making in Healthcare',
    journal: 'Journal of Medical Ethics',
    doi: '10.1136/medethics-2019-105586',
    abstract:
      'Analyzed the ethical implications of opaque AI decision-making in healthcare, arguing for transparency obligations and meaningful human oversight.',
    tags: [
      'disclosure',
      'radiology-ai',
      'clinical-decision-making',
      'trust-calibration',
    ],
    evidifyRelevance:
      "Provides the ethical framework for Evidify's transparency requirements — meaningful oversight requires documented, auditable human-AI interaction.",
    domain: 'disclosure-trust',
  },
  {
    id: 'kompa2021',
    authors: ['Benjamin Kompa', 'Jasper Snoek', 'Andrew L. Beam'],
    year: 2021,
    title:
      'Second opinion needed: communicating uncertainty in medical machine learning',
    journal: 'npj Digital Medicine',
    doi: '10.1038/s41746-020-00367-3',
    abstract:
      'Argued that medical ML systems must communicate uncertainty to clinicians, and that failure to convey model confidence undermines clinical decision-making quality.',
    tags: [
      'disclosure',
      'trust-calibration',
      'radiology-ai',
      'clinical-decision-making',
    ],
    evidifyRelevance:
      "Supports Evidify's design principle that AI uncertainty must be documented alongside AI recommendations to enable legally defensible clinical judgment.",
    domain: 'disclosure-trust',
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Case-insensitive search across title, authors, tags, and evidifyRelevance.
 */
export function searchLiterature(query: string): LiteratureCitation[] {
  const q = query.toLowerCase();
  return LITERATURE_CORPUS.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true;
    if (c.authors.some((a) => a.toLowerCase().includes(q))) return true;
    if (c.tags.some((t) => t.toLowerCase().includes(q))) return true;
    if (c.evidifyRelevance.toLowerCase().includes(q)) return true;
    return false;
  });
}

/** Filter citations by tag (case-insensitive). */
export function getLiteratureByTag(tag: string): LiteratureCitation[] {
  const t = tag.toLowerCase();
  return LITERATURE_CORPUS.filter((c) =>
    c.tags.some((ct) => ct.toLowerCase() === t),
  );
}

/** Lookup a single citation by ID. */
export function getLiteratureById(
  id: string,
): LiteratureCitation | undefined {
  return LITERATURE_CORPUS.find((c) => c.id === id);
}

/** Filter citations by domain grouping (case-insensitive). */
export function getCorpusByDomain(domain: string): LiteratureCitation[] {
  const d = domain.toLowerCase();
  return LITERATURE_CORPUS.filter((c) => c.domain.toLowerCase() === d);
}

// ---------------------------------------------------------------------------
// Corpus Metadata
// ---------------------------------------------------------------------------

const uniqueDomains = [...new Set(LITERATURE_CORPUS.map((c) => c.domain))];

export const CORPUS_METADATA = {
  version: '1.0.0' as const,
  lastUpdated: '2026-02-04' as const,
  totalPapers: LITERATURE_CORPUS.length,
  domains: uniqueDomains,
};
