# Evidify Windows Code Signing Script
# 
# Prerequisites:
#   - EV Code Signing Certificate (DigiCert, Sectigo, etc.)
#   - Windows SDK installed (for signtool.exe)
#   - Certificate installed in Windows Certificate Store OR .pfx file available
#
# Usage:
#   .\scripts\sign-windows.ps1 -FilePath "path\to\Evidify.msi"
#   .\scripts\sign-windows.ps1 -FilePath "path\to\Evidify.exe" -CertPath "cert.pfx" -CertPassword "password"
#
# For CI/CD:
#   Use Azure Key Vault or similar HSM solution for EV certificates

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath,
    
    [Parameter(Mandatory=$false)]
    [string]$CertPath,
    
    [Parameter(Mandatory=$false)]
    [string]$CertPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$CertThumbprint,
    
    [Parameter(Mandatory=$false)]
    [string]$TimestampServer = "http://timestamp.digicert.com",
    
    [Parameter(Mandatory=$false)]
    [switch]$Verify
)

# ============================================
# Configuration
# ============================================

$ErrorActionPreference = "Stop"

# Find signtool.exe
$SignToolPaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\x64\signtool.exe"
)

$SignTool = $null
foreach ($path in $SignToolPaths) {
    if (Test-Path $path) {
        $SignTool = $path
        break
    }
}

if (-not $SignTool) {
    # Try to find signtool in PATH
    $SignTool = Get-Command signtool.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
}

if (-not $SignTool) {
    Write-Error "signtool.exe not found. Install Windows SDK."
    exit 1
}

Write-Host "[INFO] Using signtool: $SignTool" -ForegroundColor Green

# ============================================
# Functions
# ============================================

function Sign-File {
    param(
        [string]$Path
    )
    
    Write-Host "[INFO] Signing: $Path" -ForegroundColor Green
    
    $signArgs = @(
        "sign",
        "/tr", $TimestampServer,
        "/td", "sha256",
        "/fd", "sha256",
        "/v"
    )
    
    if ($CertThumbprint) {
        # Sign using certificate from Windows Certificate Store
        $signArgs += "/sha1", $CertThumbprint
    }
    elseif ($CertPath) {
        # Sign using PFX file
        if (-not (Test-Path $CertPath)) {
            Write-Error "Certificate file not found: $CertPath"
            exit 1
        }
        $signArgs += "/f", $CertPath
        if ($CertPassword) {
            $signArgs += "/p", $CertPassword
        }
    }
    else {
        # Try to use certificate from store with our subject
        $signArgs += "/a"  # Auto-select best certificate
    }
    
    $signArgs += $Path
    
    & $SignTool @signArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Signing failed with exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

function Verify-Signature {
    param(
        [string]$Path
    )
    
    Write-Host "[INFO] Verifying signature: $Path" -ForegroundColor Green
    
    & $SignTool verify /pa /v $Path
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Signature verification failed"
        exit $LASTEXITCODE
    }
    
    Write-Host "[INFO] Signature verified successfully" -ForegroundColor Green
}

# ============================================
# Main
# ============================================

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Evidify Windows Code Signing" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "File: $FilePath"
Write-Host "Timestamp Server: $TimestampServer"
Write-Host "==========================================" -ForegroundColor Cyan

if ($Verify) {
    Verify-Signature -Path $FilePath
}
else {
    Sign-File -Path $FilePath
    Verify-Signature -Path $FilePath
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
