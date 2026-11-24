// =====================================================================
//  نظام الجداول — النسخة النهائية المتكاملة (الداش بورد + الأزرار + الإحصائيات + طلبات الدكاترة)
// =====================================================================

const COLS = {
  day:       ['اليوم', 'day'],
  start:     ['وقت البداية', 'البداية', 'من الساعة', 'الوقت', 'startTime', 'time'],
  type:      ['النوع', 'نوع الحصة', 'type'],
  subject:   ['اسم المادة *', 'اسم المادة', 'subject'],
  hall:      ['القاعة', 'رقم القاعة', 'اسم القاعة', 'hall', 'room', 'نوع القاعة المطلوبة *'],
  building:  ['المبنى', '* المبنى', 'building'],
  floor:     ['الدور', '* الدور', 'floor'],
  doctor:    ['د. المحاضرة *', 'د. المحاضرة', 'doctor'],
  assistant: ['المعيدين / السكاشن', 'assistant'],
  year:      ['الفرقة *', 'الفرقة', 'yearLevel'],
  group:     ['المجموعة', 'group'],
  dept:      ['الشعبة / القسم', 'القسم', 'department'],
};
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const FACULTY_ROLE_COLS = ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role', 'title'];
const FACULTY_DEPT_COLS = ['القسم *', 'القسم', 'department'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];
const ROOM_TYPE_COLS = ['* النوع', 'النوع', 'type'];
const ROOM_CAP_COLS = ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'];

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const DEFAULT_FIRST_HOUR = 9;
const DEFAULT_LAST_HOUR = 14;
const CHART_COLORS = ['#1e3a8a', '#2563eb', '#0284c7', '#0d9488', '#15803d', '#d97706', '#b4600c', '#4f46e5', '#64748b'];

// ---------- دوال مساعدة ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const normAr = s => String(s ?? '')
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();

function getVal(item, keys) {
  if (!item) return '';
  const objKeys = Object.keys(item);
  for (const pk of keys) {
    for (const k of objKeys) {
      if (k.trim() === pk.trim()) {
        const v = item[k];
        if (v !== undefined && v !== null && v !== '') return v.toString().trim();
      }
    }
  }
  for (const pk of keys) {
    for (const k of objKeys) {
      const lk = k.toLowerCase().trim();
      const lpk = pk.toLowerCase().trim();
      if (lk.includes(lpk)) {
        if (lpk.includes('مادة') && lk.includes('كود')) continue;
        const v = item[k];
        if (v !== undefined && v !== null && v !== '') return v.toString().trim();
      }
    }
  }
  return '';
}
const col = (item, name) => getVal(item, COLS[name]);

