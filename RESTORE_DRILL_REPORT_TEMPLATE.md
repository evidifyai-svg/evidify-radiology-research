# Evidify Restore Drill Report
## v4.2.6-beta Validation

**Date:** January 9, 2026  
**Conducted By:** Josh  
**Environment:** macOS [VERSION]

---

## Drill Metadata

| Field | Value |
|-------|-------|
| Start Time | ________ |
| End Time | ________ |
| Total Duration | ________ min |
| Evidify Version | 4.2.6-beta |
| macOS Version | ________ |

---

## Pre-Drill State

| Metric | Value |
|--------|-------|
| Vault location | ~/Library/Application Support/com.evidify.app/vault.db |
| Vault size | ________ KB |
| Number of clients | ________ |
| Number of notes | ________ |
| Last audit entry ID | ________ |

---

## Step 1: Create Backup

**Command:**
```bash
cp ~/Library/Application\ Support/com.evidify.app/vault.db ~/Desktop/vault-backup.db
```

| Check | Result |
|-------|--------|
| Backup created | ☐ Yes ☐ No |
| Backup size matches original | ☐ Yes ☐ No |
| Backup SHA-256 | ________ |
| Time to complete | ________ sec |

---

## Step 2: Simulate Disaster

**Commands:**
```bash
# Delete vault
rm ~/Library/Application\ Support/com.evidify.app/vault.db

# Clear keychain (manual via Keychain Access)
# Search for "evidify" and delete entries
```

| Check | Result |
|-------|--------|
| vault.db deleted | ☐ Yes ☐ No |
| Keychain entries cleared | ☐ Yes ☐ No |
| App shows "No vault" on launch | ☐ Yes ☐ No |

---

## Step 3: Restore from Backup

**Command:**
```bash
cp ~/Desktop/vault-backup.db ~/Library/Application\ Support/com.evidify.app/vault.db
```

| Check | Result |
|-------|--------|
| Backup copied to app directory | ☐ Yes ☐ No |
| File permissions correct | ☐ Yes ☐ No |
| Time to complete | ________ sec |

---

## Step 4: Verify Recovery

**Actions:**
1. Launch Evidify
2. Enter original passphrase
3. Verify data accessible

| Check | Result |
|-------|--------|
| App recognizes vault | ☐ Yes ☐ No |
| Passphrase accepted | ☐ Yes ☐ No |
| Time to unlock | ________ sec |
| All clients visible | ☐ Yes ☐ No |
| Client count matches | ☐ Yes ☐ No (Expected: ____, Actual: ____) |
| All notes visible | ☐ Yes ☐ No |
| Note count matches | ☐ Yes ☐ No (Expected: ____, Actual: ____) |
| Note content readable | ☐ Yes ☐ No |
| Audit log accessible | ☐ Yes ☐ No |
| Audit chain valid | ☐ Yes ☐ No |

---

## Step 5: Functional Test Post-Restore

| Test | Result |
|------|--------|
| Create new note | ☐ Pass ☐ Fail |
| Edit existing note | ☐ Pass ☐ Fail |
| Export note to PDF | ☐ Pass ☐ Fail |
| Lock and re-unlock vault | ☐ Pass ☐ Fail |

---

## Recovery Objectives

| Metric | Target | Actual | Met? |
|--------|--------|--------|------|
| RTO (Recovery Time) | < 60 min | ________ min | ☐ Yes ☐ No |
| RPO (Data Loss) | 0 notes | ________ notes | ☐ Yes ☐ No |
| Integrity | 100% audit chain valid | ________% | ☐ Yes ☐ No |

---

## Issues Encountered

_(Describe any issues and how they were resolved)_

```
Issue 1: 
Resolution: 

Issue 2:
Resolution:
```

---

## Overall Drill Result

| Result | Check |
|--------|-------|
| ☐ **PASS** | All data recovered, all tests passed, RTO/RPO met |
| ☐ **PASS WITH ISSUES** | Data recovered but issues noted above |
| ☐ **FAIL** | Data loss or critical failure |

---

## Signatures

**Drill Conductor:** _________________________ Date: ____________

**Witness (optional):** _________________________ Date: ____________

---

## Notes for Enterprise Package

This completed drill report can be included in the Enterprise Proof Pack as evidence of:
- Backup/restore capability
- RTO/RPO compliance
- DR procedure validation

**File as:** `Restore_Drill_Report_v4.2.6_[DATE].pdf`
