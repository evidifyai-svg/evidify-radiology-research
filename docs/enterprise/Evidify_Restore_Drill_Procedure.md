# Evidify Restore Drill Procedure
## Ransomware Recovery & Business Continuity Validation

**Version:** 1.0  
**Date:** January 9, 2026  
**Classification:** Operations / Disaster Recovery  
**Frequency:** Quarterly (minimum)

---

## Executive Summary

This document defines the procedure for validating Evidify's backup/restore capability. Regular restore drills ensure that in the event of ransomware, device loss, or data corruption, clinical documentation can be recovered.

### Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO (Recovery Time Objective)** | < 1 hour | Time to restore access to clinical documentation |
| **RPO (Recovery Point Objective)** | < 24 hours | Maximum data loss (depends on backup frequency) |
| **Restore Success Rate** | 100% | All drills must succeed |

---

## 1. Backup Requirements

### 1.1 What to Back Up

| File | Location | Size | Priority |
|------|----------|------|----------|
| `vault.db` | `~/Library/Application Support/evidify/` | Variable | **Critical** |
| `vault.db-wal` | Same | Small | Critical |
| `vault.db-shm` | Same | Small | Critical |
| `config.json` | Same | < 1KB | Optional |
| `models/` | Same | 75-500MB | Optional (can re-download) |

### 1.2 Backup Methods (Customer Responsibility)

| Method | Encryption | Frequency | Offsite | Recommended |
|--------|------------|-----------|---------|-------------|
| Time Machine (macOS) | FileVault | Hourly | No | Dev/Small |
| Windows Backup | BitLocker | Daily | No | Dev/Small |
| Veeam/Commvault | AES-256 | Hourly | Yes | **Enterprise** |
| Cloud Backup (encrypted) | AES-256 | Continuous | Yes | **Enterprise** |
| Air-gapped USB | Hardware | Weekly | Yes | High Security |

### 1.3 Backup Security Notes

```
IMPORTANT: vault.db is encrypted at rest with AES-256.

Even if backup media is compromised:
- Data cannot be read without passphrase
- Brute force is computationally infeasible (Argon2id)
- No "master key" or backdoor exists

However, defense-in-depth recommends:
- Encrypted backup media
- Access controls on backup storage
- Immutable/append-only backups where possible
```

---

## 2. Restore Drill Procedure

### 2.1 Pre-Drill Checklist

```
□ Identify test machine (NOT production)
□ Obtain backup from approved backup system
□ Verify backup date/time
□ Record current vault state (note count, last modified)
□ Have passphrase available (from secure storage)
□ Schedule drill (avoid production hours if using shared systems)
□ Notify stakeholders
```

### 2.2 Drill Execution Steps

#### Step 1: Prepare Test Environment (5 minutes)

```bash
# macOS
# Create isolated test directory
mkdir -p ~/evidify-restore-drill-$(date +%Y%m%d)
cd ~/evidify-restore-drill-$(date +%Y%m%d)

# Remove any existing Evidify data (test machine only!)
rm -rf ~/Library/Application\ Support/evidify/

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\evidify-restore-drill-$(Get-Date -Format yyyyMMdd)"
Remove-Item -Recurse -Force "$env:APPDATA\evidify" -ErrorAction SilentlyContinue
```

**Checkpoint:** Empty Evidify data directory confirmed

---

#### Step 2: Retrieve Backup (5-15 minutes)

```bash
# From Time Machine (macOS)
tmutil restore ~/Library/Application\ Support/evidify/vault.db \
  /Volumes/Time\ Machine/Backups.backupdb/.../vault.db

# From network backup
scp backup-server:/backups/evidify/vault.db \
  ~/Library/Application\ Support/evidify/

# From encrypted USB
# Mount encrypted volume first
cp /Volumes/BackupUSB/evidify/vault.db \
  ~/Library/Application\ Support/evidify/
```

**Record:**
- Backup source: _________________
- Backup date: _________________
- File size: _________________
- SHA-256: _________________

---

#### Step 3: Verify Backup Integrity (2 minutes)

```bash
# Calculate hash of restored file
shasum -a 256 ~/Library/Application\ Support/evidify/vault.db

# Compare with backup manifest (if available)
# Hash should match original backup

# Verify file is not corrupted SQLite
# Should return error (encrypted), not corruption
sqlite3 ~/Library/Application\ Support/evidify/vault.db ".tables" 2>&1
# Expected: "Error: file is not a database"
```

**Checkpoint:** 
- [ ] Hash matches backup manifest
- [ ] File is encrypted (not plaintext SQLite)

---

#### Step 4: Launch Evidify (2 minutes)

```bash
# macOS
open -a Evidify

# Windows
& "C:\Program Files\Evidify\Evidify.exe"
```

**Expected behavior:**
- App launches
- Shows unlock screen (vault exists but locked)
- Does NOT show "Create new vault" (backup recognized)