function toNum(v) {
  if (v === undefined || v === null) return 0;
  const cleaned = normAr(v).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseHour(v) {
  if (v === undefined || v === null) return null;
  const s = normAr(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : Math.round(d.getHours() + d.getMinutes() / 60);
  }
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const suf = (m[3] || '').toLowerCase();
  if ((suf === 'م' || suf === 'pm') && h < 12) h += 12;
  else if ((suf === 'ص' || suf === 'am') && h === 12) h = 0;
  else if (!suf && h < 8) h += 12;
  return h;
}

const pad = n => String(n).padStart(2, '0');
const slotLabel = h => `<bdi dir="ltr">${pad(h)}:00–${pad(h + 1)}:00</bdi>`;

function splitNames(s) {
  return (s || '').split(/[,،]/).map(x => x.trim()).filter(Boolean);
}

function yearRank(y) {
  const n = normAr(y);
  const order = ['اول', 'ثان', 'ثالث', 'رابع', 'خامس'];
  const i = order.findIndex(o => n.includes(o));
  if (i >= 0) return i;
  const d = n.match(/\d+/);
  return d ? parseInt(d[0], 10) - 1 : 99;
}
const sortYears = arr => arr.sort((a, b) => yearRank(a) - yearRank(b) || a.localeCompare(b, 'ar'));

const sameYear = (a, b) => {
  const x = normAr(a), y = normAr(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

function matchesFilter(item, { year, dept, group, instructor, hall }) {
  if (year && !sameYear(col(item, 'year'), year)) return false;
  if (dept && !normAr(col(item, 'dept')).includes(normAr(dept))) return false;
  if (group) {
    const rowGroup = col(item, 'group');
    if (rowGroup && !normAr(rowGroup).includes(normAr(group))) return false;
  }
  if (instructor) {
    const docs = [...splitNames(col(item, 'doctor')), ...splitNames(col(item, 'assistant'))];
    if (!docs.some(d => normAr(d).includes(normAr(instructor)))) return false;
  }
  if (hall) {
    const rowHall = col(item, 'hall');
    if (rowHall && !normAr(rowHall).includes(normAr(hall))) return false;
  }
  return true;
}

function pickArray(data, candidates) {
  if (!data || typeof data !== 'object') return [];
  for (const key of candidates) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (data.data && typeof data.data === 'object') {
    for (const key of candidates) {
      if (Array.isArray(data.data[key])) return data.data[key];
    }
  }
  return [];
}

// ---------- تحميل البيانات ----------
async function loadData(api, force = false) {
  const cached = localStorage.getItem('sheet_cache_data');
  const cachedTime = Number(localStorage.getItem('sheet_cache_time') || 0);
  const now = Date.now();
  if (!force && cached && now - cachedTime < 600000) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed) return parsed;
    } catch (e) {}
  }
  try {
    const data = await api.getData();
    localStorage.setItem('sheet_cache_data', JSON.stringify(data));
    localStorage.setItem('sheet_cache_time', String(now));
    return data;
  } catch (err) {
    console.error('Error fetching data:', err);
    if (cached) return JSON.parse(cached);
    throw err;
  }
}
const schedulesOf = data => (Array.isArray(data) ? data : (data && data.schedules) || []);
const coursesOf = data => pickArray(data, ['courses', 'subjects', 'المواد', 'المواد الدراسية']);
const roomsOf = data => pickArray(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
const instructorsOf = data => pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);

