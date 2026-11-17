(async () => {
  const BASE = window.__WE_BASE;
  const CATALOG = window.__WE_CATALOG;
  if (!BASE) return 'no-base';

  const VER = '2.10.1';
  const existed = document.getElementById('we-root');
  if (existed && existed.__api && existed.__ver === VER) { return 'ui-exists'; }
  if (existed) existed.remove();

  // ---------------- CSS ----------------
  const CSS = `
    * { box-sizing: border-box; }
    .wrap {
      position: fixed; inset: 0; pointer-events: none; z-index: 2147483000;
      font: 13px/1.45 "MiSans","Microsoft YaHei UI","Segoe UI",sans-serif;
      color: #e8eaf0; -webkit-font-smoothing: antialiased;
    }
    .fab {
      position: fixed; right: 26px; bottom: 26px; width: 56px; height: 56px;
      border-radius: 17px; pointer-events: auto; cursor: pointer;
      background: linear-gradient(145deg, rgba(58,132,247,.96), rgba(29,78,216,.96));
      box-shadow: 0 12px 30px rgba(20,70,170,.45), inset 0 1px 0 rgba(255,255,255,.25);
      display: grid; place-items: center; color: #fff; font-size: 21px;
      transition: transform .22s cubic-bezier(.2,.9,.25,1), box-shadow .22s; user-select: none;
    }
    .fab:hover { transform: translateY(-2px) scale(1.04); }
    .fab:active { transform: scale(.96); }

    .panel {
      position: fixed; right: 26px; bottom: 94px; width: 920px; height: 620px;
      max-height: calc(100vh - 128px); pointer-events: auto;
      background: rgba(16,17,21,.97); backdrop-filter: blur(30px) saturate(1.15);
      border: 1px solid rgba(255,255,255,.09); border-radius: 22px;
      box-shadow: 0 34px 80px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.06);
      display: flex; flex-direction: column; overflow: hidden; transform-origin: 92% 100%;
      opacity: 0; transform: translateY(14px) scale(.97); visibility: hidden;
      transition: opacity .22s cubic-bezier(.2,.9,.25,1), transform .22s cubic-bezier(.2,.9,.25,1), visibility .22s;
    }
    .panel.open { opacity: 1; transform: none; visibility: visible; }

    header { display: flex; align-items: center; gap: 10px; padding: 13px 15px 11px;
             border-bottom: 1px solid rgba(255,255,255,.07); }
    .brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .logo { width: 27px; height: 27px; border-radius: 8px; display: grid; place-items: center;
            background: linear-gradient(145deg,#3b82f6,#1d4ed8); font-size: 13px; color: #fff;
            box-shadow: 0 4px 12px rgba(37,99,235,.45); flex: none; }
    .title { font-size: 13px; font-weight: 650; }
    .sub { font-size: 10.5px; color: #8b93a3; margin-top: 1px; max-width: 210px;
           overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .grow { flex: 1; }
    .search { display: flex; align-items: center; gap: 6px; padding: 7px 10px;
              background: rgba(255,255,255,.06); border: 1px solid transparent; border-radius: 11px;
              transition: border-color .18s, background .18s; }
    .search:focus-within { border-color: rgba(59,130,246,.55); background: rgba(59,130,246,.1); }
    .search input { width: 140px; background: none; border: 0; outline: 0; color: #e8eaf0; font-size: 12px; }
    .search input::placeholder { color: #6d7585; }
    .chips { display: flex; gap: 4px; background: rgba(255,255,255,.05); padding: 3px; border-radius: 10px; }
    .chip { border: 0; background: none; color: #99a1b3; font-size: 11.5px; padding: 5px 10px;
            border-radius: 8px; cursor: pointer; transition: all .16s; }
    .chip:hover { color: #dfe4ee; }
    .chip.on { background: rgba(59,130,246,.92); color: #fff; box-shadow: 0 3px 10px rgba(37,99,235,.4); }
    .icon-btn { width: 30px; height: 30px; border-radius: 9px; border: 0; cursor: pointer;
                background: rgba(255,255,255,.06); color: #c8cede; display: grid; place-items: center;
                font-size: 14px; transition: background .16s, transform .16s, color .16s; }
    .icon-btn:hover { background: rgba(255,255,255,.13); color: #fff; }
    .icon-btn:active { transform: scale(.94); }

    .body { flex: 1; display: flex; min-height: 0; }
    .left { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .toolbar { display: flex; align-items: center; gap: 8px; padding: 9px 15px 7px; font-size: 11.5px; color: #8b93a3; }
    .sel { background: #24262e; color: #cfd5e2; border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
           padding: 5px 8px; font-size: 11.5px; outline: none; cursor: pointer; }

    .grid { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 2px 15px 16px;
            display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px;
            align-content: start; grid-auto-rows: min-content; scroll-behavior: smooth; }
    .grid::-webkit-scrollbar { width: 9px; }
    .grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 9px; }
    .grid::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.24); }

    .card { position: relative; border-radius: 14px; overflow: hidden; cursor: pointer; min-height: 172px;
            background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.05);
            transition: transform .18s cubic-bezier(.2,.9,.25,1), border-color .18s, box-shadow .18s; }
    .card:hover { transform: translateY(-3px); border-color: rgba(120,170,255,.5); box-shadow: 0 12px 26px rgba(0,0,0,.4); }
    .card.current { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6, 0 10px 24px rgba(37,99,235,.32); }
    .thumb-wrap { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #15171c; }
    .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0;
                      transition: transform .35s cubic-bezier(.2,.9,.25,1), opacity .3s; }
    .thumb-wrap img.loaded { opacity: 1; }
    .card:hover .thumb-wrap img { transform: scale(1.04); }
    .meta { padding: 8px 10px 10px; }
    .name { font-size: 11.5px; line-height: 1.35; height: 31px; overflow: hidden; color: #dfe4ee; word-break: break-word; }
    .tags { display: flex; gap: 5px; margin-top: 6px; }
    .tag { font-size: 10px; padding: 1.5px 6px; border-radius: 5px; color: #9fc3ff; background: rgba(59,130,246,.16); }
    .tag.video { color: #7ee2b8; background: rgba(16,185,129,.15); }
    .tag.bad { color: #ff9b9b; background: rgba(220,38,38,.15); }
    .del {
      position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 8px;
      background: rgba(12,13,17,.72); color: #ff8b8b; border: 1px solid rgba(255,255,255,.12);
      display: grid; place-items: center; font-size: 13px; cursor: pointer; opacity: .9; z-index: 3;
      transition: opacity .16s, background .16s, transform .16s; backdrop-filter: blur(6px);
    }
    .card:hover .del { opacity: 1; background: rgba(220,38,38,.85); color: #fff; }
    .del:hover { background: rgba(220,38,38,.85); color: #fff; transform: scale(1.06); }
    .badge-cur { position: absolute; top: 7px; left: 7px; font-size: 10px; padding: 2px 7px; border-radius: 6px;
                 background: rgba(59,130,246,.92); color: #fff; box-shadow: 0 3px 10px rgba(37,99,235,.45); }
    .ov { position: absolute; inset: 0; background: rgba(8,9,12,.55); backdrop-filter: blur(2px);
          display: grid; place-items: center; gap: 8px; color: #dfe4ee; font-size: 11.5px;
          opacity: 0; transition: opacity .18s; pointer-events: none; }
    .card.busy .ov { opacity: 1; pointer-events: auto; }
    .spinner { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,.22);
               border-top-color: #5ea1ff; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .skeleton { border-radius: 14px; height: 148px; background: linear-gradient(100deg,#1b1d23 30%,#22252d 50%,#1b1d23 70%);
                background-size: 220% 100%; animation: sh 1.3s ease-in-out infinite; }
    @keyframes sh { from { background-position: 140% 0; } to { background-position: -40% 0; } }
    .empty { grid-column: 1/-1; text-align: center; color: #6f7787; font-size: 12px; padding: 36px 0; }

    .side { width: 0; overflow: hidden; display: flex; flex-direction: column; background: rgba(13,14,18,.97);
            border-left: 1px solid rgba(255,255,255,0); transition: width .24s cubic-bezier(.2,.9,.25,1), border-color .24s; }
    .side.open { width: 328px; border-color: rgba(255,255,255,.07); }
    .side-inner { width: 328px; flex: 1; overflow-y: auto; padding: 13px 15px 18px; }
    .side-inner::-webkit-scrollbar { width: 8px; }
    .side-inner::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); border-radius: 8px; }
    .sec { margin-bottom: 15px; }
    .sec h4 { font-size: 10.5px; font-weight: 600; letter-spacing: .1em; color: #7f9ad6;
              text-transform: uppercase; margin: 0 0 9px; }
    .field { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
    .field label { width: 70px; flex: none; font-size: 11.5px; color: #b3bbcc;
                   overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .field input[type=range] { -webkit-appearance: none; height: 3px; flex: 1; border-radius: 3px; outline: none;
      background: linear-gradient(90deg,#3b82f6 var(--p,50%), rgba(255,255,255,.14) var(--p,50%)); }
    .field input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%;
      background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.45); cursor: pointer; }
    .field .val { width: 42px; text-align: right; font-size: 11px; color: #6ea8ff; font-variant-numeric: tabular-nums; }
    .field select, .field input[type=text], .field input[type=color] {
      flex: 1; min-width: 0; background: #24262e; color: #eef1f7;
      border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 6px 8px; font-size: 11.5px; outline: none; }
    .field select:focus, .field input[type=text]:focus { border-color: rgba(59,130,246,.55); }
    .field input[type=color] { padding: 2px; height: 28px; cursor: pointer; }
    .field input[type=checkbox] { width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer; }
    .btns { display: flex; gap: 8px; margin-top: 10px; }
    .btn { flex: 1; padding: 8px 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,.09);
           background: rgba(255,255,255,.06); color: #cfd5e2; font-size: 11.5px; cursor: pointer;
           transition: background .16s, transform .16s; }
    .btn:hover { background: rgba(255,255,255,.12); }
    .btn:active { transform: scale(.98); }

    footer { display: flex; align-items: center; gap: 10px; padding: 8px 15px;
             border-top: 1px solid rgba(255,255,255,.07); font-size: 11px; color: #7d8595; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,.8); }
    .dot.busy { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,.8); }
    .toast { position: fixed; left: 50%; top: 22px; transform: translate(-50%,-8px);
             background: rgba(20,21,26,.95); border: 1px solid rgba(255,255,255,.1); color: #e8eaf0;
             padding: 9px 16px; border-radius: 11px; font-size: 12px; pointer-events: none; opacity: 0;
             transition: opacity .2s, transform .2s; box-shadow: 0 12px 30px rgba(0,0,0,.5);
             max-width: 62vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .toast.show { opacity: 1; transform: translate(-50%,0); }
  `;

  // ---------------- DOM ----------------
  const host = document.createElement('div');
  host.id = 'we-root';
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  root.appendChild(styleEl);

  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = `
    <div class="fab" title="壁纸 (Ctrl+Alt+W)">◧</div>
    <div class="panel">
      <header>
        <div class="brand">
          <div class="logo">◨</div>
          <div><div class="title">壁纸</div><div class="sub" id="cur">未应用</div></div>
        </div>
        <div class="grow"></div>
        <div class="search"><span style="color:#6d7585">⌕</span><input id="q" placeholder="搜索…"></div>
        <div class="chips">
          <button class="chip on" data-f="all">全部</button>
          <button class="chip" data-f="video">视频</button>
          <button class="chip" data-f="scene">场景</button>
        </div>
        <button class="icon-btn" id="refresh" title="重新扫描">⟳</button>
        <button class="icon-btn" id="gear" title="画面设置">⚙</button>
        <button class="icon-btn" id="close" title="关闭">✕</button>
      </header>
      <div class="body">
        <div class="left">
          <div class="toolbar">
            <span id="count">—</span><div class="grow"></div>
            <select class="sel" id="sort">
              <option value="name">按名称</option>
              <option value="new">按添加时间</option>
              <option value="type">按类型</option>
            </select>
          </div>
          <div class="grid" id="grid"></div>
        </div>
        <aside class="side" id="side">
          <div class="side-inner">
            <div class="sec">
              <h4>性能</h4>
              <div class="field"><label>画质</label>
                <select id="pPreset">
                  <option value="ultra">极高（WE 默认）</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低（省电）</option>
                  <option value="minimal">极低（最省）</option>
                </select>
              </div>
              <div class="field"><label>抗锯齿</label>
                <select id="pAA">
                  <option value="off">关</option>
                  <option value="fxaa">FXAA</option>
                  <option value="msaa2">MSAA 2x</option>
                  <option value="msaa4">MSAA 4x</option>
                </select>
              </div>
              <div class="field"><label>粒子</label>
                <select id="pParticles">
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                  <option value="off">关</option>
                </select>
              </div>
              <div class="field"><label>后处理</label>
                <select id="pPost">
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                  <option value="off">关</option>
                </select>
              </div>
              <div class="field"><label>帧率上限</label>
                <select id="pFps">
                  <option value="0">不限</option>
                  <option value="30">30</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                  <option value="120">120</option>
                </select>
              </div>
              <div class="field"><label>自动降档</label><input type="checkbox" id="pAuto" checked></div>
              <div class="field"><label>视频纹理</label>
                <select id="pTex">
                  <option value="0">自动</option>
                  <option value="1">原始（清晰）</option>
                  <option value="0.5">半分辨率（省）</option>
                </select>
              </div>
            </div>
            <div class="sec">
              <h4>画面</h4>
              <div class="field"><label>填充</label>
                <select id="fit">
                  <option value="cover">铺满裁剪</option>
                  <option value="contain">完整显示</option>
                  <option value="fill">拉伸</option>
                </select>
              </div>
              <div class="field"><label>缩放</label><input type="range" id="zoom" min="50" max="200" step="1" value="100"><span class="val" id="zoomV">100%</span></div>
              <div class="field"><label>水平</label><input type="range" id="posx" min="-50" max="50" step="1" value="0"><span class="val" id="posxV">0</span></div>
              <div class="field"><label>垂直</label><input type="range" id="posy" min="-50" max="50" step="1" value="0"><span class="val" id="posyV">0</span></div>
            </div>
            <div class="sec">
              <h4>色彩</h4>
              <div class="field"><label>亮度</label><input type="range" id="bri" min="20" max="180" step="1" value="100"><span class="val" id="briV">100</span></div>
              <div class="field"><label>对比度</label><input type="range" id="con" min="20" max="180" step="1" value="100"><span class="val" id="conV">100</span></div>
              <div class="field"><label>饱和度</label><input type="range" id="sat" min="0" max="200" step="1" value="100"><span class="val" id="satV">100</span></div>
              <div class="field"><label>色相</label><input type="range" id="hue" min="-180" max="180" step="1" value="0"><span class="val" id="hueV">0</span></div>
              <div class="field"><label>模糊</label><input type="range" id="blur" min="0" max="30" step="0.5" value="0"><span class="val" id="blurV">0</span></div>
              <div class="field"><label>暗化</label><input type="range" id="dim" min="0" max="80" step="1" value="0"><span class="val" id="dimV">0</span></div>
            </div>
            <div class="sec">
              <h4>播放</h4>
              <div class="field"><label>速度</label>
                <select id="rate">
                  <option value="0.25">0.25×</option><option value="0.5">0.5×</option>
                  <option value="0.75">0.75×</option><option value="1" selected>1×</option>
                  <option value="1.25">1.25×</option><option value="1.5">1.5×</option>
                  <option value="2">2×</option>
                </select>
              </div>
              <div class="field"><label>静音</label><input type="checkbox" id="mute" checked></div>
              <div class="field"><label>启动恢复</label><input type="checkbox" id="autoRestore" checked></div>
              <div class="field"><label>后台时</label>
                <select id="bgmode">
                  <option value="release">释放内存（省资源）</option>
                  <option value="continue">继续播放</option>
                </select>
              </div>
              <div class="field"><label>已隐藏</label><span id="hiddenCnt" style="color:#8b93a3;font-size:11.5px">0 个</span>
                <button class="btn" id="unhide" style="flex:none;padding:5px 10px">恢复</button>
              </div>
            </div>
            <div class="sec" id="propsSec" style="display:none">
              <h4>壁纸参数</h4>
              <div id="props"></div>
            </div>
            <div class="btns">
              <button class="btn" id="resetAdj">重置画面</button>
              <button class="btn" id="resetProps">重置参数</button>
            </div>
          </div>
        </aside>
      </div>
      <footer>
        <span class="dot" id="dot"></span><span id="status">就绪</span>
        <div class="grow"></div><span id="fps"></span>
      </footer>
    </div>
    <div class="toast" id="toast"></div>
  `;
  root.appendChild(wrap);

  const $ = s => wrap.querySelector(s);
  const panel = $('.panel');
  const grid = $('#grid');
  const side = $('#side');

  // ---------------- state ----------------
  let items = [];
  let currentId = null;
  let filterType = 'all';
  let sortBy = 'name';
  let kw = '';
  let desiredSrc = '';
  let suspended = false;
  let applying = false;

  const PERF_KEY = 'mchose-we-perf-v1';
  const PERF_PRESETS = {
    ultra:   { antiAliasing: 'off', particles: 'high',   postProcessing: 'high', autoQuality: true },
    high:    { antiAliasing: 'off', particles: 'high',   postProcessing: 'medium', autoQuality: true },
    medium:  { antiAliasing: 'off', particles: 'medium', postProcessing: 'low', autoQuality: true },
    low:     { antiAliasing: 'fxaa', particles: 'low',   postProcessing: 'off', autoQuality: true },
    minimal: { antiAliasing: 'off', particles: 'off',    postProcessing: 'off', autoQuality: false },
  };
  let perf = { preset: 'ultra', aa: 'off', particles: 'high', post: 'high', fps: 0, auto: true, tex: 0 };
  try { perf = { ...perf, ...(JSON.parse(localStorage.getItem(PERF_KEY) || '{}')) }; } catch (_) {}

  const ADJ_KEY = 'mchose-we-adjust-v3';
  const PROPS_KEY = 'mchose-we-props';
  const CUR_KEY = 'mchose-we-current';
  const defaults = { fit: 'cover', rate: '1', mute: true, bgMode: 'release',
    bri: 100, con: 100, sat: 100, hue: 0, blur: 0, dim: 0, zoom: 100, posx: 0, posy: 0 };
  let adjStore = {}, propsStore = {}, adj = { ...defaults }, schema = {}, props = {};
  try { adjStore = JSON.parse(localStorage.getItem(ADJ_KEY) || '{}'); } catch (_) {}
  try { propsStore = JSON.parse(localStorage.getItem(PROPS_KEY) || '{}'); } catch (_) {}

  const toastEl = $('#toast');
  let toastTimer = null;
  const say = t => {
    toastEl.textContent = t;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  };
  const setStatus = (t, busy) => { $('#status').textContent = t; $('#dot').classList.toggle('busy', !!busy); };

  // ---------------- layers ----------------
  async function ensureLib() {
    if (window.WebWallGL && window.WebWallGL.mount) return true;
    if (window.__weLib) return window.__weLib;
    window.__weLib = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = BASE + '/vendor/webwallgl/webwallgl.global.min.js';
      s.onload = () => resolve(!!(window.WebWallGL && window.WebWallGL.mount));
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(false), 15000);
    });
    return window.__weLib;
  }

  function videoEl() {
    let v = document.getElementById('we-video');
    if (v) return v;
    const orig = document.querySelector('video.wallpaper-background__media');
    v = document.createElement('video');
    v.id = 'we-video';
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;background:#000;';
    const parent = orig && orig.parentElement ? orig.parentElement : document.body;
    parent.appendChild(v);
    if (orig) orig.style.visibility = 'hidden';
    return v;
  }

  function newBox() {
    document.querySelectorAll('.we-live').forEach(n => { try { n.remove(); } catch (_) {} });
    const b = document.createElement('div');
    b.className = 'we-live';
    b.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;background:#000;display:none;';
    b.dataset.mounting = '1';
    document.body.insertBefore(b, document.body.firstChild);
    return b;
  }

  async function applyLive(item) {
    if (!(await ensureLib())) return false;
    setStatus('渲染中…', true);
    const next = newBox();
    window.__weMountT0 = performance.now();
    try {
      const wp = await Promise.race([
        window.WebWallGL.mount(next, {
          source: window.WebWallGL.httpSource(BASE + '/wp/' + item.id + '/'),
          volume: 0,
          quality: { antiAliasing: perf.aa, particles: perf.particles, postProcessing: perf.post },
          autoQuality: !!perf.auto,
          fps: perf.fps || undefined,
          videoTexScale: perf.tex || undefined,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('渲染超时')), 35000)),
      ]);
      if (!next.isConnected) {
        try { if (wp && wp.destroy) wp.destroy(); } catch (_) {}
        return false;
      }
      if (!next.querySelector('canvas')) {
        try { if (wp && wp.destroy) wp.destroy(); } catch (_) {}
        window.__weLastErr = 'mount-resolved-but-no-canvas child=' + next.children.length;
        throw new Error('没有生成画布');
      }
      try { if (window.__wp && window.__wp.destroy) window.__wp.destroy(); } catch (_) {}
      document.querySelectorAll('.we-live').forEach(n => { if (n !== next) n.remove(); });
      delete next.dataset.mounting;
      next.style.display = 'block';
      window.__wp = wp;
      const vv = document.getElementById('we-video');
      if (vv) { try { vv.pause(); } catch (_) {} vv.style.display = 'none'; }
      const bg = document.querySelector('.wallpaper-background');
      if (bg) bg.style.display = 'none';
      applyAdjustToLayers();
      setStatus('实时渲染 · ' + String(item.title || '').slice(0, 16), false);
      window.__weUsedLive = true;
      return true;
    } catch (e) {
      window.__weLastErr = String(e && e.message || e) + ' | ms=' + Math.round(performance.now() - window.__weMountT0);
      try { next.remove(); } catch (_) {}
      setStatus('渲染失败：' + (e && e.message ? e.message : '未知'), false);
      return false;
    }
  }

  function stopLive() {
    try { if (window.__wp && window.__wp.destroy) window.__wp.destroy(); } catch (_) {}
    window.__wp = null;
    document.querySelectorAll('.we-live').forEach(n => n.remove());
  }

  function playVideo(src, label) {
    stopLive();
    const bg = document.querySelector('.wallpaper-background');
    if (bg) bg.style.display = 'flex';
    const v = videoEl();
    v.style.display = 'block';
    v.style.visibility = 'visible';
    if (v.dataset.src !== src || v.error) {
      v.dataset.src = src;
      v.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
      v.load();
    }
    desiredSrc = src;
    suspended = false;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    setTimeout(() => { if (v.paused) { const q = v.play(); if (q && q.catch) q.catch(() => {}); } }, 350);
    applyAdjustToLayers();
    if (label) setStatus('视频 · ' + String(label).slice(0, 16), false);
    window.__weUsedLive = false;
  }

  // ---------------- adjust ----------------
  const fstr = () => 'brightness(' + adj.bri + '%) contrast(' + adj.con + '%) saturate(' + adj.sat + '%) '
    + 'hue-rotate(' + adj.hue + 'deg) blur(' + adj.blur + 'px)';
  const tstr = () => 'translate(' + adj.posx + '%, ' + adj.posy + '%) scale(' + (adj.zoom / 100) + ')';
  function dimLayer() {
    let d = document.getElementById('we-dim');
    if (!d) {
      d = document.createElement('div');
      d.id = 'we-dim';
      d.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;background:#000;transition:opacity .18s;';
      document.body.appendChild(d);
    }
    d.style.opacity = String(adj.dim / 100);
  }
  function applyAdjustToLayers() {
    const f = fstr(), t = tstr();
    document.querySelectorAll('.we-live').forEach(n => {
      n.style.filter = f; n.style.transform = t; n.style.transformOrigin = 'center center';
    });
    const v = document.getElementById('we-video');
    if (v) { v.style.filter = f; v.style.transform = t; v.style.transformOrigin = 'center center'; v.style.objectFit = adj.fit; v.style.muted = adj.mute; try { v.playbackRate = parseFloat(adj.rate); } catch (_) {} }
    dimLayer();
  }
  function saveAdj() {
    adjStore[currentId || 'default'] = { ...adj };
    try { localStorage.setItem(ADJ_KEY, JSON.stringify(adjStore)); } catch (_) {}
    applyAdjustToLayers();
  }
  function loadAdj(id) {
    adj = { ...defaults, ...(adjStore[id || 'default'] || {}) };
    syncAdjUI();
    applyAdjustToLayers();
  }
  const ADJ_KEYS = { zoom: '%', posx: '', posy: '', bri: '', con: '', sat: '', hue: '', blur: '', dim: '' };
  function syncAdjUI() {
    $('#fit').value = adj.fit;
    $('#rate').value = adj.rate;
    $('#mute').checked = !!adj.mute;
    if ($('#bgmode')) $('#bgmode').value = adj.bgMode || 'release';
    Object.keys(ADJ_KEYS).forEach(k => {
      const inp = $('#' + k);
      if (!inp) return;
      inp.value = adj[k];
      const out = $('#' + k + 'V');
      if (out) out.textContent = adj[k] + ADJ_KEYS[k];
      const pct = ((adj[k] - inp.min) / (inp.max - inp.min)) * 100;
      inp.style.setProperty('--p', pct + '%');
    });
  }
  Object.keys(ADJ_KEYS).forEach(k => {
    const inp = $('#' + k);
    if (!inp) return;
    inp.addEventListener('input', () => {
      adj[k] = parseFloat(inp.value);
      const out = $('#' + k + 'V');
      if (out) out.textContent = adj[k] + ADJ_KEYS[k];
      const pct = ((adj[k] - inp.min) / (inp.max - inp.min)) * 100;
      inp.style.setProperty('--p', pct + '%');
      applyAdjustToLayers();
    });
    inp.addEventListener('change', saveAdj);
  });
  $('#fit').onchange = e => { adj.fit = e.target.value; saveAdj(); };
  $('#rate').onchange = e => { adj.rate = e.target.value; saveAdj(); };
  $('#mute').onchange = e => { adj.mute = e.target.checked; saveAdj(); };
  const bgSel = $('#bgmode');
  if (bgSel) bgSel.onchange = e => { adj.bgMode = e.target.value; saveAdj(); };
  $('#resetAdj').onclick = () => {
    delete adjStore[currentId || 'default'];
    try { localStorage.setItem(ADJ_KEY, JSON.stringify(adjStore)); } catch (_) {}
    adj = { ...defaults };
    syncAdjUI();
    applyAdjustToLayers();
    say('画面已重置');
  };

  // ---------------- performance ----------------
  function savePerf() {
    try { localStorage.setItem(PERF_KEY, JSON.stringify(perf)); } catch (_) {}
  }
  function syncPerfUI() {
    if ($('#pPreset')) $('#pPreset').value = perf.preset;
    if ($('#pAA')) $('#pAA').value = perf.aa;
    if ($('#pParticles')) $('#pParticles').value = perf.particles;
    if ($('#pPost')) $('#pPost').value = perf.post;
    if ($('#pFps')) $('#pFps').value = String(perf.fps || 0);
    if ($('#pAuto')) $('#pAuto').checked = !!perf.auto;
    if ($('#pTex')) $('#pTex').value = String(perf.tex || 0);
  }
  function applyPerfHot() {
    const wp = window.__wp;
    if (wp && wp.setQuality) {
      try { wp.setQuality({ antiAliasing: perf.aa, particles: perf.particles, postProcessing: perf.post }); } catch (_) {}
    }
    if (wp && wp.setVideoTexScale) {
      try { wp.setVideoTexScale(perf.tex || 0); } catch (_) {}
    }
  }
  function remountCurrent() {
    if (!currentId) return;
    const item = items.find(x => x.id === currentId);
    if (!item || item.video) return;
    applyLive(item).then(ok => { if (ok) { loadProps(item.id); } }).catch(() => {});
  }
  if ($('#pPreset')) {
    $('#pPreset').onchange = e => {
      perf.preset = e.target.value;
      const p = PERF_PRESETS[perf.preset];
      if (p) {
        perf.aa = p.antiAliasing; perf.particles = p.particles;
        perf.post = p.postProcessing; perf.auto = p.autoQuality;
      }
      syncPerfUI(); savePerf(); remountCurrent();
      say('画质：' + e.target.options[e.target.selectedIndex].text + '（重新挂载中）');
    };
    $('#pAA').onchange = e => { perf.aa = e.target.value; perf.preset = 'custom'; syncPerfUI(); savePerf(); applyPerfHot(); };
    $('#pParticles').onchange = e => { perf.particles = e.target.value; perf.preset = 'custom'; syncPerfUI(); savePerf(); applyPerfHot(); };
    $('#pPost').onchange = e => { perf.post = e.target.value; perf.preset = 'custom'; syncPerfUI(); savePerf(); applyPerfHot(); };
    $('#pFps').onchange = e => { perf.fps = Number(e.target.value) || 0; savePerf(); remountCurrent(); say('帧率上限：' + (perf.fps ? perf.fps : '不限')); };
    $('#pAuto').onchange = e => { perf.auto = e.target.checked; savePerf(); remountCurrent(); };
    $('#pTex').onchange = e => { perf.tex = Number(e.target.value) || 0; savePerf(); applyPerfHot(); };
    syncPerfUI();
  }

  // ---------------- props ----------------
  const toHex = s => {
    const p = String(s || '1 1 1').trim().split(/\s+/).map(Number);
    const f = v => Math.max(0, Math.min(255, Math.round((isFinite(v) ? v : 0) * 255)));
    return '#' + [f(p[0]), f(p[1]), f(p[2])].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  const fromHex = h => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3)).join(' ');
  };
  const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  function defVal(def) {
    if (!def) return '';
    if (def.value !== undefined) return def.value;
    if (def.type === 'color') return '1 1 1';
    if (def.type === 'slider') return def.min !== undefined ? def.min : 0;
    if (def.type === 'combo' && def.options && def.options.length) {
      const o = def.options[0];
      return Array.isArray(o) ? o[0] : o;
    }
    if (def.type === 'bool') return true;
    return '';
  }
  function pushProps() {
    if (window.__wp && window.__wp.setProperties) {
      try { window.__wp.setProperties(props); } catch (_) {}
    }
  }
  function saveProps() {
    if (!currentId) return;
    propsStore[currentId] = { ...props };
    try { localStorage.setItem(PROPS_KEY, JSON.stringify(propsStore)); } catch (_) {}
  }
  function renderProps() {
    const sec = $('#propsSec'), box = $('#props');
    const keys = Object.keys(schema || {});
    if (!keys.length) { sec.style.display = 'none'; box.innerHTML = ''; return; }
    sec.style.display = 'block';
    const rows = keys.map(k => ({ k, def: schema[k] }))
      .filter(x => x.def && x.def.order !== undefined)
      .sort((a, b) => (a.def.order || 0) - (b.def.order || 0));
    box.innerHTML = rows.map(({ k, def }) => {
      const label = (strip(def.text || k) || k).slice(0, 26);
      const v = props[k] !== undefined ? props[k] : defVal(def);
      if (def.type === 'color') {
        return '<div class="field"><label title="' + label + '">' + label + '</label>'
          + '<input type="color" data-pk="' + k + '" value="' + toHex(v) + '"></div>';
      }
      if (def.type === 'slider') {
        const min = def.min !== undefined ? def.min : 0;
        const max = def.max !== undefined ? def.max : 100;
        const step = def.step || (def.fraction ? 0.01 : 1);
        const pct = ((v - min) / (max - min)) * 100;
        return '<div class="field"><label title="' + label + '">' + label + '</label>'
          + '<input type="range" data-pk="' + k + '" min="' + min + '" max="' + max + '" step="' + step
          + '" value="' + v + '" style="--p:' + pct + '%">'
          + '<span class="val" data-pv="' + k + '">' + v + '</span></div>';
      }
      if (def.type === 'bool') {
        const on = (v === true || v === 'true' || v === 1);
        return '<div class="field"><label title="' + label + '">' + label + '</label>'
          + '<input type="checkbox" data-pk="' + k + '"' + (on ? ' checked' : '') + '></div>';
      }
      if (def.type === 'combo') {
        const opts = (def.options || []).map(o => {
          const val = Array.isArray(o) ? o[0] : o;
          const txt = strip(Array.isArray(o) ? o[1] : o);
          return '<option value="' + val + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + txt + '</option>';
        }).join('');
        return '<div class="field"><label title="' + label + '">' + label + '</label>'
          + '<select data-pk="' + k + '">' + opts + '</select></div>';
      }
      return '<div class="field"><label title="' + label + '">' + label + '</label>'
        + '<input type="text" data-pk="' + k + '" value="' + String(v).replace(/"/g, '&quot;') + '"></div>';
    }).join('');

    box.querySelectorAll('[data-pk]').forEach(inp => {
      const k = inp.dataset.pk, def = schema[k];
      const handler = () => {
        let v;
        if (def.type === 'color') v = fromHex(inp.value);
        else if (def.type === 'bool') v = inp.checked;
        else if (def.type === 'slider') v = parseFloat(inp.value);
        else v = inp.value;
        props[k] = v;
        const out = box.querySelector('[data-pv="' + k + '"]');
        if (out) out.textContent = v;
        if (inp.type === 'range') {
          const pct = ((v - inp.min) / (inp.max - inp.min)) * 100;
          inp.style.setProperty('--p', pct + '%');
        }
        pushProps();
        saveProps();
      };
      inp.addEventListener('input', handler);
      inp.addEventListener('change', handler);
    });
  }
  async function loadProps(id) {
    schema = {}; props = {};
    try {
      const r = await fetch(BASE + '/props?id=' + encodeURIComponent(id) + '&t=' + Date.now());
      const j = await r.json();
      schema = j.schema || {};
      const saved = propsStore[id] || {};
      for (const k of Object.keys(schema)) props[k] = saved[k] !== undefined ? saved[k] : defVal(schema[k]);
    } catch (_) {}
    renderProps();
    pushProps();
  }
  $('#resetProps').onclick = () => {
    if (!currentId) return;
    delete propsStore[currentId];
    try { localStorage.setItem(PROPS_KEY, JSON.stringify(propsStore)); } catch (_) {}
    for (const k of Object.keys(schema)) props[k] = defVal(schema[k]);
    renderProps();
    pushProps();
    say('壁纸参数已重置');
  };

  // ---------------- catalog ----------------
  const urlFor = p => BASE + '/f?p=' + encodeURIComponent(p);

  function filtered() {
    let list = items.slice();
    if (kw) list = list.filter(x => String(x.title || '').toLowerCase().includes(kw));
    if (filterType === 'video') list = list.filter(x => x.video);
    if (filterType === 'scene') list = list.filter(x => !x.video);
    if (sortBy === 'type') list.sort((a, b) => (!!a.video - !!b.video) || String(a.title).localeCompare(String(b.title), 'zh'));
    else if (sortBy === 'new') list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    else list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh'));
    return list;
  }

  function render() {
    const list = filtered();
    $('#count').textContent = list.length + ' 个' + (items.length !== list.length ? ' / 共 ' + items.length : '');
    if (!list.length) { grid.innerHTML = '<div class="empty">没有匹配的壁纸</div>'; return; }
    grid.innerHTML = list.map(it => {
      const thumb = it.image ? urlFor(it.image) : '';
      const isCur = it.id === currentId;
      const tag = it.video
        ? '<span class="tag video">视频</span>'
        : (it.renderable === false ? '<span class="tag bad">不支持</span>' : '<span class="tag">实时渲染</span>');
      const name = String(it.title || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
      return '<div class="card' + (isCur ? ' current' : '') + '" data-id="' + it.id + '">'
        + '<div class="thumb-wrap">'
        + (thumb ? '<img loading="lazy" src="' + thumb + '">' : '')
        + (isCur ? '<span class="badge-cur">当前</span>' : '')
        + '<button class="del" data-del="' + it.id + '" title="从列表移除">✕</button>'
        + '<div class="ov"><div class="spinner"></div><div>准备中…</div></div>'
        + '</div><div class="meta"><div class="name">' + name + '</div><div class="tags">' + tag + '</div></div></div>';
    }).join('');
    grid.querySelectorAll('img').forEach(img => {
      if (img.complete && img.naturalWidth) img.classList.add('loaded');
      else img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    });
    grid.querySelectorAll('.card').forEach(card => { card.onclick = () => apply(card.dataset.id, card); });
    grid.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const id = btn.dataset.del;
        if (btn.dataset.armed === '1') {
          clearTimeout(Number(btn.dataset.timer || 0));
          hideItem(id);
          return;
        }
        btn.dataset.armed = '1';
        btn.textContent = '确认';
        btn.style.opacity = '1';
        btn.style.width = '42px';
        btn.style.background = 'rgba(220,38,38,.92)';
        btn.style.color = '#fff';
        btn.dataset.timer = String(setTimeout(() => {
          btn.dataset.armed = '0';
          btn.textContent = '✕';
          btn.style.width = '22px';
          btn.style.background = 'rgba(12,13,17,.72)';
          btn.style.color = '#ff8b8b';
        }, 3000));
      };
    });
  }

  function skeleton(n) {
    grid.innerHTML = '<div class="skeleton"></div>'.repeat(n);
  }

  async function loadCatalog() {
    skeleton(9);
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const r = await fetch(CATALOG + '&t=' + Date.now(), { cache: 'no-store' });
        const j = await r.json();
        items = j.items || [];
        render();
        return true;
      } catch (e) {
        if (attempt === 4) {
          grid.innerHTML = '<div class="empty">目录读取失败（本地服务未就绪）<br>' + e.message + '</div>';
          return false;
        }
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    return false;
  }

  // ---------------- apply ----------------
  let chain = Promise.resolve();
  function apply(id, card) {
    chain = chain.then(() => doApply(id, card)).catch(() => {});
    return chain;
  }
  async function doApply(id, card) {
    const item = items.find(x => x.id === id);
    if (!item) return;
    if (item.video === null && item.renderable === false) {
      say('这张壁纸缺少 scene.pkg，无法渲染');
      return;
    }
    applying = true;
    const prevId = currentId;
    if (card) card.classList.add('busy');
    setStatus('切换中…', true);
    try {
      if (item.video) {
        playVideo(urlFor(item.video), item.title);
        $('#propsSec').style.display = 'none';
        currentId = id;
      } else {
        const ok = await applyLive(item);
        currentId = id;
        if (!ok) {
          say('实时渲染失败，改用缓存');
          let j = await (await fetch(BASE + '/job?id=' + encodeURIComponent(id))).json();
          if (j.status !== 'done') {
            await fetch(BASE + '/bake?id=' + encodeURIComponent(id));
            for (let i = 0; i < 90; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const jj = await (await fetch(BASE + '/job?id=' + encodeURIComponent(id))).json();
              if (jj.status === 'done') { j = jj; break; }
            }
          }
          if (j.status === 'done') playVideo(urlFor(j.out), item.title);
          else { say('这张壁纸暂时无法渲染'); currentId = prevId; return; }
        }
        await loadProps(id);
      }
      $('#cur').textContent = String(item.title || '');
      $('#cur').title = String(item.title || '');
      const rec = { id, label: item.title, live: !!window.__weUsedLive };
      try { localStorage.setItem(CUR_KEY, JSON.stringify(rec)); } catch (_) {}
      fetch(BASE + '/last?set=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(rec))))));
      loadAdj(id);
      render();
    } catch (e) {
      setStatus('切换失败：' + e.message, false);
    } finally {
      applying = false;
      if (card) card.classList.remove('busy');
    }
  }

  // ---------------- guard ----------------
  const BACKDROP_CSS =
      '.wallpaper-background,.wallpaper-background__plane,.wallpaper-background__backdrop{'
      + 'background:transparent!important;background-image:none!important;'
      + 'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;opacity:1!important;}'
      + '.wallpaper-background__media{visibility:hidden!important;}'
      + 'body *:not(input):not(textarea):not([contenteditable="true"]){-webkit-user-select:none!important;user-select:none!important;}'
      + '::selection{background:transparent!important;color:inherit!important;}'
      + '#we-video{pointer-events:none!important;}'
      // 首页沉浸展示：只去掉大产品图和渐变底，保留标题/设备名/状态
      + '.home-immersive-backdrop__backing,.home-immersive-backdrop__media{opacity:0!important;visibility:hidden!important;}'
      + '.home-immersive-backdrop__scene{background:none!important;background-image:none!important;}'
      + '.home-immersive-backdrop{pointer-events:none!important;}';

  function killBackdrop() {
    let s = document.getElementById('we-css');
    if (!s) { s = document.createElement('style'); s.id = 'we-css'; document.head.appendChild(s); }
    if (s.textContent !== BACKDROP_CSS) s.textContent = BACKDROP_CSS;
  }

  function patchShadows() {
    const visit = r => {
      r.querySelectorAll('*').forEach(el => {
        const sr = el.shadowRoot;
        if (!sr) return;
        let st = sr.__weStyle;
        if (!st) { st = document.createElement('style'); sr.appendChild(st); sr.__weStyle = st; visit(sr); }
        st.textContent =
          'du-glow-effect{background:none!important;background-image:none!important;box-shadow:none!important;filter:none!important;backdrop-filter:none!important;opacity:1!important;}'
          + ':host{--card-blur:0px!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}'
          + '.du-device-card{--card-blur:0px!important;backdrop-filter:none!important;background-image:none!important;'
          + 'background-color:transparent!important;box-shadow:none!important;}'
          + '.du-device-card::before,.du-device-card::after{background:none!important;background-image:none!important;'
          + 'box-shadow:none!important;opacity:0!important;}'
          + '.du-device-card:hover{background-color:rgba(0,0,0,.18)!important;}';
      });
    };
    visit(document);
  }

  function guardTick() {
    killBackdrop();

    // live 层：没有画布就当作失效，不要反复重挂
    const liveBoxes = [...document.querySelectorAll('.we-live')];
    const mounting = liveBoxes.some(n => n.dataset.mounting === '1');
    if (mounting) {
      // 挂载中：只保留这一个容器，别清理、别判失败
      liveBoxes.forEach(n => { if (n.dataset.mounting !== '1') n.remove(); });
      const bg0 = document.querySelector('.wallpaper-background');
      if (bg0) bg0.style.display = 'none';
      return;
    }
    const hasCanvas = !!document.querySelector('.we-live canvas');
    if (!hasCanvas && window.__wp) { window.__wp = null; }
    const live = !!window.__wp && hasCanvas;
    if (live) {
      const keep = liveBoxes[liveBoxes.length - 1];
      liveBoxes.forEach(n => { if (n !== keep) n.remove(); });
      if (keep && keep.style.display !== 'block') keep.style.display = 'block';
    } else {
      liveBoxes.forEach(n => n.remove());
    }

    const bg = document.querySelector('.wallpaper-background');
    if (bg) {
      const want = live ? 'none' : 'flex';
      if (bg.style.display !== want) bg.style.display = want;
    }

    const v = document.getElementById('we-video');
    if (v) {
      if (live) {
        if (v.style.display !== 'none') v.style.display = 'none';
      } else {
        if (v.style.display !== 'block') v.style.display = 'block';
        if (v.style.visibility !== 'visible') v.style.visibility = 'visible';
        if (desiredSrc && v.dataset.src !== desiredSrc) {
          v.dataset.src = desiredSrc;
          v.src = desiredSrc + (desiredSrc.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
          v.load();
        }
        if (!suspended && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      }
    }

    // 壁纸不可见时给页面一个深色底，避免白底白字
    const videoVisible = !!(v && !v.paused && v.style.display !== 'none' && v.readyState >= 2);
    const visible = live || videoVisible;
    try {
      const bgColor = visible ? '' : '#0b0c10';
      if (document.documentElement.style.backgroundColor !== bgColor) {
        document.documentElement.style.backgroundColor = bgColor;
      }
      if (document.body.style.backgroundColor !== bgColor) {
        document.body.style.backgroundColor = bgColor;
      }
    } catch (_) {}

    if (!window.__shadowTick || Date.now() - window.__shadowTick > 6000) {
      window.__shadowTick = Date.now();
      patchShadows();
    }
  }
  setInterval(guardTick, 1000);

  // ---------------- fps ----------------
  (function fpsCounter() {
    let frames = 0, last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        const fps = Math.round((frames * 1000) / (now - last));
        const el = $('#fps');
        if (el) el.textContent = fps + ' fps';
        frames = 0; last = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  // ---------------- pointer ----------------
  const ptr = { x: .5, y: .5, btn: 0, dirty: true };
  const mark = () => { ptr.dirty = true; };
  document.addEventListener('mousemove', e => {
    ptr.x = Math.min(1, Math.max(0, e.clientX / innerWidth));
    ptr.y = Math.min(1, Math.max(0, e.clientY / innerHeight));
    mark();
  }, { passive: true, capture: true });
  document.addEventListener('mousedown', e => { if (e.button === 0) { ptr.btn = 1; mark(); } }, true);
  document.addEventListener('mouseup', e => { if (e.button === 0) { ptr.btn = 0; mark(); } }, true);
  (function pump() {
    const wp = window.__wp;
    if (wp && typeof wp.pushPointer === 'function' && ptr.dirty) {
      ptr.dirty = false;
      try { wp.pushPointer(ptr.x, ptr.y, ptr.btn); } catch (_) {}
    }
    requestAnimationFrame(pump);
  })();

  // ---------------- suspend ----------------
  function suspendNow() {
    if ((adj.bgMode || 'release') !== 'release' || suspended) return;
    suspended = true;
    if (window.__wp) { try { window.__wp.destroy(); } catch (_) {} window.__wp = null; document.querySelectorAll('.we-live').forEach(n => n.remove()); }
    const v = document.getElementById('we-video');
    if (v && !v.paused) v.pause();
    setStatus('已暂停（后台）', false);
  }
  async function resumeNow() {
    if (!suspended) return;
    suspended = false;
    if (currentId) {
      const item = items.find(x => x.id === currentId);
      if (item && !item.video) { await applyLive(item); if (Object.keys(schema).length) pushProps(); }
      else if (desiredSrc) { const v = videoEl(); v.play().catch(() => {}); }
    }
    setStatus('已恢复', false);
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? suspendNow() : resumeNow(); });
  window.addEventListener('focus', () => { resumeNow(); });
  ['pointerdown', 'keydown', 'wheel'].forEach(ev =>
    window.addEventListener(ev, () => { if (suspended) resumeNow(); }, { passive: true, capture: true }));

  // ---------------- hidden ----------------
  let hiddenCount = 0;
  async function loadHidden() {
    try {
      const j = await (await fetch(BASE + '/hide?t=' + Date.now())).json();
      hiddenCount = j.hidden || 0;
      const el = $('#hiddenCnt');
      if (el) el.textContent = hiddenCount + ' 个';
    } catch (_) {}
  }
  async function hideItem(id) {
    console.log('[we] hide', id);
    await fetch(BASE + '/hide?id=' + encodeURIComponent(id) + '&t=' + Date.now());
    items = items.filter(x => x.id !== id);
    const r = await (await fetch(BASE + '/scan')).json();
    hiddenCount = (hiddenCount || 0) + 1;
    render();
    loadHidden();
    say('已从列表移除（文件没删）');
    if (currentId === id) {
      stopLive();
      const v = document.getElementById('we-video');
      if (v) { try { v.pause(); } catch (_) {} v.style.display = 'none'; }
      currentId = null;
      const fb = items.find(x => x.id !== id && x.renderable !== false);
      if (fb) { say('已移除当前壁纸，切到「' + String(fb.title).slice(0, 10) + '」'); apply(fb.id); }
      else { setStatus('没有其它可用壁纸', false); }
    }
  }
  $('#unhide').onclick = async () => {
    await fetch(BASE + '/hide?action=clear&t=' + Date.now());
    await fetch(BASE + '/scan');
    await loadCatalog();
    await loadHidden();
    say('已恢复隐藏的壁纸');
    if (!currentId) {
      const fb = items.find(x => x.renderable !== false);
      if (fb) apply(fb.id);
    } else if (!window.__wp) {
      const cur = items.find(x => x.id === currentId);
      if (cur && !cur.video) apply(cur.id);
    }
  };

  function __unusedAskRemove(item) {
    if (!item) return;
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);display:grid;place-items:center;pointer-events:auto;z-index:5;';
    const box = document.createElement('div');
    box.style.cssText = 'width:330px;background:#1b1d23;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.6);';
    box.innerHTML = '<div style="font-size:13.5px;font-weight:600;margin-bottom:8px">从列表移除？</div>'
      + '<div style="font-size:11.5px;color:#8b93a3;line-height:1.6;margin-bottom:14px">'
      + String(item.title || '').slice(0, 40) + '<br>只从选择器里隐藏，不会删除创意工坊文件</div>'
      + '<div style="display:flex;gap:8px"><button class="btn" data-cancel>取消</button>'
      + '<button class="btn" data-ok style="background:rgba(220,38,38,.9);color:#fff;border-color:transparent">移除</button></div>';
    mask.appendChild(box);
    root.appendChild(mask);
    const okBtn = box.querySelector('[data-ok]');
    okBtn.style.pointerEvents = 'auto';
    okBtn.style.cursor = 'pointer';
    okBtn.onclick = ev => { ev.stopPropagation(); mask.remove(); hideItem(item.id); };
    box.querySelector('[data-cancel]').onclick = ev => { ev.stopPropagation(); mask.remove(); };
    mask.onclick = e => { if (e.target === mask) mask.remove(); };
    mask.style.pointerEvents = 'auto';
    console.log('[we] dialog open for', item.id);
  }

  // ---------------- interactions ----------------
  host.__ver = VER;
  host.__api = {
    open: () => panel.classList.add('open'),
    close: () => panel.classList.remove('open'),
    toggle: () => panel.classList.toggle('open'),
  };
  $('.fab').onclick = () => panel.classList.toggle('open');
  $('#close').onclick = () => panel.classList.remove('open');
  $('#gear').onclick = () => side.classList.toggle('open');
  $('#refresh').onclick = async () => {
    say('重新扫描中…');
    const r = await (await fetch(BASE + '/scan')).json();
    await loadCatalog();
    await loadHidden();
    say('已刷新，共 ' + r.count + ' 个');
  };
  $('#q').addEventListener('input', e => { kw = e.target.value.trim().toLowerCase(); render(); });
  wrap.querySelectorAll('.chip').forEach(chip => {
    chip.onclick = () => {
      wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      filterType = chip.dataset.f;
      render();
    };
  });
  $('#sort').onchange = e => { sortBy = e.target.value; render(); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) panel.classList.remove('open');
  }, true);

  // ---------------- restore last ----------------
  let autoRestoreFlag = true;
  try {
    const pr = await (await fetch(BASE + '/prefs?t=' + Date.now())).json();
    autoRestoreFlag = pr.autoRestore !== false;
  } catch (_) {}
  const autoRestore = () => autoRestoreFlag;
  if ($('#autoRestore')) {
    $('#autoRestore').checked = autoRestoreFlag;
    $('#autoRestore').onchange = async e => {
      autoRestoreFlag = e.target.checked;
      try {
        await fetch(BASE + '/prefs?autoRestore=' + (autoRestoreFlag ? '1' : '0') + '&t=' + Date.now());
        if (!autoRestoreFlag) await fetch(BASE + '/last?set=' + encodeURIComponent(btoa('{}')) + '&t=' + Date.now());
      } catch (_) {}
      say(autoRestoreFlag ? '下次启动会恢复上次壁纸' : '下次启动不再自动切换');
    };
  }
  await loadCatalog();
  await loadHidden();
  let cur = null;
  try { cur = JSON.parse(localStorage.getItem(CUR_KEY) || 'null'); } catch (_) {}
  if (!cur || !cur.id) {
    try { const j = await (await fetch(BASE + '/last?t=' + Date.now())).json(); if (j && j.id) cur = j; } catch (_) {}
  }
  const start = async item => {
    currentId = item.id;
    $('#cur').textContent = String(item.title || '');
    if (item.video) {
      playVideo(urlFor(item.video), item.title);
    } else {
      const ok = await applyLive(item);
      if (ok) { await loadProps(item.id); }
      else {
        const j = await (await fetch(BASE + '/job?id=' + encodeURIComponent(item.id))).json();
        if (j.status === 'done') playVideo(urlFor(j.out), item.title);
        else {
          const fb = items.find(x => x.renderable !== false && x.id !== item.id);
          if (fb) { say('上次那张渲染不了，已换成可用壁纸'); await start(fb); return; }
          say('没有可用的壁纸');
        }
      }
    }
    loadAdj(item.id);
    render();
  };
  if (!autoRestore()) return 'ui-ready-no-restore';
  if (cur && cur.id) {
    const item = items.find(x => x.id === cur.id);
    if (item) {
      try { await start(item); } catch (e) { window.__weErr = String(e && e.stack || e); console.error('[we] start failed', e); }
      return 'ui-ready';
    }
  }
  return 'ui-ready';
})()
