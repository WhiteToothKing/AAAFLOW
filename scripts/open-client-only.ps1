# Start packaged AAAFLOW.exe only (Docker must already be running).
#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.FullName

$candidates = @(
    (Join-Path $RepoRoot "frontend\release\win-unpacked\AAAFLOW.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\AAAFLOW\AAAFLOW.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\aaaflow\AAAFLOW.exe")
)
$exe = $null
foreach ($p in $candidates) {
    if ($p -and (Test-Path -LiteralPath $p)) {
        $exe = $p
        break
    }
}

if (-not $exe) {
    Write-Host ""
    Write-Host "[错误] 找不到 AAAFLOW.exe。"
    Write-Host "请先在本项目的 frontend 目录执行: npm run electron:pack"
    Write-Host "或从开始菜单打开已安装的 AAAFLOW。"
    Write-Host ""
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [void][System.Windows.Forms.MessageBox]::Show(
            "找不到 AAAFLOW.exe。请先打包（frontend 里 npm run electron:pack）或从开始菜单打开已安装版本。",
            "AAAFLOW",
            "OK",
            "Warning"
        )
    } catch { }
    exit 1
}

Start-Process -FilePath $exe
Write-Host "已启动桌面客户端。"
exit 0
