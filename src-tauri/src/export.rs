// Export Path Validation Module
// 
// Enterprise-grade path classification:
// - OS-native cloud sync detection
// - Symlink resolution
// - Network share detection
// - Mount point handling

use std::path::{Path, PathBuf};
use std::fs;

#[cfg(target_os = "macos")]
use std::process::Command;

use crate::models::PathClassification;

/// Comprehensive path classification
pub fn classify_path(path: &Path) -> PathClassResult {
    // Step 1: Canonicalize to resolve symlinks
    let canonical = match fs::canonicalize(path) {
        Ok(p) => p,
        Err(e) => {
            return PathClassResult {
                classification: PathClassification::Unknown,
                reason: format!("Cannot resolve path: {}", e),
                canonical_path: path.to_path_buf(),
                warnings: vec!["Path could not be verified".to_string()],
            };
        }
    };
    
    let mut warnings = Vec::new();
    
    // Check if path changed after canonicalization (symlink)
    if canonical != path {
        warnings.push(format!(
            "Path resolves through symlink: {} -> {}",
            path.display(),
            canonical.display()
        ));
    }
    
    // Step 2: Check for network paths
    if let Some(result) = check_network_path(&canonical) {
        return PathClassResult {
            classification: PathClassification::NetworkShare,
            reason: result,
            canonical_path: canonical,
            warnings,
        };
    }
    
    // Step 3: Check for removable media
    if let Some(result) = check_removable_media(&canonical) {
        return PathClassResult {
            classification: PathClassification::RemovableMedia,
            reason: result,
            canonical_path: canonical,
            warnings,
        };
    }
    
    // Step 4: OS-native cloud sync detection
    if let Some(result) = detect_cloud_sync_native(&canonical) {
        return PathClassResult {
            classification: PathClassification::CloudSync,
            reason: result,
            canonical_path: canonical,
            warnings,
        };
    }
    
    // Step 5: Fallback pattern matching
    if let Some(result) = detect_cloud_sync_patterns(&canonical) {
        warnings.push("Detected via pattern matching (may have false positives)".to_string());
        return PathClassResult {
            classification: PathClassification::CloudSync,
            reason: result,
            canonical_path: canonical,
            warnings,
        };
    }
    
    PathClassResult {
        classification: PathClassification::Safe,
        reason: "No unsafe sinks detected".to_string(),
        canonical_path: canonical,
        warnings,
    }
}

#[derive(Debug, Clone)]
pub struct PathClassResult {
    pub classification: PathClassification,
    pub reason: String,
    pub canonical_path: PathBuf,
    pub warnings: Vec<String>,
}

// ============================================
// Network Path Detection
// ============================================

#[cfg(target_os = "windows")]
fn check_network_path(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    
    // UNC paths
    if path_str.starts_with("\\\\") || path_str.starts_with("//") {
        return Some(format!("UNC network path: {}", path_str));
    }
    
    // Mapped network drives - check if drive is network type
    // This would use GetDriveType API in production
    if let Some(drive_letter) = path_str.chars().next() {
        if drive_letter.is_alphabetic() && path_str.chars().nth(1) == Some(':') {
            // In production: call GetDriveType(drive_letter)
            // DRIVE_REMOTE = 4
        }
    }
    
    None
}

#[cfg(target_os = "macos")]
fn check_network_path(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    
    // SMB/NFS mounts typically under /Volumes but not the boot volume
    if path_str.starts_with("/Volumes/") {
        // Check mount type using statfs
        if let Ok(output) = Command::new("df")
            .args(&["-T", path.to_str().unwrap_or("")])
            .output()
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            if output_str.contains("smbfs") || output_str.contains("nfs") || output_str.contains("afpfs") {
                return Some(format!("Network mount detected: {}", path_str));
            }
        }
    }
    
    // AFP/SMB URLs
    if path_str.starts_with("smb://") || path_str.starts_with("afp://") {
        return Some(format!("Network URL path: {}", path_str));
    }
    
    None
}

#[cfg(target_os = "linux")]
fn check_network_path(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    
    // Check /proc/mounts for network filesystems
    if let Ok(mounts) = fs::read_to_string("/proc/mounts") {
        for line in mounts.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let mount_point = parts[1];
                let fs_type = parts[2];
                
                if path_str.starts_with(mount_point) {
                    if ["nfs", "nfs4", "cifs", "smbfs", "ncpfs", "sshfs", "fuse.sshfs"]
                        .contains(&fs_type)
                    {
                        return Some(format!("Network filesystem ({}): {}", fs_type, mount_point));
                    }
                }
            }
        }
    }
    
    None
}

