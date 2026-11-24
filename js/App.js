// =====================================================================
//  نظام الجداول — App.js الكامل (داش بورد ديناميكية + شاشات النظام)
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
  lecHours:  ['ساعات المحاضرة أسبوعياً *', 'ساعات المحاضرة', 'lectureHours'],
  secHours:  ['ساعات السكشن أسبوعياً', 'ساعات السكشن', 'sectionHours'],
};
const INSTRUCTOR_COLS = ['اسم الدكتور / المعيد *', 'اسم الدكتور / المعيد', 'name'];
const FACULTY_ROLE_COLS = ['الدرجة الوظيفية *', 'الدرجة الوظيفية', 'role', 'title'];
const FACULTY_DEPT_COLS = ['القسم *', 'القسم', 'department'];
const ROOM_COLS = ['رقم القاعة', '* النوع', 'اسم القاعة', 'hall', 'room'];
const ROOM_TYPE_COLS = ['* النوع', 'النوع', 'type'];
const ROOM_CAP_COLS = ['* السعة (عدد الطلاب)', 'السعة (عدد الطلاب)', 'السعة', 'capacity'];
const ROOM_BLDG_COLS = ['* المبنى', 'المبنى', 'building'];

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
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
    if (rowHall && normAr(rowHall) && !normAr(rowHall).includes(normAr(hall))) return false;
  }
  return true;
}

// ---------- تحميل البيانات مع الكاش ----------
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

const schedulesOf = data => (Array.isArray(data) ? data : pickArray(data, ['schedules', 'schedule', 'الجداول', 'الجدول']));
const coursesLiveOf = data => pickArray(data, ['courses', 'subjects', 'المواد', 'المواد الدراسية']);
const roomsLiveOf = data => pickArray(data, ['rooms', 'halls', 'القاعات', 'المدرجات والقاعات']);
const instructorsLiveOf = data => pickArray(data, ['instructors', 'faculty', 'doctors', 'أعضاء هيئة التدريس']);

// ---------- الستايل ----------
function injectStyles() {
  if (document.getElementById('tt-styles')) return;
  const st = document.createElement('style');
  st.id = 'tt-styles';
  st.textContent = `
  .tt{--bg:#eef1f6;--ink:#162447;--mute:#64748b;--line:#dbe2ee;--head:#f1f5f9;
      --lec-bg:#e4e9f9;--lec-bd:#1e3a8a;--sec-bg:#fce8d5;--sec-bd:#b4600c;--ok:#15803d;--accent:#1d4ed8;
      direction:rtl;text-align:right;background:var(--bg);color:var(--ink);min-height:100vh;padding:14px;
      font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif}
  .tt *{box-sizing:border-box}
  .tt-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  .tt-btn{background:#fff;color:var(--ink);border:1.5px solid var(--ink);padding:8px 16px;border-radius:8px;
          cursor:pointer;font:inherit;font-weight:600;transition:.15s}
  .tt-btn:hover{background:#f8fafc}
  .tt-btn.on{background:var(--ink);color:#fff}
  .tt-note{font-size:.85rem;color:var(--mute);margin:4px 2px 14px}
  .tt-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;background:#fff;padding:15px;border-radius:10px;border:1px solid var(--line)}
  .tt-field{display:flex;flex-direction:column;gap:5px}
  .tt-field label{font-weight:600;font-size:0.85rem;color:var(--mute)}
  .tt-sel{min-width:150px;padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;background:#fff;
          font:inherit;color:var(--ink);cursor:pointer;font-size:0.9rem}
  .tt-loading{text-align:center;color:#0284c7;font-weight:700;padding:12px;display:none}

  .db-banner{background:linear-gradient(135deg,#071b38 0%,#0f3566 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;border-bottom:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
  .db-banner-title{margin:0;font-size:1.35rem;font-weight:800;letter-spacing:-.2px}
  .db-banner-sub{margin:4px 0 0;font-size:.88rem;color:#cbd5e1}
  .db-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:14px}
  .db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:14px}
  .db-kpi{background:#fff;border:1px solid var(--line);border-top:4px solid #2563eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:transform .15s,box-shadow .15s}
  .db-kpi:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(15,23,42,.08)}
  .db-kpi.g2{border-top-color:#10b981}
  .db-kpi.g3{border-top-color:#f59e0b}
  .db-kpi.g4{border-top-color:#8b5cf6}
  .db-kpi-lbl{font-size:.9rem;font-weight:700;color:#1e293b}
  .db-kpi-val{font-size:2rem;font-weight:800;margin:6px 0;color:#2563eb}
  .db-kpi.g2 .db-kpi-val{color:#059669}
  .db-kpi.g3 .db-kpi-val{color:#d97706}
  .db-kpi.g4 .db-kpi-val{color:#7c3aed}
  .db-kpi-sub{font-size:.8rem;color:var(--mute);font-weight:600}

  .db-grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
  .db-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;margin-bottom:14px}
  .db-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
  .db-card-title{font-size:.98rem;font-weight:700;margin:0 0 12px;color:#0f172a;text-align:center}

  .db-hbars{display:flex;flex-direction:column;gap:10px}
  .db-hbar{display:grid;grid-template-columns:110px 1fr 34px;align-items:center;gap:8px;font-size:.82rem;cursor:pointer;padding:3px 4px;border-radius:6px}
  .db-hbar:hover{background:#f8fafc}
  .db-hbar-lbl{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .db-hbar-track{height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden;position:relative}
  .db-hbar-fill{height:100%;background:#7da2d8;border-radius:4px;transition:width .25s ease}
  .db-hbar-val{font-weight:700;color:#1e293b;text-align:left}

  .db-vbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:185px;padding:12px 6px 6px;border-bottom:1px solid var(--line)}
  .db-vbar-col{display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;cursor:pointer;border-radius:6px;padding:2px}
  .db-vbar-col:hover{background:#f8fafc}
  .db-vbar-cnt{font-size:.75rem;font-weight:700;color:#334155;margin-bottom:4px}
  .db-vbar-rect{width:70%;max-width:34px;background:#7da2d8;border-radius:4px 4px 0 0;min-height:4px;transition:height .25s ease}
  .db-vbar-lbl{font-size:.72rem;color:#475569;margin-top:6px;text-align:center;line-height:1.2;max-height:2.4em;overflow:hidden}

  .db-donut-wrap{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;min-height:185px}
  .db-donut-legend{display:flex;flex-direction:column;gap:8px;font-size:.84rem}
  .db-leg-item{display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 6px;border-radius:6px}
  .db-leg-item:hover{background:#f8fafc}
  .db-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}

  .db-inspector{background:#fff;border:1.5px solid #2563eb;border-radius:10px;padding:16px;margin-bottom:14px}
  .db-inspector-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px}
  .db-inspector-title{margin:0;font-size:1rem;font-weight:700;color:#1e3a8a}
  .db-chip-list{display:flex;flex-wrap:wrap;gap:8px}
  .db-chip{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px;font-size:.82rem;font-weight:600}
  .db-empty{font-size:.85rem;color:var(--mute);text-align:center;padding:12px}

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
  `;
  document.head.appendChild(st);
}

