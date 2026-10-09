@echo off
title Hikvision Biometric Importer - Petrol Bunk
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Import-BiometricData.ps1"
pause
