import type { DerivedMetrics, TrialEvent } from './ExportPack';

const DEFAULT_PRE_AI_TOO_FAST_MS = 5000;
const DEFAULT_AI_EXPOSURE_TOO_FAST_MS = 3000;

type DerivedMetricsContext = {
  sessionId?: string;
  condition?: string;
  revealTiming?: string;
  disclosureFormat?: string;
  preAiTooFastMs?: number;
  aiExposureTooFastMs?: number;
};

const groupEventsByCase = (events: TrialEvent[]): Map<string, TrialEvent[]> => {
  const grouped = new Map<string, TrialEvent[]>();
  let activeCaseId: string | null = null;

  events.forEach(event => {
    if (event.type === 'CASE_LOADED' && (event.payload as any)?.caseId) {
      activeCaseId = (event.payload as any).caseId as string;
      if (!grouped.has(activeCaseId)) {
        grouped.set(activeCaseId, []);
      }
    }

    if (activeCaseId) {
      grouped.get(activeCaseId)?.push(event);
    }

    if (event.type === 'CASE_COMPLETED' && (event.payload as any)?.caseId === activeCaseId) {
      activeCaseId = null;
    }
  });

  return grouped;
};

const getTimestampMs = (event?: TrialEvent): number | null => {
  if (!event) return null;
  const ms = new Date(event.timestamp).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const computeDurationMs = (startMs: number | null, endMs: number | null): number | null => {
  if (startMs == null || endMs == null) return null;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs < startMs) return null;
  return endMs - startMs;
};

const resolveCaseEvents = (events: TrialEvent[], caseId: string): TrialEvent[] => {
  const grouped = groupEventsByCase(events);
  const groupedCase = grouped.get(caseId);
  if (groupedCase && groupedCase.length > 0) {
    return groupedCase;
  }

  const payloadFiltered = events.filter(event => (event.payload as any)?.caseId === caseId);
  if (payloadFiltered.length > 0) {
    return payloadFiltered;
  }

  return events;
};

export const DEFAULT_TIMING_THRESHOLDS = {
  preAiTooFastMs: DEFAULT_PRE_AI_TOO_FAST_MS,
  aiExposureTooFastMs: DEFAULT_AI_EXPOSURE_TOO_FAST_MS,
} as const;

