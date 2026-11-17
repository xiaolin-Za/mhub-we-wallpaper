// 把 Wallpaper Engine 壁纸视频注入 M HUB 的 wallpaper-background 层
// 用法: node inject.js [壁纸文件名]
const fs = require('fs');
const path = require('path');

const CONFIG = path.join(__dirname, 'config.json');
const DEFAULT_VIDEO = 'wallpapers/dragon_1440p.mp4';
const PORT = 47821;

function loadConfig() {
  let cfg = { video: DEFAULT_VIDEO, muted: true, loop: true };
  try {
    cfg = { ...cfg, ...JSON.parse(fs.readFileSync(CONFIG, 'utf8')) };
  } catch (_) {}
  return cfg;
}

function cdpUrl() {
  return new Promise((resolve, reject) => {
    const req = require('http').get('http://127.0.0.1:9222/json/list', res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try {
          const page = JSON.parse(d).find(
            t => t.type === 'page' && t.url.includes('mchose-renderer')
          );
          if (!page) return reject(new Error('找不到 M HUB 页面'));
          resolve(page.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('CDP 连接超时')));
  });
}

function run(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true, awaitPromise: true },
        })
      );
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id === 1) {
        ws.close();
        if (m.result && m.result.exceptionDetails) {
          reject(new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 300)));
        } else {
          resolve(m.result && m.result.result ? m.result.result.value : undefined);
        }
      }
    };
    ws.onerror = () => reject(new Error('WS 错误'));
    setTimeout(() => reject(new Error('执行超时')), 15000);
  });
}

async function main() {
  const cfg = loadConfig();
  let url;
  const i = process.argv.indexOf('--url');
  if (i > -1 && process.argv[i + 1]) {
    url = process.argv[i + 1];
  } else {
    const file = process.argv[2] || cfg.video;
    url = `http://127.0.0.1:${PORT}/${file}?t=${Date.now()}`;
  }

  const wsUrl = await cdpUrl();

  const expr = `
(() => {
  const VIDEO_URL = ${JSON.stringify(url)};
  const apply = () => {
    const v = document.querySelector('video.wallpaper-background__media');
    if (!v) return 'no-video-element';
    if (v.dataset.weInjected === VIDEO_URL) return 'already';
    v.dataset.weInjected = VIDEO_URL;
    v.pause();
    v.removeAttribute('src');
    const s = document.createElement('source');
    s.src = VIDEO_URL;
    s.type = 'video/mp4';
    v.appendChild(s);
    v.loop = true;
    v.muted = true;
    v.autoplay = true;
    v.load();
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    // 去掉压暗蒙层，让画面亮起来
    const plane = document.querySelector('.wallpaper-background__plane');
    if (plane) plane.style.background = '#000';
    const bd = document.querySelector('.wallpaper-background__backdrop');
    if (bd) { bd.style.background = 'transparent'; bd.style.backdropFilter = 'none'; }
    return 'ok';
  };

  window.__weApply = apply;
  const first = apply();
  if (!window.__weWatch) {
    window.__weWatch = new MutationObserver(() => apply());
    window.__weWatch.observe(document.documentElement, { childList: true, subtree: true });
  }
  return JSON.stringify({ first, url: VIDEO_URL });
})()
`;

  const result = await run(wsUrl, expr);
  console.log('[inject]', result);
}

main().catch(e => {
  console.error('[inject] 失败:', e.message);
  process.exit(1);
});