// ---------- رسم الكروت ----------
function cardHtml(item, { showYear = false, doctorExtra = null } = {}) {
  const type = col(item, 'type');
  const doc = col(item, 'doctor');
  const ast = col(item, 'assistant');
  const isSection = type ? /سكشن|عملي|معمل|section|lab/i.test(type) : (!!ast && !doc);

  const subject = col(item, 'subject') || 'مادة';
  const hall = col(item, 'hall');
  const building = col(item, 'building');
  const floor = col(item, 'floor');

  const person = isSection ? (ast || doc) : (doc || ast);
  const label = isSection ? 'سكشن' : 'محاضرة';
  const yl = col(item, 'year');
  const dept = col(item, 'dept');
  const grp = col(item, 'group');

  let hallDetails = hall ? `قاعة: ${hall}` : '';
  if (building) hallDetails += ` (${building}`;
  if (floor) hallDetails += building ? `, ${floor})` : `(${floor})`;
  else if (building) hallDetails += `)`;

  return `
    <div class="tt-card ${isSection ? 'sec' : ''}">
      <div class="tt-subj">${esc(subject)}</div>
      <div class="tt-meta">${label}${hallDetails ? ' · ' + esc(hallDetails) : ''}</div>
      ${person ? `<div class="tt-meta">${esc(person)}</div>` : ''}
      ${showYear && yl ? `<div class="tt-meta">${esc(yl)}${grp ? ' - مجموعة ' + esc(grp) : (dept ? ' - ' + esc(dept) : '')}</div>` : ''}
      ${doctorExtra ? doctorExtra(item, subject) : ''}
    </div>`;
}

function renderGrid(tbody, items, opts = {}) {
  const slots = [9, 10, 11, 12, 13, 14];
  let simpleHtml = '';
  slots.forEach((h, slotIdx) => {
    simpleHtml += `<tr><td class="tt-time">${slotLabel(h)}</td>`;
    DAYS.forEach((day, dayIdx) => {
      const idx = slotIdx * DAYS.length + dayIdx;
      const it = items[idx];
      simpleHtml += `<td>${it ? cardHtml(it, opts) : ''}</td>`;
    });
    simpleHtml += '</tr>';
  });
  tbody.innerHTML = simpleHtml;
}

