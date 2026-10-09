param(
    [string]$ReportDate = "",
    [string]$FromDate = "",
    [string]$ToDate = "",
    [string]$Category = "ALL"
)

$rootDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($rootDir)) {
    $rootDir = "d:\Antigravity\Biometric for petrol bunk"
}

$attFile = Join-Path $rootDir "data\attendance.json"
if (-not (Test-Path $attFile)) {
    Write-Host "Attendance file not found: $attFile" -ForegroundColor Red
    exit 1
}

$allRecords = Get-Content $attFile -Raw | ConvertFrom-Json

$records = @()
$isRange = $false
$titleSuffix = ""

if (-not [string]::IsNullOrWhiteSpace($FromDate) -and -not [string]::IsNullOrWhiteSpace($ToDate)) {
    $records = @($allRecords | Where-Object { $_.date -ge $FromDate -and $_.date -le $ToDate } | Sort-Object date, employeeNo)
    $isRange = $true
    $dFrom = [datetime]::ParseExact($FromDate, "yyyy-MM-dd", $null).ToString("dd-MMM-yyyy")
    $dTo = [datetime]::ParseExact($ToDate, "yyyy-MM-dd", $null).ToString("dd-MMM-yyyy")
    $titleSuffix = "$dFrom to $dTo"
} elseif (-not [string]::IsNullOrWhiteSpace($ReportDate)) {
    $records = @($allRecords | Where-Object { $_.date -eq $ReportDate } | Sort-Object employeeNo)
    $dSingle = [datetime]::ParseExact($ReportDate, "yyyy-MM-dd", $null).ToString("dd-MMM-yyyy")
    $titleSuffix = "$dSingle"
} else {
    $uniqueDates = @($allRecords | ForEach-Object { $_.date } | Select-Object -Unique | Sort-Object)
    if ($uniqueDates.Count -gt 1) {
        $records = @($allRecords | Sort-Object date, employeeNo)
        $isRange = $true
        $dFrom = [datetime]::ParseExact($uniqueDates[0], "yyyy-MM-dd", $null).ToString("dd-MMM-yyyy")
        $dTo = [datetime]::ParseExact($uniqueDates[-1], "yyyy-MM-dd", $null).ToString("dd-MMM-yyyy")
        $titleSuffix = "$dFrom to $dTo"
    } else {
        $targetDate = if ($uniqueDates.Count -eq 1) { $uniqueDates[0] } else { (Get-Date).ToString("yyyy-MM-dd") }
        $records = @($allRecords | Where-Object { $_.date -eq $targetDate } | Sort-Object employeeNo)
        $dSingle = [datetime]::ParseExact($targetDate, "yyyy-MM-dd", $null).ToString("dd-MMM-yyyy")
        $titleSuffix = "$dSingle"
    }
}

if ($records.Count -eq 0) {
    Write-Host "No attendance records found for criteria ($titleSuffix)" -ForegroundColor Yellow
    exit 0
}

$dateDisplay = $titleSuffix

# Separate Staff and Management - NEVER MIX!
$mgmtIds = @("1", "SBRRFS0012", "3", "15", "19")
$staffRecords = @($records | Where-Object { $_.category -eq "Staff" -or ($_.category -ne "Management" -and $_.employeeNo -notin $mgmtIds) })
$mgmtRecords  = @($records | Where-Object { $_.category -eq "Management" -or $_.employeeNo -in $mgmtIds })

