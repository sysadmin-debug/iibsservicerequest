@echo off
:: ==============================================================
:: Print Spooler Reset & Fix Script
:: Requires Administrator Privileges
:: ==============================================================

:: Check for administrative permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Please right-click on this batch file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo ===================================================
echo           Resetting Windows Print Spooler
echo ===================================================
echo.

:: 1. Stop the Print Spooler service
echo [1/4] Stopping Print Spooler service...
net stop spooler /y >nul 2>&1
sc stop spooler >nul 2>&1

:: Wait a brief moment to ensure processes release locks
timeout /t 2 /nobreak >nul

:: 2. Clear stuck print queue jobs
echo [2/4] Clearing stuck print queue files...
del /Q /F /S "%systemroot%\System32\spool\PRINTERS\*.*" >nul 2>&1

:: 3. Configure the Spooler service to automatic startup
echo [3/4] Ensuring Print Spooler is configured to start automatically...
sc config spooler start= auto >nul 2>&1

:: 4. Start the Print Spooler service
echo [4/4] Starting Print Spooler service...
net start spooler
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Print Spooler service.
    echo Check Windows Event Viewer for service errors.
) else (
    echo.
    echo ===================================================
    echo  Print Spooler has been successfully restarted!
    echo  The print queue was cleared.
    echo ===================================================
)

echo.
pause
