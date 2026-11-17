// 读取 Wallpaper Engine 当前壁纸，并注入到 M HUB
// 用法: node sync.js          单次
//       node sync.js --watch  持续跟随（每 3 秒检查）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WE_CONFIG = 'E:\\SteamLibrary\\steamapps\\common\\wallpaper_engine\\config.json';
const NODE = process.execPath;
const INJECT = path.join(__dirname, 'inject.js');
const PORT = 47821;
const LOG = path.join(__dirname, 'sync.log');

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('zh-CN')}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n', 'utf8'); } catch (_) {}
}

// 从 WE config 取 Main monitor 当前壁纸文件路径
function currentWallpaper() {
  try {
    const raw = fs.readFileSync(WE_CONFIG, 'utf8');
    const cfg = JSON.parse(raw);
    const user = Object.keys(cfg).find(k => !k.startsWith('?') && typeof cfg[k] === 'object');
    const wc = cfg[user]?.general?.wallpaperconfig;
    if (!wc || !wc.selectedwallpapers) return null;
    const entry = wc.selectedwallpapers['Monitor0'] || Object.values(wc.selectedwallpapers)[0];
    if (!entry) return null;
    return typeof entry === 'string' ? entry : entry.file;
  } catch (e) {
    return null;
  }
}

const FFMPEG = 'E:\\Deep-x\\bin\\ffmpeg.exe';
const CACHE = path.join(__dirname, 'cache');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

// 4K 大文件先转 1440p 缓存，避免 Electron 播放卡顿
function prepare(file) {
  try {
    const st = fs.statSync(file);
    if (st.size < 120 * 1024 * 1024) return file;   // 小文件直接用
    if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });
    const key = crypto.createHash('md5').update(file + st.size).digest('hex').slice(0, 12);
    const out = path.join(CACHE, key + '.mp4');
    if (fs.existsSync(out) && fs.statSync(out).size > 1024 * 1024) return out;
    log('转码缓存（首次较慢）: ' + path.basename(file));
    const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', file,
      '-vf', 'scale=2560:1440:flags=lanczos,setsar=1',
      '-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '23', '-b:v', '20M',
      '-maxrate', '28M', '-bufsize', '40M', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-an', '-movflags', '+faststart', out], { timeout: 600000, windowsHide: true });
    if (r.status === 0 && fs.existsSync(out)) return out;
    log('转码失败，直接用原文件');
    return file;
  } catch (e) {
    return file;
  }
}

function injectPath(file) {
  const src = prepare(file);
  const url = `http://127.0.0.1:${PORT}/f?p=${encodeURIComponent(src)}`;
  try {
    const out = execFileSync(NODE, [INJECT, '--url', url], { timeout: 20000, windowsHide: true }).toString().trim();
    return out;
  } catch (e) {
    return 'ERR ' + (e.message || '').slice(0, 120);
  }
}

function step() {
  const file = currentWallpaper();
  if (!file) { log('读不到 WE 当前壁纸'); return null; }
  const ext = path.extname(file).toLowerCase();
  if (!['.mp4', '.webm', '.m4v'].includes(ext)) {
    log(`当前是 scene 壁纸（${ext}），M HUB 只能播视频，跳过`);
    return file;
  }
  return file;
}

if (process.argv.includes('--watch')) {
  log('开始跟随 Wallpaper Engine');
  let last = '';
  setInterval(() => {
    const f = step();
    if (f && f !== last) {
      last = f;
      log('检测到变化: ' + path.basename(f));
      log('注入: ' + injectPath(f));
    }
  }, 3000);
} else {
  const f = step();
  if (f) log('注入: ' + injectPath(f));
}
