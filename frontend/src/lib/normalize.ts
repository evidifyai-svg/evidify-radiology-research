// normalize.ts - Data normalization layer for backend contracts
//
// This module provides normalization functions that handle:
// - snake_case to camelCase conversion
// - Missing optional fields with sensible defaults
// - Schema version migration
// - Backwards compatibility with older API responses

import type { Note, Client, NoteType, NoteStatus, Attestation } from './tauri';

/**
 * Schema version for note format
 * Increment when note shape changes
 */
export const NOTE_SCHEMA_VERSION = 1;

/**
 * Normalize a note from backend response
 * Handles snake_case keys, missing fields, and legacy formats
 */
export function normalizeNote(raw: any): Note {
  if (!raw) {
    throw new Error('Cannot normalize null/undefined note');
  }

  // Handle both snake_case and camelCase
  const id = raw.id ?? raw.note_id ?? '';
  const clientId = raw.client_id ?? raw.clientId ?? '';
  const sessionDate = raw.session_date ?? raw.sessionDate ?? new Date().toISOString().split('T')[0];
  const noteType: NoteType = raw.note_type ?? raw.noteType ?? 'progress';
  const content = raw.content ?? raw.structured_content ?? raw.raw_input ?? '';
  const wordCount = raw.word_count ?? raw.wordCount ?? content.split(/\s+/).filter(Boolean).length;
  const status: NoteStatus = raw.status ?? 'draft';
  const contentHash = raw.content_hash ?? raw.contentHash ?? '';
  const attestations: Attestation[] = raw.attestations ?? [];
  const signedAt = raw.signed_at ?? raw.signedAt ?? null;
  const createdAt = raw.created_at ?? raw.createdAt ?? Date.now();
  const updatedAt = raw.updated_at ?? raw.updatedAt ?? Date.now();

  return {
    id,
    client_id: clientId,
    session_date: sessionDate,
    note_type: noteType,
    content,
    word_count: wordCount,
    status,
    content_hash: contentHash,
    attestations,
    signed_at: signedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Get displayable content from a note
 * Falls back through: content -> placeholder
 */
export function getNoteDisplayContent(note: Note): string {
  if (note.content && note.content.trim()) {
    return note.content;
  }
  return '[No content available - raw data may need inspection]';
}

/**
 * Get display title for a note
 * Extracts from content or generates from metadata
 */
export function getNoteDisplayTitle(note: Note): string {
  // Try to extract first line from content
  if (note.content) {
    const firstLine = note.content.split('\n')[0].trim();
    if (firstLine && firstLine.length > 0) {
      return firstLine.substring(0, 100) + (firstLine.length > 100 ? '...' : '');
    }
  }
  
  // Fall back to note type + date
  const noteType = note.note_type || 'Note';
  const date = note.session_date || new Date(note.created_at).toLocaleDateString();
  return `${noteType} - ${date}`;
}

/**
 * Check if a note has content issues that need attention
 */
export function getNoteContentWarnings(note: Note): string[] {
  const warnings: string[] = [];
  
  if (!note.content || !note.content.trim()) {
    warnings.push('Note has no content');
  }
  
  // Check attestation status - attestations array means detections were found
  if (note.status === 'draft' && note.attestations && note.attestations.length === 0) {
    // Draft with no attestations might have unaddressed detections
    // This is a soft warning - the actual detection count comes from elsewhere
  }
  
  return warnings;
}

/**
 * Normalize a client from backend response
 */
export function normalizeClient(raw: any): Client {
  if (!raw) {
    throw new Error('Cannot normalize null/undefined client');
  }

  return {
    id: raw.id ?? '',
    display_name: raw.display_name ?? raw.displayName ?? 'Unknown Client',
    status: raw.status ?? 'active',
    session_count: raw.session_count ?? raw.sessionCount ?? 0,
    created_at: raw.created_at ?? raw.createdAt ?? Date.now(),
    updated_at: raw.updated_at ?? raw.updatedAt ?? Date.now(),
  };
}

/**
 * Normalize an array of notes, filtering out unparseable entries
 */
export function normalizeNotes(rawNotes: any[]): Note[] {
  if (!Array.isArray(rawNotes)) {
    console.warn('normalizeNotes received non-array:', typeof rawNotes);
    return [];
  }
  
  return rawNotes
    .map((raw, index) => {
      try {
        return normalizeNote(raw);
      } catch (err) {
        console.error(`Failed to normalize note at index ${index}:`, err);
        return null;
      }
    })
    .filter((note): note is Note => note !== null);
}

/**
 * Normalize an array of clients, filtering out unparseable entries
 */
export function normalizeClients(rawClients: any[]): Client[] {
  if (!Array.isArray(rawClients)) {
    console.warn('normalizeClients received non-array:', typeof rawClients);
    return [];
  }
  
  return rawClients
    .map((raw, index) => {
      try {
        return normalizeClient(raw);
      } catch (err) {
        console.error(`Failed to normalize client at index ${index}:`, err);
        return null;
      }
    })
    .filter((client): client is Client => client !== null);
}
