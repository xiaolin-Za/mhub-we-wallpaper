// 本地服务：壁纸视频 + WebWallGL 渲染 scene.pkg（完全本地，可移植）
const http = require('http');
const fs = require('fs');
const path = require('path');
const cfg = require('./lib/config').load();

const ROOT = __dirname;
const PORT = cfg.port || 47821;
const WORKSHOP = cfg.workshopRoot || '';

const MIME = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4v': 'video/x-m4v',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.json': 'application/json',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html',
  '.pkg': 'application/octet-stream', '.tex': 'application/octet-stream',
  '.wasm': 'application/wasm', '.css': 'text/css',
};

function allowed(p) {
  const r = path.resolve(p).toLowerCase();
  const bases = [path.resolve(ROOT).toLowerCase()];
  if (WORKSHOP) bases.push(path.resolve(WORKSHOP).toLowerCase());
  return bases.some(a => r.startsWith(a));
}

function serveFile(filePath, req, res) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end('not found');
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': st.size });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = u.pathname;

  // /wp/<id>/<file> → 创意工坊壁纸目录
  if (p.startsWith('/wp/')) {
    if (!WORKSHOP) return res.writeHead(503).end('workshop root not configured');
    const file = path.join(WORKSHOP, decodeURIComponent(p.slice(4)));
    if (!allowed(file)) return res.writeHead(403).end('forbidden');
    return serveFile(file, req, res);
  }

  // /bake?id=  → 后台把 scene 烘焙成 mp4（无窗口）
  if (p === '/bake') {
    const id = u.searchParams.get('id');
    if (!id) return res.writeHead(400).end('missing id');
    const { spawn } = require('child_process');
    const logPath = path.join(ROOT, 'bake_status.log');
    try { fs.writeFileSync(logPath, `start ${id} ${new Date().toISOString()}\n`); } catch (_) {}
    const child = spawn(process.execPath, [
      path.join(ROOT, 'bake.js'), id, String(cfg.bakeSeconds || 15), String(cfg.bakeFps || 24),
    ], {
      detached: true, windowsHide: true,
      stdio: ['ignore', fs.openSync(logPath, 'a'), fs.openSync(logPath, 'a')],
    });
    child.unref();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, status: 'started', id }));
  }

  // /job?id=...  → 查询烘焙状态
  if (p === '/job') {
    const id = u.searchParams.get('id');
    const out = path.join(ROOT, 'cache', `scene_${id}.mp4`);
    let status = 'running';
    if (fs.existsSync(out) && fs.statSync(out).size > 300 * 1024) status = 'done';
    let tail = '';
    try { tail = fs.readFileSync(path.join(ROOT, 'bake_status.log'), 'utf8').split('\n').slice(-3).join(' | '); } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ id, status, out, tail }));
  }

  // /report → 渲染状态回传
  if (p === '/report') {
    const line = `[${new Date().toLocaleTimeString('zh-CN')}] ${u.searchParams.get('event')} id=${u.searchParams.get('id')} ${u.searchParams.get('msg') || ''}`;
    try { fs.appendFileSync(path.join(ROOT, 'render.log'), line + '\n', 'utf8'); } catch (_) {}
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }).end();
    return;
  }

  // /hide?id= → 从列表移除（不删文件）；/unhide → 全部恢复
  if (p === '/hide') {
    const file = path.join(ROOT, 'hidden.json');
    let list = [];
    try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { list = []; }
    const action = u.searchParams.get('action');
    const id = u.searchParams.get('id');
    if (action === 'clear') {
      list = [];
      try { fs.writeFileSync(file, JSON.stringify(list), 'utf8'); } catch (_) {}
    } else if (id) {
      if (!list.includes(id)) list.push(id);
      try { fs.writeFileSync(file, JSON.stringify(list), 'utf8'); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, hidden: list.length }));
  }

  // /prefs → 插件设置（落盘，重启不丢）
  if (p === '/prefs') {
    const file = path.join(ROOT, 'prefs.json');
    let prefs = { autoRestore: true };
    try { prefs = Object.assign(prefs, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (_) {}
    const ar = u.searchParams.get('autoRestore');
    if (ar !== null) {
      prefs.autoRestore = ar === '1' || ar === 'true';
      try { fs.writeFileSync(file, JSON.stringify(prefs), 'utf8'); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(prefs));
  }

  // /props?id= → 壁纸自带的自定义属性（对齐 WE 那一套）
  if (p === '/props') {
    const id = u.searchParams.get('id');
    const out = { schema: {}, values: {} };
    try {
      const dir = path.join(WORKSHOP, id);
      const pj = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
      const props = (pj.general && pj.general.properties) || {};
      out.schema = props;
      out.title = pj.title;
    } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(out));
  }

  // /last → 读写"上次应用的壁纸"（落盘，重装也不丢）
  if (p === '/last') {
    const lastFile = path.join(ROOT, 'last.json');
    const set = u.searchParams.get('set');
    if (set) {
      try { fs.writeFileSync(lastFile, Buffer.from(set, 'base64').toString('utf8'), 'utf8'); } catch (_) {}
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: true }));
    }
    let data = null;
    try { data = JSON.parse(fs.readFileSync(lastFile, 'utf8')); } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(data || {}));
  }

  // /scan → 重新扫描壁纸目录
  if (p === '/scan') {
    const { spawnSync } = require('child_process');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'catalog.js')], { windowsHide: true, timeout: 120000 });
    let count = 0;
    try { count = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8')).items.length; } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: r.status === 0, count }));
  }

  // /f?p=<绝对路径>
  if (p === '/f') {
    const f = u.searchParams.get('p');
    if (!f || !allowed(f)) return res.writeHead(403).end('forbidden');
    return serveFile(f, req, res);
  }

  const rel = decodeURIComponent(p.replace(/^\/+/, '')) || 'index.html';
  const file = path.join(ROOT, rel);
  if (!allowed(file)) return res.writeHead(403).end('forbidden');
  serveFile(file, req, res);
}).on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    // 上一次进程刚被杀，端口还在 TIME_WAIT/FIN_WAIT —— 等它释放再绑
    let tries = 0;
    const retry = () => {
      tries++;
      if (tries > 30) { console.error('[server] 端口一直被占用，放弃:', PORT); process.exit(1); }
      setTimeout(() => {
        const srv = server;
        srv.on('error', e => {
          if (e && e.code === 'EADDRINUSE') { try { srv.close(); } catch (_) {} retry(); }
          else { console.error('[server] 绑定失败:', e && e.message); process.exit(1); }
        });
        srv.listen(PORT, '127.0.0.1', () => console.log(`[server] http://127.0.0.1:${PORT} (retry ${tries})`));
      }, 700);
    };
    retry();
  } else {
    console.error('[server] 启动失败:', err && err.message);
    process.exit(1);
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[server] http://127.0.0.1:${PORT}`);
});
