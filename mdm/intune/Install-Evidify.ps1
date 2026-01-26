<#
.SYNOPSIS
    Evidify Installation Script for Microsoft Intune

.DESCRIPTION
    This script installs and configures Evidify for Windows devices managed via Intune.
    It handles:
    - Silent installation of Evidify
    - Policy file deployment
    - Ollama installation check
    - Windows Defender exclusions
    - Firewall rules (local only)

.NOTES
    Deploy via: Intune > Devices > Scripts > Add
    Run as: System
    Run in 64-bit host: Yes
    
    Or wrap in .intunewin for Win32 app deployment
#>

param(
    [string]$InstallerPath = "",
    [string]$PolicyPath = "",
    [switch]$Uninstall
)

# ============================================
# Configuration
# ============================================

$AppName = "Evidify"
$AppVersion = "4.2.0"
$Publisher = "Evidify Inc"
$InstallDir = "$env:LOCALAPPDATA\Evidify"
$AppDataDir = "$env:APPDATA\ai.evidify"
$LogFile = "$env:TEMP\evidify-install.log"

# ============================================
# Logging
# ============================================

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    Write-Host $logEntry
}

# ============================================
# Main Installation
# ============================================

try {
    Write-Log "Starting Evidify installation"
    Write-Log "User: $env:USERNAME"
    Write-Log "Computer: $env:COMPUTERNAME"

    # Handle uninstall
    if ($Uninstall) {
        Write-Log "Uninstalling Evidify..."
        
        # Stop any running instances
        Get-Process -Name "Evidify" -ErrorAction SilentlyContinue | Stop-Process -Force
        
        # Remove installation
        if (Test-Path $InstallDir) {
            Remove-Item -Path $InstallDir -Recurse -Force
            Write-Log "Removed installation directory"
        }
        
        # Remove Start Menu shortcut
        $startMenu = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Evidify.lnk"
        if (Test-Path $startMenu) {
            Remove-Item $startMenu -Force
        }
        
        # Keep user data (AppData) for potential reinstall
        Write-Log "User data preserved in $AppDataDir"
        
        Write-Log "Uninstallation complete"
        exit 0
    }

    # Create directories
    Write-Log "Creating directories..."
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    New-Item -ItemType Directory -Path $AppDataDir -Force | Out-Null

    # Install Evidify (if installer provided)
    if ($InstallerPath -and (Test-Path $InstallerPath)) {
        Write-Log "Installing from: $InstallerPath"
        
        # Detect installer type
        $extension = [System.IO.Path]::GetExtension($InstallerPath).ToLower()
        
        switch ($extension) {
            ".msi" {
                $args = "/i `"$InstallerPath`" /qn /norestart INSTALLDIR=`"$InstallDir`""
                Start-Process "msiexec.exe" -ArgumentList $args -Wait -NoNewWindow
            }
            ".exe" {
                # Assume NSIS or similar with /S for silent
                Start-Process -FilePath $InstallerPath -ArgumentList "/S /D=$InstallDir" -Wait -NoNewWindow
            }
            ".msix" {
                Add-AppxPackage -Path $InstallerPath
            }
            default {
                Write-Log "Unknown installer type: $extension"
                exit 1
            }
        }
        
        Write-Log "Installation completed"
    } else {
        Write-Log "No installer provided, configuring existing installation"
    }

    # ============================================
    # Deploy Policy
    # ============================================
    
    $policyFile = "$AppDataDir\policy.json"
    
    if ($PolicyPath -and (Test-Path $PolicyPath)) {
        Write-Log "Deploying policy from: $PolicyPath"
        Copy-Item -Path $PolicyPath -Destination $policyFile -Force
    } elseif (-not (Test-Path $policyFile)) {
        Write-Log "Creating default policy"
        
        $defaultPolicy = @{
            id = "default"
            version = "1.0.0"
            organization = "Solo Practice"
            effective_date = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            expires_at = $null
            signed_by = "system"
            signature = ""
            export_policy = @{
                cloud_sync = "Warn"
                network_share = "Warn"
                removable_media = "Warn"
                unknown_destination = "Warn"
                audit_pack_required_above = 10
                allowed_formats = @("pdf", "docx", "json")
                blocked_paths = @()
            }
            attestation_policy = @{
                required_attestations = @(
                    "safety-si-direct",
                    "safety-si-plan",
                    "safety-hi-direct",
                    "safety-hi-threat",
                    "safety-abuse-child",
                    "safety-abuse-elder",
                    "safety-duty-warn"
                )
                recommended_attestations = @(
                    "safety-si-euphemism",
                    "safety-si-passive",
                    "doc-capacity-concern"
                )
                supervisor_review_required = $null
                attestation_timeout = 0
                allow_not_relevant = $true
                require_explanation_for_not_relevant = $true
            }
            recording_policy = @{
                consent_required = $true
                auto_delete_audio_after_signing = $true
                max_audio_retention_days = 0
                reconsent_each_session = $false
                jurisdiction_rules = @{}
            }
            supervision_policy = @{
                cosign_required_for = @()
                max_review_delay_hours = 72
                review_high_risk_notes = $false
                competency_tracking_enabled = $false
            }
            retention_policy = @{
                note_retention_days = 0
                audit_log_retention_days = 2555
                auto_archive_after_days = 0
                require_destruction_certificate = $false
            }
            custom_rules = @{}
        }
        
        $defaultPolicy | ConvertTo-Json -Depth 10 | Set-Content -Path $policyFile -Encoding UTF8
        Write-Log "Default policy created"
    }

    # ============================================
    # Check Ollama
    # ============================================
    
    Write-Log "Checking for Ollama..."
    
    $ollamaPath = "$env:LOCALAPPDATA\Ollama\ollama.exe"
    $ollamaInstalled = Test-Path $ollamaPath
    
    if ($ollamaInstalled) {
        Write-Log "Ollama found at: $ollamaPath"
        
        # Check if running
        $ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
        if ($ollamaProcess) {
            Write-Log "Ollama is running"
            
            # Check for models
            try {
                $models = & $ollamaPath list 2>&1
                Write-Log "Ollama models: $models"
            } catch {
                Write-Log "Could not list Ollama models"
            }
        } else {
            Write-Log "Ollama is not running. Starting..."
            Start-Process -FilePath $ollamaPath -WindowStyle Hidden
            Start-Sleep -Seconds 3
        }
    } else {
        Write-Log "Ollama not installed. AI features will be unavailable."
        Write-Log "Install from: https://ollama.ai/download/windows"
    }

    # ============================================
    # Windows Defender Exclusions
    # ============================================
    
    Write-Log "Adding Windows Defender exclusions..."
    
    try {
        # Exclude Evidify installation
        Add-MpPreference -ExclusionPath $InstallDir -ErrorAction SilentlyContinue
        
        # Exclude Evidify data
        Add-MpPreference -ExclusionPath $AppDataDir -ErrorAction SilentlyContinue
        
        # Exclude Ollama (for AI performance)
        if ($ollamaInstalled) {
            Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\Ollama" -ErrorAction SilentlyContinue
        }
        
        Write-Log "Defender exclusions added"
    } catch {
        Write-Log "WARNING: Could not add Defender exclusions: $_"
    }

    # ============================================
    # Firewall Rules (Local Only)
    # ============================================
    
    Write-Log "Configuring firewall..."
    
    try {
        # Ollama runs on localhost:11434 - ensure it's allowed locally
        $ruleName = "Evidify - Ollama Local"
        $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        
        if (-not $existingRule) {
            New-NetFirewallRule -DisplayName $ruleName `
                -Direction Inbound `
                -LocalPort 11434 `
                -Protocol TCP `
                -RemoteAddress 127.0.0.1 `
                -Action Allow `
                -Profile Private `
                -ErrorAction SilentlyContinue
            
            Write-Log "Firewall rule created for Ollama"
        }
    } catch {
        Write-Log "WARNING: Could not configure firewall: $_"
    }

    # ============================================
    # Create Start Menu Shortcut
    # ============================================
    
    $exePath = "$InstallDir\Evidify.exe"
    if (Test-Path $exePath) {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Evidify.lnk")
        $shortcut.TargetPath = $exePath
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "Evidify Clinical Documentation"
        $shortcut.Save()
        
        Write-Log "Start Menu shortcut created"
    }

    # ============================================
    # Complete
    # ============================================
    
    Write-Log "Evidify installation completed successfully"
    Write-Log "Installation directory: $InstallDir"
    Write-Log "Data directory: $AppDataDir"
    
    exit 0

} catch {
    Write-Log "ERROR: Installation failed - $_"
    exit 1
}
