# M HUB 壁纸插件 · 托盘控制（可移植版）
# 依赖 config.json，不再写死路径

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$CfgPath = Join-Path $Root 'config.json'
$cfg = Get-Content $CfgPath -Raw -Encoding UTF8 | ConvertFrom-Json

$Node = $cfg.nodePath
if (-not $Node -or -not (Test-Path $Node)) {
    try { $Node = (Get-Command node -ErrorAction Stop).Source } catch { $Node = 'node' }
}
$MHubExe = $cfg.mhubPath
$Port = $cfg.port
$CdpPort = $cfg.cdpPort
$WallDir = Join-Path $Root 'wallpapers'
$LogFile = Join-Path $Root 'tray.log'

if (-not (Test-Path $WallDir)) { New-Item -ItemType Directory -Force -Path $WallDir | Out-Null }

Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @'
using System;
using System.Windows.Forms;
using System.Runtime.InteropServices;
public class HotkeyForm : Form {
    public event EventHandler HotkeyPressed;
    protected override void WndProc(ref Message m) {
        if (m.Msg == 0x0312) { var h = HotkeyPressed; if (h != null) h(this, EventArgs.Empty); }
        base.WndProc(ref m);
    }
    [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr h, int id, uint mod, uint vk);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr h, int id);
}
'@

function Write-Log($m) {
    Add-Content $LogFile ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m) -Encoding UTF8
}
function Test-Port($p) {
    try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $p); $c.Close(); return $true } catch { return $false }
}
function Ensure-Server {
    if (-not (Test-Port $Port)) {
        Start-Process -FilePath $Node -ArgumentList "`"$Root\server.js`"" -WindowStyle Hidden
        Start-Sleep -Milliseconds 1500
    }
}
function Ensure-MHub {
    $proc = Get-Process 'MCHOSE HUB' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
    if ($proc -and (Test-Port $CdpPort)) { return }
    Write-Log '以调试端口重启 M HUB'
    & $Node (Join-Path $Root 'start-mhub.js') | Out-Null
    Start-Sleep -Seconds 14
}
function Get-Wallpapers {
    Get-ChildItem $WallDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -in '.mp4', '.webm', '.webp', '.gif' } | Sort-Object Name
}
function Set-Wallpaper($file) {
    Ensure-Server; Ensure-MHub
    $rel = "wallpapers/$([IO.Path]::GetFileName($file))"
    Write-Log "注入壁纸: $rel"
    & $Node (Join-Path $Root 'inject.js') $rel 2>&1 | ForEach-Object { Write-Log $_ }
}
function Show-Balloon($t) {
    $script:tray.BalloonTipTitle = 'M HUB 壁纸'
    $script:tray.BalloonTipText = $t
    $script:tray.ShowBalloonTip(2000)
}
function Cycle-Wallpaper {
    $items = @(Get-Wallpapers)
    if ($items.Count -eq 0) { Show-Balloon 'wallpapers 文件夹是空的'; return }
    $idx = Join-Path $Root 'current.txt'
    $cur = ''
    if (Test-Path $idx) { $cur = (Get-Content $idx -Raw).Trim() }
    $i = [array]::IndexOf($items.Name, $cur)
    $next = $items[($i + 1) % $items.Count]
    Set-Wallpaper $next.FullName
    Set-Content $idx $next.Name -Encoding UTF8
    Show-Balloon "已切换：$($next.BaseName)"
}

$form = New-Object HotkeyForm
$form.ShowInTaskbar = $false
$form.FormBorderStyle = 'None'
$form.Opacity = 0
$form.Size = New-Object System.Drawing.Size(1, 1)
$form.WindowState = 'Minimized'

$script:tray = New-Object System.Windows.Forms.NotifyIcon
$script:tray.Icon = [System.Drawing.SystemIcons]::Application
$script:tray.Text = 'M HUB 壁纸插件'
$script:tray.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$mPicker = $menu.Items.Add('打开壁纸选择器')
$mPicker.add_Click({
    Ensure-Server; Ensure-MHub
    & $Node (Join-Path $Root 'catalog.js') | Out-Null
    & $Node (Join-Path $Root 'inject-ui.js') 2>&1 | ForEach-Object { Write-Log $_ }
    Show-Balloon '选择器已打开（右下角按钮）'
})

$mList = New-Object System.Windows.Forms.ToolStripMenuItem 'wallpapers 文件夹里的视频'
$menu.Items.Add($mList) | Out-Null

$mNext = $menu.Items.Add('下一张 (Ctrl+Alt+W)')
$mNext.add_Click({ Cycle-Wallpaper })

$mOpen = $menu.Items.Add('打开壁纸文件夹')
$mOpen.add_Click({ Start-Process explorer.exe $WallDir })

$mHub = $menu.Items.Add('重启 M HUB（壁纸模式）')
$mHub.add_Click({ Ensure-MHub; Show-Balloon 'M HUB 已以壁纸模式启动' })

$menu.Items.Add('-') | Out-Null
$mExit = $menu.Items.Add('退出')
$mExit.add_Click({
    $script:tray.Visible = $false
    [HotkeyForm]::UnregisterHotKey($form.Handle, 1) | Out-Null
    $form.Close()
    [System.Windows.Forms.Application]::Exit()
})

function Refresh-Menu {
    $mList.DropDownItems.Clear()
    $items = @(Get-Wallpapers)
    if ($items.Count -eq 0) { $mList.DropDownItems.Add('（空）') | Out-Null; return }
    foreach ($f in $items) {
        $it = New-Object System.Windows.Forms.ToolStripMenuItem $f.BaseName
        $it.Tag = $f.FullName
        $it.add_Click({
            param($s, $e)
            Set-Wallpaper $s.Tag
            Set-Content (Join-Path $Root 'current.txt') ([IO.Path]::GetFileName($s.Tag)) -Encoding UTF8
            Show-Balloon "已应用：$($s.Text)"
        })
        $mList.DropDownItems.Add($it) | Out-Null
    }
}

$menu.add_Opening({ Refresh-Menu })
$script:tray.ContextMenuStrip = $menu

$form.add_Shown({
    $ok = [HotkeyForm]::RegisterHotKey($form.Handle, 1, 0x0003, 0x57)
    Write-Log "热键注册: $ok"
})
$form.add_HotkeyPressed({ Cycle-Wallpaper })

Write-Log '托盘启动'
Ensure-Server
Refresh-Menu
$form.Show()
[System.Windows.Forms.Application]::Run()
Write-Log '托盘退出'
