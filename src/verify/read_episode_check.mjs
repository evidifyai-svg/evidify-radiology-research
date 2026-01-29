const assert = (condition, message) => {
  if (!condition) {
    console.error(`read-episode check failed: ${message}`);
    process.exit(1);
  }
};

const buildEvent = (type, payload, timestamp) => ({
  type,
  payload,
  timestamp: new Date(timestamp).toISOString(),
});

const computeReadEpisodeMetrics = (events, caseId) => {
  const caseEvents = events.filter(event => event.payload?.caseId === caseId);
  const getEpisodeType = event => event.payload?.episode ?? event.payload?.episodeType;
  const getWallTimeMs = event => new Date(event.payload?.t_wall ?? event.timestamp).getTime();

  const computeEpisodeMs = episodeType => {
    const start = caseEvents.find(
      event => event.type === 'READ_EPISODE_STARTED' && getEpisodeType(event) === episodeType
    );
    const end = caseEvents.find(
      event => event.type === 'READ_EPISODE_ENDED' && getEpisodeType(event) === episodeType
    );
    if (!start || !end) return null;
    const startMono = start.payload?.t_mono;
    const endMono = end.payload?.t_mono;
    const duration =
      typeof startMono === 'number' && typeof endMono === 'number'
        ? endMono - startMono
        : getWallTimeMs(end) - getWallTimeMs(start);
    return Number.isFinite(duration) && duration >= 0 ? duration : null;
  };

  const preAiReadMs = computeEpisodeMs('PRE_AI');
  const postAiReadMs = computeEpisodeMs('POST_AI');
  const totalReadMs =
    typeof preAiReadMs === 'number' && typeof postAiReadMs === 'number'
      ? preAiReadMs + postAiReadMs
      : null;

  return { preAiReadMs, postAiReadMs, totalReadMs };
};

const baseTime = Date.now();

const calibrationCaseId = 'CAL-1';
const realCaseId = 'CASE-1';

const events = [
  buildEvent('CASE_LOADED', { caseId: calibrationCaseId, isCalibration: true }, baseTime),
  buildEvent('AI_REVEALED', { caseId: calibrationCaseId }, baseTime + 1000),
  buildEvent('FINAL_ASSESSMENT', { caseId: calibrationCaseId }, baseTime + 2000),
  buildEvent('CASE_LOADED', { caseId: realCaseId, isCalibration: false }, baseTime + 3000),
  buildEvent(
    'READ_EPISODE_STARTED',
    { caseId: realCaseId, episode: 'PRE_AI', t_wall: new Date(baseTime + 3000).toISOString(), t_mono: 3000 },
    baseTime + 3000
  ),
  buildEvent('AI_REVEALED', { caseId: realCaseId }, baseTime + 4000),
  buildEvent(
    'READ_EPISODE_ENDED',
    { caseId: realCaseId, episode: 'PRE_AI', t_wall: new Date(baseTime + 4000).toISOString(), t_mono: 4000 },
    baseTime + 4000
  ),
  buildEvent(
    'READ_EPISODE_STARTED',
    { caseId: realCaseId, episode: 'POST_AI', t_wall: new Date(baseTime + 4000).toISOString(), t_mono: 4000 },
    baseTime + 4000
  ),
  buildEvent('FINAL_ASSESSMENT', { caseId: realCaseId }, baseTime + 6000),
  buildEvent(
    'READ_EPISODE_ENDED',
    { caseId: realCaseId, episode: 'POST_AI', t_wall: new Date(baseTime + 6000).toISOString(), t_mono: 6000 },
    baseTime + 6000
  ),
];

const calibrationReadEvents = events.filter(
  event => event.payload?.caseId === calibrationCaseId && event.type.startsWith('READ_EPISODE_')
);
assert(calibrationReadEvents.length === 0, 'calibration case should not emit read episode events');

const realMetrics = computeReadEpisodeMetrics(events, realCaseId);
assert(typeof realMetrics.preAiReadMs === 'number', 'real case should have preAiReadMs');
assert(typeof realMetrics.postAiReadMs === 'number', 'real case should have postAiReadMs');
assert(typeof realMetrics.totalReadMs === 'number', 'real case should have totalReadMs');

const calibrationMetrics = computeReadEpisodeMetrics(events, calibrationCaseId);
assert(calibrationMetrics.preAiReadMs === null, 'calibration preAiReadMs should be NA');
assert(calibrationMetrics.postAiReadMs === null, 'calibration postAiReadMs should be NA');
assert(calibrationMetrics.totalReadMs === null, 'calibration totalReadMs should be NA');

console.log('read-episode check passed');
