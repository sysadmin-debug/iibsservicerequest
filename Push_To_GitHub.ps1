<#
.SYNOPSIS
    One-click push all Petrol Bunk data to GitHub
    Repo: https://github.com/sysadmin-debug/iibsservicerequest

.NOTES
    Set your PAT token as an environment variable before running:
        $env:GITHUB_TOKEN = "ghp_..."
    Or it will prompt you each time.
#>

$git     = "C:\mingit\cmd\git.exe"
$repoDir = "d:\Antigravity\Biometric for petrol bunk"

# Read token from env variable (never store token directly in file)
$token = $env:GITHUB_TOKEN
if (-not $token) {
    $secure = Read-Host "Enter GitHub PAT token" -AsSecureString
    $token  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

$remote = "https://sysadmin-debug:$token@github.com/sysadmin-debug/iibsservicerequest.git"

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  PUSH TO GITHUB - Petrol Bunk Biometric System" -ForegroundColor Yellow
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') IST" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Yellow

if (-not (Test-Path $git)) {
    Write-Host "[!] MinGit not found at $git" -ForegroundColor Red; exit 1
}

if (-not (Test-Path "$repoDir\.git")) {
    Write-Host "`n[*] Initializing git repo..." -ForegroundColor Cyan
    & $git -C $repoDir init
    & $git -C $repoDir checkout -b main 2>$null
    & $git -C $repoDir config user.email "admin@biometricbunk.local"
    & $git -C $repoDir config user.name  "Petrol Bunk Admin"
    & $git -C $repoDir config core.autocrlf false
}

& $git -C $repoDir remote remove origin 2>$null
& $git -C $repoDir remote add origin $remote

Write-Host "`n[1/3] Staging changes..." -ForegroundColor Cyan
& $git -C $repoDir add -A
$staged = & $git -C $repoDir diff --cached --name-only
if ($staged.Count -eq 0) {
    Write-Host "  Nothing new to commit. Already up to date." -ForegroundColor Green
    exit 0
}
Write-Host "  $($staged.Count) file(s) staged." -ForegroundColor Green
$staged | ForEach-Object { Write-Host "    + $_" -ForegroundColor White }

Write-Host "`n[2/3] Committing..." -ForegroundColor Cyan
$msg = "Sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm') IST"
& $git -C $repoDir commit -m $msg
Write-Host "  Commit: $msg" -ForegroundColor Green

Write-Host "`n[3/3] Pushing to GitHub..." -ForegroundColor Cyan
& $git -C $repoDir push origin main --force-with-lease 2>&1 | ForEach-Object {
    $col = if ($_ -match "error|fatal|rejected") {"Red"} elseif ($_ -match "main") {"Green"} else {"Gray"}
    Write-Host "  $_" -ForegroundColor $col
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  DONE! View at:" -ForegroundColor Green
Write-Host "  https://github.com/sysadmin-debug/iibsservicerequest" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
