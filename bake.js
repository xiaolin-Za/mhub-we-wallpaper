// 用 Edge 渲染 scene 壁纸并逐帧抓取，输出 mp4（不需要录桌面）
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const cfg = require('./lib/config').load();
const EDGE = cfg.edgePath;
const FFMPEG = cfg.ffmpegPath;
const CACHE = path.join(__dirname, 'cache');
const FRAMES = path.join(__dirname, 'frames');
const LOG = path.join(__dirname, 'bake.log');
const PORT = cfg.port || 47821;
const CDP = cfg.cdpPort ? cfg.cdpPort + 1 : 9223;

function log(m) {
  const line = `[${new Date().toLocaleTimeString('zh-CN')}] ${m}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n', 'utf8'); } catch (_) {}
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  const id = process.argv[2];
  const seconds = parseInt(process.argv[3] || String(cfg.bakeSeconds || 15), 10);
  const fps = parseInt(process.argv[4] || String(cfg.bakeFps || 24), 10);
  if (!id) { log('缺少 id'); process.exit(1); }

  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });
  const out = path.join(CACHE, `scene_${id}.mp4`);
  if (fs.existsSync(out) && fs.statSync(out).size > 300 * 1024) {
    log('已有缓存 ' + out);
    console.log(JSON.stringify({ ok: true, out, cached: true }));
    return;
  }

  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  const profile = path.join(process.env.TEMP, 'we-bake-profile');
  log('启动 Edge 渲染');
  const edge = require('child_process').spawn(EDGE, [
    `--user-data-dir=${profile}`,
    '--headless=new',
    '--use-angle=d3d11',
    '--enable-gpu',
    '--remote-debugging-port=' + CDP,
    '--no-first-run', '--no-default-browser-check',
    '--window-size=1920,1080',
    '--app=http://127.0.0.1:' + PORT + '/wall/index.html?id=' + id,
  ], { detached: false, stdio: 'ignore', windowsHide: true });

  let ws;
  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      try {
        const list = await getJson(`http://127.0.0.1:${CDP}/json/list`);
        target = list.find(t => t.type === 'page' && t.url.includes('/wall/index.html'));
        if (target) break;
      } catch (_) {}
    }
    if (!target) throw new Error('拿不到 CDP target');

    ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const idm = msgId++;
      pending.set(idm, { resolve, reject });
      ws.send(JSON.stringify({ id: idm, method, params }));
    });
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error.message));
        else p.resolve(m.result);
      }
    };

    await send('Page.enable');
    log('等待场景渲染');
    await sleep(8000);

    const frames = Math.max(10, seconds * fps);
    const interval = 1000 / fps;
    log(`抓取 ${frames} 帧`);
    for (let i = 0; i < frames; i++) {
      const t0 = Date.now();
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      fs.writeFileSync(path.join(FRAMES, `f_${String(i).padStart(4, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
      const spent = Date.now() - t0;
      if (spent < interval) await sleep(interval - spent);
    }
    log('抓帧完成');
  } catch (e) {
    log('抓帧失败: ' + e.message);
  } finally {
    try { if (ws) ws.close(); } catch (_) {}
    try { edge.kill(); } catch (_) {}
    try { execFileSync('cmd', ['/c', 'taskkill', '/f', '/im', 'msedge.exe'], { stdio: 'ignore', windowsHide: true }); } catch (_) {}
  }

  const count = fs.readdirSync(FRAMES).length;
  if (count < 10) { log('帧数不足 (' + count + ')'); console.log(JSON.stringify({ ok: false, id })); process.exit(1); }

  log('编码 mp4');
  const r = require('child_process').spawnSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(fps), '-i', path.join(FRAMES, 'f_%04d.jpg'),
    '-vf', 'scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '19', '-b:v', '18M',
    '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', out,
  ], { timeout: 300000, windowsHide: true });
  if (r.status !== 0) log('编码失败: ' + (r.stderr || '').toString().slice(0, 160));

  if (fs.existsSync(out) && fs.statSync(out).size > 300 * 1024) {
    log('完成 ' + Math.round(fs.statSync(out).size / 1024) + ' KB');
    fs.rmSync(FRAMES, { recursive: true, force: true });
    console.log(JSON.stringify({ ok: true, out, id }));
  } else {
    log('产物为空');
    console.log(JSON.stringify({ ok: false, id }));
    process.exit(1);
  }
}

main();
