# TAMPER_DEMO_v2.md

## 60-Second Live Tamper Demonstration

**Purpose:** Prove the hash chain catches tampering in real-time.  
**Audience:** Brown / BRPLL research team  
**Key outcome:** "This would hold up under scrutiny"

---

## Setup (Before Meeting)

```bash
# 1. Generate a valid export from the demo
# (Complete the demo, click "Download ZIP")

# 2. Unzip to original folder
unzip evidify_export_*.zip -d export_original/

# 3. Create tampered copy
cp -r export_original export_tampered

# 4. Verify both are identical
npm run verify -- export_original/
# → PASS

npm run verify -- export_tampered/
# → PASS (identical copy)
```

---

## Live Demo Script (60 Seconds)

### Part 1: Show Valid Export (15 seconds)

**Say:** "This is a valid export package. Let me run the verifier."

```bash
npm run verify -- export_original/
```

**Expected output:**
```
════════════════════════════════════════════
  EVIDIFY EXPORT VERIFIER v2.0
════════════════════════════════════════════

Verifying: export_original/

✓ PASS: SCHEMA_VERSION (2.0.0)
✓ PASS: EVENT_COUNT (6 events)
✓ PASS: LEDGER_COUNT (6 entries)
✓ PASS: SEQUENCE_NUMBERS (monotonic 0..n-1)
✓ PASS: EVENT_ID_CONSISTENCY (all match)
✓ PASS: CHAIN_INTEGRITY (verified - canonical JSON + structured encoding)
✓ PASS: FINAL_HASH (matches manifest)
✓ PASS: REQUIRED_EVENTS (all present)

════════════════════════════════════════════
  RESULT: PASS
  8/8 checks passed
════════════════════════════════════════════
```

**Say:** "All 8 checks pass. The chain is valid."

---

### Part 2: Tamper with Data (20 seconds)

**Say:** "Now let's say someone wants to hide that the reader changed their assessment. They edit the initial BI-RADS from 2 to 4."

**Open events.jsonl in a text editor:**
```bash
# Show the file
cat export_tampered/events.jsonl | grep -A2 "FIRST_IMPRESSION_LOCKED"
```

**Show the original:**
```json
{"id":"abc123","seq":2,"type":"FIRST_IMPRESSION_LOCKED","timestamp":"2026-01-24T14:22:33.456Z","payload":{"birads":2,"confidence":0.8}}
```

**Edit (live or pre-staged):**
Change `"birads":2` to `"birads":4`

```json
{"id":"abc123","seq":2,"type":"FIRST_IMPRESSION_LOCKED","timestamp":"2026-01-24T14:22:33.456Z","payload":{"birads":4,"confidence":0.8}}
```

**Say:** "Just one character change. 2 becomes 4. Looks innocent."

---

### Part 3: Run Verifier on Tampered Export (25 seconds)

**Say:** "Let's run the same verifier."

```bash
npm run verify -- export_tampered/
```

**Expected output:**
```
════════════════════════════════════════════
  EVIDIFY EXPORT VERIFIER v2.0
════════════════════════════════════════════

Verifying: export_tampered/

✓ PASS: SCHEMA_VERSION (2.0.0)
✓ PASS: EVENT_COUNT (6 events)
✓ PASS: LEDGER_COUNT (6 entries)
✓ PASS: SEQUENCE_NUMBERS (monotonic 0..n-1)
✓ PASS: EVENT_ID_CONSISTENCY (all match)
✗ FAIL: CHAIN_INTEGRITY
         CHAIN_BROKEN / CONTENT_TAMPERED
         Event 2 (FIRST_IMPRESSION_LOCKED): CONTENT_TAMPERED
         Expected: 7a3b9c4d...
         Got:      e8f2a1b7...
✗ FAIL: FINAL_HASH
         Computed: a1b2c3d4...
         Expected: 9f8e7d6c...

════════════════════════════════════════════
  RESULT: FAIL
  5/8 checks passed
  ERRORS: CHAIN_BROKEN / CONTENT_TAMPERED
════════════════════════════════════════════
```

