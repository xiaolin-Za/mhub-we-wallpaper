# 注册/更新开机守护任务（需管理员）
$nodePath = 'C:\Users\xiaolin\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$cfg = Get-Content 'E:\MCHOSE-WE\config.json' -Raw -Encoding UTF8 | ConvertFrom-Json
if ($cfg.nodePath) { $nodePath = $cfg.nodePath }

$action = New-ScheduledTaskAction -Execute $nodePath -Argument '"E:\MCHOSE-WE\watchdog.js"' -WorkingDirectory 'E:\MCHOSE-WE'
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -RunLevel Highest
Register-ScheduledTask -TaskName 'MCHOSE_WE_Wallpaper' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

# 立刻启动守护
Start-ScheduledTask -TaskName 'MCHOSE_WE_Wallpaper'
