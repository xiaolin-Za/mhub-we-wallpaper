# 启动脚本：起守护 + 让 M HUB 带调试端口启动
# 作用：提权 → 找 Node.js → 启动守护 → 让 M HUB 带调试端口启动 → 注入壁纸界面
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Step($t) { Write-Host "  $t" }

# ---------- 1. 管理员 ----------
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$isAdmin = $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "正在请求管理员权限..."
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', $PSCommandPath) -Verb RunAs
  exit 0
}

# ---------- 2. 找 Node.js ----------
$node = $null
try { $node = (Get-Command node -ErrorAction SilentlyContinue).Source } catch {}
if (-not $node) {
  $cands = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe",
    "$env:APPDATA\nvm\node.exe"
  )
  foreach ($c in $cands) { if (Test-Path $c) { $node = $c; break } }
}
if (-not $node) {
  Write-Host ""
  Write-Host "[X] 没找到 Node.js" -ForegroundColor Red
  Write-Host "    请先安装 Node.js 22 或更高版本： https://nodejs.org"
  Write-Host "    安装后重新运行本文件。"
  Write-Host ""
  Read-Host "按回车关闭"
  exit 1
}
Write-Host "Node: $node"

# ---------- 3. 停掉旧守护 ----------
$task = 'MCHOSE_WE_Wallpaper'
$exists = $false
try { $exists = [bool](Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue) } catch {}
if ($exists) {
  try { Stop-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue } catch {}
}

# ---------- 4. 启动守护 ----------
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*watchdog.js*' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }

Write-Step "启动守护..."
Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $Root 'watchdog.js') + '"') -WorkingDirectory $Root -WindowStyle Hidden

# ---------- 5. 让 M HUB 带端口起来 ----------
Set-Content -Path (Join-Path $Root '.start') -Value '' -Encoding ASCII
Write-Host "等待 M HUB 就绪（首次约 10 秒）..."

$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest 'http://127.0.0.1:9222/json/list' -TimeoutSec 2 -UseBasicParsing
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch {}
}

Write-Host ""
if ($ok) {
  Write-Host "[√] 已就绪：壁纸已启用" -ForegroundColor Green
  Write-Host "    选择器：右下角圆形按钮"
  Start-Sleep -Seconds 5
  exit 0
} else {
  Write-Host "[!] M HUB 没能在 40 秒内就绪" -ForegroundColor Yellow
  Write-Host "    检查：1) M HUB 是否安装  2) watchdog.log 最后几行"
  Write-Host "    日志： $Root\watchdog.log"
  Read-Host "按回车关闭"
  exit 2
}
