# Wait for services then open desktop client (preferred) or browser
param(
    [int]$BackendTimeoutSec = 300,
    [int]$FrontendTimeoutSec = 120,
    [int]$IntervalSec = 3,
    [ValidateSet('client', 'browser', 'none')]
    [string]$OpenWhenReady = 'client'
)
$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.FullName

function Wait-Url {
    param(
        [string]$Uri,
        [string]$Label,
        [int]$MaxSeconds
    )
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 8
            if ($r.StatusCode -eq 200) {
                return $true
            }
        } catch { }
        Write-Host "  等待 $Label ..."
        Start-Sleep -Seconds $IntervalSec
    }
    return $false
}

function Get-PackagedClientExe {
    $candidates = @(
        (Join-Path $RepoRoot "frontend\release\win-unpacked\AAAFLOW.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\AAAFLOW\AAAFLOW.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\aaaflow\AAAFLOW.exe")
    )
    foreach ($p in $candidates) {
        if ($p -and (Test-Path -LiteralPath $p)) {
            return $p
        }
    }
    return $null
}

function Show-InfoDialog {
    param([string]$Message)
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [void][System.Windows.Forms.MessageBox]::Show(
            $Message,
            'AAAFLOW',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    } catch {
        Write-Host $Message
    }
}

Write-Host ""
Write-Host "正在等待服务就绪（首次构建可能需要几分钟）..."

if (-not (Wait-Url "http://localhost:8000/api/health" "后端 API" $BackendTimeoutSec)) {
    Write-Host ""
    Write-Host "超时：后端未响应。请在本项目目录执行: docker compose logs backend"
    exit 1
}

if ($OpenWhenReady -eq 'none') {
    Write-Host ""
    Write-Host "服务已就绪（未自动打开窗口）。"
    exit 0
}

if ($OpenWhenReady -eq 'client') {
    $exe = Get-PackagedClientExe
    if ($exe) {
        Start-Process -FilePath $exe
        Write-Host ""
        Write-Host "已打开桌面客户端（独立窗口）。"
        exit 0
    }
    Write-Host ""
    Write-Host "[提示] 未找到 AAAFLOW.exe（尚未打包或未安装）。将改用浏览器打开网页版。"
    Write-Host "      要独立窗口：在 frontend 目录执行  npm run electron:pack"
    Write-Host "      完成后可用 release\win-unpacked\AAAFLOW.exe 或安装向导生成的快捷方式。"
    $msg = @'
未检测到桌面客户端。已改为用浏览器打开。

若要带界面的独立窗口：打开 frontend 文件夹，在终端执行：
  npm run electron:pack

然后在 release\win-unpacked 里找到 AAAFLOW.exe，或运行安装程序从开始菜单启动。
'@
    Show-InfoDialog $msg.Trim()
    $OpenWhenReady = 'browser'
}

if ($OpenWhenReady -eq 'browser') {
    if (-not (Wait-Url "http://localhost:3000/" "前端页面" $FrontendTimeoutSec)) {
        Write-Host ""
        Write-Host "后端已就绪。若页面打不开，请手动访问: http://localhost:3000"
    }

    Start-Process "http://localhost:3000/"
    Write-Host ""
    Write-Host "已在浏览器中打开: http://localhost:3000"
    Write-Host "API 文档: http://localhost:8000/docs"
}
exit 0
