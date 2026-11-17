// 注入新版 UI（页面代码在 ui/page.js，便于维护）
const http = require('http');
const fs = require('fs');
const path = require('path');
const cfg = require('./lib/config').load();

const PORT = cfg.port || 47821;
const CDP = cfg.cdpPort || 9222;
const BASE = `http://127.0.0.1:${PORT}`;
const PAGE = path.join(__dirname, 'ui', 'page.js');

function cdpUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP}/json/list`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try {
          const page = JSON.parse(d).find(t => t.type === 'page' && t.url.includes('mchose-renderer'));
          if (!page) return reject(new Error('找不到 M HUB 页面（需要带调试端口启动）'));
          resolve(page.webSocketDebuggerUrl);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('CDP 连接超时')));
  });
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => ws.send(JSON.stringify({
      id: 1, method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true },
    }));
    const timer = setTimeout(() => reject(new Error('执行超时')), 40000);
    if (timer.unref) timer.unref();
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id !== 1) return;
      clearTimeout(timer);
      try { ws.close(); } catch (_) {}
      if (m.result && m.result.exceptionDetails) {
        const d = m.result.exceptionDetails;
        const desc = (d.exception && d.exception.description) || d.text || '';
        reject(new Error(String(desc).slice(0, 400)));
      } else {
        resolve(m.result && m.result.result ? m.result.result.value : null);
      }
    };
    ws.onerror = () => reject(new Error('WS 错误'));
  });
}

(async () => {
  const code = fs.readFileSync(PAGE, 'utf8');
  const catalog = `${BASE}/f?p=${encodeURIComponent(path.join(__dirname, 'catalog.json'))}`;
  const expr = `window.__WE_BASE=${JSON.stringify(BASE)};window.__WE_CATALOG=${JSON.stringify(catalog)};\n${code}`;
  const ws = await cdpUrl();
  const r = await evaluate(ws, expr);
  console.log('[ui]', r);
})().catch(e => { console.error('[ui] 失败:', e.message); process.exit(1); });