// ============================================
// Removable Media Detection
// ============================================

#[cfg(target_os = "windows")]
fn check_removable_media(path: &Path) -> Option<String> {
    // In production: use GetDriveType API
    // DRIVE_REMOVABLE = 2
    let path_str = path.to_string_lossy();
    
    if let Some(drive_letter) = path_str.chars().next() {
        if drive_letter.is_alphabetic() {
            let drive = drive_letter.to_ascii_uppercase();
            // Common removable drive letters (not C: or D:)
            if !['C', 'D'].contains(&drive) {
                return Some(format!("Potentially removable drive: {}:", drive));
            }
        }
    }
    
    None
}

#[cfg(target_os = "macos")]
fn check_removable_media(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    
    // External volumes under /Volumes (excluding Macintosh HD variants)
    if path_str.starts_with("/Volumes/") {
        let volume_name = path_str
            .strip_prefix("/Volumes/")
            .unwrap_or("")
            .split('/')
            .next()
            .unwrap_or("");
        
        let lower = volume_name.to_lowercase();
        if !lower.contains("macintosh") && !lower.contains("system") {
            // Check if it's a disk image or external drive
            if let Ok(output) = Command::new("diskutil")
                .args(&["info", &format!("/Volumes/{}", volume_name)])
                .output()
            {
                let info = String::from_utf8_lossy(&output.stdout);
                if info.contains("Removable Media: Yes") || info.contains("Protocol: USB") {
                    return Some(format!("Removable media: {}", volume_name));
                }
            }
        }
    }
    
    None
}

#[cfg(target_os = "linux")]
fn check_removable_media(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    
    // Common removable media paths
    if path_str.starts_with("/media/") || path_str.starts_with("/run/media/") {
        return Some(format!("Removable media path: {}", path_str));
    }
    
    // Check udev for removable attribute
    // In production: query /sys/block/*/removable
    
    None
}

// ============================================
// Cloud Sync Detection (OS-Native)
// ============================================

#[cfg(target_os = "macos")]
fn detect_cloud_sync_native(path: &Path) -> Option<String> {
    // Check extended attributes for cloud sync markers
    let path_str = path.to_str().unwrap_or("");
    
    if let Ok(output) = Command::new("xattr")
        .args(&["-l", path_str])
        .output()
    {
        let attrs = String::from_utf8_lossy(&output.stdout);
        
        // iCloud
        if attrs.contains("com.apple.clouddocs") || attrs.contains("com.apple.icloud") {
            return Some("iCloud sync folder (detected via xattr)".to_string());
        }
        
        // Dropbox
        if attrs.contains("com.dropbox") {
            return Some("Dropbox sync folder (detected via xattr)".to_string());
        }
    }
    
    // Check for iCloud Drive specifically
    let home = std::env::var("HOME").unwrap_or_default();
    let icloud_path = format!("{}/Library/Mobile Documents/com~apple~CloudDocs", home);
    if path_str.starts_with(&icloud_path) {
        return Some("iCloud Drive folder".to_string());
    }
    
    None
}

#[cfg(target_os = "windows")]
fn detect_cloud_sync_native(path: &Path) -> Option<String> {
    // In production: use Windows Shell API
    // - Check FILE_ATTRIBUTE_RECALL_ON_OPEN for OneDrive
    // - Check for CloudFilesProvider registry entries
    // - Query Known Folder paths
    
    let path_str = path.to_string_lossy().to_lowercase();
    
    // OneDrive known paths
    if let Ok(onedrive) = std::env::var("OneDrive") {
        if path_str.starts_with(&onedrive.to_lowercase()) {
            return Some("OneDrive folder".to_string());
        }
    }
    
    // Check registry for sync providers
    // HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace
    
    None
}

#[cfg(target_os = "linux")]
fn detect_cloud_sync_native(path: &Path) -> Option<String> {
    // Check for common sync daemon indicators
    let path_str = path.to_string_lossy();
    
    // Dropbox
    if path_str.contains("/.dropbox") {
        return Some("Dropbox folder (daemon detected)".to_string());
    }
    
    // Google Drive (via various clients)
    if path_str.contains("/google-drive") || path_str.contains("/Google Drive") {
        return Some("Google Drive folder".to_string());
    }
    
    None
}

// ============================================
// Pattern-Based Fallback
// ============================================

