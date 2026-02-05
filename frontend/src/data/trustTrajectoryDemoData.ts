// ---------------------------------------------------------------------------
// Trust Trajectory Dashboard — Demo Data
// ---------------------------------------------------------------------------
// Simulated 90-day longitudinal data for 3 radiologists with distinct
// trust calibration profiles. Based on Jian et al. (2000) trust measurement
// framework and automation bias literature.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Radiologist {
  id: string;
  name: string;
  specialty: string;
  yearsExperience: number;
  profile: 'healthy' | 'automation-bias' | 'under-utilization';
}

export interface DailyMetrics {
  date: string; // ISO date string (YYYY-MM-DD)
  agreementRate: number; // 0-100
  overrideRate: number; // 0-100
  adoptionRate: number; // 0-100
  preAiAssessmentTimeSec: number; // seconds
  casesRead: number;
  aiConfidenceMean: number; // 0-100
  overrideCorrelation: number; // -1 to 1 (override rate vs AI uncertainty)
  adoptionCorrelation: number; // -1 to 1 (adoption rate vs AI confidence)
}

export interface CaseRecord {
  caseId: string;
  timestamp: string; // ISO datetime
  aiRecommendation: string;
  aiConfidence: number; // 0-100
  initialAssessment: string;
  finalAssessment: string;
  agreed: boolean;
  action: 'override' | 'adopt' | 'confirm';
  rationaleDocumented: boolean;
  preAiTimeSec: number;
}

export interface TrustEvent {
  date: string;
  label: string;
  type: 'software-update' | 'training' | 'missed-case' | 'calibration-test';
}

export interface JianTrustScore {
  date: string;
  trustScore: number; // 1-7 Likert scale
  reliabilitySubscale: number;
  competenceSubscale: number;
  predictabilitySubscale: number;
}

export interface AutomationBiasIndicator {
  id: string;
  label: string;
  description: string;
  met: boolean;
  severity: 'info' | 'warning' | 'critical';
}

