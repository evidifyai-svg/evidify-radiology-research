// Vault Module v4 - SQLCipher encrypted storage
// 
// Simplified architecture (from SPEC-v4.md):
// - SQLCipher provides full database encryption (AES-256)
// - No per-record encryption (reduces complexity)
// - Wrapped key model: passphrase required each session
//
// SECURITY FIXES (v4.1.2):
// - Transactional vault creation: DB first, then keychain
// - Distinct states for keychain loss vs missing vault
// - Explicit key material zeroization

use rusqlite::{Connection, params, OptionalExtension};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use thiserror::Error;
use zeroize::Zeroize;
use regex::Regex;
use chrono::Datelike;

use crate::crypto::{self, KEK, VaultKey, WrappedVaultKey};
use crate::models::{Client, ClientSearchResult, Note, NoteStatus, NoteType, StoredDetection, TreatmentProgress, ProgressTheme};

/// Extract a number from a query string (for semantic search)
fn extract_number(s: &str) -> Option<u32> {
    let re = Regex::new(r"\b(\d+)\b").ok()?;
    re.captures(s).and_then(|cap| cap.get(1).and_then(|m| m.as_str().parse().ok()))
}

#[derive(Error, Debug)]
pub enum VaultError {
    #[error("Vault not initialized")]
    NotInitialized,
    
    #[error("Vault locked")]
    Locked,
    
    #[error("Vault already exists")]
    AlreadyExists,
    
    #[error("Invalid passphrase")]
    InvalidPassphrase,
    
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Crypto error: {0}")]
    Crypto(#[from] crypto::CryptoError),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("Vault state corrupted: database exists but keychain entry missing. Recovery required.")]
    KeychainLost,
    
    #[error("Stale keychain: keychain entries exist but database is missing")]
    StaleKeychain,
    
    #[error("Internal error: {0}")]
    Internal(String),
    
    #[error("Invalid state: {0}")]
    InvalidState(String),
}

/// Detailed vault state for UI
#[derive(Debug, Clone, serde::Serialize)]
pub struct VaultState {
    pub db_exists: bool,
    pub keychain_exists: bool,
    pub state: VaultStateType,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum VaultStateType {
    NoVault,           // Fresh install
    Ready,             // DB + keychain present, can unlock
    KeychainLost,      // DB exists, keychain missing - need recovery
    StaleKeychain,     // Keychain exists, DB missing - cleanup needed
    Unlocked,          // Currently unlocked
}

/// Vault state
pub struct Vault {
    conn: Option<Connection>,
    vault_key: Option<VaultKey>,
    data_dir: PathBuf,
}

impl Vault {
    pub fn new(data_dir: PathBuf) -> Self {
        Vault {
            conn: None,
            vault_key: None,
            data_dir,
        }
    }
    
    /// Check if vault exists (simple boolean for backwards compatibility)
    pub fn exists(&self) -> bool {
        self.vault_path().exists() && crypto::keychain_has_vault()
    }
    
    /// Get detailed vault state
    pub fn get_state(&self) -> VaultState {
        let db_exists = self.vault_path().exists();
        let keychain_exists = crypto::keychain_has_vault();
        
        if self.conn.is_some() {
            return VaultState {
                db_exists,
                keychain_exists,
                state: VaultStateType::Unlocked,
                message: "Vault is unlocked".to_string(),
            };
        }
        
        match (db_exists, keychain_exists) {
            (false, false) => VaultState {
                db_exists,
                keychain_exists,
                state: VaultStateType::NoVault,
                message: "No vault exists. Create one to get started.".to_string(),
            },
            (true, true) => VaultState {
                db_exists,
                keychain_exists,
                state: VaultStateType::Ready,
                message: "Vault ready. Enter passphrase to unlock.".to_string(),
            },
            (true, false) => VaultState {
                db_exists,
                keychain_exists,
                state: VaultStateType::KeychainLost,
                message: "Vault database exists but keychain entry is missing. Data cannot be recovered without the original passphrase.".to_string(),
            },
            (false, true) => VaultState {
                db_exists,
                keychain_exists,
                state: VaultStateType::StaleKeychain,
                message: "Stale keychain entries found without database. Cleanup recommended.".to_string(),
            },
        }
    }
    
    /// Clear stale keychain entries (when DB is missing)
    pub fn clear_stale_keychain(&self) -> Result<(), VaultError> {
        if self.vault_path().exists() {
            return Err(VaultError::Internal("Cannot clear keychain when database exists".to_string()));
        }
        crypto::clear_keychain()?;
        log::info!("Cleared stale keychain entries");
        Ok(())
    }
    
    /// Delete vault database (for recovery from KeychainLost state)
    pub fn delete_vault_db(&self) -> Result<(), VaultError> {
        if self.conn.is_some() {
            return Err(VaultError::Internal("Cannot delete while vault is unlocked".to_string()));
        }
        let path = self.vault_path();
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|e| VaultError::Internal(format!("Failed to delete vault: {}", e)))?;
        }
        log::info!("Deleted vault database");
        Ok(())
    }
    
    fn vault_path(&self) -> PathBuf {
        self.data_dir.join("vault.db")
    }
    
    /// Create a new vault with passphrase
    /// 
    /// TRANSACTIONAL: Database is created first, keychain entries stored only on success.
    /// This prevents orphan keychain entries if DB creation fails.
    /// 
    /// Key flow:
    /// 1. Generate random vault key
    /// 2. Generate random salt
    /// 3. Derive KEK from passphrase + salt
    /// 4. Wrap vault key with KEK
    /// 5. Create SQLCipher database with vault key (FIRST)
    /// 6. Initialize schema
    /// 7. Store wrapped key and salt in OS keychain (LAST, only on success)
    pub fn create(&mut self, passphrase: &str) -> Result<(), VaultError> {
        if self.vault_path().exists() {
            return Err(VaultError::AlreadyExists);
        }
        
        // Generate new vault key and salt
        let vault_key = VaultKey::generate();
        let salt = crypto::generate_salt();
        
        // Derive KEK and wrap vault key
        let kek = KEK::derive(passphrase, &salt)?;
        let wrapped = kek.wrap(&vault_key)?;
        
        // Create encrypted database FIRST (before keychain)
        let db_path = self.vault_path();
        let conn = Connection::open(&db_path)?;
        
        // Apply encryption key
        let key_hex = vault_key.as_hex();
        if let Err(e) = conn.pragma_update(None, "key", &format!("x'{}'", key_hex)) {
            // Cleanup: remove partial DB file
            let _ = std::fs::remove_file(&db_path);
            return Err(VaultError::Database(e));
        }
        
        // Initialize schema
        if let Err(e) = self.init_schema(&conn) {
            // Cleanup: remove partial DB file
            drop(conn);
            let _ = std::fs::remove_file(&db_path);
            return Err(e);
        }
        
        // Only store keychain AFTER database is fully initialized
        if let Err(e) = crypto::store_salt(&salt) {
            // Cleanup: remove DB file
            drop(conn);
            let _ = std::fs::remove_file(&db_path);
            return Err(e.into());
        }
        
        if let Err(e) = crypto::store_wrapped_key(&wrapped) {
            // Cleanup: remove DB file and salt
            drop(conn);
            let _ = std::fs::remove_file(&db_path);
            let _ = crypto::clear_keychain();
            return Err(e.into());
        }
        
        self.conn = Some(conn);
        self.vault_key = Some(vault_key);
        
        log::info!("Vault created successfully");
        Ok(())
    }
    
