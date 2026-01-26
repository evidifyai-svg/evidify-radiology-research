# Destruction Certificate (Recording Auto-Delete Proof)
## Objective
Provide clinician-visible proof that the recording was destroyed after note generation, with a PHI-minimal audit artifact.

## Preferred destruction strategy
**Key shredding**:
- Encrypt audio with per-session content key (CEK).
- Destroy = securely delete CEK + metadata pointer.
- Optionally also delete encrypted blob.

## Certificate fields (PHI-minimal)
- certificate_id (UUID)
- session_id (UUID)
- recording_asset_id (UUID)
- recording_start/stop (timestamps)
- note_finalized_at (timestamp)
- destroy_completed_at (timestamp)
- destroy_status: SUCCESS | FAILED | QUARANTINED
- destroy_method: KEY_SHRED | SECURE_DELETE
- policy_version
- integrity_hash (hash of certificate fields for tamper evidence)

## Failure handling (critical)
If destruction fails:
- asset moves to encrypted quarantine (still local)
- app blocks future recordings until resolved (org-configurable)
- clinician sees an “Action Required” banner (Retry / Destroy Now)

## Patient-facing confirmation (optional)
A simple, non-technical statement:
“Audio was stored on-device and destroyed after note generation at [time].”
