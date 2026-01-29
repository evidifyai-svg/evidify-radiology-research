export type AIModelOutputType = 'class' | 'score' | 'both';

export interface AIModelMetadata {
  modelName: string;
  modelVersion: string;
  provider: string;
  buildId: string;
  outputType: AIModelOutputType;
  calibrationSet: string;
  promptVersion: string;
  notes: string;
}

export const AI_MODEL_NA = 'NA';

const isValidOutputType = (value: unknown): value is AIModelOutputType =>
  value === 'class' || value === 'score' || value === 'both';

const normalizeString = (value: string | null | undefined): string => {
  if (!value) return AI_MODEL_NA;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : AI_MODEL_NA;
};

export const DEFAULT_AI_MODEL_METADATA: AIModelMetadata = {
  modelName: AI_MODEL_NA,
  modelVersion: AI_MODEL_NA,
  provider: AI_MODEL_NA,
  buildId: AI_MODEL_NA,
  outputType: 'class',
  calibrationSet: AI_MODEL_NA,
  promptVersion: AI_MODEL_NA,
  notes: AI_MODEL_NA,
};

export const normalizeAiModelMetadata = (
  input?: Partial<AIModelMetadata> | null
): AIModelMetadata => ({
  modelName: normalizeString(input?.modelName ?? DEFAULT_AI_MODEL_METADATA.modelName),
  modelVersion: normalizeString(input?.modelVersion ?? DEFAULT_AI_MODEL_METADATA.modelVersion),
  provider: normalizeString(input?.provider ?? DEFAULT_AI_MODEL_METADATA.provider),
  buildId: normalizeString(input?.buildId ?? DEFAULT_AI_MODEL_METADATA.buildId),
  outputType: isValidOutputType(input?.outputType) ? input!.outputType : DEFAULT_AI_MODEL_METADATA.outputType,
  calibrationSet: normalizeString(input?.calibrationSet ?? DEFAULT_AI_MODEL_METADATA.calibrationSet),
  promptVersion: normalizeString(input?.promptVersion ?? DEFAULT_AI_MODEL_METADATA.promptVersion),
  notes: normalizeString(input?.notes ?? DEFAULT_AI_MODEL_METADATA.notes),
});