// ---------- الستايل ----------
function injectStyles() {
  if (document.getElementById('tt-styles')) return;
  const st = document.createElement('style');
  st.id = 'tt-styles';
  st.textContent = `
  .tt{--bg:#f1f3f8;--ink:#1b2236;--mute:#6b7287;--line:#dfe3ee;--head:#f3f4f9;
      --lec-bg:#e4e9f9;--lec-bd:#1e3a8a;--sec-bg:#fce8d5;--sec-bd:#b4600c;--ok:#15803d;
      direction:rtl;text-align:right;background:var(--bg);color:var(--ink);min-height:100vh;padding:14px;
      font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif}
  .tt *{box-sizing:border-box}
  .tt-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
  .tt-btn{background:#fff;color:var(--ink);border:1.5px solid var(--ink);padding:8px 16px;border-radius:8px;
          cursor:pointer;font:inherit;font-weight:600}
  .tt-btn.on{background:var(--ink);color:#fff}
  .tt-note{font-size:.85rem;color:var(--mute);margin:4px 2px 14px}
  .tt-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;background:#fff;padding:15px;border-radius:10px;border:1px solid var(--line)}
  .tt-field{display:flex;flex-direction:column;gap:5px}
  .tt-field label{font-weight:600;font-size:0.85rem;color:var(--mute)}
  .tt-sel{min-width:150px;padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;background:#fff;
          font:inherit;color:var(--ink);cursor:pointer;font-size:0.9rem}
  .tt-loading{text-align:center;color:#0284c7;font-weight:700;padding:12px;display:none}
  .tt-stats{display:flex;background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:12px}
  .tt-stat-item{display:flex;align-items:center;gap:15px;border-left:2px solid var(--line);padding-left:30px}
  .tt-stat-item:last-child{border-left:none;padding-left:0}
  .tt-stat-num{font-size:1.6rem;font-weight:800;color:var(--ink)}
  .tt-stat-lbl{font-size:.85rem;color:var(--mute);font-weight:600}
  .tt-requests-box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px}
  .tt-requests-title{font-weight:700;font-size:1.05rem;margin-bottom:12px;color:var(--ink)}
  .tt-request-card{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
  .tt-req-action-btn{padding:6px 14px;border-radius:6px;font:inherit;font-weight:600;cursor:pointer;border:none}
  .tt-btn-approve{background:#10b981;color:#fff}
  .tt-btn-reject{background:#ef4444;color:#fff}
  .tt-wrap{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:8px}
  .tt-table{width:100%;min-width:860px;border-collapse:collapse;table-layout:fixed}
  .tt-table th{background:var(--head);padding:12px 8px;font-weight:600;border:1px solid var(--line);border-top:0}
  .tt-table td{border:1px solid var(--line);padding:6px;vertical-align:top;height:120px}
  .tt-table th:first-child,.tt-table td.tt-time{width:115px}
  .tt-table td.tt-time{background:var(--head);font-weight:600;text-align:center;vertical-align:middle;font-size:.92rem}
  .tt-card{background:var(--lec-bg);border-right:4px solid var(--lec-bd);border-radius:6px;padding:8px 10px;margin-bottom:6px;
           min-height:102px}
  .tt-card:last-child{margin-bottom:0}
  .tt-card.sec{background:var(--sec-bg);border-right-color:var(--sec-bd)}
  .tt-subj{font-weight:700;font-size:.95rem;line-height:1.35;margin-bottom:4px}
  .tt-meta{font-size:.78rem;color:var(--mute);line-height:1.45}
  .tt-status{font-size:.8rem;font-weight:700;margin-top:6px}
  .tt-apology{margin-top:6px;background:#fff;border:1px solid #c4cadb;border-radius:6px;padding:3px 12px;
              font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}
  .tt-legend{margin:10px 2px 0;font-size:.82rem;color:var(--mute)}

  .db-banner{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;border-bottom:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
  .db-banner-title{margin:0;font-size:1.3rem;font-weight:800}
  .db-banner-sub{margin:4px 0 0;font-size:.86rem;color:#cbd5e1}
  .db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:14px}
  .db-kpi{background:#fff;border:1px solid var(--line);border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer}
  .db-kpi.g2{border-top-color:#10b981}.db-kpi.g3{border-top-color:#f59e0b}.db-kpi.g4{border-top-color:#8b5cf6}
  .db-kpi-lbl{font-size:.88rem;font-weight:700;color:#1e293b}
  .db-kpi-val{font-size:1.9rem;font-weight:800;margin:6px 0;color:#2563eb}
  .db-kpi.g2 .db-kpi-val{color:#059669}.db-kpi.g3 .db-kpi-val{color:#d97706}.db-kpi.g4 .db-kpi-val{color:#7c3aed}
  .db-kpi-sub{font-size:.78rem;color:var(--mute);font-weight:600}
  .db-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
  .db-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;margin-bottom:14px}
  .db-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px}
  .db-card-title{font-size:.96rem;font-weight:700;margin:0 0 12px;color:#0f172a;text-align:center}
  .db-hbars{display:flex;flex-direction:column;gap:10px}
  .db-hbar{display:grid;grid-template-columns:110px 1fr 34px;align-items:center;gap:8px;font-size:.82rem;cursor:pointer}
  .db-hbar-lbl{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .db-hbar-track{height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden}
  .db-hbar-fill{height:100%;background:#7da2d8;border-radius:4px}
  .db-hbar-val{font-weight:700;color:#1e293b;text-align:left}
  .db-vbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:185px;padding:12px 6px 6px;border-bottom:1px solid var(--line)}
  .db-vbar-col{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;cursor:pointer}
  .db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334155;margin-bottom:4px}
  .db-vbar-rect{width:70%;max-width:34px;background:#7da2d8;border-radius:4px 4px 0 0;min-height:4px}
  .db-vbar-lbl{font-size:.72rem;color:#475569;margin-top:6px;text-align:center;line-height:1.2;max-height:2.4em;overflow:hidden}
  .db-donut-wrap{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;min-height:185px}
  .db-donut-legend{display:flex;flex-direction:column;gap:8px;font-size:.84rem}
  .db-leg-item{display:flex;align-items:center;gap:8px;cursor:pointer}
  .db-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}
  .db-inspector{background:#fff;border:1.5px solid #2563eb;border-radius:10px;padding:16px;margin-bottom:14px}
  .db-inspector-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px}
  .db-inspector-title{margin:0;font-size:1rem;font-weight:700;color:#1e3a8a}
  .db-chip-list{display:flex;flex-wrap:wrap;gap:8px}
  .db-chip{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:.82rem;font-weight:600}
  .db-empty{font-size:.85rem;color:var(--mute);text-align:center;padding:12px}
  `;
  document.head.appendChild(st);
}

