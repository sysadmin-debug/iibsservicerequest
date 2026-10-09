param(
    [string]$Month = "2026-09",
    [string]$Category = "ALL"
)

$rootDir = "d:\Antigravity\Biometric for petrol bunk"
$attFile = Join-Path $rootDir "data\attendance.json"
if (-not (Test-Path $attFile)) {
    Write-Host "Attendance file not found: $attFile" -ForegroundColor Red
    exit 1
}

$allRecords = Get-Content $attFile -Raw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($Month)) {
    $Month = (Get-Date).ToString("yyyy-MM")
}

$records = @($allRecords | Where-Object { $_.date -like "$Month*" } | Sort-Object date, employeeNo)
if ($records.Count -eq 0) {
    Write-Host "No attendance records found for month $Month" -ForegroundColor Yellow
    exit 0
}

$monthDisplay = "September 2026"
try {
    $parsedDate = [datetime]::ParseExact($Month + "-01", "yyyy-MM-dd", $null)
    $monthDisplay = $parsedDate.ToString("MMMM yyyy")
} catch {}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  BABU RAJU RAM FUEL STATION - MONTHLY 4-PUNCH REPORT GENERATOR " -ForegroundColor Cyan
Write-Host "  Month: $monthDisplay ($Month) | Total Records: $($records.Count)" -ForegroundColor Cyan
Write-Host "  Category Mode: $Category (Strict Staff & Management Separation)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

# Separate Staff & Management - NEVER MIX!
$mgmtIds = @("1", "SBRRFS0012", "3", "15", "19")
$staffRecords = @($records | Where-Object { $_.category -eq "Staff" -or ($_.category -ne "Management" -and $_.employeeNo -notin $mgmtIds) })
$mgmtRecords  = @($records | Where-Object { $_.category -eq "Management" -or $_.employeeNo -in $mgmtIds })

function Get-EmpSummary($itemList) {
    $empMap = [ordered]@{}
    foreach ($r in $itemList) {
        $key = if ($r.employeeNo) { [string]$r.employeeNo } else { [string]$r.name }
        if (-not $empMap.Contains($key)) {
            $cat = if ($r.category) { $r.category } elseif ($r.deviceId -eq "DEV-01") { "Management" } else { "Staff" }
            $empMap[$key] = [PSCustomObject]@{
                EmpId = $r.employeeNo
                Name = $r.name
                Designation = $r.designation
                Category = $cat
                Shift = $r.shift
                DaysPresent = 0
                DaysAbsent = 0
                DoubleShifts = 0
                TotalHours = 0.0
            }
        }
        $hrs = 0.0
        if ($r.hoursWorked) { [double]::TryParse([string]$r.hoursWorked, [ref]$hrs) | Out-Null }

        if ($r.status -eq "Present" -or $r.status -eq "On-Duty" -or $hrs -gt 0 -or ($r.punch1 -and $r.punch1 -ne "--:--")) {
            $empMap[$key].DaysPresent++
        } elseif ($r.status -eq "Absent") {
            $empMap[$key].DaysAbsent++
        }
        if ($r.shiftsCount -gt 1) {
            $empMap[$key].DoubleShifts++
        }
        $empMap[$key].TotalHours += $hrs
    }
    return $empMap
}

$staffEmpMap = Get-EmpSummary $staffRecords
$mgmtEmpMap  = Get-EmpSummary $mgmtRecords

