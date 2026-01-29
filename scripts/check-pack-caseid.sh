#!/usr/bin/env bash
set -euo pipefail

PACK_DIR="${1:-}"

if [[ -z "${PACK_DIR}" ]]; then
  echo "Usage: bash scripts/check-pack-caseid.sh <pack-dir>"
  exit 2
fi

EVENTS_FILE="${PACK_DIR%/}/events.jsonl"
if [[ ! -f "${EVENTS_FILE}" ]]; then
  echo "FAIL: missing ${EVENTS_FILE}"
  exit 2
fi

# Use node for JSON parsing (no jq/rg required).
node --input-type=module <<'NODE' "$EVENTS_FILE"
import fs from "fs";
import readline from "readline";

const eventsPath = process.argv[1];

// Milestone events that MUST include payload.caseId
const MILESTONE = new Set([
  "CASE_STARTED",
  "FIRST_IMPRESSION_LOCKED",
  "AI_REVEALED",
  "DISCLOSURE_PRESENTED",
  "FINAL_ASSESSMENT_LOGGED",
  "FINAL_ASSESSMENT",
  "CASE_COMPLETED",
]);

let lineNo = 0;
let checked = 0;

const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};

const rl = readline.createInterface({
  input: fs.createReadStream(eventsPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  lineNo += 1;
  const trimmed = line.trim();
  if (!trimmed) return;

  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch (e) {
    fail(`invalid JSON at line ${lineNo}: ${e.message}`);
  }

  const eventType = obj.eventType || obj.type; // tolerate legacy naming if present
  if (!eventType) return;

  if (MILESTONE.has(eventType)) {
    checked += 1;
    const payload = obj.payload ?? {};
    const caseId = payload.caseId;

    if (typeof caseId !== "string" || caseId.trim() === "") {
      const eventId = obj.eventId ?? obj.id ?? "UNKNOWN_EVENT_ID";
      fail(
        `missing payload.caseId for milestone eventType=${eventType} eventId=${eventId} line=${lineNo}`
      );
    }
  }
});

rl.on("close", () => {
  console.log(`PASS: caseId present for ${checked} milestone events in ${eventsPath}`);
  process.exit(0);
});
NODE
