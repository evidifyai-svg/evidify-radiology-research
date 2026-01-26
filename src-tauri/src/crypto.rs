// Cryptographic primitives for Evidify v3
// 
// Key hierarchy:
// - User passphrase → Argon2id → KEK (Key Encryption Key)
// - KEK wraps Vault Key (stored in OS keychain)
// - Vault Key opens SQLCipher database
// - Passphrase REQUIRED every session to derive KEK

use argon2::{Argon2, Params, Version};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};
use rand::RngCore;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Key derivation failed: {0}")]
    KeyDerivation(String),
    
    #[error("Encryption failed: {0}")]
    Encryption(String),
    
    #[error("Decryption failed: {0}")]
    Decryption(String),
    
    #[error("Keychain error: {0}")]
    Keychain(String),
    
    #[error("Invalid key length")]
    InvalidKeyLength,
    
    #[error("Key unwrap failed - invalid passphrase")]
    UnwrapFailed,
}

// ============================================
// Key Types
// ============================================

/// Key Encryption Key - derived from passphrase each session
pub struct KEK([u8; 32]);

impl KEK {
    /// Derive KEK from passphrase using Argon2id
    pub fn derive(passphrase: &str, salt: &[u8; 16]) -> Result<Self, CryptoError> {
        let params = Params::new(
            64 * 1024,  // 64 MB memory
            3,          // 3 iterations
            4,          // 4 parallel lanes
            Some(32),   // 32 byte output
        ).map_err(|e| CryptoError::KeyDerivation(e.to_string()))?;
        
        let argon2 = Argon2::new(
            argon2::Algorithm::Argon2id,
            Version::V0x13,
            params,
        );
        
        let mut key = [0u8; 32];
        argon2.hash_password_into(
            passphrase.as_bytes(),
            salt,
            &mut key,
        ).map_err(|e| CryptoError::KeyDerivation(e.to_string()))?;
        
        Ok(KEK(key))
    }
    
    /// Wrap a vault key for storage
    pub fn wrap(&self, vault_key: &VaultKey) -> Result<WrappedVaultKey, CryptoError> {
        let cipher = Aes256Gcm::new_from_slice(&self.0)
            .map_err(|_| CryptoError::InvalidKeyLength)?;
        
        let mut nonce_bytes = [0u8; 12];
        rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = cipher.encrypt(nonce, vault_key.0.as_ref())
            .map_err(|e| CryptoError::Encryption(e.to_string()))?;
        
        Ok(WrappedVaultKey {
            ciphertext,
            nonce: nonce_bytes,
        })
    }
    
    /// Unwrap a vault key from storage
    pub fn unwrap(&self, wrapped: &WrappedVaultKey) -> Result<VaultKey, CryptoError> {
        let cipher = Aes256Gcm::new_from_slice(&self.0)
            .map_err(|_| CryptoError::InvalidKeyLength)?;
        
        let nonce = Nonce::from_slice(&wrapped.nonce);
        
        let plaintext = cipher.decrypt(nonce, wrapped.ciphertext.as_ref())
            .map_err(|_| CryptoError::UnwrapFailed)?;
        
        if plaintext.len() != 32 {
            return Err(CryptoError::InvalidKeyLength);
        }
        
        let mut key = [0u8; 32];
        key.copy_from_slice(&plaintext);
        Ok(VaultKey(key))
    }
}

impl Drop for KEK {
    fn drop(&mut self) {
        // Zeroize on drop
        self.0.fill(0);
    }
}

/// Vault Key - used for SQLCipher
pub struct VaultKey(pub(crate) [u8; 32]);

impl VaultKey {
    /// Generate a new random vault key
    pub fn generate() -> Self {
        let mut key = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut key);
        VaultKey(key)
    }
    
    /// Get hex-encoded key for SQLCipher
    pub fn as_hex(&self) -> String {
        hex::encode(&self.0)
    }
}

impl Drop for VaultKey {
    fn drop(&mut self) {
        self.0.fill(0);
    }
}

/// Wrapped Vault Key - safe to store in keychain
#[derive(Clone)]
pub struct WrappedVaultKey {
    pub ciphertext: Vec<u8>,
    pub nonce: [u8; 12],
}

impl WrappedVaultKey {
    /// Serialize for keychain storage
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(12 + self.ciphertext.len());
        bytes.extend_from_slice(&self.nonce);
        bytes.extend_from_slice(&self.ciphertext);
        bytes
    }
    
    /// Deserialize from keychain storage
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CryptoError> {
        if bytes.len() < 12 {
            return Err(CryptoError::InvalidKeyLength);
        }
        
        let mut nonce = [0u8; 12];
        nonce.copy_from_slice(&bytes[0..12]);
        let ciphertext = bytes[12..].to_vec();
        
        Ok(WrappedVaultKey { ciphertext, nonce })
    }
}

