/* 课表 —— 界面与数据 */
(function () {
  'use strict';
  const P = window.KBParser;
  const STORE = 'kebiao.v1';
  const VERSION = '1.0.0';

  /* ---------- 荧光笔配色 ---------- */
  const PALETTE = [
    { bg: '#FFE873', fg: '#574400', dbg: '#463B10', dfg: '#FFE98A' },
    { bg: '#9FEFC0', fg: '#0B4D2D', dbg: '#123D29', dfg: '#A9F2C8' },
    { bg: '#A6D8FF', fg: '#0A3F6B', dbg: '#10314C', dfg: '#B1DDFF' },
    { bg: '#FFBFD6', fg: '#78123F', dbg: '#46172E', dfg: '#FFC8DC' },
    { bg: '#FFCB94', fg: '#733600', dbg: '#472A10', dfg: '#FFD2A3' },
    { bg: '#D4C4FF', fg: '#3C228A', dbg: '#2C2250', dfg: '#DCCFFF' },
    { bg: '#94ECE3', fg: '#06514B', dbg: '#0F3B38', dfg: '#A2EFE7' },
    { bg: '#D3EE85', fg: '#3D4D00', dbg: '#323E0F', dfg: '#DAF197' },
    { bg: '#FFB3A7', fg: '#7E1F14', dbg: '#4A1E18', dfg: '#FFBEB3' },
    { bg: '#BFCFFF', fg: '#1D3183', dbg: '#1D284D', dfg: '#C9D6FF' },
  ];

  const I = {
    tabSchedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M9.2 4.5v16M14.8 4.5v16"/><rect class="fill" x="9.2" y="12" width="5.6" height="5" fill="none" stroke="none"/></svg>',
    tabCourses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><rect class="fill" x="3.5" y="5" width="3" height="3" rx="1" fill="none"/><rect class="fill" x="3.5" y="10.5" width="3" height="3" rx="1" fill="none"/><rect class="fill" x="3.5" y="16" width="3" height="3" rx="1" fill="none"/></svg>',
    tabImport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v11M7.5 10 12 14.5 16.5 10"/><path d="M4 14.5v3.5a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-3.5"/></svg>',
    tabSettings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20"/><circle class="fill" cx="15" cy="7" r="2.3" fill="none"/><circle class="fill" cx="9" cy="17" r="2.3" fill="none"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6 8.5 12l6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 6 6 6-6 6"/></svg>',
    down: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9.5 6 6 6-6"/></svg>',
    right: '<svg class="chev-r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 6 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5.5-5 4 3.5 2.5-2 4.5 3.5"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 6h14M5 10.5h14M5 15h9M5 19.5h6"/></svg>',
    tri: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 6 6 6-6 6"/></svg>',
    circle: '<svg class="circle" viewBox="0 0 40 28" aria-hidden="true"><path d="M7 16c-1-7 8-11.5 16-11s13 4.5 12.2 10.5S27 25 19 24.6 4.6 21 5.4 14.6C6 10 11 6.8 17.5 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    scribble: '<svg class="scribble" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="12" width="44" height="40" rx="5"/><path d="M10 22h44M24.5 12v40M39.5 12v40"/><path d="M27 29h10M27 33h7" stroke-width="3" opacity=".5"/></svg>',
  };

  /* ---------- 小工具 ---------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const DAYS = P.DAY_NAMES;
  const DAY_SHORT = ['', '一', '二', '三', '四', '五', '六', '日'];

  function parseDate(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function cnDate(d) { return `${d.getMonth() + 1}月${d.getDate()}日`; }
  function toMin(t) { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; }
  function fromMin(n) { return `${pad(Math.floor(n / 60) % 24)}:${pad(n % 60)}`; }
  function isDark() { return document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); }

  /* ---------- 数据 ---------- */
  function defaults() {
    return {
      startDate: null, totalWeeks: 20, periodsPerDay: 12,
      periods: P.DEFAULT_PERIODS.map((p) => ({ start: p.start, end: p.end })),
      weekend: 'auto', showOther: true, dismissed: {},
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const d = JSON.parse(raw);
        return { entries: Array.isArray(d.entries) ? d.entries : [], colors: d.colors || {}, settings: Object.assign(defaults(), d.settings || {}) };
      }
    } catch (e) { /* 读不到就从空开始 */ }
    return { entries: [], colors: {}, settings: defaults() };
  }

  const state = load();
  const S = state.settings;
  ensurePeriods();

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: 1, entries: state.entries, colors: state.colors, settings: S }));
    } catch (e) { toast('没存上：手机存储空间可能不够了'); }
  }

  function ensurePeriods() {
    S.periodsPerDay = Math.max(1, Math.min(20, S.periodsPerDay | 0 || 12));
    if (!Array.isArray(S.periods)) S.periods = [];
    while (S.periods.length < S.periodsPerDay) {
      const i = S.periods.length;
      const def = P.DEFAULT_PERIODS[i];
      if (def) S.periods.push({ start: def.start, end: def.end });
      else {
        const last = S.periods[i - 1];
        const st = (toMin(last && last.end) || 1290) + 10;
        S.periods.push({ start: fromMin(st), end: fromMin(st + 45) });
      }
    }
  }

  function colorOf(name) {
    let idx = state.colors[name];
    if (idx == null) {
      let h = 0;
      for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      idx = h % PALETTE.length;
    }
    const c = PALETTE[idx % PALETTE.length];
    return isDark() ? { bg: c.dbg, fg: c.dfg } : { bg: c.bg, fg: c.fg };
  }
  function colorVars(name) { const c = colorOf(name); return `--cbg:${c.bg};--cfg:${c.fg}`; }

  function assignColors() {
    const used = new Array(PALETTE.length).fill(0);
    const names = Array.from(new Set(state.entries.map((e) => e.name)));
    names.forEach((n) => { if (state.colors[n] != null) used[state.colors[n] % PALETTE.length]++; });
    names.forEach((n) => {
      if (state.colors[n] != null) return;
      let best = 0;
      for (let i = 1; i < used.length; i++) if (used[i] < used[best]) best = i;
      state.colors[n] = best;
      used[best]++;
    });
    Object.keys(state.colors).forEach((n) => { if (!names.includes(n)) delete state.colors[n]; });
  }

  function cleanEntry(e) {
    const weeks = Array.from(new Set((e.weeks || []).map(Number))).filter((n) => n >= 1 && n <= 60).sort((a, b) => a - b);
    const start = Math.max(1, parseInt(e.start, 10) || 1);
    const end = Math.max(start, parseInt(e.end, 10) || start);
    return {
      id: e.id || uid(),
      name: String(e.name || '').trim() || '未命名课程',
      teacher: String(e.teacher || '').trim(),
      location: String(e.location || '').trim(),
      day: Math.min(7, Math.max(1, parseInt(e.day, 10) || 1)),
      start, end, weeks,
      note: String(e.note || '').trim(),
    };
  }

  function fitSettingsTo(entries) {
    const maxEnd = Math.max(0, ...entries.map((e) => e.end || 0));
    if (maxEnd > S.periodsPerDay) { S.periodsPerDay = Math.min(20, maxEnd); ensurePeriods(); }
    const maxW = Math.max(0, ...entries.map((e) => Math.max(0, ...(e.weeks || [0]))));
    if (maxW > S.totalWeeks) S.totalWeeks = Math.min(60, maxW);
  }

  /* ---------- 周次 ---------- */
  function startMonday() { const d = parseDate(S.startDate); return d ? mondayOf(d) : null; }
  function weekOf(date) {
    const sm = startMonday();
    if (!sm) return null;
    return Math.round((mondayOf(date) - sm) / 6048e5) + 1;
  }
  function currentWeek() { return weekOf(new Date()); }
  function clampWeek(w) { return Math.min(Math.max(1, w || 1), S.totalWeeks); }
  function setCurrentWeek(w) {
    S.startDate = fmtDate(addDays(mondayOf(new Date()), -(w - 1) * 7));
    save();
  }
  function guessStartDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    let d;
    if (m >= 7) d = new Date(y, 8, 1);
    else if (m === 1) d = new Date(y - 1, 8, 1);
    else d = new Date(y, 1, 24);
    let mon = mondayOf(d);
    if (d.getDay() >= 4 || d.getDay() === 0) mon = addDays(mon, 7);
    return mon;
  }

  function weekDates(w) {
    // 没设置开学日期时，暂时把这周当第 1 周来排日期
    const sm = startMonday() || mondayOf(new Date());
    const base = addDays(sm, (w - 1) * 7);
    return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i === 0 ? null : addDays(base, i - 1)));
  }

  function visibleDays() {
    if (S.weekend === 'show') return [1, 2, 3, 4, 5, 6, 7];
    if (S.weekend === 'hide') return [1, 2, 3, 4, 5];
    const hasWeekend = state.entries.some((e) => e.day >= 6);
    return hasWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
  }

  function periodLabel(e) { return e.start === e.end ? `第${e.start}节` : `第${e.start}-${e.end}节`; }
  function timeLabel(e) {
    const a = S.periods[e.start - 1];
    const b = S.periods[e.end - 1];
    return a && b ? `${a.start}–${b.end}` : '';
  }

  /* ---------- 界面状态 ---------- */
  const ui = { tab: 'schedule', week: clampWeek(currentWeek() || 1), armed: null };

  /* ---------- 课表 ---------- */
  function clusters(list) {
    const out = [];
    list.slice().sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start)).forEach((e) => {
      const c = out.find((x) => e.start <= x.end && e.end >= x.start);
      if (c) { c.items.push(e); c.start = Math.min(c.start, e.start); c.end = Math.max(c.end, e.end); } else out.push({ start: e.start, end: e.end, items: [e] });
    });
    return out;
  }

  function isBreakBefore(i) {
    if (i <= 1) return false;
    const prev = toMin(S.periods[i - 2] && S.periods[i - 2].end);
    const cur = toMin(S.periods[i - 1] && S.periods[i - 1].start);
    return prev != null && cur != null && cur - prev >= 50;
  }

  function renderSchedule() {
    const view = $('#v-schedule');
    const w = ui.week;
    const cw = currentWeek();
    const isCur = cw === w;
    const days = visibleDays();
    const NP = S.periodsPerDay;
    const dates = weekDates(w);
    const today = new Date();
    const m1 = dates[days[0]].getMonth() + 1;
    const m2 = dates[days[days.length - 1]].getMonth() + 1;
    const monthLabel = m1 === m2 ? `${m1}月` : `${m1}–${m2}月`;

    let meta = monthLabel;
    if (!S.startDate) meta += ' · 还没设置周次';
    else if (isCur) meta += ' · 本周';
    else if (cw != null && cw < 1) meta += ` · 还没开学 <button data-act="go-today">回到第1周</button>`;
    else if (cw != null && cw > S.totalWeeks) meta += ' · 本学期已结束';
    else meta += ` · <button data-act="go-today">回到本周</button>`;

    const notices = [];
    const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    if (!standalone && !S.dismissed.install) {
      notices.push(`<div class="notice"><p><strong>添加到主屏幕后就能离线用。</strong>在 Safari 里点底部的分享按钮，选“添加到主屏幕”。主屏幕上的课表和 Safari 里的数据是分开存的，添加以后再从那里导入。</p><button class="x" data-act="dismiss" data-key="install" aria-label="关闭提示">×</button></div>`);
    }
    if (!S.startDate && state.entries.length) {
      notices.push('<div class="notice"><p>告诉我现在是第几周，课表才能按周显示。</p><button class="go" data-act="pick-week">设置</button></div>');
    }

    const head = `
      <header class="week-head">
        <div>
          <button class="week-title" data-act="pick-week" aria-label="第${w}周，点按选择周次"><span>第</span><b>${w}</b><span>周</span>${I.down}</button>
          <div class="week-meta">${meta}</div>
        </div>
        <div class="head-actions">
          <button class="icon-btn" data-act="prev" aria-label="上一周">${I.prev}</button>
          <button class="icon-btn" data-act="next" aria-label="下一周">${I.next}</button>
          <button class="icon-btn" data-act="add" aria-label="添加课程">${I.plus}</button>
        </div>
      </header>${notices.join('')}`;

    const dayHead = `<div class="days" style="--ndays:${days.length}"><div class="mon">${m1}<br>月</div>${days.map((d) => {
      const dt = dates[d];
      const t = sameDay(dt, today);
      return `<div class="day${t ? ' today' : ''}"><span class="dn">${DAY_SHORT[d]}</span><span class="dd">${dt.getDate()}${t ? I.circle : ''}</span></div>`;
    }).join('')}</div>`;

    let cells = '';
    for (let p = 1; p <= NP; p++) {
      const br = isBreakBefore(p) ? ' break' : '';
      const per = S.periods[p - 1] || {};
      cells += `<div class="gp${br}" style="grid-row:${p}"><b>${p}</b><small>${esc(per.start || '')}</small></div>`;
      days.forEach((d, i) => {
        const armed = ui.armed && ui.armed.day === d && ui.armed.p === p ? ' armed' : '';
        cells += `<div class="cell${br}${armed}" style="grid-row:${p};grid-column:${i + 2}" data-act="cell" data-day="${d}" data-p="${p}"></div>`;
      });
    }

    let blocks = '';
    days.forEach((d, i) => {
      const dayEntries = state.entries.filter((e) => e.day === d && e.start <= NP);
      const now = dayEntries.filter((e) => e.weeks.includes(w));
      const cl = clusters(now);
      cl.forEach((c) => {
        const e = c.items[0];
        const end = Math.min(c.end, NP);
        const span = end - c.start + 1;
        const clamp = Math.max(2, span * 2 + (span > 1 ? 1 : 0));
        blocks += `<button class="blk" style="grid-row:${c.start}/${end + 1};grid-column:${i + 2};${colorVars(e.name)};--clamp:${clamp}" data-act="open" data-ids="${c.items.map((x) => x.id).join(',')}" aria-label="${esc(e.name)}，${periodLabel(e)}${e.location ? '，' + esc(e.location) : ''}">
          <span class="n">${esc(e.name)}</span>${e.location ? `<span class="l">${esc(e.location)}</span>` : ''}${c.items.length > 1 ? `<span class="more">+${c.items.length - 1}</span>` : ''}</button>`;
      });
      if (S.showOther) {
        const others = dayEntries.filter((e) => !e.weeks.includes(w) && !cl.some((c) => e.start <= c.end && e.end >= c.start));
        clusters(others).forEach((c) => {
          const e = c.items[0];
          const end = Math.min(c.end, NP);
          blocks += `<button class="blk other" style="grid-row:${c.start}/${end + 1};grid-column:${i + 2}" data-act="open" data-ids="${c.items.map((x) => x.id).join(',')}" aria-label="${esc(e.name)}，不在本周">
            <span class="n">${esc(e.name)}</span><span class="tag">非本周</span></button>`;
        });
      }
    });

    const empty = state.entries.length ? '' : `
      <div class="empty">${I.scribble}<h2>还没有课程</h2><p>可以导入教务系统的表格、课表截图或一段文字，也可以点空白格子一节一节加。</p>
      <div class="row"><button class="btn" data-act="goto-import">导入课表</button><button class="btn ghost" data-act="add">手动添加</button></div></div>`;

    view.innerHTML = `${head}${dayHead}
      <div class="scroll" id="sched-scroll"><div class="grid-wrap" id="grid-wrap">
        <div class="grid" id="grid" style="--ndays:${days.length};--nperiods:${NP}">${cells}${blocks}</div>${empty}
      </div></div>`;
    requestAnimationFrame(placeNowLine);
  }

  function placeNowLine() {
    const grid = $('#grid');
    if (!grid) return;
    $$('.nowline', grid).forEach((n) => n.remove());
    if (currentWeek() !== ui.week) return;
    const days = visibleDays();
    const todayDow = ((new Date().getDay() + 6) % 7) + 1;
    const col = days.indexOf(todayDow);
    if (col < 0) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const NP = S.periodsPerDay;
    const first = toMin(S.periods[0].start);
    const last = toMin(S.periods[NP - 1].end);
    if (mins < first || mins > last) return;
    let p = 1;
    let frac = 0;
    for (let i = 1; i <= NP; i++) {
      const a = toMin(S.periods[i - 1].start);
      const b = toMin(S.periods[i - 1].end);
      if (mins < a) { p = i; frac = 0; break; }
      if (mins <= b) { p = i; frac = (mins - a) / Math.max(1, b - a); break; }
      p = i; frac = 1;
    }
    const gp = $$('.gp', grid)[p - 1];
    const cell = $(`.cell[data-day="${todayDow}"][data-p="${p}"]`, grid);
    if (!gp || !cell) return;
    const line = document.createElement('div');
    line.className = 'nowline';
    line.style.top = `${gp.offsetTop + gp.offsetHeight * frac}px`;
    line.style.left = `${cell.offsetLeft}px`;
    line.style.width = `${cell.offsetWidth}px`;
    grid.appendChild(line);
  }

  /* ---------- 课程列表 ---------- */
  function renderCourses() {
    const view = $('#v-courses');
    const groups = new Map();
    state.entries.slice().sort((a, b) => a.day - b.day || a.start - b.start).forEach((e) => {
      if (!groups.has(e.name)) groups.set(e.name, []);
      groups.get(e.name).push(e);
    });
    const list = Array.from(groups.entries()).map(([name, es]) => {
      const teachers = Array.from(new Set(es.map((e) => e.teacher).filter(Boolean))).join('、');
      return `<section class="course" style="${colorVars(name)}">
        <div class="course-h"><span class="swatch"></span><h3>${esc(name)}</h3>${teachers ? `<span>${esc(teachers)}</span>` : ''}</div>
        ${es.map((e) => `<button class="slot" data-act="edit" data-id="${e.id}"><span class="when">${DAYS[e.day]} ${periodLabel(e)}</span><span class="rest">${esc([e.location, P.formatWeeks(e.weeks)].filter(Boolean).join(' · '))}</span>${I.right}</button>`).join('')}
      </section>`;
    }).join('');
    view.innerHTML = `
      <header class="page-head"><h1>课程</h1><button class="icon-btn" data-act="add" aria-label="添加课程">${I.plus}</button></header>
      <div class="scroll"><div class="page">
        ${state.entries.length ? `<p class="note" style="margin:0 4px 12px">共 ${groups.size} 门课、${state.entries.length} 个上课时段。点某个时段可以修改。</p>${list}` : '<p class="note" style="margin-top:12px">还没有课程。去“导入”页导入课表，或点右上角手动添加。</p>'}
      </div></div>`;
  }

  /* ---------- 导入页 ---------- */
  const SAMPLE = `高等数学 周一 1-2节 1-16周 A101 张伟
大学英语 周三 第3-4节 1-8,10-16周 外语楼203 李娜
线性代数 周五 5-6节 2-16周(双) B302
工程制图 周二 3-4节 C105；周四 1-2节 C105 1-12周`;

  const AI_PROMPT = `请把这张课表图片整理成 JSON 数组，每个上课时段一个对象，字段如下：
name：课程名
teacher：教师（没有就留空）
location：上课地点（没有就留空）
day：星期几，1-7（周一是 1）
start：开始节次
end：结束节次
weeks：上课周次，例如 "1-16"、"1-15单"、"2-16双"、"1-8,10-16"
同一门课一周上几次，就拆成几个对象。只输出 JSON，不要任何解释。`;

  async function renderImport() {
    const view = $('#v-import');
    const c1 = colorVars('表格'); const c2 = colorVars('截图'); const c3 = colorVars('文字');
    view.innerHTML = `
      <header class="page-head"><h1>导入课表</h1></header>
      <div class="scroll"><div class="page">
        <button class="way" data-act="pick-table" style="${c1}"><span class="ic">${I.table}</span><span>
          <h3>表格文件</h3><p>Excel、CSV，或教务系统导出的 .xls 网页表格。网格课表和“每行一门课”的列表都能认。</p></span></button>
        <button class="way" data-act="pick-image" style="${c2}"><span class="ic">${I.image}</span><span>
          <h3>课表截图</h3><p>教务系统或其他课表 App 的截图。识别在手机上完成，图片不会上传。</p>
          <span class="st" id="ocr-status">正在检查识别组件…</span></span></button>
        <section class="paste" style="${c3}">
          <h3>粘贴文字</h3>
          <p>每行一门课，或者一门课分几行写都行。写清课程名、星期、节次，周次和地点可选。</p>
          <textarea id="paste-text" placeholder="${esc(SAMPLE)}" aria-label="课表文字"></textarea>
          <div class="row"><button class="btn" data-act="parse-text">识别文字</button><button class="btn ghost" data-act="sample">填入示例</button></div>
          <details class="ai"><summary>${I.tri}截图太乱？让 AI 帮忙整理</summary>
            <p>把课表截图连同下面这段话发给任意 AI 助手，再把它回复的内容整段粘贴到上面的输入框，点“识别文字”。</p>
            <pre class="prompt" id="ai-prompt">${esc(AI_PROMPT)}</pre>
            <button class="btn ghost wide" data-act="copy-prompt">复制这段话</button>
          </details>
        </section>
        <p class="note">也可以用 iPhone 的“实况文本”：在相册里长按截图上的文字，选中后拷贝，再粘贴到上面。</p>
      </div></div>`;
    refreshOcrStatus();
  }

  async function refreshOcrStatus() {
    const el = $('#ocr-status');
    if (!el || !window.KBOCR) return;
    try {
      const st = await window.KBOCR.status();
      const mb = (st.total / 1048576).toFixed(1);
      if (st.ready) el.textContent = '识别组件已在手机上，可以离线识别';
      else if (st.noCache) el.textContent = '当前浏览器不支持离线缓存，识别时需要联网';
      else el.textContent = `第一次使用会下载约 ${mb} MB 识别组件，之后离线可用`;
    } catch (e) { el.textContent = ''; }
  }

  /* ---------- 设置页 ---------- */
  function renderSettings() {
    const view = $('#v-settings');
    const cw = currentWeek();
    const cwLabel = cw == null ? '未设置' : (cw < 1 ? '还没开学' : (cw > S.totalWeeks ? '学期已结束' : `第 ${cw} 周`));
    const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    const swOK = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    view.innerHTML = `
      <header class="page-head"><h1>设置</h1></header>
      <div class="scroll"><div class="page">
        <h2 class="group-title">学期</h2>
        <div class="group">
          <button class="item" data-act="pick-week"><span class="lbl">现在是</span><span class="val">${cwLabel}</span>${I.right}</button>
          <div class="item"><label class="lbl" for="set-start">第 1 周的周一</label><input type="date" id="set-start" value="${esc(S.startDate || '')}"></div>
          <div class="item"><span class="lbl">学期周数</span>${stepper('weeks', S.totalWeeks)}</div>
        </div>
        <h2 class="group-title">课表显示</h2>
        <div class="group">
          <div class="item"><span class="lbl">每天节数</span>${stepper('periods', S.periodsPerDay)}</div>
          <button class="item" data-act="edit-times"><span class="lbl">上课时间<small>${esc(S.periods[0].start)} 开始，第 ${S.periodsPerDay} 节 ${esc(S.periods[S.periodsPerDay - 1].end)} 下课</small></span>${I.right}</button>
          <div class="item"><span class="lbl">周末</span><div class="seg" role="group" aria-label="周末">
            ${[['auto', '自动'], ['show', '显示'], ['hide', '隐藏']].map(([k, t]) => `<button data-act="weekend" data-v="${k}" aria-pressed="${S.weekend === k}">${t}</button>`).join('')}
          </div></div>
          <div class="item"><label class="lbl" for="set-other">显示非本周的课<small>以虚线框显示在空位上</small></label><span class="switch"><input type="checkbox" id="set-other" ${S.showOther ? 'checked' : ''}><span></span></span></div>
        </div>
        <h2 class="group-title">数据</h2>
        <div class="group">
          <button class="item" data-act="export"><span class="lbl">导出备份<small>存成一个 .json 文件，换手机或重装时可以恢复</small></span>${I.right}</button>
          <button class="item" data-act="restore"><span class="lbl">从备份恢复</span>${I.right}</button>
          <button class="item" data-act="copy-text"><span class="lbl">复制为文字<small>发给同学，对方在“导入 → 粘贴文字”里就能导入</small></span>${I.right}</button>
          <button class="item danger" data-act="clear"><span class="lbl">清空所有课程</span></button>
        </div>
        <h2 class="group-title">离线</h2>
        <div class="group">
          <div class="item"><span class="lbl">应用本身</span><span class="val">${swOK ? '已存到手机，可离线打开' : (standalone ? '正在准备离线…' : '添加到主屏幕后可离线')}</span></div>
          <div class="item"><span class="lbl">图片识别组件<small id="ocr-st2">检查中…</small></span><button class="btn ghost" id="ocr-dl" data-act="ocr-download" hidden style="min-height:36px;padding:6px 14px;font-size:14px">下载</button></div>
        </div>
        <p class="note">所有课程只保存在这台手机上，不会上传到任何地方。建议偶尔导出一份备份。</p>
        <p class="note">版本 ${VERSION}</p>
      </div></div>`;
    $('#set-start').addEventListener('change', (ev) => {
      S.startDate = ev.target.value || null;
      save();
      ui.week = clampWeek(currentWeek() || 1);
      renderSettings();
    });
    $('#set-other').addEventListener('change', (ev) => { S.showOther = ev.target.checked; save(); });
    updateOcrSettingStatus();
  }

  async function updateOcrSettingStatus() {
    const el = $('#ocr-st2');
    const btn = $('#ocr-dl');
    if (!el || !window.KBOCR) return;
    const st = await window.KBOCR.status().catch(() => null);
    if (!st) { el.textContent = ''; return; }
    const mb = (st.total / 1048576).toFixed(1);
    if (st.ready) { el.textContent = `已下载（${mb} MB），可离线识别`; btn.hidden = true; } else if (st.noCache) { el.textContent = '这个浏览器不支持离线缓存'; btn.hidden = true; } else { el.textContent = `未下载，约 ${mb} MB`; btn.hidden = false; }
  }

  function stepper(key, val) {
    return `<div class="stepper"><button data-act="step" data-k="${key}" data-d="-1" aria-label="减少">−</button><output class="num" id="st-${key}">${val}</output><button data-act="step" data-k="${key}" data-d="1" aria-label="增加">+</button></div>`;
  }

  /* ---------- 底部弹层 ---------- */
  function openSheet(opts) {
    const root = document.createElement('div');
    root.className = 'sheet-root';
    root.innerHTML = `<div class="sheet-dim"></div><div class="sheet${opts.tall ? ' tall' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title || '')}">
      <div class="grab"></div>
      <div class="sheet-h"><h2>${opts.titleHTML || esc(opts.title || '')}</h2><button class="icon-btn" data-act="x" aria-label="关闭">${I.close}</button></div>
      <div class="sheet-b"></div>${opts.footer != null ? '<div class="sheet-f"></div>' : ''}</div>`;
    document.body.appendChild(root);
    const sheet = $('.sheet', root);
    const body = $('.sheet-b', root);
    const foot = $('.sheet-f', root);
    let closed = false;
    const api = {
      root, body, foot, sheet,
      set(html) { body.innerHTML = html; },
      setFooter(html) { if (foot) foot.innerHTML = html; },
      close(result) {
        if (closed) return;
        closed = true;
        root.classList.add('closing');
        sheet.classList.add('closing');
        setTimeout(() => root.remove(), 200);
        opts.onClose && opts.onClose(result);
        document.removeEventListener('keydown', onKey);
      },
    };
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    if (foot && typeof opts.footer === 'string') foot.innerHTML = opts.footer;
    const onKey = (ev) => { if (ev.key === 'Escape') api.close(); };
    document.addEventListener('keydown', onKey);
    $('.sheet-dim', root).addEventListener('click', () => { if (!opts.modal) api.close(); });
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b || !root.contains(b)) return;
      if (b.dataset.act === 'x') { api.close(); return; }
      if (opts.on && opts.on[b.dataset.act]) opts.on[b.dataset.act](b, ev, api);
    });
    // 下拉关闭
    let sy = null;
    const grabArea = [$('.grab', root), $('.sheet-h', root)];
    grabArea.forEach((g) => {
      g.addEventListener('touchstart', (ev) => { sy = ev.touches[0].clientY; }, { passive: true });
      g.addEventListener('touchmove', (ev) => { if (sy == null) return; const dy = ev.touches[0].clientY - sy; if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
      g.addEventListener('touchend', (ev) => {
        if (sy == null) return;
        const dy = ev.changedTouches[0].clientY - sy;
        sy = null;
        if (dy > 90 && !opts.modal) api.close(); else sheet.style.transform = '';
      });
    });
    setTimeout(() => { const f = $('.sheet-h .icon-btn', root); if (f && !opts.noFocus) f.focus({ preventScroll: true }); }, 50);
    return api;
  }

  function confirmSheet(title, message, okLabel, danger) {
    return new Promise((resolve) => {
      let done = false;
      openSheet({
        title,
        body: `<p style="margin:0 2px 6px;color:var(--ink-2)">${esc(message)}</p>`,
        footer: `<button class="btn ghost" data-act="no">取消</button><button class="btn${danger ? ' danger' : ''}" data-act="yes">${esc(okLabel)}</button>`,
        on: { yes: (b, ev, api) => { done = true; resolve(true); api.close(); }, no: (b, ev, api) => api.close() },
        onClose: () => { if (!done) resolve(false); },
      });
    });
  }

  let toastTimer = null;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2600);
  }

  /* ---------- 课程详情 ---------- */
  function openDetail(ids) {
    const list = ids.map((id) => state.entries.find((e) => e.id === id)).filter(Boolean);
    if (!list.length) return;
    if (list.length > 1) {
      const sh = openSheet({
        title: '这个时间有多门课',
        body: list.map((e) => `<button class="rv" style="width:100%;border:0;${colorVars(e.name)}" data-act="one" data-id="${e.id}"><span class="body"><span class="t"><span class="swatch"></span>${esc(e.name)}</span><span class="s">${esc([periodLabel(e), e.location, P.formatWeeks(e.weeks)].filter(Boolean).join(' · '))}</span></span>${I.right}</button>`).join(''),
        on: { one: (b) => { sh.close(); openDetail([b.dataset.id]); } },
      });
      return;
    }
    const e = list[0];
    const w = ui.week;
    const inWeek = e.weeks.includes(w);
    const sh = openSheet({
      title: '',
      body: `<div class="detail" style="${colorVars(e.name)}">
        <span class="hl">${esc(e.name)}</span>
        <dl>
          <dt>时间</dt><dd>${DAYS[e.day]} ${periodLabel(e)}<br><span class="num" style="color:var(--ink-2)">${timeLabel(e)}</span></dd>
          ${e.location ? `<dt>地点</dt><dd>${esc(e.location)}</dd>` : ''}
          ${e.teacher ? `<dt>教师</dt><dd>${esc(e.teacher)}</dd>` : ''}
          <dt>周次</dt><dd>${P.formatWeeks(e.weeks)}${inWeek ? '' : `<br><span style="color:var(--redpen)">第 ${w} 周没有这节课</span>`}</dd>
          ${e.note ? `<dt>备注</dt><dd style="white-space:pre-wrap">${esc(e.note)}</dd>` : ''}
        </dl></div>`,
      footer: '<button class="btn ghost" data-act="del">删除</button><button class="btn" data-act="edit">编辑</button>',
      on: {
        edit: () => { sh.close(); editStored(e.id); },
        del: async () => {
          sh.close();
          if (await confirmSheet('删除这节课？', `${e.name}，${DAYS[e.day]} ${periodLabel(e)}。同名课程的其他时段不受影响。`, '删除', true)) {
            state.entries = state.entries.filter((x) => x.id !== e.id);
            assignColors(); save(); renderAll(); toast('已删除');
          }
        },
      },
    });
  }

  /* ---------- 编辑 ---------- */
  function editStored(id, preset) {
    const existing = id ? state.entries.find((e) => e.id === id) : null;
    const draft = existing ? Object.assign({}, existing, { weeks: existing.weeks.slice() }) : Object.assign({
      name: '', teacher: '', location: '', day: 1, start: 1, end: 2, weeks: P.expandWeeks(`1-${Math.min(16, S.totalWeeks)}`), note: '',
    }, preset || {});
    openEditor(draft, {
      title: existing ? '编辑课程' : '添加课程',
      canDelete: !!existing,
      onSave: (d) => {
        const clean = cleanEntry(d);
        if (existing) {
          const oldName = existing.name;
          Object.assign(existing, clean, { id: existing.id });
          if (oldName !== clean.name && state.colors[clean.name] == null && state.colors[oldName] != null && !state.entries.some((e) => e.name === oldName)) state.colors[clean.name] = state.colors[oldName];
        } else state.entries.push(clean);
        if (d._color != null) state.colors[clean.name] = d._color;
        fitSettingsTo([clean]);
        assignColors(); save(); renderAll();
        toast(existing ? '已保存' : '已添加');
      },
      onDelete: async () => {
        if (await confirmSheet('删除这节课？', `${existing.name}，${DAYS[existing.day]} ${periodLabel(existing)}`, '删除', true)) {
          state.entries = state.entries.filter((x) => x.id !== existing.id);
          assignColors(); save(); renderAll(); toast('已删除');
          return true;
        }
        return false;
      },
    });
  }

  function openEditor(draft, opts) {
    const d = Object.assign({}, draft, { weeks: (draft.weeks || []).slice() });
    if (d.day == null) d.day = 1;
    if (d.start == null) d.start = 1;
    if (d.end == null || d.end < d.start) d.end = d.start;
    const TW = Math.max(S.totalWeeks, ...d.weeks);
    const NP = Math.max(S.periodsPerDay, d.end);
    const curColor = state.colors[d.name] != null ? state.colors[d.name] : null;
    const pOpts = (sel) => Array.from({ length: NP }, (_, i) => `<option value="${i + 1}"${i + 1 === sel ? ' selected' : ''}>第 ${i + 1} 节</option>`).join('');
    const body = `
      <div class="field"><label for="ed-name">课程名</label><input type="text" id="ed-name" value="${esc(d.name === '未命名课程' ? '' : d.name)}" placeholder="例如：高等数学" autocomplete="off"></div>
      <div class="two">
        <div class="field"><label for="ed-loc">地点</label><input type="text" id="ed-loc" value="${esc(d.location)}" placeholder="可不填" autocomplete="off"></div>
        <div class="field"><label for="ed-tea">教师</label><input type="text" id="ed-tea" value="${esc(d.teacher)}" placeholder="可不填" autocomplete="off"></div>
      </div>
      <div class="field"><span class="label">星期</span><div class="days-pick" role="group" aria-label="星期">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<button data-act="day" data-v="${i}" aria-pressed="${d.day === i}">${DAY_SHORT[i]}</button>`).join('')}</div></div>
      <div class="field"><span class="label">节次</span><div class="range"><select id="ed-s" aria-label="开始节次">${pOpts(d.start)}</select><span>到</span><select id="ed-e" aria-label="结束节次">${pOpts(d.end)}</select></div></div>
      <div class="field"><span class="label" id="wk-label">周次 · ${P.formatWeeks(d.weeks)}</span>
        <div class="weeks-pick" role="group" aria-labelledby="wk-label">${Array.from({ length: TW }, (_, i) => `<button data-act="wk" data-v="${i + 1}" aria-pressed="${d.weeks.includes(i + 1)}">${i + 1}</button>`).join('')}</div>
        <div class="quick"><button data-act="wq" data-v="all">全选</button><button data-act="wq" data-v="odd">单周</button><button data-act="wq" data-v="even">双周</button><button data-act="wq" data-v="none">清空</button></div>
      </div>
      <div class="field"><span class="label">颜色</span><div class="colors" role="group" aria-label="颜色">${PALETTE.map((c, i) => `<button data-act="color" data-v="${i}" style="--cbg:${isDark() ? c.dbg : c.bg}" aria-label="颜色 ${i + 1}" aria-pressed="${curColor === i}"></button>`).join('')}</div></div>
      <div class="field"><label for="ed-note">备注</label><textarea id="ed-note" placeholder="可不填">${esc(d.note || '')}</textarea></div>`;
    const sh = openSheet({
      title: opts.title || '编辑课程',
      tall: true,
      noFocus: true,
      body,
      footer: `${opts.canDelete ? '<button class="btn ghost" data-act="del">删除</button>' : '<button class="btn ghost" data-act="x">取消</button>'}<button class="btn" data-act="save">保存</button>`,
      on: {
        day: (b) => { d.day = +b.dataset.v; $$('[data-act="day"]', sh.body).forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.v === d.day))); },
        wk: (b) => {
          const v = +b.dataset.v;
          d.weeks = d.weeks.includes(v) ? d.weeks.filter((x) => x !== v) : d.weeks.concat(v).sort((a, c) => a - c);
          b.setAttribute('aria-pressed', String(d.weeks.includes(v)));
          $('#wk-label', sh.body).textContent = `周次 · ${P.formatWeeks(d.weeks)}`;
        },
        wq: (b) => {
          const all = Array.from({ length: TW }, (_, i) => i + 1);
          const v = b.dataset.v;
          d.weeks = v === 'all' ? all : v === 'odd' ? all.filter((x) => x % 2) : v === 'even' ? all.filter((x) => !(x % 2)) : [];
          $$('[data-act="wk"]', sh.body).forEach((x) => x.setAttribute('aria-pressed', String(d.weeks.includes(+x.dataset.v))));
          $('#wk-label', sh.body).textContent = `周次 · ${P.formatWeeks(d.weeks)}`;
        },
        color: (b) => { d._color = +b.dataset.v; $$('[data-act="color"]', sh.body).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); },
        del: async () => { if (await opts.onDelete()) sh.close(); },
        save: () => {
          d.name = $('#ed-name', sh.body).value.trim();
          d.location = $('#ed-loc', sh.body).value.trim();
          d.teacher = $('#ed-tea', sh.body).value.trim();
          d.note = $('#ed-note', sh.body).value.trim();
          d.start = +$('#ed-s', sh.body).value;
          d.end = +$('#ed-e', sh.body).value;
          if (!d.name) { toast('先填课程名'); $('#ed-name', sh.body).focus(); return; }
          if (d.end < d.start) { toast('结束节次不能早于开始节次'); return; }
          if (!d.weeks.length) { toast('至少选一周'); return; }
          d.incomplete = false;
          opts.onSave(d);
          sh.close();
        },
      },
    });
    const s = $('#ed-s', sh.body);
    const e = $('#ed-e', sh.body);
    s.addEventListener('change', () => { if (+e.value < +s.value) e.value = Math.min(NP, +s.value + 1); });
    if (!d.name || d.name === '未命名课程') setTimeout(() => $('#ed-name', sh.body).focus(), 320);
  }

  /* ---------- 周次选择 ---------- */
  function openWeekPicker() {
    let sel = ui.week;
    const cw = currentWeek();
    const render = () => `
      <p class="note" style="margin:0 2px 12px">${S.startDate ? `第 1 周从 ${cnDate(startMonday())} 开始。` : '还没设置周次。选中现在所在的周，点“设为本周”。'}</p>
      <div class="wk-grid">${Array.from({ length: S.totalWeeks }, (_, i) => {
        const w = i + 1;
        return `<button data-act="w" data-v="${w}" aria-pressed="${w === sel}">${w}${w === cw ? '<small>本周</small>' : ''}</button>`;
      }).join('')}</div>`;
    const foot = () => `<button class="btn ghost" data-act="setcur">设为本周</button><button class="btn" data-act="view">查看第 ${sel} 周</button>`;
    const sh = openSheet({
      title: '选择周次',
      body: render(),
      footer: foot(),
      on: {
        w: (b) => { sel = +b.dataset.v; sh.set(render()); sh.setFooter(foot()); },
        view: () => { ui.week = sel; sh.close(); renderSchedule(); },
        setcur: () => {
          setCurrentWeek(sel);
          ui.week = sel;
          sh.close();
          renderAll();
          toast(`已设为第 ${sel} 周，第 1 周从 ${cnDate(startMonday())} 开始`);
        },
      },
    });
  }

  /* ---------- 上课时间 ---------- */
  function openTimes() {
    const render = () => `
      <div class="group">${S.periods.slice(0, S.periodsPerDay).map((p, i) => `
        <div class="item"><span class="lbl">第 ${i + 1} 节</span>
        <input type="time" data-i="${i}" data-k="start" value="${esc(p.start)}" aria-label="第${i + 1}节上课"> <span style="color:var(--ink-3)">–</span>
        <input type="time" data-i="${i}" data-k="end" value="${esc(p.end)}" aria-label="第${i + 1}节下课"></div>`).join('')}
      </div>
      <p class="note">改了第一节的时间后，可以用“按第 1 节推算”把后面的节次按每节 45 分钟、课间 10 分钟排好，再单独改午休和晚饭的空档。</p>`;
    const sh = openSheet({
      title: '上课时间',
      tall: true,
      body: render(),
      footer: '<button class="btn ghost" data-act="reset">恢复默认</button><button class="btn ghost" data-act="auto">按第 1 节推算</button>',
      on: {
        reset: () => { S.periods = P.DEFAULT_PERIODS.map((p) => ({ start: p.start, end: p.end })); ensurePeriods(); save(); sh.set(render()); renderAll(); },
        auto: () => {
          let t = toMin(S.periods[0].start);
          for (let i = 0; i < S.periodsPerDay; i++) { S.periods[i] = { start: fromMin(t), end: fromMin(t + 45) }; t += 55; }
          save(); sh.set(render()); renderAll();
        },
      },
    });
    sh.body.addEventListener('change', (ev) => {
      const inp = ev.target;
      if (!inp.matches('input[type="time"]') || !inp.value) return;
      S.periods[+inp.dataset.i][inp.dataset.k] = inp.value;
      save(); renderSchedule();
    });
  }

  /* ---------- 导入：表格 ---------- */
  function parseCtx() { return { totalWeeks: S.totalWeeks, periods: S.periods.slice(0, Math.max(S.periodsPerDay, 12)) }; }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('组件加载失败，请联网后重试一次'));
      document.head.appendChild(s);
    });
  }

  async function readText(file) {
    const buf = await file.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); } catch (e) {
      try { return new TextDecoder('gb18030').decode(buf); } catch (e2) { return new TextDecoder('utf-8').decode(buf); }
    }
  }

  function scoreEntries(list) { return list.filter((e) => !e.incomplete).length * 2 + list.length * 0.1; }

  async function handleTableFile(file) {
    const name = file.name.toLowerCase();
    const ctx = parseCtx();
    const prog = progressSheet('正在读取表格…');
    try {
      let res = null;
      if (/\.json$/.test(name)) { prog.close(); return handleJSONText(await readText(file)); }
      if (/\.(csv|tsv|txt)$/.test(name)) {
        const text = await readText(file);
        const lines = text.split(/\r?\n/).slice(0, 20).join('\n');
        const delim = /\t/.test(lines) ? '\t' : ((lines.match(/;/g) || []).length > (lines.match(/,/g) || []).length ? ';' : ',');
        res = P.parseRows(P.parseDelimited(text, delim), [], ctx);
        if (!res.entries.length) res = P.parseAny(text, ctx);
      } else {
        if (!window.XLSX) await loadScript('vendor/xlsx.full.min.js');
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type: 'array', cellText: true, cellDates: false });
        wb.SheetNames.forEach((sn) => {
          const ws = wb.Sheets[sn];
          if (!ws || !ws['!ref']) return;
          const range = window.XLSX.utils.decode_range(ws['!ref']);
          const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: true });
          const merges = (ws['!merges'] || []).map((m) => ({ s: { r: m.s.r - range.s.r, c: m.s.c - range.s.c }, e: { r: m.e.r - range.s.r, c: m.e.c - range.s.c } }));
          const r = P.parseRows(rows, merges, ctx);
          if (!res || scoreEntries(r.entries) > scoreEntries(res.entries)) res = Object.assign(r, { sheet: sn });
        });
      }
      prog.close();
      if (!res || !res.entries.length) {
        await infoSheet('没认出课程', '这个表格里没找到能识别的课程。表格需要有“星期一…星期五”这样的表头，或者有“课程名称、星期、节次”这样的列。也可以把内容复制出来，用“粘贴文字”导入。');
        return;
      }
      openReview(res.entries, { source: 'table', mode: res.mode, label: file.name });
    } catch (e) {
      prog.close();
      await infoSheet('读取失败', `${e.message || e}。可以试试另存为 .xlsx 或 .csv 再导入。`);
    }
  }

  /* ---------- 导入：图片 ---------- */
  function progressSheet(text) {
    let cancelled = false;
    const sh = openSheet({
      title: '',
      modal: true,
      noFocus: true,
      body: `<div class="progress">${I.scribble}<p id="pg-text">${esc(text)}</p><div class="bar indet" id="pg-bar"><i></i></div></div>`,
      footer: '<button class="btn ghost" data-act="cancel">取消</button>',
      on: { cancel: (b, ev, api) => { cancelled = true; api.close(); if (window.KBOCR && window.KBOCR.cancel) window.KBOCR.cancel(); } },
    });
    $('.sheet-h .icon-btn', sh.root).hidden = true;
    return {
      update(t, frac) {
        const p = $('#pg-text', sh.root);
        const bar = $('#pg-bar', sh.root);
        if (p && t) p.textContent = t;
        if (bar) {
          if (frac == null) bar.classList.add('indet');
          else { bar.classList.remove('indet'); $('i', bar).style.width = `${Math.round(frac * 100)}%`; }
        }
      },
      close() { sh.close(); },
      get cancelled() { return cancelled; },
    };
  }

  function infoSheet(title, msg) {
    return new Promise((resolve) => {
      openSheet({
        title, body: `<p style="margin:0 2px 6px;color:var(--ink-2)">${esc(msg)}</p>`,
        footer: '<button class="btn" data-act="ok">好</button>',
        on: { ok: (b, ev, api) => api.close() },
        onClose: resolve,
      });
    });
  }

  async function ensureOcrReady(prog) {
    const st = await window.KBOCR.status();
    if (st.ready) return true;
    if (!navigator.onLine) {
      prog.close();
      await infoSheet('需要联网一次', `图片识别组件还没存到手机上（约 ${(st.total / 1048576).toFixed(1)} MB）。连上网络后再试一次，下载完以后就能离线识别了。也可以先用“粘贴文字”导入。`);
      return false;
    }
    prog.update('第一次使用，正在下载识别组件…', 0);
    await window.KBOCR.download((f) => prog.update(`第一次使用，正在下载识别组件… ${Math.round(f * 100)}%`, f));
    return true;
  }

  async function handleImageFile(file) {
    const prog = progressSheet('正在准备…');
    try {
      if (!(await ensureOcrReady(prog))) return;
      if (prog.cancelled) return;
      const settings = Object.assign({}, S, { periods: S.periods.slice(0, Math.max(12, S.periodsPerDay)) });
      const res = await window.KBOCR.recognize(file, settings, (t, f) => prog.update(t, f));
      if (prog.cancelled) return;
      prog.close();
      refreshOcrStatus();
      if (!res.entries.length) {
        await infoSheet('没认出课程', '这张图里没找到能识别的课程。截图时尽量只截课表部分、字别太小；也可以试试下面的“让 AI 帮忙整理”。');
        return;
      }
      openReview(res.entries, { source: 'image', mode: res.mode, text: res.text, rowsFound: res.rowsFound });
    } catch (e) {
      if (prog.cancelled) return;
      prog.close();
      await infoSheet('识别失败', `${e.message || e}。可以换一张更清晰的截图再试。`);
    }
  }

  /* ---------- 导入：文字 / JSON ---------- */
  async function handleJSONText(text) {
    const j = P.parseJSON(text, parseCtx());
    if (j && j.isBackup) return restoreBackup(text);
    if (!j || !j.entries.length) { await infoSheet('没认出课程', '这段 JSON 里没有找到课程。'); return; }
    openReview(j.entries, { source: 'text', mode: 'json' });
  }

  async function handleText(text) {
    if (!text.trim()) { toast('先粘贴课表文字'); return; }
    const res = P.parseAny(text, parseCtx());
    if (res.mode === 'json' && res.isBackup) return restoreBackup(text);
    if (!res.entries.length) {
      await infoSheet('没认出课程', '没找到能识别的课程。每门课至少写上课程名、星期和节次，例如“高等数学 周一 1-2节”。');
      return;
    }
    openReview(res.entries, { source: 'text', mode: res.mode, text });
  }

  /* ---------- 导入预览 ---------- */
  function openReview(entries, info) {
    const items = P.dedupe(entries.map((e) => Object.assign({}, e))).map((e) => ({ e, on: !e.incomplete }));
    const hasExisting = state.entries.length > 0;
    let mode = 'replace';
    let weekGuess = null;
    if (!S.startDate) {
      const g = guessStartDate();
      weekGuess = Math.min(Math.max(1, Math.round((mondayOf(new Date()) - g) / 6048e5) + 1), 30);
    }
    const srcLabel = { table: '表格', image: '截图', text: '文字' }[info.source] || '';
    const modeNote = info.source === 'image'
      ? (info.mode === 'grid' ? (info.rowsFound ? '已按表头的星期和左侧的节次还原。' : '没找到左侧的节次编号，节次是按位置估的，请核对。') : '没找到星期表头，按文字内容识别。')
      : (info.mode === 'grid' ? '按网格课表识别。' : info.mode === 'list' ? '按列表识别。' : '');

    const fullWeeks = P.expandWeeks(`1-${S.totalWeeks}`).join(',');
    const noWeeks = items.length > 0 && items.every((it) => (it.e.weeks || []).join(',') === fullWeeks);
    const render = () => {
      const bad = items.filter((it) => it.e.incomplete).length;
      const byDay = {};
      items.forEach((it, i) => { const k = it.e.day || 0; (byDay[k] = byDay[k] || []).push(i); });
      const keys = Object.keys(byDay).map(Number).sort((a, b) => (a || 9) - (b || 9));
      return `
        <p class="rv-sum">从${srcLabel}${info.label ? `「${esc(info.label)}」` : ''}里找到 ${items.length} 个上课时段。${modeNote}点一行可以修改。${noWeeks ? '原文里没写周次，先按整个学期每周都上处理，导入后也能改。' : ''}</p>
        ${bad ? `<div class="rv-warn">有 ${bad} 条缺少信息，默认不导入。点进去补全后会自动勾上。</div>` : ''}
        ${keys.map((k) => `<div class="rv-day">${k ? DAYS[k] : '缺少星期'}</div>${byDay[k].sort((a, b) => (items[a].e.start || 0) - (items[b].e.start || 0)).map((i) => {
          const it = items[i];
          const e = it.e;
          const miss = [];
          if (!e.day) miss.push('星期');
          if (!e.start) miss.push('节次');
          if (!e.weeks || !e.weeks.length) miss.push('周次');
          if (!e.name || e.name === '未命名课程') miss.push('课程名');
          const sub = [e.start ? periodLabel(e) : '', e.location, e.teacher, e.weeks && e.weeks.length ? P.formatWeeks(e.weeks) : ''].filter(Boolean).join(' · ');
          return `<div class="rv${it.on ? '' : ' off'}" style="${colorVars(e.name)}">
            <input type="checkbox" data-i="${i}" ${it.on ? 'checked' : ''} ${e.incomplete ? 'disabled' : ''} aria-label="导入 ${esc(e.name)}">
            <button class="body" data-act="rv-edit" data-i="${i}"><span class="t"><span class="swatch"></span>${esc(e.name)}</span>
            <span class="s">${miss.length ? `<span class="bad">缺${miss.join('、')}</span> · ` : ''}${esc(sub)}${e.guessedPeriods ? ' · 节次为估计' : ''}</span></button>${I.right}</div>`;
        }).join('')}`).join('')}
        ${hasExisting ? `<h3 class="group-title">导入方式</h3><div class="seg" role="group" aria-label="导入方式" style="width:max-content">
          <button data-act="mode" data-v="replace" aria-pressed="${mode === 'replace'}">替换现有课表</button><button data-act="mode" data-v="append" aria-pressed="${mode === 'append'}">加到现有课表</button></div>` : ''}
        ${!S.startDate ? `<h3 class="group-title">现在是第几周？</h3><div class="group"><div class="item"><span class="lbl">本周是<small id="rv-start">第 1 周从 ${cnDate(addDays(mondayOf(new Date()), -(weekGuess - 1) * 7))} 开始</small></span>${stepper('rvweek', weekGuess)}</div></div>` : ''}
        ${info.text ? `<details class="raw"><summary>查看识别到的原文</summary><pre>${esc(info.text)}</pre></details>` : ''}`;
    };
    const footer = () => {
      const n = items.filter((it) => it.on && !it.e.incomplete).length;
      return `<button class="btn ghost" data-act="x">取消</button><button class="btn" data-act="go" ${n ? '' : 'disabled'}>导入 ${n} 个时段</button>`;
    };
    const sh = openSheet({
      title: '确认导入',
      tall: true,
      noFocus: true,
      body: render(),
      footer: footer(),
      on: {
        'rv-edit': (b) => {
          const it = items[+b.dataset.i];
          openEditor(Object.assign({}, it.e, { day: it.e.day || 1, start: it.e.start || 1, end: it.e.end || it.e.start || 1, weeks: it.e.weeks && it.e.weeks.length ? it.e.weeks : P.expandWeeks(`1-${S.totalWeeks}`) }), {
            title: '修改识别结果',
            canDelete: true,
            onSave: (d) => { it.e = Object.assign(it.e, d, { incomplete: false, guessedPeriods: false }); it.on = true; refresh(); },
            onDelete: async () => { items.splice(items.indexOf(it), 1); refresh(); return true; },
          });
        },
        mode: (b) => { mode = b.dataset.v; refresh(); },
        step: (b) => {
          if (b.dataset.k !== 'rvweek') return;
          weekGuess = Math.min(30, Math.max(1, weekGuess + +b.dataset.d));
          refresh();
        },
        go: () => {
          const chosen = items.filter((it) => it.on && !it.e.incomplete).map((it) => cleanEntry(it.e));
          if (!chosen.length) return;
          if (!S.startDate && weekGuess) setCurrentWeek(weekGuess);
          fitSettingsTo(chosen);
          const merged = P.dedupe(mode === 'append' ? state.entries.concat(chosen) : chosen).map(cleanEntry);
          state.entries = merged;
          if (mode === 'replace') state.colors = {};
          assignColors();
          save();
          sh.close();
          ui.week = clampWeek(currentWeek() || 1);
          switchTab('schedule');
          toast(`已导入 ${chosen.length} 个上课时段`);
        },
      },
    });
    function refresh() {
      const st = sh.body.scrollTop;
      sh.set(render());
      sh.setFooter(footer());
      sh.body.scrollTop = st;
    }
    sh.body.addEventListener('change', (ev) => {
      if (ev.target.matches('input[type="checkbox"][data-i]')) { items[+ev.target.dataset.i].on = ev.target.checked; refresh(); }
    });
  }

  /* ---------- 备份 ---------- */
  async function exportBackup() {
    const data = JSON.stringify({ app: 'kebiao', version: 1, exportedAt: new Date().toISOString(), settings: S, colors: state.colors, entries: state.entries }, null, 1);
    const fname = `课表备份-${fmtDate(new Date())}.json`;
    const file = new File([data], fname, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '课表备份' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  async function restoreBackup(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { await infoSheet('文件打不开', '这不是有效的备份文件。'); return; }
    if (!d || d.app !== 'kebiao' || !Array.isArray(d.entries)) {
      const j = P.parseJSON(text, parseCtx());
      if (j && j.entries.length) { openReview(j.entries, { source: 'text', mode: 'json' }); return; }
      await infoSheet('文件打不开', '这不是课表的备份文件。');
      return;
    }
    const ok = await confirmSheet('从备份恢复？', `备份里有 ${d.entries.length} 个上课时段，会替换现在的全部课程和设置。`, '恢复', false);
    if (!ok) return;
    state.entries = d.entries.map(cleanEntry);
    state.colors = d.colors || {};
    Object.keys(S).forEach((k) => delete S[k]);
    Object.assign(S, defaults(), d.settings || {});
    ensurePeriods();
    assignColors();
    save();
    ui.week = clampWeek(currentWeek() || 1);
    renderAll();
    toast('已恢复');
  }

  function entriesAsText() {
    return state.entries.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh') || a.day - b.day || a.start - b.start)
      .map((e) => [e.name, DAYS[e.day], `${e.start}-${e.end}节`, P.formatWeeks(e.weeks), e.location, e.teacher].filter(Boolean).join(' ')).join('\n');
  }

  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      toast(ok ? okMsg : '复制失败，请手动选中复制');
    }
  }

  /* ---------- 全局事件 ---------- */
  function switchTab(tab) {
    ui.tab = tab;
    ['schedule', 'courses', 'import', 'settings'].forEach((t) => { $(`#v-${t}`).hidden = t !== tab; });
    $$('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ui.armed = null;
    renderTab();
  }

  function renderTab() {
    if (ui.tab === 'schedule') renderSchedule();
    else if (ui.tab === 'courses') renderCourses();
    else if (ui.tab === 'import') renderImport();
    else renderSettings();
  }
  function renderAll() { renderTab(); }

  function changeWeek(delta) {
    const nw = clampWeek(ui.week + delta);
    if (nw === ui.week) { toast(delta > 0 ? `已经是最后一周（第 ${S.totalWeeks} 周）` : '已经是第 1 周'); return; }
    ui.week = nw;
    ui.armed = null;
    renderSchedule();
    const g = $('#grid');
    if (g && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      g.animate([{ transform: `translateX(${delta > 0 ? 28 : -28}px)`, opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  const actions = {
    'pick-week': openWeekPicker,
    prev: () => changeWeek(-1),
    next: () => changeWeek(1),
    'go-today': () => { ui.week = clampWeek(currentWeek() || 1); renderSchedule(); },
    add: () => editStored(null, ui.tab === 'schedule' && ui.armed ? { day: ui.armed.day, start: ui.armed.p, end: Math.min(S.periodsPerDay, ui.armed.p + 1) } : null),
    cell: (b) => {
      const day = +b.dataset.day;
      const p = +b.dataset.p;
      if (ui.armed && ui.armed.day === day && ui.armed.p === p) {
        ui.armed = null;
        b.classList.remove('armed');
        editStored(null, { day, start: p, end: Math.min(S.periodsPerDay, p + 1) });
        return;
      }
      $$('.cell.armed').forEach((c) => c.classList.remove('armed'));
      ui.armed = { day, p };
      b.classList.add('armed');
    },
    open: (b) => openDetail(b.dataset.ids.split(',')),
    edit: (b) => editStored(b.dataset.id),
    dismiss: (b) => { S.dismissed[b.dataset.key] = true; save(); renderSchedule(); },
    'goto-import': () => switchTab('import'),
    'pick-table': () => $('#f-table').click(),
    'pick-image': () => $('#f-image').click(),
    'parse-text': () => handleText($('#paste-text').value),
    sample: () => { $('#paste-text').value = SAMPLE; },
    'copy-prompt': () => copyText(AI_PROMPT, '已复制，去发给 AI 吧'),
    step: (b) => {
      const k = b.dataset.k;
      const d = +b.dataset.d;
      if (k === 'weeks') S.totalWeeks = Math.min(60, Math.max(1, S.totalWeeks + d));
      else if (k === 'periods') { S.periodsPerDay = Math.min(20, Math.max(1, S.periodsPerDay + d)); ensurePeriods(); } else return;
      ui.week = clampWeek(ui.week);
      save();
      renderSettings();
    },
    weekend: (b) => { S.weekend = b.dataset.v; save(); renderSettings(); },
    'edit-times': openTimes,
    export: exportBackup,
    restore: () => $('#f-backup').click(),
    'copy-text': () => { if (!state.entries.length) { toast('还没有课程'); return; } copyText(entriesAsText(), '已复制课表文字'); },
    clear: async () => {
      if (!state.entries.length) { toast('课表已经是空的'); return; }
      if (await confirmSheet('清空所有课程？', `会删除全部 ${state.entries.length} 个上课时段，设置会保留。删除前可以先导出备份。`, '清空', true)) {
        state.entries = []; state.colors = {}; save(); renderAll(); toast('已清空');
      }
    },
    'ocr-download': async (b) => {
      if (!navigator.onLine) { toast('需要联网才能下载'); return; }
      b.disabled = true;
      const el = $('#ocr-st2');
      try {
        await window.KBOCR.download((f) => { if (el) el.textContent = `下载中… ${Math.round(f * 100)}%`; });
        toast('识别组件已下载');
      } catch (e) { toast('下载失败，请稍后再试'); }
      updateOcrSettingStatus();
    },
  };

  document.addEventListener('click', (ev) => {
    if (ev.target.closest('.sheet-root')) return;
    const b = ev.target.closest('[data-act]');
    if (b && actions[b.dataset.act]) { actions[b.dataset.act](b, ev); return; }
    if (ui.armed && !ev.target.closest('.cell')) { ui.armed = null; $$('.cell.armed').forEach((c) => c.classList.remove('armed')); }
  });

  $$('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  $('#f-table').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) handleTableFile(f); });
  $('#f-image').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) handleImageFile(f); });
  $('#f-backup').addEventListener('change', async (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) restoreBackup(await readText(f)); });

  // 左右滑动切换周
  let touch = null;
  document.addEventListener('touchstart', (ev) => {
    if (ui.tab !== 'schedule' || !ev.target.closest('#grid-wrap') || ev.touches.length !== 1) { touch = null; return; }
    touch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (ev) => {
    if (!touch) return;
    const dx = ev.changedTouches[0].clientX - touch.x;
    const dy = ev.changedTouches[0].clientY - touch.y;
    const dt = Date.now() - touch.t;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 700) changeWeek(dx < 0 ? 1 : -1);
  }, { passive: true });

  // 时间走动：每分钟更新“现在”这条线，跨天时重画
  let lastDay = new Date().getDate();
  setInterval(() => {
    if (new Date().getDate() !== lastDay) { lastDay = new Date().getDate(); if (ui.tab === 'schedule') renderSchedule(); return; }
    if (ui.tab === 'schedule') placeNowLine();
  }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ui.tab === 'schedule') renderSchedule(); });
  window.addEventListener('resize', () => { if (ui.tab === 'schedule') placeNowLine(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderTab());

  /* ---------- 离线 ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').then(() => {
      navigator.serviceWorker.ready.then(() => {
        if (ui.tab === 'settings') renderSettings();
        // 主屏幕 App 里自动把识别组件也存好，之后断网也能识别图片
        const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
        if (standalone && navigator.onLine && window.KBOCR) {
          window.KBOCR.status().then((st) => { if (!st.ready && !st.noCache) window.KBOCR.download(() => {}).then(refreshOcrStatus).catch(() => {}); });
        }
      });
    }).catch(() => {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  $$('.ti').forEach((sp) => { sp.outerHTML = I[sp.dataset.icon]; });
  window.__kb = { state, ui, render: renderAll, switchTab };
  renderSchedule();
})();