function Format-SheetData($ws, [string]$sheetTitle, [string]$subTitle, $itemList, [bool]$rangeMode, [int]$titleColor = 0x203864, [int]$subColor = 0x2E75B6, [int]$headerColor = 0xD9E1F2) {
    $colEnd = if ($rangeMode) { "S" } else { "R" }

    # Title
    $ws.Range("A1:" + $colEnd + "1").Merge()
    $ws.Range("A1").Value2 = $sheetTitle
    $ws.Range("A1").Font.Size = 15
    $ws.Range("A1").Font.Bold = $true
    $ws.Range("A1").Interior.Color = $titleColor
    $ws.Range("A1").Font.Color = 0xFFFFFF
    $ws.Range("A1").HorizontalAlignment = -4108

    $ws.Range("A2:" + $colEnd + "2").Merge()
    $ws.Range("A2").Value2 = "$subTitle - $dateDisplay (Multi-Shift & Triple-Shift Supported)"
    $ws.Range("A2").Font.Size = 11
    $ws.Range("A2").Font.Bold = $true
    $ws.Range("A2").Interior.Color = $subColor
    $ws.Range("A2").Font.Color = 0xFFFFFF
    $ws.Range("A2").HorizontalAlignment = -4108

    # Headers
    $headers = if ($rangeMode) {
        @("Date", "Sl.", "Emp ID", "Employee Name", "Designation", "Category", "Assigned Shift", "Punch 1 (In 1)", "Punch 2 (Out 1)", "Shift 1 Hrs", "Punch 3 (In 2)", "Punch 4 (Out 2)", "Shift 2 Hrs", "Punch 5 (In 3)", "Punch 6 (Out 3)", "Shift 3 Hrs", "Total Hours", "Duty Mode", "Status")
    } else {
        @("Sl.", "Emp ID", "Employee Name", "Designation", "Category", "Assigned Shift", "Punch 1 (In 1)", "Punch 2 (Out 1)", "Shift 1 Hrs", "Punch 3 (In 2)", "Punch 4 (Out 2)", "Shift 2 Hrs", "Punch 5 (In 3)", "Punch 6 (Out 3)", "Shift 3 Hrs", "Total Hours", "Duty Mode", "Status")
    }

    for ($i = 0; $i -lt $headers.Count; $i++) {
        $cell = $ws.Cells.Item(4, $i + 1)
        $cell.Value2 = [string]$headers[$i]
        $cell.Font.Bold = $true
        $cell.Interior.Color = $headerColor
        $cell.HorizontalAlignment = -4108
    }

    $row = 5
    $sl = 1
    foreach ($r in $itemList) {
        $c = 1
        if ($rangeMode) {
            $dDisplay = [datetime]::ParseExact($r.date, "yyyy-MM-dd", $null).ToString("dd-MM-yyyy")
            $cellDate = $ws.Cells.Item($row, $c++)
            $cellDate.NumberFormat = "@"
            $cellDate.Value2 = [string]$dDisplay
            $cellDate.HorizontalAlignment = -4108
        }

        $p1 = if ($r.punch1) { $r.punch1 } else { "--:--" }
        $p2 = if ($r.punch2) { $r.punch2 } else { "--:--" }
        $s1 = if ($r.shift1Hours) { [double]$r.shift1Hours } else { 0.0 }
        $p3 = if ($r.punch3) { $r.punch3 } else { "--:--" }
        $p4 = if ($r.punch4) { $r.punch4 } else { "--:--" }
        $s2 = if ($r.shift2Hours) { [double]$r.shift2Hours } else { 0.0 }
        $p5 = if ($r.punch5) { $r.punch5 } else { "--:--" }
        $p6 = if ($r.punch6) { $r.punch6 } else { "--:--" }
        $s3 = if ($r.shift3Hours) { [double]$r.shift3Hours } else { 0.0 }
        $tot = if ($r.hoursWorked) { [double]$r.hoursWorked } else { 0.0 }
        $shiftsLabel = if ($r.shiftsCount -ge 3 -or $r.dutyMode -like "*3 Shift*") { "3 Shift(s)" } elseif ($r.shiftsCount -gt 1 -or $r.dutyMode -like "*2 Shift*") { "2 Shift(s)" } elseif ($r.dutyMode) { $r.dutyMode } else { "1 Shift(s)" }
        $cat = if ($r.category) { $r.category } elseif ($r.deviceId -eq "DEV-01") { "Management" } else { "Staff" }

        $ws.Cells.Item($row, $c++).Value2 = [string]$sl
        $ws.Cells.Item($row, $c++).Value2 = [string]$r.employeeNo
        $ws.Cells.Item($row, $c++).Value2 = [string]$r.name
        $ws.Cells.Item($row, $c++).Value2 = [string]$r.designation
        $ws.Cells.Item($row, $c++).Value2 = [string]$cat
        $shiftCol = $c
        $ws.Cells.Item($row, $c++).Value2 = [string]$r.shift
        
        $c1 = $ws.Cells.Item($row, $c++); $c1.NumberFormat = "@"; $c1.Value2 = [string]$p1; $c1.HorizontalAlignment = -4108
        $c2 = $ws.Cells.Item($row, $c++); $c2.NumberFormat = "@"; $c2.Value2 = [string]$p2; $c2.HorizontalAlignment = -4108
        $c3 = $ws.Cells.Item($row, $c++); $c3.Value2 = [double]$s1; $c3.HorizontalAlignment = -4108
        $c4 = $ws.Cells.Item($row, $c++); $c4.NumberFormat = "@"; $c4.Value2 = [string]$p3; $c4.HorizontalAlignment = -4108
        $c5 = $ws.Cells.Item($row, $c++); $c5.NumberFormat = "@"; $c5.Value2 = [string]$p4; $c5.HorizontalAlignment = -4108
        $c6 = $ws.Cells.Item($row, $c++); $c6.Value2 = [double]$s2; $c6.HorizontalAlignment = -4108
        $c7 = $ws.Cells.Item($row, $c++); $c7.NumberFormat = "@"; $c7.Value2 = [string]$p5; $c7.HorizontalAlignment = -4108
        $c8 = $ws.Cells.Item($row, $c++); $c8.NumberFormat = "@"; $c8.Value2 = [string]$p6; $c8.HorizontalAlignment = -4108
        $c9 = $ws.Cells.Item($row, $c++); $c9.Value2 = [double]$s3; $c9.HorizontalAlignment = -4108
        $c10 = $ws.Cells.Item($row, $c++); $c10.Value2 = [double]$tot; $c10.HorizontalAlignment = -4108

        $dutyCol = $c
        $ws.Cells.Item($row, $c++).Value2 = [string]$shiftsLabel
        $statusCol = $c
        $ws.Cells.Item($row, $c++).Value2 = [string]$r.status

        # Shift colors
        if ($r.shiftCode -eq "S1") {
            $ws.Cells.Item($row, $shiftCol).Interior.Color = 0xFFF2CC
        } elseif ($r.shiftCode -eq "S2") {
            $ws.Cells.Item($row, $shiftCol).Interior.Color = 0xDDEBF7
        } elseif ($r.shiftCode -eq "S3") {
            $ws.Cells.Item($row, $shiftCol).Interior.Color = 0xE2EFDA
        } else {
            $ws.Cells.Item($row, $shiftCol).Interior.Color = 0xF2F2F2
        }

        # Multi-shift highlight
        if ($r.shiftsCount -ge 3 -or $shiftsLabel -eq "3 Shift(s)") {
            $ws.Range("A" + $row + ":" + $colEnd + $row).Interior.Color = 0xE9D5FF
            $ws.Cells.Item($row, $dutyCol).Font.Bold = $true
            $ws.Cells.Item($row, $dutyCol).Font.Color = 0x6B21A8
        } elseif ($r.shiftsCount -gt 1) {
            $ws.Range("A" + $row + ":" + $colEnd + $row).Interior.Color = 0xFEF3C7
            $ws.Cells.Item($row, $dutyCol).Font.Bold = $true
            $ws.Cells.Item($row, $dutyCol).Font.Color = 0x92400E
        }

        if ($r.status -eq "Present") {
            $ws.Cells.Item($row, $statusCol).Font.Color = 0x047857
            $ws.Cells.Item($row, $statusCol).Font.Bold = $true
        } else {
            $ws.Cells.Item($row, $statusCol).Font.Color = 0x7030A0
        }

        $row++
        $sl++
    }

    if ($itemList.Count -gt 0) {
        $dataRange = $ws.Range("A4:" + $colEnd + ($row - 1))
        $dataRange.Borders.LineStyle = 1
    }
    $ws.Columns.AutoFit() | Out-Null
}

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    # 1. Main Multi-Sheet Separated Workbook
    $wb = $excel.Workbooks.Add()
    
    if ($Category -eq "Management") {
        $wsMgmt = $wb.Sheets.Item(1)
        $wsMgmt.Name = "Management (5 Leaders)"
        Format-SheetData $wsMgmt "BABU RAJU RAM FUEL STATION - MANAGEMENT ATTENDANCE REPORT" "MANAGEMENT TEAM" $mgmtRecords $isRange 0x0953B4 0x203864 0xFDE68A
    } elseif ($Category -eq "Staff") {
        $wsStaff = $wb.Sheets.Item(1)
        $wsStaff.Name = "Station Staff (29 Staff)"
        Format-SheetData $wsStaff "BABU RAJU RAM FUEL STATION - STATION STAFF ATTENDANCE REPORT" "STATION OPERATIONAL STAFF" $staffRecords $isRange 0x203864 0x2E75B6 0xD9E1F2
    } else {
        # ALL: Separate Sheets for Staff and Management!
        $wsStaff = $wb.Sheets.Item(1)
        $wsStaff.Name = "Station Staff (29 Staff)"
        Format-SheetData $wsStaff "BABU RAJU RAM FUEL STATION - STATION STAFF ATTENDANCE REPORT" "STATION OPERATIONAL STAFF (29 STAFF)" $staffRecords $isRange 0x203864 0x2E75B6 0xD9E1F2

        $wsMgmt = $wb.Sheets.Add([System.Type]::Missing, $wsStaff)
        $wsMgmt.Name = "Management (5 Leaders)"
        Format-SheetData $wsMgmt "BABU RAJU RAM FUEL STATION - MANAGEMENT ATTENDANCE REPORT" "MANAGEMENT TEAM (5 LEADERS)" $mgmtRecords $isRange 0x0953B4 0x203864 0xFDE68A
    }

    # Save Multi-sheet Excel
    $outPath = Join-Path $rootDir "Petrol_Bunk_Shiftwise_Attendance_Report.xlsx"
    if (Test-Path $outPath) { Remove-Item $outPath -Force }
    $wb.SaveAs($outPath, 51)

    $outPathRange = Join-Path $rootDir "Petrol_Bunk_4Punch_Report_14th_to_Today.xlsx"
    if ($isRange) {
        if (Test-Path $outPathRange) { Remove-Item $outPathRange -Force }
        $wb.SaveCopyAs($outPathRange)
    }

    $wb.Close($false)

    # 2. Generate Dedicated Staff-Only Workbook
    $wbStaff = $excel.Workbooks.Add()
    $wsStaffOnly = $wbStaff.Sheets.Item(1)
    $wsStaffOnly.Name = "Station Staff (29 Staff)"
    Format-SheetData $wsStaffOnly "BABU RAJU RAM FUEL STATION - STATION STAFF ATTENDANCE REPORT" "STATION OPERATIONAL STAFF (29 STAFF)" $staffRecords $isRange 0x203864 0x2E75B6 0xD9E1F2
    $staffExcelPath = Join-Path $rootDir "Petrol_Bunk_Staff_Attendance_Report.xlsx"
    if (Test-Path $staffExcelPath) { Remove-Item $staffExcelPath -Force }
    $wbStaff.SaveAs($staffExcelPath, 51)
    $wbStaff.Close($false)

    # 3. Generate Dedicated Management-Only Workbook
    $wbMgmt = $excel.Workbooks.Add()
    $wsMgmtOnly = $wbMgmt.Sheets.Item(1)
    $wsMgmtOnly.Name = "Management (5 Leaders)"
    Format-SheetData $wsMgmtOnly "BABU RAJU RAM FUEL STATION - MANAGEMENT ATTENDANCE REPORT" "MANAGEMENT TEAM (5 LEADERS)" $mgmtRecords $isRange 0x0953B4 0x203864 0xFDE68A
    $mgmtExcelPath = Join-Path $rootDir "Petrol_Bunk_Management_Attendance_Report.xlsx"
    if (Test-Path $mgmtExcelPath) { Remove-Item $mgmtExcelPath -Force }
    $wbMgmt.SaveAs($mgmtExcelPath, 51)
    $wbMgmt.Close($false)

    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    Write-Host "[+] Excel workbooks successfully created with strict Staff vs Management separation" -ForegroundColor Green
} catch {
    Write-Host "[-] Excel generation error: $($_.Exception.Message)" -ForegroundColor Red
}