// ---------- دوال رسوم الداش بورد ----------
function countMapEntries(map, sortFn = null) {
  const arr = [...map.entries()].map(([label, value]) => ({ label, value }));
  if (sortFn) return arr.sort(sortFn);
  return arr.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ar'));
}

function hBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return `<div class="db-hbars">${entries.map(({ label, value }) => {
    const pct = Math.max(4, Math.round((value / maxVal) * 100));
    return `
      <div class="db-hbar db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(label)}">
        <span class="db-hbar-lbl" title="${esc(label)}">${esc(label)}</span>
        <div class="db-hbar-track"><div class="db-hbar-fill" style="width:${pct}%"></div></div>
        <span class="db-hbar-val">${value}</span>
      </div>`;
  }).join('')}</div>`;
}

function vBarChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات مطابقة.</div>';
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return `<div class="db-vbars">${entries.map(({ label, value }) => { const hPct = Math.max(8, Math.round((value / maxVal) * 100)); return ` <div class="db-vbar-col db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(label)}" title="${esc(label)}: ${value}"> <span class="db-vbar-cnt">${value}</span> <div class="db-vbar-rect" style="height:${hPct}\%"></div> <span class="db-vbar-lbl">${esc(label)}</span> </div>`; }).join('')}</div>`; }  function donutChartHtml(entries, filterGroup) { if (!entries.length) return '<div class="db-empty">لا توجد بيانات قاعات.</div>'; const total = entries.reduce((acc, e) => acc + e.value, 0) \vert{}\vert{} 1; let cum = 0; const stops = entries.map((e, i) => { const color = CHART_COLORS[i \% CHART_COLORS.length]; const start = (cum / total) * 360; cum += e.value; const end = (cum / total) * 360; return `${color} ${start.toFixed(1)}deg${end.toFixed(1)}deg`;
  });

  const legend = entries.map((e, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = Math.round((e.value / total) * 100);
    return `
      <div class="db-leg-item db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(e.label)}">
        <span class="db-dot" style="background:${color}"></span>
        <span><b>${esc(e.label)}</b> (${e.value} ·${pct}%)</span>
      </div>`;
  }).join('');

  return `
    <div class="db-donut-wrap">
      <div style="width:148px;height:148px;border-radius:50%;background:conic-gradient(${stops.join(',')});position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <div style="width:86px;height:86px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-weight:800;font-size:1.1rem;color:#0f172a">${total}</span>
          <span style="font-size:.7rem;color:#64748b">إجمالي</span>
        </div>
      </div>
      <div class="db-donut-legend">${legend}</div>
    </div>`;
}

// ---------- شاشة الداش بورد ----------
class DashboardView {
  constructor(api, onNavigate = null) {
    this.api = api;
    this.onNavigate = onNavigate;
    this.filters = { year: '', dept: '' };
    this.inspection = null;
  }

  async mount(container) {
    container.innerHTML = `
      <div class="db-banner">
        <div>
          <h2 class="db-banner-title">نظام إدارة الجداول الأكاديمية الذكي</h2>
          <p class="db-banner-sub">لوحة متابعة المواد الدراسية وأعضاء هيئة التدريس والقاعات من Google Sheets</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="dbGoSch" class="tt-btn on" style="border-color:#fff">فتح منسق الجداول</button>
          <button id="dbRefresh" class="tt-btn" style="border-color:#f59e0b">تحديث البيانات</button>
        </div>
      </div>

      <div class="tt-filters">
        <div class="tt-field">
          <label>الفرقة الدراسية</label>
          <select id="dbYear" class="tt-sel"><option value="">-- كل الفرق --</option></select>
        </div>
        <div class="tt-field">
          <label>القسم / الشعبة</label>
          <select id="dbDept" class="tt-sel"><option value="">-- كل الأقسام --</option></select>
        </div>
        <button id="dbReset" class="tt-btn" style="margin-right:auto">إعادة ضبط</button>
      </div>

      <div id="dbLoading" class="tt-loading">جاري تحميل بيانات الداش بورد من Google Sheets...</div>
      <div id="dbBody"></div>`;

    const ySel = document.getElementById('dbYear');
    const dSel = document.getElementById('dbDept');
    const rBtn = document.getElementById('dbRefresh');
    const rstBtn = document.getElementById('dbReset');
    const goBtn = document.getElementById('dbGoSch');

    if (ySel) ySel.onchange = e => { this.filters.year = e.target.value; this.inspection = null; this.render(false); };
    if (dSel) dSel.onchange = e => { this.filters.dept = e.target.value; this.inspection = null; this.render(false); };
    if (rBtn) rBtn.onclick = () => { this.inspection = null; this.render(true); };
    if (rstBtn) rstBtn.onclick = () => {
      this.filters = { year: '', dept: '' };
      this.inspection = null;
      if (ySel) ySel.value = '';
      if (dSel) dSel.value = '';
      this.render(false);
    };
    if (goBtn) goBtn.onclick = () => {
      if (this.onNavigate) this.onNavigate('scheduler');
    };

    await this.render(false);
  }

