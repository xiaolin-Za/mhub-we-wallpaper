// 常驻守护：一旦发现 M HUB 被拉起，就确保它带调试端口，并自动注入选择器
// 需以管理员身份运行（由计划任务 MCHOSE_WE_Wallpaper 启动）
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cfg = require('./lib/config').load();

const ROOT = __dirname;
const LOG = path.join(ROOT, 'watchdog.log');
const CDP = cfg.cdpPort || 9222;
const EXE = cfg.mhubPath;
const INTERVAL = 2000;

function log(m) {
  const line = `[${new Date().toLocaleTimeString('zh-CN')}] ${m}`;
  try { fs.appendFileSync(LOG, line + '\n', 'utf8'); } catch (_) {}
}

function ps(cmd) {
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', cmd], {
      windowsHide: true, stdio: 'pipe', timeout: 20000,
    }).toString().trim();
  } catch (_) { return ''; }
}

function running() {
  const out = ps("(Get-Process -Name 'MCHOSE HUB' -ErrorAction SilentlyContinue | Measure-Object).Count");
  return parseInt(out || '0', 10) > 0;
}

function killAll() {
  ps("Get-Process | Where-Object { $_.ProcessName -like 'MCHOSE*' } | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2");
}

function startWithPort() {
  ps(`Start-Process -FilePath '${EXE.replace(/'/g, "''")}' -ArgumentList '--remote-debugging-port=${CDP}'`);
}

// 启动并等待端口就绪；失败会清场重试，避免和 M HUB 自身的 Watcher 抢跑
async function launchAndWait(maxMs) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    startWithPort();
    const t0 = Date.now();
    while (Date.now() - t0 < (maxMs || 20000)) {
      if (await cdpAlive()) return true;
      await new Promise(r => setTimeout(r, 400));
    }
    if (await cdpAlive()) return true;
    log('启动超时，清场重试 ' + attempt);
    killAll();
    await new Promise(r => setTimeout(r, 1200));
  }
  return await cdpAlive();
}

function cdpAlive() {
  return new Promise(resolve => {
    const req = require('http').get(`http://127.0.0.1:${CDP}/json/list`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try {
          const list = JSON.parse(d);
          resolve(list.some(t => t.type === 'page' && t.url.includes('mchose-renderer')));
        } catch (_) { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2500, () => { req.destroy(); resolve(false); });
  });
}

function serverUp() {
  return new Promise(resolve => {
    const req = require('http').get(`http://127.0.0.1:${cfg.port}/f?p=${encodeURIComponent(path.join(ROOT, 'catalog.json'))}`, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await serverUp()) return;
  log('启动本地服务');
  const serverJs = path.join(ROOT, 'server.js');
  try {
    // 用 powershell 拉起（计划任务的高权限会话里 spawn 可能被拦）
    ps(`Start-Process -FilePath '${process.execPath.replace(/'/g, "''")}' -ArgumentList '"${serverJs.replace(/'/g, "''")}"' -WorkingDirectory '${ROOT.replace(/'/g, "''")}' -WindowStyle Hidden`);
  } catch (e) {
    log('启动服务失败: ' + e.message);
  }
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 700));
    if (await serverUp()) return;
  }
  log('服务仍未就绪（端口 ' + cfg.port + '）');
}

function uiPresent() {
  return new Promise(resolve => {
    const req = require('http').get(`http://127.0.0.1:${CDP}/json/list`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        let target;
        try { target = JSON.parse(d).find(t => t.type === 'page' && t.url.includes('mchose-renderer')); } catch (_) {}
        if (!target) return resolve(false);
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: "!!document.getElementById('we-root')", returnByValue: true } }));
        ws.onmessage = ev => {
          const m = JSON.parse(ev.data);
          if (m.id === 1) { try { ws.close(); } catch (_) {} resolve(!!(m.result && m.result.result && m.result.result.value)); }
        };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 6000);
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(4000, () => { req.destroy(); resolve(false); });
  });
}

async function injectUI() {
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'catalog.js')], { windowsHide: true, stdio: 'ignore', timeout: 60000 });
    const out = execFileSync(process.execPath, [path.join(ROOT, 'inject-ui.js')], { windowsHide: true, stdio: 'pipe', timeout: 60000 }).toString().trim();
    log('注入: ' + out.slice(0, 80));
    return out.includes('ui-injected');
  } catch (e) {
    log('注入失败: ' + (e.message || '').slice(0, 100));
    return false;
  }
}

let busy = false;
let lastState = '';
let lastUiCheck = 0;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    await ensureServer();
    // 先看端口：端口在就说明 M HUB 已带调试端口运行，省掉一次 powershell 进程查询
    const portAlive = await cdpAlive();
    let isRunning = portAlive ? true : running();
    // 开机/登录后首次运行：主动带端口拉起 M HUB
    const os = require('os');
    const bootFresh = (Date.now() - os.uptime() * 1000) < 180000;
    if (!isRunning && bootFresh && !global.__bootStarted) {
      global.__bootStarted = true;
      log('开机启动：拉起 M HUB（壁纸模式）');
      if (await launchAndWait(20000)) { await injectUI(); lastState = 'ok'; return; }
    }
    // 快捷方式触发：文件标记 → 主动拉起 M HUB（带端口）
    const flagFile = path.join(ROOT, '.start');
    if (!isRunning && fs.existsSync(flagFile)) {
      try { fs.unlinkSync(flagFile); } catch (_) {}
      log('收到启动请求 → 启动 M HUB（壁纸模式）');
      if (await launchAndWait(20000)) { await injectUI(); lastState = 'ok'; }
      else { log('启动失败（已重试 3 次）'); }
      return;
    }
    const hasPort = portAlive;
    if (isRunning) { try { if (fs.existsSync(flagFile)) fs.unlinkSync(flagFile); } catch (_) {} }

    if (isRunning && !hasPort) {
      if (lastState !== 'restart') log('发现 M HUB 无调试端口 → 重启为壁纸模式');
      lastState = 'restart';
      killAll();
      startWithPort();
      // 轮询等待端口，通常 3-6 秒就绪
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        if (await cdpAlive()) break;
        await new Promise(r => setTimeout(r, 400));
      }
      if (await cdpAlive()) {
        log('已带端口启动，注入选择器');
        await injectUI();
        lastState = 'ok';
      }
    } else if (hasPort) {
      if (lastState !== 'ok') {
        log('M HUB 已就绪（有调试端口）');
        lastState = 'ok';
        await injectUI();
      } else if (Date.now() - lastUiCheck > 8000) {
        lastUiCheck = Date.now();
        const present = await uiPresent();
        if (!present) {
          log('检测到选择器丢失 → 重新注入');
          await injectUI();
        }
      }
    } else {
      lastState = 'idle';
    }
  } catch (e) {
    log('tick 异常: ' + (e.message || '').slice(0, 120));
  } finally {
    busy = false;
  }
}

log('守护启动，间隔 ' + INTERVAL + 'ms');
setInterval(tick, INTERVAL);
tick();
