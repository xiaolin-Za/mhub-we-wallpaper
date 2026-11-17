// 配置加载 + 自动探测（可移植：换机器后无需改代码）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config.json');

const DEFAULTS = {
  port: 47821,
  cdpPort: 9222,
  edgePath: '',
  ffmpegPath: '',
  mhubPath: '',
  mhubProcessName: 'MCHOSE HUB',
  workshopRoot: '',
  projectsRoot: '',
  bakeSeconds: 15,
  bakeFps: 24,
};

function exists(p) {
  try { return p && fs.existsSync(p); } catch (_) { return false; }
}

function regGet(key, name) {
  try {
    const out = execFileSync('reg', ['query', key, '/v', name], { windowsHide: true, stdio: 'pipe' }).toString();
    const m = out.match(new RegExp(name + '\\s+REG_\\w+\\s+(.+)'));
    return m ? m[1].trim() : '';
  } catch (_) { return ''; }
}

function findEdge() {
  const cands = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const appPath = regGet('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe', '');
  if (appPath && exists(appPath)) return appPath;
  const fromReg = regGet('HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe', '');
  if (fromReg && exists(fromReg)) return fromReg;
  for (const c of cands) if (exists(c)) return c;
  // Chrome 兜底（同样支持 --headless / CDP）
  for (const c of [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]) if (exists(c)) return c;
  return '';
}

function findFfmpeg() {
  const local = path.join(ROOT, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (exists(local)) return local;
  try {
    const out = execFileSync('where', ['ffmpeg'], { windowsHide: true, stdio: 'pipe' }).toString().split(/\r?\n/)[0].trim();
    if (out && exists(out)) return out;
  } catch (_) {}
  for (const c of ['E:\\Deep-x\\bin\\ffmpeg.exe', 'C:\\ffmpeg\\bin\\ffmpeg.exe']) if (exists(c)) return c;
  return '';
}

function findMHUB() {
  const keys = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  ];
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -EA SilentlyContinue | Where-Object { $_.DisplayName -like '*MCHOSE*' } | Select-Object -First 1 -ExpandProperty InstallLocation",
    ], { windowsHide: true, stdio: 'pipe' }).toString().trim();
    if (out) {
      for (const exe of ['MCHOSE HUB.exe', 'M HUB.exe', 'MCHOSE.exe']) {
        const p = path.join(out, exe);
        if (exists(p)) return p;
      }
    }
  } catch (_) {}
  for (const base of ['C:\\Program Files\\MCHOSE HUB', 'C:\\Program Files (x86)\\MCHOSE HUB', 'D:\\MCHOSE HUB']) {
    const p = path.join(base, 'MCHOSE HUB.exe');
    if (exists(p)) return p;
  }
  return '';
}

function findWorkshop() {
  const steamPath = regGet('HKCU\\Software\\Valve\\Steam', 'SteamPath') || '';
  const libs = [];
  if (steamPath) {
    libs.push(steamPath);
    const vdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    if (exists(vdf)) {
      const text = fs.readFileSync(vdf, 'utf8');
      const re = /"path"\s+"([^"]+)"/g;
      let m;
      while ((m = re.exec(text))) libs.push(m[1].replace(/\\\\/g, '\\'));
    }
  }
  let best = { workshopRoot: '', projectsRoot: '', count: -1 };
  for (const root of libs) {
    const ws = path.join(root, 'steamapps', 'workshop', 'content', '431960');
    if (!exists(ws)) continue;
    let count = 0;
    try { count = fs.readdirSync(ws).filter(n => { try { return fs.statSync(path.join(ws, n)).isDirectory(); } catch (_) { return false; } }).length; } catch (_) {}
    if (count > best.count) {
      const projects = path.join(root, 'steamapps', 'common', 'wallpaper_engine', 'projects');
      best = { workshopRoot: ws, projectsRoot: exists(projects) ? projects : '', count };
    }
  }
  return best;
}

function load() {
  let cfg = { ...DEFAULTS };
  if (exists(CONFIG_PATH)) {
    try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch (_) {}
  }

  let changed = false;
  const fill = (key, fn) => {
    const val = fn();
    if (!cfg[key] && val) { cfg[key] = val; changed = true; }
  };

  fill('edgePath', findEdge);
  fill('ffmpegPath', findFfmpeg);
  fill('mhubPath', findMHUB);
  if (!cfg.workshopRoot) {
    const ws = findWorkshop();
    if (ws.workshopRoot) {
      cfg.workshopRoot = ws.workshopRoot;
      cfg.projectsRoot = ws.projectsRoot;
      changed = true;
    }
  }

  cfg.root = ROOT;
  if (changed || !exists(CONFIG_PATH)) {
    try { fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...cfg, root: undefined }, null, 2), 'utf8'); } catch (_) {}
  }
  return cfg;
}

module.exports = { load, CONFIG_PATH, ROOT, exists };
