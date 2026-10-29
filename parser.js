/*
 * 课表解析器：把文字 / 表格 / JSON 变成课程条目
 * 条目格式：{ name, teacher, location, day(1-7), start, end, weeks:[周次], incomplete? }
 * 浏览器里挂在 window.KBParser，Node 里 module.exports。
 */
(function (root) {
  'use strict';

  /* ---------- 基础工具 ---------- */

  const DAY_CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7, 七: 7 };
  const DAY_EN = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
  const CN_DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const DEFAULT_PERIODS = [
    ['08:00', '08:45'], ['08:55', '09:40'], ['10:00', '10:45'], ['10:55', '11:40'],
    ['14:00', '14:45'], ['14:55', '15:40'], ['16:00', '16:45'], ['16:55', '17:40'],
    ['19:00', '19:45'], ['19:55', '20:40'], ['20:50', '21:35'], ['21:45', '22:30'],
  ].map(([start, end]) => ({ start, end }));

  function cnNum(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (s === '十') return 10;
    const i = s.indexOf('十');
    if (i >= 0) {
      const a = s.slice(0, i);
      const b = s.slice(i + 1);
      return (a ? CN_DIGIT[a] : 1) * 10 + (b ? CN_DIGIT[b] : 0);
    }
    return CN_DIGIT[s];
  }

  function convertCnChunk(chunk) {
    const toks = chunk.match(/[一二三四五六七八九两]?十[一二三四五六七八九]?|[一二三四五六七八九两零〇]|\d+/g);
    return toks ? toks.map(cnNum).join(',') : chunk;
  }

  function convertCnSeq(inner) {
    return inner.split(/([-、,\s至到]+)/).map((p, i) => (i % 2 ? p.replace(/[至到]/g, '-') : convertCnChunk(p))).join('');
  }

  function normalize(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    s = s.replace(/[　 ]/g, ' ').replace(/[​-‍﻿]/g, '');
    s = s.replace(/[【〔［]/g, '[').replace(/[】〕］]/g, ']').replace(/[「『《]/g, '').replace(/[」』》]/g, '');
    s = s.replace(/[—–‐‑‒−―~〜～]/g, '-');
    s = s.replace(/\r\n?/g, '\n');
    s = s.replace(/(\d)\s*[至到]\s*(\d)/g, '$1-$2');
    s = s.replace(/第([一二三四五六七八九十两零〇、,\-\s至到]+?)(大节|小节|节|周)/g,
      (m, inner, suf) => '第' + convertCnSeq(inner) + suf);
    return s;
  }

  function range(a, b) {
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }

  function uniqSorted(arr) {
    return Array.from(new Set(arr)).filter((n) => n >= 1 && n <= 60).sort((a, b) => a - b);
  }

  /** "1-8,10-16" + 单/双 → [1..8,10..16] */
  function expandWeeks(spec, parity) {
    let out = [];
    String(spec).split(/[,、;]/).forEach((part) => {
      const m = part.match(/(\d{1,2})\s*(?:-\s*(\d{1,2}))?/);
      if (!m) return;
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      out = out.concat(range(Math.min(a, b), Math.max(a, b)));
    });
    out = uniqSorted(out);
    if (parity === '单') out = out.filter((n) => n % 2 === 1);
    if (parity === '双') out = out.filter((n) => n % 2 === 0);
    return out;
  }

  /** [1,3,5..15] → "1-15周(单)" */
  function formatWeeks(weeks) {
    if (!weeks || !weeks.length) return '无周次';
    const w = uniqSorted(weeks);
    if (w.length > 2) {
      const par = w[0] % 2;
      let step2 = true;
      for (let i = 1; i < w.length; i++) if (w[i] - w[i - 1] !== 2) { step2 = false; break; }
      if (step2 && w.every((n) => n % 2 === par)) return `${w[0]}-${w[w.length - 1]}周(${par ? '单' : '双'})`;
    }
    const runs = [];
    let s = w[0];
    let p = w[0];
    for (let i = 1; i <= w.length; i++) {
      if (i < w.length && w[i] === p + 1) { p = w[i]; continue; }
      runs.push(s === p ? `${s}` : `${s}-${p}`);
      if (i < w.length) { s = w[i]; p = w[i]; }
    }
    return runs.join(',') + '周';
  }

  function toMinutes(t) {
    const m = String(t).match(/(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  }

  function timeRangeToPeriods(t1, t2, periods) {
    const ps = periods && periods.length ? periods : DEFAULT_PERIODS;
    const a = toMinutes(t1);
    const b = toMinutes(t2);
    if (a == null || b == null) return null;
    let start = 1;
    let end = 1;
    let best = Infinity;
    ps.forEach((p, i) => {
      const d = Math.abs(toMinutes(p.start) - a);
      if (d < best) { best = d; start = i + 1; }
    });
    best = Infinity;
    ps.forEach((p, i) => {
      const d = Math.abs(toMinutes(p.end) - b);
      if (d < best) { best = d; end = i + 1; }
    });
    if (end < start) end = start;
    return { start, end };
  }

  /* ---------- 词语分类 ---------- */

  const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付傅方白邹孟熊秦邱江尹薛闫阎段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤常温康施文牛樊葛邢安齐易乔伍庞颜倪庄聂章鲁岳翟殷詹申欧耿关兰焦俞左柳甘祝包宁尚符舒阮柯纪梅童凌毕单季裴霍涂成苗谷盛曲翁冉骆蓝路游辛靳管柴蒙鲍华喻祁蒲房滕屈饶解牟艾尤阳时穆农司卓古吉缪简车项连芦麦褚娄窦戚岑景党宫费卜冷晏席卫米柏宗瞿桂全佟应臧闵苟邬边卞姬师和仇栾隋商刁沙荣巫寇桑郎甄丛仲虞敖巩明佘池查麻苑迟邝封练尉蔺宣岳郁';
  const COMPOUND_SURNAMES = ['欧阳', '司马', '诸葛', '上官', '慕容', '东方', '夏侯', '皇甫', '尉迟', '公孙', '令狐', '长孙', '宇文', '司徒', '端木', '独孤', '南宫'];
  const COURSE_KW = /(论|概|纲|原|课|语|设计|实验|实习|实训|基础|技术|工程|分析|方法|应用|导论|系统|管理|经济|政治|思想|理论|数学|物理|化学|历史|体育|艺术|美术|音乐|法律|法学|计算|程序|电|机械|力学|材料|控制|信号|网络|数据|算法|结构|制图|汽车|车辆|测试|通信|生物|医|心理|教育|形势|政策|军事|写作|文学|地理|哲学|逻辑|统计|会计|金融|营销|安全|环境|能源|热|流体|振动|传感|模拟|数字|微积|嵌入|操作|编程|软件|硬件|创新|创业|职业|就业|规划|健康|劳动|实践|训练|研讨|专题|选讲|前沿|综合|英语|日语|德语|法语|代数|几何|概率|离散|优化|仿真|建模|测量|动力|构造|原理|制造|工艺|自动|智能|与|及|和|的)/;

  function isChineseName(t) {
    return /^[一-龥·]{2,4}$/.test(t);
  }

  function personLike(t) {
    if (!isChineseName(t)) return false;
    if (COURSE_KW.test(t) || weakLoc(t)) return false;
    if (COMPOUND_SURNAMES.some((s) => t.startsWith(s))) return true;
    return SURNAMES.indexOf(t[0]) >= 0;
  }

  function teacherSuffix(t) {
    return /^[一-龥A-Za-z·]{1,8}(老师|教授|讲师|助教|副教授)$/.test(t);
  }

  function strongLoc(t) {
    if (/^(?:[A-Za-z]{1,4}[-#]?\d{1,4}[A-Za-z]?(?:[-#]\d{1,4})?|\d{1,2}[-#]\d{2,4}[A-Za-z]?|\d{3,4}[A-Za-z]?)$/.test(t)) return true;
    if (/\d/.test(t) && /[楼室馆厅座栋号#]|教[一二三四五六七八九十\d]|实验|机房|区|苑|院/.test(t)) return true;
    if (/(楼|室|馆|厅|机房|操场|体育场|球场|田径场|泳池|实验室|教室|报告厅|礼堂|中心|基地)$/.test(t)) return true;
    if (/^(教|综|理|文|工|科|实|主楼|东|西|南|北|逸夫|图书馆|体育)[^\s]{0,6}\d/.test(t) && t.length <= 12) return true;
    return false;
  }

  function weakLoc(t) {
    return /(楼|室|馆|厅|堂|场|中心|基地|校区|苑|教学|实验|机房)/.test(t);
  }

  function isJunk(t) {
    if (!t) return true;
    if (t.length <= 1) return true;
    if (/^[\d.]+$/.test(t)) return true;
    if (!/[一-龥A-Za-z0-9]/.test(t)) return true;
    if (/^[(\[]?[A-Za-z]{0,4}\d{5,}[A-Za-z\d\-.]*[)\]]?$/.test(t)) return true;
    if (/\d{4}-\d{4}/.test(t)) return true;
    if (/^(必修|选修|限选|任选|公选|必选|考试|考查|理论|实验|实践|上机|讲课|讲授|网课|线上|线下|校本部|本部|主校区|[东南西北新老本]校区|理论课|实验课|学分|学时|周学时|总学时|上午|下午|中午|晚上|晚间|早上|午休|午间|课程|无)$/.test(t)) return true;
    if (/^\d+(\.\d+)?(学分|学时|分|人|节|周|课时)$/.test(t)) return true;
    if (/^\d+班$/.test(t)) return true;
    if (/^(节次|时间|星期|周次|课表|课程表|上课时间)$/.test(t)) return true;
    if (/^[\u4e00-\u9fa5]{1,6}:/.test(t)) return true;
    return false;
  }

  function cleanName(n) {
    n = String(n || '');
    n = n.replace(/[◇◆★☆●○■□▲△※✓✔✿❀♦♢•·*#]+/g, '').trim();
    n = n.replace(/[(\[][^()\[\]]*\d{4,}[^()\[\]]*[)\]]\s*$/, '').trim();
    n = n.replace(/[(\[](理论|实验|实践|上机|必修|选修|讲课|讲授)[)\]]\s*$/, '').trim();
    n = n.replace(/^[-_:,.;。@]+|[-_:,.;。@]+$/g, '').trim();
    return n;
  }

  const TITLE_JUNK = /(课表|课程表|学期|学年|姓名|学号|专业|班级|打印|时间段|节次|星期)/;

  /* ---------- 单行解析 ---------- */

  const LABEL_RE = /(课程学时组成|课程名称|课程代码|课程编号|课程性质|课程类别|课程名|课程号|课程|科目|课名|任课教师|授课教师|主讲教师|上课教师|任课老师|教师|老师|上课地点|教学地点|上课教室|地点|教室|场地|位置|教学班组成|教学班名称|教学班|校区|考核方式|考试方式|选课备注|学分|周学时|总学时|学时|上课班级|班级|选课人数|人数|开课学院|备注)\s*:/g;
  const LABEL_KIND = (l) => {
    if (/^(课程名称|课程名|课程|科目|课名)$/.test(l)) return 'name';
    if (/(教师|老师)$/.test(l)) return 'teacher';
    if (/^(上课地点|教学地点|上课教室|地点|教室|场地|位置)$/.test(l)) return 'location';
    return 'ignore';
  };

  function trimBrackets(t) {
    t = t.trim();
    for (let k = 0; k < 3; k++) {
      if (/^[(\[]/.test(t) && !/[)\]]/.test(t)) t = t.slice(1);
      if (/[)\]]$/.test(t) && !/[(\[]/.test(t)) t = t.slice(0, -1);
      const mm = t.match(/^[(\[]([^()\[\]]*)[)\]]$/);
      if (mm) t = mm[1];
      t = t.trim();
    }
    return t;
  }

  function mask(str, a, b) {
    return str.slice(0, a) + ' '.repeat(b - a) + str.slice(b);
  }

  function parseLine(line, opts) {
    opts = opts || {};
    let s = ' ' + normalize(line).replace(/\n/g, ' ') + ' ';

    // 带标签的时间字段先改写成无标签写法
    s = s.replace(/(?:上课)?周次\s*:\s*([\d\s,、\-]+)/g, (m, v) => ' ' + v.trim() + '周 ');
    s = s.replace(/(?:上课)?节次\s*:\s*([\d\s,、\-]+)/g, (m, v) => ' 第' + v.trim() + '节 ');
    s = s.replace(/(?:上课)?(?:星期|周几)\s*:\s*([一二三四五六日天七1-7])/g, (m, v) => ' 星期' + v + ' ');
    s = s.replace(/(?:上课)?时间\s*:/g, ' ');

    const events = [];
    let m;

    // 周次
    const RE_WEEK = /第?\s*(\d{1,2}(?:\s*-\s*\d{1,2})?(?:\s*[,、]\s*\d{1,2}(?:\s*-\s*\d{1,2})?)*)\s*(?:[(\[]\s*([单双])?\s*周\s*[)\]]|([单双])?\s*周(?!次|数|学时|几))(?:\s*[(\[]\s*([单双])\s*周?\s*[)\]])?/g;
    while ((m = RE_WEEK.exec(s))) {
      const parity = m[2] || m[3] || m[4] || null;
      const nextCh = s[m.index + m[0].length] || '';
      if (/[A-Za-z0-9]/.test(s[m.index - 1] || '')) { RE_WEEK.lastIndex = m.index + 1; continue; }
      if (/\s周$/.test(m[0]) && /[一二三四五六日天七]/.test(nextCh)) continue;
      events.push({ type: 'weeks', pos: m.index, spec: m[1], parity });
      s = mask(s, m.index, m.index + m[0].length);
      RE_WEEK.lastIndex = m.index + m[0].length;
    }

    // 节次
    const RE_PERIOD = /(第\s*|\[\s*|\(\s*)?(\d{1,2}(?:\s*[-,、]\s*\d{1,2})*)\s*(小|大)?节(?!\s*\/\s*周)(?!课)/g;
    while ((m = RE_PERIOD.exec(s))) {
      const prefix = m[1];
      const body = m[2];
      const before = s.slice(Math.max(0, m.index - 1), m.index);
      if (!/[-,、]/.test(body) && !prefix) continue;
      if (/[共每]/.test(before)) continue;
      if (!prefix && /[A-Za-z0-9]/.test(before)) { RE_PERIOD.lastIndex = m.index + 1; continue; }
      const nums = body.split(/\s*[-,、]\s*/).map((x) => parseInt(x, 10)).filter((x) => x > 0 && x < 30);
      if (!nums.length) continue;
      let start = Math.min.apply(null, nums);
      let end = Math.max.apply(null, nums);
      if (m[3] === '大') { start = start * 2 - 1; end = end * 2; }
      events.push({ type: 'period', pos: m.index, start, end });
      s = mask(s, m.index, m.index + m[0].length);
    }

    // 时间段 08:00-09:35
    const RE_TIME = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
    while ((m = RE_TIME.exec(s))) {
      const p = timeRangeToPeriods(m[1], m[2], opts.periods);
      if (p) events.push({ type: 'period', pos: m.index, start: p.start, end: p.end, fromTime: true });
      s = mask(s, m.index, m.index + m[0].length);
    }

    // 星期（以及紧跟着的“1-2”这种不带“节”的节次）
    const RE_DAY = /(星期|礼拜|周)\s*([一二三四五六日天七1-7])|\b(mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)(?:day|nesday|sday|rsday|urday)?\.?(?![a-z])/gi;
    while ((m = RE_DAY.exec(s))) {
      let day = null;
      if (m[3]) day = DAY_EN[m[3].toLowerCase().slice(0, 3)];
      else if (/\d/.test(m[2])) {
        const after = s.slice(m.index + m[0].length, m.index + m[0].length + 2);
        if (m[1] === '周' && /^\s*\d|^[\d\-,、]/.test(after)) continue;
        const prev = s.slice(Math.max(0, m.index - 1), m.index);
        if (m[1] === '周' && /[\d\-]/.test(prev)) continue;
        day = parseInt(m[2], 10);
      } else day = DAY_CN[m[2]];
      if (!day) continue;
      events.push({ type: 'day', pos: m.index, day });
      let endIdx = m.index + m[0].length;
      const rest = s.slice(endIdx);
      const bare = rest.match(/^\s*(?:第\s*)?(\d{1,2})\s*[-,、]\s*(\d{1,2})((?:\s*[-,、]\s*\d{1,2})*)(?!\s*\d)(?!\s*[(\[]?\s*[单双]?\s*周(?![一二三四五六日天七]))/);
      if (bare) {
        const nums = (bare[1] + ',' + bare[2] + bare[3]).split(/\s*[-,、]\s*/).map((x) => parseInt(x, 10)).filter((x) => x > 0);
        events.push({ type: 'period', pos: endIdx, start: Math.min.apply(null, nums), end: Math.max.apply(null, nums) });
        s = mask(s, endIdx, endIdx + bare[0].length);
      }
      s = mask(s, m.index, endIdx);
    }

    // 单独的“单周/双周”
    const RE_PAR = /([单双])周/g;
    while ((m = RE_PAR.exec(s))) {
      events.push({ type: 'parity', pos: m.index, parity: m[1] });
      s = mask(s, m.index, m.index + m[0].length);
    }

    // 带标签的文字字段
    const labeled = { name: null, teacher: null, location: null };
    const labels = [];
    LABEL_RE.lastIndex = 0;
    while ((m = LABEL_RE.exec(s))) labels.push({ idx: m.index, end: m.index + m[0].length, kind: LABEL_KIND(m[1]) });
    for (let i = labels.length - 1; i >= 0; i--) {
      const L = labels[i];
      const stop = i + 1 < labels.length ? labels[i + 1].idx : s.length;
      let raw = s.slice(L.end, stop);
      const cut = raw.search(/[\/;|\n{}]/);
      const valEnd = cut >= 0 ? L.end + cut : stop;
      const val = s.slice(L.end, valEnd).trim();
      if (L.kind === 'location' && val) events.push({ type: 'location', pos: L.idx, text: val });
      else if (L.kind !== 'ignore' && val && !labeled[L.kind]) labeled[L.kind] = val;
      s = mask(s, L.idx, valEnd);
    }

    // @地点
    const RE_AT = /@\s*([^\s\/|;,@]+)/g;
    while ((m = RE_AT.exec(s))) {
      events.push({ type: 'location', pos: m.index, text: m[1] });
      s = mask(s, m.index, m.index + m[0].length);
    }

    // 剩下的词
    const tokens = [];
    const RE_TOK = /[^\s\/|\\;,、{}<>]+/g;
    while ((m = RE_TOK.exec(s))) {
      const t = trimBrackets(m[0]);
      // “D402周杰”“外语楼203李娜”“高等数学A101”这种粘在一起的，拆开
      const glued = t.match(/^(.*\d[A-Za-z]?)([\u4e00-\u9fa5·]{2,4})$/);
      if (glued && strongLoc(glued[1]) && personLike(glued[2])) {
        tokens.push({ text: glued[1], pos: m.index });
        tokens.push({ text: glued[2], pos: m.index + glued[1].length });
        continue;
      }
      const glued2 = t.match(/^([\u4e00-\u9fa5]{2,})([A-Za-z]{1,3}-?\d[\w\-#]*)$/);
      if (glued2 && !weakLoc(glued2[1]) && strongLoc(glued2[2])) {
        tokens.push({ text: glued2[1], pos: m.index });
        tokens.push({ text: glued2[2], pos: m.index + glued2[1].length });
        continue;
      }
      if (!isJunk(t)) tokens.push({ text: t, pos: m.index });
    }

    let name = labeled.name ? cleanName(labeled.name) : null;
    let teacher = labeled.teacher || null;
    const teachers = teacher ? [teacher] : [];
    const rest = [];
    tokens.forEach((tk) => {
      if (teacherSuffix(tk.text)) { teachers.push(tk.text); return; }
      if (strongLoc(tk.text)) { events.push({ type: 'location', pos: tk.pos, text: tk.text }); return; }
      rest.push(tk);
    });
    const rest2 = [];
    let nameEnd = -1;
    rest.forEach((tk) => {
      if (!name) {
        const n = cleanName(tk.text);
        if (n && !isJunk(n)) { name = n; nameEnd = tk.pos + tk.text.length; }
        return;
      }
      // 英文课程名里有空格：把紧挨着的英文单词接上
      if (nameEnd >= 0 && /^[A-Za-z][A-Za-z+#&.'\-]*$/.test(tk.text) && /[A-Za-z]$/.test(name) &&
          /^\s{1,2}$/.test(s.slice(nameEnd, tk.pos)) && !/^(weeks?|room|teacher|period)$/i.test(tk.text)) {
        name += ' ' + tk.text; nameEnd = tk.pos + tk.text.length; return;
      }
      nameEnd = -1;
      rest2.push(tk);
    });
    const leftovers = [];
    rest2.forEach((tk) => {
      if (personLike(tk.text)) teachers.push(tk.text);
      else leftovers.push(tk);
    });
    if (!events.some((e) => e.type === 'location')) {
      const wl = leftovers.find((tk) => weakLoc(tk.text));
      if (wl) {
        events.push({ type: 'location', pos: wl.pos, text: wl.text });
        leftovers.splice(leftovers.indexOf(wl), 1);
      }
    }
    teacher = teachers.length ? Array.from(new Set(teachers)).join(',') : null;

    // 按出现顺序把事件组装成时段
    events.sort((a, b) => a.pos - b.pos);
    const slots = [];
    let cur = null;
    const pending = { weeks: null, parity: null, location: null };
    const newSlot = () => {
      cur = { day: null, start: null, end: null, weeks: null, parity: null, location: null, dayInherited: false };
      if (pending.weeks) { cur.weeks = pending.weeks; pending.weeks = null; }
      if (pending.parity) { cur.parity = pending.parity; pending.parity = null; }
      if (pending.location) { cur.location = pending.location; pending.location = null; }
      slots.push(cur);
      return cur;
    };
    events.forEach((ev) => {
      if (ev.type === 'day') {
        if (cur && (cur.day == null || cur.dayInherited) && !(cur.day != null && cur.start == null)) {
          cur.day = ev.day; cur.dayInherited = false;
        } else { newSlot(); cur.day = ev.day; }
      } else if (ev.type === 'period') {
        if (cur && cur.start == null) { cur.start = ev.start; cur.end = ev.end; }
        else {
          const prevDay = cur ? cur.day : null;
          newSlot();
          cur.start = ev.start; cur.end = ev.end;
          if (prevDay != null) { cur.day = prevDay; cur.dayInherited = true; }
        }
      } else if (ev.type === 'weeks') {
        const w = { spec: ev.spec, parity: ev.parity };
        if (cur && cur.weeks == null) cur.weeks = w;
        else if (cur && cur.weeks && (cur.day != null || cur.start != null)) {
          // 同一时段的第二段周次，例如“1-8周,10-16周”——先挂起，最后合并
          pending.weeks = pending.weeks ? { spec: pending.weeks.spec + ',' + ev.spec, parity: pending.weeks.parity || ev.parity } : w;
        } else pending.weeks = w;
      } else if (ev.type === 'parity') {
        if (cur && !cur.parity) cur.parity = ev.parity; else pending.parity = ev.parity;
      } else if (ev.type === 'location') {
        if (cur && cur.location == null) cur.location = ev.text;
        else if (!cur) pending.location = ev.text;
        else pending.location = ev.text;
      }
    });
    if (pending.weeks || pending.parity || pending.location) {
      if (!slots.length) newSlot();
      else {
        const last = slots[slots.length - 1];
        if (pending.weeks) {
          if (last.weeks) last.weeks = { spec: last.weeks.spec + ',' + pending.weeks.spec, parity: last.weeks.parity || pending.weeks.parity };
          else last.weeks = pending.weeks;
        }
        if (pending.parity && !last.parity) last.parity = pending.parity;
        if (pending.location && !last.location) last.location = pending.location;
      }
    }

    return {
      name: name || null,
      teacher,
      slots,
      tokCount: tokens.length,
      leftovers: leftovers.map((t) => t.text),
    };
  }

  /* ---------- 多行文字 ---------- */

  function slotHasTime(s) { return s.day != null || s.start != null; }

  function fillSlot(target, s) {
    ['day', 'start', 'end', 'weeks', 'parity', 'location'].forEach((k) => {
      if (target[k] == null && s[k] != null) target[k] = s[k];
    });
  }

  function mergeInto(cur, p) {
    if (p.teacher && !cur.teacher) cur.teacher = p.teacher;
    p.slots.forEach((s) => {
      const last = cur.slots[cur.slots.length - 1];
      if (!slotHasTime(s)) {
        if (last) fillSlot(last, s);
        else cur.slots.push(Object.assign({}, s));
        return;
      }
      if (last && !slotHasTime(last)) { fillSlot(s, last); cur.slots[cur.slots.length - 1] = s; return; }
      if (last && ((last.day == null && s.day != null && s.start == null) || (last.start == null && s.start != null && s.day == null))) {
        fillSlot(last, s); return;
      }
      cur.slots.push(s);
    });
  }

  function finalizeRecord(rec, ctx, out) {
    if (!rec) return;
    const totalWeeks = ctx.totalWeeks || 20;
    let slots = rec.slots.slice();
    if (!slots.length) slots = [{ day: null, start: null, end: null, weeks: null, parity: null, location: null }];
    const timed = slots.filter(slotHasTime);
    // 没有星期也没有节次的“属性时段”合并进有时间的时段
    if (timed.length) {
      slots.filter((s) => !slotHasTime(s)).forEach((s) => timed.forEach((t) => fillSlot(t, s)));
      slots = timed;
    }
    // 缺周次/地点的时段，向邻近时段借
    slots.forEach((s, i) => {
      if (!s.weeks) {
        const nb = slots.slice(i + 1).find((x) => x.weeks) || slots.slice(0, i).reverse().find((x) => x.weeks);
        if (nb) s.weeks = nb.weeks;
      }
      if (!s.location) {
        const nb = slots.slice(i + 1).find((x) => x.location) || slots.slice(0, i).reverse().find((x) => x.location);
        if (nb) s.location = nb.location;
      }
    });
    const name = rec.name ? cleanName(rec.name) : '';
    const anyTime = slots.some(slotHasTime) || ctx.day != null;
    if (!name && !anyTime) return;
    if (name && !anyTime && !rec.teacher && !slots.some((s) => s.weeks || s.location) && TITLE_JUNK.test(name)) return;
    slots.forEach((s) => {
      const day = s.day != null ? s.day : (ctx.day != null ? ctx.day : null);
      let start = s.start;
      let end = s.end;
      if (start == null && ctx.start != null) { start = ctx.start; end = ctx.end != null ? ctx.end : ctx.start; }
      let weeks;
      if (s.weeks) weeks = expandWeeks(s.weeks.spec, s.weeks.parity || s.parity);
      else weeks = expandWeeks(`1-${totalWeeks}`, s.parity);
      const entry = {
        name: name || '未命名课程',
        teacher: rec.teacher || '',
        location: s.location || '',
        day: day,
        start: start,
        end: end != null ? Math.max(end, start || 0) : start,
        weeks,
      };
      entry.incomplete = !name || entry.day == null || entry.start == null || !weeks.length;
      out.push(entry);
    });
  }

  function isSeparatorLine(line) {
    return /^\s*[-=_*~·.。]{3,}\s*$/.test(line);
  }

  function parseText(text, ctx) {
    ctx = ctx || {};
    const out = [];
    const lines = normalize(text).split('\n');
    let cur = null;
    const flush = () => { finalizeRecord(cur, ctx, out); cur = null; };
    const newRec = (p) => ({ name: p.name, teacher: p.teacher, slots: p.slots.slice() });

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { if (cur) flush(); return; }
      if (isSeparatorLine(line)) { flush(); return; }
      const p = parseLine(line, ctx);
      if (!p.name && !p.teacher && !p.slots.length) return;
      const pHasTime = p.slots.some(slotHasTime);
      if (p.name) {
        if (cur && cur.name) {
          const curHasTime = cur.slots.some(slotHasTime);
          // “高等数学 / 周一 1-2节 A101 张伟”“… / D402 周杰”：这一行的“名字”其实是老师
          if (!cur.teacher && personLike(p.name) && p.tokCount <= 2 && (!curHasTime || !pHasTime)) {
            cur.teacher = p.name;
            mergeInto(cur, Object.assign({}, p, { teacher: null }));
            return;
          }
          if (p.tokCount === 1 && !pHasTime) {
            const locish = weakLoc(p.name) && !personLike(p.name);
            if (!locish && !cur.teacher && (personLike(p.name) || (!curHasTime && isChineseName(p.name) && !COURSE_KW.test(p.name)))) {
              cur.teacher = p.name;
              mergeInto(cur, Object.assign({}, p, { teacher: null }));
              return;
            }
            if (locish) {
              const last = cur.slots[cur.slots.length - 1];
              if (!last) { cur.slots.push({ day: null, start: null, end: null, weeks: null, parity: null, location: p.name }); return; }
              if (!last.location) { last.location = p.name; return; }
            }
          }
          flush();
          cur = newRec(p);
        } else if (cur) {
          cur.name = p.name;
          mergeInto(cur, p);
        } else cur = newRec(p);
      } else if (!cur) cur = newRec(p);
      else {
        // 已经有完整时段的课程又来一个带时间的行：可能是同一门课的另一个时段
        mergeInto(cur, p);
      }
    });
    flush();
    return out;
  }

  /* ---------- 表格 ---------- */

  function cellStr(v) {
    if (v == null) return '';
    return String(v).replace(/\r\n?/g, '\n').trim();
  }

  function dayOfHeader(text) {
    const t = normalize(text).replace(/\s+/g, '');
    let m = t.match(/^(?:星期|礼拜|周)([一二三四五六日天七])/);
    if (m) return DAY_CN[m[1]];
    m = t.match(/^星期([1-7])/);
    if (m) return parseInt(m[1], 10);
    m = t.match(/^(mon|tue|wed|thu|fri|sat|sun)/i);
    if (m) return DAY_EN[m[1].toLowerCase()];
    m = t.match(/^[一二三四五六日]$/);
    if (m) return DAY_CN[m[0]];
    return null;
  }

  function periodsOfLabel(text, ctx) {
    const t = normalize(text).replace(/\s+/g, ' ');
    let m = t.match(/第\s*(\d{1,2})\s*大节/);
    if (m) { const n = parseInt(m[1], 10); return { start: n * 2 - 1, end: n * 2 }; }
    m = t.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    let fromTime = null;
    if (m) fromTime = timeRangeToPeriods(m[1], m[2], ctx.periods);
    const t2 = t.replace(/\d{1,2}:\d{2}/g, ' ');
    m = t2.match(/(\d{1,2})\s*[-,、]\s*(\d{1,2})(?:\s*[-,、]\s*(\d{1,2}))?(?:\s*[-,、]\s*(\d{1,2}))?/);
    if (m) {
      const nums = m.slice(1).filter(Boolean).map((x) => parseInt(x, 10));
      return { start: Math.min.apply(null, nums), end: Math.max.apply(null, nums) };
    }
    m = t2.match(/(\d{1,2})/);
    if (m && parseInt(m[1], 10) <= 20) { const n = parseInt(m[1], 10); return { start: n, end: n }; }
    m = t2.trim().match(/^(?:第)?([一二三四五六七八九十]{1,3})(?:节)?$/);
    if (m) { const n = cnNum(m[1]); if (n) return { start: n, end: n }; }
    if (fromTime) return fromTime;
    return null;
  }

  function buildMergeLookup(merges) {
    const map = new Map();
    (merges || []).forEach((mg) => {
      for (let r = mg.s.r; r <= mg.e.r; r++) {
        for (let c = mg.s.c; c <= mg.e.c; c++) map.set(r + ',' + c, mg);
      }
    });
    return map;
  }

  function parseGrid(rows, merges, hr, dayCols, ctx) {
    const out = [];
    const mlook = buildMergeLookup(merges);
    const firstDayCol = Math.min.apply(null, dayCols.map((d) => d.c));
    const body = [];
    for (let r = hr + 1; r < rows.length; r++) body.push(r);

    // 每一行对应的节次
    const rowP = {};
    body.forEach((r) => {
      let label = '';
      for (let c = 0; c < firstDayCol; c++) {
        let v = cellStr(rows[r][c]);
        const mg = mlook.get(r + ',' + c);
        if (!v && mg) v = cellStr((rows[mg.s.r] || [])[mg.s.c]);
        label += ' ' + v;
      }
      rowP[r] = { label: label.trim(), p: periodsOfLabel(label, ctx) };
    });
    // 同一标签覆盖多行（如合并的“第1-2节”占两行），按行拆开
    let i = 0;
    while (i < body.length) {
      const r = body[i];
      const p = rowP[r].p;
      let j = i;
      while (j + 1 < body.length && rowP[body[j + 1]].p && p && rowP[body[j + 1]].label === rowP[r].label) j++;
      const n = j - i + 1;
      if (p && n > 1 && p.end - p.start + 1 === n) {
        for (let k = 0; k < n; k++) rowP[body[i + k]].p = { start: p.start + k, end: p.start + k };
      }
      i = j + 1;
    }
    const anyP = body.some((r) => rowP[r].p);
    if (!anyP) {
      const contentRows = body;
      const per = contentRows.length <= 6 ? 2 : 1;
      contentRows.forEach((r, k) => { rowP[r].p = { start: k * per + 1, end: k * per + per }; });
    } else {
      let lastEnd = 0;
      body.forEach((r) => {
        if (rowP[r].p) lastEnd = rowP[r].p.end;
        else rowP[r].p = null;
        rowP[r].after = lastEnd;
      });
    }

    dayCols.forEach(({ c, day }) => {
      let r = hr + 1;
      while (r < rows.length) {
        const mg = mlook.get(r + ',' + c);
        let text = cellStr(rows[r][c]);
        let r1 = r;
        if (mg && mg.s.r === r && mg.s.c === c) {
          r1 = mg.e.r;
        } else if (mg && (mg.s.r !== r || mg.s.c !== c)) {
          r++;
          continue;
        }
        if (!text) { r = r1 + 1; continue; }
        // 没合并但相邻格内容相同 → 视为连续的一节课
        while (!mg && r1 + 1 < rows.length && cellStr(rows[r1 + 1][c]) === text && !mlook.get((r1 + 1) + ',' + c)) r1++;
        const ps = [];
        for (let k = r; k <= r1; k++) if (rowP[k] && rowP[k].p) ps.push(rowP[k].p);
        let start = null;
        let end = null;
        if (ps.length) {
          start = Math.min.apply(null, ps.map((p) => p.start));
          end = Math.max.apply(null, ps.map((p) => p.end));
        } else if (rowP[r] && rowP[r].after != null) {
          start = rowP[r].after + 1; end = start;
        }
        const entries = parseText(text, Object.assign({}, ctx, { day, start, end }));
        entries.forEach((e) => {
          if (e.day == null) e.day = day;
          e.incomplete = !e.name || e.name === '未命名课程' || e.day == null || e.start == null || !e.weeks.length;
          out.push(e);
        });
        r = r1 + 1;
      }
    });
    return out;
  }

  const COL_KW = {
    name: /^(课程名称|课程名|课程|科目|名称|课名|course|subject)/i,
    teacher: /(教师|老师|teacher|instructor|授课人)/i,
    location: /(地点|教室|场地|room|location|place|classroom)/i,
    day: /^(星期|星期几|周几|上课星期|day|weekday|日期)$/i,
    periods: /(节次|节|period|section|课节)/i,
    weeks: /(周次|周数|上课周|起止周|week)/i,
    time: /(上课时间|时间|time|时间地点|上课信息)/i,
  };

  function parseList(rows, merges, hr, cols, ctx) {
    const out = [];
    let lastName = '';
    let lastTeacher = '';
    for (let r = hr + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const get = (k) => (cols[k] != null ? cellStr(row[cols[k]]) : '');
      let name = get('name');
      const nonEmpty = row.some((v) => cellStr(v));
      if (!nonEmpty) continue;
      let dayV = get('day');
      let perV = get('periods');
      let wkV = get('weeks');
      const timeV = get('time');
      if (!name && (dayV || perV || timeV)) name = lastName;
      if (!name) continue;
      let teacher = get('teacher');
      if (!teacher && name === lastName) teacher = lastTeacher;
      const loc = get('location');
      if (dayV && /^[1-7]$/.test(dayV)) dayV = '星期' + dayV;
      else if (dayV && /^[一二三四五六日天]$/.test(dayV)) dayV = '星期' + dayV;
      if (perV && !/节/.test(perV) && /\d/.test(perV) && !/:/.test(perV)) perV = '第' + perV + '节';
      if (wkV && !/周/.test(wkV) && /\d/.test(wkV)) wkV = wkV + '周';
      const timeText = [dayV, perV, wkV, timeV].filter(Boolean).join(' ');
      const p = parseLine(timeText || '', ctx);
      const rec = { name, teacher: teacher || p.teacher, slots: p.slots };
      if (loc) {
        if (rec.slots.length) rec.slots.forEach((s) => { if (!s.location) s.location = loc; });
        else rec.slots.push({ day: null, start: null, end: null, weeks: null, parity: null, location: loc });
      }
      finalizeRecord(rec, ctx, out);
      lastName = name;
      lastTeacher = rec.teacher || '';
    }
    return out;
  }

  /** rows: 二维字符串数组；merges: [{s:{r,c},e:{r,c}}] */
  function parseRows(rows, merges, ctx) {
    ctx = ctx || {};
    rows = (rows || []).map((r) => (r || []).map(cellStr));
    // 网格式：某一行里有至少 3 个星期表头
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const dayCols = [];
      const seen = new Set();
      rows[r].forEach((v, c) => {
        const d = v && v.length <= 16 ? dayOfHeader(v) : null;
        if (d && !seen.has(d)) { seen.add(d); dayCols.push({ c, day: d }); }
      });
      if (dayCols.length >= 3) return { mode: 'grid', entries: parseGrid(rows, merges, r, dayCols, ctx) };
    }
    // 列表式：表头里有课程名列和至少一列时间信息
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const cols = {};
      rows[r].forEach((v, c) => {
        const t = normalize(v).replace(/\s+/g, '');
        if (!t || t.length > 12) return;
        if (/^(课程代码|课程号|课程编号|课程性质|课程类别|课程类型)$/.test(t)) return;
        if (/时间/.test(t) && cols.time == null && !/^(星期|节次)/.test(t)) { cols.time = c; return; }
        for (const k of ['name', 'teacher', 'location', 'day', 'weeks', 'periods', 'time']) {
          if (cols[k] == null && COL_KW[k].test(t)) { cols[k] = c; break; }
        }
      });
      if (cols.name != null && (cols.day != null || cols.periods != null || cols.time != null || cols.weeks != null)) {
        return { mode: 'list', entries: parseList(rows, merges, r, cols, ctx) };
      }
    }
    // 都不像：每行当一行文字
    const text = rows.map((r) => r.filter(Boolean).join(' ')).join('\n');
    return { mode: 'text', entries: parseText(text, ctx) };
  }

  /* ---------- CSV / TSV ---------- */

  function parseDelimited(text, delim) {
    const rows = [];
    let row = [];
    let field = '';
    let q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
        } else field += ch;
      } else if (ch === '"' && field === '') q = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function looksDelimited(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return null;
    const tabs = lines.filter((l) => l.includes('\t')).length;
    if (tabs >= Math.max(2, lines.length * 0.5)) return '\t';
    const commaCounts = lines.slice(0, 10).map((l) => (l.match(/,/g) || []).length);
    const head = normalize(lines[0]);
    if (commaCounts[0] >= 2 && commaCounts.every((n) => n >= 1) && /(课程|星期|周一|节次|名称|course)/i.test(head)) return ',';
    return null;
  }

  /* ---------- JSON ---------- */

  function pick(o, keys) {
    for (const k of keys) if (o[k] != null && o[k] !== '') return o[k];
    return null;
  }

  function normalizeEntryLike(o, ctx) {
    const totalWeeks = ctx.totalWeeks || 20;
    const name = cleanName(pick(o, ['name', 'course', 'title', '课程', '课程名', '课程名称']) || '');
    const teacher = String(pick(o, ['teacher', '教师', '老师']) || '');
    const location = String(pick(o, ['location', 'room', 'place', '地点', '教室']) || '');
    let day = pick(o, ['day', 'weekday', '星期', 'dayOfWeek']);
    if (typeof day === 'string') {
      if (/^\d$/.test(day)) day = parseInt(day, 10);
      else { const p = parseLine(/^[一二三四五六日天]$/.test(day) ? '星期' + day : day, ctx); day = p.slots[0] ? p.slots[0].day : null; }
    }
    let start = pick(o, ['start', 'startSection', 'startPeriod', 'from']);
    let end = pick(o, ['end', 'endSection', 'endPeriod', 'to']);
    const per = pick(o, ['periods', 'sections', 'section', '节次']);
    if (start == null && per != null) {
      if (Array.isArray(per)) { start = Math.min.apply(null, per); end = Math.max.apply(null, per); }
      else {
        const nums = String(per).match(/\d+/g);
        if (nums) { start = Math.min.apply(null, nums.map(Number)); end = Math.max.apply(null, nums.map(Number)); }
      }
    }
    if (start == null) {
      const step = pick(o, ['step', 'length']);
      if (o.startNode != null) { start = o.startNode; end = start + (step || 1) - 1; }
    }
    start = start != null ? parseInt(start, 10) : null;
    end = end != null ? parseInt(end, 10) : start;
    let weeks = pick(o, ['weeks', 'week', '周次']);
    if (Array.isArray(weeks)) weeks = uniqSorted(weeks.map(Number));
    else if (weeks != null) {
      const w = normalize(String(weeks));
      const par = /单/.test(w) ? '单' : (/双/.test(w) ? '双' : null);
      weeks = expandWeeks(w.replace(/[^\d,、\-]/g, ' ').trim().replace(/\s+/g, ','), par);
    } else if (o.startWeek != null) {
      const par = o.type === 1 ? '单' : (o.type === 2 ? '双' : null);
      weeks = expandWeeks(`${o.startWeek}-${o.endWeek || o.startWeek}`, par);
    } else weeks = range(1, totalWeeks);
    const e = { name: name || '未命名课程', teacher, location, day: day != null ? parseInt(day, 10) : null, start, end: end != null ? Math.max(end, start || 0) : start, weeks };
    if (o.color) e.color = o.color;
    if (o.note) e.note = String(o.note);
    e.incomplete = !name || !(e.day >= 1 && e.day <= 7) || !(e.start >= 1) || !weeks.length;
    return e;
  }

  function parseJSON(text, ctx) {
    let data;
    try { data = JSON.parse(text); } catch (e) {
      const m = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!m) return null;
      try { data = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    let list = Array.isArray(data) ? data : (data.entries || data.courses || data.data || data.list || null);
    if (!Array.isArray(list)) return null;
    // 支持 {name, slots:[...]} 的嵌套写法
    const flat = [];
    list.forEach((o) => {
      if (o && Array.isArray(o.slots)) o.slots.forEach((s) => flat.push(Object.assign({}, o, s, { slots: undefined })));
      else if (o && typeof o === 'object') flat.push(o);
    });
    return { entries: flat.map((o) => normalizeEntryLike(o, ctx || {})), settings: data.settings || null, isBackup: !!(data.app === 'kebiao') };
  }

  /* ---------- 统一入口 ---------- */

  function parseAny(text, ctx) {
    ctx = ctx || {};
    const t = String(text || '').trim();
    if (!t) return { mode: 'empty', entries: [] };
    if (/^[\[{]/.test(t) || /```json/.test(t) || (/"name"\s*:/.test(t) && /[\[{]/.test(t))) {
      const j = parseJSON(t.replace(/```(?:json)?/g, ''), ctx);
      if (j) return Object.assign({ mode: 'json' }, j);
    }
    const delim = looksDelimited(t);
    if (delim) {
      const rows = parseDelimited(t, delim);
      const res = parseRows(rows, [], ctx);
      if (res.entries.length) return res;
    }
    return { mode: 'text', entries: parseText(t, ctx) };
  }

  /** 合并完全相同的条目（同名同时间），周次取并集 */
  function dedupe(entries) {
    const map = new Map();
    const out = [];
    entries.forEach((e) => {
      const k = [e.name, e.day, e.start, e.end, e.location, e.teacher].join('|');
      if (map.has(k)) {
        const x = map.get(k);
        x.weeks = uniqSorted(x.weeks.concat(e.weeks));
      } else { map.set(k, e); out.push(e); }
    });
    return out;
  }

  const api = {
    normalize, parseLine, parseText, parseRows, parseAny, parseJSON, parseDelimited,
    expandWeeks, formatWeeks, dedupe, timeRangeToPeriods, dayOfHeader, periodsOfLabel,
    personLike, strongLoc, DEFAULT_PERIODS, DAY_NAMES, cleanName,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KBParser = api;
})(typeof self !== 'undefined' ? self : this);
