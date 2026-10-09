$content = (Invoke-WebRequest -Uri "https://iibsservicerequest.vercel.app/petrol-bunk.html" -UseBasicParsing).Content
$hasManagement = $content -match "192.168.1.174"
$hasStaff = $content -match "192.168.1.100"
Write-Host "Live Page Check:"
Write-Host "  -> Contains Management (192.168.1.174): $hasManagement" -ForegroundColor Green
Write-Host "  -> Contains Staff (192.168.1.100): $hasStaff" -ForegroundColor Green
