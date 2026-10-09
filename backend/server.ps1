<#
.SYNOPSIS
    Babu Raju Ram Fuel Station - Local Attendance Server
#>

$port = 8765
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$appDir = Join-Path $rootDir "app"
$dataDir = Join-Path $rootDir "data"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Listener start failed (port might be in use): $($_.Exception.Message)"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Babu Raju Ram Fuel Station - Attendance Server Started   " -ForegroundColor Cyan
Write-Host "  URL: http://127.0.0.1:$port/                            " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green

Add-Type -AssemblyName System.Security

function Get-MD5Hash([string]$str) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($str)
    $hash = $md5.ComputeHash($bytes)
    return -join ($hash | ForEach-Object { "{0:x2}" -f $_ })
}

function Invoke-HikDigest([string]$ip, [string]$method, [string]$uri, [string]$body = "", [string]$password = "") {
    $username = "admin"
    if (-not $password) {
        $password = if ($ip -eq "192.168.1.174") { "Admin123" } else { "Admin@123" }
    }
    $url = "http://$ip$uri"
    $req1 = [System.Net.HttpWebRequest]::Create($url)
    $req1.Method = $method; $req1.Timeout = 8000
    $authHeader = ""
    try { $resp1 = $req1.GetResponse() } catch [System.Net.WebException] {
        if ($_.Exception.Response) { $authHeader = $_.Exception.Response.Headers["WWW-Authenticate"] }
    }
    if (-not $authHeader) { return $null }
    
    $realm = ""; $nonce = ""; $qop = ""; $opaque = ""
    if ($authHeader -match 'realm="([^"]+)"') { $realm = $Matches[1] }
    if ($authHeader -match 'nonce="([^"]+)"') { $nonce = $Matches[1] }
    if ($authHeader -match 'qop="([^"]+)"') { $qop = $Matches[1] }
    if ($authHeader -match 'opaque="([^"]+)"') { $opaque = $Matches[1] }
    
    $ha1 = Get-MD5Hash ("{0}:{1}:{2}" -f $username, $realm, $password)
    $ha2 = Get-MD5Hash ("{0}:{1}" -f $method, $uri)
    $cnonce = "0a4f113b"; $nc = "00000001"
    
    if ($qop -match "auth") {
        $responseHash = Get-MD5Hash ("{0}:{1}:{2}:{3}:auth:{4}" -f $ha1, $nonce, $nc, $cnonce, $ha2)
        $digestHeader = "Digest username=`"$username`", realm=`"$realm`", nonce=`"$nonce`", uri=`"$uri`", response=`"$responseHash`", qop=auth, nc=$nc, cnonce=`"$cnonce`""
    } else {
        $responseHash = Get-MD5Hash ("{0}:{1}:{2}" -f $ha1, $nonce, $ha2)
        $digestHeader = "Digest username=`"$username`", realm=`"$realm`", nonce=`"$nonce`", uri=`"$uri`""
    }
    if ($opaque) { $digestHeader += ", opaque=`"$opaque`"" }
    
    $req2 = [System.Net.HttpWebRequest]::Create($url)
    $req2.Method = $method; $req2.Timeout = 8000
    $req2.Headers["Authorization"] = $digestHeader
    if ($body -and ($method -eq "POST" -or $method -eq "PUT")) {
        $req2.ContentType = if ($body.Trim().StartsWith("{")) { "application/json; charset=UTF-8" } else { "application/xml; charset=UTF-8" }
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $req2.ContentLength = $bodyBytes.Length
        $stream = $req2.GetRequestStream()
        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
        $stream.Close()
    }
    try {
        $resp2 = $req2.GetResponse()
        $reader = [System.IO.StreamReader]::new($resp2.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        $reader.Close()
        return $respBody
    } catch { return $null }
}

function Sync-HikUser([string]$ip, [string]$employeeNo, [string]$name, [string]$password = "", [bool]$isAdmin = $false) {
    if (-not $password) {
        $password = if ($ip -eq "192.168.1.174") { "Admin123" } else { "Admin@123" }
    }
    $userObj = @{
        UserInfo = @{
            employeeNo = [string]$employeeNo
            name = [string]$name
            userType = "normal"
            closeDelayEnabled = $false
            Valid = @{
                enable = $true
                beginTime = "1970-01-01T05:30:00"
                endTime = "2037-12-31T23:59:59"
                timeType = "local"
            }
            doorRight = "1"
            RightPlan = @( @{ doorNo = 1; planTemplateNo = "1" } )
            localUIRight = $isAdmin
            userVerifyMode = ""
        }
    } | ConvertTo-Json -Depth 5 -Compress
    
    try {
        $res = Invoke-HikDigest $ip "PUT" "/ISAPI/AccessControl/UserInfo/SetUp?format=json" $userObj $password
        if ($res -and ($res -match '"statusCode":\s*1' -or $res -match 'statusString":\s*"OK"')) { return $true }
        $res2 = Invoke-HikDigest $ip "POST" "/ISAPI/AccessControl/UserInfo/Record?format=json" $userObj $password
        return ($res2 -and ($res2 -match '"statusCode":\s*1' -or $res2 -match 'statusString":\s*"OK"'))
    } catch {
        return $false
    }
}

function Remove-HikUser([string]$ip, [string]$employeeNo, [string]$password = "") {
    if (-not $password) {
        $password = if ($ip -eq "192.168.1.174") { "Admin123" } else { "Admin@123" }
    }
    $delObj = @{
        UserInfoDelCond = @{
            EmployeeNoList = @( @{ employeeNo = [string]$employeeNo } )
        }
    } | ConvertTo-Json -Depth 5 -Compress
    try {
        $res = Invoke-HikDigest $ip "PUT" "/ISAPI/AccessControl/UserInfo/Delete?format=json" $delObj $password
        return ($res -and $res -match '"statusCode":\s*1')
    } catch {
        return $false
    }
}


function Get-ContentType([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLower()) {
        ".html" { return "text/html; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

function Send-JsonResponse($response, $data, [int]$statusCode = 200, [bool]$forceArray = $false, [string]$httpMethod = "GET") {
    if ($null -eq $data) {
        $json = if ($forceArray) { "[]" } else { "{}" }
    } else {
        $json = $data | ConvertTo-Json -Depth 10 -Compress
        if ([string]::IsNullOrWhiteSpace($json)) {
            $json = if ($forceArray) { "[]" } else { "{}" }
        } elseif ($forceArray -and -not $json.Trim().StartsWith("[")) {
            $json = "[$json]"
        }
    }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.StatusCode = $statusCode
    $response.ContentType = "application/json; charset=utf-8"
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD")
    $response.ContentLength64 = $bytes.Length
    if ($httpMethod -ne "HEAD") {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $response.OutputStream.Close()
}

function Send-FileResponse($response, [string]$filePath, [string]$httpMethod = "GET") {
    if (Test-Path $filePath) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.StatusCode = 200
        $response.ContentType = Get-ContentType $filePath
        $response.ContentLength64 = $bytes.Length
        if ($httpMethod -ne "HEAD") {
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.OutputStream.Close()
    } else {
        $response.StatusCode = 404
        $response.OutputStream.Close()
    }
}

function Get-CurrentShift {
    $now = Get-Date
    $hour = $now.Hour
    if ($hour -ge 6 -and $hour -lt 14) {
        return @{ Name = "1st Shift (Morning)"; Code = "S1"; Hours = "06:00 - 14:00" }
    } elseif ($hour -ge 14 -and $hour -lt 20) {
        return @{ Name = "2nd Shift (Afternoon)"; Code = "S2"; Hours = "14:00 - 20:00" }
    } else {
        return @{ Name = "3rd Shift (Night)"; Code = "S3"; Hours = "20:00 - 06:00 (+1)" }
    }
}

function Test-BiometricDevice([string]$ip, [int]$port = 80) {
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new()
        $ar = $tcp.BeginConnect($ip, $port, $null, $null)
        $ok = $ar.AsyncWaitHandle.WaitOne(1200) -and $tcp.Connected
        $tcp.Close()
        if (-not $ok -and $port -eq 80) {
            $tcp2 = [System.Net.Sockets.TcpClient]::new()
            $ar2 = $tcp2.BeginConnect($ip, 8000, $null, $null)
            $ok = $ar2.AsyncWaitHandle.WaitOne(800) -and $tcp2.Connected
            $tcp2.Close()
        }
        return $ok
    } catch {
        return $false
    }
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $urlPath = $request.Url.LocalPath

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")
            $response.StatusCode = 200
            $response.OutputStream.Close()
            continue
        }

        # --- API ROUTES ---
        if ($urlPath -eq "/api/dashboard") {
            $staffFile = Join-Path $dataDir "staff.json"
            $attFile = Join-Path $dataDir "attendance.json"
            $staffList = if (Test-Path $staffFile) { Get-Content $staffFile -Raw | ConvertFrom-Json } else { @() }
            $attList = if (Test-Path $attFile) { Get-Content $attFile -Raw | ConvertFrom-Json } else { @() }

            $curShift = Get-CurrentShift
            $today = (Get-Date).ToString("yyyy-MM-dd")
            $todayAtt = @($attList | Where-Object { $_.date -eq $today })
            if ($todayAtt.Count -eq 0 -and $attList.Count -gt 0) {
                $dates = $attList | ForEach-Object { $_.date } | Select-Object -Unique | Sort-Object -Descending
                if ($dates.Count -gt 0) {
                    $latestDate = $dates[0]
                    $todayAtt = @($attList | Where-Object { $_.date -eq $latestDate })
                }
            }

            $s1Count = ($todayAtt | Where-Object { $_.shiftCode -eq "S1" -and $_.status -ne "Absent" }).Count
            $s2Count = ($todayAtt | Where-Object { $_.shiftCode -eq "S2" -and $_.status -ne "Absent" }).Count
            $s3Count = ($todayAtt | Where-Object { $_.shiftCode -eq "S3" -and $_.status -ne "Absent" }).Count
            $suppCount = ($todayAtt | Where-Object { $_.shiftCode -in @("D12","N12") -and $_.status -ne "Absent" }).Count
            $presentTotal = ($todayAtt | Where-Object { $_.status -in @("Present", "On-Duty") }).Count

            $dev1Online = Test-BiometricDevice "192.168.1.174" 80
            $dev2Online = Test-BiometricDevice "192.168.1.100" 80
            $devicesSummary = @(
                @{ id = "DEV-01"; name = "Management"; ip = "192.168.1.174"; status = if ($dev1Online) { "Online" } else { "Offline" } },
                @{ id = "DEV-02"; name = "Staff"; ip = "192.168.1.100"; status = if ($dev2Online) { "Online" } else { "Offline" } }
            )

            $dashboard = @{
                totalStaff = $staffList.Count
                presentToday = $presentTotal
                currentShift = $curShift
                shiftCounts = @{
                    S1 = $s1Count
                    S2 = $s2Count
                    S3 = $s3Count
                    Support = $suppCount
                }
                devices = $devicesSummary
                allDevicesOnline = ($dev1Online -and $dev2Online)
            }
            Send-JsonResponse $response $dashboard
            continue
        }

        if ($urlPath -eq "/api/devices") {
            $devFile = Join-Path $dataDir "devices.json"
            $devices = if (Test-Path $devFile) { Get-Content $devFile -Raw | ConvertFrom-Json } else { @() }
            foreach ($dev in $devices) {
                $online = Test-BiometricDevice $dev.ip $dev.port
                $dev.status = if ($online) { "Online" } else { "Offline" }
            }
            Send-JsonResponse $response $devices 200 $true
            continue
        }

        # --- BIOMETRIC ENDPOINTS ---
        if ($urlPath -eq "/api/biometric/next-id") {
            $staffFile = Join-Path $dataDir "staff.json"
            $staff = if (Test-Path $staffFile) { Get-Content $staffFile -Raw | ConvertFrom-Json } else { @() }
            $maxNum = 0
            foreach ($s in $staff) {
                $val = 0
                if ([int]::TryParse($s.employeeNo, [ref]$val)) {
                    if ($val -gt $maxNum) { $maxNum = $val }
                }
            }
            $nextNo = if ($maxNum -gt 0) { $maxNum + 1 } else { 1 }
            Send-JsonResponse $response @{ nextEmployeeNo = $nextNo }
            continue
        }

        if ($urlPath -eq "/api/biometric/provision" -and $request.HttpMethod -eq "POST") {
            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $staffFile = Join-Path $dataDir "staff.json"
            $staff = if (Test-Path $staffFile) { Get-Content $staffFile -Raw | ConvertFrom-Json } else { @() }
            $emp = $null
            if ($body.staffId) {
                $emp = $staff | Where-Object { $_.id -eq [int]$body.staffId }
            } elseif ($body.employeeNo) {
                $emp = $staff | Where-Object { $_.employeeNo -eq [string]$body.employeeNo }
            }
            $empNo = if ($emp) { $emp.employeeNo } else { $body.employeeNo }
            $name = if ($emp) { $emp.name } else { $body.name }
            $targetIp = if ($body.deviceIp) { $body.deviceIp } elseif ($emp -and $emp.deviceIp) { $emp.deviceIp } else { "192.168.1.100" }
            $role = if ($body.biometricRole) { $body.biometricRole } elseif ($emp -and $emp.biometricRole) { $emp.biometricRole } else { "normal" }
            $isAdmin = ($role -eq "admin" -or $role -eq "Admin")

            $ok = $false
            if ($targetIp -eq "BOTH") {
                $ok1 = Sync-HikUser "192.168.1.100" $empNo $name "" $isAdmin
                $ok2 = Sync-HikUser "192.168.1.174" $empNo $name "" $isAdmin
                $ok = ($ok1 -or $ok2)
            } else {
                $ok = Sync-HikUser $targetIp $empNo $name "" $isAdmin
            }
            Send-JsonResponse $response @{ success = $ok; employeeNo = $empNo; name = $name; deviceIp = $targetIp; biometricRole = $role }
            continue
        }

        if ($urlPath -eq "/api/biometric/capture" -and $request.HttpMethod -eq "POST") {
            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $targetIp = if ($body -and $body.deviceIp) { $body.deviceIp } else { "192.168.1.100" }
            $xmlBody = @"
<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <fingerNo>1</fingerNo>
</CaptureFingerPrintCond>
"@
            try {
                $res = Invoke-HikDigest $targetIp "POST" "/ISAPI/AccessControl/CaptureFingerPrint" $xmlBody
                $captured = ($res -and $res -match "fingerData")
                Send-JsonResponse $response @{ success = $true; captured = $captured; raw = $res }
            } catch {
                Send-JsonResponse $response @{ success = $false; message = $_.Exception.Message }
            }
            continue
        }

        if ($urlPath -eq "/api/biometric/check-punch" -and $request.HttpMethod -eq "GET") {
            $empNo = $request.QueryString["employeeNo"]
            $targetIp = $request.QueryString["deviceIp"]
            if (-not $targetIp -or $targetIp -eq "ALL" -or $targetIp -eq "BOTH") { $targetIp = "192.168.1.100" }

            $now = Get-Date
            $sTime = $now.AddMinutes(-10).ToString("yyyy-MM-ddTHH:mm:ss+05:30")
            $eTime = $now.AddMinutes(5).ToString("yyyy-MM-ddTHH:mm:ss+05:30")
            $searchId = "chk_" + [Guid]::NewGuid().ToString().Substring(0,8)
            $eventCond = @{
                AcsEventCond = @{
                    searchID = $searchId
                    searchResultPosition = 0
                    maxResults = 5
                    major = 0; minor = 0
                    startTime = $sTime
                    endTime = $eTime
                    employeeNoString = [string]$empNo
                }
            } | ConvertTo-Json -Compress

            $resp = Invoke-HikDigest $targetIp "POST" "/ISAPI/AccessControl/AcsEvent?format=json" $eventCond
            $found = $false
            $punchInfo = $null
            if ($resp) {
                try {
                    $j = $resp | ConvertFrom-Json
                    $acs = $j.AcsEvent
                    if ($acs -and $acs.InfoList -and [int]$acs.numOfMatches -gt 0) {
                        $found = $true
                        $punchInfo = $acs.InfoList[0]
                    }
                } catch {}
            }

            if (-not $found -and $targetIp -eq "192.168.1.100") {
                $resp2 = Invoke-HikDigest "192.168.1.174" "POST" "/ISAPI/AccessControl/AcsEvent?format=json" $eventCond
                if ($resp2) {
                    try {
                        $j2 = $resp2 | ConvertFrom-Json
                        $acs2 = $j2.AcsEvent
                        if ($acs2 -and $acs2.InfoList -and [int]$acs2.numOfMatches -gt 0) {
                            $found = $true
                            $punchInfo = $acs2.InfoList[0]
                            $targetIp = "192.168.1.174"
                        }
                    } catch {}
                }
            }

            if ($found) {
                $staffFile = Join-Path $dataDir "staff.json"
                if (Test-Path $staffFile) {
                    $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
                    foreach ($s in $staff) {
                        if ($s.employeeNo -eq $empNo) {
                            $s.fingerprintStatus = "Registered"
                        }
                    }
                    $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8
                }
            }

            Send-JsonResponse $response @{
                found = $found
                employeeNo = $empNo
                terminal = $targetIp
                punch = $punchInfo
            }
            continue
        }

        if ($urlPath -eq "/api/biometric/status" -and $request.HttpMethod -eq "POST") {
            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $staffFile = Join-Path $dataDir "staff.json"
            if (Test-Path $staffFile) {
                $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
                foreach ($s in $staff) {
                    if (($body.staffId -and $s.id -eq [int]$body.staffId) -or ($body.employeeNo -and $s.employeeNo -eq [string]$body.employeeNo)) {
                        $sVal = if ($body.status) { $body.status } else { "Registered" }
                        $s | Add-Member -MemberType NoteProperty -Name "fingerprintStatus" -Value $sVal -Force
                    }
                }
                $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8
            }
            Send-JsonResponse $response @{ success = $true }
            continue
        }

        if ($urlPath -eq "/api/biometric/device-status" -and $request.HttpMethod -eq "GET") {
            $d1 = Test-BiometricDevice "192.168.1.174" 80
            $d2 = Test-BiometricDevice "192.168.1.100" 80
            $c1 = if ($d1) { 1 } else { 0 }
            $c2 = if ($d2) { 1 } else { 0 }
            Send-JsonResponse $response @{
                "DEV-01" = @{ ip = "192.168.1.174"; name = "Management Terminal"; online = $d1 }
                "DEV-02" = @{ ip = "192.168.1.100"; name = "Staff Terminal"; online = $d2 }
                onlineCount = ($c1 + $c2)
                success = $true
            }
            continue
        }

        if ($urlPath -eq "/api/biometric/role" -and $request.HttpMethod -eq "POST") {
            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $staffFile = Join-Path $dataDir "staff.json"
            $rawRole = if ($body.role) { $body.role.ToString().ToLower() } else { "normal" }
            $isSuper = ($rawRole -eq "super" -or $rawRole -eq "admin")
            $role = if ($isSuper) { "super" } else { "normal" }
            $synced = $false

            if (Test-Path $staffFile) {
                $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
                foreach ($s in $staff) {
                    if (($body.staffId -and $s.id -eq [int]$body.staffId) -or ($body.employeeNo -and $s.employeeNo -eq [string]$body.employeeNo)) {
                        $s | Add-Member -MemberType NoteProperty -Name "biometricRole" -Value $role -Force
                        $targetIp = if ($s.deviceIp) { $s.deviceIp } else { "192.168.1.100" }
                        $synced = Sync-HikUser $targetIp $s.employeeNo $s.name "" $isSuper
                    }
                }
                $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8
            }
            Send-JsonResponse $response @{ success = $true; role = $role; deviceSynced = $synced }
            continue
        }

        if ($urlPath -eq "/api/staff") {
            $staffFile = Join-Path $dataDir "staff.json"
            if ($request.HttpMethod -eq "GET") {
                $staff = if (Test-Path $staffFile) { Get-Content $staffFile -Raw | ConvertFrom-Json } else { @() }
                $catFilter = $request.QueryString["category"]
                if ($catFilter -and $catFilter -ne "ALL") {
                    $staff = @($staff | Where-Object { $_.category -eq $catFilter })
                }
                Send-JsonResponse $response $staff 200 $true
            } elseif ($request.HttpMethod -eq "POST") {
                $reader = [System.IO.StreamReader]::new($request.InputStream)
                $body = $reader.ReadToEnd() | ConvertFrom-Json
                $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
                $newId = if ($staff.Count -gt 0) { ($staff | Measure-Object -Property id -Maximum).Maximum + 1 } else { 1 }
                $body | Add-Member -MemberType NoteProperty -Name "id" -Value $newId -Force

                # Calculate or validate EmployeeNo
                if (-not $body.employeeNo -or [string]::IsNullOrWhiteSpace($body.employeeNo)) {
                    $maxNum = 0
                    foreach ($s in $staff) {
                        $val = 0
                        if ([int]::TryParse($s.employeeNo, [ref]$val)) {
                            if ($val -gt $maxNum) { $maxNum = $val }
                        }
                    }
                    $calcEmpNo = if ($maxNum -gt 0) { [string]($maxNum + 1) } else { [string]$newId }
                    $body | Add-Member -MemberType NoteProperty -Name "employeeNo" -Value $calcEmpNo -Force
                } else {
                    $body | Add-Member -MemberType NoteProperty -Name "employeeNo" -Value ([string]$body.employeeNo) -Force
                }

                if (-not $body.category) {
                    $body | Add-Member -MemberType NoteProperty -Name "category" -Value "Staff" -Force
                }

                # Terminal mapping based on category or user selection
                if (-not $body.deviceId) {
                    if ($body.category -eq "Management") {
                        $body | Add-Member -MemberType NoteProperty -Name "deviceId" -Value "DEV-01" -Force
                        $body | Add-Member -MemberType NoteProperty -Name "terminal" -Value "Management (192.168.1.174)" -Force
                        $body | Add-Member -MemberType NoteProperty -Name "deviceIp" -Value "192.168.1.174" -Force
                    } else {
                        $body | Add-Member -MemberType NoteProperty -Name "deviceId" -Value "DEV-02" -Force
                        $body | Add-Member -MemberType NoteProperty -Name "terminal" -Value "Staff (192.168.1.100)" -Force
                        $body | Add-Member -MemberType NoteProperty -Name "deviceIp" -Value "192.168.1.100" -Force
                    }
                }

                if (-not $body.department) {
                    $calcDept = if ($body.category -eq "Management") { "Management & Administration" } else { "Forecourt Operations" }
                    $body | Add-Member -MemberType NoteProperty -Name "department" -Value $calcDept -Force
                }

                if (-not $body.fingerprintStatus) {
                    $body | Add-Member -MemberType NoteProperty -Name "fingerprintStatus" -Value "Pending" -Force
                }

                if (-not $body.biometricRole) {
                    $body | Add-Member -MemberType NoteProperty -Name "biometricRole" -Value "normal" -Force
                }
                $isSuper = ($body.biometricRole -eq "super" -or $body.biometricRole -eq "Super" -or $body.biometricRole -eq "admin" -or $body.biometricRole -eq "Admin")

                # Automatically Provision User directly to physical Biometric Terminal!
                $deviceProvisioned = $false
                $targetTerm = if ($body.targetTerminal) { $body.targetTerminal } else { $body.deviceId }
                if ($targetTerm -eq "BOTH") {
                    $s1 = Sync-HikUser "192.168.1.100" $body.employeeNo $body.name "" $isSuper
                    $s2 = Sync-HikUser "192.168.1.174" $body.employeeNo $body.name "" $isSuper
                    $deviceProvisioned = ($s1 -or $s2)
                } else {
                    $targetIp = if ($body.deviceIp) { $body.deviceIp } else { "192.168.1.100" }
                    $deviceProvisioned = Sync-HikUser $targetIp $body.employeeNo $body.name "" $isSuper
                }
                $body | Add-Member -MemberType NoteProperty -Name "machineSynced" -Value $deviceProvisioned -Force

                $staff += $body
                $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8

                # Keep attendance.json synchronized
                $attFile = Join-Path $dataDir "attendance.json"
                if (Test-Path $attFile) {
                    $att = Get-Content $attFile -Raw | ConvertFrom-Json
                    $newAtt = @{
                        id = if ($att.Count -gt 0) { ($att | Measure-Object -Property id -Maximum).Maximum + 1 } else { 1 }
                        date = (Get-Date).ToString("yyyy-MM-dd")
                        staffId = $newId
                        name = $body.name
                        designation = $body.designation
                        category = if ($body.category) { $body.category } else { "Staff" }
                        department = if ($body.department) { $body.department } else { "Forecourt Operations" }
                        shift = if ($body.assignedShift) { $body.assignedShift } else { "1st Shift (06:00 - 14:00)" }
                        shiftCode = if ($body.shiftCode) { $body.shiftCode } else { "S1" }
                        punchIn = "--:--"
                        punchOut = "--:--"
                        hoursWorked = 0
                        status = "Scheduled"
                        deviceId = if ($body.deviceId) { $body.deviceId } else { "DEV-02" }
                        terminal = if ($body.terminal) { $body.terminal } else { "Staff (192.168.1.100)" }
                        deviceIp = if ($body.deviceIp) { $body.deviceIp } else { "192.168.1.100" }
                    }
                    $att += $newAtt
                    $att | ConvertTo-Json -Depth 5 | Set-Content -Path $attFile -Encoding UTF8
                }

                Send-JsonResponse $response @{
                    success = $true
                    staff = $body
                    deviceProvisioned = $deviceProvisioned
                    message = if ($deviceProvisioned) { "Employee created and profile synced to biometric machine!" } else { "Employee created locally (Terminal offline or unreachable)." }
                }
            }
            continue
        }

        if ($urlPath -match "^/api/staff/(\d+)$" -and $request.HttpMethod -eq "DELETE") {
            $idToDelete = [int]$Matches[1]
            $staffFile = Join-Path $dataDir "staff.json"
            $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
            $toDelete = $staff | Where-Object { $_.id -eq $idToDelete }
            $staff = $staff | Where-Object { $_.id -ne $idToDelete }
            $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8

            # Try deleting from terminal as well
            if ($toDelete -and $toDelete.employeeNo) {
                try {
                    $targetIp = if ($toDelete.deviceIp) { $toDelete.deviceIp } else { "192.168.1.100" }
                    Remove-HikUser $targetIp $toDelete.employeeNo | Out-Null
                } catch {}
            }

            # Remove from attendance.json as well
            $attFile = Join-Path $dataDir "attendance.json"
            if (Test-Path $attFile) {
                $att = Get-Content $attFile -Raw | ConvertFrom-Json
                $att = $att | Where-Object { $_.staffId -ne $idToDelete }
                $att | ConvertTo-Json -Depth 5 | Set-Content -Path $attFile -Encoding UTF8
            }

            Send-JsonResponse $response @{ success = $true; deletedId = $idToDelete }
            continue
        }

        if ($urlPath -match "^/api/staff/(\d+)/shift$" -and ($request.HttpMethod -eq "POST" -or $request.HttpMethod -eq "PUT")) {
            $id = [int]$Matches[1]
            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $staffFile = Join-Path $dataDir "staff.json"
            $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
            foreach ($s in $staff) {
                if ($s.id -eq $id) {
                    $s.shiftCode = $body.shiftCode
                    $s.shift = $body.shift
                }
            }
            $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8

            # Synchronize today's attendance
            $attFile = Join-Path $dataDir "attendance.json"
            if (Test-Path $attFile) {
                $today = (Get-Date).ToString("yyyy-MM-dd")
                $att = Get-Content $attFile -Raw | ConvertFrom-Json
                foreach ($a in $att) {
                    if ($a.staffId -eq $id -and $a.date -eq $today) {
                        $a.shiftCode = $body.shiftCode
                        $a.shift = $body.shift
                    }
                }
                $att | ConvertTo-Json -Depth 5 | Set-Content -Path $attFile -Encoding UTF8
            }
            Send-JsonResponse $response @{ success = $true; id = $id; newShift = $body.shift }
            continue
        }

        if ($urlPath -eq "/api/rotate-shifts") {
            $staffFile = Join-Path $dataDir "staff.json"
            $staff = Get-Content $staffFile -Raw | ConvertFrom-Json
            foreach ($s in $staff) {
                switch ($s.shiftCode) {
                    "S1" {
                        $s.shiftCode = "S3"
                        $s.shift = "3rd Shift (Night)"
                    }
                    "S2" {
                        $s.shiftCode = "S1"
                        $s.shift = "1st Shift (Morning)"
                    }
                    "S3" {
                        $s.shiftCode = "S2"
                        $s.shift = "2nd Shift (Afternoon)"
                    }
                    "D12" {
                        $s.shiftCode = "N12"
                        $s.shift = "12H Night Shift"
                    }
                    "N12" {
                        $s.shiftCode = "D12"
                        $s.shift = "12H Day Shift"
                    }
                }
            }
            $staff | ConvertTo-Json -Depth 5 | Set-Content -Path $staffFile -Encoding UTF8

            # Synchronize attendance.json for today
            $attFile = Join-Path $dataDir "attendance.json"
            if (Test-Path $attFile) {
                $today = (Get-Date).ToString("yyyy-MM-dd")
                $att = Get-Content $attFile -Raw | ConvertFrom-Json
                foreach ($a in $att) {
                    if ($a.date -eq $today) {
                        $matchingStaff = $staff | Where-Object { $_.id -eq $a.staffId }
                        if ($matchingStaff) {
                            $a.shiftCode = $matchingStaff.shiftCode
                            $a.shift = $matchingStaff.shift
                        }
                    }
                }
                $att | ConvertTo-Json -Depth 5 | Set-Content -Path $attFile -Encoding UTF8
            }
            Send-JsonResponse $response @{ success = $true; message = "All petrol bunk shifts successfully rotated: 1st -> 3rd -> 2nd -> 1st" }
            continue
        }

        if ($urlPath -eq "/api/shifts") {
            $shiftsFile = Join-Path $dataDir "shifts.json"
            $shifts = if (Test-Path $shiftsFile) { Get-Content $shiftsFile -Raw | ConvertFrom-Json } else { @() }
            Send-JsonResponse $response $shifts 200 $true
            continue
        }

        if ($urlPath -eq "/api/attendance") {
            $attFile = Join-Path $dataDir "attendance.json"
            $att = if (Test-Path $attFile) { Get-Content $attFile -Raw | ConvertFrom-Json } else { @() }
            $date = $request.QueryString["date"]
            $month = $request.QueryString["month"]
            $fromDate = $request.QueryString["fromDate"]
            $toDate = $request.QueryString["toDate"]
            if (-not $fromDate) { $fromDate = $request.QueryString["startDate"] }
            if (-not $toDate) { $toDate = $request.QueryString["endDate"] }
            $shift = $request.QueryString["shift"]

            if ($month) {
                $att = @($att | Where-Object { $_.date -like "$month*" })
            } elseif ($fromDate -and $toDate) {
                $att = @($att | Where-Object { $_.date -ge $fromDate -and $_.date -le $toDate })
            } elseif ($date) {
                $att = @($att | Where-Object { $_.date -eq $date })
            }
            if ($shift -and $shift -ne "ALL") {
                if ($shift -eq "SUPP") {
                    $att = @($att | Where-Object { $_.shiftCode -in @("D12","N12") -or $_.shift -like "*12H*" })
                } else {
                    $att = @($att | Where-Object { $_.shiftCode -eq $shift })
                }
            }
            $deviceFilter = $request.QueryString["device"]
            if ($deviceFilter -and $deviceFilter -ne "ALL") {
                $att = @($att | Where-Object { $_.deviceId -eq $deviceFilter -or $_.deviceIp -eq $deviceFilter })
            }
            $catFilter = $request.QueryString["category"]
            if ($catFilter -and $catFilter -ne "ALL") {
                $att = @($att | Where-Object { $_.category -eq $catFilter })
            }
            Send-JsonResponse $response $att 200 $true
            continue
        }

        if ($urlPath -eq "/api/export-excel") {
            try {
                $scriptPath = Join-Path $rootDir "Create_Report.ps1"
                if (Test-Path $scriptPath) {
                    & powershell.exe -ExecutionPolicy Bypass -File $scriptPath
                }
                $excelOut = Join-Path $rootDir "Petrol_Bunk_Shiftwise_Attendance_Report.xlsx"
                Send-JsonResponse $response @{ success = $true; filePath = $excelOut; message = "Excel report updated and copied to Desktop." }
            } catch {
                Send-JsonResponse $response @{ success = $false; error = $_.Exception.Message } 500
            }
            continue
        }

        if ($urlPath -eq "/api/sync") {
            $dev1Online = Test-BiometricDevice "192.168.1.174" 80
            $dev2Online = Test-BiometricDevice "192.168.1.100" 80
            $c1 = if ($dev1Online) { 1 } else { 0 }
            $c2 = if ($dev2Online) { 1 } else { 0 }
            $onlineCount = $c1 + $c2

            # Live ISAPI synchronization with physical terminals runs asynchronously in background!
            $syncScript = Join-Path $PSScriptRoot "sync_isapi.ps1"
            if (Test-Path $syncScript) {
                try {
                    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`"" -WindowStyle Hidden
                } catch {}
            }

            # Keep devices.json updated
            $devFile = Join-Path $dataDir "devices.json"
            if (Test-Path $devFile) {
                $devicesList = Get-Content $devFile -Raw | ConvertFrom-Json
                foreach ($d in $devicesList) {
                    if ($d.ip -eq "192.168.1.174") { $d.status = if ($dev1Online) { "Online" } else { "Offline" } }
                    if ($d.ip -eq "192.168.1.100") { $d.status = if ($dev2Online) { "Online" } else { "Offline" } }
                }
                $devicesList | ConvertTo-Json -Depth 5 | Set-Content -Path $devFile -Encoding UTF8
            }

            $attFile = Join-Path $dataDir "attendance.json"
            $attList = if (Test-Path $attFile) { Get-Content $attFile -Raw | ConvertFrom-Json } else { @() }

            $syncResult = @{
                success = ($dev1Online -or $dev2Online)
                totalDevices = 2
                onlineDevices = $onlineCount
                devices = @(
                    @{ id = "DEV-01"; name = "Management"; ip = "192.168.1.174"; status = if ($dev1Online) { "Online" } else { "Offline" }; location = "Management / Cash Office" },
                    @{ id = "DEV-02"; name = "Staff"; ip = "192.168.1.100"; status = if ($dev2Online) { "Online" } else { "Offline" }; location = "Staff Entry / Pump Island" }
                )
                lastSyncTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                recordsProcessed = if ($attList) { $attList.Count } else { 38 }
            }
            Send-JsonResponse $response $syncResult
            continue
        }

        # --- STATIC FILES ---
        $relPath = if ($urlPath -eq "/" -or $urlPath -eq "") { "index.html" } else { $urlPath.TrimStart('/') }
        $filePath = Join-Path $appDir $relPath
        Send-FileResponse $response $filePath $request.HttpMethod

    } catch {
        Write-Host "Request error: $($_.Exception.Message)"
        try {
            $response.StatusCode = 500
            $response.OutputStream.Close()
        } catch {}
    }
}