# --- GENERATE CLEAN CSV REPORTS (STRICT SEPARATION) ---
function Build-CsvSection([System.Collections.Generic.List[string]]$csvLines, [string]$secTitle, $itemList, [bool]$rangeMode) {
    $csvLines.Add($secTitle)
    if ($rangeMode) {
        $csvLines.Add("Date,Sl.,Emp ID,Employee Name,Designation,Category,Assigned Shift,Punch 1 (In 1),Punch 2 (Out 1),Shift 1 Hrs,Punch 3 (In 2),Punch 4 (Out 2),Shift 2 Hrs,Punch 5 (In 3),Punch 6 (Out 3),Shift 3 Hrs,Total Hours,Duty Mode,Status")
    } else {
        $csvLines.Add("Sl.,Emp ID,Employee Name,Designation,Category,Assigned Shift,Punch 1 (In 1),Punch 2 (Out 1),Shift 1 Hrs,Punch 3 (In 2),Punch 4 (Out 2),Shift 2 Hrs,Punch 5 (In 3),Punch 6 (Out 3),Shift 3 Hrs,Total Hours,Duty Mode,Status")
    }

    $cSl = 1
    foreach ($r in $itemList) {
        $dStr = [datetime]::ParseExact($r.date, "yyyy-MM-dd", $null).ToString("dd-MM-yyyy")
        $p1 = if ($r.punch1) { $r.punch1 } else { "--:--" }
        $p2 = if ($r.punch2) { $r.punch2 } else { "--:--" }
        $s1 = if ($r.shift1Hours) { [double]$r.shift1Hours } else { 0.0 }
        $p3 = if ($r.punch3) { $r.punch3 } else { "--:--" }
        $p4 = if ($r.punch4) { $r.punch4 } else { "--:--" }
        $s2 = if ($r.shift2Hours) { [double]$r.shift2Hours } else { 0.0 }
        $p5 = if ($r.punch5) { $r.punch5 } else { "--:--" }
        $p6 = if ($r.punch6) { $r.punch6 } else { "--:--" }
        $s3 = if ($r.shift3Hours) { [double]$r.shift3Hours } else { 0.0 }
        $tot = if ($r.hoursWorked) { [double]$r.hoursWorked } else { 0.0 }
        $mode = if ($r.shiftsCount -ge 3 -or $r.dutyMode -like "*3 Shift*") { "3 Shift(s)" } elseif ($r.shiftsCount -gt 1 -or $r.dutyMode -like "*2 Shift*") { "2 Shift(s)" } elseif ($r.dutyMode) { $r.dutyMode } else { "1 Shift(s)" }
        $cat = if ($r.category) { $r.category } elseif ($r.deviceId -eq "DEV-01") { "Management" } else { "Staff" }

        if ($rangeMode) {
            $csvLines.Add("$dStr,$cSl,$($r.employeeNo),`"$($r.name)`",`"$($r.designation)`",`"$cat`",`"$($r.shift)`",$p1,$p2,$s1,$p3,$p4,$s2,$p5,$p6,$s3,$tot,`"$mode`",$($r.status)")
        } else {
            $csvLines.Add("$cSl,$($r.employeeNo),`"$($r.name)`",`"$($r.designation)`",`"$cat`",`"$($r.shift)`",$p1,$p2,$s1,$p3,$p4,$s2,$p5,$p6,$s3,$tot,`"$mode`",$($r.status)")
        }
        $cSl++
    }
}

# 1. Combined Separated CSV
$csvLines = [System.Collections.Generic.List[string]]::new()
$csvLines.Add("BABU RAJU RAM FUEL STATION - 4-PUNCH ATTENDANCE REPORT")
$csvLines.Add("Period: $dateDisplay | Multi-Shift & 4-Punch Supported | Staff & Management Strictly Separated")
$csvLines.Add("")

if ($Category -eq "Management") {
    Build-CsvSection $csvLines "=== MANAGEMENT TEAM (5 LEADERS) ===" $mgmtRecords $isRange
} elseif ($Category -eq "Staff") {
    Build-CsvSection $csvLines "=== STATION OPERATIONAL STAFF (29 STAFF) ===" $staffRecords $isRange
} else {
    Build-CsvSection $csvLines "=== SECTION 1: MANAGEMENT TEAM (5 LEADERS) ===" $mgmtRecords $isRange
    $csvLines.Add("")
    Build-CsvSection $csvLines "=== SECTION 2: STATION OPERATIONAL STAFF (29 STAFF) ===" $staffRecords $isRange
}

$csvOut = Join-Path $rootDir "Petrol_Bunk_Shiftwise_Attendance_Report.csv"
$csvLines | Set-Content -Path $csvOut -Encoding UTF8

$csvOutRange = Join-Path $rootDir "Petrol_Bunk_4Punch_Report_14th_to_Today.csv"
if ($isRange) {
    $csvLines | Set-Content -Path $csvOutRange -Encoding UTF8
}

# 2. Dedicated Staff CSV
$staffCsvLines = [System.Collections.Generic.List[string]]::new()
$staffCsvLines.Add("BABU RAJU RAM FUEL STATION - STATION STAFF ATTENDANCE REPORT")
$staffCsvLines.Add("Period: $dateDisplay | Operational Staff (29 Staff) Only")
$staffCsvLines.Add("")
Build-CsvSection $staffCsvLines "=== STATION OPERATIONAL STAFF (29 STAFF) ===" $staffRecords $isRange
$staffCsvOut = Join-Path $rootDir "Petrol_Bunk_Staff_Attendance_Report.csv"
$staffCsvLines | Set-Content -Path $staffCsvOut -Encoding UTF8

# 3. Dedicated Management CSV
$mgmtCsvLines = [System.Collections.Generic.List[string]]::new()
$mgmtCsvLines.Add("BABU RAJU RAM FUEL STATION - MANAGEMENT ATTENDANCE REPORT")
$mgmtCsvLines.Add("Period: $dateDisplay | Management Team (5 Leaders) Only")
$mgmtCsvLines.Add("")
Build-CsvSection $mgmtCsvLines "=== MANAGEMENT TEAM (5 LEADERS) ===" $mgmtRecords $isRange
$mgmtCsvOut = Join-Path $rootDir "Petrol_Bunk_Management_Attendance_Report.csv"
$mgmtCsvLines | Set-Content -Path $mgmtCsvOut -Encoding UTF8

# Copy all to Desktop
$desktop = [Environment]::GetFolderPath('Desktop')
if (Test-Path $desktop) {
    Copy-Item -Path $outPath -Destination (Join-Path $desktop "Petrol_Bunk_Shiftwise_Report.xlsx") -Force
    Copy-Item -Path $csvOut -Destination (Join-Path $desktop "Petrol_Bunk_Shiftwise_Report.csv") -Force
    Copy-Item -Path $staffExcelPath -Destination (Join-Path $desktop "Petrol_Bunk_Staff_Attendance_Report.xlsx") -Force
    Copy-Item -Path $staffCsvOut -Destination (Join-Path $desktop "Petrol_Bunk_Staff_Attendance_Report.csv") -Force
    Copy-Item -Path $mgmtExcelPath -Destination (Join-Path $desktop "Petrol_Bunk_Management_Attendance_Report.xlsx") -Force
    Copy-Item -Path $mgmtCsvOut -Destination (Join-Path $desktop "Petrol_Bunk_Management_Attendance_Report.csv") -Force
    if ($isRange) {
        Copy-Item -Path $outPathRange -Destination (Join-Path $desktop "Petrol_Bunk_4Punch_Report_14th_to_Today.xlsx") -Force
        Copy-Item -Path $csvOutRange -Destination (Join-Path $desktop "Petrol_Bunk_4Punch_Report_14th_to_Today.csv") -Force
    }
}

Write-Host "[+] SUCCESS: Generated separated reports for $dateDisplay" -ForegroundColor Green
Write-Host "    - Staff Report (29 Staff):       Petrol_Bunk_Staff_Attendance_Report.xlsx" -ForegroundColor Green
Write-Host "    - Management Report (5 Leaders):  Petrol_Bunk_Management_Attendance_Report.xlsx" -ForegroundColor Green
Write-Host "    - Multi-Sheet Separated:         Petrol_Bunk_Shiftwise_Attendance_Report.xlsx" -ForegroundColor Green
