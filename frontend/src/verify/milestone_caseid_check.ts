import assert from 'node:assert/strict';

import { EventLogger } from '../lib/event_logger';
import type { LedgerEntry } from '../lib/ExportPackZip';

type RecordedEvent = { type: string; payload: Record<string, unknown> };

function createMockExportPack(events: RecordedEvent[]) {
  return {
    async addEvent(type: string, payload: Record<string, unknown>): Promise<LedgerEntry> {
      events.push({ type, payload });
      const seq = events.length;
      return {
        seq,
        eventId: `evt-${seq}`,
        eventType: type,
        timestamp: new Date().toISOString(),
        contentHash: '',
        previousHash: '',
        chainHash: '',
      };
    },
  };
}

async function run() {
  const events: RecordedEvent[] = [];
  const mockExportPack = createMockExportPack(events);
  const logger = new EventLogger(mockExportPack);

  const cases = [
    { caseId: 'CASE-001', caseIndex: 0 },
    { caseId: 'CASE-002', caseIndex: 1 },
  ];

  for (const item of cases) {
    await logger.logCaseLoaded({
      caseId: item.caseId,
      caseIndex: item.caseIndex,
      totalCases: cases.length,
      isCalibration: false,
      isAttentionCheck: false,
      metadata: {},
    });

    await logger.logFirstImpressionLocked(2, 3);
    await logger.logAIRevealed({
      suggestedBirads: 2,
      aiConfidence: 0.9,
      finding: 'N/A',
      displayMode: 'OVERLAY',
    });
    await logger.logDisclosurePresented({
      format: 'FDR_FOR',
      fdrValue: 0.1,
      forValue: 0.2,
    });
    await logger.logCaseCompleted(item.caseId, {});
  }

  const milestones = new Set(['FIRST_IMPRESSION_LOCKED', 'AI_REVEALED', 'DISCLOSURE_PRESENTED']);
  let activeCaseId: string | null = null;

  for (const event of events) {
    if (event.type === 'CASE_LOADED') {
      activeCaseId = event.payload.caseId as string;
      continue;
    }

    if (event.type === 'CASE_COMPLETED') {
      activeCaseId = null;
      continue;
    }

    if (milestones.has(event.type)) {
      assert.ok(activeCaseId, `Missing active case for ${event.type}`);
      assert.equal(
        event.payload.caseId,
        activeCaseId,
        `${event.type} payload.caseId should match current case`
      );
    }
  }

  console.log('milestone caseId check passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
