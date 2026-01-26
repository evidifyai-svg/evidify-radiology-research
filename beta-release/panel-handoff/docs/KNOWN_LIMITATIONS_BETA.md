# Evidify Forensic Beta: Known Limitations

**Version:** 1.1 Beta  
**Date:** 2026-01-12  
**Status:** DO NOT REPORT THESE ISSUES

---

## Purpose

This document lists known limitations in the beta release. **Do not file issues for these items** — they are already tracked and will be addressed in future releases.

If you encounter behavior not listed here that seems wrong, please do file an issue.

---

## 1. Performance Limitations

### PDF Rendering

| Limitation | Details | Workaround | Fix Target |
|------------|---------|------------|------------|
| Large PDFs slow to render | PDFs >100 pages may take 30+ seconds to display | Wait for rendering to complete | v1.2 |
| High-res images slow | Images >10MB may cause temporary UI freeze | Use compressed images | v1.2 |
| OCR latency | Scanned documents take 2-5 seconds per page | Use searchable PDFs when available | v1.2 |

### Scale Limits

| Limitation | Current Limit | Impact | Fix Target |
|------------|---------------|--------|------------|
| Evidence items per case | ~50 recommended | Performance degrades beyond | v1.3 |
| Annotations per document | ~100 recommended | UI may become sluggish | v1.3 |
| Export size | 500MB maximum | Large cases may fail to export | v1.2 |

---

## 2. AI/Ollama Limitations

### Model Requirements

| Limitation | Details | Workaround |
|------------|---------|------------|
| Specific model required | Must use `llama3.2:8b` | Install correct model |
| Ollama must be running | AI features fail if Ollama not started | Start Ollama before app |
| Model download required | ~5GB download on first use | Pre-download model |

### AI Output

| Limitation | Details | Workaround |
|------------|---------|------------|
| Variable generation time | 10-60 seconds per generation | Wait for completion |
| No streaming | Output appears all at once | Wait for completion |
| Token limit | Long documents may be truncated | Split into sections |

---

## 3. Export Limitations

### File System

| Limitation | Details | Workaround |
|------------|---------|------------|
| Local drives only | Network/cloud drives may fail | Export to local, then copy |
| Path length limit | Windows: 260 chars | Use shorter case names |
| Special characters | Case names with `/\:*?"<>|` may fail | Use alphanumeric + hyphens |

### Format

| Limitation | Details | Fix Target |
|------------|---------|------------|
| No PDF export of report | Report draft is internal only | v1.2 |
| No encrypted export | Export is unencrypted | v1.3 |
| No partial export | All-or-nothing export | v1.2 |

---

## 4. UI/UX Limitations

### Navigation

| Limitation | Details | Workaround |
|------------|---------|------------|
| No global search | Search is per-document only | Use document list |
| No keyboard shortcuts | Most actions require mouse | Use mouse |
| No dark mode | Light theme only | Adjust monitor brightness |

### Editing

| Limitation | Details | Workaround |
|------------|---------|------------|
| No undo for deletions | Deleted items cannot be recovered | Be careful with delete |
| No drag-drop reordering | Items cannot be reordered by drag | Delete and recreate |
| Limited formatting | Plain text only in opinions | Use external editor |

---

## 5. Platform-Specific Limitations

### macOS

| Limitation | Details | Workaround |
|------------|---------|------------|
| Gatekeeper warning | First launch shows security warning | Right-click → Open |
| No Apple Silicon native | Runs via Rosetta 2 | Performance adequate |
| Keychain prompt | May ask for keychain access | Allow access |

### Windows

| Limitation | Details | Workaround |
|------------|---------|------------|
| SmartScreen warning | First launch may show warning | Click "More info" → "Run anyway" |
| Antivirus flags | Some AV may flag as unknown | Add exception |
| No auto-update | Must manually download updates | Check for updates periodically |

---

## 6. Integration Limitations

### Ollama

| Limitation | Details | Workaround |
|------------|---------|------------|
| Single model only | Cannot switch models | Use specified model |
| No GPU detection | May not use GPU even if available | Performance still acceptable |
| Port conflict | Fails if port 11434 in use | Stop conflicting service |

### File Formats

| Limitation | Supported | Not Supported |
|------------|-----------|---------------|
| Documents | PDF | DOCX, DOC, TXT |
| Images | PNG, JPG | HEIC, WEBP, TIFF |
| Other | - | Audio, Video |

---

## 7. Data Limitations

### Case Data

| Limitation | Details | Fix Target |
|------------|---------|------------|
| No case templates | Each case starts blank | v1.2 |
| No case copy/clone | Cannot duplicate cases | v1.2 |
| No case archive | Cases cannot be archived | v1.3 |

### Backup

| Limitation | Details | Workaround |
|------------|---------|------------|
| No automatic backup | Data not backed up automatically | Manual backup of data folder |
| No cloud sync | Data stays on local machine | Manual copy to backup |
| No import from backup | Cannot restore from backup | Copy data folder back |

---

## 8. Security Limitations

### Authentication

| Limitation | Details | Fix Target |
|------------|---------|------------|
| No app-level password | Anyone with machine access can open app | v1.3 |
| No session timeout | App stays open indefinitely | v1.3 |

### Encryption

| Limitation | Details | Workaround |
|------------|---------|------------|
| No database encryption | Data stored unencrypted | Use OS-level encryption (FileVault/BitLocker) |
| No export encryption | Exports are unencrypted | Encrypt manually or use secure transfer |

---

## 9. Audit Limitations

### Audit Log

| Limitation | Details | Impact |
|------------|---------|--------|
| No log pruning | Log grows indefinitely | Large cases may have large logs |
| No log search | Cannot search audit events | Manual review only |
| No log export (standalone) | Must export full case | Export full case |

---

## 10. Gate Limitations

### Gate Engine

| Limitation | Details | Impact |
|------------|---------|--------|
| No custom gates | Fixed 7-gate framework | Cannot add custom checks |
| No gate configuration | All gates always run | Cannot disable gates |
| No gate history | Only latest result shown | Cannot compare over time |

---

## Reporting Issues

**Before filing an issue, check:**

1. ✅ Is it listed in this document? → Do not file
2. ✅ Is it listed in release notes as known? → Do not file
3. ✅ Does it affect core workflow? → File with high priority
4. ✅ Is it cosmetic only? → File with low priority

**If in doubt, ask in #evidify-beta Slack channel first.**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 Beta | 2026-01-12 | Initial known limitations |

---

*Known Limitations v1.1 Beta — Don't report what we already know*