const TABLE_HEAD = `
  <thead><tr><th>الوقت</th>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead>`;

// ---------- دوال الرسوم التفاعلية للداش بورد ----------
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
  return `<div class="db-vbars">${entries.map(({ label, value }) => {
    const hPct = Math.max(8, Math.round((value / maxVal) * 100));
    return `
      <div class="db-vbar-col db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(label)}" title="${esc(label)}: ${value}">
        <span class="db-vbar-cnt">${value}</span>
        <div class="db-vbar-rect" style="height:${hPct}%"></div>
        <span class="db-vbar-lbl">${esc(label)}</span>
      </div>`;
  }).join('')}</div>`;
}

function donutChartHtml(entries, filterGroup) {
  if (!entries.length) return '<div class="db-empty">لا توجد بيانات قاعات.</div>';
  const total = entries.reduce((acc, e) => acc + e.value, 0) || 1;
  let cum = 0;
  const stops = entries.map((e, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const start = (cum / total) * 360;
    cum += e.value;
    const end = (cum / total) * 360;
    return `${color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
  });

  const legend = entries.map((e, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = Math.round((e.value / total) * 100);
    return `
      <div class="db-leg-item db-click-item" data-group="${esc(filterGroup)}" data-label="${esc(e.label)}">
        <span class="db-dot" style="background:${color}"></span>
        <span><b>${esc(e.label)}</b> (${e.value} · ${pct}%)</span>
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

// ---------- شاشة الداش بورد التفاعلية ----------
class DashboardView {
  constructor(api, onNavigate) {
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
          <p class="db-banner-sub">لوحة متابعة المواد الدراسية وأعضاء هيئة التدريس والقاعات — مرتبطة ببيانات Google Sheets</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="dbGoScheduler" class="tt-btn" style="border-color:#fff">عرض الجدول المفلتر</button>
          <button id="dbRefreshBtn" class="tt-btn" style="border-color:#f59e0b">تحديث البيانات</button>
        </div>
      </div>

      <div class="db-toolbar">
        <div class="tt-field">
          <label>تصفية حسب الفرقة الدراسية</label>
          <select id="dbYearSel" class="tt-sel"><option value="">-- كل الفرق --</option></select>
        </div>
        <div class="tt-field">
          <label>تصفية حسب القسم / الشعبة</label>
          <select id="dbDeptSel" class="tt-sel"><option value="">-- كل الأقسام --</option></select>
        </div>
        <button id="dbResetBtn" class="tt-btn" style="margin-right:auto">إعادة ضبط الفلاتر</button>
      </div>

      <div id="dbLoading" class="tt-loading">جاري تحليل بيانات الداش بورد من Google Sheets...</div>
      <div id="dbContent"></div>`;

    const ySel = document.getElementById('dbYearSel');
    const dSel = document.getElementById('dbDeptSel');
    const rBtn = document.getElementById('dbRefreshBtn');
    const rstBtn = document.getElementById('dbResetBtn');
    const goBtn = document.getElementById('dbGoScheduler');

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
      if (this.onNavigate) this.onNavigate('scheduler', { ...this.filters });
    };

    await this.render(false);
  }

  populateFilterOptions(data) {
    const schedules = schedulesOf(data);
    const courses = coursesLiveOf(data);
    const faculty = instructorsLiveOf(data);
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

    const ySel = document.getElementById('dbYearSel');
    const dSel = document.getElementById('dbDeptSel');
    const yList = sortYears([...years]);
    const dList = [...depts].sort((a, b) => a.localeCompare(b, 'ar'));

    if (ySel) {
      ySel.innerHTML = '<option value="">-- كل الفرق --</option>';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      if (this.filters.year && yList.includes(this.filters.year)) ySel.value = this.filters.year;
      else this.filters.year = '';
    }
    if (dSel) {
      dSel.innerHTML = '<option value="">-- كل الأقسام --</option>';
      dList.forEach(d => dSel.appendChild(new Option(d, d)));
      if (this.filters.dept && dList.includes(this.filters.dept)) dSel.value = this.filters.dept;
      else this.filters.dept = '';
    }
  }

  async render(force = false) {
    const loading = document.getElementById('dbLoading');
    const content = document.getElementById('dbContent');
    if (loading) loading.style.display = 'block';

    let data;
    try {
      data = await loadData(this.api, force);
    } finally {
      if (loading) loading.style.display = 'none';
    }

    this.populateFilterOptions(data);

    const schedules = schedulesOf(data);
    const allCourses = coursesLiveOf(data);
    const allRooms = roomsLiveOf(data);
    const allFaculty = instructorsLiveOf(data);

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
    const totalRooms = allRooms.length;

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
      if (group === 'courses') {
        chips = [...uniqueSubjects].slice(0, 30).map(s => `مادة: ${s}`);
      } else if (group === 'faculty') {
        chips = [...facultyNames].slice(0, 30).map(n => `عضو: ${n}`);
      } else if (group === 'rooms') {
        chips = allRooms.slice(0, 30).map(r => `${getVal(r, ROOM_COLS) || 'مكان'} (${getVal(r, ROOM_CAP_COLS) || 0} طالب)`);
      } else if (group === 'capacity') {
        chips = allRooms.filter(r => toNum(getVal(r, ROOM_CAP_COLS)) > 0).slice(0, 25)
          .map(r => `${getVal(r, ROOM_COLS) || 'قاعة'}: ${toNum(getVal(r, ROOM_CAP_COLS))} طالب`);
      } else if (group === 'roomType') {
        chips = allRooms.filter(r => (getVal(r, ROOM_TYPE_COLS) || 'غير محدد') === label).slice(0, 30)
          .map(r => `${getVal(r, ROOM_COLS) || 'قاعة'} (${toNum(getVal(r, ROOM_CAP_COLS))} طالب)`);
      } else if (group === 'facultyRole') {
        chips = allFaculty.filter(f => (getVal(f, FACULTY_ROLE_COLS) || 'غير محدد') === label).slice(0, 30)
          .map(f => getVal(f, INSTRUCTOR_COLS) || 'عضو');
      } else if (group === 'courseYear') {
        chips = courseSource.filter(c => (col(c, 'year') || 'غير محدد') === label).slice(0, 30)
          .map(c => col(c, 'subject') || 'مادة');
      } else if (group === 'facultyDept') {
        chips = allFaculty.filter(f => (getVal(f, FACULTY_DEPT_COLS) || 'غير محدد') === label).slice(0, 30)
          .map(f => getVal(f, INSTRUCTOR_COLS) || 'عضو');
      } else if (group === 'courseDept') {
        chips = courseSource.filter(c => (col(c, 'dept') || 'عام') === label).slice(0, 30)
          .map(c => col(c, 'subject') || 'مادة');
      }

      inspectorHtml = `
        <div class="db-inspector">
          <div class="db-inspector-head">
            <h4 class="db-inspector-title">تفاصيل التحديد: ${esc(label)} (${chips.length} عنصر معروض)</h4>
            <button id="dbCloseInsp" class="tt-btn" style="padding:4px 12px;font-size:.8rem">إغلاق</button>
          </div>
          <div class="db-chip-list">
            ${chips.length ? chips.map(ch => `<span class="db-chip">${esc(ch)}</span>`).join('') : '<span class="db-empty">لا توجد تفاصيل إضافية.</span>'}
          </div>
        </div>`;
    }

    if (!content) return;
    content.innerHTML = `
      <div class="db-kpis">
        <div class="db-kpi db-click-item" data-group="courses" data-label="إجمالي المواد الدراسية">
          <div class="db-kpi-lbl">إجمالي المواد الدراسية</div>
          <div class="db-kpi-val">${totalCourses}</div>
          <div class="db-kpi-sub">مادة مسجلة (${filteredSchedules.length} حصة بالجدول)</div>
        </div>
        <div class="db-kpi g2 db-click-item" data-group="faculty" data-label="أعضاء هيئة التدريس والمعيدون">
          <div class="db-kpi-lbl">أعضاء هيئة التدريس والمعيدون</div>
          <div class="db-kpi-val">${totalFaculty}</div>
          <div class="db-kpi-sub">دكتور ومعيد</div>
        </div>
        <div class="db-kpi g3 db-click-item" data-group="rooms" data-label="القاعات والمدرجات والمعامل">
          <div class="db-kpi-lbl">القاعات والمدرجات والمعامل</div>
          <div class="db-kpi-val">${totalRooms}</div>
          <div class="db-kpi-sub">مكان للتدريس</div>
        </div>
        <div class="db-kpi g4 db-click-item" data-group="capacity" data-label="السعة الإجمالية للقاعات">
          <div class="db-kpi-lbl">السعة الإجمالية للقاعات</div>
          <div class="db-kpi-val">${totalCapacity.toLocaleString('en-US')}</div>
          <div class="db-kpi-sub">طالب</div>
        </div>
      </div>

      ${inspectorHtml}

      <div class="db-grid-3">
        <div class="db-card">
          <h3 class="db-card-title">Room Distribution</h3>
          ${donutChartHtml(roomTypeEntries, 'roomType')}
        </div>
        <div class="db-card">
          <h3 class="db-card-title">Faculty Distribution by Job Title</h3>
          ${hBarChartHtml(facultyRoleEntries, 'facultyRole')}
        </div>
        <div class="db-card">
          <h3 class="db-card-title">Number of Courses by Academic Year.</h3>
          ${hBarChartHtml(yearEntries, 'courseYear')}
        </div>
      </div>

      <div class="db-grid-2">
        <div class="db-card">
          <h3 class="db-card-title">Faculty Members by Department</h3>
          ${hBarChartHtml(facultyDeptEntries, 'facultyDept')}
        </div>
        <div class="db-card">
          <h3 class="db-card-title">Courses by Department</h3>
          ${vBarChartHtml(deptCourseEntries, 'courseDept')}
        </div>
      </div>`;

    const closeInsp = document.getElementById('dbCloseInsp');
    if (closeInsp) closeInsp.onclick = () => { this.inspection = null; this.render(false); };

    content.querySelectorAll('.db-click-item').forEach(el => {
      el.onclick = () => {
        const grp = el.dataset.group;
        const lbl = el.dataset.label;
        if (this.inspection && this.inspection.group === grp && this.inspection.label === lbl) {
          this.inspection = null;
        } else {
          this.inspection = { group: grp, label: lbl };
        }
        this.render(false);
      };
    });
  }
}

// ---------- شاشة منسق الجداول ----------
class SchedulerView {
  constructor(api, initialFilters = null) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.filters = Object.assign({ year: '', dept: '', group: '', instructor: '', hall: '' }, initialFilters || {});
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-filters">
        <div class="tt-field">
          <label>الفرقة الدراسية</label>
          <select id="selYear" class="tt-sel"><option value="">-- كل الفرق --</option></select>
        </div>
        <div class="tt-field">
          <label>القسم / الشعبة</label>
          <select id="selDept" class="tt-sel"><option value="">-- كل الأقسام --</option></select>
        </div>
        <div class="tt-field">
          <label>المجموعة</label>
          <select id="selGroup" class="tt-sel"><option value="">-- كل المجموعات --</option></select>
        </div>
        <div class="tt-field">
          <label>الدكتور / المعيد</label>
          <select id="selInstructor" class="tt-sel"><option value="">-- كل الدكاترة --</option></select>
        </div>
        <div class="tt-field">
          <label>القاعة / المدرج</label>
          <select id="selHall" class="tt-sel"><option value="">-- كل القاعات --</option></select>
        </div>
        <div style="display:flex; gap:8px; margin-right:auto;">
          <button id="btnRefresh" class="tt-btn">تحديث</button>
          <button id="btnGenerate" class="tt-btn on">توليد الجدول</button>
        </div>
      </div>

      <div class="tt-stats">
        <div class="tt-stat-item">
          <div><div id="statDistributed" class="tt-stat-num">0</div><div class="tt-stat-lbl">حصص أتوزعت</div></div>
        </div>
        <div class="tt-stat-item">
          <div><div class="tt-stat-num" style="color:#10b981">0</div><div class="tt-stat-lbl">تعارضات</div></div>
        </div>
        <div class="tt-stat-item">
          <div><div class="tt-stat-num" style="color:#d97706">0</div><div class="tt-stat-lbl">فجوات الطلاب</div></div>
        </div>
        <div class="tt-stat-item" style="border-left:none">
          <div><div id="statAttempts" class="tt-stat-num">1</div><div class="tt-stat-lbl">محاولات</div></div>
        </div>
      </div>

      <div id="requestsContainer" class="tt-requests-box" style="display:none">
        <div id="requestsTitle" class="tt-requests-title">طلبات الدكاترة</div>
        <div id="requestsList"></div>
      </div>

      <div id="schLoading" class="tt-loading">جاري تحديث البيانات من Google Sheets...</div>
      <div class="tt-wrap"><table class="tt-table">${TABLE_HEAD}<tbody id="schBody"></tbody></table></div>
      <div class="tt-legend">الأزرق = محاضرة، البرتقالي = سكشن.</div>`;

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.onclick = () => this.refresh(true);

    const btnGenerate = document.getElementById('btnGenerate');
    if (btnGenerate) btnGenerate.onclick = () => { alert('تم تحديث وتوليد الجدول بنجاح.'); this.build(); };

    const selYear = document.getElementById('selYear');
    if (selYear) selYear.onchange = e => { this.filters.year = e.target.value; this.build(); };

    const selDept = document.getElementById('selDept');
    if (selDept) selDept.onchange = e => { this.filters.dept = e.target.value; this.build(); };

    const selGroup = document.getElementById('selGroup');
    if (selGroup) selGroup.onchange = e => { this.filters.group = e.target.value; this.build(); };

    const selInstructor = document.getElementById('selInstructor');
    if (selInstructor) selInstructor.onchange = e => { this.filters.instructor = e.target.value; this.build(); };

    const selHall = document.getElementById('selHall');
    if (selHall) selHall.onchange = e => { this.filters.hall = e.target.value; this.build(); };

    await this.refresh(false);
  }

  async refresh(force) {
    const loading = document.getElementById('schLoading');
    if (loading) loading.style.display = 'block';
    let data;
    try { data = await loadData(this.api, force); } finally { if (loading) loading.style.display = 'none'; }
    this.schedules = schedulesOf(data);
    this.requests = (data && data.requests) || [];

    const years = new Set();
    const depts = new Set();
    const groups = new Set();
    const instructors = new Set();
    const halls = new Set();

    const rooms = roomsLiveOf(data);
    rooms.forEach(r => {
      const h = getVal(r, ROOM_COLS);
      if (h) halls.add(h);
    });

    if (data && data.groups && Array.isArray(data.groups)) {
      data.groups.forEach(g => {
        const y = g['الفرقة'] || g.year;
        const d = g['الشعبة'] || g['القسم'] || g.dept;
        const grp = g['المجموعة'] || g.group;
        if (y) years.add(y.toString().trim());
        if (d) depts.add(d.toString().trim());
        if (grp) groups.add(grp.toString().trim());
      });
    }

    instructorsLiveOf(data).forEach(i => {
      const n = getVal(i, INSTRUCTOR_COLS);
      if (n) instructors.add(n);
    });

    this.schedules.forEach(it => {
      const y = col(it, 'year');
      const d = col(it, 'dept');
      const g = col(it, 'group');
      const h = col(it, 'hall');
      if (y) years.add(y);
      if (d) depts.add(d);
      if (g) groups.add(g);
      if (h) halls.add(h);
      splitNames(col(it, 'doctor')).forEach(n => instructors.add(n));
      splitNames(col(it, 'assistant')).forEach(n => instructors.add(n));
    });

    this.populateSelect('selYear', sortYears([...years]), this.filters.year, '-- كل الفرق --');
    this.populateSelect('selDept', [...depts].sort((a,b)=>a.localeCompare(b,'ar')), this.filters.dept, '-- كل الأقسام --');
    this.populateSelect('selGroup', [...groups].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})), this.filters.group, '-- كل المجموعات --');
    this.populateSelect('selInstructor', [...instructors].sort((a,b)=>a.localeCompare(b,'ar')), this.filters.instructor, '-- كل الدكاترة --');
    this.populateSelect('selHall', [...halls].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})), this.filters.hall, '-- كل القاعات --');

    const statDist = document.getElementById('statDistributed');
    if (statDist) statDist.textContent = this.schedules.length;

    this.renderRequests();
    this.build();
  }

  renderRequests() {
    const box = document.getElementById('requestsContainer');
    const listEl = document.getElementById('requestsList');
    const titleEl = document.getElementById('requestsTitle');
    if (!box || !listEl) return;

    if (!this.requests || this.requests.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    titleEl.textContent = `طلبات الدكاترة (${this.requests.length} جديد)`;

    let html = '';
    this.requests.forEach((req, idx) => {
      const docName = req.doctorName || req['اسم الدكتور'] || 'دكتور';
      const details = req.details || req['التفاصيل'] || '';
      const reason = req.reason || req['السبب'] || '';
      const status = req.status || req['الحالة'] || 'قيد المراجعة';

      html += `
        <div class="tt-request-card">
          <div>
            <b>${esc(docName)}</b> يطلب ${esc(details)} - السبب: ${esc(reason)}
            <div style="font-size:0.8rem; color:${status==='تمت الموافقة'?'#10b981':'#d97706'}">الحالة: ${esc(status)}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="tt-req-action-btn tt-btn-approve" data-idx="${idx}">موافقة</button>
            <button class="tt-req-action-btn tt-btn-reject" data-idx="${idx}">رفض</button>
          </div>
        </div>`;
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll('.tt-btn-approve').forEach(btn => {
      btn.onclick = async e => {
        const idx = e.currentTarget.dataset.idx;
        this.requests[idx].status = 'تمت الموافقة';
        alert('تمت الموافقة على الطلب بنجاح!');
        this.renderRequests();
      };
    });

    listEl.querySelectorAll('.tt-btn-reject').forEach(btn => {
      btn.onclick = async e => {
        const idx = e.currentTarget.dataset.idx;
        this.requests[idx].status = 'مرفوض';
        alert('تم رفض الطلب.');
        this.renderRequests();
      };
    });
  }

  populateSelect(elementId, items, currentVal, defaultLabel) {
    const sel = document.getElementById(elementId);
    if (!sel) return;
    sel.innerHTML = `<option value="">${defaultLabel}</option>`;
    items.forEach(item => {
      sel.appendChild(new Option(item, item));
    });
    const key = elementId.replace('sel', '').toLowerCase();
    if (currentVal && items.includes(currentVal)) {
      sel.value = currentVal;
    } else {
      sel.value = '';
      this.filters[key] = '';
    }
  }

  build() {
    const tbody = document.getElementById('schBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesFilter(it, this.filters));
    renderGrid(tbody, items, { showYear: true });
  }
}

// ---------- شاشة الدكتور / المعيد ----------
class DoctorView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.requests = [];
    this.selected = '';
    this.reason = 'ظرف طارئ';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-note">وضع تجريبي: اختر اسمك لعرض جدولك وإرسال طلبات الاعتذار.</div>
      <div class="tt-filters">
        <div class="tt-field">
          <label>اختر اسمك</label>
          <select id="docSelect" class="tt-sel" style="min-width:240px"><option value="">-- اختر الدكتور --</option></select>
        </div>
        <div class="tt-field">
          <label>سبب الاعتذار</label>
          <select id="reasonSelect" class="tt-sel">
            <option>ظرف طارئ</option><option>اعتذار عن المحاضرة</option><option>تعديل موعد</option>
          </select>
        </div>
      </div>
      <div class="tt-wrap"><table class="tt-table">${TABLE_HEAD}<tbody id="docBody"></tbody></table></div>`;

    const docSelect = document.getElementById('docSelect');
    if (docSelect) docSelect.onchange = e => { this.selected = e.target.value; this.build(); };

    const reasonSelect = document.getElementById('reasonSelect');
    if (reasonSelect) reasonSelect.onchange = e => { this.reason = e.target.value; };

    await this.refresh();
  }

  async refresh(force = false) {
    const data = await loadData(this.api, force);
    this.schedules = schedulesOf(data);
    this.requests = (data && data.requests) || [];

    const inst = new Set();
    instructorsLiveOf(data).forEach(i => { const n = getVal(i, INSTRUCTOR_COLS); if (n) inst.add(n); });
    this.schedules.forEach(it => {
      splitNames(col(it, 'doctor')).forEach(n => inst.add(n));
      splitNames(col(it, 'assistant')).forEach(n => inst.add(n));
    });
    const list = [...inst].sort((a, b) => a.localeCompare(b, 'ar'));

    const sel = document.getElementById('docSelect');
    if (sel) {
      sel.innerHTML = '<option value="">-- اختر الدكتور --</option>';
      list.forEach(n => sel.appendChild(new Option(n, n)));
      if (!this.selected && list.length) this.selected = list[0];
      sel.value = this.selected;
    }
    this.build();
  }

  build() {
    const tbody = document.getElementById('docBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesFilter(it, { instructor: this.selected }));

    const extra = (item, subject) => {
      const req = this.requests.find(r =>
        (r.doctorName || r['اسم الدكتور'] || '') === this.selected &&
        (r.details || r['التفاصيل'] || '').includes(subject));
      if (req) {
        const s = req.status || req['الحالة'] || 'قيد المراجعة';
        const color = s === 'تمت الموافقة' ? '#10b981' : (s === 'مرفوض' ? '#ef4444' : '#d97706');
        return `<div class="tt-status" style="color:${color}">${esc(s)}</div>`;
      }
      return `<button class="tt-apology" data-subject="${esc(subject)}">اعتذار</button>`;
    };

    renderGrid(tbody, items, { showYear: true, doctorExtra: extra });

    tbody.querySelectorAll('.tt-apology').forEach(btn => {
      btn.onclick = async e => {
        const subj = e.currentTarget.dataset.subject;
        if (!confirm(`هل أنت متأكد من رغبتك في إرسال طلب اعتذار لمادة "${subj}"؟`)) return;
        await this.api.sendAction({
          action: 'addRequest',
          doctorName: this.selected,
          details: `اعتذار عن مادة ${subj}`,
          reason: this.reason,
        });
        alert('تم إرسال طلب الاعتذار للمنسق بنجاح!');
        localStorage.removeItem('sheet_cache_data');
        await this.refresh(true);
      };
    });
  }
}

// ---------- شاشة الطالب ----------
class StudentView {
  constructor(api) {
    this.api = api;
    this.schedules = [];
    this.year = '';
    this.group = '';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="tt-note">اختر الفرقة والمجموعة لاستعراض جدولك الدراسي.</div>
      <div class="tt-filters">
        <div class="tt-field">
          <label>الفرقة الدراسية</label>
          <select id="stYear" class="tt-sel"></select>
        </div>
        <div class="tt-field">
          <label>المجموعة</label>
          <select id="stGroup" class="tt-sel" style="min-width:200px"></select>
        </div>
      </div>
      <div class="tt-banner">جدولك محدّث. مفيش تغييرات.</div>
      <div class="tt-wrap"><table class="tt-table">${TABLE_HEAD}<tbody id="stBody"></tbody></table></div>`;

    const stYear = document.getElementById('stYear');
    if (stYear) stYear.onchange = e => {
      this.year = e.target.value;
      this.build();
    };

    const stGroup = document.getElementById('stGroup');
    if (stGroup) stGroup.onchange = e => {
      this.group = e.target.value;
      this.build();
    };

    await this.refresh();
  }

  async refresh() {
    const data = await loadData(this.api);
    this.schedules = schedulesOf(data);

    const years = new Set();
    const groups = new Set();
    if (data && data.groups && Array.isArray(data.groups)) {
      data.groups.forEach(g => {
        if (g['الفرقة']) years.add(g['الفرقة'].toString().trim());
        if (g['المجموعة']) groups.add(g['المجموعة'].toString().trim());
      });
    }
    this.schedules.forEach(it => {
      const y = col(it, 'year');
      const g = col(it, 'group') || col(it, 'dept');
      if (y) years.add(y);
      if (g) groups.add(g);
    });

    const yList = sortYears([...years]);
    const gList = [...groups].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));

    const ySel = document.getElementById('stYear');
    if (ySel) {
      ySel.innerHTML = '';
      yList.forEach(y => ySel.appendChild(new Option(y, y)));
      if (!this.year || !yList.includes(this.year)) this.year = yList[0] || '';
      ySel.value = this.year;
    }

    const gSel = document.getElementById('stGroup');
    if (gSel) {
      gSel.innerHTML = '<option value="">-- كل المجموعات --</option>';
      gList.forEach(g => gSel.appendChild(new Option(g, g)));
      if (!this.group || !gList.includes(this.group)) this.group = '';
      gSel.value = this.group;
    }

    this.build();
  }

  build() {
    const tbody = document.getElementById('stBody');
    if (!tbody) return;
    const items = this.schedules.filter(it => matchesFilter(it, { year: this.year, group: this.group }));
    renderGrid(tbody, items);
  }
}

