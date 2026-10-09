<#
.SYNOPSIS
    Petrol Bunk Shiftwise Attendance Report Generator
.DESCRIPTION
    Maps biometric punch records to:
      - 1st Shift: Morning (06:00 to 14:00)
      - 2nd Shift: Afternoon (14:00 to 20:00)
      - 3rd Shift: Night (20:00 to 06:00 next day)
      - General Shift: (09:30 to 17:30)
      - 12h Shifts: (06:00 to 18:00 / 18:00 to 06:00)
#>

param(
    [string]$PunchFile = "",
    [string]$OutputFile = "Petrol_Bunk_Shiftwise_Report.csv"
)

# Define shift rules
function Get-AssignedShift([datetime]$punchTime) {
    $hour = $punchTime.Hour
    $minute = $punchTime.Minute
    $totalMinutes = $hour * 60 + $minute

    # 1st Shift: Morning 06:00 to 14:00 (Check-in window: 05:00 to 10:00)
    if ($totalMinutes -ge (5 * 60) -and $totalMinutes -lt (13 * 60)) {
        return @{
            ShiftName = "1st Shift (Morning)"
            ShiftStart = "06:00"
            ShiftEnd   = "14:00"
            DurationHours = 8
        }
    }
    # 2nd Shift: Afternoon 14:00 to 20:00 (Check-in window: 13:00 to 17:00)
    elseif ($totalMinutes -ge (13 * 60) -and $totalMinutes -lt (19 * 60)) {
        return @{
            ShiftName = "2nd Shift (Afternoon)"
            ShiftStart = "14:00"
            ShiftEnd   = "20:00"
            DurationHours = 6
        }
    }
    # 3rd Shift: Night 20:00 to 06:00 next day (Check-in window: 19:00 to 23:59 or 00:00 to 04:59)
    else {
        return @{
            ShiftName = "3rd Shift (Night)"
            ShiftStart = "20:00"
            ShiftEnd   = "06:00 (+1)"
            DurationHours = 10
        }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Petrol Bunk Shiftwise Attendance Report Engine         " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1st Shift : 06:00 AM to 02:00 PM (8 Hours)"
Write-Host "2nd Shift : 02:00 PM to 08:00 PM (6 Hours)"
Write-Host "3rd Shift : 08:00 PM to 06:00 AM (10 Hours - Next Day)"
Write-Host ""
