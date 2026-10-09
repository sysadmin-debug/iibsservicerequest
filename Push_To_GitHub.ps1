$desktopPath = [Environment]::GetFolderPath("Desktop")
$bunkFile = Join-Path $desktopPath "petrol-bunk.html"
$adminFile = Join-Path $desktopPath "admin.html"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Opening GitHub Upload page in your browser...           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

$uploadUrl = "https://github.com/sysadmin-debug/iibsservicerequest/upload/main"
Start-Process $uploadUrl

if (Test-Path $bunkFile) {
    Start-Process explorer.exe "/select,`"$bunkFile`""
} else {
    Start-Process explorer.exe $desktopPath
}

Write-Host "Follow these 2 quick steps in the browser:" -ForegroundColor Yellow
Write-Host "1. Click the blue link: 'choose your files'" -ForegroundColor White
Write-Host "   Select 'petrol-bunk.html' and 'admin.html' from your Desktop" -ForegroundColor White
Write-Host "2. Click the green 'Commit changes' button at the bottom" -ForegroundColor White
Write-Host ""
Write-Host "Vercel will then deploy your site automatically in ~30 seconds!" -ForegroundColor Green
Write-Host ""
