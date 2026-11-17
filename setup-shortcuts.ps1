# 一次性安装：桌面快捷方式 + 免 UAC 的"打开壁纸模式"任务
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$isAdmin = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', $PSCommandPath) -Verb RunAs
  exit 0
}

$ps = 'powershell.exe'
$openScript = Join-Path $Root 'open-mhub.ps1'

# ---- 1. 计划任务：打开壁纸模式（管理员，无需每次 UAC）----
$action = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$openScript`""
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
try {
  Register-ScheduledTask -TaskName 'MCHOSE_WE_Open' -Action $action -Settings $settings -RunLevel Highest -Force | Out-Null
  Write-Host "已注册计划任务 MCHOSE_WE_Open"
} catch { Write-Host "注册任务失败: $($_.Exception.Message)" }

# ---- 2. 快捷方式 ----
$sh = New-Object -ComObject WScript.Shell
$desktops = @("$env:USERPROFILE\Desktop", 'C:\Users\Public\Desktop')

function New-Lnk($path, $target, $args, $icon, $desc) {
  $sc = $sh.CreateShortcut($path)
  $sc.TargetPath = $target
  $sc.Arguments = $args
  $sc.WorkingDirectory = $Root
  $sc.IconLocation = $icon
  $sc.Description = $desc
  $sc.Save()
}

foreach ($d in $desktops) {
  if (-not (Test-Path $d)) { continue }

  # M HUB（壁纸模式）
  New-Lnk (Join-Path $d 'M HUB 壁纸模式.lnk') 'C:\Windows\System32\schtasks.exe' '/Run /TN "MCHOSE_WE_Open"' '%SystemRoot%\System32\imageres.dll,68' '打开 M HUB（壁纸模式）'

  # 下一个壁纸
  New-Lnk (Join-Path $d '下一个壁纸.lnk') 'C:\Windows\System32\wscript.exe' ('"' + (Join-Path $Root 'next-wallpaper.vbs') + '"') '%SystemRoot%\System32\imageres.dll,262' '切换到下一张壁纸'

  # 壁纸选择器（只是打开面板，需要 M HUB 已在壁纸模式）
  Write-Host "快捷方式已写入 $d"
}

Write-Host '完成'
