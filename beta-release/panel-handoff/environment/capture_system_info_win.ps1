# PowerShell: capture_system_info_win.ps1
$OutDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutFile = Join-Path $OutDir "system_info.md"

$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1

@"
# System info (PHI-free)

Captured (UTC): $now

## Windows
Caption: $($os.Caption)
Version: $($os.Version)
BuildNumber: $($os.BuildNumber)

## Hardware
Manufacturer: $($cs.Manufacturer)
Model: $($cs.Model)
RAM (GB): {0:N2}

## CPU
Name: $($cpu.Name)
Cores: $($cpu.NumberOfCores)
LogicalProcessors: $($cpu.NumberOfLogicalProcessors)
"@ -f ($cs.TotalPhysicalMemory / 1GB) | Out-File -FilePath $OutFile -Encoding UTF8

Write-Host "Wrote: $OutFile"
