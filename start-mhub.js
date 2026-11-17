// 以「壁纸模式」启动 M HUB：先关掉旧进程，再带调试端口启动
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cfg = require('./lib/config').load();

function log(m) { console.log(m); }

if (!cfg.mhubPath || !fs.existsSync(cfg.mhubPath)) {
  log('找不到 M HUB，请检查 config.json 的 mhubPath');
  process.exit(1);
}

log('关闭已有的 M HUB…');
// M HUB 通常以管理员运行，普通权限杀不掉 → 通过 UAC 提权执行
try {
  const elevate = path.join(__dirname, 'run-as-admin.ps1');
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${elevate.replace(/'/g, "''")}'`
  ], { windowsHide: true, stdio: 'ignore' });
  log('已请求管理员权限重启 M HUB（如弹窗请点“是”）');
} catch (e) {
  log('提权失败: ' + (e.message || '').slice(0, 100));
}

setTimeout(() => {
  log('带调试端口启动：' + (cfg.cdpPort || 9222));
  log('M HUB 由提权脚本负责启动');
  log('已启动，等 10 秒后自动打开壁纸选择器…');
}, 3000);

setTimeout(() => {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'catalog.js')], { windowsHide: true, stdio: 'ignore' });
    execFileSync(process.execPath, [path.join(__dirname, 'inject_ui.js')], { windowsHide: true, stdio: 'ignore' });
    log('壁纸选择器已注入');
  } catch (e) {
    log('注入失败: ' + (e.message || '').slice(0, 120));
  }
}, 13000);
