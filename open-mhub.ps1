# 打开 M HUB（壁纸模式）：结束旧进程 → 带调试端口启动 → 等真正的主界面出来 → 注入
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$exe = 'C:\Program Files\MCHOSE HUB\MCHOSE HUB.exe'
$node = $null
$cfgPath = Join-Path $Root 'config.json'
if (Test-Path $cfgPath) {
  try { $node = (Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json).nodePath } catch {}
}
if (-not $node) {
  try { $node = (Get-Command node -ErrorAction SilentlyContinue).Source } catch {}
}
if (-not $node -and (Test-Path "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe")) {
  $node = "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
}

function IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (IsAdmin)) {
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', $PSCommandPath) -Verb RunAs
  exit 0
}

# 1. 结束旧进程
Get-Process | Where-Object { $_.ProcessName -like 'MCHOSE*' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. 带端口启动
Start-Process -FilePath $exe -ArgumentList '--remote-debugging-port=9222'
Write-Host "已启动 M HUB，等待主界面..."

# 3. 等真正的主界面（url 里含 mchose-renderer）
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-WebRequest 'http://127.0.0.1:9222/json/list' -TimeoutSec 2 -UseBasicParsing
    $targets = $r.Content | ConvertFrom-Json
    if ($targets | Where-Object { $_.url -like '*mchose-renderer*' }) { $ok = $true; break }
  } catch {}
}

if (-not $ok) {
  Write-Host "[!] 30 秒内主界面没出来，M HUB 可能卡在启动页"
  Write-Host "    可以再运行一次，或手动打开 M HUB 后运行 启动壁纸界面.bat"
  Start-Sleep -Seconds 4
  exit 2
}

# 4. 注入
if ($node) {
  Start-Sleep -Seconds 1
  & $node (Join-Path $Root 'inject-ui.js') 2>&1 | ForEach-Object { Write-Host $_ }
}
Write-Host "[√] 壁纸模式已就绪"
Start-Sleep -Seconds 2
exit 0