export interface RadiologistData {
  radiologist: Radiologist;
  dailyMetrics: DailyMetrics[];
  cases: CaseRecord[];
  events: TrustEvent[];
  jianScores: JianTrustScore[];
  automationBiasIndicators: AutomationBiasIndicator[];
  underUtilizationIndicators: AutomationBiasIndicator[];
  healthyCalibrationIndicators: AutomationBiasIndicator[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoTimestamp(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Seeded pseudo-random for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const BIRADS = ['BI-RADS 1', 'BI-RADS 2', 'BI-RADS 3', 'BI-RADS 4A', 'BI-RADS 4B', 'BI-RADS 4C', 'BI-RADS 5'];

function pickBirads(rand: () => number): string {
  const weights = [0.15, 0.35, 0.2, 0.12, 0.08, 0.06, 0.04];
  let r = rand();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return BIRADS[i];
  }
  return BIRADS[0];
}

// ---------------------------------------------------------------------------
// Radiologist Definitions
// ---------------------------------------------------------------------------

const RADIOLOGISTS: Radiologist[] = [
  {
    id: 'dr-chen',
    name: 'Dr. Sarah Chen',
    specialty: 'Breast Imaging',
    yearsExperience: 12,
    profile: 'healthy',
  },
  {
    id: 'dr-torres',
    name: 'Dr. Michael Torres',
    specialty: 'Breast Imaging',
    yearsExperience: 5,
    profile: 'automation-bias',
  },
  {
    id: 'dr-park',
    name: 'Dr. Emily Park',
    specialty: 'Breast Imaging',
    yearsExperience: 18,
    profile: 'under-utilization',
  },
];

// ---------------------------------------------------------------------------
// Events (shared timeline annotations)
// ---------------------------------------------------------------------------

const SHARED_EVENTS: TrustEvent[] = [
  { date: dateStr(75), label: 'AI model v2.3 deployed', type: 'software-update' },
  { date: dateStr(60), label: 'Trust calibration workshop', type: 'training' },
  { date: dateStr(42), label: 'AI model v2.4 hotfix', type: 'software-update' },
  { date: dateStr(28), label: 'Missed cancer review session', type: 'missed-case' },
  { date: dateStr(14), label: 'Quarterly calibration test', type: 'calibration-test' },
];

// ---------------------------------------------------------------------------
// Generate Daily Metrics
// ---------------------------------------------------------------------------

function generateDailyMetrics(
  profile: 'healthy' | 'automation-bias' | 'under-utilization',
  seed: number,
): DailyMetrics[] {
  const rand = seededRandom(seed);
  const metrics: DailyMetrics[] = [];

  for (let day = 89; day >= 0; day--) {
    const progress = (89 - day) / 89; // 0 to 1 over 90 days

    let agreementRate: number;
    let overrideRate: number;
    let adoptionRate: number;
    let preAiTime: number;
    let overrideCorr: number;
    let adoptionCorr: number;

    if (profile === 'healthy') {
      agreementRate = 68 + rand() * 7 + Math.sin(progress * 4) * 2;
      overrideRate = 12 + rand() * 3 + Math.sin(progress * 3) * 1.5;
      adoptionRate = 13 + rand() * 4;
      preAiTime = 85 + rand() * 20;
      overrideCorr = 0.6 + rand() * 0.2;
      adoptionCorr = 0.55 + rand() * 0.25;
    } else if (profile === 'automation-bias') {
      // Starts healthy, trends toward over-reliance
      agreementRate = 70 + progress * 18 + rand() * 4;
      overrideRate = 15 - progress * 11 + rand() * 2;
      adoptionRate = 14 + progress * 12 + rand() * 3;
      preAiTime = 90 - progress * 35 + rand() * 10;
      overrideCorr = 0.5 - progress * 0.4 + rand() * 0.15;
      adoptionCorr = 0.4 + progress * 0.1 + rand() * 0.1;
    } else {
      // Under-utilization — high overrides, low agreement
      agreementRate = 45 + rand() * 10 + Math.sin(progress * 5) * 3;
      overrideRate = 30 + rand() * 8;
      adoptionRate = 5 + rand() * 4;
      preAiTime = 60 + rand() * 15;
      overrideCorr = 0.1 + rand() * 0.15;
      adoptionCorr = 0.15 + rand() * 0.15;
    }

    metrics.push({
      date: dateStr(day),
      agreementRate: clamp(Math.round(agreementRate * 10) / 10, 0, 100),
      overrideRate: clamp(Math.round(overrideRate * 10) / 10, 0, 100),
      adoptionRate: clamp(Math.round(adoptionRate * 10) / 10, 0, 100),
      preAiAssessmentTimeSec: clamp(Math.round(preAiTime), 30, 180),
      casesRead: Math.floor(8 + rand() * 12),
      aiConfidenceMean: clamp(Math.round(65 + rand() * 25), 50, 98),
      overrideCorrelation: clamp(Math.round(overrideCorr * 100) / 100, -1, 1),
      adoptionCorrelation: clamp(Math.round(adoptionCorr * 100) / 100, -1, 1),
    });
  }

  return metrics;
}

// ---------------------------------------------------------------------------
// Generate Case Records
// ---------------------------------------------------------------------------

function generateCases(
  radiologistId: string,
  profile: 'healthy' | 'automation-bias' | 'under-utilization',
  seed: number,
): CaseRecord[] {
  const rand = seededRandom(seed);
  const cases: CaseRecord[] = [];
  const caseCount = 80 + Math.floor(rand() * 20);

  for (let i = 0; i < caseCount; i++) {
    const daysAgo = Math.floor(rand() * 90);
    const hour = 7 + Math.floor(rand() * 10);
    const minute = Math.floor(rand() * 60);
    const progress = (89 - daysAgo) / 89;
    const aiConfidence = clamp(Math.round(55 + rand() * 40), 50, 99);
    const aiRec = pickBirads(rand);
    const preAiTime = Math.round(40 + rand() * 80);

    let initialAssessment: string;
    let finalAssessment: string;
    let agreed: boolean;
    let action: 'override' | 'adopt' | 'confirm';
    let rationaleDocumented: boolean;

    if (profile === 'healthy') {
      const r = rand();
      if (r < 0.70) {
        // Confirm
        initialAssessment = aiRec;
        finalAssessment = aiRec;
        agreed = true;
        action = 'confirm';
        rationaleDocumented = rand() > 0.3;
      } else if (r < 0.83) {
        // Override
        initialAssessment = pickBirads(rand);
        finalAssessment = initialAssessment;
        agreed = false;
        action = 'override';
        rationaleDocumented = rand() > 0.15;
      } else {
        // Adopt
        initialAssessment = pickBirads(rand);
        finalAssessment = aiRec;
        agreed = true;
        action = 'adopt';
        rationaleDocumented = rand() > 0.4;
      }
    } else if (profile === 'automation-bias') {
      const adoptThreshold = 0.70 + progress * 0.18;
      const r = rand();
      if (r < adoptThreshold) {
        initialAssessment = rand() < 0.5 + progress * 0.3 ? aiRec : pickBirads(rand);
        finalAssessment = aiRec;
        agreed = true;
        action = initialAssessment === aiRec ? 'confirm' : 'adopt';
        rationaleDocumented = rand() > 0.5;
      } else if (r < adoptThreshold + (0.15 - progress * 0.11)) {
        initialAssessment = pickBirads(rand);
        finalAssessment = initialAssessment;
        agreed = false;
        action = 'override';
        rationaleDocumented = rand() > 0.3;
      } else {
        initialAssessment = pickBirads(rand);
        finalAssessment = aiRec;
        agreed = true;
        action = 'adopt';
        rationaleDocumented = rand() > 0.6;
      }
    } else {
      // Under-utilization
      const r = rand();
      if (r < 0.48) {
        initialAssessment = pickBirads(rand);
        finalAssessment = initialAssessment;
        agreed = finalAssessment === aiRec;
        action = agreed ? 'confirm' : 'override';
        rationaleDocumented = rand() > 0.6; // Many overrides undocumented
      } else if (r < 0.83) {
        initialAssessment = pickBirads(rand);
        finalAssessment = initialAssessment;
        agreed = false;
        action = 'override';
        rationaleDocumented = rand() > 0.55;
      } else {
        initialAssessment = pickBirads(rand);
        finalAssessment = aiRec;
        agreed = true;
        action = 'adopt';
        rationaleDocumented = rand() > 0.3;
      }
    }

    cases.push({
      caseId: `${radiologistId.toUpperCase().replace('DR-', '')}-${String(i + 1).padStart(4, '0')}`,
      timestamp: isoTimestamp(daysAgo, hour, minute),
      aiRecommendation: aiRec,
      aiConfidence,
      initialAssessment,
      finalAssessment,
      agreed,
      action,
      rationaleDocumented,
      preAiTimeSec: preAiTime,
    });
  }

  return cases.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ---------------------------------------------------------------------------
// Generate Jian Trust Scale Scores
// ---------------------------------------------------------------------------

function generateJianScores(
  profile: 'healthy' | 'automation-bias' | 'under-utilization',
  seed: number,
): JianTrustScore[] {
  const rand = seededRandom(seed);
  const scores: JianTrustScore[] = [];
  // Survey administered every ~2 weeks
  const surveyDays = [84, 70, 56, 42, 28, 14, 0];

  for (const day of surveyDays) {
    const progress = (89 - day) / 89;
    let trust: number;
    let reliability: number;
    let competence: number;
    let predictability: number;

    if (profile === 'healthy') {
      trust = 4.5 + rand() * 0.6;
      reliability = 4.3 + rand() * 0.7;
      competence = 4.6 + rand() * 0.5;
      predictability = 4.2 + rand() * 0.6;
    } else if (profile === 'automation-bias') {
      // Trust increases over time, eventually high
      trust = 4.0 + progress * 2.0 + rand() * 0.3;
      reliability = 3.8 + progress * 2.2 + rand() * 0.3;
      competence = 4.2 + progress * 1.5 + rand() * 0.3;
      predictability = 3.5 + progress * 2.0 + rand() * 0.3;
    } else {
      // Low and relatively stable trust
      trust = 2.5 + rand() * 0.8;
      reliability = 2.0 + rand() * 0.7;
      competence = 3.0 + rand() * 0.6;
      predictability = 2.3 + rand() * 0.5;
    }

    scores.push({
      date: dateStr(day),
      trustScore: clamp(Math.round(trust * 10) / 10, 1, 7),
      reliabilitySubscale: clamp(Math.round(reliability * 10) / 10, 1, 7),
      competenceSubscale: clamp(Math.round(competence * 10) / 10, 1, 7),
      predictabilitySubscale: clamp(Math.round(predictability * 10) / 10, 1, 7),
    });
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Build Indicator Checklists
// ---------------------------------------------------------------------------

function buildIndicators(
  profile: 'healthy' | 'automation-bias' | 'under-utilization',
  dailyMetrics: DailyMetrics[],
): {
  automationBias: AutomationBiasIndicator[];
  underUtilization: AutomationBiasIndicator[];
  healthyCalibration: AutomationBiasIndicator[];
} {
  const recent14 = dailyMetrics.slice(-14);
  const avgAgreement = recent14.reduce((s, d) => s + d.agreementRate, 0) / recent14.length;
  const avgOverride = recent14.reduce((s, d) => s + d.overrideRate, 0) / recent14.length;
  const avgAdoption = recent14.reduce((s, d) => s + d.adoptionRate, 0) / recent14.length;
  const avgOverrideCorr = recent14.reduce((s, d) => s + d.overrideCorrelation, 0) / recent14.length;
  const avgAdoptionCorr = recent14.reduce((s, d) => s + d.adoptionCorrelation, 0) / recent14.length;

  // Check pre-AI time trend
  const firstHalf = dailyMetrics.slice(0, 45);
  const secondHalf = dailyMetrics.slice(45);
  const avgTimeFirst = firstHalf.reduce((s, d) => s + d.preAiAssessmentTimeSec, 0) / firstHalf.length;
  const avgTimeSecond = secondHalf.reduce((s, d) => s + d.preAiAssessmentTimeSec, 0) / secondHalf.length;
  const timeDecreasing = avgTimeSecond < avgTimeFirst * 0.85;

  const automationBias: AutomationBiasIndicator[] = [
    {
      id: 'ab-agreement-high',
      label: 'Agreement rate >85% for 14+ consecutive days',
      description: `Current 14-day average: ${avgAgreement.toFixed(1)}%. Sustained high agreement may indicate insufficient independent judgment.`,
      met: avgAgreement > 85,
      severity: avgAgreement > 90 ? 'critical' : 'warning',
    },
    {
      id: 'ab-time-decreasing',
      label: 'Pre-AI assessment time decreasing trend',
      description: `First 45-day avg: ${avgTimeFirst.toFixed(0)}s, Last 45-day avg: ${avgTimeSecond.toFixed(0)}s. Declining deliberation time suggests reduced independent analysis.`,
      met: timeDecreasing,
      severity: 'warning',
    },
    {
      id: 'ab-override-low',
      label: 'Low override rate (<5%) despite AI FDR >10%',
      description: `Current 14-day override rate: ${avgOverride.toFixed(1)}%. Very low override rates suggest radiologist may not be critically evaluating AI output.`,
      met: avgOverride < 5,
      severity: 'critical',
    },
    {
      id: 'ab-adoption-high',
      label: 'Adoption rate >30%',
      description: `Current 14-day adoption rate: ${avgAdoption.toFixed(1)}%. Frequent assessment changes toward AI suggest over-reliance.`,
      met: avgAdoption > 30,
      severity: 'warning',
    },
  ];

  const underUtilization: AutomationBiasIndicator[] = [
    {
      id: 'uu-agreement-low',
      label: 'Agreement rate <50% for 14+ consecutive days',
      description: `Current 14-day average: ${avgAgreement.toFixed(1)}%. Sustained low agreement may indicate distrust or systematic disagreement with AI.`,
      met: avgAgreement < 50,
      severity: avgAgreement < 40 ? 'critical' : 'warning',
    },
    {
      id: 'uu-override-high',
      label: 'High override rate (>30%) without documented rationale',
      description: `Current 14-day override rate: ${avgOverride.toFixed(1)}%. High overrides without rationale impede quality review.`,
      met: avgOverride > 30,
      severity: 'warning',
    },
    {
      id: 'uu-ignoring-high-conf',
      label: 'Ignoring high-confidence AI recommendations (>90%)',
      description: 'Override rate does not decrease when AI confidence is high, suggesting blanket dismissal rather than calibrated response.',
      met: avgOverrideCorr < 0.2,
      severity: 'warning',
    },
  ];

  const healthyCalibration: AutomationBiasIndicator[] = [
    {
      id: 'hc-override-corr',
      label: 'Override rate correlates with AI uncertainty',
      description: `Override-uncertainty correlation: ${avgOverrideCorr.toFixed(2)}. Overrides when AI confidence is low indicates appropriate skepticism.`,
      met: avgOverrideCorr > 0.4,
      severity: 'info',
    },
    {
      id: 'hc-adoption-corr',
      label: 'Adoption rate correlates with AI confidence',
      description: `Adoption-confidence correlation: ${avgAdoptionCorr.toFixed(2)}. Adopting when AI confidence is high indicates appropriate trust.`,
      met: avgAdoptionCorr > 0.4,
      severity: 'info',
    },
    {
      id: 'hc-rationale-documented',
      label: 'Documented rationale for >80% of overrides',
      description: 'Override documentation rate assessed from case records. Good documentation supports quality review and peer learning.',
      met: profile === 'healthy',
      severity: 'info',
    },
  ];

  return { automationBias, underUtilization, healthyCalibration };
}

// ---------------------------------------------------------------------------
// Assemble Full Dataset
// ---------------------------------------------------------------------------

function buildRadiologistData(radiologist: Radiologist, seed: number): RadiologistData {
  const dailyMetrics = generateDailyMetrics(radiologist.profile, seed);
  const cases = generateCases(radiologist.id, radiologist.profile, seed + 1000);
  const jianScores = generateJianScores(radiologist.profile, seed + 2000);
  const indicators = buildIndicators(radiologist.profile, dailyMetrics);

  return {
    radiologist,
    dailyMetrics,
    cases,
    events: SHARED_EVENTS,
    jianScores,
    automationBiasIndicators: indicators.automationBias,
    underUtilizationIndicators: indicators.underUtilization,
    healthyCalibrationIndicators: indicators.healthyCalibration,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const DEMO_RADIOLOGISTS = RADIOLOGISTS;

export const DEMO_TRUST_DATA: Record<string, RadiologistData> = {
  'dr-chen': buildRadiologistData(RADIOLOGISTS[0], 42),
  'dr-torres': buildRadiologistData(RADIOLOGISTS[1], 137),
  'dr-park': buildRadiologistData(RADIOLOGISTS[2], 256),
};