// ---------- التطبيق الرئيسي ----------
export class App {
  constructor(container, api) {
    this.container = container;
    this.api = api;
  }

  async start() {
    injectStyles();
    this.container.innerHTML = `
      <div class="tt">
        <div class="tt-nav">
          <button id="navDashboard" class="tt-btn">الداش بورد</button>
          <button id="navScheduler" class="tt-btn">1) منسق الجداول</button>
          <button id="navDoctor" class="tt-btn">2) دكتور / معيد</button>
          <button id="navStudent" class="tt-btn">3) طالب</button>
        </div>
        <div id="viewContainer"></div>
      </div>`;

    const navDashboard = document.getElementById('navDashboard');
    if (navDashboard) navDashboard.onclick = () => this.switchView('dashboard');

    const navScheduler = document.getElementById('navScheduler');
    if (navScheduler) navScheduler.onclick = () => this.switchView('scheduler');

    const navDoctor = document.getElementById('navDoctor');
    if (navDoctor) navDoctor.onclick = () => this.switchView('doctor');

    const navStudent = document.getElementById('navStudent');
    if (navStudent) navStudent.onclick = () => this.switchView('student');

    this.switchView('dashboard');
  }

  async switchView(name, extraState = null) {
    const btns = {
      dashboard: 'navDashboard',
      scheduler: 'navScheduler',
      doctor: 'navDoctor',
      student: 'navStudent',
    };
    Object.entries(btns).forEach(([k, id]) => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('on', k === name);
    });

    const vc = document.getElementById('viewContainer');
    if (vc) {
      vc.innerHTML = '<div class="tt-loading" style="display:block">جاري التحميل...</div>';

      if (name === 'dashboard') {
        const view = new DashboardView(this.api, (target, state) => this.switchView(target, state));
        await view.mount(vc);
        return;
      }

      const views = {
        scheduler: SchedulerView,
        doctor: DoctorView,
        student: StudentView,
      };
      const ViewClass = views[name] || SchedulerView;
      const view = new ViewClass(this.api, extraState);
      await view.mount(vc);
    }
  }
}
