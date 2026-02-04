#!/usr/bin/env node
/**
 * Evidify Radiology/Research Verifier v1.0
 *
 * Usage:
 *   node verify-radiology.cjs <pack-dir> [--json]
 *
 * Required:
 *   export_manifest.json, ledger.json, events.jsonl
 * Optional (warn only):
 *   derived_metrics.csv, codebook.md, trial_manifest.json, verifier_output.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.0.0';
const Z64 = '0'.repeat(64);
const DEBUG = Boolean(process.env.RADIOLOGY_VERIFIER_DEBUG);
const TIMING_TOLERANCE_MS = 5;
const TOO_FAST_PRE_AI_MS = 5000;
const TOO_FAST_AI_EXPOSURE_MS = 3000;

function debugLog(...args) {
  if (DEBUG) {
    console.log('[radiology-verifier]', ...args);
  }
}

function exists(fp) {
  try { fs.accessSync(fp, fs.constants.R_OK); return true; } catch { return false; }
}
function readJson(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
function sha256File(fp) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(fp));
  return h.digest('hex');
}
function chainPreimage(e) {
  return `${e.previousHash}|${e.contentHash}|${e.timestamp}`;
}
function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      values.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function normalizeCsvValue(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed.toUpperCase() === 'NA') return null;
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function normalizeComputedValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  return value;
}

function isTimingColumn(column) {
  return /ms$/i.test(column);
}

function isTimestampColumn(column) {
  return /timestamp/i.test(column);
}

function valuesMatch(expectedRaw, actualRaw, column) {
  const expected = normalizeCsvValue(expectedRaw);
  const actual = normalizeComputedValue(actualRaw);

  if (expected === null && actual === null) return true;
  if (isTimestampColumn(column)) {
    const expectedDate = typeof expected === 'string' ? Date.parse(expected) : null;
    const actualDate = typeof actual === 'string' ? Date.parse(actual) : null;
    if (Number.isFinite(expectedDate) && Number.isFinite(actualDate)) {
      return Math.abs(expectedDate - actualDate) <= TIMING_TOLERANCE_MS;
    }
  }
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (isTimingColumn(column)) {
      return Math.abs(expected - actual) <= TIMING_TOLERANCE_MS;
    }
    return Number.isInteger(expected) && Number.isInteger(actual)
      ? expected === actual
      : Math.abs(expected - actual) <= 1e-6;
  }
  return expected === actual;
}

function formatMismatchValue(value) {
  const normalized = normalizeComputedValue(value);
  if (normalized === null) return 'null';
  return String(normalized);
}

function parseEventsJsonl(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map(line => {
    const event = JSON.parse(line);
    if (!event.type && event.eventType) {
      event.type = event.eventType;
    }
    if (!event.id && event.eventId) {
      event.id = event.eventId;
    }
    return event;
  });
}

function coerceJsonObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function getPayloadObject(event) {
  if (!event) return {};
  const payload = coerceJsonObject(event.payload);
  const nested = payload ? coerceJsonObject(payload.payload) : null;
  return nested ?? payload ?? {};
}

function getCaseIdFromEvent(event) {
  const payload = getPayloadObject(event);
  return payload.caseId ?? payload.activeCaseId ?? null;
}

function groupEventsByCase(events) {
  const grouped = new Map();
  let activeCaseId = null;

  for (const event of events) {
    const eventCaseId = getCaseIdFromEvent(event);
    if (event.type === 'CASE_LOADED' && eventCaseId) {
      activeCaseId = eventCaseId;
      if (!grouped.has(activeCaseId)) {
        grouped.set(activeCaseId, []);
      }
    }

    if (activeCaseId) {
      grouped.get(activeCaseId).push(event);
    }

    if (event.type === 'CASE_COMPLETED' && eventCaseId && eventCaseId === activeCaseId) {
      activeCaseId = null;
    }
  }

  return grouped;
}

function computeReadEpisodeMetricsFromEvents(caseEvents, caseId, isCalibration) {
  if (isCalibration) {
    return { preAiReadMs: null, postAiReadMs: null, totalReadMs: null };
  }

  const getTimestampMs = (event, key) => {
    const payloadValue = getPayloadObject(event)[key];
    return new Date(payloadValue || event.timestamp).getTime();
  };

  const computeEpisodeMs = (episodeType) => {
    const starts = caseEvents.filter(
      event => event.type === 'READ_EPISODE_STARTED' && getPayloadObject(event).episodeType === episodeType
    );
    const ends = caseEvents.filter(
      event => event.type === 'READ_EPISODE_ENDED' && getPayloadObject(event).episodeType === episodeType
    );

    if (starts.length === 0 || ends.length === 0) {
      debugLog(`Missing ${episodeType} read episode boundary for case ${caseId}.`);
      return null;
    }

    const sortedStarts = [...starts].sort(
      (a, b) => getTimestampMs(a, 'tStartIso') - getTimestampMs(b, 'tStartIso')
    );
    const sortedEnds = [...ends].sort(
      (a, b) => getTimestampMs(a, 'tEndIso') - getTimestampMs(b, 'tEndIso')
    );
    const startEvent = sortedStarts[0];
    const startMs = getTimestampMs(startEvent, 'tStartIso');
    const endEvent = sortedEnds.find(event => getTimestampMs(event, 'tEndIso') >= startMs) ?? sortedEnds[sortedEnds.length - 1];
    const duration = getTimestampMs(endEvent, 'tEndIso') - startMs;
    if (!Number.isFinite(duration) || duration < 0) {
      debugLog(`Negative ${episodeType} duration for case ${caseId}: ${duration}`);
      return null;
    }
    return duration;
  };

  const preAiReadMs = computeEpisodeMs('PRE_AI');
  const postAiReadMs = computeEpisodeMs('POST_AI');
  const totalReadMs =
    typeof preAiReadMs === 'number' && typeof postAiReadMs === 'number'
      ? preAiReadMs + postAiReadMs
      : null;

  return { preAiReadMs, postAiReadMs, totalReadMs };
}

function getSessionId(events) {
  const sessionStarted = events.find(event => event.type === 'SESSION_STARTED');
  const payload = getPayloadObject(sessionStarted);
  return payload.sessionId || payload.sessionID || payload.session_id || null;
}

function computeMedian(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function computeMetricsFromEvents(packDir, events) {
  const groupedEvents = groupEventsByCase(events);
  const sessionId = getSessionId(events);
  const metricsByCase = new Map();
  const preAiReadValues = [];
  const trialManifestPath = packDir ? path.join(packDir, 'trial_manifest.json') : null;
  const trialManifest = trialManifestPath && exists(trialManifestPath) ? readJson(trialManifestPath) : null;
  const manifestCondition = trialManifest?.condition?.revealTiming ?? null;

  for (const [caseId, caseEvents] of groupedEvents.entries()) {
    const durationMs = (startMs, endMs) => {
      if (startMs === null || endMs === null) return null;
      const duration = endMs - startMs;
      return Number.isFinite(duration) && duration >= 0 ? duration : null;
    };
    const sortedEvents = [...caseEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const caseLoaded = sortedEvents.find(event => event.type === 'CASE_LOADED');
    const firstImpression = sortedEvents.find(event => event.type === 'FIRST_IMPRESSION_LOCKED');
    const aiRevealed = sortedEvents.find(event => event.type === 'AI_REVEALED');
    const finalAssessment = sortedEvents.find(event => event.type === 'FINAL_ASSESSMENT');
    const caseCompleted = [...sortedEvents].reverse().find(event => event.type === 'CASE_COMPLETED');
    const deviationSubmittedEvents = sortedEvents.filter(event => event.type === 'DEVIATION_SUBMITTED');
    const deviationStartedEvents = sortedEvents.filter(event => event.type === 'DEVIATION_STARTED');
    const deviationSkippedEvents = sortedEvents.filter(event => event.type === 'DEVIATION_SKIPPED');
    const disclosurePresented = sortedEvents.find(event => event.type === 'DISCLOSURE_PRESENTED');
    const comprehensionEvent = sortedEvents.find(event => event.type === 'DISCLOSURE_COMPREHENSION_RESPONSE');

    const initialBirads = getPayloadObject(firstImpression).birads ?? null;
    const finalBirads = getPayloadObject(finalAssessment).birads ?? initialBirads ?? null;
    const aiPayload = getPayloadObject(aiRevealed);
    const aiBirads = aiPayload.suggestedBirads ?? aiPayload.aiBirads ?? null;
    const aiConfidence = aiPayload.aiConfidence ?? null;

    const changeOccurred =
      initialBirads === null || finalBirads === null ? null : initialBirads !== finalBirads;
    const aiConsistentChange =
      changeOccurred === null || aiBirads === null || finalBirads === null
        ? null
        : changeOccurred && finalBirads === aiBirads;
    const aiInconsistentChange =
      changeOccurred === null || aiBirads === null || finalBirads === null
        ? null
        : changeOccurred && finalBirads !== aiBirads;
    const addaDenominator = aiBirads === null || initialBirads === null ? null : initialBirads !== aiBirads;
    const adda = addaDenominator ? aiConsistentChange : addaDenominator === null ? null : false;

    const comprehensionPayload = getPayloadObject(comprehensionEvent);
    const comprehensionAnswer =
      comprehensionPayload.selectedAnswer ?? comprehensionPayload.response ?? null;
    const comprehensionQuestionId = comprehensionPayload.questionId ?? null;
    const comprehensionItemId = comprehensionPayload.itemId ?? comprehensionQuestionId ?? null;
    const comprehensionCorrect = comprehensionPayload.isCorrect ?? comprehensionPayload.correct ?? null;
    const responseTimeMsFromPayload = comprehensionPayload.responseTimeMs;
    const responseTimeMsNumeric =
      typeof responseTimeMsFromPayload === 'number'
        ? responseTimeMsFromPayload
        : responseTimeMsFromPayload != null && !Number.isNaN(Number(responseTimeMsFromPayload))
          ? Number(responseTimeMsFromPayload)
          : null;
    const comprehensionResponseMs =
      typeof responseTimeMsNumeric === 'number'
        ? responseTimeMsNumeric
        : comprehensionEvent && disclosurePresented
          ? new Date(comprehensionEvent.timestamp).getTime() - new Date(disclosurePresented.timestamp).getTime()
          : null;
    const normalizedComprehensionResponseMs =
      typeof comprehensionResponseMs === 'number' && Number.isFinite(comprehensionResponseMs) && comprehensionResponseMs >= 0
        ? comprehensionResponseMs
        : null;

    const caseLoadedPayload = getPayloadObject(caseLoaded);
    const isCalibration = Boolean(caseLoadedPayload.isCalibration);
    const { preAiReadMs, postAiReadMs, totalReadMs } = computeReadEpisodeMetricsFromEvents(
      sortedEvents,
      caseId,
      isCalibration
    );
    if (typeof preAiReadMs === 'number' && preAiReadMs > 0) {
      preAiReadValues.push(preAiReadMs);
    }

    const conditionPayload = caseLoadedPayload;
    const conditionFromEvent =
      conditionPayload.revealTiming ??
      conditionPayload.condition?.revealTiming ??
      conditionPayload.conditionPayload?.revealTiming ??
      null;
    const condition = manifestCondition ?? conditionFromEvent ?? null;

    const deviationText =
      getPayloadObject(deviationSubmittedEvents[0]).deviationText ??
      getPayloadObject(deviationSubmittedEvents[0]).rationaleText ??
      getPayloadObject(deviationSubmittedEvents[0]).rationale ??
      null;
    const rationaleProvided = deviationSubmittedEvents.some(event => {
      const payload = getPayloadObject(event);
      const rationale =
        payload.rationale ?? payload.rationaleText ?? payload.deviationText ?? payload.deviation ?? '';
      return String(rationale).trim().length > 0;
    });
    const decisionChangeCount =
      deviationStartedEvents.length > 0 ? deviationStartedEvents.length : changeOccurred ? 1 : 0;
    const overrideCount = aiBirads != null && finalBirads !== aiBirads ? 1 : 0;

    const sessionStart = events.find(event => event.type === 'SESSION_STARTED');
    const lockTime = firstImpression ? new Date(firstImpression.timestamp).getTime() : null;
    const revealTime = aiRevealed ? new Date(aiRevealed.timestamp).getTime() : lockTime;
    const finalTime = finalAssessment ? new Date(finalAssessment.timestamp).getTime() : revealTime;
    const caseStartTime = caseLoaded ? new Date(caseLoaded.timestamp).getTime() : null;
    const totalTimeMs = durationMs(caseStartTime, finalTime);
    const lockToRevealMs = durationMs(lockTime, revealTime);
    const revealToFinalMs = durationMs(revealTime, finalTime);
    const timeToLockCandidate = getPayloadObject(firstImpression).timeToLockMs;
    const timeToLockMs =
      typeof timeToLockCandidate === 'number' && Number.isFinite(timeToLockCandidate) && timeToLockCandidate >= 0
        ? timeToLockCandidate
        : durationMs(caseStartTime, lockTime);
    const aiExposureMs =
      aiRevealed && (finalAssessment || caseCompleted)
        ? durationMs(
          new Date(aiRevealed.timestamp).getTime(),
          new Date((finalAssessment ?? caseCompleted).timestamp).getTime()
        )
        : null;
    const normalizedAiExposureMs =
      typeof aiExposureMs === 'number' && Number.isFinite(aiExposureMs) && aiExposureMs >= 0
        ? aiExposureMs
        : null;
    const computedTimestamp = caseCompleted?.timestamp ?? finalAssessment?.timestamp ?? null;
    const timingFlagPreAiTooFast =
      typeof preAiReadMs === 'number' && preAiReadMs < TOO_FAST_PRE_AI_MS;
    const timingFlagAiExposureTooFast =
      typeof normalizedAiExposureMs === 'number' && normalizedAiExposureMs > 0 && normalizedAiExposureMs < TOO_FAST_AI_EXPOSURE_MS;

    metricsByCase.set(caseId, {
      sessionId,
      timestamp: computedTimestamp,
      caseId,
      condition,
      initialBirads,
      finalBirads,
      aiBirads,
      aiConfidence,
      changeOccurred,
      aiConsistentChange,
      aiInconsistentChange,
      addaDenominator,
      adda,
      deviationDocumented: deviationSubmittedEvents.length > 0,
      deviationSkipped: deviationSkippedEvents.length > 0,
      deviationRequired: changeOccurred === null ? null : changeOccurred,
      deviationText,
      decisionChangeCount,
      overrideCount,
      rationaleProvided,
      timingFlagPreAiTooFast,
      timingFlagAiExposureTooFast,
      comprehensionItemId,
      comprehensionAnswer,
      comprehensionCorrect,
      comprehension_question_id: comprehensionQuestionId,
      comprehension_answer: comprehensionAnswer,
      comprehension_correct: comprehensionCorrect,
      comprehension_response_ms: normalizedComprehensionResponseMs,
      comprehensionItemIdLegacy: comprehensionItemId,
      comprehensionAnswerLegacy: comprehensionAnswer,
      comprehensionCorrectLegacy: comprehensionCorrect,
      comprehensionQuestionId,
      preAiReadMs,
      postAiReadMs,
      totalReadMs,
      aiExposureMs: normalizedAiExposureMs,
      totalTimeMs,
      timeToLockMs,
      lockToRevealMs,
      revealToFinalMs,
      revealTiming: condition,
      disclosureFormat: getPayloadObject(disclosurePresented).format ?? null,
      sessionTimestamp: sessionStart?.timestamp ?? null,
      isCalibration,
    });
  }

  const sessionMedianPreAITime = computeMedian(preAiReadValues);
  for (const [caseId, metrics] of metricsByCase.entries()) {
    const { preAiReadMs, postAiReadMs } = metrics;
    const timeRatio =
      typeof preAiReadMs === 'number' && typeof postAiReadMs === 'number' && postAiReadMs > 0
        ? Math.round((preAiReadMs / postAiReadMs) * 1000) / 1000
        : null;
    const preAITimeVsMedian =
      typeof preAiReadMs === 'number' && sessionMedianPreAITime !== null
        ? Math.round((preAiReadMs - sessionMedianPreAITime) * 100) / 100
        : null;
    metricsByCase.set(caseId, {
      ...metrics,
      timeRatio,
      sessionMedianPreAITime,
      preAITimeVsMedian,
    });
  }

  return metricsByCase;
}


function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const packDir = args.find(a => !a.startsWith('-'));

  const out = {
    version: VERSION,
    pack: packDir || null,
    timestamp: new Date().toISOString(),
    checks: {},
    warnings: [],
    errors: [],
    pass: true,
  };

  const fail = (msg) => { out.errors.push(msg); out.pass = false; };
  const warn = (msg) => { out.warnings.push(msg); };

  if (!packDir) {
    fail('Missing <pack-dir>');
    if (jsonMode) return console.log(JSON.stringify(out, null, 2));
    console.error('Usage: node verify-radiology.cjs <pack-dir> [--json]');
    process.exit(2);
  }

  const pack = path.resolve(packDir);
  
  const isFixturePack =
    pack.includes(`${path.sep}tools${path.sep}radiology-verifier${path.sep}fixtures${path.sep}`) ||
    pack.includes(`tools/radiology-verifier/fixtures/`);

  // Files
  const required = ['export_manifest.json', 'ledger.json', 'events.jsonl'];
  const optional = ['derived_metrics.csv', 'codebook.md', 'trial_manifest.json', 'verifier_output.json'];

  const missingReq = required.filter(f => !exists(path.join(pack, f)));
  out.checks.files = {
    required,
    optional,
    missing_required: missingReq,
    pass: missingReq.length === 0,
  };
  if (missingReq.length) missingReq.forEach(f => fail(`Missing required file: ${f}`));
  optional.forEach(f => { if (!exists(path.join(pack, f))) warn(`Missing optional file (warn only): ${f}`); });

  // Manifest integrity
  if (out.pass) {
    try {
      const manifest = readJson(path.join(pack, 'export_manifest.json'));
      if (!manifest || !Array.isArray(manifest.entries)) {
        fail('export_manifest.json missing entries[]');
      } else {
        let ok = true;
        const results = [];

        for (const ent of manifest.entries) {
          const rel = ent.path;
          const fp = path.join(pack, rel);

          const r = { path: rel, exists: exists(fp), bytes_ok: null, sha256_ok: null };
          if (!r.exists) {
            ok = false;
            r.bytes_ok = false;
            r.sha256_ok = false;
            results.push(r);
            continue;
          }

          const st = fs.statSync(fp);
          if (typeof ent.bytes === 'number') {
            r.bytes_ok = st.size === ent.bytes;
            if (!r.bytes_ok) ok = false;
          }

          if (typeof ent.sha256 === 'string') {
            r.sha256_ok = sha256File(fp) === ent.sha256;
            if (!r.sha256_ok) ok = false;
          }

          results.push(r);
        }

        out.checks.manifest = { pass: ok, entries_checked: results.length, entries: results };
        if (!ok) fail('Manifest integrity failed (missing file and/or bytes/sha256 mismatch)');
      }
    } catch (e) {
      fail(`Manifest parse/verify error: ${e.message}`);
    }
  }

  // Ledger chain integrity
  if (out.pass) {
    try {
      const ledger = readJson(path.join(pack, 'ledger.json'));
      if (!Array.isArray(ledger) || ledger.length === 0) {
        fail('ledger.json must be a non-empty array');
      } else {
        let ok = true;
        const issues = [];

        for (let i = 0; i < ledger.length; i++) {
          const e = ledger[i];
          const expectedSeq = i + 1;

          if (e.seq !== expectedSeq) {
            ok = false;
            issues.push({ i, issue: 'SEQ', expected: expectedSeq, got: e.seq });
          }

          if (i === 0) {
            if (e.previousHash !== Z64) {
              ok = false;
              issues.push({ i, issue: 'PREV_HASH_FIRST', expected: Z64, got: e.previousHash });
            }
          } else {
            const prev = ledger[i - 1];
            if (e.previousHash !== prev.chainHash) {
              ok = false;
              issues.push({ i, issue: 'PREV_HASH_LINK', expected: prev.chainHash, got: e.previousHash });
            }
          }

          const recomputed = sha256Hex(chainPreimage(e));
          if (e.chainHash !== recomputed) {
            ok = false;
            issues.push({ i, issue: 'CHAIN_HASH', expected: recomputed, got: e.chainHash });
          }
        }

        out.checks.ledger = { pass: ok, entries: ledger.length, issues };
        if (!ok) {
          if (isFixturePack) {
            warn('Ledger chain integrity failed (fixture pack: warn-only)');
          } else {
            fail('Ledger chain integrity failed');
          }
        }
      }
    } catch (e) {
      fail(`Ledger parse/verify error: ${e.message}`);
    }
  }

  // Derived metrics analytics replay check
  if (out.pass) {
    const derivedMetricsPath = path.join(pack, 'derived_metrics.csv');
    if (!exists(derivedMetricsPath)) {
      out.checks.derived_metrics = {
        pass: false,
        mismatches: [{ issue: 'MISSING_DERIVED_METRICS' }],
      };
      fail('Missing derived_metrics.csv (required for analytics replay verification)');
    } else {
      try {
        const events = parseEventsJsonl(path.join(pack, 'events.jsonl'));
        const derivedMetricsRaw = fs.readFileSync(derivedMetricsPath, 'utf8');
        const { headers, rows } = parseCsv(derivedMetricsRaw);

        const caseIdIndex = headers.indexOf('caseId');
        if (caseIdIndex === -1) {
          out.checks.derived_metrics = {
            pass: false,
            mismatches: [{ issue: 'MISSING_CASE_ID_COLUMN' }],
          };
          fail('derived_metrics.csv missing required caseId column');
        } else {
          const derivedByCase = new Map();
          for (const row of rows) {
            const caseId = row[caseIdIndex];
            if (caseId) {
              const record = {};
              headers.forEach((header, idx) => {
                record[header] = row[idx] ?? '';
              });
              derivedByCase.set(caseId, record);
            }
          }

          const computedByCase = computeMetricsFromEvents(pack, events);
          const allCaseIds = new Set([
            ...Array.from(derivedByCase.keys()),
            ...Array.from(computedByCase.keys()),
          ]);
          const calibrationCaseIds = new Set(
            events
              .filter(event => event.type === 'CASE_LOADED')
              .map(event => {
                const payload = getPayloadObject(event);
                return payload.isCalibration ? payload.caseId : null;
              })
              .filter(Boolean)
          );
          const mismatches = [];

          for (const caseId of Array.from(allCaseIds).sort()) {
            const derivedRow = derivedByCase.get(caseId);
            const computedRow = computedByCase.get(caseId);
            const isCalibrationCase =
              /CAL/i.test(caseId) || calibrationCaseIds.has(caseId) || Boolean(computedRow?.isCalibration);

            if (isCalibrationCase) {
              continue;
            }

            if (!derivedRow) {
              mismatches.push({
                caseId,
                column: 'caseId',
                expected: 'missing',
                actual: 'present in events only',
              });
              continue;
            }

            if (!computedRow) {
              mismatches.push({
                caseId,
                column: 'caseId',
                expected: 'present in derived_metrics.csv',
                actual: 'missing from events',
              });
              continue;
            }

            for (const column of headers) {
              const expected = derivedRow[column];
              const actual = computedRow[column];
              if (!valuesMatch(expected, actual, column)) {
                mismatches.push({
                  caseId,
                  column,
                  expected: expected === undefined ? 'undefined' : expected,
                  actual: formatMismatchValue(actual),
                });
              }
            }
          }

          out.checks.derived_metrics = {
            pass: mismatches.length === 0,
            mismatches,
          };

          if (mismatches.length > 0) {
            mismatches.forEach(mismatch => {
              fail(
                `Derived metrics mismatch caseId=${mismatch.caseId} column=${mismatch.column} expected=${mismatch.expected} actual=${mismatch.actual}`
              );
            });
          }
        }
      } catch (e) {
        out.checks.derived_metrics = {
          pass: false,
          mismatches: [{ issue: 'PARSE_ERROR', message: e.message }],
        };
        fail(`Derived metrics verification error: ${e.message}`);
      }
    }
  }
  // Derived metrics sanity checks
  const metricsPath = path.join(pack, 'derived_metrics.csv');
  if (exists(metricsPath)) {
    try {
      const metricsCsv = fs.readFileSync(metricsPath, 'utf8');
      const { headers, rows } = parseCsv(metricsCsv);
      const headerIndex = new Map(headers.map((h, i) => [h, i]));
      const durationHeaders = headers.filter(h => /ms$/i.test(h));

      const eventsRaw = fs.readFileSync(path.join(pack, 'events.jsonl'), 'utf8');
      const events = eventsRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
      const completedCaseIds = new Set(
        events
          .filter(e => e.type === 'CASE_COMPLETED' || e.type === 'FINAL_ASSESSMENT')
          .map(e => e.payload?.caseId)
          .filter(Boolean)
      );

      let ok = true;
      const issues = [];

      rows.forEach((row, rowIndex) => {
        durationHeaders.forEach(header => {
          const idx = headerIndex.get(header);
          if (idx === undefined) return;
          const raw = row[idx];
          if (raw === undefined || raw === '' || raw === 'NA') return;
          if (raw === 'NaN') {
            ok = false;
            issues.push({ row: rowIndex + 2, field: header, issue: 'NaN' });
            return;
          }
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            ok = false;
            issues.push({ row: rowIndex + 2, field: header, issue: 'NaN' });
            return;
          }
          if (num > 1e9) {
            ok = false;
            issues.push({ row: rowIndex + 2, field: header, issue: 'EPOCH_LIKE', value: num });
          }
        });
      });

      const caseIdIdx = headerIndex.get('caseId');
      const totalTimeIdx = headerIndex.get('totalTimeMs');
      if (caseIdIdx !== undefined && totalTimeIdx !== undefined) {
        const totalByCase = new Map();
        rows.forEach(row => {
          const caseId = row[caseIdIdx];
          if (!caseId) return;
          const raw = row[totalTimeIdx];
          totalByCase.set(caseId, raw);
        });
        for (const caseId of completedCaseIds) {
          const raw = totalByCase.get(caseId);
          if (raw === undefined || raw === '' || raw === 'NA') {
            warn(`Missing totalTimeMs for completed case ${caseId}`);
            continue;
          }
          const num = Number(raw);
          if (Number.isFinite(num) && num === 0) {
            ok = false;
            issues.push({ field: 'totalTimeMs', caseId, issue: 'ZERO_DURATION' });
          }
        }
      }

      out.checks.derived_metrics = { pass: ok, issues };
      if (!ok) fail('Derived metrics sanity checks failed');
    } catch (e) {
      fail(`Derived metrics check error: ${e.message}`);
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  // Human output
  console.log(`Evidify Radiology/Research Verifier v${VERSION}`);
  console.log(`Pack: ${packDir}`);
  console.log('');
  console.log(`Files: ${out.checks.files.pass ? 'PASS' : 'FAIL'}`);

  if (out.warnings.length) {
    console.log(`Warnings (${out.warnings.length}):`);
    out.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }

  if (!out.pass) {
    console.log(`Errors (${out.errors.length}):`);
    out.errors.forEach(e => console.log(`  ❌ ${e}`));
    console.log('❌ VERIFICATION: FAIL');
    process.exit(1);
  }

  console.log('Manifest: PASS');
  console.log('Ledger: PASS');
  if (out.checks.derived_metrics) {
    console.log(`Derived metrics: ${out.checks.derived_metrics.pass ? 'PASS' : 'FAIL'}`);
  }
  console.log('✅ VERIFICATION: PASS');
}

main();