    /// Unlock existing vault with passphrase
    /// 
    /// Key flow:
    /// 1. Retrieve salt from keychain
    /// 2. Derive KEK from passphrase + salt
    /// 3. Retrieve wrapped vault key from keychain
    /// 4. Unwrap vault key using KEK
    /// 5. Open SQLCipher database with vault key
    pub fn unlock(&mut self, passphrase: &str) -> Result<(), VaultError> {
        let state = self.get_state();
        
        match state.state {
            VaultStateType::NoVault => return Err(VaultError::NotInitialized),
            VaultStateType::KeychainLost => return Err(VaultError::KeychainLost),
            VaultStateType::StaleKeychain => return Err(VaultError::StaleKeychain),
            VaultStateType::Unlocked => return Ok(()), // Already unlocked
            VaultStateType::Ready => {} // Proceed with unlock
        }
        
        // Retrieve salt and wrapped key from keychain
        let salt = crypto::retrieve_salt()?;
        let wrapped = crypto::retrieve_wrapped_key()?;
        
        // Derive KEK and unwrap vault key
        let kek = KEK::derive(passphrase, &salt)?;
        let vault_key = kek.unwrap(&wrapped)
            .map_err(|_| VaultError::InvalidPassphrase)?;
        
        // Open encrypted database
        let conn = Connection::open(self.vault_path())?;
        conn.pragma_update(None, "key", &format!("x'{}'", vault_key.as_hex()))?;
        
        // Verify we can read (will fail if wrong key)
        conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))
            .map_err(|_| VaultError::InvalidPassphrase)?;
        
        // Run migrations for schema updates on existing databases
        self.run_migrations(&conn)?;
        
        self.conn = Some(conn);
        self.vault_key = Some(vault_key);
        
        log::info!("Vault unlocked successfully");
        Ok(())
    }
    
    /// Lock vault (clear keys from memory)
    pub fn lock(&mut self) {
        // Keys are zeroized on drop via Zeroize trait
        self.conn = None;
        self.vault_key = None;
        log::info!("Vault locked");
    }
    
    pub fn is_unlocked(&self) -> bool {
        self.conn.is_some() && self.vault_key.is_some()
    }
    
    /// Get database connection (public, for RAG/search operations)
    pub fn get_connection(&self) -> Result<&Connection, VaultError> {
        self.conn.as_ref().ok_or(VaultError::Locked)
    }
    
    fn conn(&self) -> Result<&Connection, VaultError> {
        self.conn.as_ref().ok_or(VaultError::Locked)
    }
    
    /// Initialize database schema (SQLCipher encrypts everything)
    fn init_schema(&self, conn: &Connection) -> Result<(), VaultError> {
        conn.execute_batch(r#"
            -- Clients table
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                session_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                -- Extended profile fields (v4.1.2+)
                date_of_birth TEXT,
                phone TEXT,
                email TEXT,
                emergency_contact TEXT,
                insurance_info TEXT,
                diagnosis_codes TEXT,
                treatment_start_date TEXT,
                referring_provider TEXT,
                notes TEXT
            );
            
            -- Notes table
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                session_date TEXT NOT NULL,
                note_type TEXT NOT NULL,
                raw_input TEXT NOT NULL,
                structured_note TEXT,
                word_count INTEGER,
                status TEXT NOT NULL DEFAULT 'draft',
                
                -- Detection tracking (IDs only, no evidence text)
                detection_ids TEXT,
                attestations TEXT,
                
                -- Provenance
                content_hash TEXT NOT NULL,
                
                signed_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                
                FOREIGN KEY (client_id) REFERENCES clients(id)
            );
            
            -- Embeddings (vectors only, NO chunk text)
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_start INTEGER NOT NULL,
                chunk_end INTEGER NOT NULL,
                vector BLOB NOT NULL,
                model_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );
            
            -- Audit log (PHI-impossible)
            -- SECURITY: No full paths logged (PHI risk), only classifications and hashes
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                sequence INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                outcome TEXT NOT NULL,
                detection_ids TEXT,
                path_class TEXT,          -- For exports: safe/cloud_sync/network_share/removable/unknown
                path_hash TEXT,           -- SHA-256(salt || canonical_path) - not reversible
                previous_hash TEXT NOT NULL,
                entry_hash TEXT NOT NULL
            );
            
            -- Settings
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            -- Session metrics (time tracking for proving value)
            CREATE TABLE IF NOT EXISTS session_metrics (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                method TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                ai_assisted INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                
                FOREIGN KEY (note_id) REFERENCES notes(id),
                FOREIGN KEY (client_id) REFERENCES clients(id)
            );
            
            -- Client documents (uploads: PDF, DOCX, images)
            CREATE TABLE IF NOT EXISTS client_documents (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                content_hash TEXT NOT NULL,
                encrypted_data BLOB NOT NULL,
                ocr_text TEXT,
                description TEXT,
                document_date TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
            CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(session_date);
            CREATE INDEX IF NOT EXISTS idx_embeddings_note ON embeddings(note_id);
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_log(sequence);
            CREATE INDEX IF NOT EXISTS idx_session_metrics_time ON session_metrics(start_time);
            CREATE INDEX IF NOT EXISTS idx_session_metrics_note ON session_metrics(note_id);
            CREATE INDEX IF NOT EXISTS idx_documents_client ON client_documents(client_id);
            CREATE INDEX IF NOT EXISTS idx_documents_date ON client_documents(document_date);
        "#)?;
        
        // Run migrations for existing databases
        self.run_migrations(conn)?;
        
        Ok(())
    }
    
    /// Run database migrations for schema updates
    fn run_migrations(&self, conn: &Connection) -> Result<(), VaultError> {
        log::info!("Running database migrations...");
        
        // Enable foreign keys but allow deferred checking
        conn.execute("PRAGMA foreign_keys = OFF", [])?;
        
        // Migration v4.1.2: Add client profile fields
        // These ALTERs are safe - they add nullable columns to existing tables
        let profile_columns = [
            ("date_of_birth", "TEXT"),
            ("phone", "TEXT"),
            ("email", "TEXT"),
            ("emergency_contact", "TEXT"),
            ("insurance_info", "TEXT"),
            ("diagnosis_codes", "TEXT"),
            ("treatment_start_date", "TEXT"),
            ("referring_provider", "TEXT"),
            ("notes", "TEXT"),
        ];
        
        for (col_name, col_type) in profile_columns {
            // Check if column exists, add if not
            let sql = format!(
                "ALTER TABLE clients ADD COLUMN {} {}",
                col_name, col_type
            );
            // Ignore error if column already exists
            if let Err(e) = conn.execute(&sql, []) {
                log::debug!("Column {} already exists or migration failed: {}", col_name, e);
            }
        }
        
        // CRITICAL: Create client_documents table
        log::info!("Ensuring client_documents table exists...");
        conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS client_documents (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                content_hash TEXT NOT NULL,
                encrypted_data BLOB NOT NULL,
                ocr_text TEXT,
                description TEXT,
                document_date TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_documents_client ON client_documents(client_id);
            CREATE INDEX IF NOT EXISTS idx_documents_date ON client_documents(document_date);
        "#).map_err(|e| {
            log::error!("Failed to create client_documents table: {}", e);
            VaultError::Database(e)
        })?;
        log::info!("client_documents table ready");
        
        // Migration v4.2.4: Add supervisor mode tables
        match conn.execute_batch(r#"
            -- Trainees table
            CREATE TABLE IF NOT EXISTS trainees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                supervisor_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                notes_submitted INTEGER DEFAULT 0,
                notes_approved INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL
            );
            
            -- Note reviews (submission for supervisor review)
            CREATE TABLE IF NOT EXISTS note_reviews (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                trainee_id TEXT NOT NULL,
                supervisor_id TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                submitted_at INTEGER NOT NULL,
                completed_at INTEGER,
                overall_feedback TEXT,
                clinical_accuracy_score INTEGER,
                documentation_quality_score INTEGER,
                created_at INTEGER NOT NULL,
                
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
                FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE
            );
            
            -- Review comments
            CREATE TABLE IF NOT EXISTS review_comments (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                supervisor_id TEXT NOT NULL,
                section TEXT,
                comment_type TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );
            
            -- Indexes for supervisor mode
            CREATE INDEX IF NOT EXISTS idx_trainees_supervisor ON trainees(supervisor_id);
            CREATE INDEX IF NOT EXISTS idx_note_reviews_note ON note_reviews(note_id);
            CREATE INDEX IF NOT EXISTS idx_note_reviews_trainee ON note_reviews(trainee_id);
            CREATE INDEX IF NOT EXISTS idx_note_reviews_status ON note_reviews(status);
            CREATE INDEX IF NOT EXISTS idx_review_comments_note ON review_comments(note_id);
        "#) {
            Ok(_) => log::info!("Supervisor mode tables ready"),
            Err(e) => log::error!("Failed to create supervisor mode tables: {}", e),
        }
        
        // Migration v4.2.5: De-identification audit trail and consultation drafts
        match conn.execute_batch(r#"
            -- De-identification audit trail (45 CFR 164.514(b) compliance)
            CREATE TABLE IF NOT EXISTS deidentification_audits (
                id TEXT PRIMARY KEY,
                note_id TEXT,
                client_id TEXT,
                original_hash TEXT NOT NULL,
                deidentified_hash TEXT NOT NULL,
                identifiers_removed TEXT NOT NULL,  -- JSON array
                category_summary TEXT NOT NULL,     -- JSON object
                method TEXT NOT NULL DEFAULT 'safe_harbor',  -- safe_harbor, expert_determination
                ai_enhanced INTEGER DEFAULT 0,
                user_verified INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                exported_at INTEGER,
                
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
            );
            
            -- Consultation draft queue (for future network sharing)
            CREATE TABLE IF NOT EXISTS consultation_drafts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                deidentified_content TEXT NOT NULL,
                clinical_question TEXT NOT NULL,
                specialties TEXT NOT NULL,         -- JSON array
                urgency TEXT NOT NULL DEFAULT 'routine',
                audit_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',  -- draft, ready, submitted, responded
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                
                FOREIGN KEY (audit_id) REFERENCES deidentification_audits(id) ON DELETE CASCADE
            );
            
            -- Indexes for de-identification
            CREATE INDEX IF NOT EXISTS idx_deid_audits_note ON deidentification_audits(note_id);
            CREATE INDEX IF NOT EXISTS idx_deid_audits_created ON deidentification_audits(created_at);
            CREATE INDEX IF NOT EXISTS idx_consultation_drafts_status ON consultation_drafts(status);
            CREATE INDEX IF NOT EXISTS idx_consultation_drafts_audit ON consultation_drafts(audit_id);
        "#) {
            Ok(_) => log::info!("De-identification tables ready"),
            Err(e) => log::error!("Failed to create de-identification tables: {}", e),
        }
        
        log::info!("Database migrations complete");
        Ok(())
    }
    
    // ============================================
    // Client Operations
    // ============================================
    
    pub fn create_client(&self, display_name: &str) -> Result<Client, VaultError> {
        let conn = self.conn()?;
        
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        
        conn.execute(
            "INSERT INTO clients (id, display_name, status, session_count, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![&id, display_name, "active", 0i32, now, now],
        )?;
        
        Ok(Client {
            id,
            display_name: display_name.to_string(),
            status: "active".to_string(),
            session_count: 0,
            created_at: now,
            updated_at: now,
            date_of_birth: None,
            phone: None,
            email: None,
            emergency_contact: None,
            insurance_info: None,
            diagnosis_codes: None,
            treatment_start_date: None,
            referring_provider: None,
            notes: None,
        })
    }
    
    pub fn list_clients(&self) -> Result<Vec<Client>, VaultError> {
        let conn = self.conn()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, display_name, status, session_count, created_at, updated_at,
                    date_of_birth, phone, email, emergency_contact, insurance_info,
                    diagnosis_codes, treatment_start_date, referring_provider, notes
             FROM clients ORDER BY display_name"
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(Client {
                id: row.get(0)?,
                display_name: row.get(1)?,
                status: row.get(2)?,
                session_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                date_of_birth: row.get(6)?,
                phone: row.get(7)?,
                email: row.get(8)?,
                emergency_contact: row.get(9)?,
                insurance_info: row.get(10)?,
                diagnosis_codes: row.get(11)?,
                treatment_start_date: row.get(12)?,
                referring_provider: row.get(13)?,
                notes: row.get(14)?,
            })
        })?;
        
        rows.collect::<Result<Vec<_>, _>>().map_err(VaultError::from)
    }
    
    pub fn get_client(&self, id: &str) -> Result<Client, VaultError> {
        let conn = self.conn()?;
        
        conn.query_row(
            "SELECT id, display_name, status, session_count, created_at, updated_at,
                    date_of_birth, phone, email, emergency_contact, insurance_info,
                    diagnosis_codes, treatment_start_date, referring_provider, notes
             FROM clients WHERE id = ?1",
            params![id],
            |row| Ok(Client {
                id: row.get(0)?,
                display_name: row.get(1)?,
                status: row.get(2)?,
                session_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                date_of_birth: row.get(6)?,
                phone: row.get(7)?,
                email: row.get(8)?,
                emergency_contact: row.get(9)?,
                insurance_info: row.get(10)?,
                diagnosis_codes: row.get(11)?,
                treatment_start_date: row.get(12)?,
                referring_provider: row.get(13)?,
                notes: row.get(14)?,
            })
        ).map_err(|_| VaultError::NotFound(format!("Client {}", id)))
    }
    
    pub fn update_client(&self, client: &Client) -> Result<Client, VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        
        conn.execute(
            "UPDATE clients SET 
                display_name = ?2,
                status = ?3,
                updated_at = ?4,
                date_of_birth = ?5,
                phone = ?6,
                email = ?7,
                emergency_contact = ?8,
                insurance_info = ?9,
                diagnosis_codes = ?10,
                treatment_start_date = ?11,
                referring_provider = ?12,
                notes = ?13
             WHERE id = ?1",
            params![
                &client.id,
                &client.display_name,
                &client.status,
                now,
                &client.date_of_birth,
                &client.phone,
                &client.email,
                &client.emergency_contact,
                &client.insurance_info,
                &client.diagnosis_codes,
                &client.treatment_start_date,
                &client.referring_provider,
                &client.notes,
            ],
        )?;
        
        self.get_client(&client.id)
    }
    
    /// Helper function to map SQL results to ClientSearchResult
    fn map_client_results<P: rusqlite::Params>(
        &self,
        stmt: &mut rusqlite::Statement,
        params: P,
        matched_fn: impl Fn(&Client) -> Vec<String>,
    ) -> Result<Vec<ClientSearchResult>, VaultError> {
        let rows = stmt.query_map(params, |row| {
            Ok(Client {
                id: row.get(0)?,
                display_name: row.get(1)?,
                status: row.get(2)?,
                session_count: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                date_of_birth: row.get(6)?,
                phone: row.get(7)?,
                email: row.get(8)?,
                emergency_contact: row.get(9)?,
                insurance_info: row.get(10)?,
                diagnosis_codes: row.get(11)?,
                treatment_start_date: row.get(12)?,
                referring_provider: row.get(13)?,
                notes: row.get(14)?,
            })
        })?;
        
        let results: Vec<ClientSearchResult> = rows.flatten().map(|client| {
            let matched_fields: Vec<(String, String)> = matched_fn(&client)
                .into_iter()
                .filter_map(|field| {
                    let value = match field.as_str() {
                        "date_of_birth" => client.date_of_birth.clone(),
                        "created_at" => Some(format!("{}", client.created_at)),
                        "treatment_start_date" => client.treatment_start_date.clone(),
                        "session_count" => Some(format!("{}", client.session_count)),
                        _ => None,
                    };
                    value.map(|v| (field, v))
                })
                .collect();
            ClientSearchResult {
                client,
                matched_fields,
            }
        }).collect();
        
        Ok(results)
    }
    
    /// Search across all clients by profile fields
    /// Supports semantic queries like "older than 30", "high risk", "newest clients"
    pub fn search_clients(&self, query: &str) -> Result<Vec<ClientSearchResult>, VaultError> {
        let conn = self.conn()?;
        let query_lower = query.to_lowercase();
        
        // Check for semantic queries first
        // Age queries: "older than X", "under X", "age > X"
        if query_lower.contains("older than") || query_lower.contains("over ") || query_lower.contains("age >") {
            let age = extract_number(&query_lower).unwrap_or(30);
            let cutoff_year = chrono::Utc::now().year() - age as i32;
            let cutoff_date = format!("{}-12-31", cutoff_year);
            
            let mut stmt = conn.prepare(
                "SELECT id, display_name, status, session_count, created_at, updated_at,
                        date_of_birth, phone, email, emergency_contact, insurance_info,
                        diagnosis_codes, treatment_start_date, referring_provider, notes
                 FROM clients 
                 WHERE date_of_birth IS NOT NULL AND date_of_birth < ?1
                 ORDER BY date_of_birth"
            )?;
            
            return self.map_client_results(&mut stmt, rusqlite::params![cutoff_date], 
                |_| vec!["date_of_birth".to_string()]);
        }
        
        if query_lower.contains("younger than") || query_lower.contains("under ") || query_lower.contains("age <") {
            let age = extract_number(&query_lower).unwrap_or(30);
            let cutoff_year = chrono::Utc::now().year() - age as i32;
            let cutoff_date = format!("{}-01-01", cutoff_year);
            
            let mut stmt = conn.prepare(
                "SELECT id, display_name, status, session_count, created_at, updated_at,
                        date_of_birth, phone, email, emergency_contact, insurance_info,
                        diagnosis_codes, treatment_start_date, referring_provider, notes
                 FROM clients 
                 WHERE date_of_birth IS NOT NULL AND date_of_birth > ?1
                 ORDER BY date_of_birth DESC"
            )?;
            
            return self.map_client_results(&mut stmt, rusqlite::params![cutoff_date],
                |_| vec!["date_of_birth".to_string()]);
        }
        
        // Tenure queries: "newest", "longest", "recent clients"
        if query_lower.contains("newest") || query_lower.contains("recent client") || query_lower.contains("new client") {
            let mut stmt = conn.prepare(
                "SELECT id, display_name, status, session_count, created_at, updated_at,
                        date_of_birth, phone, email, emergency_contact, insurance_info,
                        diagnosis_codes, treatment_start_date, referring_provider, notes
                 FROM clients ORDER BY created_at DESC LIMIT 10"
            )?;
            
            return self.map_client_results(&mut stmt, rusqlite::params![],
                |_| vec!["created_at".to_string()]);
        }
        
        if query_lower.contains("longest") || query_lower.contains("oldest client") || query_lower.contains("veteran") {
            let mut stmt = conn.prepare(
                "SELECT id, display_name, status, session_count, created_at, updated_at,
                        date_of_birth, phone, email, emergency_contact, insurance_info,
                        diagnosis_codes, treatment_start_date, referring_provider, notes
                 FROM clients ORDER BY treatment_start_date ASC, created_at ASC LIMIT 10"
            )?;
            
            return self.map_client_results(&mut stmt, rusqlite::params![],
                |_| vec!["treatment_start_date".to_string()]);
        }
        
        // Most sessions
        if query_lower.contains("most session") || query_lower.contains("frequent") || query_lower.contains("active") {
            let mut stmt = conn.prepare(
                "SELECT id, display_name, status, session_count, created_at, updated_at,
                        date_of_birth, phone, email, emergency_contact, insurance_info,
                        diagnosis_codes, treatment_start_date, referring_provider, notes
                 FROM clients ORDER BY session_count DESC LIMIT 10"
            )?;
            
            return self.map_client_results(&mut stmt, rusqlite::params![],
                |_| vec!["session_count".to_string()]);
        }
        
        // Split query into individual words and filter out common words
        let stop_words = ["the", "a", "an", "is", "are", "was", "were", "named", "called", "pts", "patients", "client", "clients", "find", "search", "for", "with", "who"];
        let words: Vec<String> = query_lower
            .split_whitespace()
            .filter(|w| w.len() >= 2 && !stop_words.contains(&w.to_lowercase().as_str()))
            .map(|w| format!("%{}%", w))
            .collect();
        
        if words.is_empty() {
            // If no valid search words, return all clients
            let mut stmt = conn.prepare(
                "SELECT id, display_name, status, session_count, created_at, updated_at,
                        date_of_birth, phone, email, emergency_contact, insurance_info,
                        diagnosis_codes, treatment_start_date, referring_provider, notes
                 FROM clients ORDER BY display_name"
            )?;
            
            let rows = stmt.query_map([], |row| {
                Ok(Client {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    status: row.get(2)?,
                    session_count: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    date_of_birth: row.get(6)?,
                    phone: row.get(7)?,
                    email: row.get(8)?,
                    emergency_contact: row.get(9)?,
                    insurance_info: row.get(10)?,
                    diagnosis_codes: row.get(11)?,
                    treatment_start_date: row.get(12)?,
                    referring_provider: row.get(13)?,
                    notes: row.get(14)?,
                })
            })?;
            
            let clients: Vec<Client> = rows.collect::<Result<Vec<_>, _>>()?;
            return Ok(clients.into_iter().map(|client| ClientSearchResult {
                client,
                matched_fields: vec![],
            }).collect());
        }
        
        // For each word, build a combined search pattern
        // Use a simpler approach: search for ANY word match
        let search_pattern = words.join("%");
        
        let sql = "SELECT id, display_name, status, session_count, created_at, updated_at,
                          date_of_birth, phone, email, emergency_contact, insurance_info,
                          diagnosis_codes, treatment_start_date, referring_provider, notes
                   FROM clients 
                   WHERE LOWER(display_name) LIKE ?1
                      OR LOWER(COALESCE(phone, '')) LIKE ?1
                      OR LOWER(COALESCE(email, '')) LIKE ?1
                      OR LOWER(COALESCE(insurance_info, '')) LIKE ?1
                      OR LOWER(COALESCE(diagnosis_codes, '')) LIKE ?1
                      OR LOWER(COALESCE(referring_provider, '')) LIKE ?1
                      OR LOWER(COALESCE(notes, '')) LIKE ?1
                      OR LOWER(COALESCE(emergency_contact, '')) LIKE ?1
                   ORDER BY display_name";
        
        // Also try individual words
        let mut all_clients: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut result_clients: Vec<Client> = Vec::new();
        
        for word in &words {
            let mut stmt = conn.prepare(sql)?;
            let rows = stmt.query_map([word], |row| {
                Ok(Client {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    status: row.get(2)?,
                    session_count: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    date_of_birth: row.get(6)?,
                    phone: row.get(7)?,
                    email: row.get(8)?,
                    emergency_contact: row.get(9)?,
                    insurance_info: row.get(10)?,
                    diagnosis_codes: row.get(11)?,
                    treatment_start_date: row.get(12)?,
                    referring_provider: row.get(13)?,
                    notes: row.get(14)?,
                })
            })?;
            
            for client in rows.flatten() {
                if !all_clients.contains(&client.id) {
                    all_clients.insert(client.id.clone());
                    result_clients.push(client);
                }
            }
        }
        
        // Build results with match context
        let query_words: Vec<String> = query
            .to_lowercase()
            .split_whitespace()
            .filter(|w| w.len() >= 2 && !stop_words.contains(&w.to_lowercase().as_str()))
            .map(|s| s.to_string())
            .collect();
        
        let results: Vec<ClientSearchResult> = result_clients.into_iter().map(|client| {
            let mut matched_fields = Vec::new();
            
            for word in &query_words {
                if client.display_name.to_lowercase().contains(word) {
                    matched_fields.push(("name".to_string(), client.display_name.clone()));
                    break;
                }
            }
            if let Some(ref phone) = client.phone {
                for word in &query_words {
                    if phone.to_lowercase().contains(word) {
                        matched_fields.push(("phone".to_string(), phone.clone()));
                        break;
                    }
                }
            }
            if let Some(ref email) = client.email {
                for word in &query_words {
                    if email.to_lowercase().contains(word) {
                        matched_fields.push(("email".to_string(), email.clone()));
                        break;
                    }
                }
            }
            if let Some(ref insurance) = client.insurance_info {
                for word in &query_words {
                    if insurance.to_lowercase().contains(word) {
                        matched_fields.push(("insurance".to_string(), insurance.clone()));
                        break;
                    }
                }
            }
            if let Some(ref diagnosis) = client.diagnosis_codes {
                for word in &query_words {
                    if diagnosis.to_lowercase().contains(word) {
                        matched_fields.push(("diagnosis".to_string(), diagnosis.clone()));
                        break;
                    }
                }
            }
            if let Some(ref provider) = client.referring_provider {
                for word in &query_words {
                    if provider.to_lowercase().contains(word) {
                        matched_fields.push(("referring_provider".to_string(), provider.clone()));
                        break;
                    }
                }
            }
            if let Some(ref notes) = client.notes {
                for word in &query_words {
                    if notes.to_lowercase().contains(word) {
                        matched_fields.push(("notes".to_string(), notes.clone()));
                        break;
                    }
                }
            }
            if let Some(ref emergency) = client.emergency_contact {
                for word in &query_words {
                    if emergency.to_lowercase().contains(word) {
                        matched_fields.push(("emergency_contact".to_string(), emergency.clone()));
                        break;
                    }
                }
            }
            
            ClientSearchResult {
                client,
                matched_fields,
            }
        }).collect();
        
        Ok(results)
    }
    
    /// Get client's last visit date
    pub fn get_client_last_visit(&self, client_id: &str) -> Result<Option<String>, VaultError> {
        let conn = self.conn()?;
        
        let result: Option<String> = conn.query_row(
            "SELECT session_date FROM notes WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 1",
            params![client_id],
            |row| row.get(0)
        ).optional()?;
        
        Ok(result)
    }
    
    /// Get client visit count since a date
    pub fn get_client_visit_count_since(&self, client_id: &str, since_date: &str) -> Result<i32, VaultError> {
        let conn = self.conn()?;
        
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE client_id = ?1 AND session_date >= ?2",
            params![client_id, since_date],
            |row| row.get(0)
        )?;
        
        Ok(count)
    }
    
    // ============================================
    // Note Operations
    // ============================================
    
    /// Sanitize note content by removing dangerous tokens
    /// This strips QA/TRAP tokens, injection attempts, etc.
    fn sanitize_note_content(content: &str) -> String {
        let mut sanitized = content.to_string();
        
        // Remove entire lines containing QA/TRAP marker
        let lines: Vec<&str> = sanitized.lines().collect();
        let filtered_lines: Vec<&str> = lines.into_iter()
            .filter(|line| {
                let lower = line.to_lowercase();
                !lower.contains("qa/trap") &&
                !lower.contains("trap token") &&
                !lower.contains("test token")
            })
            .collect();
        sanitized = filtered_lines.join("\n");
        
        // Remove common injection patterns (case insensitive)
        let dangerous_patterns = [
            r"(?i)\.\.%2f",
            r"(?i)%2e%2e",
            r"(?i)javascript:",
            r"(?i)file:///",
            r"(?i)data:",
            r"(?i)<script",
            r"(?i)onclick=",
            r"(?i)onerror=",
            r"(?i)C:\\Users",
            r"(?i)C:/Users",
            r"(?i)\\x[0-9a-f]{2}",
        ];
        
        for pattern_str in &dangerous_patterns {
            if let Ok(re) = regex::Regex::new(pattern_str) {
                sanitized = re.replace_all(&sanitized, "[REMOVED]").to_string();
            }
        }
        
        // Clean up any resulting empty lines or excessive whitespace
        let lines: Vec<&str> = sanitized.lines()
            .map(|l| l.trim_end())
            .filter(|l| !l.is_empty() || true) // Keep structure
            .collect();
        
        lines.join("\n").trim().to_string()
    }
    
    pub fn create_note(
        &self,
        client_id: &str,
        session_date: &str,
        note_type: NoteType,
        raw_input: &str,
    ) -> Result<Note, VaultError> {
        let conn = self.conn()?;
        
        // Sanitize content before saving
        let sanitized_content = Self::sanitize_note_content(raw_input);
        
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let content_hash = crypto::hash_sha256(sanitized_content.as_bytes());
        let word_count = sanitized_content.split_whitespace().count() as i32;
        
        conn.execute(
            "INSERT INTO notes (id, client_id, session_date, note_type, raw_input, word_count, 
             status, content_hash, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                &id, client_id, session_date, note_type.to_string(), &sanitized_content,
                word_count, "draft", &content_hash, now, now
            ],
        )?;
        
        // Update client session count
        conn.execute(
            "UPDATE clients SET session_count = session_count + 1, updated_at = ?1 WHERE id = ?2",
            params![now, client_id],
        )?;
        
        Ok(Note {
            id,
            client_id: client_id.to_string(),
            session_date: session_date.to_string(),
            note_type,
            raw_input: sanitized_content,
            structured_note: None,
            word_count,
            status: NoteStatus::Draft,
            detection_ids: vec![],
            attestations: vec![],
            content_hash,
            signed_at: None,
            created_at: now,
            updated_at: now,
        })
    }
    
    pub fn get_note(&self, id: &str) -> Result<Note, VaultError> {
        let conn = self.conn()?;
        
        conn.query_row(
            "SELECT id, client_id, session_date, note_type, raw_input, structured_note,
             word_count, status, detection_ids, attestations, content_hash, signed_at, 
             created_at, updated_at FROM notes WHERE id = ?1",
            params![id],
            |row| {
                let detection_ids_json: Option<String> = row.get(8)?;
                let attestations_json: Option<String> = row.get(9)?;
                
                Ok(Note {
                    id: row.get(0)?,
                    client_id: row.get(1)?,
                    session_date: row.get(2)?,
                    note_type: NoteType::from_str(&row.get::<_, String>(3)?),
                    raw_input: row.get(4)?,
                    structured_note: row.get(5)?,
                    word_count: row.get(6)?,
                    status: NoteStatus::from_str(&row.get::<_, String>(7)?),
                    detection_ids: detection_ids_json
                        .map(|j| serde_json::from_str(&j).unwrap_or_default())
                        .unwrap_or_default(),
                    attestations: attestations_json
                        .map(|j| serde_json::from_str(&j).unwrap_or_default())
                        .unwrap_or_default(),
                    content_hash: row.get(10)?,
                    signed_at: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                })
            }
        ).map_err(|_| VaultError::NotFound(format!("Note {}", id)))
    }
    
    pub fn list_notes(&self, client_id: Option<&str>) -> Result<Vec<Note>, VaultError> {
        let conn = self.conn()?;
        
        let sql = match client_id {
            Some(_) => "SELECT id, client_id, session_date, note_type, raw_input, structured_note,
                        word_count, status, detection_ids, attestations, content_hash, signed_at,
                        created_at, updated_at FROM notes WHERE client_id = ?1 ORDER BY session_date DESC",
            None => "SELECT id, client_id, session_date, note_type, raw_input, structured_note,
                     word_count, status, detection_ids, attestations, content_hash, signed_at,
                     created_at, updated_at FROM notes ORDER BY session_date DESC",
        };
        
        let mut stmt = conn.prepare(sql)?;
        
        let row_mapper = |row: &rusqlite::Row| {
            let detection_ids_json: Option<String> = row.get(8)?;
            let attestations_json: Option<String> = row.get(9)?;
            
            Ok(Note {
                id: row.get(0)?,
                client_id: row.get(1)?,
                session_date: row.get(2)?,
                note_type: NoteType::from_str(&row.get::<_, String>(3)?),
                raw_input: row.get(4)?,
                structured_note: row.get(5)?,
                word_count: row.get(6)?,
                status: NoteStatus::from_str(&row.get::<_, String>(7)?),
                detection_ids: detection_ids_json
                    .map(|j| serde_json::from_str(&j).unwrap_or_default())
                    .unwrap_or_default(),
                attestations: attestations_json
                    .map(|j| serde_json::from_str(&j).unwrap_or_default())
                    .unwrap_or_default(),
                content_hash: row.get(10)?,
                signed_at: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        };
        
        let rows = match client_id {
            Some(cid) => stmt.query_map(params![cid], row_mapper)?,
            None => stmt.query_map([], row_mapper)?,
        };
        
        rows.collect::<Result<Vec<_>, _>>().map_err(VaultError::from)
    }
    
    pub fn update_note(&self, id: &str, raw_input: &str) -> Result<Note, VaultError> {
        let conn = self.conn()?;
        
        // Sanitize content
        let sanitized_content = Self::sanitize_note_content(raw_input);
        
        let now = chrono::Utc::now().timestamp_millis();
        let content_hash = crypto::hash_sha256(sanitized_content.as_bytes());
        let word_count = sanitized_content.split_whitespace().count() as i32;
        
        conn.execute(
            "UPDATE notes SET raw_input = ?1, word_count = ?2, content_hash = ?3, updated_at = ?4 
             WHERE id = ?5",
            params![&sanitized_content, word_count, &content_hash, now, id],
        )?;
        
        self.get_note(id)
    }
    
    pub fn update_note_structured(&self, id: &str, structured: &str) -> Result<Note, VaultError> {
        let conn = self.conn()?;
        
        // Sanitize structured content too
        let sanitized = Self::sanitize_note_content(structured);
        
        let now = chrono::Utc::now().timestamp_millis();
        
        conn.execute(
            "UPDATE notes SET structured_note = ?1, updated_at = ?2 WHERE id = ?3",
            params![&sanitized, now, id],
        )?;
        
        self.get_note(id)
    }
    
    pub fn update_note_detections(&self, id: &str, detection_ids: &[String]) -> Result<(), VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        let json = serde_json::to_string(detection_ids)
            .map_err(|e| VaultError::Serialization(e.to_string()))?;
        
        conn.execute(
            "UPDATE notes SET detection_ids = ?1, updated_at = ?2 WHERE id = ?3",
            params![json, now, id],
        )?;
        
        Ok(())
    }
    
    pub fn sign_note(&self, id: &str, attestations_json: &str) -> Result<Note, VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().timestamp_millis();
        
        conn.execute(
            "UPDATE notes SET status = 'signed', attestations = ?1, signed_at = ?2, updated_at = ?2 
             WHERE id = ?3",
            params![attestations_json, now, id],
        )?;
        
        self.get_note(id)
    }
    
    /// Amend a signed note - creates an amendment record and updates content
    /// Signed notes cannot be directly edited, only amended
    pub fn amend_note(&self, id: &str, amendment_text: &str, reason: &str) -> Result<Note, VaultError> {
        let conn = self.conn()?;
        let note = self.get_note(id)?;
        
        // Only signed notes can be amended
        if note.status != NoteStatus::Signed {
            return Err(VaultError::InvalidState("Only signed notes can be amended".to_string()));
        }
        
        let now = chrono::Utc::now().timestamp_millis();
        let sanitized_amendment = Self::sanitize_note_content(amendment_text);
        
        // Format amendment with audit trail
        let amendment_record = format!(
            "\n\n--- AMENDMENT ({}) ---\nReason: {}\nAmended: {}\n\n{}",
            chrono::DateTime::from_timestamp_millis(now)
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S UTC").to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
            reason,
            chrono::DateTime::from_timestamp_millis(now)
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S UTC").to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
            sanitized_amendment
        );
        
        // Append amendment to existing content
        let new_content = format!("{}{}", note.raw_input, amendment_record);
        let new_hash = crypto::hash_sha256(new_content.as_bytes());
        let new_word_count = new_content.split_whitespace().count() as i32;
        
        conn.execute(
            "UPDATE notes SET raw_input = ?1, word_count = ?2, content_hash = ?3, updated_at = ?4, status = 'amended'
             WHERE id = ?5",
            params![&new_content, new_word_count, &new_hash, now, id],
        )?;
        
        // Log the amendment in audit
        crate::audit::log_event(
            &conn,
            crate::models::AuditEventType::NoteUpdated,
            crate::models::AuditResourceType::Note,
            id,
            crate::models::AuditOutcome::Success,
            None, // No detection IDs for amendment
        ).ok(); // Don't fail on audit error
        
        self.get_note(id)
    }
    
    // ============================================
    // Treatment Progress Analysis
    // ============================================
    
    /// Analyze treatment progress for a client based on their session notes
    pub fn get_treatment_progress(&self, client_id: &str) -> Result<TreatmentProgress, VaultError> {
        let conn = self.conn()?;
        let client = self.get_client(client_id)?;
        
        // Get all notes for client ordered by date (include ID for theme linking)
        let mut stmt = conn.prepare(
            "SELECT id, session_date, raw_input, created_at FROM notes 
             WHERE client_id = ?1 
             ORDER BY session_date ASC"
        )?;
        
        let notes: Vec<(String, String, String, i64)> = stmt.query_map(params![client_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?.filter_map(|r| r.ok()).collect();
        
        if notes.is_empty() {
            return Ok(TreatmentProgress {
                client_id: client_id.to_string(),
                client_name: client.display_name,
                total_sessions: 0,
                date_range: None,
                session_frequency: None,
                themes: vec![],
                risk_trajectory: Some("insufficient_data".to_string()),
                ai_summary: None,
            });
        }
        
        let total_sessions = notes.len() as i32;
        let first_date = notes.first().map(|(_, d, _, _)| d.clone());
        let last_date = notes.last().map(|(_, d, _, _)| d.clone());
        
        // Calculate session frequency (average days between sessions)
        let session_frequency = if notes.len() > 1 {
            if let (Some(first), Some(last)) = (&first_date, &last_date) {
                if let (Ok(first_dt), Ok(last_dt)) = (
                    chrono::NaiveDate::parse_from_str(first, "%Y-%m-%d"),
                    chrono::NaiveDate::parse_from_str(last, "%Y-%m-%d")
                ) {
                    let days = (last_dt - first_dt).num_days() as f64;
                    Some(days / (notes.len() - 1) as f64)
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };
        
        // Analyze themes from note content (with note IDs)
        let themes = self.extract_treatment_themes(&notes);
        
        // Determine risk trajectory based on note content patterns
        let notes_for_risk: Vec<(String, String, i64)> = notes.iter()
            .map(|(_, date, content, ts)| (date.clone(), content.clone(), *ts))
            .collect();
        let risk_trajectory = self.analyze_risk_trajectory(&notes_for_risk);
        
        Ok(TreatmentProgress {
            client_id: client_id.to_string(),
            client_name: client.display_name,
            total_sessions,
            date_range: first_date.zip(last_date),
            session_frequency,
            themes,
            risk_trajectory: Some(risk_trajectory),
            ai_summary: None, // Will be populated by AI call if requested
        })
    }
    
    /// Extract treatment themes from session notes (with note ID tracking)
    fn extract_treatment_themes(&self, notes: &[(String, String, String, i64)]) -> Vec<ProgressTheme> {
        // HashMap: theme -> (first_date, count, dates, note_ids)
        let mut themes: std::collections::HashMap<String, (String, i32, Vec<String>, Vec<String>)> = std::collections::HashMap::new();
        
        // Common clinical themes to track
        let theme_keywords = [
            ("anxiety", vec!["anxiety", "anxious", "worry", "panic", "nervous"]),
            ("depression", vec!["depression", "depressed", "sad", "hopeless", "low mood"]),
            ("sleep", vec!["sleep", "insomnia", "tired", "fatigue", "rest"]),
            ("relationships", vec!["relationship", "family", "partner", "spouse", "conflict"]),
            ("work_stress", vec!["work", "job", "career", "boss", "coworker"]),
            ("trauma", vec!["trauma", "ptsd", "flashback", "nightmare", "abuse"]),
            ("suicidal_ideation", vec!["si", "suicidal", "suicide", "self-harm", "kill myself", "end my life"]),
            ("substance_use", vec!["alcohol", "drinking", "drug", "substance", "using"]),
            ("coping", vec!["coping", "skills", "breathing", "grounding", "mindfulness"]),
            ("medication", vec!["medication", "med", "prescription", "dose", "side effect"]),
        ];
        
        for (note_id, date, content, _) in notes {
            let content_lower = content.to_lowercase();
            
            for (theme_name, keywords) in &theme_keywords {
                let mentioned = keywords.iter().any(|kw| content_lower.contains(kw));
                if mentioned {
                    let entry = themes.entry(theme_name.to_string())
                        .or_insert_with(|| (date.clone(), 0, vec![], vec![]));
                    entry.1 += 1;
                    entry.2.push(date.clone());
                    // Add note_id if not already in list
                    if !entry.3.contains(note_id) {
                        entry.3.push(note_id.clone());
                    }
                }
            }
        }
        
        // Convert to ProgressTheme with trend analysis and note IDs
        themes.into_iter().map(|(theme, (first_date, count, dates, note_ids))| {
            let trend = self.calculate_theme_trend(&dates, notes.len());
            ProgressTheme {
                theme,
                first_mentioned: first_date,
                mention_count: count,
                trend,
                note_ids,
            }
        }).collect()
    }
    
    /// Calculate trend for a theme based on when it appears in session sequence
    fn calculate_theme_trend(&self, dates: &[String], total_sessions: usize) -> String {
        if dates.len() < 2 {
            return "insufficient_data".to_string();
        }
        
        // Simple trend: compare first half vs second half mentions
        let midpoint = total_sessions / 2;
        let early_mentions = dates.iter().filter(|d| {
            // Rough comparison - actual implementation would use proper date parsing
            dates.iter().position(|x| x == *d).unwrap_or(0) < midpoint
        }).count();
        let late_mentions = dates.len() - early_mentions;
        
        if late_mentions == 0 && early_mentions > 0 {
            "resolved".to_string()
        } else if late_mentions > early_mentions * 2 {
            "worsening".to_string()
        } else if early_mentions > late_mentions * 2 {
            "improving".to_string()
        } else {
            "stable".to_string()
        }
    }
    
    /// Analyze overall risk trajectory
    fn analyze_risk_trajectory(&self, notes: &[(String, String, i64)]) -> String {
        if notes.len() < 3 {
            return "insufficient_data".to_string();
        }
        
        let risk_keywords = ["suicidal", "si", "self-harm", "kill", "end my life", "hopeless", "worthless"];
        
        // Count risk mentions in first third vs last third
        let third = notes.len() / 3;
        let early_notes = &notes[..third];
        let late_notes = &notes[notes.len() - third..];
        
        let early_risk = early_notes.iter()
            .filter(|(_, content, _)| {
                let lower = content.to_lowercase();
                risk_keywords.iter().any(|kw| lower.contains(kw))
            })
            .count();
            
        let late_risk = late_notes.iter()
            .filter(|(_, content, _)| {
                let lower = content.to_lowercase();
                risk_keywords.iter().any(|kw| lower.contains(kw))
            })
            .count();
        
        if late_risk == 0 && early_risk > 0 {
            "improving".to_string()
        } else if late_risk > early_risk {
            "concerning".to_string()
        } else if early_risk > late_risk {
            "improving".to_string()
        } else {
            "stable".to_string()
        }
    }
    
    // ============================================
    // Metrics
    // ============================================
    
    pub fn get_counts(&self) -> Result<(i32, i32), VaultError> {
        let conn = self.conn()?;
        
        let client_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM clients",
            [],
            |row| row.get(0),
        )?;
        
        let note_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM notes",
            [],
            |row| row.get(0),
        )?;
        
        Ok((client_count, note_count))
    }
    
    // ============================================
    // Session Metrics (Time Tracking)
    // ============================================
    
    /// Record a session timing metric
    pub fn record_session_metric(
        &self,
        note_id: &str,
        client_id: &str,
        start_time: i64,
        end_time: i64,
        method: &str,
        word_count: i32,
        ai_assisted: bool,
    ) -> Result<String, VaultError> {
        let conn = self.conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        
        conn.execute(
            "INSERT INTO session_metrics (id, note_id, client_id, start_time, end_time, method, word_count, ai_assisted, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![id, note_id, client_id, start_time, end_time, method, word_count, ai_assisted as i32, now],
        )?;
        
        Ok(id)
    }
    
    /// Get session metrics for a time period
    pub fn get_session_metrics(&self, since_timestamp: i64) -> Result<Vec<SessionMetricRow>, VaultError> {
        let conn = self.conn()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, note_id, client_id, start_time, end_time, method, word_count, ai_assisted, created_at
             FROM session_metrics
             WHERE start_time >= ?1
             ORDER BY start_time DESC"
        )?;
        
        let rows = stmt.query_map([since_timestamp], |row| {
            Ok(SessionMetricRow {
                id: row.get(0)?,
                note_id: row.get(1)?,
                client_id: row.get(2)?,
                start_time: row.get(3)?,
                end_time: row.get(4)?,
                method: row.get(5)?,
                word_count: row.get(6)?,
                ai_assisted: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
            })
        })?;
        
        rows.collect::<Result<Vec<_>, _>>().map_err(VaultError::from)
    }
    
    /// Get aggregated metrics summary
    pub fn get_metrics_summary(&self, since_timestamp: i64) -> Result<MetricsSummary, VaultError> {
        let conn = self.conn()?;
        
        let (total_notes, total_time, voice_count, typed_count, ai_assisted_count): (i32, i64, i32, i32, i32) = conn.query_row(
            "SELECT 
                COUNT(*) as total_notes,
                COALESCE(SUM(end_time - start_time), 0) as total_time,
                COALESCE(SUM(CASE WHEN method = 'voice' THEN 1 ELSE 0 END), 0) as voice_count,
                COALESCE(SUM(CASE WHEN method = 'typed' THEN 1 ELSE 0 END), 0) as typed_count,
                COALESCE(SUM(ai_assisted), 0) as ai_assisted_count
             FROM session_metrics
             WHERE start_time >= ?1",
            [since_timestamp],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )?;
        
        let avg_time = if total_notes > 0 { total_time as f64 / total_notes as f64 } else { 0.0 };
        
        // Industry benchmark is 15 minutes (900 seconds) per note
        let benchmark_seconds = 900_i64;
        let time_saved = (total_notes as i64 * benchmark_seconds) - total_time;
        
        Ok(MetricsSummary {
            total_notes: total_notes as u32,
            total_time_seconds: total_time as u64,
            avg_time_seconds: avg_time,
            voice_count: voice_count as u32,
            typed_count: typed_count as u32,
            ai_assisted_count: ai_assisted_count as u32,
            estimated_time_saved_seconds: time_saved,
        })
    }
    
    // ============================================
    // Document Management
    // ============================================
    
    /// Upload a document for a client
    pub fn upload_document(
        &self,
        client_id: &str,
        filename: &str,
        file_type: &str,
        mime_type: &str,
        data: &[u8],
        description: Option<&str>,
        document_date: Option<&str>,
    ) -> Result<ClientDocument, VaultError> {
        let conn = self.conn()?;
        
        // Generate ID and hash
        let id = uuid::Uuid::new_v4().to_string();
        use sha2::{Sha256, Digest};
        let content_hash = format!("{:x}", Sha256::digest(data));
        let now = chrono::Utc::now().timestamp();
        let file_size = data.len() as i64;
        
        // Store encrypted data (SQLCipher handles encryption)
        conn.execute(
            "INSERT INTO client_documents 
             (id, client_id, filename, file_type, mime_type, file_size, content_hash, encrypted_data, ocr_text, description, document_date, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            rusqlite::params![
                id, client_id, filename, file_type, mime_type, file_size, content_hash, 
                data, None::<String>, description, document_date, now, now
            ],
        )?;
        
        Ok(ClientDocument {
            id,
            client_id: client_id.to_string(),
            filename: filename.to_string(),
            file_type: file_type.to_string(),
            mime_type: mime_type.to_string(),
            file_size,
            content_hash,
            ocr_text: None,
            description: description.map(|s| s.to_string()),
            document_date: document_date.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
        })
    }
    
    /// Get documents for a client
    pub fn list_documents(&self, client_id: &str) -> Result<Vec<ClientDocument>, VaultError> {
        let conn = self.conn()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, client_id, filename, file_type, mime_type, file_size, content_hash, 
                    ocr_text, description, document_date, created_at, updated_at
             FROM client_documents
             WHERE client_id = ?1
             ORDER BY created_at DESC"
        )?;
        
        let rows = stmt.query_map([client_id], |row| {
            Ok(ClientDocument {
                id: row.get(0)?,
                client_id: row.get(1)?,
                filename: row.get(2)?,
                file_type: row.get(3)?,
                mime_type: row.get(4)?,
                file_size: row.get(5)?,
                content_hash: row.get(6)?,
                ocr_text: row.get(7)?,
                description: row.get(8)?,
                document_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;
        
        rows.collect::<Result<Vec<_>, _>>().map_err(VaultError::from)
    }
    
    /// Get document data
    pub fn get_document_data(&self, document_id: &str) -> Result<Vec<u8>, VaultError> {
        let conn = self.conn()?;
        
        let data: Vec<u8> = conn.query_row(
            "SELECT encrypted_data FROM client_documents WHERE id = ?1",
            [document_id],
            |row| row.get(0),
        )?;
        
        Ok(data)
    }
    
    /// Update document OCR text
    pub fn update_document_ocr(&self, document_id: &str, ocr_text: &str) -> Result<(), VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().timestamp();
        
        conn.execute(
            "UPDATE client_documents SET ocr_text = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![ocr_text, now, document_id],
        )?;
        
        Ok(())
    }
    
    /// Delete a document
    pub fn delete_document(&self, document_id: &str) -> Result<(), VaultError> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM client_documents WHERE id = ?1", [document_id])?;
        Ok(())
    }
    
    /// Search documents by OCR text
    pub fn search_documents(&self, query: &str) -> Result<Vec<ClientDocument>, VaultError> {
        let conn = self.conn()?;
        let search_pattern = format!("%{}%", query.to_lowercase());
        
        let mut stmt = conn.prepare(
            "SELECT id, client_id, filename, file_type, mime_type, file_size, content_hash, 
                    ocr_text, description, document_date, created_at, updated_at
             FROM client_documents
             WHERE LOWER(ocr_text) LIKE ?1 
                OR LOWER(filename) LIKE ?1 
                OR LOWER(description) LIKE ?1
             ORDER BY created_at DESC"
        )?;
        
        let rows = stmt.query_map([&search_pattern], |row| {
            Ok(ClientDocument {
                id: row.get(0)?,
                client_id: row.get(1)?,
                filename: row.get(2)?,
                file_type: row.get(3)?,
                mime_type: row.get(4)?,
                file_size: row.get(5)?,
                content_hash: row.get(6)?,
                ocr_text: row.get(7)?,
                description: row.get(8)?,
                document_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;
        
        rows.collect::<Result<Vec<_>, _>>().map_err(VaultError::from)
    }
    
    /// Get storage statistics
    pub fn get_storage_stats(&self) -> Result<StorageStats, VaultError> {
        let conn = self.conn()?;
        
        // Get database file size
        let db_size = std::fs::metadata(&self.vault_path())
            .map(|m| m.len() as i64)
            .unwrap_or(0);
        
        // Count records
        let note_count: i64 = conn.query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))?;
        let client_count: i64 = conn.query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))?;
        let doc_count: i64 = conn.query_row("SELECT COUNT(*) FROM client_documents", [], |row| row.get(0)).unwrap_or(0);
        let doc_size: i64 = conn.query_row("SELECT COALESCE(SUM(file_size), 0) FROM client_documents", [], |row| row.get(0)).unwrap_or(0);
        let embedding_count: i64 = conn.query_row("SELECT COUNT(*) FROM embeddings", [], |row| row.get(0))?;
        
        Ok(StorageStats {
            database_size_bytes: db_size,
            note_count: note_count as u32,
            client_count: client_count as u32,
            document_count: doc_count as u32,
            document_size_bytes: doc_size,
            embedding_count: embedding_count as u32,
        })
    }
    
    /// Optimize database (VACUUM)
    pub fn optimize_database(&self) -> Result<(), VaultError> {
        let conn = self.conn()?;
        conn.execute("VACUUM", [])?;
        conn.execute("ANALYZE", [])?;
        Ok(())
    }
    
    // ============================================
    // Pre-Session Prep Sheet
    // ============================================
    
    pub fn generate_prep_sheet(&self, client_id: &str) -> Result<crate::models::PrepSheet, VaultError> {
        use crate::models::*;
        
        let conn = self.conn()?;
        let client = self.get_client(client_id)?;
        let now = chrono::Utc::now();
        
        // Get demographics
        let age = client.date_of_birth.as_ref().and_then(|dob| {
            chrono::NaiveDate::parse_from_str(dob, "%Y-%m-%d").ok().map(|d| {
                let today = now.date_naive();
                today.years_since(d).unwrap_or(0) as i32
            })
        });
        
        let treatment_duration = client.treatment_start_date.as_ref().and_then(|start| {
            chrono::NaiveDate::parse_from_str(start, "%Y-%m-%d").ok().map(|d| {
                (now.date_naive() - d).num_days() as i32
            })
        });
        
        // Get recent notes (last 5)
        let mut stmt = conn.prepare(
            "SELECT id, session_date, note_type, raw_input FROM notes 
             WHERE client_id = ?1 ORDER BY session_date DESC LIMIT 5"
        )?;
        let notes: Vec<(String, String, String, String)> = stmt.query_map([client_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?.filter_map(|r| r.ok()).collect();
        
        let last_session_date = notes.first().map(|(_, d, _, _)| d.clone());
        let days_since_last = last_session_date.as_ref().and_then(|d| {
            chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok().map(|date| {
                (now.date_naive() - date).num_days() as i32
            })
        });
        
        // Build recent session summaries
        let recent_sessions: Vec<RecentSessionSummary> = notes.iter().take(3).map(|(_, date, note_type, content)| {
            let key_points = extract_key_points(content);
            let mood_indicators = extract_mood_indicators(content);
            let interventions = extract_interventions(content);
            
            RecentSessionSummary {
                session_date: date.clone(),
                note_type: note_type.clone(),
                key_points,
                mood_indicators,
                interventions_used: interventions,
            }
        }).collect();
        
        // Get treatment themes
        let progress = self.get_treatment_progress(client_id)?;
        let active_themes: Vec<PrepTheme> = progress.themes.iter()
            .filter(|t| t.trend != "resolved")
            .map(|t| PrepTheme {
                theme: t.theme.clone(),
                trend: t.trend.clone(),
                last_mentioned: t.first_mentioned.clone(),
                clinical_note: None,
            })
            .collect();
        
        // Check for safety alerts in recent notes
        let mut safety_alerts = Vec::new();
        for (_, date, _, content) in &notes {
            let content_lower = content.to_lowercase();
            if content_lower.contains("suicidal") || content_lower.contains("si ") || content_lower.contains("suicide") {
                safety_alerts.push(SafetyAlert {
                    alert_type: "suicidal_ideation".to_string(),
                    last_flagged: date.clone(),
                    severity: "high".to_string(),
                    details: "Suicidal ideation mentioned in recent note".to_string(),
                });
            }
            if content_lower.contains("self-harm") || content_lower.contains("cutting") {
                safety_alerts.push(SafetyAlert {
                    alert_type: "self_harm".to_string(),
                    last_flagged: date.clone(),
                    severity: "high".to_string(),
                    details: "Self-harm mentioned in recent note".to_string(),
                });
            }
            if content_lower.contains("abuse") || content_lower.contains("violent") {
                safety_alerts.push(SafetyAlert {
                    alert_type: "abuse_concern".to_string(),
                    last_flagged: date.clone(),
                    severity: "moderate".to_string(),
                    details: "Abuse or violence mentioned".to_string(),
                });
            }
        }
        safety_alerts.dedup_by(|a, b| a.alert_type == b.alert_type);
        
        // Suggest assessments based on themes
        let mut suggested_assessments = Vec::new();
        let theme_names: Vec<&str> = active_themes.iter().map(|t| t.theme.as_str()).collect();
        
        if theme_names.iter().any(|t| t.contains("depression")) {
            suggested_assessments.push(AssessmentSuggestion {
                assessment_name: "PHQ-9".to_string(),
                reason: "Depression theme identified - consider screening".to_string(),
                last_administered: None,
                last_score: None,
            });
        }
        if theme_names.iter().any(|t| t.contains("anxiety")) {
            suggested_assessments.push(AssessmentSuggestion {
                assessment_name: "GAD-7".to_string(),
                reason: "Anxiety theme identified - consider screening".to_string(),
                last_administered: None,
                last_score: None,
            });
        }
        if !safety_alerts.is_empty() {
            suggested_assessments.push(AssessmentSuggestion {
                assessment_name: "C-SSRS".to_string(),
                reason: "Safety concerns flagged - consider risk assessment".to_string(),
                last_administered: None,
                last_score: None,
            });
        }
        if theme_names.iter().any(|t| t.contains("trauma")) {
            suggested_assessments.push(AssessmentSuggestion {
                assessment_name: "PCL-5".to_string(),
                reason: "Trauma theme identified - consider PTSD screening".to_string(),
                last_administered: None,
                last_score: None,
            });
        }
        
        // Generate focus suggestions
        let mut focus_suggestions = Vec::new();
        if days_since_last.map(|d| d > 14).unwrap_or(false) {
            focus_suggestions.push("Consider checking in on progress since last session (extended gap)".to_string());
        }
        if !safety_alerts.is_empty() {
            focus_suggestions.push("Review safety plan and assess current risk level".to_string());
        }
        for theme in &active_themes {
            if theme.trend == "worsening" {
                focus_suggestions.push(format!("Address {} - trend appears worsening", theme.theme.replace("_", " ")));
            }
        }
        if focus_suggestions.is_empty() {
            focus_suggestions.push("Continue current treatment approach".to_string());
        }
        
        Ok(PrepSheet {
            client_id: client_id.to_string(),
            client_name: client.display_name,
            generated_at: now.format("%Y-%m-%d %H:%M").to_string(),
            demographics: PrepDemographics {
                age,
                treatment_duration_days: treatment_duration,
                total_sessions: client.session_count,
                last_session_date,
                days_since_last_session: days_since_last,
                diagnosis_codes: client.diagnosis_codes,
            },
            recent_sessions,
            active_themes,
            safety_alerts,
            suggested_assessments,
            focus_suggestions,
            last_assessments: vec![],  // Would need separate assessment tracking
        })
    }
    
    // ============================================
    // Supervisor Mode
    // ============================================
    
    pub fn create_trainee(&self, name: &str, email: Option<&str>, supervisor_id: &str) -> Result<crate::models::Trainee, VaultError> {
        let conn = self.conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now();
        
        conn.execute(
            "INSERT INTO trainees (id, name, email, supervisor_id, start_date, status, notes_submitted, notes_approved, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, ?7)",
            rusqlite::params![id, name, email, supervisor_id, now.format("%Y-%m-%d").to_string(), "active", now.timestamp()],
        )?;
        
        Ok(crate::models::Trainee {
            id,
            name: name.to_string(),
            email: email.map(|s| s.to_string()),
            supervisor_id: supervisor_id.to_string(),
            start_date: now.format("%Y-%m-%d").to_string(),
            status: "active".to_string(),
            notes_submitted: 0,
            notes_approved: 0,
            created_at: now.timestamp(),
        })
    }
    
    pub fn list_trainees(&self, supervisor_id: &str) -> Result<Vec<crate::models::Trainee>, VaultError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, email, supervisor_id, start_date, status, notes_submitted, notes_approved, created_at
             FROM trainees WHERE supervisor_id = ?1"
        )?;
        
        let trainees = stmt.query_map([supervisor_id], |row| {
            Ok(crate::models::Trainee {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                supervisor_id: row.get(3)?,
                start_date: row.get(4)?,
                status: row.get(5)?,
                notes_submitted: row.get(6)?,
                notes_approved: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        Ok(trainees)
    }
    
    pub fn submit_note_for_review(&self, note_id: &str, trainee_id: &str) -> Result<(), VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().timestamp();
        let review_id = uuid::Uuid::new_v4().to_string();
        
        conn.execute(
            "INSERT INTO note_reviews (id, note_id, trainee_id, status, submitted_at, created_at)
             VALUES (?1, ?2, ?3, 'pending', ?4, ?5)",
            rusqlite::params![review_id, note_id, trainee_id, now, now],
        )?;
        
        // Update trainee stats
        conn.execute(
            "UPDATE trainees SET notes_submitted = notes_submitted + 1 WHERE id = ?1",
            [trainee_id],
        )?;
        
        Ok(())
    }
    
    pub fn get_pending_reviews(&self, supervisor_id: &str) -> Result<Vec<crate::models::PendingReview>, VaultError> {
        let conn = self.conn()?;
        
        let mut stmt = conn.prepare(
            "SELECT nr.note_id, t.name, c.display_name, n.session_date, nr.submitted_at
             FROM note_reviews nr
             JOIN trainees t ON nr.trainee_id = t.id
             JOIN notes n ON nr.note_id = n.id
             JOIN clients c ON n.client_id = c.id
             WHERE t.supervisor_id = ?1 AND nr.status = 'pending'
             ORDER BY nr.submitted_at ASC"
        )?;
        
        let now = chrono::Utc::now().timestamp();
        let reviews = stmt.query_map([supervisor_id], |row| {
            let submitted_at: i64 = row.get(4)?;
            let days_pending = ((now - submitted_at) / 86400) as i32;
            Ok(crate::models::PendingReview {
                note_id: row.get(0)?,
                trainee_name: row.get(1)?,
                client_name: row.get(2)?,
                session_date: row.get(3)?,
                submitted_at: chrono::DateTime::from_timestamp(submitted_at, 0)
                    .map(|dt| dt.format("%Y-%m-%d").to_string())
                    .unwrap_or_default(),
                days_pending,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        Ok(reviews)
    }
    
    /// Get pending reviews for a specific trainee
    pub fn get_trainee_pending_reviews(&self, trainee_id: &str) -> Result<Vec<crate::models::PendingReview>, VaultError> {
        let conn = self.conn()?;
        
        let mut stmt = conn.prepare(
            "SELECT nr.note_id, t.name, c.display_name, n.session_date, nr.submitted_at
             FROM note_reviews nr
             JOIN trainees t ON nr.trainee_id = t.id
             JOIN notes n ON nr.note_id = n.id
             JOIN clients c ON n.client_id = c.id
             WHERE nr.trainee_id = ?1 AND nr.status = 'pending'
             ORDER BY nr.submitted_at ASC"
        )?;
        
        let now = chrono::Utc::now().timestamp();
        let reviews = stmt.query_map([trainee_id], |row| {
            let submitted_at: i64 = row.get(4)?;
            let days_pending = ((now - submitted_at) / 86400) as i32;
            Ok(crate::models::PendingReview {
                note_id: row.get(0)?,
                trainee_name: row.get(1)?,
                client_name: row.get(2)?,
                session_date: row.get(3)?,
                submitted_at: chrono::DateTime::from_timestamp(submitted_at, 0)
                    .map(|dt| dt.format("%Y-%m-%d").to_string())
                    .unwrap_or_default(),
                days_pending,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        Ok(reviews)
    }
    
    pub fn add_review_comment(
        &self,
        note_id: &str,
        supervisor_id: &str,
        comment_type: &str,
        text: &str,
        section: Option<&str>,
    ) -> Result<crate::models::ReviewComment, VaultError> {
        let conn = self.conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        
        conn.execute(
            "INSERT INTO review_comments (id, note_id, supervisor_id, section, comment_type, text, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, note_id, supervisor_id, section, comment_type, text, now],
        )?;
        
        Ok(crate::models::ReviewComment {
            id,
            section: section.map(|s| s.to_string()),
            comment_type: comment_type.to_string(),
            text: text.to_string(),
            created_at: now,
        })
    }
    
    pub fn complete_review(
        &self,
        note_id: &str,
        supervisor_id: &str,
        status: &str,
        overall_feedback: Option<&str>,
        clinical_accuracy_score: Option<i32>,
        documentation_quality_score: Option<i32>,
    ) -> Result<crate::models::SupervisorReview, VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now();
        let review_id = uuid::Uuid::new_v4().to_string();
        
        // Update the review record
        conn.execute(
            "UPDATE note_reviews SET status = ?1, completed_at = ?2, supervisor_id = ?3,
             overall_feedback = ?4, clinical_accuracy_score = ?5, documentation_quality_score = ?6
             WHERE note_id = ?7 AND status = 'pending'",
            rusqlite::params![status, now.timestamp(), supervisor_id, overall_feedback, 
                            clinical_accuracy_score, documentation_quality_score, note_id],
        )?;
        
        // If approved, update trainee stats
        if status == "approved" {
            conn.execute(
                "UPDATE trainees SET notes_approved = notes_approved + 1 
                 WHERE id = (SELECT trainee_id FROM note_reviews WHERE note_id = ?1)",
                [note_id],
            )?;
        }
        
        // Get comments for this review
        let mut stmt = conn.prepare(
            "SELECT id, section, comment_type, text, created_at FROM review_comments WHERE note_id = ?1"
        )?;
        let comments: Vec<crate::models::ReviewComment> = stmt.query_map([note_id], |row| {
            Ok(crate::models::ReviewComment {
                id: row.get(0)?,
                section: row.get(1)?,
                comment_type: row.get(2)?,
                text: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        Ok(crate::models::SupervisorReview {
            id: review_id,
            note_id: note_id.to_string(),
            supervisor_id: supervisor_id.to_string(),
            supervisor_name: supervisor_id.to_string(),  // Would need lookup
            review_date: now.format("%Y-%m-%d").to_string(),
            status: status.to_string(),
            comments,
            overall_feedback: overall_feedback.map(|s| s.to_string()),
            clinical_accuracy_score,
            documentation_quality_score,
            created_at: now.timestamp(),
        })
    }
    
    pub fn get_supervisor_dashboard(&self, supervisor_id: &str) -> Result<crate::models::SupervisorDashboard, VaultError> {
        let trainees = self.list_trainees(supervisor_id)?;
        let pending_reviews = self.get_pending_reviews(supervisor_id)?;
        
        let trainee_summaries: Vec<crate::models::TraineeSummary> = trainees.into_iter().map(|t| {
            crate::models::TraineeSummary {
                pending_notes: pending_reviews.iter().filter(|r| r.trainee_name == t.name).count() as i32,
                avg_quality_score: None,  // Would calculate from completed reviews
                last_submission: None,
                trainee: t,
            }
        }).collect();
        
        Ok(crate::models::SupervisorDashboard {
            supervisor_id: supervisor_id.to_string(),
            trainees: trainee_summaries,
            pending_reviews,
            recent_activity: vec![],
        })
    }
    
    pub fn get_note_reviews(&self, note_id: &str) -> Result<Vec<crate::models::SupervisorReview>, VaultError> {
        let conn = self.conn()?;
        
        let mut stmt = conn.prepare(
            "SELECT nr.id, nr.note_id, nr.supervisor_id, nr.status, nr.overall_feedback,
                    nr.clinical_accuracy_score, nr.documentation_quality_score, nr.created_at, nr.completed_at
             FROM note_reviews nr WHERE nr.note_id = ?1"
        )?;
        
        let reviews = stmt.query_map([note_id], |row| {
            let created_at: i64 = row.get(7)?;
            Ok(crate::models::SupervisorReview {
                id: row.get(0)?,
                note_id: row.get(1)?,
                supervisor_id: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                supervisor_name: String::new(),
                review_date: chrono::DateTime::from_timestamp(created_at, 0)
                    .map(|dt| dt.format("%Y-%m-%d").to_string())
                    .unwrap_or_default(),
                status: row.get(3)?,
                comments: vec![],
                overall_feedback: row.get(4)?,
                clinical_accuracy_score: row.get(5)?,
                documentation_quality_score: row.get(6)?,
                created_at,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        Ok(reviews)
    }
    
    // ============================================
    // De-identification Audit Trail
    // ============================================
    
    pub fn save_deidentification_audit(
        &self,
        note_id: Option<&str>,
        client_id: Option<&str>,
        result: &crate::deidentify::DeidentificationResult,
        ai_enhanced: bool,
    ) -> Result<crate::deidentify::DeidentificationAudit, VaultError> {
        let conn = self.conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        
        // Build identifiers removed list
        let identifiers_removed: Vec<crate::deidentify::AuditedIdentifier> = result.identifiers_found.iter()
            .map(|i| crate::deidentify::AuditedIdentifier {
                category_code: i.category.code().to_string(),
                category_name: i.category.description().to_string(),
                position: i.start_pos,
                length: i.end_pos - i.start_pos,
                replacement_type: "redact".to_string(),
            })
            .collect();
        
        let identifiers_json = serde_json::to_string(&identifiers_removed).unwrap_or_default();
        let category_json = serde_json::to_string(&result.category_counts).unwrap_or_default();
        
        conn.execute(
            "INSERT INTO deidentification_audits 
             (id, note_id, client_id, original_hash, deidentified_hash, identifiers_removed, 
              category_summary, method, ai_enhanced, user_verified, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                id, note_id, client_id, 
                result.original_hash, result.deidentified_hash,
                identifiers_json, category_json,
                "safe_harbor", ai_enhanced, false, now
            ],
        )?;
        
        Ok(crate::deidentify::DeidentificationAudit {
            id,
            note_id: note_id.map(|s| s.to_string()),
            client_id: client_id.map(|s| s.to_string()),
            original_hash: result.original_hash.clone(),
            deidentified_hash: result.deidentified_hash.clone(),
            identifiers_removed,
            category_summary: result.category_counts.clone(),
            method: "safe_harbor".to_string(),
            ai_enhanced,
            user_verified: false,
            created_at: now,
            exported_at: None,
        })
    }
    
    pub fn get_deidentification_audits(
        &self,
        note_id: Option<&str>,
    ) -> Result<Vec<crate::deidentify::DeidentificationAudit>, VaultError> {
        let conn = self.conn()?;
        
        let sql = match note_id {
            Some(_) => "SELECT id, note_id, client_id, original_hash, deidentified_hash, 
                        identifiers_removed, category_summary, method, ai_enhanced, 
                        user_verified, created_at, exported_at
                        FROM deidentification_audits WHERE note_id = ?1 ORDER BY created_at DESC",
            None => "SELECT id, note_id, client_id, original_hash, deidentified_hash, 
                     identifiers_removed, category_summary, method, ai_enhanced, 
                     user_verified, created_at, exported_at
                     FROM deidentification_audits ORDER BY created_at DESC",
        };
        
        let mut stmt = conn.prepare(sql)?;
        
        let audits = if let Some(nid) = note_id {
            stmt.query_map([nid], Self::map_audit_row)?
        } else {
            stmt.query_map([], Self::map_audit_row)?
        };
        
        Ok(audits.filter_map(|r| r.ok()).collect())
    }
    
    fn map_audit_row(row: &rusqlite::Row) -> rusqlite::Result<crate::deidentify::DeidentificationAudit> {
        let identifiers_json: String = row.get(5)?;
        let category_json: String = row.get(6)?;
        
        let identifiers: Vec<crate::deidentify::AuditedIdentifier> = 
            serde_json::from_str(&identifiers_json).unwrap_or_default();
        let categories: std::collections::HashMap<String, i32> = 
            serde_json::from_str(&category_json).unwrap_or_default();
        
        Ok(crate::deidentify::DeidentificationAudit {
            id: row.get(0)?,
            note_id: row.get(1)?,
            client_id: row.get(2)?,
            original_hash: row.get(3)?,
            deidentified_hash: row.get(4)?,
            identifiers_removed: identifiers,
            category_summary: categories,
            method: row.get(7)?,
            ai_enhanced: row.get(8)?,
            user_verified: row.get(9)?,
            created_at: row.get(10)?,
            exported_at: row.get(11)?,
        })
    }
    
    // ============================================
    // Consultation Draft Queue
    // ============================================
    
    pub fn create_consultation_draft(
        &self,
        deidentified_content: &str,
        title: &str,
        clinical_question: &str,
        specialties: &[String],
        urgency: &str,
        audit_id: &str,
    ) -> Result<crate::deidentify::ConsultationDraft, VaultError> {
        let conn = self.conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let specialties_json = serde_json::to_string(specialties).unwrap_or_default();
        
        conn.execute(
            "INSERT INTO consultation_drafts 
             (id, title, deidentified_content, clinical_question, specialties, 
              urgency, audit_id, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                id, title, deidentified_content, clinical_question, specialties_json,
                urgency, audit_id, "draft", now, now
            ],
        )?;
        
        Ok(crate::deidentify::ConsultationDraft {
            id,
            title: title.to_string(),
            deidentified_content: deidentified_content.to_string(),
            clinical_question: clinical_question.to_string(),
            specialties: specialties.to_vec(),
            urgency: urgency.to_string(),
            audit_id: audit_id.to_string(),
            status: "draft".to_string(),
            created_at: now,
            updated_at: now,
        })
    }
    
    pub fn list_consultation_drafts(&self) -> Result<Vec<crate::deidentify::ConsultationDraft>, VaultError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, title, deidentified_content, clinical_question, specialties,
                    urgency, audit_id, status, created_at, updated_at
             FROM consultation_drafts ORDER BY updated_at DESC"
        )?;
        
        let drafts = stmt.query_map([], |row| {
            let specialties_json: String = row.get(4)?;
            let specialties: Vec<String> = serde_json::from_str(&specialties_json).unwrap_or_default();
            
            Ok(crate::deidentify::ConsultationDraft {
                id: row.get(0)?,
                title: row.get(1)?,
                deidentified_content: row.get(2)?,
                clinical_question: row.get(3)?,
                specialties,
                urgency: row.get(5)?,
                audit_id: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        Ok(drafts)
    }
    
    pub fn get_consultation_draft(&self, draft_id: &str) -> Result<crate::deidentify::ConsultationDraft, VaultError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, title, deidentified_content, clinical_question, specialties,
                    urgency, audit_id, status, created_at, updated_at
             FROM consultation_drafts WHERE id = ?1"
        )?;
        
        stmt.query_row([draft_id], |row| {
            let specialties_json: String = row.get(4)?;
            let specialties: Vec<String> = serde_json::from_str(&specialties_json).unwrap_or_default();
            
            Ok(crate::deidentify::ConsultationDraft {
                id: row.get(0)?,
                title: row.get(1)?,
                deidentified_content: row.get(2)?,
                clinical_question: row.get(3)?,
                specialties,
                urgency: row.get(5)?,
                audit_id: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }).map_err(|e| VaultError::Database(e))
    }
    
    pub fn update_consultation_draft(
        &self,
        draft_id: &str,
        title: Option<&str>,
        clinical_question: Option<&str>,
        status: Option<&str>,
    ) -> Result<(), VaultError> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().timestamp();
        
        if let Some(t) = title {
            conn.execute("UPDATE consultation_drafts SET title = ?1, updated_at = ?2 WHERE id = ?3",
                        rusqlite::params![t, now, draft_id])?;
        }
        if let Some(q) = clinical_question {
            conn.execute("UPDATE consultation_drafts SET clinical_question = ?1, updated_at = ?2 WHERE id = ?3",
                        rusqlite::params![q, now, draft_id])?;
        }
        if let Some(s) = status {
            conn.execute("UPDATE consultation_drafts SET status = ?1, updated_at = ?2 WHERE id = ?3",
                        rusqlite::params![s, now, draft_id])?;
        }
        
        Ok(())
    }
    
    pub fn delete_consultation_draft(&self, draft_id: &str) -> Result<(), VaultError> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM consultation_drafts WHERE id = ?1", [draft_id])?;
        Ok(())
    }
}

// Helper functions for prep sheet
fn extract_key_points(content: &str) -> Vec<String> {
    let mut points = Vec::new();
    let content_lower = content.to_lowercase();
    
    // Look for common clinical markers
    if content_lower.contains("reports") || content_lower.contains("stated") {
        if let Some(idx) = content_lower.find("reports") {
            let snippet = &content[idx..std::cmp::min(idx + 100, content.len())];
            if let Some(end) = snippet.find('.') {
                points.push(snippet[..end + 1].to_string());
            }
        }
    }
    
    // Extract sentences with key clinical words
    for sentence in content.split('.') {
        let s_lower = sentence.to_lowercase();
        if s_lower.contains("progress") || s_lower.contains("improvement") || 
           s_lower.contains("challenge") || s_lower.contains("goal") {
            let trimmed = sentence.trim();
            if trimmed.len() > 10 && trimmed.len() < 200 {
                points.push(trimmed.to_string());
            }
        }
    }
    
    points.truncate(3);
    points
}

fn extract_mood_indicators(content: &str) -> Vec<String> {
    let mut moods = Vec::new();
    let content_lower = content.to_lowercase();
    
    let mood_words = [
        "anxious", "depressed", "happy", "sad", "angry", "frustrated",
        "hopeful", "overwhelmed", "calm", "irritable", "flat affect",
        "tearful", "euthymic", "dysthymic", "manic", "hypomanic"
    ];
    
    for word in mood_words {
        if content_lower.contains(word) {
            moods.push(word.to_string());
        }
    }
    
    moods
}

fn extract_interventions(content: &str) -> Vec<String> {
    let mut interventions = Vec::new();
    let content_lower = content.to_lowercase();
    
    let intervention_keywords = [
        ("cbt", "CBT techniques"),
        ("cognitive", "Cognitive restructuring"),
        ("mindfulness", "Mindfulness"),
        ("breathing", "Breathing exercises"),
        ("exposure", "Exposure work"),
        ("emdr", "EMDR"),
        ("dbt", "DBT skills"),
        ("psychoeducation", "Psychoeducation"),
        ("validation", "Validation"),
        ("reframing", "Reframing"),
        ("grounding", "Grounding techniques"),
        ("safety plan", "Safety planning"),
    ];
    
    for (keyword, label) in intervention_keywords {
        if content_lower.contains(keyword) {
            interventions.push(label.to_string());
        }
    }
    
    interventions
}

/// Client document metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClientDocument {
    pub id: String,
    pub client_id: String,
    pub filename: String,
    pub file_type: String,
    pub mime_type: String,
    pub file_size: i64,
    pub content_hash: String,
    pub ocr_text: Option<String>,
    pub description: Option<String>,
    pub document_date: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Storage statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct StorageStats {
    pub database_size_bytes: i64,
    pub note_count: u32,
    pub client_count: u32,
    pub document_count: u32,
    pub document_size_bytes: i64,
    pub embedding_count: u32,
}

/// Session metric row from database
#[derive(Debug, Clone)]
pub struct SessionMetricRow {
    pub id: String,
    pub note_id: String,
    pub client_id: String,
    pub start_time: i64,
    pub end_time: i64,
    pub method: String,
    pub word_count: i32,
    pub ai_assisted: bool,
    pub created_at: i64,
}

/// Aggregated metrics summary
#[derive(Debug, Clone, serde::Serialize)]
pub struct MetricsSummary {
    pub total_notes: u32,
    pub total_time_seconds: u64,
    pub avg_time_seconds: f64,
    pub voice_count: u32,
    pub typed_count: u32,
    pub ai_assisted_count: u32,
    pub estimated_time_saved_seconds: i64,
}

// Thread-safe wrapper
pub type SharedVault = Arc<Mutex<Vault>>;

pub fn create_shared_vault(data_dir: PathBuf) -> SharedVault {
    Arc::new(Mutex::new(Vault::new(data_dir)))
}
