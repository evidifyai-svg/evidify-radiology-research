//! Evidify Canonicalization Library
//!
//! Provides deterministic JSON serialization and hashing for
//! court-defensible audit trails.

use serde_json::Value;
use sha2::{Digest, Sha256};

/// Recursively canonicalize a JSON value.
///
/// - Objects: keys sorted lexicographically
/// - Arrays: preserved in original order (must be pre-sorted upstream)
/// - Primitives: unchanged
pub fn canonicalize_json(v: &Value) -> Value {
    match v {
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();

            let mut out = serde_json::Map::new();
            for k in keys {
                out.insert(k.clone(), canonicalize_json(&map[k]));
            }
            Value::Object(out)
        }
        Value::Array(arr) => {
            Value::Array(arr.iter().map(canonicalize_json).collect())
        }
        _ => v.clone(),
    }
}

/// Serialize a JSON value to canonical bytes (minified, sorted keys).
pub fn canonical_bytes(v: &Value) -> Vec<u8> {
    let canon = canonicalize_json(v);
    serde_json::to_vec(&canon).expect("serialize canonical json")
}

/// Compute SHA-256 hash of bytes, returning lowercase hex string.
pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// Compute canonical SHA-256 of a JSON value.
pub fn canonical_sha256(v: &Value) -> String {
    sha256_hex(&canonical_bytes(v))
}

/// Generate UUIDv5 from namespace and name.
pub fn uuidv5(namespace: &str, name: &str) -> String {
    use sha1::{Sha1, Digest as Sha1Digest};
    
    // Parse namespace UUID (remove hyphens, decode hex)
    let namespace_hex = namespace.replace("-", "");
    let namespace_bytes: Vec<u8> = (0..16)
        .map(|i| u8::from_str_radix(&namespace_hex[i*2..i*2+2], 16).unwrap())
        .collect();
    
    // Hash namespace + name
    let mut hasher = Sha1::new();
    hasher.update(&namespace_bytes);
    hasher.update(name.as_bytes());
    let hash = hasher.finalize();
    
    // Take first 16 bytes
    let mut bytes = [0u8; 16];
    bytes.copy_from_slice(&hash[..16]);
    
    // Set version (5) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    // Format as UUID
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]),
        u16::from_be_bytes([bytes[4], bytes[5]]),
        u16::from_be_bytes([bytes[6], bytes[7]]),
        u16::from_be_bytes([bytes[8], bytes[9]]),
        u64::from_be_bytes([0, 0, bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]])
    )
}

/// Evidify namespace for finding IDs
pub const EVIDIFY_NAMESPACE: &str = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/// Generate stable finding ID from components.
pub fn generate_finding_id(
    gate_id: &str,
    code: &str,
    sub_code: &str,
    severity: &str,
    message: &str,
    object_type: &str,
    object_id: &str,
) -> String {
    let input = format!(
        "{}|{}|{}|{}|{}|{}|{}",
        gate_id, code, sub_code, severity, message, object_type, object_id
    );
    uuidv5(EVIDIFY_NAMESPACE, &input)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_canonicalize_object_sorting() {
        let input = json!({"c": 3, "a": 1, "b": 2});
        let canon = canonicalize_json(&input);
        let bytes = serde_json::to_vec(&canon).unwrap();
        let output = String::from_utf8(bytes).unwrap();
        assert_eq!(output, r#"{"a":1,"b":2,"c":3}"#);
    }

    #[test]
    fn test_canonical_sha256() {
        let input = json!({"c": 3, "a": 1, "b": 2});
        let hash = canonical_sha256(&input);
        // This should match TypeScript implementation
        assert_eq!(hash, "a02e9e11544fe80a264bc0e2ef6c8c1e1d08ae02e26d2e1fd3ed61d17b9f4880");
    }

    #[test]
    fn test_finding_id_generation() {
        let id = generate_finding_id(
            "GATE-001",
            "OPINION_NO_BASIS",
            "NO_SUPPORTING_ANCHORS",
            "BLOCK",
            "Opinion OPN-001 has no supporting anchors in audit log",
            "opinion",
            "OPN-001"
        );
        // This should match TypeScript implementation
        assert_eq!(id, "4502e9ae-cd37-5c9d-88fe-06f3a8ef5937");
    }
}
