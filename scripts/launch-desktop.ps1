# 一键启动：补全 Docker PATH、docker compose、等待服务、打开桌面客户端或浏览器（避免 CMD 乱码）
#Requires -Version 5.1
param(
    [ValidateSet('client', 'browser', 'none')]
    [string]$OpenWhenReady = 'client'
)
$ErrorActionPreference = "Stop"

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

$RepoRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $RepoRoot

function Add-DockerCliToPath {
    $dirs = @(
        (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"),
        (Join-Path ${env:ProgramFiles(x86)} "Docker\Docker\resources\bin"),
        (Join-Path $env:LocalAppData "Programs\Docker\Docker\resources\bin")
    )
    foreach ($d in $dirs) {
        if (-not $d) { continue }
        $exe = Join-Path $d "docker.exe"
        if (Test-Path -LiteralPath $exe) {
            $env:Path = "$d;$env:Path"
            return $true
        }
    }
    return $false
}

function Ensure-Docker {
    [void](Add-DockerCliToPath)
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Host ""
        Write-Host "[错误] 找不到 docker 命令。"
        Write-Host ""
        Write-Host "如果你不知道 Docker 是什么：请先看本文件夹里的「AAAFLOW-小白必读.txt」。"
        Write-Host "简单说：要先装一个叫 Docker Desktop 的软件（桌面右下角小鲸鱼图标）。"
        Write-Host "下载: https://www.docker.com/products/docker-desktop/"
        Write-Host ""
        Write-Host "若已安装仍报错，请依次检查："
        Write-Host "  1) 小鲸鱼已打开并在运行"
        Write-Host "  2) 安装后请【注销或重启电脑】再双击本脚本"
        Write-Host "  3) 本机是否存在: C:\Program Files\Docker\Docker\resources\bin\docker.exe"
        Write-Host ""
        exit 1
    }

    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[错误] 小鲸鱼（Docker Desktop）还没跑起来。请先从开始菜单打开 Docker Desktop，等就绪后再试。"
        Write-Host ""
        exit 1
    }
}

function Invoke-DockerCompose {
    param([string[]]$Arguments)
    $composeArgs = @("compose") + $Arguments
    & docker @composeArgs
    if ($LASTEXITCODE -eq 0) { return }
    $bin = Split-Path -Parent (Get-Command docker).Source
    $legacy = Join-Path $bin "docker-compose.exe"
    if (Test-Path -LiteralPath $legacy) {
        Write-Host "  （使用 docker-compose 兼容模式）"
        & $legacy @Arguments
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "  AAAFLOW — 一键启动后台"
Write-Host "========================================"
Write-Host ""

Ensure-Docker

$envFile = Join-Path $RepoRoot "backend\.env"
$envExample = Join-Path $RepoRoot "backend\.env.example"
if (-not (Test-Path -LiteralPath $envFile)) {
    if (Test-Path -LiteralPath $envExample) {
        Copy-Item -LiteralPath $envExample -Destination $envFile -Force
        Write-Host "[提示] 已创建 backend\.env，即将用记事本打开。"
        Start-Process notepad.exe -ArgumentList "`"$envFile`""
        Write-Host ""
        Write-Host "========================================"
        Write-Host "  【重要】这不是出错！"
        Write-Host "  1）在记事本里把 ANTHROPIC_API_KEY= 后面改成你的真密钥（不要用 sk-ant-xxxxx）"
        Write-Host "  2）点 文件 → 保存，然后关掉记事本"
        Write-Host "  3）回到本窗口，按一次回车键 —— 才会继续启动 Docker 和打开网页"
        Write-Host "========================================"
        Write-Host ""
        Read-Host "保存并关闭记事本后，按回车继续"
    }
}
if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Host "[错误] 仍未找到 backend\.env，请确认本脚本在 AAAFLOW 项目根目录里运行。"
    Write-Host ""
    exit 1
}

$envText = Get-Content -LiteralPath $envFile -Raw -ErrorAction SilentlyContinue
if ($envText -match '(?m)^ANTHROPIC_API_KEY=\s*sk-ant-xxxxx\s*$' -or $envText -match '(?m)^ANTHROPIC_API_KEY=\s*$') {
    Write-Host "[警告] ANTHROPIC_API_KEY 似乎还是空的或仍是示例 sk-ant-xxxxx，AI 对话会失败。"
    Write-Host "        建议先编辑 backend\.env 保存真密钥。仍要尝试启动请按回车。"
    Read-Host
}

Write-Host "[1/2] 正在启动 Docker 服务（首次可能较慢）..."
Set-Location $RepoRoot
Invoke-DockerCompose @("up", "-d", "--build")
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[错误] docker compose 失败，请查看上方英文日志。"
    Write-Host ""
    exit 1
}

Write-Host ""
if ($OpenWhenReady -eq 'client') {
    Write-Host "[2/2] 等待就绪并打开桌面客户端（若未安装则改用浏览器）..."
} elseif ($OpenWhenReady -eq 'browser') {
    Write-Host "[2/2] 等待就绪并打开浏览器..."
} else {
    Write-Host "[2/2] 等待服务就绪（不自动打开窗口）..."
}
$ErrorActionPreference = "SilentlyContinue"
& (Join-Path $PSScriptRoot "start-desktop.ps1") -OpenWhenReady $OpenWhenReady
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { exit $exitCode }

Write-Host ""
Write-Host "提示：关闭本黑窗口不会停止 Docker 里的后台。日常用界面请用已弹出的「AAAFLOW」窗口或浏览器；"
Write-Host "      仅当后台已在跑时，也可双击 AAAFLOW-ClientOnly.bat 只开客户端。"
Write-Host "停止后台请在本项目目录终端执行: docker compose down"
Write-Host ""
