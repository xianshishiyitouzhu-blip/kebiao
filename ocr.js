/*
 * 本地图片识别：tesseract.js（离线资源）+ 课表网格还原
 * 依赖 parser.js（KBParser）。挂在 window.KBOCR。
 */
(function (root) {
  'use strict';
  const P = root.KBParser;

  const BASE = new URL('vendor/tesseract/', document.baseURI).href;
  const CACHE = 'kebiao-ocr-v1';
  const FILES = {
    lib: 'tesseract.min.js',
    worker: 'worker.min.js',
    coreSimd: 'core/tesseract-core-simd-lstm.wasm.js',
    core: 'core/tesseract-core-lstm.wasm.js',
    lang: 'lang/chi_sim.traineddata.gz',
  };
  const SIZES = { lib: 66695, worker: 123724, coreSimd: 3938657, core: 3938277, lang: 1718768 };
  const MAX_PX = 9e6;
  const SIMD_TEST = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

  function hasSimd() {
    try { return WebAssembly.validate(SIMD_TEST); } catch (e) { return false; }
  }

  function neededKeys() {
    return ['lib', 'worker', hasSimd() ? 'coreSimd' : 'core', 'lang'];
  }

  function urlOf(key) { return BASE + FILES[key]; }

  async function openCache() {
    if (!('caches' in root)) return null;
    try { return await caches.open(CACHE); } catch (e) { return null; }
  }

  async function fetchWithProgress(url, onBytes) {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('下载失败（' + resp.status + '）');
    if (!resp.body || !resp.body.getReader) {
      const b = await resp.blob();
      onBytes(b.size);
      return new Response(b, { headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/octet-stream' } });
    }
    const reader = resp.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onBytes(got);
    }
    const blob = new Blob(chunks, { type: resp.headers.get('Content-Type') || 'application/octet-stream' });
    return new Response(blob, { headers: { 'Content-Type': blob.type } });
  }

  async function getResponse(key) {
    const url = urlOf(key);
    const c = await openCache();
    if (c) {
      const hit = await c.match(url);
      if (hit) return hit;
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('识别组件缺失：' + FILES[key]);
    if (c) { try { await c.put(url, resp.clone()); } catch (e) { /* 存不下就算了 */ } }
    return resp;
  }

  async function status() {
    const keys = neededKeys();
    const total = keys.reduce((s, k) => s + SIZES[k], 0);
    const c = await openCache();
    if (!c) return { ready: false, total, have: 0, noCache: true };
    let have = 0;
    for (const k of keys) if (await c.match(urlOf(k))) have += SIZES[k];
    return { ready: have === total, total, have };
  }

  /** 把识别组件下载进本地缓存（约 6 MB） */
  async function download(onProgress) {
    const keys = neededKeys();
    const total = keys.reduce((s, k) => s + SIZES[k], 0);
    const c = await openCache();
    let done = 0;
    for (const k of keys) {
      const url = urlOf(k);
      if (c && await c.match(url)) { done += SIZES[k]; onProgress && onProgress(done / total); continue; }
      const resp = await fetchWithProgress(url, (n) => onProgress && onProgress(Math.min(1, (done + n) / total)));
      if (c) await c.put(url, resp);
      done += SIZES[k];
    }
    await ensureLang();
    onProgress && onProgress(1);
  }

  /* ---------- IndexedDB：给 tesseract worker 预放语言包 ---------- */

  function idb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open('keyval-store');
      r.onupgradeneeded = () => r.result.createObjectStore('keyval');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  function idbReq(mode, fn) {
    return idb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction('keyval', mode);
      const req = fn(tx.objectStore('keyval'));
      tx.oncomplete = () => { resolve(req.result); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    }));
  }

  const LANG_KEY = './chi_sim.traineddata';

  async function ensureLang() {
    try {
      const has = await idbReq('readonly', (s) => s.count(LANG_KEY));
      if (has) return;
    } catch (e) { return; }
    const resp = await getResponse('lang');
    const buf = new Uint8Array(await resp.arrayBuffer());
    try { await idbReq('readwrite', (s) => s.put(buf, LANG_KEY)); } catch (e) { /* worker 会自己去取 */ }
  }

  /* ---------- tesseract worker ---------- */

  let workerP = null;

  function loadScriptText(text) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/javascript' }));
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => { URL.revokeObjectURL(url); resolve(); };
      s.onerror = () => reject(new Error('识别组件加载失败'));
      document.head.appendChild(s);
    });
  }

  function getWorker(onStatus) {
    if (workerP) return workerP;
    workerP = (async () => {
      onStatus && onStatus('正在加载识别组件…');
      if (!root.Tesseract) await loadScriptText(await (await getResponse('lib')).text());
      const coreKey = hasSimd() ? 'coreSimd' : 'core';
      const [coreText, workerText] = await Promise.all([
        getResponse(coreKey).then((r) => r.text()),
        getResponse('worker').then((r) => r.text()),
      ]);
      await ensureLang();
      // 核心和 worker 拼成一个脚本：worker 里不再需要联网或依赖 Service Worker
      const blobURL = URL.createObjectURL(new Blob([coreText, '\n;\n', workerText], { type: 'application/javascript' }));
      const w = await root.Tesseract.createWorker('chi_sim', 1, {
        workerPath: blobURL,
        workerBlobURL: false,
        langPath: BASE + 'lang',
        gzip: true,
        logger: (m) => {
          if (!onStatus) return;
          if (m.status === 'recognizing text') onStatus('正在识别文字…', m.progress);
          else if (/load|initializ/.test(m.status)) onStatus('正在准备识别…');
        },
      });
      return w;
    })();
    workerP.catch(() => { workerP = null; });
    return workerP;
  }

  /* ---------- 图片预处理 ---------- */

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('这张图片打不开，换一张截图试试')); };
      img.src = url;
    });
  }

  function toCanvas(img, forceScale) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    let scale = 1;
    if (forceScale) scale = forceScale;
    else if (w < 1100) scale = 1600 / w;
    else if (w > 2400) scale = 2200 / w;
    // 很长的截图：别让像素数爆掉（iOS 画布和内存都有上限）
    if (w * scale * h * scale > MAX_PX) scale = Math.sqrt(MAX_PX / (w * h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  /**
   * 统一成“浅底深字”：彩色课程块里的字（不管白字还是深色字）变黑、块底变白；
   * 深色模式截图整体反色。
   */
  function enhance(src) {
    const W = src.width;
    const H = src.height;
    const N = W * H;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    const id = sctx.getImageData(0, 0, W, H);
    const d = id.data;
    const L = new Uint8ClampedArray(N);
    const colored = new Uint8Array(N);
    for (let i = 0, j = 0; j < N; i += 4, j++) {
      const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      L[j] = l;
      const mx = Math.max(r, g, b); const mn = Math.min(r, g, b);
      if (mx - mn > 38 && l > 25 && l < 248) colored[j] = 1;
    }
    // 连通域：找出彩色课程块
    const label = new Int32Array(N);
    const queue = new Int32Array(N);
    const comps = [];
    const minArea = Math.max(400, N * 0.0006);
    for (let start = 0; start < N; start++) {
      if (!colored[start] || label[start]) continue;
      const idn = comps.length + 1;
      let qh = 0; let qt = 0;
      queue[qt++] = start; label[start] = idn;
      let area = 0; let x0 = W; let x1 = 0; let y0 = H; let y1 = 0; let sr = 0; let sg = 0; let sb = 0;
      while (qh < qt) {
        const p = queue[qh++];
        const x = p % W; const y = (p - x) / W;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        sr += d[p * 4]; sg += d[p * 4 + 1]; sb += d[p * 4 + 2];
        if (x > 0 && colored[p - 1] && !label[p - 1]) { label[p - 1] = idn; queue[qt++] = p - 1; }
        if (x < W - 1 && colored[p + 1] && !label[p + 1]) { label[p + 1] = idn; queue[qt++] = p + 1; }
        if (y > 0 && colored[p - W] && !label[p - W]) { label[p - W] = idn; queue[qt++] = p - W; }
        if (y < H - 1 && colored[p + W] && !label[p + W]) { label[p + W] = idn; queue[qt++] = p + W; }
      }
      comps.push({ area, x0, x1, y0, y1, c: [sr / area, sg / area, sb / area] });
    }
    const out = new Uint8ClampedArray(N);
    const inBlock = new Uint8Array(N);
    comps.forEach((cp, k) => {
      const bw = cp.x1 - cp.x0 + 1; const bh = cp.y1 - cp.y0 + 1;
      if (cp.area < minArea || bw < 12 || bh < 12 || cp.area / (bw * bh) < 0.45) return;
      const idn = k + 1;
      // 块的外框（含圆角、抗锯齿边）先全部涂白，避免角上的弧线干扰识别
      const ex0 = Math.max(0, cp.x0 - 3); const ex1 = Math.min(W - 1, cp.x1 + 3);
      const ey0 = Math.max(0, cp.y0 - 3); const ey1 = Math.min(H - 1, cp.y1 + 3);
      for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) { const q = y * W + x; if (!inBlock[q]) { out[q] = 255; inBlock[q] = 1; } }
      for (let y = cp.y0; y <= cp.y1; y++) {
        let a = -1; let b = -1;
        const row = y * W;
        for (let x = cp.x0; x <= cp.x1; x++) if (label[row + x] === idn) { if (a < 0) a = x; b = x; }
        if (a < 0) continue;
        for (let x = a; x <= b; x++) {
          const p = row + x;
          const dist = Math.max(Math.abs(d[p * 4] - cp.c[0]), Math.abs(d[p * 4 + 1] - cp.c[1]), Math.abs(d[p * 4 + 2] - cp.c[2]));
          out[p] = 255 - Math.min(255, Math.max(0, (dist - 35) * 3.5));
          inBlock[p] = 1;
        }
      }
    });
    let sum = 0; let cnt = 0;
    for (let j = 0; j < N; j += 7) if (!inBlock[j]) { sum += L[j]; cnt++; }
    const dark = cnt && sum / cnt < 110;
    for (let j = 0; j < N; j++) if (!inBlock[j]) out[j] = dark ? 255 - L[j] : L[j];
    removeLines(out, W, H);
    const o = document.createElement('canvas');
    o.width = W; o.height = H;
    const octx = o.getContext('2d');
    const od = octx.createImageData(W, H);
    for (let j = 0, i = 0; j < N; j++, i += 4) { od.data[i] = od.data[i + 1] = od.data[i + 2] = out[j]; od.data[i + 3] = 255; }
    octx.putImageData(od, 0, 0);
    return o;
  }

  /** 去掉表格线：很长的横向/纵向深色线段直接涂白 */
  function removeLines(g, W, H) {
    const minH = Math.max(90, Math.round(W * 0.07));
    const minV = Math.max(90, Math.round(H * 0.05));
    const mark = new Uint8Array(W * H);
    const T = 200;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let run = 0;
      for (let x = 0; x <= W; x++) {
        if (x < W && g[row + x] < T) run++;
        else { if (run >= minH) for (let k = x - run; k < x; k++) mark[row + k] = 1; run = 0; }
      }
    }
    for (let x = 0; x < W; x++) {
      let run = 0;
      for (let y = 0; y <= H; y++) {
        if (y < H && g[y * W + x] < T) run++;
        else { if (run >= minV) for (let k = y - run; k < y; k++) mark[k * W + x] = 1; run = 0; }
      }
    }
    for (let j = 0; j < W * H; j++) if (mark[j]) g[j] = 255;
  }

  /** iOS 上把画布尺寸设成 0 才会立刻释放内存 */
  function freeCanvas(c) { if (c && c.width) { c.width = 0; c.height = 0; } }

  function canvasBlob(c) {
    return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
  }

  /* ---------- OCR 结果 → 字符 ---------- */

  function isCJK(ch) { return /[㐀-鿿豈-﫿]/.test(ch); }

  /* tesseract 的字符框不太可靠（行首单词的框经常横跨整行），这里用单词框 + 行高重新估算每个字的位置 */
  /** 画布 → 单通道灰度，用来量字之间真实的空白 */
  function grayOf(canvas) {
    const id = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
    const g = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (id.data[i] * 299 + id.data[i + 1] * 587 + id.data[i + 2] * 114) / 1000;
    return { w: canvas.width, h: canvas.height, g };
  }

  function colInk(gray, x, y0, y1) {
    if (!gray || x < 0 || x >= gray.w) return false;
    const { w, g } = gray;
    for (let y = Math.max(0, y0); y < Math.min(gray.h, y1); y++) if (g[y * w + x] < 140) return true;
    return false;
  }

  /*
   * tesseract 的字符框不太可靠（行首单词的框经常横跨整行），中文还会在字之间乱加空格。
   * 这里用单词的起点 + 图上真实的墨迹重新估算每个词的范围，再按真实空白决定要不要空格。
   */
  function extractLines(data, gray) {
    const lines = [];
    (data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((ln) => {
      const H = Math.max(8, ln.bbox.y1 - ln.bbox.y0);
      const ly0 = Math.round(ln.bbox.y0);
      const ly1 = Math.round(ln.bbox.y1);
      const words = (ln.words || []).filter((w) => w.text && w.text.trim() && !(w.confidence < 20 && w.text.length <= 1 && !isCJK(w.text)) && !/^[“”‘’"'`·|丨_~]+$/.test(w.text.trim()))
        .map((w) => ({ text: w.text.trim(), x0: w.bbox.x0, x1: w.bbox.x1, conf: w.confidence }));
      if (!words.length) return;
      words.sort((a, b) => a.x0 - b.x0);
      words.forEach((w, i) => {
        const exp = Array.from(w.text).reduce((s, ch) => s + (isCJK(ch) ? H * 1.0 : H * 0.55), 0);
        const nx = words[i + 1];
        let lim = Math.min(w.x1, w.x0 + exp * 1.6);
        if (nx) lim = Math.min(lim, nx.x0);
        if (gray) {
          // 从起点往右找最后一列墨迹
          let last = -1;
          for (let x = Math.round(w.x0); x <= Math.round(lim); x++) if (colInk(gray, x, ly0, ly1)) last = x;
          w.x1 = last > w.x0 ? last + 1 : lim;
        } else w.x1 = lim;
        if (nx && w.x1 > nx.x0) w.x1 = Math.max(w.x0 + 1, nx.x0);
      });
      const chars = [];
      words.forEach((w, i) => {
        if (i > 0) {
          const pw = words[i - 1];
          let gap = w.x0 - pw.x1;
          if (gray) {
            // 下一个词的第一列墨迹往左数空白列
            let nx0 = Math.round(w.x0) - 2;
            for (let k = 0; k < H && !colInk(gray, nx0, ly0, ly1); k++) nx0++;
            let blank = 0;
            for (let x = nx0 - 1; x > pw.x0 && !colInk(gray, x, ly0, ly1); x--) blank++;
            gap = blank;
          }
          const asciiBoth = /[A-Za-z0-9]$/.test(pw.text) && /^[A-Za-z0-9]/.test(w.text);
          if (gap > H * (asciiBoth ? 0.18 : 0.2)) chars.push({ ch: ' ', space: true });
        }
        const t = Array.from(w.text);
        const cw = (w.x1 - w.x0) / t.length;
        t.forEach((ch, k) => chars.push({ ch, conf: w.conf, x0: w.x0 + k * cw, x1: w.x0 + (k + 1) * cw, y0: ln.bbox.y0, y1: ln.bbox.y1 }));
      });
      chars.forEach((c) => { if (!c.space) { c.cx = (c.x0 + c.x1) / 2; c.cy = (c.y0 + c.y1) / 2; c.h = H; } });
      lines.push({ chars, y0: ln.bbox.y0, y1: ln.bbox.y1, h: H });
    })));
    return lines;
  }

  function strOf(chars) {
    let s = '';
    const map = [];
    chars.forEach((c) => { for (const ch of c.ch) { s += ch; map.push(c.space ? null : c); } });
    return { s, map };
  }

  function median(a) {
    if (!a.length) return 0;
    const b = a.slice().sort((x, y) => x - y);
    return b[Math.floor(b.length / 2)];
  }

  function fit(points) { // y = a + b*x
    const n = points.length;
    let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
    points.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const den = n * sxx - sx * sx;
    if (!den) return null;
    const b = (n * sxy - sx * sy) / den;
    return { a: (sy - b * sx) / n, b };
  }

  const DAY_CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7, 七: 7 };
  const DAY_EN = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };

  function findHeader(lines) {
    const cands = [];
    lines.forEach((ln) => {
      const { s, map } = strOf(ln.chars);
      const re = /(?:星期|礼拜|星|期|周)\s*([一二三四五六日天七])|(mon|tue|wed|thu|fri|sat|sun)/gi;
      let m;
      while ((m = re.exec(s))) {
        const day = m[1] ? DAY_CN[m[1]] : DAY_EN[m[2].toLowerCase()];
        const cs = map.slice(m.index, m.index + m[0].length).filter(Boolean);
        if (!cs.length) continue;
        cands.push({ day, x0: Math.min.apply(null, cs.map((c) => c.x0)), x1: Math.max.apply(null, cs.map((c) => c.x1)), cy: median(cs.map((c) => c.cy)), y1: Math.max.apply(null, cs.map((c) => c.y1)), h: median(cs.map((c) => c.h)) });
      }
      // 只写“一 二 三 四 五”的表头
      const singles = [];
      map.forEach((c, i) => {
        if (!c || !/[一二三四五六日]/.test(s[i])) return;
        const prev = s[i - 1];
        const next = s[i + 1];
        if ((prev === undefined || prev === ' ' || /\d/.test(prev)) && (next === undefined || next === ' ' || /\d/.test(next))) singles.push({ day: DAY_CN[s[i]], x0: c.x0, x1: c.x1, cy: c.cy, y1: c.y1, h: c.h });
      });
      if (new Set(singles.map((x) => x.day)).size >= 3) singles.forEach((x) => cands.push(x));
    });
    if (!cands.length) return null;
    cands.sort((a, b) => a.cy - b.cy);
    const tol = Math.max(12, median(cands.map((c) => c.h)) * 1.2);
    const groups = [];
    cands.forEach((c) => {
      const g = groups.find((gg) => Math.abs(gg.cy - c.cy) <= tol);
      if (g) { g.items.push(c); g.cy = median(g.items.map((x) => x.cy)); } else groups.push({ cy: c.cy, items: [c] });
    });
    let best = null;
    groups.forEach((g) => {
      const n = new Set(g.items.map((x) => x.day)).size;
      if (n >= 3 && (!best || n > best.n)) best = { n, g };
    });
    if (!best) return null;
    const byDay = {};
    best.g.items.forEach((x) => { (byDay[x.day] = byDay[x.day] || []).push((x.x0 + x.x1) / 2); });
    const pts = Object.keys(byDay).map((d) => [Number(d), median(byDay[d])]);
    const f = fit(pts);
    if (!f || f.b <= 0) return null;
    return {
      dayX: Object.fromEntries(pts),
      fit: f,
      bottom: Math.max.apply(null, best.g.items.map((x) => x.y1)),
      h: median(best.g.items.map((x) => x.h)),
    };
  }

  function columnsFrom(header, W) {
    const { fit: f, dayX } = header;
    const sp = f.b;
    const cols = [];
    for (let d = 1; d <= 7; d++) {
      const x = dayX[d] != null ? dayX[d] : f.a + f.b * d;
      const L = x - sp / 2;
      const R = x + sp / 2;
      if (dayX[d] == null && (L < -sp * 0.15 || R > W + sp * 0.15)) continue;
      cols.push({ day: d, x, L: Math.max(0, L), R: Math.min(W, R) });
    }
    return cols;
  }

  function findRows(lines, leftEdge, top, settings) {
    const pts = [];
    lines.forEach((ln) => {
      const left = ln.chars.filter((c) => !c.space && c.cx < leftEdge && c.cy > top);
      if (!left.length) return;
      const frag = [];
      ln.chars.forEach((c) => { if (c.space || (c.cx < leftEdge && c.cy > top)) frag.push(c); });
      let { s, map } = strOf(frag);
      s = s.replace(/\d{1,2}\s*[:：.]\s*\d{2}/g, (m) => ' '.repeat(m.length));
      s = P.normalize(s);
      const re = /第?\s*(\d{1,2})(?:\s*[-,、]\s*(\d{1,2}))?\s*(大)?\s*节?/g;
      let m;
      while ((m = re.exec(s))) {
        let a = parseInt(m[1], 10);
        let b = m[2] ? parseInt(m[2], 10) : a;
        if (m[3]) { a = a * 2 - 1; b = b * 2; }
        if (a < 1 || b > 24 || b < a) continue;
        const cs = map.slice(m.index, m.index + m[0].length).filter(Boolean);
        if (!cs.length) continue;
        pts.push({ n: (a + b) / 2, cy: median(cs.map((c) => c.cy)), a, b });
      }
    });
    pts.sort((p, q) => p.cy - q.cy);
    // 最长递增子序列，去掉乱入的数字
    const n = pts.length;
    const len = new Array(n).fill(1);
    const prev = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (pts[j].n < pts[i].n && pts[i].cy - pts[j].cy > 4 && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
    let bi = -1;
    for (let i = 0; i < n; i++) if (bi < 0 || len[i] > len[bi]) bi = i;
    const seq = [];
    for (let i = bi; i >= 0; i = prev[i]) seq.unshift(pts[i]);
    if (seq.length < 3) return null;
    const f = fit(seq.map((p) => [p.n, p.cy]));
    if (!f || f.b <= 4) return null;
    const maxN = Math.max(seq[seq.length - 1].b, settings.periodsPerDay || 12);
    const center = {};
    for (let k = 1; k <= maxN; k++) {
      // 有相邻的实测点就插值，没有就用拟合直线
      const lo = seq.filter((p) => p.n <= k).pop();
      const hi = seq.find((p) => p.n >= k);
      if (lo && hi && hi.n !== lo.n) center[k] = lo.cy + (hi.cy - lo.cy) * (k - lo.n) / (hi.n - lo.n);
      else if (lo && lo.n === k) center[k] = lo.cy;
      else center[k] = f.a + f.b * k;
    }
    return { center, h: f.b, maxN };
  }

  function periodsFor(rows, y0, y1) {
    const ks = Object.keys(rows.center).map(Number).sort((a, b) => a - b);
    const tol = rows.h * 0.3;
    const inside = ks.filter((k) => rows.center[k] >= y0 - tol && rows.center[k] <= y1 + tol);
    if (inside.length) return { start: inside[0], end: inside[inside.length - 1] };
    const mid = (y0 + y1) / 2;
    let best = ks[0];
    ks.forEach((k) => { if (Math.abs(rows.center[k] - mid) < Math.abs(rows.center[best] - mid)) best = k; });
    return { start: best, end: best };
  }

  /* 按像素找每一列里的色块 / 横线，确定单元格上下边界 */
  function columnCells(img, col, top, bottom, frags, charH) {
    const { data, width } = img;
    const x0 = Math.round(col.L + (col.R - col.L) * 0.12);
    const x1 = Math.round(col.R - (col.R - col.L) * 0.12);
    if (x1 - x0 < 6) return null;
    const ys = Math.max(0, Math.round(top));
    const ye = Math.min(img.height - 1, Math.round(bottom));
    // 背景色：列内最常见的颜色
    const hist = new Map();
    for (let y = ys; y < ye; y += 3) for (let x = x0; x < x1; x += 3) {
      const k = (y * width + x) * 4;
      const key = (data[k] >> 4) << 8 | (data[k + 1] >> 4) << 4 | (data[k + 2] >> 4);
      hist.set(key, (hist.get(key) || 0) + 1);
    }
    let bgKey = 0; let bgN = -1;
    hist.forEach((v, k) => { if (v > bgN) { bgN = v; bgKey = k; } });
    const bg = [((bgKey >> 8) & 15) * 16 + 8, ((bgKey >> 4) & 15) * 16 + 8, (bgKey & 15) * 16 + 8];
    const frac = new Float32Array(ye - ys);
    for (let y = ys; y < ye; y++) {
      let n = 0; let t = 0;
      for (let x = x0; x < x1; x += 2) {
        const k = (y * width + x) * 4;
        const dd = Math.max(Math.abs(data[k] - bg[0]), Math.abs(data[k + 1] - bg[1]), Math.abs(data[k + 2] - bg[2]));
        if (dd > 26) n++;
        t++;
      }
      frac[y - ys] = n / t;
    }
    // 彩色块
    const blocks = [];
    let s = -1;
    const minGap = Math.max(2, Math.round(charH * 0.35));
    for (let i = 0; i <= frac.length; i++) {
      const on = i < frac.length && frac[i] >= 0.45;
      if (on && s < 0) s = i;
      if (!on && s >= 0) {
        // 允许块内白字造成的短暂“断开”
        let j = i;
        while (j < frac.length && j - i < minGap && frac[j] < 0.45) j++;
        if (j < frac.length && j - i < minGap && frac[j] >= 0.45) { i = j; continue; }
        blocks.push([s + ys, i - 1 + ys]);
        s = -1;
      }
    }
    const thick = blocks.filter(([a, b]) => b - a >= Math.max(16, charH * 1.3));
    // 细横线
    const seps = [];
    const thin = Math.max(3, Math.round(img.height / 350));
    for (let i = 0; i < frac.length; i++) {
      if (frac[i] < 0.85) continue;
      let j = i;
      while (j + 1 < frac.length && frac[j + 1] >= 0.85) j++;
      if (j - i + 1 <= thin) seps.push((i + j) / 2 + ys);
      i = j;
    }
    const inBlock = frags.filter((f) => thick.some(([a, b]) => f.cy >= a - 2 && f.cy <= b + 2)).length;
    if (thick.length && inBlock >= frags.length * 0.5) return { kind: 'blocks', cells: thick.map(([a, b]) => ({ y0: a, y1: b })) };
    if (seps.length >= 1) {
      const edges = [ys].concat(seps).concat([ye]);
      const cells = [];
      for (let i = 0; i + 1 < edges.length; i++) if (edges[i + 1] - edges[i] > charH * 0.8) cells.push({ y0: edges[i], y1: edges[i + 1] });
      return { kind: 'lines', cells };
    }
    return null;
  }

  function groupByGap(frags, charH) {
    const cells = [];
    let cur = null;
    frags.forEach((f) => {
      if (cur && f.y0 - cur.y1 < charH * 1.0) { cur.frags.push(f); cur.y1 = Math.max(cur.y1, f.y1); } else { cur = { y0: f.y0, y1: f.y1, frags: [f], textOnly: true }; cells.push(cur); }
    });
    return cells;
  }

  /*
   * 把一个格子里的片段拼成文字。同一行按 x 拼接；换行时判断是不是“自动折行”：
   * 上一行以 - , ( / 结尾、下一行以 ) 周 节 开头、下一行只有一个字，或者上一行已经占满格子宽度
   * 而下一行看起来不像一个新字段（人名、括号、第…、周几），就直接接上。
   */
  function fragText(frags, availW) {
    const rows = [];
    frags.slice().sort((a, b) => a.cy - b.cy).forEach((f) => {
      const r = rows.find((rr) => Math.abs(rr.cy - f.cy) < f.h * 0.6);
      if (r) r.items.push(f); else rows.push({ cy: f.cy, items: [f] });
    });
    rows.forEach((r) => {
      r.items.sort((a, b) => a.x0 - b.x0);
      r.text = r.items.map((f) => f.text).join(' ');
      r.x0 = r.items[0].x0;
      r.x1 = Math.max.apply(null, r.items.map((f) => f.x1));
      r.h = median(r.items.map((f) => f.h));
    });
    if (rows.length < 2) return rows.map((r) => r.text).join('\n');
    const h = median(rows.map((r) => r.h));
    // 参考宽度：格子里最宽的那行（彩色块有内边距，比列宽窄）；都很短就说明没有折行
    const maxW = Math.max.apply(null, rows.map((r) => r.x1 - r.x0));
    const refW = availW && maxW < availW * 0.55 ? Infinity : maxW;
    let out = rows[0].text;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      const bt = b.text.trim();
      const content = /[-,、(\[\/@]$/.test(a.text) || /^[-,、)\]周节]/.test(bt) || /^[一-龥]$/.test(bt);
      const full = (a.x1 - a.x0) >= refW - h * 0.9;
      const fieldStart = P.personLike(bt) || /^[(\[第@]|^周[一二三四五六日]|^星期/.test(bt);
      const join = !fieldStart && (content || (full && !/[\s)\]]$/.test(a.text)));
      out += (join ? '' : '\n') + b.text;
    }
    return out;
  }

  /** 找表头、节次和每个单元格的位置（只用第一遍识别的文字坐标 + 原图像素） */
  function analyze(lines, img, settings) {
    const W = img.width;
    const header = findHeader(lines);
    if (!header) return null;
    const cols = columnsFrom(header, W);
    if (cols.length < 3) return null;
    const allChars = [];
    lines.forEach((ln) => ln.chars.forEach((c) => { if (!c.space) allChars.push(c); }));
    const charH = median(allChars.map((c) => c.h)) || 30;
    const top = header.bottom + charH * 0.3;
    const leftEdge = cols[0].L;
    const rows = findRows(lines, leftEdge + charH * 0.2, top, settings);

    // 每行文字按列切成片段
    const fragsByCol = new Map(cols.map((c) => [c.day, []]));
    lines.forEach((ln) => {
      let cur = null;
      ln.chars.forEach((c) => {
        if (c.space) { if (cur) cur.chars.push(c); return; }
        if (c.cy <= top - charH * 0.2) return;
        const col = cols.find((cc) => c.cx >= cc.L && c.cx < cc.R);
        if (!col) { cur = null; return; }
        if (!cur || cur.day !== col.day) { cur = { day: col.day, chars: [] }; fragsByCol.get(col.day).push(cur); }
        cur.chars.push(c);
      });
    });
    let bottom = top;
    fragsByCol.forEach((list, day) => {
      const done = list.map((f) => {
        const real = f.chars.filter((c) => !c.space);
        const text = strOf(f.chars).s.trim();
        return { text, conf: real.reduce((t, c) => t + (c.conf || 0), 0) / real.length, n: real.length, x0: Math.min.apply(null, real.map((c) => c.x0)), x1: Math.max.apply(null, real.map((c) => c.x1)), y0: Math.min.apply(null, real.map((c) => c.y0)), y1: Math.max.apply(null, real.map((c) => c.y1)), cy: median(real.map((c) => c.cy)), h: median(real.map((c) => c.h)) };
      }).filter((f) => f.text && !/^[|丨l1I!.,·:;'"_\-—=~]+$/.test(f.text));
      done.sort((a, b) => a.cy - b.cy);
      fragsByCol.set(day, done);
      done.forEach((f) => { bottom = Math.max(bottom, f.y1); });
    });
    const imgBottom = img.height - 1;

    let rowModel = rows;
    if (!rowModel) {
      const N = settings.periodsPerDay || 12;
      const span = (Math.min(imgBottom, bottom + charH) - top);
      const center = {};
      for (let k = 1; k <= N; k++) center[k] = top + (k - 0.5) * span / N;
      rowModel = { center, h: span / N, guessed: true };
    }

    const cells = [];
    cols.forEach((col) => {
      const frags = fragsByCol.get(col.day);
      if (!frags.length) return;
      let cs = null;
      const segBottom = Math.min(imgBottom, rows ? rowModel.center[rowModel.maxN] + rowModel.h : bottom + charH * 2);
      const seg = columnCells(img, col, top, segBottom, frags, charH);
      if (seg && seg.cells.length) {
        cs = seg.cells.map((c) => ({ y0: c.y0, y1: c.y1, frags: [], kind: seg.kind }));
        const loose = [];
        frags.forEach((f) => {
          const c = cs.find((cc) => f.cy >= cc.y0 - 2 && f.cy <= cc.y1 + 2);
          if (c) c.frags.push(f); else loose.push(f);
        });
        cs = cs.filter((c) => c.frags.length).concat(groupByGap(loose, charH));
      } else cs = groupByGap(frags, charH);
      cs.forEach((c) => {
        const text = fragText(c.frags, col.R - col.L);
        if (!text.replace(/[\s\d.,:\-/|]/g, '')) return;
        const tx0 = Math.min.apply(null, c.frags.map((f) => f.x0));
        const tx1 = Math.max.apply(null, c.frags.map((f) => f.x1));
        cells.push({
          day: col.day,
          x0: Math.max(0, Math.min(col.L, tx0 - charH * 0.3)),
          x1: Math.min(W, Math.max(col.R, tx1 + charH * 0.3)),
          y0: c.textOnly ? c.y0 - charH * 0.4 : c.y0,
          y1: c.textOnly ? c.y1 + charH * 0.4 : c.y1,
          ty0: Math.min.apply(null, c.frags.map((f) => f.y0)),
          ty1: Math.max.apply(null, c.frags.map((f) => f.y1)),
          text,
          conf: c.frags.reduce((t, f) => t + f.conf * f.n, 0) / Math.max(1, c.frags.reduce((t, f) => t + f.n, 0)),
          availW: col.R - col.L,
          textOnly: !!c.textOnly,
        });
      });
    });
    return { cols, rowModel, rowsFound: !!rows, cells, charH, top };
  }

  const KEEP_REN = /^(机器人|法人|工人)$/;

  function cleanCellText(text) {
    return text.split('\n').map((line) => {
      let t = line.trim();
      // 名称后面的 ◇ ★ 等符号常被认成“人 / 必 / <>”
      const m = t.match(/\s*(?:[<>◇◆★☆*※]+|[人必心]\s*[<>]*)$/);
      if (m) {
        const head = t.slice(0, t.length - m[0].length);
        if (/[一-龥]{2,}$/.test(head) && !KEEP_REN.test(t.replace(/\s/g, ''))) t = head;
      }
      // 括号里的节次：l、I、| 多半是 1
      t = t.replace(/\(([^()]{0,12})节\)/g, (mm, inner) => '(' + inner.replace(/(\d)[lLI|]+(?=\s*-)/g, '$1').replace(/[lLI|]/g, '1') + '节)');
      t = t.replace(/^[|丨]+|[|丨]+$/g, '').trim();
      t = t.replace(/(\d)\s*[有月]\s*周/g, '$1周');
      t = t.replace(/\s*[“”‘’"'`]+\s*/g, '');
      t = t.replace(/([\u4e00-\u9fa5])\s+[，,。.]\s*(?=[\u4e00-\u9fa5])/g, '$1');
      // 教室号里的 1 常被认成 l：Al01 → A101，Al101 → A101
      t = t.replace(/\b([A-Z])[lI|](\d{2,4})\b/g, (mm, a, d) => a + (d.length >= 3 ? d : '1' + d));
      return t;
    }).filter(Boolean).join('\n');
  }

  function parseQuality(es, text) {
    if (!es.length) return -10;
    let q = 0;
    es.forEach((e) => {
      const nm = (e.name || '').replace(/[^一-龥A-Za-z]/g, '');
      if (e.name && e.name !== '未命名课程') q += 2 + Math.min(4, nm.length) * 0.5;
      if (e.location) q += 1;
      if (e.teacher) q += 1;
      if (/[一-龥A-Za-z]\d|\d[一-龥]/.test(e.name || '')) q -= 2;
    });
    if (/\d\s*周/.test(text) && es.some((e) => e.weeks.length && e.weeks.length < 60)) q += 1;
    q -= (es.length - 1) * 2.5;
    return q;
  }

  function textScore(t) { return (t.match(/[一-龥]/g) || []).length + (t.match(/[A-Za-z0-9]/g) || []).length * 0.5; }

  /** 把单元格裁出来单独再认一次（整块文字识别比稀疏模式准） */
  async function ocrCell(worker, norm, cell, charH) {
    const W = norm.width;
    const H = norm.height;
    const x0 = Math.max(0, Math.floor(cell.x0 + 3));
    const x1 = Math.min(W, Math.ceil(cell.x1 - 3));
    const y0 = Math.max(0, Math.floor(cell.textOnly ? cell.y0 : cell.y0 + 2));
    const y1 = Math.min(H, Math.ceil(cell.textOnly ? cell.y1 : cell.y1 - 2));
    if (x1 - x0 < 8 || y1 - y0 < 8) return '';
    const scale = charH < 36 ? Math.min(3, 42 / charH) : 1;
    const margin = 24;
    const c = document.createElement('canvas');
    c.width = Math.round((x1 - x0) * scale) + margin * 2;
    c.height = Math.round((y1 - y0) * scale) + margin * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(norm, x0, y0, x1 - x0, y1 - y0, margin, margin, (x1 - x0) * scale, (y1 - y0) * scale);
    const { data } = await worker.recognize(await canvasBlob(c), {}, { text: true, blocks: true });
    const lines = extractLines(data, grayOf(c));
    freeCanvas(c);
    const frags = lines.map((ln) => {
      const real = ln.chars.filter((ch) => !ch.space);
      return { text: strOf(ln.chars).s.trim(), conf: real.reduce((t, c) => t + (c.conf || 0), 0) / real.length, n: real.length, x0: real[0].x0, x1: real[real.length - 1].x1, cy: (ln.y0 + ln.y1) / 2, h: ln.h, y0: ln.y0, y1: ln.y1 };
    }).filter((f) => f.text && !/^[|丨l1I!.,·:;'"_\-—=~]+$/.test(f.text));
    const conf = frags.reduce((t, f) => t + f.conf * f.n, 0) / Math.max(1, frags.reduce((t, f) => t + f.n, 0));
    return { text: fragText(frags, (x1 - x0) * scale), conf };
  }

  /** 第一遍没认出左侧的节次编号时，把左边那一条单独裁出来放大再认一次 */
  async function ocrLabelStrip(worker, norm, st, settings) {
    const x1 = Math.floor(st.cols[0].L);
    const y0 = Math.max(0, Math.floor(st.top));
    const H = norm.height;
    if (x1 < 12 || H - y0 < 40) return null;
    let scale = st.charH < 40 ? Math.min(2.5, 48 / st.charH) : 1;
    if (x1 * scale * (H - y0) * scale > MAX_PX) scale = Math.sqrt(MAX_PX / (x1 * (H - y0)));
    const margin = 20;
    const c = document.createElement('canvas');
    c.width = Math.round(x1 * scale) + margin * 2;
    c.height = Math.round((H - y0) * scale) + margin * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(norm, 0, y0, x1, H - y0, margin, margin, x1 * scale, (H - y0) * scale);
    // 节次编号常是浅灰色的小数字：二值化 + 只认数字
    const id = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < id.data.length; i += 4) { const v = id.data[i] < 205 ? 0 : 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; }
    ctx.putImageData(id, 0, 0);
    const blob = await canvasBlob(c);
    const gray = grayOf(c);
    freeCanvas(c);
    const back = (v) => (v - margin) / scale;
    let best = null;
    try {
      for (const psm of ['6', '11']) {
        await worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: '0123456789' });
        const { data } = await worker.recognize(blob, {}, { text: true, blocks: true });
        const lines = extractLines(data, gray);
        mapBack(lines);
        const rows = findRows(lines, x1 + 1, y0 - 1, settings);
        if (rows) { best = rows; break; }
      }
    } finally { await worker.setParameters({ tessedit_char_whitelist: '' }); }
    return best;

    function mapBack(lines) { lines.forEach((ln) => {
      ln.chars.forEach((ch) => {
        if (ch.space) return;
        ch.x0 = back(ch.x0); ch.x1 = back(ch.x1); ch.y0 = back(ch.y0) + y0; ch.y1 = back(ch.y1) + y0;
        ch.cx = (ch.x0 + ch.x1) / 2; ch.cy = (ch.y0 + ch.y1) / 2; ch.h = ch.y1 - ch.y0;
      });
      ln.y0 = back(ln.y0) + y0; ln.y1 = back(ln.y1) + y0; ln.h /= scale;
    }); }
  }

  function mergeAdjacent(entries) {
    const out = [];
    entries.sort((a, b) => a.day - b.day || a.start - b.start).forEach((e) => {
      const prev = out.find((x) => x.day === e.day && x.name === e.name && x.location === e.location && x.weeks.join() === e.weeks.join() && x.end + 1 >= e.start && x.start <= e.start);
      if (prev) prev.end = Math.max(prev.end, e.end); else out.push(e);
    });
    return out;
  }

  function linesToText(lines) {
    return lines.slice().sort((a, b) => a.y0 - b.y0).map((ln) => strOf(ln.chars).s.trim()).join('\n');
  }

  /* ---------- 对外接口 ---------- */

  async function ocrPass(img, scale, settings, onStatus, label) {
    const canvas = toCanvas(img, scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onStatus && onStatus(label || '正在处理图片…');
    await new Promise((r) => setTimeout(r, 30));
    const norm = settings.enhance === false ? canvas : enhance(canvas);
    const worker = await getWorker(onStatus);
    await worker.setParameters({ tessedit_pageseg_mode: String(settings.psm || 11), preserve_interword_spaces: '1' });
    onStatus && onStatus('正在识别文字…');
    const { data } = await worker.recognize(await canvasBlob(norm), {}, { text: true, blocks: true });
    const lines = extractLines(data, grayOf(norm));
    return { lines, imgData, canvas, norm, data, worker };
  }

  async function recognize(file, settings, onStatus) {
    settings = settings || {};
    onStatus && onStatus('正在读取图片…');
    const { img, url } = await loadImage(file);
    let passRef = null;
    try {
      let pass = await ocrPass(img, null, settings, onStatus);
      passRef = pass;
      // 字太小（比如手机上截的整张教务网页）就放大再认一次
      const hs = pass.lines.filter((l) => l.chars.some((c) => !c.space && isCJK(c.ch))).map((l) => l.h);
      const h = median(hs);
      if (settings.upscale !== false && h && h < 24) {
        const factor = Math.min(2.6, 32 / h);
        const s2 = (pass.canvas.width / img.naturalWidth) * factor;
        const cap = Math.min(s2, Math.sqrt(MAX_PX / (img.naturalWidth * img.naturalHeight)));
        if (cap / (pass.canvas.width / img.naturalWidth) > 1.25) {
          freeCanvas(pass.canvas); freeCanvas(pass.norm);
          pass = await ocrPass(img, cap, settings, onStatus, '字比较小，放大后再识别一次…');
        }
      }
      passRef = pass;
      const { lines, imgData, data, norm, worker } = pass;
      const text = linesToText(lines);
      const st = analyze(lines, imgData, settings);
      if (st && st.cells.length) {
        const ctx = { totalWeeks: settings.totalWeeks, periods: settings.periods };
        const out = [];
        const texts = [];
        if (!st.rowsFound && settings.cellPass !== false) {
          onStatus && onStatus('正在识别左侧的节次…');
          try {
            const rows2 = await ocrLabelStrip(worker, norm, st, settings);
            if (rows2) { st.rowModel = rows2; st.rowsFound = true; }
          } catch (e) { /* 用估计的节次 */ }
        }
        if (settings.cellPass !== false) await worker.setParameters({ tessedit_pageseg_mode: '6' });
        for (let i = 0; i < st.cells.length; i++) {
          const cell = st.cells[i];
          const p = periodsFor(st.rowModel, cell.y0, cell.y1);
          const cctx = Object.assign({ day: cell.day, start: p.start, end: p.end }, ctx);
          const cands = [{ text: cleanCellText(cell.text), conf: cell.conf }];
          if (settings.cellPass !== false) {
            onStatus && onStatus(`正在逐格识别 ${i + 1}/${st.cells.length}…`, (i + 1) / st.cells.length);
            try {
              const r2 = await ocrCell(worker, norm, cell, st.charH);
              if (r2 && r2.text && textScore(r2.text) >= textScore(cell.text) * 0.6) cands.push({ text: cleanCellText(r2.text), conf: r2.conf });
            } catch (e) { /* 用第一遍的文字 */ }
          }
          // 两遍识别各解析一次，取解析得更完整的；一样好就取置信度高的
          cands.forEach((c) => { c.entries = P.parseText(c.text, cctx); c.q = parseQuality(c.entries, c.text); });
          cands.sort((a, b) => (b.q - a.q) || (Math.abs(b.conf - a.conf) > 6 ? b.conf - a.conf : textScore(b.text) - textScore(a.text)));
          const t = cands[0].text;
          texts.push(`【${P.DAY_NAMES[cell.day]}】\n${t}`);
          cands[0].entries.forEach((e) => {
            e.day = cell.day;
            if (st.rowModel.guessed) e.guessedPeriods = true;
            e.incomplete = !e.name || e.name === '未命名课程' || e.start == null || !e.weeks.length;
            e.ocrText = t;
            out.push(e);
          });
        }
        if (out.length) return { mode: 'grid', entries: mergeAdjacent(out), text: texts.join('\n\n'), rowsFound: st.rowsFound };
      }
      const entries = P.parseText(cleanCellText(text), { totalWeeks: settings.totalWeeks, periods: settings.periods });
      return { mode: 'text', entries, text };
    } finally {
      URL.revokeObjectURL(url);
      if (passRef) { freeCanvas(passRef.canvas); freeCanvas(passRef.norm); }
    }
  }

  async function cancel() {
    const wp = workerP;
    workerP = null;
    if (wp) { try { (await wp).terminate(); } catch (e) { /* 已经停了 */ } }
  }

  root.KBOCR = { recognize, cancel, status, download, hasSimd, _analyze: analyze, _extractLines: extractLines, _enhance: enhance, _toCanvas: toCanvas, _getWorker: getWorker };
})(typeof self !== 'undefined' ? self : this);