**Checkpoint:** 
- [ ] App recognizes existing vault
- [ ] Unlock screen displayed

---

#### Step 5: Unlock Vault (2 minutes)

Enter passphrase from secure storage.

**Expected behavior:**
- Unlock takes ~0.5 seconds (key derivation)
- Vault opens successfully
- Notes list populates

**If unlock fails:**
- Verify passphrase is correct (check caps lock, special characters)
- Verify backup is from correct vault (not different environment)
- Check Evidify logs for specific error

**Checkpoint:**
- [ ] Vault unlocks successfully
- [ ] Time to unlock: _______ seconds

---

#### Step 6: Verify Data Integrity (5-10 minutes)

```
Manual verification:

□ Note count matches expected: ______ notes
□ Most recent note title: ________________
□ Most recent note date: ________________
□ Open 3 random notes and verify content readable
□ Check audit log is present and readable
□ Verify audit chain integrity (Settings → Compliance → Verify Integrity)
```

**Verification commands:**

```bash
# Via CLI (if available)
./evidify-cli note-count
./evidify-cli verify-audit
./evidify-cli verify-hmacs
```

**Checkpoint:**
- [ ] All notes present and readable
- [ ] Audit log intact
- [ ] Audit chain verified
- [ ] HMAC verification passed

---

#### Step 7: Functional Test (5 minutes)

Perform basic operations to confirm full functionality:

```
□ Create a new test note: "Restore Drill Test - [DATE]"
□ Edit an existing note (add "[Drill verified]" to end)
□ Export a note to PDF
□ View audit log (confirm new entries created)
□ Lock and unlock vault
```

**Checkpoint:**
- [ ] Create note: Success
- [ ] Edit note: Success
- [ ] Export note: Success
- [ ] Audit logging: Working
- [ ] Lock/unlock: Working

---

#### Step 8: Document Results (5 minutes)

Complete the Restore Drill Report (see Section 4).

---

#### Step 9: Cleanup (5 minutes)

```bash
# If using test machine, restore to clean state
rm -rf ~/Library/Application\ Support/evidify/

# If production validation complete, no cleanup needed
# (restored vault becomes production)
```

---

### 2.3 Total Expected Time

| Phase | Duration |
|-------|----------|
| Preparation | 5 min |
| Backup retrieval | 5-15 min |
| Integrity verification | 2 min |
| App launch | 2 min |
| Vault unlock | 2 min |
| Data verification | 5-10 min |
| Functional test | 5 min |
| Documentation | 5 min |
| Cleanup | 5 min |
| **Total** | **35-50 min** |

---

## 3. Failure Scenarios & Recovery

### 3.1 Backup File Corrupted

**Symptoms:**
- SQLite error during Evidify launch
- Crash on vault open
- "Database malformed" error

**Recovery:**
1. Try older backup version
2. Check backup system logs for corruption source
3. If corruption at source, investigate storage media
4. Escalate to Evidify support if needed

### 3.2 Passphrase Unknown/Lost

**Symptoms:**
- Unlock fails with "Invalid passphrase"
- No access to passphrase storage

**Recovery:**
```
⚠️ CRITICAL: There is NO recovery mechanism for lost passphrases.

This is by design - it ensures no backdoor exists.

Prevention:
- Store passphrase in enterprise password manager
- Use passphrase escrow for enterprise deployments
- Document passphrase recovery process in DR plan
```

### 3.3 Keychain Items Missing

**Symptoms:**
- Vault doesn't recognize passphrase
- "Salt not found" errors

**Recovery:**
On first successful unlock after restore, Evidify will:
1. Read salt from vault.db header
2. Re-derive KEK from passphrase
3. Re-create keychain entries

This is automatic - just enter the correct passphrase.

### 3.4 Vault Won't Open After Restore

**Symptoms:**
- Evidify shows "Create new vault" instead of unlock
- Vault file present but not recognized

**Troubleshooting:**
```bash
# Verify file location
ls -la ~/Library/Application\ Support/evidify/vault.db

# Verify file size (should be > 0)
stat ~/Library/Application\ Support/evidify/vault.db

# Check file permissions
ls -la ~/Library/Application\ Support/evidify/

# Verify not corrupt
file ~/Library/Application\ Support/evidify/vault.db
# Should say "data" not "empty"
```

---

## 4. Restore Drill Report Template

