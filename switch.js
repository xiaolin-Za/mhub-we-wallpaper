// 一键切换到下一张壁纸
// 用法: node switch.js        -> 下一张
//       node switch.js -1     -> 上一张
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const CDP = 9222;
const ROOT = __dirname;

function list() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP}/json/list`, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => { req.destroy(new Error('CDP 超时')); });
  });
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => reject(new Error('执行超时')), 20000);
    ws.onopen = () => ws.send(JSON.stringify({
      id: 1, method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true },
    }));
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id !== 1) return;
      clearTimeout(timer);
      try { ws.close(); } catch (_) {}
      if (m.result && m.result.exceptionDetails) {
        reject(new Error(String(m.result.exceptionDetails.text || 'eval error')));
      } else {
        resolve(m.result && m.result.result ? m.result.result.value : null);
      }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('WS 错误')); };
  });
}

const step = process.argv[2] === '-1' ? -1 : 1;

const CLICK_JS = `(async () => {
  const h = document.getElementById('we-root');
  if (!h || !h.__api) return 'no-ui';
  const sr = h.shadowRoot;
  const cards = [...sr.querySelectorAll('.card')];
  if (!cards.length) return 'no-cards';
  const curEl = sr.querySelector('#cur');
  const before = curEl ? curEl.textContent : '';
  let idx = cards.findIndex(c => c.classList.contains('current'));
  if (idx < 0) idx = 0;
  // 往后找第一张能真正切过去的（跳过"不支持"或点不动的）
  for (let n = 1; n <= cards.length; n++) {
    const nextIdx = ((idx + ${step} * n) % cards.length + cards.length) % cards.length;
    const next = cards[nextIdx];
    next.click();
    await new Promise(r => setTimeout(r, 700));
    const now = curEl ? curEl.textContent : '';
    if (now && now !== before) {
      return JSON.stringify({ name: (next.querySelector('.name') || {}).textContent || now, index: nextIdx, ok: true });
    }
  }
  return JSON.stringify({ name: before, ok: false });
})()`;

(async () => {
  let targets;
  try { targets = await list(); } catch (e) {
    console.error('M HUB 没开或没有调试端口:', e.message);
    process.exit(2);
  }
  const page = targets.find(t => t.type === 'page' && t.url.includes('mchose-renderer'));
  if (!page) { console.error('找不到 M HUB 页面'); process.exit(3); }

  let out = await evaluate(page.webSocketDebuggerUrl, CLICK_JS);
  if (out === 'no-ui') {
    // 界面没注入，先注入再点
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'inject-ui.js')], { windowsHide: true, stdio: 'ignore', timeout: 30000 });
    } catch (_) {}
    let t2 = await list();
    let p2 = t2.find(t => t.type === 'page' && t.url.includes('mchose-renderer'));
    out = await evaluate(p2.webSocketDebuggerUrl, CLICK_JS);
  }
  if (out === 'no-cards') { console.error('列表为空'); process.exit(4); }

  let name = '';
  try { name = JSON.parse(out).name; } catch (_) { name = String(out); }
  console.log(name);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