function Add-SummarySheetXml($ws, [string]$sheetName, [string]$titleText, [string]$subText, $empMap, [int]$headerColor = 0x059669, [int]$titleColor = 0x064E3B) {
    $ws.Name = $sheetName
    $ws.Range("A1:L1").Merge()
    $ws.Range("A1").Value2 = $titleText
    $ws.Range("A1").Font.Size = 14
    $ws.Range("A1").Font.Bold = $true
    $ws.Range("A1").Interior.Color = $titleColor
    $ws.Range("A1").Font.Color = 0xFFFFFF
    $ws.Range("A1").HorizontalAlignment = -4108

    $ws.Range("A2:L2").Merge()
    $ws.Range("A2").Value2 = $subText
    $ws.Range("A2").Font.Size = 10
    $ws.Range("A2").Font.Bold = $true
    $ws.Range("A2").Interior.Color = $headerColor
    $ws.Range("A2").Font.Color = 0xFFFFFF
    $ws.Range("A2").HorizontalAlignment = -4108

    $headers = @("Sl.", "Emp ID", "Employee Name", "Designation", "Category", "Assigned Shift", "Days Present", "Days Absent", "Double Shifts", "Total Hours Worked", "Avg Daily Hours", "Attendance Rate")
    for ($i = 0; $i -lt $headers.Count; $i++) {
        $c = $ws.Cells.Item(4, $i + 1)
        $c.Value2 = [string]$headers[$i]
        $c.Font.Bold = $true
        $c.Interior.Color = $headerColor
        $c.Font.Color = 0xFFFFFF
        $c.HorizontalAlignment = -4108
    }

    $rIdx = 5
    $sl = 1
    $totPres = 0; $totAbs = 0; $totDbl = 0; $totHrs = 0.0
    foreach ($k in $empMap.Keys) {
        $e = $empMap[$k]
        $totPres += $e.DaysPresent
        $totAbs += $e.DaysAbsent
        $totDbl += $e.DoubleShifts
        $totHrs += $e.TotalHours

        $avg = if ($e.DaysPresent -gt 0) { ($e.TotalHours / $e.DaysPresent).ToString("F2") + " hrs" } else { "0.00 hrs" }
        $totalDays = $e.DaysPresent + $e.DaysAbsent
        $rate = if ($totalDays -gt 0) { "$([math]::Round(($e.DaysPresent / $totalDays) * 100))%" } else { "100%" }

        $ws.Cells.Item($rIdx, 1).Value2 = [string]$sl
        $ws.Cells.Item($rIdx, 2).Value2 = [string]$e.EmpId
        $ws.Cells.Item($rIdx, 3).Value2 = [string]$e.Name
        $ws.Cells.Item($rIdx, 4).Value2 = [string]$e.Designation
        $ws.Cells.Item($rIdx, 5).Value2 = [string]$e.Category
        $ws.Cells.Item($rIdx, 6).Value2 = [string]$e.Shift
        $ws.Cells.Item($rIdx, 7).Value2 = [int]$e.DaysPresent
        $ws.Cells.Item($rIdx, 8).Value2 = [int]$e.DaysAbsent
        $ws.Cells.Item($rIdx, 9).Value2 = [int]$e.DoubleShifts
        $ws.Cells.Item($rIdx, 10).Value2 = [double][math]::Round($e.TotalHours, 2)
        $ws.Cells.Item($rIdx, 11).Value2 = [string]$avg
        $ws.Cells.Item($rIdx, 12).Value2 = [string]$rate

        if ($e.DoubleShifts -gt 0) {
            $ws.Cells.Item($rIdx, 9).Interior.Color = 0xC7F3FE
            $ws.Cells.Item($rIdx, 9).Font.Bold = $true
            $ws.Cells.Item($rIdx, 9).Font.Color = 0x0E4092
        }

        if ($sl % 2 -eq 0) {
            $ws.Range("A$rIdx" + ":F$rIdx").Interior.Color = 0xFAFAF8
        }

        $rIdx++
        $sl++
    }

    $ws.Range("A$rIdx" + ":F$rIdx").Merge()
    $ws.Range("A$rIdx").Value2 = "TOTALS (MONTH: $monthDisplay)"
    $ws.Range("A$rIdx").Font.Bold = $true
    $ws.Cells.Item($rIdx, 7).Value2 = [int]$totPres
    $ws.Cells.Item($rIdx, 8).Value2 = [int]$totAbs
    $ws.Cells.Item($rIdx, 9).Value2 = [int]$totDbl
    $ws.Cells.Item($rIdx, 10).Value2 = [double][math]::Round($totHrs, 2)
    $ws.Range("A$rIdx" + ":L$rIdx").Interior.Color = 0xE5FAD1
    $ws.Range("A$rIdx" + ":L$rIdx").Font.Bold = $true

    if ($empMap.Count -gt 0) {
        $ws.Range("A4:L$rIdx").Borders.LineStyle = 1
    }
    $ws.Columns.AutoFit() | Out-Null
}