```
═══════════════════════════════════════════════════════════════════════════
                        EVIDIFY RESTORE DRILL REPORT
═══════════════════════════════════════════════════════════════════════════

DRILL METADATA
─────────────────────────────────────────────────────────────────────────────
Date:                    ____________________
Time Started:            ____________________
Time Completed:          ____________________
Total Duration:          ________ minutes
Drill Conductor:         ____________________
Witness (if required):   ____________________

ENVIRONMENT
─────────────────────────────────────────────────────────────────────────────
Test Machine:            ____________________
Operating System:        ____________________
Evidify Version:         ____________________
Backup System:           ____________________

BACKUP DETAILS
─────────────────────────────────────────────────────────────────────────────
Backup Date/Time:        ____________________
Backup Source:           ____________________
Backup File Size:        ________ bytes
Backup SHA-256:          ____________________
Time to Retrieve:        ________ minutes

RESTORE RESULTS
─────────────────────────────────────────────────────────────────────────────
Vault Unlocked:          [ ] YES  [ ] NO
Time to Unlock:          ________ seconds
Notes Recovered:         ________ / ________ expected
Audit Log Intact:        [ ] YES  [ ] NO
Hash Chain Valid:        [ ] YES  [ ] NO
HMAC Verification:       [ ] PASS [ ] FAIL

FUNCTIONAL TESTS
─────────────────────────────────────────────────────────────────────────────
Create Note:             [ ] PASS [ ] FAIL
Edit Note:               [ ] PASS [ ] FAIL
Export Note:             [ ] PASS [ ] FAIL
Audit Logging:           [ ] PASS [ ] FAIL
Lock/Unlock:             [ ] PASS [ ] FAIL

ISSUES ENCOUNTERED
─────────────────────────────────────────────────────────────────────────────
[Describe any issues and resolution]




RECOVERY OBJECTIVES
─────────────────────────────────────────────────────────────────────────────
RTO Target:              < 1 hour
RTO Actual:              ________ minutes
RTO Met:                 [ ] YES  [ ] NO

RPO (Data Loss):         ________ hours
RPO Acceptable:          [ ] YES  [ ] NO

DRILL RESULT
─────────────────────────────────────────────────────────────────────────────
Overall Result:          [ ] PASS  [ ] FAIL  [ ] PASS WITH ISSUES

If FAIL or ISSUES, describe remediation required:




SIGNATURES
─────────────────────────────────────────────────────────────────────────────
Drill Conductor:         ____________________  Date: ____________

Witness:                 ____________________  Date: ____________

IT Manager:              ____________________  Date: ____________

═══════════════════════════════════════════════════════════════════════════
```

---

## 5. Quarterly Drill Schedule

| Quarter | Drill Date | Type | Notes |
|---------|------------|------|-------|
| Q1 2026 | Week of Jan 15 | Full restore | First quarterly drill |
| Q2 2026 | Week of Apr 15 | Full restore + ransomware simulation | |
| Q3 2026 | Week of Jul 15 | Full restore | |
| Q4 2026 | Week of Oct 15 | Full restore + tabletop exercise | |

---

## 6. Ransomware-Specific Playbook

### 6.1 Detection

Signs of ransomware attack:
- Unable to open vault.db
- vault.db has new extension (.encrypted, .locked, etc.)
- Ransom note in Evidify data directory
- Multiple files across system encrypted

### 6.2 Immediate Response (First 15 minutes)

```
1. ISOLATE
   □ Disconnect from network (Wi-Fi off, Ethernet unplugged)
   □ Do NOT shut down (preserve memory for forensics)
   □ Document visible indicators

2. ASSESS
   □ Is vault.db affected?
   □ Are backups accessible?
   □ Scope of infection?

3. NOTIFY
   □ IT Security
   □ Management
   □ Legal (if PHI potentially affected)
```

### 6.3 Recovery Decision Tree

```
Is vault.db encrypted by ransomware?
├─ YES
│   └─ Are backups available and unaffected?
│       ├─ YES → Proceed with restore drill procedure
│       └─ NO → Escalate to incident response team
│               (Do NOT pay ransom without legal/management approval)
│
└─ NO (vault.db intact)
    └─ Is system otherwise compromised?
        ├─ YES → Image system, restore to clean device
        └─ NO → Monitor and investigate
```

### 6.4 Post-Incident

After successful recovery:
```
□ Document incident timeline
□ Analyze attack vector
□ Update security controls
□ Conduct additional restore drill to validate
□ Report to relevant authorities if PHI involved
□ Update DR plan based on lessons learned
```

---

## 7. Immutable Backup Recommendations

To protect against ransomware destroying backups:

### 7.1 Cloud (Recommended)

| Provider | Feature | Configuration |
|----------|---------|---------------|
| AWS S3 | Object Lock | Governance or Compliance mode |
| Azure Blob | Immutable storage | Time-based retention |
| Backblaze B2 | Object Lock | Enable on bucket |

### 7.2 On-Premises

| Solution | Approach |
|----------|----------|
| Veeam | Hardened repository with XFS immutability |
| Commvault | WORM storage integration |
| Air-gapped | Offline media rotated weekly |

### 7.3 Configuration Example (AWS S3)

```bash
# Enable Object Lock on bucket
aws s3api put-object-lock-configuration \
  --bucket evidify-backups \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": 30
      }
    }
  }'
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 9, 2026 | Initial release |

---

*Regular restore drills are essential for business continuity. Schedule your first drill within 30 days of deployment.*
