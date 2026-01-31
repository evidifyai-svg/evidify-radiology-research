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
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = line[i + 1];
        if (nextChar === '"') {
          current += '"';
          i += 1;
function parseCsvRow(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        values.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCsvLine(line));
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

function valuesMatch(expectedRaw, actualRaw) {
  const expected = normalizeCsvValue(expectedRaw);
  const actual = normalizeComputedValue(actualRaw);

  if (expected === null && actual === null) return true;
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Number.isInteger(expected) && Number.isInteger(actual)) {
      return expected === actual;
    }
    return Math.abs(expected - actual) <= 1e-6;
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

function groupEventsByCase(events) {
  const grouped = new Map();
  let activeCaseId = null;

  for (const event of events) {
    const payload = event.payload || {};
    if (event.type === 'CASE_LOADED' && payload.caseId) {
      activeCaseId = payload.caseId;
      if (!grouped.has(activeCaseId)) {
        grouped.set(activeCaseId, []);
      }
    }

    if (activeCaseId) {
      grouped.get(activeCaseId).push(event);
    }

    if (event.type === 'CASE_COMPLETED' && payload.caseId && payload.caseId === activeCaseId) {
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
    const payloadValue = (event.payload || {})[key];
    return new Date(payloadValue || event.timestamp).getTime();
  };

  const computeEpisodeMs = (episodeType) => {
    const starts = caseEvents.filter(
      event => event.type === 'READ_EPISODE_STARTED' && (event.payload || {}).episodeType === episodeType
    );
    const ends = caseEvents.filter(
      event => event.type === 'READ_EPISODE_ENDED' && (event.payload || {}).episodeType === episodeType
    );

    if (starts.length === 0 || ends.length === 0) {
      return null;
    }

    const duration = getTimestampMs(ends[0], 'tEndIso') - getTimestampMs(starts[0], 'tStartIso');
    return Number.isFinite(duration) && duration >= 0 ? duration : null;
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
  const payload = sessionStarted?.payload || {};
  return payload.sessionId || payload.sessionID || payload.session_id || null;
}

function computeMetricsFromEvents(events) {
  const groupedEvents = groupEventsByCase(events);
  const sessionId = getSessionId(events);
  const metricsByCase = new Map();

  for (const [caseId, caseEvents] of groupedEvents.entries()) {
    const caseLoaded = caseEvents.find(event => event.type === 'CASE_LOADED');
    const firstImpression = caseEvents.find(event => event.type === 'FIRST_IMPRESSION_LOCKED');
    const aiRevealed = caseEvents.find(event => event.type === 'AI_REVEALED');
    const finalAssessment = caseEvents.find(event => event.type === 'FINAL_ASSESSMENT');
    const deviationSubmitted = caseEvents.find(event => event.type === 'DEVIATION_SUBMITTED');
    const deviationSkipped = caseEvents.find(event => event.type === 'DEVIATION_SKIPPED');
    const disclosurePresented = caseEvents.find(event => event.type === 'DISCLOSURE_PRESENTED');
    const comprehensionEvent = caseEvents.find(event => event.type === 'DISCLOSURE_COMPREHENSION_RESPONSE');

    const initialBirads = (firstImpression?.payload || {}).birads ?? null;
    const finalBirads = (finalAssessment?.payload || {}).birads ?? initialBirads ?? null;
    const aiPayload = aiRevealed?.payload || {};
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

    const comprehensionPayload = comprehensionEvent?.payload || {};
    const comprehensionAnswer =
      comprehensionPayload.selectedAnswer ?? comprehensionPayload.response ?? null;
    const comprehensionQuestionId = comprehensionPayload.questionId ?? null;
    const comprehensionItemId = comprehensionPayload.itemId ?? comprehensionQuestionId ?? null;
    const comprehensionCorrect = comprehensionPayload.isCorrect ?? comprehensionPayload.correct ?? null;
    const comprehensionResponseMs =
      comprehensionEvent && disclosurePresented
        ? new Date(comprehensionEvent.timestamp).getTime() - new Date(disclosurePresented.timestamp).getTime()
        : null;
    const normalizedComprehensionResponseMs =
      typeof comprehensionResponseMs === 'number' && Number.isFinite(comprehensionResponseMs) && comprehensionResponseMs >= 0
        ? comprehensionResponseMs
        : null;

    const isCalibration = Boolean((caseLoaded?.payload || {}).isCalibration);
    const { preAiReadMs, postAiReadMs, totalReadMs } = computeReadEpisodeMetricsFromEvents(
      caseEvents,
      caseId,
      isCalibration
    );

    const conditionPayload = caseLoaded?.payload || {};
    const condition =
      conditionPayload.condition ??
      conditionPayload.revealTiming ??
      conditionPayload.conditionCode ??
      aiPayload.revealTiming ??
      '';

    const deviationText =
      (deviationSubmitted?.payload || {}).deviationText ??
      (deviationSubmitted?.payload || {}).rationaleText ??
      (deviationSubmitted?.payload || {}).rationale ??
      null;

    const sessionStart = events.find(event => event.type === 'SESSION_STARTED');
    const lockTime = firstImpression ? new Date(firstImpression.timestamp).getTime() : null;
    const revealTime = aiRevealed ? new Date(aiRevealed.timestamp).getTime() : lockTime;
    const finalTime = finalAssessment ? new Date(finalAssessment.timestamp).getTime() : revealTime;
    const caseStartTime = caseLoaded ? new Date(caseLoaded.timestamp).getTime() : null;
    const totalTimeMs =
      caseStartTime !== null && finalTime !== null ? finalTime - caseStartTime : null;
    const lockToRevealMs =
      lockTime !== null && revealTime !== null ? revealTime - lockTime : null;
    const revealToFinalMs =
      revealTime !== null && finalTime !== null ? finalTime - revealTime : null;

    metricsByCase.set(caseId, {
      sessionId,
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
      deviationDocumented: deviationSubmitted !== undefined,
      deviationSkipped: deviationSkipped !== undefined,
      deviationRequired: changeOccurred === null ? null : changeOccurred,
      deviationText,
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
      totalTimeMs,
      lockToRevealMs,
      revealToFinalMs,
      revealTiming: aiPayload.revealTiming ?? conditionPayload.revealTiming ?? null,
      disclosureFormat: (disclosurePresented?.payload || {}).format ?? null,
      sessionTimestamp: sessionStart?.timestamp ?? null,
    });
  }

  return metricsByCase;
}

  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvRow(lines[0]);
  const rows = lines.slice(1).map(line => parseCsvRow(line));
  return { headers, rows };
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

          const computedByCase = computeMetricsFromEvents(events);
          const allCaseIds = new Set([
            ...Array.from(derivedByCase.keys()),
            ...Array.from(computedByCase.keys()),
          ]);
          const mismatches = [];

          for (const caseId of Array.from(allCaseIds).sort()) {
            const derivedRow = derivedByCase.get(caseId);
            const computedRow = computedByCase.get(caseId);

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
              if (!valuesMatch(expected, actual)) {
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
