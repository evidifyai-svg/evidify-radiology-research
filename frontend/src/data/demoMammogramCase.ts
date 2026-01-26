import type { MammogramCase, AIPresentation } from '../types/imaging';

// Demo mammogram case for BRPLL presentation
// Uses placeholder images - real INbreast integration would load actual PNGs
export const DEMO_MAMMOGRAM_CASE: MammogramCase = {
  caseId: 'BRPLL-DEMO-001',
  inbreastCaseId: '20586908',
  patientAge: 52,
  breastDensity: 'B',
  views: {
    LCC: {
      viewType: 'CC',
      laterality: 'L',
      // Placeholder - would be /images/inbreast/20586908_LCC.png in production
      webImagePath: undefined,
      width: 3328,
      height: 4096,
      windowCenter: 2000,
      windowWidth: 4000,
    },
    LMLO: {
      viewType: 'MLO',
      laterality: 'L',
      webImagePath: undefined,
      width: 3328,
      height: 4096,
      windowCenter: 2000,
      windowWidth: 4000,
    },
    RCC: {
      viewType: 'CC',
      laterality: 'R',
      webImagePath: undefined,
      width: 3328,
      height: 4096,
      windowCenter: 2000,
      windowWidth: 4000,
    },
    RMLO: {
      viewType: 'MLO',
      laterality: 'R',
      webImagePath: undefined,
      width: 3328,
      height: 4096,
      windowCenter: 2000,
      windowWidth: 4000,
    },
  },
};

// AI presentation that will be revealed after lock
export const DEMO_AI_PRESENTATION: AIPresentation = {
  displayMode: 'BOX',
  suspicionScore: 7,
  suggestedBirads: '4',
  viewFindings: {
    RCC: {
      hasFinding: true,
      confidence: 87,
      annotation: {
        annotationId: 'ai-finding-001',
        viewKey: 'RCC',
        lesionType: 'mass',
        boundingBox: {
          x: 0.45,
          y: 0.35,
          width: 0.12,
          height: 0.15,
        },
        biradsCategory: '4',
      },
    },
    RMLO: {
      hasFinding: true,
      confidence: 82,
      annotation: {
        annotationId: 'ai-finding-002',
        viewKey: 'RMLO',
        lesionType: 'mass',
        boundingBox: {
          x: 0.48,
          y: 0.40,
          width: 0.10,
          height: 0.12,
        },
        biradsCategory: '4',
      },
    },
    LCC: { hasFinding: false, confidence: 12 },
    LMLO: { hasFinding: false, confidence: 15 },
  },
  errorRates: {
    falseDiscoveryRate: 4,
    falseOmissionRate: 12,
    threshold: 7,
    sampleSize: 2500,
    prevalence: 0.05,
  },
};