export const computeDerivedMetrics = (
  events: TrialEvent[],
  caseId: string,
  context: DerivedMetricsContext = {}
): DerivedMetrics => {
  const caseEvents = resolveCaseEvents(events, caseId);
  const firstImpression = caseEvents.find(event => event.type === 'FIRST_IMPRESSION_LOCKED');
  const aiRevealed = caseEvents.find(event => event.type === 'AI_REVEALED');
  const finalAssessment = caseEvents.find(event => event.type === 'FINAL_ASSESSMENT');
  const deviationSubmitted = caseEvents.filter(event => event.type === 'DEVIATION_SUBMITTED');
  const deviationStarted = caseEvents.filter(event => event.type === 'DEVIATION_STARTED');
  const deviationSkipped = caseEvents.filter(event => event.type === 'DEVIATION_SKIPPED');
  const caseCompleted = caseEvents.find(event => event.type === 'CASE_COMPLETED');
  const comprehensionEvent = caseEvents.find(event => event.type === 'DISCLOSURE_COMPREHENSION_RESPONSE');
  const disclosurePresented = caseEvents.find(event => event.type === 'DISCLOSURE_PRESENTED');
  const caseLoaded = caseEvents.find(event => event.type === 'CASE_LOADED');

  const initialBirads = (firstImpression?.payload as any)?.birads ?? 0;
  const finalBirads = (finalAssessment?.payload as any)?.birads ?? initialBirads;
  const aiBirads =
    (aiRevealed?.payload as any)?.aiBirads ??
    (aiRevealed?.payload as any)?.suggestedBirads ??
    null;
  const aiConfidence = (aiRevealed?.payload as any)?.aiConfidence ?? null;

  const changeOccurred = finalBirads !== initialBirads;
  const aiConsistentChange = changeOccurred && aiBirads != null && finalBirads === aiBirads;
  const aiInconsistentChange = changeOccurred && aiBirads != null && finalBirads !== aiBirads;
  const addaDenominator = aiBirads != null && initialBirads !== aiBirads;
  const adda = addaDenominator ? finalBirads === aiBirads : null;

  const decisionChangeCount = deviationStarted.length > 0 ? deviationStarted.length : changeOccurred ? 1 : 0;
  const overrideCount = aiBirads != null && finalBirads !== aiBirads ? 1 : 0;
  const rationaleProvided = deviationSubmitted.some(event => {
    const payload = (event.payload as any) ?? {};
    const text = (payload.rationale ?? payload.rationaleText ?? payload.deviationText ?? '').toString();
    return text.trim().length > 0;
  });

  const deviationText = deviationSubmitted[0]
    ? ((deviationSubmitted[0].payload as any)?.rationale ??
        (deviationSubmitted[0].payload as any)?.rationaleText ??
        (deviationSubmitted[0].payload as any)?.deviationText ??
        undefined)
    : undefined;

  const caseStartMs = getTimestampMs(caseLoaded ?? caseEvents[0]);
  const lockMs = getTimestampMs(firstImpression);
  const aiRevealMs = getTimestampMs(aiRevealed);
  const finalDecisionMs = getTimestampMs(finalAssessment ?? caseCompleted ?? caseEvents[caseEvents.length - 1]);
  const caseEndMs = getTimestampMs(caseCompleted ?? finalAssessment ?? caseEvents[caseEvents.length - 1]);

  const totalTimeMs = computeDurationMs(caseStartMs, caseEndMs) ?? 0;
  const timeToLockMs = computeDurationMs(caseStartMs, lockMs);
  const preAiReadMs = computeDurationMs(caseStartMs, aiRevealMs);
  const postAiReadMs = computeDurationMs(aiRevealMs, finalDecisionMs);
  const totalReadMs =
    typeof preAiReadMs === 'number' && typeof postAiReadMs === 'number'
      ? preAiReadMs + postAiReadMs
      : undefined;
  const aiExposureMs = postAiReadMs ?? undefined;
  const lockToRevealMs = computeDurationMs(lockMs, aiRevealMs) ?? 0;
  const revealToFinalMs = computeDurationMs(aiRevealMs, finalDecisionMs) ?? 0;

  const comprehensionPayload = (comprehensionEvent?.payload as any) ?? {};
  const comprehensionAnswer =
    comprehensionPayload.selectedAnswer ?? comprehensionPayload.response ?? null;
  const comprehensionCorrect =
    comprehensionPayload.isCorrect ?? comprehensionPayload.correct ?? null;
  const comprehensionItemId = comprehensionPayload.itemId ?? comprehensionPayload.questionId ?? null;
  const comprehensionResponseMs = comprehensionEvent && disclosurePresented
    ? computeDurationMs(getTimestampMs(disclosurePresented), getTimestampMs(comprehensionEvent))
    : null;

  const timingThresholds = {
    preAiTooFastMs: context.preAiTooFastMs ?? DEFAULT_PRE_AI_TOO_FAST_MS,
    aiExposureTooFastMs: context.aiExposureTooFastMs ?? DEFAULT_AI_EXPOSURE_TOO_FAST_MS,
  };

  const revealTiming = context.revealTiming ?? context.condition ?? 'UNKNOWN';
  const disclosureFormat = context.disclosureFormat ?? 'UNKNOWN';

  return {
    sessionId: context.sessionId ?? 'UNKNOWN',
    timestamp: new Date().toISOString(),
    condition: context.condition ?? revealTiming,
    caseId,
    initialBirads,
    finalBirads,
    aiBirads,
    aiConfidence,
    changeOccurred,
    aiConsistentChange,
    aiInconsistentChange,
    addaDenominator,
    adda,
    deviationRequired: changeOccurred,
    deviationDocumented: rationaleProvided,
    deviationSkipped: changeOccurred && !rationaleProvided && deviationSkipped.length > 0,
    deviationText,
    deviationRationale: deviationText,
    comprehensionCorrect,
    comprehensionAnswer,
    comprehensionItemId,
    comprehensionQuestionId: comprehensionPayload.questionId ?? null,
    comprehensionResponseMs,
    comprehension_answer: comprehensionAnswer,
    comprehension_correct: comprehensionCorrect,
    comprehension_question_id: comprehensionPayload.questionId ?? null,
    comprehension_response_ms: comprehensionResponseMs,
    preAiReadMs: preAiReadMs ?? undefined,
    postAiReadMs: postAiReadMs ?? undefined,
    totalReadMs,
    aiExposureMs,
    decisionChangeCount,
    overrideCount,
    rationaleProvided,
    timingFlagPreAiTooFast:
      typeof preAiReadMs === 'number' && preAiReadMs < timingThresholds.preAiTooFastMs,
    timingFlagAiExposureTooFast:
      typeof aiExposureMs === 'number' && aiExposureMs > 0 && aiExposureMs < timingThresholds.aiExposureTooFastMs,
    totalTimeMs,
    timeToLockMs,
    lockToRevealMs,
    revealToFinalMs,
    revealTiming,
    disclosureFormat,
  };
};
