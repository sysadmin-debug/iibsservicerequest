<#
.SYNOPSIS
    Hikvision Biometric Device Data Importer for Petrol Bunk
.DESCRIPTION
    Connects to Hikvision Biometric Terminal (e.g., DS-K1T804AMF) via ISAPI,
    imports employee details and attendance logs, and exports them to CSV files.
#>

param(
    [string[]]$DeviceIPs = @("192.168.1.174", "192.168.1.100"),
    [int]$DevicePort = 80,
    [string]$Username = "admin",
    [string]$Password = ""
)

[System.Reflection.Assembly]::LoadWithPartialName("System.Net.Http") | Out-Null

function Get-HttpClient {
    param([string]$User, [string]$Pass)
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.Credentials = [System.Net.NetworkCredential]::new($User, $Pass)
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(10)
    return $client
}

function Test-DeviceAuth {
    param($client, [string]$BaseUrl)
    try {
        $resp = $client.GetAsync("$BaseUrl/ISAPI/System/deviceInfo").Result
        if ($resp.IsSuccessStatusCode) {
            $xml = $resp.Content.ReadAsStringAsync().Result
            Write-Host "[+] Authentication successful! Connected to Hikvision device." -ForegroundColor Green
            return @{ Success = $true; Info = $xml }
        } else {
            Write-Host "[-] Authentication failed: HTTP $($resp.StatusCode)" -ForegroundColor Red
            return @{ Success = $false; StatusCode = $resp.StatusCode }
        }
    } catch {
        Write-Host "[-] Connection error: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Get-HikvisionEmployees {
    param($client, [string]$BaseUrl, [string]$OutputDir)
    Write-Host "`n[*] Fetching employee details from biometric device..." -ForegroundColor Cyan

    $employees = @()
    $position = 0
    $pageSize = 50
    $hasMore = $true

    while ($hasMore) {
        $searchCond = @{
            UserInfoSearchCond = @{
                searchID = "1"
                searchResultPosition = $position
                maxResults = $pageSize
            }
        } | ConvertTo-Json -Compress

        $content = [System.Net.Http.StringContent]::new($searchCond, [System.Text.Encoding]::UTF8, "application/json")
        try {
            $resp = $client.PostAsync("$BaseUrl/ISAPI/AccessControl/UserInfo/Search?format=json", $content).Result
            if (-not $resp.IsSuccessStatusCode) {
                Write-Host "[-] Employee search returned status: $($resp.StatusCode)" -ForegroundColor Yellow
                break
            }

            $jsonStr = $resp.Content.ReadAsStringAsync().Result
            $data = $jsonStr | ConvertFrom-Json

            $searchObj = $data.UserInfoSearch
            if ($null -eq $searchObj -or $null -eq $searchObj.UserInfo) {
                break
            }

            $users = $searchObj.UserInfo
            foreach ($u in $users) {
                $employees += [PSCustomObject]@{
                    EmployeeNo = $u.employeeNo
                    Name       = $u.name
                    UserType   = $u.userType
                    ValidBegin = $u.Valid.beginTime
                    ValidEnd   = $u.Valid.endTime
                    DoorRight  = $u.doorRight
                    NumOfCards = $u.numOfCard
                    NumOfFP    = $u.numOfFP
                    NumOfFaces = $u.numOfFace
                }
            }

            $total = [int]$searchObj.totalMatches
            $matched = [int]$searchObj.numOfMatches
            $position += $matched
            if ($position -ge $total -or $matched -eq 0) {
                $hasMore = $false
            }
        } catch {
            Write-Host "[-] Error fetching employees: $($_.Exception.Message)" -ForegroundColor Red
            break
        }
    }

    $csvPath = Join-Path $OutputDir "employees.csv"
    if ($employees.Count -gt 0) {
        $employees | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
        Write-Host "[+] Successfully imported $($employees.Count) employee(s) to: $csvPath" -ForegroundColor Green
        $employees | Format-Table -AutoSize
    } else {
        Write-Host "[-] No employee records found on device." -ForegroundColor Yellow
    }

    return $employees
}

function Get-HikvisionAttendance {
    param($client, [string]$BaseUrl, [string]$OutputDir, [datetime]$StartTime, [datetime]$EndTime)
    Write-Host "`n[*] Fetching attendance logs from biometric device..." -ForegroundColor Cyan

    $events = @()
    $position = 0
    $pageSize = 50
    $hasMore = $true

    $sTime = $StartTime.ToString("yyyy-MM-ddTHH:mm:sszzz")
    $eTime = $EndTime.ToString("yyyy-MM-ddTHH:mm:sszzz")

    while ($hasMore) {
        $eventCond = @{
            AcsEventCond = @{
                searchID = "1"
                searchResultPosition = $position
                maxResults = $pageSize
                major = 5
                minor = 0
                startTime = $sTime
                endTime = $eTime
            }
        } | ConvertTo-Json -Compress

        $content = [System.Net.Http.StringContent]::new($eventCond, [System.Text.Encoding]::UTF8, "application/json")
        try {
            $resp = $client.PostAsync("$BaseUrl/ISAPI/AccessControl/AcsEvent?format=json", $content).Result
            if (-not $resp.IsSuccessStatusCode) {
                Write-Host "[-] Attendance query returned status: $($resp.StatusCode)" -ForegroundColor Yellow
                break
            }

            $jsonStr = $resp.Content.ReadAsStringAsync().Result
            $data = $jsonStr | ConvertFrom-Json

            $acsObj = $data.AcsEvent
            if ($null -eq $acsObj -or $null -eq $acsObj.InfoList) {
                break
            }

            $records = $acsObj.InfoList
            foreach ($r in $records) {
                $events += [PSCustomObject]@{
                    Time        = $r.time
                    EmployeeNo  = $r.employeeNoString
                    Name        = $r.name
                    CardNo      = $r.cardNo
                    MajorType   = $r.major
                    MinorType   = $r.minor
                    CardReader  = $r.cardReaderNo
                    DoorNo      = $r.doorNo
                }
            }

            $total = [int]$acsObj.totalMatches
            $matched = [int]$acsObj.numOfMatches
            $position += $matched
            if ($position -ge $total -or $matched -eq 0) {
                $hasMore = $false
            }
        } catch {
            Write-Host "[-] Error fetching attendance: $($_.Exception.Message)" -ForegroundColor Red
            break
        }
    }

    $csvPath = Join-Path $OutputDir "attendance_logs.csv"
    if ($events.Count -gt 0) {
        $events | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
        Write-Host "[+] Successfully imported $($events.Count) attendance log(s) to: $csvPath" -ForegroundColor Green
        $events | Select-Object -First 20 | Format-Table -AutoSize
    } else {
        Write-Host "[-] No attendance records found for range $sTime to $eTime." -ForegroundColor Yellow
    }

    return $events
}

# --- Main Execution ---
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Hikvision Dual Biometric Terminal Importer (Petrol Bunk)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Configured Terminals: $($DeviceIPs -join ', ')"
Write-Host "Port                : $DevicePort"
Write-Host "Username            : $Username"

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = Read-Host "Enter the device password (or iVMS admin password)"
}

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) {
    $scriptDir = (Get-Location).Path
}

