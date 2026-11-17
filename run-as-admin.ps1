# 以管理员身份：结束 M HUB 全部进程，再带调试端口启动
$exe = 'C:\Program Files\MCHOSE HUB\MCHOSE HUB.exe'
$port = 9222

Get-Process | Where-Object { $_.ProcessName -like 'MCHOSE*' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Start-Process -FilePath $exe -ArgumentList "--remote-debugging-port=$port"
