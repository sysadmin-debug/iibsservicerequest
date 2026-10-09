param (
    [Parameter(Mandatory=$true)]
    [string]$token
)

$repo = "sysadmin-debug/iibsservicerequest"
$branch = "main"

$headers = @{
    "Authorization" = "Bearer $token"
    "User-Agent"    = "PowerShell-IIBS-Deployer"
    "Accept"        = "application/vnd.github.v3+json"
}

Write-Host "Verifying GitHub user..." -ForegroundColor Cyan
try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    Write-Host "Authenticated as: $($user.login)" -ForegroundColor Green
} catch {
    Write-Host "Auth Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 1. Upload petrol-bunk.html
Write-Host "`n[1/2] Uploading petrol-bunk.html..." -ForegroundColor Cyan
$bunkPath = "C:\Users\user\Desktop\petrol-bunk.html"
if (-not (Test-Path $bunkPath)) {
    $bunkPath = "d:\Antigravity\Biometric for petrol bunk\petrol-bunk.html"
}
$bunkBytes = [System.IO.File]::ReadAllBytes($bunkPath)
$bunkB64 = [Convert]::ToBase64String($bunkBytes)

$bunkSha = $null
try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/petrol-bunk.html?ref=$branch" -Headers $headers -Method Get -ErrorAction Stop
    $bunkSha = $existing.sha
    Write-Host "Found existing petrol-bunk.html ($bunkSha), will update."
} catch {
    Write-Host "petrol-bunk.html is a new file."
}

$body1 = @{
    message = "Add Babu Raju Ram Fuel Station attendance dashboard"
    content = $bunkB64
    branch  = $branch
}
if ($bunkSha) { $body1["sha"] = $bunkSha }
$json1 = $body1 | ConvertTo-Json -Compress

try {
    $res1 = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/petrol-bunk.html" -Headers $headers -Method Put -Body $json1 -ContentType "application/json"
    Write-Host "SUCCESS: petrol-bunk.html uploaded!" -ForegroundColor Green
} catch {
    Write-Host "Error uploading petrol-bunk.html: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
    exit 1
}

# 2. Update admin.html
Write-Host "`n[2/2] Updating admin.html..." -ForegroundColor Cyan
$adminPath = "C:\Users\user\Desktop\admin.html"
if (-not (Test-Path $adminPath)) {
    $adminPath = "d:\Antigravity\Biometric for petrol bunk\admin.html"
}
$adminBytes = [System.IO.File]::ReadAllBytes($adminPath)
$adminB64 = [Convert]::ToBase64String($adminBytes)

$adminSha = $null
try {
    $existingAdmin = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/admin.html?ref=$branch" -Headers $headers -Method Get -ErrorAction Stop
    $adminSha = $existingAdmin.sha
    Write-Host "Found existing admin.html ($adminSha), will update."
} catch {
    Write-Host "admin.html not found."
}

$body2 = @{
    message = "Link Petrol Bunk Attendance dashboard in admin.html navigation"
    content = $adminB64
    branch  = $branch
}
if ($adminSha) { $body2["sha"] = $adminSha }
$json2 = $body2 | ConvertTo-Json -Compress

try {
    $res2 = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/admin.html" -Headers $headers -Method Put -Body $json2 -ContentType "application/json"
    Write-Host "SUCCESS: admin.html updated!" -ForegroundColor Green
} catch {
    Write-Host "Error updating admin.html: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
    exit 1
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " ALL CODE PUSHED TO GITHUB SUCCESSFULLY! " -ForegroundColor Green
Write-Host " Repository: https://github.com/$repo" -ForegroundColor Cyan
Write-Host " Vercel is now deploying:" -ForegroundColor Yellow
Write-Host " -> https://iibsservicerequest.vercel.app/admin.html" -ForegroundColor Yellow
Write-Host " -> https://iibsservicerequest.vercel.app/petrol-bunk.html" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