function Add-LogsSheetXml($ws, [string]$sheetName, [string]$titleText, [string]$subText, $itemList, [int]$headerColor = 0x1E3A8A, [int]$titleColor = 0x0F2744) {
    $ws.Name = $sheetName
    $ws.Range("A1:P1").Merge()
    $ws.Range("A1").Value2 = $titleText
    $ws.Range("A1").Font.Size = 14
    $ws.Range("A1").Font.Bold = $true
    $ws.Range("A1").Interior.Color = $titleColor
    $ws.Range("A1").Font.Color = 0xFFFFFF
    $ws.Range("A1").HorizontalAlignment = -4108

    $ws.Range("A2:P2").Merge()
    $ws.Range("A2").Value2 = $subText
    $ws.Range("A2").Font.Size = 10
    $ws.Range("A2").Font.Bold = $true
    $ws.Range("A2").Interior.Color = $headerColor
    $ws.Range("A2").Font.Color = 0xFFFFFF
    $ws.Range("A2").HorizontalAlignment = -4108

    $headers = @("Sl.", "Date", "Emp ID", "Employee Name", "Designation", "Category", "Assigned Shift", "Punch 1 (In 1)", "Punch 2 (Out 1)", "Shift 1 Hrs", "Punch 3 (In 2)", "Punch 4 (Out 2)", "Shift 2 Hrs", "Punch 5 (In 3)", "Punch 6 (Out 3)", "Shift 3 Hrs", "Total Hours", "Duty Mode", "Status")
    for ($i = 0; $i -lt $headers.Count; $i++) {
        $c = $ws.Cells.Item(4, $i + 1)
        $c.Value2 = [string]$headers[$i]
        $c.Font.Bold = $true
        $c.Interior.Color = 0xF2E1D9
        $c.HorizontalAlignment = -4108
    }

    $rIdx = 5
    $logSl = 1
    foreach ($r in $itemList) {
        $dDisplay = [datetime]::ParseExact($r.date, "yyyy-MM-dd", $null).ToString("dd-MM-yyyy")
        $p1 = if ($r.punch1) { $r.punch1 } else { "--:--" }
        $p2 = if ($r.punch2) { $r.punch2 } else { "--:--" }
        $s1 = 0.0; if ($r.shift1Hours) { [double]::TryParse([string]$r.shift1Hours, [ref]$s1) | Out-Null }
        $p3 = if ($r.punch3) { $r.punch3 } else { "--:--" }
        $p4 = if ($r.punch4) { $r.punch4 } else { "--:--" }
        $s2 = 0.0; if ($r.shift2Hours) { [double]::TryParse([string]$r.shift2Hours, [ref]$s2) | Out-Null }
        $p5 = if ($r.punch5) { $r.punch5 } else { "--:--" }
        $p6 = if ($r.punch6) { $r.punch6 } else { "--:--" }
        $s3 = 0.0; if ($r.shift3Hours) { [double]::TryParse([string]$r.shift3Hours, [ref]$s3) | Out-Null }
        $numTot = 0.0; if ($r.hoursWorked) { [double]::TryParse([string]$r.hoursWorked, [ref]$numTot) | Out-Null }
        $totStr = if ($numTot -gt 0) { "$numTot hrs" } elseif ($r.status -eq "Present" -and $r.date -eq (Get-Date).ToString("yyyy-MM-dd")) { "In Progress" } else { "0 hrs" }
        $shiftsLabel = if ($r.shiftsCount -ge 3 -or $r.dutyMode -like "*3 Shift*") { "3 Shift(s)" } elseif ($r.shiftsCount -gt 1 -or $r.dutyMode -like "*2 Shift*") { "2 Shift(s)" } elseif ($r.dutyMode) { $r.dutyMode } else { "1 Shift(s)" }
        $cat = if ($r.category) { $r.category } elseif ($r.deviceId -eq "DEV-01") { "Management" } else { "Staff" }

        $ws.Cells.Item($rIdx, 1).Value2 = [string]$logSl
        $cDate = $ws.Cells.Item($rIdx, 2); $cDate.NumberFormat = "@"; $cDate.Value2 = [string]$dDisplay; $cDate.HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 3).Value2 = [string]$r.employeeNo
        $ws.Cells.Item($rIdx, 4).Value2 = [string]$r.name
        $ws.Cells.Item($rIdx, 5).Value2 = [string]$r.designation
        $ws.Cells.Item($rIdx, 6).Value2 = [string]$cat
        $ws.Cells.Item($rIdx, 7).Value2 = [string]$r.shift
        $ws.Cells.Item($rIdx, 8).NumberFormat = "@"; $ws.Cells.Item($rIdx, 8).Value2 = [string]$p1; $ws.Cells.Item($rIdx, 8).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 9).NumberFormat = "@"; $ws.Cells.Item($rIdx, 9).Value2 = [string]$p2; $ws.Cells.Item($rIdx, 9).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 10).Value2 = [double]$s1; $ws.Cells.Item($rIdx, 10).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 11).NumberFormat = "@"; $ws.Cells.Item($rIdx, 11).Value2 = [string]$p3; $ws.Cells.Item($rIdx, 11).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 12).NumberFormat = "@"; $ws.Cells.Item($rIdx, 12).Value2 = [string]$p4; $ws.Cells.Item($rIdx, 12).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 13).Value2 = [double]$s2; $ws.Cells.Item($rIdx, 13).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 14).NumberFormat = "@"; $ws.Cells.Item($rIdx, 14).Value2 = [string]$p5; $ws.Cells.Item($rIdx, 14).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 15).NumberFormat = "@"; $ws.Cells.Item($rIdx, 15).Value2 = [string]$p6; $ws.Cells.Item($rIdx, 15).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 16).Value2 = [double]$s3; $ws.Cells.Item($rIdx, 16).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 17).Value2 = [string]$totStr; $ws.Cells.Item($rIdx, 17).HorizontalAlignment = -4108
        $ws.Cells.Item($rIdx, 18).Value2 = [string]$shiftsLabel
        $ws.Cells.Item($rIdx, 19).Value2 = [string]$r.status

        if ($r.shiftsCount -ge 3 -or $r.dutyMode -like "*3 Shift*") {
            $ws.Range("A$rIdx" + ":S$rIdx").Interior.Color = 0xF3E8FF
            $ws.Cells.Item($rIdx, 18).Font.Bold = $true
            $ws.Cells.Item($rIdx, 18).Font.Color = 0x6B21A8
        } elseif ($r.shiftsCount -gt 1) {
            $ws.Range("A$rIdx" + ":S$rIdx").Interior.Color = 0xC7F3FE
            $ws.Cells.Item($rIdx, 18).Font.Bold = $true
            $ws.Cells.Item($rIdx, 18).Font.Color = 0x0E4092
        }

        if ($r.status -eq "Present") {
            $ws.Cells.Item($rIdx, 19).Font.Color = 0x047857
            $ws.Cells.Item($rIdx, 19).Font.Bold = $true
        } else {
            $ws.Cells.Item($rIdx, 19).Font.Color = 0x7030A0
        }

        $rIdx++
        $logSl++
    }

    if ($itemList.Count -gt 0) {
        $ws.Range("A4:P" + ($rIdx - 1)).Borders.LineStyle = 1
    }
    $ws.Columns.AutoFit() | Out-Null
}

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    # 1. Main Separated Monthly Workbook (4 Dedicated Sheets)
    $wb = $excel.Workbooks.Add()
    
    if ($Category -eq "Management") {
        $wsMgmtSum = $wb.Sheets.Item(1)
        Add-SummarySheetXml $wsMgmtSum "Mgmt Payroll Summary (5)" "BABU RAJU RAM FUEL STATION - MANAGEMENT PAYROLL SUMMARY ($Month)" "MONTH: $monthDisplay | Management Leaders: $($mgmtEmpMap.Count)" $mgmtEmpMap 0xB45309 0x92400E
        $wsMgmtLog = $wb.Sheets.Add([System.Type]::Missing, $wsMgmtSum)
        Add-LogsSheetXml $wsMgmtLog "Mgmt Daily Logs (5)" "BABU RAJU RAM FUEL STATION - MANAGEMENT DAILY 4-PUNCH LOGS ($Month)" "MONTH: $monthDisplay | Management Records: $($mgmtRecords.Count)" $mgmtRecords 0x92400E 0x0F2744
    } elseif ($Category -eq "Staff") {
        $wsStaffSum = $wb.Sheets.Item(1)
        Add-SummarySheetXml $wsStaffSum "Staff Payroll Summary (29)" "BABU RAJU RAM FUEL STATION - STATION STAFF PAYROLL SUMMARY ($Month)" "MONTH: $monthDisplay | Staff Count: $($staffEmpMap.Count)" $staffEmpMap 0x059669 0x064E3B
        $wsStaffLog = $wb.Sheets.Add([System.Type]::Missing, $wsStaffSum)
        Add-LogsSheetXml $wsStaffLog "Staff Daily Logs (29)" "BABU RAJU RAM FUEL STATION - STATION STAFF DAILY 4-PUNCH LOGS ($Month)" "MONTH: $monthDisplay | Staff Records: $($staffRecords.Count)" $staffRecords 0x1E3A8A 0x0F2744
    } else {
        # ALL: 4 Dedicated Sheets - completely separated!
        $wsStaffSum = $wb.Sheets.Item(1)
        Add-SummarySheetXml $wsStaffSum "Staff Payroll Summary (29)" "BABU RAJU RAM FUEL STATION - STATION STAFF PAYROLL SUMMARY ($Month)" "MONTH: $monthDisplay | Staff Count: $($staffEmpMap.Count) | Dedicated Staff Sheet" $staffEmpMap 0x059669 0x064E3B

        $wsStaffLog = $wb.Sheets.Add([System.Type]::Missing, $wsStaffSum)
        Add-LogsSheetXml $wsStaffLog "Staff Daily Logs (29)" "BABU RAJU RAM FUEL STATION - STATION STAFF DAILY 4-PUNCH LOGS ($Month)" "MONTH: $monthDisplay | Staff Records: $($staffRecords.Count) | Dedicated Staff Sheet" $staffRecords 0x1E3A8A 0x0F2744

        $wsMgmtSum = $wb.Sheets.Add([System.Type]::Missing, $wsStaffLog)
        Add-SummarySheetXml $wsMgmtSum "Mgmt Summary (5)" "BABU RAJU RAM FUEL STATION - MANAGEMENT PAYROLL SUMMARY ($Month)" "MONTH: $monthDisplay | Management Leaders: $($mgmtEmpMap.Count) | Dedicated Management Sheet" $mgmtEmpMap 0xB45309 0x92400E

        $wsMgmtLog = $wb.Sheets.Add([System.Type]::Missing, $wsMgmtSum)
        Add-LogsSheetXml $wsMgmtLog "Mgmt Daily Logs (5)" "BABU RAJU RAM FUEL STATION - MANAGEMENT DAILY 4-PUNCH LOGS ($Month)" "MONTH: $monthDisplay | Management Records: $($mgmtRecords.Count) | Dedicated Management Sheet" $mgmtRecords 0x92400E 0x0F2744
    }

    $excelOutName = "Petrol_Bunk_Monthly_4Punch_Report_$Month.xlsx"
    $excelOutPath = Join-Path $rootDir $excelOutName
    if (Test-Path $excelOutPath) { Remove-Item $excelOutPath -Force }
    $wb.SaveAs($excelOutPath, 51)
    $wb.Close($false)

    # 2. Dedicated Staff Monthly Workbook
    $wbStaff = $excel.Workbooks.Add()
    $wsSS = $wbStaff.Sheets.Item(1)
    Add-SummarySheetXml $wsSS "Staff Payroll Summary (29)" "BABU RAJU RAM FUEL STATION - STATION STAFF PAYROLL SUMMARY ($Month)" "MONTH: $monthDisplay | Staff Count: $($staffEmpMap.Count)" $staffEmpMap 0x059669 0x064E3B
    $wsSL = $wbStaff.Sheets.Add([System.Type]::Missing, $wsSS)
    Add-LogsSheetXml $wsSL "Staff Daily Logs (29)" "BABU RAJU RAM FUEL STATION - STATION STAFF DAILY 4-PUNCH LOGS ($Month)" "MONTH: $monthDisplay | Staff Records: $($staffRecords.Count)" $staffRecords 0x1E3A8A 0x0F2744
    $staffExcelPath = Join-Path $rootDir "Petrol_Bunk_Monthly_Staff_Report_$Month.xlsx"
    if (Test-Path $staffExcelPath) { Remove-Item $staffExcelPath -Force }
    $wbStaff.SaveAs($staffExcelPath, 51)
    $wbStaff.Close($false)

    # 3. Dedicated Management Monthly Workbook
    $wbMgmt = $excel.Workbooks.Add()
    $wsMS = $wbMgmt.Sheets.Item(1)
    Add-SummarySheetXml $wsMS "Mgmt Summary (5)" "BABU RAJU RAM FUEL STATION - MANAGEMENT PAYROLL SUMMARY ($Month)" "MONTH: $monthDisplay | Management Leaders: $($mgmtEmpMap.Count)" $mgmtEmpMap 0xB45309 0x92400E
    $wsML = $wbMgmt.Sheets.Add([System.Type]::Missing, $wsMS)
    Add-LogsSheetXml $wsML "Mgmt Daily Logs (5)" "BABU RAJU RAM FUEL STATION - MANAGEMENT DAILY 4-PUNCH LOGS ($Month)" "MONTH: $monthDisplay | Management Records: $($mgmtRecords.Count)" $mgmtRecords 0x92400E 0x0F2744
    $mgmtExcelPath = Join-Path $rootDir "Petrol_Bunk_Monthly_Management_Report_$Month.xlsx"
    if (Test-Path $mgmtExcelPath) { Remove-Item $mgmtExcelPath -Force }
    $wbMgmt.SaveAs($mgmtExcelPath, 51)
    $wbMgmt.Close($false)

    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    Write-Host "[+] Monthly Excel workbooks created with strict separation" -ForegroundColor Green
} catch {
    Write-Host "[-] Monthly Excel generation error: $($_.Exception.Message)" -ForegroundColor Red
}