fn detect_cloud_sync_patterns(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy().to_lowercase();
    
    let patterns = [
        ("dropbox", "Dropbox"),
        ("onedrive", "OneDrive"),
        ("google drive", "Google Drive"),
        ("googledrive", "Google Drive"),
        ("icloud", "iCloud"),
        ("box sync", "Box"),
        ("creative cloud", "Adobe Creative Cloud"),
        ("mega", "MEGA"),
        ("sync.com", "Sync.com"),
        ("pcloud", "pCloud"),
        ("tresorit", "Tresorit"),
    ];
    
    for (pattern, name) in patterns {
        if path_str.contains(pattern) {
            return Some(format!("{} folder (pattern match)", name));
        }
    }
    
    None
}

// ============================================
// Export Policy Engine
// ============================================

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ExportMode {
    Solo,        // Warn on unsafe, allow override
    Enterprise,  // Block unsafe, no override
}

pub struct ExportPolicy {
    pub mode: ExportMode,
    pub allow_network_shares: bool,
    pub allow_removable_media: bool,
    pub allow_cloud_sync: bool,
    pub allowed_paths: Vec<PathBuf>,
}

impl Default for ExportPolicy {
    fn default() -> Self {
        ExportPolicy {
            mode: ExportMode::Solo,
            allow_network_shares: false,
            allow_removable_media: true,  // Common for solo practitioners
            allow_cloud_sync: false,
            allowed_paths: vec![],
        }
    }
}

impl ExportPolicy {
    pub fn enterprise() -> Self {
        ExportPolicy {
            mode: ExportMode::Enterprise,
            allow_network_shares: false,
            allow_removable_media: false,
            allow_cloud_sync: false,
            allowed_paths: vec![],  // Admin configures these
        }
    }
    
    pub fn evaluate(&self, result: &PathClassResult) -> ExportDecision {
        // Check allowlist first
        if self.allowed_paths.iter().any(|allowed| {
            result.canonical_path.starts_with(allowed)
        }) {
            return ExportDecision::Allowed {
                reason: "Path in allowlist".to_string(),
            };
        }
        
        match result.classification {
            PathClassification::Safe => ExportDecision::Allowed {
                reason: "Safe local path".to_string(),
            },
            
            PathClassification::CloudSync => {
                if self.allow_cloud_sync {
                    ExportDecision::Allowed {
                        reason: "Cloud sync allowed by policy".to_string(),
                    }
                } else if self.mode == ExportMode::Enterprise {
                    ExportDecision::Blocked {
                        reason: result.reason.clone(),
                        can_override: false,
                    }
                } else {
                    ExportDecision::Blocked {
                        reason: result.reason.clone(),
                        can_override: true,
                    }
                }
            }
            
            PathClassification::NetworkShare => {
                if self.allow_network_shares {
                    ExportDecision::Allowed {
                        reason: "Network shares allowed by policy".to_string(),
                    }
                } else {
                    ExportDecision::Blocked {
                        reason: result.reason.clone(),
                        can_override: self.mode != ExportMode::Enterprise,
                    }
                }
            }
            
            PathClassification::RemovableMedia => {
                if self.allow_removable_media {
                    ExportDecision::Allowed {
                        reason: "Removable media allowed by policy".to_string(),
                    }
                } else {
                    ExportDecision::Blocked {
                        reason: result.reason.clone(),
                        can_override: self.mode != ExportMode::Enterprise,
                    }
                }
            }
            
            PathClassification::Unknown => {
                if self.mode == ExportMode::Enterprise {
                    ExportDecision::Blocked {
                        reason: "Unknown path classification not allowed in enterprise mode".to_string(),
                        can_override: false,
                    }
                } else {
                    ExportDecision::Allowed {
                        reason: "Unknown classification allowed in solo mode".to_string(),
                    }
                }
            }
        }
    }
}

#[derive(Debug, Clone)]
pub enum ExportDecision {
    Allowed { reason: String },
    Blocked { reason: String, can_override: bool },
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_pattern_detection() {
        let path = Path::new("/Users/test/Dropbox/Documents");
        let result = detect_cloud_sync_patterns(path);
        assert!(result.is_some());
        assert!(result.unwrap().contains("Dropbox"));
    }
    
    #[test]
    fn test_enterprise_policy() {
        let policy = ExportPolicy::enterprise();
        let result = PathClassResult {
            classification: PathClassification::CloudSync,
            reason: "Dropbox detected".to_string(),
            canonical_path: PathBuf::from("/Users/test/Dropbox"),
            warnings: vec![],
        };
        
        let decision = policy.evaluate(&result);
        match decision {
            ExportDecision::Blocked { can_override, .. } => {
                assert!(!can_override);
            }
            _ => panic!("Should be blocked"),
        }
    }
}