// ============================================
// Salt Management
// ============================================

pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    salt
}

// ============================================
// Hashing
// ============================================

pub fn hash_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// Alias for hash_sha256 - hash arbitrary content
pub fn hash_content(data: &[u8]) -> String {
    hash_sha256(data)
}

pub fn hash_chain_entry(previous_hash: &str, entry_data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(previous_hash.as_bytes());
    hasher.update(entry_data);
    hex::encode(hasher.finalize())
}

/// Hash a file path for audit logging (prevents PHI leakage via paths like "/Patients/Jane_Doe/...")
pub fn hash_path(path: &str, salt: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt);
    hasher.update(path.as_bytes());
    hex::encode(hasher.finalize())
}

// ============================================
// Keychain Integration
// ============================================

const KEYCHAIN_SERVICE: &str = "com.evidify.vault";
const KEYCHAIN_WRAPPED_KEY: &str = "wrapped_vault_key";
const KEYCHAIN_SALT: &str = "kdf_salt";

/// Store wrapped vault key in OS keychain
pub fn store_wrapped_key(wrapped: &WrappedVaultKey) -> Result<(), CryptoError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_WRAPPED_KEY)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    let encoded = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &wrapped.to_bytes()
    );
    
    entry.set_password(&encoded)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    Ok(())
}

/// Retrieve wrapped vault key from OS keychain
pub fn retrieve_wrapped_key() -> Result<WrappedVaultKey, CryptoError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_WRAPPED_KEY)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    let encoded = entry.get_password()
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &encoded
    ).map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    WrappedVaultKey::from_bytes(&bytes)
}

/// Store salt in keychain
pub fn store_salt(salt: &[u8; 16]) -> Result<(), CryptoError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_SALT)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    let encoded = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        salt
    );
    
    entry.set_password(&encoded)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    Ok(())
}

/// Retrieve salt from keychain
pub fn retrieve_salt() -> Result<[u8; 16], CryptoError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_SALT)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    let encoded = entry.get_password()
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &encoded
    ).map_err(|e| CryptoError::Keychain(e.to_string()))?;
    
    if bytes.len() != 16 {
        return Err(CryptoError::InvalidKeyLength);
    }
    
    let mut salt = [0u8; 16];
    salt.copy_from_slice(&bytes);
    Ok(salt)
}

/// Check if vault credentials exist in keychain
pub fn keychain_has_vault() -> bool {
    let entry = match keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_WRAPPED_KEY) {
        Ok(e) => e,
        Err(_) => return false,
    };
    entry.get_password().is_ok()
}

/// Delete all vault credentials from keychain
pub fn clear_keychain() -> Result<(), CryptoError> {
    let key_entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_WRAPPED_KEY)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    let _ = key_entry.delete_password(); // Ignore if not found
    
    let salt_entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_SALT)
        .map_err(|e| CryptoError::Keychain(e.to_string()))?;
    let _ = salt_entry.delete_password(); // Ignore if not found
    
    Ok(())
}

// ============================================
// Token Generation
// ============================================

pub fn generate_token(len: usize) -> String {
    let mut bytes = vec![0u8; len];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    hex::encode(&bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_key_wrap_unwrap() {
        let passphrase = "test_passphrase_123";
        let salt = generate_salt();
        
        // Derive KEK
        let kek = KEK::derive(passphrase, &salt).unwrap();
        
        // Generate and wrap vault key
        let vault_key = VaultKey::generate();
        let original_hex = vault_key.as_hex();
        let wrapped = kek.wrap(&vault_key).unwrap();
        
        // Derive KEK again (simulating new session)
        let kek2 = KEK::derive(passphrase, &salt).unwrap();
        
        // Unwrap should succeed with same passphrase
        let unwrapped = kek2.unwrap(&wrapped).unwrap();
        assert_eq!(original_hex, unwrapped.as_hex());
    }
    
    #[test]
    fn test_wrong_passphrase_fails() {
        let salt = generate_salt();
        
        let kek1 = KEK::derive("correct_passphrase", &salt).unwrap();
        let vault_key = VaultKey::generate();
        let wrapped = kek1.wrap(&vault_key).unwrap();
        
        let kek2 = KEK::derive("wrong_passphrase", &salt).unwrap();
        assert!(kek2.unwrap(&wrapped).is_err());
    }
}