  populateFilters(data) {
    const schedules = schedulesOf(data);
    const courses = coursesOf(data);
    const faculty = instructorsOf(data);
    const years = new Set();
    const depts = new Set();

    [...courses, ...schedules].forEach(it => {
      const y = col(it, 'year');
      const d = col(it, 'dept');
      if (y) years.add(y);
      if (d) depts.add(d);
    });
    faculty.forEach(f => {
      const d = getVal(f, FACULTY_DEPT_COLS);
      if (d) depts.add(d);
    });

    const ySel = document.getElementById('dbYear');
    const dSel = document.getElementById('dbDept');
    const yList = sortYears([...years]);
    const dList = [...depts].sort((a, b) => a.localeCompare(b, 'ar'));

    if (ySel) {
      ySel.innerHTML = '<option value="">-- كل الفرق --</option>';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      ySel.value = this.filters.year && yList.includes(this.filters.year) ? this.filters.year : '';
    }
    if (dSel) {
      dSel.innerHTML = '<option value="">-- كل الأقسام --</option>';
      dList.forEach(d => dSel.appendChild(new Option(d, d)));
      dSel.value = this.filters.dept && dList.includes(this.filters.dept) ? this.filters.dept : '';
    }
  }

  async render(force = false) {
    const loading = document.getElementById('dbLoading');
    const body = document.getElementById('dbBody');
    if (loading) loading.style.display = 'block';

    let data;
    try {
      data = await loadData(this.api, force);
    } finally {
      if (loading) loading.style.display = 'none';
    }

    this.populateFilters(data);

    const schedules = schedulesOf(data);
    const allCourses = coursesOf(data);
    const allRooms = roomsOf(data);
    const allFaculty = instructorsOf(data);

    const filteredCourses = allCourses.filter(c => matchesFilter(c, this.filters));
    const filteredSchedules = schedules.filter(s => matchesFilter(s, this.filters));
    const filteredFaculty = allFaculty.filter(f => {
      if (!this.filters.dept) return true;
      return normAr(getVal(f, FACULTY_DEPT_COLS)).includes(normAr(this.filters.dept));
    });

    const courseSource = filteredCourses.length ? filteredCourses : filteredSchedules;
    const uniqueSubjects = new Set(courseSource.map(c => col(c, 'subject')).filter(Boolean));
    const totalCourses = filteredCourses.length || uniqueSubjects.size;

    const facultyNames = new Set();
    filteredFaculty.forEach(f => {
      const n = getVal(f, INSTRUCTOR_COLS);
      if (n) facultyNames.add(n);
    });
    if (!filteredFaculty.length) {
      filteredSchedules.forEach(s => {
        splitNames(col(s, 'doctor')).forEach(n => facultyNames.add(n));
        splitNames(col(s, 'assistant')).forEach(n => facultyNames.add(n));
      });
    }
    const totalFaculty = filteredFaculty.length || facultyNames.size;

    let totalCapacity = 0;
    const roomTypes = new Map();
    allRooms.forEach(r => {
      totalCapacity += toNum(getVal(r, ROOM_CAP_COLS));
      const rt = getVal(r, ROOM_TYPE_COLS) || 'غير محدد';
      roomTypes.set(rt, (roomTypes.get(rt) || 0) + 1);
    });

    const coursesByYear = new Map();
    const coursesByDept = new Map();
    courseSource.forEach(item => {
      const y = col(item, 'year') || 'غير محدد';
      const d = col(item, 'dept') || 'عام';
      coursesByYear.set(y, (coursesByYear.get(y) || 0) + 1);
      coursesByDept.set(d, (coursesByDept.get(d) || 0) + 1);
    });

    const facultyByDept = new Map();
    const facultyByRole = new Map();
    filteredFaculty.forEach(f => {
      const fd = getVal(f, FACULTY_DEPT_COLS) || 'غير محدد';
      const fr = getVal(f, FACULTY_ROLE_COLS) || 'غير محدد';
      facultyByDept.set(fd, (facultyByDept.get(fd) || 0) + 1);
      facultyByRole.set(fr, (facultyByRole.get(fr) || 0) + 1);
    });

    const yearEntries = countMapEntries(coursesByYear, (a, b) => yearRank(b.label) - yearRank(a.label));
    const deptCourseEntries = countMapEntries(coursesByDept);
    const roomTypeEntries = countMapEntries(roomTypes);
    const facultyDeptEntries = countMapEntries(facultyByDept);
    const facultyRoleEntries = countMapEntries(facultyByRole);

    let inspectorHtml = '';
    if (this.inspection) {
      const { group, label } = this.inspection;
      let chips = [];
      if (group === 'courses') chips = [...uniqueSubjects].slice(0, 30).map(s => `مادة: ${s}`); else if (group === 'faculty') chips = [...facultyNames].slice(0, 30).map(n => `عضو: ${n}`);
      else if (group === 'rooms') chips = allRooms.slice(0, 30).map(r => `${getVal(r, ROOM_COLS) \vert{}\vert{} 'مكان'} (${toNum(getVal(r, ROOM_CAP_COLS))} طالب)`);
      else if (group === 'capacity') chips = allRooms.slice(0, 25).map(r => `${getVal(r, ROOM_COLS) \vert{}\vert{} 'قاعة'}: ${toNum(getVal(r, ROOM_CAP_COLS))} طالب`);
      else if (group === 'roomType') chips = allRooms.filter(r => (getVal(r, ROOM_TYPE_COLS) || 'غير محدد') === label).slice(0, 30).map(r => `${getVal(r, ROOM_COLS) \vert{}\vert{} 'قاعة'} (${toNum(getVal(r, ROOM_CAP_COLS))} طالب)`);
      else if (group === 'facultyRole') chips = allFaculty.filter(f => (getVal(f, FACULTY_ROLE_COLS) || 'غير محدد') === label).slice(0, 30).map(f => getVal(f, INSTRUCTOR_COLS) || 'عضو');
      else if (group === 'courseYear') chips = courseSource.filter(c => (col(c, 'year') || 'غير محدد') === label).slice(0, 30).map(c => col(c, 'subject') || 'مادة');
      else if (group === 'facultyDept') chips = allFaculty.filter(f => (getVal(f, FACULTY_DEPT_COLS) || 'غير محدد') === label).slice(0, 30).map(f => getVal(f, INSTRUCTOR_COLS) || 'عضو');
      else if (group === 'courseDept') chips = courseSource.filter(c => (col(c, 'dept') || 'عام') === label).slice(0, 30).map(c => col(c, 'subject') || 'مادة');

      inspectorHtml = `
        <div class="db-inspector">
          <div class="db-inspector-head">
            <h4 class="db-inspector-title">تفاصيل التحديد: ${esc(label)} (${chips.length})</h4>
            <button id="dbCloseInsp" class="tt-btn" style="padding:4px 12px;font-size:.8rem">إغلاق</button>
          </div>
          <div class="db-chip-list">
            ${chips.length ? chips.map(ch => `<span class="db-chip">${esc(ch)}</span>`).join('') : '<span class="db-empty">لا توجد تفاصيل.</span>'}
          </div>
        </div>`;
    }

    if (!body) return;
    body.innerHTML = `
      <div class="db-kpis">
        <div class="db-kpi db-click-item" data-group="courses" data-label="إجمالي المواد الدراسية">
          <div class="db-kpi-lbl">إجمالي المواد الدراسية</div>