$client = Get-HttpClient -User $Username -Pass $Password
$allEmployees = @()
$allAttendance = @()

foreach ($devIp in $DeviceIPs) {
    $termName = if ($devIp -eq "192.168.1.174") { "Management (192.168.1.174)" } else { "Staff (192.168.1.100)" }
    Write-Host "`n>>> Processing Terminal: $termName ($devIp) <<<" -ForegroundColor Green
    $baseUrl = "http://${devIp}:${DevicePort}"
    
    $authResult = Test-DeviceAuth -client $client -BaseUrl $baseUrl
    if ($authResult.Success) {
        $devEmployees = Get-HikvisionEmployees -client $client -BaseUrl $baseUrl -OutputDir $scriptDir
        $startDate = (Get-Date).AddDays(-30)
        $endDate = (Get-Date).AddDays(1)
        $devAttendance = Get-HikvisionAttendance -client $client -BaseUrl $baseUrl -OutputDir $scriptDir -StartTime $startDate -EndTime $endDate
        $allEmployees += $devEmployees
        $allAttendance += $devAttendance
    } else {
        Write-Host "[-] Could not authenticate with terminal $termName ($devIp)." -ForegroundColor Yellow
    }
}

Write-Host "`n[+] Completed dual device sync. Total Employees: $($allEmployees.Count), Total Punches: $($allAttendance.Count)" -ForegroundColor Cyan