**Say:** "CONTENT_TAMPERED at event 2. The verifier caught it instantly."

---

## Why This Works (Explanation if Asked)

**If they ask how:**

"Every event payload is serialized to Canonical JSON—sorted keys, no whitespace, normalized numbers—so the hash is deterministic across any environment.

Then we compute a chain hash that includes:
- The sequence number
- The previous chain hash
- The event ID
- The timestamp
- The content hash

All packed into a fixed 128-byte structure with no delimiters.

When the payload changes, the content hash changes. When the content hash changes, the chain hash changes. And that breaks every subsequent hash in the chain.

You can't just 'fix' the hash in the ledger because you'd need to know all the subsequent chain hashes too. It's cryptographically infeasible."

---

## Key Phrases During Demo

| Moment | Say |
|--------|-----|
| Before running verifier | "Let me run the verifier on this export" |
| After PASS | "All 8 checks pass. The chain is valid." |
| Before tampering | "Let's say someone wants to hide a change..." |
| After edit | "Just one character. 2 becomes 4." |
| After FAIL | "CONTENT_TAMPERED at event 2. Caught instantly." |
| Wrap-up | "Every edit breaks the chain. The verifier is reproducible by any party." |

---

## Alternative Tampering Demos

### Option B: Delete an Event

```bash
# Remove the AI_REVEALED event from events.jsonl
# (delete the line)
```

**Result:**
```
✗ FAIL: EVENT_COUNT
         Manifest: 6, Found: 5
✗ FAIL: CHAIN_INTEGRITY
         Event 3: previousHash mismatch
```

### Option C: Reorder Events

```bash
# Swap the order of two events in events.jsonl
```

**Result:**
```
✗ FAIL: SEQUENCE_NUMBERS
         Event 2: expected seq=2, got seq=3
✗ FAIL: CHAIN_INTEGRITY
         CHAIN_BROKEN at event 2
```

### Option D: Change Timestamp

```bash
# Edit the timestamp in events.jsonl to make response look faster
```

**Result:**
```
✗ FAIL: CHAIN_INTEGRITY
         Event 2: CONTENT_TAMPERED
```

(Timestamp is part of the chain hash input via the event object)

### Option E: Edit Manifest Hash

```bash
# Try to "fix" the manifest by editing finalHash
```

**Result:**
```
✓ PASS: CHAIN_INTEGRITY (recomputed from events)
✗ FAIL: FINAL_HASH
         Computed: [actual hash from events]
         Expected: [your fake hash in manifest]
```

The verifier recomputes from the source—you can't lie about the hash.

---

## Post-Demo Questions & Answers

**Q: What if someone edits both the event AND the ledger hash?**

A: They'd need to recompute all subsequent chain hashes. And the chain includes the previous hash, so it's a cascade. They'd end up with a completely different final hash that doesn't match the manifest.

**Q: What if someone edits the manifest too?**

A: The verifier recomputes everything from the raw events. The manifest is just metadata. You can't make tampered events hash to an honest final hash.

**Q: Can you tamper before the export is created?**

A: Yes—that's the threat model boundary. This is client-side. We detect post-hoc tampering. For real-time attestation, you'd need server-side logging, which is a P2 enhancement.

**Q: What about the timestamp being user-controlled?**

A: We explicitly mark it as `timestamp_trust_model: client_clock_untrusted`. Timestamps are instrumentation, not attestation. For forensic-grade timing, you'd add RFC 3161 timestamping.

---

## Rehearsal Checklist

- [ ] export_original/ contains valid export
- [ ] export_tampered/ contains pre-staged tampered version
- [ ] Verified original shows PASS
- [ ] Verified tampered shows FAIL with clear error message
- [ ] Terminal font is readable from projector
- [ ] Practiced the 60-second flow 3 times
- [ ] Know answers to post-demo questions

---

## Emergency Fallback

If live demo fails:

1. Have screenshots of PASS and FAIL outputs
2. Show the PacketViewer in the app (Events → Ledger → Verifier tabs)
3. Explain the mechanism verbally

"The demo is just showing what the code does. The code is deterministic. Here's the verifier output..."
