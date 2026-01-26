// p1-types.ts
// ---------------------------------------------------------------------------
// Minimal P1 API + types used by a few UI components (BackupManager, RedactionPreview).
// In v4.3.0-beta these endpoints are not yet wired to the Rust backend.
//
// Goal: keep the frontend compiling under `strict: true` while providing
// sensible placeholder behavior that fails *safely* (no silent success).
//
// When backend commands are implemented, replace these stubs with Tauri `invoke`
// wrappers and delete the placeholders.

export interface BackupInfo {
  case_id: string;
  case_name: string;
  created_at: string;
  created_by: string;
  path: string;
  encrypted: boolean;
  size_bytes?: number;
  // UI expects these optional summary fields
  file_count?: number;
  compressed_size_bytes?: number;
}

export interface BackupCreateRequest {
  case_id: string;
  case_name: string;
  user_id: string;
  include_evidence: boolean;
  include_reports: boolean;
  include_audit: boolean;
  password?: string;
}

export interface BackupManifest {
  files: Array<{ path: string; sha256: string; size_bytes: number }>;
}

export interface BackupResult {
  success: boolean;
  errors: string[];
  manifest: BackupManifest;
  compressed_size_bytes: number;
}

export interface RestoreBackupRequest {
  backup_path: string;
  password?: string;
  overwrite_existing: boolean;
}

export interface RestoreResult {
  success: boolean;
  errors: string[];
  files_restored: number;
  bytes_restored: number;
  integrity_verified: boolean;
}

// ---------------------------------------------------------------------------
// PII / Redaction
// ---------------------------------------------------------------------------

export type PiiType =
  | 'NAME'
  | 'DOB'
  | 'SSN'
  | 'PHONE'
  | 'EMAIL'
  | 'ADDRESS'
  | 'CREDIT_CARD'
  | 'MRN'
  | 'OTHER';

export interface PiiDetection {
  pii_type: PiiType;
  // Primary offsets
  start: number;
  end: number;
  // Back-compat names used by some components
  start_offset?: number;
  end_offset?: number;
  // Original matched substring
  text?: string;
  // RedactionPreview expects this name
  detected_value?: string;
  // Optional line number (if detection was line-aware)
  line_number?: number;
  confidence: number; // 0-1
}

export interface DetectionResult {
  success: boolean;
  errors: string[];
  detections: PiiDetection[];
  // RedactionPreview UI shape
  total_count: number;
  text_length: number;
  count_by_type: Record<string, number>;
  // Back-compat / alt naming
  category_counts?: Record<string, number>;
}

// Marker style options are still evolving; keep union broad enough
// to match the current UI select values.
export type MarkerStyle = 'bracketed' | 'black_bar' | 'token' | 'blocked' | 'masked' | 'simple';

export interface RedactionConfigRequest {
  detect_ssn: boolean;
  detect_dob: boolean;
  detect_phone: boolean;
  detect_email: boolean;
  detect_credit_card: boolean;
  partial_redaction: boolean;
  marker_style: MarkerStyle;
}

export interface RedactionResult {
  success: boolean;
  errors: string[];
  redacted_text: string;
  detections: PiiDetection[];
  // Optional details expected by RedactionPreview
  redaction_count?: number;
  original_hash?: string;
  redacted_hash?: string;
  audit_entries?: Array<{ id: string; type: string; ts: string }>;
}

// ---------------------------------------------------------------------------
// Stub API
// ---------------------------------------------------------------------------

function notImplemented(feature: string): never {
  throw new Error(
    `${feature} is not yet wired to the backend in this beta build. ` +
      `This is a placeholder stub to keep the UI compiling.`
  );
}

export const p1Api = {
  // Backups
  async listBackups(): Promise<BackupInfo[]> {
    // Safe default: return empty list.
    return [];
  },

  async createBackup(_req: BackupCreateRequest): Promise<BackupResult> {
    // Safe default: fail loudly (no silent "success").
    return {
      success: false,
      errors: ['Backup backend not implemented in this beta build'],
      manifest: { files: [] },
      compressed_size_bytes: 0,
    };
  },

  async restoreBackup(_req: RestoreBackupRequest): Promise<RestoreResult> {
    return {
      success: false,
      errors: ['Restore backend not implemented in this beta build'],
      files_restored: 0,
      bytes_restored: 0,
      integrity_verified: false,
    };
  },

  // PII detection / redaction
  async detectPii(_text: string, _config: RedactionConfigRequest): Promise<DetectionResult> {
    notImplemented('PII detection');
  },

  // Some UI components call these higher-level helpers.
  async previewRedaction(_text: string, _config: RedactionConfigRequest): Promise<DetectionResult> {
    notImplemented('Redaction preview');
  },

  async redactText(_text: string, _config: RedactionConfigRequest): Promise<RedactionResult> {
    notImplemented('Redaction');
  },

  async applyRedaction(_text: string, _config: RedactionConfigRequest): Promise<RedactionResult> {
    notImplemented('Apply redaction');
  },
};