# --- CSV GENERATION WITH STRICT SEPARATION ---
function Add-CsvSummarySection([System.Collections.Generic.List[string]]$csvRows, [string]$secTitle, $empMap) {
    $csvRows.Add($secTitle)
    $csvRows.Add("Sl No,Emp ID,Employee Name,Designation,Category,Assigned Shift,Days Present,Days Absent,Double Shifts,Total Hours Worked,Avg Daily Hours,Attendance Rate")
    $sl = 1
    $totPres = 0; $totAbs = 0; $totDbl = 0; $totHrs = 0.0
    foreach ($k in $empMap.Keys) {
        $e = $empMap[$k]
        $totPres += $e.DaysPresent; $totAbs += $e.DaysAbsent; $totDbl += $e.DoubleShifts; $totHrs += $e.TotalHours
        $avg = if ($e.DaysPresent -gt 0) { ($e.TotalHours / $e.DaysPresent).ToString("F2") } else { "0.00" }
        $totalDays = $e.DaysPresent + $e.DaysAbsent
        $rate = if ($totalDays -gt 0) { "$([math]::Round(($e.DaysPresent / $totalDays) * 100))%" } else { "100%" }
        $csvRows.Add("$sl,$($e.EmpId),`"$($e.Name)`",`"$($e.Designation)`",`"$($e.Category)`",`"$($e.Shift)`",$($e.DaysPresent),$($e.DaysAbsent),$($e.DoubleShifts),$($e.TotalHours.ToString('F2')) hrs,$avg hrs,$rate")
        $sl++
    }
    $csvRows.Add("TOTALS,,`"GRAND TOTALS`",,,,$totPres,$totAbs,$totDbl,$($totHrs.ToString('F2')) hrs,,")
}

function Add-CsvLogSection([System.Collections.Generic.List[string]]$csvRows, [string]$secTitle, $itemList) {
    $csvRows.Add($secTitle)
    $csvRows.Add("Sl No,Date,Emp ID,Employee Name,Designation,Category,Assigned Shift,Punch 1 (In 1),Punch 2 (Out 1),Shift 1 Hrs,Punch 3 (In 2),Punch 4 (Out 2),Shift 2 Hrs,Punch 5 (In 3),Punch 6 (Out 3),Shift 3 Hrs,Total Hours,Duty Mode,Status")
    $logSl = 1
    foreach ($r in $itemList) {
        $dDisplay = [datetime]::ParseExact($r.date, "yyyy-MM-dd", $null).ToString("dd-MM-yyyy")
        $p1 = if ($r.punch1) { $r.punch1 } else { "--:--" }
        $p2 = if ($r.punch2) { $r.punch2 } else { "--:--" }
        $s1 = 0.0; if ($r.shift1Hours) { [double]::TryParse([string]$r.shift1Hours, [ref]$s1) | Out-Null }
        $p3 = if ($r.punch3) { $r.punch3 } else { "--:--" }
        $p4 = if ($r.punch4) { $r.punch4 } else { "--:--" }
        $s2 = 0.0; if ($r.shift2Hours) { [double]::TryParse([string]$r.shift2Hours, [ref]$s2) | Out-Null }
        $p5 = if ($r.punch5) { $r.punch5 } else { "--:--" }
        $p6 = if ($r.punch6) { $r.punch6 } else { "--:--" }
        $s3 = 0.0; if ($r.shift3Hours) { [double]::TryParse([string]$r.shift3Hours, [ref]$s3) | Out-Null }
        $numTot = 0.0; if ($r.hoursWorked) { [double]::TryParse([string]$r.hoursWorked, [ref]$numTot) | Out-Null }
        $tot = if ($numTot -gt 0) { "$numTot hrs" } elseif ($r.status -eq "Present" -and $r.date -eq (Get-Date).ToString("yyyy-MM-dd")) { "In Progress" } else { "0 hrs" }
        $dutyMode = if ($r.shiftsCount -ge 3 -or $r.dutyMode -like "*3 Shift*") { "3 Shift(s)" } elseif ($r.shiftsCount -gt 1 -or $r.dutyMode -like "*2 Shift*") { "2 Shift(s)" } elseif ($r.dutyMode) { $r.dutyMode } else { "1 Shift(s)" }
        $cat = if ($r.category) { $r.category } elseif ($r.deviceId -eq "DEV-01") { "Management" } else { "Staff" }
        $csvRows.Add("$logSl,$dDisplay,$($r.employeeNo),`"$($r.name)`",`"$($r.designation)`",`"$cat`",`"$($r.shift)`",$p1,$p2,$s1,$p3,$p4,$s2,$p5,$p6,$s3,$tot,`"$dutyMode`",$($r.status)")
        $logSl++
    }
}

# 1. Multi-section Separated CSV
$csvRows = [System.Collections.Generic.List[string]]::new()
$csvRows.Add("BABU RAJU RAM FUEL STATION - MONTHLY 4-PUNCH ATTENDANCE & PAYROLL REPORT")
$csvRows.Add("Month: $monthDisplay ($Month),Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),Strict Staff & Management Separation")
$csvRows.Add("")

if ($Category -eq "Management") {
    Add-CsvSummarySection $csvRows "=== SECTION 1: MANAGEMENT TEAM PAYROLL SUMMARY (5 LEADERS) ===" $mgmtEmpMap
    $csvRows.Add("")
    Add-CsvLogSection $csvRows "=== SECTION 2: MANAGEMENT TEAM DAILY 4-PUNCH LOGS ===" $mgmtRecords
} elseif ($Category -eq "Staff") {
    Add-CsvSummarySection $csvRows "=== SECTION 1: STATION OPERATIONAL STAFF PAYROLL SUMMARY (29 STAFF) ===" $staffEmpMap
    $csvRows.Add("")
    Add-CsvLogSection $csvRows "=== SECTION 2: STATION OPERATIONAL STAFF DAILY 4-PUNCH LOGS ===" $staffRecords
} else {
    Add-CsvSummarySection $csvRows "=== SECTION 1: MANAGEMENT TEAM PAYROLL SUMMARY (5 LEADERS) ===" $mgmtEmpMap
    $csvRows.Add("")
    Add-CsvSummarySection $csvRows "=== SECTION 2: STATION OPERATIONAL STAFF PAYROLL SUMMARY (29 STAFF) ===" $staffEmpMap
    $csvRows.Add("")
    Add-CsvLogSection $csvRows "=== SECTION 3: MANAGEMENT TEAM DAILY 4-PUNCH LOGS ===" $mgmtRecords
    $csvRows.Add("")
    Add-CsvLogSection $csvRows "=== SECTION 4: STATION OPERATIONAL STAFF DAILY 4-PUNCH LOGS ===" $staffRecords
}

$csvFileName = "Petrol_Bunk_Monthly_4Punch_Report_$Month.csv"
$csvOutPath = Join-Path $rootDir $csvFileName
$csvRows | Set-Content -Path $csvOutPath -Encoding UTF8

# 2. Staff-Only CSV
$staffCsvRows = [System.Collections.Generic.List[string]]::new()
$staffCsvRows.Add("BABU RAJU RAM FUEL STATION - MONTHLY STAFF ATTENDANCE & PAYROLL REPORT")
$staffCsvRows.Add("Month: $monthDisplay ($Month) | Operational Staff (29 Staff) Only")
$staffCsvRows.Add("")
Add-CsvSummarySection $staffCsvRows "=== SECTION 1: STATION OPERATIONAL STAFF PAYROLL SUMMARY (29 STAFF) ===" $staffEmpMap
$staffCsvRows.Add("")
Add-CsvLogSection $staffCsvRows "=== SECTION 2: STATION OPERATIONAL STAFF DAILY 4-PUNCH LOGS ===" $staffRecords
$staffCsvOutPath = Join-Path $rootDir "Petrol_Bunk_Monthly_Staff_Report_$Month.csv"
$staffCsvRows | Set-Content -Path $staffCsvOutPath -Encoding UTF8

# 3. Management-Only CSV
$mgmtCsvRows = [System.Collections.Generic.List[string]]::new()
$mgmtCsvRows.Add("BABU RAJU RAM FUEL STATION - MONTHLY MANAGEMENT ATTENDANCE & PAYROLL REPORT")
$mgmtCsvRows.Add("Month: $monthDisplay ($Month) | Management Team (5 Leaders) Only")
$mgmtCsvRows.Add("")
Add-CsvSummarySection $mgmtCsvRows "=== SECTION 1: MANAGEMENT TEAM PAYROLL SUMMARY (5 LEADERS) ===" $mgmtEmpMap
$mgmtCsvRows.Add("")
Add-CsvLogSection $mgmtCsvRows "=== SECTION 2: MANAGEMENT TEAM DAILY 4-PUNCH LOGS ===" $mgmtRecords
$mgmtCsvOutPath = Join-Path $rootDir "Petrol_Bunk_Monthly_Management_Report_$Month.csv"
$mgmtCsvRows | Set-Content -Path $mgmtCsvOutPath -Encoding UTF8

# Copy to Desktop
$desktopDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
if (Test-Path $desktopDir) {
    Copy-Item -Path $csvOutPath -Destination (Join-Path $desktopDir $csvFileName) -Force
    Copy-Item -Path $staffCsvOutPath -Destination (Join-Path $desktopDir "Petrol_Bunk_Monthly_Staff_Report_$Month.csv") -Force
    Copy-Item -Path $mgmtCsvOutPath -Destination (Join-Path $desktopDir "Petrol_Bunk_Monthly_Management_Report_$Month.csv") -Force
    if (Test-Path $excelOutPath) {
        Copy-Item -Path $excelOutPath -Destination (Join-Path $desktopDir $excelOutName) -Force
    }
    if (Test-Path $staffExcelPath) {
        Copy-Item -Path $staffExcelPath -Destination (Join-Path $desktopDir "Petrol_Bunk_Monthly_Staff_Report_$Month.xlsx") -Force
    }
    if (Test-Path $mgmtExcelPath) {
        Copy-Item -Path $mgmtExcelPath -Destination (Join-Path $desktopDir "Petrol_Bunk_Monthly_Management_Report_$Month.xlsx") -Force
    }
}

Write-Host "[+] SUCCESS: Generated separated monthly reports for $Month" -ForegroundColor Green
Write-Host "    - Staff Monthly Report (29 Staff):      Petrol_Bunk_Monthly_Staff_Report_$Month.xlsx" -ForegroundColor Green
Write-Host "    - Management Monthly Report (5 Leaders): Petrol_Bunk_Monthly_Management_Report_$Month.xlsx" -ForegroundColor Green
Write-Host "    - Multi-Sheet Separated:                $excelOutName" -ForegroundColor Green
