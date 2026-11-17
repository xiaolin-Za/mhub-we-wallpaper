# M HUB 壁纸插件 · 安装脚本（可移植）
# 用法：右键 -> 使用 PowerShell 运行，或 powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $Root 'config.json'

Write-Host '=== M HUB 壁纸插件 安装 ===' -ForegroundColor Cyan

# ---------- 1. 找 Node ----------
$node = ''
try { $node = (Get-Command node -ErrorAction Stop).Source } catch {}
if (-not $node) {
    foreach ($c in @(
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        'C:\Program Files\nodejs\node.exe',
        "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
    )) { if (Test-Path $c) { $node = $c; break } }
}
if (-not $node) {
    Write-Host '找不到 Node.js（需要 >= 22.12）。请先安装 Node 后重跑。' -ForegroundColor Red
    Read-Host '按回车退出'
    exit 1
}
Write-Host "Node: $node"

# ---------- 2. 生成/更新配置 ----------
Push-Location $Root
& $node -e "const c=require('./lib/config');const cfg=c.load();require('fs').writeFileSync('./config.json',JSON.stringify(Object.assign({},cfg,{nodePath:process.execPath}),null,2));console.log(JSON.stringify(cfg,null,1))"
Pop-Location

$cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not $cfg.edgePath) { Write-Host '警告：没找到 Edge/Chrome，scene 烘焙不可用' -ForegroundColor Yellow }
if (-not $cfg.ffmpegPath) { Write-Host '警告：没找到 FFmpeg，视频编码不可用' -ForegroundColor Yellow }
if (-not $cfg.workshopRoot) { Write-Host '警告：没找到 Wallpaper Engine 创意工坊目录' -ForegroundColor Yellow }
if (-not $cfg.mhubPath) { Write-Host '警告：没找到 M HUB，请手动填 config.json 的 mhubPath' -ForegroundColor Yellow }

# ---------- 3. 桌面快捷方式 ----------
$Desktop = [Environment]::GetFolderPath('Desktop')
$WS = New-Object -ComObject WScript.Shell

function New-Lnk($Name, $Target, $LnkArgs, $WorkDir, $Desc, $Icon) {
    $p = Join-Path $Desktop $Name
    $sc = $WS.CreateShortcut($p)
    $sc.TargetPath = $Target
    $sc.Arguments = $LnkArgs
    $sc.WorkingDirectory = $WorkDir
    $sc.Description = $Desc
    if ($Icon) { $sc.IconLocation = $Icon }
    $sc.Save()
    Write-Host "快捷方式: $Name"
}

$ps = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$icon = '%SystemRoot%\System32\imageres.dll,68'

New-Lnk 'M HUB壁纸选择器.lnk' $ps `
    "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"& '$node' '$Root\catalog.js'; & '$node' '$Root\inject-ui.js'`"" `
    $Root '打开 M HUB 壁纸选择器' $icon

New-Lnk 'M HUB壁纸模式.lnk' 'C:\Windows\System32\cmd.exe' `
    "/c echo. > `"$Root\.start`" & schtasks /Run /TN `"MCHOSE_WE_Wallpaper`"" `
    $Root '启动 M HUB 壁纸模式（无 UAC）' '%SystemRoot%\System32\imageres.dll,68'

New-Lnk 'M HUB壁纸控制.lnk' $ps `
    "-STA -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Root\tray.ps1`"" `
    $Root 'M HUB 壁纸插件托盘（Ctrl+Alt+W 切换）' '%SystemRoot%\System32\imageres.dll,68'

# ---------- 4. 启动服务 ----------
$port = $cfg.port
$running = $false
try { $running = [bool](Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue) } catch {}
if (-not $running) {
    Start-Process -FilePath $node -ArgumentList "`"$Root\server.js`"" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "本地服务已启动（端口 $port）"
} else {
    Write-Host "本地服务已在运行（端口 $port）"
}

# ---------- 5. 开机守护任务（可选） ----------
Write-Host ''
$ans = Read-Host '是否创建开机守护任务（M HUB 一启动就自动带调试端口）？[Y/n]'
if ($ans -ne 'n' -and $ans -ne 'N') {
    try {
        Start-Process powershell -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', (Join-Path $Root 'autostart.ps1')) -Wait
        Write-Host '守护任务已创建：MCHOSE_WE_Wallpaper（开机/登录自动运行）'
    } catch {
        Write-Host '创建失败，可稍后手动右键 autostart.ps1 -> 以管理员运行' -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host '=== 安装完成 ===' -ForegroundColor Green
Write-Host "目录: $Root"
Write-Host "配置: $ConfigPath"
Write-Host ''
Write-Host '用法：'
Write-Host '  1) 双击「M HUB壁纸模式」→ 自动以调试端口启动 M HUB + 打开选择器'
Write-Host '  2) 或先手动开 M HUB，再双击「M HUB壁纸选择器」'
Write-Host ''
Read-Host '按回车退出'
