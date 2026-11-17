# 让 M HUB 的启动入口全部带上调试端口（避免每次被守护重启）
$ErrorActionPreference = 'Continue'
$log = 'E:\MCHOSE-WE\launcher_fix.log'
function L($m) { Add-Content $log ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m) -Encoding UTF8 }
Set-Content $log "" -Encoding UTF8

$exe = 'C:\Program Files\MCHOSE HUB\MCHOSE HUB.exe'
$cmd = 'C:\Windows\System32\cmd.exe'
$args = '/c echo. > "E:\MCHOSE-WE\.start" & schtasks /Run /TN "MCHOSE_WE_Wallpaper"'

# 1) 开机任务：直接指向 exe 并带端口
$tr = '"' + $exe + '" --remote-debugging-port=9222'
schtasks /Change /TN "MCHOSE_HUB_Launcher" /TR $tr /ENABLE 2>&1 | ForEach-Object { L "task: $_" }

# 2) 改写快捷方式（备份原文件）
$sh = New-Object -ComObject WScript.Shell
$targets = @(
  'C:\Users\Public\Desktop\MCHOSE HUB.lnk',
  'C:\ProgramData\Microsoft\Windows\Start Menu\Programs\MCHOSE HUB.lnk'
)
foreach ($t in $targets) {
  if (Test-Path $t) {
    if (-not (Test-Path ($t + '.bak'))) { Copy-Item $t ($t + '.bak') -Force }
    try {
      $sc = $sh.CreateShortcut($t)
      $sc.TargetPath = $cmd
      $sc.Arguments = $args
      $sc.WorkingDirectory = 'E:\MCHOSE-WE'
      $sc.IconLocation = '%SystemRoot%\System32\imageres.dll,68'
      $sc.Description = 'M HUB（壁纸模式）'
      $sc.Save()
      L "shortcut rewritten: $t"
    } catch { L "shortcut failed: $t -> $($_.Exception.Message)" }
  } else { L "missing: $t" }
}
L 'done'
