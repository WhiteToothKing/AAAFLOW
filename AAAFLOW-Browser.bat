@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-desktop.ps1" -OpenWhenReady browser
if errorlevel 1 pause
