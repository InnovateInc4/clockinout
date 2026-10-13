$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputFile = Join-Path $repoRoot 'database\real_municipal_db.sql'

Write-Host ''
Write-Host 'MCMS - Export Real municipal_db' -ForegroundColor Cyan
Write-Host '-------------------------------'
Write-Host 'This exports the municipal_db database exactly as it exists on this PC.'
Write-Host ''

$mysqldump = $null
$command = Get-Command mysqldump -ErrorAction SilentlyContinue
if ($command) {
    $mysqldump = $command.Source
}

if (-not $mysqldump) {
    $candidates = @(
        "$env:ProgramFiles\MySQL\MySQL Server 8.4\bin\mysqldump.exe",
        "$env:ProgramFiles\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
        "$env:ProgramFiles\MySQL\MySQL Server 9.0\bin\mysqldump.exe",
        "$env:ProgramFiles\MariaDB 11.4\bin\mysqldump.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $mysqldump = $candidate
            break
        }
    }
}

if (-not $mysqldump) {
    Write-Host 'mysqldump.exe could not be found.' -ForegroundColor Red
    Write-Host 'Install MySQL Server or add its bin folder to PATH, then run this again.' -ForegroundColor Yellow
    Read-Host 'Press Enter to close'
    exit 1
}

$dbHost = Read-Host 'MySQL host [localhost]'
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = 'localhost' }

$dbPort = Read-Host 'MySQL port [3306]'
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = '3306' }

$dbUser = Read-Host 'MySQL user [root]'
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = 'root' }

Write-Host ''
Write-Host 'MySQL will now ask for that user password.' -ForegroundColor Yellow
Write-Host 'The password is NOT written into the SQL file or repository.' -ForegroundColor Green
Write-Host ''

if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

$args = @(
    '-h', $dbHost,
    '-P', $dbPort,
    '-u', $dbUser,
    '-p',
    '--default-character-set=utf8mb4',
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    '--set-gtid-purged=OFF',
    '--databases', 'municipal_db',
    "--result-file=$outputFile"
)

& $mysqldump @args

if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Database export failed. Check the MySQL username/password and try again.' -ForegroundColor Red
    if (Test-Path $outputFile) { Remove-Item $outputFile -Force }
    Read-Host 'Press Enter to close'
    exit 1
}

if (-not (Test-Path $outputFile)) {
    Write-Host 'Export reported success but the SQL file was not created.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}

$file = Get-Item $outputFile
$sizeMb = [math]::Round($file.Length / 1MB, 2)

Write-Host ''
Write-Host 'REAL DATABASE EXPORT COMPLETE.' -ForegroundColor Green
Write-Host "File: $outputFile"
Write-Host "Size: $sizeMb MB"
Write-Host ''
Write-Host 'Next: upload database\real_municipal_db.sql to this ChatGPT conversation.' -ForegroundColor Cyan
Write-Host 'Once it is uploaded, ChatGPT can place it in GitHub and make the one-click launcher use it.' -ForegroundColor Cyan
Write-Host ''
Read-Host 'Press Enter to close'
