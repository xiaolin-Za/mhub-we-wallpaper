// 扫描 Wallpaper Engine 创意工坊 + 本地 projects，生成本地壁纸目录
const fs = require('fs');
const path = require('path');

const cfg = require('./lib/config').load();
const WORKSHOP = cfg.workshopRoot;
const LOCAL = cfg.projectsRoot || '';
const OUT = path.join(__dirname, 'catalog.json');

function readProject(dir) {
  const pj = path.join(dir, 'project.json');
  if (!fs.existsSync(pj)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
    const type = (j.type || '').toLowerCase();
    let video = null;
    let image = null;

    // 视频壁纸：取 file 字段
    if (j.file) {
      const f = path.join(dir, j.file);
      if (fs.existsSync(f)) video = f;
    }
    // 场景壁纸：用预览图当静态背景
    const prevName = j.preview || null;
    if (prevName) {
      const p = path.join(dir, prevName);
      if (fs.existsSync(p)) image = p;
    }
    if (!image) {
      for (const n of ['preview.jpg', 'preview.png', 'preview.gif']) {
        const p = path.join(dir, n);
        if (fs.existsSync(p)) { image = p; break; }
      }
    }

    let size = 0;
    try {
      const st = fs.statSync(dir);
      size = Math.round(st.size / 1024 / 1024);
    } catch (_) {}

    const cacheFile = path.join(__dirname, 'cache', 'scene_' + path.basename(dir) + '.mp4');
    const baked = !video && fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 300 * 1024;
  let pkgSize = 0;
  try {
    const pk = path.join(dir, 'scene.pkg');
    if (fs.existsSync(pk)) pkgSize = fs.statSync(pk).size;
  } catch (_) {}
  const renderable = !!video || pkgSize > 1024 * 1024 || baked;

    return {
      id: path.basename(dir),
      baked,
      title: j.title || path.basename(dir),
      type,
      video,
    renderable,
    pkgSize,
      image,
      tags: j.tags || [],
      size,
      workshop: dir.startsWith(WORKSHOP),
    };
  } catch (e) {
    return null;
  }
}

function scan(root, isWorkshop) {
  const out = [];
  if (!root || !fs.existsSync(root)) return out;
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name);
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
    } catch (_) { continue; }
    const item = readProject(dir);
    if (item) { item.workshop = isWorkshop; out.push(item); }
  }
  return out;
}

let hidden = [];
try { hidden = JSON.parse(fs.readFileSync(path.join(__dirname, 'hidden.json'), 'utf8')); } catch (_) { hidden = []; }
const all = [...scan(WORKSHOP, true), ...scan(LOCAL, false)];
const items = all.filter(x => !hidden.includes(x.id));
items.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));

fs.writeFileSync(OUT, JSON.stringify({ generated: Date.now(), items }, null, 1), 'utf8');
console.log(`catalog: ${items.length} 个壁纸（视频 ${items.filter(i => i.video).length}，场景 ${items.filter(i => !i.video).length}）`);
